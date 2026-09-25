/**
 * All extension UI lives in one shadow root on <html>. Page CSS can't restyle
 * it, a transform on <body> can't shift it, and page hit-testing only ever
 * sees the single host element.
 */
const ui = (() => {
  let host = null;
  let root = null;

  function ensure() {
    if (!host) {
      host = document.createElement('metis-root');
      root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = MSR_CSS;
      root.appendChild(style);
    }
    // Re-attach (keeping all UI) if the page wiped it out.
    if (!host.isConnected) document.documentElement.appendChild(host);
  }

  /** Topmost page element at (x, y), looking through all extension UI. */
  function elementAt(x, y) {
    return document.elementsFromPoint(x, y).find(el => el !== host) ?? null;
  }

  return {
    get root() { ensure(); return root; },
    get host() { ensure(); return host; },
    elementAt,
  };
})();
