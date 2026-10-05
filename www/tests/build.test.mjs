import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
const preview = ["preview", "development"].includes(
  process.env.VERCEL_ENV ?? "",
);

test("production and preview builds preserve all pages and their indexing policy", async () => {
  for (const [page, canonical] of [
    ["index.html", "https://paryx.uk/"],
    ["privacy-policy.html", "https://paryx.uk/privacy-policy"],
    ["portfolio.html", "https://paryx.uk/portfolio"],
  ]) {
    const html = await readFile(new URL(page, output), "utf8");
    assert.ok(
      html.includes(`rel="canonical" href="${canonical}"`),
      `${page} canonical`,
    );
    assert.ok(
      html.includes(
        `name="robots" content="${preview ? "noindex, follow" : "index, follow"}"`,
      ),
      `${page} indexing`,
    );
    assert.ok(
      !html.includes("/src/main.ts"),
      `${page} must not serve TypeScript sources`,
    );
    for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) {
      await access(new URL(`.${match[1]}`, output));
    }
  }
  const robots = await readFile(new URL("robots.txt", output), "utf8");
  assert.ok(robots.includes(preview ? "Disallow: /" : "Allow: /"));
  if (!preview) assert.ok(robots.includes("https://paryx.uk/sitemap.xml"));
});

test("promotion retains public URLs, identity, privacy content, and the API source", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.ok(html.includes('class="site-header"'));
  assert.ok(html.includes('href="/privacy-policy"'));
  assert.ok(html.includes('id="projects"'));
  assert.ok(html.includes('id="about"'));
  assert.ok(!/galaxyCanvas|galaxyQuality|pixel-dust/.test(html));
  const sitemap = await readFile(new URL("sitemap.xml", output), "utf8");
  assert.ok(sitemap.includes("https://paryx.uk/privacy-policy"));
  assert.ok(sitemap.includes("https://paryx.uk/portfolio"));
  assert.ok(!sitemap.includes("vercel.app"));
  const privacy = await readFile(
    new URL("privacy-policy.html", output),
    "utf8",
  );
  assert.ok(privacy.includes("privacy@paryx.uk"));
  await access(new URL("public/assets/logo_white.svg", root));
  await access(new URL("public/assets/logo_black.svg", root));
  await access(fileURLToPath(new URL("api/discord-status.js", root)));
});
