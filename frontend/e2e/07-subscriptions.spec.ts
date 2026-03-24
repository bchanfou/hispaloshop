import { test, expect } from '@playwright/test';

test('Suscripciones: página sin errores, datos en euros', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_CONSUMER_EMAIL!);
  await page.fill('[name=password]', 'Test1234!');
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await page.waitForURL(/\/|feed/, { timeout: 10000 });

  await page.goto('/subscriptions');
  await page.waitForLoadState('networkidle');

  const body = await page.textContent('body');
  expect(body).not.toContain('500');
  expect(body).not.toContain('NaN');
  console.log('✅ Página suscripciones sin errores ni NaN');

  const subs = page.locator('[class*=subscription]');
  const count = await subs.count();
  if (count > 0) {
    const text = await subs.first().textContent();
    expect(text).toMatch(/€|semanal|mensual|próximo/i);
    console.log('✅ Suscripción con datos correctos:', text?.slice(0, 60));
  } else {
    console.log('ℹ️ Sin suscripciones activas — crear una manualmente para test completo');
  }
});
