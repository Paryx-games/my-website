import type { ReactNode } from 'react';
import { authors } from './authors.js';
import { absoluteUrl, formatDate, site } from './config.js';
import { tagSlug, type Post } from './content.js';

export function Tags({ tags }: { tags: string[] }) {
  return (
    <ul className="tags" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          <a href={`/tags/${tagSlug(tag)}`}>{tag}</a>
        </li>
      ))}
    </ul>
  );
}

export function Byline({ post }: { post: Post }) {
  return (
    <div className="byline">
      <div className="authors">
        {post.authors.map((id) => {
          const author = authors[id];
          return (
            <div className="author" key={id}>
              <img src={author.avatar} alt="" width="44" height="44" />
              <div>
                {author.url ? (
                  <a href={author.url} rel="author">
                    {author.name}
                  </a>
                ) : (
                  <span>{author.name}</span>
                )}
                {author.role && <small>{author.role}</small>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="post-dates">
        <span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true"> · </span>
          {post.readingTime}
        </span>
        {post.updated && post.updated !== post.date && (
          <span>
            Updated{' '}
            <time dateTime={post.updated}>{formatDate(post.updated)}</time>
          </span>
        )}
      </div>
    </div>
  );
}

export function Search({ id = 'sidebar-search' }: { id?: string }) {
  return (
    <form className="search-form" action="/" role="search">
      <label className="sr-only" htmlFor={id}>
        Search articles
      </label>
      <span aria-hidden="true">⌕</span>
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Search articles…"
        autoComplete="off"
      />
      <button className="sr-only focus-reveal" type="submit">
        Search
      </button>
    </form>
  );
}

export function Sidebar({ posts }: { posts: Post[] }) {
  const counts = new Map<string, number>();
  posts.forEach((post) =>
    post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)),
  );
  return (
    <aside className="sidebar" aria-label="Explore the blog">
      <Search />
      <section>
        <h2>Categories</h2>
        <a className="category" href="/">
          All posts <span>{posts.length}</span>
        </a>
        {[...counts]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tag, count]) => (
            <a className="category" href={`/tags/${tagSlug(tag)}`} key={tag}>
              {tag}
              <span>{count}</span>
            </a>
          ))}
      </section>
      <section>
        <h2>Recent posts</h2>
        <div className="recent-posts">
          {posts.slice(0, 3).map((post) => (
            <a className="recent-post" href={`/${post.slug}`} key={post.slug}>
              {post.banner && (
                <img
                  src={post.banner}
                  alt=""
                  width="64"
                  height="64"
                  loading="lazy"
                />
              )}
              <div>
                <strong>{post.title}</strong>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </div>
            </a>
          ))}
        </div>
      </section>
      <a className="rss-link" href="/rss.xml">
        Follow via RSS <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="https://paryx.uk">
        paryx
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLinks />
      </nav>
      <div className="header-actions">
        <a
          className="icon-button"
          href="/#search"
          data-open-search
          aria-label="Search articles"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
        </a>
        <details className="mobile-nav">
          <summary aria-label="Toggle navigation">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
          </summary>
          <nav aria-label="Mobile navigation">
            <NavLinks />
            <a href="/rss.xml">RSS feed</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

function NavLinks() {
  return (
    <>
      <a href="https://paryx.uk">Home</a>
      <a href="/" aria-current="page">
        Blog
      </a>
      <a href="https://paryx.uk/#repos">Projects</a>
      <a href="https://paryx.uk/#content">About</a>
    </>
  );
}

export function Document({
  title,
  description = site.description,
  pathname = '/',
  image,
  post,
  noindex = false,
  children,
}: {
  title: string;
  description?: string;
  pathname?: string;
  image?: string;
  post?: Post;
  noindex?: boolean;
  children: ReactNode;
}) {
  const canonical = absoluteUrl(pathname);
  const pageTitle = title === site.name ? title : `${title} — paryx`;
  const schema = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        ...(image ? { image: [absoluteUrl(image)] } : {}),
        author: post.authors.map((id) => ({
          '@type': 'Person',
          name: authors[id].name,
          ...(authors[id].url ? { url: authors[id].url } : {}),
        })),
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        url: canonical,
      }
    : undefined;
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#080809" />
        <link rel="canonical" href={canonical} />
        <meta
          name="robots"
          content={noindex ? 'noindex, nofollow' : 'index, follow'}
        />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:type" content={post ? 'article' : 'website'} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta
          name="twitter:card"
          content={image ? 'summary_large_image' : 'summary'}
        />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {image && (
          <>
            <meta property="og:image" content={absoluteUrl(image)} />
            <meta property="og:image:alt" content={post?.bannerAlt ?? title} />
            <meta name="twitter:image" content={absoluteUrl(image)} />
          </>
        )}
        {post && (
          <>
            <meta
              property="article:published_time"
              content={`${post.date}T00:00:00Z`}
            />
            <meta
              property="article:modified_time"
              content={`${post.updated ?? post.date}T00:00:00Z`}
            />
            {post.authors.map((id) => (
              <meta name="author" content={authors[id].name} key={id} />
            ))}
            {post.authors
              .filter((id) => authors[id].url)
              .map((id) => (
                <meta
                  property="article:author"
                  content={authors[id].url}
                  key={id}
                />
              ))}
            {post.tags.map((tag) => (
              <meta property="article:tag" content={tag} key={tag} />
            ))}
          </>
        )}
        <link rel="icon" type="image/svg+xml" href="/assets/logo_white.svg" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="paryx Blog"
          href="/rss.xml"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;675;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/blog.css" />
        <script src="/assets/blog.js" defer />
        {schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
            }}
          />
        )}
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="site-shell">
          <Header />
          {children}
          <footer className="site-footer">
            <a href="https://paryx.uk">paryx</a>
            <span>Notes on building things.</span>
            <a href="/rss.xml">RSS</a>
          </footer>
        </div>
        <dialog id="search-dialog" aria-labelledby="search-title">
          <div className="dialog-header">
            <h2 id="search-title">Search articles</h2>
            <button
              className="icon-button"
              type="button"
              data-close-search
              aria-label="Close search"
            >
              ×
            </button>
          </div>
          <Search id="dialog-search" />
          <p className="search-status" role="status" aria-live="polite">
            Search by title, topic, or author.
          </p>
          <div className="search-results" />
        </dialog>
      </body>
    </html>
  );
}

export function Article({
  post,
  posts,
  children,
}: {
  post: Post;
  posts: Post[];
  children: ReactNode;
}) {
  return (
    <main id="main">
      {post.banner && (
        <img
          className="hero-banner"
          src={post.banner}
          alt={post.bannerAlt ?? post.title}
          width="1200"
          height="340"
          fetchPriority="high"
        />
      )}
      <div className="reading-layout">
        <article className="article">
          <header className="article-header">
            {post.demo && (
              <p className="demo-label">Demo article · illustrative content</p>
            )}
            {post.draft && (
              <p className="demo-label">
                Draft preview · excluded from production
              </p>
            )}
            <Tags tags={post.tags} />
            <h1>{post.title}</h1>
            <p className="deck">{post.description}</p>
            <Byline post={post} />
          </header>
          <div className="prose">{children}</div>
        </article>
        <Sidebar posts={posts} />
      </div>
    </main>
  );
}

export function Listing({
  posts,
  allPosts,
  tag,
}: {
  posts: Post[];
  allPosts: Post[];
  tag?: string;
}) {
  const [featured, ...rest] = posts;
  return (
    <main id="main" className="listing">
      <header className="listing-intro">
        <p className="eyebrow">The paryx blog</p>
        <h1>{tag ?? 'Notes on building things.'}</h1>
        <p className="deck">
          {tag
            ? `Articles filed under ${tag}.`
            : 'Software, experiments, and lessons learned along the way.'}
        </p>
      </header>
      <div className="compact-search" id="search">
        <Search id="listing-search" />
      </div>
      {featured?.banner && (
        <a className="featured-banner" href={`/${featured.slug}`}>
          <img
            className="hero-banner"
            src={featured.banner}
            alt={featured.bannerAlt ?? featured.title}
            width="1200"
            height="340"
            fetchPriority="high"
          />
        </a>
      )}
      <div className="reading-layout">
        <div className="post-list" data-post-list>
          {posts.length === 0 && (
            <p className="empty-state">
              No articles published yet. Check back soon, or follow the{' '}
              <a href="/rss.xml">RSS feed</a>.
            </p>
          )}
          {featured && <PostSummary post={featured} featured />}
          {rest.map((post) => (
            <PostSummary key={post.slug} post={post} />
          ))}
          <p className="empty-state" data-empty-search hidden>
            No articles match your search.
          </p>
        </div>
        <Sidebar posts={allPosts} />
      </div>
    </main>
  );
}

function PostSummary({
  post,
  featured = false,
}: {
  post: Post;
  featured?: boolean;
}) {
  const searchText = [
    post.title,
    post.description,
    ...post.tags,
    ...post.authors.map((id) => authors[id].name),
  ]
    .join(' ')
    .toLowerCase();
  return (
    <article
      className={`post-summary ${featured ? 'featured' : ''}`}
      data-search-text={searchText}
    >
      {!featured && post.banner && (
        <a href={`/${post.slug}`} tabIndex={-1} aria-hidden="true">
          <img
            className="listing-thumbnail"
            src={post.banner}
            alt=""
            width="230"
            height="130"
            loading="lazy"
          />
        </a>
      )}
      <div>
        {post.demo && (
          <p className="demo-label">Demo article · illustrative content</p>
        )}
        <Tags tags={post.tags} />
        <h2>
          <a href={`/${post.slug}`}>{post.title}</a>
        </h2>
        <p className="deck">{post.description}</p>
        <Byline post={post} />
        <a className="read-link" href={`/${post.slug}`}>
          Read article <span aria-hidden="true">↗</span>
          <span className="sr-only">: {post.title}</span>
        </a>
      </div>
    </article>
  );
}
