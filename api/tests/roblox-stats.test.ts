import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchStats, readStats, HOUR_MS, universes, type Snapshot, type StatsStore } from '../lib/roblox-stats.js';
import { makeHandler } from '../api/roblox/stats.js';

const timestamp = '2026-10-05T12:00:00.000Z';
const snapshot: Snapshot = { version: 1, fetchedAt: timestamp, games: {} };
function memory(initial: Snapshot | null) {
  let value = initial;
  let lease: string | null = null;
  let failed = false;
  const store: StatsStore = {
    async read() { return value; },
    async claim(token) { if (lease || failed) return false; lease = token; return true; },
    async save(token, data) { if (lease !== token) return false; value = data; lease = null; return true; },
    async fail(token) { if (lease === token) { lease = null; failed = true; } },
  };
  return store;
}

test('fresh snapshots keep their original timestamp and refresh at exactly one hour', async () => {
  const store = memory(snapshot);
  let calls = 0;
  const refresh = async () => { calls++; return { ...snapshot, fetchedAt: '2026-10-05T13:00:00.000Z' }; };
  const now = Date.parse(timestamp);
  assert.equal(await readStats(store, refresh, 'a', () => now + HOUR_MS - 1), snapshot);
  assert.equal(calls, 0);
  const updated = await readStats(store, refresh, 'b', () => now + HOUR_MS);
  assert.equal(updated.fetchedAt, '2026-10-05T13:00:00.000Z');
  assert.equal(calls, 1);
  assert.equal(await readStats(store, refresh, 'c', () => now + HOUR_MS + 1), updated);
  assert.equal(calls, 1);
});

test('separate requests share one refresh while concurrent visitors receive the previous snapshot', async () => {
  const store = memory(snapshot);
  let release!: (data: Snapshot) => void;
  const waiting = new Promise<Snapshot>(resolve => { release = resolve; });
  let started!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  let calls = 0;
  const refresh = () => { calls++; started(); return waiting; };
  const now = () => Date.parse(timestamp) + HOUR_MS;
  const first = readStats(store, refresh, 'a', now);
  await start;
  assert.equal(await readStats(store, refresh, 'b', now), snapshot);
  release({ ...snapshot, fetchedAt: '2026-10-05T13:00:00.000Z' });
  assert.equal((await first).fetchedAt, '2026-10-05T13:00:00.000Z');
  assert.equal(calls, 1);
});

test('failed refreshes retain the last successful timestamp and respect retry backoff', async () => {
  const store = memory(snapshot);
  let calls = 0;
  const refresh = async (): Promise<Snapshot> => { calls++; throw new Error('upstream down'); };
  const now = () => Date.parse(timestamp) + HOUR_MS;
  assert.equal(await readStats(store, refresh, 'a', now), snapshot);
  assert.equal(await readStats(store, refresh, 'b', now), snapshot);
  assert.equal(calls, 1);
  await assert.rejects(readStats(memory(null), refresh, 'c', now));
});

test('a lost refresh lease returns the winning snapshot instead of the obsolete result', async () => {
  const winner = { ...snapshot, fetchedAt: '2026-10-05T14:00:00.000Z' };
  let reads = 0;
  const store: StatsStore = {
    async read() { return ++reads === 1 ? snapshot : winner; },
    async claim() { return true; }, async save() { return false; }, async fail() {},
  };
  assert.equal(await readStats(store, async () => snapshot, 'a', () => Date.parse(timestamp) + HOUR_MS), winner);
});

test('Roblox fetch includes every badge page and rejects incomplete upstream responses', async () => {
  const details = Object.values(universes).map((id, index) => ({
    id, rootPlaceId: 123, creator: { id: 45, name: 'Creator', type: 'Group', hasVerifiedBadge: true },
    created: timestamp, updated: timestamp, playing: 0, visits: 123, favoritedCount: 12,
    maxPlayers: 50, price: null, universeAvatarType: 'MorphToR15',
    description: index === 0 ? 'Updated description\n\nWith a second paragraph.' : '',
  }));
  const urls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input); urls.push(url);
    const data = url.includes('/badges?')
      ? { data: [{}], nextPageCursor: url.includes('cursor=') ? null : 'next+page' }
      : { data: url.includes('/votes?') ? details.map(game => ({ id: game.id, upVotes: 1, downVotes: 0 })) : details };
    return new Response(JSON.stringify(data));
  };
  const result = await fetchStats(fetcher as typeof fetch, () => new Date(timestamp));
  assert.equal(result.games.pressure.badgeCount, 2);
  assert.equal(result.games.town.checked, timestamp);
  assert.equal(result.games.pressure.description, details[0].description);
  assert.equal(result.games.town.description, '');
  assert.ok(urls.some(url => url.includes('cursor=next%2Bpage')));
  await assert.rejects(fetchStats(async () => new Response('{"data":[]}'), () => new Date(timestamp)));
  await assert.rejects(fetchStats(async () => new Response('', { status: 429 })));
  (details[0] as Record<string, unknown>).description = null;
  await assert.rejects(fetchStats(fetcher as typeof fetch, () => new Date(timestamp)));
});

test('stats endpoint exposes public CORS and rejects writes without touching the database', async () => {
  let reads = 0;
  const handler = makeHandler({ DATABASE_URL: 'test' }, () => { reads++; return memory(snapshot); }, async () => snapshot);
  for (const [method, expected] of [['OPTIONS', 204], ['POST', 405], ['GET', 200]] as const) {
    let status = 0; let body: unknown;
    const headers: Record<string, string> = {};
    const res = { setHeader(key: string, value: string) { headers[key] = value; }, status(code: number) { status = code; return res; }, json(data: unknown) { body = data; return res; }, end() {} };
    await handler({ method } as VercelRequest, res as unknown as VercelResponse);
    assert.equal(status, expected);
    assert.equal(headers['Access-Control-Allow-Origin'], '*');
    if (method !== 'GET') assert.equal(reads, 0);
    else assert.equal(body, snapshot);
  }
});
