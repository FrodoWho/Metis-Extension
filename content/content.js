chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'toggleToolbar') {
    toolbar.toggle();
    return;
  }
  // Direct control — used by automated tests
  if (msg.tool !== undefined) {
    if (msg.tool === 'measure') msg.enabled ? measure.enable() : measure.disable();
    if (msg.tool === 'guides')  msg.enabled ? guides.enable()  : guides.disable();
  }
  if (msg.direction  !== undefined) guides.setDirection(msg.direction);
  if (msg.gapVisible !== undefined) guides.setGapVisible(msg.gapVisible);
});
