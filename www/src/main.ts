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
