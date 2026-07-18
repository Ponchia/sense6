import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const QUICK_RIFLESSI = {
  riflessi: {
    anticipationMs: 0,
    feedbackMs: 8,
    signal: {
      practiceTrials: 1,
      scoredTrials: 2,
      catchTrials: 0,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 500,
    },
    choice: {
      practiceTrials: 2,
      scoredTrials: 4,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 500,
    },
    stability: {
      durationMs: 550,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 300,
    },
  },
};

async function installQuickRiflessi(page) {
  await page.addInitScript((configuration) => {
    window.__SENSORIA_TEST_CONFIG__ = configuration;
  }, QUICK_RIFLESSI);
}

async function respondWithKey(page, key) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  await page.keyboard.press(key);
}

async function respondToChoice(page) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  const side = await page.locator('[data-rx-arrow]').getAttribute('data-side');
  await page.keyboard.press(side === 'left' ? 'ArrowLeft' : 'ArrowRight');
}

test('the gallery lists exams, is accessible, and routes into one', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/tetracromia"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/color-blindness"]')).toBeVisible();
  await expect(page.locator('.exam-card__link[href="#/riflessi"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /More senses, same standard/i })).toBeVisible();
  await expect(page.locator('.roadmap-item')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkResults = await new AxeBuilder({ page }).analyze();
  expect(darkResults.violations).toEqual([]);

  await page.locator('.exam-card__link[href="#/color-blindness"]').click();
  await expect(page).toHaveURL(/#\/color-blindness$/);
  await expect(page.getByRole('heading', { name: /Find the gap in the dots/i })).toBeVisible();
});

test('Riflessi completes all three instruments and reports separate device-relative measures', async ({
  page,
}) => {
  await installQuickRiflessi(page);
  await page.goto('/#/riflessi');

  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Riflessi/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions, kept separate/i })).toBeInViewport();
  await expect(page).toHaveURL(/#\/riflessi$/);

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
  await page.goto('/#/riflessi');
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

test('landing page presents the method and passes an accessibility scan', async ({ page }) => {
  await page.goto('/#/tetracromia');

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
  await page.goto('/#/tetracromia');
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
  await page.goto('/#/tetracromia');
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
  await page.goto('/#/tetracromia');
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
  await page.goto('/#/tetracromia');

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

test('the Daltonia experiment renders adaptive targets and reports non-clinical thresholds', async ({
  page,
}) => {
  await page.goto('/#/color-blindness');
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
  await page.goto('/#/color-blindness');
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
