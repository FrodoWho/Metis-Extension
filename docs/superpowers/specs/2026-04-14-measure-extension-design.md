# Measure Extension — Design Spec

**Date:** 2026-04-14
**Status:** Approved

---

## Overview

A Chromium browser extension with two independent developer tools:

1. **Measure tool** — click any element on the page to lock a measurement overlay showing its full box model (width, height, position, padding, margin). Multiple elements can be locked simultaneously.
2. **Guides tool** — click anywhere on the page to place a full-height vertical red guide line at that X position. Click the line again to remove it. Used for checking horizontal alignment across modules.

Both tools are toggled independently from the extension popup and are session-only (no persistence across navigation or refresh).

---

## Architecture

Manifest V3. Vanilla JS, no build step, no dependencies.

```
measure-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   └── popup.js
├── content/
│   ├── content.js          # Entry point; message handler
│   ├── content.css         # Styles for all overlays
│   └── modules/
│       ├── measure.js      # Element measurement tool
│       └── guides.js       # Vertical guide lines tool
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

The content script is declared in `manifest.json` and injected into every page automatically, but starts completely idle. Each module exposes only `enable()` and `disable()`, manages its own event listeners, and cleans up completely on disable.

---

## Popup

Light theme, ~280px wide. Two clickable full-width panel rows:

- `📐 Measure` — toggles the measure tool
- `📏 Guides` — toggles the guides tool

Each row shows a dark background and an "ON" badge when active, and appears muted when off.

**Message format** sent to the active tab on each toggle:

```js
{ tool: 'measure' | 'guides', enabled: boolean }
```

`popup.js` uses `chrome.tabs.query` to get the active tab and sends the message via `chrome.tabs.sendMessage`.

---

## Measure Tool (`content/modules/measure.js`)

### Enable

- Attaches a `mousemove` listener to `document` that draws a purple highlight border on the element currently under the cursor (using a single reused overlay div).
- Attaches a `click` listener to `document`.

### On click

1. Determine the element under the cursor (via `event.target`, skipping any overlay elements injected by the extension).
2. If the element already has a locked measurement → remove its overlays and unlock it.
3. Otherwise → lock it:
   - Compute position and size using `element.getBoundingClientRect()`.
   - Compute box model values using `getComputedStyle(element)` (padding and margin for all four sides).
   - Render three `position: fixed` overlay elements:
     - **Width label** — centered on the top edge of the element: `↔ 320px`
     - **Height label** — centered on the right edge of the element: `↕ 48px`
     - **Box model panel** — dark monospace panel positioned near the element (below or above, whichever fits):
       ```
       BOX MODEL
       w   320px
       h    48px
       pad  8px 16px
       mar  0 auto
       x   120px
       y   340px
       ```

Locked measurements are tracked in an array. Each entry holds references to its overlay DOM nodes so they can be removed cleanly.

### Disable

Removes all locked measurement overlays, removes the hover highlight, and detaches all event listeners.

---

## Guides Tool (`content/modules/guides.js`)

### Enable

- Sets `document.body.style.cursor = 'crosshair'`.
- Attaches a `click` listener to `document`.

### On click

1. If `event.target` is an existing guide line element → remove it from the DOM and from the internal array.
2. Otherwise → create a guide line:
   - A `position: fixed; top: 0; bottom: 0; width: 1px; left: <X>px` div with `background: rgba(239, 68, 68, 0.8)`.
   - A small label at the top of the line showing the X coordinate: `132px`, with `background: rgba(239, 68, 68, 0.9); color: #fff`.
   - The guide line is a container div with a 1px visible red child and an 8px transparent overlay child (both `position: absolute`, full height). The 8px overlay has `pointer-events: auto` and its `click` handler removes the guide. The visible line has `pointer-events: none`.

Guide lines exist only for the current page session. On navigation (page unload), they disappear naturally with the DOM.

### Disable

Removes all guide line elements from the DOM, restores `cursor`, and detaches event listeners.

---

## Content Script (`content/content.js`)

Loaded via `manifest.json`'s `content_scripts.js` array (along with `measure.js` and `guides.js`, loaded in order). Listens for messages from the popup:

```js
chrome.runtime.onMessage.addListener(({ tool, enabled }) => {
  if (tool === 'measure') enabled ? measure.enable() : measure.disable();
  if (tool === 'guides') enabled ? guides.enable() : guides.disable();
});
```

No background service worker is needed — the popup communicates directly with the content script.

---

## Manifest

```json
{
  "manifest_version": 3,
  "name": "Measure",
  "version": "0.1.0",
  "description": "Inspect element dimensions and place alignment guides on any page.",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/modules/guides.js", "content/modules/measure.js", "content/content.js"],
    "css": ["content/content.css"],
    "run_at": "document_idle"
  }]
}
```

---

## Overlay Positioning Notes

- All overlays use `position: fixed` so they stay anchored to the viewport. Since `getBoundingClientRect()` also returns viewport-relative coordinates, no scroll offset calculation is needed.
- Overlays are injected into `document.body` with a high `z-index` (e.g. `2147483647`).
- All overlay elements carry a `data-measure-extension` attribute so the measure tool's click handler can skip them (preventing clicks on overlays from triggering new measurements).

---

## Out of Scope

- Horizontal guide lines
- Persistence across page loads
- Distance measurement between two elements
- Iframe support
