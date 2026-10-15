import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const route of ['acutezza', 'udito', 'riflessi', 'color-blindness', 'tetracromia']) {
  const smokeTag = route === 'acutezza' ? ' @pr-smoke' : '';
  test(`${route} switches card surfaces with their text palette${smokeTag}`, async ({ page }) => {
    await page.goto(`/en/${route}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', route);
    await page.evaluate(async () => document.fonts.ready);
    for (const theme of ['dark', 'light']) {
      const surfaces = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('#app .ui-card')];
        // Flush the initial style, then use the real theme handler. Pause any
        // background interpolation halfway: waiting for it to finish would
        // hide the temporary contrast defect this regression must catch.
        for (const card of cards) getComputedStyle(card).backgroundColor;
        document.querySelector('[data-bronto-theme-toggle]').click();
        for (const card of cards) {
          for (const animation of card.getAnimations()) {
            if (animation.transitionProperty !== 'background-color') continue;
            animation.pause();
            animation.currentTime = animation.effect.getComputedTiming().endTime / 2;
          }
        }
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--panel)';
        document.body.append(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          theme: document.documentElement.dataset.theme,
          expected,
          backgrounds: cards.map((card) => getComputedStyle(card).backgroundColor),
        };
      });
      expect(surfaces.theme).toBe(theme);
      expect(surfaces.backgrounds.length).toBeGreaterThan(0);
      expect(surfaces.backgrounds).toEqual(surfaces.backgrounds.map(() => surfaces.expected));
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  });
}

// Cover the gallery-specific card declaration and the Bronto UI action class,
// not only the shared `.ui-card` transition overridden above. A transition
// here can silently lower contrast in the middle of light/dark theme changes.
test('theme changes keep gallery cards and action colors coupled @pr-smoke', async ({ page }) => {
  for (const route of ['/en/', '/en/acutezza/']) {
    await page.goto(route);
    await page.evaluate(async () => document.fonts.ready);
    for (const theme of ['dark', 'light']) {
      await page.locator('[data-bronto-theme-toggle]').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const unsafeTransitions = await page
        .locator('#app .ui-button, #app .exam-card')
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            const properties = getComputedStyle(element)
              .transitionProperty.split(',')
              .map((property) => property.trim());
            const unsafe = properties.filter((property) =>
              ['all', 'color', 'background', 'background-color'].includes(property),
            );
            return unsafe.map((property) => `${element.className}: ${property}`);
          }),
        );
      expect(unsafeTransitions, 'theme-sensitive surfaces must switch atomically').toEqual([]);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});
