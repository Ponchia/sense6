import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { REPRESENTATIVE_ROUTES } from './routes.js';

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
    // KNOWN INERT. src/exams/color-blindness.js:800 reads this seed behind
    // `import.meta.env.DEV`, which Vite compiles to `false` in a production
    // build — and this suite runs against `npm run preview`, a production
    // build. `__SENSE6_TEST_CONFIG__` does not appear anywhere in
    // dist/assets/*.js, so the Daltonia seed has never taken effect here and
    // /en/color-blindness/ is captured with a fresh random seed on every run.
    // The line is kept because it states the intent and starts working the
    // moment the source gate admits a production-visible test hook; until then
    // the determinism this suite claims for that route does not exist.
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
