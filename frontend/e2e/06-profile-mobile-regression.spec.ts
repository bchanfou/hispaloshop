import { test, expect } from '@playwright/test';

test('Mobile profile: no white screen when avatar/images fail', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(test.info().project.name !== 'mobile', 'Mobile-only regression');

  const email = process.env.TEST_CONSUMER_EMAIL;
  const password = process.env.TEST_CONSUMER_PASS;
  test.skip(!email || !password, 'Missing TEST_CONSUMER_EMAIL / TEST_CONSUMER_PASS');

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    pageErrors.push(String(err?.message || err));
  });

  const configuredApi = process.env.PLAYWRIGHT_API_URL;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://www.hispaloshop.com';
  const inferredApi = baseUrl
    .replace('://www.', '://api.')
    .replace('://hispaloshop.com', '://api.hispaloshop.com');
  const apiBase = configuredApi || inferredApi;

  const loginCandidates = [
    `${apiBase}/auth/login`,
    `${apiBase}/api/auth/login`,
  ];

  let authData: any = null;
  let authOk = false;
  for (const loginUrl of loginCandidates) {
    const authRes = await page.request.post(loginUrl, {
      data: { email, password },
      timeout: 30_000,
    });
    if (!authRes.ok()) continue;
    authData = await authRes.json();
    authOk = true;
    break;
  }

  expect(authOk).toBeTruthy();
  const accessToken = authData?.session_token || authData?.access_token;
  const refreshToken = authData?.refresh_token;
  expect(Boolean(accessToken)).toBeTruthy();

  // Force image load failures to exercise avatar fallback paths in profile.
  await page.route(/\.(png|jpe?g|webp|avif|gif|svg)(\?.*)?$/i, (route) => route.abort());

  await page.addInitScript(([token, refresh]) => {
    localStorage.setItem('hsp_token', token);
    if (refresh) localStorage.setItem('hsp_refresh', refresh);
  }, [accessToken, refreshToken]);

  await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const acceptCookies = page.getByRole('button', { name: /aceptar/i });
  if (await acceptCookies.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptCookies.click();
  }

  if (page.url().includes('/login')) {
    throw new Error('Token login succeeded via API but frontend still redirected to /login');
  }

  await page.waitForLoadState('networkidle');

  const crashHeading = page.getByRole('heading', { name: 'Algo ha fallado' });
  const crashed = await crashHeading.isVisible({ timeout: 2000 }).catch(() => false);
  expect(crashed, 'App crashed to error boundary on mobile profile').toBeFalsy();

  await expect(page).toHaveURL(/\/profile\/|\/[a-z0-9_.]{3,30}$/i, { timeout: 15000 });

  const hasAccountSwitcher = await page.getByLabel('Cambiar cuenta').isVisible({ timeout: 3000 }).catch(() => false);
  const hasBackButton = await page.getByLabel('Volver').isVisible({ timeout: 3000 }).catch(() => false);
  const hasAtUsername = await page.locator('text=/@/').first().isVisible({ timeout: 3000 }).catch(() => false);
  expect(hasAccountSwitcher || hasBackButton || hasAtUsername).toBeTruthy();

  expect(pageErrors, `JS runtime errors on mobile profile: ${pageErrors.join(' | ')}`).toEqual([]);
});
