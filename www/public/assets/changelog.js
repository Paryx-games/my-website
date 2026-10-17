import { element, externalLink, dateNode, loadProjectConfig } from "./projects-page.js";

export function classifyChange(entry, kind) {
  const text = `${entry.title || entry.name || ""}\n${entry.body || ""}`;
  return {
    breaking: /^[a-z]+(?:\([^\n)]*\))?!:|BREAKING[ -]CHANGES?\s*:/im.test(text) || (kind === "release" && /^#{1,6}\s+.*breaking/im.test(text)),
    feature: /^feat(?:\([^\n)]*\))?!?:/i.test(entry.title || "") || (kind === "release" && /^#{1,6}\s+.*(?:features|added)/im.test(text)),
  };
}

export function mergeHistory(current = [], incoming = []) {
  const items = new Map(current.map(entry => [entry.id, entry]));
  for (const entry of incoming) items.set(entry.id, entry);
  return [...items.values()];
}

export function historyEntries(project) {
  return [
    ...(project.releases || []).map(entry => ({ ...entry, kind: "release", title: entry.name || entry.tag })),
    ...(project.commits || []).map(entry => ({ ...entry, kind: "commit" })),
  ].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

async function initChangelog() {
  const select = document.getElementById("changelog-project");
  const search = document.getElementById("changelog-search");
  const list = document.getElementById("changelog-entries");
  const status = document.getElementById("changelog-status");
  const more = document.getElementById("history-more");
  const filters = [...document.querySelectorAll("[data-change-filter]")];
  let configuration, project, filter = "all", loading = false, requestVersion = 0;
  let controller;

  function render() {
    const term = search.value.trim().toLowerCase();
    const entries = historyEntries(project || {});
    const shown = entries.filter(entry => {
      const classification = classifyChange(entry, entry.kind);
      return (filter === "all" || (filter === "releases" && entry.kind === "release") || (filter === "commits" && entry.kind === "commit") || (filter === "features" && classification.feature) || (filter === "breaking" && classification.breaking)) && `${entry.title} ${entry.body || ""} ${entry.tag || ""} ${entry.sha || ""} ${entry.author || ""}`.toLowerCase().includes(term);
    });
    const rows = shown.map(entry => {
      const classification = classifyChange(entry, entry.kind);
      const row = element("li", `changelog-entry${entry.own === false && entry.kind === "commit" ? " collaborator-entry" : ""}`);
      const meta = element("div", "timeline-meta");
      meta.append(element("span", `change-kind${entry.kind === "release" ? " is-release" : ""}`, entry.kind === "release" ? "Release" : "Commit"), dateNode(entry.date));
      if (classification.breaking) meta.append(element("span", "change-breaking", "Breaking change"));
      else if (classification.feature) meta.append(element("span", "change-feature", "Feature"));
      row.append(meta);
      const heading = element("h2", "change-title"); heading.append(externalLink(entry.title, entry.url)); row.append(heading);
      if (entry.kind === "release") {
        row.append(element("p", "change-context", entry.tag || ""));
        const notes = window.renderChangelogMarkdown(entry.body || "No release notes were provided for this release.", "release-notes");
        row.append(notes);
        row.append(externalLink("View release on GitHub ↗", entry.url, "history-source"));
      } else {
        const context = element("p", "change-context");
        context.append(element("span", "commit-sha", (entry.sha || entry.id).slice(0, 7)), document.createTextNode(` · ${entry.author || "Unknown author"}${entry.own === false ? " · Collaborator" : ""}`));
        row.append(context);
        const body = entry.body?.trim();
        if (body) {
          const details = element("details", "commit-details");
          details.append(element("summary", "", "Commit details"), window.renderChangelogMarkdown(body, "commit-body")); row.append(details);
        }
      }
      return row;
    });
    list.replaceChildren(...rows);
    const empty = document.getElementById("history-empty");
    empty.hidden = shown.length > 0 || loading || (!project && status.dataset.stale === "true");
    empty.textContent = entries.length ? "No matching changes in the loaded history. Try another filter, search, or load older entries." : "No releases or commits are available for this project yet.";
    document.getElementById("history-count").textContent = `${shown.length} of ${entries.length} loaded ${entries.length === 1 ? "change" : "changes"}`;
    more.hidden = !(project?.hasMore || project?.hasMoreReleases);
    more.disabled = loading;
    more.textContent = loading ? "Loading history..." : "Load older history";
  }

  async function load(append = false) {
    const chosen = configuration.projects.find(item => item.id === select.value);
    if (!chosen || (append && loading)) return;
    controller?.abort();
    controller = new AbortController();
    const version = ++requestVersion;
    loading = true;
    more.disabled = true;
    status.hidden = false;
    status.textContent = append ? "Loading older changes..." : "Loading project history...";
    status.dataset.stale = "false";
    if (!append) {
      project = undefined;
      document.getElementById("history-project-title").textContent = chosen.title;
      document.getElementById("history-project-description").textContent = chosen.description || chosen.repo;
      const source = document.getElementById("history-project-source");
      source.replaceChildren(externalLink(`${chosen.repo} ↗`, `https://github.com/${chosen.repo}`));
    }
    render();
    try {
      const query = new URLSearchParams({ project: chosen.id });
      if (append && project?.hasMore && project.cursor) query.set("cursor", project.cursor);
      if (append && project?.hasMoreReleases && project.releaseCursor) query.set("releaseCursor", project.releaseCursor);
      const response = await fetch(`/api/github-activity?${query}`, { cache: "no-cache", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      if (!response.ok) throw new Error("History unavailable");
      const data = await response.json();
      if (version !== requestVersion) return;
      const incoming = data?.version === 1 && Array.isArray(data.projects) ? data.projects.find(item => item.id === chosen.id) : null;
      if (!incoming || !Array.isArray(incoming.commits) || !Array.isArray(incoming.releases)) throw new Error("Invalid history response");
      if (append) project = { ...incoming, releases: mergeHistory(project.releases, incoming.releases), commits: mergeHistory(project.commits, incoming.commits) };
      else project = incoming;
      if (project.description) document.getElementById("history-project-description").textContent = project.description;
      const partial = data.stale || Object.keys(data.errors || {}).length > 0;
      status.textContent = partial ? "GitHub is partially unavailable. Showing the latest available history." : "Recent history from GitHub. Load older entries to explore further.";
      status.dataset.stale = String(Boolean(partial));
    } catch (error) {
      if (version !== requestVersion || error.name === "AbortError") return;
      status.textContent = append ? "Older changes couldn't be loaded. Your current history is preserved. Try again." : "History couldn't be loaded. Use Retry or open the repository on GitHub.";
      status.dataset.stale = "true";
    } finally {
      if (version === requestVersion) { loading = false; render(); }
    }
  }

  select.addEventListener("change", () => {
    const url = new URL(location.href); url.searchParams.set("project", select.value);
    history.pushState({}, "", url); load();
  });
  window.addEventListener("popstate", () => {
    const id = new URLSearchParams(location.search).get("project");
    select.value = configuration.projects.find(item => item.id === id)?.id || configuration.projects[0].id;
    load();
  });
  search.addEventListener("input", render);
  filters.forEach(button => button.addEventListener("click", () => {
    filter = button.dataset.changeFilter;
    filters.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));
  more.addEventListener("click", () => load(true));
  document.getElementById("history-retry").addEventListener("click", () => load(Boolean(project)));
  try {
    configuration = await loadProjectConfig();
    if (!configuration.projects.length) {
      status.textContent = "No project changelogs have been added yet.";
      document.getElementById("history-controls").hidden = true; return;
    }
    select.replaceChildren(...configuration.projects.map(item => {
      const option = element("option", "", item.title); option.value = item.id; return option;
    }));
    const requested = new URLSearchParams(location.search).get("project");
    select.value = configuration.projects.find(item => item.id === requested)?.id || configuration.projects[0].id;
    const url = new URL(location.href); url.searchParams.set("project", select.value); history.replaceState({}, "", url);
    load();
  } catch {
    status.textContent = "The project list couldn't be loaded. Refresh this page to try again.";
    status.dataset.stale = "true";
    document.getElementById("history-controls").hidden = true;
  }
}

if (typeof document !== "undefined" && document.body?.dataset.page === "changelog") initChangelog();
