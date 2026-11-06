import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { composePlaytime, type Baseline, type Total } from '../lib/playtime-baseline.js';
import { validateUpload } from '../lib/playtime.js';

const baselines: Baseline[] = [
  { game_id: 'town', pc: 15606, mobile: null, console: 243, universe_id: '1718755273', pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: null },
  { game_id: 'minecraft', pc: 49671, mobile: null, console: 22606, universe_id: null, pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: null },
  { game_id: 'satisfactory', pc: 9298, mobile: null, console: null, universe_id: null, pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: null },
];
const total = (game_id: string, source: string, minutes: number, baseline: number | null = null): Total => ({
  game_id, source, minutes: String(minutes), baseline_minutes: baseline === null ? null : String(baseline), updated_at: '2026-10-17T12:00:00Z',
});

test('frozen baselines are available before uploads and Minecraft uploads are added once', () => {
  const first = composePlaytime(baselines, []);
  assert.equal(first.version, 2);
  assert.equal(first.games.town.pc, 15606);
  assert.equal(first.games.minecraft.console, 22606);
  for (let refresh = 0; refresh < 2; refresh++) {
    const data = composePlaytime(baselines, [total('1718755273', 'roblox', 12, 2), total('minecraft', 'modrinth', 20000, 19671), total('satisfactory', 'steam', 9300, 9290)]);
    assert.equal(data.games.town.pc, 15618);
    assert.equal(data.games.town.pcIncrease24hMinutes, 10);
    assert.equal(data.games.town.lastPlayedAt, '2026-10-17T12:00:00.000Z');
    assert.equal(data.games.minecraft.pc, 69671);
    assert.equal(data.games.minecraft.pcIncrease24hMinutes, 329);
    assert.equal(data.games.satisfactory.pc, 9300);
    assert.equal(data.games.satisfactory.pcIncrease24hMinutes, 2);
  }
});

test('new Epic and Xbox titles expose the supplied platform baselines', () => {
  const data = composePlaytime([
    { game_id: 'fortnite', pc: 43889, mobile: null, console: 6896, universe_id: null, pc_last_played_at: '2025-05-05T12:00:00Z', mobile_last_played_at: null, console_last_played_at: '2024-09-22T12:00:00Z' },
    { game_id: 'among-us', pc: 2661, mobile: null, console: null, universe_id: null, pc_last_played_at: '2025-08-02T12:00:00Z', mobile_last_played_at: null, console_last_played_at: null },
    { game_id: 'minecraft-dungeons', pc: 0, mobile: null, console: 2989, universe_id: null, pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: '2024-07-14T12:00:00Z' },
    { game_id: 'forza-horizon-5', pc: 0, mobile: null, console: 768, universe_id: null, pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: '2024-12-06T12:00:00Z' },
    { game_id: 'rocket-league', pc: 693, mobile: null, console: null, universe_id: null, pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: null },
  ], []);
  assert.deepEqual(data.games.fortnite, {
    pc: 43889, console: 6896, lastPlayedAt: '2025-05-05T12:00:00.000Z',
    lastPlayedAtByPlatform: { pc: '2025-05-05T12:00:00.000Z', console: '2024-09-22T12:00:00.000Z' },
  });
  assert.deepEqual(data.games['among-us'], {
    pc: 2661, lastPlayedAt: '2025-08-02T12:00:00.000Z',
    lastPlayedAtByPlatform: { pc: '2025-08-02T12:00:00.000Z' },
  });
  assert.deepEqual(data.games['minecraft-dungeons'], {
    pc: 0, console: 2989, lastPlayedAt: '2024-07-14T12:00:00.000Z',
    lastPlayedAtByPlatform: { console: '2024-07-14T12:00:00.000Z' },
  });
  assert.deepEqual(data.games['forza-horizon-5'], {
    pc: 0, console: 768, lastPlayedAt: '2024-12-06T12:00:00.000Z',
    lastPlayedAtByPlatform: { console: '2024-12-06T12:00:00.000Z' },
  });
  assert.deepEqual(data.games['rocket-league'], { pc: 693 });
});

test('unknown universes are retained and exposed without editing a backend allowlist', () => {
  const entries = [{ gameId: '10767441669', source: 'roblox', minutes: 10 }];
  assert.deepEqual(validateUpload({ collectorId: 'pc', sequence: 1, entries }, 'pc').entries, entries);
  const data = composePlaytime(baselines, [total('10767441669', 'roblox', 10)]);
  assert.equal(data.games['roblox-10767441669'].pc, 10);
  assert.equal(data.games.roblox.pc, 15616);
  assert.equal(data.games['roblox-10767441669'].pcIncrease24hMinutes, 10);
  assert.equal(data.games.roblox.pcIncrease24hMinutes, 10);
  const named = composePlaytime(baselines, [total('10767441669', 'roblox', 10)], [
    { universe_id: '10767441669', name: 'Unlisted experience', place_ids: ['456'] },
  ]);
  assert.deepEqual(named.robloxGames['10767441669'], {
    universeId: '10767441669', name: 'Unlisted experience', placeIds: ['456'],
  });
  const known = composePlaytime(baselines, [total('1718755273', 'roblox', 5)]);
  assert.equal(known.games.town.pcIncrease24hMinutes, 5);
  assert.equal(known.games.roblox.pcIncrease24hMinutes, 5);
  for (const id of ['town', '0', '-1', '1.5', '9007199254740992']) {
    assert.throws(() => validateUpload({ collectorId: 'pc', sequence: 1, entries: [{ ...entries[0], gameId: id }] }, 'pc'));
  }
});

test('the Roblox platform total combines its experience playtime across all reported platforms', () => {
  const data = composePlaytime([
    ...baselines,
    { game_id: 'pressure', pc: 10, mobile: 120, console: 180, universe_id: '1234', pc_last_played_at: null, mobile_last_played_at: null, console_last_played_at: null },
  ], []);
  assert.deepEqual(data.games.pressure, { pc: 10, mobile: 120, console: 180 });
  assert.deepEqual(data.games.roblox, { pc: 15616, mobile: 120, console: 423 });
});

test('migration snapshot matches every numeric platform value in the frozen backup', () => {
  const root = new URL('../../../', import.meta.url);
  const backup = JSON.parse(readFileSync(new URL('www/public/assets/games/game.json', root), 'utf8'));
  const snapshot = JSON.parse(readFileSync(new URL('api/data/playtime-baseline.json', root), 'utf8')) as { gameId: string; pc?: number; mobile?: number; console?: number }[];
  for (const row of snapshot) {
    for (const platform of ['pc', 'mobile', 'console'] as const) {
      const raw = backup[row.gameId].playtime[platform];
      assert.equal(row[platform], /^\d+$/.test(raw) ? Number(raw) : undefined);
    }
  }
});
