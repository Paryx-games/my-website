import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playtimeEntries } from '../public/assets/games/playtime.js';

test('playtime preserves estimates, formats numeric hours and hides unspecified platforms', () => {
  assert.deepEqual(playtimeEntries({ pc: '250+ hours', mobile: 1 }), [['pc', 'PC', '250+ hours'], ['mobile', 'Mobile', '1 hour']]);
  assert.deepEqual(playtimeEntries({ pc: 0, mobile: 2.5 }), [['pc', 'PC', '0 hours'], ['mobile', 'Mobile', '2.5 hours']]);
  assert.deepEqual(playtimeEntries({ pc: ' ', mobile: null }), []);
  assert.deepEqual(playtimeEntries({ pc: -1, mobile: NaN }), []);
  assert.deepEqual(playtimeEntries(), []);
});
