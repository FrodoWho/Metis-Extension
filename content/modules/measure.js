const measure = (() => {
  let highlight = null; // blue hover ring
  let marginBox = null; // orange margin band (DevTools style)
  let padBox    = null; // green padding band
  let panel     = null; // hover panel
  let hoverEl   = null; // selected element (may be an ancestor of pointEl)
  let pointEl   = null; // deepest element under the cursor
  const childStack = []; // elements left behind by selectParent()
  const locks      = []; // [{ el, ring, panel }]
  const distEls    = []; // distance lines + labels

  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList[0]) s += '.' + el.classList[0];
    return s;
  }

  function hasOwnText(el) {
    return [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  }

  /** rgb(a) → #rrggbb (plus alpha %). Other color syntaxes pass through. */
  function toHex(color) {
    const m = color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
    if (!m) return color;
    const hex = '#' + m.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('');
    return m[4] === undefined ? hex : `${hex} ${Math.round(m[4] * 100)}%`;
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
      // Typography only where the element renders text itself; on wrappers
      // it would just echo inherited values.
      type: hasOwnText(el) ? {
        font:   `${cs.fontSize} / ${cs.lineHeight} · ${cs.fontWeight}`,
        family: cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''),
        color:  cs.color,
      } : null,
    };
  }

  function shorthand(top, right, bottom, left) {
    if (top === right && right === bottom && bottom === left) return top;
    if (top === bottom && right === left) return `${top} ${right}`;
    return `${top} ${right} ${bottom} ${left}`;
  }

  function panelRow(key, value, swatch) {
    const row = document.createElement('div');
    row.className = 'msr-panel-row';
    const k = document.createElement('span');
    k.className = 'msr-panel-key';
    k.textContent = key;
    const v = document.createElement('span');
    v.className = 'msr-panel-val';
    if (swatch) {
      const s = document.createElement('span');
      s.className = 'msr-swatch';
      s.style.background = swatch;
      v.appendChild(s);
    }
    v.append(value);
    row.appendChild(k);
    row.appendChild(v);
    return row;
  }

  function panelSep() {
    const s = document.createElement('div');
    s.className = 'msr-panel-sep';
    return s;
  }

  function buildPanelEl(el, locked) {
    const bm  = getBoxModel(el);
    const pad = shorthand(bm.padTop, bm.padRight, bm.padBottom, bm.padLeft);
    const mar = shorthand(bm.marTop, bm.marRight, bm.marBottom, bm.marLeft);
    const p = document.createElement('div');
    p.classList.add('msr-panel');
    if (locked) p.classList.add('msr-panel-locked');

    const title = document.createElement('div');
    title.className = 'msr-panel-title';
    title.textContent = locked ? 'Locked' : 'Box Model';

    const tag = document.createElement('div');
    tag.className = 'msr-panel-tag';
    tag.textContent = describe(el);

    p.appendChild(title);
    p.appendChild(tag);
    p.appendChild(panelRow('w', bm.w + 'px'));
    p.appendChild(panelRow('h', bm.h + 'px'));
    p.appendChild(panelSep());
    p.appendChild(panelRow('pad', pad));
    p.appendChild(panelRow('mar', mar));
    p.appendChild(panelSep());
    p.appendChild(panelRow('x', bm.x + 'px'));
    p.appendChild(panelRow('y', bm.y + 'px'));
    if (bm.type) {
      p.appendChild(panelSep());
      p.appendChild(panelRow('font', bm.type.font));
      p.appendChild(panelRow('family', bm.type.family));
      p.appendChild(panelRow('color', toHex(bm.type.color), bm.type.color));
    }

    ui.root.appendChild(p);
    return p;
  }

  function positionPanel(p, r) {
    const gap = 8;
    const below = window.innerHeight - (r.top + r.height);
    const left  = Math.min(r.left, window.innerWidth - p.offsetWidth - gap);
    const top   = below >= p.offsetHeight + gap
      ? r.top + r.height + gap
      : r.top - p.offsetHeight - gap;
    p.style.left = Math.max(gap, left) + 'px';
    // Elements taller than the viewport (body, html) would push it off-screen
    p.style.top  = Math.max(gap, Math.min(top, window.innerHeight - p.offsetHeight - gap)) + 'px';
  }

  // ── Hover overlay ────────────────────────────────────────────

  function place(node, left, top, width, height) {
    Object.assign(node.style, {
      left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px',
    });
  }

  /**
   * Position the hover ring and the margin/padding bands. Each band is a box
   * whose borders are exactly as thick as the margin or padding they show.
   */
  function placeHover(el) {
    const r  = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const sides = (prop) => ['Top', 'Right', 'Bottom', 'Left']
      .map(side => Math.max(0, parseFloat(cs[prop + side + (prop === 'border' ? 'Width' : '')]) || 0));
    const [mt, mr, mb, ml] = sides('margin');
    const [bt, br, bb, bl] = sides('border');
    const [pt, pr, pb, pl] = sides('padding');

    place(highlight, r.left, r.top, r.width, r.height);
    place(marginBox, r.left - ml, r.top - mt, r.width + ml + mr, r.height + mt + mb);
    marginBox.style.borderWidth = `${mt}px ${mr}px ${mb}px ${ml}px`;
    place(padBox, r.left + bl, r.top + bt, r.width - bl - br, r.height - bt - bb);
    padBox.style.borderWidth = `${pt}px ${pr}px ${pb}px ${pl}px`;
    return r;
  }

  function showOverlay(el) {
    const r = placeHover(el);
    for (const n of [highlight, marginBox, padBox]) n.style.display = 'block';
    if (panel) { panel.remove(); panel = null; }
    panel = buildPanelEl(el, false);
    const p = panel;
    requestAnimationFrame(() => { if (panel === p) positionPanel(p, r); });
  }

  function select(el) {
    hoverEl = el;
    showOverlay(el);
    renderDistances();
  }

  /** ↑ — select the parent of the current element. */
  function selectParent() {
    const parent = hoverEl?.parentElement;
    if (!parent) return false;
    childStack.push(hoverEl);
    select(parent);
    return true;
  }

  /** ↓ — walk back down to the element selectParent() came from. */
  function selectChild() {
    if (!childStack.length) return false;
    select(childStack.pop());
    return true;
  }

  // ── Distances ────────────────────────────────────────────────

  function clearDistances() {
    distEls.forEach(n => n.remove());
    distEls.length = 0;
  }

  /** [start, end] of the empty space between two ranges, or null if they overlap. */
  function gapBetween(a1, a2, b1, b2) {
    if (b1 >= a2) return [a2, b1];
    if (a1 >= b2) return [b2, a1];
    return null;
  }

  /** Middle of the overlap of two ranges, else the middle of range b. */
  function crossMid(a1, a2, b1, b2) {
    const lo = Math.max(a1, b1);
    const hi = Math.min(a2, b2);
    return lo < hi ? (lo + hi) / 2 : (b1 + b2) / 2;
  }

  function addDistance(p1, p2, cross, horizontal) {
    const start = Math.min(p1, p2);
    const len   = Math.abs(p2 - p1);
    if (len < 1) return;

    const line = document.createElement('div');
    line.className = 'msr-dist-line';
    Object.assign(line.style, horizontal
      ? { left: start + 'px', top: cross + 'px', width: len + 'px', height: '1px' }
      : { left: cross + 'px', top: start + 'px', width: '1px', height: len + 'px' });

    const label = document.createElement('div');
    label.className = 'msr-dist-label';
    label.textContent = Math.round(len) + 'px';
    Object.assign(label.style, horizontal
      ? { left: (start + len / 2) + 'px', top: cross + 'px' }
      : { left: cross + 'px', top: (start + len / 2) + 'px' });

    ui.root.append(line, label);
    distEls.push(line, label);
  }

  /**
   * Redlines from the most recently locked element to the hovered one:
   * the gap between them when they're apart, or the inset of each edge when
   * one overlaps or contains the other.
   */
  function renderDistances() {
    clearDistances();
    const anchor = locks[locks.length - 1]?.el;
    if (!anchor || !hoverEl || anchor === hoverEl) return;

    const a = anchor.getBoundingClientRect();
    const b = hoverEl.getBoundingClientRect();
    const midX = crossMid(a.left, a.right, b.left, b.right);
    const midY = crossMid(a.top, a.bottom, b.top, b.bottom);
    const gapX = gapBetween(a.left, a.right, b.left, b.right);
    const gapY = gapBetween(a.top, a.bottom, b.top, b.bottom);

    if (gapX || gapY) {
      // ponytail: diagonal elements get lines through b's center without
      // dashed extensions back to a; add those if it reads as confusing.
      if (gapX) addDistance(gapX[0], gapX[1], midY, true);
      if (gapY) addDistance(gapY[0], gapY[1], midX, false);
      return;
    }
    addDistance(a.left,   b.left,   midY, true);
    addDistance(a.right,  b.right,  midY, true);
    addDistance(a.top,    b.top,    midX, false);
    addDistance(a.bottom, b.bottom, midX, false);
  }

  // ── Lock / unlock ────────────────────────────────────────────

  function isLocked(el) {
    return locks.some(l => l.el === el);
  }

  function lockEl(el) {
    if (isLocked(el)) return;
    const r  = el.getBoundingClientRect();

    const ring = document.createElement('div');
    ring.classList.add('msr-lock-ring');
    place(ring, r.left, r.top, r.width, r.height);
    ui.root.appendChild(ring);

    const p = buildPanelEl(el, true);
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
      const r = placeHover(hoverEl);
      if (panel) positionPanel(panel, r);
    }

    // Locked elements — sweep stale / hidden, then reposition the rest
    for (let i = locks.length - 1; i >= 0; i--) {
      const el = locks[i].el;
      if (!document.contains(el) || (el.offsetWidth === 0 && el.offsetHeight === 0)) {
        locks[i].ring.remove();
        locks[i].panel.remove();
        locks.splice(i, 1);
      }
    }
    for (const lock of locks) {
      const r = lock.el.getBoundingClientRect();
      place(lock.ring, r.left, r.top, r.width, r.height);
      positionPanel(lock.panel, r);
    }

    renderDistances();
  }

  // ── Event handlers ───────────────────────────────────────────

  function onMouseMove(e) {
    const el = ui.elementAt(e.clientX, e.clientY);
    // Compare against pointEl, not hoverEl, so a parent chosen with ↑ stays
    // selected while the cursor wiggles inside the same child.
    if (!el || el === pointEl) return;
    pointEl = el;
    childStack.length = 0;
    select(el);
  }

  function onClick(e) {
    onMouseMove(e);
    if (!hoverEl) return;
    isLocked(hoverEl) ? unlockEl(hoverEl) : lockEl(hoverEl);
    renderDistances();
  }

  // ── Public API ───────────────────────────────────────────────

  function enable() {
    if (highlight) return;
    msrOverlay.setMeasure(true);
    marginBox = document.createElement('div');
    marginBox.classList.add('msr-margin-box');
    padBox = document.createElement('div');
    padBox.classList.add('msr-padding-box');
    highlight = document.createElement('div');
    highlight.classList.add('msr-hover-highlight');
    for (const n of [marginBox, padBox, highlight]) n.style.display = 'none';
    ui.root.append(marginBox, padBox, highlight);
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
    if (marginBox) { marginBox.remove(); marginBox = null; }
    if (padBox)    { padBox.remove();    padBox    = null; }
    if (panel)     { panel.remove();     panel     = null; }
    locks.forEach(({ ring, panel: p }) => { ring.remove(); p.remove(); });
    locks.length = 0;
    clearDistances();
    hoverEl = null;
    pointEl = null;
    childStack.length = 0;
  }

  return { enable, disable, selectParent, selectChild };
})();
