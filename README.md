# Metis

Chrome extension for inspecting element dimensions and placing alignment guides on any page. Named after the Greek Titan goddess of wisdom and craft.

## Install

1. Clone this repo and run `npm run build`
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select `dist/chrome`
4. The 📏 icon appears in the toolbar, click it or press **Alt+Shift+M (⌥⇧M on Mac)** to toggle

## Usage

| Action | How |
|---|---|
| Toggle toolbar | Click extension icon or **Alt+Shift+M** (Mac: **⌥⇧M**) |
| Move toolbar | Drag the **⠿** grip, double-click it to reset (position is remembered) |
| Collapse toolbar | Click **–**, the active tool keeps running |
| Viewport size | Shown in the toolbar, as media queries see it |
| **Measure** | Click **📐 Measure** or press **M**: hover to inspect, click to lock |
| Margin / padding | Shaded orange / green on hover |
| Select parent / child | **↑** / **↓** while measuring (also into web components) |
| Distance between elements | Lock an element, then hover another |
| Typography | Size, line height, weight, family, color and WCAG contrast for text |
| px / rem | Toggle in the measure row (remembered) |
| Copy as CSS | **Copy CSS** or **C** copies the selected element's size, spacing and type |
| **Guides** | Click **📏 Guides** or press **G**: click to place, drag a guide to move it, click it to remove |
| Rulers | Drag out of the top ruler (horizontal) or left ruler (vertical), drop back to cancel |
| Nudge last guide | **←** **→** (vertical) or **↑** **↓** (horizontal), hold **Shift** for 10px |
| Switch direction | Press **V** or **H** while guides is active |
| Show gaps | Click **Gap** to see distances between guides |
| Pin to page | Click **Pin** so guides scroll with the page (remembered) |
| Clear all guides | Click **Clear** |
| Snap to element | Guides auto-snap to element edges/centers (hold **Shift** to bypass) |
| **Layout grid** | Click **▦ Grid** or press **L**, set columns, gutter, max width and margin (remembered) |
| **Design overlay** | Click **🖼 Overlay** or press **O**, pick an image, set opacity, scale, alignment or **Diff** |
| Turn tool off / close | **Esc** (first the active tool, then the toolbar) |

Measure and Guides are mutually exclusive, enabling one disables the other. Grid and Overlay are visual layers that combine with either. Guides stay on screen while you measure, until you click **Clear** or close the toolbar.

Settings are stored with `chrome.storage.local` (the `storage` permission). Nothing leaves your browser.

## Tests

```sh
npm install
npm test              # builds dist/chrome, runs Playwright headless
npm run test:headed   # same, with a visible browser
```

Requires Chromium (installed by Playwright on first run).

## Architecture

```
background.js          Service worker, injects content scripts on icon click
content/
  content.js           Message router (try/catch boundary)
  styles.js            All extension UI styles (injected into the shadow root)
  modules/
    ui.js              Shadow root host, hit-testing, storage, clipboard, toast
    overlay.js         Full-screen pointer-event blocker (shared by both tools)
    guides.js          Ghost preview, snapping, drag/nudge, gaps, pinning, rulers
    grid.js            Column layout grid (CSS grid)
    mockup.js          Design image overlay
    measure.js         Box model panel, margin/padding bands, distances, contrast, copy CSS
    toolbar.js         Toolbar rows, prefs, keyboard shortcuts
```

Scripts load in order: `styles → ui → overlay → guides → grid → mockup → measure → toolbar → content`.

All UI lives in a single shadow root on `<html>`, so page CSS can't restyle it. While a modal `<dialog>` is open the root moves into it, since everything outside a modal dialog is inert.

## Limitations

- Cannot measure inside iframes or closed shadow roots
- Pages with CSS `transform` on `<html>` may show offset measurements
- Guides and the overlay image don't survive a page reload
- Contrast is measured against background colors only, not images or gradients

## Support

If this tool helps your workflow, consider buying me a coffee:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/frodowho)
