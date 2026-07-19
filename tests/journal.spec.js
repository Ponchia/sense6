import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const storedJournal = JSON.stringify({
  format: 'sense6-journal',
  schemaVersion: 1,
  entries: [run('latest', '2026-07-19T12:00:00.000Z', 73), run('earlier', '2026-07-18T12:00:00.000Z', 70)],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((journal) => localStorage.setItem('sense6:journal', journal), storedJournal);
});

test('the local journal compares, filters, exports, and deletes runs accessibly', async ({ page }) => {
  await page.goto('/en/journal/');
  await expect(page.getByRole('heading', { name: 'Your private measurement journal' })).toBeVisible();
  await expect(page.locator('[data-journal-entry]')).toHaveCount(2);
  await expect(page.getByText('Comparable', { exact: true })).toBeVisible();
  await expect(page.getByText(/Change \+3 \/100/)).toBeVisible();
  await expect(page.getByText('100x100@1', { exact: true })).toHaveCount(2);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export journal' }).click();
  expect((await download).suggestedFilename()).toMatch(/^sense6-journal-/);

  await page.getByLabel('Show instrument').selectOption('udito');
  await expect(page.getByRole('heading', { name: 'No recorded runs yet' })).toBeVisible();
  await page.getByLabel('Show instrument').selectOption('all');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-journal-entry="latest"]').getByRole('button', { name: 'Delete run' }).click();
  await expect(page.locator('[data-journal-entry]')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('journal data recorded in another locale remains readable through localized controls', async ({
  page,
}) => {
  await page.goto('/it/journal/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('heading', { name: 'Il tuo diario privato delle misurazioni' })).toBeVisible();
  await expect(page.getByLabel('Mostra strumento')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tetracromia' })).toHaveCount(2);
  await expect(page.getByText('Indice della sessione', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Schermo', { exact: true })).toHaveCount(2);
});

function run(id, recordedAt, value) {
  return {
    id,
    examId: 'tetracromia',
    recordedAt,
    locale: 'en',
    quality: 'usable',
    setup: { display: '100x100@1', viewport: '800x600', gamut: 'srgb' },
    measurements: [{ id: 'overall', value, unit: '/100' }],
    notes: [],
  };
}
