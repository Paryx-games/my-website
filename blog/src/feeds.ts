import { authors } from './authors.js';
import { absoluteUrl, site } from './config.js';
import { tagSlug, visiblePosts, type Post } from './content.js';

const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  );

export function rss(posts: Post[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${xml(site.name)}</title><link>${site.origin}/</link><description>${xml(site.description)}</description><language>en-gb</language><atom:link href="${site.origin}/rss.xml" rel="self" type="application/rss+xml"/>${visiblePosts(
    posts,
  )
    .map(
      (post) =>
        `<item><title>${xml(post.title)}</title><description>${xml(post.description)}</description><link>${absoluteUrl(`/${post.slug}`)}</link><guid isPermaLink="true">${absoluteUrl(`/${post.slug}`)}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><dc:creator>${xml(post.authors.map((id) => authors[id].name).join(', '))}</dc:creator>${post.tags.map((tag) => `<category>${xml(tag)}</category>`).join('')}</item>`,
    )
    .join('')}</channel></rss>`;
}

export function sitemap(posts: Post[]): string {
  const published = visiblePosts(posts);
  const tags = [...new Set(published.flatMap((post) => post.tags))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.origin}/</loc></url>${published.map((post) => `<url><loc>${absoluteUrl(`/${post.slug}`)}</loc><lastmod>${post.updated ?? post.date}</lastmod></url>`).join('')}${tags.map((tag) => `<url><loc>${absoluteUrl(`/tags/${tagSlug(tag)}`)}</loc></url>`).join('')}</urlset>`;
}

export function searchIndex(posts: Post[]) {
  return visiblePosts(posts).map((post) => ({
    title: post.title,
    description: post.description,
    tags: post.tags,
    authors: post.authors.map((id) => authors[id].name),
    url: `/${post.slug}`,
    date: post.date,
  }));
}
