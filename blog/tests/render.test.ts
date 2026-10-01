import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { mdxComponents } from '../src/components.js';
import { Document } from '../src/layout.js';
import { parsePost } from '../src/content.js';

test('MDX renders semantic components, GFM, heading anchors and highlighted copyable code without hydration', async () => {
  const { default: Content } = await evaluate(
    '## A heading\n\n```js\nconst answer = 42;\n```\n\n<Callout type="tip">Useful advice.</Callout>\n\n<Figure src="/demo.svg" alt="Demo" caption="Caption" />\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] Complete\n\n<details><summary>Details</summary>Content</details>',
    {
      ...runtime,
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeHighlight],
    },
  );
  const html = renderToStaticMarkup(
    createElement(Content, { components: mdxComponents }),
  );
  for (const feature of [
    'id="a-heading"',
    'href="#a-heading"',
    'data-copy=',
    'hljs-keyword',
    'callout-tip',
    '<figcaption>Caption',
    'table-scroll',
    'type="checkbox"',
    '<details>',
  ])
    assert.ok(html.includes(feature), feature);
  assert.ok(!html.includes('hydrate'));
});

test('article SEO escapes JSON-LD and supplies production URLs and semantic dates', () => {
  const post = parsePost(
    '---\ntitle: "Title </script>"\ndescription: "Description"\ndate: "2026-10-01"\nauthors: [paryx]\nbanner: "/banner.webp"\n---\nBody',
    'example.md',
  );
  const html = renderToStaticMarkup(
    createElement(Document, {
      title: post.title,
      pathname: '/example',
      post,
      image: post.banner,
      children: 'Body',
      noindex: true,
    }),
  );
  assert.ok(html.includes('https://blog.paryx.uk/example'));
  assert.ok(html.includes('https://blog.paryx.uk/banner.webp'));
  assert.ok(html.includes('noindex, nofollow'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes('BlogPosting'));
});
