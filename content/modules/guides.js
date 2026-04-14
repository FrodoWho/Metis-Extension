const guides = (() => {
  const lines = [];
  let enabled = false;
  let previousCursor = '';
  let direction = 'v'; // 'v' | 'h'
  let ghost = null;
  let gapVisible = false;

  function createGuide(coord) {
    const container = document.createElement('div');
    container.setAttribute('data-measure-extension', '');
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

  function renderGaps() {
    // Remove all existing gap labels before re-rendering
    document.querySelectorAll('.msr-gap-label').forEach(el => el.remove());

    // Vertical guides: gap labels centred horizontally between adjacent lines
    const vGuides = lines
      .filter(c => c.dataset.orient === 'v')
      .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));

    for (let i = 0; i < vGuides.length - 1; i++) {
      const x1 = parseFloat(vGuides[i].style.left);
      const x2 = parseFloat(vGuides[i + 1].style.left);
      const lbl = document.createElement('div');
      lbl.setAttribute('data-measure-extension', '');
      lbl.classList.add('msr-gap-label');
      lbl.textContent = Math.round(x2 - x1) + 'px';
      lbl.style.left = ((x1 + x2) / 2) + 'px';
      lbl.style.top = '50%';
      document.body.appendChild(lbl);
    }

    // Horizontal guides: gap labels centred vertically between adjacent lines
    const hGuides = lines
      .filter(c => c.dataset.orient === 'h')
      .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

    for (let i = 0; i < hGuides.length - 1; i++) {
      const y1 = parseFloat(hGuides[i].style.top);
      const y2 = parseFloat(hGuides[i + 1].style.top);
      const lbl = document.createElement('div');
      lbl.setAttribute('data-measure-extension', '');
      lbl.classList.add('msr-gap-label');
      lbl.textContent = Math.round(y2 - y1) + 'px';
      lbl.style.top = ((y1 + y2) / 2) + 'px';
      lbl.style.left = '50%';
      document.body.appendChild(lbl);
    }
  }

  function ensureGhost() {
    if (!document.body) return;
    if (ghost && ghost.isConnected) return;
    ghost = null; // discard stale reference if detached from a previous document
    ghost = document.createElement('div');
    ghost.setAttribute('data-measure-extension', '');
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

  function onMouseMove(e) {
    ensureGhost();
    if (direction === 'h') {
      ghost.classList.add('msr-guide-h');
      ghost.style.top = e.clientY + 'px';
      ghost.style.left = '';
    } else {
      ghost.classList.remove('msr-guide-h');
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = '';
    }
  }

  function onClick(e) {
    if (e.target.closest && e.target.closest('[data-measure-extension]')) return;
    const coord = direction === 'h' ? e.clientY : e.clientX;
    createGuide(coord);
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    document.body.style.cursor = previousCursor;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    removeGhost();
    lines.forEach(g => g.remove());
    lines.length = 0;
    document.querySelectorAll('.msr-gap-label').forEach(el => el.remove());
  }

  function setDirection(d) {
    if (d === 'v' || d === 'h') direction = d;
  }

  function setGapVisible(v) {
    gapVisible = v;
    if (v) renderGaps();
    else document.querySelectorAll('.msr-gap-label').forEach(el => el.remove());
  }

  return { enable, disable, setDirection, setGapVisible };
})();
