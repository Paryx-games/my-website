import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const inlineScripts = (html) => {
  const scripts = [];
  const lower = html.toLowerCase();
  let searchFrom = 0;
  while (true) {
    const start = lower.indexOf("<script", searchFrom);
    if (start === -1) break;
    const openingEnd = lower.indexOf(">", start);
    if (openingEnd === -1) break;
    const closingStart = lower.indexOf("</script", openingEnd + 1);
    if (closingStart === -1) break;
    const closingEnd = lower.indexOf(">", closingStart);
    if (closingEnd === -1) break;
    scripts.push({
      attributes: html.slice(start + "<script".length, openingEnd),
      body: html.slice(openingEnd + 1, closingStart),
    });
    searchFrom = closingEnd + 1;
  }
  return scripts;
};

test("site pages avoid executable inline scripts under the strict CSP", async () => {
  const pages = (await readdir(root)).filter((file) => file.endsWith(".html"));
  for (const page of pages) {
    const html = await readFile(new URL(page, root), "utf8");
    for (const { attributes, body } of inlineScripts(html)) {
      if (/\btype=["']application\/json["']/i.test(attributes)) continue;
      assert.equal(body.trim(), "", `${page} has executable inline JavaScript`);
    }
  }

  const config = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
  const policy = config.headers[0].headers.find(({ key }) => key === "Content-Security-Policy").value;
  assert.match(policy, /script-src 'self'/);
  assert.doesNotMatch(policy, /script-src\s[^;]*'unsafe-inline'/);
});
