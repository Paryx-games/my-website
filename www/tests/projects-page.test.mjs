import assert from "node:assert/strict";
import { test } from "node:test";
import { githubUrl } from "../public/assets/projects-page.js";
import { classifyChange, historyEntries, mergeHistory } from "../public/assets/changelog.js";

test("GitHub links reject executable and lookalike host URLs", () => {
  assert.equal(githubUrl("javascript:alert(1)"), null);
  assert.equal(githubUrl("https://github.com.evil.test/p/a"), null);
  assert.equal(githubUrl("http://github.com/p/a"), null);
  assert.equal(githubUrl("https://github.com/Paryx-games/roblox-manager"), "https://github.com/Paryx-games/roblox-manager");
});

test("changelog classification recognises conventional features and breaking changes", () => {
  assert.deepEqual(classifyChange({ title: "feat(accounts): add import" }, "commit"), { feature: true, breaking: false });
  assert.deepEqual(classifyChange({ title: "feat(api)!: change contract" }, "commit"), { feature: true, breaking: true });
  assert.equal(classifyChange({ title: "refactor(storage): revise keys", body: "BREAKING CHANGE: previous keys are removed" }, "commit").breaking, true);
  assert.equal(classifyChange({ name: "v2.0.0", body: "## Breaking changes\nAn API changed" }, "release").breaking, true);
  assert.equal(classifyChange({ name: "v2.1.0", body: "## Features\nNew import" }, "release").feature, true);
  assert.deepEqual(classifyChange({ title: "fix: stop request failure" }, "commit"), { feature: false, breaking: false });
});

test("older history appends without losing existing releases or duplicating commits", () => {
  const existing = [{ id: "a", title: "old" }];
  assert.deepEqual(mergeHistory(existing, [{ id: "a", title: "updated" }, { id: "b" }]), [{ id: "a", title: "updated" }, { id: "b" }]);
  const project = { releases: [{ id: "a", name: "v1", date: "2026-10-17T10:00:00Z" }], commits: [{ id: "a", title: "feat: earlier", date: "2026-10-16T10:00:00Z" }, { id: "b", title: "fix: latest", date: "2026-10-17T11:00:00Z" }] };
  assert.deepEqual(historyEntries(project).map(item => [item.kind, item.title]), [["commit", "fix: latest"], ["release", "v1"], ["commit", "feat: earlier"]]);
  assert.equal(historyEntries(project).length, 3);
});
