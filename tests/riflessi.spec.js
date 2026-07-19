import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installQuickRiflessi, respondToChoice, respondWithKey } from './helpers/browser.js';

test('Riflessi completes all three instruments and reports separate device-relative measures', async ({
  page,
}) => {
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');

  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Riflessi/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions, kept separate/i })).toBeInViewport();
  await expect(page).toHaveURL(/\/en\/riflessi\/$/);

  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Keyboard/i }).click();
  const start = page.getByRole('button', { name: /Begin instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /One signal. One action/i })).toBeVisible();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondWithKey(page, 'Space');
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  await respondWithKey(page, 'Space');
  await respondWithKey(page, 'Space');

  await page.getByRole('button', { name: /Continue to Scelta/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondToChoice(page);
  await respondToChoice(page);
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  for (let trial = 0; trial < 4; trial += 1) await respondToChoice(page);

  await page.getByRole('button', { name: /Continue to Tenuta/i }).click();
  await page.getByRole('button', { name: /Start the 3-minute run/i }).click();
  await respondWithKey(page, 'Space');

  await expect(page.getByRole('heading', { name: /more than one dimension/i })).toBeVisible();
  await expect(page.locator('.rx-metric')).toHaveCount(6);
  await expect(page.getByText(/Compare conditions, not people/i)).toBeVisible();
  await expect(page.getByText(/population percentile/i)).toBeVisible();
  await expect(page.getByText(/brain age/i)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the mobile Riflessi setup and response chamber stay inside the viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');
  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Touch \/ pointer/i }).click();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'live');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await page.getByRole('button', { name: /Respond to signal/i }).click();
});
