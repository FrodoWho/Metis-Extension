# Measure Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chromium Manifest V3 extension with two independent tools — element measurement (click to lock full box model overlays on any element) and vertical guide lines (click to place/remove red alignment guides spanning the full page height).

**Architecture:** Vanilla JS, no build step. A content script (always injected, always idle) receives messages from the popup to activate or deactivate two independent tool modules (`measure.js`, `guides.js`). Each module owns its DOM overlays and event listeners and cleans up completely on disable.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Chrome Extension Manifest V3 (`chrome.tabs`, `chrome.runtime`)

---

## File Map

| File | Responsibility |
|------|----------------|
| `manifest.json` | Extension config, content script declaration |
| `popup/popup.html` | Extension popup markup |
| `popup/popup.css` | Popup styles — light theme, two button-panel rows |
| `popup/popup.js` | Toggle state, sends enable/disable messages to content script |
| `content/content.js` | Message listener, delegates to `measure` and `guides` modules |
| `content/content.css` | All overlay styles: hover highlight, edge labels, panel, guide lines |
| `content/modules/measure.js` | Hover highlight + click-to-lock box model overlays |
| `content/modules/guides.js` | Click-to-place/remove red vertical guide lines |
| `icons/icon{16,48,128}.png` | Extension icons (generated as solid dark squares) |

---

### Task 1: Project Scaffold

**Files:**
- Create: `manifest.json`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
- Create: `popup/popup.html`, `popup/popup.css`, `popup/popup.js` (stubs)
- Create: `content/content.js`, `content/content.css` (stubs)
- Create: `content/modules/measure.js`, `content/modules/guides.js` (stubs)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p popup content/modules icons
```

- [ ] **Step 2: Generate placeholder icons**

```bash
python3 -c "
import struct, zlib

def make_png(size, r, g, b):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    row = b'\x00' + bytes([r, g, b] * size)
    idat = zlib.compress(row * size)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

for size in [16, 48, 128]:
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size, 17, 17, 17))
print('Icons created')
"
```

Expected output: `Icons created`

- [ ] **Step 3: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Measure",
  "version": "0.1.0",
  "description": "Inspect element dimensions and place alignment guides on any page.",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": [
      "content/modules/guides.js",
      "content/modules/measure.js",
      "content/content.js"
    ],
    "css": ["content/content.css"],
    "run_at": "document_idle"
  }]
}
```

- [ ] **Step 4: Create stub files**

`popup/popup.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <p style="padding:12px;font-family:system-ui;">Loading...</p>
  <script src="popup.js"></script>
</body>
</html>
```

`popup/popup.css` — create as an empty file.

`popup/popup.js`:
```js
console.log('popup loaded');
```

`content/content.css` — create as an empty file.

`content/content.js`:
```js
console.log('measure extension content script loaded');
```

`content/modules/measure.js`:
```js
const measure = (() => {
  function enable()  { console.log('measure enabled');  }
  function disable() { console.log('measure disabled'); }
  return { enable, disable };
})();
```

`content/modules/guides.js`:
```js
const guides = (() => {
  function enable()  { console.log('guides enabled');  }
  function disable() { console.log('guides disabled'); }
  return { enable, disable };
})();
```

- [ ] **Step 5: Initialise git and load extension in Chrome**

```bash
git init
```

Then in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** → select the `measure-extension` folder
4. Verify the extension card appears with no errors

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold project structure"
```

---

### Task 2: Content CSS

**Files:**
- Modify: `content/content.css`

- [ ] **Step 1: Write all overlay styles**

```css
/* Hover highlight ring shown while hovering in measure mode */
.msr-hover-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(99, 102, 241, 0.8);
  background: rgba(99, 102, 241, 0.05);
  border-radius: 2px;
  z-index: 2147483646;
}

/* Width / height edge labels */
.msr-edge-label {
  position: fixed;
  background: #111;
  color: #fff;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
  z-index: 2147483647;
  white-space: nowrap;
  pointer-events: none;
}

/* Box model panel */
.msr-panel {
  position: fixed;
  background: #111;
  color: #e0e0e0;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 10px;
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: 6px;
  z-index: 2147483647;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.msr-panel-title {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #555;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.msr-panel-row {
  display: grid;
  grid-template-columns: 36px auto;
  gap: 0 8px;
}

.msr-panel-key { color: #6366f1; }

.msr-panel-sep {
  height: 1px;
  background: #222;
  margin: 5px 0;
}

/* Guide line container — zero-width, full viewport height */
.msr-guide {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 0;
  z-index: 2147483647;
}

/* Visible 1px red line */
.msr-guide-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: rgba(239, 68, 68, 0.8);
  pointer-events: none;
}

/* 8px invisible hit zone centred on the 1px line */
.msr-guide-hit {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  width: 8px;
  cursor: pointer;
  pointer-events: auto;
}

/* X coordinate label */
.msr-guide-label {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 2px;
  pointer-events: none;
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add content/content.css
git commit -m "feat: add content script overlay styles"
```

---

### Task 3: Popup

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.css`
- Modify: `popup/popup.js`

- [ ] **Step 1: Write `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="logo"></div>
      <span class="title">measure</span>
    </header>
    <div class="tool" data-tool="measure">
      <div class="tool-info">
        <span class="tool-icon">📐</span>
        <span class="tool-name">Measure</span>
      </div>
      <span class="badge">OFF</span>
    </div>
    <div class="tool" data-tool="guides">
      <div class="tool-info">
        <span class="tool-icon">📏</span>
        <span class="tool-name">Guides</span>
      </div>
      <span class="badge">OFF</span>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `popup/popup.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  width: 280px;
  background: #fff;
}

.container { padding: 12px; }

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.logo {
  width: 18px;
  height: 18px;
  background: #111;
  border-radius: 3px;
}

.title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111;
}

.tool {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s, border-color 0.1s;
}

.tool:last-child { margin-bottom: 0; }
.tool:hover { border-color: #bbb; }

.tool.active {
  background: #111;
  border-color: #111;
}

.tool-info { display: flex; align-items: center; gap: 8px; }
.tool-icon  { font-size: 14px; }

.tool-name {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.tool.active .tool-name { color: #fff; }

.badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #bbb;
}

.tool.active .badge {
  color: #888;
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 3px;
}
```

- [ ] **Step 3: Write `popup/popup.js`**

```js
const state = { measure: false, guides: false };

document.querySelectorAll('.tool').forEach((row) => {
  row.addEventListener('click', () => {
    const tool = row.dataset.tool;
    state[tool] = !state[tool];
    updateRow(row, state[tool]);
    sendMessage(tool, state[tool]);
  });
});

function updateRow(row, enabled) {
  const badge = row.querySelector('.badge');
  if (enabled) {
    row.classList.add('active');
    badge.textContent = 'ON';
  } else {
    row.classList.remove('active');
    badge.textContent = 'OFF';
  }
}

function sendMessage(tool, enabled) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { tool, enabled });
  });
}
```

- [ ] **Step 4: Verify in Chrome**

1. Reload the extension at `chrome://extensions`
2. Click the extension icon in the toolbar
3. Verify: popup opens showing "📐 Measure" and "📏 Guides" rows, both showing "OFF"
4. Click "Measure" — verify row turns dark with "ON" badge; click again to verify it reverts

- [ ] **Step 5: Commit**

```bash
git add popup/popup.html popup/popup.css popup/popup.js
git commit -m "feat: add popup UI with tool toggles"
```

---

### Task 4: Content Script Message Handler

**Files:**
- Modify: `content/content.js`

- [ ] **Step 1: Write message listener**

```js
chrome.runtime.onMessage.addListener(({ tool, enabled }) => {
  if (tool === 'measure') enabled ? measure.enable() : measure.disable();
  if (tool === 'guides')  enabled ? guides.enable()  : guides.disable();
});
```

- [ ] **Step 2: Verify message flow in Chrome**

1. Reload the extension
2. Open any webpage (e.g. `https://example.com`)
3. Open DevTools → **Console** (make sure the page's console is selected, not the extension)
4. Click "Measure" toggle in the popup to ON
5. Verify console shows: `measure enabled`
6. Click again to OFF — verify: `measure disabled`
7. Repeat with "Guides"

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: wire content script message handler to tool modules"
```

---

### Task 5: Measure — Hover Highlight

**Files:**
- Modify: `content/modules/measure.js`

- [ ] **Step 1: Implement hover highlight**

Replace the entire contents of `content/modules/measure.js` with:

```js
const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null;
  let hoverEl = null;

  function isExtEl(el) {
    return el && el.hasAttribute && el.hasAttribute(EXT_ATTR);
  }

  function createHighlight() {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-hover-highlight');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function onMouseMove(e) {
    const el = e.target;
    if (isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    const rect = el.getBoundingClientRect();
    highlight.style.left    = rect.left   + 'px';
    highlight.style.top     = rect.top    + 'px';
    highlight.style.width   = rect.width  + 'px';
    highlight.style.height  = rect.height + 'px';
    highlight.style.display = 'block';
  }

  function enable() {
    highlight = createHighlight();
    document.addEventListener('mousemove', onMouseMove, true);
  }

  function disable() {
    document.removeEventListener('mousemove', onMouseMove, true);
    highlight?.remove();
    highlight = null;
    hoverEl = null;
  }

  return { enable, disable };
})();
```

- [ ] **Step 2: Verify in Chrome**

1. Reload extension
2. Navigate to any webpage
3. Enable "Measure" in the popup
4. Move the mouse over elements — verify a purple/indigo border outline follows the hovered element
5. Disable "Measure" — verify the outline disappears completely

- [ ] **Step 3: Commit**

```bash
git add content/modules/measure.js
git commit -m "feat: add hover highlight to measure tool"
```

---

### Task 6: Measure — Lock on Click (Edge Labels + Box Model Panel)

**Files:**
- Modify: `content/modules/measure.js`

- [ ] **Step 1: Replace with full measure module**

Replace the entire contents of `content/modules/measure.js` with:

```js
const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null;
  let hoverEl = null;
  const locks = []; // { el, nodes: { wLabel, hLabel, panel } }

  /* ── Helpers ────────────────────────────────────────────── */

  function isExtEl(el) {
    return el && el.hasAttribute && el.hasAttribute(EXT_ATTR);
  }

  function getBoxModel(el) {
    const r  = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w:          Math.round(r.width),
      h:          Math.round(r.height),
      x:          Math.round(r.left),
      y:          Math.round(r.top),
      padTop:     cs.paddingTop,
      padRight:   cs.paddingRight,
      padBottom:  cs.paddingBottom,
      padLeft:    cs.paddingLeft,
      marTop:     cs.marginTop,
      marRight:   cs.marginRight,
      marBottom:  cs.marginBottom,
      marLeft:    cs.marginLeft,
    };
  }

  // Compress four equal sides into CSS shorthand (e.g. "8px" or "8px 16px")
  function shorthand(top, right, bottom, left) {
    if (top === right && right === bottom && bottom === left) return top;
    if (top === bottom && right === left) return `${top} ${right}`;
    return `${top} ${right} ${bottom} ${left}`;
  }

  /* ── Overlay builders ───────────────────────────────────── */

  function createHighlight() {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-hover-highlight');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function makeLabel(text) {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-edge-label');
    el.textContent = text;
    document.body.appendChild(el);
    return el;
  }

  function makePanel(bm) {
    const pad = shorthand(bm.padTop, bm.padRight, bm.padBottom, bm.padLeft);
    const mar = shorthand(bm.marTop, bm.marRight, bm.marBottom, bm.marLeft);
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-panel');
    el.innerHTML = `
      <div class="msr-panel-title">Box Model</div>
      <div class="msr-panel-row"><span class="msr-panel-key">w</span><span>${bm.w}px</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">h</span><span>${bm.h}px</span></div>
      <div class="msr-panel-sep"></div>
      <div class="msr-panel-row"><span class="msr-panel-key">pad</span><span>${pad}</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">mar</span><span>${mar}</span></div>
      <div class="msr-panel-sep"></div>
      <div class="msr-panel-row"><span class="msr-panel-key">x</span><span>${bm.x}px</span></div>
      <div class="msr-panel-row"><span class="msr-panel-key">y</span><span>${bm.y}px</span></div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function positionNodes(nodes, bm) {
    const { wLabel, hLabel, panel } = nodes;

    // Width label: centred above the top edge
    wLabel.style.left = (bm.x + bm.w / 2 - wLabel.offsetWidth  / 2) + 'px';
    wLabel.style.top  = (bm.y - wLabel.offsetHeight - 4)              + 'px';

    // Height label: centred beside the right edge
    hLabel.style.left = (bm.x + bm.w + 6)                            + 'px';
    hLabel.style.top  = (bm.y + bm.h / 2 - hLabel.offsetHeight / 2)  + 'px';

    // Panel: below element if there is room, otherwise above
    const gap = 8;
    const spaceBelow = window.innerHeight - (bm.y + bm.h);
    panel.style.left = bm.x + 'px';
    panel.style.top  = spaceBelow >= panel.offsetHeight + gap
      ? (bm.y + bm.h + gap) + 'px'
      : (bm.y - panel.offsetHeight - gap) + 'px';
  }

  /* ── Lock / unlock ──────────────────────────────────────── */

  function lockEl(el) {
    const bm     = getBoxModel(el);
    const wLabel = makeLabel(`↔ ${bm.w}px`);
    const hLabel = makeLabel(`↕ ${bm.h}px`);
    const panel  = makePanel(bm);
    const nodes  = { wLabel, hLabel, panel };
    // Wait one frame so offsetWidth/Height reflect actual rendered size
    requestAnimationFrame(() => positionNodes(nodes, bm));
    locks.push({ el, nodes });
  }

  function unlockEl(el) {
    const idx = locks.findIndex(l => l.el === el);
    if (idx === -1) return;
    Object.values(locks[idx].nodes).forEach(n => n.remove());
    locks.splice(idx, 1);
  }

  function isLocked(el) {
    return locks.some(l => l.el === el);
  }

  /* ── Event handlers ─────────────────────────────────────── */

  function onMouseMove(e) {
    const el = e.target;
    if (isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    const rect = el.getBoundingClientRect();
    highlight.style.left    = rect.left   + 'px';
    highlight.style.top     = rect.top    + 'px';
    highlight.style.width   = rect.width  + 'px';
    highlight.style.height  = rect.height + 'px';
    highlight.style.display = 'block';
  }

  function onClick(e) {
    if (isExtEl(e.target)) return;
    // Prevent the page's own click handlers from firing while measure is active
    e.stopPropagation();
    isLocked(e.target) ? unlockEl(e.target) : lockEl(e.target);
  }

  /* ── Public API ─────────────────────────────────────────── */

  function enable() {
    highlight = createHighlight();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click',     onClick,     true);
  }

  function disable() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click',     onClick,     true);
    highlight?.remove();
    highlight = null;
    hoverEl   = null;
    locks.forEach(({ nodes }) => Object.values(nodes).forEach(n => n.remove()));
    locks.length = 0;
  }

  return { enable, disable };
})();
```

- [ ] **Step 2: Verify in Chrome**

1. Reload extension
2. Navigate to any webpage and enable "Measure"
3. Click any element — verify:
   - A `↔ Npx` label appears above the element
   - A `↕ Npx` label appears to the right of the element
   - A dark panel appears near the element showing `w`, `h`, `pad`, `mar`, `x`, `y`
4. Click a second element — verify a second set of overlays appears while the first stays locked
5. Click an already-locked element — verify its three overlays are removed
6. Disable "Measure" — verify all overlays are gone

- [ ] **Step 3: Commit**

```bash
git add content/modules/measure.js
git commit -m "feat: implement measure tool with box model overlays"
```

---

### Task 7: Guides — Place and Remove Lines

**Files:**
- Modify: `content/modules/guides.js`

- [ ] **Step 1: Implement guides module**

Replace the entire contents of `content/modules/guides.js` with:

```js
const guides = (() => {
  const lines = []; // guide container DOM nodes

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
    document.body.style.cursor = 'crosshair';
    document.addEventListener('click', onClick, true);
  }

  function disable() {
    document.body.style.cursor = '';
    document.removeEventListener('click', onClick, true);
    lines.forEach(g => g.remove());
    lines.length = 0;
  }

  return { enable, disable };
})();
```

- [ ] **Step 2: Verify in Chrome**

1. Reload extension
2. Enable "Guides" in the popup
3. Verify the cursor changes to a crosshair
4. Click anywhere on the page — verify a red vertical line spans the full viewport height with an X coordinate label (e.g. `248px`)
5. Click a different spot — verify a second line appears independently
6. Click directly on an existing guide line (aim for the thin red line or just nearby) — verify it is removed
7. Disable "Guides" — verify all lines are gone and the cursor returns to the page default

- [ ] **Step 3: Commit**

```bash
git add content/modules/guides.js
git commit -m "feat: implement guides tool with click-to-place and click-to-remove"
```

---

### Task 8: Integration Verification

No code changes. Manual test pass across all features and edge cases.

- [ ] **Step 1: Both tools active simultaneously**

1. Enable both "Measure" and "Guides"
2. Verify the cursor is a crosshair
3. Move the mouse — verify hover highlight follows elements
4. Click an element — a guide line is placed at that X coordinate AND the element is measured (both actions fire; this is expected)
5. Click directly on a guide line to remove it — verify only the guide disappears; any measure overlays are unaffected

- [ ] **Step 2: Disable cleans up completely**

1. Lock several measurements and place several guide lines
2. Disable "Measure" — verify all measure overlays (edge labels + panels) are gone; guide lines are unaffected
3. Disable "Guides" — verify all guide lines are gone; cursor reverts to default
4. Move the mouse — verify no hover highlight remains

- [ ] **Step 3: Page interactivity**

1. Navigate to a page with clickable links (e.g. `https://example.com`)
2. Enable "Measure" only
3. Click a link — verify the page does NOT navigate (measure's `stopPropagation` in capture phase blocks the link's handler)
4. Disable "Measure", then click the link — verify the page navigates normally
5. Enable "Guides" only and click a link — verify the page DOES navigate (guides does not call `stopPropagation`) AND a guide line is placed first

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: measure extension v0.1.0 complete"
```
