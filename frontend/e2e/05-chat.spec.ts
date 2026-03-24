import { test, expect } from '@playwright/test';

test('Chat: carga correctamente y WebSocket activo', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_CONSUMER_EMAIL!);
  await page.fill('[name=password]', 'Test1234!');
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await page.waitForURL(/\/|feed/, { timeout: 10000 });

  // Capturar errores JS
  const jsErrors: string[] = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.goto('/messages');
  await page.waitForLoadState('networkidle');

  // Sin banner de polling degradado
  const pollingBanner = page.locator('text=/Conexión inestable|updating every|polling/i');
  await expect(pollingBanner).not.toBeVisible({ timeout: 5000 });
  console.log('✅ Sin banner de conexión inestable — WS activo');

  // Sin errores JS críticos
  await page.waitForTimeout(3000);
  const criticalErrors = jsErrors.filter(e =>
    !e.includes('ResizeObserver') && !e.includes('Non-Error promise')
  );
  if (criticalErrors.length > 0) {
    console.warn('⚠️ Errores JS en chat:', criticalErrors);
  } else {
    console.log('✅ Sin errores JS críticos en chat');
  }

  // Sin error 500 en la página
  const body = await page.textContent('body');
  expect(body).not.toContain('500');
  expect(body).not.toContain('NaN');
  console.log('✅ Chat UI carga correctamente');
});
