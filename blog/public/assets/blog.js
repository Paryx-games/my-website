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
