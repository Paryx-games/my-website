import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestUrl = new URL('./reserved-paths.json', import.meta.url);
const SHORT_LINK_CODE_PATTERN = /^(?=.{1,32}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isShortLinkPathAvailable(code, manifest) {
  return typeof code === 'string'
    && SHORT_LINK_CODE_PATTERN.test(code)
    && manifest?.allPathsReserved !== true
    && Array.isArray(manifest?.segments)
    && !manifest.segments.includes(code);
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }
  const code = new URL(request.url, 'https://paryx.uk').searchParams.get('code');
  if (!code || !SHORT_LINK_CODE_PATTERN.test(code)) {
    return response.status(400).json({ error: 'Invalid short path.' });
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(fileURLToPath(manifestUrl), 'utf8'));
  } catch (error) {
    console.error(`[short-links] Could not read the generated route manifest: ${error.message}`);
    return response.status(503).json({ error: 'Path availability is temporarily unavailable.' });
  }
  if (typeof manifest.allPathsReserved !== 'boolean' || !Array.isArray(manifest.segments)) {
    console.error('[short-links] The generated route manifest has an invalid shape.');
    return response.status(503).json({ error: 'Path availability is temporarily unavailable.' });
  }

  return response.status(200).json({ available: isShortLinkPathAvailable(code, manifest) });
}
