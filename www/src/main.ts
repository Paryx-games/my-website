import { inject } from "@vercel/analytics";
import "./site.css";

inject();

const dialog = document.querySelector<HTMLDialogElement>("#search-dialog");
const searchInput = document.querySelector<HTMLInputElement>("#blog-search");

document
  .querySelector("[data-open-search]")
  ?.addEventListener("click", (event) => {
    event.preventDefault();
    dialog?.showModal();
    searchInput?.focus();
  });

document.querySelector("[data-close-search]")?.addEventListener("click", () => {
  dialog?.close();
});

dialog?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
  }
});

dialog?.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});

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
