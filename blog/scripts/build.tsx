import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  loadPosts,
  tagSlug,
  visiblePosts,
  seriesPosts,
} from '../src/content.js';
import { Article, Document, Listing, AuthorProfile } from '../src/layout.js';
import { isPreview, site } from '../src/config.js';
import { rss, searchIndex, sitemap } from '../src/feeds.js';

import { authors } from '../src/authors.js';
import { compileArticle } from '../src/article-content.js';
import { socialImage } from '../src/social-image.js';
import { resolveBanner } from '../src/banners.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');

export async function build({
  development = false,
}: { development?: boolean } = {}) {
  const posts = await loadPosts(path.join(root, 'content/posts'), development);
  const compiled = new Map<string, string>();
  for (const post of posts) compiled.set(post.slug, await compileArticle(post));
  const published = visiblePosts(posts);
  const noindex = isPreview() || development;
  await rm(output, { recursive: true, force: true, maxRetries: 3 });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'public'), output, { recursive: true });
  const banners = new Map<string, string | undefined>();
  for (const post of posts)
    banners.set(
      post.slug,
      await resolveBanner(post, path.join(root, 'public'), output),
    );
  const page = async (
    filename: string,
    node: Parameters<typeof renderToStaticMarkup>[0],
  ) => {
    const destination = path.join(output, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(
      destination,
      `<!doctype html>${renderToStaticMarkup(node)}`,
    );
  };
  await page(
    'index.html',
    <Document
      title={site.name}
      image={published[0] ? `/og/${published[0].slug}.png` : undefined}
      noindex={noindex}
    >
      <Listing posts={posts} allPosts={published} />
    </Document>,
  );
  await mkdir(path.join(output, 'og'), { recursive: true });
  for (const post of posts) {
    await writeFile(
      path.join(output, 'og', `${post.slug}.png`),
      await socialImage(post, banners.get(post.slug)),
    );
    await page(
      `${post.slug}.html`,
      <Document
        title={post.title}
        description={post.description}
        pathname={`/${post.slug}`}
        image={`/og/${post.slug}.png`}
        post={post}
        noindex={noindex || post.draft}
      >
        <Article post={post} posts={published}>
          <div dangerouslySetInnerHTML={{ __html: compiled.get(post.slug)! }} />
        </Article>
      </Document>,
    );
  }
  for (const tag of [...new Set(posts.flatMap((post) => post.tags))]) {
    await page(
      `tags/${tagSlug(tag)}.html`,
      <Document
        title={`${tag} articles`}
        description={`Articles about ${tag} from paryx.`}
        pathname={`/tags/${tagSlug(tag)}`}
        noindex={noindex}
      >
        <Listing
          tag={tag}
          posts={posts.filter((post) => post.tags.includes(tag))}
          allPosts={published}
        />
      </Document>,
    );
  }
  for (const author of Object.values(authors)) {
    await page(
      `authors/${author.id}.html`,
      <Document
        title={`${author.name}'s articles`}
        description={author.bio}
        pathname={`/authors/${author.id}`}
        noindex={noindex}
      >
        <Listing
          title={author.name}
          description={`Articles by ${author.name}.`}
          introduction={<AuthorProfile author={author} />}
          posts={published.filter((post) => post.authors.includes(author.id))}
          allPosts={published}
        />
      </Document>,
    );
  }
  for (const slug of [
    ...new Set(
      published.flatMap((post) => (post.series ? [post.series.slug] : [])),
    ),
  ]) {
    const parts = seriesPosts(published, slug);
    const title = parts[0].series!.title;
    await page(
      `series/${slug}.html`,
      <Document
        title={title}
        description={`Read ${title}, an article series from paryx.`}
        pathname={`/series/${slug}`}
        noindex={noindex}
      >
        <Listing
          title={title}
          description="An article series, in reading order."
          posts={parts}
          allPosts={published}
        />
      </Document>,
    );
  }
  await page(
    '404.html',
    <Document title="Page not found" noindex>
      <main id="main" className="listing-intro">
        <h1>Page not found.</h1>
        <p className="deck">
          This article may have moved, or hasn’t been published yet.
        </p>
        <a className="read-link" href="/">
          Back to the blog ↗
        </a>
      </main>
    </Document>,
  );
  await writeFile(path.join(output, 'rss.xml'), rss(published));
  await writeFile(path.join(output, 'sitemap.xml'), sitemap(published));
  await writeFile(
    path.join(output, 'search-index.json'),
    JSON.stringify(searchIndex(published)),
  );
  await writeFile(
    path.join(output, 'robots.txt'),
    `User-agent: *\n${noindex ? 'Disallow: /' : 'Allow: /'}\n\nSitemap: ${site.origin}/sitemap.xml\n`,
  );
  console.log(
    `Built ${posts.length} article(s), ${published.length} published, into blog/dist.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await build({ development: process.argv.includes('--development') });
