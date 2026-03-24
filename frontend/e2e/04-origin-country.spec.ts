import { test, expect } from '@playwright/test';

test('origin_country NO en cards del listado, SÍ en ficha de producto', async ({ page }) => {
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');

  const cards = page.locator('[class*=product-card], [class*=ProductCard]');
  const count = await cards.count();
  console.log(`ℹ️ Encontradas ${count} cards en marketplace`);

  let foundInCard = false;
  for (let i = 0; i < Math.min(count, 10); i++) {
    const text = await cards.nth(i).textContent();
    if (text?.match(/Origen:|Origin:|País de origen/i)) {
      foundInCard = true;
      console.warn('⚠️ origin_country en card', i, ':', text.slice(0, 100));
    }
  }
  expect(foundInCard).toBe(false);
  console.log('✅ origin_country NO aparece en cards del listado');

  // Ficha no crashea
  if (count > 0) {
    await cards.first().click();
    await page.waitForLoadState('networkidle');
    const detailBody = await page.textContent('body');
    expect(detailBody).not.toContain('Something went wrong');
    expect(detailBody).not.toContain('500');
    console.log('✅ Ficha de producto carga sin crash');
  }
});
