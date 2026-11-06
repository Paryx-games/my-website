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

export function allTimeCalendar(years, today = new Date().toISOString().slice(0, 10)) {
  const contributions = new Map(years.flatMap(({ weeks }) => weeks.flat()).map(day => [day.date, day]));
  const firstYear = years.length ? Math.min(...years.map(({ year }) => year)) : new Date(`${today}T00:00:00Z`).getUTCFullYear();
  const start = new Date(`${firstYear}-01-01T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days = [];
  for (const date = start; date.toISOString().slice(0, 10) <= today; date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10);
    days.push(contributions.get(key) || { date: key, weekday: date.getUTCDay(), count: 0, level: 0 });
  }
  const weeks = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return { weeks, total: years.reduce((total, year) => total + year.total, 0) };
}

export function contributionMonthHeadings(weeks, firstYear = -Infinity) {
  let previousMonth;
  return weeks.flatMap((week, index) => {
    const first = new Date(`${week[0].date}T00:00:00Z`);
    const year = first.getUTCFullYear();
    const month = first.getUTCMonth();
    const key = `${year}-${month}`;
    if (year < firstYear || key === previousMonth) return [];
    previousMonth = key;
    return [{
      index,
      label: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(first),
    }];
  });
}

export function contributionYearBoundaries(weeks) {
  return weeks.flatMap((week, index) => week.some(day => day.date.endsWith('-01-01')) ? [index] : []);
}

const CONTRIBUTION_COLUMN_STEP = 13;
const CONTRIBUTION_YEAR_GAP = 12;

export function contributionWeekX(index, yearBoundaries = []) {
  const gapsBeforeWeek = yearBoundaries.filter(boundary => boundary > 0 && boundary <= index).length;
  return 30 + index * CONTRIBUTION_COLUMN_STEP + gapsBeforeWeek * CONTRIBUTION_YEAR_GAP;
}

export function aggregateRepositoryLanguages(data) {
  if (data?.version !== 1) throw new Error('Invalid repository language data');
  const totals = new Map();
  const colors = new Map();
  for (const key of ['games', 'labs']) {
    if (!Array.isArray(data[key])) continue;
    for (const repo of data[key]) {
      if (!repo?.languageBytes || typeof repo.languageBytes !== 'object' || Array.isArray(repo.languageBytes)) continue;
      for (const [language, bytes] of Object.entries(repo.languageBytes)) {
        if (typeof language !== 'string' || !Number.isSafeInteger(bytes) || bytes <= 0) continue;
        totals.set(language, (totals.get(language) || 0) + bytes);
        const color = repo.languageColors?.[language];
        if (typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)) colors.set(language, color);
      }
    }
  }
  const languages = [...totals].map(([name, bytes]) => ({
    name,
    bytes,
    color: colors.get(name) || '#8b949e',
  })).sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  const totalBytes = languages.reduce((sum, language) => sum + language.bytes, 0);
  return languages.map(language => ({
    ...language,
    percentage: totalBytes ? language.bytes / totalBytes * 100 : 0,
  }));
}

export function normalizeLanguageEndpoint(data) {
  if (!data || typeof data.repository !== 'string' || !Number.isSafeInteger(data.totalBytes) ||
      data.totalBytes < 0 || !Array.isArray(data.languages)) throw new Error('Invalid language data');
  return data.languages.flatMap(language => {
    if (!language || typeof language.language !== 'string' || !Number.isSafeInteger(language.bytes) ||
        language.bytes <= 0 || typeof language.percentage !== 'number' || !Number.isFinite(language.percentage) ||
        language.percentage < 0 || typeof language.color !== 'string' || !/^#[\da-f]{6}$/i.test(language.color)) return [];
    return [{
      name: language.language,
      bytes: language.bytes,
      color: language.color,
      percentage: language.percentage,
    }];
  });
}

export function renderContributions(root, data, { periodCache = new Map(), loadPeriod } = {}) {
  if (data?.version !== 1 || !Number.isSafeInteger(data.total) || data.total < 0 ||
      !Array.isArray(data.weeks) || !data.weeks.length || data.weeks.length > 54 ||
      !Array.isArray(data.years) || data.years.some(year => !Number.isInteger(year))) {
    throw new Error('Invalid contributions');
  }
  periodCache.set('last-year', data);
  const periodSelect = root.querySelector('#contributions-period');
  const summary = root.querySelector('#contributions-summary-text');
  const updated = root.querySelector('#contributions-updated');
  periodSelect.replaceChildren(
    new Option('All time', 'all'),
    new Option('Last year', 'last-year'),
    ...data.years.toSorted((a, b) => b - a).map(year => new Option(String(year), `year:${year}`)),
  );
  periodSelect.disabled = false;
  periodSelect.value = 'last-year';

  const paint = (period, key) => {
    const weeks = key === 'all' ? allTimeCalendar(period.years, period.fetchedAt?.slice(0, 10)).weeks : period.weeks;
    const total = period.total;
    const firstYear = key === 'all' && period.years.length ? Math.min(...period.years.map(({ year }) => year)) : -Infinity;
    const yearBoundaries = key === 'all' ? contributionYearBoundaries(weeks) : [];
    const yearGaps = yearBoundaries.filter(index => index > 0).length;
    const width = 30 + weeks.length * CONTRIBUTION_COLUMN_STEP + yearGaps * CONTRIBUTION_YEAR_GAP;
    const height = key === 'all' ? 140 : 116;
    const svg = element('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'group', 'aria-label': 'GitHub contributions. Use arrow keys to move between days, Enter to select, Shift+Enter to select a range, and Escape to clear.' });
    const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
    const days = weeks.flat();
    const squares = [];
    const tooltip = root.querySelector('#contributions-tooltip');
    const selection = root.querySelector('#contributions-selection');
    const selectionSummary = root.querySelector('#contributions-selection-summary');
    const selectionLink = root.querySelector('#contributions-selection-link');
    let anchor;
    let focusedSquare;
    const label = day => `${day.count.toLocaleString('en-GB')} ${day.count === 1 ? 'contribution' : 'contributions'} on ${dateFormat.format(new Date(`${day.date}T00:00:00Z`))}`;
    const dayFor = square => days[Number(square.dataset.index)];
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

    for (const index of yearBoundaries) {
      const januaryFirst = weeks[index].find(day => day.date.endsWith('-01-01'));
      if (index > 0) {
        const dividerX = contributionWeekX(index, yearBoundaries) - CONTRIBUTION_YEAR_GAP / 2;
        svg.append(element('line', { x1: dividerX, x2: dividerX, y1: 18, y2: 112, class: 'contributions-year-divider' }));
      }
      if (januaryFirst) svg.append(element('text', { x: contributionWeekX(index, yearBoundaries), y: 132, class: 'contributions-year-label' }, januaryFirst.date.slice(0, 4)));
    }
    for (const { index, label: month } of contributionMonthHeadings(weeks, firstYear)) {
      svg.append(element('text', { x: contributionWeekX(index, yearBoundaries), y: 11 }, month));
    }
    weeks.forEach((week, index) => {
      if (!Array.isArray(week) || !week.length || week.length > 7) throw new Error('Invalid contribution week');
      for (const day of week) {
        if (!Number.isInteger(day.level) || day.level < 0 || day.level > 4 ||
            !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6 ||
            !Number.isSafeInteger(day.count) || day.count < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
          throw new Error('Invalid contribution day');
        }
        const square = element('rect', {
          x: contributionWeekX(index, yearBoundaries), y: 21 + day.weekday * CONTRIBUTION_COLUMN_STEP,
          width: 10, height: 10, rx: 2, 'data-level': day.level, 'data-date': day.date,
          'data-index': squares.length, role: 'button', tabindex: -1, 'aria-label': label(day),
          'aria-pressed': 'false', 'aria-describedby': 'contributions-tooltip',
        });
        squares.push(square);
        svg.append(square);
      }
    });
    for (const [weekday, weekdayLabel] of [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']]) {
      svg.append(element('text', { x: 0, y: 30 + weekday * CONTRIBUTION_COLUMN_STEP }, weekdayLabel));
    }

    const squareFrom = target => target instanceof Element ? target.closest('rect[role="button"]') : null;
    svg.addEventListener('pointerover', event => {
      const square = squareFrom(event.target);
      if (square) showTooltip(square, dayFor(square));
    });
    svg.addEventListener('pointerout', event => {
      if (squareFrom(event.target)) hideTooltip();
    });
    svg.addEventListener('focusin', event => {
      const square = squareFrom(event.target);
      if (!square) return;
      if (focusedSquare && focusedSquare !== square) focusedSquare.setAttribute('tabindex', '-1');
      focusedSquare = square;
      square.setAttribute('tabindex', '0');
      showTooltip(square, dayFor(square));
    });
    svg.addEventListener('focusout', event => {
      if (!svg.contains(event.relatedTarget)) hideTooltip();
    });
    svg.addEventListener('click', event => {
      const square = squareFrom(event.target);
      if (!square) return;
      square.focus();
      select(dayFor(square), event.shiftKey);
    });
    svg.addEventListener('keydown', event => {
      const square = squareFrom(event.target);
      if (!square) return;
      const position = Number(square.dataset.index);
      const offsets = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
      if (event.key in offsets || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? squares.length - 1 : Math.max(0, Math.min(squares.length - 1, position + offsets[event.key]));
        squares[next].focus();
        squares[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        showTooltip(squares[next], days[next]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(dayFor(square), event.shiftKey);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        clear();
      }
    });

    const calendar = root.querySelector('#contributions-calendar');
    calendar.replaceChildren(svg);
    squares.at(-1).setAttribute('tabindex', '0');
    calendar.onscroll = hideTooltip;
    const scrollToLatest = () => {
      if (calendar.scrollWidth > calendar.clientWidth) calendar.scrollLeft = calendar.scrollWidth;
    };
    if (document.readyState === 'complete') requestAnimationFrame(scrollToLatest);
    else window.addEventListener('load', () => requestAnimationFrame(scrollToLatest), { once: true });
    const periodName = periodSelect.selectedOptions[0].textContent;
    summary.textContent = `${total.toLocaleString('en-GB')} contributions ${periodName === 'All time' ? 'in total' : `in ${periodName.toLowerCase()}`}`;
    updated.textContent = period.stale ? 'Showing saved activity' : '';
  };

  let activeKey = 'last-year';
  let requestId = 0;
  const paintCached = key => {
    const period = periodCache.get(key);
    if (!period) return false;
    paint(period, key);
    return true;
  };
  periodSelect.onchange = async () => {
    const key = periodSelect.value;
    const currentRequest = ++requestId;
    if (paintCached(key)) {
      activeKey = key;
      return;
    }
    periodSelect.disabled = true;
    updated.textContent = 'Loading historical contributions...';
    try {
      const history = await loadPeriod(key);
      if (currentRequest !== requestId) return;
      periodCache.set(key, history);
      periodSelect.disabled = false;
      activeKey = key;
      paint(history, key);
    } catch {
      if (currentRequest !== requestId) return;
      periodSelect.value = activeKey;
      periodSelect.disabled = false;
      updated.textContent = 'Could not load that contribution period.';
    }
  };
  root.querySelector('#contributions-clear').onclick = () => {
    root.querySelector('#contributions-selection').hidden = true;
    root.querySelectorAll('#contributions-calendar [aria-pressed="true"]').forEach(square => square.setAttribute('aria-pressed', 'false'));
    root.querySelector('#contributions-tooltip').hidden = true;
    root.querySelector('#contributions-calendar [tabindex="0"]')?.focus();
  };
  paint(data, 'last-year');
}

export function renderLanguageBar(root, languages) {
  root.replaceChildren();
  root.hidden = !languages.length;
  for (const language of languages) {
    const segment = document.createElement('span');
    const percentage = language.percentage;
    segment.className = 'contributions-language-segment';
    segment.style.width = `${percentage}%`;
    segment.style.backgroundColor = language.color;
    segment.dataset.tooltip = `${language.name}: ${percentage.toFixed(1)}%`;
    segment.title = segment.dataset.tooltip;
    segment.setAttribute('role', 'img');
    segment.setAttribute('aria-label', segment.dataset.tooltip);
    segment.tabIndex = 0;
    root.append(segment);
  }
  if (languages.length) requestAnimationFrame(() => root.classList.add('is-ready'));
}

const root = typeof document === 'undefined' ? null : document.getElementById('github-contributions');
if (root) {
  const languageBar = root.querySelector('#contributions-language-bar');
  const periodCache = new Map();
  const fetchMeasured = async (url, name) => {
    const started = performance.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const body = await response.text();
    const ended = performance.now();
    performance.measure(`${name}-request`, {
      start: started,
      end: ended,
      detail: { bytes: new TextEncoder().encode(body).byteLength },
    });
    if (!response.ok) throw new Error(`${name} unavailable`);
    const parseStarted = performance.now();
    const data = JSON.parse(body);
    performance.measure(`${name}-parse`, { start: parseStarted, end: performance.now() });
    return data;
  };
  const loadPeriod = key => {
    const query = key === 'all' ? '?period=all' : `?period=year&year=${encodeURIComponent(key.slice(5))}`;
    return fetchMeasured(`/api/github-contributions${query}`, `github-contributions-${key.replace(':', '-')}`);
  };
  const loadContributions = async () => {
    try {
      const data = await fetchMeasured('/api/github-contributions', 'github-contributions-recent');
      periodCache.set('last-year', data);
      const started = performance.now();
      renderContributions(root, data, { periodCache, loadPeriod });
      performance.measure('github-contributions-render', { start: started, end: performance.now() });
    } catch {
      root.querySelector('#contributions-summary-text').textContent = 'GitHub contributions are currently unavailable.';
      root.querySelector('#contributions-period').disabled = true;
      root.querySelector('#contributions-calendar').textContent = 'Open my GitHub profile to view contribution activity.';
    }
  };
  const loadLanguages = async () => {
    try {
      const data = await fetchMeasured('https://api.paryx.uk/github/languages?target=Paryx-games', 'github-contribution-languages');
      const languages = normalizeLanguageEndpoint(data);
      renderLanguageBar(languageBar, languages);
      if (!languages.length) {
        languageBar.hidden = false;
        languageBar.classList.add('is-unavailable');
        languageBar.textContent = 'No public repository languages found';
        languageBar.setAttribute('role', 'status');
        languageBar.removeAttribute('aria-label');
      }
    } catch {
      languageBar.hidden = false;
      languageBar.classList.add('is-unavailable');
      languageBar.textContent = 'Languages unavailable';
      languageBar.setAttribute('role', 'status');
      languageBar.removeAttribute('aria-label');
    }
  };
  let observer;
  const startLoading = () => {
    observer?.disconnect();
    void loadContributions();
    void loadLanguages();
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) startLoading();
    }, { rootMargin: '300px 0px' });
    observer.observe(root);
  } else {
    startLoading();
  }
}
