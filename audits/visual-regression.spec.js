import { expect, test } from '@playwright/test';
import { REPRESENTATIVE_ROUTES } from './routes.js';

for (const route of REPRESENTATIVE_ROUTES) {
  test(`${route} matches the visual baseline`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    await expect(page).toHaveScreenshot(`${slug(route)}-desktop.png`, screenshotOptions());

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    await expect(page).toHaveScreenshot(`${slug(route)}-mobile.png`, screenshotOptions());
  });
}

async function settlePage(page) {
  await page.locator('main h1').waitFor({ state: 'visible' });
  if (process.env.VISUAL_BASELINE_CAPTURE !== '1') {
    await page.locator('#app[data-sense6-hydrated]').waitFor();
  }
  await page.waitForFunction(() => !document.querySelector('#app > .static-entry'));
  await page.evaluate(async () => document.fonts?.ready);
}

function screenshotOptions() {
  return {
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    maxDiffPixelRatio: 0.002,
  };
}

function slug(route) {
  return route === '/' ? 'root' : route.replaceAll('/', '-').replace(/^-|-$/g, '');
}
