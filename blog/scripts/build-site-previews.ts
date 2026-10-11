import { mkdir, writeFile } from 'node:fs/promises';
import { pageSocialImage } from '../src/social-image.js';

// Committed static assets let www deploy independently of the blog toolchain.
const output = new URL('../../www/public/assets/social/', import.meta.url);
await mkdir(output, { recursive: true });
for (const page of [
  {
    filename: 'home.png',
    title: 'My website.',
    description: 'My projects, blog posts, and information about me.',
    label: 'Home',
    domain: 'paryx.uk',
  },
  {
    filename: 'portfolio.png',
    title: 'My portfolio.',
    description: 'My portfolio for projects in Roblox, coding, and other platforms.',
    label: 'Portfolio',
    domain: 'paryx.uk/portfolio',
  },
]) {
  await writeFile(new URL(page.filename, output), await pageSocialImage(page));
}
