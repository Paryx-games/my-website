import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeCalendar, fetchContributions, createContributionsHandler,
} from '../api/github-contributions.js';
import {
  aggregateRepositoryLanguages, contributionMonthHeadings, contributionWeekX, contributionYearBoundaries,
} from '../public/assets/github-contributions.js';

const calendar = {
  totalContributions: 7,
  weeks: [{ contributionDays: [
    { date: '2026-10-16', weekday: 5, contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
    { date: '2026-10-17', weekday: 6, contributionCount: 5, contributionLevel: 'FOURTH_QUARTILE' },
  ] }],
};

test('calendar preserves partial-week alignment and rejects malformed provider data', () => {
  assert.deepEqual(normalizeCalendar(calendar).weeks[0], [
    { date: '2026-10-16', weekday: 5, count: 2, level: 1 },
    { date: '2026-10-17', weekday: 6, count: 5, level: 4 },
  ]);
  for (const extra of [{ weekday: 0 }, { date: '2026-02-30' }, { contributionCount: -1 }, { contributionLevel: 'OTHER' }, { date: '2026-10-16' }]) {
    assert.throws(() => normalizeCalendar({ ...calendar, weeks: [{ contributionDays: [calendar.weeks[0].contributionDays[0], { ...calendar.weeks[0].contributionDays[1], ...extra }] }] }));
  }
});

test('all-time month headings start with the first contribution year and retain the full timeline', () => {
  const weeks = [
    [{ date: '2024-12-29' }],
    [{ date: '2025-01-01' }],
    [{ date: '2025-02-02' }],
    [{ date: '2025-12-28' }],
    [{ date: '2026-01-01' }],
  ];
  assert.deepEqual(contributionMonthHeadings(weeks, 2025), [
    { index: 1, label: 'Jan' },
    { index: 2, label: 'Feb' },
    { index: 3, label: 'Dec' },
    { index: 4, label: 'Jan' },
  ]);
  assert.deepEqual(contributionYearBoundaries(weeks), [1, 4]);
  assert.deepEqual([0, 1, 2, 4].map(index => contributionWeekX(index, [1, 4])), [30, 55, 68, 106]);
});

test('profile language breakdown combines account and organisation Linguist bytes', () => {
  const languages = aggregateRepositoryLanguages({
    version: 1,
    games: [
      { languageBytes: { TypeScript: 700, Rust: 300 }, languageColors: { TypeScript: '#3178c6', Rust: '#dea584' } },
      { languageBytes: { TypeScript: 300, Python: 200 } },
    ],
    labs: [{ languageBytes: { Rust: 200, Python: 100 } }],
  });
  assert.deepEqual(languages, [
    { name: 'TypeScript', bytes: 1000, color: '#3178c6', percentage: 1000 / 1800 * 100 },
    { name: 'Rust', bytes: 500, color: '#dea584', percentage: 500 / 1800 * 100 },
    { name: 'Python', bytes: 300, color: '#8b949e', percentage: 300 / 1800 * 100 },
  ]);
  assert.throws(() => aggregateRepositoryLanguages({ version: 2 }));
});

test('GitHub credentials stay upstream and partial GraphQL errors are rejected', async () => {
  let headers;
  const queries = [];
  const request = async (_url, options) => {
    headers = options.headers;
    const query = JSON.parse(options.body).query;
    queries.push(query);
    const user = query.includes('query ContributionTotals')
      ? {
          year2026: { contributionCalendar: { ...calendar, totalContributions: 40 } },
          year2025: { contributionCalendar: { totalContributions: 10, weeks: [{ contributionDays: [
            { date: '2025-10-16', weekday: 4, contributionCount: 4, contributionLevel: 'SECOND_QUARTILE' },
            { date: '2025-10-17', weekday: 5, contributionCount: 6, contributionLevel: 'THIRD_QUARTILE' },
          ] }] } },
        }
      : { contributionsCollection: { contributionCalendar: calendar, contributionYears: [2026, 2025] } };
    return { ok: true, json: async () => ({ data: { user } }) };
  };
  const data = await fetchContributions({ token: 'test-only-secret', request, now: () => Date.parse('2026-10-17T12:00:00Z') });
  assert.equal(headers.Authorization, 'Bearer test-only-secret');
  assert.equal(data.total, 7);
  assert.equal(data.allTime, 50);
  assert.deepEqual(data.years.map(({ year, total }) => [year, total]), [[2026, 40], [2025, 10]]);
  assert.equal(data.years[0].weeks[0][0].date, '2026-10-16');
  assert.match(queries[1], /contributionDays \{ date weekday contributionCount contributionLevel \}/);
  assert.equal(queries.length, 2);
  assert.match(queries[1], /from: "2025-01-01T00:00:00Z", to: "2025-12-31T23:59:59Z"/);
  assert.match(queries[1], /to: "2026-10-17T12:00:00.000Z"/);
  assert.ok(!JSON.stringify(data).includes('test-only-secret'));
  await assert.rejects(fetchContributions({ token: 'test-only-secret', request: async () => ({ ok: true, json: async () => ({ errors: [{ message: 'private upstream detail' }], data: {} }) }) }));
});

const response = () => {
  const result = { status: 0, headers: {}, body: null };
  const res = { setHeader(key, value) { result.headers[key] = value; }, status(code) { result.status = code; return res; }, json(body) { result.body = body; } };
  return { result, res };
};

test('concurrent reads share a cached request and upstream failures retain the last snapshot', async () => {
  let calls = 0;
  let time = 0;
  let fail = false;
  const snapshot = { ...normalizeCalendar(calendar), fetchedAt: '2026-10-17T00:00:00Z' };
  const handler = createContributionsHandler({ configured: () => true, now: () => time, load: async () => { calls++; if (fail) throw new Error('private'); return snapshot; } });
  const first = response();
  const second = response();
  await Promise.all([handler({ method: 'GET' }, first.res), handler({ method: 'GET' }, second.res)]);
  assert.equal(calls, 1);
  time = 900001;
  fail = true;
  const stale = response();
  await handler({ method: 'GET' }, stale.res);
  assert.equal(stale.result.body.stale, true);
  assert.equal(stale.result.body.fetchedAt, snapshot.fetchedAt);
  const denied = response();
  await handler({ method: 'POST' }, denied.res);
  assert.equal(denied.result.status, 405);
  assert.equal(calls, 2);
});
