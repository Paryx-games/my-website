import type { VercelRequest, VercelResponse } from '@vercel/node';

export function makeHandler() {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return res.status(200).json({ status: 'ok' });
  };
}

export default makeHandler();
