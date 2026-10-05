import { neon } from '@neondatabase/serverless';
import type { Snapshot, StatsStore } from './roblox-stats.js';

export function createStatsStore(url: string): StatsStore {
  const sql = neon(url);
  return {
    async read() {
      const [row] = await sql`SELECT payload FROM roblox.stats_cache WHERE id = 1`;
      return row?.payload as Snapshot | null;
    },
    async claim(token) {
      const rows = await sql`
        UPDATE roblox.stats_cache SET lease_token = ${token}, lease_until = now() + interval '30 seconds'
        WHERE id = 1 AND (fetched_at IS NULL OR fetched_at <= now() - interval '1 hour')
          AND (lease_until IS NULL OR lease_until <= now()) RETURNING id`;
      return rows.length === 1;
    },
    async save(token, data) {
      const rows = await sql`
        UPDATE roblox.stats_cache SET payload = ${JSON.stringify(data)}::jsonb,
          fetched_at = ${data.fetchedAt}::timestamptz, lease_token = NULL, lease_until = NULL
        WHERE id = 1 AND lease_token = ${token} AND lease_until > now() RETURNING id`;
      return rows.length === 1;
    },
    async fail(token) {
      await sql`UPDATE roblox.stats_cache SET lease_token = NULL, lease_until = now() + interval '1 minute'
        WHERE id = 1 AND lease_token = ${token}`;
    },
  };
}
