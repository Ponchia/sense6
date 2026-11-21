import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const path = '/en/browser-timing-explorer/';

test('timing examples support keyboard changes, private links and a printable activity @pr-smoke', async ({
  page,
}) => {
  await page.goto(`${path}?metrics=off`);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'browser-timing-explorer');
  await expect(page.locator('[data-timing-total="a"]')).toHaveText('248 ms');
  await expect(page.locator('[data-timing-total="b"]')).toHaveText('232 ms');

  await page.locator('[data-timing-control="a-hz"]').selectOption('144');
  await expect(page.locator('[data-timing-refresh="a"]')).toContainText('6.94 ms');
  await expect(page.locator('[data-timing-total="a"]')).toHaveText('248 ms');
  await page.locator('[data-timing-control="b-input"]').focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-timing-total="b"]')).toHaveText('328 ms');
  await expect(page.locator('[data-timing-sheet="b-total"]')).toHaveText('328');
  await page.locator('[data-timing-share]').click();
  const link = new URL(await page.locator('[data-timing-share-link]').inputValue());
  expect(link.origin).toBe('https://sense6.net');
  expect(link.pathname).toBe(path);
  expect([...link.searchParams.keys()]).toEqual(['response', 'ad', 'ai', 'ahz', 'bd', 'bi', 'bhz']);
  expect(link.searchParams.get('bi')).toBe('100');
  expect(link.searchParams.has('metrics')).toBe(false);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://sense6.net${path}`);

  await page.locator('[data-timing-reset]').click();
  await expect(page.locator('[data-timing-total="b"]')).toHaveText('232 ms');
  await expect(page.locator('[data-timing-share-link]')).toBeHidden();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#timing-activity')).toBeVisible();
  await expect(page.locator('#timing-comparison')).toBeHidden();
  await expect(page.locator('[data-timing-print]')).toBeHidden();
  await expect(page.locator('.timing-explorer__print-source')).toBeVisible();
});

test('shared examples restore safely and navigation does not invent translations or retain tool schema @pr-smoke', async ({
  page,
}) => {
  await page.goto(`${path}?response=220&ad=16&ai=12&ahz=60&bd=8&bi=20&bhz=120`);
  await expect(page.locator('[data-timing-total="b"]')).toHaveText('248 ms');
  await expect(page.locator('[data-timing-status]')).toContainText('Shared hypothetical example loaded');
  await expect(page.locator('link[hreflang]')).toHaveCount(0);
  await page.locator('.timing-explorer__breadcrumb [data-sense6-route="learn"]').click();
  await expect(page).toHaveURL(/\/en\/learn\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'learn');
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schema.join('')).not.toContain('Browser timing explorer');
  await page.locator('[data-sense6-route="browser-timing-explorer"]').click();
  await expect(page.locator('[data-timing-total="b"]')).toHaveText('232 ms');
  await page.locator('[data-locale-select]').selectOption('it');
  await expect(page).toHaveURL(/\/it\/$/);
  await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'gallery');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');

  await page.goto(`${path}?response=220&ad=bad`);
  await expect(page.locator('[data-timing-total="a"]')).toHaveText('248 ms');
  await expect(page.locator('[data-timing-status]')).toContainText('invalid or incomplete settings');
});
