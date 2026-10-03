import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Callout } from '../src/components.js';

test('all five callout components have matching labels and decorative icons', () => {
  for (const type of [
    'note',
    'tip',
    'important',
    'warning',
    'caution',
  ] as const) {
    const html = renderToStaticMarkup(
      createElement(Callout, { type, children: 'Advice' }),
    );
    assert.ok(html.includes(`callout-${type}`));
    assert.ok(
      html.includes(`aria-label="${type[0].toUpperCase() + type.slice(1)}"`),
    );
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(!html.includes('Worth knowing'));
  }
  assert.ok(
    renderToStaticMarkup(
      createElement(Callout, { type: 'info', children: 'Legacy' }),
    ).includes('callout-note'),
  );
});
