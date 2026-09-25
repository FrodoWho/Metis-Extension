/**
 * All extension UI lives in one shadow root on <html>. Page CSS can't restyle
 * it, a transform on <body> can't shift it, and page hit-testing only ever
 * sees the single host element.
 */
const ui = (() => {
  let host = null;
  let root = null;

  /**
   * A modal <dialog> makes everything outside it inert (no clicks, no hit
   * testing), so live inside the topmost one while it's open.
   * ponytail: "topmost" = last in DOM order; stacked modals opened out of
   * DOM order would pick the wrong one.
   */
  function home() {
    const modals = document.querySelectorAll('dialog:modal');
    return modals[modals.length - 1] ?? document.documentElement;
  }

  function ensure() {
    if (!host) {
      host = document.createElement('metis-root');
      root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = MSR_CSS;
      root.appendChild(style);
      new MutationObserver(ensure).observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['open'],
      });
    }
    // (Re-)attach, keeping all UI, when the page wiped it out or a modal
    // dialog opened or closed.
    const parent = home();
    if (host.parentNode !== parent) parent.appendChild(host);
  }

  /** Topmost page element at (x, y), looking through all extension UI. */
  function elementAt(x, y) {
    return document.elementsFromPoint(x, y).find(el => el !== host) ?? null;
  }

  /** chrome.storage.local, shared across sites. Never throws. */
  const store = {
    async get(key, fallback) {
      try { return (await chrome.storage.local.get(key))[key] ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { chrome.storage.local.set({ [key]: value }).catch(() => {}); }
      catch { /* extension reloaded underneath the page */ }
    },
  };

  return {
    get root() { ensure(); return root; },
    get host() { ensure(); return host; },
    elementAt,
    store,
  };
})();
