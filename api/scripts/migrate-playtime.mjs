import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('Set DATABASE_URL_UNPOOLED before running the migration');
if (new URL(url).hostname.includes('-pooler')) throw new Error('Use a direct connection for migrations');
const sql = neon(url);
const files = (await readdir(new URL('../migrations/', import.meta.url))).filter(file => /^\d+.*\.sql$/.test(file)).sort();
for (const file of files) {
const version = file.replace(/\.sql$/, '');
const migration = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
const checksum = createHash('sha256').update(migration).digest('hex');
const [exists] = await sql`SELECT to_regclass('playtime.schema_migrations') AS name`;
if (exists.name) {
  const [applied] = await sql`SELECT checksum FROM playtime.schema_migrations WHERE version = ${version}`;
  if (applied) {
    if (applied.checksum !== checksum) throw new Error('Applied migration was changed; add a new migration instead');
    console.log(`Playtime migration ${version} already applied`);
    continue;
  }
}
const statements = migration.split(';').map(part => part.trim()).filter(Boolean);
await sql.transaction([
  ...statements.map(statement => sql.query(statement)),
  sql.query('CREATE TABLE IF NOT EXISTS playtime.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'),
  sql`INSERT INTO playtime.schema_migrations (version, checksum) VALUES (${version}, ${checksum})`,
]);
console.log(`Applied playtime migration ${version}`);
}
