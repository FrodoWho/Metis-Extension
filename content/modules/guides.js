const guides = (() => {
  const lines = [];
  let enabled = false;
  let previousCursor = '';
  let direction = 'v'; // 'v' | 'h'
  let ghost = null;

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
  }

  function removeGuide(container) {
    const idx = lines.indexOf(container);
    if (idx === -1) return;
    lines[idx].remove();
    lines.splice(idx, 1);
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
  }

  function setDirection(d) {
    if (d === 'v' || d === 'h') direction = d;
  }

  return { enable, disable, setDirection };
})();
