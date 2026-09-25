const toolbar = (() => {
  let container = null;
  let btnMeasure, btnGuides, btnV, btnH, btnGap, btnPx, btnRem, btnCollapse;
  let rowMeasure, rowGuides;
  const state = { measure: false, guides: false, direction: 'v', gapVisible: false };
  const prefs = { left: null, top: null, collapsed: false, units: 'px' }; // remembered across pages

  function getShortcut() {
    const platform = (navigator.userAgentData?.platform ?? navigator.platform ?? '');
    return /mac/i.test(platform) ? '⌥⇧M' : 'Alt+Shift+M';
  }

  // ── DOM helpers ──────────────────────────────────────────────

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    node.className = className;
    parent.appendChild(node);
    return node;
  }

  function button(parent, text, label, onClick, { key, pressed, className = '' } = {}) {
    const b = el('button', `msr-tb-btn ${className}`.trim(), parent);
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.title = key ? `${label} (${key})` : label;
    if (key) b.setAttribute('aria-keyshortcuts', key);
    if (pressed !== undefined) setPressed(b, pressed);
    b.addEventListener('click', onClick);
    return b;
  }

  function setPressed(b, on) {
    b.classList.toggle('msr-tb-btn-active', on);
    b.setAttribute('aria-pressed', String(on));
  }

  function buildDOM() {
    if (container) return;

    container = document.createElement('div');
    container.id = 'msr-toolbar';
    container.classList.add('msr-tb-hidden');

    // ── Row 1: tool switcher ──────────────────────────────────
    const rowMain = el('div', 'msr-tb-row-main', container);

    const grip = el('div', 'msr-tb-grip', rowMain);
    grip.textContent = '⠿';
    grip.title = `Drag to move, double-click to reset. Toggle toolbar: ${getShortcut()}`;
    makeDraggable(grip);

    btnMeasure = button(rowMain, '📐 Measure', 'Measure tool',
      () => applyTool('measure', !state.measure), { key: 'M', pressed: false });
    btnGuides = button(rowMain, '📏 Guides', 'Guides tool',
      () => applyTool('guides', !state.guides), { key: 'G', pressed: false });
    el('div', 'msr-tb-sep', rowMain);
    el('span', 'msr-tb-shortcut', rowMain).textContent = getShortcut();
    el('div', 'msr-tb-sep', rowMain);
    button(rowMain, '☕', 'Support on Ko-fi',
      () => window.open('https://ko-fi.com/FrodoWho', '_blank'), { className: 'msr-tb-kofi' });
    btnCollapse = button(rowMain, '–', 'Collapse toolbar', () => setCollapsed(!prefs.collapsed),
      { className: 'msr-tb-collapse' });
    button(rowMain, '✕', 'Close toolbar', hide, { key: 'Escape', className: 'msr-tb-close' });

    // ── Measure sub-options ───────────────────────────────────
    rowMeasure = el('div', 'msr-tb-row-sub msr-tb-hidden', container);
    rowMeasure.id = 'msr-tb-row-measure';

    btnPx  = button(rowMeasure, 'px',  'Show lengths in px',  () => setUnits('px'),  { pressed: true });
    btnRem = button(rowMeasure, 'rem', 'Show lengths in rem', () => setUnits('rem'), { pressed: false });
    el('div', 'msr-tb-sep', rowMeasure);
    button(rowMeasure, 'Copy CSS', 'Copy CSS of the selected element', () => measure.copyCss(), { key: 'C' });

    // ── Guides sub-options ────────────────────────────────────
    rowGuides = el('div', 'msr-tb-row-sub msr-tb-hidden', container);
    rowGuides.id = 'msr-tb-row-guides';

    btnV = button(rowGuides, 'V', 'Vertical guides', () => setDirection('v'), { key: 'V', pressed: true });
    btnV.id = 'msr-tb-v';
    btnH = button(rowGuides, 'H', 'Horizontal guides', () => setDirection('h'), { key: 'H', pressed: false });
    btnH.id = 'msr-tb-h';
    el('div', 'msr-tb-sep', rowGuides);
    btnGap = button(rowGuides, 'Gap', 'Toggle gap labels', () => {
      state.gapVisible = !state.gapVisible;
      guides.setGapVisible(state.gapVisible);
      setPressed(btnGap, state.gapVisible);
    }, { pressed: false });
    btnGap.id = 'msr-tb-gap';
    el('div', 'msr-tb-sep', rowGuides);
    button(rowGuides, 'Clear', 'Clear all guides', () => guides.clearAll()).id = 'msr-tb-clear';

    ui.root.appendChild(container);
    window.addEventListener('resize', clamp);

    ui.store.get('toolbar', prefs).then((saved) => {
      Object.assign(prefs, saved);
      setCollapsed(prefs.collapsed);
      setUnits(prefs.units);
      if (prefs.left !== null) moveTo(prefs.left, prefs.top);
    });
  }

  function setUnits(u) {
    prefs.units = u;
    measure.setUnits(u);
    setPressed(btnPx,  u === 'px');
    setPressed(btnRem, u === 'rem');
    persist();
  }

  function persist() { ui.store.set('toolbar', prefs); }

  /** Shrink to grip + expand button; the active tool keeps running. */
  function setCollapsed(on) {
    prefs.collapsed = on;
    container.classList.toggle('msr-tb-collapsed', on);
    btnCollapse.textContent = on ? '📏' : '–';
    btnCollapse.setAttribute('aria-label', on ? 'Expand toolbar' : 'Collapse toolbar');
    btnCollapse.title = btnCollapse.getAttribute('aria-label');
    btnCollapse.setAttribute('aria-expanded', String(!on));
    persist();
    clamp();
  }

  // ── Dragging ─────────────────────────────────────────────────

  function moveTo(x, y) {
    const maxX = window.innerWidth  - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    container.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
  }

  /** Keep a dragged toolbar on screen when the window or toolbar resizes. */
  function clamp() {
    if (container.style.left) moveTo(parseFloat(container.style.left), parseFloat(container.style.top));
  }

  function makeDraggable(handle) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r  = container.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      const onMove = (ev) => moveTo(ev.clientX - dx, ev.clientY - dy);
      handle.setPointerCapture(e.pointerId);
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('lostpointercapture', () => {
        handle.removeEventListener('pointermove', onMove);
        if (!container.style.left) return; // pressed without dragging
        prefs.left = parseFloat(container.style.left);
        prefs.top  = parseFloat(container.style.top);
        persist();
      }, { once: true });
    });
    handle.addEventListener('dblclick', () => {
      container.style.left = '';
      container.style.top  = '';
      prefs.left = prefs.top = null;
      persist();
    });
  }

  // ── State ────────────────────────────────────────────────────

  function setDirection(d) {
    state.direction = d;
    guides.setDirection(d);
    setPressed(btnV, d === 'v');
    setPressed(btnH, d === 'h');
  }

  function applyTool(tool, enabled) {
    if (enabled) {
      // Measure and guides are mutually exclusive — disable the other first.
      const other = tool === 'measure' ? 'guides' : 'measure';
      if (state[other]) {
        state[other] = false;
        if (other === 'measure') measure.disable();
        else                     guides.disable();
      }
    }
    state[tool] = enabled;
    if (tool === 'measure') enabled ? measure.enable() : measure.disable();
    if (tool === 'guides')  enabled ? guides.enable()  : guides.disable();
    updateUI();
  }

  function updateUI() {
    setPressed(btnMeasure, state.measure);
    setPressed(btnGuides, state.guides);
    rowMeasure.classList.toggle('msr-tb-hidden', !state.measure);
    rowGuides.classList.toggle('msr-tb-hidden', !state.guides);
    clamp(); // sub-rows change the toolbar's height
  }

  // ── Keyboard ─────────────────────────────────────────────────

  function isTyping(e) {
    const t = e.composedPath()[0];
    return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  }

  /** Returns true when the key did something (and should be swallowed). */
  function handleKey(key, shift) {
    if (key === 'Escape') {
      if (state.measure)     applyTool('measure', false);
      else if (state.guides) applyTool('guides', false);
      else                   hide();
      return true;
    }
    if (key === 'm') { applyTool('measure', !state.measure); return true; }
    if (key === 'g') { applyTool('guides',  !state.guides);  return true; }

    if (state.guides) {
      if (key === 'v' || key === 'h') { setDirection(key); return true; }
      const step = shift ? 10 : 1;
      if (key === 'ArrowLeft')  return guides.nudge('v', -step);
      if (key === 'ArrowRight') return guides.nudge('v',  step);
      if (key === 'ArrowUp')    return guides.nudge('h', -step);
      if (key === 'ArrowDown')  return guides.nudge('h',  step);
    }
    if (state.measure) {
      if (key === 'ArrowUp')   return measure.selectParent();
      if (key === 'ArrowDown') return measure.selectChild();
      if (key === 'c')         return measure.copyCss();
    }
    return false;
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (handleKey(key, e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation(); // keep the page's own shortcuts (e.g. M = mute) out of it
    }
  }

  // ── Show / hide ──────────────────────────────────────────────

  function show() {
    container.classList.remove('msr-tb-hidden');
    clamp(); // a remembered position may not fit this window
    document.addEventListener('keydown', onKeyDown, true);
  }

  function hide() {
    if (state.measure) applyTool('measure', false);
    if (state.guides)  applyTool('guides',  false);
    guides.clearAll();
    container.classList.add('msr-tb-hidden');
    document.removeEventListener('keydown', onKeyDown, true);
  }

  function toggle() {
    buildDOM();
    if (container.classList.contains('msr-tb-hidden')) show();
    else hide();
  }

  return { toggle };
})();
