import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pageSocialImage, pcSocialImage } from '../src/social-image.js';

// Committed static assets let www deploy independently of the blog toolchain.
const output = new URL('../../www/public/assets/social/', import.meta.url);
await mkdir(output, { recursive: true });
const pages = JSON.parse(
  await readFile(
    new URL('../../www/content/social-pages.json', import.meta.url),
    'utf8',
  ),
) as {
  image: string;
  title: string;
  description: string;
  label: string;
  path?: string;
  url?: string;
}[];
const specs = JSON.parse(
  await readFile(
    new URL('../../www/public/pc-specs.json', import.meta.url),
    'utf8',
  ),
);
for (const page of pages) {
  const image =
    page.image === 'pc-specs.png'
      ? await pcSocialImage(specs)
      : await pageSocialImage({
          ...page,
          domain: (page.url || `https://paryx.uk${page.path}`).replace(
            'https://',
            '',
          ),
        });
  await writeFile(new URL(page.image, output), image);
}
