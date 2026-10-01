import { inject } from "@vercel/analytics";
import "./site.css";

inject();

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
