import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = await readFile(
  new URL("../public/assets/navigation.js", import.meta.url),
  "utf8",
);
function harness(origin = "https://paryx.uk/") {
  const events = new Map();
  const timers = new Map();
  const root = { dataset: {} };
  let timer = 0;
  class Element {
    constructor(link) {
      this.link = link;
    }
    closest() {
      return this.link;
    }
  }
  const listen = (name, handler) => events.set(name, handler);
  runInNewContext(source, {
    document: {
      documentElement: root,
      readyState: "loading",
      addEventListener: listen,
    },
    window: { addEventListener: listen },
    location: new URL(origin),
    URL,
    Element,
    setTimeout(handler) {
      timers.set(++timer, handler);
      return timer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  function click(href, event = {}, link = {}) {
    events.get("click")({
      button: 0,
      target: new Element({
        href,
        target: "",
        hasAttribute: () => false,
        ...link,
      }),
      ...event,
    });
  }
  function reset() {
    events.get("pageshow")({ persisted: true });
  }
  return { root, events, timers, click, reset };
}

test("all independent deployments ship identical navigation assets", async () => {
  for (const file of ["navigation.js", "navigation.css", "site-search.js", "site-search.css"]) {
    const main = await readFile(
      new URL(`../public/assets/${file}`, import.meta.url),
      "utf8",
    );
    for (const project of ["dev", "blog"])
      assert.equal(
        await readFile(
          new URL(`../../${project}/public/assets/${file}`, import.meta.url),
          "utf8",
        ),
        main,
      );
  }
});

test("document loading completes and history restoration clears the bar", () => {
  const { root, events, timers, reset } = harness();
  assert.equal(root.dataset.navigationState, "loading");
  events.get("load")();
  assert.equal(root.dataset.navigationState, "finishing");
  [...timers.values()][0]();
  assert.equal(root.dataset.navigationState, undefined);
  reset();
  assert.equal(timers.size, 0);
});

test("cross-domain and internal document navigation starts the bar", () => {
  for (const origin of ["https://paryx.uk/", "https://blog.paryx.uk/"]) {
    const { click, reset, root } = harness(origin);
    for (const href of [
      "https://paryx.uk/privacy-policy",
      "https://blog.paryx.uk/an-article",
      "https://dev.paryx.uk/",
    ]) {
      reset();
      click(href);
      assert.equal(root.dataset.navigationState, "loading", href);
    }
  }
});

test("anchors, external sites, modified clicks, downloads and new tabs retain native behaviour", () => {
  const { click, reset, root } = harness();
  const scenarios = [
    ["https://paryx.uk/#projects"],
    ["https://paryx.uk/"],
    ["https://github.com/Paryx-games"],
    ["mailto:hello@paryx.uk"],
    ["https://blog.paryx.uk/", { ctrlKey: true }],
    ["https://blog.paryx.uk/", { metaKey: true }],
    ["https://blog.paryx.uk/", { shiftKey: true }],
    ["https://blog.paryx.uk/", { altKey: true }],
    ["https://blog.paryx.uk/", { button: 1 }],
    ["https://blog.paryx.uk/", { defaultPrevented: true }],
    ["https://blog.paryx.uk/", {}, { target: "_blank" }],
    ["https://blog.paryx.uk/", {}, { hasAttribute: () => true }],
  ];
  for (const [href, event, link] of scenarios) {
    reset();
    click(href, event, link);
    assert.equal(root.dataset.navigationState, undefined, href);
  }
});

test("cancelled navigation recovers and pagehide clears pending timers", () => {
  const { root, timers, click, reset, events } = harness();
  reset();
  click("https://blog.paryx.uk/");
  [...timers.values()][0]();
  assert.equal(root.dataset.navigationState, "finishing");
  events.get("pagehide")();
  assert.equal(root.dataset.navigationState, undefined);
  assert.equal(timers.size, 0);
});
