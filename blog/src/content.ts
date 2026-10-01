import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { authors } from './authors.js';

export interface Post {
  title: string;
  description: string;
  date: string;
  updated?: string;
  authors: string[];
  banner?: string;
  bannerAlt?: string;
  tags: string[];
  draft: boolean;
  demo: boolean;
  slug: string;
  content: string;
  extension: '.md' | '.mdx';
  readingTime: string;
  series?: { slug: string; title: string; part: number };
  headings?: { id: string; title: string; level: number }[];
  searchText?: string;
}

const reserved = new Set([
  'tags',
  'authors',
  'series',
  'og',
  'assets',
  'blog',
  'index',
  '404',
  'rss',
  'sitemap',
  'robots',
  'search-index',
]);
export const tagSlug = (tag: string): string =>
  tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function parsePost(source: string, filename: string): Post {
  const { data, content } = matter(source);
  const fail = (message: string): never => {
    throw new Error(`${filename}: ${message}`);
  };
  for (const key of ['title', 'description']) {
    if (typeof data[key] !== 'string' || !data[key].trim())
      fail(`${key} must be a non-empty string`);
  }
  if (!validDate(data.date))
    fail('date must be a quoted ISO date (YYYY-MM-DD)');
  if (
    data.updated !== undefined &&
    (!validDate(data.updated) || data.updated < data.date)
  )
    fail('updated must be an ISO date on or after date');
  if (
    !Array.isArray(data.authors) ||
    !data.authors.length ||
    data.authors.some(
      (id: unknown) => typeof id !== 'string' || !Object.hasOwn(authors, id),
    )
  )
    fail('authors must reference known author IDs');
  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) ||
      data.tags.some(
        (tag: unknown) => typeof tag !== 'string' || !tagSlug(tag),
      ))
  )
    fail('tags must be a list of non-empty names');
  for (const key of ['draft', 'demo']) {
    if (data[key] !== undefined && typeof data[key] !== 'boolean')
      fail(`${key} must be a boolean`);
  }
  for (const key of ['banner', 'bannerAlt']) {
    if (data[key] !== undefined && typeof data[key] !== 'string')
      fail(`${key} must be a string`);
  }
  if (
    data.banner &&
    (!data.banner.startsWith('/') || data.banner.startsWith('//'))
  )
    fail('banner must be a root-relative public asset path');
  const slug = data.slug ?? path.basename(filename, path.extname(filename));
  if (
    typeof slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    reserved.has(slug)
  )
    fail('slug must be a unique, non-reserved lowercase URL segment');
  const extension = path.extname(filename);
  if (extension !== '.md' && extension !== '.mdx') fail('expected .md or .mdx');
  if (data.series !== undefined) {
    const series = data.series;
    if (
      !series ||
      typeof series !== 'object' ||
      typeof series.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(series.slug) ||
      typeof series.title !== 'string' ||
      !series.title.trim() ||
      !Number.isSafeInteger(series.part) ||
      series.part < 1
    )
      fail(
        'series must contain a lowercase slug, title, and positive integer part',
      );
  }
  return {
    series: data.series,
    title: data.title,
    description: data.description,
    date: data.date,
    updated: data.updated,
    authors: [...new Set<string>(data.authors)],
    banner: data.banner,
    bannerAlt: data.bannerAlt,
    tags: [...new Set<string>(data.tags ?? [])],
    draft: data.draft ?? false,
    demo: data.demo ?? false,
    slug,
    content,
    extension: extension as Post['extension'],
    readingTime: `${Math.max(1, Math.ceil(readingTime(content).minutes))} min read`,
  };
}

export function visiblePosts(posts: Post[], includeDrafts = false): Post[] {
  return posts
    .filter((post) => includeDrafts || !post.draft)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
}

export async function loadPosts(
  directory: string,
  includeDrafts = false,
): Promise<Post[]> {
  const files = (await readdir(directory)).filter((file) =>
    /\.mdx?$/.test(file),
  );
  const posts = await Promise.all(
    files.map(async (file) =>
      parsePost(await readFile(path.join(directory, file), 'utf8'), file),
    ),
  );
  const slugs = new Set<string>();
  const tags = new Map<string, string>();
  const series = new Map<string, { title: string; parts: Set<number> }>();
  for (const post of posts) {
    if (slugs.has(post.slug))
      throw new Error(`Duplicate article slug: ${post.slug}`);
    slugs.add(post.slug);
    if (post.series) {
      const group = series.get(post.series.slug) ?? {
        title: post.series.title,
        parts: new Set<number>(),
      };
      if (
        group.title !== post.series.title ||
        group.parts.has(post.series.part)
      )
        throw new Error(
          `Conflicting title or duplicate part for series ${post.series.slug}`,
        );
      group.parts.add(post.series.part);
      series.set(post.series.slug, group);
    }
    for (const tag of post.tags) {
      const slug = tagSlug(tag);
      if (tags.has(slug) && tags.get(slug) !== tag)
        throw new Error(`Conflicting tag names for /tags/${slug}`);
      tags.set(slug, tag);
    }
  }
  return visiblePosts(posts, includeDrafts);
}

export function seriesPosts(posts: Post[], slug: string): Post[] {
  return visiblePosts(posts)
    .filter((post) => post.series?.slug === slug)
    .sort((a, b) => a.series!.part - b.series!.part);
}

export function relatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
  const score = (candidate: Post) =>
    candidate.tags.filter((tag) => post.tags.includes(tag)).length;
  return visiblePosts(posts)
    .filter((candidate) => candidate.slug !== post.slug && score(candidate) > 0)
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        b.date.localeCompare(a.date) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, limit);
}
