import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { marked } from 'marked';

const source = (await readFile(new URL('../content/profile.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const stripTags = text => {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const start = text.indexOf('<', index);
    if (start === -1) {
      result += text.slice(index);
      break;
    }
    result += text.slice(index, start);
    const end = text.indexOf('>', start + 1);
    if (end === -1) {
      result += text.slice(start);
      break;
    }
    index = end + 1;
  }
  return result;
};
const plain = text => stripTags(text).replace(/&(amp|lt|gt|quot|#(?:x[0-9a-f]+|\d+));/gi, (_, entity) => entity.startsWith('#') ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"' })[entity]);

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
    if (new URL(url).hostname === 'media.paryx.uk') {
      assert.ok(
        [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].some(
          ([, sourceUrl]) => sourceUrl === url,
        ),
        `missing project image: ${url}`,
      );
    }
  }
  assert.doesNotMatch(html, /skillicons\.dev/);
  assert.doesNotMatch(html, /whattime\./);
});
