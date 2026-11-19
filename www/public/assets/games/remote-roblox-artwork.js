function isRobloxCdnUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "rbxcdn.com" || url.hostname.endsWith(".rbxcdn.com"))
    );
  } catch {
    return false;
  }
}

export function mergeRobloxArtwork(games, response) {
  if (
    response?.version !== 1 ||
    !Number.isFinite(Date.parse(response.fetchedAt)) ||
    !response.games ||
    Object.keys(response.games).length !== games.length
  )
    return false;

  const updates = [];
  for (const game of games) {
    const artwork = response.games[game.id];
    if (
      !artwork ||
      artwork.universeId !== game.roblox.universeId ||
      !isRobloxCdnUrl(artwork.icon) ||
      !Array.isArray(artwork.thumbnails) ||
      artwork.thumbnails.length < 1 ||
      artwork.thumbnails.length > 10 ||
      !artwork.thumbnails.every(isRobloxCdnUrl)
    )
      return false;
    updates.push({
      game,
      icon: artwork.icon,
      thumbnails: artwork.thumbnails,
      titleArtworkIsIcon:
        game.titleArtwork === game.icon || game.titleArtwork === game.cover,
    });
  }

  for (const { game, icon, thumbnails, titleArtworkIsIcon } of updates) {
    game.cover = icon;
    game.icon = icon;
    if (titleArtworkIsIcon) game.titleArtwork = icon;
    game.backdrop = thumbnails[0];
    game.pictures = thumbnails;
    game.captions = thumbnails.map(
      (_, index) => `${game.title} - official Roblox thumbnail ${index + 1}`,
    );
  }
  return true;
}

export async function fetchRobloxArtwork(fetcher = fetch) {
  try {
    const response = await fetcher("/api/roblox-artwork", {
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      console.warn(
        `Roblox artwork refresh failed with HTTP ${response.status}; bundled artwork remains in use.`,
      );
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(
      "Roblox artwork refresh failed; bundled artwork remains in use.",
      error,
    );
    return null;
  }
}
