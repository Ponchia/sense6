import { expect, test } from '@playwright/test';

test('the deployed bundle hydrates, starts setup, and serves a real 404 without writes', async ({
  page,
}, testInfo) => {
  const production = new URL(testInfo.project.use.baseURL).origin === 'https://sense6.net';
  const consoleErrors = [];
  const cspViolations = [];
  const assetFailures = [];
  const successfulAssets = new Set();
  let blockedMetricPosts = 0;

  await page.addInitScript(() => {
    window.__sense6CspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__sense6CspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });
  await page.route('**/api/metric', async (route) => {
    if (route.request().method() === 'POST') {
      blockedMetricPosts += 1;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.continue();
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/metric')) return;
    assetFailures.push(`${request.resourceType()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    const resourceType = response.request().resourceType();
    if (!['script', 'stylesheet', 'font'].includes(resourceType)) return;
    if (response.ok()) successfulAssets.add(`${resourceType}:${new URL(response.url()).pathname}`);
    else assetFailures.push(`${resourceType} ${response.url()}: ${response.status()}`);
  });

  const response = await page.goto('/en/tetracromia/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetracromia');
  await page.locator('[data-action="setup"]').first().click();
  await expect(page.getByRole('heading', { name: /Set the room before the observations/i })).toBeVisible();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
  await page.waitForLoadState('networkidle');

  cspViolations.push(...(await page.evaluate(() => window.__sense6CspViolations)));
  expect([...successfulAssets].some((asset) => asset.startsWith('script:'))).toBe(true);
  expect([...successfulAssets].some((asset) => asset.startsWith('stylesheet:'))).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(cspViolations).toEqual([]);
  expect(assetFailures).toEqual([]);
  if (production) expect(blockedMetricPosts).toBeGreaterThan(0);

  const missing = await page.goto('/en/deployed-browser-gate-missing/');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
