/**
 * Shared helpers for Playwright extension tests.
 */
const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist', 'chrome');

async function launchExtension() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');

  const extensionId = new URL(worker.url()).hostname;
  return { context, extensionId, worker };
}

async function getTabId(worker, page) {
  const tabId = await worker.evaluate(async () => {
    const tabs = await new Promise(resolve =>
      chrome.tabs.query({ active: true, currentWindow: true }, resolve)
    );
    return tabs[0]?.id ?? null;
  });
  if (tabId === null) throw new Error(`Could not find active tab for ${page.url()}`);
  return tabId;
}

async function ensureInjected(worker, page) {
  const tabId = await getTabId(worker, page);
  const alreadyInjected = await worker.evaluate(async ({ tabId }) => {
    try {
      await chrome.tabs.sendMessage(tabId, { action: '__ping__' });
      return true;
    } catch {
      return false;
    }
  }, { tabId });
  if (alreadyInjected) return tabId;

  // activeTab requires a real user gesture. Press the extension's
  // keyboard shortcut via the page — that fires _execute_action, which
  // grants activeTab and lets background.js inject content scripts.
  await page.bringToFront();
  await page.keyboard.press('Alt+Shift+M');
  await page.waitForFunction(
    () => document.getElementById('msr-toolbar') !== null,
    null,
    { timeout: 3000 }
  );
  // First press showed the toolbar — press again to hide so tests start clean.
  await page.keyboard.press('Alt+Shift+M');
  await page.waitForFunction(
    () => {
      const tb = document.getElementById('msr-toolbar');
      return !tb || tb.style.display === 'none' || !tb.offsetParent;
    },
    null,
    { timeout: 3000 }
  );
  return tabId;
}

async function sendToContent(worker, page, msg) {
  const tabId = await ensureInjected(worker, page);
  await worker.evaluate(
    ({ tabId, msg }) => chrome.tabs.sendMessage(tabId, msg),
    { tabId, msg }
  );
  await page.waitForTimeout(100);
}

async function activateTool(worker, page, tool, enabled) {
  await sendToContent(worker, page, { tool, enabled });
}

async function setGuideDirection(worker, page, dir) {
  await sendToContent(worker, page, { direction: dir });
}

async function setGapVisible(worker, page, visible) {
  await sendToContent(worker, page, { gapVisible: visible });
}

async function toggleToolbar(worker, page) {
  await sendToContent(worker, page, { action: 'toggleToolbar' });
}

async function clearGuides(worker, page) {
  await sendToContent(worker, page, { clearGuides: true });
}

module.exports = { launchExtension, activateTool, setGuideDirection, setGapVisible, toggleToolbar, clearGuides };
