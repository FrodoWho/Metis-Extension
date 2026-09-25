/**
 * Shared helpers for Playwright extension tests.
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const DIST_PATH = path.resolve(__dirname, '..', 'dist', 'chrome');

// The shipped manifest only has activeTab, which needs a real user gesture.
// Synthetic key presses don't fire extension commands, so tests run against a
// copy that is also allowed to script the local test server.
function buildTestExtension() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-test-'));
  fs.cpSync(DIST_PATH, dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = ['http://localhost:4321/*'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return dir;
}

const EXTENSION_PATH = buildTestExtension();

async function launchExtension() {
  const context = await chromium.launchPersistentContext('', {
    // The 'chromium' channel's new headless mode supports extensions, so tests
    // don't open windows. HEADED=1 shows the browser for debugging.
    channel: 'chromium',
    headless: !process.env.HEADED,
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

  // Same path as an icon click: toggleInTab (background.js) injects on first
  // use. Toggle twice so tests start with the toolbar built but hidden.
  await worker.evaluate(async ({ tabId }) => {
    await toggleInTab(tabId);
    await toggleInTab(tabId);
  }, { tabId });
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
