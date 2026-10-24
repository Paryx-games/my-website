import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

test("site pages avoid executable inline scripts under the strict CSP", async () => {
  const pages = (await readdir(root)).filter((file) => file.endsWith(".html"));
  for (const page of pages) {
    const html = await readFile(new URL(page, root), "utf8");
    for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\btype=["']application\/json["']/i.test(attributes)) continue;
      assert.equal(body.trim(), "", `${page} has executable inline JavaScript`);
    }
  }

  const config = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
  const policy = config.headers[0].headers.find(({ key }) => key === "Content-Security-Policy").value;
  assert.match(policy, /script-src 'self'/);
  assert.doesNotMatch(policy, /script-src\s[^;]*'unsafe-inline'/);
});
