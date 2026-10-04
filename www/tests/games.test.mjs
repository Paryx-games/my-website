import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { games, catalogue, rotation } from '../public/assets/games/games.js';
const sources = JSON.parse(await readFile(new URL('../content/game-artwork-sources.json', import.meta.url), 'utf8'));

test('favorites and rotation resolve to complete galleries with local artwork', async () => {
  assert.deepEqual(games.map(game => game.id), ['minecraft', 'satisfactory', 'rainbow-six-siege']);
  assert.equal(rotation.length, 12);
  assert.equal(new Set(catalogue.map(game => game.id)).size, catalogue.length);
  for (const entry of rotation) assert.ok(catalogue.some(game => game.id === entry.id), entry.id);
  for (const game of catalogue) {
    assert.equal(game.pictures.length, game.captions.length);
    assert.ok(game.pictures.length >= 7, game.title);
    assert.match(game.year, /^\d{4}$/);
    assert.ok(game.publisher && game.developer && game.description);
    assert.equal(new URL(game.website).protocol, 'https:');
    assert.ok(game.icon && game.logo && game.artworkSource, game.title);
    const steamId = game.website.match(/\/app\/(\d+)/)?.[1];
    if (steamId && sources[game.icon].url.includes('community_assets')) {
      assert.ok(sources[game.icon].url.includes(`/apps/${steamId}/`), `${game.title}: icon must belong to this game's app ID`);
    }
    const cover = sources[game.cover];
    assert.ok(Math.abs(cover.width / cover.height - 2 / 3) < 0.01, `${game.title}: must use portrait artwork rather than a banner`);
    for (const asset of [game.cover, game.icon, game.backdrop, game.logo, ...game.pictures].filter(Boolean)) {
      await access(new URL(`../public${asset}`, import.meta.url));
      assert.ok(sources[asset]?.url.startsWith('https://'), `missing artwork source: ${asset}`);
    }
  }
});
