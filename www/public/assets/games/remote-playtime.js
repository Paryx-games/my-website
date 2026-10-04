export function mergeRemotePlaytime(details, response, knownIds) {
  if (response?.version !== 1 || !response.games || typeof response.games !== 'object' || Array.isArray(response.games)) return false;
  let changed = false;
  for (const id of knownIds) {
    const minutes = response.games[id]?.pc;
    if (!Number.isSafeInteger(minutes) || minutes < 0) continue;
    details[id] = { ...details[id], playtime: { ...details[id]?.playtime, pc: minutes } };
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
