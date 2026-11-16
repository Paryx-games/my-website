import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReservedShortLinkPaths } from './shortlink-paths.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const functionDirectory = path.join(projectRoot, 'api', 'shortlinks');

const [entries, vercelConfig] = await Promise.all([
  readdir(outputDirectory, { withFileTypes: true }),
  readFile(path.join(projectRoot, 'vercel.json'), 'utf8').then(JSON.parse),
]);
const manifest = createReservedShortLinkPaths(entries, vercelConfig);

await mkdir(functionDirectory, { recursive: true });
await writeFile(
  path.join(functionDirectory, 'reserved-paths.json'),
  `${JSON.stringify(manifest)}\n`,
  'utf8',
);
