import { expect, test } from '@playwright/test';

/**
 * The cross-browser matrix.
 *
 * This file is the only suite Firefox and WebKit run, so what it covers is the
 * whole of their coverage. Three of the five tests self-skipped outside chromium
 * with a bare note naming the chromium smoke path, leaving the real matrix undeclared
 * and, at two executed tests, considerably narrower than it looked.
 *
 * The split is now explicit and justified per test:
 *
 *   EVERY BROWSER - anything whose failure mode is engine-specific: the
 *   static-HTML-to-hydration handover (which broke in production twice in eight
 *   days), a complete instrument journey, and viewport invalidation.
 *
 *   CHROMIUM ONLY - assertions about computed layout values, or that depend on
 *   overriding a DOM property in a way WebKit and Firefox implement
 *   differently. Running those elsewhere tests the harness, not the product.
 *
 * `chromiumOnly` names the reason in the skip, so the matrix stays legible.
 */
const chromiumOnly = (testInfo, reason) =>
  test.skip(testInfo.project.name !== 'chromium-smoke', `chromium-only: ${reason}`);

test('every browser loads the pre-rendered page and hands it over to the bundle @pr-smoke', async ({
  page,
}) => {
  // The suite runs against `dist` served by scripts/serve-deployed-smoke.mjs, so
  // this is the real pre-rendered document, the real hashed bundle, and the real
  // Content-Security-Policy. Under the Vite dev server this route fell back to
  // the raw root index.html and the handover was never exercised at all.
  await page.addInitScript(() => {
    window.__sense6CspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__sense6CspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });

  const response = await page.goto('/en/tetracromia/');
  expect(response?.status()).toBe(200);

  // Server-rendered content is present, then the bundle takes over and removes it.
  await expect(page.locator('main h1')).toBeVisible();
  // WebKit's first launch on a shared ARC runner can take longer than the
  // default 5 seconds. Still require actual hydration of the production bundle.
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'tetracromia', {
    timeout: 20_000,
  });
  await expect(page.locator('#app > .static-entry')).toHaveCount(0);

  expect(await page.evaluate(() => window.__sense6CspViolations)).toEqual([]);
});

test('the gallery opens a localized experiment with route CSS', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'asserts a computed CSS value, which differs by engine');
  await gotoHydrated(page, '/en/');
  await page
    .getByRole('link', { name: /Tetracromia/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/en\/tetracromia\/$/);
  await expect(page.getByRole('heading', { name: /Notice colour in three different ways/i })).toBeVisible();
  await expect(page.locator('.tetracromia-hero__instrument')).toHaveCSS('position', 'relative');
});

test('the Tetracromia setup reaches an enabled measured choice', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'covered end to end for every browser by the complete journey below');
  await gotoHydrated(page, '/en/tetracromia/');
  await page.locator('[data-action="setup"]').first().click();
  await expect(page.locator('[data-action="start"]')).toBeDisabled();
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
});

test('a complete Screen Colour Lab journey reaches separate observations @pr-smoke', async ({ page }) => {
  test.setTimeout(60_000);
  await gotoHydrated(page, '/en/tetracromia/');
  await enterColorLabSetup(page);
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await answerTrials(page, 14);
  await answerTrials(page, 12);
  await submitSequenceRuns(page, 3);

  await expect(
    page.getByRole('heading', { name: /Three observations from one short screen-colour run/i }),
  ).toBeVisible();
  await expect(page.locator('.result-metric')).toHaveCount(3);
});

test('completed results survive a throwing localStorage getter', async ({ page }, testInfo) => {
  chromiumOnly(testInfo, 'redefines window.localStorage, which WebKit and Firefox handle differently');
  // The same 29-trial journey as the test above, which already budgets 60s.
  // This one inherited the 30s default and failed at a different step on each
  // run under load — the signature of a timeout, not a defect.
  test.setTimeout(60_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  await gotoHydrated(page, '/en/tetracromia/');
  await enterColorLabSetup(page);
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await answerTrials(page, 14);
  await answerTrials(page, 12);
  await submitSequenceRuns(page, 3);

  await expect(
    page.getByRole('heading', { name: /Three observations from one short screen-colour run/i }),
  ).toBeVisible();
  await expect(page.locator('.result-metric')).toHaveCount(3);
  await expect(page.locator('[data-tetracromia-journal-status]')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('a display resize invalidates an active Screen Colour Lab journey @pr-smoke', async ({ page }) => {
  await gotoHydrated(page, '/en/tetracromia/');
  await enterColorLabSetup(page);
  await page.locator('#screen-ready').check();
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-choice="0"]')).toBeEnabled();
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator('[data-tetracromia-invalidation]')).toContainText(/The display size changed/i);
  await expect(page.locator('[data-action="start"]')).toBeDisabled();
});

/**
 * Firefox on an ARC runner can report a successful pointer click during
 * first-route scroll/layout settling while the intro remains visible.
 * Retry ONCE through the ordinary keyboard activation path only when
 * setup did not open; never skip setup, consent, or any measured trial.
 */
async function enterColorLabSetup(page) {
  const start = page.locator('[data-action="setup"]').first();
  const ready = page.locator('#screen-ready');
  await expect(start).toBeVisible();
  await start.click();
  if ((await ready.count()) === 0 && (await start.isVisible())) {
    test.info().annotations.push({
      type: 'setup-click-retry',
      description: 'Intro persisted after pointer activation; retried the same setup via keyboard.',
    });
    await start.press('Enter');
  }
  await expect(ready).toBeVisible();
}

async function gotoHydrated(page, route) {
  await page.goto(route);
  await page.locator('#app[data-sense6-hydrated]').waitFor();
  await page.locator('#app > .static-entry').waitFor({ state: 'detached' });
}

async function answerTrials(page, count) {
  const trialNumber = page.locator('.trial-count b');
  for (let trial = 0; trial < count; trial += 1) {
    const previousTrial = await trialNumber.textContent();
    const choice = page.locator('[data-choice="0"]').first();
    await expect(choice).toBeEnabled();
    await choice.click();
    await expect(trialNumber).not.toHaveText(previousTrial);
  }
}

async function submitSequenceRuns(page, count) {
  const trialNumber = page.locator('.trial-count b');
  const results = page.locator('.results-view');
  for (let run = 0; run < count; run += 1) {
    const previousRun = await trialNumber.textContent();
    const submit = page.locator('[data-action="submit-sequence"]');
    await expect(submit).toBeEnabled();
    await submit.click();
    if (run < count - 1) await expect(trialNumber).not.toHaveText(previousRun);
    else await expect(results).toBeVisible();
  }
}
