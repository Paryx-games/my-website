export function quoteParts(quote, catalogue) {
  const titles = [...catalogue].sort((a, b) => b.title.length - a.title.length);
  if (!titles.length) return [quote];
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${titles.map(game => escape(game.title)).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  const parts = [];
  let position = 0;
  for (const match of quote.matchAll(pattern)) {
    if (match.index > position) parts.push(quote.slice(position, match.index));
    const game = titles.find(game => game.title.toLowerCase() === match[0].toLowerCase());
    parts.push({ game, text: match[0] });
    position = match.index + match[0].length;
  }
  if (position < quote.length) parts.push(quote.slice(position));
  return parts;
}

export function renderQuote(root, quote, catalogue) {
  root.replaceChildren();
  if (!quote) return;
  root.append('“');
  for (const part of quoteParts(quote, catalogue)) {
    if (typeof part === 'string') {
      root.append(part);
      continue;
    }
    const link = document.createElement('a');
    link.className = 'game-quote-link';
    link.href = `#game-card-${part.game.id}`;
    link.dataset.quoteGame = part.game.id;
    link.setAttribute('aria-haspopup', 'dialog');
    const icon = document.createElement('img');
    icon.src = part.game.icon;
    icon.alt = '';
    icon.width = 16;
    icon.height = 16;
    icon.addEventListener('error', () => { icon.hidden = true; });
    link.append(icon, part.text);
    root.append(link);
  }
  root.append('”');
}
