import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const pages = JSON.parse(await readFile(new URL('content/social-pages.json', root), 'utf8'));

test('each page supplies one complete server-rendered preview and a real 1200 by 630 PNG', async () => {
  const images = new Set();
  for (const page of pages) {
    const html = (await readFile(new URL(page.file, root), 'utf8')).split('</head>')[0];
    for (const field of ['og:title', 'og:type', 'og:url', 'og:image', 'og:description', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:image', 'twitter:image:alt']) {
      assert.equal([...html.matchAll(new RegExp(`(?:name|property)="${field}"`, 'g'))].length, 1, `${page.file}: ${field}`);
    }
    assert.ok(html.includes(`content="https://paryx.uk/assets/social/${page.image}"`));
    assert.ok(html.includes('content="summary_large_image"'));
    const png = await readFile(new URL(`public/assets/social/${page.image}`, root));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(!images.has(page.image));
    images.add(page.image);
  }
  const pc = await readFile(new URL('pc-specs.html', root), 'utf8');
  assert.ok(pc.includes('name="theme-color" content="#0078d6"'));
});
