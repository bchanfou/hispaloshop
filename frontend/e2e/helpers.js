// @ts-check

/** @type {{ email: string, password: string }} */
const TEST_USER = {
  email:    process.env.E2E_TEST_EMAIL    || 'test@hispaloshop.com',
  password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

/**
 * Login with test credentials.
 * @param {import('@playwright/test').Page} page
 */
async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]',    TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/feed|home|\/$/, { timeout: 10_000 });
}

/**
 * Wait for the Hispal AI floating button.
 * @param {import('@playwright/test').Page} page
 */
async function waitForHispalAI(page) {
  return page.waitForSelector('[aria-label*="Hispal"], [aria-label*="AI"], [data-testid="hispal-ai"]', { timeout: 8_000 });
}

module.exports = { TEST_USER, login, waitForHispalAI };
