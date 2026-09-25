// Injected as a <style> inside the extension's shadow root (see ui.js).
// Page CSS can't reach these elements and these rules can't leak out.
const MSR_CSS = `
/* Reset everything the host would otherwise inherit from the page. */
:host { all: initial; }

/* Full-screen capture overlay — absorbs all pointer events while a tool is
   active, preventing iframes, ads, and page scripts from receiving them. */
#msr-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2147483644; /* below guides (2147483646) and toolbar (2147483647) */
  pointer-events: all;
}

/* Hover highlight ring — indigo, shown while hovering in measure mode */
.msr-hover-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(99, 102, 241, 0.8);
  background: rgba(99, 102, 241, 0.05);
  border-radius: 2px;
  z-index: 2147483646; /* above lock rings (2147483645) */
}

/* Margin (orange) and padding (green) bands around the hovered element.
   The border widths are set to the element's margin / padding in JS. */
.msr-margin-box,
.msr-padding-box {
  position: fixed;
  box-sizing: border-box;
  border-style: solid;
  pointer-events: none;
  z-index: 2147483645;
}
.msr-margin-box  { border-color: rgba(246, 178, 107, 0.4); }
.msr-padding-box { border-color: rgba(147, 196, 125, 0.45); }

/* Locked measurement ring — orange, persists until clicked again */
.msr-lock-ring {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(251, 146, 60, 0.85);
  background: rgba(251, 146, 60, 0.06);
  border-radius: 2px;
  z-index: 2147483645;
}

/* Locked panel — same layout as hover panel, with orange title */
.msr-panel-locked .msr-panel-title { color: rgba(251, 146, 60, 0.9); }
.msr-panel-locked .msr-panel-key   { color: rgba(251, 146, 60, 0.7); }

/* Snap highlight — shown on the element a guide is snapping to */
.msr-snap-highlight {
  position: fixed;
  pointer-events: none;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.07);
  border-radius: 2px;
  z-index: 2147483645;
}

/* Ghost line is more solid when snapped */
.msr-guide-ghost.msr-guide-snapped .msr-guide-line {
  opacity: 0.75;
}

/* Distance between the last locked element and the hovered one */
.msr-dist-line {
  position: fixed;
  background: rgba(244, 63, 94, 0.9);
  pointer-events: none;
  z-index: 2147483646;
}

.msr-dist-label {
  position: fixed;
  background: rgba(244, 63, 94, 0.95);
  color: #fff;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 2px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
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
  text-transform: uppercase;
}

/* Which element is selected (tag#id.class) */
.msr-panel-tag {
  color: #999;
  margin-bottom: 6px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msr-panel-row {
  display: grid;
  grid-template-columns: 36px auto;
  gap: 0 8px;
}

.msr-panel-val {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msr-panel-key { color: #6366f1; }

.msr-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px #444;
}

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
  z-index: 2147483646;
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

/* 8px invisible hit zone centred on the 1px line. Only interactive while the
   guides tool is on, so guides left visible in measure mode don't block it. */
.msr-guide-hit {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  width: 8px;
  pointer-events: none;
}

:host(.msr-guides-on) .msr-guide-hit {
  pointer-events: auto;
  cursor: ew-resize;
}

:host(.msr-guides-on) .msr-guide-h .msr-guide-hit { cursor: ns-resize; }

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

/* ── Ghost guide (follows cursor, not interactive) ───────────── */
.msr-guide-ghost {
  pointer-events: none;
}
.msr-guide-ghost .msr-guide-line {
  opacity: 0.4;
}

/* ── Horizontal guide modifier ───────────────────────────────── */
.msr-guide.msr-guide-h {
  left: 0;
  right: 0;
  bottom: auto;
  width: 100vw;
  height: 0;
}
.msr-guide.msr-guide-h .msr-guide-line {
  top: 0;
  bottom: auto;
  left: 0;
  right: 0;
  width: 100vw;
  height: 1px;
}
.msr-guide.msr-guide-h .msr-guide-hit {
  top: -4px;
  bottom: auto;
  left: 0;
  right: 0;
  width: 100vw;
  height: 8px;
}
.msr-guide.msr-guide-h .msr-guide-label {
  top: 4px;
  left: 4px;
}

/* ── Gap label (px distance between adjacent parallel guides) ── */
.msr-gap-label {
  position: fixed;
  background: rgba(17, 17, 17, 0.85);
  color: #fff;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
}

/* ── Layout grid (columns) ───────────────────────────────────── */
.msr-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483643; /* under everything else of ours */
}
.msr-grid-inner {
  display: grid;
  box-sizing: border-box;
  height: 100%;
  margin: 0 auto;
}
.msr-grid-inner > div {
  background: rgba(239, 68, 68, 0.08);
  box-shadow: inset 1px 0 rgba(239, 68, 68, 0.3), inset -1px 0 rgba(239, 68, 68, 0.3);
}

/* ── Design overlay (mockup image) ───────────────────────────── */
.msr-mockup {
  position: absolute; /* from the document's top-left, scrolls with the page */
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  overflow: hidden;
  pointer-events: none;
  z-index: 2147483642;
}
.msr-mockup img {
  display: block;
  flex: none;
  max-width: none;
}

/* Short confirmation, e.g. after copying CSS */
.msr-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: #e0e0e0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 2147483647;
}

/* ── In-page toolbar ─────────────────────────────────────────── */
#msr-toolbar {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: system-ui, -apple-system, sans-serif;
}

#msr-toolbar.msr-tb-hidden { display: none; }

.msr-tb-row-main {
  background: #111;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  gap: 2px;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.msr-tb-row-sub {
  background: #1a1a1a;
  border-radius: 7px;
  padding: 4px;
  display: flex;
  gap: 2px;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.msr-tb-row-sub.msr-tb-hidden { display: none; }

/* Drag handle — move the toolbar off whatever you want to measure */
.msr-tb-grip {
  color: #555;
  font-size: 12px;
  line-height: 1;
  padding: 5px 4px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.msr-tb-grip:hover  { color: #999; }
.msr-tb-grip:active { cursor: grabbing; }

.msr-tb-btn {
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
  color: #888;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  font-family: inherit;
  transition: background 0.1s, color 0.1s;
}

.msr-tb-btn:hover { background: #2a2a2a; color: #ccc; }

.msr-tb-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 1px; }

.msr-tb-btn.msr-tb-btn-active { background: #6366f1; color: #fff; }

.msr-tb-kofi { color: #555; padding: 5px 7px; }
.msr-tb-kofi:hover { color: #fb923c; background: #1e1e1e; }

.msr-tb-viewport {
  font-size: 9px;
  color: #888;
  padding: 0 2px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  user-select: none;
  white-space: nowrap;
}

.msr-tb-collapse { color: #555; padding: 5px 7px; }
.msr-tb-collapse:hover { color: #999; background: #1e1e1e; }

/* Collapsed: only the grip and the expand button remain */
#msr-toolbar.msr-tb-collapsed .msr-tb-row-main > :not(.msr-tb-grip, .msr-tb-collapse),
#msr-toolbar.msr-tb-collapsed .msr-tb-row-sub { display: none; }

.msr-tb-close,
.msr-tb-remove { color: #555; padding: 5px 7px; }
.msr-tb-close:hover,
.msr-tb-remove:hover { color: #999; background: #1e1e1e; }

/* Labeled number input in a sub-row (grid settings) */
.msr-tb-field {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  color: #888;
  font-size: 10px;
  font-weight: 600;
}
.msr-tb-input {
  width: 46px;
  background: #222;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  font: inherit;
  padding: 3px 4px;
}
.msr-tb-input:focus-visible { outline: 2px solid #6366f1; outline-offset: 0; }
.msr-tb-select { width: auto; margin: 0 2px; }
.msr-tb-range  { width: 70px; accent-color: #6366f1; }

.msr-tb-sep {
  width: 1px;
  height: 16px;
  background: #333;
  margin: 0 2px;
  flex-shrink: 0;
}
`;
