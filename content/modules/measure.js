const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null; // blue hover ring
  let panel     = null; // hover panel
  let hoverEl   = null;
  const locks   = [];   // [{ el, ring, panel }]

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

  function buildPanelEl(bm, locked) {
    const pad = shorthand(bm.padTop, bm.padRight, bm.padBottom, bm.padLeft);
    const mar = shorthand(bm.marTop, bm.marRight, bm.marBottom, bm.marLeft);
    const p = document.createElement('div');
    p.setAttribute(EXT_ATTR, '');
    p.classList.add('msr-panel');
    if (locked) p.classList.add('msr-panel-locked');
    p.innerHTML = `
      <div class="msr-panel-title">${locked ? 'Locked' : 'Box Model'}</div>
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
    return p;
  }

  function positionPanel(p, r) {
    const gap   = 8;
    const below = window.innerHeight - (r.top + r.height);
    p.style.left = r.left + 'px';
    p.style.top  = below >= p.offsetHeight + gap
      ? (r.top + r.height + gap) + 'px'
      : (r.top - p.offsetHeight - gap) + 'px';
  }

  // ── Hover overlay ────────────────────────────────────────────

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
    panel = buildPanelEl(getBoxModel(el), false);
    const p = panel;
    requestAnimationFrame(() => { if (panel === p) positionPanel(p, r); });
  }

  // ── Lock / unlock ────────────────────────────────────────────

  function isLocked(el) {
    return locks.some(l => l.el === el);
  }

  function lockEl(el) {
    if (isLocked(el)) return;
    const bm = getBoxModel(el);
    const r  = el.getBoundingClientRect();

    const ring = document.createElement('div');
    ring.setAttribute(EXT_ATTR, '');
    ring.classList.add('msr-lock-ring');
    Object.assign(ring.style, {
      left: r.left + 'px', top: r.top + 'px',
      width: r.width + 'px', height: r.height + 'px',
    });
    document.body.appendChild(ring);

    const p = buildPanelEl(bm, true);
    requestAnimationFrame(() => positionPanel(p, r));

    locks.push({ el, ring, panel: p });
  }

  function unlockEl(el) {
    const idx = locks.findIndex(l => l.el === el);
    if (idx === -1) return;
    locks[idx].ring.remove();
    locks[idx].panel.remove();
    locks.splice(idx, 1);
  }

  // ── Reposition on scroll / resize ───────────────────────────

  function repositionAll() {
    // Hover highlight
    if (hoverEl && highlight) {
      const r = hoverEl.getBoundingClientRect();
      Object.assign(highlight.style, {
        left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px',
      });
      if (panel) positionPanel(panel, r);
    }

    // Locked elements — sweep stale first
    for (let i = locks.length - 1; i >= 0; i--) {
      if (!document.contains(locks[i].el)) {
        locks[i].ring.remove();
        locks[i].panel.remove();
        locks.splice(i, 1);
      }
    }
    for (const lock of locks) {
      const r = lock.el.getBoundingClientRect();
      Object.assign(lock.ring.style, {
        left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px',
      });
      positionPanel(lock.panel, r);
    }
  }

  // ── Event handlers ───────────────────────────────────────────

  function onMouseMove(e) {
    const el = msrOverlay.elementAt(e.clientX, e.clientY);
    if (!el || isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    showOverlay(el);
  }

  function onClick(e) {
    const el = msrOverlay.elementAt(e.clientX, e.clientY);
    if (!el || isExtEl(el)) return;
    isLocked(el) ? unlockEl(el) : lockEl(el);
  }

  // ── Public API ───────────────────────────────────────────────

  function enable() {
    if (highlight) return;
    msrOverlay.setMeasure(true);
    highlight = document.createElement('div');
    highlight.setAttribute(EXT_ATTR, '');
    highlight.classList.add('msr-hover-highlight');
    highlight.style.display = 'none';
    document.body.appendChild(highlight);
    msrOverlay.el.addEventListener('mousemove', onMouseMove);
    msrOverlay.el.addEventListener('click', onClick);
    document.addEventListener('scroll', repositionAll, true);
    window.addEventListener('resize', repositionAll);
  }

  function disable() {
    const overlayEl = msrOverlay.el;
    if (overlayEl) {
      overlayEl.removeEventListener('mousemove', onMouseMove);
      overlayEl.removeEventListener('click', onClick);
    }
    document.removeEventListener('scroll', repositionAll, true);
    window.removeEventListener('resize', repositionAll);
    msrOverlay.setMeasure(false);
    if (highlight) { highlight.remove(); highlight = null; }
    if (panel)     { panel.remove();     panel     = null; }
    locks.forEach(({ ring, panel: p }) => { ring.remove(); p.remove(); });
    locks.length = 0;
    hoverEl = null;
  }

  return { enable, disable };
})();
