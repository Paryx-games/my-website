import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(await readFile(new URL('public/pc-specs.json', root), 'utf8'));

test('homepage contains every existing Fastfetch field, and the detail page adds the full hardware breakdown', async () => {
  const home = await readFile(new URL('index.html', root), 'utf8');
  const detail = await readFile(new URL('pc-specs.html', root), 'utf8');
  const fields = specs.groups.flatMap(group => group.fields);
  for (const field of fields) {
    assert.ok(home.includes(`data-pc-field="${field.id}"`), `missing home field: ${field.id}`);
    assert.ok(detail.includes(`data-pc-field="${field.id}"`), `missing detail field: ${field.id}`);
  }
  assert.equal(fields.length, 16);
  assert.ok(home.indexOf('id="time"') < home.indexOf('id="pc-specs"'));
  assert.ok(home.includes('class="pc-logo"'));
  assert.ok(specs.details.flatMap(group => group.fields).length > 45);
  for (const field of specs.details.flatMap(group => group.fields)) {
    assert.ok(detail.includes(`data-pc-field="${field.id}"`));
    assert.ok(!home.includes(`data-pc-field="${field.id}"`));
  }
});
