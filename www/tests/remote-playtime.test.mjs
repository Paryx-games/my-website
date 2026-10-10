import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeRemotePlaytime, fetchRemotePlaytime } from '../public/assets/games/remote-playtime.js';

test('remote PC totals preserve manual console/mobile values and accept zero', () => {
  const local = { minecraft: { playtime: { pc: 100, mobile: 5, console: 60 } } };
  assert.ok(mergeRemotePlaytime(local, { version: 1, games: { minecraft: { pc: 0 }, unknown: { pc: 123 } } }, ['minecraft']));
  assert.deepEqual(local.minecraft.playtime, { pc: 30000, mobile: 5, console: 60, pcIncrease24hMinutes: null });
  assert.equal(local.unknown, undefined);
  for (const invalid of [null, { version: 1, games: { minecraft: { pc: -1 } } }, { version: 1, games: { minecraft: { pc: '125' } } }]) {
    assert.equal(mergeRemotePlaytime(local, invalid, ['minecraft']), false);
    assert.equal(local.minecraft.playtime.pc, 30000);
  }
});
test('Minecraft adds the launcher estimate to the API total without accumulating it on refresh', () => {
  const local = { minecraft: { playtime: { mobile: 5, console: 60 } }, satisfactory: { playtime: {} } };
  const response = { version: 1, games: { minecraft: { pc: 15054 }, satisfactory: { pc: 0 } } };
  for (let refresh = 0; refresh < 2; refresh++) {
    assert.ok(mergeRemotePlaytime(local, response, ['minecraft', 'satisfactory']));
    assert.deepEqual(local.minecraft.playtime, { pc: 45054, mobile: 5, console: 60, pcIncrease24hMinutes: null });
    assert.equal(local.satisfactory.playtime.pc, 0);
  }
});
test('failed or unavailable APIs leave the file-based fallback intact', async () => {
  assert.equal(await fetchRemotePlaytime(async () => { throw new Error('offline'); }), null);
  assert.equal(await fetchRemotePlaytime(async () => ({ ok: false })), null);
});

test('24-hour increases are validated and cleared when the next response has no increase', () => {
  const local = {};
  for (const increase of [90, 0, -1, '90', 1.5, undefined]) {
    mergeRemotePlaytime(local, { version: 1, games: { satisfactory: { pc: 600, pcIncrease24hMinutes: increase } } }, ['satisfactory']);
    assert.equal(local.satisfactory.playtime.pcIncrease24hMinutes, increase === 90 ? 90 : null);
  }
});
