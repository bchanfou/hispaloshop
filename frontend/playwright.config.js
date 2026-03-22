const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:   './e2e',
  timeout:   60_000,
  retries:   process.env.CI ? 2 : 0,
  workers:   process.env.CI ? 1 : undefined,
  reporter:  [['html', { open: 'never' }], ['list']],

  use: {
    baseURL:       process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot:    'only-on-failure',
    video:         'retain-on-failure',
    trace:         'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['iPhone 13']       } },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'node --max-old-space-size=4096 ./node_modules/@craco/craco/dist/bin/craco.js start',
    port:    3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
