import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const start = html.indexOf("    const isCodingActivity =");
const end = html.indexOf("    const averageActivityColor =", start);
const { type, card } = runInNewContext(
  `${html.slice(start, end)}\n({ type: discordActivityType, card: discordActivityCard });`,
  {
    esc: (value) =>
      String(value).replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      ),
  },
);

test("VS Code names from presence providers display as coding with a code icon and coding timer", () => {
  for (const name of [
    "Visual Studio Code",
    "VS Code",
    "vscode",
    "VSCode Insiders",
    "Visual Studio Code - Insiders",
  ]) {
    const activity = Object.freeze({
      name,
      type: 0,
      details: "Editing index.ts",
      state: "my-website",
      timestamps: { start: Date.now() - 60000 },
    });
    assert.equal(type(activity), "Coding");
    const rendered = card(activity);
    assert.ok(rendered.includes(" is-coding"));
    assert.ok(rendered.includes("--activity-accent:#8b8b95"));
    assert.ok(!rendered.includes("#6ca5d9"));
    assert.ok(rendered.includes(">Coding</span>"));
    assert.ok(rendered.includes(">Coding time</span>"));
    assert.ok(rendered.includes("Editing index.ts"));
    assert.ok(rendered.includes("my-website"));
    assert.ok(!rendered.includes(">Playing</span>"));
    assert.ok(!rendered.includes("M8 9h8a5"));
    assert.equal(activity.type, 0);
  }
});

test("games and Spotify keep their own presentation and activity text remains escaped", () => {
  assert.equal(type({ name: "Roblox", type: 0 }), "Playing");
  assert.equal(type({ name: "A game about VS Code", type: 0 }), "Playing");
  const game = card({
    name: "Roblox",
    type: 0,
    timestamps: { start: Date.now() - 1000 },
  });
  assert.ok(game.includes(">Playing time</span>"));
  assert.ok(!game.includes(" is-coding"));
  const music = card(
    { name: "Spotify", type: 2 },
    { song: "A song", artist: "An artist" },
  );
  assert.ok(music.includes("Listening to Spotify"));
  assert.ok(music.includes("A song"));
  assert.ok(!music.includes(" is-coding"));
  const code = card({
    name: "VSCode",
    type: "playing",
    details: "<script>alert(1)</script>",
  });
  assert.ok(code.includes("&lt;script&gt;"));
  assert.ok(!code.includes("<script>"));
});
