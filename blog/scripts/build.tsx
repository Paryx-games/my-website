import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { loadPosts, tagSlug, visiblePosts } from '../src/content.js';
import { mdxComponents } from '../src/components.js';
import { Article, Document, Listing } from '../src/layout.js';
import { isPreview, site } from '../src/config.js';
import { rss, searchIndex, sitemap } from '../src/feeds.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');

export async function build({
  development = false,
}: { development?: boolean } = {}) {
  const posts = await loadPosts(path.join(root, 'content/posts'), development);
  const published = visiblePosts(posts);
  const noindex = isPreview() || development;
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'public'), output, { recursive: true });
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
    <Document title={site.name} image={published[0]?.banner} noindex={noindex}>
      <Listing posts={posts} allPosts={published} />
    </Document>,
  );
  for (const post of posts) {
    if (post.banner) {
      const bannerPath = path.resolve(root, 'public', `.${post.banner}`);
      if (!bannerPath.startsWith(path.join(root, 'public') + path.sep))
        throw new Error(`${post.slug}: banner path leaves public directory`);
      await access(bannerPath).catch(() => {
        throw new Error(
          `${post.slug}: banner asset does not exist: ${post.banner}`,
        );
      });
    }
    // Only repository-authored content is executed; no user-supplied MDX is accepted.
    const { default: Content } = await evaluate(post.content, {
      ...runtime,
      format: post.extension === '.md' ? 'md' : 'mdx',
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeHighlight, { detect: false, ignoreMissing: true }],
      ],
      baseUrl: new URL('../content/posts/', import.meta.url),
    });
    await page(
      `${post.slug}.html`,
      <Document
        title={post.title}
        description={post.description}
        pathname={`/${post.slug}`}
        image={post.banner}
        post={post}
        noindex={noindex || post.draft}
      >
        <Article post={post} posts={published}>
          <Content components={mdxComponents} />
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
