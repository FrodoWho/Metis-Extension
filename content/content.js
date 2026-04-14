chrome.runtime.onMessage.addListener(({ tool, enabled }) => {
  toolbar.syncFromPopup(tool, enabled);
});
