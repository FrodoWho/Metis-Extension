# Metis

Chrome extension for inspecting element dimensions and placing alignment guides on any page. Named after the Greek Titan goddess of wisdom and craft.

## Install

1. Clone this repo
2. Open `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select this directory
4. The 📏 icon appears in the toolbar, click it or press **Alt+Shift+M (⌥⇧M on Mac)** to toggle

## Usage

| Action | How |
|---|---|
| Toggle toolbar | Click extension icon or **Alt+Shift+M** (Mac: **⌥⇧M**) |
| Measure mode | Click **📐 Measure** — hover to inspect, click to lock |
| Guides mode | Click **📏 Guides** — click to place, click guide to remove |
| Switch direction | Press **V** or **H** while guides is active |
| Show gaps | Click **Gap** to see distances between guides |
| Clear all guides | Click **Clear** |
| Snap to element | Guides auto-snap to element edges/centers (hold **Shift** to bypass) |

Measure and Guides are mutually exclusive, enabling one disables the other.

## Tests

```sh
npm install
npm test              # headless
npm run test:headed   # visible browser
```

Requires Chromium (installed by Playwright on first run).

## Architecture

```
background.js          Service worker — forwards icon click to content script
content/
  content.js           Message router (try/catch boundary)
  content.css          All extension UI styles
  modules/
    overlay.js         Full-screen pointer-event blocker (shared by both tools)
    measure.js         Hover highlight, click-to-lock, box model panel
    guides.js          Ghost preview, snap-to-element, gap labels
    toolbar.js         Floating toolbar, mutual exclusivity, keyboard shortcuts
```

Scripts load in order: `overlay → guides → measure → toolbar → content`.

## Limitations

- Cannot measure inside iframes or shadow DOM
- Pages with CSS `transform` on `<html>`/`<body>` may show offset measurements
- Guides are viewport-relative and don't survive page reload

## Support

If this tool helps your workflow, consider buying me a coffee:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/frodowho)
