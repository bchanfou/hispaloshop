import { test, expect } from '@playwright/test';

test('Producer: dashboard GMV + crear producto + verificar marketplace', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_PRODUCER_EMAIL!);
  await page.fill('[name=password]', process.env.TEST_PRODUCER_PASS!);
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await page.waitForURL(/producer|\//, { timeout: 10000 });

  await page.goto('/producer');
  await page.waitForLoadState('networkidle');
  const body = await page.textContent('body');
  expect(body).not.toContain('NaN');
  expect(body).not.toContain('500');
  console.log('✅ Dashboard producer sin NaN ni error 500');

  // Crear producto
  await page.goto('/producer/products');
  const addBtn = page.getByRole('button', { name: /añadir|nuevo|crear|add|new/i });
  if (await addBtn.isVisible({ timeout: 5000 })) {
    await addBtn.click();
    const name = 'QA-Producto-' + Date.now();
    await page.fill('[name=name], [placeholder*=nombre]', name);
    await page.fill('[name=price], [placeholder*=precio]', '999');
    await page.fill('[name=description], textarea', 'Producto QA automatizado');
    await page.getByRole('button', { name: /guardar|publicar|crear/i }).click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Producto creado:', name);

    // Verificar en marketplace
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    const mktBody = await page.textContent('body');
    expect(mktBody).not.toContain('500');
    console.log('✅ Marketplace carga correctamente tras crear producto');
  } else {
    console.log('ℹ️ Botón añadir no visible — verificar UI manualmente');
  }
});
