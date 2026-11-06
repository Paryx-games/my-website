import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playtimeEntries, formatLastPlayed, formatMinutes, resolveLastPlayedAt, robloxPlaytimeBreakdown } from '../public/assets/games/playtime.js';

test('last played uses no data, now, and elapsed relative labels', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(formatLastPlayed(undefined, now), 'No data');
  assert.equal(formatLastPlayed('2026-10-27T11:57:00Z', now), 'now');
  assert.equal(formatLastPlayed('2026-10-27T10:30:00Z', now), '1 hour ago');
  assert.equal(formatLastPlayed('2026-10-22T12:00:00Z', now), '5 days ago');
});

test('manual last-played overrides take precedence and display the latest platform date', () => {
  assert.equal(resolveLastPlayedAt({
    lastPlayedAt: '2026-11-05T22:40:34Z',
    lastPlayedAtOverride: {
      pc: '2025-05-05T12:00:00Z',
      console: '2024-09-22T12:00:00Z',
    },
  }), '2025-05-05T12:00:00Z');
  assert.equal(resolveLastPlayedAt({ lastPlayedAt: '2026-11-05T22:40:34Z' }), '2026-11-05T22:40:34Z');
  assert.equal(resolveLastPlayedAt({ lastPlayedAtOverride: { pc: 'invalid' } }), undefined);
});

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

test('Roblox breakdown uses dotted-tooltip copy in hours and minutes and rejects missing values', () => {
  assert.equal(robloxPlaytimeBreakdown({ listedPcMinutes: 125, unlistedPcMinutes: 60 }),
    'Listed games: 2 hours 5 minutes\nNon-listed games: 1 hour');
  assert.equal(robloxPlaytimeBreakdown({ listedPcMinutes: -1, unlistedPcMinutes: 60 }), null);
  assert.equal(robloxPlaytimeBreakdown({ listedPcMinutes: 60 }), null);
});

test('playtime shows a total only when PC and another platform have numeric values', () => {
  assert.deepEqual(playtimeEntries({ pc: '60', mobile: '120', console: '30' }, true), [
    ['pc', 'PC', '1 hour'], ['mobile', 'Mobile', '2 hours'], ['console', 'Console', '30 minutes'], ['total', 'Total', '3 hours 30 minutes'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '49671', console: '22606' }, true), [
    ['pc', 'PC', '827 hours 51 minutes'], ['console', 'Console', '376 hours 46 minutes'], ['total', 'Total', '1,204 hours 37 minutes'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '60', mobile: '120+', console: '' }, true), [
    ['pc', 'PC', '1 hour'], ['mobile', 'Mobile', '120+'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '', mobile: '60', console: '120' }, true), [
    ['mobile', 'Mobile', '1 hour'], ['console', 'Console', '2 hours'],
  ]);
  assert.deepEqual(playtimeEntries({ mobile: '60', console: '120' }, true), [
    ['mobile', 'Mobile', '1 hour'], ['console', 'Console', '2 hours'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '120+ hours', mobile: '60', console: '120' }, true), [
    ['pc', 'PC', '120+ hours'], ['mobile', 'Mobile', '1 hour'], ['console', 'Console', '2 hours'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '60', mobile: '', console: '' }, true), [
    ['pc', 'PC', '1 hour'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '', mobile: '60', console: '' }, true), [
    ['mobile', 'Mobile', '1 hour'],
  ]);
  assert.deepEqual(playtimeEntries({ pc: '', mobile: '', console: '60' }, true), [
    ['console', 'Console', '1 hour'],
  ]);
});
