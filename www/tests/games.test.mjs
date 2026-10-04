import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { games, catalogue, rotation, robloxGames } from '../public/assets/games/games.js';
const sources = JSON.parse(await readFile(new URL('../content/game-artwork-sources.json', import.meta.url), 'utf8'));

test('favorites and rotation resolve to complete galleries with local artwork', async () => {
  assert.deepEqual(games.map(game => game.id), ['minecraft', 'satisfactory', 'rainbow-six-siege']);
  assert.equal(rotation.length, 12);
  assert.equal(new Set(catalogue.map(game => game.id)).size, catalogue.length);
  assert.deepEqual(robloxGames.map(game => game.id), ['pressure', 'town']);
  for (const entry of rotation) assert.ok(catalogue.some(game => game.id === entry.id), entry.id);
  for (const game of catalogue) {
    assert.equal(game.pictures.length, game.captions.length);
    assert.ok(game.pictures.length >= 7, game.title);
    assert.match(game.year, /^\d{4}$/);
    assert.ok(game.publisher && game.developer && game.description);
    assert.equal(new URL(game.website).protocol, 'https:');
    assert.ok(game.icon && (game.roblox || game.logo) && game.artworkSource, game.title);
    const steamId = game.website.match(/\/app\/(\d+)/)?.[1];
    if (steamId && sources[game.icon].url.includes('community_assets')) {
      assert.ok(sources[game.icon].url.includes(`/apps/${steamId}/`), `${game.title}: icon must belong to this game's app ID`);
    }
    const cover = sources[game.cover];
    assert.ok(Math.abs(cover.width / cover.height - (game.roblox ? 1 : 2 / 3)) < 0.01, `${game.title}: must use its native cover format`);
    if (game.roblox) {
      assert.equal(game.year, game.roblox.created.slice(0, 4));
      assert.ok(Number.isInteger(game.roblox.universeId) && Number.isInteger(game.roblox.placeId));
      assert.match(game.website, /^https:\/\/www\.roblox\.com\/games\//);
      assert.ok(game.roblox.upVotes >= 0 && game.roblox.downVotes >= 0);
    }
    for (const asset of [game.cover, game.icon, game.backdrop, game.logo, ...game.pictures].filter(Boolean)) {
      await access(new URL(`../public${asset}`, import.meta.url));
      assert.ok(sources[asset]?.url?.startsWith('https://') || (sources[asset]?.suppliedBy === 'user' && sources[asset]?.originalFileName), `missing artwork source: ${asset}`);
    }
  }
});
