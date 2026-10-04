export function createImageLoader(createImage = () => new Image()) {
  const versions = new WeakMap();
  return async function loadImage(element, src, { shell = element, onReady, onError } = {}) {
    const version = (versions.get(element) || 0) + 1;
    versions.set(element, version);
    element.getAnimations?.().forEach(animation => animation.cancel());
    element.removeAttribute('src');
    element.classList.add('is-loading');
    shell.classList.remove('is-error');
    shell.classList.add('is-loading');
    shell.setAttribute('aria-busy', 'true');
    try {
      const pending = createImage();
      pending.src = src;
      await pending.decode();
      if (versions.get(element) !== version) return;
      element.src = src;
      element.classList.remove('is-loading');
      shell.classList.remove('is-loading');
      shell.setAttribute('aria-busy', 'false');
      onReady?.();
    } catch {
      if (versions.get(element) !== version) return;
      element.classList.remove('is-loading');
      shell.classList.remove('is-loading');
      shell.classList.add('is-error');
      shell.setAttribute('aria-busy', 'false');
      onError?.();
    }
  };
}

export const loadGameImage = createImageLoader();
