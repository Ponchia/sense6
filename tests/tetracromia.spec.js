import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectInVisualViewport, expectJournalEntry, expectNoHorizontalOverflow } from './helpers/browser.js';

async function startLab(page, locale = 'en') {
  await page.goto(`/${locale}/tetracromia/`);
  await page.locator('[data-action="setup"]').first().click();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
}

async function answerTrials(page, selector, count) {
  const choice = page.locator(selector).first();
  for (let trial = 0; trial < count; trial += 1) await choice.click();
}

async function reachField(page, locale = 'en') {
  await startLab(page, locale);
  await answerTrials(page, '[data-choice="0"]', 14);
  await expect(page.locator('.field-choice').first()).toBeEnabled();
}

async function reachSequence(page, locale = 'en') {
  await reachField(page, locale);
  await answerTrials(page, '[data-choice="0"]', 12);
  await expect(page.locator('[data-action="submit-sequence"]')).toBeEnabled();
}

async function touchDrag(page, from, to, steps = 8) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let step = 1; step <= steps; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        },
      ],
    });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

async function expectHitTestableGeometry(page, selector, minimum) {
  const geometry = await page.locator(selector).evaluateAll((elements, expectedSelector) => {
    const boxes = elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return {
        width: bounds.width,
        height: bounds.height,
        inViewport:
          bounds.top >= 0 &&
          bounds.left >= 0 &&
          bounds.bottom <= window.innerHeight &&
          bounds.right <= window.innerWidth,
        hit: hit === element || element.contains(hit) || hit?.closest(expectedSelector) === element,
      };
    });
    return {
      count: boxes.length,
      minWidth: Math.min(...boxes.map((box) => box.width)),
      minHeight: Math.min(...boxes.map((box) => box.height)),
      allInViewport: boxes.every((box) => box.inViewport),
      allHit: boxes.every((box) => box.hit),
    };
  }, selector);

  expect(geometry.count).toBe(minimum.count);
  expect(geometry.minWidth).toBeGreaterThanOrEqual(minimum.width);
  expect(geometry.minHeight).toBeGreaterThanOrEqual(minimum.height);
  expect(geometry.allInViewport).toBe(true);
  expect(geometry.allHit).toBe(true);
}

test('landing page presents the method and passes an accessibility scan', async ({ page }) => {
  await page.goto('/en/tetracromia/');

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
  await page.goto('/en/tetracromia/');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();

  const start = page.getByRole('button', { name: /Start instrument 01/i });
  await expect(start).toBeDisabled();
  await expect(page.getByRole('img', { name: /Eleven brightness steps/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /Continuous grayscale gradient/i })).toBeVisible();
  const setupResults = await new AxeBuilder({ page }).analyze();
  expect(setupResults.violations).toEqual([]);
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

test('screen setup exposes its warning when forced colors are active', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/en/tetracromia/');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();

  await expect(page.getByText('Color override detected', { exact: true })).toBeVisible();
  await page.getByLabel(/I can distinguish the steps/i).check();
  await expect(page.getByRole('button', { name: /Start instrument 01/i })).toBeDisabled();
});

test('a complete session produces an honest, accessible result profile', async ({ page }) => {
  await page.goto('/en/tetracromia/');
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
  await expectJournalEntry(page, 'tetracromia');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('pointer drag reorders tiles by insertion and tap-swap is one-shot', async ({ page }) => {
  await page.goto('/en/tetracromia/');
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

test('short landscape keeps discrimination stimuli visible, meaningful, and hit-testable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop Chromium supplies the pointer geometry lane');

  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await startLab(page);

    await page.mouse.move(0, 0);
    await expectHitTestableGeometry(page, '.color-tile', { count: 16, width: 50, height: 38 });
    const tileBox = await page.locator('.color-tile').first().boundingBox();
    await page.mouse.click(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
    await expect(page.locator('.trial-count b')).toHaveText('02');
    await answerTrials(page, '[data-choice="0"]', 13);

    await expect(page.locator('.field-choice').first()).toBeEnabled();
    await page.mouse.move(0, 0);
    await expectHitTestableGeometry(page, '.field-choice', { count: 4, width: 150, height: 75 });
    const fieldBox = await page.locator('.field-choice').first().boundingBox();
    await page.mouse.click(fieldBox.x + fieldBox.width / 2, fieldBox.y + fieldBox.height / 2);
    await expect(page.locator('.trial-count b')).toHaveText('02');
  }
});

test('semantic transitions reveal the stimulus and results while keyboard focus stays operable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser viewport and focus regression');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await page.locator('#screen-ready').check();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('.color-tile').first()).toBeEnabled();

  const thresholdTransition = await page.evaluate(() => {
    const heading = document.querySelector('.trial-heading').getBoundingClientRect();
    const stimulus = document.querySelector('.threshold-grid').getBoundingClientRect();
    return {
      headingVisible: heading.top >= 0 && heading.bottom <= innerHeight,
      stimulusVisible: stimulus.top >= 0 && stimulus.bottom <= innerHeight,
      headingFocused: document.activeElement?.classList.contains('trial-heading'),
    };
  });
  expect(thresholdTransition).toEqual({
    headingVisible: true,
    stimulusVisible: true,
    headingFocused: true,
  });

  const thresholdChoice = page.locator('[data-choice="0"]');
  await thresholdChoice.focus();
  await thresholdChoice.press('Enter');
  await expect(thresholdChoice).toBeEnabled();
  await expect(thresholdChoice).toBeFocused();
  await answerTrials(page, '[data-choice="0"]', 13);

  await expect(page.locator('.field-choice').first()).toBeEnabled();
  const fieldTransition = await page.evaluate(() => {
    const heading = document.querySelector('.trial-heading').getBoundingClientRect();
    const stimulus = document.querySelector('.field-grid').getBoundingClientRect();
    return {
      headingVisible: heading.top >= 0 && heading.bottom <= innerHeight,
      stimulusVisible: stimulus.top >= 0 && stimulus.bottom <= innerHeight,
      headingFocused: document.activeElement?.classList.contains('trial-heading'),
    };
  });
  expect(fieldTransition).toEqual({ headingVisible: true, stimulusVisible: true, headingFocused: true });

  const fieldChoice = page.locator('[data-choice="0"]');
  await fieldChoice.focus();
  await fieldChoice.press('Enter');
  await expect(fieldChoice).toBeEnabled();
  await expect(fieldChoice).toBeFocused();
  await answerTrials(page, '[data-choice="0"]', 11);

  const submit = page.locator('[data-action="submit-sequence"]');
  await submit.click();
  await submit.click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await submit.click();

  await expect(page.locator('.results-view')).toBeFocused();
  const resultTransition = await page.evaluate(() => {
    const heading = document.querySelector('.results-head h1').getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      headingVisible: heading.top >= 0 && heading.bottom <= innerHeight,
    };
  });
  expect(resultTransition).toEqual({ scrollY: 0, headingVisible: true });
});

test('Field redraws deterministic seeded pixels whenever its bounds change', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser canvas resize regression');
  await page.setViewportSize({ width: 844, height: 500 });
  await reachField(page);

  const canvasState = () =>
    page.locator('canvas[data-field="0"]').evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      return {
        width: canvas.width,
        height: canvas.height,
        expectedWidth: Math.round(bounds.width * Math.min(devicePixelRatio || 1, 2)),
        expectedHeight: Math.round(bounds.height * Math.min(devicePixelRatio || 1, 2)),
        hash: hash >>> 0,
      };
    });

  await expect
    .poll(async () => {
      const current = await canvasState();
      return current.width === current.expectedWidth && current.height === current.expectedHeight;
    })
    .toBe(true);
  const landscape = await canvasState();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const current = await canvasState();
      return (
        current.width === current.expectedWidth &&
        current.height === current.expectedHeight &&
        current.width !== landscape.width
      );
    })
    .toBe(true);

  await page.setViewportSize({ width: 844, height: 500 });
  await expect
    .poll(async () => {
      const current = await canvasState();
      return current.width === landscape.width && current.height === landscape.height;
    })
    .toBe(true);
  const restored = await canvasState();
  expect(restored.hash).toBe(landscape.hash);
});

test('rapid real touch activation records one response per rendered trial', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen-only response guard');
  await page.setViewportSize({ width: 390, height: 844 });
  await startLab(page);

  const tapTwice = async (locator) => {
    await expect(locator).toBeEnabled();
    const bounds = await locator.boundingBox();
    const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForTimeout(60);
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForTimeout(240);
  };

  await tapTwice(page.locator('[data-choice="0"]'));
  await expect(page.locator('.trial-count b')).toHaveText('02');
  await answerTrials(page, '[data-choice="0"]', 13);

  await tapTwice(page.locator('[data-choice="0"]'));
  await expect(page.locator('.trial-count b')).toHaveText('02');
  await answerTrials(page, '[data-choice="0"]', 11);

  await tapTwice(page.locator('[data-action="submit-sequence"]'));
  await expect(page.locator('.trial-count b')).toHaveText('02');
});

test('Sequence permits vertical touch scrolling and retains horizontal insertion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen-only directional gesture regression');
  await page.setViewportSize({ width: 320, height: 568 });
  await reachSequence(page);
  await page.waitForTimeout(700);

  const colors = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.sequence-tile')].map((tile) =>
        tile.style.getPropertyValue('--tile-color'),
      ),
    );

  const beforeVertical = await colors();
  const first = page.locator('[data-sequence-index="0"]');
  await first.scrollIntoViewIfNeeded();
  const verticalBox = await first.boundingBox();
  const verticalStart = {
    x: verticalBox.x + verticalBox.width / 2,
    y: verticalBox.y + verticalBox.height / 2,
  };
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await touchDrag(page, verticalStart, { x: verticalStart.x, y: verticalStart.y - 120 });
  await page.waitForTimeout(200);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter - scrollBefore).toBeGreaterThan(30);
  expect(await colors()).toEqual(beforeVertical);

  await first.scrollIntoViewIfNeeded();
  const sourceBox = await page.locator('[data-sequence-index="0"]').boundingBox();
  const targetBox = await page.locator('[data-sequence-index="3"]').boundingBox();
  await touchDrag(
    page,
    { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 },
    { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 },
  );

  const afterHorizontal = await colors();
  expect(afterHorizontal[3]).toBe(beforeVertical[0]);
  expect(afterHorizontal.slice(0, 3)).toEqual(beforeVertical.slice(1, 4));
});

test('German landing and results stay contained across narrow widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser narrow containment matrix');
  await page.goto('/de/tetracromia/');
  const widths = [320, 360, 390, 412];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    const landing = await page.evaluate(() => {
      const heading = document.querySelector('.hero h1');
      const bounds = heading.getBoundingClientRect();
      return {
        noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        headingContained:
          bounds.left >= 0 && bounds.right <= innerWidth && heading.scrollWidth <= heading.clientWidth,
      };
    });
    expect(landing).toEqual({ noPageOverflow: true, headingContained: true });
  }

  await page.locator('[data-action="setup"]').first().click();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await answerTrials(page, '[data-choice="0"]', 14);
  await answerTrials(page, '[data-choice="0"]', 12);
  await page.locator('[data-action="submit-sequence"]').click();
  await page.locator('[data-action="submit-sequence"]').click();
  await page.locator('[data-action="submit-sequence"]').click();
  await expect(page.locator('.results-view')).toBeVisible();

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    const containment = await page.evaluate(() => {
      const heading = document.querySelector('.results-head h1');
      const headingBounds = heading.getBoundingClientRect();
      const svg = document.querySelector('.profile-radar');
      const svgBounds = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const labelsContained = [...svg.querySelectorAll('.profile-radar__label')].every((label) => {
        const bounds = label.getBBox();
        return (
          bounds.x >= viewBox.x &&
          bounds.y >= viewBox.y &&
          bounds.x + bounds.width <= viewBox.x + viewBox.width &&
          bounds.y + bounds.height <= viewBox.y + viewBox.height
        );
      });
      return {
        noPageOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        headingContained:
          headingBounds.left >= 0 &&
          headingBounds.right <= innerWidth &&
          heading.scrollWidth <= heading.clientWidth,
        radarContained: svgBounds.left >= 0 && svgBounds.right <= innerWidth && labelsContained,
      };
    });
    expect(containment).toEqual({
      noPageOverflow: true,
      headingContained: true,
      radarContained: true,
    });
  }
});

test('Tetracromia remains operable at 320px with 200% text sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Uses explicit text-only zoom geometry');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/de/tetracromia/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await expectNoHorizontalOverflow(page, '200% text Tetracromia landing');

  await page.locator('[data-action="setup"]').first().click();
  await expectNoHorizontalOverflow(page, '200% text Tetracromia setup');
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
  await expectNoHorizontalOverflow(page, '200% text Tetracromia trial');
  const firstChoice = page.locator('[data-choice="0"]');
  await firstChoice.scrollIntoViewIfNeeded();
  await expectInVisualViewport(firstChoice, '200% text Threshold choice', { hitTest: true });
});

test('mobile layout stays inside the viewport through setup and the first trial', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await page.goto('/en/tetracromia/');

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
