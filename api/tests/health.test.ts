import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeHandler as makeHealthHandler } from '../api/health.js';
import { makeHandler as makeReadyHandler } from '../api/ready.js';

function response() {
  const output = { status: 0, body: undefined as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader(key: string, value: string) { output.headers[key] = value; },
    status(code: number) { output.status = code; return res; },
    json(body: unknown) { output.body = body; return res; },
  } as unknown as VercelResponse;
  return { output, res };
}

function request(method: string) {
  return { method } as VercelRequest;
}

test('health reports process health without checking external dependencies', async () => {
  const { output, res } = response();
  await makeHealthHandler()(request('GET'), res);
  assert.equal(output.status, 200);
  assert.deepEqual(output.body, { status: 'ok' });
  assert.equal(output.headers['Cache-Control'], 'no-store');
});

test('health rejects methods other than GET', async () => {
  const { output, res } = response();
  await makeHealthHandler()(request('POST'), res);
  assert.equal(output.status, 405);
  assert.equal(output.headers.Allow, 'GET');
});

test('readiness rejects missing database configuration without probing', async () => {
  let checks = 0;
  const { output, res } = response();
  await makeReadyHandler({}, async () => { checks++; })(request('GET'), res);
  assert.equal(output.status, 503);
  assert.deepEqual(output.body, { status: 'not_ready', dependency: 'database' });
  assert.equal(checks, 0);
});

test('readiness returns ready when the database responds', async () => {
  let checkedUrl = '';
  const { output, res } = response();
  await makeReadyHandler({ DATABASE_URL: 'test-database-url' }, async (url) => { checkedUrl = url; })(request('GET'), res);
  assert.equal(output.status, 200);
  assert.deepEqual(output.body, { status: 'ready' });
  assert.equal(checkedUrl, 'test-database-url');
});

test('readiness returns a generic unavailable response when the database probe fails', async () => {
  const { output, res } = response();
  await makeReadyHandler({ DATABASE_URL: 'test-database-url' }, async () => { throw new Error('private connection detail'); })(request('GET'), res);
  assert.equal(output.status, 503);
  assert.deepEqual(output.body, { status: 'not_ready', dependency: 'database' });
  assert.equal(JSON.stringify(output.body).includes('private connection detail'), false);
});
