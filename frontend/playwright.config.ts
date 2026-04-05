import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Hispaloshop E2E tests.
 *
 * baseURL resolution order:
 *   1. PLAYWRIGHT_BASE_URL env var (CI usually sets this to staging)
 *   2. http://localhost:3000 (default — webServer auto-starts the dev server)
 *
 * Running locally:
 *   npx playwright test                    # uses webServer + localhost
 *   npx playwright test --project=chromium # single browser
 *
 * Running against staging:
 *   PLAYWRIGHT_BASE_URL=https://staging.hispaloshop.com npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  // Don't run the archived legacy specs by default
  testIgnore: ['**/_archive/**'],
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 60_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],

  // Auto-start the dev server for local runs. In CI, the workflow is
  // responsible for starting the backend + frontend (or pointing to staging).
  webServer: process.env.CI ? undefined : {
    command: 'node --max-old-space-size=4096 ./node_modules/@craco/craco/dist/bin/craco.js start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
