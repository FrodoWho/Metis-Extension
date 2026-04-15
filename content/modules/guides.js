const guides = (() => {
  const EXT_ATTR    = 'data-measure-extension';
  const SNAP_PX     = 8; // snap threshold in px
  const lines       = [];
  let enabled       = false;
  let direction     = 'v'; // 'v' | 'h'
  let ghost         = null;
  let snapHighlight = null; // transient ring shown on snapped element
  let gapVisible    = false;

  // ── Snap helpers ─────────────────────────────────────────────

  /**
   * Given a raw cursor coordinate and the mouse event, returns the snapped
   * coordinate (clamped to the nearest element edge/center within SNAP_PX)
   * and the element being snapped to (null if no snap).
   * Shift key bypasses snapping.
   */
  function snapCoord(raw, e) {
    if (e.shiftKey) return { coord: raw, snapEl: null };

    const el = msrOverlay.elementAt(e.clientX, e.clientY);
    if (!el || el.hasAttribute(EXT_ATTR)) return { coord: raw, snapEl: null };

    const r    = el.getBoundingClientRect();
    const candidates = direction === 'v'
      ? [r.left, r.right, r.left + r.width  / 2]
      : [r.top,  r.bottom, r.top  + r.height / 2];

    let nearest = null;
    let dist    = Infinity;
    for (const c of candidates) {
      const d = Math.abs(raw - c);
      if (d < dist) { dist = d; nearest = c; }
    }

    if (dist <= SNAP_PX) return { coord: Math.round(nearest), snapEl: el };
    return { coord: raw, snapEl: null };
  }

  /** Show/hide a translucent ring around the element being snapped to. */
  function setSnapHighlight(el) {
    if (!el) {
      if (snapHighlight) snapHighlight.style.display = 'none';
      return;
    }
    if (!snapHighlight || !snapHighlight.isConnected) {
      snapHighlight = document.createElement('div');
      snapHighlight.setAttribute(EXT_ATTR, '');
      snapHighlight.classList.add('msr-snap-highlight');
      document.body.appendChild(snapHighlight);
    }
    const r = el.getBoundingClientRect();
    Object.assign(snapHighlight.style, {
      display: 'block',
      left:    r.left   + 'px',
      top:     r.top    + 'px',
      width:   r.width  + 'px',
      height:  r.height + 'px',
    });
  }

  // ── Guide creation / removal ─────────────────────────────────

  function createGuide(coord) {
    const container = document.createElement('div');
    container.setAttribute(EXT_ATTR, '');
    container.dataset.orient = direction;
    container.classList.add('msr-guide');

    if (direction === 'h') {
      container.classList.add('msr-guide-h');
      container.style.top = coord + 'px';
    } else {
      container.style.left = coord + 'px';
    }

    const line = document.createElement('div');
    line.classList.add('msr-guide-line');

    const hit = document.createElement('div');
    hit.classList.add('msr-guide-hit');
    hit.addEventListener('click', (e) => {
      e.stopPropagation();
      removeGuide(container);
    });

    const label = document.createElement('div');
    label.classList.add('msr-guide-label');
    label.textContent = `${Math.round(coord)}px`;

    container.appendChild(line);
    container.appendChild(hit);
    container.appendChild(label);
    document.body.appendChild(container);
    lines.push(container);

    if (gapVisible) renderGaps();
  }

  function removeGuide(container) {
    const idx = lines.indexOf(container);
    if (idx === -1) return;
    lines[idx].remove();
    lines.splice(idx, 1);
    if (gapVisible) renderGaps();
  }

  // ── Gap labels ───────────────────────────────────────────────

  function renderGaps() {
    document.querySelectorAll('.msr-gap-label[data-measure-extension]').forEach(el => el.remove());

    const vGuides = lines
      .filter(c => c.dataset.orient === 'v')
      .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));

    for (let i = 0; i < vGuides.length - 1; i++) {
      const x1 = parseFloat(vGuides[i].style.left);
      const x2 = parseFloat(vGuides[i + 1].style.left);
      const lbl = document.createElement('div');
      lbl.setAttribute(EXT_ATTR, '');
      lbl.classList.add('msr-gap-label');
      lbl.textContent = Math.round(x2 - x1) + 'px';
      lbl.style.left = ((x1 + x2) / 2) + 'px';
      lbl.style.top  = '50%';
      document.body.appendChild(lbl);
    }

    const hGuides = lines
      .filter(c => c.dataset.orient === 'h')
      .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

    for (let i = 0; i < hGuides.length - 1; i++) {
      const y1 = parseFloat(hGuides[i].style.top);
      const y2 = parseFloat(hGuides[i + 1].style.top);
      const lbl = document.createElement('div');
      lbl.setAttribute(EXT_ATTR, '');
      lbl.classList.add('msr-gap-label');
      lbl.textContent = Math.round(y2 - y1) + 'px';
      lbl.style.top  = ((y1 + y2) / 2) + 'px';
      lbl.style.left = '50%';
      document.body.appendChild(lbl);
    }
  }

  // ── Ghost ────────────────────────────────────────────────────

  function ensureGhost() {
    if (!document.body) return;
    if (ghost && ghost.isConnected) return;
    ghost = null;
    ghost = document.createElement('div');
    ghost.setAttribute(EXT_ATTR, '');
    ghost.classList.add('msr-guide', 'msr-guide-ghost');
    const line = document.createElement('div');
    line.classList.add('msr-guide-line');
    ghost.appendChild(line);
    document.body.appendChild(ghost);
  }

  function removeGhost() {
    if (!ghost) return;
    ghost.remove();
    ghost = null;
  }

  // ── Event handlers ───────────────────────────────────────────

  function onMouseMove(e) {
    ensureGhost();
    if (!ghost) return;

    const raw = direction === 'h' ? e.clientY : e.clientX;
    const { coord, snapEl } = snapCoord(raw, e);

    setSnapHighlight(snapEl);
    ghost.classList.toggle('msr-guide-snapped', !!snapEl);

    if (direction === 'h') {
      ghost.classList.add('msr-guide-h');
      ghost.style.top  = coord + 'px';
      ghost.style.left = '';
    } else {
      ghost.classList.remove('msr-guide-h');
      ghost.style.left = coord + 'px';
      ghost.style.top  = '';
    }
  }

  function onClick(e) {
    e.preventDefault();
    const raw   = direction === 'h' ? e.clientY : e.clientX;
    const { coord } = snapCoord(raw, e);
    createGuide(coord);
  }

  // ── Enable / disable ─────────────────────────────────────────

  function enable() {
    if (enabled) return;
    enabled = true;
    msrOverlay.setGuides(true);
    msrOverlay.el.addEventListener('mousemove', onMouseMove);
    msrOverlay.el.addEventListener('click', onClick);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    const overlayEl = msrOverlay.el;
    if (overlayEl) {
      overlayEl.removeEventListener('mousemove', onMouseMove);
      overlayEl.removeEventListener('click', onClick);
    }
    msrOverlay.setGuides(false);
    removeGhost();
    if (snapHighlight) { snapHighlight.remove(); snapHighlight = null; }
    lines.forEach(g => g.remove());
    lines.length = 0;
    document.querySelectorAll('.msr-gap-label[data-measure-extension]').forEach(el => el.remove());
  }

  function setDirection(d) {
    if (d === 'v' || d === 'h') direction = d;
  }

  function setGapVisible(v) {
    gapVisible = v;
    if (v) renderGaps();
    else document.querySelectorAll('.msr-gap-label[data-measure-extension]').forEach(el => el.remove());
  }

  function clearAll() {
    lines.forEach(g => g.remove());
    lines.length = 0;
    document.querySelectorAll('.msr-gap-label[data-measure-extension]').forEach(el => el.remove());
  }

  return { enable, disable, setDirection, setGapVisible, clearAll };
})();
