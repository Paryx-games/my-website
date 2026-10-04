// GET /api/github-projects returns public pinned, personal and organisation
// repositories with card metadata and statistics. Credentials stay on the server.
export const PROJECTS_QUERY = `
  query Projects($includeUser: Boolean!, $includeLabs: Boolean!, $userAfter: String, $labsAfter: String) {
    user(login: "Paryx-games") @include(if: $includeUser) {
      pinnedItems(first: 6, types: [REPOSITORY]) { nodes { ... on Repository { ...Project } } }
      repositories(first: 100, after: $userAfter, privacy: PUBLIC, ownerAffiliations: [OWNER], orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes { ...Project }
        pageInfo { hasNextPage endCursor }
      }
    }
    organization(login: "Paryx-Labs") @include(if: $includeLabs) {
      repositories(first: 100, after: $labsAfter, privacy: PUBLIC, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes { ...Project }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
  fragment Project on Repository {
    name nameWithOwner description isPrivate isArchived isFork stargazerCount forkCount
    owner { login }
    parent { nameWithOwner isPrivate }
    primaryLanguage { name }
    languages(first: 100, orderBy: {field: SIZE, direction: DESC}) {
      edges { size node { name } }
      pageInfo { hasNextPage endCursor }
    }
    issuesOpen: issues(states: [OPEN]) { totalCount }
    issuesClosed: issues(states: [CLOSED]) { totalCount }
    prsOpen: pullRequests(states: [OPEN]) { totalCount }
    prsClosed: pullRequests(states: [CLOSED, MERGED]) { totalCount }
  }
`;

const publicRepos = (nodes) =>
  (nodes || []).filter((repo) => repo?.isPrivate === false);
const languageBytes = (edges) =>
  Object.fromEntries((edges || []).map((edge) => [edge.node.name, edge.size]));
const normalize = (repo) => {
  const parent =
    repo.parent?.isPrivate === false ? repo.parent.nameWithOwner : null;
  return {
    full_name: repo.nameWithOwner,
    name: repo.name,
    owner: repo.owner,
    description: repo.description || "",
    private: false,
    language: repo.primaryLanguage?.name || "",
    stargazers_count: repo.stargazerCount,
    forks_count: repo.forkCount,
    archived: repo.isArchived,
    fork: repo.isFork,
    parent: parent ? { full_name: parent } : null,
    languageBytes: languageBytes(repo.languages?.edges),
    stats: {
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      archived: repo.isArchived,
      fork: repo.isFork,
      parent,
      issuesOpen: repo.issuesOpen?.totalCount ?? null,
      issuesClosed: repo.issuesClosed?.totalCount ?? null,
      prsOpen: repo.prsOpen?.totalCount ?? null,
      prsClosed: repo.prsClosed?.totalCount ?? null,
    },
  };
};

export async function fetchProjects({
  token = process.env.GITHUB_TOKEN,
  request = fetch,
  now = Date.now,
} = {}) {
  if (!token) throw new Error("GitHub projects are not configured");
  const graphql = async (query, variables) => {
    const response = await request("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "paryx-website",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("GitHub project data unavailable");
    const result = await response.json();
    if (!result.data) throw new Error("GitHub project data unavailable");
    return result;
  };
  const nodes = { pinned: [], games: [], labs: [] };
  const errors = {};
  let includeUser = true;
  let includeLabs = true;
  let userAfter = null;
  let labsAfter = null;
  while (includeUser || includeLabs) {
    const result = await graphql(PROJECTS_QUERY, {
      includeUser,
      includeLabs,
      userAfter,
      labsAfter,
    });
    if (includeUser) {
      const user = result.data.user;
      if (!user) {
        errors.games = errors.pinned =
          "Personal GitHub repositories unavailable";
      } else {
        if (!userAfter) nodes.pinned = publicRepos(user.pinnedItems?.nodes);
        if (!user.pinnedItems)
          errors.pinned = "Pinned GitHub repositories unavailable";
        if (!user.repositories)
          errors.games = "Personal GitHub repositories unavailable";
        nodes.games.push(...publicRepos(user.repositories?.nodes));
      }
      includeUser = Boolean(user?.repositories?.pageInfo.hasNextPage);
      const nextUser = user?.repositories?.pageInfo.endCursor || null;
      if (includeUser && (!nextUser || nextUser === userAfter))
        throw new Error("GitHub pagination unavailable");
      userAfter = nextUser;
    }
    if (includeLabs) {
      const labs = result.data.organization;
      if (!labs?.repositories)
        errors.labs = "Paryx Labs repositories unavailable";
      else nodes.labs.push(...publicRepos(labs.repositories?.nodes));
      includeLabs = Boolean(labs?.repositories?.pageInfo.hasNextPage);
      const nextLabs = labs?.repositories?.pageInfo.endCursor || null;
      if (includeLabs && (!nextLabs || nextLabs === labsAfter))
        throw new Error("GitHub pagination unavailable");
      labsAfter = nextLabs;
    }
  }
  // Connections over GitHub's 100-item limit need extra pages; the browser still
  // receives one response, and ordinary-sized profiles use one upstream request.
  for (const repo of new Map(
    Object.values(nodes)
      .flat()
      .map((repo) => [repo.nameWithOwner, repo]),
  ).values()) {
    while (repo.languages?.pageInfo.hasNextPage) {
      const result = await graphql(
        `
          query Languages($owner: String!, $name: String!, $after: String!) {
            repository(owner: $owner, name: $name) {
              languages(
                first: 100
                after: $after
                orderBy: { field: SIZE, direction: DESC }
              ) {
                edges {
                  size
                  node {
                    name
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `,
        {
          owner: repo.owner.login,
          name: repo.name,
          after: repo.languages.pageInfo.endCursor,
        },
      );
      const next = result.data.repository?.languages;
      if (
        !next ||
        (next.pageInfo.hasNextPage &&
          (!next.pageInfo.endCursor ||
            next.pageInfo.endCursor === repo.languages.pageInfo.endCursor))
      )
        throw new Error("GitHub languages unavailable");
      repo.languages.edges.push(...next.edges);
      repo.languages.pageInfo = next.pageInfo;
    }
  }
  const complete = new Map(
    Object.values(nodes)
      .flat()
      .map((repo) => [repo.nameWithOwner, normalize(repo)]),
  );
  return {
    version: 1,
    time: now(),
    errors,
    ...Object.fromEntries(
      Object.entries(nodes).map(([key, repos]) => [
        key,
        repos.map((repo) => complete.get(repo.nameWithOwner)),
      ]),
    ),
  };
}

export function createProjectsHandler({
  load = fetchProjects,
  now = Date.now,
  configured = () => Boolean(process.env.GITHUB_TOKEN),
} = {}) {
  let cached;
  let pending;
  return async function handler(req, res) {
    const send = (status, body) => {
      res.status(status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Cache-Control",
        status === 200 && !Object.keys(body.errors || {}).length
          ? "public, s-maxage=900, stale-while-revalidate=3600"
          : "no-store",
      );
      res.send(JSON.stringify(body));
    };
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(405, { error: "Method not allowed" });
    }
    if (!configured())
      return send(503, { error: "GitHub projects are not configured" });
    try {
      if (cached && now() - cached.time < 900000) return send(200, cached);
      pending ||= load()
        .then((data) => {
          if (!Object.keys(data.errors).length) cached = data;
          return data;
        })
        .finally(() => {
          pending = null;
        });
      return send(200, await pending);
    } catch {
      return send(502, { error: "GitHub project data unavailable" });
    }
  };
}

export default createProjectsHandler();
