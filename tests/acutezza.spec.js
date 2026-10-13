import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  answerAcutezzaTarget,
  captureMetrics,
  completeAcutezzaCalibration,
  completeAcutezzaEye,
  expectJournalEntry,
  installQuickAcutezza,
} from './helpers/browser.js';

async function setDocumentHidden(page, hidden) {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

async function installControlledAcutezza(page) {
  await page.addInitScript(() => {
    window.__SENSORIA_TEST_CONFIG__ = {
      acutezza: {
        feedbackMs: 2,
        practiceTrials: 1,
        high: { trials: 1, controlAt: [0] },
        low: { trials: 1, controlAt: [0], contrast: 0.1 },
      },
    };
  });
}

async function completeCalibrationFromCard(page) {
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
}

test('Acutezza offers safe preparation before scrolling on phones @pr-smoke', async ({ page }, testInfo) => {
  test.skip(
    !['chromium', 'mobile'].includes(testInfo.project.name),
    'First-screen landing geometry is checked in Chromium and emulated mobile',
  );
  for (const viewport of [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/acutezza/');
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'acutezza');
    await page.evaluate(async () => document.fonts.ready);
    const prepare = page.locator('.ac-hero__actions [data-action="ac-prepare"]');
    await expect(prepare).toBeVisible();
    const bounds = await prepare.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.y, `prepare top at ${viewport.width}px`).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height, `prepare bottom at ${viewport.width}px`).toBeLessThan(
      viewport.height - 8,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      `horizontal overflow at ${viewport.width}px`,
    ).toBe(true);
  }
  await page.locator('.ac-hero__actions [data-action="ac-prepare"]').click();
  await expect(page.locator('[data-ac-consent]')).not.toBeChecked();
  await expect(page.locator('[data-action="ac-card"]')).toBeDisabled();
});

const ACUTEZZA_MOBILE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
];

async function expectAcutezzaPageToReflow(page, label) {
  const geometry = await page.evaluate(() => {
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportRight = viewportLeft + (viewport?.width ?? document.documentElement.clientWidth);
    const visibleText = [
      ...document.querySelectorAll(
        '.ac-setup h1, .ac-scope-option, .ac-calibration h1, .ac-calibration button, .ac-calibration-summary h1, .ac-calibration-summary dd, .ac-eye-brief h1, .ac-eye-brief li, .ac-transition h1, .ac-transition button, .ac-between h1, .ac-between aside, .ac-between button, .ac-distance-result h1, .ac-distance-result button, .ac-results h1, .ac-results h2, .ac-metric > strong, .ac-metric > small, .ac-context-grid dt, .ac-context-grid dd, .ac-results button',
      ),
    ].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    return {
      clientWidth: document.documentElement.clientWidth,
      narrowText: visibleText
        .filter((element) => {
          const text = element.textContent.trim();
          const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
          return text.length >= 8 && element.getBoundingClientRect().width < fontSize * 2.5;
        })
        .map((element) => ({
          className: element.className,
          text: element.textContent.trim(),
          width: Math.round(element.getBoundingClientRect().width),
        })),
      offenders: [...document.querySelectorAll('body *')]
        .filter((element) => {
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.position === 'fixed') return false;
          const rect = element.getBoundingClientRect();
          return rect.left < viewportLeft - 1 || rect.right > viewportRight + 1;
        })
        .slice(0, 8)
        .map((element) => ({
          className: element.className,
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
          tagName: element.tagName,
        })),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry, label).toEqual({
    clientWidth: geometry.clientWidth,
    narrowText: [],
    offenders: [],
    scrollWidth: geometry.clientWidth,
  });
}

async function expectAcutezzaActionsToBeReachable(page, label) {
  const identities = await page.locator('main button:visible').evaluateAll((actions) =>
    actions.map((element) => ({
      action: element.getAttribute('data-action'),
      text: element.textContent.replace(/\s+/g, ' ').trim(),
    })),
  );
  for (const [index, identity] of identities.entries()) {
    let action = identity.action
      ? page.locator(`main button[data-action=${JSON.stringify(identity.action)}]:visible`)
      : page.locator('main button:visible').filter({ hasText: identity.text });
    if (identity.text) action = action.filter({ hasText: identity.text });
    action = action.first();
    await expect(action, `${label} action ${index} remains rendered`).toBeVisible();
    // Playwright re-resolves this locator after scrolling, so a responsive card
    // re-render cannot leave the geometry audit holding a detached button.
    await action.scrollIntoViewIfNeeded();
    await expect(action, `${label} action ${index} remains rendered after scroll`).toBeVisible();
    // Let Playwright find an unobscured pointer position. A center-point-only
    // probe can falsely reject a usable control when the sticky site header
    // overlaps the center after the browser's minimal scroll adjustment.
    await action.hover();
    const geometry = await action.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        viewportBottom,
        viewportLeft,
        viewportRight,
        viewportTop,
        width: rect.width,
      };
    });
    expect(geometry.left, `${label} action ${index} left`).toBeGreaterThanOrEqual(geometry.viewportLeft - 1);
    expect(geometry.right, `${label} action ${index} right`).toBeLessThanOrEqual(geometry.viewportRight + 1);
    expect(geometry.top, `${label} action ${index} top`).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
    expect(geometry.bottom, `${label} action ${index} bottom`).toBeLessThanOrEqual(
      geometry.viewportBottom + 1,
    );
    expect(geometry.width, `${label} action ${index} width`).toBeGreaterThanOrEqual(44);
    expect(geometry.height, `${label} action ${index} height`).toBeGreaterThanOrEqual(44);
  }
}

async function expectAcutezzaAtTwoHundredPercent(page, label) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectAcutezzaPageToReflow(page, `${label} at 200% text`);
  await expectAcutezzaActionsToBeReachable(page, `${label} at 200% text`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
    document.querySelector('.ac-stimulus')?.scrollTo(0, 0);
  });
}

async function expectDisplayedAcuityToMatchJournal(page) {
  const result = await page.evaluate(() => {
    const number = (value) => Number.parseFloat(value.replace(',', '.'));
    const displayed = [...document.querySelectorAll('.ac-metric')].map((card) => {
      const valueText = card.querySelector(':scope > strong').textContent.trim();
      const intervalText = card.querySelector(':scope > small').textContent.trim();
      const value = valueText.match(/\d+(?:[.,]\d+)?/);
      const interval = intervalText.match(
        /^(\d+(?:[.,]\d+)?) arcmin–(\d+(?:[.,]\d+)?) arcmin 90% model interval/,
      );
      return {
        bound: valueText.startsWith('≤') ? 'upper' : valueText.startsWith('≥') ? 'lower' : null,
        lower: interval ? number(interval[1]) : null,
        upper: interval ? number(interval[2]) : null,
        value: value ? number(value[0]) : null,
      };
    });
    const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
    const entry = journal.entries.find((candidate) => candidate.examId === 'acutezza');
    return {
      displayed,
      stored: entry.measurements
        .filter((measurement) => measurement.unit === 'arcmin')
        .map(({ bound = null, lower, upper, value }) => ({ bound, lower, upper, value })),
    };
  });

  expect(result.displayed).toHaveLength(result.stored.length);
  for (let index = 0; index < result.stored.length; index += 1) {
    const displayed = result.displayed[index];
    const stored = result.stored[index];
    expect(displayed.bound, `metric ${index} bound`).toBe(stored.bound);
    expect(displayed.value, `metric ${index} value`).toBeCloseTo(stored.value, 1);
    expect(displayed.lower, `metric ${index} interval lower`).toBeCloseTo(stored.lower, 1);
    expect(displayed.upper, `metric ${index} interval upper`).toBeCloseTo(stored.upper, 1);
    expect(stored.lower, `metric ${index} stored lower`).toBeLessThanOrEqual(stored.value);
    expect(stored.value, `metric ${index} stored value`).toBeLessThanOrEqual(stored.upper);
  }
}

test('Acutezza calibrates the display and reports separate non-clinical observations', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await installQuickAcutezza(page);
  const metrics = await captureMetrics(page);
  await page.goto('/en/acutezza/');
  await expect(page).toHaveURL(/\/en\/acutezza\/$/);
  await expect(page.getByRole('heading', { name: /Calibrate the screen/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Acutezza/i })).toBeVisible();
  await expect(page.locator('.ac-calibration-strip i')).toHaveCount(41);
  await expect(page.locator('.ac-instrument-visual')).toHaveCount(2);
  await expect(page.locator('.ac-safety.method')).toBeVisible();
  await expect(page.locator('.ac-safety-ruler i')).toHaveCount(18);
  await expect(page.locator('.ac-research .source-list li')).toHaveCount(7);
  await expect(page.locator('.ac-closing').getByRole('button', { name: /Open test/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Toggle light and dark theme/i }).click();

  await completeAcutezzaCalibration(page);
  await expect(page.getByRole('heading', { name: /physical scale/i })).toBeVisible();
  await expect(page.getByText(/Assumed distance/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await completeAcutezzaEye(page, { missPractice: true });

  await expect(page.getByRole('heading', { name: /Rest before switching/i })).toBeVisible();
  await page.getByRole('button', { name: /Check distance, then test Left eye/i }).click();
  await expect(page.getByRole('heading', { name: /Return to 50 cm/i })).toBeVisible();
  await page.getByRole('button', { name: /Setup unchanged/i }).click();
  await completeAcutezzaEye(page);
  await expect(page.getByRole('heading', { name: /Separate observations/i })).toBeVisible();
  await expect(page.locator('.ac-metric')).toHaveCount(4);
  await expect(page.locator('.ac-results__stamp dt')).toHaveText(['Right eye', 'Left eye']);
  await expect(page.locator('.ac-results__stamp')).toContainText(
    'Model-based estimates · uncertainty intervals below',
  );
  // The immediate summary must reproduce the existing per-eye estimates,
  // including ≤/≥ device bounds, not calculate a new vision score.
  for (let index = 0; index < 2; index += 1) {
    await expect(page.locator('.ac-results__stamp dd').nth(index)).toHaveText(
      await page.locator('.ac-eye-result').nth(index).locator('.ac-metric > strong').first().innerText(),
    );
  }
  await expect(page.getByText(/10% nominal/i)).toBeVisible();
  await expect(page.getByText(/90% model interval/i).first()).toBeVisible();
  await expect(page.getByText(/not an eye examination/i)).toBeVisible();
  await expect(page.getByText(/Do not infer normal vision, 20\/20/i)).toBeVisible();
  await expect(page.getByText(/astigmatism axis/i)).toBeVisible();
  await expectJournalEntry(page, 'acutezza');
  const journalSetup = await page.evaluate(() => {
    const journal = JSON.parse(localStorage.getItem('sense6:journal'));
    const entry = journal.entries.find((candidate) => candidate.examId === 'acutezza');
    return { quality: entry.quality, setup: entry.setup, measurements: entry.measurements };
  });
  expect(journalSetup.setup).toMatchObject({
    completedEyes: 'left,right',
    completionVariant: 'both-eyes',
    contrastPercent: 10,
    controlsCorrect: 0,
    controlsPresented: 0,
    theme: 'light',
  });
  expect(journalSetup.measurements.filter((measurement) => measurement.unit === 'arcmin')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ lower: expect.any(Number), upper: expect.any(Number) }),
    ]),
  );
  await page.getByRole('button', { name: /Copy result summary/i }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Quality:');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('contrast 10% nominal');
  expect(copied).toContain('interval');
  expect(copied).toContain('controls');
  expect(copied).toContain('not vision screening');
  await expect
    .poll(() => metrics)
    .toEqual([
      { event: 'site_loaded', test: 'site' },
      { event: 'test_viewed', test: 'acutezza' },
      { event: 'test_started', test: 'acutezza' },
      { event: 'test_completed', test: 'acutezza' },
    ]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Acutezza focused scope omits the nominal-contrast condition @pr-smoke', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page, { scope: 'focused' });
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await completeAcutezzaEye(page, { includeContrast: false });
  await page.getByRole('button', { name: /Check distance, then test Left eye/i }).click();
  await page.getByRole('button', { name: /Setup unchanged/i }).click();
  await completeAcutezzaEye(page, { includeContrast: false });

  await expect(page.getByRole('heading', { name: /Separate observations/i })).toBeVisible();
  await expect(page.locator('.ac-metric')).toHaveCount(2);
  await expect(page.locator('.ac-results__stamp dt')).toHaveText(['Right eye', 'Left eye']);
  for (let index = 0; index < 2; index += 1) {
    await expect(page.locator('.ac-results__stamp dd').nth(index)).toHaveText(
      await page.locator('.ac-eye-result').nth(index).locator('.ac-metric > strong').first().innerText(),
    );
  }
  await expect(page.getByText('Nominal low-contrast angular gap estimate', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Focused Sharpness', { exact: true })).toBeVisible();
  await expectJournalEntry(page, 'acutezza');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
        return journal.entries.find((entry) => entry.examId === 'acutezza').protocol.profileId;
      }),
    )
    .toBe('focused');
  await expect(page.locator('.ac-results__learn a')).toHaveAttribute('href', '/en/visual-acuity-guide/');
  await page.locator('.ac-results__learn a').click();
  await expect(page).toHaveURL(/\/en\/visual-acuity-guide\/$/);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Can an online visual-acuity test replace an eye exam?',
    }),
  ).toBeVisible();
});

test('Acutezza migrates its legacy latest result into the strict versioned shape', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Storage migration is viewport-independent');
  await page.addInitScript(() => {
    localStorage.setItem(
      'sense6:acutezza:last',
      JSON.stringify({
        setupQuality: 'Interpret with caution',
        eyes: 1,
        recordedAt: 1_753_084_800_000,
      }),
    );
  });
  await page.goto('/en/acutezza/');

  await expect(page.locator('.previous-score')).toContainText('Interpret with caution');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sense6:acutezza:last')));
  expect(stored).toMatchObject({
    format: 'sense6-result',
    schemaVersion: 2,
    payload: {
      setupQuality: 'Interpret with caution',
      recordedAt: 1_753_084_800_000,
      completion: { variant: 'legacy-count', eyes: [], count: 1 },
    },
  });
});

test('Acutezza surfaces journal persistence failure while keeping the result usable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Persistence behavior is viewport-independent');
  await installQuickAcutezza(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'sense6:journal',
      JSON.stringify({ format: 'sense6-journal', schemaVersion: 999, entries: [] }),
    );
  });
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page, { scope: 'focused' });
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await completeAcutezzaEye(page, { includeContrast: false });
  await page.getByRole('button', { name: /Finish with one eye/i }).click();

  const status = page.locator('[data-ac-journal-status]');
  await expect(status).toHaveAttribute('role', 'alert');
  await expect(status).toContainText('The result is ready, but this browser did not allow local storage.');
  await expect(page.getByRole('button', { name: /Open private journal/i })).toHaveCount(0);
  const latest = await page.evaluate(() => JSON.parse(localStorage.getItem('sense6:acutezza:last')));
  expect(latest).toMatchObject({
    schemaVersion: 2,
    payload: { completion: { variant: 'single-eye', eyes: ['right'] } },
  });
});

test('Acutezza ignores queued calibration and sweep frames after route disposal', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Lifecycle behavior is viewport-independent');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.evaluate(() => {
    window.__acutezzaRafCallbacks = [];
    window.__acutezzaOriginalRaf = window.requestAnimationFrame;
    window.__acutezzaOriginalCancelRaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      window.__acutezzaRafCallbacks.push(callback);
      return window.__acutezzaRafCallbacks.length;
    };
    window.cancelAnimationFrame = () => {};
  });

  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Start sweep/i }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.brand').click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator('[data-sense6-view="gallery"]')).toBeVisible();

  await page.evaluate(() => {
    const callbacks = window.__acutezzaRafCallbacks.splice(0);
    window.requestAnimationFrame = window.__acutezzaOriginalRaf;
    window.cancelAnimationFrame = window.__acutezzaOriginalCancelRaf;
    for (const callback of callbacks) callback(performance.now());
  });
  await expect(page.locator('[data-sense6-view="gallery"]')).toBeVisible();
});

test('Acutezza invalidates a measured run when display geometry changes', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page);
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  const interruptedTrial = await page.locator('[data-ac-optotype]').getAttribute('data-trial-id');
  await setDocumentHidden(page, true);
  await expect(
    page.getByRole('heading', { name: /unanswered target will be presented again/i }),
  ).toBeVisible();
  await setDocumentHidden(page, false);
  await page.getByRole('button', { name: /Resume this instrument/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  await expect(page.locator('[data-ac-optotype]')).not.toHaveAttribute('data-trial-id', interruptedTrial);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.getByRole('heading', { name: /measured geometry changed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Recalibrate/i })).toBeVisible();
});

test('Acutezza advances exactly once when visibility changes during committed feedback', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page);
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await answerAcutezzaTarget(page);
  await page.getByRole('button', { name: /Begin Nitidezza/i }).click();
  const firstTrial = await page.locator('[data-ac-optotype]').getAttribute('data-trial-id');
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-ac-optotype]');
    document.querySelector(`[data-ac-direction="${canvas.dataset.orientation}"]`).click();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading', { name: /response was recorded/i })).toBeVisible();
  await setDocumentHidden(page, false);
  await page.getByRole('button', { name: /Resume this instrument/i }).click();
  await expect(page.locator('[data-ac-count]')).toHaveText('2 / 2');
  await expect(page.locator('[data-ac-optotype]')).not.toHaveAttribute('data-trial-id', firstTrial);
  await answerAcutezzaTarget(page);
  await expect(page.getByRole('heading', { name: /calibrated estimate was recorded/i })).toBeVisible();
  await expect(page.getByText(/Instrument 01 complete/i)).toBeVisible();
  await expect(page.getByText(/2 measured targets/i)).toBeVisible();
});

test('Acutezza guards summary entry, theme, and shell navigation after calibration', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/');
  await page.locator('.exam-card__link[href="/en/acutezza/"]').click();
  await completeAcutezzaCalibration(page);
  await expect(page.getByRole('button', { name: /Toggle light and dark theme/i })).toBeDisabled();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: /Sense6 — all tests/i }).click();
  await expect(page).toHaveURL(/\/en\/acutezza\/$/);
  await expect(page.getByRole('heading', { name: /physical scale/i })).toBeVisible();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/\/en\/acutezza\/$/);
  await expect(page.getByRole('heading', { name: /physical scale/i })).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: window.devicePixelRatio + 0.5,
    });
  });
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await expect(page.getByRole('heading', { name: /measured geometry changed/i })).toBeVisible();

  await page.reload();
  await completeAcutezzaCalibration(page);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await expect(page.getByText(/light or dark surround changed/i)).toBeVisible();
});

test('Acutezza guards calibration from the card checkpoint onward', async ({ page }) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('.brand').click();
  await expect(page).toHaveURL(/\/en\/acutezza\/$/);
  await page.setViewportSize({ width: 900, height: 700 });
  const blocked = page.locator('[data-ac-calibration-invalid]');
  await expect(blocked).toBeFocused();
  await expect(page.getByRole('heading', { name: /measured geometry changed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Recalibrate/i })).toBeVisible();
});

test('Acutezza blocks forced colors before contrast measurement and offers a focused retry', async ({
  page,
}) => {
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.emulateMedia({ forcedColors: 'active' });

  const blocked = page.locator('[data-ac-forced-colors]');
  await expect(blocked).toBeFocused();
  await expect(page.getByRole('heading', { name: /forced-colors mode is active/i })).toBeVisible();
  await expect(page.locator('.ac-contrast__sample')).toHaveCount(0);
  await page.getByRole('button', { name: /Retry display check/i }).click();
  await expect(blocked).toBeFocused();

  await page.emulateMedia({ forcedColors: 'none' });
  await page.getByRole('button', { name: /Retry display check/i }).click();
  await expect(page.getByRole('heading', { name: /natural blind spot/i })).toBeVisible();
});

test('German Acutezza calibration and runner keep generated labels localized', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await installQuickAcutezza(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/de/acutezza/');
  await page.locator('[data-action="ac-prepare"]').click();
  await expect(page.locator('.experiment-boundary')).toContainText(/Freizeitexperiment/);
  await expectAcutezzaPageToReflow(page, 'German setup at 320x568');
  await expectAcutezzaAtTwoHundredPercent(page, 'German setup at 320x568');
  await page.locator('[data-ac-consent]').check();
  await page.locator('[data-action="ac-card"]').click();
  await expect(page.getByRole('heading', { name: /echte Karte/i })).toBeVisible();
  await expectAcutezzaAtTwoHundredPercent(page, 'German card calibration at 320x568');
  await page.locator('[data-action="ac-confirm-card"]').click();
  await page.locator('[data-action="ac-manual-distance"]').click();
  await page.locator('[data-ac-manual-distance]').fill('50');
  await page.locator('[data-action="ac-confirm-manual-distance"]').click();
  await page.locator('[data-action="ac-contrast-visible"]').click();
  await expect(page.getByRole('button', { name: /Rechtes Auge vorbereiten/i })).toBeVisible();
  await expect(page.locator('[data-locale-select]')).toBeDisabled();
  await page.locator('[data-action="ac-first-eye"]').click();
  await expectAcutezzaAtTwoHundredPercent(page, 'German first-eye card at 320x568');
  await page.locator('[data-action="ac-begin-eye"]').click();
  await expect(page.getByRole('heading', { name: 'Rechtes Auge — Übung' })).toBeFocused();
  await expectAcutezzaAtTwoHundredPercent(page, 'German runner at 320x568');
});

test('Acutezza accepts repeatable blind-spot sweeps as measured calibration', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The mobile project covers the ruler fallback');
  test.setTimeout(60_000);
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();

  for (let sweep = 0; sweep < 3; sweep += 1) {
    await page.getByRole('button', { name: /Start sweep/i }).click();
    await expect(page.getByRole('button', { name: /Dot disappeared/i })).toBeEnabled();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const field = document.querySelector('[data-ac-sweep-field]');
          const dot = document.querySelector('[data-ac-sweep-dot]');
          if (!dot.style.insetInlineStart) return 1;
          const fieldRect = field.getBoundingClientRect();
          const dotRect = dot.getBoundingClientRect();
          return (dotRect.left + dotRect.width / 2 - fieldRect.left) / fieldRect.width;
        }),
      )
      .toBeLessThanOrEqual(0.75);
    await page.getByRole('button', { name: /Dot disappeared/i }).click();
  }

  await expect(page.getByRole('heading', { name: /cm from the screen/i })).toBeVisible();
  await page.getByRole('button', { name: /Use this distance/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
  await expect(page.getByText('Measured setup', { exact: true })).toBeVisible();
  await expect(page.getByText(/blind-spot sweeps agreed/i)).toBeVisible();
});

test('Acutezza retries stronger contrast before marking Contrasto unavailable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop covers the contrast fallback state');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();

  await expect(page.getByText(/nominal 10% condition/i)).toBeVisible();
  await page.getByRole('button', { name: /Not clearly/i }).click();
  await expect(page.getByText(/nominal 20% condition/i)).toBeVisible();
  await page.getByRole('button', { name: /Not clearly/i }).click();
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Prepare Right eye/i })).toBeVisible();
});

test('Acutezza carries the 20% fallback and unusable controls through results and journal', async ({
  context,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop covers the full provenance transport');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await installControlledAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  await page.getByRole('button', { name: /Not clearly/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
  await expect(page.getByText(/20% nominal/i)).toBeVisible();
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await answerAcutezzaTarget(page);
  await page.getByRole('button', { name: /Begin Nitidezza/i }).click();
  await answerAcutezzaTarget(page, false);
  await answerAcutezzaTarget(page);
  await page.getByRole('button', { name: /Continue to Contrasto/i }).click();
  await answerAcutezzaTarget(page, false);
  await answerAcutezzaTarget(page);
  await page.getByRole('button', { name: /Finish with one eye/i }).click();

  await expect(page.locator('.ac-results__stamp')).toContainText('Run unusable');
  await expect(page.locator('.ac-results__stamp dt')).toHaveText(['Right eye']);
  await expect(page.locator('.ac-results__stamp dd')).toHaveText(
    await page.locator('.ac-eye-result .ac-metric > strong').first().innerText(),
  );
  await expect(page.getByText(/20% nominal/i)).toBeVisible();
  const journal = await page.evaluate(() => {
    const entries = JSON.parse(localStorage.getItem('sense6:journal')).entries;
    return entries.find((entry) => entry.examId === 'acutezza');
  });
  expect(journal.quality).toBe('limited');
  expect(journal.setup).toMatchObject({
    completedEyes: 'right',
    completionVariant: 'single-eye',
    contrastPercent: 20,
    controlsCorrect: 0,
    controlsPresented: 2,
    setupQuality: 'Run unusable',
  });
  await page.getByRole('button', { name: /Copy result summary/i }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Quality: Run unusable');
  expect(copied).toContain('contrast 20% nominal');
  expect(copied).toContain('controls 0 / 2');
  expect(copied).toContain('Interpret with caution');
});

test('Acutezza keeps calibration and runner geometry ordered at required short viewports', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === 'mobile', 'Explicit viewport matrix runs in desktop Chromium');
  await installQuickAcutezza(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/acutezza/');
    await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
    await page.getByLabel(/I am 18 or older/i).check();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole('button', { name: /Calibrate the screen/i }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(2);
    await expect(page.getByRole('heading', { name: /Match a real card/i })).toBeFocused();
    const card = await page.locator('[data-ac-card-shape]').boundingBox();
    expect(card.y, `${viewport.width}x${viewport.height} card top`).toBeGreaterThanOrEqual(0);
    expect(card.y + card.height, `${viewport.width}x${viewport.height} card bottom`).toBeLessThanOrEqual(
      viewport.height,
    );
    await completeCalibrationFromCard(page);
    await page.getByRole('button', { name: /Prepare Right eye/i }).click();
    await page.getByRole('button', { name: /Start practice/i }).click();
    await expect(page.locator('[data-ac-runner-heading]')).toBeFocused();
    const geometry = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const header = rect('.ac-runner__header');
      const status = rect('[data-ac-status]');
      const canvas = rect('[data-ac-optotype]');
      const controls = rect('.ac-direction-pad');
      const footer = rect('.ac-runner__footer');
      const stop = rect('[data-action="ac-stop"]');
      const stimulus = document.querySelector('.ac-stimulus');
      return {
        backingSquare:
          document.querySelector('[data-ac-optotype]').width ===
          document.querySelector('[data-ac-optotype]').height,
        canvas,
        controls,
        footer,
        header,
        status,
        stop,
        stimulusClientHeight: stimulus.clientHeight,
        stimulusScrollHeight: stimulus.scrollHeight,
      };
    });
    expect(Math.abs(geometry.canvas.width - geometry.canvas.height)).toBeLessThan(0.5);
    expect(geometry.backingSquare).toBe(true);
    expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.status.top + 1);
    expect(geometry.status.bottom).toBeLessThanOrEqual(
      Math.min(geometry.canvas.top, geometry.controls.top) + 1,
    );
    expect(Math.max(geometry.canvas.bottom, geometry.controls.bottom)).toBeLessThanOrEqual(
      geometry.footer.top + 1,
    );
    expect(geometry.footer.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.stop.height).toBeGreaterThanOrEqual(44);
    expect(
      geometry.stimulusScrollHeight <= geometry.stimulusClientHeight + 1,
      `${viewport.width}x${viewport.height} stimulus ${geometry.stimulusScrollHeight}/${geometry.stimulusClientHeight}`,
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    if (viewport.width === 320) {
      const stimulusPixels = await page.locator('[data-ac-optotype]').evaluate((canvas) => ({
        height: canvas.getBoundingClientRect().height,
        width: canvas.getBoundingClientRect().width,
      }));
      for (const fontSize of ['200%', '400%']) {
        await page.evaluate((value) => {
          document.documentElement.style.fontSize = value;
        }, fontSize);
        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          offenders: [...document.querySelectorAll('body *')]
            .filter(
              (element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
            )
            .slice(0, 8)
            .map((element) => ({
              className: element.className,
              right: element.getBoundingClientRect().right,
              tagName: element.tagName,
            })),
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(overflow, fontSize).toEqual({ clientWidth: 320, offenders: [], scrollWidth: 320 });
        const reflow = await page.locator('[data-ac-optotype]').evaluate((canvas) => ({
          height: canvas.getBoundingClientRect().height,
          width: canvas.getBoundingClientRect().width,
          controlsInside: [...document.querySelectorAll('[data-ac-direction]')].every((button) => {
            const rect = button.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
          }),
        }));
        expect(reflow, fontSize).toMatchObject({ ...stimulusPixels, controlsInside: true });
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });
    }
    await page.getByRole('button', { name: /Stop safely/i }).click();
    await expect(page.getByRole('heading', { name: /Calibrate the screen/i })).toBeVisible();
  }
});

test('the mobile Acutezza setup and target controls remain inside the viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickAcutezza(page);
  await page.goto('/en/acutezza/');
  await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await page.getByRole('button', { name: /The card cannot fit/i }).click();
  await expect(page.getByRole('heading', { name: /screen cannot show the calibration card/i })).toBeVisible();
  await page.getByRole('button', { name: /Try card calibration again/i }).click();
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  await page.getByRole('button', { name: /Yes, clearly/i }).click();
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-ac-optotype]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Acutezza completes both scopes through every audited mobile viewport without broken reflow', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  test.skip(testInfo.project.name !== 'chromium', 'Uses an explicit responsive viewport matrix');
  await installQuickAcutezza(page);

  for (const viewport of ACUTEZZA_MOBILE_VIEWPORTS) {
    for (const scope of ['focused', 'standard']) {
      const label = `${scope} ${viewport.width}x${viewport.height}`;
      await page.setViewportSize(viewport);
      await page.goto('/en/acutezza/');
      await page.getByRole('button', { name: /Prepare the vision lab/i }).click();
      await selectAcutezzaScope(page, scope);
      await expect(page.locator(`[data-action="ac-scope"][data-scope="${scope}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await calibrateAcutezzaViewport(page, scope, viewport, label);
      await completeResponsiveAcutezzaEye(page, scope, viewport, label, 'first');
      await switchResponsiveAcutezzaEye(page, viewport, label);
      await completeResponsiveAcutezzaEye(page, scope, viewport, label, 'second');

      await expect(page.getByRole('heading', { name: /Separate observations/i })).toBeVisible();
      await expect(page.locator('.ac-eye-result')).toHaveCount(2);
      await expect(page.locator('.ac-results__stamp dd')).toHaveCount(2);
      for (let index = 0; index < 2; index += 1) {
        await expect(page.locator('.ac-results__stamp dd').nth(index)).toHaveText(
          await page.locator('.ac-eye-result').nth(index).locator('.ac-metric > strong').first().innerText(),
        );
      }
      const metricCount = scope === 'standard' ? 4 : 2;
      await expect(page.locator('.ac-metric')).toHaveCount(metricCount);
      await expect(page.locator('.ac-metric > strong')).toHaveText(
        Array.from({ length: metricCount }, () => /^(?:[≤≥] )?\d+(?:[.,]\d+)? arcmin$/),
      );
      await expect(page.locator('.ac-metric > small')).toHaveText(
        Array.from(
          { length: metricCount },
          () => /^\d+(?:[.,]\d+)? arcmin–\d+(?:[.,]\d+)? arcmin 90% model interval/,
        ),
      );
      await expectDisplayedAcuityToMatchJournal(page);
      await expectResponsiveAcutezzaStage(page, viewport, `${label} results`, { actions: false });
    }
  }
});

async function selectAcutezzaScope(page, scope) {
  if (scope === 'focused') {
    await page.locator('[data-action="ac-scope"][data-scope="focused"]').click();
  }
}

async function calibrateAcutezzaViewport(page, scope, viewport, label) {
  await expectResponsiveAcutezzaStage(page, viewport, `${label} setup`);
  await page.getByLabel(/I am 18 or older/i).check();
  await page.getByRole('button', { name: /Calibrate the screen/i }).click();
  await expectResponsiveAcutezzaStage(page, viewport, `${label} card calibration`);
  await page.getByRole('button', { name: /The edges match/i }).click();
  await page.getByRole('button', { name: /Use a ruler-measured distance/i }).click();
  await expectResponsiveAcutezzaStage(page, viewport, `${label} distance entry`, { actions: false });
  await page.getByLabel(/Distance in centimetres/i).fill('50');
  await page.getByRole('button', { name: /Use measured distance/i }).click();
  if (scope === 'standard') {
    await expectResponsiveAcutezzaStage(page, viewport, `${label} contrast check`, { actions: false });
    await page.getByRole('button', { name: /Yes, clearly/i }).click();
  }
  await expectResponsiveAcutezzaStage(page, viewport, `${label} calibration summary`);
}

async function completeResponsiveAcutezzaEye(page, scope, viewport, label, eye) {
  if (eye === 'first') {
    await page.getByRole('button', { name: /Prepare Right eye/i }).click();
    await expectResponsiveAcutezzaStage(page, viewport, `${label} first-eye card`);
  } else {
    await expectResponsiveAcutezzaStage(page, viewport, `${label} second-eye card`, { actions: false });
  }
  await page.getByRole('button', { name: /Start practice/i }).click();
  if (eye === 'first') {
    await expectResponsiveAcutezzaStage(page, viewport, `${label} practice runner`, { actions: false });
  }
  await answerAcutezzaTarget(page);
  await expect(page.getByRole('button', { name: /Begin Nitidezza/i })).toBeVisible();
  if (eye === 'first') {
    await expectResponsiveAcutezzaStage(page, viewport, `${label} practice transition`);
  }
  await page.getByRole('button', { name: /Begin Nitidezza/i }).click();
  await answerAcutezzaTarget(page);
  await answerAcutezzaTarget(page);
  if (scope === 'standard') await completeResponsiveContrastCondition(page, viewport, label, eye);
}

async function completeResponsiveContrastCondition(page, viewport, label, eye) {
  await expect(page.getByRole('button', { name: /Continue to Contrasto/i })).toBeVisible();
  if (eye === 'first') {
    await expectResponsiveAcutezzaStage(page, viewport, `${label} condition transition`);
  }
  await page.getByRole('button', { name: /Continue to Contrasto/i }).click();
  await answerAcutezzaTarget(page);
  await answerAcutezzaTarget(page);
}

async function switchResponsiveAcutezzaEye(page, viewport, label) {
  await expect(page.getByRole('heading', { name: /Rest before switching/i })).toBeVisible();
  await expectResponsiveAcutezzaStage(page, viewport, `${label} between-eye card`);
  await page.getByRole('button', { name: /Check distance, then test Left eye/i }).click();
  await expectResponsiveAcutezzaStage(page, viewport, `${label} distance recheck`);
  await page.getByRole('button', { name: /Setup unchanged/i }).click();
}

async function expectResponsiveAcutezzaStage(page, viewport, label, { actions = true } = {}) {
  await expectAcutezzaPageToReflow(page, label);
  if (actions) await expectAcutezzaActionsToBeReachable(page, label);
  if (viewport.width === 320) await expectAcutezzaAtTwoHundredPercent(page, label);
}

test('pending Acutezza copies cannot publish feedback after same-mount restart @pr-smoke', async ({
  page,
}) => {
  await installQuickAcutezza(page);
  await page.addInitScript(() => {
    window.__acutezzaCopies = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve, reject) => {
            window.__acutezzaCopies.push({ resolve, reject });
          }),
      },
    });
  });
  await page.goto('/en/acutezza/');
  await completeAcutezzaCalibration(page, { scope: 'focused' });
  await page.getByRole('button', { name: /Prepare Right eye/i }).click();
  await completeAcutezzaEye(page, { includeContrast: false });
  await page.locator('[data-action="ac-finish-one-eye"]').click();
  await expect(page.locator('.ac-results')).toBeVisible();
  const copy = page.locator('[data-action="ac-copy"]');
  await copy.click();
  await copy.click();
  await expect.poll(() => page.evaluate(() => window.__acutezzaCopies.length)).toBe(2);
  await page.locator('[data-action="ac-restart"]').click();
  await expect(page.locator('.ac-setup')).toBeVisible();
  await page.evaluate(async () => {
    window.__acutezzaCopies[0].resolve();
    window.__acutezzaCopies[1].reject(new Error('settled after restart'));
    await new Promise(requestAnimationFrame);
  });
  await expect(page.locator('.ui-toast-stack')).toHaveCount(0);
});
