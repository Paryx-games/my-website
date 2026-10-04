import { games, rotation, catalogue } from './games.js';

const cards = document.getElementById('favorite-games');
const dialog = document.getElementById('game-showcase');
const title = document.getElementById('game-title');
const image = document.getElementById('game-picture');
const caption = document.getElementById('game-caption');
const thumbs = document.getElementById('game-thumbnails');
let active;
let pictureIndex = 0;
let opener;

const card = game => {
  const link = document.createElement('a');
  link.href = game.website;
  link.className = 'game-card';
  link.dataset.game = game.id;
  const cover = document.createElement('span');
  cover.className = 'game-cover';
  const artwork = document.createElement('img');
  artwork.src = game.cover;
  artwork.alt = '';
  artwork.loading = 'lazy';
  artwork.width = 600;
  artwork.height = 900;
  const name = document.createElement('strong');
  name.textContent = game.title;
  cover.append(artwork, name);
  const facts = document.createElement('span');
  facts.className = 'game-card-facts';
  facts.textContent = `${game.year} · ${game.publisher}`;
  link.append(cover, facts);
  link.setAttribute('aria-haspopup', 'dialog');
  return link;
};
cards.replaceChildren(...games.map(card));
document.getElementById('games-count').textContent = games.length;
const rotationRoot = document.getElementById('rotation-games');
if (rotation.length) {
  rotationRoot.replaceChildren(...rotation.map(({ id, status, title }) => {
    const game = catalogue.find(game => game.id === id);
    const link = card({ ...game, title: title || game.title });
    const label = document.createElement('span');
    label.className = 'game-status';
    label.textContent = status;
    link.append(label);
    return link;
  }));
}

function showPicture(index) {
  pictureIndex = (index + active.pictures.length) % active.pictures.length;
  image.src = active.pictures[pictureIndex];
  image.alt = active.captions[pictureIndex];
  caption.textContent = `${pictureIndex + 1} / ${active.pictures.length} — ${active.captions[pictureIndex]}`;
  [...thumbs.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === pictureIndex)));
}

document.getElementById('games').addEventListener('click', event => {
  const link = event.target.closest('[data-game]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  active = catalogue.find(game => game.id === link.dataset.game);
  if (!active) return;
  event.preventDefault();
  opener = link;
  title.textContent = active.title;
  document.getElementById('game-description').textContent = active.description;
  const facts = document.getElementById('game-facts');
  facts.replaceChildren();
  for (const [label, value] of [['Released', active.year], ['Developer', active.developer], ['Publisher', active.publisher], ['Genre', active.genre]]) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    facts.append(term, detail);
  }
  document.getElementById('game-website').href = active.website;
  thumbs.replaceChildren(...active.pictures.map((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show picture ${index + 1}: ${active.captions[index]}`);
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.alt = '';
    thumb.loading = 'lazy';
    button.append(thumb);
    button.addEventListener('click', () => showPicture(index));
    return button;
  }));
  showPicture(0);
  dialog.showModal();
  document.body.classList.add('game-showcase-open');
  document.getElementById('game-close').focus();
});

document.getElementById('game-close').addEventListener('click', () => dialog.close());
document.getElementById('game-prev').addEventListener('click', () => showPicture(pictureIndex - 1));
document.getElementById('game-next').addEventListener('click', () => showPicture(pictureIndex + 1));
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPicture(pictureIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('game-showcase-open');
  opener?.focus({ preventScroll: true });
});
