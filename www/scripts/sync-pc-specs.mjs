import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const fields = new Map(specs.groups.flatMap(group => group.fields).map(field => [field.id, field]));
const categories = {
  cpu: { label: 'CPU', color: '#f78166', icon: '<path d="M8 3v2m4-2v2m4-2v2M8 19v2m4-2v2m4-2v2M3 8h2m-2 4h2m-2 4h2m14-8h2m-2 4h2m-2 4h2"/><rect x="5" y="5" width="14" height="14" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1.5"/><path d="M10.5 11h3v2h-3z"/>' },
  gpu: { label: 'GPU', color: '#a371f7', icon: '<path d="M4 7h15a2 2 0 0 1 2 2v7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="9" cy="11.5" r="2.5"/><path d="m9 9 1.2 2.5L9 14l-1.2-2.5L9 9Zm7.5 0v5m-11 2v2m2-2v2m-4-11V5"/>' },
  memory: { label: 'RAM', color: '#3fb950', icon: '<path d="M4 7h16a2 2 0 0 1 2 2v7H2V9a2 2 0 0 1 2-2Z"/><rect x="5" y="9" width="3" height="4" rx=".7"/><rect x="10.5" y="9" width="3" height="4" rx=".7"/><rect x="16" y="9" width="3" height="4" rx=".7"/><path d="M5 16v2m3-2v2m3-2v2m3-2v2m3-2v2m3-2v2"/>' },
  board: { label: 'Motherboard', color: '#58a6ff', icon: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><rect x="7" y="6" width="6" height="6" rx="1.5"/><path d="M15 7h2m-2 3h2M7 15h10m-8 3h6M2 7h2m16 8h2"/><circle cx="16" cy="16" r="1.5"/>' },
  storage: { label: 'Storage', color: '#e3b341', icon: '<path d="M5 3h10l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M7 12h10m-10 3h6"/><circle cx="16.5" cy="17" r="1"/>' },
  display: { label: 'Display', color: '#39c5cf', icon: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M8 21h8m-4-4v4m-5-12h10m-10 3h6"/>' },
};
if (!Array.isArray(specs.homeParts) || specs.homeParts.length === 0) {
  throw new Error('PC specs are missing the homepage part list');
}
const homeParts = specs.homeParts.map(part => {
  const category = categories[part.icon];
  if (!fields.has(part.id) || !category) {
    throw new Error(`Homepage PC part references an unknown field or icon: ${part.id}`);
  }
  for (const key of ['name', 'description', 'launchYear', 'price']) {
    if (typeof part[key] !== 'string' || !part[key].trim()) {
      throw new Error(`Homepage PC part ${part.id} is missing ${key}`);
    }
  }
  if (part.href && typeof part.href !== 'string') {
    throw new Error(`Homepage PC part ${part.id} has an invalid link`);
  }
  const priceNote = [
    part.priceNote ? `<span>${escape(part.priceNote)}</span>` : '',
    `<span>Launched ${escape(part.launchYear)}</span>`,
  ].filter(Boolean).join('');
  const link = part.href
    ? `<a class="icon-btn repo-open" href="${escape(part.href)}" target="_blank" rel="noopener noreferrer" data-tip="Open ${escape(part.name)} link" aria-label="Open ${escape(part.name)} link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg></a>`
    : `<button class="icon-btn repo-open" type="button" disabled data-tip="No link configured" aria-label="No link configured for ${escape(part.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg></button>`;
  return `<article class="repo home-pc-part" style="--spec-color:${category.color}" data-spec-name="${escape(part.name)}">
  <div class="repo-head">
    <div class="repo-title"><span class="repo-origin-icon home-pc-part-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${category.icon}</svg></span><span class="repo-name">${escape(part.name)}</span><button class="icon-btn repo-copy" type="button" data-pc-copy="${escape(part.name)}" data-tip="Copy ${escape(part.name)}" aria-label="Copy ${escape(part.name)}"><span class="i-copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg></span><span class="i-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span></button></div>
    <div class="repo-actions">${link}</div>
  </div>
  <p class="repo-desc">${escape(part.description)}</p>
  <div class="repo-foot"><span class="home-pc-category">${category.label}</span><span class="home-pc-part-price"><b>${escape(part.price)}</b>${priceNote}</span></div>
  <span class="sr-only" role="status"></span>
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
