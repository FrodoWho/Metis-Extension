/**
 * Column layout grid, like Figma's layout grids. Purely visual (never takes
 * the pointer), so it can stay on while measuring or placing guides. CSS grid
 * does all the column math.
 */
const grid = (() => {
  let el = null;
  // maxWidth is the whole container including its side margins (border-box);
  // 0 means no maximum.
  const settings = { columns: 12, gutter: 24, maxWidth: 1200, margin: 24 };

  function render() {
    if (!el) return;
    const inner = el.firstChild;
    Object.assign(inner.style, {
      maxWidth:            settings.maxWidth ? settings.maxWidth + 'px' : 'none',
      padding:             `0 ${settings.margin}px`,
      columnGap:           settings.gutter + 'px',
      gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`,
    });
    inner.replaceChildren(...Array.from({ length: settings.columns }, () => document.createElement('div')));
  }

  function show() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'msr-grid';
    el.appendChild(document.createElement('div')).className = 'msr-grid-inner';
    ui.root.appendChild(el);
    render();
  }

  function hide() {
    el?.remove();
    el = null;
  }

  function set(partial) {
    Object.assign(settings, partial);
    render();
  }

  return { show, hide, set, settings };
})();
