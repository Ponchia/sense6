import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  for (const tone of [null, 'success', 'danger']) {
    test(`${theme} ${tone ?? 'neutral'} toast retains contrast throughout motion @pr-smoke`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/en/acutezza/');
      await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'acutezza');
      await page.evaluate(
        async ({ theme, tone }) => {
          await document.fonts.ready;
          if (document.documentElement.dataset.theme !== theme) {
            document.querySelector('[data-bronto-theme-toggle]').click();
          }
          const { toast } = await import('/node_modules/@ponchia/ui/behaviors/toast.js');
          window.__sense6TestDismissToast = toast('Result summary copied.', { tone, duration: 0 });
          await new Promise(requestAnimationFrame);
          const element = document.querySelector('.ui-toast');
          for (const animation of element.getAnimations()) {
            animation.pause();
            animation.currentTime = 0;
          }
        },
        { theme, tone },
      );
      const toast = page.locator('.ui-toast');
      await expect(toast).toBeVisible();
      for (const progress of [0, 0.5, 1]) {
        const opacity = await toast.evaluate((element, progress) => {
          for (const animation of element.getAnimations()) {
            animation.currentTime = animation.effect.getComputedTiming().endTime * progress;
          }
          return getComputedStyle(element).opacity;
        }, progress);
        expect(opacity, `Toast text must not fade through low contrast at ${progress}`).toBe('1');
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      }
      const leaving = await page.evaluate(() => {
        const element = document.querySelector('.ui-toast');
        for (const animation of element.getAnimations()) animation.finish();
        window.__sense6TestDismissToast();
        const animations = element.getAnimations();
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = animation.effect.getComputedTiming().endTime / 2;
        }
        const result = { connected: element.isConnected, opacity: getComputedStyle(element).opacity };
        // Finish in the same evaluation so the genuine fallback timer cannot
        // remove the toast while a test is artificially holding its exit.
        for (const animation of animations) animation.finish();
        return result;
      });
      expect(leaving).toEqual({ connected: true, opacity: '1' });
      await expect(toast).toHaveCount(0);
      await expect(page.locator('.ui-toast-stack')).toHaveAttribute(
        'aria-live',
        tone === 'danger' ? 'assertive' : 'polite',
      );
    });
  }
}

test('reduced-motion feedback remains readable and dismisses immediately @pr-smoke', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/acutezza/');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'acutezza');
  await page.evaluate(async () => {
    const { toast } = await import('/node_modules/@ponchia/ui/behaviors/toast.js');
    window.__sense6TestDismissToast = toast('Result summary copied.', { duration: 0 });
    await new Promise(requestAnimationFrame);
  });
  await expect(page.locator('.ui-toast')).toBeVisible();
  expect(await page.locator('.ui-toast').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await page.evaluate(() => window.__sense6TestDismissToast());
  await expect(page.locator('.ui-toast')).toHaveCount(0);
  await expect(page.locator('.ui-toast-stack')).toHaveAttribute('aria-live', 'polite');
});
