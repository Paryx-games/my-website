import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));

test('homepage PC specs use project cards with categorized icons and actions', async () => {
  const home = await readFile(new URL('index.html', root), 'utf8');
  const detail = await readFile(new URL('pc-specs.html', root), 'utf8');
  const styles = await readFile(new URL('public/assets/pc-specs.css', root), 'utf8');
  const generator = await readFile(new URL('scripts/sync-pc-specs.mjs', root), 'utf8');
  const partsMarkup = home.match(/<!-- pc-parts:start -->([\s\S]*?)<!-- pc-parts:end -->/)?.[1];
  assert.ok(partsMarkup, 'homepage PC part markers are present');
  const homePartCards = [...partsMarkup.matchAll(/class="repo home-pc-part"/g)];
  assert.equal(homePartCards.length, specs.homeParts.length);
  assert.ok(partsMarkup.includes('class="repo home-pc-part"'));
  assert.ok(partsMarkup.includes('class="repo-origin-icon home-pc-part-icon"'));
  assert.ok(partsMarkup.includes('data-pc-copy='));
  assert.ok(partsMarkup.includes('class="icon-btn repo-open"'));
  assert.ok(generator.includes('class="icon-btn repo-open" type="button" disabled'));
  assert.ok(partsMarkup.includes('class="home-pc-category"'));
  assert.ok(partsMarkup.includes('launch MSRP'));
  assert.ok(partsMarkup.includes('estimated MSRP'));
  assert.ok(partsMarkup.includes('Launched 2024*'));
  assert.ok(partsMarkup.includes('$289.99'));
  assert.ok(partsMarkup.includes('$349.99'));
  assert.ok(partsMarkup.includes('$209.99'));
  assert.ok(partsMarkup.includes('MSI GeForce RTX 5070 Ti VENTUS/SHADOW/INSPIRE 3X OC'));
  assert.ok(!partsMarkup.includes('pc-terminal'));
  assert.ok(!partsMarkup.includes('<details'));
  assert.ok(styles.includes('.repo.home-pc-part'));
  assert.ok(styles.includes('border-color: var(--spec-color)'));
  assert.ok(styles.includes('.home-pc-part .repo-open:disabled'));
  assert.ok(generator.includes("label: 'CPU'"));
  assert.ok(generator.includes("label: 'GPU'"));
  assert.ok(generator.includes("label: 'RAM'"));
  assert.ok(home.includes('href="/pc-specs"'));
  assert.ok(detail.includes('class="pc-list"'));
  assert.ok(detail.includes('AMD Ryzen 7 9800X3D'));
  assert.ok(detail.includes('NVIDIA GeForce RTX 5070 Ti'));
  assert.ok(detail.includes('All specs'));
  assert.equal(specs.homeParts.length, 7);
  assert.deepEqual(
    specs.homeParts.map(({ id, launchYear }) => [id, launchYear]),
    [
      ['cpu', '2024'],
      ['gpu', '2025'],
      ['memory', '2024*'],
      ['board', '2025'],
      ['storage', '2022'],
      ['display', '2024'],
      ['display-secondary', '2016'],
    ],
  );
  assert.ok(home.indexOf('id="time"') < home.indexOf('id="pc-specs"'));
  assert.ok(specs.details.flatMap(group => group.fields).length > 45);
  for (const part of specs.homeParts) {
    assert.ok(partsMarkup.includes(`>${part.name}</span>`), `missing part name: ${part.id}`);
    assert.ok(partsMarkup.includes(`<b>${part.price}</b>`), `missing part price: ${part.id}`);
    assert.ok(partsMarkup.includes(`Launched ${part.launchYear}`), `missing launch year: ${part.id}`);
    assert.ok(partsMarkup.includes(`--spec-color:`), `missing category border color: ${part.id}`);
  }
});
