import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LEARN_ROUTES } from '../src/routes.js';

test('the Learn page links to original research guides and returns to the lab @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  await expect(page.locator('.gallery-learn')).toBeVisible();
  await page.locator('.gallery-learn [data-sense6-route="learn"]').click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'learn');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perception, explained.');
  await expect(page.locator('.learn-topic')).toHaveCount(LEARN_ROUTES.length - 1);
  await page.locator('.learn-topic [data-sense6-route="tetrachromacy-guide"]').click();
  await expect(page).toHaveURL(/\/en\/tetrachromacy-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetrachromacy-guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Can an online test detect tetrachromacy?',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sense6.net/social/tetracromia.png',
  );
  await expect(page.locator('.learn-article__body section')).toHaveCount(4);
  await expect(page.locator('.learn-references li')).toHaveCount(3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/tetrachromacy-guide/',
  );
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.locator('h1')).toContainText('Tetracromia');
});

test('reaction guide explains hardware delay without short-circuiting consent @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/reaction-time-guide/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How accurate is a reaction-time test in a browser?',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sense6.net/social/riflessi.png',
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

test('the colour-vision guide explains limitations and leads to real Daltonia @pr-smoke', async ({
  page,
}) => {
  await page.goto('/en/');
  const articleLink = page.locator('.gallery-learn [data-sense6-route="color-blindness-guide"]');
  await expect(articleLink).toBeVisible();
  await articleLink.click();
  await expect(page).toHaveURL(/\/en\/color-blindness-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'color-blindness-guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What can an online colour-blindness test tell you?',
  );
  await expect(page.locator('.learn-article__body section')).toHaveCount(4);
  await expect(page.locator('.learn-references li')).toHaveCount(3);
  await expect(page.locator('.learn-answer')).toContainText('cannot, by itself, confirm or rule out');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sense6.net/en/color-blindness-guide/',
  );
  await page.locator('.learn-experiment a').click();
  await expect(page).toHaveURL(/\/en\/color-blindness\/$/);
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
});

test('hearing and sharpness guides answer their question and link to real experiments @pr-smoke', async ({
  page,
}) => {
  for (const [route, experiment] of [
    ['hearing-range-guide', 'udito'],
    ['visual-acuity-guide', 'acutezza'],
  ]) {
    await page.goto(`/en/${route}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
    await expect(page.locator('.learn-answer')).toContainText(/cannot|not an audiogram/i);
    await expect(page.locator('.learn-references li')).toHaveCount(4);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://sense6.net/en/${route}/`,
    );
    await page.locator('.learn-experiment a').click();
    await expect(page).toHaveURL(new RegExp(`/en/${experiment}/$`));
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', experiment);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
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
  for (const route of LEARN_ROUTES) {
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
