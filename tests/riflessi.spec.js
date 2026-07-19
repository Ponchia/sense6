import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  expectJournalEntry,
  installQuickRiflessi,
  respondToChoice,
  respondWithKey,
} from './helpers/browser.js';

async function prepareRiflessi(page, mode = 'keyboard') {
  await page.getByRole('button', { name: /Prepare the lab/i }).click();
  await page.getByRole('button', { name: mode === 'pointer' ? /^Touch \/ pointer/i : /^Keyboard/i }).click();
  await page.getByLabel(/I understand this measures this browser/i).check();
  await page.getByRole('button', { name: /Begin instrument 01/i }).click();
}

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

test('Riflessi completes all three instruments and reports separate device-relative measures', async ({
  page,
}) => {
  await installQuickRiflessi(page);
  await page.goto('/en/riflessi/');

  await expect(page.getByRole('heading', { name: /Notice the signal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What informed Riflessi/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: /See the method/i }).click();
  await expect(page.getByRole('heading', { name: /Three questions, kept separate/i })).toBeInViewport();
  await expect(page).toHaveURL(/\/en\/riflessi\/$/);

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
  await expectJournalEntry(page, 'riflessi');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('German Riflessi stages localize generated runner labels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Single-browser locale journey');
  await installQuickRiflessi(page);
  await page.goto('/de/riflessi/');
  await page.locator('[data-action="rx-setup"]').click();
  await page.locator('[data-action="rx-mode"][data-mode="keyboard"]').click();
  await page.locator('[data-rx-consent]').check();
  await page.locator('[data-action="rx-start"]').click();
  await expect(page.locator('.rx-brief__copy')).toContainText('Einfache visuelle Reaktion');
  await expect(page.getByRole('heading', { name: 'Ein Signal. Eine Aktion.' })).toBeVisible();
  await page.locator('[data-action="rx-begin-stage"]').click();
  await expect(page.getByRole('heading', { name: 'Reaktionstest für Segnale' })).toBeAttached();
  await expect(page.locator('[data-rx-block]')).toHaveText('Übung');
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
