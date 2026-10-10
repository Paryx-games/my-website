import { games, rotation, catalogue, robloxGames } from './games.js';
import { loadGameImage } from './load-image.js';
import { ratingsPanelElement } from './ratings.js';
import { renderPlaytime, createPlaytimeIncrease } from './playtime.js';
import { renderQuote } from './quote-links.js';
import { renderRobloxDetails } from './roblox-details.js';
import { fetchRemotePlaytime, mergeRemotePlaytime } from './remote-playtime.js';
import { fetchRobloxStats, mergeRobloxStats } from './remote-roblox.js';

let gameDetails = {};
try {
  const response = await fetch('/assets/games/game.json');
  if (!response.ok) throw new Error('Playtime unavailable');
  gameDetails = await response.json();
} catch (error) {
  console.warn('Game playtime could not be loaded.', error);
}

let ratings = {};
try {
  const response = await fetch('/assets/games/ratings.json');
  if (!response.ok) throw new Error('Ratings unavailable');
  ratings = await response.json();
} catch (error) {
  console.warn('Game ratings could not be loaded.', error);
}

const cards = document.getElementById('favorite-games');
const dialog = document.getElementById('game-showcase');
const title = document.getElementById('game-title');
const image = document.getElementById('game-picture');
const thumbs = document.getElementById('game-thumbnails');
let active;
let pictureIndex = 0;
let wheelScrollTarget = null;
let wheelScrollFrame = 0;
let wheelScrollTime = 0;
let wheelScrollPosition = 0;
let opener;
let closing = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let robloxRefresh;
let robloxRefreshedAt = 0;
function refreshRobloxStats() {
  if (robloxRefresh || Date.now() - robloxRefreshedAt < 60_000) return;
  robloxRefresh = fetchRobloxStats().then(response => {
    if (mergeRobloxStats(robloxGames, response) && dialog.open && active?.roblox) {
      renderRobloxDetails(document.getElementById('game-roblox-details'), active);
      document.getElementById('game-description').textContent = active.description;
    }
  }).finally(() => { robloxRefresh = null; robloxRefreshedAt = Date.now(); });
}
refreshRobloxStats();
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
  const container = document.createElement('article');
  container.className = 'game-card';
  const link = document.createElement('a');
  link.href = game.website;
  link.className = 'game-card-link';
  if (game.roblox) container.classList.add('game-card-roblox');
  link.dataset.game = game.id;
  if (!document.getElementById(`game-card-${game.id}`)) link.id = `game-card-${game.id}`;
  const cover = document.createElement('span');
  cover.className = 'game-cover';
  const artwork = document.createElement('img');
  const artworkShell = document.createElement('span');
  artworkShell.className = 'game-image-shell game-cover-image';
  artwork.alt = '';
  artwork.loading = 'lazy';
  artwork.width = game.roblox ? 512 : 600;
  artwork.height = game.roblox ? 512 : 900;
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
  const nameText = document.createElement('span');
  nameText.textContent = game.title;
  name.append(iconShell, nameText);
  const increase = createPlaytimeIncrease(gameDetails[game.id]?.playtime?.pcIncrease24hMinutes, true);
  if (increase) name.append(increase);
  cover.append(artworkShell, name);
  const facts = document.createElement('span');
  facts.className = 'game-card-facts';
  facts.textContent = `${game.year} · ${game.publisher}`;
  link.append(cover, facts);
  link.setAttribute('aria-haspopup', 'dialog');
  container.append(link);
  return container;
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
document.getElementById('roblox-games-list').replaceChildren(...robloxGames.map(card));
document.getElementById('roblox-games-count').textContent = robloxGames.length;

let playtimeRefresh;
let playtimeRefreshedAt = 0;
function refreshRemotePlaytime() {
  if (playtimeRefresh || Date.now() - playtimeRefreshedAt < 60_000) return;
  playtimeRefresh = fetchRemotePlaytime().then(response => {
    if (!mergeRemotePlaytime(gameDetails, response, catalogue.map(game => game.id))) return;
    document.querySelectorAll('.game-card-link').forEach(link => {
      const name = link.querySelector('.game-cover strong');
      name.querySelector('.game-playtime-increase')?.remove();
      const increase = createPlaytimeIncrease(gameDetails[link.dataset.game]?.playtime?.pcIncrease24hMinutes, true);
      if (increase) name.append(increase);
    });
    if (dialog.open && active) renderPlaytime(document.getElementById('game-playtime'), gameDetails[active.id]?.playtime, active.id === 'roblox');
  }).finally(() => { playtimeRefresh = null; playtimeRefreshedAt = Date.now(); });
}
refreshRemotePlaytime();

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
  stopWheelScroll();
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

function openShowcase(game, link) {
  active = game;
  opener = link;
  const wasOpen = dialog.open;
  dialog.classList.toggle('is-roblox', Boolean(active.roblox));
  const description = document.getElementById('game-description');
  const robloxOverview = document.getElementById('game-roblox-overview');
  robloxOverview.hidden = !active.roblox;
  if (active.roblox) document.getElementById('game-roblox-about').append(description);
  else document.querySelector('.game-info-panel').insertBefore(description, document.getElementById('game-website'));
  dialog.style.setProperty('--game-accent', active.accent);
  loadGameImage(document.getElementById('game-backdrop'), active.backdrop || active.cover);
  title.textContent = active.title;
  const logo = document.getElementById('game-logo');
  logo.parentElement.hidden = !active.logo;
  logo.dataset.lightInk = String(active.id === 'forza-horizon-4');
  title.classList.toggle('sr-only', Boolean(active.logo));
  if (active.logo) loadGameImage(logo, active.logo, { shell: logo.parentElement });
  document.getElementById('game-description').textContent = active.description;
  const quote = typeof ratings[active.id]?.quote === 'string' ? ratings[active.id].quote.trim() : '';
  renderQuote(document.getElementById('game-quote-text'), quote, catalogue);
  if (active.id === 'roblox') {
    const link = document.createElement('a');
    link.href = '#roblox-games';
    link.className = 'game-quote-link game-roblox-category-link';
    link.dataset.robloxCategory = '';
    const icon = document.createElement('img');
    icon.src = active.icon;
    icon.alt = '';
    icon.width = 16;
    icon.height = 16;
    link.append(icon, "Roblox games I've played");
    document.getElementById('game-quote-text').append(link);
  }
  document.getElementById('game-quote').hidden = !quote && active.id !== 'roblox';
  document.getElementById('game-ratings').replaceChildren(
    ratingsPanelElement(ratings[active.id], active.title),
  );
  const facts = document.getElementById('game-facts');
  facts.replaceChildren();
  for (const [index, [label, value]] of [[active.roblox ? 'Created' : 'Released', active.year], [active.roblox ? 'Creator' : 'Developer', active.developer], [active.roblox ? 'Platform' : 'Publisher', active.roblox ? 'Roblox' : active.publisher], ['Genre', active.genre]].entries()) {
    if (active.roblox && label === 'Creator') continue;
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
  renderPlaytime(document.getElementById('game-playtime'), gameDetails[active.id]?.playtime, active.id === 'roblox');
  renderRobloxDetails(document.getElementById('game-roblox-details'), active);
  if (active.roblox) refreshRobloxStats();
  document.querySelector('.game-image-credit').textContent = active.roblox
    ? 'Official experience icon and thumbnails from Roblox.'
    : 'Official artwork and screenshots from the linked game page.';
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
  if (!wasOpen) dialog.showModal();
  if (!wasOpen && !reducedMotion.matches) dialog.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 280, easing: 'ease-out' });
  document.body.classList.add('game-showcase-open');
  document.getElementById('game-close').focus();
  refreshRemotePlaytime();
}

document.getElementById('games').addEventListener('click', event => {
  const link = event.target.closest('[data-game]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const game = catalogue.find(game => game.id === link.dataset.game);
  if (!game) return;
  event.preventDefault();
  openShowcase(game, link);
});
dialog.addEventListener('click', event => {
  const link = event.target.closest('[data-quote-game]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const game = catalogue.find(game => game.id === link.dataset.quoteGame);
  if (!game) return;
  event.preventDefault();
  openShowcase(game, document.getElementById(`game-card-${game.id}`));
});
dialog.addEventListener('click', async event => {
  const link = event.target.closest('[data-roblox-category]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = null;
  await closeShowcase();
  location.hash = 'roblox-games';
  document.getElementById('roblox-games').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  document.getElementById('roblox-games-heading').focus({ preventScroll: true });
});

document.getElementById('game-close').addEventListener('click', closeShowcase);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeShowcase(); });
document.getElementById('game-prev').addEventListener('click', () => showPicture(pictureIndex - 1));
document.getElementById('game-next').addEventListener('click', () => showPicture(pictureIndex + 1));

function stopWheelScroll() {
  if (wheelScrollFrame) cancelAnimationFrame(wheelScrollFrame);
  wheelScrollFrame = 0;
  wheelScrollTarget = null;
  wheelScrollTime = 0;
}

function animateWheelScroll(time) {
  const elapsed = Math.max(0, Math.min(64, time - wheelScrollTime));
  wheelScrollTime = time;
  const maxScroll = Math.max(0, thumbs.scrollWidth - thumbs.clientWidth);
  wheelScrollTarget = Math.min(maxScroll, wheelScrollTarget);
  const distance = wheelScrollTarget - wheelScrollPosition;
  if (Math.abs(distance) <= 2) {
    thumbs.scrollTo({ left: wheelScrollTarget, behavior: 'instant' });
    stopWheelScroll();
    return;
  }
  wheelScrollPosition += distance * (1 - Math.exp(-elapsed / 75));
  thumbs.scrollTo({ left: wheelScrollPosition, behavior: 'instant' });
  wheelScrollFrame = requestAnimationFrame(animateWheelScroll);
}

thumbs.addEventListener('wheel', event => {
  // Keep horizontal trackpad gestures and browser zoom native.
  if (event.ctrlKey) return;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
    stopWheelScroll();
    return;
  }
  const maxScroll = thumbs.scrollWidth - thumbs.clientWidth;
  if (maxScroll <= 0) return;
  const start = wheelScrollTarget ?? thumbs.scrollLeft;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? thumbs.clientWidth : 1;
  const nextScroll = Math.max(0, Math.min(maxScroll, start + event.deltaY * unit));
  // Let the popup scroll normally once the strip reaches either end.
  if (Math.abs(nextScroll - start) < 1) return;
  event.preventDefault();
  if (reducedMotion.matches) {
    stopWheelScroll();
    thumbs.scrollTo({ left: nextScroll, behavior: 'instant' });
    return;
  }
  wheelScrollTarget = nextScroll;
  // Further wheel events update the target of this loop without restarting it.
  if (!wheelScrollFrame) {
    thumbs.scrollTo({ left: thumbs.scrollLeft, behavior: 'instant' });
    wheelScrollPosition = thumbs.scrollLeft;
    wheelScrollTime = performance.now();
    wheelScrollFrame = requestAnimationFrame(animateWheelScroll);
  }
}, { passive: false });
thumbs.addEventListener('pointerdown', () => {
  stopWheelScroll();
  thumbs.scrollTo({ left: thumbs.scrollLeft, behavior: 'instant' });
});
reducedMotion.addEventListener('change', stopWheelScroll);
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
  stopWheelScroll();
  document.body.classList.remove('game-showcase-open');
  opener?.focus({ preventScroll: true });
});
