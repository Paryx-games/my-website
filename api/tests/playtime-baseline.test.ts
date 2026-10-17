import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { composePlaytime, type Baseline, type Total } from '../lib/playtime-baseline.js';
import { validateUpload } from '../lib/playtime.js';

const baselines: Baseline[] = [
  { game_id: 'town', pc: 15606, mobile: null, console: 243, universe_id: '1718755273' },
  { game_id: 'minecraft', pc: 49671, mobile: null, console: 22606, universe_id: null },
  { game_id: 'satisfactory', pc: 9298, mobile: null, console: null, universe_id: null },
];
const total = (game_id: string, source: string, minutes: number, baseline: number | null = null): Total => ({
  game_id, source, minutes: String(minutes), baseline_minutes: baseline === null ? null : String(baseline), updated_at: '2026-10-17T12:00:00Z',
});

test('frozen baselines are available before any uploads and are never added twice', () => {
  const first = composePlaytime(baselines, []);
  assert.equal(first.version, 2);
  assert.equal(first.games.town.pc, 15606);
  assert.equal(first.games.minecraft.console, 22606);
  for (let refresh = 0; refresh < 2; refresh++) {
    const data = composePlaytime(baselines, [total('1718755273', 'roblox', 12, 2), total('minecraft', 'modrinth', 20000, 19671), total('satisfactory', 'steam', 9300, 9290)]);
    assert.equal(data.games.town.pc, 15618);
    assert.equal(data.games.town.pcIncrease24hMinutes, 10);
    assert.equal(data.games.minecraft.pc, 50000);
    assert.equal(data.games.minecraft.pcIncrease24hMinutes, 329);
    assert.equal(data.games.satisfactory.pc, 9300);
    assert.equal(data.games.satisfactory.pcIncrease24hMinutes, 2);
  }
});

test('unknown universes are retained and exposed without editing a backend allowlist', () => {
  const entries = [{ gameId: '10767441669', source: 'roblox', minutes: 10 }];
  assert.deepEqual(validateUpload({ collectorId: 'pc', sequence: 1, entries }, 'pc').entries, entries);
  const data = composePlaytime(baselines, [total('10767441669', 'roblox', 10)]);
  assert.equal(data.games['roblox-10767441669'].pc, 10);
  assert.equal(data.games.roblox.pc, 15616);
  assert.equal(data.games['roblox-10767441669'].pcIncrease24hMinutes, 10);
  assert.equal(data.games.roblox.pcIncrease24hMinutes, 10);
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
    { game_id: 'pressure', pc: 10, mobile: 120, console: 180, universe_id: '1234' },
  ], []);
  assert.deepEqual(data.games.pressure, { pc: 10, mobile: 120, console: 180 });
  assert.deepEqual(data.games.roblox, { pc: 15616, mobile: 120, console: 423 });
});

test('migration snapshot matches every numeric platform value in the frozen backup', () => {
  const root = new URL('../../../', import.meta.url);
  const backup = JSON.parse(readFileSync(new URL('www/public/assets/games/game.json', root), 'utf8'));
  const snapshot = JSON.parse(readFileSync(new URL('api/data/playtime-baseline.json', root), 'utf8')) as { gameId: string; pc?: number; mobile?: number; console?: number }[];
  const frozenIds = new Set(snapshot.map(row => row.gameId));
  for (const [id, entry] of Object.entries(backup)) {
    if (!frozenIds.has(id)) assert.deepEqual(entry, { playtime: { pc: '', mobile: '', console: '' } });
  }
  for (const row of snapshot) {
    for (const platform of ['pc', 'mobile', 'console'] as const) {
      const raw = backup[row.gameId].playtime[platform];
      assert.equal(row[platform], /^\d+$/.test(raw) ? Number(raw) : undefined);
    }
  }
});
