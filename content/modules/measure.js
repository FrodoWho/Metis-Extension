const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null;
  let hoverEl = null;
  const locks = []; // { el, nodes: { wLabel, hLabel, panel } }

  /* ── Helpers ────────────────────────────────────────────── */

  function isExtEl(el) {
    return el && el.hasAttribute && el.hasAttribute(EXT_ATTR);
  }

  function getBoxModel(el) {
    const r  = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w:          Math.round(r.width),
      h:          Math.round(r.height),
      x:          Math.round(r.left),
      y:          Math.round(r.top),
      padTop:     cs.paddingTop,
      padRight:   cs.paddingRight,
      padBottom:  cs.paddingBottom,
      padLeft:    cs.paddingLeft,
      marTop:     cs.marginTop,
      marRight:   cs.marginRight,
      marBottom:  cs.marginBottom,
      marLeft:    cs.marginLeft,
    };
  }

  // Compress four equal sides into CSS shorthand (e.g. "8px" or "8px 16px")
  function shorthand(top, right, bottom, left) {
    if (top === right && right === bottom && bottom === left) return top;
    if (top === bottom && right === left) return `${top} ${right}`;
    return `${top} ${right} ${bottom} ${left}`;
  }

  /* ── Overlay builders ───────────────────────────────────── */

  function createHighlight() {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-hover-highlight');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function makeLabel(text) {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-edge-label');
    el.textContent = text;
    document.body.appendChild(el);
    return el;
  }

  function makePanel(bm) {
    const pad = shorthand(bm.padTop, bm.padRight, bm.padBottom, bm.padLeft);
    const mar = shorthand(bm.marTop, bm.marRight, bm.marBottom, bm.marLeft);
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-panel');
    el.innerHTML = `
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
    document.body.appendChild(el);
    return el;
  }

  function positionNodes(nodes, bm) {
    const { wLabel, hLabel, panel } = nodes;

    // Width label: centred above the top edge
    wLabel.style.left = (bm.x + bm.w / 2 - wLabel.offsetWidth  / 2) + 'px';
    wLabel.style.top  = (bm.y - wLabel.offsetHeight - 4)              + 'px';

    // Height label: centred beside the right edge
    hLabel.style.left = (bm.x + bm.w + 6)                            + 'px';
    hLabel.style.top  = (bm.y + bm.h / 2 - hLabel.offsetHeight / 2)  + 'px';

    // Panel: below element if there is room, otherwise above
    const gap = 8;
    const spaceBelow = window.innerHeight - (bm.y + bm.h);
    panel.style.left = bm.x + 'px';
    panel.style.top  = spaceBelow >= panel.offsetHeight + gap
      ? (bm.y + bm.h + gap) + 'px'
      : (bm.y - panel.offsetHeight - gap) + 'px';
  }

  /* ── Lock / unlock ──────────────────────────────────────── */

  function lockEl(el) {
    sweepStaleLocks();
    const bm     = getBoxModel(el);
    const wLabel = makeLabel(`↔ ${bm.w}px`);
    const hLabel = makeLabel(`↕ ${bm.h}px`);
    const panel  = makePanel(bm);
    const nodes  = { wLabel, hLabel, panel };
    // Wait one frame so offsetWidth/Height reflect actual rendered size
    requestAnimationFrame(() => positionNodes(nodes, bm));
    locks.push({ el, nodes });
  }

  function unlockEl(el) {
    const idx = locks.findIndex(l => l.el === el);
    if (idx === -1) return;
    Object.values(locks[idx].nodes).forEach(n => n.remove());
    locks.splice(idx, 1);
  }

  function isLocked(el) {
    return locks.some(l => l.el === el);
  }

  function sweepStaleLocks() {
    for (let i = locks.length - 1; i >= 0; i--) {
      if (!document.contains(locks[i].el)) {
        Object.values(locks[i].nodes).forEach(n => n.remove());
        locks.splice(i, 1);
      }
    }
  }

  /* ── Event handlers ─────────────────────────────────────── */

  function onMouseMove(e) {
    const el = e.target;
    if (isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    const rect = el.getBoundingClientRect();
    highlight.style.left    = rect.left   + 'px';
    highlight.style.top     = rect.top    + 'px';
    highlight.style.width   = rect.width  + 'px';
    highlight.style.height  = rect.height + 'px';
    highlight.style.display = 'block';
  }

  function onClick(e) {
    if (e.target.closest && e.target.closest('[data-measure-extension]')) return;
    // Prevent the page's own click handlers and browser defaults (link navigation,
    // form submission) from firing while measure is active
    e.stopPropagation();
    e.preventDefault();
    isLocked(e.target) ? unlockEl(e.target) : lockEl(e.target);
  }

  /* ── Public API ─────────────────────────────────────────── */

  function enable() {
    if (highlight) return; // already enabled
    highlight = createHighlight();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click',     onClick,     true);
  }

  function disable() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click',     onClick,     true);
    highlight?.remove();
    highlight = null;
    hoverEl   = null;
    locks.forEach(({ nodes }) => Object.values(nodes).forEach(n => n.remove()));
    locks.length = 0;
  }

  return { enable, disable };
})();
