/**
 * A design mockup image laid over the page for pixel-perfect comparison.
 * It hangs from the top of the document so it scrolls with the page, is
 * clipped to the page width (no extra horizontal scrollbar) and never takes
 * the pointer, so measuring through it works.
 */
const mockup = (() => {
  let wrap = null;
  let img  = null;
  let url  = null;
  // scale: 2 for @2x exports. align: 'center' matches centered layouts at any
  // viewport width, 'left' matches when the viewport is the design width.
  const settings = { opacity: 0.5, scale: 1, align: 'center', diff: false };

  function apply() {
    if (!wrap) return;
    wrap.style.opacity        = settings.opacity;
    wrap.style.mixBlendMode   = settings.diff ? 'difference' : '';
    wrap.style.justifyContent = settings.align === 'left' ? 'flex-start' : 'center';
    img.style.width = img.naturalWidth ? (img.naturalWidth / settings.scale) + 'px' : '';
  }

  function load(file) {
    clear();
    url  = URL.createObjectURL(file);
    wrap = document.createElement('div');
    wrap.className = 'msr-mockup';
    img  = wrap.appendChild(document.createElement('img'));
    img.alt = '';
    img.addEventListener('load', apply, { once: true }); // width needs naturalWidth
    img.src = url;
    ui.root.appendChild(wrap);
    apply();
  }

  function set(partial) {
    Object.assign(settings, partial);
    apply();
  }

  function setVisible(on) {
    if (wrap) wrap.style.display = on ? '' : 'none';
  }

  function clear() {
    wrap?.remove();
    wrap = img = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
  }

  return { load, set, setVisible, clear, settings, get loaded() { return !!wrap; } };
})();
