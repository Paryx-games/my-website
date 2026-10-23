import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const fields = new Map(specs.groups.flatMap(group => group.fields).map(field => [field.id, field]));
const icons = {
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  gpu: '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="9" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/><path d="M5 17v2M2 10h2"/>',
  memory: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 16v2M10 16v2M14 16v2M18 16v2M6 11h2M11 11h2M16 11h2"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="4" height="4" rx=".5"/><path d="M14 7h3M14 10h3M7 15h10"/>',
  storage: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M5 10.5v3"/><circle cx="19" cy="12" r="1"/>',
  display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
};
if (!Array.isArray(specs.homeParts) || specs.homeParts.length === 0) {
  throw new Error('PC specs are missing the homepage part list');
}
const homeParts = specs.homeParts.map(part => {
  if (!fields.has(part.id) || !icons[part.icon]) {
    throw new Error(`Homepage PC part references an unknown field or icon: ${part.id}`);
  }
  for (const key of ['name', 'href', 'description', 'price']) {
    if (typeof part[key] !== 'string' || !part[key].trim()) {
      throw new Error(`Homepage PC part ${part.id} is missing ${key}`);
    }
  }
  const priceNote = part.priceNote
    ? `<span>${escape(part.priceNote)}</span>`
    : '';
  return `<article class="home-pc-part">
  <span class="home-pc-part-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[part.icon]}</svg></span>
  <div class="home-pc-part-title">
    <a href="${escape(part.href)}" target="_blank" rel="noopener noreferrer">${escape(part.name)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg></a>
    <p>${escape(part.description)}</p>
  </div>
  <div class="home-pc-part-price"><b>${escape(part.price)}</b>${priceNote}</div>
</article>`;
}).join('\n');

const homeFile = new URL('index.html', root);
let home = await readFile(homeFile, 'utf8');
if (!home.includes('<!-- pc-parts:start -->') || !home.includes('<!-- pc-parts:end -->')) {
  throw new Error('Missing homepage PC parts markers in index.html');
}
home = home.replace(
  /<!-- pc-parts:start -->[\s\S]*?<!-- pc-parts:end -->/,
  `<!-- pc-parts:start -->\n<div class="home-pc-parts">\n${homeParts}\n</div>\n<!-- pc-parts:end -->`,
);
await writeFile(homeFile, home);
