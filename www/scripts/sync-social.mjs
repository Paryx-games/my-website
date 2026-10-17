import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const pages = JSON.parse(await readFile(new URL('content/social-pages.json', root), 'utf8'));
const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
for (const page of pages) {
  const file = new URL(page.file, root);
  let html;
  try { html = await readFile(file, 'utf8'); }
  catch (error) { if (page.file.startsWith('../') && error.code === 'ENOENT') continue; throw error; }
  const url = page.url || `https://paryx.uk${page.path}`;
  const image = `https://paryx.uk/assets/social/${page.image}`;
  const title = `Paryx - ${page.label}`;
  const fields = {
    'og:type': 'website', 'og:url': url, 'og:title': title, 'og:description': page.description,
    'og:site_name': 'paryx.uk', 'og:locale': 'en_GB', 'og:image': image,
    'og:image:secure_url': image, 'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': page.alt,
    'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': page.description,
    'twitter:image': image, 'twitter:image:alt': page.alt,
  };
  html = html.replace(/^[ \t]*<meta\s+(?:name|property)="(?:og:[^"]+|twitter:[^"]+)"[^>]*>\r?\n/gm, '');
  const metadata = Object.entries(fields).map(([key, value]) => `  <meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`).join('\n');
  const marker = '<meta name="theme-color"';
  if (!html.includes(marker)) throw new Error(`Missing theme colour in ${page.file}`);
  html = html.replace(marker, `${metadata.trimStart()}\n  ${marker}`);
  if (page.color) html = html.replace(/(<meta name="theme-color" content=")[^"]+/, `$1${page.color}`);
  await writeFile(file, html);
}
