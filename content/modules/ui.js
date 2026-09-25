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

  /**
   * Topmost page element at (x, y), looking through all extension UI and
   * into open shadow roots (web components).
   */
  function elementAt(x, y) {
    const notUs = e => e !== host;
    let el = document.elementsFromPoint(x, y).find(notUs) ?? null;
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementsFromPoint(x, y).find(notUs);
      if (!inner || !el.shadowRoot.contains(inner)) break;
      el = inner;
    }
    return el;
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

  /** Write text to the clipboard; resolves to whether it worked. */
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // No async clipboard on insecure (http) pages: fall back to execCommand
      const ta = document.createElement('textarea');
      ta.value = text;
      root.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  let toastTimer = null;
  function toast(text) {
    ensure();
    let t = root.querySelector('.msr-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'msr-toast';
      t.setAttribute('role', 'status');
      root.appendChild(t);
    }
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 1500);
  }

  return {
    get root() { ensure(); return root; },
    get host() { ensure(); return host; },
    elementAt,
    store,
    copy,
    toast,
  };
})();
