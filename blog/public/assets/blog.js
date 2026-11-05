document.querySelectorAll('[data-code-group]').forEach((group) => {
  const tabs = [...group.querySelectorAll('[data-code-tab]')];
  const panels = [...group.querySelectorAll('[data-code-panel]')];
  if (!tabs.length || !panels.length) return;

  const select = (selectedTab) => {
    tabs.forEach((tab) => {
      const active = tab === selectedTab;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== selectedTab.getAttribute('aria-controls');
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft')
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[nextIndex].focus();
      select(tabs[nextIndex]);
    });
  });

  const initiallySelected =
    tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
  group.setAttribute('data-enhanced', '');
  select(initiallySelected);
});

document.querySelectorAll('[data-category-list]').forEach((list) => {
  const section = list.closest('.category-section');
  const toggle = section?.querySelector('[data-category-toggle]');
  const items = [...list.querySelectorAll('[data-category-item]')];
  const visibleCount = Number(list.dataset.visibleCount);
  const collapsedHeight = 280;
  if (
    !toggle ||
    !Number.isInteger(visibleCount) ||
    items.length <= visibleCount
  )
    return;

  const setExpanded = (expanded, animate = false) => {
    items.forEach((item, index) => {
      const isExtra = index >= visibleCount;
      item.hidden = isExtra && !expanded;
      if (isExtra && expanded && animate) item.dataset.revealed = '';
      else delete item.dataset.revealed;
    });
    if (expanded) delete list.dataset.collapsed;
    else list.dataset.collapsed = '';
    list.style.maxHeight = expanded ? 'none' : `${collapsedHeight}px`;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Show less' : 'Show more';
  };

  setExpanded(false);
  list.style.maxHeight = `${collapsedHeight}px`;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true', true);
  });
});

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

const chapterRail = document.querySelector('.chapter-rail');
if (chapterRail) {
  const links = [...chapterRail.querySelectorAll('a')];
  const chapters = links.map((link) =>
    document.getElementById(decodeURIComponent(link.hash.slice(1))),
  );
  const highlight = (index) => {
    links.forEach((link, position) => {
      if (index === null) delete link.dataset.distance;
      else link.dataset.distance = String(Math.abs(index - position));
    });
  };
  links.forEach((link, index) => {
    link.addEventListener('mouseenter', () => highlight(index));
    link.addEventListener('focus', () => highlight(index));
  });
  chapterRail.addEventListener('mouseleave', () => {
    const focused = links.indexOf(document.activeElement);
    highlight(focused < 0 ? null : focused);
  });
  chapterRail.addEventListener('focusout', (event) => {
    if (!chapterRail.contains(event.relatedTarget)) highlight(null);
  });
  let frame = 0;
  const update = () => {
    frame = 0;
    const atBottom =
      scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    let active = 0;
    chapters.forEach((chapter, index) => {
      if (chapter && chapter.getBoundingClientRect().top <= innerHeight * 0.35)
        active = index;
    });
    if (atBottom) active = links.length - 1;
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  update();
}
