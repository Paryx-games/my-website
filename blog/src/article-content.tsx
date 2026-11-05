import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { mdxComponents } from './components.js';
import { rehypeGithubAlerts } from './github-alerts.js';
import type { Post } from './content.js';

type Node = DefaultTreeAdapterMap['node'];
type CodeTreeNode = {
  type?: string;
  meta?: string | null;
  data?: { hProperties?: Record<string, unknown> };
  children?: CodeTreeNode[];
};

function remarkCodeTitles() {
  return (tree: CodeTreeNode) => {
    function visit(node: CodeTreeNode) {
      if (node.type === 'code' && node.meta) {
        const title = node.meta.match(
          /(?:^|\s)title=(?:"([^"]+)"|'([^']+)')(?:\s|$)/,
        );
        const filename = (title?.[1] ?? title?.[2])?.trim();
        if (filename && filename.length <= 160 && !/[\r\n]/.test(filename)) {
          node.data ??= {};
          node.data.hProperties ??= {};
          node.data.hProperties['data-filename'] = filename;
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

function text(node: Node): string {
  if (node.nodeName === '#text')
    return (node as DefaultTreeAdapterMap['textNode']).value;
  if (
    'tagName' in node &&
    (['script', 'style', 'button'].includes(node.tagName) ||
      node.attrs.some(
        (attr) =>
          attr.name === 'class' &&
          /heading-anchor|code-toolbar/.test(attr.value),
      ))
  )
    return '';
  return 'childNodes' in node ? node.childNodes.map(text).join(' ') : '';
}

// Analyse rendered content so MDX components, footnotes and Markdown share one index.
export function analyseArticle(html: string) {
  const tree = parseFragment(html);
  const headings: NonNullable<Post['headings']> = [];
  function visit(node: Node) {
    if ('tagName' in node && /^h[2-3]$/.test(node.tagName)) {
      const id = node.attrs.find((attr) => attr.name === 'id')?.value;
      if (id && id !== 'footnote-label')
        headings.push({
          id,
          title: text(node).replace(/\s+/g, ' ').trim(),
          level: Number(node.tagName.slice(1)),
        });
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
  }
  visit(tree);
  return { headings, searchText: text(tree).replace(/\s+/g, ' ').trim() };
}

export async function compileArticle(post: Post) {
  // MDX is trusted repository content, evaluated only during the build.
  const { default: Content } = await evaluate(post.content, {
    ...runtime,
    format: post.extension === '.md' ? 'md' : 'mdx',
    remarkPlugins: [remarkCodeTitles, remarkGfm],
    rehypePlugins: [
      rehypeGithubAlerts,
      rehypeSlug,
      [rehypeHighlight, { detect: false, ignoreMissing: true }],
    ],
    baseUrl: new URL('../content/posts/', import.meta.url),
  });
  const html = renderToStaticMarkup(<Content components={mdxComponents} />);
  Object.assign(post, analyseArticle(html));
  return html;
}
