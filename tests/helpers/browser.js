import { expect } from '@playwright/test';

/**
 * Assert that an element is usable in the current visual viewport without scrolling.
 * This catches vertical clipping and sticky-header obstruction that scrollWidth-only
 * checks miss. Set hitTest for controls that must be the topmost target at their centre.
 */
export async function expectInVisualViewport(locator, label, { clearOfChrome = true, hitTest = false } = {}) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const geometry = await locator.evaluate(
    (element, options) => {
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (viewport?.width ?? document.documentElement.clientWidth);
      const viewportBottom = viewportTop + (viewport?.height ?? document.documentElement.clientHeight);
      const chrome = document.querySelector('.site-chrome');
      const chromeRect = chrome?.getBoundingClientRect();
      const chromeStyle = chrome ? getComputedStyle(chrome) : null;
      const chromeBottom =
        options.clearOfChrome && chromeRect && chromeStyle?.display !== 'none'
          ? Math.max(viewportTop, chromeRect.bottom)
          : viewportTop;
      const centreX = Math.min(viewportRight - 1, Math.max(viewportLeft, rect.left + rect.width / 2));
      const centreY = Math.min(viewportBottom - 1, Math.max(viewportTop, rect.top + rect.height / 2));
      const hit = options.hitTest ? document.elementFromPoint(centreX, centreY) : element;

      return {
        bottom: rect.bottom,
        chromeBottom,
        height: rect.height,
        hit: !options.hitTest || element.contains(hit),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        viewportBottom,
        viewportLeft,
        viewportRight,
      };
    },
    { clearOfChrome, hitTest },
  );

  expect(geometry.height, `${label} should have a rendered height`).toBeGreaterThan(0);
  expect(geometry.left, `${label} should not be clipped on the left`).toBeGreaterThanOrEqual(
    geometry.viewportLeft - 1,
  );
  expect(geometry.right, `${label} should not be clipped on the right`).toBeLessThanOrEqual(
    geometry.viewportRight + 1,
  );
  expect(geometry.top, `${label} should clear the sticky header`).toBeGreaterThanOrEqual(
    geometry.chromeBottom - 1,
  );
  expect(geometry.bottom, `${label} should fit above the viewport bottom`).toBeLessThanOrEqual(
    geometry.viewportBottom + 1,
  );
  expect(geometry.hit, `${label} should receive a centre-point hit test`).toBe(true);
}

export async function expectNoHorizontalOverflow(page, label = 'page') {
  try {
    await expect
      .poll(
        () =>
          page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        { message: `${label} should not overflow horizontally` },
      )
      .toBe(true);
  } catch (error) {
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            className: element.className,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            tagName: element.tagName,
          };
        })
        .filter(({ left, right }) => left < -1 || right > document.documentElement.clientWidth + 1)
        .slice(0, 8),
      scrollWidth: document.documentElement.scrollWidth,
    }));
    throw new Error(`${error.message}\n${JSON.stringify(geometry)}`, { cause: error });
  }
}

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
      // CI scheduling pauses can exceed 500ms on shared ARC workers.
      // Only the accelerated fixture changes; production timings do not.
      responseTimeoutMs: 2000,
    },
    choice: {
      practiceTrials: 2,
      scoredTrials: 4,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 2000,
    },
    stability: {
      durationMs: 550,
      minWaitMs: 12,
      maxWaitMs: 18,
      responseTimeoutMs: 1500,
    },
  },
};

const QUICK_UDITO = {
  udito: {
    feedbackMs: 2,
    audio: { toneMs: 8, gapMs: 4, rampMs: 1, referenceMs: 18 },
    headphones: { practiceTrials: 1, scoredTrials: 2, passCorrect: 2 },
    range: { targetReversals: 0, minTrials: 2, maxTrials: 2, controlAt: [] },
    pitch: { targetReversals: 0, minTrials: 2, maxTrials: 2 },
  },
};

const QUICK_ACUTEZZA = {
  acutezza: {
    feedbackMs: 2,
    practiceTrials: 1,
    calibration: {
      repetitions: 3,
      sweepMs: 10000,
      minDistanceMm: 1,
      maxDistanceMm: 5000,
      maxSpreadPercent: 100,
    },
    high: { trials: 2, controlAt: [] },
    low: { trials: 2, controlAt: [], contrast: 0.1 },
  },
};

export async function installQuickRiflessi(page) {
  await page.addInitScript((configuration) => {
    window.__SENSE6_TEST_CONFIG__ = configuration;
  }, QUICK_RIFLESSI);
}

export async function installQuickUdito(page) {
  await page.addInitScript((configuration) => {
    window.__SENSE6_TEST_CONFIG__ = configuration;
  }, QUICK_UDITO);
}

export async function installQuickAcutezza(page) {
  await page.addInitScript((configuration) => {
    window.__SENSORIA_TEST_CONFIG__ = configuration;
  }, QUICK_ACUTEZZA);
}

export async function completeAcutezzaCalibration(page, { scope = 'standard' } = {}) {
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  if (scope === 'focused') await page.locator('[data-action="ac-scope"][data-scope="focused"]').click();
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  if (scope === 'standard') await page.getByRole('button', { name: /Yes, clearly/i }).click();
}

export async function answerAcutezzaTarget(page, correct = true) {
  const canvas = page.locator('[data-ac-optotype]');
  await expect(canvas).toBeVisible();
  const orientation = await canvas.getAttribute('data-orientation');
  const response = correct ? orientation : orientation === 'up' ? 'down' : 'up';
  await page.locator(`[data-ac-direction="${response}"]`).click();
}

export async function completeAcutezzaEye(page, { missPractice = false, includeContrast = true } = {}) {
  await page.getByRole('button', { name: /Start practice/i }).click();
  if (missPractice) {
    await answerAcutezzaTarget(page, false);
    await expect(page.getByText(/Try the same target again/i)).toBeVisible();
  }
  await answerAcutezzaTarget(page);
  await page.getByRole('button', { name: /Begin Nitidezza/i }).click();
  await answerAcutezzaTarget(page);
  await answerAcutezzaTarget(page);
  if (!includeContrast) return;
  const contrast = page.getByRole('button', { name: /Continue to Contrasto/i });
  await expect(contrast).toBeVisible();
  await contrast.click();
  await answerAcutezzaTarget(page);
  await answerAcutezzaTarget(page);
}

export async function completeUditoSetup(page) {
  await page.getByRole('button', { name: /Play maximum-level reference|Play reference again/i }).click();
  await expect(page.getByText(/Reference completed on the audio clock/i)).toBeVisible();
  await page.getByRole('button', { name: /Play 200 Hz, 500 Hz, and 2 kHz audibility anchors/i }).click();
  const anchors = page.getByLabel(/I heard all three anchors comfortably/i);
  await expect(anchors).toBeEnabled();
  await anchors.check();
  await page.getByLabel(/The reference is quiet and comfortable/i).check();
}

export async function answerCurrentSoundTrial(page) {
  const runner = page.locator('[data-au-runner]');
  const firstResponse = page.locator('[data-au-response="0"]');
  await expect(firstResponse).toBeEnabled();
  const correct = await runner.getAttribute('data-correct-interval');
  await page.locator(`[data-au-response="${correct}"]`).click();
}

export async function respondWithKey(page, key) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  const response = page.locator('[data-rx-response="signal"]');
  await response.focus();
  await response.press(key);
}

export async function respondToChoice(page) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  const side = await page.locator('[data-rx-arrow]').getAttribute('data-side');
  await page.keyboard.press(side === 'left' ? 'ArrowLeft' : 'ArrowRight');
}

export async function captureMetrics(page) {
  const metrics = [];
  await page.route('**/api/metric', async (route) => {
    metrics.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  return metrics;
}

export async function expectJournalEntry(page, examId) {
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
        return journal?.entries?.find((entry) => entry.examId === id) ?? null;
      }, examId),
    )
    .not.toBeNull();
}
