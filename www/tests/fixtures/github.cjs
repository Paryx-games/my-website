const { createServer } = require("node:http");

// A public GitHub HTTP contract fixture. Unknown routes deliberately fail loudly.
module.exports = async function github(req, res) {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (
    req.url === "/users/Paryx-games/events/public?per_page=100" &&
    req.method === "GET"
  )
    return send(200, [
      {
        id: "public",
        type: "WatchEvent",
        public: true,
        created_at: "2026-10-17T12:00:00Z",
        repo: { name: "other/public" },
        actor: { login: "Paryx-games" },
        payload: {},
      },
      {
        id: "secret",
        type: "WatchEvent",
        public: false,
        created_at: "2026-10-17T12:01:00Z",
        repo: { name: "other/private" },
        actor: { login: "Paryx-games" },
        payload: {},
      },
    ]);
  if (req.url !== "/graphql" || req.method !== "POST")
    return send(501, {
      error: "This GitHub route is outside the fixture contract",
    });
  let body = "";
  for await (const chunk of req) body += chunk;
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return send(400, { message: "Invalid JSON" });
  }
  if (
    !input.query?.includes("isPrivate") ||
    !input.query.includes("committedDate")
  )
    return send(400, { message: "Required repository fields missing" });
  const data = {};
  for (const match of input.query.matchAll(
    /(p\d+): repository\(owner: "([^"]+)", name: "([^"]+)"\)/g,
  )) {
    const [, alias, owner, name] = match;
    const repo = `${owner}/${name}`;
    const pageInfo = { hasNextPage: false, endCursor: null };
    const next = input.variables.cursor;
    data[alias] = {
      isPrivate: name === "pulse-private",
      description: "A public project",
      nameWithOwner: repo,
      ...(input.variables.commits
        ? {
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [
                    {
                      oid: next ? "older" : "own",
                      messageHeadline: "feat!: support workspaces",
                      messageBody: "BREAKING CHANGE: new format",
                      committedDate: next
                        ? "2026-09-17T10:00:00Z"
                        : "2026-10-17T10:00:00Z",
                      url: `https://github.com/${repo}/commit/${next ? "older" : "own"}`,
                      author: { name: "paryx", user: { login: "Paryx-games" } },
                    },
                    ...(!next
                      ? [
                          {
                            oid: "collab",
                            messageHeadline: "fix: improve imports",
                            messageBody: "",
                            committedDate: "2026-10-16T10:00:00Z",
                            url: `https://github.com/${repo}/commit/collab`,
                            author: {
                              name: "Contributor",
                              user: { login: "another-developer" },
                            },
                          },
                        ]
                      : []),
                  ],
                  pageInfo: next
                    ? pageInfo
                    : { hasNextPage: true, endCursor: "next-page" },
                },
              },
            },
            pullRequests: {
              nodes: [
                {
                  number: 2,
                  title: "Improve imports",
                  url: `https://github.com/${repo}/pull/2`,
                  mergedAt: "2026-10-16T11:00:00Z",
                  author: { login: "another-developer" },
                  mergedBy: { login: "Paryx-games" },
                },
              ],
            },
          }
        : {}),
      ...(input.variables.releases
        ? {
            releases: {
              nodes: [
                {
                  id: `${repo}-v1`,
                  name: "Version 1",
                  tagName: "v1.0.0",
                  publishedAt: "2026-10-15T10:00:00Z",
                  url: `https://github.com/${repo}/releases/tag/v1.0.0`,
                  description:
                    "## Features\nWorkspaces\n## Breaking changes\nNew format",
                  isDraft: false,
                  author: { login: "Paryx-games" },
                },
                {
                  id: "draft",
                  name: "Unpublished",
                  tagName: "draft",
                  publishedAt: null,
                  description: "secret draft",
                  isDraft: true,
                },
              ],
              pageInfo,
            },
          }
        : {}),
    };
  }
  return send(200, { data });
};

if (require.main === module)
  createServer(module.exports).listen(
    Number(process.env.PORT || 4901),
    "127.0.0.1",
    () => console.log("GitHub contract fixture listening"),
  );
