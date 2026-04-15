// When the user clicks the extension icon (no popup), toggle the in-page toolbar.
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggleToolbar' }).catch(() => {});
});
