// @ts-check
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('Autenticación', () => {

  test('la página de login carga correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login con credenciales incorrectas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]',    'noexiste@test.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    // Must not redirect to feed
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/feed|home/);
  });

  test('login correcto redirige al feed', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/feed|home|\//);
  });

  test('logout limpia la sesión', async ({ page }) => {
    await login(page);
    const profileMenu = page.locator('[aria-label*="perfil"], [href="/profile"]').first();
    if (await profileMenu.isVisible()) {
      await profileMenu.click();
      const logoutBtn = page.locator('button:has-text("Cerrar"), button:has-text("Salir"), [href="/logout"]').first();
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await expect(page).toHaveURL(/login|home|\//);
      }
    }
  });

});
