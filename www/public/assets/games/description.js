export function setupDescriptionDisclosure(dialog) {
  const panel = dialog.querySelector('#game-roblox-about');
  const overview = dialog.querySelector('#game-roblox-overview');
  const gallery = dialog.querySelector('.game-gallery');
  const layout = dialog.querySelector('.game-showcase-layout');
  const content = document.createElement('div');
  content.id = 'game-description-content';
  content.className = 'game-description-content';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game-description-toggle';
  button.setAttribute('aria-controls', content.id);
  button.innerHTML = '<span>Expand</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  panel.append(content, button);
  let expanded = false;
  let wideExpansion = false;
  let overflows = false;
  let limit = 0;
  let frame;

  function update() {
    if (!dialog.open || overview.hidden) return;
    if (!expanded) {
      // Let the preview reach the bottom of the gallery thumbnails.
      // Stacked layouts retain a compact preview below the gallery.
      const galleryBounds = gallery.getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      const besideGallery = panelBounds.left >= galleryBounds.right - 1;
      const available = besideGallery
        ? dialog.querySelector('#game-thumbnails').getBoundingClientRect().bottom - panelBounds.top
        : 220;
      limit = Math.max(160, available);
      panel.style.setProperty('--description-preview-height', `${limit}px`);
    }
    const padding = parseFloat(getComputedStyle(panel).paddingTop) * 2;
    const naturalHeight = content.scrollHeight + panel.querySelector('h3').offsetHeight + 16 + padding;
    if (!expanded) overflows = naturalHeight > limit + 1;
    panel.classList.toggle('is-collapsible', overflows);
    panel.classList.toggle('is-expanded', expanded);
    button.hidden = !overflows;
    button.setAttribute('aria-expanded', String(expanded));
    button.querySelector('span').textContent = expanded ? 'Collapse' : 'Expand';
    if (!expanded) wideExpansion = naturalHeight > Math.max(limit * 1.6, innerHeight * 0.7);
    const wide = expanded && wideExpansion;
    if (wide && panel.parentElement !== layout) layout.append(panel);
    if (!wide && panel.parentElement !== overview) overview.append(panel);
    panel.classList.toggle('is-wide', wide);
  }
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }
  button.addEventListener('click', () => {
    expanded = !expanded;
    update();
    button.focus({ preventScroll: true });
    if (expanded && wideExpansion) panel.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (!expanded) panel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  const observer = new ResizeObserver(schedule);
  observer.observe(gallery);
  observer.observe(dialog.querySelector('#game-roblox-details'));
  window.addEventListener('resize', schedule);
  return {
    content,
    reset() {
      expanded = false;
      overflows = false;
      overview.append(panel);
      panel.classList.remove('is-expanded', 'is-wide', 'is-collapsible');
      button.hidden = true;
      schedule();
    },
    update: schedule,
  };
}
