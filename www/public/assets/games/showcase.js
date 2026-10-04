import { games, rotation, catalogue } from './games.js';
import { loadGameImage } from './load-image.js';

const cards = document.getElementById('favorite-games');
const dialog = document.getElementById('game-showcase');
const title = document.getElementById('game-title');
const image = document.getElementById('game-picture');
const thumbs = document.getElementById('game-thumbnails');
let active;
let pictureIndex = 0;
let opener;
let closing = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const factIcons = [
  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01"/>',
  '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2"/>',
  '<circle cx="12" cy="12" r="9"/><path d="M7 15a6 6 0 1 1 8 2 4 4 0 1 1-1-7 2 2 0 1 1-3 3"/>',
  '<path d="M7 7h10a4 4 0 0 1 4 3l2 7a2 2 0 0 1-3 2l-4-3H8l-4 3a2 2 0 0 1-3-2l2-7a4 4 0 0 1 4-3Z M7 10v4M5 12h4M16 11h.01M19 13h.01"/>',
];

async function closeShowcase() {
  if (closing || !dialog.open) return;
  closing = true;
  if (!reducedMotion.matches) {
    await dialog.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(8px) scale(0.985)' }], { duration: 180, easing: 'ease-out' }).finished.catch(() => {});
  }
  dialog.close();
  closing = false;
}

const card = game => {
  const link = document.createElement('a');
  link.href = game.website;
  link.className = 'game-card';
  link.dataset.game = game.id;
  const cover = document.createElement('span');
  cover.className = 'game-cover';
  const artwork = document.createElement('img');
  const artworkShell = document.createElement('span');
  artworkShell.className = 'game-image-shell game-cover-image';
  artwork.alt = '';
  artwork.loading = 'lazy';
  artwork.width = 600;
  artwork.height = 900;
  artworkShell.append(artwork);
  loadGameImage(artwork, game.cover, { shell: artworkShell });
  const name = document.createElement('strong');
  const icon = document.createElement('img');
  icon.className = 'game-card-icon';
  icon.alt = '';
  icon.width = 16;
  icon.height = 16;
  icon.loading = 'lazy';
  const iconShell = document.createElement('span');
  iconShell.className = 'game-image-shell game-icon-shell';
  iconShell.append(icon);
  loadGameImage(icon, game.icon, { shell: iconShell });
  name.append(iconShell, game.title);
  cover.append(artworkShell, name);
  const facts = document.createElement('span');
  facts.className = 'game-card-facts';
  facts.textContent = `${game.year} · ${game.publisher}`;
  link.append(cover, facts);
  link.setAttribute('aria-haspopup', 'dialog');
  return link;
};
cards.replaceChildren(...games.map(card));
document.getElementById('games-count').textContent = games.length;
document.getElementById('rotation-count').textContent = rotation.length;
const rotationRoot = document.getElementById('rotation-games');
if (rotation.length) {
  rotationRoot.replaceChildren(...rotation.map(({ id, title }) => {
    const game = catalogue.find(game => game.id === id);
    const link = card({ ...game, title: title || game.title });
    return link;
  }));
}

if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      target.classList.remove('is-pending');
      target.classList.add('is-revealed');
      observer.unobserve(target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.game-card').forEach(card => {
    card.classList.add('is-pending');
    observer.observe(card);
  });
}

function showPicture(index) {
  pictureIndex = (index + active.pictures.length) % active.pictures.length;
  image.alt = active.captions[pictureIndex];
  loadGameImage(image, active.pictures[pictureIndex], {
    shell: image.parentElement,
    onReady: () => {
      if (!reducedMotion.matches) image.animate([{ opacity: 0, transform: 'scale(1.015)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
    },
  });
  [...thumbs.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === pictureIndex)));
  if (dialog.open) thumbs.children[pictureIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

document.getElementById('games').addEventListener('click', event => {
  const link = event.target.closest('[data-game]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  active = catalogue.find(game => game.id === link.dataset.game);
  if (!active) return;
  event.preventDefault();
  opener = link;
  dialog.style.setProperty('--game-accent', active.accent);
  loadGameImage(document.getElementById('game-backdrop'), active.backdrop || active.cover);
  title.textContent = active.title;
  const logo = document.getElementById('game-logo');
  logo.parentElement.hidden = !active.logo;
  logo.dataset.lightInk = String(active.id === 'forza-horizon-4');
  title.classList.toggle('sr-only', Boolean(active.logo));
  if (active.logo) loadGameImage(logo, active.logo, { shell: logo.parentElement });
  document.getElementById('game-description').textContent = active.description;
  const facts = document.getElementById('game-facts');
  facts.replaceChildren();
  for (const [index, [label, value]] of [['Released', active.year], ['Developer', active.developer], ['Publisher', active.publisher], ['Genre', active.genre]].entries()) {
    const row = document.createElement('div');
    row.className = 'game-fact';
    row.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${factIcons[index]}</svg>`;
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    facts.append(row);
  }
  document.getElementById('game-website').href = active.website;
  thumbs.replaceChildren(...active.pictures.map((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show picture ${index + 1}: ${active.captions[index]}`);
    const thumb = document.createElement('img');
    thumb.alt = '';
    thumb.loading = 'lazy';
    button.append(thumb);
    loadGameImage(thumb, src, { shell: button });
    button.addEventListener('click', () => showPicture(index));
    return button;
  }));
  showPicture(0);
  dialog.showModal();
  if (!reducedMotion.matches) dialog.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 280, easing: 'ease-out' });
  document.body.classList.add('game-showcase-open');
  document.getElementById('game-close').focus();
});

document.getElementById('game-close').addEventListener('click', closeShowcase);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeShowcase(); });
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
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeShowcase();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('game-showcase-open');
  opener?.focus({ preventScroll: true });
});
