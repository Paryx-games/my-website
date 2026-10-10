import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import type { PlaytimeStore, PublicPlaytime, Upload } from './playtime.js';

export function createPlaytimeStore(databaseUrl: string): PlaytimeStore {
  const sql = neon(databaseUrl);
  return {
    async read() {
      const rows = await sql`
        WITH current_totals AS (
          SELECT collector_id, source, game_id, minutes, updated_at
          FROM playtime.totals
        ), baseline AS (
          SELECT DISTINCT ON (collector_id, source, game_id)
            collector_id, source, game_id, minutes
          FROM playtime.total_history
          WHERE recorded_at <= now() - interval '24 hours'
          ORDER BY collector_id, source, game_id, recorded_at DESC, history_id DESC
        ), baseline_games AS (
          SELECT current.game_id,
            COUNT(*) AS source_count,
            COUNT(baseline.minutes) AS baseline_count,
            SUM(baseline.minutes) AS minutes
          FROM current_totals AS current
          LEFT JOIN baseline USING (collector_id, source, game_id)
          GROUP BY current.game_id
        )
        SELECT current.game_id, SUM(current.minutes)::text AS minutes,
          MAX(current.updated_at) AS updated_at,
          CASE WHEN baseline_games.baseline_count = baseline_games.source_count
            AND SUM(current.minutes) > baseline_games.minutes
            THEN (SUM(current.minutes) - baseline_games.minutes)::text
            ELSE NULL END AS increase_24h_minutes
        FROM current_totals AS current
        JOIN baseline_games USING (game_id)
        GROUP BY current.game_id, baseline_games.baseline_count, baseline_games.source_count, baseline_games.minutes
        ORDER BY current.game_id`;
      const data: PublicPlaytime = { version: 1, updatedAt: null, games: {} };
      for (const row of rows) {
        const game = { pc: Number(row.minutes) } as PublicPlaytime['games'][string];
        if (row.increase_24h_minutes !== null) game.pcIncrease24hMinutes = Number(row.increase_24h_minutes);
        data.games[row.game_id] = game;
        const updatedAt = new Date(row.updated_at).toISOString();
        if (!data.updatedAt || updatedAt > data.updatedAt) data.updatedAt = updatedAt;
      }
      return data;
    },
    async upload(data: Upload) {
      const entries = JSON.stringify(data.entries.map(entry => ({ game_id: entry.gameId, source: entry.source, minutes: entry.minutes })));
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
