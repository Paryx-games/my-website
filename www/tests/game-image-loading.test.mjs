import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createImageLoader } from '../public/assets/games/load-image.js';

function harness() {
  const classes = new Set();
  const attributes = new Map();
  const element = {
    src: 'previous-game.webp',
    classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
    removeAttribute: () => { element.src = ''; },
    setAttribute: (name, value) => attributes.set(name, value),
  };
  const pending = [];
  const load = createImageLoader(() => ({
    decode() {
      return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    },
  }));
  return { element, classes, attributes, pending, load };
}

test('switching pictures clears old artwork immediately and ignores late responses', async () => {
  const { element, classes, attributes, pending, load } = harness();
  const first = load(element, 'first.webp');
  assert.equal(element.src, '');
  assert.ok(classes.has('is-loading'));
  const second = load(element, 'second.webp');
  pending[0].resolve();
  await first;
  assert.equal(element.src, '');
  assert.equal(attributes.get('aria-busy'), 'true');
  pending[1].resolve();
  await second;
  assert.equal(element.src, 'second.webp');
  assert.ok(!classes.has('is-loading'));
  assert.equal(attributes.get('aria-busy'), 'false');
});

test('a late image failure cannot overwrite a newer successful picture', async () => {
  const { element, classes, pending, load } = harness();
  const old = load(element, 'old.webp');
  const current = load(element, 'current.webp');
  pending[1].resolve();
  await current;
  pending[0].reject(new Error('old request failed'));
  await old;
  assert.equal(element.src, 'current.webp');
  assert.ok(!classes.has('is-error'));
});

test('failed loading leaves a placeholder rather than showing the previous game', async () => {
  const { element, classes, attributes, pending, load } = harness();
  const request = load(element, 'unavailable.webp');
  pending[0].reject(new Error('unavailable'));
  await request;
  assert.equal(element.src, '');
  assert.ok(classes.has('is-error'));
  assert.ok(!classes.has('is-loading'));
  assert.equal(attributes.get('aria-busy'), 'false');
});
