import assert from 'node:assert/strict';
import { test } from 'node:test';
import { neon } from '@neondatabase/serverless';
import { createStatsStore } from '../lib/roblox-stats-store.js';
import { fetchStats, readStats } from '../lib/roblox-stats.js';

// TEST_DATABASE_URL must point to an isolated verification branch: this test resets its stats cache.
test('shared database cache leases serialize refreshes and preserve successful timestamps', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = process.env.TEST_DATABASE_URL!;
  const sql = neon(url);
  const first = createStatsStore(url);
  const second = createStatsStore(url);
  await sql`UPDATE roblox.stats_cache SET payload = NULL, fetched_at = NULL, lease_token = NULL, lease_until = NULL WHERE id = 1`;
  const claims = await Promise.all([first.claim('first'), second.claim('second')]);
  assert.equal(claims.filter(Boolean).length, 1);
  const owner = claims[0] ? 'first' : 'second';
  const data = await fetchStats();
  assert.equal(await first.save('wrong', data), false);
  assert.equal(await first.save(owner, data), true);
  assert.deepEqual(await second.read(), data);
  assert.equal(await second.claim('fresh'), false);
  assert.deepEqual(await readStats(second, async () => { throw new Error('Fresh cache must not fetch'); }, 'cached'), data);

  await sql`UPDATE roblox.stats_cache SET fetched_at = now() - interval '2 hours' WHERE id = 1`;
  assert.equal(await first.claim('expired'), true);
  assert.equal(await second.claim('competing'), false);
  await first.fail('expired');
  assert.deepEqual(await second.read(), data);
  assert.equal(await second.claim('backoff'), false);

  await sql`UPDATE roblox.stats_cache SET lease_until = now() - interval '1 second' WHERE id = 1`;
  assert.equal(await second.claim('retry'), true);
  await sql`UPDATE roblox.stats_cache SET lease_until = now() - interval '1 second' WHERE id = 1`;
  assert.equal(await first.claim('replacement'), true);
  assert.equal(await second.save('retry', data), false);
  assert.equal(await first.save('replacement', data), true);
});
