import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadPosts } from '../src/content.js';
import { rss, searchIndex, sitemap } from '../src/feeds.js';

test('the real welcome post replaces every example article in the public archive', async () => {
  const posts = await loadPosts(
    fileURLToPath(new URL('../content/posts/', import.meta.url)),
    true,
  );
  assert.deepEqual(
    posts.map((post) => post.slug),
    ['welcome-to-my-blog'],
  );
  assert.equal(posts[0].demo, false);
  assert.equal(posts[0].draft, false);
  assert.ok(posts[0].content.includes('Hi, welcome to my blog!'));
  for (const output of [
    rss(posts),
    sitemap(posts),
    JSON.stringify(searchIndex(posts)),
  ]) {
    assert.ok(output.includes('welcome-to-my-blog'));
    assert.ok(!output.includes('building-roblox-manager-v2'));
    assert.ok(!output.includes('draft-example'));
  }
});
