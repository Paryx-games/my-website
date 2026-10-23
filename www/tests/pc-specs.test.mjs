import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));

test('homepage shows plain compact PC rows with icon containers and no expanded specs', async () => {
  const home = await readFile(new URL('index.html', root), 'utf8');
  const detail = await readFile(new URL('pc-specs.html', root), 'utf8');
  const styles = await readFile(new URL('public/assets/pc-specs.css', root), 'utf8');
  const partsMarkup = home.match(/<!-- pc-parts:start -->([\s\S]*?)<!-- pc-parts:end -->/)?.[1];
  assert.ok(partsMarkup, 'homepage PC part markers are present');
  const homePartCards = [...partsMarkup.matchAll(/class="home-pc-part"/g)];
  assert.equal(homePartCards.length, specs.homeParts.length);
  assert.ok(partsMarkup.includes('class="home-pc-part-icon"'));
  assert.ok(partsMarkup.includes('class="home-pc-part-price"'));
  assert.ok(partsMarkup.includes('launch MSRP'));
  assert.ok(partsMarkup.includes('MSI GeForce RTX 5070 Ti VENTUS/SHADOW/INSPIRE 3X OC'));
  assert.ok(!partsMarkup.includes('pc-terminal'));
  assert.ok(!partsMarkup.includes('<details'));
  assert.ok(styles.includes('.home-pc-part { display: grid;'));
  assert.ok(!/\.home-pc-part\s*\{[^}]*background\s*:/.test(styles));
  assert.ok(!/\.home-pc-part\s*\{[^}]*border\s*:/.test(styles));
  assert.ok(/\.home-pc-part-icon\s*\{[^}]*border\s*:/.test(styles));
  assert.ok(home.includes('href="/pc-specs"'));
  assert.ok(detail.includes('class="pc-list"'));
  assert.ok(detail.includes('AMD Ryzen 7 9800X3D'));
  assert.ok(detail.includes('NVIDIA GeForce RTX 5070 Ti'));
  assert.ok(detail.includes('All specs'));
  assert.equal(specs.homeParts.length, 7);
  assert.ok(home.indexOf('id="time"') < home.indexOf('id="pc-specs"'));
  assert.ok(specs.details.flatMap(group => group.fields).length > 45);
  for (const part of specs.homeParts) {
    assert.ok(partsMarkup.includes(`>${part.name}<svg`), `missing part name: ${part.id}`);
    assert.ok(partsMarkup.includes(`<b>${part.price}</b>`), `missing part price: ${part.id}`);
  }
});
