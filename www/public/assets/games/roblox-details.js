export function creatorDetailElement(game) {
  const data = game.roblox;
  const creatorDetail = document.createElement('dd');
  const creatorName = document.createElement('span');
  creatorName.textContent = data.creatorName || game.developer;
  const creator = document.createElement('a');
  creator.className = 'game-creator-link';
  creator.href = data.creatorType === 'Group'
    ? `https://www.roblox.com/communities/${data.creatorId}`
    : `https://www.roblox.com/users/${data.creatorId}/profile`;
  creator.target = '_blank';
  creator.rel = 'noopener noreferrer';
  const label = `View ${data.creatorVerified ? 'verified ' : ''}creator ${creatorName.textContent} on Roblox`;
  creator.setAttribute('aria-label', label);
  creator.title = label;
  creator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>';
  creatorDetail.append(creatorName, creator);
  return creatorDetail;
}

export function renderRobloxDetails(root, game) {
  root.replaceChildren();
  root.hidden = !game.roblox;
  if (!game.roblox) return;
  const data = game.roblox;
  const heading = document.createElement('h3');
  heading.textContent = 'Roblox details';
  const list = document.createElement('dl');
  const number = value => new Intl.NumberFormat('en-GB').format(value);
  const date = value => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  const totalVotes = data.upVotes + data.downVotes;
  for (const [label, value] of [
    ['Created', date(data.created)], ['Updated', date(data.updated)],
    ['Playing', number(data.playing)], ['Visits', number(data.visits)],
    ['Favorites', number(data.favorites)], ['Server size', `${data.maxPlayers} players`],
    ['Approval', totalVotes ? `${(data.upVotes / totalVotes * 100).toFixed(1)}%` : 'Not rated'],
    ['Votes', `${number(data.upVotes)} likes · ${number(data.downVotes)} dislikes`],
    ['Badges', number(data.badgeCount)], ['Access', data.price ? `${data.price} Robux` : 'Free'],
    ['Avatar', data.avatarType.replace('MorphTo', '')],
  ]) {
    const row = document.createElement('div');
    if (label === 'Votes') row.className = 'game-roblox-stat-votes';
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    row.append(term, detail);
    list.append(row);
  }
  const note = document.createElement('details');
  note.className = 'game-roblox-snapshot';
  const summary = document.createElement('summary');
  const timestamp = document.createElement('time');
  timestamp.dateTime = data.checked;
  timestamp.dataset.relativeTime = '';
  const expandedTimestamp = document.createElement('time');
  expandedTimestamp.dateTime = data.checked;
  expandedTimestamp.textContent = `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Europe/London' }).format(new Date(data.checked))} at ${new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(data.checked))} (UK time)`;
  summary.append('Stats fetched ', timestamp, '. Counts may have changed.');
  note.append(summary, expandedTimestamp);
  root.append(heading, list, note);
  updateRobloxStatsAge(root);
}

export function updateRobloxStatsAge(root, now = Date.now()) {
  const timestamp = root?.querySelector('[data-relative-time]');
  if (!timestamp) return;
  const fetchedAt = Date.parse(timestamp.dateTime);
  if (!Number.isFinite(fetchedAt)) return;
  const seconds = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const relative = days ? `${days} day${days === 1 ? '' : 's'} ago`
    : hours ? `${hours} hour${hours === 1 ? '' : 's'} ago`
      : minutes ? `${minutes} minute${minutes === 1 ? '' : 's'} ago`
        : `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  timestamp.textContent = relative;
}
