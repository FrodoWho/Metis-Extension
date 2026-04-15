const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null;
  let panel     = null;
  let hoverEl   = null;

  function isExtEl(el) {
    return el && el.hasAttribute && el.hasAttribute(EXT_ATTR);
  }

  function getBoxModel(el) {
    const r  = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),  h: Math.round(r.height),
      x: Math.round(r.left),   y: Math.round(r.top),
      padTop: cs.paddingTop,    padRight:    cs.paddingRight,
      padBottom: cs.paddingBottom, padLeft:  cs.paddingLeft,
      marTop: cs.marginTop,     marRight:    cs.marginRight,
      marBottom: cs.marginBottom, marLeft:   cs.marginLeft,
    };
  }

  function shorthand(top, right, bottom, left) {
    if (top === right && right === bottom && bottom === left) return top;
    if (top === bottom && right === left) return `${top} ${right}`;
    return `${top} ${right} ${bottom} ${left}`;
  }

  function showOverlay(el) {
    const r = el.getBoundingClientRect();

    Object.assign(highlight.style, {
      display: 'block',
      left:    r.left   + 'px',
      top:     r.top    + 'px',
      width:   r.width  + 'px',
      height:  r.height + 'px',
    });

    if (panel) { panel.remove(); panel = null; }
    const bm  = getBoxModel(el);
    const pad = shorthand(bm.padTop, bm.padRight, bm.padBottom, bm.padLeft);
    const mar = shorthand(bm.marTop, bm.marRight, bm.marBottom, bm.marLeft);

    const p = document.createElement('div');
    p.setAttribute(EXT_ATTR, '');
    p.classList.add('msr-panel');
    p.innerHTML = `
      <div class="msr-panel-title">Box Model</div>
      <div class="msr-panel-row"><span class="msr-panel-key">w</span><span>${bm.w}px</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">h</span><span>${bm.h}px</span></div>
      <div class="msr-panel-sep"></div>
      <div class="msr-panel-row"><span class="msr-panel-key">pad</span><span>${pad}</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">mar</span><span>${mar}</span></div>
      <div class="msr-panel-sep"></div>
      <div class="msr-panel-row"><span class="msr-panel-key">x</span><span>${bm.x}px</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">y</span><span>${bm.y}px</span></div>
    `;
    document.body.appendChild(p);
    panel = p;

    requestAnimationFrame(() => {
      if (panel !== p) return;
      const gap   = 8;
      const below = window.innerHeight - (r.top + r.height);
      panel.style.left = r.left + 'px';
      panel.style.top  = below >= panel.offsetHeight + gap
        ? (r.top + r.height + gap) + 'px'
        : (r.top - panel.offsetHeight - gap) + 'px';
    });
  }

  function hideOverlay() {
    hoverEl = null;
    if (highlight) highlight.style.display = 'none';
    if (panel) { panel.remove(); panel = null; }
  }

  function repositionOverlay() {
    if (!hoverEl || !highlight) return;
    const r = hoverEl.getBoundingClientRect();
    Object.assign(highlight.style, {
      left:   r.left   + 'px',
      top:    r.top    + 'px',
      width:  r.width  + 'px',
      height: r.height + 'px',
    });
    if (panel) {
      const gap   = 8;
      const below = window.innerHeight - (r.top + r.height);
      panel.style.left = r.left + 'px';
      panel.style.top  = below >= panel.offsetHeight + gap
        ? (r.top + r.height + gap) + 'px'
        : (r.top - panel.offsetHeight - gap) + 'px';
    }
  }

  function onMouseMove(e) {
    // Look through the overlay to find the actual page element under the cursor.
    const el = msrOverlay.elementAt(e.clientX, e.clientY);
    if (!el || isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    showOverlay(el);
  }

  function enable() {
    if (highlight) return;
    msrOverlay.setMeasure(true);
    highlight = document.createElement('div');
    highlight.setAttribute(EXT_ATTR, '');
    highlight.classList.add('msr-hover-highlight');
    highlight.style.display = 'none';
    document.body.appendChild(highlight);
    msrOverlay.el.addEventListener('mousemove', onMouseMove);
    document.addEventListener('scroll', repositionOverlay, true);
    window.addEventListener('resize', repositionOverlay);
  }

  function disable() {
    const overlayEl = msrOverlay.el;
    if (overlayEl) overlayEl.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('scroll', repositionOverlay, true);
    window.removeEventListener('resize', repositionOverlay);
    msrOverlay.setMeasure(false);
    if (highlight) { highlight.remove(); highlight = null; }
    if (panel)     { panel.remove();     panel     = null; }
    hoverEl = null;
  }

  return { enable, disable };
})();
