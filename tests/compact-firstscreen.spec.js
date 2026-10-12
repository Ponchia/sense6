import { expect, test } from '@playwright/test';

// The 320x568 viewport exposed a real discovery defect: four experiments had
// their safe preparation action below the fold. These checks verify rendered
// geometry after fonts and route hydration, not only absence of overflow.
const EXPERIMENTS = [
  {
    route: 'tetracromia',
    action: '.tetracromia-hero__actions [data-action="setup"]',
    consent: '#screen-ready',
  },
  {
    route: 'riflessi',
    action: '.rx-hero__actions [data-action="rx-setup"]',
    consent: '.rx-consent input[type="checkbox"]',
  },
  {
    route: 'udito',
    action: '.au-hero__actions [data-action="au-setup"]',
    consent: '[data-au-consent]',
  },
  {
    route: 'acutezza',
    action: '.ac-hero__actions [data-action="ac-prepare"]',
    consent: '[data-ac-consent]',
  },
];

for (const { route, action, consent } of EXPERIMENTS) {
  test(`${route} exposes safe preparation on short narrow phones @pr-smoke`, async ({ page }, testInfo) => {
    test.skip(
      !['chromium', 'mobile'].includes(testInfo.project.name),
      'Narrow portrait first-screen geometry is checked in Chromium and emulated mobile',
    );

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 360, height: 740 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/en/${route}/`);
      await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
      await page.evaluate(async () => document.fonts.ready);
      const prepare = page.locator(action);
      await expect(prepare).toBeVisible();
      const bounds = await prepare.boundingBox();
      expect(
        bounds,
        `${route} at ${viewport.width}x${viewport.height}: missing preparation button`,
      ).not.toBeNull();
      expect(bounds.y, `${route}: action starts before the top of the screen`).toBeGreaterThanOrEqual(0);
      expect(bounds.height, `${route}: the primary control must remain usable`).toBeGreaterThanOrEqual(44);
      expect(
        bounds.y + bounds.height,
        `${route}: primary action is below ${viewport.width}x${viewport.height} first screen`,
      ).toBeLessThanOrEqual(viewport.height - 8);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${route}: horizontal overflow at ${viewport.width}px`,
      ).toBe(true);

      // The first action only opens preparation: it never grants consent or
      // begins the measurement merely because it is more discoverable.
      await prepare.click();
      await expect(page.locator(consent)).toBeVisible();
      await expect(page.locator(consent)).not.toBeChecked();
    }
  });
}
