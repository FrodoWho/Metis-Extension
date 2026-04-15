/**
 * Shared helpers for Playwright extension tests.
 */
const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '..');

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
  const url = page.url();
  const tabId = await worker.evaluate(async (pageUrl) => {
    const tabs = await new Promise(resolve => chrome.tabs.query({ url: pageUrl }, resolve));
    return tabs[0]?.id ?? null;
  }, url);
  if (tabId === null) throw new Error(`Could not find tab for ${url}`);
  return tabId;
}

async function sendToContent(worker, page, msg) {
  const tabId = await getTabId(worker, page);
  await worker.evaluate(
    ({ tabId, msg }) => new Promise(resolve => chrome.tabs.sendMessage(tabId, msg, resolve)),
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
