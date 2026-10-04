import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quoteParts } from '../public/assets/games/quote-links.js';

const games = [{ id: 'escape', title: 'Escape the Backrooms' }, { id: 'together', title: 'Backrooms: Escape Together' }, { id: 'factory', title: 'Satisfactory' }];
test('quote links match complete game titles, preserve text and link repeated references', () => {
  const text = 'Escape the Backrooms beats backrooms: escape together. Escape the Backrooms!';
  const parts = quoteParts(text, games);
  assert.deepEqual(parts.filter(part => typeof part !== 'string').map(part => part.game.id), ['escape', 'together', 'escape']);
  assert.equal(parts.map(part => typeof part === 'string' ? part : part.text).join(''), text);
  assert.deepEqual(quoteParts('An unsatisfactory <script> remains ordinary text.', games), ['An unsatisfactory <script> remains ordinary text.']);
});
