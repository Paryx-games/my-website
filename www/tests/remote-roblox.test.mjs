import assert from 'node:assert/strict';
import { test } from 'node:test';
import { robloxGames } from '../public/assets/games/roblox-games.js';
import { mergeRobloxStats, fetchRobloxStats } from '../public/assets/games/remote-roblox.js';

test('cached Roblox snapshots update counts and creator while preserving artwork and the fetched timestamp', () => {
  const games = structuredClone(robloxGames);
  const fetchedAt = '2026-10-05T12:00:00.000Z';
  const stats = { ...games[0].roblox, playing: 0, creatorName: 'New creator', checked: fetchedAt };
  const response = { version: 1, fetchedAt, games: { pressure: stats } };
  assert.equal(mergeRobloxStats(games, response), true);
  assert.equal(games[0].roblox.playing, 0);
  assert.equal(games[0].developer, 'New creator');
  assert.equal(games[0].roblox.checked, fetchedAt);
  assert.equal(games[0].cover, robloxGames[0].cover);
  assert.equal(mergeRobloxStats(games, response), true);
  assert.equal(games[0].roblox.checked, fetchedAt);
});

test('malformed, mismatched and unavailable stats preserve the bundled fallback', async () => {
  for (const changes of [{ playing: -1 }, { universeId: 1 }, { creatorType: 'Other' }, { checked: 'invalid' }]) {
    const games = structuredClone(robloxGames);
    const fetchedAt = games[0].roblox.checked;
    assert.equal(mergeRobloxStats(games, { version: 1, fetchedAt, games: { pressure: { ...games[0].roblox, creatorName: games[0].developer, ...changes } } }), false);
    assert.deepEqual(games, robloxGames);
  }
  assert.equal(await fetchRobloxStats(async () => { throw new Error('offline'); }), null);
  assert.equal(await fetchRobloxStats(async () => new Response('', { status: 503 })), null);
});
