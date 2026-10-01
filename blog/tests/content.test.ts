import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { loadPosts, parsePost, visiblePosts } from '../src/content.js';
import { absoluteUrl, formatDate, isPreview } from '../src/config.js';
import { rss, searchIndex, sitemap } from '../src/feeds.js';

const source = (extra = '', body = 'A useful article.') =>
  `---\ntitle: "A title & more"\ndescription: "A <description>"\ndate: "2026-10-01"\nauthors: [paryx]\ntags: [Rust]\n${extra}\n---\n${body}`;

test('frontmatter defaults, filenames, reading time, and British dates', () => {
  const post = parsePost(source('', 'word '.repeat(410)), 'example.mdx');
  assert.equal(post.slug, 'example');
  assert.equal(post.readingTime, '3 min read');
  assert.equal(post.draft, false);
  assert.equal(formatDate(post.date), '1 October 2026');
});

test('invalid metadata cannot silently produce broken routes or author links', () => {
  for (const extra of [
    'slug: "../bad"',
    'slug: "tags"',
    'draft: "false"',
    'banner: "//external.test/a.png"',
    'updated: "2026-09-01"',
  ]) {
    assert.throws(() => parsePost(source(extra), 'invalid.md'));
  }
  assert.throws(
    () => parsePost(source().replace('[paryx]', '[missing]'), 'invalid.md'),
    /author/,
  );
  assert.throws(
    () => parsePost(source().replace('2026-10-01', '2026-02-30'), 'invalid.md'),
    /date/,
  );
});

test('drafts are excluded from public lists, search, RSS and sitemap', () => {
  const published = parsePost(source('slug: published'), 'post.mdx');
  const draft = parsePost(source('slug: secret\ndraft: true'), 'draft.md');
  const posts = [draft, published];
  assert.deepEqual(
    visiblePosts(posts).map((p) => p.slug),
    ['published'],
  );
  assert.equal(visiblePosts(posts, true).length, 2);
  assert.equal(searchIndex(posts).length, 1);
  assert.equal(searchIndex(posts)[0].authors[0], 'paryx');
  for (const feed of [rss(posts), sitemap(posts)]) {
    assert.ok(feed.includes('https://blog.paryx.uk/published'));
    assert.ok(!feed.includes('secret'));
  }
  assert.ok(rss(posts).includes('A title &amp; more'));
  assert.ok(rss(posts).includes('A &lt;description&gt;'));
});

test('both file formats load newest first and duplicate slugs fail', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'paryx-blog-test-'));
  try {
    await writeFile(
      path.join(directory, 'older.md'),
      source().replace('2026-10-01', '2026-09-01'),
    );
    await writeFile(path.join(directory, 'newer.mdx'), source());
    assert.deepEqual(
      (await loadPosts(directory)).map((p) => p.slug),
      ['newer', 'older'],
    );
    await writeFile(
      path.join(directory, 'duplicate.md'),
      source('slug: newer'),
    );
    await assert.rejects(loadPosts(directory), /Duplicate/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('canonical URLs do not depend on previews and preview environments are noindex', () => {
  assert.equal(
    absoluteUrl('/building-roblox-manager-v2'),
    'https://blog.paryx.uk/building-roblox-manager-v2',
  );
  assert.equal(isPreview({ VERCEL_ENV: 'preview' }), true);
  assert.equal(isPreview({ VERCEL_ENV: 'production' }), false);
  assert.equal(isPreview({}), false);
});
