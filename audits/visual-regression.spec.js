import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { REPRESENTATIVE_ROUTES } from './routes.js';

/**
 * The build of the revision this suite compares against, when the workflow knows
 * it. Used only to answer "did this route exist at the base revision?" — see
 * firstAppearance below.
 */
const baseSiteDirectory = process.env.VISUAL_BASE_SITE_DIR;

const approvedSnapshots = new Set(
  (process.env.VISUAL_APPROVED_SNAPSHOTS ?? '')
    .split(',')
    .map((snapshot) => snapshot.trim())
    .filter(Boolean),
);
const representativeSnapshots = new Set(
  REPRESENTATIVE_ROUTES.flatMap((route) => [
    `${slug(route)}-desktop-chromium-linux.png`,
    `${slug(route)}-mobile-chromium-linux.png`,
  ]),
);

for (const snapshot of approvedSnapshots) {
  if (!representativeSnapshots.has(snapshot)) {
    throw new Error(`Approved visual baseline does not name a representative screenshot: ${snapshot}`);
  }
}

for (const route of REPRESENTATIVE_ROUTES) {
  test(`${route} matches the visual baseline`, async ({ page }) => {
    if (firstAppearance(route)) {
      // A route added in this revision has no comparable base capture. The base
      // build answers its path with the 404 page, so the capture step would
      // screenshot a 404 and the comparison would either fail on a difference
      // nobody can act on or, if the snapshot were listed in
      // audits/visual-baseline-approvals.txt, "review" a diff against a 404 as
      // if it were the new page. Skip instead, and let the next run — where the
      // base revision does contain the route — establish the comparison.
      test.info().annotations.push({
        type: 'first-appearance',
        description: `${route} does not exist at the base revision; there is no baseline to compare against yet.`,
      });
      test.skip(true, `${route} is new in this revision; the base revision serves a 404 for it`);
    }

    // KNOWN INERT. src/exams/color-blindness.js:738 (`adaptiveRunEntropy`) reads
    // this seed behind `import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/`
    // against the hostname. Vite compiles `import.meta.env.DEV` to `false` in a
    // production build — and this suite runs against `npm run preview`, a
    // production build. `__SENSE6_TEST_CONFIG__` does not appear anywhere in
    // dist/assets/*.js, so the Daltonia seed has never taken effect here and
    // /en/color-blindness/ is captured with a fresh random seed on every run.
    // The line is kept because it states the intent and starts working the
    // moment the source gate admits a production-visible test hook; until then
    // the determinism this suite claims for that route does not exist. Note that
    // even then the hostname condition has to hold: a preview served on
    // 127.0.0.1 satisfies it, a deployed host does not.
    await page.addInitScript(() => {
      window.__SENSE6_TEST_CONFIG__ = { daltonia: { seed: 'visual-regression' } };
    });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    if (route === '/en/color-blindness/') {
      // The preview canvas measures its CSS box on the first animation frame.
      // Re-render it after cold web fonts settle so both revisions draw from
      // the final layout instead of comparing fallback-font canvas sizes.
      await page.locator('[data-action="cb-setup"]').first().click();
      await page.locator('[data-action="cb-home"]').click();
      await settlePage(page);
      await waitForPreviewCanvas(page);
    }
    await compareScreenshot(page, `${slug(route)}-desktop.png`);

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    await compareScreenshot(page, `${slug(route)}-mobile.png`);
  });
}

/**
 * Compare the candidate against the base-revision capture.
 *
 * For an approved snapshot the comparison still runs. Previously this branch
 * took a screenshot, discarded the buffer, and returned with no assertion at
 * all, so listing a snapshot turned its check off entirely — and because the
 * workflow derived the approved set from `git diff` over the committed
 * baselines, changing a baseline was the same thing as disabling its check.
 * PR #58 touched six baselines and silently no-opped six of twenty-six
 * comparisons, including both root snapshots covering the root-gateway rewrite.
 *
 * Now an approval produces evidence instead of a hole: the difference is
 * captured, the base, candidate, and diff images are attached to the report,
 * and the test passes with an annotation. An approval that no longer
 * corresponds to a real difference fails, so it cannot rot into a permanent
 * blind spot.
 */
async function compareScreenshot(page, name) {
  const snapshotName = name.replace(/\.png$/, '-chromium-linux.png');
  if (!approvedSnapshots.has(snapshotName)) {
    await expect(page).toHaveScreenshot(name, screenshotOptions());
    return;
  }

  const testInfo = test.info();
  const baselinePath = testInfo.snapshotPath(name);
  const baseline = await readFile(baselinePath).catch(() => null);
  if (!baseline) {
    // Without a base capture there is nothing to compare against, and
    // `toHaveScreenshot` would write the candidate and report a difference —
    // which this branch would then accept as an approved change. Refuse.
    throw new Error(
      `${snapshotName} is approved, but no base-revision capture exists at ${baselinePath}. ` +
        'Run the base capture step before comparing.',
    );
  }

  let difference = null;
  try {
    await expect(page).toHaveScreenshot(name, screenshotOptions());
  } catch (error) {
    difference = error instanceof Error ? error.message : String(error);
  }

  if (!difference) {
    throw new Error(
      `${snapshotName} is listed in audits/visual-baseline-approvals.txt but is identical to the ` +
        'base revision. Delete the line: a stale approval silently disables this comparison for ' +
        'every future change to this route.',
    );
  }

  await testInfo.attach(`${snapshotName} (base revision)`, { body: baseline, contentType: 'image/png' });
  await testInfo.attach(`${snapshotName} (candidate)`, {
    body: await page.screenshot(screenshotOptions()),
    contentType: 'image/png',
  });
  for (const suffix of ['diff', 'actual', 'expected']) {
    const artifact = testInfo.outputPath(name.replace(/\.png$/, `-${suffix}.png`));
    const body = await readFile(artifact).catch(() => null);
    if (body) await testInfo.attach(`${snapshotName} (${suffix})`, { body, contentType: 'image/png' });
  }

  testInfo.annotations.push({
    type: 'approved-visual-change',
    description: `${snapshotName} differs from the base revision; review the attached images. ${difference.split('\n')[0]}`,
  });
}

/**
 * Whether this route is new in the candidate revision.
 *
 * Answered from the base revision's own build, because every other signal is
 * ambiguous: the base capture for a new route succeeds (it screenshots the base
 * revision's 404 page), so a present baseline proves nothing. Without
 * VISUAL_BASE_SITE_DIR — a local run against one build — nothing is knowable and
 * the comparison proceeds exactly as before.
 * @param {string} route
 */
function firstAppearance(route) {
  if (!baseSiteDirectory) return false;
  return !existsSync(`${baseSiteDirectory}/dist${route}index.html`);
}

async function settlePage(page) {
  await page.locator('main h1').waitFor({ state: 'visible' });
  if (process.env.VISUAL_BASELINE_CAPTURE !== '1') {
    await page.locator('#app[data-sense6-hydrated]').waitFor();
  }
  if (new URL(page.url()).pathname !== '/') {
    await page.waitForFunction(() => !document.querySelector('#app > .static-entry'));
  }
  await page.evaluate(async () => document.fonts?.ready);
}

async function waitForPreviewCanvas(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-preview-target]');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const bounds = canvas.getBoundingClientRect();
    const cssSize = Math.max(1, Math.min(bounds.width || 320, bounds.height || bounds.width || 320));
    const pixels = Math.round(cssSize * Math.min(window.devicePixelRatio || 1, 2));
    return canvas.width === pixels && canvas.height === pixels;
  });
}

function screenshotOptions() {
  return {
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    maxDiffPixelRatio: 0.002,
  };
}

function slug(route) {
  return route === '/' ? 'root' : route.replaceAll('/', '-').replace(/^-|-$/g, '');
}
