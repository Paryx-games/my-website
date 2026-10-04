import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playtimeEntries, formatMinutes } from '../public/assets/games/playtime.js';

test('playtime converts numeric minutes, preserves estimates and hides unspecified platforms', () => {
  assert.deepEqual(playtimeEntries({ pc: 125, mobile: 1 }), [['pc', 'PC', '2 hours 5 minutes'], ['mobile', 'Mobile', '1 minute']]);
  assert.deepEqual(playtimeEntries({ pc: 0, mobile: '61' }), [['pc', 'PC', '0 minutes'], ['mobile', 'Mobile', '1 hour 1 minute']]);
  assert.deepEqual(playtimeEntries({ pc: ' ', mobile: null }), []);
  assert.deepEqual(playtimeEntries({ pc: -1, mobile: NaN }), []);
  assert.deepEqual(playtimeEntries(), []);
  assert.deepEqual(playtimeEntries({ console: '120+ hours' }), [['console', 'Console', '120+ hours']]);
  assert.deepEqual(playtimeEntries({ console: 120 }), [['console', 'Console', '2 hours']]);
  assert.deepEqual(playtimeEntries({ console: '' }), []);
});

test('minute formatting handles exact hours and rounding across hour boundaries', () => {
  assert.equal(formatMinutes(59), '59 minutes');
  assert.equal(formatMinutes(60), '1 hour');
  assert.equal(formatMinutes(59.5), '1 hour');
  assert.equal(formatMinutes(121), '2 hours 1 minute');
});
