// Roughly the playtime from the Minecraft Launcher; this estimate is not completely accurate.
const MINECRAFT_LAUNCHER_MINUTES = 30_000;

export function mergeRemotePlaytime(details, response, knownIds) {
  if (response?.version !== 1 || !response.games || typeof response.games !== 'object' || Array.isArray(response.games)) return false;
  let changed = false;
  for (const id of knownIds) {
    const minutes = response.games[id]?.pc;
    if (!Number.isSafeInteger(minutes) || minutes < 0) continue;
    const totalMinutes = minutes + (id === 'minecraft' ? MINECRAFT_LAUNCHER_MINUTES : 0);
    if (!Number.isSafeInteger(totalMinutes)) continue;
    details[id] = { ...details[id], playtime: { ...details[id]?.playtime, pc: totalMinutes } };
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
