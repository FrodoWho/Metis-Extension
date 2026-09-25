const toolbar = (() => {
  let container = null;
  let btnMeasure, btnGuides, btnGrid, btnMockup, btnV, btnH, btnGap, btnPin, btnPx, btnRem, btnDiff, btnCollapse;
  let rowMeasure, rowGuides, rowGrid, rowMockup, viewport, fileInput;
  const gridInputs = {};
  const state = { measure: false, guides: false, grid: false, mockup: false, direction: 'v', gapVisible: false };
  // Remembered across pages
  const prefs = {
    left: null, top: null, collapsed: false, units: 'px', pinGuides: false, grid: { ...grid.settings },
  };

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

  /** Number input for one grid setting; out-of-range values are ignored. */
  function gridField(parent, label, title, key, min, max) {
    const wrap = el('label', 'msr-tb-field', parent);
    wrap.title = title;
    wrap.append(label);
    const input = el('input', 'msr-tb-input', wrap);
    Object.assign(input, { type: 'number', min, max, value: grid.settings[key] });
    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (input.value === '' || !Number.isInteger(v) || v < min || v > max) return;
      prefs.grid[key] = v;
      grid.set({ [key]: v });
      persist();
    });
    gridInputs[key] = input;
  }

  function select(parent, label, options, onChange) {
    const s = el('select', 'msr-tb-input msr-tb-select', parent);
    s.setAttribute('aria-label', label);
    s.title = label;
    for (const [value, text] of options) s.add(new Option(text, value));
    s.addEventListener('change', () => onChange(s.value));
    return s;
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
    btnGrid = button(rowMain, '▦ Grid', 'Layout grid',
      () => setGrid(!state.grid), { key: 'L', pressed: false });
    btnMockup = button(rowMain, '🖼 Overlay', 'Design overlay',
      () => setMockup(!state.mockup), { key: 'O', pressed: false });
    el('div', 'msr-tb-sep', rowMain);
    viewport = el('span', 'msr-tb-viewport', rowMain);
    viewport.title = 'Viewport size (what media queries see)';
    showViewport();
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
    btnPin = button(rowGuides, 'Pin', 'Pin guides to the page so they scroll with it',
      () => setPinned(!prefs.pinGuides), { pressed: false });
    btnPin.id = 'msr-tb-pin';
    el('div', 'msr-tb-sep', rowGuides);
    button(rowGuides, 'Clear', 'Clear all guides', () => guides.clearAll()).id = 'msr-tb-clear';

    // ── Grid settings ─────────────────────────────────────────
    rowGrid = el('div', 'msr-tb-row-sub msr-tb-hidden', container);
    rowGrid.id = 'msr-tb-row-grid';

    gridField(rowGrid, 'Cols',   'Number of columns', 'columns', 1, 48);
    gridField(rowGrid, 'Gutter', 'Space between columns (px)', 'gutter', 0, 500);
    gridField(rowGrid, 'Max',    'Maximum container width incl. margins (px), 0 = none', 'maxWidth', 0, 10000);
    gridField(rowGrid, 'Margin', 'Space left and right of the columns (px)', 'margin', 0, 500);

    // ── Design overlay ────────────────────────────────────────
    rowMockup = el('div', 'msr-tb-row-sub msr-tb-hidden', container);
    rowMockup.id = 'msr-tb-row-mockup';

    fileInput = el('input', '', rowMockup);
    Object.assign(fileInput, { type: 'file', accept: 'image/*', hidden: true });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) mockup.load(fileInput.files[0]);
      fileInput.value = ''; // picking the same file again should reload it
    });
    button(rowMockup, 'Image…', 'Choose a design image', () => fileInput.click());
    el('div', 'msr-tb-sep', rowMockup);

    const opacity = el('label', 'msr-tb-field', rowMockup);
    opacity.append('Opacity');
    const range = el('input', 'msr-tb-range', opacity);
    Object.assign(range, { type: 'range', min: 0, max: 100, value: mockup.settings.opacity * 100 });
    range.addEventListener('input', () => mockup.set({ opacity: range.value / 100 }));

    select(rowMockup, 'Image scale (2x for retina exports)', [['1', '1x'], ['2', '2x'], ['3', '3x']],
      v => mockup.set({ scale: Number(v) }));
    select(rowMockup, 'Alignment', [['center', 'Center'], ['left', 'Left']],
      v => mockup.set({ align: v }));
    btnDiff = button(rowMockup, 'Diff', 'Difference blend: matching pixels turn black', () => {
      mockup.set({ diff: !mockup.settings.diff });
      setPressed(btnDiff, mockup.settings.diff);
    }, { pressed: false });
    button(rowMockup, '✕', 'Remove image', () => mockup.clear(), { className: 'msr-tb-remove' });

    ui.root.appendChild(container);
    window.addEventListener('resize', () => { clamp(); showViewport(); });

    ui.store.get('toolbar', prefs).then((saved) => {
      Object.assign(prefs, saved);
      setCollapsed(prefs.collapsed);
      setUnits(prefs.units);
      setPinned(prefs.pinGuides);
      grid.set(prefs.grid);
      for (const [key, input] of Object.entries(gridInputs)) input.value = prefs.grid[key];
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

  function setPinned(on) {
    prefs.pinGuides = on;
    guides.setPinned(on);
    setPressed(btnPin, on);
    persist();
  }

  function showViewport() {
    viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
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

  /** The grid is a visual layer, so it combines with either tool. */
  function setGrid(on) {
    state.grid = on;
    if (on) grid.show();
    else    grid.hide();
    updateUI();
  }

  /** Visual layer too. Opens the file picker when there's no image yet. */
  function setMockup(on) {
    state.mockup = on;
    mockup.setVisible(on);
    if (on && !mockup.loaded) fileInput.click();
    updateUI();
  }

  function updateUI() {
    setPressed(btnMeasure, state.measure);
    setPressed(btnGuides, state.guides);
    setPressed(btnGrid, state.grid);
    setPressed(btnMockup, state.mockup);
    rowMockup.classList.toggle('msr-tb-hidden', !state.mockup);
    rowMeasure.classList.toggle('msr-tb-hidden', !state.measure);
    rowGuides.classList.toggle('msr-tb-hidden', !state.guides);
    rowGrid.classList.toggle('msr-tb-hidden', !state.grid);
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
    if (key === 'l') { setGrid(!state.grid); return true; }
    if (key === 'o') { setMockup(!state.mockup); return true; }

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
    if (isTyping(e)) {
      // Typing in our own fields: don't let the page's shortcuts see it
      if (e.composedPath().includes(ui.host)) e.stopPropagation();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
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
    if (state.grid)    setGrid(false);
    if (state.mockup)  setMockup(false);
    guides.clearAll();
    mockup.clear();
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
