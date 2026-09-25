const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    // Tests launch their own browser in tests/helpers.js (headless unless HEADED=1).
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
