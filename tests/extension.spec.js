/**
 * End-to-end tests for the Measure browser extension.
 *
 * Run:
 *   npm test               # headless
 *   npm run test:headed    # headed with visible window
 */

const { test, expect } = require('@playwright/test');
const path             = require('path');
const { launchExtension, activateTool, setGuideDirection, setGapVisible, toggleToolbar, clearGuides } = require('./helpers');

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

// ─────────────────────────────────────────────────────────────────────────────
// Mutual exclusivity
// ─────────────────────────────────────────────────────────────────────────────

test('enabling Measure via toolbar disables Guides', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await page.mouse.move(300, 200);
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(1);

  await page.locator('.msr-tb-btn', { hasText: 'Measure' }).click();

  await expect(page.locator('.msr-guide-ghost')).toHaveCount(0);
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(1);
});

test('enabling Guides via toolbar disables Measure', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Measure' }).click();
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(1);

  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();

  await expect(page.locator('.msr-hover-highlight')).toHaveCount(0);
  await page.mouse.move(300, 200);
  await expect(page.locator('.msr-guide-ghost')).toHaveCount(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — click-to-lock
// ─────────────────────────────────────────────────────────────────────────────

test('clicking an element in measure mode locks an orange ring', async () => {
  await activateTool(worker, page, 'measure', true);

  const bb = await page.locator('#blue-box').boundingBox();
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(50);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(50);

  await expect(page.locator('.msr-lock-ring')).toHaveCount(1);
  await expect(page.locator('.msr-panel-locked')).toHaveCount(1);
  await expect(page.locator('.msr-panel-locked')).toContainText('Locked');
});

test('clicking a locked element unlocks it', async () => {
  await activateTool(worker, page, 'measure', true);

  const bb = await page.locator('#blue-box').boundingBox();
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(50);
  await page.mouse.click(cx, cy); // lock
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-lock-ring')).toHaveCount(1);

  await page.mouse.click(cx, cy); // unlock
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-lock-ring')).toHaveCount(0);
  await expect(page.locator('.msr-panel-locked')).toHaveCount(0);
});

test('multiple elements can be locked simultaneously', async () => {
  await activateTool(worker, page, 'measure', true);

  const blue = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(blue.x + blue.width / 2, blue.y + blue.height / 2);
  await page.waitForTimeout(50);
  await page.mouse.click(blue.x + blue.width / 2, blue.y + blue.height / 2);
  await page.waitForTimeout(50);

  const red = await page.locator('#red-box').boundingBox();
  await page.mouse.move(red.x + red.width / 2, red.y + red.height / 2);
  await page.waitForTimeout(50);
  await page.mouse.click(red.x + red.width / 2, red.y + red.height / 2);
  await page.waitForTimeout(50);

  await expect(page.locator('.msr-lock-ring')).toHaveCount(2);
  await expect(page.locator('.msr-panel-locked')).toHaveCount(2);
});

test('disabling measure clears all locks', async () => {
  await activateTool(worker, page, 'measure', true);

  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(50);
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(50);
  await expect(page.locator('.msr-lock-ring')).toHaveCount(1);

  await activateTool(worker, page, 'measure', false);
  await expect(page.locator('.msr-lock-ring')).toHaveCount(0);
  await expect(page.locator('.msr-panel-locked')).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — clear all
// ─────────────────────────────────────────────────────────────────────────────

test('Clear button removes all guides', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();

  await page.mouse.click(200, 300);
  await page.mouse.click(400, 300);
  await page.mouse.click(600, 300);
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(3);

  await page.locator('#msr-tb-clear').click();
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(0);
});

test('Clear also removes gap labels', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.click(200, 300);
  await page.mouse.click(500, 300);
  await setGapVisible(worker, page, true);
  await expect(page.locator('.msr-gap-label')).toHaveCount(1);

  await clearGuides(worker, page);
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(0);
  await expect(page.locator('.msr-gap-label')).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Shadow DOM
// ─────────────────────────────────────────────────────────────────────────────

test('page CSS cannot restyle the toolbar (shadow DOM)', async () => {
  await page.addStyleTag({ content: 'button, div { display: none !important; }' });
  await toggleToolbar(worker, page);
  await expect(page.locator('.msr-tb-btn', { hasText: 'Measure' })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — distances, typography
// ─────────────────────────────────────────────────────────────────────────────

test('with an element locked, hovering another shows the distance between them', async () => {
  await activateTool(worker, page, 'measure', true);

  const blue = await page.locator('#blue-box').boundingBox();
  await page.mouse.click(blue.x + blue.width / 2, blue.y + blue.height / 2);
  const red = await page.locator('#red-box').boundingBox();
  await page.mouse.move(red.x + red.width / 2, red.y + red.height / 2);

  // Collapsed 20px margins between the two boxes
  await expect(page.locator('.msr-dist-label')).toHaveText('20px');
});

test('hovering a child of the locked element shows its insets', async () => {
  await page.evaluate(() => {
    const child = document.createElement('span');
    child.id = 'inner';
    child.style.cssText = 'display:block; width:50px; height:20px; background:#000;';
    document.getElementById('blue-box').appendChild(child);
  });
  await activateTool(worker, page, 'measure', true);

  const blue = await page.locator('#blue-box').boundingBox();
  await page.mouse.click(blue.x + blue.width - 10, blue.y + blue.height - 10);
  const inner = await page.locator('#inner').boundingBox();
  await page.mouse.move(inner.x + 10, inner.y + 10);

  // Left inset = 16px padding; right = 232 - 16 - 50 = 166px
  await expect(page.locator('.msr-dist-label', { hasText: /^16px$/ })).toHaveCount(1);
  await expect(page.locator('.msr-dist-label', { hasText: /^166px$/ })).toHaveCount(1);
});

test('panel shows typography for elements with their own text', async () => {
  await activateTool(worker, page, 'measure', true);
  const h1 = await page.locator('h1').boundingBox();
  await page.mouse.move(h1.x + 20, h1.y + h1.height / 2);

  const p = page.locator('.msr-panel');
  await expect(p).toContainText('32px');
  await expect(p).toContainText('sans-serif');
  await expect(p).toContainText('#000000');
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — persist across tools, drag to move
// ─────────────────────────────────────────────────────────────────────────────

test('guides stay visible when switching to Measure and do not block it', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  const bb = await page.locator('#blue-box').boundingBox();
  const cx = Math.round(bb.x + bb.width / 2);
  await page.mouse.click(cx, 400, { modifiers: ['Shift'] });

  await page.locator('.msr-tb-btn', { hasText: 'Measure' }).click();
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(1);

  // Hovering right on the guide line measures the element underneath
  await page.mouse.move(cx, bb.y + bb.height / 2);
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#blue-box.box');
});

test('closing the toolbar removes guides', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await page.mouse.click(400, 300);
  await page.locator('.msr-tb-close').click();
  await expect(page.locator('.msr-guide:not(.msr-guide-ghost)')).toHaveCount(0);
});

test('dragging a guide moves it', async () => {
  await activateTool(worker, page, 'guides', true);
  await page.mouse.click(400, 300, { modifiers: ['Shift'] });
  const guide = page.locator('.msr-guide:not(.msr-guide-ghost)');

  await page.mouse.move(400, 300);
  await page.keyboard.down('Shift'); // no snapping while dragging
  await page.mouse.down();
  await page.mouse.move(450, 300, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');

  await expect(guide).toHaveCount(1);
  expect(await guide.evaluate(el => el.style.left)).toBe('450px');
  await expect(page.locator('.msr-guide-label')).toHaveText('450px');
});
