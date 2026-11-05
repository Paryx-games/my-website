import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { ApiEndpoint, mdxComponents } from '../src/components.js';
import { Document, Sidebar } from '../src/layout.js';
import { parsePost } from '../src/content.js';
import { compileArticle } from '../src/article-content.js';

test('GitHub alerts render in Markdown and MDX while preserving rich content and ordinary quotes', async () => {
  for (const extension of ['md', 'mdx']) {
    const content = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']
      .map(
        (type) =>
          `> [!${type}]\n> **Advice** with [a link](https://example.com).\n>\n> - First item\n> - Second item`,
      )
      .join('\n\n');
    const post = parsePost(
      `---\ntitle: Alerts\ndescription: Alert test\ndate: '2026-10-04'\nauthors: [paryx]\n---\n${content}\n\n> Ordinary quote\n\n> [!UNKNOWN]\n> Keep this quote\n\n> Prefix [!NOTE]\n\n\`\`\`text\n> [!WARNING]\n\`\`\``,
      `alerts.${extension}`,
    );
    const html = await compileArticle(post);
    for (const type of ['note', 'tip', 'important', 'warning', 'caution'])
      assert.ok(html.includes(`callout-${type}`), `${extension}: ${type}`);
    assert.equal((html.match(/<aside /g) ?? []).length, 5);
    assert.ok(html.includes('<strong>Advice</strong>'));
    assert.ok(html.includes('<li>Second item</li>'));
    assert.ok(html.includes('<blockquote>\n<p>Ordinary quote</p>'));
    assert.ok(html.includes('[!UNKNOWN]'));
    assert.ok(html.includes('Prefix [!NOTE]'));
    assert.ok(html.includes('&gt; [!WARNING]'));
    assert.ok(post.searchText?.includes('Advice'));
    assert.ok(!post.searchText?.includes('[!TIP]'));
  }
});

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

test('fenced code filenames appear only when supplied in Markdown and MDX', async () => {
  for (const extension of ['md', 'mdx']) {
    const post = parsePost(
      [
        '---',
        'title: Code titles',
        'description: Code title test',
        'date: "2026-10-04"',
        'authors: [paryx]',
        '---',
        '',
        '```ts title="src/example.ts"',
        'const answer = 42;',
        '```',
        '',
        '```text',
        'plain code',
        '```',
      ].join('\n'),
      `code-titles.${extension}`,
    );
    const html = await compileArticle(post);
    assert.ok(html.includes('class="code-filename">src/example.ts</span>'));
    assert.ok(!html.includes('class="code-filename"></span>'));
    assert.equal((html.match(/data-copy=/g) ?? []).length, 2);
  }
});

test('CodeGroup has accessible tab relationships and an all-snippet static fallback', async () => {
  const post = parsePost(
    [
      '---',
      'title: Code alternatives',
      'description: Code group test',
      'date: "2026-10-04"',
      'authors: [paryx]',
      '---',
      '',
      '<CodeGroup>',
      '  <CodeTab label="PowerShell">',
      '',
      '```powershell title="hello.ps1"',
      'Write-Output "Hello"',
      '```',
      '',
      '  </CodeTab>',
      '  <CodeTab label="Bash">',
      '',
      '```bash',
      'printf "Hello\\\\n"',
      '```',
      '',
      '  </CodeTab>',
      '</CodeGroup>',
      '',
      '<ApiEndpoint method="GET" path="/api/playtime" />',
    ].join('\n'),
    'code-group.mdx',
  );
  const html = await compileArticle(post);
  assert.ok(html.includes('role="tablist"'));
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 2);
  assert.ok(html.includes('aria-controls='));
  assert.ok(html.includes('aria-labelledby='));
  assert.ok(html.includes('Write-Output'));
  assert.ok(html.includes('printf'));
  assert.ok(html.includes('class="code-filename">hello.ps1</span>'));
  assert.equal((html.match(/data-copy=/g) ?? []).length, 2);
  assert.ok(!html.includes('hidden=""'));
  assert.ok(html.includes('api-endpoint-get'));
  assert.ok(html.includes('/api/playtime'));
});

test('Sidebar renders every category in alphabetical order with a hidden progressive-enhancement toggle', () => {
  const post = parsePost(
    [
      '---',
      'title: Sidebar categories',
      'description: Sidebar category fallback test',
      'date: "2026-10-04"',
      'authors: [paryx]',
      'tags: [TypeScript, CSS, Accessibility, JavaScript, Web, Testing, Design, Performance]',
      '---',
      'Body',
    ].join('\n'),
    'sidebar-categories.md',
  );
  const html = renderToStaticMarkup(createElement(Sidebar, { posts: [post] }));
  const categoryLinks = [
    ...html.matchAll(
      /<a\b(?=[^>]*class="category")(?=[^>]*data-category-item="true")[^>]*href="([^"]+)"/g,
    ),
  ].map(([, href]) => href);

  assert.deepEqual(categoryLinks, [
    '/tags/accessibility',
    '/tags/css',
    '/tags/design',
    '/tags/javascript',
    '/tags/performance',
    '/tags/testing',
    '/tags/typescript',
    '/tags/web',
  ]);
  assert.match(html, /class="category" href="\/"/);
  assert.ok(html.includes('data-visible-count="7"'));
  assert.ok(html.includes('aria-controls="blog-category-items"'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.match(html, /data-category-toggle="true"[^>]*hidden=""/);
  assert.ok(html.includes('>Show more</button>'));
  assert.ok(!/data-category-item="true"[^>]*hidden/.test(html));
});

test('ApiEndpoint rejects unsupported methods and malformed paths', () => {
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(ApiEndpoint, {
        method: 'BREW' as 'GET',
        path: '/api/playtime',
      }),
    ),
  );
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(ApiEndpoint, {
        method: 'GET',
        path: '//example.com',
      }),
    ),
  );
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
  assert.match(html, /https:\/\/blog\.paryx\.uk\/example(?:<|["\s])/);
  assert.match(html, /https:\/\/blog\.paryx\.uk\/banner\.webp(?:<|["\s])/);
  assert.ok(html.includes('noindex, nofollow'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(html.includes('BlogPosting'));
});
