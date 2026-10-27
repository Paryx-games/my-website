import { robloxGames } from './roblox-games.js';

export function mergeRemotePlaytime(details, response, knownIds) {
  if (![1, 2].includes(response?.version) || !response.games || typeof response.games !== 'object' || Array.isArray(response.games)) return false;
  let changed = false;
  for (const id of knownIds) {
    const universe = robloxGames.find(game => game.id === id)?.roblox.universeId;
    const remote = response.games[id] ?? (universe ? response.games[`roblox-${universe}`] : undefined);
    const minutes = remote?.pc;
    if (!Number.isSafeInteger(minutes) || minutes < 0) continue;
    const totalMinutes = minutes + (response.version === 1 && id === 'minecraft' ? 30_000 : 0);
    if (!Number.isSafeInteger(totalMinutes)) continue;
    const increase = remote?.pcIncrease24hMinutes;
    const lastPlayedAt = remote?.lastPlayedAt;
    details[id] = {
      ...details[id],
      playtime: {
        ...details[id]?.playtime,
        ...Object.fromEntries(['mobile', 'console'].filter(platform => Number.isSafeInteger(remote[platform]) && remote[platform] >= 0).map(platform => [platform, remote[platform]])),
        pc: totalMinutes,
        pcIncrease24hMinutes: Number.isSafeInteger(increase) && increase > 0 ? increase : null,
        ...(typeof lastPlayedAt === 'string' && !Number.isNaN(Date.parse(lastPlayedAt)) ? { lastPlayedAt } : {}),
      },
    };
    if (id === 'roblox') {
      const listedMinutes = robloxGames.reduce((sum, game) => {
        const remoteGame = response.games[game.id] ?? response.games[`roblox-${game.roblox.universeId}`];
        return Number.isSafeInteger(remoteGame?.pc) && remoteGame.pc >= 0 ? sum + remoteGame.pc : sum;
      }, 0);
      if (Number.isSafeInteger(remote.pc) && remote.pc >= listedMinutes) {
        details[id].playtime.listedPcMinutes = listedMinutes;
        details[id].playtime.unlistedPcMinutes = remote.pc - listedMinutes;
      }
    }
    changed = true;
  }
  return changed;
}

export async function fetchRemotePlaytime(fetcher = fetch) {
  try {
    const response = await fetcher('https://api.paryx.uk/playtime', { signal: AbortSignal.timeout(5000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
