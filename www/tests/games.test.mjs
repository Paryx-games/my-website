import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { games, catalogue, rotation, robloxGames } from '../public/assets/games/games.js';
const sources = JSON.parse(await readFile(new URL('../content/game-artwork-sources.json', import.meta.url), 'utf8'));

test('favorites and rotation resolve to complete galleries with local artwork', async () => {
  assert.deepEqual(games.map(game => game.id), ['minecraft', 'satisfactory', 'rainbow-six-siege']);
  assert.ok(games.every(game => game.favorite));
  assert.equal(rotation.length, 23);
  assert.deepEqual(rotation.slice(0, 7).map(game => game.id), [
    'minecraft', 'minecraft-dungeons', 'geometry-dash', 'among-us', 'roblox', 'rainbow-six-siege', 'fortnite',
  ]);
  assert.deepEqual(rotation.slice(12, 17).map(game => game.id), [
    'forza-horizon-6', 'forza-horizon-5', 'forza-horizon-4', 'rocket-league', 'beamng-drive',
  ]);
  assert.equal(new Set(catalogue.map(game => game.id)).size, catalogue.length);
  assert.deepEqual(catalogue.slice(0, 8).map(game => game.id), [
    'minecraft', 'minecraft-dungeons', 'geometry-dash', 'among-us', 'roblox', 'rainbow-six-siege', 'fortnite', 'satisfactory',
  ]);
  const catalogueIds = catalogue.map(game => game.id);
  assert.deepEqual(catalogueIds.slice(catalogueIds.indexOf('forza-horizon-6'), catalogueIds.indexOf('beamng-drive')), [
    'forza-horizon-6', 'forza-horizon-5', 'forza-horizon-4', 'rocket-league',
  ]);
  assert.deepEqual(catalogue.slice(-5).map(game => game.id), [
    'nuclear-blast-testing-facility', 'apeirophobia', 'unseen-liminality', 'oakridge-nuclear-power-station', 'a-core-game',
  ]);
  assert.ok(catalogue.slice(23).every(game => game.roblox));
  assert.deepEqual(catalogue.slice(23).map(game => game.id), robloxGames.map(game => game.id));
  assert.ok(games.every(game => !game.roblox), 'Roblox experiences belong in the Roblox Games section');
  for (const id of ['fortnite', 'among-us', 'minecraft-dungeons', 'forza-horizon-5', 'rocket-league']) {
    assert.ok(catalogue.some(game => game.id === id), id);
    assert.ok(rotation.some(game => game.id === id), `${id} must be shown in the games section`);
  }
  assert.deepEqual(robloxGames.map(game => game.id), [
    'blox-fruits', 'the-strongest-battlegrounds', 'doors', 'jujutsu-shenanigans', 'bee-swarm-simulator',
    'build-a-boat-for-treasure', 'islands', 'car-crushers-2', 'pressure', 'town', 'industrialist',
    'scp-roleplay', 'notoriety', 'cook-burgers', 'nuclear-blast-testing-facility', 'apeirophobia',
    'unseen-liminality', 'oakridge-nuclear-power-station', 'a-core-game',
  ]);
  for (const entry of rotation) assert.ok(catalogue.some(game => game.id === entry.id), entry.id);
  for (const game of catalogue) {
    assert.equal(game.pictures.length, game.captions.length);
    assert.ok(game.pictures.length >= (game.roblox ? 1 : 7), game.title);
    assert.match(game.year, /^\d{4}$/);
    assert.ok(game.publisher && game.developer && game.description);
    assert.equal(new URL(game.website).protocol, 'https:');
    assert.ok(game.icon && (game.roblox || game.logo || game.titleArtwork) && game.artworkSource, game.title);
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
    for (const asset of [game.cover, game.icon, game.backdrop, game.logo, game.titleArtwork, ...game.pictures].filter(Boolean)) {
      await access(new URL(`../public${asset}`, import.meta.url));
      assert.ok(sources[asset]?.url?.startsWith('https://') || (sources[asset]?.suppliedBy === 'user' && sources[asset]?.originalFileName), `missing artwork source: ${asset}`);
    }
  }
});
