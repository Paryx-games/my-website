import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import sharp from 'sharp';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parsePost } from '../src/content.js';
import { fallbackBanner, resolveBanner } from '../src/banners.js';
import { Article, Listing } from '../src/layout.js';
import { socialImage } from '../src/social-image.js';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const source = (banner: string) =>
  `---\ntitle: Remote banner\ndescription: Description\ndate: '2026-10-04'\nauthors: [paryx]\nbanner: '${banner}'\n---\nBody`;

test('banner metadata accepts HTTPS and local assets but rejects unsupported sources', () => {
  for (const value of [
    'https://images.example.com/banner.jpg?width=1200',
    '/assets/banner.webp',
  ])
    assert.equal(parsePost(source(value), 'banner.md').banner, value);
  for (const value of [
    'http://images.example.com/banner.jpg',
    '//images.example.com/a.jpg',
    'javascript:alert(1)',
    'https://user:password@example.com/a.jpg',
  ])
    assert.throws(() => parsePost(source(value), 'banner.md'), /banner/);
});

test('remote banners are validated, saved locally and shared by pages and social previews', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'blog-banner-'));
  try {
    const input = await sharp({
      create: { width: 50, height: 20, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    const post = parsePost(
      source('https://images.example.com/banner.png'),
      'banner.md',
    );
    const filename = await resolveBanner(
      post,
      publicDirectory,
      directory,
      async (_url, options) => {
        assert.ok(options?.signal);
        return new Response(new Uint8Array(input));
      },
    );
    assert.equal(post.banner, '/assets/remote-banners/banner.webp');
    assert.equal(
      (await sharp(await readFile(filename!)).metadata()).format,
      'webp',
    );
    for (const html of [
      renderToStaticMarkup(
        createElement(Article, { post, posts: [post], children: 'Body' }),
      ),
      renderToStaticMarkup(
        createElement(Listing, { posts: [post], allPosts: [post] }),
      ),
    ]) {
      assert.ok(html.includes(post.banner));
      assert.ok(!html.includes('images.example.com'));
    }
    assert.equal(
      (await sharp(await socialImage(post, filename)).metadata()).width,
      1200,
    );
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }
});

test('network errors, timeouts, HTTP errors, invalid images and oversized downloads use the generated fallback', async () => {
  const downloads: (typeof fetch)[] = [
    async () => {
      throw new TypeError('network failure');
    },
    async () => {
      throw new DOMException('timed out', 'TimeoutError');
    },
    async () => new Response('missing', { status: 404 }),
    async () => new Response('<html>Not an image</html>'),
    async () => new Response(new Uint8Array(10 * 1024 * 1024 + 1)),
  ];
  for (const download of downloads) {
    const post = parsePost(
      source('https://images.example.com/missing.png'),
      'banner.md',
    );
    const filename = await resolveBanner(
      post,
      publicDirectory,
      tmpdir(),
      download,
    );
    assert.equal(post.banner, fallbackBanner);
    assert.equal(post.bannerAlt, 'Abstract charcoal folds');
    assert.equal((await sharp(filename).metadata()).format, 'webp');
    const html = renderToStaticMarkup(
      createElement(Article, { post, posts: [post], children: 'Body' }),
    );
    assert.ok(html.includes(fallbackBanner));
    assert.equal(
      (await sharp(await socialImage(post, filename)).metadata()).height,
      630,
    );
  }
});

test('local banners stay local and posts without banners stay unchanged', async () => {
  const post = parsePost(source(fallbackBanner), 'banner.md');
  assert.ok(await resolveBanner(post, publicDirectory, tmpdir()));
  assert.equal(post.banner, fallbackBanner);
  post.banner = undefined;
  assert.equal(await resolveBanner(post, publicDirectory, tmpdir()), undefined);
  post.banner = '/../outside.webp';
  await assert.rejects(
    resolveBanner(post, publicDirectory, tmpdir()),
    /leaves public/,
  );
});
