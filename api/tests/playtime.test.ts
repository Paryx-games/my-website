import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeHandler } from '../api/playtime.js';
import { authenticated, validateUpload, type PlaytimeStore, type Upload } from '../lib/playtime.js';

const token = 'test-only-token-not-used-in-production';
const payload = { collectorId: 'test-pc', sequence: 1, entries: [{ gameId: 'minecraft', source: 'modrinth', minutes: 125 }] };
function response() {
  const output = { status: 0, body: undefined as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader(key: string, value: string) { output.headers[key] = value; },
    status(code: number) { output.status = code; return res; },
    json(body: unknown) { output.body = body; return res; },
    end() { return res; },
  } as unknown as VercelResponse;
  return { output, res };
}
function request(method: string, body?: unknown, authorization?: string) {
  return { method, body, headers: { authorization } } as VercelRequest;
}
const store: PlaytimeStore = {
  async read() { return { version: 1, updatedAt: null, games: { minecraft: { pc: 125 } } }; },
  async upload(data: Upload) { return { ok: true, accepted: true, replayed: false, lastSequence: data.sequence }; },
};
test('bearer authentication rejects malformed and wrong tokens', () => {
  assert.ok(authenticated(`Bearer ${token}`, token));
  for (const header of [undefined, token, 'Bearer ', 'Bearer wrong', [`Bearer ${token}`]]) assert.equal(authenticated(header, token), false);
});
test('upload validation accepts cumulative minutes and rejects malformed fields and unsafe values', () => {
  assert.deepEqual(validateUpload(payload, 'test-pc'), payload);
  for (const minutes of [-1, 1.5, NaN, Infinity, '125', 100_000_001]) {
    assert.throws(() => validateUpload({ ...payload, entries: [{ ...payload.entries[0], minutes }] }, 'test-pc'));
  }
  for (const value of [
    { ...payload, collectorId: 'another-pc' }, { ...payload, sequence: 0 }, { ...payload, sequence: Number.MAX_SAFE_INTEGER + 1 },
    { ...payload, entries: [] }, { ...payload, entries: [payload.entries[0], payload.entries[0]] },
    { ...payload, entries: [{ ...payload.entries[0], source: 'unknown' }] },
    { ...payload, entries: [{ ...payload.entries[0], platform: 'console' }] }, { ...payload, secret: true },
  ]) assert.throws(() => validateUpload(value, 'test-pc'));
});
test('library uploads discard unmapped games, map Steam app IDs and allow entirely unmapped batches', () => {
  const mixed = validateUpload({ ...payload, entries: [
    { source: 'steam', appId: 526870, minutes: 240 },
    { source: 'steam', appId: 999999999, minutes: 500 },
    { source: 'steam', gameId: 'not-on-the-site', minutes: 100 },
    { source: 'steam', gameId: '1293830', minutes: 1221 },
    payload.entries[0],
  ] }, 'test-pc');
  assert.deepEqual(mixed.entries, [{ gameId: 'satisfactory', source: 'steam', minutes: 240 }, { gameId: 'forza-horizon-4', source: 'steam', minutes: 1221 }, payload.entries[0]]);
  assert.deepEqual(validateUpload({ ...payload, entries: [{ source: 'steam', appId: 999999999, minutes: 500 }] }, 'test-pc').entries, []);
  assert.throws(() => validateUpload({ ...payload, entries: [{ source: 'steam', appId: 526870, minutes: -1 }] }, 'test-pc'));
});
test('public reads expose totals with caching and CORS, without requiring authentication', async () => {
  const handler = makeHandler({ DATABASE_URL: 'test' }, () => store);
  const { output, res } = response();
  await handler(request('GET'), res);
  assert.equal(output.status, 200);
  assert.deepEqual(output.body, { version: 1, updatedAt: null, games: { minecraft: { pc: 125 } } });
  assert.equal(output.headers['Access-Control-Allow-Origin'], '*');
  assert.match(output.headers['Cache-Control'], /s-maxage=60/);
});
test('writes authenticate before touching the database and never cache responses', async () => {
  let calls = 0;
  const handler = makeHandler({ DATABASE_URL: 'test', PLAYTIME_UPLOAD_TOKEN: token, PLAYTIME_COLLECTOR_ID: 'test-pc' }, () => { calls++; return store; });
  const denied = response();
  await handler(request('POST', payload, 'Bearer wrong'), denied.res);
  assert.equal(denied.output.status, 401);
  assert.equal(calls, 0);
  const accepted = response();
  await handler(request('POST', payload, `Bearer ${token}`), accepted.res);
  assert.equal(accepted.output.status, 200);
  assert.equal(calls, 1);
  assert.equal(accepted.output.headers['Cache-Control'], 'no-store');
});
test('missing configuration, malformed JSON and database errors never expose secrets', async () => {
  const missing = response();
  await makeHandler({})(request('POST', payload, `Bearer ${token}`), missing.res);
  assert.equal(missing.output.status, 503);
  const handler = makeHandler({ DATABASE_URL: 'private-db-url', PLAYTIME_UPLOAD_TOKEN: token, PLAYTIME_COLLECTOR_ID: 'test-pc' }, () => ({ ...store, async read() { throw new Error('private-db-url'); } }));
  const invalid = response();
  await handler(request('POST', '{bad', `Bearer ${token}`), invalid.res);
  assert.equal(invalid.output.status, 400);
  const failed = response();
  await handler(request('GET'), failed.res);
  assert.equal(failed.output.status, 503);
  assert.equal(JSON.stringify(failed.output.body).includes('private-db-url'), false);
});
test('unsupported methods and oversized bodies are rejected', async () => {
  const handler = makeHandler({ DATABASE_URL: 'test', PLAYTIME_UPLOAD_TOKEN: token, PLAYTIME_COLLECTOR_ID: 'test-pc' }, () => store);
  const unsupported = response();
  await handler(request('DELETE'), unsupported.res);
  assert.equal(unsupported.output.status, 405);
  const oversized = response();
  await handler(request('POST', ' '.repeat(512 * 1024 + 1), `Bearer ${token}`), oversized.res);
  assert.equal(oversized.output.status, 413);
});
