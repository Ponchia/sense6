import { expect, test } from '@playwright/test';

test('the gallery opens a localized experiment with route CSS', async ({ page }) => {
  await page.goto('/en/');
  await page
    .getByRole('link', { name: /Tetracromia/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.getByRole('heading', { name: /How finely do you see colour/i })).toBeVisible();
  await expect(page.locator('.hero__instrument')).toHaveCSS('position', 'relative');
});

test('the Tetracromia setup reaches an enabled measured choice', async ({ page }) => {
  await page.goto('/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await expect(page.locator('[data-action="start"]')).toBeDisabled();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
});
