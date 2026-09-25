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
| Move toolbar | Drag the **⠿** grip, double-click it to reset |
| Measure mode | Click **📐 Measure** or press **M**: hover to inspect, click to lock |
| Select parent / child | **↑** / **↓** while measuring |
| Distance between elements | Lock an element, then hover another |
| Guides mode | Click **📏 Guides** or press **G**: click to place, drag a guide to move it, click it to remove |
| Nudge last guide | **←** **→** (vertical) or **↑** **↓** (horizontal), hold **Shift** for 10px |
| Switch direction | Press **V** or **H** while guides is active |
| Show gaps | Click **Gap** to see distances between guides |
| Clear all guides | Click **Clear** |
| Snap to element | Guides auto-snap to element edges/centers (hold **Shift** to bypass) |
| Turn tool off / close | **Esc** (first the active tool, then the toolbar) |

Measure and Guides are mutually exclusive, enabling one disables the other. Guides stay on screen while you measure, until you click **Clear** or close the toolbar.

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
    ui.js              Shadow root host, hit-testing through extension UI
    overlay.js         Full-screen pointer-event blocker (shared by both tools)
    guides.js          Ghost preview, snap-to-element, drag/nudge, gap labels
    measure.js         Hover highlight, click-to-lock, box model panel, distances
    toolbar.js         Draggable toolbar, mutual exclusivity, keyboard shortcuts
```

Scripts load in order: `styles → ui → overlay → guides → measure → toolbar → content`.

All UI lives in a single shadow root on `<html>`, so page CSS can't restyle it.

## Limitations

- Cannot measure inside iframes or shadow DOM
- Pages with CSS `transform` on `<html>` may show offset measurements
- Guides are viewport-relative and don't survive page reload

## Support

If this tool helps your workflow, consider buying me a coffee:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/frodowho)
