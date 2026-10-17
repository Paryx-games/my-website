const collator = new Intl.Collator('en-GB', { sensitivity: 'base', numeric: true });

export const gameSortOptions = [
  ['playtime', 'Play time'], ['title', 'Game name'],
  ['publisher', 'Publisher name'], ['developer', 'Developer name'],
  ['year', 'Release year'], ['genre', 'Genre'], ['rating', 'Personal rating'],
  ['original', 'Original order'],
];

function numericValue(value) {
  if (typeof value === 'string') value = /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function totalMinutes(playtime) {
  const values = ['pc', 'mobile', 'console'].map(key => numericValue(playtime?.[key])).filter(value => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

export function sortGames(games, key, details = {}, ratings = {}) {
  if (!gameSortOptions.some(([value]) => value === key) || key === 'original') return [...games];
  const value = game => key === 'playtime' ? totalMinutes(details[game.id]?.playtime)
    : key === 'rating' ? numericValue(ratings[game.id]?.personal)
      : key === 'year' ? numericValue(game.year) : game[key]?.trim() || null;
  return [...games].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null || right === null) return left === right ? collator.compare(a.title, b.title) : left === null ? 1 : -1;
    const difference = typeof left === 'number' ? right - left : collator.compare(left, right);
    return difference || collator.compare(a.title, b.title);
  });
}

export function setupGameSort(root, games, getDetails, getRatings) {
  const heading = root.previousElementSibling;
  const menu = document.createElement('details');
  menu.className = 'game-sort';
  const summary = document.createElement('summary');
  const category = heading.querySelector('h3').textContent;
  summary.setAttribute('aria-label', `Sort ${category}`);
  summary.innerHTML = 'Sort <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>';
  const options = document.createElement('fieldset');
  options.className = 'game-sort-options';
  const legend = document.createElement('legend');
  legend.className = 'sr-only';
  legend.textContent = `Sort ${category} by`;
  options.append(legend);
  let selected = 'original';
  const apply = () => {
    const cards = new Map([...root.children].map(card => [card.querySelector('[data-game]')?.dataset.game, card]));
    for (const game of sortGames(games, selected, getDetails(), getRatings())) {
      const card = cards.get(game.id);
      if (card) root.append(card);
    }
  };
  for (const [index, [key, title]] of gameSortOptions.entries()) {
    if (index === 2) options.append(document.createElement('hr'));
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${root.id}-sort`;
    input.setAttribute('aria-label', title);
    input.value = key;
    input.checked = key === selected;
    label.append(input, document.createTextNode(title));
    options.append(label);
    input.addEventListener('change', () => {
      selected = key;
      apply();
      summary.setAttribute('aria-label', `Sort ${category}: ${title}`);
      menu.open = false;
      summary.focus({ preventScroll: true });
    });
  }
  menu.append(summary, options);
  heading.append(menu);
  menu.addEventListener('toggle', () => {
    if (menu.open) document.querySelectorAll('.game-sort').forEach(other => { if (other !== menu) other.open = false; });
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      menu.open = false;
      summary.focus({ preventScroll: true });
    }
  });
  return apply;
}
