export const shortcuts = [
  {
    title: 'Home',
    description: 'The main paryx website.',
    url: 'https://paryx.uk/',
    keywords: 'website home',
  },
  {
    title: 'Projects',
    description: 'Tools, software, and experiments.',
    url: 'https://paryx.uk/#projects',
    keywords: 'roblox manager rust tools software code',
  },
  {
    title: 'About me',
    description: 'Get to know paryx.',
    url: 'https://paryx.uk/#about',
    keywords: 'author personal about paryx',
  },
  {
    title: 'Blog',
    description: 'All posts, notes, and updates.',
    url: 'https://blog.paryx.uk/',
    keywords: 'articles writing posts blog',
  },
  {
    title: 'Contact',
    description: 'Find ways to get in touch.',
    url: 'https://paryx.uk/#contacts',
    keywords: 'email discord contact links',
  },
  {
    title: 'RSS feed',
    description: 'Follow new blog posts in your feed reader.',
    url: 'https://blog.paryx.uk/rss.xml',
    keywords: 'rss feed follow',
  },
];

const historyKey = 'paryx-search-history-v1';
export function matches(entry, query) {
  const text = [
    entry.title,
    entry.description,
    entry.keywords ?? '',
    entry.text ?? '',
    ...(entry.tags ?? []),
    ...(entry.authors ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
export function readHistory(storage) {
  try {
    const history = JSON.parse(storage.getItem(historyKey) ?? '[]');
    return Array.isArray(history)
      ? history
          .filter(
            (value) =>
              typeof value === 'string' && value.trim() && value.length <= 80,
          )
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}
export function remember(storage, query) {
  const value = query.trim().slice(0, 80);
  if (!value) return;
  try {
    storage.setItem(
      historyKey,
      JSON.stringify(
        [
          value,
          ...readHistory(storage).filter(
            (previous) => previous.toLowerCase() !== value.toLowerCase(),
          ),
        ].slice(0, 5),
      ),
    );
  } catch {
    /* Search also works when storage is unavailable. */
  }
}
export function clearHistory(storage) {
  try {
    storage.removeItem(historyKey);
  } catch {
    /* Private browsing may disable storage. */
  }
}

function setup() {
  const dialog = document.querySelector('#search-dialog');
  if (!dialog) return;
  const input = dialog.querySelector('input[type="search"]');
  const results = dialog.querySelector('.search-results');
  const status = dialog.querySelector('.search-status');
  const quick = dialog.querySelector('[data-search-shortcuts]');
  const recent = dialog.querySelector('[data-search-history]');
  let version = 0;
  let indexPromise;
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* Browsers can disable local storage. */
  }

  function choice(entry, kind) {
    const link = document.createElement('a');
    link.className = 'site-search-result';
    link.href = entry.url;
    link.dataset.searchChoice = '';
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const description = document.createElement('span');
    description.textContent = entry.description;
    const label = document.createElement('small');
    label.textContent = kind;
    link.append(title, description, label);
    link.addEventListener('click', (event) => {
      remember(storage, input.value);
      if (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      )
        dialog.close();
    });
    return link;
  }
  function history() {
    const entries = readHistory(storage);
    recent.hidden = entries.length === 0 || Boolean(input.value.trim());
    const list = recent.querySelector('[data-history-list]');
    list.replaceChildren();
    for (const query of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = query;
      button.dataset.searchChoice = '';
      button.addEventListener('click', () => {
        input.value = query;
        input.focus();
        void search(query);
      });
      list.append(button);
    }
  }
  function loadIndex() {
    indexPromise ??= fetch(dialog.dataset.searchIndex, { credentials: 'omit' })
      .then((response) => {
        if (!response.ok) throw new Error('Blog unavailable');
        return response.json();
      })
      .then((posts) => {
        if (!Array.isArray(posts)) throw new Error('Invalid index');
        return posts
          .filter(
            (post) =>
              typeof post.title === 'string' &&
              typeof post.description === 'string' &&
              /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.url),
          )
          .map((post) => ({
            ...post,
            url: new URL(post.url, 'https://blog.paryx.uk').href,
          }));
      })
      .catch((error) => {
        indexPromise = undefined;
        throw error;
      });
    return indexPromise;
  }
  async function search(query) {
    const current = ++version;
    const value = query.trim();
    history();
    quick.hidden = Boolean(value);
    results.replaceChildren();
    if (!value) {
      status.textContent =
        'Jump to a page, or search pages and published articles.';
      return;
    }
    const pages = shortcuts.filter((entry) => matches(entry, value));
    results.append(...pages.map((entry) => choice(entry, 'Page')));
    status.textContent = 'Searching…';
    try {
      const posts = await loadIndex();
      if (current !== version) return;
      const found = posts.filter((entry) => matches(entry, value));
      results.append(...found.map((entry) => choice(entry, 'Article')));
      const count = pages.length + found.length;
      status.textContent = count
        ? `${count} ${count === 1 ? 'result' : 'results'} found.`
        : 'No results. Try a project, topic, or author.';
    } catch {
      if (current === version)
        status.textContent =
          'Blog results could not load. Page shortcuts are still available; try again in a moment.';
    }
  }
  function open(query = input.value) {
    if (!dialog.open) dialog.showModal();
    input.value = query;
    input.focus();
    void search(query);
  }
  quick
    .querySelector('[data-shortcut-list]')
    .append(...shortcuts.map((entry) => choice(entry, 'Page')));
  document.querySelectorAll('[data-open-search]').forEach((link) =>
    link.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    }),
  );
  dialog
    .querySelector('[data-close-search]')
    .addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const choices = [...dialog.querySelectorAll('[data-search-choice]')].filter(
      (choice) => choice.getClientRects().length,
    );
    if (!choices.length) return;
    event.preventDefault();
    const position = choices.indexOf(document.activeElement);
    const next =
      position < 0
        ? event.key === 'ArrowDown'
          ? 0
          : choices.length - 1
        : (position + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) %
          choices.length;
    choices[next].focus();
  });
  input.addEventListener('input', () => {
    void search(input.value);
  });
  input.form.addEventListener('submit', (event) => {
    event.preventDefault();
    remember(storage, input.value);
    void search(input.value);
  });
  dialog.querySelector('[data-clear-history]').addEventListener('click', () => {
    clearHistory(storage);
    history();
    input.focus();
  });
  const query = new URLSearchParams(location.search).get('q');
  if (query) open(query.slice(0, 200));
}
if (typeof document !== 'undefined') setup();
