import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing page presents the method and passes an accessibility scan', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /How finely do you see color/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Begin the color lab/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /An RGB screen cannot test tetrachromacy/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // The inverted method section must re-anchor heading and step-title colors;
  // base styles pin them to var(--text), which disappears on the dark panel.
  const methodContrast = await page.evaluate(() => {
    const section = document.querySelector('.method');
    const targets = [section.querySelector('h2'), section.querySelector('.method-steps strong')];
    const sectionBackground = getComputedStyle(section).backgroundColor;
    return targets.map((element) => ({
      color: getComputedStyle(element).color,
      background: sectionBackground,
    }));
  });
  for (const { color, background } of methodContrast) {
    expect(color).not.toEqual(background);
  }
});

test('screen setup gates the adaptive lab and advances into the field instrument', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();

  const start = page.getByRole('button', { name: /Start instrument 01/i });
  await expect(start).toBeDisabled();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole('heading', { name: /Which tile is different/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Color tile 1', exact: true })).toBeVisible();

  for (let trial = 0; trial < 14; trial += 1) {
    await page.getByRole('button', { name: 'Color tile 1', exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: /Which field shifts in color/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dotted field 1' })).toBeVisible();
});

test('a complete session produces an honest, accessible result profile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await page.getByRole('button', { name: /Start instrument 01/i }).click();

  for (let trial = 0; trial < 14; trial += 1) {
    await page.getByRole('button', { name: 'Color tile 1', exact: true }).click();
  }
  for (let trial = 0; trial < 12; trial += 1) {
    await page.getByRole('button', { name: 'Dotted field 1', exact: true }).click();
  }

  const firstMovableTile = page.getByRole('button', { name: /Movable color tile 1 of 7/ });
  await firstMovableTile.click();
  await expect(firstMovableTile).toHaveAttribute('aria-pressed', 'true');
  await firstMovableTile.press('ArrowRight');

  for (let run = 0; run < 3; run += 1) {
    await page.getByRole('button', { name: /Lock this order/i }).click();
  }

  await expect(page.getByRole('heading', { name: /Your visible boundary, on this display/i })).toBeVisible();
  await expect(page.locator('.result-note')).toContainText('not a population percentile');
  await expect(page.getByRole('meter')).toHaveCount(3);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile layout stays inside the viewport through setup and the first trial', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await page.goto('/');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  await page.getByRole('button', { name: /Begin the color lab/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  await page.getByLabel(/I can distinguish the steps/i).check();
  await page.getByRole('button', { name: /Start instrument 01/i }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});
