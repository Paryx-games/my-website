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
  const welcome = posts.find((post) => post.slug === 'welcome-to-my-blog');
  assert.ok(welcome, 'the welcome post remains in the growing archive');
  assert.equal(welcome.demo, false);
  assert.equal(welcome.draft, false);
  assert.ok(welcome.content.includes('Hi, welcome to my blog!'));
  assert.ok(!posts.some((post) => post.demo), 'example articles were removed');
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
