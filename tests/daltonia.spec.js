import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the Daltonia experiment renders adaptive targets and reports non-clinical thresholds', async ({
  page,
}) => {
  await page.goto('/en/color-blindness/');
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
  await expect(page.getByText('Three staircases', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Daltonia/i })).toBeVisible();

  const methodColours = await page.evaluate(() => {
    const target = document.querySelector('.cb-steps strong');
    return {
      text: getComputedStyle(target).color,
      background: getComputedStyle(document.documentElement).backgroundColor,
    };
  });
  expect(methodColours.text).not.toEqual(methodColours.background);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: /Start the experiment/i }).click();
  const begin = page.getByRole('button', { name: /Start practice/i });
  await expect(begin).toBeDisabled();
  await page.getByLabel(/My colour filters are off and I understand/i).check();
  await expect(begin).toBeEnabled();
  await begin.click();

  // Practice gives corrective feedback rather than silently accepting a guess.
  await expect(page.getByRole('heading', { name: /Where is the clear gap/i })).toBeVisible();
  const practiceScan = await new AxeBuilder({ page }).analyze();
  expect(practiceScan.violations).toEqual([]);
  await page.getByRole('button', { name: /Gap at top/i }).click();
  await expect(page.getByText(/Try this target again/i)).toBeVisible();
  await page.getByRole('button', { name: /Gap at right/i }).click();
  await expect(page.getByText(/That is the gap/i)).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByText(/That is the gap/i)).toBeVisible();
  await page.getByRole('button', { name: /Next practice target/i }).click();
  await page.getByRole('button', { name: /Gap at top/i }).click();
  await page.getByRole('button', { name: /Begin measured run/i }).click();

  await expect(page.getByRole('button', { name: /No gap visible/i })).toBeVisible();

  // No-gap responses advance the adaptive run. Axes may now end before the
  // 39-presentation maximum when a display boundary is confirmed.
  for (let response = 0; response < 39; response += 1) {
    if (await page.locator('.results-view').count()) break;
    const canvas = page.locator('[data-target]');
    await expect(canvas).toBeVisible();
    await expect
      .poll(() =>
        canvas.evaluate((node) => {
          const ctx = node.getContext('2d');
          const { data } = ctx.getImageData(0, 0, node.width, node.height);
          let opaque = 0;
          for (let i = 3; i < data.length; i += 400) if (data[i] > 0) opaque += 1;
          return opaque;
        }),
      )
      .toBeGreaterThan(0);
    await page.getByRole('button', { name: /No gap visible/i }).click();
  }

  await expect(
    page.getByRole('heading', { name: /thresholds from this run|Run inconclusive/i }),
  ).toBeVisible();
  await expect(page.locator('.cb-threshold-card')).toHaveCount(3);
  await expect(page.locator('.result-note')).toContainText('cannot confirm or rule out');
  await expect(page.getByText(/No colour-vision deficiency detected/i)).toHaveCount(0);

  const resultScan = await new AxeBuilder({ page }).analyze();
  expect(resultScan.violations).toEqual([]);
});

test('the mobile Daltonia target and direction controls fit the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await page.goto('/en/color-blindness/');
  await page.getByRole('button', { name: /Start the experiment/i }).click();
  await page.getByLabel(/My colour filters are off and I understand/i).check();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-target]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Gap at top/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /No gap visible/i })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
});
