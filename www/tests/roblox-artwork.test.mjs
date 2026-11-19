import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createRobloxArtworkHandler,
  fetchRobloxArtwork as fetchRobloxArtworkFromRoblox,
} from "../api/roblox-artwork.js";
import { robloxGames } from "../public/assets/games/roblox-games.js";
import {
  fetchRobloxArtwork,
  mergeRobloxArtwork,
} from "../public/assets/games/remote-roblox-artwork.js";

const fetchedAt = "2026-11-19T00:00:00.000Z";
const urlFor = (id) => `https://tr.rbxcdn.com/artwork/${id}`;
const artworkResponse = () => ({
  version: 1,
  fetchedAt,
  games: Object.fromEntries(
    robloxGames.map((game) => [
      game.id,
      {
        universeId: game.roblox.universeId,
        icon: urlFor(`${game.id}-icon`),
        thumbnails: [urlFor(`${game.id}-thumbnail`)],
      },
    ]),
  ),
});

function createResponse() {
  const output = { status: 0, headers: {}, body: null };
  return {
    output,
    res: {
      status(value) {
        output.status = value;
      },
      setHeader(key, value) {
        output.headers[key] = value;
      },
      send(value) {
        output.body = JSON.parse(value);
      },
    },
  };
}

test("daily artwork fetch returns only completed Roblox icons and gallery thumbnails", async () => {
  const calls = [];
  const request = async (input) => {
    const url = new URL(input);
    calls.push(url);
    if (url.pathname.endsWith("/games/icons")) {
      return Response.json({
        data: robloxGames.map((game) => ({
          targetId: game.roblox.universeId,
          state: "Completed",
          imageUrl: urlFor(`${game.id}-icon`),
        })),
      });
    }
    const universeId = Number(url.pathname.split("/")[3]);
    if (url.pathname.endsWith("/media")) {
      return Response.json({
        data: [
          {
            assetType: "Image",
            approved: true,
            imageId: universeId + 1,
          },
        ],
      });
    }
    if (url.pathname.endsWith("/thumbnails")) {
      return Response.json({
        data: url.searchParams.get("thumbnailIds").split(",").map((id) => ({
          state: "Completed",
          imageUrl: urlFor(`${universeId}-${id}`),
        })),
      });
    }
    throw new Error(`Unexpected Roblox request: ${url}`);
  };
  const snapshot = await fetchRobloxArtworkFromRoblox(request, () => new Date(fetchedAt));
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.fetchedAt, fetchedAt);
  assert.deepEqual(Object.keys(snapshot.games), robloxGames.map((game) => game.id));
  assert.equal(calls.filter((url) => url.pathname.endsWith("/media")).length, robloxGames.length);
  assert.equal(calls.filter((url) => url.pathname.endsWith("/thumbnails")).length, robloxGames.length);
  assert.ok(calls.every((url) => url.hostname === "games.roblox.com" || url.hostname === "thumbnails.roblox.com"));
});

test("artwork endpoint caches successful daily snapshots and rejects invalid requests", async () => {
  let loads = 0;
  const handler = createRobloxArtworkHandler({
    load: async () => {
      loads++;
      return artworkResponse();
    },
  });
  const success = createResponse();
  await handler({ method: "GET", url: "/api/roblox-artwork" }, success.res);
  assert.equal(success.output.status, 200);
  assert.equal(success.output.headers["Cache-Control"], "public, s-maxage=82800");
  assert.equal(success.output.body.version, 1);

  const invalidQuery = createResponse();
  await handler({ method: "GET", url: "/api/roblox-artwork?refresh=1" }, invalidQuery.res);
  assert.equal(invalidQuery.output.status, 400);

  const methodNotAllowed = createResponse();
  await handler({ method: "POST", url: "/api/roblox-artwork" }, methodNotAllowed.res);
  assert.equal(methodNotAllowed.output.status, 405);
  assert.equal(methodNotAllowed.output.headers.Allow, "GET");
  assert.equal(loads, 1);
});

test("runtime artwork updates only Roblox icons and thumbnails and validates the whole snapshot", () => {
  const games = structuredClone(robloxGames);
  const firstGame = games[0];
  const oldTitleArtwork = firstGame.titleArtwork;
  const iconTitleArtworkGame = games.find(
    (game) => game.titleArtwork === game.icon || game.titleArtwork === game.cover,
  );
  const iconTitleArtwork = iconTitleArtworkGame.titleArtwork;
  const oldDescription = firstGame.description;
  const response = artworkResponse();
  assert.equal(mergeRobloxArtwork(games, response), true);
  assert.equal(firstGame.cover, response.games[firstGame.id].icon);
  assert.equal(firstGame.icon, response.games[firstGame.id].icon);
  assert.equal(firstGame.backdrop, response.games[firstGame.id].thumbnails[0]);
  assert.deepEqual(firstGame.pictures, response.games[firstGame.id].thumbnails);
  assert.equal(firstGame.titleArtwork, oldTitleArtwork);
  assert.equal(firstGame.description, oldDescription);
  assert.equal(
    iconTitleArtworkGame.titleArtwork,
    response.games[iconTitleArtworkGame.id].icon,
  );
  assert.notEqual(iconTitleArtworkGame.titleArtwork, iconTitleArtwork);

  const unchanged = structuredClone(robloxGames);
  const invalidResponse = artworkResponse();
  invalidResponse.games[unchanged[0].id].icon = "https://example.com/image.png";
  assert.equal(mergeRobloxArtwork(unchanged, invalidResponse), false);
  assert.deepEqual(unchanged, robloxGames);
});

test("browser fetch retains bundled artwork when the runtime endpoint is unavailable", async () => {
  assert.equal(await fetchRobloxArtwork(async () => new Response("", { status: 503 })), null);
});
