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
    ui.root.appendChild(el);
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

  return {
    setGuides,
    setMeasure,
    get el() { return el; },
  };
})();
