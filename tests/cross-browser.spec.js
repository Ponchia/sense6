import { expect, test } from '@playwright/test';

test('the gallery opens a localized experiment with route CSS', async ({ page }) => {
  await gotoHydrated(page, '/en/');
  await page
    .getByRole('link', { name: /Tetracromia/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.getByRole('heading', { name: /Notice colour in three different ways/i })).toBeVisible();
  await expect(page.locator('.tetracromia-hero__instrument')).toHaveCSS('position', 'relative');
});

test('the Tetracromia setup reaches an enabled measured choice', async ({ page }) => {
  await gotoHydrated(page, '/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await expect(page.locator('[data-action="start"]')).toBeDisabled();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
});

test('a complete Screen Colour Lab journey reaches separate observations', async ({ page }) => {
  await gotoHydrated(page, '/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  for (let trial = 0; trial < 14; trial += 1) await page.locator('[data-choice="0"]').first().click();
  for (let trial = 0; trial < 12; trial += 1) await page.locator('[data-choice="0"]').first().click();
  for (let run = 0; run < 3; run += 1) await page.getByRole('button', { name: /Lock this order/i }).click();

  await expect(
    page.getByRole('heading', { name: /Three observations from one short screen-colour run/i }),
  ).toBeVisible();
  await expect(page.locator('.result-metric')).toHaveCount(3);
});

test('a display resize invalidates an active Screen Colour Lab journey', async ({ page }) => {
  await gotoHydrated(page, '/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.getByText(/The display size changed/i)).toBeVisible();
  await expect(page.locator('[data-action="start"]')).toBeDisabled();
});

async function gotoHydrated(page, route) {
  await page.goto(route);
  await page.locator('#app[data-sense6-hydrated]').waitFor();
}
