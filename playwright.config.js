const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    // Extensions require headed mode (or --headless=new in Chrome 112+).
    // Playwright uses headed by default when no headless setting is given;
    // set explicitly here so CI can override with PLAYWRIGHT_HEADLESS=new.
    headless: false,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'node tests/server.js',
    port: 4321,
    reuseExistingServer: true,
  },
  // Only Chromium supports extensions.
  projects: [
    { name: 'chromium-extension', use: { channel: 'chromium' } },
  ],
});
