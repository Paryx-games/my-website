import { mkdir, writeFile } from 'node:fs/promises';
import { pageSocialImage } from '../src/social-image.js';

// Committed static assets let www deploy independently of the blog toolchain.
const output = new URL('../../www/public/assets/social/', import.meta.url);
await mkdir(output, { recursive: true });
for (const page of [
  {
    filename: 'home.png',
    title: 'Projects & experiments.',
    description: 'Software, Roblox development, and the things I’m building.',
    label: 'Home',
    domain: 'paryx.uk',
  },
  {
    filename: 'portfolio.png',
    title: 'Portfolio.',
    description: 'Roblox builds, code, and other projects by Paryx.',
    label: 'Portfolio',
    domain: 'paryx.uk/portfolio',
  },
]) {
  await writeFile(new URL(page.filename, output), await pageSocialImage(page));
}
