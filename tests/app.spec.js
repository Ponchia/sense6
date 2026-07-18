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

  // Sequence interactions must update the board in place — a full re-render
  // reads as the exercise resetting.
  await page.evaluate(() => {
    document.querySelector('#sequence-run').dataset.probe = 'kept';
  });
  const firstMovableTile = page.getByRole('button', { name: /Movable color tile 1 of 7/ });
  await firstMovableTile.click();
  await expect(firstMovableTile).toHaveAttribute('aria-pressed', 'true');
  await firstMovableTile.press('ArrowRight');
  expect(await page.evaluate(() => document.querySelector('#sequence-run').dataset.probe)).toBe('kept');

  for (let run = 0; run < 3; run += 1) {
    await page.getByRole('button', { name: /Lock this order/i }).click();
  }

  await expect(page.getByRole('heading', { name: /Your visible boundary, on this display/i })).toBeVisible();
  await expect(page.locator('.result-note')).toContainText('not a population percentile');
  await expect(page.getByRole('meter')).toHaveCount(3);
  await expect(page.locator('.profile-radar__point')).toHaveCount(7);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('pointer drag reorders tiles by insertion and tap-swap is one-shot', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: /Build the smoothest color path/i })).toBeVisible();
  // Let the staggered entrance animation settle before measuring geometry.
  await page.waitForTimeout(700);

  const colors = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.sequence-tile')].map((tile) =>
        tile.style.getPropertyValue('--tile-color'),
      ),
    );

  // Drag the first tile onto the fourth slot: insertion, not swap — the
  // in-between tiles shift left by one.
  const before = await colors();
  const source = page.locator('[data-sequence-index="0"]');
  const target = page.locator('[data-sequence-index="3"]');
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  const afterDrag = await colors();
  expect(afterDrag[3]).toBe(before[0]);
  expect(afterDrag.slice(0, 3)).toEqual(before.slice(1, 4));

  // Tap-swap: selecting two tiles swaps them once and clears the selection.
  await page.locator('[data-sequence-index="1"]').click();
  await expect(page.locator('[data-sequence-index="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-sequence-index="5"]').click();
  const afterSwap = await colors();
  expect(afterSwap[1]).toBe(afterDrag[5]);
  expect(afterSwap[5]).toBe(afterDrag[1]);
  await expect(page.locator('.sequence-tile.is-selected')).toHaveCount(0);
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
