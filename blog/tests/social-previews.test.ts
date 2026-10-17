import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import { Document } from '../src/layout.js';

test('blog listing previews are complete server-rendered metadata with their own image', () => {
  for (const [pathname, image] of [
    ['/tags/rust', '/og/tag-rust.png'],
    ['/authors/paryx', '/og/author-paryx.png'],
    ['/series/example', '/og/series-example.png'],
  ]) {
    const html = renderToStaticMarkup(
      createElement(Document, {
        title: 'A listing',
        pathname,
        image,
        children: createElement('main', null, 'Content'),
      }),
    );
    for (const key of [
      'og:title',
      'og:url',
      'og:image',
      'og:description',
      'og:image:alt',
      'twitter:image',
    ]) {
      assert.equal(
        [...html.matchAll(new RegExp('(?:name|property)="' + key + '"', 'g'))]
          .length,
        1,
      );
    }
    assert.ok(html.includes('content="https://blog.paryx.uk' + image + '"'));
    assert.ok(html.includes('property="og:image:width" content="1200"'));
    assert.ok(html.includes('property="og:image:height" content="630"'));
  }
});
