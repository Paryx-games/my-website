import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import type { PlaytimeStore, Upload } from './playtime.js';
import { composePlaytime, type Baseline, type RobloxGameMetadata, type Total } from './playtime-baseline.js';

export function createPlaytimeStore(databaseUrl: string): PlaytimeStore {
  const sql = neon(databaseUrl);
  return {
    async read() {
      const [rows, baselines, robloxMetadata] = await sql.transaction([
        sql`
        WITH current_totals AS (
          SELECT collector_id, source, game_id, minutes, updated_at
          FROM playtime.totals
        ), baseline AS (
          SELECT DISTINCT ON (collector_id, source, game_id)
            collector_id, source, game_id, minutes
          FROM playtime.total_history
          WHERE recorded_at <= now() - interval '24 hours'
          ORDER BY collector_id, source, game_id, recorded_at DESC, history_id DESC
        )
        SELECT current.game_id, current.source, current.minutes::text AS minutes,
          current.updated_at, baseline.minutes::text AS baseline_minutes
        FROM current_totals AS current
        LEFT JOIN baseline USING (collector_id, source, game_id)`,
        sql`SELECT game_id, pc, mobile, console, universe_id::text FROM playtime.baselines`,
        sql`SELECT universe_id, name, place_ids FROM playtime.roblox_games`,
      ]);
      return composePlaytime(baselines as Baseline[], rows as Total[], robloxMetadata as RobloxGameMetadata[]);
    },
    async upload(data: Upload) {
      const entries = JSON.stringify(data.entries.map(entry => ({
        game_id: entry.gameId, source: entry.source, minutes: entry.minutes, metadata: entry.metadata ?? null,
      })));
      const fingerprint = createHash('sha256').update(JSON.stringify([...data.entries].sort((a, b) => `${a.source}:${a.gameId}`.localeCompare(`${b.source}:${b.gameId}`)))).digest('hex');
      // Lock/update the collector's sequence and apply its entire batch in one statement.
      const [result] = await sql`
        WITH accepted AS (
          INSERT INTO playtime.collectors (collector_id, last_sequence, payload_hash)
          VALUES (${data.collectorId}, ${data.sequence}, ${fingerprint})
          ON CONFLICT (collector_id) DO UPDATE
            SET last_sequence = EXCLUDED.last_sequence, payload_hash = EXCLUDED.payload_hash, updated_at = now()
            WHERE playtime.collectors.last_sequence < EXCLUDED.last_sequence
          RETURNING collector_id
        ), written AS (
          INSERT INTO playtime.totals (collector_id, source, game_id, minutes)
          SELECT accepted.collector_id, entry.source, entry.game_id, entry.minutes
          FROM accepted CROSS JOIN jsonb_to_recordset(${entries}::jsonb)
            AS entry(game_id text, source text, minutes bigint)
          ON CONFLICT (collector_id, source, game_id) DO UPDATE
            SET minutes = EXCLUDED.minutes, updated_at = now()
            WHERE playtime.totals.minutes < EXCLUDED.minutes
          RETURNING collector_id, source, game_id, minutes, updated_at
        ), history_written AS (
          INSERT INTO playtime.total_history (collector_id, source, game_id, minutes, recorded_at)
          SELECT collector_id, source, game_id, minutes, updated_at FROM written
          RETURNING history_id
        ), roblox_metadata_written AS (
          INSERT INTO playtime.roblox_games AS existing (collector_id, universe_id, name, place_ids)
          SELECT accepted.collector_id, entry.game_id, entry.metadata->>'name',
            COALESCE(entry.metadata->'placeIds', '[]'::jsonb)
          FROM accepted CROSS JOIN jsonb_to_recordset(${entries}::jsonb)
            AS entry(game_id text, source text, minutes bigint, metadata jsonb)
          WHERE entry.source = 'roblox' AND entry.metadata IS NOT NULL
          ON CONFLICT (collector_id, universe_id) DO UPDATE
            SET name = EXCLUDED.name,
              place_ids = (
                SELECT COALESCE(jsonb_agg(place_id ORDER BY place_id), '[]'::jsonb)
                FROM (
                  SELECT jsonb_array_elements_text(existing.place_ids) AS place_id
                  UNION
                  SELECT jsonb_array_elements_text(EXCLUDED.place_ids) AS place_id
                ) AS merged
              ),
              updated_at = now()
          RETURNING universe_id
        ), pruned_history AS (
          DELETE FROM playtime.total_history AS old
          WHERE old.recorded_at < now() - interval '24 hours'
            AND EXISTS (
              SELECT 1 FROM playtime.total_history AS newer
              WHERE newer.collector_id = old.collector_id
                AND newer.source = old.source
                AND newer.game_id = old.game_id
                AND newer.recorded_at <= now() - interval '24 hours'
                AND (newer.recorded_at, newer.history_id) > (old.recorded_at, old.history_id)
            )
          RETURNING history_id
        )
        SELECT EXISTS(SELECT 1 FROM accepted) AS accepted,
          (SELECT COUNT(*)::int FROM written) AS written,
          (SELECT COUNT(*)::int FROM history_written) AS history_written,
          (SELECT COUNT(*)::int FROM pruned_history) AS pruned_history`;
      if (result.accepted) return { ok: true, accepted: true, replayed: false, lastSequence: data.sequence };
      // A fresh statement sees the winning sequence even after simultaneous uploads.
      const [collector] = await sql`SELECT last_sequence, payload_hash FROM playtime.collectors WHERE collector_id = ${data.collectorId}`;
      return { ok: true, accepted: false, replayed: Number(collector.last_sequence) === data.sequence && collector.payload_hash === fingerprint, lastSequence: Number(collector.last_sequence) };
    },
  };
}
