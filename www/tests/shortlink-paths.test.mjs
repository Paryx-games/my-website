import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedShortLinkPaths } from '../scripts/shortlink-paths.mjs';
import { isShortLinkPathAvailable } from '../api/shortlinks/path-availability.js';

const file = (name) => ({ name, isDirectory: () => false });
const directory = (name) => ({ name, isDirectory: () => true });

test('short links reserve www routes and allow the unused api root', () => {
  const manifest = createReservedShortLinkPaths([
    file('index.html'),
    file('portfolio.html'),
    file('changelog.html'),
    directory('assets'),
    file('robots.txt'),
  ], {
    rewrites: [
      { source: '/projects/changelog', destination: '/changelog' },
      { source: '/:code([a-z0-9-]{1,32})', destination: 'https://admin.paryx.uk/api/shortlinks/resolve/:code' },
    ],
    redirects: [{ source: '/projects', destination: '/#projects' }],
  });

  assert.deepEqual(manifest, {
    allPathsReserved: false,
    segments: ['assets', 'changelog', 'portfolio', 'projects'],
  });
  assert.equal(isShortLinkPathAvailable('api', manifest), true);
  assert.equal(isShortLinkPathAvailable('portfolio', manifest), false);
  assert.equal(isShortLinkPathAvailable('projects', manifest), false);
  assert.equal(isShortLinkPathAvailable('random1234', manifest), true);
});

test('short links fail closed when a www root route is dynamic', () => {
  const manifest = createReservedShortLinkPaths([], {
    rewrites: [{ source: '/:path*', destination: '/index.html' }],
  });
  assert.equal(manifest.allPathsReserved, true);
  assert.equal(isShortLinkPathAvailable('random1234', manifest), false);
});

test('short-link rewrite through the consolidated forms API does not reserve every path', () => {
  const manifest = createReservedShortLinkPaths([], {
    rewrites: [{
      source: '/:code([a-z0-9-]{1,32})',
      destination: 'https://admin.paryx.uk/api/forms?resource=shortlinks&code=:code',
    }],
  });
  assert.equal(manifest.allPathsReserved, false);
  assert.equal(isShortLinkPathAvailable('random1234', manifest), true);
});
