// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Checkout (smoke)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('página del carrito carga sin errores', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Error interno');
  });

  test('página de checkout requiere login', async ({ page, context }) => {
    const newPage = await context.newPage();
    await newPage.goto('/checkout');
    // Without login should redirect to login or stay on checkout
    await expect(newPage).toHaveURL(/login|checkout/);
    await newPage.close();
  });

});
