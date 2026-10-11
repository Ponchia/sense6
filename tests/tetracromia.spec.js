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

async function expectReadableMobileResults(page, label) {
  await expectNoHorizontalOverflow(page, label);
  const geometry = await page.evaluate(() => {
    const heading = document.querySelector('.results-head h1').getBoundingClientRect();
    const intro = document.querySelector('.results-head > div:first-child').getBoundingClientRect();
    const score = document.querySelector('.score-lockup').getBoundingClientRect();
    const details = document.querySelector('.result-details').getBoundingClientRect();
    const metrics = [...document.querySelectorAll('.result-metric')].map((metric) => {
      const head = metric.querySelector('.result-metric__head').getBoundingClientRect();
      const copy = metric.querySelector('.result-metric__head > div').getBoundingClientRect();
      const value = metric.querySelector('.result-metric__head > strong').getBoundingClientRect();
      const explanation = metric.querySelector('.observation-explain').getBoundingClientRect();
      const minimumTextWidth = Math.min(112, head.width / 2);
      return {
        contained: head.left >= details.left && head.right <= details.right,
        explanationBelow: explanation.top >= head.bottom - 1,
        explanationFullWidth: explanation.width >= head.width - 1,
        textColumnReadable: copy.width >= minimumTextWidth,
        valueBelowCopy: value.top >= copy.bottom - 1,
        valueContained: value.left >= head.left && value.right <= head.right,
        valueReadable: value.width >= minimumTextWidth,
      };
    });

    return {
      headingContained: heading.left >= 0 && heading.right <= innerWidth,
      headingHasUsefulWidth: heading.width >= Math.min(240, innerWidth * 0.75),
      scoreBelowIntro: score.top >= intro.bottom - 1,
      scoreContained: score.left >= 0 && score.right <= innerWidth,
      scoreHasUsefulWidth: score.width >= Math.min(240, innerWidth * 0.75),
      metrics,
    };
  });

  expect(geometry.headingContained).toBe(true);
  expect(geometry.headingHasUsefulWidth).toBe(true);
  expect(geometry.scoreBelowIntro).toBe(true);
  expect(geometry.scoreContained).toBe(true);
  expect(geometry.scoreHasUsefulWidth).toBe(true);
  expect(geometry.metrics).toHaveLength(3);
  for (const metric of geometry.metrics) {
    expect(metric).toEqual({
      contained: true,
      explanationBelow: true,
      explanationFullWidth: true,
      textColumnReadable: true,
      valueBelowCopy: true,
      valueContained: true,
      valueReadable: true,
    });
  }
}

async function centerBelowStickyChrome(locator) {
  await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const chromeBottom = document.querySelector('.site-chrome')?.getBoundingClientRect().bottom ?? 0;
    const usableCenter = chromeBottom + (viewportHeight - chromeBottom) / 2;
    const elementCenter = rect.top + rect.height / 2;
    window.scrollBy({ behavior: 'instant', top: elementCenter - usableCenter });
  });
}

test('Screen Colour Lab entry stays in the first mobile screen @pr-smoke', async ({ page }, testInfo) => {
  test.skip(
    !['chromium', 'mobile'].includes(testInfo.project.name),
    'First-screen geometry is covered in Chromium and emulated mobile',
  );
  for (const viewport of [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/tetracromia/');
    await page.evaluate(async () => document.fonts.ready);
    const start = page.locator('.tetracromia-hero__actions [data-action="setup"]');
    await expect(start).toBeVisible();
    const bounds = await start.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.y, String(viewport.width) + ' start button top').toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height, String(viewport.width) + ' start button bottom').toBeLessThan(
      viewport.height - 8,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      String(viewport.width) + ' horizontal overflow',
    ).toBe(true);
  }
  await page.locator('.tetracromia-hero__actions [data-action="setup"]').click();
  await expect(page.locator('#screen-ready')).not.toBeChecked();
  await expect(page.getByRole('button', { name: /Start instrument 01/i })).toBeDisabled();
});

test('landing page presents the method and passes an accessibility scan', async ({ page }) => {
  await page.goto('/en/tetracromia/');

  await expect(page.getByRole('heading', { name: /Notice colour in three different ways/i })).toBeVisible();
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
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
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

test('a direct Tetracromia route owns its forced-colors warning and preserved stimuli', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/en/tetracromia/');
  await page.getByRole('button', { name: /Begin the color lab/i }).click();

  await expect(page.getByText('Color override detected', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        gradient: getComputedStyle(document.querySelector('.calibration-gradient')).forcedColorAdjust,
        step: getComputedStyle(document.querySelector('.calibration-steps > span')).forcedColorAdjust,
      })),
    )
    .toEqual({ gradient: 'none', step: 'none' });
  await page.getByLabel(/I can distinguish the steps/i).check();
  await expect(page.getByRole('button', { name: /Start instrument 01/i })).toBeDisabled();
});

test('a direct Tetracromia result applies the shared print contract without visiting Udito', async ({
  page,
}) => {
  await reachSequence(page);
  const submit = page.getByRole('button', { name: /Lock this order/i });
  await submit.click();
  await submit.click();
  await submit.click();
  await expect(page.locator('.results-view')).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-chrome')).toHaveCSS('display', 'none');
  await expect(page.locator('body > .ui-sitefooter')).toHaveCSS('display', 'none');
  await expect(page.locator('.results-actions')).toHaveCSS('display', 'none');
  await expect(page.locator('.results-view')).toHaveCSS('padding-top', '0px');
  await expect(page.locator('.results-view')).toHaveCSS('padding-bottom', '0px');
});

test('a complete session produces honest, separate observations @pr-smoke', async ({ page }) => {
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

  await expect(
    page.getByRole('heading', { name: /Three observations from one short screen-colour run/i }),
  ).toBeVisible();
  await expect(page.locator('.result-note')).toContainText('not stable thresholds');
  await expect(page.locator('.result-metric')).toHaveCount(3);
  await expect(page.getByRole('meter')).toHaveCount(0);
  await expect(page.locator('.profile-radar')).toHaveCount(0);
  await expectJournalEntry(page, 'tetracromia');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await expect(page.locator('.result-note__learn a')).toHaveAttribute('href', '/en/tetrachromacy-guide/');
  await page.locator('.result-note__learn a').click();
  await expect(page).toHaveURL(/\/en\/tetrachromacy-guide\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /Can an online test detect tetrachromacy/i }),
  ).toBeVisible();
});

test('storage failure leaves a persistent recovery alert instead of claiming the journal is durable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
  });
  await reachSequence(page);
  const submit = page.getByRole('button', { name: /Lock this order/i });
  await submit.click();
  await submit.click();
  await submit.click();

  await expect(page.getByRole('alert')).toContainText(
    /The result is ready, but this browser did not allow local storage/i,
  );
  await expect(page.locator('.results-actions .ui-button').first()).toContainText(/Copy summary/i);
});

test('disposing Tetracromia cancels held Field and announcement frames', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Deterministic lifecycle instrumentation');
  await page.addInitScript(() => {
    const nativeRequest = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    const heldFrames = new Map();
    let holding = false;
    let nextFrameId = 1_000_000;
    window.__tetracromiaFrameProbe = {
      begin() {
        holding = true;
      },
      end() {
        holding = false;
      },
      count() {
        return heldFrames.size;
      },
    };
    window.requestAnimationFrame = (callback) => {
      if (!holding) return nativeRequest(callback);
      nextFrameId += 1;
      heldFrames.set(nextFrameId, callback);
      return nextFrameId;
    };
    window.cancelAnimationFrame = (frameId) => {
      if (!heldFrames.delete(frameId)) nativeCancel(frameId);
    };
  });

  await startLab(page);
  await answerTrials(page, '[data-choice="0"]', 13);
  await page.evaluate(() => window.__tetracromiaFrameProbe.begin());
  await page.locator('[data-choice="0"]').first().click();
  await page.evaluate(() => window.__tetracromiaFrameProbe.end());
  await expect(page.locator('.field-choice')).toHaveCount(4);
  expect(await page.evaluate(() => window.__tetracromiaFrameProbe.count())).toBeGreaterThan(0);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.brand').click({ force: true });
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator('#app[data-sense6-hydrated="gallery"]')).toBeVisible();
  expect(await page.evaluate(() => window.__tetracromiaFrameProbe.count())).toBe(0);
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
  test.setTimeout(60_000);
  test.skip(testInfo.project.name !== 'chromium', 'Desktop Chromium supplies the pointer geometry lane');

  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/tetracromia/');
    await expectNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} landing`);
    await page.locator('[data-action="setup"]').first().click();
    await expectNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} setup`);
    await page.locator('#screen-ready').check();
    const start = page.locator('[data-action="start"]');
    await start.scrollIntoViewIfNeeded();
    await expectInVisualViewport(start, `${viewport.width}x${viewport.height} start action`, {
      hitTest: true,
    });
    await start.click();
    await expect(page.locator('[data-choice="0"]')).toBeEnabled();

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

    if (viewport.width === 844) {
      await answerTrials(page, '[data-choice="0"]', 11);
      const submit = page.locator('[data-action="submit-sequence"]');
      await expect(submit).toBeEnabled();
      await submit.click();
      await submit.click();
      await submit.click();
      await expect(page.locator('.results-view')).toBeVisible();
      await expectNoHorizontalOverflow(page, '844x390 results');
      const resultsContained = await page.evaluate(() => {
        const details = document.querySelector('.result-details').getBoundingClientRect();
        const score = document.querySelector('.score-lockup').getBoundingClientRect();
        const intro = document.querySelector('.results-head > div:first-child').getBoundingClientRect();
        const metrics = [...document.querySelectorAll('.result-metric')].every((metric) => {
          const head = metric.querySelector('.result-metric__head').getBoundingClientRect();
          const copy = metric.querySelector('.result-metric__head > div').getBoundingClientRect();
          const value = metric.querySelector('.result-metric__head > strong').getBoundingClientRect();
          const explanation = metric.querySelector('.observation-explain').getBoundingClientRect();
          return (
            head.left >= details.left &&
            head.right <= details.right &&
            copy.width >= 240 &&
            value.width >= 120 &&
            explanation.top >= head.bottom - 1 &&
            explanation.width >= head.width - 1
          );
        });
        return {
          metrics,
          scoreBelowIntro: score.top >= intro.bottom - 1,
          scoreContained: score.left >= 0 && score.right <= innerWidth,
        };
      });
      expect(resultsContained).toEqual({ metrics: true, scoreBelowIntro: true, scoreContained: true });
      for (const action of await page.locator('.results-actions .ui-button').all()) {
        await action.scrollIntoViewIfNeeded();
        await expectInVisualViewport(action, '844x390 result action', { hitTest: true });
      }
    }
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
    const sessionControls = document.querySelector('.lab-topbar').getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      sessionControlsVisible: sessionControls.top >= 0 && sessionControls.bottom <= innerHeight,
      headingVisible: heading.top >= 0 && heading.bottom <= innerHeight,
      stimulusVisible: stimulus.top >= 0 && stimulus.bottom <= innerHeight,
      headingFocused: document.activeElement?.classList.contains('trial-heading'),
    };
  });
  expect(thresholdTransition).toEqual({
    scrollY: 0,
    sessionControlsVisible: true,
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
    const sessionControls = document.querySelector('.lab-topbar').getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      sessionControlsVisible: sessionControls.top >= 0 && sessionControls.bottom <= innerHeight,
      headingVisible: heading.top >= 0 && heading.bottom <= innerHeight,
      stimulusVisible: stimulus.top >= 0 && stimulus.bottom <= innerHeight,
      headingFocused: document.activeElement?.classList.contains('trial-heading'),
    };
  });
  expect(fieldTransition).toEqual({
    scrollY: 0,
    sessionControlsVisible: true,
    headingVisible: true,
    stimulusVisible: true,
    headingFocused: true,
  });

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

test('Field invalidates the run instead of regenerating a measured stimulus after resize', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser canvas lifecycle regression');
  await page.setViewportSize({ width: 844, height: 500 });
  await reachField(page);

  const canvasState = () =>
    page.locator('canvas[data-field="0"]').evaluate((canvas) => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      return {
        width: canvas.width,
        height: canvas.height,
        expectedWidth: Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2)),
        expectedHeight: Math.round(canvas.clientHeight * Math.min(devicePixelRatio || 1, 2)),
        hash: hash >>> 0,
      };
    });

  await expect
    .poll(async () => {
      const current = await canvasState();
      return current.width === current.expectedWidth && current.height === current.expectedHeight;
    })
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /Set the room before the observations/i })).toBeVisible();
  await expect(page.locator('canvas[data-field="0"]')).toHaveCount(0);
  const invalidation = page.locator('[data-tetracromia-invalidation]');
  await expect(invalidation).toContainText(/display size changed/i);
  await expect(invalidation).toBeFocused();
  await expect(page.locator('#announcer')).toContainText(/display size changed/i);
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

test('German landing and results reflow readably across narrow viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser narrow containment matrix');
  await page.goto('/de/tetracromia/');
  await expect(
    page.getByRole('heading', { name: /Farbe auf drei verschiedene Arten wahrnehmen/i }),
  ).toBeVisible();
  const viewports = [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const landing = await page.evaluate(() => {
      const heading = document.querySelector('.tetracromia-hero h1');
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
  await expect(page.getByRole('button', { name: 'Farbkachel 1', exact: true })).toBeEnabled();
  await expect(page.locator('.trial-heading')).toContainText('Kachelauswahl');
  await answerTrials(page, '[data-choice="0"]', 14);
  await expect(page.getByRole('button', { name: 'Gepunktetes Feld 1', exact: true })).toBeEnabled();
  await expect(page.locator('.trial-heading')).toContainText('Feld');
  await answerTrials(page, '[data-choice="0"]', 12);
  await expect(page.getByRole('group', { name: 'Spur zur Farbtonsortierung' })).toBeVisible();
  await expect(page.locator('.trial-heading')).toContainText('Farbtonreihenfolge');
  await page.locator('[data-action="submit-sequence"]').click();
  await page.locator('[data-action="submit-sequence"]').click();
  await page.locator('[data-action="submit-sequence"]').click();
  await expect(page.locator('.results-view')).toBeVisible();
  await expect(page.locator('.results-head')).toContainText('Sitzung abgeschlossen');
  await expect(page.locator('.result-details')).toContainText('Kachelauswahl');
  await expect(page.locator('.result-details')).toContainText('Farbtonreihenfolge');
  await expect(page.locator('.result-note__learn a')).toHaveAttribute('href', '/de/tetrachromacy-guide/');
  await page
    .locator('.result-metric__head > strong')
    .nth(1)
    .evaluate((value) => {
      value.textContent = '12 von 12 Farbentscheidungen richtig eingeordnet';
    });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expectReadableMobileResults(page, `${viewport.width}x${viewport.height} German results`);
  }
});

test('Tetracromia remains operable at 320px with 200% text sizing', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
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

  await answerTrials(page, '[data-choice="0"]', 14);
  await expectNoHorizontalOverflow(page, '200% text Tetracromia Field');
  await answerTrials(page, '[data-choice="0"]', 12);
  await expectNoHorizontalOverflow(page, '200% text Tetracromia Sequence');
  const sequenceGeometry = await page.locator('.sequence-chamber').evaluate((chamber) => {
    const run = chamber.querySelector('.sequence-run');
    const tiles = [...chamber.querySelectorAll('.sequence-tile')];
    const controls = chamber.querySelector('.sequence-controls');
    const actions = [...controls.querySelectorAll('button')];
    return {
      controlsContainActions: actions.every((action) => controls.contains(action)),
      minimumHeight: Math.min(...tiles.map((tile) => tile.getBoundingClientRect().height)),
      minimumWidth: Math.min(...tiles.map((tile) => tile.getBoundingClientRect().width)),
      overflowX: getComputedStyle(run).overflowX,
      scrollsInline: run.scrollWidth > run.clientWidth,
    };
  });
  expect(sequenceGeometry.minimumWidth).toBe(24);
  expect(sequenceGeometry.minimumHeight).toBeGreaterThanOrEqual(24);
  expect(sequenceGeometry.overflowX).toBe('auto');
  expect(sequenceGeometry.scrollsInline).toBe(true);
  expect(sequenceGeometry.controlsContainActions).toBe(true);
  const submit = page.locator('[data-action="submit-sequence"]');
  await submit.click();
  await submit.click();
  await submit.click();

  await expect(page.locator('.results-view')).toBeVisible();
  await expectReadableMobileResults(page, '320px Tetracromia results at 200% text');
  for (const action of await page.locator('.results-actions .ui-button').all()) {
    await centerBelowStickyChrome(action);
    await expectInVisualViewport(action, '200% text result action', { hitTest: true });
  }
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
