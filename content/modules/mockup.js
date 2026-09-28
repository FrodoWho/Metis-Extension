/**
 * A design mockup image laid over the page for pixel-perfect comparison.
 * It hangs from the top of the document so it scrolls with the page, is
 * clipped to the page width (no extra horizontal scrollbar) and never takes
 * the pointer, so measuring through it works.
 *
 * The image is decoded locally and drawn on a canvas: no URL is loaded, so a
 * strict page CSP (img-src) can't block it, which it would in Firefox.
 */
const mockup = (() => {
  let wrap   = null;
  let canvas = null;
  // scale: 2 for @2x exports. align: 'center' matches centered layouts at any
  // viewport width, 'left' matches when the viewport is the design width.
  const settings = { opacity: 0.5, scale: 1, align: 'center', diff: false };

  function apply() {
    if (!wrap) return;
    wrap.style.opacity        = settings.opacity;
    wrap.style.mixBlendMode   = settings.diff ? 'difference' : '';
    wrap.style.justifyContent = settings.align === 'left' ? 'flex-start' : 'center';
    canvas.style.width = (canvas.width / settings.scale) + 'px';
  }

  async function load(file) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      ui.toast('Could not read that image');
      return;
    }
    clear();
    wrap = document.createElement('div');
    wrap.className = 'msr-mockup';
    canvas = wrap.appendChild(document.createElement('canvas'));
    canvas.width  = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close();
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
    wrap = canvas = null;
  }

  return { load, set, setVisible, clear, settings, get loaded() { return !!wrap; } };
})();
