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
