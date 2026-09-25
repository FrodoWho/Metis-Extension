const guides = (() => {
  const SNAP_PX     = 8; // snap threshold in px
  const DRAG_PX     = 3; // movement before a press on a guide counts as a drag
  const lines       = []; // most recently placed/moved last (arrow keys nudge it)
  const gapLabels   = [];
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
  function snapCoord(raw, e, orient) {
    if (e.shiftKey) return { coord: raw, snapEl: null };

    const el = ui.elementAt(e.clientX, e.clientY);
    if (!el) return { coord: raw, snapEl: null };

    const r    = el.getBoundingClientRect();
    const candidates = orient === 'v'
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
    if (!snapHighlight) {
      snapHighlight = document.createElement('div');
      snapHighlight.classList.add('msr-snap-highlight');
      ui.root.appendChild(snapHighlight);
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

  function coordOf(container) {
    return parseFloat(container.dataset.orient === 'h' ? container.style.top : container.style.left);
  }

  function setCoord(container, coord) {
    container.style[container.dataset.orient === 'h' ? 'top' : 'left'] = coord + 'px';
    container.querySelector('.msr-guide-label').textContent = `${Math.round(coord)}px`;
    if (gapVisible) renderGaps();
  }

  function createGuide(coord) {
    const container = document.createElement('div');
    container.dataset.orient = direction;
    container.classList.add('msr-guide');
    if (direction === 'h') container.classList.add('msr-guide-h');

    const line = document.createElement('div');
    line.classList.add('msr-guide-line');

    const hit = document.createElement('div');
    hit.classList.add('msr-guide-hit');
    hit.addEventListener('pointerdown', (e) => startDrag(e, container, hit));

    const label = document.createElement('div');
    label.classList.add('msr-guide-label');

    container.append(line, hit, label);
    ui.root.appendChild(container);
    lines.push(container);
    setCoord(container, coord);
  }

  /** Drag a guide to move it. A press without movement removes it. */
  function startDrag(e, container, hit) {
    if (e.button !== 0) return;
    e.preventDefault();
    const orient = container.dataset.orient;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    function onMove(ev) {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_PX) return;
      moved = true;
      const raw = orient === 'h' ? ev.clientY : ev.clientX;
      setCoord(container, snapCoord(raw, ev, orient).coord);
    }

    if (ghost) ghost.style.display = 'none';
    hit.setPointerCapture(e.pointerId);
    hit.addEventListener('pointermove', onMove);
    hit.addEventListener('lostpointercapture', () => {
      hit.removeEventListener('pointermove', onMove);
      if (!moved) return removeGuide(container);
      lines.push(...lines.splice(lines.indexOf(container), 1));
    }, { once: true });
  }

  function removeGuide(container) {
    const idx = lines.indexOf(container);
    if (idx === -1) return;
    lines[idx].remove();
    lines.splice(idx, 1);
    if (gapVisible) renderGaps();
  }

  /** Move the most recently placed/moved guide of this orientation. */
  function nudge(orient, delta) {
    const guide = lines.findLast(c => c.dataset.orient === orient);
    if (!guide) return false;
    setCoord(guide, coordOf(guide) + delta);
    return true;
  }

  // ── Gap labels ───────────────────────────────────────────────

  function removeGapLabels() {
    gapLabels.forEach(el => el.remove());
    gapLabels.length = 0;
  }

  function addGapLabel(text, left, top) {
    const lbl = document.createElement('div');
    lbl.classList.add('msr-gap-label');
    lbl.textContent = text;
    lbl.style.left = left;
    lbl.style.top  = top;
    ui.root.appendChild(lbl);
    gapLabels.push(lbl);
  }

  function renderGaps() {
    removeGapLabels();

    for (const orient of ['v', 'h']) {
      const coords = lines
        .filter(c => c.dataset.orient === orient)
        .map(coordOf)
        .sort((a, b) => a - b);

      for (let i = 0; i < coords.length - 1; i++) {
        const mid  = ((coords[i] + coords[i + 1]) / 2) + 'px';
        const text = Math.round(coords[i + 1] - coords[i]) + 'px';
        if (orient === 'v') addGapLabel(text, mid, '50%');
        else                addGapLabel(text, '50%', mid);
      }
    }
  }

  // ── Ghost ────────────────────────────────────────────────────

  function ensureGhost() {
    if (ghost) return;
    ghost = document.createElement('div');
    ghost.classList.add('msr-guide', 'msr-guide-ghost');
    const line = document.createElement('div');
    line.classList.add('msr-guide-line');
    ghost.appendChild(line);
    ui.root.appendChild(ghost);
  }

  function removeGhost() {
    if (!ghost) return;
    ghost.remove();
    ghost = null;
  }

  // ── Event handlers ───────────────────────────────────────────

  function onMouseMove(e) {
    ensureGhost();

    const raw = direction === 'h' ? e.clientY : e.clientX;
    const { coord, snapEl } = snapCoord(raw, e, direction);

    setSnapHighlight(snapEl);
    ghost.style.display = '';
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
    const { coord } = snapCoord(raw, e, direction);
    createGuide(coord);
  }

  // ── Enable / disable ─────────────────────────────────────────

  function enable() {
    if (enabled) return;
    enabled = true;
    msrOverlay.setGuides(true);
    ui.host.classList.add('msr-guides-on');
    msrOverlay.el.addEventListener('mousemove', onMouseMove);
    msrOverlay.el.addEventListener('click', onClick);
  }

  /** Stop placing guides. Placed guides stay visible until clearAll(). */
  function disable() {
    if (!enabled) return;
    enabled = false;
    const overlayEl = msrOverlay.el;
    if (overlayEl) {
      overlayEl.removeEventListener('mousemove', onMouseMove);
      overlayEl.removeEventListener('click', onClick);
    }
    msrOverlay.setGuides(false);
    ui.host.classList.remove('msr-guides-on');
    removeGhost();
    if (snapHighlight) { snapHighlight.remove(); snapHighlight = null; }
  }

  function setDirection(d) {
    if (d === 'v' || d === 'h') direction = d;
  }

  function setGapVisible(v) {
    gapVisible = v;
    if (v) renderGaps();
    else   removeGapLabels();
  }

  function clearAll() {
    lines.forEach(g => g.remove());
    lines.length = 0;
    removeGapLabels();
  }

  return { enable, disable, setDirection, setGapVisible, clearAll, nudge };
})();
