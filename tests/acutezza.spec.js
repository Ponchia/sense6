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
        meridian: { angles: [0, 60], scales: [1] },
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

test('Acutezza calibrates the display and reports three separate non-clinical observations', async ({
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
  await expect(page.locator('.ac-instrument-visual')).toHaveCount(3);
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
  await expect(page.locator('.ac-metric')).toHaveCount(6);
  await expect(page.locator('.ac-results__stamp')).toContainText('02 / 02');
  await expect(page.getByText(/10% nominal/i)).toBeVisible();
  await expect(page.getByText(/uncertainty interval/i).first()).toBeVisible();
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
      { event: 'test_started', test: 'acutezza' },
      { event: 'test_completed', test: 'acutezza' },
    ]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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

test('German Acutezza calibration and runner keep generated labels localized', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await installQuickAcutezza(page);
  await page.goto('/de/acutezza/');
  await page.locator('[data-action="ac-prepare"]').click();
  await page.locator('[data-ac-consent]').check();
  await page.locator('[data-action="ac-card"]').click();
  await page.locator('[data-action="ac-confirm-card"]').click();
  await page.locator('[data-action="ac-manual-distance"]').click();
  await page.locator('[data-ac-manual-distance]').fill('50');
  await page.locator('[data-action="ac-confirm-manual-distance"]').click();
  await page.locator('[data-action="ac-contrast-visible"]').click();
  await expect(page.getByRole('button', { name: /Rechtes Auge vorbereiten/i })).toBeVisible();
  await expect(page.locator('[data-locale-select]')).toBeDisabled();
  await page.locator('[data-action="ac-first-eye"]').click();
  await page.locator('[data-action="ac-begin-eye"]').click();
  await expect(page.getByRole('heading', { name: 'Rechtes Auge — Übung' })).toBeFocused();
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
  await page.getByRole('button', { name: /Continue to Meridiani/i }).click();
  await page.getByRole('button', { name: /No difference/i }).click();
  await page.getByRole('button', { name: /Finish with one eye/i }).click();

  await expect(page.locator('.ac-results__stamp')).toContainText('Run unusable');
  await expect(page.getByText(/20% nominal/i)).toBeVisible();
  const journal = await page.evaluate(() => {
    const entries = JSON.parse(localStorage.getItem('sense6:journal')).entries;
    return entries.find((entry) => entry.examId === 'acutezza');
  });
  expect(journal.quality).toBe('limited');
  expect(journal.setup).toMatchObject({
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
    if (
      (viewport.width === 320 && viewport.height === 568) ||
      (viewport.width === 844 && viewport.height === 390)
    ) {
      await answerAcutezzaTarget(page);
      await page.getByRole('button', { name: /Begin Nitidezza/i }).click();
      await answerAcutezzaTarget(page);
      await answerAcutezzaTarget(page);
      await page.getByRole('button', { name: /Continue to Contrasto/i }).click();
      await answerAcutezzaTarget(page);
      await answerAcutezzaTarget(page);
      await page.getByRole('button', { name: /Continue to Meridiani/i }).click();
      await expect(page.locator('[data-ac-runner-heading]')).toBeFocused();
      const meridianGeometry = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        const chamber = document.querySelector('.ac-meridian');
        return {
          chamberClientHeight: chamber.clientHeight,
          chamberScrollHeight: chamber.scrollHeight,
          choices: rect('.ac-meridian__choices'),
          feedback: rect('.ac-feedback'),
          fields: rect('.ac-meridian__fields'),
          footer: rect('.ac-runner__footer'),
          header: rect('.ac-runner__header'),
          prompt: rect('.ac-meridian > p'),
          squares: [...document.querySelectorAll('[data-ac-meridian]')].every((canvas) => {
            const bounds = canvas.getBoundingClientRect();
            return Math.abs(bounds.width - bounds.height) < 0.5 && canvas.width === canvas.height;
          }),
          withinInlineViewport: [...document.querySelectorAll('[data-ac-meridian-choice]')].every(
            (button) => {
              const bounds = button.getBoundingClientRect();
              return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
            },
          ),
        };
      });
      expect(meridianGeometry.header.bottom).toBeLessThanOrEqual(meridianGeometry.prompt.top + 1);
      expect(meridianGeometry.prompt.bottom).toBeLessThanOrEqual(
        Math.min(meridianGeometry.fields.top, meridianGeometry.choices.top) + 1,
      );
      expect(
        Math.max(
          meridianGeometry.fields.bottom,
          meridianGeometry.choices.bottom,
          meridianGeometry.feedback.bottom,
        ),
      ).toBeLessThanOrEqual(meridianGeometry.footer.top + 1);
      expect(meridianGeometry.chamberScrollHeight).toBeLessThanOrEqual(
        meridianGeometry.chamberClientHeight + 1,
      );
      expect(meridianGeometry.squares).toBe(true);
      expect(meridianGeometry.withinInlineViewport).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (viewport.width === 320) {
        const meridianPixels = await page
          .locator('[data-ac-meridian]')
          .first()
          .evaluate((canvas) => ({
            height: canvas.getBoundingClientRect().height,
            width: canvas.getBoundingClientRect().width,
          }));
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '400%';
        });
        const meridianReflow = await page
          .locator('[data-ac-meridian]')
          .first()
          .evaluate((canvas) => ({
            controlsInside: [...document.querySelectorAll('[data-ac-meridian-choice]')].every((button) => {
              const rect = button.getBoundingClientRect();
              return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
            }),
            documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            height: canvas.getBoundingClientRect().height,
            width: canvas.getBoundingClientRect().width,
          }));
        expect(meridianReflow).toMatchObject({
          ...meridianPixels,
          controlsInside: true,
          documentFits: true,
        });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '';
        });
      }
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
