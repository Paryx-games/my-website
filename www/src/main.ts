import { inject } from "@vercel/analytics";
import "./site.css";

inject();

const sectionToggles = new Map<HTMLElement, (expanded: boolean) => void>();
document.querySelectorAll<HTMLElement>("#content > section").forEach((section, index) => {
  const heading = section.querySelector<HTMLHeadingElement>(":scope > h2");
  if (!heading) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-toggle";
  button.setAttribute("aria-expanded", "true");
  button.append(heading.textContent || "");
  button.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>');
  heading.replaceChildren(button);
  const body = document.createElement("div");
  body.className = "section-body";
  body.id = `section-body-${index}`;
  body.dataset.expanded = "true";
  button.setAttribute("aria-controls", body.id);
  const inner = document.createElement("div");
  inner.className = "section-body-inner";
  while (heading.nextSibling) inner.append(heading.nextSibling);
  body.append(inner);
  section.append(body);
  const setExpanded = (expanded: boolean) => {
    if (expanded === (button.getAttribute("aria-expanded") === "true")) return;
    button.setAttribute("aria-expanded", String(expanded));
    body.dataset.expanded = String(expanded);
    body.inert = !expanded;
    body.setAttribute("aria-hidden", String(!expanded));
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) body.classList.add("is-transitioning");
  };
  body.addEventListener("transitionend", event => {
    if (event.target === body) body.classList.remove("is-transitioning");
  });
  button.addEventListener("click", () => setExpanded(button.getAttribute("aria-expanded") !== "true"));
  sectionToggles.set(section, setExpanded);
});

function revealSection(hash: string) {
  let target: HTMLElement | null;
  try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
  if (!target) return;
  for (const [section, expand] of sectionToggles) {
    if (section === target || section.contains(target)) expand(true);
  }
}
window.addEventListener("hashchange", () => revealSection(location.hash));
document.addEventListener("click", event => {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin === location.origin && url.pathname === location.pathname) revealSection(url.hash);
});
revealSection(location.hash);

const sectionRail = document.createElement("nav");
sectionRail.className = "section-rail";
sectionRail.setAttribute("aria-label", "Page sections");
const railSections = [...sectionToggles.keys()];
const railLinks = railSections.map(section => {
  const name = section.querySelector("h2")?.textContent || "Section";
  section.id ||= name.toLowerCase().replace(/\s+/g, "-");
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  link.setAttribute("aria-label", name);
  const marker = document.createElement("span");
  marker.className = "section-rail-marker";
  marker.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "section-rail-label";
  label.textContent = name;
  link.append(marker, label);
  sectionRail.append(link);
  return link;
});
document.body.append(sectionRail);

function highlightRail(index: number | null) {
  railLinks.forEach((link, position) => {
    if (index === null) delete link.dataset.distance;
    else link.dataset.distance = String(Math.abs(index - position));
  });
}
railLinks.forEach((link, index) => {
  link.addEventListener("mouseenter", () => highlightRail(index));
  link.addEventListener("focus", () => highlightRail(index));
});
sectionRail.addEventListener("mouseleave", () => {
  const focused = railLinks.indexOf(document.activeElement as HTMLAnchorElement);
  highlightRail(focused < 0 ? null : focused);
});
sectionRail.addEventListener("focusout", event => {
  if (!sectionRail.contains(event.relatedTarget as Node | null)) highlightRail(null);
});
let railFrame = 0;
function updateRail() {
  railFrame = 0;
  const visible = railSections.filter(section => !section.hidden);
  const anchor = innerHeight * 0.35;
  const active = [...visible].reverse().find(section => section.getBoundingClientRect().top <= anchor) || visible[0];
  sectionRail.hidden = !visible.length || (document.getElementById("content")?.getBoundingClientRect().top ?? Infinity) > innerHeight * 0.8;
  railLinks.forEach((link, index) => {
    link.hidden = railSections[index].hidden;
    if (railSections[index] === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
function queueRailUpdate() {
  if (!railFrame) railFrame = requestAnimationFrame(updateRail);
}
window.addEventListener("scroll", queueRailUpdate, { passive: true });
window.addEventListener("resize", queueRailUpdate);
document.getElementById("content")?.addEventListener("transitionend", queueRailUpdate);
updateRail();
revealSection(location.hash);

document.querySelectorAll<HTMLDetailsElement>(".mobile-nav").forEach((menu) => {
  const summary = menu.querySelector("summary");
  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    menu.open = false;
    summary?.focus();
  });
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.open = false;
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !menu.contains(event.target))
      menu.open = false;
  });
});
