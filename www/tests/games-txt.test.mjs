import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateGamesText } from "../scripts/games-txt.mjs";

test("public games.txt mirrors the game catalogue", async () => {
  const gamesText = await readFile(new URL("../public/games.txt", import.meta.url), "utf8");

  assert.equal(gamesText, generateGamesText());
  assert.match(gamesText, /Favorite games\n--\n/);
  assert.match(gamesText, /Games in rotation\n--\n/);
  assert.match(gamesText, /Roblox games\n--\n/);
  assert.match(gamesText, /Pressure \[ROBLOX\]/);
  assert.match(gamesText, /Industrialist \[ROBLOX\]/);
});
