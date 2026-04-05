import { test, expect } from '@playwright/test';

/**
 * Consumer journey E2E: register → onboarding 6 steps → feed.
 *
 * Section 1.1 of the launch roadmap.
 *
 * NOTE: the verify-email step is NOT tested E2E because the 6-digit code
 * exists only in MongoDB and there is no test endpoint to retrieve it.
 * The backend creates a session at registration, so we can navigate to
 * /onboarding directly. Verify-email UI is covered by unit tests.
 * TODO: add verify-email E2E when a /testing/last-verification-code
 * endpoint or Mongo fixture is available.
 */
test('Consumer: register → onboarding 6 steps → feed', async ({ page }) => {
  const email = `qa-consumer-${Date.now()}@test.com`;
  const password = 'Test1234!secure';
  const name = 'María García';

  // ── Registration ──
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  const consumerTab = page.getByRole('button', { name: /consumidor/i });
  if (await consumerTab.isVisible({ timeout: 2000 })) await consumerTab.click();

  await page.fill('input[autocomplete="name"], input[placeholder*="María"]', name);
  await page.fill('input[type="email"], input[placeholder*="@"]', email);
  const usernameInput = page.locator('input[placeholder*="usuario"]');
  if (await usernameInput.isVisible({ timeout: 1000 })) {
    await usernameInput.fill(`qauser${Date.now().toString(36)}`);
  }
  await page.fill('input[type="password"]', password);

  // Birth date selects (if present)
  const birthDay = page.locator('select >> nth=0');
  if (await birthDay.isVisible({ timeout: 1000 })) {
    await birthDay.selectOption('15');
    await page.locator('select >> nth=1').selectOption('6');
    await page.locator('select >> nth=2').selectOption('1995');
  }

  const terms = page.locator('input[type="checkbox"]').first();
  if (await terms.isVisible({ timeout: 1000 })) await terms.check();

  await page.getByRole('button', { name: /crear cuenta|registr|sign up/i }).click();
  await page.waitForURL(/onboarding|verify-email|\//, { timeout: 15000 });
  console.log('✅ Register completed');

  // ── Onboarding ──
  await page.goto('/onboarding');
  await page.waitForLoadState('networkidle');

  // Step 1: Welcome
  const step1 = page.locator('[data-testid="onboarding-step1-next"]');
  await expect(step1).toBeVisible({ timeout: 10000 });
  const body = await page.textContent('body');
  expect(body).toContain('alimenta tu mesa');
  await step1.click();
  console.log('✅ Step 1: Welcome');

  // Step 2: Profile (skip)
  await expect(page.locator('[data-testid="onboarding-skip"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="onboarding-skip"]').click();
  console.log('✅ Step 2: Profile (skipped)');

  // Step 3: Location
  await expect(page.locator('[data-testid="onboarding-country"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="onboarding-country"]').selectOption('ES');
  await page.locator('[data-testid="onboarding-step3-next"]').click();
  console.log('✅ Step 3: Location');

  // Step 4: Interests (select 3)
  for (const i of ['aceites', 'quesos', 'miel']) {
    await page.locator(`[data-testid="onboarding-interest-${i}"]`).click();
  }
  await page.locator('[data-testid="onboarding-step4-next"]').click();
  console.log('✅ Step 4: Interests');

  // Step 5: Discovery
  await expect(page.locator('[data-testid="onboarding-step5-next"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="onboarding-step5-next"]').click();
  console.log('✅ Step 5: Discovery');

  // Step 6: Confirm
  await expect(page.locator('[data-testid="onboarding-finish"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-testid="onboarding-finish"]').click();
  console.log('✅ Step 6: Confirm');

  // ── Feed loads ──
  await page.waitForURL(/^\/$|\/discover|\/feed/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  const feedText = await page.textContent('body');
  expect(feedText).not.toContain('NaN');
  expect(feedText.length).toBeGreaterThan(50);
  console.log('✅ Feed loaded');
});
