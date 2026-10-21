import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const config = JSON.parse(await readFile(new URL("public/portfolio.json", root), "utf8"));
const source = await readFile(new URL("portfolio.html", root), "utf8");
const script = await readFile(new URL("src/portfolio.js", root), "utf8");

test("the built portfolio includes its content without a separate data request", async () => {
  const html = await readFile(new URL("dist/portfolio.html", root), "utf8");
  const embedded = html.match(/<script type="application\/json" id="portfolio-data">([\s\S]*?)<\/script>/);
  assert.ok(embedded, "Portfolio data must be present in the built HTML");
  assert.deepEqual(JSON.parse(embedded[1]), config);
  for (const section of config.sections) {
    for (const project of section.projects) {
      if (project.coverIndex !== undefined) assert.ok(project.gallery[project.coverIndex]);
      for (const image of project.gallery || []) {
        if (image.src.startsWith("/")) await access(new URL(`dist${image.src}`, root));
        if (image.preview?.startsWith("/")) await access(new URL(`dist${image.preview}`, root));
      }
    }
  }
});

test("portfolio startup renders embedded content and updates the actual intro paragraph", () => {
  const nodes = new Map([...source.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
    textContent: "", hidden: false, setAttribute(name, value) { this[name] = value; },
  }]));
  nodes.get("portfolio-data").textContent = JSON.stringify(config);
  nodes.get("portfolio-empty-state").content = { querySelector: () => ({ textContent: "" }) };
  let sections;
  const document = {
    getElementById: id => nodes.get(id) || null,
    querySelector: selector => selector === ".portfolio-intro h1" || selector.startsWith("meta[") ? {} : null,
  };
  const loader = script.slice(script.indexOf("function loadPortfolio()"), script.indexOf("loadPortfolio();"));
  assert.ok(loader, "The portfolio loader must be available");
  runInNewContext(`${loader}\nloadPortfolio();`, { document, renderPortfolio: value => { sections = value; } });
  assert.equal(JSON.stringify(sections), JSON.stringify(config.sections));
  assert.equal(nodes.get("portfolio-description").textContent, config.description);
  assert.equal(nodes.get("portfolio-status").hidden, true);
  assert.equal(nodes.get("portfolio-sections").hidden, false);
  assert.equal(nodes.get("portfolio-sections")["aria-busy"], "false");
});
