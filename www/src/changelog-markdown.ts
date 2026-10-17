import { marked } from 'marked';

const allowedTags = new Set([
  'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HR', 'LI', 'OL', 'P', 'PRE', 'S', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL',
]);
const discardedTags = new Set(['IFRAME', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE']);

function clean(node: Node): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [node.cloneNode()];
  if (!(node instanceof HTMLElement)) return [];
  if (discardedTags.has(node.tagName)) return [];
  if (!allowedTags.has(node.tagName)) return [...node.childNodes].flatMap(clean);

  const safe = document.createElement(node.tagName.toLowerCase());
  if (node.tagName === 'A') {
    const href = node.getAttribute('href');
    try {
      const url = new URL(href || '', location.href);
      if (href && url.protocol === 'https:') {
        safe.setAttribute('href', url.href);
        safe.setAttribute('target', '_blank');
        safe.setAttribute('rel', 'noopener noreferrer');
      }
    } catch {
      // Invalid links are rendered as plain text.
    }
  }
  safe.append(...[...node.childNodes].flatMap(clean));
  return [safe];
}

declare global {
  interface Window {
    renderChangelogMarkdown(source: string, className: string): HTMLDivElement;
  }
}

window.renderChangelogMarkdown = (source, className) => {
  const parsed = new DOMParser().parseFromString(marked.parse(source, { async: false }), 'text/html');
  const container = document.createElement('div');
  container.className = className;
  container.append(...[...parsed.body.childNodes].flatMap(clean));
  return container;
};
