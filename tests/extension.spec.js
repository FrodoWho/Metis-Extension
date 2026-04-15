/**
 * End-to-end tests for the Measure browser extension.
 *
 * Run:
 *   npm test               # headless
 *   npm run test:headed    # headed with visible window
 */

const { test, expect } = require('@playwright/test');
const path             = require('path');
const { launchExtension, activateTool, setGuideDirection, setGapVisible, toggleToolbar } = require('./helpers');

const TEST_PAGE = 'http://localhost:4321/';

let context, worker, page;

test.beforeEach(async () => {
  ({ context, worker } = await launchExtension());
  page = await context.newPage();
  await page.goto(TEST_PAGE);
  await page.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar
// ─────────────────────────────────────────────────────────────────────────────

test('toolbar appears when extension icon is clicked', async () => {
  await expect(page.locator('#msr-toolbar')).toHaveCount(0);
  await toggleToolbar(worker, page);
  await expect(page.locator('#msr-toolbar')).toBeVisible();
});

test('clicking extension icon again hides the toolbar and disables tools', async () => {
  await toggleToolbar(worker, page);
  await expect(page.locator('#msr-toolbar')).toBeVisible();

  // Activate guides via toolbar button, then move mouse to create ghost
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await page.mouse.move(300, 200);
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(1);

  // Second icon click: hides toolbar and cleans up tools
  await toggleToolbar(worker, page);
  await expect(page.locator('#msr-toolbar')).toBeHidden();
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(0);
});

test('close button (✕) hides the toolbar and disables all tools', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await page.mouse.move(300, 200); // ghost is created on first mousemove
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(1);

  await page.locator('.msr-tb-close').click();

  await expect(page.locator('#msr-toolbar')).toBeHidden();
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(0);
  const cursor = await page.evaluate(() => document.body.style.cursor);
  expect(cursor).not.toBe('crosshair');
});

test('Guides sub-row (V/H/Gap) appears only when Guides is active', async () => {
  await toggleToolbar(worker, page);
  await expect(page.locator('.msr-tb-row-sub')).toBeHidden();

  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await expect(page.locator('.msr-tb-row-sub')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — ghost preview
// ─────────────────────────────────────────────────────────────────────────────

test('ghost guide appears after moving the mouse in guides mode', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.move(300, 200);
  await expect(page.locator('.msr-guide-ghost .msr-guide-line')).toBeVisible();
});

test('ghost guide is not interactive (pointer-events: none)', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.move(300, 200);

  const pointerEvents = await page
    .locator('.msr-guide-ghost')
    .evaluate(el => getComputedStyle(el).pointerEvents);

  expect(pointerEvents).toBe('none');
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — placement
// ─────────────────────────────────────────────────────────────────────────────

test('clicking the page places a vertical guide', async () => {
  await activateTool(worker, page, 'guides', true);

  await page.mouse.click(400, 300);

  const guide = page.locator('.msr-guide:not(.msr-guide-ghost)');
  await expect(guide).toHaveCount(1);

  const classList = await guide.evaluate(el => [...el.classList]);
  expect(classList).not.toContain('msr-guide-h');

  const left = await guide.evaluate(el => el.style.left);
  expect(left).toBe('400px');
});

test('guide label shows the coordinate in px', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.click(350, 300);

  await expect(page.locator('.msr-guide-label')).toHaveText('350px');
});

test('clicking a guide removes it', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.click(400, 300);
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(1);

  await page.mouse.click(400, 150);
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — horizontal direction
// ─────────────────────────────────────────────────────────────────────────────

test('switching to H places horizontal guides', async () => {
  await activateTool(worker, page, 'guides', true);
  await setGuideDirection(worker, page, 'h');

  await page.mouse.click(300, 250);

  const guide = page.locator('.msr-guide:not(.msr-guide-ghost)');
  await expect(guide).toHaveCount(1);

  const classList = await guide.evaluate(el => [...el.classList]);
  expect(classList).toContain('msr-guide-h');

  const top = await guide.evaluate(el => el.style.top);
  expect(top).toBe('250px');
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — gap labels
// ─────────────────────────────────────────────────────────────────────────────

test('Gap shows distance between two guides', async () => {
  await activateTool(worker, page, 'guides', true);

  await page.mouse.click(200, 300);
  await page.mouse.click(400, 300);

  await expect(page.locator('.msr-gap-label')).toHaveCount(0);

  await setGapVisible(worker, page, true);

  await expect(page.locator('.msr-gap-label')).toHaveCount(1);
  await expect(page.locator('.msr-gap-label')).toHaveText('200px');
});

test('Gap adds a label when a guide is placed between two existing guides', async () => {
  await activateTool(worker, page, 'guides', true);

  await page.mouse.click(200, 300);
  await page.mouse.click(600, 300);
  await setGapVisible(worker, page, true);
  await expect(page.locator('.msr-gap-label')).toHaveCount(1);
  await expect(page.locator('.msr-gap-label')).toHaveText('400px');

  // Place a guide in between — should split into two gap labels
  await page.mouse.click(400, 300);

  await expect(page.locator('.msr-gap-label')).toHaveCount(2);
  const labels = page.locator('.msr-gap-label');
  await expect(labels.nth(0)).toHaveText('200px');
  await expect(labels.nth(1)).toHaveText('200px');
});

test('Gap label updates when a guide is removed', async () => {
  await activateTool(worker, page, 'guides', true);

  await page.mouse.click(500, 300);
  await page.mouse.click(300, 300);
  await page.mouse.click(600, 300);

  await setGapVisible(worker, page, true);
  await expect(page.locator('.msr-gap-label')).toHaveCount(2);

  // Remove guide at x=500; remaining gap is 300→600 = 300px
  await page.mouse.click(500, 150);
  await expect(page.locator('.msr-gap-label')).toHaveCount(1);
  await expect(page.locator('.msr-gap-label')).toHaveText('300px');
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure tool
// ─────────────────────────────────────────────────────────────────────────────

test('hovering in measure mode shows the highlight ring', async () => {
  await activateTool(worker, page, 'measure', true);

  await page.mouse.move(100, 90); // over the blue box
  await page.waitForTimeout(50);

  await expect(page.locator('.msr-hover-highlight')).toBeVisible();
});

test('hovering in measure mode shows the box model panel', async () => {
  await activateTool(worker, page, 'measure', true);

  await page.mouse.move(100, 90);
  await page.waitForTimeout(50);

  await expect(page.locator('.msr-panel')).toBeVisible();
  await expect(page.locator('.msr-panel')).toContainText('Box Model');
});

test('panel disappears when measure mode is disabled', async () => {
  await activateTool(worker, page, 'measure', true);

  await page.mouse.move(100, 90);
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-panel')).toBeVisible();

  await activateTool(worker, page, 'measure', false);
  await expect(page.locator('.msr-panel')).toHaveCount(0);
});

test('highlight repositions when page is scrolled', async () => {
  // Make the page tall enough to scroll
  await page.addStyleTag({ content: 'body { padding-bottom: 2000px; }' });

  await activateTool(worker, page, 'measure', true);

  // Hover over the blue box center (not hard-coded coords that might land on h1)
  const blueBox = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(blueBox.x + blueBox.width / 2, blueBox.y + blueBox.height / 2);
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-hover-highlight')).toBeVisible();

  const beforeEl = await page.locator('#blue-box').boundingBox();

  // Scroll 80px — moves element up by 80px in the viewport
  await page.evaluate(() => window.scrollBy(0, 80));
  await page.waitForTimeout(50);

  const afterHighlight = await page.locator('.msr-hover-highlight').boundingBox();
  const afterEl        = await page.locator('#blue-box').boundingBox();

  // Element should have moved up in viewport
  expect(afterEl.y).toBeLessThan(beforeEl.y);
  // Highlight should match the element's new viewport position
  expect(afterHighlight.x).toBeCloseTo(afterEl.x, 0);
  expect(afterHighlight.y).toBeCloseTo(afterEl.y, 0);
});

test('highlight repositions when viewport is resized', async () => {
  await activateTool(worker, page, 'measure', true);

  // Hover over the blue box center
  const blueBox = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(blueBox.x + blueBox.width / 2, blueBox.y + blueBox.height / 2);
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-hover-highlight')).toBeVisible();

  // Resize viewport
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(100);

  const afterHighlight = await page.locator('.msr-hover-highlight').boundingBox();
  const afterEl        = await page.locator('#blue-box').boundingBox();

  // Highlight position should match the element (width/height differ by the 2px border)
  expect(afterHighlight.x).toBeCloseTo(afterEl.x, 0);
  expect(afterHighlight.y).toBeCloseTo(afterEl.y, 0);
});
