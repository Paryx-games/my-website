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

export function externalLink(text, url, className = "", showIcon = false) {
  const link = element("a", className, text);
  const safe = githubUrl(url);
  if (safe) { link.href = safe; link.target = "_blank"; link.rel = "noopener noreferrer"; }
  if (showIcon) {
    const icon = document.createElement("img");
    icon.className = "external-link-icon";
    icon.src = "/.shared/icons/link.svg";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    link.append(icon);
  }
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
