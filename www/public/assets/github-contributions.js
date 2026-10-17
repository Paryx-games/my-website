const NS = 'http://www.w3.org/2000/svg';
const element = (tag, attributes = {}, text) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

export function contributionRange(days, anchor, end) {
  const [from, to] = [anchor, end].sort();
  return { from, to, total: days.filter(day => day.date >= from && day.date <= to).reduce((sum, day) => sum + day.count, 0) };
}

export function renderContributions(root, data) {
  if (data?.version !== 1 || !Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.weeks) || !data.weeks.length || data.weeks.length > 54) throw new Error('Invalid contributions');
  const step = 13;
  const width = 30 + data.weeks.length * step;
  const svg = element('svg', { viewBox: `0 0 ${width} 122`, width, height: 122, role: 'group', 'aria-label': 'GitHub contributions. Use arrow keys to move between days, Enter to select, Shift+Enter to select a range, and Escape to clear.' });
  const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
  const days = data.weeks.flat();
  const squares = [];
  const tooltip = root.querySelector('#contributions-tooltip');
  const selection = root.querySelector('#contributions-selection');
  const selectionSummary = root.querySelector('#contributions-selection-summary');
  const selectionLink = root.querySelector('#contributions-selection-link');
  let anchor;
  const label = day => `${day.count.toLocaleString('en-GB')} ${day.count === 1 ? 'contribution' : 'contributions'} on ${dateFormat.format(new Date(`${day.date}T00:00:00Z`))}`;
  const hideTooltip = () => { tooltip.hidden = true; };
  const showTooltip = (square, day) => {
    tooltip.textContent = label(day);
    tooltip.hidden = false;
    const cell = square.getBoundingClientRect();
    const card = root.getBoundingClientRect();
    const left = Math.max(8, Math.min(cell.left - card.left + cell.width / 2 - tooltip.offsetWidth / 2, root.clientWidth - tooltip.offsetWidth - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${cell.top - card.top - tooltip.offsetHeight - 8}px`;
  };
  const clear = () => {
    anchor = undefined;
    selection.hidden = true;
    for (const square of squares) square.setAttribute('aria-pressed', 'false');
    hideTooltip();
  };
  const select = (day, extend) => {
    if (!extend || !anchor) anchor = day.date;
    const range = contributionRange(days, anchor, day.date);
    for (const square of squares) square.setAttribute('aria-pressed', String(square.dataset.date >= range.from && square.dataset.date <= range.to));
    const from = dateFormat.format(new Date(`${range.from}T00:00:00Z`));
    const to = dateFormat.format(new Date(`${range.to}T00:00:00Z`));
    selectionSummary.textContent = `${range.total.toLocaleString('en-GB')} ${range.total === 1 ? 'contribution' : 'contributions'} ${range.from === range.to ? `on ${from}` : `from ${from} to ${to}`}`;
    const url = new URL('https://github.com/Paryx-games');
    url.search = new URLSearchParams({ tab: 'overview', from: `${range.from}T00:00:00Z`, to: `${range.to}T23:59:59Z` }).toString();
    selectionLink.href = url.href;
    selection.hidden = false;
  };
  root.querySelector('#contributions-clear').onclick = () => {
    clear();
    squares.find(square => square.getAttribute('tabindex') === '0')?.focus();
  };
  let previousMonth;
  data.weeks.forEach((week, index) => {
    if (!Array.isArray(week) || !week.length || week.length > 7) throw new Error('Invalid contribution week');
    const first = new Date(`${week[0].date}T00:00:00Z`);
    const month = first.getUTCMonth();
    if (month !== previousMonth && index <= data.weeks.length - 2) {
      svg.append(element('text', { x: 30 + index * step, y: 11 }, new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(first)));
      previousMonth = month;
    }
    for (const day of week) {
      if (!Number.isInteger(day.level) || day.level < 0 || day.level > 4 || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6 || !Number.isSafeInteger(day.count) || day.count < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new Error('Invalid contribution day');
      const square = element('rect', { x: 30 + index * step, y: 21 + day.weekday * step, width: 10, height: 10, rx: 2, 'data-level': day.level, 'data-date': day.date, role: 'button', tabindex: -1, 'aria-label': label(day), 'aria-pressed': 'false', 'aria-describedby': 'contributions-tooltip' });
      const position = squares.length;
      squares.push(square);
      square.addEventListener('pointerenter', () => showTooltip(square, day));
      square.addEventListener('pointerleave', hideTooltip);
      square.addEventListener('focus', () => {
        for (const cell of squares) cell.setAttribute('tabindex', cell === square ? '0' : '-1');
        showTooltip(square, day);
      });
      square.addEventListener('blur', hideTooltip);
      square.addEventListener('click', event => { square.focus(); select(day, event.shiftKey); });
      square.addEventListener('keydown', event => {
        const offsets = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
        if (event.key in offsets || event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? squares.length - 1 : Math.max(0, Math.min(squares.length - 1, position + offsets[event.key]));
          squares[next].focus();
          squares[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
          showTooltip(squares[next], days[next]);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(day, event.shiftKey);
        } else if (event.key === 'Escape') { event.preventDefault(); clear(); }
      });
      svg.append(square);
    }
  });
  for (const [weekday, label] of [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']]) svg.append(element('text', { x: 0, y: 30 + weekday * step }, label));
  const calendar = root.querySelector('#contributions-calendar');
  calendar.replaceChildren(svg);
  squares.at(-1).setAttribute('tabindex', '0');
  calendar.onscroll = hideTooltip;
  calendar.scrollLeft = calendar.scrollWidth;
  root.querySelector('#contributions-summary').textContent = `${data.total.toLocaleString('en-GB')} contributions in the last year`;
  root.querySelector('#contributions-updated').textContent = data.stale ? 'Showing saved activity' : '';
}

const root = typeof document === 'undefined' ? null : document.getElementById('github-contributions');
if (root) {
  fetch('/api/github-contributions', { signal: AbortSignal.timeout(25000) })
    .then(response => { if (!response.ok) throw new Error('Contributions unavailable'); return response.json(); })
    .then(data => renderContributions(root, data))
    .catch(() => {
      root.querySelector('#contributions-summary').textContent = 'GitHub contributions are currently unavailable.';
      root.querySelector('#contributions-calendar').textContent = 'Open my GitHub profile to view contribution activity.';
    });
}
