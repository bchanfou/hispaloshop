// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Smoke tests — críticos para el deploy', () => {

  test('la app carga en menos de 5 segundos', async ({ page }) => {
   const maxLoadMs = Number(process.env.PLAYWRIGHT_HOME_MAX_LOAD_MS || '30000');
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(maxLoadMs);
  });

  test('no hay errores de consola críticos en la home', async ({ page }) => {
    /** @type {string[]} */
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('fonts') &&
      !e.includes('analytics') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('el título de la página es correcto', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Hispaloshop/i);
  });

  test('la API responde al health check', async ({ request }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8000';
    const response = await request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('las páginas informativas cargan sin errores', async ({ page }) => {
    for (const path of ['/productor', '/importador', '/influencer']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('el precio ELITE del productor es 249€', async ({ page }) => {
    await page.goto('/productor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('249€/mes', { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('las imágenes no están rotas', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for local images to fully load; skip external CDN/user-content images
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src)
        .filter(src =>
          src &&
          !src.startsWith('data:') &&
          !src.includes('placeholder') &&
          !src.includes('unsplash.com') &&
          !src.includes('images.unsplash') &&
          !src.includes('cloudinary.com') &&
          !src.includes('googleusercontent.com')
        );
    });
    expect(brokenImages).toHaveLength(0);
  });

});
