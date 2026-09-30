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

  // ── The page's own grid ──────────────────────────────────────

  const px = v => parseFloat(v) || 0;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const lcm = (a, b) => a / gcd(a, b) * b;

  /** Horizontal extent of an element's border box, or of its content box. */
  function span(node, content = false) {
    const r = node.getBoundingClientRect();
    if (!content) return { left: r.left, right: r.right };
    const cs = getComputedStyle(node);
    return {
      left:  r.left  + px(cs.borderLeftWidth)  + px(cs.paddingLeft),
      right: r.right - px(cs.borderRightWidth) - px(cs.paddingRight),
    };
  }

  /** A px max-width as our border-box maxWidth; 0 for none, % or calc(). */
  function maxWidthOf(node) {
    const cs = getComputedStyle(node);
    if (!cs.maxWidth.endsWith('px')) return 0;
    const extra = cs.boxSizing === 'border-box' ? 0
      : px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth);
    return Math.round(px(cs.maxWidth) + extra);
  }

  /** Content width (nearest px max-width) and margin for columns starting at x. */
  function frame(node, x) {
    let c = node;
    while (c && !maxWidthOf(c)) c = c.parentElement;
    return {
      maxWidth: c ? maxWidthOf(c) : 0,
      // Columns wider than their container (negative margins) start at its edge
      margin: Math.max(0, Math.round(x - (c ? c.getBoundingClientRect().left : 0))),
    };
  }

  /** Count how often a key occurs, keeping the data of its first element. */
  function tally(map, key, data) {
    const hit = map.get(key) ?? { ...data, count: 0 };
    hit.count++;
    map.set(key, hit);
    return hit;
  }

  const mostCommon = (map, tiebreak) =>
    [...map.values()].sort((a, b) => b.count - a.count || tiebreak(a, b))[0];

  /**
   * Fewest columns in which every width spans a whole number of columns: in
   * N columns, k of them are k·(width + gutter)/N − gutter wide. Up to 12, so
   * content-sized flex items don't fit a big N by chance. 0 when none fits.
   */
  function columnsOf(widths, gutter, width) {
    for (let n = widths.length; n <= 12; n++) {
      const step = (width + gutter) / n;
      if (widths.every(w => Math.abs((w + gutter) / step - Math.round((w + gutter) / step)) * step < 1)) return n;
    }
    return 0;
  }

  /**
   * A flex or float row's first line as columns. Padding-based systems
   * (Bootstrap, GOV.UK) put the gutter in the items' padding, so without a
   * gap the items' content boxes are the columns.
   */
  function rowOf(node, cs) {
    const kids = [...node.children].filter(k =>
      k.getBoundingClientRect().width > 0 && !/absolute|fixed/.test(getComputedStyle(k).position));
    if (kids.length < 2) return null;
    const isRow = cs.display.endsWith('flex') ? cs.flexDirection === 'row'
      : getComputedStyle(kids[0]).float === 'left';
    if (!isRow) return null;
    // The first line ends where an item wraps back to the left
    const line = [kids[0]];
    for (const k of kids.slice(1)) {
      if (span(k).left < span(line.at(-1)).right - 1) break;
      line.push(k);
    }
    if (line.length < 2) return null;
    const gap = px(cs.columnGap);
    const boxes = line.map(k => span(k, !gap));
    const gutters = boxes.slice(1).map((b, i) => b.left - boxes[i].right);
    if (gutters.some(g => g < 0 || Math.abs(g - gutters[0]) > 1)) return null;
    const gutter = gutters[0];
    const inset = gap ? 0 : gutter / 2;
    const own = span(node, true);
    const width = own.right - own.left - 2 * inset;
    const columns = columnsOf(boxes.map(b => b.right - b.left), gutter, width);
    return columns ? { node, x: own.left + inset, columns, gutter: Math.round(gutter), width: Math.round(width) } : null;
  }

  /**
   * Read the layout grid from the page's CSS. Only elements at least half the
   * viewport wide count, the rest are components. A design system reuses its
   * grid per section and a one-off showcase grid doesn't, so the most common
   * one wins:
   * - CSS grids with equal columns: their tracks are the columns, ties going
   *   to more columns.
   * - Flex and float rows (Bootstrap, GOV.UK), grouped by gutter and width:
   *   each row needs the fewest columns its items fit, together the least
   *   common multiple, rounded up to 12, 16 or 24 when that fits them all.
   *   CSS grids win ties.
   * The content width is the nearest ancestor with a px max-width.
   * Returns all four settings, or null when the page has no grid.
   * ponytail: the overlay is centered, so off-center grids (next to a
   * sidebar) won't line up; RTL and row-reverse rows aren't read.
   */
  function detect() {
    const vw = document.documentElement.clientWidth;
    const grids = new Map();      // "columns gutter width" → { node, x, columns, gutter, count }
    const rows = new Map();       // "gutter width" → { node, x, columns, gutter, count }
    for (const node of document.querySelectorAll('body *')) {
      const r = node.getBoundingClientRect();
      if (r.width < vw / 2) continue;
      const cs = getComputedStyle(node);
      if (cs.display.endsWith('grid')) {
        const tracks = cs.gridTemplateColumns.replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).map(parseFloat);
        if (tracks.length > 1 && tracks.every(t => Math.abs(t - tracks[0]) < 1)) {
          const gutter = Math.round(px(cs.columnGap));
          tally(grids, `${tracks.length} ${gutter} ${Math.round(r.width)}`,
            { node, x: span(node, true).left, columns: tracks.length, gutter });
        }
      } else {
        const row = rowOf(node, cs);
        if (row) {
          const hit = tally(rows, `${row.gutter} ${row.width}`, row);
          hit.columns = lcm(hit.columns, row.columns);
        }
      }
    }

    const grid = mostCommon(grids, (a, b) => b.columns - a.columns);
    const row  = mostCommon(rows, (a, b) => b.width - a.width);
    if (row && row.count > (grid?.count ?? 0)) {
      const columns = [12, 16, 24].find(n => n % row.columns === 0) ?? row.columns;
      return { columns, gutter: row.gutter, ...frame(row.node, row.x) };
    }
    if (grid) return { columns: grid.columns, gutter: grid.gutter, ...frame(grid.node, grid.x) };
    return null;
  }

  return { show, hide, set, detect, settings };
})();
