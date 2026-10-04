import { readFile, writeFile } from 'node:fs/promises';
import { marked } from 'marked';

// This is the supplied profile README, not the repository's project README.
const root = new URL('../', import.meta.url);
const markdown = (await readFile(new URL('content/profile.md', root), 'utf8')).replace(/\r\n/g, '\n');
let html = await readFile(new URL('index.html', root), 'utf8');
const paragraphs = markdown.slice(markdown.indexOf("I'm **paryx**"), markdown.indexOf('[![paryx on'))
  .trim().split(/\r?\n\r?\n/).map(text => marked.parseInline(text));
const about = `<section class="about" id="about">
      <h2>About</h2>
      <p><span id="aboutText">${paragraphs[0]}</span><span class="caret" id="aboutCaret" aria-hidden="true"></span></p>
      <p><span id="aboutOpenSource">${paragraphs[1]}</span></p>
    </section>`;
html = html.replace(/<section class="about" id="about">[\s\S]*?<\/section>/, about);
const detailSource = markdown.slice(markdown.indexOf('<h3>'), markdown.indexOf('</details>'));
const articles = [...detailSource.matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)]
  .map(([, heading, body]) => `<article><h3>${heading.replace(/<br>\s*/g, '')}</h3>\n${marked.parse(body)}</article>`).join('\n')
  .replace(/<img[^>]+src="https:\/\/skillicons\.dev\/[^>]+>/g, '');
const details = `<section id="more-details" class="profile-details">
      <h2>More details</h2>
      <div class="profile-details-body">${articles}</div>
    </section>`;
if (html.includes('<section id="more-details"')) {
  html = html.replace(/<section id="more-details"[\s\S]*?<\/section>/, details);
} else {
  html = html.replace(/\s*<details class="more">[\s\S]*?<\/details>/, '');
  html = html.replace('    <section class="tight">', `${details}\n\n    <section class="tight">`);
}
await writeFile(new URL('index.html', root), html.replace(/[ \t]+$/gm, ''));
