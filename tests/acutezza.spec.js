import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  captureMetrics,
  completeAcutezzaCalibration,
  completeAcutezzaEye,
  installQuickAcutezza,
} from './helpers/browser.js';

test('Acutezza calibrates the display and reports three separate non-clinical observations', async ({
  page,
}) => {
  await installQuickAcutezza(page);
  const metrics = await captureMetrics(page);
  await page.goto('/en/acutezza/');
  await expect(page).toHaveURL(/\/en\/acutezza\/$/);
  await expect(page.getByRole('heading', { name: /Calibrate the screen/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Acutezza/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();

  await completeAcutezzaCalibration(page);
  await expect(page.getByRole('heading', { name: /physical scale/i })).toBeVisible();
  await expect(page.getByText(/Assumed distance/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await completeAcutezzaEye(page, { missPractice: true });

  await expect(page.getByRole('heading', { name: /Rest before switching/i })).toBeVisible();
  await page.getByRole('button', { name: /Check distance, then test Left eye/i }).click();
  await expect(page.getByRole('heading', { name: /Return to 50 cm/i })).toBeVisible();
  await page.getByRole('button', { name: /Setup unchanged/i }).click();
  await completeAcutezzaEye(page);
  await expect(page.getByRole('heading', { name: /Separate observations/i })).toBeVisible();
  await expect(page.locator('.ac-metric')).toHaveCount(6);
  await expect(page.locator('.ac-results__stamp')).toContainText('02 / 02');
  await expect(page.getByText(/not an eye examination/i)).toBeVisible();
  await expect(page.getByText(/Do not infer normal vision, 20\/20/i)).toBeVisible();
  await expect(page.getByText(/astigmatism axis/i)).toBeVisible();
  await expect
    .poll(() => metrics)
    .toEqual([
      { event: 'site_loaded', test: 'site' },
      { event: 'test_started', test: 'acutezza' },
      { event: 'test_completed', test: 'acutezza' },
    ]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Acutezza invalidates a measured run when display geometry changes', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page);
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: /current target was discarded/i })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  await page.getByRole('button', { name: /Resume this instrument/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.getByRole('heading', { name: /measured geometry changed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Recalibrate/i })).toBeVisible();
});

test('Acutezza accepts repeatable blind-spot sweeps as measured calibration', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The mobile project covers the ruler fallback');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();

  for (let sweep = 0; sweep < 3; sweep += 1) {
    await page.getByRole('button', { name: /Start sweep/i }).click();
    await expect(page.getByRole('button', { name: /Dot disappeared/i })).toBeEnabled();
    await page.waitForTimeout(180);
    await page.getByRole('button', { name: /Dot disappeared/i }).click();
  }

  await expect(page.getByRole('heading', { name: /cm from the screen/i })).toBeVisible();
  await page.getByRole('button', { name: /Use this distance/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
  await expect(page.getByText('Measured setup', { exact: true })).toBeVisible();
  await expect(page.getByText(/blind-spot sweeps agreed/i)).toBeVisible();
});

test('Acutezza retries stronger contrast before marking Contrasto unavailable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop covers the contrast fallback state');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();

  await expect(page.getByText(/nominal 10% condition/i)).toBeVisible();
  await page.getByRole('button', { name: /Not clearly/i }).click();
  await expect(page.getByText(/nominal 20% condition/i)).toBeVisible();
  await page.getByRole('button', { name: /Not clearly/i }).click();
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Prepare Right eye/i })).toBeVisible();
});

test('the mobile Acutezza setup and target controls remain inside the viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The card cannot fit/i }).click();
  await expect(page.getByRole('heading', { name: /screen cannot show the calibration card/i })).toBeVisible();
  await page.getByRole('button', { name: /Try card calibration again/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
