import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchProjects,
  createProjectsHandler,
} from "../api/github-projects.js";
import { createProjectsClient } from "../public/assets/github-projects.js";

const repo = (name, extra = {}) => ({
  name,
  nameWithOwner: `Paryx-games/${name}`,
  owner: { login: "Paryx-games" },
  description: "A public project",
  isPrivate: false,
  isArchived: false,
  isFork: false,
  stargazerCount: 4,
  forkCount: 2,
  primaryLanguage: { name: "Rust" },
  languages: {
    edges: [
      { size: 75, node: { name: "Rust" } },
      { size: 25, node: { name: "TypeScript" } },
    ],
    pageInfo: { hasNextPage: false },
  },
  issuesOpen: { totalCount: 2 },
  issuesClosed: { totalCount: 30 },
  prsOpen: { totalCount: 3 },
  prsClosed: { totalCount: 41 },
  ...extra,
});
const page = (nodes) => ({
  nodes,
  pageInfo: { hasNextPage: false, endCursor: null },
});
const payload = {
  version: 1,
  time: 1000,
  pinned: [],
  games: [],
  labs: [],
  errors: {},
};

test("one GitHub query returns all card data and filters private repositories and parents", async () => {
  const project = repo("fork", {
    isFork: true,
    parent: { nameWithOwner: "upstream/project", isPrivate: false },
  });
  const secret = repo("secret", { isPrivate: true });
  let calls = 0;
  const data = await fetchProjects({
    token: "server-only-token",
    now: () => 1000,
    request: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.github.com/graphql");
      assert.equal(options.headers.Authorization, "Bearer server-only-token");
      assert.ok(
        JSON.parse(options.body).query.includes("states: [CLOSED, MERGED]"),
      );
      return {
        ok: true,
        json: async () => ({
          data: {
            user: {
              pinnedItems: page([project, secret]),
              repositories: page([project, secret]),
            },
            organization: {
              repositories: page([
                repo("other", {
                  parent: { nameWithOwner: "private/parent", isPrivate: true },
                }),
              ]),
            },
          },
        }),
      };
    },
  });
  assert.equal(calls, 1);
  assert.equal(data.pinned.length, 1);
  assert.equal(data.games[0].stats.prsClosed, 41);
  assert.equal(data.games[0].stats.parent, "upstream/project");
  assert.deepEqual(data.games[0].languageBytes, { Rust: 75, TypeScript: 25 });
  assert.equal(data.labs[0].parent, null);
  assert.ok(!JSON.stringify(data).includes("secret"));
  assert.ok(!JSON.stringify(data).includes("server-only-token"));
});

test("profiles beyond GitHub page limits remain complete without refetching completed sources", async () => {
  let calls = 0;
  const data = await fetchProjects({
    token: "token",
    request: async (_, options) => {
      const { variables } = JSON.parse(options.body);
      calls++;
      if (calls === 1)
        return {
          ok: true,
          json: async () => ({
            data: {
              user: {
                pinnedItems: page([]),
                repositories: {
                  nodes: [repo("one")],
                  pageInfo: { hasNextPage: true, endCursor: "next" },
                },
              },
              organization: { repositories: page([repo("org")]) },
            },
          }),
        };
      assert.equal(variables.includeLabs, false);
      assert.equal(variables.userAfter, "next");
      return {
        ok: true,
        json: async () => ({
          data: {
            user: { pinnedItems: page([]), repositories: page([repo("two")]) },
          },
        }),
      };
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(
    data.games.map((repo) => repo.name),
    ["one", "two"],
  );
  assert.equal(data.labs.length, 1);
});

test("pinned and duplicate cards share complete language pagination", async () => {
  const project = repo("many-languages", {
    languages: {
      edges: [{ size: 5, node: { name: "Rust" } }],
      pageInfo: { hasNextPage: true, endCursor: "languages-next" },
    },
  });
  let calls = 0;
  const data = await fetchProjects({
    token: "token",
    request: async (_, options) => {
      calls++;
      if (calls === 1)
        return {
          ok: true,
          json: async () => ({
            data: {
              user: {
                pinnedItems: page([structuredClone(project)]),
                repositories: page([project]),
              },
              organization: { repositories: page([]) },
            },
          }),
        };
      assert.equal(JSON.parse(options.body).variables.after, "languages-next");
      return {
        ok: true,
        json: async () => ({
          data: {
            repository: {
              languages: {
                edges: [{ size: 5, node: { name: "Lua" } }],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        }),
      };
    },
  });
  assert.deepEqual(data.pinned[0].languageBytes, { Rust: 5, Lua: 5 });
  assert.deepEqual(data.games[0].languageBytes, data.pinned[0].languageBytes);
});

test("all browser consumers share one HTTP fetch even when storage is unavailable", async () => {
  let calls = 0;
  const get = createProjectsClient({
    storage: () => {
      throw new Error("disabled");
    },
    request: async (url) => {
      calls++;
      assert.equal(url, "/api/github-projects");
      return { ok: true, json: async () => payload };
    },
  });
  const values = await Promise.all([get(), get(), get(), get()]);
  assert.equal(calls, 1);
  assert.ok(values.every((value) => value === values[0]));
});

test("fresh browser cache avoids network requests and an expired cache refreshes once", async () => {
  let calls = 0;
  const storage = () => ({
    getItem: () => JSON.stringify({ time: 1000, data: payload }),
    setItem() {},
  });
  const request = async () => {
    calls++;
    return { ok: true, json: async () => payload };
  };
  await createProjectsClient({ storage, request, now: () => 1001 })();
  assert.equal(calls, 0);
  const get = createProjectsClient({ storage, request, now: () => 1000000 });
  await Promise.all([get(), get()]);
  assert.equal(calls, 1);
});

const response = () => ({
  status(code) {
    this.code = code;
  },
  headers: {},
  setHeader(key, value) {
    this.headers[key] = value;
  },
  send(body) {
    this.body = JSON.parse(body);
  },
});

test("server cache and concurrent requests share one upstream load", async () => {
  let calls = 0;
  let release;
  const handler = createProjectsHandler({
    configured: () => true,
    now: () => 1001,
    load: async () => {
      calls++;
      await new Promise((resolve) => {
        release = resolve;
      });
      return payload;
    },
  });
  const a = response(),
    b = response();
  const first = handler({ method: "GET" }, a),
    second = handler({ method: "GET" }, b);
  release();
  await Promise.all([first, second]);
  await handler({ method: "GET" }, response());
  assert.equal(calls, 1);
  assert.equal(a.code, 200);
  assert.deepEqual(a.body, b.body);
  assert.ok(a.headers["Cache-Control"].includes("s-maxage=900"));
});

test("unsupported methods, missing credentials and provider errors never leak secrets or cache errors", async () => {
  const missing = createProjectsHandler({ configured: () => false });
  const denied = response();
  await missing({ method: "POST" }, denied);
  assert.equal(denied.code, 405);
  const absent = response();
  await missing({ method: "GET" }, absent);
  assert.equal(absent.code, 503);
  const failed = response();
  await createProjectsHandler({
    configured: () => true,
    load: async () => {
      throw new Error("private-token");
    },
  })({ method: "GET" }, failed);
  assert.equal(failed.code, 502);
  assert.equal(failed.headers["Cache-Control"], "no-store");
  assert.ok(!JSON.stringify(failed.body).includes("private-token"));
});
