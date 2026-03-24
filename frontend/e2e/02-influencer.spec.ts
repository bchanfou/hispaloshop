import { test, expect } from '@playwright/test';

test('Influencer: dashboard sin NaN + comisiones en euros', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_INFLUENCER_EMAIL!);
  await page.fill('[name=password]', process.env.TEST_INFLUENCER_PASS!);
  await page.getByRole('button', { name: /login|entrar|iniciar/i }).click();
  await page.waitForURL(/influencer|dashboard|\//, { timeout: 10000 });

  await page.goto('/influencer/dashboard');
  await page.waitForLoadState('networkidle');

  const body = await page.textContent('body');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('undefined');
  console.log('✅ Dashboard influencer sin NaN/undefined');

  // Comisiones en € no en cents crudos
  const amounts = page.locator('[class*=amount], [class*=commission], [class*=earning]');
  const count = await amounts.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    const text = await amounts.nth(i).textContent();
    if (text && /\d/.test(text)) {
      expect(text).toMatch(/€|EUR/);
      const num = parseFloat(text.replace(/[^0-9.]/g, ''));
      expect(num).toBeLessThan(100000);
      console.log('✅ Valor monetario correcto:', text.trim());
    }
  }

  // Affiliate links
  await page.goto('/influencer/affiliate-links');
  await page.waitForLoadState('networkidle');
  const linkBody = await page.textContent('body');
  expect(linkBody).not.toContain('500');
  console.log('✅ Página affiliate links carga sin error');
});
