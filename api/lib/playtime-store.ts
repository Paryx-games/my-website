import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import type { PlaytimeStore, PublicPlaytime, Upload } from './playtime.js';

export function createPlaytimeStore(databaseUrl: string): PlaytimeStore {
  const sql = neon(databaseUrl);
  return {
    async read() {
      const rows = await sql`
        SELECT game_id, SUM(minutes)::text AS minutes, MAX(updated_at) AS updated_at
        FROM playtime.totals GROUP BY game_id ORDER BY game_id`;
      const data: PublicPlaytime = { version: 1, updatedAt: null, games: {} };
      for (const row of rows) {
        data.games[row.game_id] = { pc: Number(row.minutes) };
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
            SET minutes = GREATEST(playtime.totals.minutes, EXCLUDED.minutes), updated_at = now()
          RETURNING game_id
        ) SELECT EXISTS(SELECT 1 FROM accepted) AS accepted, COUNT(*)::int AS written FROM written`;
      if (result.accepted) return { ok: true, accepted: true, replayed: false, lastSequence: data.sequence };
      // A fresh statement sees the winning sequence even after simultaneous uploads.
      const [collector] = await sql`SELECT last_sequence, payload_hash FROM playtime.collectors WHERE collector_id = ${data.collectorId}`;
      return { ok: true, accepted: false, replayed: Number(collector.last_sequence) === data.sequence && collector.payload_hash === fingerprint, lastSequence: Number(collector.last_sequence) };
    },
  };
}
