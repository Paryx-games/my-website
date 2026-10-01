import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compileArticle } from '../src/article-content.js';
import {
  loadPosts,
  parsePost,
  relatedPosts,
  seriesPosts,
} from '../src/content.js';
import { searchIndex, sitemap } from '../src/feeds.js';
import { socialImage } from '../src/social-image.js';
import sharp from 'sharp';

const source = (extra = '', body = 'Body') =>
  `---\ntitle: "A title"\ndescription: "Description"\ndate: "2026-10-01"\nauthors: [paryx]\ntags: [Rust]\n${extra}\n---\n${body}`;
const series = (part: number, slug = 'example-series') =>
  `series:\n  slug: ${slug}\n  title: "A series"\n  part: ${part}`;

test('related articles rank shared tags, then recency, excluding drafts and self', () => {
  const current = parsePost(
    source().replace('[Rust]', '[Rust, Tauri]'),
    'current.md',
  );
  const older = parsePost(
    source()
      .replace('2026-10-01', '2026-09-01')
      .replace('[Rust]', '[Rust, Tauri]'),
    'older.md',
  );
  const newer = parsePost(source(), 'newer.md');
  const draft = parsePost(source('draft: true'), 'draft.md');
  const unrelated = parsePost(
    source().replace('[Rust]', '[Design]'),
    'unrelated.md',
  );
  assert.deepEqual(
    relatedPosts(current, [current, newer, older, draft, unrelated]).map(
      (post) => post.slug,
    ),
    ['older', 'newer'],
  );
});

test('series follow part order rather than dates and keep draft-only series out of sitemap', () => {
  const first = parsePost(source(series(1)), 'first.md');
  const second = parsePost(
    source(series(2)).replace('2026-10-01', '2026-09-01'),
    'second.md',
  );
  const draft = parsePost(
    source(`${series(3, 'secret-series')}\ndraft: true`),
    'draft.md',
  );
  assert.deepEqual(
    seriesPosts([second, draft, first], 'example-series').map(
      (post) => post.slug,
    ),
    ['first', 'second'],
  );
  const xml = sitemap([first, second, draft]);
  assert.ok(xml.includes('https://blog.paryx.uk/series/example-series'));
  assert.ok(xml.includes('https://blog.paryx.uk/authors/paryx'));
  assert.ok(!xml.includes('secret-series'));
  for (const metadata of [
    'series: nope',
    series(0),
    series(1).replace('example-series', '../bad'),
  ])
    assert.throws(() => parsePost(source(metadata), 'invalid.md'), /series/);
});

test('duplicate series parts and inconsistent titles fail before building', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'paryx-series-'));
  try {
    await writeFile(path.join(directory, 'first.md'), source(series(1)));
    await writeFile(path.join(directory, 'second.md'), source(series(1)));
    await assert.rejects(loadPosts(directory), /duplicate part/);
    await writeFile(
      path.join(directory, 'second.md'),
      source(series(2).replace('A series', 'Another title')),
    );
    await assert.rejects(loadPosts(directory), /Conflicting title/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('contents match duplicate heading anchors and full-text search includes rendered MDX, not JSX attributes', async () => {
  const post = parsePost(
    source(
      '',
      '## Same heading\n\nA paragraph with **idempotency**.\n\n## Same heading\n\n### More detail\n\n<Callout type="tip">Component vocabulary.</Callout>\n\n<Figure src="/private-file-name.svg" alt="An illustration" caption="Visible caption" />\n\nA footnote.[^note]\n\n[^note]: Footnote vocabulary.\n\n```rust\nlet answer = 42;\n```',
    ),
    'example.mdx',
  );
  const html = await compileArticle(post);
  assert.deepEqual(
    post.headings?.map((heading) => heading.id),
    ['same-heading', 'same-heading-1', 'more-detail'],
  );
  for (const heading of post.headings!)
    assert.ok(html.includes(`id="${heading.id}"`));
  const index = searchIndex([post])[0];
  for (const word of [
    'idempotency',
    'Component vocabulary',
    'Visible caption',
    'Footnote vocabulary',
    'let answer',
  ])
    assert.ok(index.text.includes(word), word);
  assert.ok(!index.text.includes('private-file-name'));
  assert.ok(!index.text.includes('Copy'));
  assert.ok(!index.text.includes('#'));
});

test('social cards are real 1200 × 630 PNGs and also work without a banner', async () => {
  const post = parsePost(
    source().replace('A title', 'A title & <escaped> content'),
    'example.md',
  );
  const metadata = await sharp(await socialImage(post)).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
});
