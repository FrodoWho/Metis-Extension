const toolbar = (() => {
  let container = null;
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

    const btnMeasure = document.createElement('button');
    btnMeasure.className = 'msr-tb-btn';
    btnMeasure.id = 'msr-tb-measure';
    btnMeasure.setAttribute('data-measure-extension', '');
    btnMeasure.textContent = '📐 Measure';
    btnMeasure.addEventListener('click', () => {
      const next = !state.measure;
      applyTool('measure', next);
      chrome.storage.session.set({ measure: next });
    });

    const btnGuides = document.createElement('button');
    btnGuides.className = 'msr-tb-btn';
    btnGuides.id = 'msr-tb-guides';
    btnGuides.setAttribute('data-measure-extension', '');
    btnGuides.textContent = '📏 Guides';
    btnGuides.addEventListener('click', () => {
      const next = !state.guides;
      applyTool('guides', next);
      chrome.storage.session.set({ guides: next });
    });

    const sep1 = document.createElement('div');
    sep1.className = 'msr-tb-sep';
    sep1.setAttribute('data-measure-extension', '');

    const btnClose = document.createElement('button');
    btnClose.className = 'msr-tb-btn msr-tb-close';
    btnClose.setAttribute('data-measure-extension', '');
    btnClose.textContent = '✕';
    btnClose.addEventListener('click', () => {
      if (state.measure) { applyTool('measure', false); chrome.storage.session.set({ measure: false }); }
      if (state.guides)  { applyTool('guides',  false); chrome.storage.session.set({ guides: false }); }
    });

    rowMain.appendChild(btnMeasure);
    rowMain.appendChild(btnGuides);
    rowMain.appendChild(sep1);
    rowMain.appendChild(btnClose);

    // ── Row 2: guides sub-options ─────────────────────────────
    const rowSub = document.createElement('div');
    rowSub.className = 'msr-tb-row-sub msr-tb-hidden';
    rowSub.setAttribute('data-measure-extension', '');

    const btnV = document.createElement('button');
    btnV.className = 'msr-tb-btn msr-tb-btn-active'; // 'v' is default
    btnV.id = 'msr-tb-v';
    btnV.setAttribute('data-measure-extension', '');
    btnV.textContent = 'V';
    btnV.addEventListener('click', () => {
      state.direction = 'v';
      guides.setDirection('v');
      document.getElementById('msr-tb-v').classList.add('msr-tb-btn-active');
      document.getElementById('msr-tb-h').classList.remove('msr-tb-btn-active');
    });

    const btnH = document.createElement('button');
    btnH.className = 'msr-tb-btn';
    btnH.id = 'msr-tb-h';
    btnH.setAttribute('data-measure-extension', '');
    btnH.textContent = 'H';
    btnH.addEventListener('click', () => {
      state.direction = 'h';
      guides.setDirection('h');
      document.getElementById('msr-tb-h').classList.add('msr-tb-btn-active');
      document.getElementById('msr-tb-v').classList.remove('msr-tb-btn-active');
    });

    const sep2 = document.createElement('div');
    sep2.className = 'msr-tb-sep';
    sep2.setAttribute('data-measure-extension', '');

    const btnGap = document.createElement('button');
    btnGap.className = 'msr-tb-btn';
    btnGap.id = 'msr-tb-gap';
    btnGap.setAttribute('data-measure-extension', '');
    btnGap.textContent = 'Gap';
    btnGap.addEventListener('click', () => {
      state.gapVisible = !state.gapVisible;
      guides.setGapVisible(state.gapVisible);
      document.getElementById('msr-tb-gap').classList.toggle('msr-tb-btn-active', state.gapVisible);
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
    state[tool] = enabled;
    if (tool === 'measure') enabled ? measure.enable() : measure.disable();
    if (tool === 'guides')  enabled ? guides.enable()  : guides.disable();
    updateUI();
  }

  function updateUI() {
    if (!container) return;
    document.getElementById('msr-tb-measure').classList.toggle('msr-tb-btn-active', state.measure);
    document.getElementById('msr-tb-guides').classList.toggle('msr-tb-btn-active', state.guides);

    const rowSub = container.querySelector('.msr-tb-row-sub');
    rowSub.classList.toggle('msr-tb-hidden', !state.guides);

    container.classList.toggle('msr-tb-hidden', !state.measure && !state.guides);
  }

  function syncFromPopup(tool, enabled) {
    buildDOM();
    applyTool(tool, enabled);
  }

  return { syncFromPopup };
})();
