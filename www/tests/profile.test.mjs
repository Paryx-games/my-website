import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { marked } from 'marked';

const source = (await readFile(new URL('../content/profile.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const plain = text => text.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#(?:x[0-9a-f]+|\d+));/gi, (_, entity) => entity.startsWith('#') ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"' })[entity]);

test('profile experience preserves every README paragraph, code example and image', () => {
  const details = source.slice(source.indexOf('<h3>'), source.indexOf('</details>'));
  for (const [, , body] of details.matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)) {
    for (const [, paragraph] of marked.parse(body).matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      assert.ok(plain(html).includes(plain(paragraph)), 'README paragraph must preserve the wording');
    }
  }
  const expectedCode = [...marked.parse(details).matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(([, code]) => plain(code));
  const actualCode = [...html.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(([, code]) => plain(code));
  assert.deepEqual(actualCode, expectedCode, 'syntax highlighting must preserve every character of the examples');
  for (const [, url] of source.matchAll(/<img src="([^"]+)"/g)) {
    if (url.includes('media.paryx.uk')) assert.ok(html.includes(url), `missing project image: ${url}`);
  }
  assert.ok(!html.includes('https://skillicons.dev'));
  assert.ok(!html.includes('https://whattime.'));
});
