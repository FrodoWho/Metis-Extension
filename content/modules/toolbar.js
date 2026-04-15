const toolbar = (() => {
  let container = null;
  let btnMeasure, btnGuides, btnV, btnH, btnGap, rowSub;
  const state = { measure: false, guides: false, direction: 'v', gapVisible: false };

  function getShortcut() {
    const platform = (navigator.userAgentData?.platform ?? navigator.platform ?? '');
    return /mac/i.test(platform) ? '⌥⇧M' : 'Alt+Shift+M';
  }

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
    btnMeasure.setAttribute('aria-label', 'Toggle measure tool');
    btnMeasure.setAttribute('aria-pressed', 'false');
    btnMeasure.textContent = '📐 Measure';
    btnMeasure.addEventListener('click', () => {
      applyTool('measure', !state.measure);
    });

    btnGuides = document.createElement('button');
    btnGuides.className = 'msr-tb-btn';
    btnGuides.setAttribute('data-measure-extension', '');
    btnGuides.setAttribute('aria-label', 'Toggle guides tool');
    btnGuides.setAttribute('aria-pressed', 'false');
    btnGuides.textContent = '📏 Guides';
    btnGuides.addEventListener('click', () => {
      applyTool('guides', !state.guides);
    });

    const sep1 = document.createElement('div');
    sep1.className = 'msr-tb-sep';
    sep1.setAttribute('data-measure-extension', '');

    const hint = document.createElement('span');
    hint.className = 'msr-tb-shortcut';
    hint.setAttribute('data-measure-extension', '');
    hint.textContent = getShortcut();

    const sep2hint = document.createElement('div');
    sep2hint.className = 'msr-tb-sep';
    sep2hint.setAttribute('data-measure-extension', '');

    const btnClose = document.createElement('button');
    btnClose.className = 'msr-tb-btn msr-tb-close';
    btnClose.setAttribute('data-measure-extension', '');
    btnClose.setAttribute('aria-label', 'Close toolbar');
    btnClose.textContent = '✕';
    btnClose.addEventListener('click', () => {
      if (state.measure) applyTool('measure', false);
      if (state.guides)  applyTool('guides',  false);
      container.classList.add('msr-tb-hidden');
      document.removeEventListener('keydown', onKeyDown, true);
      keysActive = false;
    });

    const btnKofi = document.createElement('button');
    btnKofi.className = 'msr-tb-btn msr-tb-kofi';
    btnKofi.setAttribute('data-measure-extension', '');
    btnKofi.setAttribute('aria-label', 'Support on Ko-fi');
    btnKofi.textContent = '☕';
    btnKofi.addEventListener('click', () => {
      window.open('https://ko-fi.com/FrodoWho', '_blank');
    });

    rowMain.appendChild(btnMeasure);
    rowMain.appendChild(btnGuides);
    rowMain.appendChild(sep1);
    rowMain.appendChild(hint);
    rowMain.appendChild(sep2hint);
    rowMain.appendChild(btnKofi);
    rowMain.appendChild(btnClose);

    // ── Row 2: guides sub-options ─────────────────────────────
    rowSub = document.createElement('div');
    rowSub.className = 'msr-tb-row-sub msr-tb-hidden';
    rowSub.setAttribute('data-measure-extension', '');

    btnV = document.createElement('button');
    btnV.id = 'msr-tb-v';
    btnV.className = 'msr-tb-btn msr-tb-btn-active'; // V is default
    btnV.setAttribute('data-measure-extension', '');
    btnV.setAttribute('aria-label', 'Vertical guides');
    btnV.setAttribute('aria-pressed', 'true');
    btnV.textContent = 'V';
    btnV.addEventListener('click', () => {
      setDirection('v');
    });

    btnH = document.createElement('button');
    btnH.id = 'msr-tb-h';
    btnH.className = 'msr-tb-btn';
    btnH.setAttribute('data-measure-extension', '');
    btnH.setAttribute('aria-label', 'Horizontal guides');
    btnH.setAttribute('aria-pressed', 'false');
    btnH.textContent = 'H';
    btnH.addEventListener('click', () => {
      setDirection('h');
    });

    const sep2 = document.createElement('div');
    sep2.className = 'msr-tb-sep';
    sep2.setAttribute('data-measure-extension', '');

    btnGap = document.createElement('button');
    btnGap.id = 'msr-tb-gap';
    btnGap.className = 'msr-tb-btn';
    btnGap.setAttribute('data-measure-extension', '');
    btnGap.setAttribute('aria-label', 'Toggle gap labels');
    btnGap.setAttribute('aria-pressed', 'false');
    btnGap.textContent = 'Gap';
    btnGap.addEventListener('click', () => {
      state.gapVisible = !state.gapVisible;
      guides.setGapVisible(state.gapVisible);
      btnGap.classList.toggle('msr-tb-btn-active', state.gapVisible);
      btnGap.setAttribute('aria-pressed', String(state.gapVisible));
    });

    const sep3 = document.createElement('div');
    sep3.className = 'msr-tb-sep';
    sep3.setAttribute('data-measure-extension', '');

    const btnClear = document.createElement('button');
    btnClear.id = 'msr-tb-clear';
    btnClear.className = 'msr-tb-btn';
    btnClear.setAttribute('data-measure-extension', '');
    btnClear.setAttribute('aria-label', 'Clear all guides');
    btnClear.textContent = 'Clear';
    btnClear.addEventListener('click', () => guides.clearAll());

    rowSub.appendChild(btnV);
    rowSub.appendChild(btnH);
    rowSub.appendChild(sep2);
    rowSub.appendChild(btnGap);
    rowSub.appendChild(sep3);
    rowSub.appendChild(btnClear);

    container.appendChild(rowMain);
    container.appendChild(rowSub);
    document.body.appendChild(container);
  }

  function setDirection(d) {
    state.direction = d;
    guides.setDirection(d);
    if (btnV && btnH) {
      btnV.classList.toggle('msr-tb-btn-active', d === 'v');
      btnH.classList.toggle('msr-tb-btn-active', d === 'h');
      btnV.setAttribute('aria-pressed', String(d === 'v'));
      btnH.setAttribute('aria-pressed', String(d === 'h'));
    }
  }

  function onKeyDown(e) {
    if (!state.guides) return;
    if (e.key === 'v' || e.key === 'V') { setDirection('v'); e.preventDefault(); }
    if (e.key === 'h' || e.key === 'H') { setDirection('h'); e.preventDefault(); }
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
    btnMeasure.setAttribute('aria-pressed', String(state.measure));
    btnGuides.setAttribute('aria-pressed', String(state.guides));
    rowSub.classList.toggle('msr-tb-hidden', !state.guides);
  }

  let keysActive = false;

  function toggle() {
    buildDOM();
    if (container.classList.contains('msr-tb-hidden')) {
      container.classList.remove('msr-tb-hidden');
      if (!keysActive) {
        document.addEventListener('keydown', onKeyDown, true);
        keysActive = true;
      }
    } else {
      if (state.measure) applyTool('measure', false);
      if (state.guides)  applyTool('guides',  false);
      container.classList.add('msr-tb-hidden');
      document.removeEventListener('keydown', onKeyDown, true);
      keysActive = false;
    }
  }

  return { toggle };
})();
