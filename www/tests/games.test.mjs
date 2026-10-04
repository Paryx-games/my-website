import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { games, catalogue, rotation } from '../public/assets/games/games.js';

test('favorites and rotation resolve to complete galleries with local artwork', async () => {
  assert.deepEqual(games.map(game => game.id), ['minecraft', 'satisfactory', 'rainbow-six-siege']);
  assert.equal(rotation.length, 12);
  assert.equal(new Set(catalogue.map(game => game.id)).size, catalogue.length);
  for (const entry of rotation) assert.ok(catalogue.some(game => game.id === entry.id), entry.id);
  for (const game of catalogue) {
    assert.equal(game.pictures.length, game.captions.length);
    assert.ok(game.pictures.length >= 3, game.title);
    assert.match(game.year, /^\d{4}$/);
    assert.ok(game.publisher && game.developer && game.description);
    assert.equal(new URL(game.website).protocol, 'https:');
    for (const asset of [game.cover, ...game.pictures]) {
      await access(new URL(`../public${asset}`, import.meta.url));
    }
  }
});
