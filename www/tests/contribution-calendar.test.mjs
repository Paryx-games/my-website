import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allTimeCalendar, contributionRange } from '../public/assets/github-contributions.js';

const days = [
  { date: '2025-12-31', count: 3 },
  { date: '2026-01-01', count: 0 },
  { date: '2026-01-02', count: 7 },
  { date: '2026-01-03', count: 5 },
];

test('day selection includes zero contribution days', () => {
  assert.deepEqual(contributionRange(days, '2026-01-01', '2026-01-01'), { from: '2026-01-01', to: '2026-01-01', total: 0 });
});

test('range selection includes both endpoints and works backwards across years', () => {
  const expected = { from: '2025-12-31', to: '2026-01-02', total: 10 };
  assert.deepEqual(contributionRange(days, '2025-12-31', '2026-01-02'), expected);
  assert.deepEqual(contributionRange(days, '2026-01-02', '2025-12-31'), expected);
});

test('all-time calendar fills empty days and totals every returned year', () => {
  const years = [
    { year: 2025, total: 2, weeks: [[{ date: '2025-12-31', weekday: 3, count: 2, level: 1 }]] },
    { year: 2026, total: 3, weeks: [[{ date: '2026-01-01', weekday: 4, count: 3, level: 2 }]] },
  ];
  const calendar = allTimeCalendar(years, '2026-01-02');
  assert.equal(calendar.total, 5);
  assert.deepEqual(calendar.weeks.flat().slice(-3).map(day => [day.date, day.count]), [
    ['2025-12-31', 2], ['2026-01-01', 3], ['2026-01-02', 0],
  ]);
});
