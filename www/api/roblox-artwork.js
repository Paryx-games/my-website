import { robloxGames } from "../public/assets/games/roblox-games.js";
import { captureApiException, withSentry } from "./sentry.js";

const cacheControl = "public, s-maxage=82800";
const isRobloxCdnUrl = (value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "rbxcdn.com" || url.hostname.endsWith(".rbxcdn.com"))
    );
  } catch {
    return false;
  }
};

async function requestJson(fetcher, url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after")) * 1000;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(Math.max(retryAfter || 500, 250), 3000)),
      );
      continue;
    }
    if (!response.ok)
      throw new Error(`Roblox artwork request failed with HTTP ${response.status}`);
    return response.json();
  }
  throw new Error("Roblox rate limited the artwork request");
}

async function fetchThumbnails(game, fetcher) {
  const media = await requestJson(
    fetcher,
    `https://games.roblox.com/v2/games/${game.roblox.universeId}/media`,
  );
  if (!Array.isArray(media.data))
    throw new Error(`Invalid Roblox media response for ${game.id}`);
  const thumbnailIds = [
    ...new Set(
      media.data
        .filter(
          (item) =>
            item.assetType === "Image" &&
            item.approved &&
            Number.isSafeInteger(item.imageId),
        )
        .map((item) => item.imageId),
    ),
  ].slice(0, 10);
  if (!thumbnailIds.length)
    throw new Error(`Roblox returned no approved thumbnails for ${game.id}`);

  const thumbnails = await requestJson(
    fetcher,
    `https://thumbnails.roblox.com/v1/games/${game.roblox.universeId}/thumbnails?thumbnailIds=${thumbnailIds.join(",")}&size=768x432&format=Png&isCircular=false`,
  );
  if (!Array.isArray(thumbnails.data))
    throw new Error(`Invalid Roblox thumbnails response for ${game.id}`);
  const urls = thumbnails.data
    .filter(
      (item) =>
        item.state === "Completed" && isRobloxCdnUrl(item.imageUrl),
    )
    .map((item) => item.imageUrl);
  if (!urls.length)
    throw new Error(`Roblox returned no completed thumbnails for ${game.id}`);
  return urls;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await mapper(items[index]);
      }
    }),
  );
  return results;
}

export async function fetchRobloxArtwork(fetcher = fetch, now = () => new Date()) {
  if (!robloxGames.length) throw new Error("No Roblox games are configured");
  const universeIds = robloxGames.map((game) => game.roblox.universeId);
  const [icons, thumbnails] = await Promise.all([
    requestJson(
      fetcher,
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`,
    ),
    mapWithConcurrency(robloxGames, 4, (game) =>
      fetchThumbnails(game, fetcher),
    ),
  ]);
  if (!Array.isArray(icons.data))
    throw new Error("Invalid Roblox game icons response");
  const iconsByUniverse = new Map(
    icons.data
      .filter(
        (item) =>
          item.state === "Completed" &&
          isRobloxCdnUrl(item.imageUrl),
      )
      .map((item) => [item.targetId, item.imageUrl]),
  );
  const games = Object.fromEntries(
    robloxGames.map((game, index) => {
      const icon = iconsByUniverse.get(game.roblox.universeId);
      if (!icon)
        throw new Error(`Roblox returned no completed icon for ${game.id}`);
      return [
        game.id,
        {
          universeId: game.roblox.universeId,
          icon,
          thumbnails: thumbnails[index],
        },
      ];
    }),
  );
  return { version: 1, fetchedAt: now().toISOString(), games };
}

export function createRobloxArtworkHandler({ load = fetchRobloxArtwork } = {}) {
  return async (req, res) => {
    const send = (status, data, cache = "no-store") => {
      res.status(status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", cache);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(JSON.stringify(data));
    };
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(405, { error: "Method not allowed" });
    }
    if (new URL(req.url || "/", "https://paryx.uk").search)
      return send(400, { error: "Invalid query" });
    try {
      return send(200, await load(), cacheControl);
    } catch (error) {
      await captureApiException(error, "/api/roblox-artwork");
      return send(502, { error: "Roblox artwork is temporarily unavailable" });
    }
  };
}

export default withSentry(
  createRobloxArtworkHandler(),
  "/api/roblox-artwork",
);
