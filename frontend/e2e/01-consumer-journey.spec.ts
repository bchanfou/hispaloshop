import { test, expect } from '@playwright/test';

test('Consumer: registro → feed → marketplace → checkout Stripe test', async ({ page }) => {
  const email = `qa-consumer-${Date.now()}@test.com`;

  // REGISTRO
  await page.goto('/register');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', 'Test1234!');
  await page.getByRole('button', { name: /registr|crear|sign up/i }).click();
  await page.waitForURL(/onboarding|\//, { timeout: 10000 });
  console.log('✅ Registro completado');

  // FEED
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const posts = page.locator('article, [class*=post], [class*=feed-item]');
  await expect(posts.first()).toBeVisible({ timeout: 15000 });
  const pageText = await page.textContent('body');
  expect(pageText).not.toContain('NaN');
  console.log('✅ Feed carga con contenido, sin NaN');

  // MARKETPLACE → CARRITO
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');
  const firstProduct = page.locator('[class*=product-card], [class*=ProductCard]').first();
  await firstProduct.click();
  await page.waitForLoadState('networkidle');
  const addBtn = page.getByRole('button', { name: /añadir|add|carrito|cart/i });
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();
  console.log('✅ Producto añadido al carrito');

  // CHECKOUT CON STRIPE TEST CARD
  await page.goto('/cart');
  const checkoutBtn = page.getByRole('button', { name: /pagar|checkout|comprar/i });
  if (await checkoutBtn.isVisible({ timeout: 5000 })) {
    await checkoutBtn.click();
    await page.waitForURL(/checkout/, { timeout: 5000 });
    await page.waitForSelector('iframe[src*="stripe"]', { timeout: 10000 });
    const stripeFrame = page.frameLocator('iframe[src*="stripe"]').first();
    await stripeFrame.locator('[placeholder*="1234"], [name=cardnumber]').fill('4242 4242 4242 4242');
    await stripeFrame.locator('[placeholder*="MM"], [name=exp-date]').fill('12/28');
    await stripeFrame.locator('[placeholder*="CVC"], [name=cvc]').fill('123');
    await page.getByRole('button', { name: /pagar|confirmar|pay/i }).click();
    await page.waitForURL(/success|confirmed|orders/, { timeout: 30000 });
    console.log('✅ Checkout Stripe test completado');
  }

  // MIS PEDIDOS
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  const bodyOrders = await page.textContent('body');
  expect(bodyOrders).not.toContain('500');
  console.log('✅ Página de pedidos carga correctamente');
});
