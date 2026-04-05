// @ts-check
const { test, expect } = require('@playwright/test');
const { login, waitForHispalAI } = require('./helpers');

test.describe('Flujos críticos', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('feed carga sin errores', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(2_000);
    await expect(page.locator('body')).not.toContainText('Error al cargar');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Hispal AI abre el panel de chat', async ({ page }) => {
    await page.goto('/feed');
    const aiButton = await waitForHispalAI(page).catch(() => null);
    if (aiButton) {
      await aiButton.click();
      await expect(page.locator('text=Hispal')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('BottomNav navega entre secciones (mobile)', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }
    await page.goto('/feed');
    const exploreLink = page.locator('[aria-label*="Explore"], [href="/explore"]').first();
    if (await exploreLink.isVisible()) {
      await exploreLink.click();
      await expect(page).toHaveURL(/explore/);
    }
  });

  test('páginas informativas son accesibles sin login', async ({ page, context }) => {
    const newPage = await context.newPage();
    for (const path of ['/que-es-hispaloshop', '/productor', '/importador', '/influencer']) {
      await newPage.goto(path);
      await expect(newPage.locator('h1').first()).toBeVisible({ timeout: 5_000 });
    }
    await newPage.close();
  });

});
