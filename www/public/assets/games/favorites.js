export function favoriteBadgeElement(compact = false) {
  const badge = document.createElement('span');
  badge.className = `game-favorite${compact ? ' game-favorite-compact' : ''}`;
  badge.title = 'One of my favorite games';
  badge.setAttribute('aria-label', badge.title);
  const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  star.setAttribute('viewBox', '0 0 24 24');
  star.setAttribute('fill', 'currentColor');
  star.setAttribute('aria-hidden', 'true');
  star.innerHTML = '<path d="M12 2.5 14.9 8.4 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.4Z"/>';
  badge.append(star);
  if (!compact) badge.append('Favorite game');
  return badge;
}

export function robloxBadgeElement() {
  const badge = document.createElement('span');
  badge.className = 'game-roblox-badge';
  badge.title = 'This is a Roblox game';
  badge.setAttribute('aria-label', badge.title);
  const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  logo.setAttribute('viewBox', '0 0 24 24');
  logo.setAttribute('fill', 'currentColor');
  logo.setAttribute('aria-hidden', 'true');
  logo.innerHTML = '<path fill-rule="evenodd" d="M5.3 0 0 18.7 18.7 24 24 5.3 5.3 0Zm5.2 8.6 5.3 1.5-1.5 5.3L9 13.9l1.5-5.3Z" clip-rule="evenodd"/>';
  badge.append(logo);
  return badge;
}
