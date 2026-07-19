import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { answerCurrentSoundTrial, captureMetrics, installQuickUdito } from './helpers/browser.js';

test('Udito completes three safe-listening instruments and keeps results separate', async ({ page }) => {
  await installQuickUdito(page);
  const metrics = await captureMetrics(page);
  await page.goto('/en/udito/');
  await expect(page).toHaveURL(/\/en\/udito\/$/);

  await expect(page.getByRole('heading', { name: /Listen for the boundary/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Udito/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await page.getByRole('button', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions. No synthetic score/i })).toBeInViewport();

  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: /Play quiet reference/i }).click();
  await expect(page.getByText(/Reference played/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /Which tone is quietest/i })).toBeVisible();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await answerCurrentSoundTrial(page);
  await page.getByRole('button', { name: /Begin headphone check/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);

  await page.getByRole('button', { name: /Continue to Portata/i }).click();
  await page.getByRole('button', { name: /Start Portata/i }).click();
  await answerCurrentSoundTrial(page);
  await answerCurrentSoundTrial(page);

  await page.getByRole('button', { name: /Continue to Intonazione/i }).click();
  await page.getByRole('button', { name: /Start Intonazione/i }).click();
  for (let trial = 0; trial < 4; trial += 1) await answerCurrentSoundTrial(page);

  await expect(page.getByRole('heading', { name: /Three listening measures/i })).toBeVisible();
  await expect(page.locator('.au-metric')).toHaveCount(4);
  await expect(page.getByText(/Device-relative, never dB HL/i)).toBeVisible();
  await expect(page.getByText(/hearing age/i)).toBeVisible();
  await expect(page.getByText(/composite hearing score/i)).toBeVisible();
  await expect
    .poll(() => metrics)
    .toEqual([
      { event: 'site_loaded', test: 'site' },
      { event: 'test_started', test: 'udito' },
      { event: 'test_completed', test: 'udito' },
    ]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the mobile Udito setup and listening runner stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickUdito(page);
  await page.goto('/en/udito/');
  await page.getByRole('button', { name: /Prepare the sound lab/i }).click();
  await page.getByRole('button', { name: /Play quiet reference/i }).click();
  await expect(page.getByText(/Reference played/i)).toBeVisible();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-au-response="0"]')).toBeEnabled();

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await answerCurrentSoundTrial(page);
});
