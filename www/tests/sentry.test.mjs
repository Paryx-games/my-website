import assert from "node:assert/strict";
import { test } from "node:test";
import { release as osRelease } from "node:os";
import { platform, version } from "node:process";
import { sanitizeApiEvent } from "../api/sentry.js";

test("main-site API Sentry events keep diagnostic fields and discard request data", () => {
  const event = {
    type: undefined,
    event_id: "event-id",
    timestamp: 1,
    platform: "node",
    level: "error",
    message: "Authorization: Bearer abc123 failed for user@example.com",
    exception: {
      values: [
        {
          type: "Error",
          value: "password=secret at 192.0.2.1",
          stacktrace: {
            frames: [
              {
                filename: "file:///api/handler.js?token=secret",
                function: "handler",
                lineno: 12,
                colno: 3,
                in_app: true,
                vars: { password: "secret" },
              },
            ],
          },
        },
      ],
    },
    contexts: {
      request: { body: "private" },
    },
    request: { url: "https://api.example.test/github?token=secret" },
    user: { email: "user@example.com" },
    extra: { payload: "private" },
    breadcrumbs: [{ message: "private interaction" }],
    tags: { route: "/api/github-projects" },
    sdk: {
      name: "sentry.javascript.node",
      version: "1",
      integrations: ["http"],
    },
  };

  const sanitized = sanitizeApiEvent(event);

  assert.equal(sanitized.message.includes("abc123"), false);
  assert.equal(sanitized.message.includes("user@example.com"), false);
  assert.equal(sanitized.request, undefined);
  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.breadcrumbs, undefined);
  assert.deepEqual(sanitized.tags, {
    application: "www-api",
    route: "/api/github-projects",
  });
  assert.deepEqual(sanitized.contexts, {
    os: { name: platform, version: osRelease() },
    runtime: { name: "node", version },
  });
  assert.deepEqual(sanitized.sdk, {
    name: "sentry.javascript.node",
    version: "1",
  });
  assert.equal(
    sanitized.exception.values[0].stacktrace.frames[0].filename,
    "file:///api/handler.js",
  );
  assert.equal(JSON.stringify(sanitized).includes("private"), false);
});
