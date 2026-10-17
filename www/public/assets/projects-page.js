import { getGitHubProjects } from "./github-projects.js";

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function githubUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : null;
  } catch { return null; }
}

export function externalLink(text, url, className = "") {
  const link = element("a", className, text);
  const safe = githubUrl(url);
  if (safe) { link.href = safe; link.target = "_blank"; link.rel = "noopener noreferrer"; }
  return link;
}

export function dateNode(value) {
  const time = element("time");
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) {
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    time.title = date.toLocaleString("en-GB");
  } else time.textContent = "Date unavailable";
  return time;
}

export async function loadProjectConfig() {
  const response = await fetch("/projects.json", { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Project configuration unavailable");
  const data = await response.json();
  if (!Array.isArray(data?.projects)) throw new Error("Invalid project configuration");
  return data;
}

export function uniqueRepositories(data) {
  const repos = new Map();
  for (const repo of [...data.pinned, ...data.games, ...data.labs]) {
    if (typeof repo?.full_name === "string") repos.set(repo.full_name.toLowerCase(), repo);
  }
  return [...repos.values()];
}

export function languageShares(bytes) {
  const values = Object.entries(bytes || {}).filter(([, value]) => Number.isFinite(value) && value > 0).sort((a, b) => b[1] - a[1]);
  const total = values.reduce((sum, [, value]) => sum + value, 0);
  return values.map(([name, value]) => ({ name, percent: value / total * 100 }));
}

const languageColors = { Rust: "#dea584", TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572a5", Lua: "#7777cf", Luau: "#00a2ff", HTML: "#e34c26", CSS: "#a781dd", PowerShell: "#6d9de3", "C++": "#f34b7d", C: "#a8b9cc", Shell: "#89e051" };

function repositoryCard(repo, configured) {
  const card = element("article", "repository-card");
  const fullName = repo.full_name;
  const project = configured.find(item => item.repo.toLowerCase() === fullName.toLowerCase());
  const heading = element("h3", "repository-heading");
  const name = element("a", "repository-name", repo.name || fullName);
  const destination = project ? `/projects/changelog?project=${encodeURIComponent(project.id)}` : githubUrl(repo.html_url || `https://github.com/${fullName}`);
  if (destination) name.href = destination;
  if (!project && destination) { name.target = "_blank"; name.rel = "noopener noreferrer"; }
  heading.append(name, externalLink("GitHub ↗", `https://github.com/${fullName}`, "repository-github"));
  card.append(element("p", "repository-owner", fullName.split("/")[0]), heading);
  if (repo.archived || repo.fork) card.append(element("p", "repository-flags", [repo.fork && "Fork", repo.archived && "Archived"].filter(Boolean).join(" · ")));
  if (repo.parent?.full_name || typeof repo.parent === "string") card.append(element("p", "repository-parent", `Forked from ${repo.parent.full_name || repo.parent}`));
  card.append(element("p", "repository-description", repo.description || "No description shared yet."));
  const stats = repo.stats || {};
  const metrics = element("dl", "repository-metrics");
  for (const [label, value, hint] of [
    ["Stars", stats.stars ?? repo.stargazers_count, "Repository stars"],
    ["Forks", stats.forks ?? repo.forks_count, "Repository forks"],
    ["Issues", stats.issuesOpen, stats.issuesClosed == null ? "Open issues" : `${stats.issuesClosed} closed issues`],
    ["Pull requests", stats.prsOpen, stats.prsClosed == null ? "Open pull requests" : `${stats.prsClosed} closed or merged pull requests`],
  ]) {
    const metric = element("div"); metric.title = hint;
    metric.append(element("dt", "", label), element("dd", "", typeof value === "number" ? value.toLocaleString("en-GB") : "-"));
    metrics.append(metric);
  }
  card.append(metrics);
  const languages = languageShares(repo.languageBytes);
  if (languages.length) {
    const bar = element("div", "repository-language-bar"); bar.setAttribute("aria-hidden", "true");
    const labels = element("ul", "repository-language-labels");
    for (const { name: language, percent } of languages) {
      const color = languageColors[language] || "#8b949e";
      const segment = element("span"); segment.style.width = `${percent}%`; segment.style.background = color;
      bar.append(segment);
      const label = element("li", "", `${language} ${percent.toFixed(1)}%`); label.style.setProperty("--language-color", color); labels.append(label);
    }
    card.append(bar, labels);
  } else card.append(element("p", "repository-language-empty", repo.language || "Language data unavailable"));
  if (project) {
    const history = element("a", "repository-history", "Explore changes →"); history.href = destination; card.append(history);
  }
  return card;
}

async function initProjects() {
  const status = document.getElementById("projects-status");
  const all = document.getElementById("all-repositories");
  const pinned = document.getElementById("featured-repositories");
  const search = document.getElementById("project-search");
  let repositories = [], config = { projects: [] }, scope = "all";
  function render() {
    const term = search.value.trim().toLowerCase();
    const visible = repositories.filter(repo => (scope === "all" || (scope === "personal" ? repo.owner?.login?.toLowerCase() === "paryx-games" : repo.owner?.login?.toLowerCase() !== "paryx-games")) && `${repo.full_name} ${repo.description || ""} ${repo.language || ""}`.toLowerCase().includes(term));
    all.replaceChildren(...visible.map(repo => repositoryCard(repo, config.projects)));
    document.getElementById("repository-count").textContent = `${visible.length} ${visible.length === 1 ? "repository" : "repositories"}`;
    document.getElementById("projects-empty").hidden = visible.length > 0;
  }
  search.addEventListener("input", render);
  document.querySelectorAll("[data-project-scope]").forEach(button => button.addEventListener("click", () => {
    scope = button.dataset.projectScope;
    document.querySelectorAll("[data-project-scope]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  try {
    const [result, configuration] = await Promise.allSettled([getGitHubProjects(), loadProjectConfig()]);
    if (result.status !== "fulfilled") throw result.reason;
    const data = result.value;
    if (configuration.status === "fulfilled") config = configuration.value;
    repositories = uniqueRepositories(data);
    pinned.replaceChildren(...data.pinned.map(repo => repositoryCard(repositories.find(item => item.full_name.toLowerCase() === repo.full_name.toLowerCase()) || repo, config.projects)));
    if (!data.pinned.length) pinned.append(element("p", "page-state", data.errors?.pinned ? "Featured projects couldn't be loaded." : "No featured projects yet. All repositories are listed below."));
    const partial = Object.keys(data.errors || {}).length > 0;
    status.textContent = partial ? "Some GitHub repositories couldn't be loaded. Available projects are shown below." : configuration.status === "rejected" ? "Project history links are temporarily unavailable. Repositories still open on GitHub." : "";
    status.hidden = !status.textContent;
    render();
  } catch {
    status.textContent = "Projects couldn't be loaded. Refresh this page to try again, or browse my repositories on GitHub.";
    pinned.replaceChildren(); all.replaceChildren();
  }
}

async function initFeed() {
  const container = document.getElementById("development-feed");
  const status = document.getElementById("feed-status");
  const button = document.getElementById("feed-refresh");
  let loading = false, hasResults = false;
  async function refresh() {
    if (loading || document.hidden) return;
    loading = true; button.disabled = true;
    try {
      const response = await fetch("/api/github-activity", { cache: "no-cache", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Activity unavailable");
      const data = await response.json();
      if (data?.version !== 1 || !Array.isArray(data.events)) throw new Error("Invalid activity response");
      if (hasResults && !data.events.length && (data.stale || Object.keys(data.errors || {}).length)) throw new Error("Activity temporarily unavailable");
      const rows = data.events.slice(0, 10).map(event => {
        const row = element("li", `development-event${event.own === false ? " collaborator-entry" : ""}`);
        const meta = element("div", "timeline-meta"); meta.append(element("span", "change-kind", event.kind.replace(/[-_]/g, " ")), dateNode(event.date));
        row.append(meta, externalLink(event.title, event.url, "event-title"), element("p", "event-context", `${event.repo} · ${event.author}${event.own === false ? " · Collaborator" : ""}`));
        return row;
      });
      container.replaceChildren(...rows);
      if (!rows.length) container.append(element("li", "page-state", "No recent public activity. New commits, pull requests, releases and other GitHub activity will appear here."));
      hasResults = true;
      const timestamp = new Date(data.time);
      const updated = Number.isFinite(timestamp.getTime()) ? `Updated ${timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Activity loaded";
      status.textContent = data.stale || Object.keys(data.errors || {}).length ? "GitHub is partially unavailable. Showing the latest available activity." : `${updated} · Refreshes every minute`;
      status.dataset.stale = String(Boolean(data.stale || Object.keys(data.errors || {}).length));
    } catch {
      status.textContent = hasResults ? "Refresh failed. Previous activity is still shown. Retrying in a minute." : "Activity couldn't be loaded. Retrying in a minute.";
      status.dataset.stale = "true";
    } finally { loading = false; button.disabled = false; }
  }
  button.addEventListener("click", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(refresh, 60000);
  refresh();
}

if (typeof document !== "undefined" && document.body?.dataset.page === "projects") {
  initProjects(); initFeed();
}

