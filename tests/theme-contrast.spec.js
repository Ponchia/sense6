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
