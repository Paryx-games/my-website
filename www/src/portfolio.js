import "./analytics.js";
import "./site.css";

// Content is embedded from public/portfolio.json by Vite.
// Projects support size: "large" or "small", title, description, banner,
// bannerAlt, url, buttonLabel, lightAmplified, and lowQualityScreenshots.
// Set either flag to true to show its image note before the title.
// Add more objects to sections as needed.
// Optional gallery: [{ src: "/assets/build.png", alt: "Build screenshot",
// caption: "Optional image caption" }]. Strings containing image URLs also work.
// Up to six images form the preview; clicking opens the complete gallery.
// Large cards appear first, two per desktop row; other cards use the small grid.

function safeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const source = value.trim();
  if (/[\\\u0000-\u0020\u007f]/.test(source)) return null;
  if (!/^https?:\/\//i.test(source) && !/^\/(?!\/)/.test(source)) return null;
  try {
    const url = new URL(source, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function arrow() {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", "M5 12h14m-6-6 6 6-6 6");
  svg.append(path);
  return svg;
}

let imageNoteCount = 0;

function imageNote(kind) {
  const lighting = kind === "lighting";
  const note = element("span", `project-image-note${lighting ? " project-lighting-note" : ""}`);
  note.tabIndex = 0;
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", lighting
    ? "M9 18h6m-5 3h4M9 15c0-1-1-2-2-3a6 6 0 1 1 10 0c-1 1-2 2-2 3M12 1v1M3 4l1 1m16-1-1 1M1 10h1m20 0h1"
    : "M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z");
  svg.append(path);
  const tooltip = element("span", "project-note-tooltip", lighting
    ? "The brightness or exposure has been increased to make the scene easier to see."
    : "These screenshots weren't taken at the highest quality and may be retaken in the future.");
  tooltip.id = `project-image-note-${++imageNoteCount}`;
  tooltip.setAttribute("role", "tooltip");
  note.setAttribute("aria-describedby", tooltip.id);
  note.append(svg, element("span", "project-image-note-label", lighting ? "Lighting amplified" : "Low quality screenshots"), tooltip);
  note.addEventListener("keydown", event => {
    if (event.key === "Escape") note.classList.add("tooltip-dismissed");
  });
  for (const event of ["blur", "mouseleave"]) note.addEventListener(event, () => note.classList.remove("tooltip-dismissed"));
  return note;
}

const galleryDialog = document.getElementById("gallery-dialog");
const galleryImage = document.getElementById("gallery-image");
let galleryImages = [];
let galleryIndex = 0;
let galleryTrigger = null;

function resizeGallery() {
  if (!galleryDialog.open || !galleryImage.naturalWidth || !galleryImage.naturalHeight) return;
  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const margin = viewportWidth <= 600 ? 16 : 32;
  const maxWidth = Math.min(1100, viewportWidth - margin - 2);
  const maxHeight = Math.min(760, viewportHeight - margin - 2, viewportHeight * 0.82);
  const scale = Math.min(maxWidth / galleryImage.naturalWidth, maxHeight / galleryImage.naturalHeight);
  galleryDialog.style.setProperty("--gallery-width", `${galleryImage.naturalWidth * scale + 2}px`);
  galleryDialog.style.setProperty("--gallery-height", `${galleryImage.naturalHeight * scale}px`);
}

galleryImage.addEventListener("load", resizeGallery);
window.addEventListener("resize", resizeGallery);
window.visualViewport?.addEventListener("resize", resizeGallery);

function showGalleryImage(index) {
  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  const image = galleryImages[galleryIndex];
  galleryImage.hidden = false;
  document.getElementById("gallery-error").hidden = true;
  galleryImage.alt = image.alt;
  galleryImage.src = image.src;
  if (galleryImage.complete) resizeGallery();
  document.getElementById("gallery-alt").textContent = image.alt;
  document.getElementById("gallery-caption").textContent = image.caption;
  document.getElementById("gallery-caption").hidden = !image.caption.trim();
  document.getElementById("gallery-position").textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
  for (const id of ["gallery-previous", "gallery-next"]) document.getElementById(id).hidden = galleryImages.length < 2;
}

galleryImage.addEventListener("error", () => {
  galleryImage.hidden = true;
  document.getElementById("gallery-error").hidden = false;
});
document.getElementById("gallery-close").addEventListener("click", () => galleryDialog.close());
document.getElementById("gallery-previous").addEventListener("click", () => showGalleryImage(galleryIndex - 1));
document.getElementById("gallery-next").addEventListener("click", () => showGalleryImage(galleryIndex + 1));
galleryDialog.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    showGalleryImage(galleryIndex + (event.key === "ArrowLeft" ? -1 : 1));
  }
});
galleryDialog.addEventListener("click", event => {
  if (event.target !== galleryDialog) return;
  const bounds = galleryDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) galleryDialog.close();
});
galleryDialog.addEventListener("close", () => galleryTrigger?.focus());

function projectCard(project, featured) {
  const card = element("article", "project-card");
  const images = (Array.isArray(project.gallery) ? project.gallery : []).flatMap(image => {
    const config = typeof image === "string" ? { src: image } : image;
    const url = safeUrl(config?.src);
    return url ? [{ src: url.href, preview: safeUrl(config.preview)?.href || url.href, alt: typeof config.alt === "string" ? config.alt : project.title,
      caption: typeof config.caption === "string" ? config.caption : "" }] : [];
  });
  const banner = element(images.length ? "button" : "div", "project-banner");
  const imageUrl = safeUrl(project.banner);
  if (images.length) {
    banner.classList.add("project-gallery");
    banner.type = "button";
    banner.setAttribute("aria-label", `Open ${project.title} gallery (${images.length} images)`);
    banner.setAttribute("aria-haspopup", "dialog");
    const preview = element("span", "gallery-preview");
    preview.dataset.count = String(Math.min(images.length, 6));
    preview.setAttribute("aria-hidden", "true");
    for (const config of images.slice(0, 6)) {
      const image = element("img");
      image.src = config.preview;
      image.alt = "";
      image.loading = featured ? "eager" : "lazy";
      image.decoding = "async";
      preview.append(image);
    }
    banner.append(preview, element("span", "gallery-count", `${images.length} ${images.length === 1 ? "photo" : "photos"}`));
    banner.addEventListener("click", () => {
      galleryImages = images;
      galleryTrigger = banner;
      document.getElementById("gallery-title").textContent = project.title;
      showGalleryImage(0);
      galleryDialog.showModal();
      resizeGallery();
    });
  } else if (imageUrl) {
    const image = element("img");
    image.src = imageUrl.href;
    image.alt = typeof project.bannerAlt === "string" ? project.bannerAlt : "";
    image.loading = featured ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => image.remove());
    banner.append(image);
  } else {
    banner.setAttribute("aria-hidden", "true");
  }
  const copy = element("div", "project-copy");
  if (project.lightAmplified === true || project.lowQualityScreenshots === true) {
    const notes = element("div", "project-image-notes");
    if (project.lightAmplified === true) notes.append(imageNote("lighting"));
    if (project.lowQualityScreenshots === true) notes.append(imageNote("quality"));
    copy.append(notes);
  }
  copy.append(element("h3", "", project.title));
  if (typeof project.description === "string" && project.description.trim()) {
    copy.append(element("p", "", project.description));
  }
  const projectUrl = safeUrl(project.url);
  if (projectUrl) {
    const buttonLabel = typeof project.buttonLabel === "string" && project.buttonLabel.trim() ? project.buttonLabel : "Explore";
    const link = element("a", "project-explore", buttonLabel);
    link.href = projectUrl.href;
    link.setAttribute("aria-label", `${buttonLabel} ${project.title}`);
    if (projectUrl.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.append(arrow());
    copy.append(link);
  }
  card.append(banner, copy);
  return card;
}

function renderPortfolio(sections) {
  const container = document.getElementById("portfolio-sections");
  const navigation = document.querySelector(".portfolio-sections-nav");
  const emptyTemplate = document.getElementById("portfolio-empty-state");
  const fragment = document.createDocumentFragment();
  const sectionLinks = document.createDocumentFragment();
  const usedIds = new Set();
  let sectionCount = 0;

  for (const config of sections) {
    if (!config || typeof config.title !== "string" || !config.title.trim()) continue;
    const baseId = typeof config.id === "string" ? config.id.replace(/[^a-z0-9_-]/gi, "-") : "section";
    let id = baseId || "section";
    let suffix = 1;
    while (usedIds.has(id)) id = `${baseId || "section"}-${suffix++}`;
    usedIds.add(id);
    sectionCount++;
    const section = element("section", "portfolio-section");
    section.id = id;
    const headingId = `portfolio-heading-${sectionCount}`;
    section.setAttribute("aria-labelledby", headingId);
    const heading = element("div", "portfolio-section-heading");
    const title = element("h2", "", config.title);
    title.id = headingId;
    heading.append(title);
    if (typeof config.description === "string" && config.description.trim()) {
      heading.append(element("p", "", config.description));
    }
    section.append(heading);
    const projects = Array.isArray(config.projects) ? config.projects.filter(project =>
      project && typeof project.title === "string" && project.title.trim()
    ) : [];
    if (projects.length === 0) {
      section.append(emptyTemplate.content.cloneNode(true));
    } else {
      const featured = projects.filter(project => project.size === "large");
      const remaining = projects.filter(project => !featured.includes(project));
      if (featured.length) {
        const row = element("div", "featured-projects");
        row.dataset.count = String(featured.length);
        featured.forEach(project => row.append(projectCard(project, true)));
        section.append(row);
      }
      if (remaining.length) {
        const grid = element("div", "compact-projects");
        remaining.forEach(project => grid.append(projectCard(project, false)));
        section.append(grid);
      }
    }
    fragment.append(section);
    const sectionLink = element("a", "", config.title);
    sectionLink.href = `#${id}`;
    sectionLinks.append(sectionLink);
  }
  container.replaceChildren(fragment);
  navigation.replaceChildren(sectionLinks);
  navigation.hidden = sectionCount < 2;
}

function loadPortfolio() {
  try {
    const data = JSON.parse(document.getElementById("portfolio-data").textContent);
    if (!data || !Array.isArray(data.sections)) throw new Error("Invalid portfolio content");
    if (typeof data.title === "string" && data.title.trim()) {
      document.querySelector(".portfolio-intro h1").textContent = data.title;
      document.title = `Paryx - ${data.title}`;
    }
    if (typeof data.description === "string") {
      const description = document.getElementById("portfolio-description");
      description.textContent = data.description;
      description.hidden = !data.description.trim();
      document.querySelector('meta[name="description"]').content = data.description;
      document.querySelector('meta[property="og:description"]').content = data.description;
    }
    const template = document.getElementById("portfolio-empty-state");
    for (const [key, selector] of [["title", ".empty-copy h3"], ["description", ".empty-copy p"], ["collectionMessage", ".collection-empty span"]]) {
      if (typeof data.emptyState?.[key] === "string") template.content.querySelector(selector).textContent = data.emptyState[key];
    }
    renderPortfolio(data.sections);
    document.getElementById("portfolio-status").hidden = true;
  } catch {
    const status = document.getElementById("portfolio-status");
    status.textContent = "Projects couldn't be loaded. Please try again later.";
    status.hidden = false;
    document.getElementById("portfolio-sections").hidden = true;
  } finally {
    document.getElementById("portfolio-sections").setAttribute("aria-busy", "false");
  }
}
loadPortfolio();
