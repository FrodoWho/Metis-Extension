// Content scripts are injected on demand (activeTab + scripting) so the
// extension asks for no host permissions until the user explicitly activates
// it via the toolbar icon or the Alt+Shift+M command.

const CONTENT_JS = [
  'content/modules/overlay.js',
  'content/modules/guides.js',
  'content/modules/measure.js',
  'content/modules/toolbar.js',
  'content/content.js',
];
const CONTENT_CSS = ['content/content.css'];

async function toggleInTab(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'toggleToolbar' });
  } catch {
    await chrome.scripting.insertCSS({ target: { tabId }, files: CONTENT_CSS });
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_JS });
    await chrome.tabs.sendMessage(tabId, { action: 'toggleToolbar' });
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id != null) toggleInTab(tab.id);
});
