import { expect, test } from '@playwright/test';

test('experiment research sections link to the matching explanation @pr-smoke', async ({ page }) => {
  for (const [experiment, guide] of [
    ['tetracromia', 'tetrachromacy-guide'],
    ['color-blindness', 'color-blindness-guide'],
    ['riflessi', 'reaction-time-guide'],
  ]) {
    await page.goto(`/en/${experiment}/`);
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', experiment);
    const link = page.locator('.experiment-guide-link a');
    await expect(link).toHaveAttribute('href', `/en/${guide}/`);
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/en/${guide}/$`));
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', guide);
  }
  await page.goto('/it/riflessi/');
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'riflessi');
  const italianResearch = page.locator('.experiment-guide-link a');
  await expect(italianResearch).toHaveAttribute('href', '/it/reaction-time-guide/');
  await expect(italianResearch).toContainText('tempi di reazione');
  await italianResearch.click();
  await expect(page).toHaveURL(/\/it\/reaction-time-guide\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'reaction-time-guide');
});
