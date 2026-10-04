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
  const creator = document.createElement('a');
  creator.href = data.creatorType === 'Group'
    ? `https://www.roblox.com/communities/${data.creatorId}`
    : `https://www.roblox.com/users/${data.creatorId}/profile`;
  creator.target = '_blank';
  creator.rel = 'noopener noreferrer';
  creator.textContent = `View ${data.creatorVerified ? 'verified ' : ''}creator on Roblox ↗`;
  const note = document.createElement('p');
  note.className = 'game-roblox-snapshot';
  note.textContent = `Stats fetched ${date(data.checked)}. Counts may have changed.`;
  root.append(heading, list, creator, note);
}
