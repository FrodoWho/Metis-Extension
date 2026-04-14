chrome.runtime.onMessage.addListener(({ tool, enabled }) => {
  if (tool === 'measure') enabled ? measure.enable() : measure.disable();
  if (tool === 'guides')  enabled ? guides.enable()  : guides.disable();
});
