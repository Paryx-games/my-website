import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCalendar, fetchContributions, createContributionsHandler } from '../api/github-contributions.js';

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

test('GitHub credentials stay upstream and partial GraphQL errors are rejected', async () => {
  let headers;
  const request = async (_url, options) => {
    headers = options.headers;
    return { ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: calendar } } } }) };
  };
  const data = await fetchContributions({ token: 'test-only-secret', request, now: () => 0 });
  assert.equal(headers.Authorization, 'Bearer test-only-secret');
  assert.equal(data.total, 7);
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
