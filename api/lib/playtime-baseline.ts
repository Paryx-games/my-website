import type { PublicPlaytime } from './playtime.js';

export type Baseline = { game_id: string; pc: number; mobile: number | null; console: number | null; universe_id: string | null };
export type Total = { game_id: string; source: string; minutes: string; baseline_minutes: string | null; updated_at: string };
export type RobloxGameMetadata = { universe_id: string; name: string; place_ids: string[] };

// This estimate used to be applied by the browser. Lifetime launcher totals already include the backup's other minutes.
const MINECRAFT_LAUNCHER_MINUTES = 30_000;

export function composePlaytime(baselines: Baseline[], totals: Total[], robloxMetadata: RobloxGameMetadata[] = []): PublicPlaytime {
  const data: PublicPlaytime = { version: 2, updatedAt: null, games: {}, robloxGames: {} };
  data.robloxGames = Object.fromEntries(robloxMetadata.map(game => [
    game.universe_id,
    { universeId: game.universe_id, name: game.name, placeIds: game.place_ids },
  ]));
  const baselineById = new Map(baselines.map(row => [row.game_id, row]));
  const universeGames = new Map(baselines.filter(row => row.universe_id).map(row => [String(row.universe_id), row.game_id]));
  const groups = new Map<string, Total[]>();
  for (const row of totals) {
    const id = row.source === 'roblox' ? universeGames.get(row.game_id) ?? `roblox-${row.game_id}` : row.game_id;
    groups.set(id, [...groups.get(id) ?? [], row]);
    const updatedAt = new Date(row.updated_at).toISOString();
    if (!data.updatedAt || updatedAt > data.updatedAt) data.updatedAt = updatedAt;
  }
  for (const id of new Set([...baselineById.keys(), ...groups.keys()])) {
    const baseline = baselineById.get(id);
    const rows = groups.get(id) ?? [];
    const calculate = (historical: boolean) => {
      let absolute = 0;
      let tracked = 0;
      for (const row of rows) {
        const minutes = Number(historical ? row.baseline_minutes ?? 0 : row.minutes);
        if (row.source === 'roblox') tracked += minutes;
        else absolute += minutes;
      }
      if (id === 'minecraft' && rows.some(row => row.source === 'modrinth')) absolute += MINECRAFT_LAUNCHER_MINUTES;
      return Math.max(Number(baseline?.pc ?? 0), absolute) + tracked;
    };
    const game: PublicPlaytime['games'][string] = { pc: calculate(false) };
    if (baseline?.mobile != null) game.mobile = Number(baseline.mobile);
    if (baseline?.console != null) game.console = Number(baseline.console);
    // Roblox counters start at zero when tracking begins, so a missing older snapshot is a known zero.
    if (rows.length && rows.every(row => row.baseline_minutes !== null || row.source === 'roblox')) {
      const increase = game.pc - calculate(true);
      if (increase > 0) game.pcIncrease24hMinutes = increase;
    }
    data.games[id] = game;
  }
  const robloxIds = new Set([
    ...universeGames.values(),
    ...[...groups.keys()].filter(id => id.startsWith('roblox-')),
    ...(baselineById.has('roblox') ? ['roblox'] : []),
  ]);
  if (robloxIds.size) {
    const platformTotal = (platform: 'pc' | 'mobile' | 'console') => [...robloxIds].reduce((sum, id) => sum + (data.games[id]?.[platform] ?? 0), 0);
    const hasPlatformTotal = (platform: 'mobile' | 'console') => [...robloxIds].some(id => data.games[id]?.[platform] != null);
    data.games.roblox = { ...data.games.roblox, pc: platformTotal('pc') };
    for (const platform of ['mobile', 'console'] as const) {
      if (hasPlatformTotal(platform)) data.games.roblox[platform] = platformTotal(platform);
    }
    const increase = [...robloxIds].reduce((sum, id) => sum + (data.games[id]?.pcIncrease24hMinutes ?? 0), 0);
    if (increase > 0) data.games.roblox.pcIncrease24hMinutes = increase;
  }
  return data;
}
