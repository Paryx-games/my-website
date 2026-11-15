import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type Environment = { DATABASE_URL?: string };
type DatabaseCheck = (databaseUrl: string) => Promise<void>;

const checkDatabase: DatabaseCheck = async (databaseUrl) => {
  await neon(databaseUrl)`SELECT 1`;
};

export function makeHandler(environment: Environment, databaseCheck: DatabaseCheck = checkDatabase) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!environment.DATABASE_URL) {
      return res.status(503).json({ status: 'not_ready', dependency: 'database' });
    }
    try {
      await databaseCheck(environment.DATABASE_URL);
      return res.status(200).json({ status: 'ready' });
    } catch {
      return res.status(503).json({ status: 'not_ready', dependency: 'database' });
    }
  };
}

export default makeHandler(process.env);
