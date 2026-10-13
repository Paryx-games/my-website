export function setupDescriptionDisclosure(dialog) {
  const panel = dialog.querySelector('#game-roblox-about');
  const overview = dialog.querySelector('#game-roblox-overview');
  const gallery = dialog.querySelector('.game-gallery');
  const sidebar = dialog.querySelector('.game-sidebar');
  const content = document.createElement('div');
  content.id = 'game-description-content';
  content.className = 'game-description-content';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game-description-toggle';
  button.setAttribute('aria-controls', content.id);
  button.innerHTML = '<span>Expand</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  panel.append(content, button);
  const popup = document.createElement('dialog');
  popup.id = 'game-description-popup';
  popup.setAttribute('aria-labelledby', 'game-description-popup-title');
  popup.innerHTML = '<header><h2 id="game-description-popup-title"></h2><button type="button" aria-label="Close description">Close <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="game-description-popup-body" tabindex="0"></div>';
  document.body.append(popup);
  const popupBody = popup.querySelector('.game-description-popup-body');
  popup.querySelector('button').addEventListener('click', () => popup.close());
  popup.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    popup.close();
  });
  popup.addEventListener('cancel', event => {
    event.preventDefault();
    popup.close();
  });
  popup.addEventListener('click', event => {
    if (event.target !== popup) return;
    const bounds = popup.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) popup.close();
  });
  popup.addEventListener('close', () => {
    if (dialog.open && !overview.hidden) button.focus({ preventScroll: true });
  });
  dialog.addEventListener('close', () => { if (popup.open) popup.close(); });
  let expanded = false;
  let popupRequired = false;
  let overflows = false;
  let limit = 0;
  let frame;

  function update() {
    if (!dialog.open || overview.hidden) return;
    if (!expanded) {
      // Use the taller of the info sidebar and gallery thumbnails.
      // Stacked layouts retain a compact preview below the gallery.
      const galleryBounds = gallery.getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      const besideGallery = panelBounds.left >= galleryBounds.right - 1;
      const available = besideGallery
        ? Math.max(sidebar.getBoundingClientRect().bottom, dialog.querySelector('#game-thumbnails').getBoundingClientRect().bottom) - panelBounds.top
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
    if (!expanded) popupRequired = naturalHeight - limit > Math.max(120, limit * 0.35) || naturalHeight > innerHeight * 0.65;
    button.setAttribute('aria-controls', popupRequired ? popup.id : content.id);
    if (popupRequired) button.setAttribute('aria-haspopup', 'dialog');
    else button.removeAttribute('aria-haspopup');
    if (popup.open) popupBody.textContent = content.textContent;
  }
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }
  button.addEventListener('click', () => {
    if (!expanded && popupRequired) {
      popup.querySelector('h2').textContent = `${dialog.querySelector('#game-title').textContent} - About this experience`;
      popupBody.textContent = content.textContent;
      popup.style.setProperty('--game-accent', getComputedStyle(dialog).getPropertyValue('--game-accent'));
      popup.showModal();
      popupBody.scrollTop = 0;
      return;
    }
    expanded = !expanded;
    update();
    button.focus({ preventScroll: true });
    if (!expanded) panel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  const observer = new ResizeObserver(schedule);
  observer.observe(gallery);
  observer.observe(sidebar);
  observer.observe(dialog.querySelector('#game-roblox-details'));
  window.addEventListener('resize', schedule);
  return {
    content,
    reset() {
      if (popup.open) popup.close();
      expanded = false;
      overflows = false;
      panel.classList.remove('is-expanded', 'is-collapsible');
      button.hidden = true;
      schedule();
    },
    update: schedule,
  };
}
