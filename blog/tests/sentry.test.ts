import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ErrorEvent } from '@sentry/browser';
import { sanitizeBrowserEvent } from '../src/sentry.js';

test('browser Sentry events keep the page path and error details only', () => {
  const event: ErrorEvent = {
    type: undefined,
    event_id: 'event-id',
    timestamp: 1,
    platform: 'javascript',
    level: 'error',
    message: 'Authorization: Bearer abc123 failed for user@example.com',
    exception: {
      values: [
        {
          type: 'Error',
          value: 'password=secret at 192.0.2.1',
          stacktrace: {
            frames: [
              {
                filename:
                  'https://blog.example.test/assets/app.js?token=secret',
                function: 'render',
                lineno: 12,
                colno: 3,
                in_app: true,
                vars: { password: 'secret' },
              },
            ],
          },
        },
      ],
    },
    contexts: {
      user: { email: 'user@example.com' },
    },
    request: { url: 'https://blog.example.test/post?token=secret' },
    user: { email: 'user@example.com' },
    extra: { payload: 'private' },
    breadcrumbs: [{ message: 'private interaction' }],
    sdk: {
      name: 'sentry.javascript.browser',
      version: '1',
      integrations: ['replay'],
    },
  };

  const sanitized = sanitizeBrowserEvent(
    event,
    '/post',
    'Browser/1.0',
    'Win32',
  );

  assert.equal(sanitized.message?.includes('abc123'), false);
  assert.equal(sanitized.message?.includes('user@example.com'), false);
  assert.deepEqual(sanitized.request, { url: '/post' });
  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.breadcrumbs, undefined);
  assert.deepEqual(sanitized.contexts, {
    browser: { user_agent: 'Browser/1.0' },
    os: { platform: 'Win32' },
  });
  assert.deepEqual(sanitized.sdk, {
    name: 'sentry.javascript.browser',
    version: '1',
  });
  assert.equal(
    sanitized.exception?.values?.[0].stacktrace?.frames?.[0].filename,
    'https://blog.example.test/assets/app.js',
  );
  assert.equal(JSON.stringify(sanitized).includes('private'), false);
});
