const toolbar = (() => {
  let container = null;
  let btnMeasure, btnGuides, btnV, btnH, btnGap, rowSub;
  const state = { measure: false, guides: false, direction: 'v', gapVisible: false };

  function buildDOM() {
    if (container) return;

    container = document.createElement('div');
    container.id = 'msr-toolbar';
    container.setAttribute('data-measure-extension', '');
    container.classList.add('msr-tb-hidden');

    // ── Row 1: tool switcher ──────────────────────────────────
    const rowMain = document.createElement('div');
    rowMain.className = 'msr-tb-row-main';
    rowMain.setAttribute('data-measure-extension', '');

    btnMeasure = document.createElement('button');
    btnMeasure.className = 'msr-tb-btn';
    btnMeasure.setAttribute('data-measure-extension', '');
    btnMeasure.textContent = '📐 Measure';
    btnMeasure.addEventListener('click', () => {
      applyTool('measure', !state.measure);
    });

    btnGuides = document.createElement('button');
    btnGuides.className = 'msr-tb-btn';
    btnGuides.setAttribute('data-measure-extension', '');
    btnGuides.textContent = '📏 Guides';
    btnGuides.addEventListener('click', () => {
      applyTool('guides', !state.guides);
    });

    const sep1 = document.createElement('div');
    sep1.className = 'msr-tb-sep';
    sep1.setAttribute('data-measure-extension', '');

    const btnClose = document.createElement('button');
    btnClose.className = 'msr-tb-btn msr-tb-close';
    btnClose.setAttribute('data-measure-extension', '');
    btnClose.textContent = '✕';
    btnClose.addEventListener('click', () => {
      if (state.measure) applyTool('measure', false);
      if (state.guides)  applyTool('guides',  false);
      container.classList.add('msr-tb-hidden');
    });

    rowMain.appendChild(btnMeasure);
    rowMain.appendChild(btnGuides);
    rowMain.appendChild(sep1);
    rowMain.appendChild(btnClose);

    // ── Row 2: guides sub-options ─────────────────────────────
    rowSub = document.createElement('div');
    rowSub.className = 'msr-tb-row-sub msr-tb-hidden';
    rowSub.setAttribute('data-measure-extension', '');

    btnV = document.createElement('button');
    btnV.id = 'msr-tb-v';
    btnV.className = 'msr-tb-btn msr-tb-btn-active'; // V is default
    btnV.setAttribute('data-measure-extension', '');
    btnV.textContent = 'V';
    btnV.addEventListener('click', () => {
      state.direction = 'v';
      guides.setDirection('v');
      btnV.classList.add('msr-tb-btn-active');
      btnH.classList.remove('msr-tb-btn-active');
    });

    btnH = document.createElement('button');
    btnH.id = 'msr-tb-h';
    btnH.className = 'msr-tb-btn';
    btnH.setAttribute('data-measure-extension', '');
    btnH.textContent = 'H';
    btnH.addEventListener('click', () => {
      state.direction = 'h';
      guides.setDirection('h');
      btnH.classList.add('msr-tb-btn-active');
      btnV.classList.remove('msr-tb-btn-active');
    });

    const sep2 = document.createElement('div');
    sep2.className = 'msr-tb-sep';
    sep2.setAttribute('data-measure-extension', '');

    btnGap = document.createElement('button');
    btnGap.id = 'msr-tb-gap';
    btnGap.className = 'msr-tb-btn';
    btnGap.setAttribute('data-measure-extension', '');
    btnGap.textContent = 'Gap';
    btnGap.addEventListener('click', () => {
      state.gapVisible = !state.gapVisible;
      guides.setGapVisible(state.gapVisible);
      btnGap.classList.toggle('msr-tb-btn-active', state.gapVisible);
    });

    rowSub.appendChild(btnV);
    rowSub.appendChild(btnH);
    rowSub.appendChild(sep2);
    rowSub.appendChild(btnGap);

    container.appendChild(rowMain);
    container.appendChild(rowSub);
    document.body.appendChild(container);
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
    if (!container) return;
    btnMeasure.classList.toggle('msr-tb-btn-active', state.measure);
    btnGuides.classList.toggle('msr-tb-btn-active', state.guides);
    rowSub.classList.toggle('msr-tb-hidden', !state.guides);
    // Toolbar visibility is managed by toggle() and the close button — not here.
  }

  // Called when the user clicks the extension icon.
  function toggle() {
    buildDOM();
    if (container.classList.contains('msr-tb-hidden')) {
      container.classList.remove('msr-tb-hidden');
    } else {
      if (state.measure) applyTool('measure', false);
      if (state.guides)  applyTool('guides',  false);
      container.classList.add('msr-tb-hidden');
    }
  }

  return { toggle };
})();
