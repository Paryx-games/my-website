import assert from "node:assert/strict";
import { test } from "node:test";
import {
  matches,
  shortcuts,
  readHistory,
  remember,
  clearHistory,
} from "../public/assets/site-search.js";

function storage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}

test("site-wide matching covers shortcuts and published article content, tags and authors", () => {
  assert.ok(
    matches(
      shortcuts.find((page) => page.title === "Projects"),
      "roblox rust",
    ),
  );
  assert.ok(
    matches(
      {
        title: "Welcome",
        description: "Hello",
        text: "An idempotency example",
        tags: ["Rust"],
        authors: ["paryx"],
      },
      "IDEMPOTENCY rust paryx",
    ),
  );
  assert.ok(!matches(shortcuts[0], "a nonexistent page"));
});

test("history is trimmed, deduplicated, capped, and can be cleared", () => {
  const local = storage();
  for (const query of [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    " SECOND ",
  ])
    remember(local, query);
  assert.deepEqual(readHistory(local), [
    "SECOND",
    "sixth",
    "fifth",
    "fourth",
    "third",
  ]);
  remember(local, " ");
  assert.equal(readHistory(local).length, 5);
  clearHistory(local);
  assert.deepEqual(readHistory(local), []);
});

test("unavailable or malformed browser storage does not break search", () => {
  const blocked = {
    getItem() {
      throw new Error("Blocked");
    },
    setItem() {
      throw new Error("Blocked");
    },
    removeItem() {
      throw new Error("Blocked");
    },
  };
  assert.deepEqual(readHistory(blocked), []);
  assert.doesNotThrow(() => remember(blocked, "Projects"));
  assert.doesNotThrow(() => clearHistory(blocked));
  const local = storage();
  local.setItem(
    "paryx-search-history-v1",
    JSON.stringify([null, 2, {}, "valid", "x".repeat(90)]),
  );
  assert.deepEqual(readHistory(local), ["valid"]);
});
