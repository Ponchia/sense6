import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  expectInVisualViewport,
  expectJournalEntry,
  expectNoHorizontalOverflow,
  installQuickRiflessi,
  respondToChoice,
  respondWithKey,
} from './helpers/browser.js';

const AUDITED_LAYOUTS = [
  { label: '320x568 signal', viewport: { width: 320, height: 568 }, scope: 'signal' },
  {
    label: '360x800 signal-choice',
    viewport: { width: 360, height: 800 },
    scope: 'signal-choice',
  },
  { label: '390x844 complete', viewport: { width: 390, height: 844 }, scope: 'complete' },
  { label: '412x915 complete', viewport: { width: 412, height: 915 }, scope: 'complete' },
  {
    label: '844x390 complete landscape',
    viewport: { width: 844, height: 390 },
    scope: 'complete',
  },
  {
    label: '320x568 at 200% text',
    viewport: { width: 320, height: 568 },
    scope: 'complete',
    textScale: 2,
  },
];

async function prepareRiflessi(page, mode = 'keyboard', scope = 'complete') {
  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: mode === 'pointer' ? /^Touch \/ pointer/i : /^Keyboard/i }).click();
  await page.locator(`[data-rx-scope-picker] [data-scope="${scope}"]`).click();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
}

test('Riflessi signal scope ends independently without placeholder instruments', async ({ page }) => {
  await installQuickRiflessi(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedRiflessi = text;
        },
      },
    });
  });
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page, 'keyboard', 'signal');
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondWithKey(page, 'Space');
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  const total = Number(
    await page.locator('[data-rx-count]').evaluate((element) => element.textContent.split('/')[1]),
  );
  for (let trial = 0; trial < total; trial += 1) await respondWithKey(page, 'Space');

  await expect(page.getByRole('heading', { name: /more than one dimension/i })).toBeVisible();
  await expect(page.locator('.rx-metric')).toHaveCount(1);
  await expect(page.locator('.rx-results__stamp')).toContainText('01 / 03');
  await expect(page.getByText('Choice response', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Wrong choices', { exact: true })).toHaveCount(0);
  await expectJournalEntry(page, 'riflessi');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const journal = JSON.parse(localStorage.getItem('sense6:journal') ?? 'null');
        return journal.entries.find((entry) => entry.examId === 'riflessi').protocol.profileId;
      }),
    )
    .toBe('signal');
  await page.getByRole('button', { name: /Copy result summary/i }).click();
  await expect.poll(() => page.evaluate(() => window.__copiedRiflessi)).toContain('Signal median:');
  const copied = await page.evaluate(() => window.__copiedRiflessi);
  expect(copied).not.toContain('Choice median:');
  expect(copied).not.toContain('Sustained median:');
  expect(copied).not.toContain('wrong choices');
});

async function finishSignalAndOpenChoice(page) {
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondWithKey(page, 'Space');
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  const total = Number(
    await page.locator('[data-rx-count]').evaluate((element) => element.textContent.split('/')[1]),
  );
  for (let trial = 0; trial < total; trial += 1) await respondWithKey(page, 'Space');
  await page.getByRole('button', { name: /Continue to Scelta/i }).click();
}

async function respondToWrongChoice(page) {
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'live');
  const side = await page.locator('[data-rx-arrow]').getAttribute('data-side');
  await page.keyboard.press(side === 'left' ? 'ArrowRight' : 'ArrowLeft');
}

async function expectRunnerToFit(page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const viewport = {
          width: window.visualViewport?.width ?? window.innerWidth,
          height: window.visualViewport?.height ?? window.innerHeight,
        };
        const inside = (selector) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return Boolean(
            rect &&
              rect.width > 0 &&
              rect.height > 0 &&
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.right <= viewport.width + 0.5 &&
              rect.bottom <= viewport.height + 0.5,
          );
        };
        return {
          noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          scrollY: window.scrollY,
          chromeHidden: getComputedStyle(document.querySelector('.site-chrome')).display === 'none',
          siteFooterHidden:
            getComputedStyle(document.querySelector('body > .ui-sitefooter')).display === 'none',
          runner: inside('.rx-runner'),
          header: inside('.rx-runner__header'),
          status: inside('[data-rx-status]'),
          target: inside('[data-rx-target]'),
          footer: inside('.rx-runner__footer'),
        };
      }),
    )
    .toEqual({
      noHorizontalOverflow: true,
      scrollY: 0,
      chromeHidden: true,
      siteFooterHidden: true,
      runner: true,
      header: true,
      status: true,
      target: true,
      footer: true,
    });
}

async function expectScreenToReflow(page, label) {
  const overflow = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('#app *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: element.className || element.tagName,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > clientWidth + 1)
      .slice(0, 8);
    return { clientWidth, offenders, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(overflow.scrollWidth, `${label}: ${JSON.stringify(overflow.offenders)}`).toBeLessThanOrEqual(
    overflow.clientWidth,
  );
  await expectNoHorizontalOverflow(page, label);
  const failures = await page.locator('#app').evaluate((app) => {
    const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
    const viewportRight =
      viewportLeft + (window.visualViewport?.width ?? document.documentElement.clientWidth);
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const inspected = [
      ...app.querySelectorAll(
        '.rx-mode strong, .rx-mode small, .rx-setup-field, .rx-transition h1, .rx-transition > p:not(.ui-eyebrow), .rx-results h1, .rx-metric p, .rx-events dt, .rx-timing dt, .rx-timing dd, .rx-results__actions button',
      ),
    ].filter(visible);

    return inspected.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const text = element.textContent.trim();
      const problems = [];
      if (rect.left < viewportLeft - 1 || rect.right > viewportRight + 1) {
        problems.push(
          `${element.className || element.tagName}: outside viewport (${rect.left}-${rect.right})`,
        );
      }
      if (text.length >= 4 && rect.width < fontSize * 2) {
        problems.push(`${element.className || element.tagName}: one-character text column (${rect.width}px)`);
      }
      if (element.scrollWidth > element.clientWidth + 1) {
        problems.push(`${element.className || element.tagName}: clipped inline content`);
      }
      return problems;
    });
  });
  expect(failures, `${label}: ${failures.join('; ')}`).toEqual([]);
}

async function expectRunnerStageToFit(page, label) {
  await expectRunnerToFit(page);
  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds
        ? { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top }
        : null;
    };
    return {
      chamber: rect('[data-rx-chamber]'),
      count: rect('[data-rx-count]'),
      hint: rect('.rx-response-pad span, .rx-choice-zones small'),
      status: rect('[data-rx-status]'),
      stop: rect('[data-action="rx-stop"]'),
      target: rect('[data-rx-target]'),
    };
  });
  expect(geometry.count.right, `${label}: progress label should not overlap Stop`).toBeLessThanOrEqual(
    geometry.stop.left + 1,
  );
  expect(geometry.status.left, `${label}: status should stay inside the chamber`).toBeGreaterThanOrEqual(
    geometry.chamber.left - 1,
  );
  expect(geometry.status.right, `${label}: status should stay inside the chamber`).toBeLessThanOrEqual(
    geometry.chamber.right + 1,
  );
  expect(geometry.status.bottom, `${label}: status should not overlap the target`).toBeLessThanOrEqual(
    geometry.target.top + 1,
  );
  expect(geometry.target.bottom, `${label}: target should not overlap the response hint`).toBeLessThanOrEqual(
    geometry.hint.top + 1,
  );
}

async function completeScopeWithGeometry(page, scope, label) {
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expectRunnerStageToFit(page, `${label} signal practice`);
  await respondWithKey(page, 'Space');
  await expectScreenToReflow(page, `${label} signal practice transition`);
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  const signalTrials = Number(
    await page.locator('[data-rx-count]').evaluate((element) => element.textContent.split('/')[1]),
  );
  for (let trial = 0; trial < signalTrials; trial += 1) await respondWithKey(page, 'Space');
  if (scope === 'signal') return;

  await expectScreenToReflow(page, `${label} signal-choice transition`);
  await page.getByRole('button', { name: /Continue to Scelta/i }).click();
  await expectScreenToReflow(page, `${label} choice brief`);
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expectRunnerStageToFit(page, `${label} choice practice`);
  await respondToChoice(page);
  await respondToChoice(page);
  await expectScreenToReflow(page, `${label} choice practice transition`);
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  const choiceTrials = Number(
    await page.locator('[data-rx-count]').evaluate((element) => element.textContent.split('/')[1]),
  );
  for (let trial = 0; trial < choiceTrials; trial += 1) await respondToChoice(page);
  if (scope === 'signal-choice') return;

  await expectScreenToReflow(page, `${label} choice-sustained transition`);
  await page.getByRole('button', { name: /Continue to Tenuta/i }).click();
  await expectScreenToReflow(page, `${label} sustained brief`);
  await page.getByRole('button', { name: /Start the 3-minute run/i }).click();
  await expectRunnerStageToFit(page, `${label} sustained runner`);
  await respondWithKey(page, 'Space');
}

test('Riflessi completes all three instruments and reports separate device-relative measures', async ({
  page,
}) => {
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');

  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Riflessi/i })).toBeVisible();
  await expect(page.locator('.rx-signal-strip i')).toHaveCount(48);
  await expect(page.locator('.rx-instrument-visual')).toHaveCount(3);
  await expect(page.locator('.rx-boundary.method')).toBeVisible();
  await expect(page.locator('.rx-research .source-list li')).toHaveCount(5);
  await expect(page.locator('.rx-closing').getByRole('button', { name: /Open test/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions, kept separate/i })).toBeInViewport();
  await expect(page).toHaveURL(/\/en\/riflessi\/$/);

  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Keyboard/i }).click();
  const start = page.getByRole('button', { name: /Begin selected scope/i });
  await expect(start).toBeDisabled();
  await expect(page.locator('.experiment-boundary')).toHaveText(
    /recreational experiment for curiosity and fun—not a medical test or diagnosis/i,
  );
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
  await expectJournalEntry(page, 'riflessi');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('production-length denominators remain readable on a 320px result screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser long-copy geometry regression');
  await installQuickRiflessi(page);
  await page.addInitScript(() => {
    window.__SENSE6_TEST_CONFIG__.riflessi.signal.scoredTrials = 20;
    window.__SENSE6_TEST_CONFIG__.riflessi.choice.scoredTrials = 32;
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page);
  await completeScopeWithGeometry(page, 'complete', '320x568 production denominators');

  await expect(page.locator('.rx-results')).toBeVisible();
  await expect(page.locator('.rx-metric').first()).toContainText('from 20 scheduled events');
  await expect(page.locator('.rx-metric').nth(1)).toContainText('across all 32 scheduled choices');
  await expectScreenToReflow(page, '320x568 production-denominator results');
});

test('German Riflessi stages localize generated runner labels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await installQuickRiflessi(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/de/riflessi/');
  await page.locator('[data-action="rx-setup"]').click();
  await expect(page.getByRole('heading', { name: 'Wählen Sie einen Reaktionsweg.' })).toBeVisible();
  await expect(page.locator('[data-rx-scope-picker] legend')).toHaveText(
    'Wie umfangreich soll der Durchlauf sein?',
  );
  await expect(page.locator('[data-rx-scope-picker] [data-scope="signal"]')).toContainText('etwa 2 Minuten');
  await page.locator('[data-action="rx-mode"][data-mode="keyboard"]').click();
  await page.locator('[data-action="rx-scope"][data-scope="signal"]').click();
  await page.locator('[data-rx-consent]').check();
  await page.locator('[data-action="rx-start"]').click();
  await expect(page.locator('.rx-brief__copy')).toContainText('Einfache visuelle Reaktion');
  await expect(page.getByRole('heading', { name: 'Ein Signal. Eine Aktion.' })).toBeVisible();
  await page.locator('[data-action="rx-begin-stage"]').click();
  await expect(page.getByRole('heading', { name: 'Reaktionstest für Segnale' })).toBeAttached();
  await expect(page.locator('[data-rx-block]')).toHaveText('Übung');
  await respondWithKey(page, 'Space');
  await page.locator('[data-action="rx-begin-scored"]').click();
  await respondWithKey(page, 'Space');
  await respondWithKey(page, 'Space');

  await expect(page.locator('.rx-results')).toBeVisible();
  await expect(page.locator('.rx-results__hero h1')).toContainText('Ihre Reaktion hat');
  await expect(page.locator('.rx-results__stamp')).toContainText('Durchlauf nutzbar');
  await expect(page.locator('.rx-metric')).toContainText('Typische Signalreaktion');
  await expect(page.locator('.rx-metric > p')).toContainText(
    /Median aus 2 sauberen einfachen Reaktionen von 2 geplanten Ereignissen/,
  );
  await expect(page.locator('.rx-events')).toContainText('Prüfungen ohne Signal');
  await expect(page.locator('.rx-limit')).toContainText(/Riflessi beurteilt weder Gehirnerschütterung/);
  await expectScreenToReflow(page, '320x568 German signal result');
});

test('the mobile Riflessi setup and response chamber stay inside the viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only geometry check');
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');
  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: /^Touch \/ pointer/i }).click();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await page.getByRole('button', { name: /Begin selected scope/i }).click();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'live');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);
  await page.getByRole('button', { name: /Respond to signal/i }).click();
});

test('choice direction stays secret until an atomic, transition-free onset', async ({ page }) => {
  await page.addInitScript(() => {
    window.__SENSE6_TEST_CONFIG__ = {
      riflessi: {
        anticipationMs: 0,
        feedbackMs: 8,
        signal: {
          practiceTrials: 1,
          scoredTrials: 1,
          catchTrials: 0,
          minWaitMs: 12,
          maxWaitMs: 18,
          responseTimeoutMs: 500,
        },
        choice: {
          practiceTrials: 1,
          scoredTrials: 1,
          minWaitMs: 600,
          maxWaitMs: 600,
          responseTimeoutMs: 800,
        },
      },
    };
  });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page);
  await finishSignalAndOpenChoice(page);
  await page.getByRole('button', { name: /Start practice/i }).click();

  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'waiting');
  expect(
    await page.locator('[data-rx-arrow]').evaluate((arrow) => ({
      glyph: arrow.textContent,
      side: arrow.getAttribute('data-side'),
      visibility: getComputedStyle(arrow).visibility,
      transitionDuration: getComputedStyle(arrow.closest('[data-rx-target]')).transitionDuration,
    })),
  ).toEqual({ glyph: '', side: null, visibility: 'hidden', transitionDuration: '0s' });

  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'live');
  expect(
    await page.locator('[data-rx-arrow]').evaluate((arrow) => ({
      glyph: arrow.textContent,
      side: arrow.getAttribute('data-side'),
      visibility: getComputedStyle(arrow).visibility,
      transitionDuration: getComputedStyle(arrow.closest('[data-rx-target]')).transitionDuration,
    })),
  ).toMatchObject({
    glyph: expect.stringMatching(/^[←→]$/),
    side: expect.stringMatching(/^(left|right)$/),
    visibility: 'visible',
    transitionDuration: '0s',
  });
});

test('runner progress, headings, focus, and paused state are accessible', async ({ page }) => {
  await page.addInitScript(() => {
    window.__SENSE6_TEST_CONFIG__ = {
      riflessi: {
        anticipationMs: 0,
        feedbackMs: 8,
        signal: {
          practiceTrials: 1,
          scoredTrials: 2,
          catchTrials: 0,
          minWaitMs: 12,
          maxWaitMs: 18,
          responseTimeoutMs: 15_000,
        },
      },
    };
  });
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page);
  await page.getByRole('button', { name: /Start practice/i }).click();

  const runnerTitle = page.getByRole('heading', { level: 1, name: /Segnale response runner/i });
  await expect(runnerTitle).toBeFocused();
  await expect(page.getByRole('progressbar', { name: /Instrument progress/i })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await respondWithKey(page, 'Space');
  await expect(page.getByRole('heading', { name: /Now the measured block/i })).toBeFocused();
  await page.getByRole('button', { name: /Begin measured block/i }).click();
  await respondWithKey(page, 'Space');
  await expect(page.getByRole('progressbar', { name: /Instrument progress/i })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: /This trial was interrupted/i })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('short portrait and landscape runners reset stale scroll and expose the whole task', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Uses explicit viewport geometry');
  await installQuickRiflessi(page);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en/riflessi/');
    await prepareRiflessi(page, 'pointer');
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.blockSize = '600px';
      document.querySelector('#app').prepend(spacer);
      window.scrollTo(0, document.documentElement.scrollHeight);
      document.querySelector('[data-action="rx-begin-stage"]').click();
    });
    await expect(page.locator('[data-rx-chamber]')).toBeVisible();
    await expectRunnerToFit(page);

    if (viewport.width === 320) {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await expect(page.getByRole('heading', { name: /This trial was interrupted/i })).toBeFocused();
      await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.style.blockSize = '600px';
        document.querySelector('#app').prepend(spacer);
        window.scrollTo(0, document.documentElement.scrollHeight);
        document.querySelector('[data-action="rx-resume"]').click();
      });
      await expectRunnerToFit(page);
    }
  }
});

test('the 320px runner reflows at 200% text sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Uses explicit text-only zoom geometry');
  await installQuickRiflessi(page);
  await page.addInitScript(() => {
    window.__SENSE6_TEST_CONFIG__.riflessi.signal.responseTimeoutMs = 15_000;
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/riflessi/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await prepareRiflessi(page, 'pointer');
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expectRunnerToFit(page);
});

test('touch gestures cannot scroll or select the active response surface', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Requires the touch-enabled Chromium project');
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page, 'pointer');
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('[data-rx-chamber]')).toHaveAttribute('data-rx-state', 'live');

  const pad = page.locator('[data-rx-response="signal"]');
  expect(
    await pad.evaluate((element) => ({
      touchAction: getComputedStyle(element).touchAction,
      userSelect: getComputedStyle(element).userSelect,
    })),
  ).toEqual({ touchAction: 'none', userSelect: 'none' });
  const box = await pad.boundingBox();
  const client = await context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const startY = box.y + box.height * 0.7;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: Math.max(box.y + 10, startY - 140) }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect(page.getByRole('heading', { name: /Now the measured block/i })).toBeVisible();
  expect(
    await page.evaluate(() => ({ scrollY: window.scrollY, selection: getSelection()?.toString() })),
  ).toEqual({
    scrollY: 0,
    selection: '',
  });
});

test('the active-run Stop hook preserves a cancelled run and clears a confirmed exit', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Exercises Chromium confirmation dialogs');
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page);
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.locator('.site-chrome')).toBeHidden();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: /Stop safely/i }).click();
  await expect(page.locator('[data-rx-chamber]')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Stop safely/i }).click();
  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeFocused();
  await expect(page.locator('[data-rx-chamber]')).toHaveCount(0);
});

test('browser Back cancellation preserves the exact active Riflessi trial', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Exercises Chromium history confirmation');
  await page.addInitScript(() => {
    window.__SENSE6_TEST_CONFIG__ = {
      riflessi: {
        anticipationMs: 0,
        feedbackMs: 8,
        signal: {
          practiceTrials: 1,
          scoredTrials: 1,
          catchTrials: 0,
          minWaitMs: 15_000,
          maxWaitMs: 15_000,
          responseTimeoutMs: 500,
        },
      },
    };
  });
  await page.goto('/en/');
  await page.locator('.exam-card__link[href="/en/riflessi/"]').click();
  await prepareRiflessi(page);
  await page.getByRole('button', { name: /Start practice/i }).click();
  const chamber = page.locator('[data-rx-chamber]');
  await expect(chamber).toHaveAttribute('data-rx-state', 'waiting');
  const trialMarkup = await chamber.innerHTML();
  await expect(page.locator('[data-locale-select]')).toBeDisabled();
  await expect(page.locator('[data-bronto-theme-toggle]')).toBeDisabled();

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/en\/riflessi\/$/);
  await expect(chamber).toHaveAttribute('data-rx-state', 'waiting');
  expect(await chamber.innerHTML()).toBe(trialMarkup);

  page.once('dialog', (dialog) => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('[data-locale-select]')).toBeEnabled();
  await expect(page.locator('[data-bronto-theme-toggle]')).toBeEnabled();
});

test('copied limited summaries retain quality, interruptions, and wrong-choice context', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Keeps the accelerated completion single-run');
  await installQuickRiflessi(page);
  await page.addInitScript(() => {
    for (const instrument of ['signal', 'choice', 'stability']) {
      window.__SENSE6_TEST_CONFIG__.riflessi[instrument].responseTimeoutMs = 15_000;
    }
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedRiflessi = text;
        },
      },
    });
  });
  await page.goto('/en/riflessi/');
  await prepareRiflessi(page);
  await finishSignalAndOpenChoice(page);
  await page.getByRole('button', { name: /Start practice/i }).click();
  await respondToChoice(page);
  await respondToChoice(page);
  await page.getByRole('button', { name: /Begin measured block/i }).click();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByRole('button', { name: /Resume with a fresh trial/i }).click();
  for (let trial = 0; trial < 4; trial += 1) await respondToWrongChoice(page);

  await page.getByRole('button', { name: /Continue to Tenuta/i }).click();
  await page.getByRole('button', { name: /Start the 3-minute run/i }).click();
  await respondWithKey(page, 'Space');
  await expect(page.getByRole('heading', { name: /more than one dimension/i })).toBeVisible();
  await expect(page.getByText(/Limited run/i)).toBeVisible();
  await page.getByRole('button', { name: /Copy result summary/i }).click();

  await expect.poll(() => page.evaluate(() => window.__copiedRiflessi)).toContain('Run quality: Limited run');
  const copied = await page.evaluate(() => window.__copiedRiflessi);
  expect(copied).toContain('Timing: Timing interruptions observed; interruptions: 1');
  expect(copied).toContain('4 wrong choices');
});

test('all Riflessi scopes reflow through real results at the audited mobile layouts', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Runs the explicit mobile and text-scale matrix');
  await installQuickRiflessi(page);

  for (const layout of AUDITED_LAYOUTS) {
    await page.setViewportSize(layout.viewport);
    await page.goto('/en/riflessi/');
    if (layout.textScale) {
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, layout.textScale);
    }
    await page.getByRole('button', { name: /Prepare the lab/i }).click();
    await expectScreenToReflow(page, `${layout.label} setup`);

    for (const scope of ['signal', 'signal-choice', 'complete']) {
      const scopeButton = page.locator(`[data-rx-scope-picker] [data-scope="${scope}"]`);
      await scopeButton.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'end' }));
      await expectInVisualViewport(scopeButton, `${layout.label} ${scope} scope`, { hitTest: true });
    }
    const start = page.getByRole('button', { name: /Begin selected scope/i });
    await page.getByRole('button', { name: /^Keyboard/i }).click();
    await page.locator(`[data-rx-scope-picker] [data-scope="${layout.scope}"]`).click();
    await page.getByLabel(/I understand this measures this browser/i).check();
    await start.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'end' }));
    await expectInVisualViewport(start, `${layout.label} start`, { hitTest: true });
    await start.click();

    await expectScreenToReflow(page, `${layout.label} signal brief`);
    await completeScopeWithGeometry(page, layout.scope, layout.label);
    await expect(page.locator('.rx-results')).toBeVisible();
    await expectScreenToReflow(page, `${layout.label} results`);
    await expect(page.locator('.rx-metric')).toHaveCount(
      layout.scope === 'signal' ? 1 : layout.scope === 'signal-choice' ? 3 : 6,
    );
    await expect(page.locator('.rx-results__stamp')).toContainText(
      `${layout.scope === 'signal' ? '01' : layout.scope === 'signal-choice' ? '02' : '03'} / 03`,
    );
    await expect(page.locator('.rx-limit')).toContainText(/does not assess/i);
    const resultActions = page.locator('.rx-results__actions button');
    for (let index = 0; index < (await resultActions.count()); index += 1) {
      const action = resultActions.nth(index);
      await action.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'end' }));
      await expectInVisualViewport(action, `${layout.label} result action ${index + 1}`, {
        hitTest: true,
      });
    }
  }
});
