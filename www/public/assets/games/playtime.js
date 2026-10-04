export function playtimeEntries(playtime) {
  return [['pc', 'PC'], ['mobile', 'Mobile']].flatMap(([key, label]) => {
    const value = playtime?.[key];
    if (typeof value === 'string' && value.trim()) return [[key, label, value.trim()]];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return [[key, label, `${new Intl.NumberFormat('en-GB').format(value)} ${value === 1 ? 'hour' : 'hours'}`]];
    }
    return [];
  });
}

export function renderPlaytime(root, playtime) {
  const icons = {
    pc: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5"/>',
    mobile: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  };
  const rows = playtimeEntries(playtime).map(([key, label, text]) => {
    const row = document.createElement('div');
    row.className = 'game-playtime-row';
    row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = text;
    row.append(term, detail);
    return row;
  });
  root.querySelector('dl').replaceChildren(...rows);
  root.hidden = !rows.length;
}
