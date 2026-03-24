import { test, expect } from '@playwright/test';

const BACKEND = process.env.BACKEND_URL || 'https://api.hispaloshop.com';

test('Rutas protegidas redirigen a /login sin autenticación', async ({ page }) => {
  const routes = ['/producer', '/influencer/dashboard', '/admin', '/importer/dashboard'];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login/);
    console.log(`✅ ${route} sin auth → redirige a /login`);
  }
});

test('API endpoints requieren JWT — devuelven 401 sin token', async ({ page }) => {
  const endpoints = [
    { method: 'GET',  path: '/api/v1/users/me' },
    { method: 'GET',  path: '/api/v1/orders/' },
    { method: 'POST', path: '/api/v1/products/' },
    { method: 'GET',  path: '/api/v1/influencer/me/dashboard' },
    { method: 'GET',  path: '/api/v1/seller/me/dashboard' },
  ];
  for (const ep of endpoints) {
    const status = await page.evaluate(async ({ method, path, base }) => {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' }
      });
      return res.status;
    }, { method: ep.method, path: ep.path, base: BACKEND });
    expect([401, 403, 422]).toContain(status);
    console.log(`✅ ${ep.method} ${ep.path} sin auth → ${status}`);
  }
});

test('Consumer autenticado no puede acceder a /admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_CONSUMER_EMAIL!);
  await page.fill('[name=password]', 'Test1234!');
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await page.waitForURL(/\/|feed/, { timeout: 10000 });
  await page.goto('/admin');
  await page.waitForTimeout(2000);
  const url = page.url();
  expect(url).not.toMatch(/admin.*dashboard/);
  console.log('✅ Consumer bloqueado en /admin → URL:', url);
});

test('Stripe webhook sin firma devuelve 400', async ({ page }) => {
  const status = await page.evaluate(async (base) => {
    const res = await fetch(base + '/api/v1/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' })
    });
    return res.status;
  }, BACKEND);
  expect([400, 401, 403]).toContain(status);
  console.log('✅ Webhook sin firma Stripe rechazado → status:', status);
});
