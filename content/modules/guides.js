const guides = (() => {
  const lines = [];
  let enabled = false;
  let previousCursor = '';
  let direction = 'v'; // 'v' | 'h'

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
    document.addEventListener('click', onClick, true);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    document.body.style.cursor = previousCursor;
    document.removeEventListener('click', onClick, true);
    lines.forEach(g => g.remove());
    lines.length = 0;
  }

  function setDirection(d) {
    direction = d;
  }

  return { enable, disable, setDirection };
})();
