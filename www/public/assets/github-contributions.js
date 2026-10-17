const NS = 'http://www.w3.org/2000/svg';
const element = (tag, attributes = {}, text) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

export function renderContributions(root, data) {
  if (data?.version !== 1 || !Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.weeks) || !data.weeks.length || data.weeks.length > 54) throw new Error('Invalid contributions');
  const step = 13;
  const width = 30 + data.weeks.length * step;
  const svg = element('svg', { viewBox: `0 0 ${width} 122`, width, height: 122, role: 'img', 'aria-label': `${data.total.toLocaleString('en-GB')} GitHub contributions in the last year` });
  const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
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
      const square = element('rect', { x: 30 + index * step, y: 21 + day.weekday * step, width: 10, height: 10, rx: 2, 'data-level': day.level });
      square.append(element('title', {}, `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${dateFormat.format(new Date(`${day.date}T00:00:00Z`))}`));
      svg.append(square);
    }
  });
  for (const [weekday, label] of [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']]) svg.append(element('text', { x: 0, y: 30 + weekday * step }, label));
  const calendar = root.querySelector('#contributions-calendar');
  calendar.replaceChildren(svg);
  calendar.scrollLeft = calendar.scrollWidth;
  root.querySelector('#contributions-summary').textContent = `${data.total.toLocaleString('en-GB')} contributions in the last year`;
  root.querySelector('#contributions-updated').textContent = data.stale ? 'Showing the last available snapshot' : 'GitHub activity';
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
