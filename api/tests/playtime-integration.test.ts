import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { neon } from '@neondatabase/serverless';
import { createPlaytimeStore } from '../lib/playtime-store.js';

test('Neon uploads are atomic, replay-safe, cumulative and ordered under concurrency', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const url = process.env.TEST_DATABASE_URL!;
  const sql = neon(url);
  const store = createPlaytimeStore(url);
  const collectorId = `integration-${randomUUID()}`;
  try {
    const entries = [{ gameId: 'minecraft', source: 'modrinth', minutes: 10 }, { gameId: 'satisfactory', source: 'steam', minutes: 20 }];
    assert.equal((await store.upload({ collectorId, sequence: 1, entries })).accepted, true);
    assert.equal((await store.upload({ collectorId, sequence: 1, entries: [{ ...entries[0], minutes: 999 }] })).accepted, false);
    await store.upload({ collectorId, sequence: 2, entries: [{ ...entries[0], minutes: 5 }] });
    const [row] = await sql`SELECT SUM(minutes)::int AS minutes FROM playtime.totals WHERE collector_id = ${collectorId}`;
    assert.equal(row.minutes, 30);
    await Promise.all([3, 4].map(sequence => store.upload({ collectorId, sequence, entries: [{ ...entries[0], minutes: sequence * 100 }] })));
    const [latest] = await sql`SELECT last_sequence FROM playtime.collectors WHERE collector_id = ${collectorId}`;
    assert.equal(Number(latest.last_sequence), 4);
    const [total] = await sql`SELECT SUM(minutes)::int AS minutes FROM playtime.totals WHERE collector_id = ${collectorId}`;
    assert.equal(total.minutes, 420);
    await assert.rejects(store.upload({ collectorId, sequence: 5, entries: [{ ...entries[0], minutes: -1 }] }));
    const [rolledBack] = await sql`SELECT last_sequence FROM playtime.collectors WHERE collector_id = ${collectorId}`;
    assert.equal(Number(rolledBack.last_sequence), 4);
  } finally {
    await sql.transaction([
      sql`DELETE FROM playtime.totals WHERE collector_id = ${collectorId}`,
      sql`DELETE FROM playtime.collectors WHERE collector_id = ${collectorId}`,
    ]);
  }
});
