export const HOUR_MS = 3_600_000;
export const universes = { pressure: 4367208330, town: 1718755273 };
export type RobloxStats = {
  universeId: number; placeId: number; creatorType: 'Group' | 'User'; creatorId: number;
  creatorVerified: boolean; creatorName: string; created: string; updated: string;
  playing: number; visits: number; favorites: number; maxPlayers: number;
  upVotes: number; downVotes: number; price: number | null; avatarType: string;
  badgeCount: number; checked: string;
};
export type Snapshot = { version: 1; fetchedAt: string; games: Record<string, RobloxStats> };
export interface StatsStore {
  read(): Promise<Snapshot | null>;
  claim(token: string): Promise<boolean>;
  save(token: string, data: Snapshot): Promise<boolean>;
  fail(token: string): Promise<void>;
}

function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('Invalid Roblox count');
  return value as number;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Invalid Roblox text');
  return value;
}
function date(value: unknown): string {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid Roblox date');
  return result;
}

export async function fetchStats(fetcher = fetch, now = () => new Date()): Promise<Snapshot> {
  const signal = AbortSignal.timeout(20_000);
  const json = async (url: string) => {
    const response = await fetcher(url, { signal });
    if (!response.ok) throw new Error('Roblox unavailable');
    return response.json();
  };
  async function badges(universe: number) {
    let total = 0;
    let cursor = '';
    const seen = new Set<string>();
    for (let page = 0; page < 100; page++) {
      const response = await json(`https://badges.roblox.com/v1/universes/${universe}/badges?limit=100&sortOrder=Asc${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (!Array.isArray(response.data)) throw new Error('Invalid Roblox badges');
      total += response.data.length;
      if (response.nextPageCursor === null) return total;
      cursor = text(response.nextPageCursor);
      if (seen.has(cursor)) throw new Error('Repeated badge cursor');
      seen.add(cursor);
    }
    throw new Error('Too many badge pages');
  }
  const ids = Object.values(universes).join(',');
  const [details, votes, badgeCounts] = await Promise.all([
    json(`https://games.roblox.com/v1/games?universeIds=${ids}`),
    json(`https://games.roblox.com/v1/games/votes?universeIds=${ids}`),
    Promise.all(Object.values(universes).map(badges)),
  ]);
  if (!Array.isArray(details.data) || !Array.isArray(votes.data)) throw new Error('Invalid Roblox response');
  const fetchedAt = now().toISOString();
  const games: Snapshot['games'] = {};
  Object.entries(universes).forEach(([id, universeId], index) => {
    const game = details.data.find((item: { id: number }) => item.id === universeId);
    const vote = votes.data.find((item: { id: number }) => item.id === universeId);
    if (!game || !vote || !['User', 'Group'].includes(game.creator?.type) || typeof game.creator.hasVerifiedBadge !== 'boolean') throw new Error('Incomplete Roblox response');
    games[id] = {
      universeId, placeId: count(game.rootPlaceId), creatorType: game.creator.type,
      creatorId: count(game.creator.id), creatorName: text(game.creator.name), creatorVerified: game.creator.hasVerifiedBadge,
      created: date(game.created), updated: date(game.updated), playing: count(game.playing),
      visits: count(game.visits), favorites: count(game.favoritedCount), maxPlayers: count(game.maxPlayers),
      upVotes: count(vote.upVotes), downVotes: count(vote.downVotes),
      price: game.price === null ? null : count(game.price), avatarType: text(game.universeAvatarType),
      badgeCount: badgeCounts[index], checked: fetchedAt,
    };
  });
  return { version: 1, fetchedAt, games };
}

export async function readStats(store: StatsStore, refresh: () => Promise<Snapshot>, token: string, now = Date.now): Promise<Snapshot> {
  const cached = await store.read();
  if (cached && now() - Date.parse(cached.fetchedAt) < HOUR_MS) return cached;
  if (await store.claim(token)) {
    try {
      const data = await refresh();
      if (await store.save(token, data)) return data;
      // An expired lease must not overwrite a more recent refresh.
      const latest = await store.read();
      if (latest) return latest;
    } catch {
      await store.fail(token);
      if (cached) return cached;
    }
  }
  if (cached) return cached;
  // A competing first request may already have populated the cache.
  const latest = await store.read();
  if (latest) return latest;
  throw new Error('Stats temporarily unavailable');
}
