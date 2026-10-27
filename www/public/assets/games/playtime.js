export function formatMinutes(value) {
  const total = Math.round(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const number = new Intl.NumberFormat('en-GB');
  const parts = [];
  if (hours) parts.push(`${number.format(hours)} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes || !hours) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

function playtimeTimeZone() {
  const selected = globalThis.__paryxTimeZone;
  if (typeof selected === 'string' && selected) return selected;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatLastPlayed(value, now = Date.now()) {
  if (typeof value !== 'string') return 'No data';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'No data';
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed <= 5 * 60 * 1000) return 'now';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function renderLastPlayed(root, value, now = Date.now()) {
  if (!root) return;
  const display = root.querySelector('#game-last-played-value');
  if (!display) return;
  const text = formatLastPlayed(value, now);
  display.textContent = text;
  display.classList.toggle('game-last-played-value-muted', text === 'No data');
  if (text === 'No data') {
    display.removeAttribute('title');
    display.removeAttribute('aria-label');
    display.removeAttribute('tabindex');
    return;
  }
  const date = new Date(value);
  const timeZone = playtimeTimeZone();
  const precise = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date);
  display.title = precise;
  display.setAttribute('aria-label', `${text}. ${precise}`);
  display.tabIndex = 0;
}

export function robloxPlaytimeBreakdown(playtime) {
  if (!Number.isSafeInteger(playtime?.listedPcMinutes) || playtime.listedPcMinutes < 0 ||
      !Number.isSafeInteger(playtime?.unlistedPcMinutes) || playtime.unlistedPcMinutes < 0) return null;
  return `Listed games: ${formatMinutes(playtime.listedPcMinutes)}\nNon-listed games: ${formatMinutes(playtime.unlistedPcMinutes)}`;
}

export function playtimeEntries(playtime, includeTotal = false) {
  const entries = [['pc', 'PC'], ['mobile', 'Mobile'], ['console', 'Console']].flatMap(([key, label]) => {
    const raw = playtime?.[key];
    const value = typeof raw === 'string' && /^-?\d+(?:\.\d+)?$/.test(raw.trim()) ? Number(raw.trim()) : raw;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return [[key, label, formatMinutes(value)]];
    }
    if (typeof value === 'string' && value.trim()) return [[key, label, value.trim()]];
    return [];
  });
  if (includeTotal) {
    const minutes = ['pc', 'mobile', 'console'].map(key => {
      const raw = playtime?.[key];
      return typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+(?:\.\d+)?$/.test(raw.trim()) ? Number(raw.trim()) : null;
    }).filter(value => value !== null && Number.isSafeInteger(Math.round(value)) && value >= 0);
    const total = minutes.reduce((sum, value) => sum + value, 0);
    if (minutes.length > 1 && Number.isSafeInteger(total)) entries.push(['total', 'Total', formatMinutes(total)]);
  }
  return entries;
}

export function createPlaytimeIncrease(increaseMinutes, compact = false) {
  if (!Number.isSafeInteger(increaseMinutes) || increaseMinutes <= 0) return null;
  const number = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pill = document.createElement('span');
  pill.className = `game-playtime-increase${compact ? ' game-playtime-increase-compact' : ''}`;
  const tooltip = `+${formatMinutes(increaseMinutes)} playtime in last 24 hours`;
  pill.setAttribute('aria-label', tooltip);
  pill.title = tooltip;
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 16 16');
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<path d="M8 12V4M4.5 7.5 8 4l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  pill.append(arrow);
  if (!compact) {
    const amount = document.createElement('span');
    amount.className = 'game-playtime-increase-amount';
    amount.title = tooltip;
    amount.textContent = `+${number.format(increaseMinutes / 60)} hours`;
    pill.append(amount);
  }
  return pill;
}

export function renderPlaytime(root, playtime, isPlatform = false) {
  const icons = {
    pc: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5"/>',
    mobile: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    console: '<path d="M7 7h10a4 4 0 0 1 4 3l2 7a2 2 0 0 1-3 2l-4-3H8l-4 3a2 2 0 0 1-3-2l2-7a4 4 0 0 1 4-3Z M7 10v4M5 12h4M16 11h.01M19 13h.01"/>',
    total: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const entries = playtimeEntries(playtime, true);
  const rows = entries.map(([key, label, text]) => {
    const row = document.createElement('div');
    row.className = 'game-playtime-row';
    row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    const value = document.createElement('span');
    value.className = 'game-playtime-value';
    value.textContent = text;
    if (key === 'pc' && isPlatform) {
      const breakdown = robloxPlaytimeBreakdown(playtime);
      if (breakdown) {
        value.classList.add('game-playtime-roblox-breakdown');
        value.title = breakdown;
        value.setAttribute('aria-label', `${text}. ${breakdown.replaceAll('\n', '. ')}`);
        value.tabIndex = 0;
      }
    }
    detail.append(value);
    const increase = key === 'pc' ? createPlaytimeIncrease(playtime?.pcIncrease24hMinutes) : null;
    if (increase) detail.append(increase);
    row.append(term, detail);
    return row;
  });
  root.querySelector('dl').replaceChildren(...rows);
  root.querySelector('#game-platform-note').hidden = !isPlatform;
  root.hidden = !rows.length && !isPlatform;
}
