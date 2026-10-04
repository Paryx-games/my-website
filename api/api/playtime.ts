import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticated, validateUpload, MAX_UPLOAD_BYTES, type PlaytimeStore } from '../lib/playtime.js';
import { createPlaytimeStore } from '../lib/playtime-store.js';

type Environment = { DATABASE_URL?: string; PLAYTIME_UPLOAD_TOKEN?: string; PLAYTIME_COLLECTOR_ID?: string };
export function makeHandler(environment: Environment, storeFactory = createPlaytimeStore) {
  let store: PlaytimeStore | undefined;
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.status(204).end();
    }
    if (!['GET', 'POST'].includes(req.method || '')) {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'POST') {
      if (!environment.PLAYTIME_UPLOAD_TOKEN || !environment.PLAYTIME_COLLECTOR_ID) return res.status(503).json({ error: 'Uploads are not configured' });
      if (!authenticated(req.headers.authorization, environment.PLAYTIME_UPLOAD_TOKEN)) return res.status(401).json({ error: 'Unauthorized' });
    } else res.setHeader('Access-Control-Allow-Origin', '*');
    if (!environment.DATABASE_URL) return res.status(503).json({ error: 'Playtime is not configured' });
    let upload;
    if (req.method === 'POST') {
      try {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (typeof raw !== 'string') throw new Error('Expected JSON');
        if (Buffer.byteLength(raw) > MAX_UPLOAD_BYTES) return res.status(413).json({ error: 'Upload too large' });
        upload = validateUpload(JSON.parse(raw), environment.PLAYTIME_COLLECTOR_ID!);
      } catch (error) {
        return res.status(400).json({ error: error instanceof SyntaxError ? 'Invalid JSON' : error instanceof Error ? error.message : 'Invalid upload' });
      }
    }
    try {
      store ||= storeFactory(environment.DATABASE_URL);
      if (upload) return res.status(200).json(await store.upload(upload));
      const data = await store.read();
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json(data);
    } catch {
      return res.status(503).json({ error: 'Playtime temporarily unavailable' });
    }
  };
}
export default makeHandler(process.env);
