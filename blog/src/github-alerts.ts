import type { CalloutType } from './components.js';

// The small HAST surface used here keeps this plugin independent of AST utilities.
interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

export function rehypeGithubAlerts() {
  return (tree: Node) => {
    // GitHub alerts are top-level blockquotes, never nested in other elements.
    for (const node of tree.children ?? []) {
      if (node.tagName !== 'blockquote') continue;
      const paragraph = node.children?.find(
        (child) => child.type === 'element',
      );
      const first = paragraph?.children?.[0];
      if (paragraph?.tagName !== 'p' || first?.type !== 'text') continue;
      const match = first.value?.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|$)/,
      );
      if (!match) continue;
      const type = match[1].toLowerCase() as CalloutType;
      first.value = first.value!.slice(match[0].length);
      if (!first.value) paragraph.children!.shift();
      if (!paragraph.children!.length)
        node.children = node.children!.filter((child) => child !== paragraph);
      node.properties = { ...node.properties, 'data-callout': type };
    }
  };
}
