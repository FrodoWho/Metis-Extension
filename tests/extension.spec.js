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
  await expect(page.locator('#msr-tb-row-guides')).toBeHidden();

  await page.locator('.msr-tb-btn', { hasText: 'Guides' }).click();
  await expect(page.locator('#msr-tb-row-guides')).toBeVisible();
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

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar — dragging (content behind the toolbar must stay reachable)
// ─────────────────────────────────────────────────────────────────────────────

test('dragging the grip moves the toolbar so what was behind it can be measured', async () => {
  await toggleToolbar(worker, page);
  const before = await page.locator('#msr-toolbar').boundingBox();
  const grip   = await page.locator('.msr-tb-grip').boundingBox();

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 5 });
  await page.mouse.up();

  const after = await page.locator('#msr-toolbar').boundingBox();
  expect(after.x).toBeGreaterThan(before.x + 300);
  expect(after.y).toBeGreaterThan(before.y + 300);

  await page.locator('.msr-tb-btn', { hasText: 'Measure' }).click();
  await page.mouse.move(before.x + 20, before.y + 10);
  await expect(page.locator('.msr-panel-tag')).toHaveText('html');
});

test('double-clicking the grip puts the toolbar back in the corner', async () => {
  await toggleToolbar(worker, page);
  const home = await page.locator('#msr-toolbar').boundingBox();
  const grip = await page.locator('.msr-tb-grip').boundingBox();

  await page.mouse.move(grip.x + 4, grip.y + 4);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 5 });
  await page.mouse.up();
  await page.locator('.msr-tb-grip').dblclick();

  const after = await page.locator('#msr-toolbar').boundingBox();
  expect(after.x).toBeCloseTo(home.x, 0);
  expect(after.y).toBeCloseTo(home.y, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts
// ─────────────────────────────────────────────────────────────────────────────

test('M and G switch tools, Escape turns the tool off and then closes the toolbar', async () => {
  await toggleToolbar(worker, page);

  await page.keyboard.press('m');
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(1);
  await page.keyboard.press('g');
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(0);
  await expect(page.locator('#msr-tb-row-guides')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#msr-tb-row-guides')).toBeHidden();
  await expect(page.locator('#msr-toolbar')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#msr-toolbar')).toBeHidden();
});

test('shortcuts are ignored while typing in a page input', async () => {
  await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<input id="q">'));
  await toggleToolbar(worker, page);
  await page.locator('#q').focus();
  await page.keyboard.type('mg');

  await expect(page.locator('#q')).toHaveValue('mg');
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(0);
});

test('arrow keys nudge the last guide, Shift for 10px', async () => {
  await toggleToolbar(worker, page);
  await page.keyboard.press('g');
  await page.mouse.click(400, 300, { modifiers: ['Shift'] });
  const guide = page.locator('.msr-guide:not(.msr-guide-ghost)');

  await page.keyboard.press('ArrowRight');
  expect(await guide.evaluate(el => el.style.left)).toBe('401px');
  await page.keyboard.press('Shift+ArrowLeft');
  expect(await guide.evaluate(el => el.style.left)).toBe('391px');
});

test('arrow up selects the parent, arrow down goes back to the child', async () => {
  await toggleToolbar(worker, page);
  await page.keyboard.press('m');

  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#blue-box.box');

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.msr-panel-tag')).toHaveText('body');

  // Small wiggle inside the same child keeps the parent selected
  await page.mouse.move(bb.x + bb.width / 2 + 3, bb.y + bb.height / 2);
  await expect(page.locator('.msr-panel-tag')).toHaveText('body');

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#blue-box.box');
});

// ─────────────────────────────────────────────────────────────────────────────
// Modal dialogs (everything outside them is inert)
// ─────────────────────────────────────────────────────────────────────────────

test('toolbar and measuring work while a modal dialog is open', async () => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<dialog id="d"><p id="inside">Inside dialog</p></dialog>');
    document.getElementById('d').showModal();
  });
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Measure' }).click({ timeout: 2000 });

  const bb = await page.locator('#inside').boundingBox();
  await page.mouse.move(bb.x + 5, bb.y + 5);
  await expect(page.locator('.msr-panel-tag')).toHaveText('p#inside');

  // Back on <html> once the dialog closes
  await page.evaluate(() => document.getElementById('d').close());
  await expect.poll(() => page.evaluate(() => document.querySelector('metis-root').parentNode.nodeName)).toBe('HTML');
});

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar — remembered position, collapsing
// ─────────────────────────────────────────────────────────────────────────────

test('toolbar position and collapsed state survive a page reload', async () => {
  await toggleToolbar(worker, page);
  const grip = await page.locator('.msr-tb-grip').boundingBox();
  await page.mouse.move(grip.x + 4, grip.y + 4);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 5 });
  await page.mouse.up();
  await page.locator('.msr-tb-collapse').click();
  const moved = await page.locator('#msr-toolbar').boundingBox();

  await page.reload();
  await toggleToolbar(worker, page);
  await expect.poll(async () => (await page.locator('#msr-toolbar').boundingBox()).x).toBeCloseTo(moved.x, 0);
  await expect(page.locator('.msr-tb-btn', { hasText: 'Measure' })).toBeHidden();
});

test('collapsing hides the controls but keeps the active tool running', async () => {
  await toggleToolbar(worker, page);
  await page.keyboard.press('m');
  await page.locator('.msr-tb-collapse').click();
  await expect(page.locator('.msr-tb-btn', { hasText: 'Measure' })).toBeHidden();
  await expect(page.locator('.msr-hover-highlight')).toHaveCount(1);

  await page.locator('.msr-tb-collapse').click();
  await expect(page.locator('.msr-tb-btn', { hasText: 'Measure' })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — margin / padding bands
// ─────────────────────────────────────────────────────────────────────────────

test('hovering shades the margin and padding bands', async () => {
  await activateTool(worker, page, 'measure', true);
  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);

  const margin = await page.locator('.msr-margin-box').boundingBox();
  const pad    = await page.locator('.msr-padding-box').boundingBox();
  // Blue box: 20px margin, 16px padding, no border
  expect(margin.x).toBeCloseTo(bb.x - 20, 0);
  expect(margin.width).toBeCloseTo(bb.width + 40, 0);
  expect(pad.x).toBeCloseTo(bb.x, 0);
  expect(await page.locator('.msr-padding-box').evaluate(el => el.style.borderWidth)).toBe('16px');
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — units and copy CSS
// ─────────────────────────────────────────────────────────────────────────────

test('rem toggle converts panel lengths', async () => {
  await toggleToolbar(worker, page);
  await page.keyboard.press('m');
  await page.locator('#msr-tb-row-measure .msr-tb-btn', { hasText: 'rem' }).click();

  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await expect(page.locator('.msr-panel')).toContainText('14.5rem'); // 232px wide
  await expect(page.locator('.msr-panel')).toContainText('1rem');    // 16px padding
});

test('C copies the selected element as CSS', async () => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4321' });
  await toggleToolbar(worker, page);
  await page.keyboard.press('m');

  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.keyboard.press('c');
  await expect(page.locator('.msr-toast')).toHaveText('CSS copied');

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('width: 200px;');
  expect(text).toContain('padding: 16px;');
  expect(text).toContain('margin: 20px;');
  expect(text).toContain('color: #000000;');
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — WCAG contrast
// ─────────────────────────────────────────────────────────────────────────────

test('panel shows the WCAG contrast ratio of text', async () => {
  await page.evaluate(() => document.body.insertAdjacentHTML('beforeend',
    '<div style="background: rgba(0,0,0,0)"><span id="grey" style="color:#999">Grey text</span></div>'));
  await activateTool(worker, page, 'measure', true);

  const h1 = await page.locator('h1').boundingBox();
  await page.mouse.move(h1.x + 20, h1.y + h1.height / 2);
  await expect(page.locator('.msr-panel')).toContainText('21:1 AAA');

  const grey = await page.locator('#grey').boundingBox();
  await page.mouse.move(grey.x + 5, grey.y + grey.height / 2);
  await expect(page.locator('.msr-panel')).toContainText('2.84:1 fail');
});

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar — viewport size
// ─────────────────────────────────────────────────────────────────────────────

test('toolbar shows the viewport size and follows resizes', async () => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await toggleToolbar(worker, page);
  await expect(page.locator('.msr-tb-viewport')).toHaveText('1024 × 700');

  await page.setViewportSize({ width: 768, height: 600 });
  await expect(page.locator('.msr-tb-viewport')).toHaveText('768 × 600');
});

// ─────────────────────────────────────────────────────────────────────────────
// Measure — web components (open shadow DOM)
// ─────────────────────────────────────────────────────────────────────────────

test('measures elements inside an open shadow root, arrow up reaches the host', async () => {
  await page.evaluate(() => {
    const card = document.createElement('x-card');
    card.attachShadow({ mode: 'open' }).innerHTML =
      '<div id="deep" style="width:120px; height:40px; background:#0a0">Deep</div>';
    document.body.appendChild(card);
  });
  await toggleToolbar(worker, page);
  await page.keyboard.press('m');

  const deep = await page.locator('#deep').boundingBox();
  await page.mouse.move(deep.x + 10, deep.y + 10);
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#deep');

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.msr-panel-tag')).toHaveText('x-card');
});

// ─────────────────────────────────────────────────────────────────────────────
// Layout grid
// ─────────────────────────────────────────────────────────────────────────────

test('Grid draws columns from the settings and L toggles it', async () => {
  await toggleToolbar(worker, page);
  await page.locator('.msr-tb-btn', { hasText: 'Grid' }).click();
  await expect(page.locator('.msr-grid-inner > div')).toHaveCount(12);

  await page.locator('#msr-tb-row-grid input').first().fill('4');
  await expect(page.locator('.msr-grid-inner > div')).toHaveCount(4);
  // 1200 max - 2 × 24 margin - 3 × 24 gutter = 1080 / 4 columns
  const col = await page.locator('.msr-grid-inner > div').first().boundingBox();
  expect(col.width).toBeCloseTo(270, 0);

  // Typing in a grid field never triggers shortcuts; leave it first
  await page.locator('#msr-tb-row-grid input').first().blur();
  await page.keyboard.press('l');
  await expect(page.locator('.msr-grid')).toHaveCount(0);
});

test('the grid does not block measuring', async () => {
  await toggleToolbar(worker, page);
  await page.keyboard.press('l');
  await page.keyboard.press('m');
  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + 10, bb.y + 10);
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#blue-box.box');
});

// ─────────────────────────────────────────────────────────────────────────────
// Design overlay
// ─────────────────────────────────────────────────────────────────────────────

async function makePng(w, h) {
  const b64 = await page.evaluate(([w, h]) => {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f00';
    ctx.fillRect(0, 0, w, h);
    return c.toDataURL('image/png').split(',')[1];
  }, [w, h]);
  return { name: 'mock.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}

test('Overlay lays a design image over the page with opacity, scale and diff', async () => {
  const file = await makePng(400, 300);
  await toggleToolbar(worker, page);

  // First toggle opens the file picker right away
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.msr-tb-btn', { hasText: 'Overlay' }).click();
  await (await chooser).setFiles(file);

  const wrap = page.locator('.msr-mockup');
  const img  = page.locator('.msr-mockup img');
  await expect(img).toBeVisible();
  expect(await wrap.evaluate(el => el.style.opacity)).toBe('0.5');
  await expect.poll(async () => (await img.boundingBox()).width).toBeCloseTo(400, 0);

  await page.locator('#msr-tb-row-mockup select').first().selectOption('2');
  await expect.poll(async () => (await img.boundingBox()).width).toBeCloseTo(200, 0);

  await page.locator('#msr-tb-row-mockup input[type=range]').fill('80');
  expect(await wrap.evaluate(el => el.style.opacity)).toBe('0.8');

  await page.locator('#msr-tb-row-mockup .msr-tb-btn', { hasText: 'Diff' }).click();
  expect(await wrap.evaluate(el => el.style.mixBlendMode)).toBe('difference');

  // Measuring works through the image
  await page.keyboard.press('m');
  const bb = await page.locator('#blue-box').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); // clear of the taller toolbar
  await expect(page.locator('.msr-panel-tag')).toHaveText('div#blue-box.box');

  // O hides it without forgetting it, ✕ removes it
  await page.keyboard.press('o');
  await expect(img).toBeHidden();
  await page.keyboard.press('o');
  await expect(img).toBeVisible();
  await page.locator('#msr-tb-row-mockup [aria-label="Remove image"]').click();
  await expect(wrap).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Guides — pinned to the page
// ─────────────────────────────────────────────────────────────────────────────

test('pinned guides scroll with the page and keep their page coordinate', async () => {
  await page.addStyleTag({ content: 'body { padding-bottom: 2000px; }' });
  await toggleToolbar(worker, page);
  await page.keyboard.press('g');
  await page.keyboard.press('h');
  await page.locator('#msr-tb-pin').click();
  await page.mouse.click(700, 300, { modifiers: ['Shift'] });
  const guide = page.locator('.msr-guide:not(.msr-guide-ghost)');
  await expect(page.locator('.msr-guide-label')).toHaveText('300px');

  await page.evaluate(() => window.scrollBy(0, 100));
  await expect.poll(() => guide.evaluate(el => el.style.top)).toBe('200px');
  await expect(page.locator('.msr-guide-label')).toHaveText('300px');

  // Unpinning keeps it where it is on screen
  await page.locator('#msr-tb-pin').click();
  expect(await guide.evaluate(el => el.style.top)).toBe('200px');
  await expect(page.locator('.msr-guide-label')).toHaveText('200px');
});
