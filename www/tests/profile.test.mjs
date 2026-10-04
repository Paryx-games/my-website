import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { marked } from 'marked';

const source = (await readFile(new URL('../content/profile.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('profile experience preserves every README paragraph, code example and image', () => {
  const details = source.slice(source.indexOf('<h3>'), source.indexOf('</details>'));
  for (const [, , body] of details.matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)) {
    assert.ok(html.includes(marked.parse(body).replace(/<img[^>]+src="https:\/\/skillicons\.dev\/[^>]+>/g, '')), 'README body must preserve the wording');
  }
  for (const [, url] of source.matchAll(/<img src="([^"]+)"/g)) {
    if (url.includes('media.paryx.uk')) assert.ok(html.includes(url), `missing project image: ${url}`);
  }
  assert.ok(!html.includes('https://skillicons.dev'));
  assert.ok(!html.includes('https://whattime.'));
});
