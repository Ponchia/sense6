import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the Learn page links to original research guides and returns to the lab @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  await expect(page.locator('.gallery-learn')).toBeVisible();
  await page.locator('.gallery-learn [data-sense6-route="learn"]').click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'learn');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perception, explained.');
  await expect(page.locator('.learn-topic')).toHaveCount(2);
  await page.locator('.learn-topic [data-sense6-route="tetrachromacy-guide"]').click();
  await expect(page).toHaveURL(/\/en\/tetrachromacy-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetrachromacy-guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Can an online test detect tetrachromacy?',
  );
  await expect(page.locator('.learn-article__body section')).toHaveCount(4);
  await expect(page.locator('.learn-references li')).toHaveCount(3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/tetrachromacy-guide/',
  );
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.locator('h1')).toContainText('Screen Colour Lab');
});

test('reaction guide explains hardware delay without short-circuiting consent @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/reaction-time-guide/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How accurate is a reaction-time test in a browser?',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/reaction-time-guide/',
  );
  await expect(page.getByText(/not an instrument-calibrated measurement/i)).toBeVisible();
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/riflessi\/\?scope=signal$/);
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-rx-consent]')).not.toBeChecked();
  await expect(page.locator('[data-action="rx-start"]')).toBeDisabled();
});

test('English-only guide language switching leads to a real localized route', async ({ page }) => {
  await page.goto('/en/learn/');
  await page.locator('[data-locale-select]').selectOption('it');
  await expect(page).toHaveURL(/\/it\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
  await expect(page.locator('main h1')).toBeVisible();
});

test('all Learn pages remain readable and accessible at a narrow viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Full Learn page accessibility covered in Chromium');
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ['learn', 'tetrachromacy-guide', 'reaction-time-guide']) {
    await page.goto(`/en/${route}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
    await expect(page.locator('main h1')).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations, route).toEqual([]);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${route} should not scroll horizontally`).toBe(dimensions.viewport);
  }
});
