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
        value.setAttribute('aria-label', `${text}. ${breakdown.replace('\n', '. ')}`);
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
