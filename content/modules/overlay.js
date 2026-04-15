/**
 * Shared full-screen overlay div that sits above all page content (including
 * iframes) when any extension tool is active.  Both guides and measure attach
 * their event listeners here so no page element — ads, iframes, script-driven
 * buttons — can intercept the cursor first.
 */
const msrOverlay = (() => {
  let el           = null;
  let guidesActive = false;
  let measureActive = false;

  function create() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'msr-overlay';
    el.setAttribute('data-measure-extension', '');
    document.body.appendChild(el);
  }

  function destroy() {
    if (!el) return;
    el.remove();
    el = null;
  }

  function sync() {
    if (!guidesActive && !measureActive) {
      destroy();
    } else {
      create();
      el.style.cursor = guidesActive ? 'crosshair' : 'default';
    }
  }

  function setGuides(v)  { guidesActive  = v; sync(); }
  function setMeasure(v) { measureActive = v; sync(); }

  /**
   * Return the real page element under the cursor by briefly disabling the
   * overlay's pointer-events so elementFromPoint skips it.
   */
  function elementAt(x, y) {
    if (!el) return document.elementFromPoint(x, y);
    el.style.pointerEvents = 'none';
    const found = document.elementFromPoint(x, y);
    el.style.pointerEvents = '';
    return found;
  }

  return {
    setGuides,
    setMeasure,
    elementAt,
    get el() { return el; },
  };
})();
