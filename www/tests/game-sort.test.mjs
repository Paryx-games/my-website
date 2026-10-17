import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortGames } from '../public/assets/games/sort.js';

const games = [
  { id: 'z', title: 'Zoo', publisher: 'Beta', developer: 'Alpha', year: '2019', genre: 'Simulation' },
  { id: 'a', title: 'alpha', publisher: 'Alpha', developer: 'Beta', year: '2025', genre: 'Arcade' },
  { id: 'b', title: 'Bravo', publisher: 'Alpha', developer: 'Gamma', year: '2024', genre: 'Strategy' },
];
const ids = entries => entries.map(game => game.id);

test('playtime combines platforms, uses numeric minutes and places unspecified time after zero', () => {
  const details = { z: { playtime: { pc: '10', mobile: 25, console: '30' } }, a: { playtime: { pc: 60 } }, b: { playtime: { pc: 0 } } };
  assert.deepEqual(ids(sortGames(games, 'playtime', details)), ['z', 'a', 'b']);
  details.z.playtime = { pc: '', mobile: '120+ hours', console: NaN };
  assert.deepEqual(ids(sortGames(games, 'playtime', details)), ['a', 'b', 'z']);
  details.z.playtime = { pc: 120 };
  assert.deepEqual(ids(sortGames(games, 'playtime', details)), ['z', 'a', 'b']);
});

test('text sorts alphabetically with name tie-breaks; years and ratings sort highest first', () => {
  assert.deepEqual(ids(sortGames(games, 'title')), ['a', 'b', 'z']);
  assert.deepEqual(ids(sortGames(games, 'publisher')), ['a', 'b', 'z']);
  assert.deepEqual(ids(sortGames(games, 'developer')), ['z', 'a', 'b']);
  assert.deepEqual(ids(sortGames(games, 'year')), ['a', 'b', 'z']);
  assert.deepEqual(ids(sortGames(games, 'genre')), ['a', 'z', 'b']);
  assert.deepEqual(ids(sortGames(games, 'rating', {}, { z: { personal: null }, a: { personal: 3 }, b: { personal: 4.5 } })), ['b', 'a', 'z']);
});

test('sorting leaves the catalogue untouched and original order can be restored', () => {
  const before = structuredClone(games);
  sortGames(games, 'title');
  assert.deepEqual(games, before);
  assert.deepEqual(sortGames(games, 'original'), before);
  assert.deepEqual(sortGames(games, 'unknown'), before);
});
