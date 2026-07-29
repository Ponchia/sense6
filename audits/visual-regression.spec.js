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

async function compareScreenshot(page, name) {
  if (approvedSnapshots.has(name.replace(/\.png$/, '-chromium-linux.png'))) {
    await page.screenshot(screenshotOptions());
    return;
  }
  await expect(page).toHaveScreenshot(name, screenshotOptions());
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
