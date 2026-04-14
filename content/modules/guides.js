const guides = (() => {
  const lines = []; // guide container DOM nodes
  let enabled = false;
  let previousCursor = '';

  function createGuide(x) {
    const container = document.createElement('div');
    container.setAttribute('data-measure-extension', '');
    container.classList.add('msr-guide');
    container.style.left = x + 'px';

    // Visible 1px red line — not interactive
    const line = document.createElement('div');
    line.classList.add('msr-guide-line');

    // 8px hit zone centred on the line — clicking removes the guide
    const hit = document.createElement('div');
    hit.classList.add('msr-guide-hit');
    hit.addEventListener('click', () => removeGuide(container));

    // X coordinate label
    const label = document.createElement('div');
    label.classList.add('msr-guide-label');
    label.textContent = `${Math.round(x)}px`;

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
    // Skip clicks that land on any extension overlay (guide hit zones, measure overlays, etc.)
    if (e.target.closest && e.target.closest('[data-measure-extension]')) return;
    createGuide(e.clientX);
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

  return { enable, disable };
})();
