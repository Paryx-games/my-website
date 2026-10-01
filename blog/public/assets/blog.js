const dialog = document.querySelector('#search-dialog');
const dialogInput = document.querySelector('#dialog-search');
const results = document.querySelector('.search-results');
const status = document.querySelector('.search-status');
let indexPromise;
let queryVersion = 0;

function loadIndex() {
  indexPromise ??= fetch('/search-index.json')
    .then((response) => {
      if (!response.ok) throw new Error('Search unavailable');
      return response.json();
    })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  return indexPromise;
}

async function search(query) {
  const version = ++queryVersion;
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  results.replaceChildren();
  if (!words.length) {
    status.textContent = 'Search by title, topic, or author.';
    return;
  }
  status.textContent = 'Searching…';
  try {
    const posts = await loadIndex();
    if (version !== queryVersion) return;
    const matches = posts.filter((post) => {
      const text = [post.title, post.description, ...post.tags, ...post.authors]
        .join(' ')
        .toLowerCase();
      return words.every((word) => text.includes(word));
    });
    status.textContent = `${matches.length} ${matches.length === 1 ? 'article' : 'articles'} found.`;
    for (const post of matches) {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = post.url;
      const title = document.createElement('strong');
      title.textContent = post.title;
      const description = document.createElement('p');
      description.textContent = post.description;
      link.append(title, description);
      results.append(link);
    }
  } catch {
    if (version === queryVersion)
      status.textContent = 'Search could not load. Please try again.';
  }
}

document
  .querySelector('[data-open-search]')
  ?.addEventListener('click', (event) => {
    if (!dialog?.showModal) return;
    event.preventDefault();
    dialog.showModal();
    dialogInput.focus();
  });
document
  .querySelector('[data-close-search]')
  ?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
dialogInput?.addEventListener('input', () => search(dialogInput.value));
dialog?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.close();
  }
});
dialogInput?.form?.addEventListener('submit', (event) => {
  event.preventDefault();
  search(dialogInput.value);
});

function filterListing(query) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  document.querySelectorAll('[data-search-text]').forEach((post) => {
    post.hidden = !words.every((word) =>
      post.dataset.searchText.includes(word),
    );
    if (!post.hidden) count++;
  });
  const empty = document.querySelector('[data-empty-search]');
  if (empty) empty.hidden = count > 0 || words.length === 0;
  const banner = document.querySelector('.featured-banner');
  if (banner) banner.hidden = words.length > 0;
}

document
  .querySelectorAll('.search-form input:not(#dialog-search)')
  .forEach((input) => {
    const handleSearch = () => {
      if (document.querySelector('[data-post-list]'))
        filterListing(input.value);
      else {
        dialog.showModal();
        dialogInput.value = input.value;
        dialogInput.focus();
        search(input.value);
      }
    };
    input.addEventListener('input', handleSearch);
    input.form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleSearch();
    });
  });
const initialQuery = new URLSearchParams(location.search).get('q');
if (initialQuery && document.querySelector('[data-post-list]')) {
  document
    .querySelectorAll('.search-form input:not(#dialog-search)')
    .forEach((input) => {
      input.value = initialQuery;
    });
  filterListing(initialQuery);
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const block = button.closest('.code-block');
    const code = block.querySelector('pre').textContent;
    const message = block.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied';
      message.textContent = 'Code copied to clipboard.';
    } catch {
      button.textContent = 'Select code';
      const range = document.createRange();
      range.selectNodeContents(block.querySelector('pre'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message.textContent =
        'Copy unavailable. Code selected; use your keyboard or browser to copy.';
    }
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2500);
  });
});

document.querySelectorAll('.mobile-nav').forEach((menu) => {
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
