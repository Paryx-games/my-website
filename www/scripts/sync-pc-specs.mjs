import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const rows = fields => fields.map(field => `<div data-pc-field="${escape(field.id)}"><dt>${escape(field.label)}</dt><dd>${escape(field.value)}</dd></div>`).join('\n');
const logo = `${Array(9).fill('/////////////////  /////////////////').join('\n')}\n\n${Array(9).fill('/////////////////  /////////////////').join('\n')}`;
const terminal = `<div class="pc-terminal" data-pc-terminal="full" role="region" aria-label="My PC hardware and software specifications">
  <div class="pc-terminal-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/></svg><span>PowerShell</span><span class="pc-terminal-window-mark" aria-hidden="true"></span></div>
  <div class="pc-terminal-inner">
    <p class="pc-prompt">PS ~&gt; <span>fastfetch</span></p>
    <div class="pc-fetch">
      <pre class="pc-logo" aria-hidden="true">${logo}</pre>
      <div class="pc-output">
        <p class="pc-identity">paryx <span>@</span> paryx</p>
        ${specs.groups.map(group => `<dl class="pc-facts" aria-label="${escape(group.title)}">\n${rows(group.fields)}\n</dl>`).join('\n')}
        <div class="pc-palette" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</div>`;

for (const filename of ['index.html', 'pc-specs.html']) {
  const file = new URL(filename, root);
  let html = await readFile(file, 'utf8');
  if (!html.includes('<!-- pc-terminal:start -->') || !html.includes('<!-- pc-terminal:end -->')) throw new Error(`Missing PC terminal in ${filename}`);
  html = html.replace(/<!-- pc-terminal:start -->[\s\S]*?<!-- pc-terminal:end -->/, `<!-- pc-terminal:start -->\n${terminal}\n<!-- pc-terminal:end -->`);
  if (filename === 'pc-specs.html') {
    const details = `<div id="pc-hardware-details" class="pc-hardware-details">\n${specs.details.map(group => `<section class="pc-detail-group" aria-labelledby="pc-detail-${escape(group.id)}"><h2 id="pc-detail-${escape(group.id)}">${escape(group.title)}</h2><dl>${rows(group.fields)}</dl></section>`).join('\n')}\n</div>`;
    html = html.replace(/<!-- pc-details:start -->[\s\S]*?<!-- pc-details:end -->/, `<!-- pc-details:start -->\n${details}\n<!-- pc-details:end -->`);
  }
  await writeFile(file, html);
}
