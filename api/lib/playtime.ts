import { createHash, timingSafeEqual } from 'node:crypto';

export const gameIds = new Set([
  'minecraft', 'satisfactory', 'rainbow-six-siege', 'forza-horizon-6',
  'forza-horizon-4', 'beamng-drive', 'geometry-dash', 'halo-mcc',
  'escape-the-backrooms', 'backrooms-escape-together', 'bloons-td-6',
  'roblox', 'pressure', 'town',
]);
export const sources = new Set(['steam', 'modrinth']);
export const steamAppIds: Record<number, string> = {
  526870: 'satisfactory', 359550: 'rainbow-six-siege', 2483190: 'forza-horizon-6',
  1293830: 'forza-horizon-4', 284160: 'beamng-drive', 322170: 'geometry-dash',
  976730: 'halo-mcc', 1943950: 'escape-the-backrooms',
  2141730: 'backrooms-escape-together', 960090: 'bloons-td-6',
};
export const MAX_UPLOAD_BYTES = 512 * 1024;
export const MAX_MINUTES = 100_000_000;

export type Entry = { gameId: string; source: string; minutes: number };
export type Upload = { collectorId: string; sequence: number; entries: Entry[] };
export type PublicPlaytime = {
  version: 1;
  updatedAt: string | null;
  games: Record<string, { pc: number }>;
};
export type UploadResult = { ok: true; accepted: boolean; replayed: boolean; lastSequence: number };
export interface PlaytimeStore {
  read(): Promise<PublicPlaytime>;
  upload(data: Upload): Promise<UploadResult>;
}

export function authenticated(header: unknown, token: string): boolean {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const supplied = header.slice(7);
  if (!supplied || supplied.length > 1024) return false;
  return timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(token).digest());
}

export function validateUpload(body: unknown, collectorId: string): Upload {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object');
  const value = body as Record<string, unknown>;
  if (value.collectorId !== collectorId) throw new Error('Unknown collector');
  if (!Number.isSafeInteger(value.sequence) || (value.sequence as number) < 1) throw new Error('Expected a positive integer sequence');
  if (!Array.isArray(value.entries) || !value.entries.length || value.entries.length > 5000) throw new Error('Expected 1–5000 playtime entries');
  const seen = new Set<string>();
  const entries = value.entries.flatMap((item: unknown): Entry[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid entry');
    const entry = item as Record<string, unknown>;
    if (typeof entry.source !== 'string' || !sources.has(entry.source)) throw new Error('Unknown source');
    let gameId: string | undefined;
    if (entry.appId !== undefined) {
      if (entry.source !== 'steam' || !Number.isSafeInteger(entry.appId) || (entry.appId as number) < 1 || entry.gameId !== undefined) throw new Error('Expected a Steam app ID or game ID');
      gameId = Object.hasOwn(steamAppIds, entry.appId as number) ? steamAppIds[entry.appId as number] : undefined;
    } else {
      if (typeof entry.gameId !== 'string') throw new Error('Expected a game ID');
      if (entry.source === 'steam' && /^\d+$/.test(entry.gameId)) {
        const appId = Number(entry.gameId);
        gameId = Number.isSafeInteger(appId) && Object.hasOwn(steamAppIds, appId) ? steamAppIds[appId] : undefined;
      } else gameId = gameIds.has(entry.gameId) ? entry.gameId : undefined;
    }
    // Unmapped games do not invalidate the rest of a full library upload.
    if (!gameId) return [];
    if (!Number.isSafeInteger(entry.minutes) || (entry.minutes as number) < 0 || (entry.minutes as number) > MAX_MINUTES) throw new Error('Expected nonnegative whole minutes');
    if (Object.keys(entry).some(key => !['gameId', 'appId', 'source', 'minutes'].includes(key))) throw new Error('Unexpected entry field');
    const key = `${entry.source}:${gameId}`;
    if (seen.has(key)) throw new Error('Duplicate source/game entry');
    seen.add(key);
    return [{ gameId, source: entry.source, minutes: entry.minutes as number }];
  });
  if (Object.keys(value).some(key => !['collectorId', 'sequence', 'entries'].includes(key))) throw new Error('Unexpected upload field');
  return { collectorId, sequence: value.sequence as number, entries };
}
