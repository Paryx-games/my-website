import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeRemotePlaytime, fetchRemotePlaytime } from '../public/assets/games/remote-playtime.js';

test('remote PC totals preserve manual console/mobile values and accept zero', () => {
  const local = { minecraft: { playtime: { pc: 100, mobile: 5, console: 60 } } };
  assert.ok(mergeRemotePlaytime(local, { version: 1, games: { minecraft: { pc: 0 }, unknown: { pc: 123 } } }, ['minecraft']));
  assert.deepEqual(local.minecraft.playtime, { pc: 0, mobile: 5, console: 60 });
  assert.equal(local.unknown, undefined);
  for (const invalid of [null, { version: 1, games: { minecraft: { pc: -1 } } }, { version: 1, games: { minecraft: { pc: '125' } } }]) {
    assert.equal(mergeRemotePlaytime(local, invalid, ['minecraft']), false);
    assert.equal(local.minecraft.playtime.pc, 0);
  }
});
test('failed or unavailable APIs leave the file-based fallback intact', async () => {
  assert.equal(await fetchRemotePlaytime(async () => { throw new Error('offline'); }), null);
  assert.equal(await fetchRemotePlaytime(async () => ({ ok: false })), null);
});
