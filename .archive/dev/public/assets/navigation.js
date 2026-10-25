(() => {
  const root = document.documentElement;
  let fallback;
  let cleanup;

  function reset() {
    clearTimeout(fallback);
    clearTimeout(cleanup);
    delete root.dataset.navigationState;
  }

  function finish() {
    if (root.dataset.navigationState !== 'loading') return;
    clearTimeout(fallback);
    root.dataset.navigationState = 'finishing';
    cleanup = setTimeout(reset, 350);
  }

  function start() {
    reset();
    root.dataset.navigationState = 'loading';
    // Recover if a navigation is cancelled or a resource never finishes loading.
    fallback = setTimeout(finish, 8000);
  }

  function isPageNavigation(url) {
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const ownSite = url.origin === location.origin;
    const paryxSite =
      url.hostname === 'paryx.uk' || url.hostname.endsWith('.paryx.uk');
    if (!ownSite && !paryxSite) return false;
    // Anchors and links to the current page do not load a new document.
    return (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.search !== location.search
    );
  }

  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (
      !link ||
      link.hasAttribute('download') ||
      (link.target && link.target.toLowerCase() !== '_self')
    )
      return;
    if (isPageNavigation(new URL(link.href, location.href))) start();
  });

  window.addEventListener('load', finish, { once: true });
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) reset();
  });
  start();
  if (document.readyState === 'complete') finish();
})();
