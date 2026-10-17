import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createRequire } from "node:module";
import { test } from "node:test";
import {
  fetchActivity,
  createActivityHandler,
  normalizeEvent,
} from "../api/github-activity.js";

const fixture = createRequire(import.meta.url)("./fixtures/github.cjs");
const response = () => {
  const output = { status: 0, headers: {}, body: null };
  return {
    output,
    res: {
      status(value) {
        output.status = value;
      },
      setHeader(key, value) {
        output.headers[key] = value;
      },
      send(value) {
        output.body = JSON.parse(value);
      },
    },
  };
};

test("real HTTP GitHub queries return public history, author attribution, pagination and latest ten activities", async (t) => {
  const calls = [];
  const server = createServer((req, res) => {
    calls.push([req.method, req.url]);
    fixture(req, res);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const request = (url, options) => {
    const target = new URL(url);
    return fetch(
      `http://127.0.0.1:${server.address().port}${target.pathname}${target.search}`,
      options,
    );
  };
  const data = await fetchActivity({
    token: "fixture-only",
    request,
    now: () => 123,
  });
  assert.equal(data.time, 123);
  assert.equal(data.events.length, 10);
  assert.ok(
    data.events.every(
      (event, index) =>
        index === 0 ||
        Date.parse(data.events[index - 1].date) >= Date.parse(event.date),
    ),
  );
  assert.equal(data.projects[0].commits[0].own, true);
  assert.equal(data.projects[0].commits[1].own, false);
  assert.equal(data.projects[0].releases.length, 1);
  assert.equal(data.projects[0].hasMore, true);
  assert.ok(!JSON.stringify(data).includes("other/private"));
  assert.ok(!JSON.stringify(data).includes("secret draft"));
  assert.ok(!JSON.stringify(data).includes("fixture-only"));
  const older = await fetchActivity({
    token: "fixture-only",
    request,
    project: "roblox-manager",
    cursor: "next-page",
  });
  assert.equal(older.projects.length, 1);
  assert.equal(older.projects[0].commits[0].id, "older");
  assert.equal(older.projects[0].hasMore, false);
  assert.deepEqual(older.projects[0].releases, []);
  assert.deepEqual(calls.map((call) => call[0]).sort(), [
    "GET",
    "POST",
    "POST",
  ]);
  assert.ok(
    calls.some(
      ([, path]) => path === "/users/Paryx-games/events/public?per_page=100",
    ),
  );
});

test("one restricted GraphQL repository uses cached public HTTP history without blocking other projects", async (t) => {
  const publicRequests = [];
  const server = createServer((req, res) => {
    req.headers["x-fixture-deny-repo"] = "roblox-shortcuts";
    if (req.url.startsWith("/repos/"))
      publicRequests.push({
        path: req.url,
        authorization: req.headers.authorization,
      });
    fixture(req, res);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const request = (url, options) => {
    const target = new URL(url);
    return fetch(
      `http://127.0.0.1:${server.address().port}${target.pathname}${target.search}`,
      options,
    );
  };
  const data = await fetchActivity({ token: "fixture-only", request });
  assert.deepEqual(data.errors, {});
  assert.equal(data.projects.length, 4);
  assert.equal(
    data.projects.find((project) => project.id === "roblox-shortcuts")
      .commits[0].title,
    "feat: public history fallback",
  );
  assert.equal(publicRequests.length, 3);
  assert.ok(publicRequests.every((call) => call.authorization === undefined));
  await fetchActivity({ token: "fixture-only", request });
  assert.equal(publicRequests.length, 3);
  const older = await fetchActivity({
    token: "fixture-only",
    request,
    project: "roblox-shortcuts",
    cursor: "rest-2",
  });
  assert.equal(older.projects[0].commits.length, 1);
  assert.ok(publicRequests.at(-1).path.includes("page=2"));
});

test("private repositories and partial GraphQL responses cannot enter a public cached snapshot", async () => {
  const request = async (url) => ({
    ok: true,
    json: async () =>
      url.endsWith("/graphql")
        ? { data: { p0: { isPrivate: true, description: "secret" } } }
        : [],
  });
  const data = await fetchActivity({
    token: "fixture",
    request,
    project: "roblox-manager",
  });
  assert.deepEqual(data.projects, []);
  assert.deepEqual(data.events, []);
  assert.ok(!JSON.stringify(data).includes("secret"));
  await assert.rejects(
    fetchActivity({
      token: "fixture",
      project: "roblox-manager",
      request: async () => ({
        ok: true,
        json: async () => ({ data: {}, errors: [{ message: "secret-token" }] }),
      }),
    }),
    /unavailable/,
  );
});

test("public events reject malformed/private data and discard unsafe upstream URLs", () => {
  assert.equal(normalizeEvent({ public: false }), null);
  assert.equal(
    normalizeEvent({
      public: true,
      repo: { name: "safe/repo" },
      created_at: "2026-10-17",
    }),
    null,
  );
  const event = normalizeEvent({
    id: "1",
    public: true,
    type: "IssuesEvent",
    repo: { name: "safe/repo" },
    created_at: "2026-10-17",
    actor: { login: "someone" },
    payload: {
      issue: {
        title: "<script>literal</script>",
        html_url: "javascript:alert(1)",
      },
    },
  });
  assert.equal(event.url, "https://github.com/safe/repo");
  assert.equal(event.own, false);
});

test("activity cache coalesces callers, preserves timestamps on failure, and rejects invalid requests", async () => {
  let time = 100;
  let calls = 0;
  let fail = false;
  const handler = createActivityHandler({
    now: () => time,
    configured: () => true,
    load: async () => {
      calls++;
      if (fail) throw new Error("private token");
      return { version: 1, time, events: [], projects: [], errors: {} };
    },
  });
  const first = response();
  const second = response();
  await Promise.all([
    handler({ method: "GET", url: "/" }, first.res),
    handler({ method: "GET", url: "/" }, second.res),
  ]);
  assert.equal(calls, 1);
  time += 60000;
  fail = true;
  const stale = response();
  await handler({ method: "GET", url: "/" }, stale.res);
  assert.equal(stale.output.body.time, 100);
  assert.equal(stale.output.body.stale, true);
  assert.equal(stale.output.headers["Cache-Control"], "no-store");
  const retry = response();
  await handler({ method: "GET", url: "/" }, retry.res);
  assert.equal(calls, 2);
  fail = false;
  const older = response();
  await handler(
    {
      method: "GET",
      url: "/?project=roblox-manager&cursor=76cf8f509a4a77ce27bbc3b90700ae2d4568f852+29",
    },
    older.res,
  );
  assert.equal(older.output.status, 200);
  for (const [method, url, status] of [
    ["POST", "/", 405],
    ["GET", "/?project=unknown", 400],
    ["GET", "/?cursor=next-page", 400],
    ["GET", "/?project=roblox-manager&cursor=%3Cscript%3E", 400],
  ]) {
    const target = response();
    await handler({ method, url }, target.res);
    assert.equal(target.output.status, status);
  }
  const unavailable = response();
  await createActivityHandler({ configured: () => false })(
    { method: "GET", url: "/" },
    unavailable.res,
  );
  assert.equal(unavailable.output.status, 503);
});
