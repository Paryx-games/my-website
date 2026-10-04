import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { catalogue } from '../public/assets/games/games.js';
import { validPersonalRating, starMarkup } from '../public/assets/games/ratings.js';

test('personal ratings accept only 1–5 in half-star steps, plus unrated', () => {
  for (let rating = 1; rating <= 5; rating += 0.5) assert.equal(validPersonalRating(rating), true);
  assert.equal(validPersonalRating(null), true);
  for (const invalid of [0, 0.5, 5.5, 1.25, '4.5', undefined, NaN, Infinity]) {
    assert.equal(validPersonalRating(invalid), false);
  }
  const markup = starMarkup(4.5);
  assert.equal((markup.match(/width:100%/g) || []).length, 4);
  assert.equal((markup.match(/width:50%/g) || []).length, 1);
  assert.equal((starMarkup(null).match(/width:0%/g) || []).length, 5);
});

test('published scores include sources, scales, platforms and check dates', async () => {
  const ratings = JSON.parse(await readFile(new URL('../public/assets/games/ratings.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(ratings).sort(), catalogue.map(game => game.id).sort());
  for (const entry of Object.values(ratings)) {
    assert.ok(validPersonalRating(entry.personal));
    if (entry.imdb !== null) {
      assert.match(entry.imdb.id, /^tt\d+$/);
      assert.ok(entry.imdb.score >= 1 && entry.imdb.score <= 10);
      assert.match(entry.imdb.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
    assert.ok(Object.hasOwn(entry, 'metacritic'));
    if (entry.metacritic !== null) {
      assert.match(entry.metacritic.slug, /^[a-z0-9-]+$/);
      assert.ok(entry.metacritic.score === null || (Number.isInteger(entry.metacritic.score) && entry.metacritic.score >= 0 && entry.metacritic.score <= 100));
      assert.ok(entry.metacritic.platform);
      assert.match(entry.metacritic.platformSlug, /^[a-z0-9-]+$/);
      assert.match(entry.metacritic.checked, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});
