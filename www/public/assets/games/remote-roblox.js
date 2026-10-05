export function mergeRobloxStats(games, response) {
  if (response?.version !== 1 || !Number.isFinite(Date.parse(response.fetchedAt)) || !response.games) return false;
  let changed = false;
  for (const game of games) {
    const stats = response.games[game.id];
    if (!stats || stats.universeId !== game.roblox.universeId || stats.checked !== response.fetchedAt) continue;
    if (!['playing', 'visits', 'favorites', 'maxPlayers', 'upVotes', 'downVotes', 'badgeCount', 'creatorId', 'placeId'].every(key => Number.isSafeInteger(stats[key]) && stats[key] >= 0)) continue;
    if (!['User', 'Group'].includes(stats.creatorType) || typeof stats.creatorVerified !== 'boolean' || typeof stats.creatorName !== 'string' || !stats.creatorName || typeof stats.avatarType !== 'string') continue;
    if (![stats.created, stats.updated].every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) continue;
    if (stats.price !== null && (!Number.isSafeInteger(stats.price) || stats.price < 0)) continue;
    game.roblox = { ...game.roblox, ...stats };
    game.developer = stats.creatorName;
    changed = true;
  }
  return changed;
}

export async function fetchRobloxStats(fetcher = fetch) {
  try {
    const response = await fetcher('https://api.paryx.uk/roblox/stats', { signal: AbortSignal.timeout(25_000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
