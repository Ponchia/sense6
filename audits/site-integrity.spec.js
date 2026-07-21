import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { SITE_ROUTES } from './routes.js';

test.describe('every canonical route', () => {
  for (const route of SITE_ROUTES) {
    test(`${route} renders cleanly at desktop and 320px`, async ({ page }) => {
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
      });
      page.on('requestfailed', (request) => {
        runtimeErrors.push(`request: ${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
      });

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBe(200);
      await settlePage(page);

      const heading = page.locator('main h1');
      await expect(heading, `${route} needs one visible main heading`).toHaveCount(1);
      await expect(heading).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://sense6.net${route}`,
      );
      expect(
        (await page.locator('main').innerText()).trim().length,
        `${route} needs substantive content`,
      ).toBeGreaterThan(120);

      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations, `${route}: ${formatViolations(accessibility.violations)}`).toEqual([]);
      expect(await horizontalOverflow(page), `${route} overflows at desktop width`).toEqual({
        clientWidth: 1280,
        offenders: [],
        scrollWidth: 1280,
      });

      await page.setViewportSize({ width: 320, height: 568 });
      const mobileResponse = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(mobileResponse?.status(), `${route} at 320px`).toBe(200);
      await settlePage(page);
      const mobileAccessibility = await new AxeBuilder({ page }).analyze();
      expect(
        mobileAccessibility.violations,
        `${route} at 320px: ${formatViolations(mobileAccessibility.violations)}`,
      ).toEqual([]);
      expect(await horizontalOverflow(page), `${route} overflows at 320px`).toEqual({
        clientWidth: 320,
        offenders: [],
        scrollWidth: 320,
      });
      expect(runtimeErrors, route).toEqual([]);
    });
  }
});

async function settlePage(page) {
  await page.locator('main h1').waitFor({ state: 'visible' });
  await page.locator('#app[data-sense6-hydrated]').waitFor();
  await page.waitForFunction(() => !document.querySelector('#app > .static-entry'));
  await page.evaluate(async () => document.fonts?.ready);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const clientWidth = root.clientWidth;
    const offenders = [];
    if (root.scrollWidth > clientWidth) {
      for (const element of document.body.querySelectorAll('*')) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && (rect.left < -1 || rect.right > clientWidth + 1)) {
          offenders.push(
            `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
              element.classList.length ? `.${[...element.classList].join('.')}` : ''
            } [${Math.round(rect.left)}, ${Math.round(rect.right)}]`,
          );
        }
        if (offenders.length === 10) break;
      }
    }
    return { clientWidth, offenders, scrollWidth: root.scrollWidth };
  });
}

function formatViolations(violations) {
  return violations.map(({ id, nodes }) => `${id} (${nodes.length})`).join(', ');
}
