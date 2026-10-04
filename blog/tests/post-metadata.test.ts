import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseFragment } from 'parse5';
import { parsePost, visiblePosts } from '../src/content.js';
import { Article, Listing } from '../src/layout.js';
import { rss } from '../src/feeds.js';

const source = (extra = '') =>
  `---\ntitle: Example\ndescription: Description\ndate: '2026-10-04'\nauthors: [paryx]\n${extra}\n---\nBody`;
const metadata = `featured: true\nrepository: https://github.com/Paryx-games/roblox-manager\nstatus: outdated\nrelatedProjects:\n  - name: Roblox Manager\n    url: https://rm.paryx.uk`;

test('new metadata is optional and valid metadata survives parsing', () => {
  const plain = parsePost(source(), 'plain.md');
  for (const field of [
    'featured',
    'repository',
    'relatedProjects',
    'status',
  ] as const)
    assert.equal(plain[field], undefined);
  const post = parsePost(source(metadata), 'example.md');
  assert.equal(post.featured, true);
  assert.equal(post.status, 'outdated');
  assert.equal(
    post.repository,
    'https://github.com/Paryx-games/roblox-manager',
  );
  assert.deepEqual(post.relatedProjects, [
    { name: 'Roblox Manager', url: 'https://rm.paryx.uk' },
  ]);
  for (const status of ['current', 'archived'])
    assert.equal(
      parsePost(source(`status: ${status}`), 'example.md').status,
      status,
    );
});

test('invalid metadata fails with a useful error', () => {
  for (const extra of [
    'featured: "true"',
    'status: draft',
    'status: [current]',
    'repository: javascript:alert(1)',
    'repository: /source',
    'relatedProjects: invalid',
    'relatedProjects: [null]',
    'relatedProjects:\n  - name: ""\n    url: https://example.com',
    'relatedProjects:\n  - name: Project\n    url: javascript:alert(1)',
  ])
    assert.throws(
      () => parsePost(source(extra), 'bad.md'),
      /featured|status|repository|relatedProjects/,
    );
});

test('article pages display supplied badges and project links, and omit missing metadata', () => {
  const post = parsePost(source(metadata), 'example.md');
  const html = renderToStaticMarkup(
    createElement(Article, { post, posts: [post], children: 'Body' }),
  );
  assert.ok(html.includes('featured-badge">Featured'));
  assert.ok(html.includes('post-status-outdated">Outdated'));
  assert.ok(html.includes(`href="${post.repository}"`));
  assert.ok(html.includes('Related projects:'));
  assert.ok(html.includes('href="https://rm.paryx.uk"'));
  const plain = parsePost(source(), 'plain.md');
  const plainHtml = renderToStaticMarkup(
    createElement(Article, { post: plain, posts: [plain], children: 'Body' }),
  );
  assert.ok(!plainHtml.includes('post-badges'));
  assert.ok(!plainHtml.includes('post-links'));
});

function articleLinks(html: string): string[] {
  const tree = parseFragment(html);
  const links: string[] = [];
  function visit(node: (typeof tree.childNodes)[number]) {
    if ('tagName' in node && node.tagName === 'h2') {
      const link = node.childNodes.find(
        (child) => 'tagName' in child && child.tagName === 'a',
      );
      if (link && 'attrs' in link)
        links.push(link.attrs.find((attr) => attr.name === 'href')!.value);
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  }
  tree.childNodes.forEach(visit);
  return links;
}

test('home promotes published featured posts without duplicates, while other listings and feeds keep their order', () => {
  const newest = parsePost(source(), 'newest.md');
  const pinned = parsePost(
    source('featured: true').replace('2026-10-04', '2026-10-01'),
    'pinned.md',
  );
  const second = parsePost(
    source('featured: true').replace('2026-10-04', '2026-10-02'),
    'second.md',
  );
  const draft = parsePost(source('featured: true\ndraft: true'), 'draft.md');
  const posts = [newest, second, pinned];
  const home = renderToStaticMarkup(
    createElement(Listing, {
      posts,
      allPosts: posts,
      prioritizeFeatured: true,
    }),
  );
  assert.deepEqual(articleLinks(home), ['/second', '/pinned', '/newest']);
  assert.equal((home.match(/featured-badge">Featured/g) ?? []).length, 2);
  const listing = renderToStaticMarkup(
    createElement(Listing, { posts, allPosts: posts }),
  );
  assert.deepEqual(articleLinks(listing), ['/newest', '/second', '/pinned']);
  const preview = renderToStaticMarkup(
    createElement(Listing, {
      posts: [draft, ...posts],
      allPosts: posts,
      prioritizeFeatured: true,
    }),
  );
  assert.deepEqual(articleLinks(preview), [
    '/second',
    '/pinned',
    '/draft',
    '/newest',
  ]);
  assert.deepEqual(
    visiblePosts([draft, ...posts]).map((post) => post.slug),
    ['newest', 'second', 'pinned'],
  );
  assert.ok(!rss([draft, ...posts]).includes('/draft'));
  assert.deepEqual(
    posts.map((post) => post.slug),
    ['newest', 'second', 'pinned'],
  );
});
