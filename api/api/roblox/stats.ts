import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchStats, readStats, type StatsStore } from '../../lib/roblox-stats.js';
import { createStatsStore } from '../../lib/roblox-stats-store.js';

export function makeHandler(environment: { DATABASE_URL?: string }, storeFactory = createStatsStore, refresh = fetchStats) {
  let store: StatsStore | undefined;
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.status(204).end();
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!environment.DATABASE_URL) return res.status(503).json({ error: 'Roblox stats are not configured' });
    try {
      store ||= storeFactory(environment.DATABASE_URL);
      return res.status(200).json(await readStats(store, refresh, randomUUID()));
    } catch {
      return res.status(503).json({ error: 'Roblox stats temporarily unavailable' });
    }
  };
}
export default makeHandler(process.env);
