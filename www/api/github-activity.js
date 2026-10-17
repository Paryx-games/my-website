import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../public/projects.json", import.meta.url), "utf8"),
);
const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
if (
  !/^[A-Za-z0-9-]+$/.test(config.account) ||
  !Array.isArray(config.authors) ||
  !Array.isArray(config.projects) ||
  config.projects.some(
    (project) =>
      !/^[a-z0-9-]+$/.test(project.id) || !repoPattern.test(project.repo),
  ) ||
  new Set(config.projects.map((project) => project.id)).size !==
    config.projects.length
)
  throw new Error("Invalid project catalogue");

const isOwn = (login) =>
  config.authors.some(
    (author) => author.toLowerCase() === String(login).toLowerCase(),
  );
const githubUrl = (url, fallback) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com"
      ? parsed.href
      : fallback;
  } catch {
    return fallback;
  }
};
const date = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;

export function normalizeEvent(event) {
  if (
    event?.public !== true ||
    typeof event.type !== "string" ||
    !event.id ||
    !repoPattern.test(event.repo?.name || "") ||
    !date(event.created_at)
  )
    return null;
  const payload = event.payload || {};
  const repo = event.repo.name;
  const base = `https://github.com/${repo}`;
  let title;
  let url = base;
  let kind = event.type.replace(/Event$/, "").toLowerCase();
  switch (event.type) {
    case "PushEvent":
      title = `Pushed to ${(payload.ref || "default branch").replace("refs/heads/", "")}`;
      if (/^[a-f0-9]{40}$/i.test(payload.head))
        url = `${base}/commit/${payload.head}`;
      break;
    case "PullRequestEvent":
      kind = payload.pull_request?.merged ? "merged" : "pull request";
      title = `${kind === "merged" ? "Merged" : payload.action || "Updated"} PR #${payload.number || payload.pull_request?.number}: ${payload.pull_request?.title || "Pull request"}`;
      url = githubUrl(payload.pull_request?.html_url, base);
      break;
    case "ReleaseEvent":
      kind = "release";
      title = `Released ${payload.release?.name || payload.release?.tag_name || "a new version"}`;
      url = githubUrl(payload.release?.html_url, base);
      break;
    case "IssuesEvent":
      kind = "issue";
      title = `${payload.action || "Updated"} issue #${payload.issue?.number}: ${payload.issue?.title || "Issue"}`;
      url = githubUrl(payload.issue?.html_url, base);
      break;
    case "IssueCommentEvent":
      kind = "comment";
      title = `Commented on #${payload.issue?.number}: ${payload.issue?.title || "Discussion"}`;
      url = githubUrl(payload.comment?.html_url, base);
      break;
    case "PullRequestReviewEvent":
    case "PullRequestReviewCommentEvent":
      kind = "review";
      title = `Reviewed PR: ${payload.pull_request?.title || "Pull request"}`;
      url = githubUrl(
        payload.review?.html_url ||
          payload.comment?.html_url ||
          payload.pull_request?.html_url,
        base,
      );
      break;
    case "CreateEvent":
      title = `Created ${payload.ref_type || "repository"}${payload.ref ? ` ${payload.ref}` : ""}`;
      break;
    case "DeleteEvent":
      title = `Deleted ${payload.ref_type || "ref"} ${payload.ref || ""}`;
      break;
    case "WatchEvent":
      title = "Starred repository";
      kind = "star";
      break;
    case "ForkEvent":
      title = "Forked repository";
      kind = "fork";
      break;
    case "PublicEvent":
      title = "Made repository public";
      kind = "repository";
      break;
    default:
      title = `${event.type.replace(/Event$/, "")} activity`;
  }
  return {
    id: `event-${event.id}`,
    kind,
    title,
    url,
    repo,
    author: event.actor?.login || "Unknown author",
    date: event.created_at,
    own: isOwn(event.actor?.login),
  };
}

export async function fetchActivity({
  token = process.env.GITHUB_TOKEN,
  request = fetch,
  now = Date.now,
  project,
  cursor,
  releaseCursor,
} = {}) {
  if (!token) throw new Error("GitHub activity is not configured");
  const selected = project
    ? config.projects.filter((item) => item.id === project)
    : config.projects;
  if (!selected.length) throw new Error("Unknown project");
  const paging = Boolean(cursor || releaseCursor);
  const includeCommits = !paging || Boolean(cursor);
  const includeReleases = !paging || Boolean(releaseCursor);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "paryx-website",
  };
  const json = async (url, options = {}) => {
    const response = await request(url, {
      headers,
      signal: AbortSignal.timeout(20000),
      ...options,
    });
    if (!response.ok) throw new Error("GitHub activity unavailable");
    return response.json();
  };
  const query = `query Activity($cursor: String, $releaseCursor: String, $commits: Boolean!, $releases: Boolean!) {
    ${selected
      .map((item, index) => {
        const [owner, name] = item.repo.split("/");
        return `p${index}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
        isPrivate description nameWithOwner
        releases(first: 20, after: $releaseCursor, orderBy: {field: CREATED_AT, direction: DESC}) @include(if: $releases) {
          nodes { id name tagName publishedAt url description isDraft author { login } }
          pageInfo { hasNextPage endCursor }
        }
        defaultBranchRef @include(if: $commits) { target { ... on Commit {
          history(first: 30, after: $cursor) {
            nodes { oid messageHeadline messageBody committedDate url author { name user { login } } }
            pageInfo { hasNextPage endCursor }
          }
        } } }
        pullRequests(first: 10, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) @include(if: $commits) {
          nodes { number title url mergedAt author { login } mergedBy { login } }
        }
      }`;
      })
      .join("\n")}
  }`;
  const resultPromise = json("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({
      query,
      variables: {
        cursor: cursor || null,
        releaseCursor: releaseCursor || null,
        commits: includeCommits,
        releases: includeReleases,
      },
    }),
  });
  const eventsPromise = project
    ? Promise.resolve([])
    : json(
        `https://api.github.com/users/${config.account}/events/public?per_page=100`,
      );
  const [result, eventResult] = await Promise.allSettled([
    resultPromise,
    eventsPromise,
  ]);
  if (
    result.status !== "fulfilled" ||
    !result.value.data ||
    result.value.errors?.length
  )
    throw new Error("GitHub activity unavailable");
  const errors = {};
  const events =
    eventResult.status === "fulfilled" && Array.isArray(eventResult.value)
      ? eventResult.value.map(normalizeEvent).filter(Boolean)
      : [];
  if (eventResult.status === "rejected" || !Array.isArray(eventResult.value))
    errors.events = "Public activity is temporarily unavailable";
  const projects = [];
  for (const [index, item] of selected.entries()) {
    const repo = result.value.data[`p${index}`];
    if (!repo || repo.isPrivate !== false) {
      errors[item.id] = "Public project history unavailable";
      continue;
    }
    const history = repo.defaultBranchRef?.target?.history;
    const commits = (history?.nodes || [])
      .filter((commit) => date(commit.committedDate))
      .map((commit) => {
        const author =
          commit.author?.user?.login || commit.author?.name || "Unknown author";
        return {
          id: commit.oid,
          sha: commit.oid,
          title: commit.messageHeadline,
          body: commit.messageBody || "",
          url: githubUrl(commit.url, `https://github.com/${item.repo}`),
          date: commit.committedDate,
          author,
          own: isOwn(commit.author?.user?.login),
        };
      });
    const releases = (repo.releases?.nodes || [])
      .filter((release) => !release.isDraft && date(release.publishedAt))
      .map((release) => ({
        id: release.id,
        name: release.name || release.tagName,
        tag: release.tagName,
        date: release.publishedAt,
        url: githubUrl(release.url, `https://github.com/${item.repo}/releases`),
        body: release.description || "",
        author: release.author?.login || "Unknown author",
        own: isOwn(release.author?.login),
      }));
    projects.push({
      ...item,
      description: repo.description || "",
      commits,
      releases,
      hasMore: history?.pageInfo.hasNextPage || false,
      cursor: history?.pageInfo.endCursor || null,
      hasMoreReleases: repo.releases?.pageInfo.hasNextPage || false,
      releaseCursor: repo.releases?.pageInfo.endCursor || null,
    });
    for (const commit of commits)
      events.push({
        ...commit,
        id: `commit-${item.repo}-${commit.sha}`,
        kind: "commit",
        repo: item.repo,
      });
    for (const release of releases)
      events.push({
        ...release,
        id: `release-${release.id}`,
        title: `Released ${release.name}`,
        kind: "release",
        repo: item.repo,
      });
    for (const pr of repo.pullRequests?.nodes || []) {
      if (!date(pr.mergedAt)) continue;
      const author = pr.mergedBy?.login || pr.author?.login || "Unknown author";
      events.push({
        id: `pr-${item.repo}-${pr.number}`,
        kind: "merged",
        title: `Merged PR #${pr.number}: ${pr.title}`,
        url: githubUrl(pr.url, `https://github.com/${item.repo}`),
        repo: item.repo,
        author,
        own: isOwn(author),
        date: pr.mergedAt,
      });
    }
  }
  const unique = new Map();
  // Prefer detailed repository history when it overlaps the public event stream.
  for (const event of [...events].reverse()) {
    const key = `${event.url}|${["merged", "pull request"].includes(event.kind) ? "pr" : event.kind === "push" ? "commit" : event.kind}`;
    if (!unique.has(key)) unique.set(key, event);
  }
  return {
    version: 1,
    time: now(),
    errors,
    projects,
    events: [...unique.values()]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 10),
  };
}

export function createActivityHandler({
  load = fetchActivity,
  now = Date.now,
  configured = () => Boolean(process.env.GITHUB_TOKEN),
} = {}) {
  const cache = new Map();
  return async (req, res) => {
    const send = (status, data) => {
      res.status(status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Cache-Control",
        status === 200 && !data.stale && !Object.keys(data.errors || {}).length
          ? "public, s-maxage=60, stale-while-revalidate=60"
          : "no-store",
      );
      res.send(JSON.stringify(data));
    };
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(405, { error: "Method not allowed" });
    }
    const params = new URL(req.url || "/", "https://paryx.uk").searchParams;
    const project = params.get("project");
    const cursor = params.get("cursor");
    const releaseCursor = params.get("releaseCursor");
    if (
      (project && !config.projects.some((item) => item.id === project)) ||
      ((cursor || releaseCursor) && !project) ||
      [cursor, releaseCursor].some(
        (value) => value !== null && !/^[A-Za-z0-9_+/= -]{1,512}$/.test(value),
      )
    )
      return send(400, { error: "Invalid project or history cursor" });
    if (!configured())
      return send(503, { error: "GitHub activity is not configured" });
    const key = JSON.stringify([project, cursor, releaseCursor]);
    if (!cache.has(key)) {
      if (cache.size >= 64) {
        const evict = [...cache].find(([, entry]) => !entry.pending);
        if (evict) cache.delete(evict[0]);
      }
      cache.set(key, {});
    }
    const entry = cache.get(key);
    const fallback = () =>
      entry.data
        ? send(200, { ...entry.data, stale: true })
        : send(502, { error: "GitHub activity is temporarily unavailable" });
    if (entry.retryAt > now()) return fallback();
    if (entry.data && now() - entry.data.time < 60000)
      return send(200, entry.data);
    try {
      entry.pending ||= load({ project, cursor, releaseCursor })
        .then((data) => {
          if (!Object.keys(data.errors || {}).length) entry.data = data;
          else entry.retryAt = now() + 30000;
          return data;
        })
        .finally(() => {
          entry.pending = null;
        });
      const data = await entry.pending;
      if (Object.keys(data.errors || {}).length && entry.data)
        return fallback();
      return send(200, data);
    } catch {
      entry.retryAt = now() + 30000;
      return fallback();
    }
  };
}

export default createActivityHandler();
