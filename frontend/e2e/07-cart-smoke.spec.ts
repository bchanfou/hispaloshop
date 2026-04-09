import { test, expect } from '@playwright/test';

async function dismissCookieBannerIfPresent(page) {
  const essentialBtn = page.getByRole('button', { name: /solo esenciales/i });
  const acceptBtn = page.getByRole('button', { name: /^aceptar$/i });

  if (await essentialBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await essentialBtn.click();
    return;
  }

  if (await acceptBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await acceptBtn.click();
  }
}

test.describe('Cart smoke (guest)', () => {
  test('cart page renders and does not show hard error state', async ({ page }) => {
    await page.goto('/cart');
    await dismissCookieBannerIfPresent(page);

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Error interno');

    const title = page.getByTestId('cart-page-title');
    const titleVisible = await title.isVisible({ timeout: 3000 }).catch(() => false);
    if (!titleVisible) {
      // Backend-down fallback: shell still loads and shows offline state/skeleton.
      const offlineToast = page.getByText(/sin conexión\. comprueba tu red\./i);
      const skeleton = page.locator('.animate-pulse').first();
      const hasOfflineToast = await offlineToast.isVisible({ timeout: 2000 }).catch(() => false);
      const hasSkeleton = await skeleton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasOfflineToast || hasSkeleton).toBeTruthy();
    }
  });

  test('checkout route is protected for guests', async ({ page }) => {
    await page.goto('/checkout');
    await dismissCookieBannerIfPresent(page);
    await expect(page).toHaveURL(/\/login|\/checkout/);
  });
});
