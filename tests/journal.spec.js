import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { journalCopy, prepareJournalCopy } from '../src/journal-copy.js';
import { localeMetadata } from '../src/locales.js';

const storedJournal = JSON.stringify({
  format: 'sense6-journal',
  schemaVersion: 1,
  entries: [run('latest', '2026-07-19T12:00:00.000Z', 73), run('earlier', '2026-07-18T12:00:00.000Z', 70)],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((journal) => {
    const override = sessionStorage.getItem('sense6:test-journal-override');
    localStorage.setItem('sense6:journal', override ?? journal);
  }, storedJournal);
});

test('the local journal compares, filters, exports, and deletes runs accessibly', async ({ page }) => {
  await page.goto('/en/journal/');
  await expect(page.getByRole('heading', { name: 'Your private measurement journal' })).toBeVisible();
  await expect(page.locator('[data-journal-entry]')).toHaveCount(2);
  await expect(page.getByText('Not comparable', { exact: true })).toBeVisible();
  await expect(page.getByText(/different or legacy experiment protocols/i)).toBeVisible();
  await expect(page.getByText(/local deduplication/i)).toBeVisible();
  await expect(page.getByText(/^Change /)).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: /Laboratorio colore su schermo/i })).toHaveCount(2);
  await expect(page.getByText('Indice della sessione', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Schermo', { exact: true })).toHaveCount(2);
});

test('the added locales render portable journal entries without fallback or overflow', async ({ page }) => {
  for (const locale of ['pt-br', 'ar', 'ja', 'ko', 'hi', 'zh-hans']) {
    await prepareJournalCopy(locale);
    const metadata = localeMetadata(locale);
    await page.goto(`/${locale}/journal/`);
    await expect(page.locator('html')).toHaveAttribute('lang', metadata.languageTag);
    await expect(page.locator('html')).toHaveAttribute('dir', metadata.direction);
    await expect(page.getByRole('heading', { name: journalCopy(locale).title })).toBeVisible();
    await expect(page.locator('[data-journal-entry]')).toHaveCount(2);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      )
      .toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('journal import previews every outcome and writes only after confirmation @pr-smoke', async ({ page }) => {
  await page.goto('/en/journal/');
  const before = await page.evaluate(() => localStorage.getItem('sense6:journal'));
  const source = JSON.stringify({
    format: 'sense6-journal-export',
    schemaVersion: 1,
    entries: [run('previewed-import', '2026-07-20T12:00:00.000Z', 80)],
  });
  const input = page.locator('[data-journal-import]');
  const previewDialogPromise = page.waitForEvent('dialog');
  const previewUploadPromise = input.setInputFiles({
    name: 'journal.json',
    mimeType: 'application/json',
    buffer: Buffer.from(source),
  });
  const previewDialog = await previewDialogPromise;
  expect(previewDialog.message()).toBe(
    'Import preview: 1 additions, 0 duplicates, 0 discarded additions, 0 existing entries evicted, 3 entries after import. Continue?',
  );
  await previewDialog.dismiss();
  await previewUploadPromise;
  expect(await page.evaluate(() => localStorage.getItem('sense6:journal'))).toBe(before);
  await expect(page.locator('[data-journal-entry="previewed-import"]')).toHaveCount(0);

  const confirmationDialogPromise = page.waitForEvent('dialog');
  const confirmedUploadPromise = input.setInputFiles({
    name: 'journal.json',
    mimeType: 'application/json',
    buffer: Buffer.from(source),
  });
  const confirmationDialog = await confirmationDialogPromise;
  await confirmationDialog.accept();
  await confirmedUploadPromise;
  await expect(page.locator('[data-journal-entry="previewed-import"]')).toBeVisible();
  await expect(page.locator('[data-journal-entry]')).toHaveCount(3);
});

test('unreadable journals remain recoverable until a failure-specific clear is confirmed', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const cases = [
    { status: 'malformed', raw: '{', confirmation: /malformed journal data/i },
    {
      status: 'oversized',
      raw: 'x'.repeat(1_000_001),
      confirmation: /oversized journal data/i,
    },
    {
      status: 'future-schema',
      raw: JSON.stringify({ format: 'sense6-journal', schemaVersion: 99, entries: [] }),
      confirmation: /newer-schema journal data/i,
    },
  ];

  await page.goto('/en/');
  for (const recoveryCase of cases) {
    await page.evaluate(
      ({ raw }) => sessionStorage.setItem('sense6:test-journal-override', raw),
      recoveryCase,
    );
    await page.goto('/en/journal/');
    await expect(page.locator('#app')).toHaveAttribute('data-sense6-hydrated', 'journal');
    await expect(page.locator('[data-journal-recovery]')).toHaveAttribute(
      'data-journal-recovery',
      recoveryCase.status,
    );
    await expect(page.locator('[data-journal-raw-backup]')).toBeVisible();
    await expect(page.locator('[data-journal-recovery-clear]')).toBeVisible();

    const dialogPromise = page.waitForEvent('dialog');
    const recoveryAction = page.locator('[data-journal-recovery-clear]').click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(recoveryCase.confirmation);
    await dialog.dismiss();
    await recoveryAction;
    await expect(page.locator('[data-journal-recovery]')).toHaveAttribute(
      'data-journal-recovery',
      recoveryCase.status,
    );
    expect(await page.evaluate(() => localStorage.getItem('sense6:journal'))).toBe(recoveryCase.raw);
  }

  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-journal-raw-backup]').click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^sense6-journal-raw-backup-/);

  const clearDialogPromise = page.waitForEvent('dialog');
  const clearAction = page.locator('[data-journal-recovery-clear]').click();
  await (await clearDialogPromise).accept();
  await clearAction;
  await expect(page.locator('[data-journal-recovery]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No recorded runs yet' })).toBeVisible();
});

test('an inaccessible journal does not offer backup or destructive recovery', async ({ page }) => {
  await page.goto('/en/');
  await page.evaluate(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage access denied');
      },
    });
  });
  await page.getByRole('link', { name: 'Journal', exact: true }).click();

  await expect(page.locator('[data-journal-recovery]')).toHaveAttribute(
    'data-journal-recovery',
    'inaccessible',
  );
  await expect(page.locator('[data-journal-raw-backup]')).toHaveCount(0);
  await expect(page.locator('[data-journal-recovery-clear]')).toHaveCount(0);
});

test('a deferred journal file read cannot write or render after route disposal', async ({ page }) => {
  await page.goto('/en/journal/');
  await expect(page.locator('[data-journal-import]')).toBeAttached();
  const before = await page.evaluate(() => localStorage.getItem('sense6:journal'));
  const importedJournal = JSON.stringify({
    format: 'sense6-journal',
    schemaVersion: 1,
    entries: [run('deferred-import', '2026-07-20T12:00:00.000Z', 76)],
  });

  await page.evaluate((source) => {
    let resolveText;
    const pendingText = new Promise((resolve) => {
      resolveText = resolve;
    });
    const file = new File([source], 'journal.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => {
        window.__deferredJournalTextStarted = true;
        return pendingText;
      },
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector('[data-journal-import]');
    Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    window.__resolveDeferredJournalText = async () => {
      resolveText(source);
      await pendingText;
      await Promise.resolve();
    };
  }, importedJournal);
  await expect.poll(() => page.evaluate(() => window.__deferredJournalTextStarted)).toBe(true);

  await page.locator('.journal-view .back-link').click();
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await page.evaluate(() => window.__resolveDeferredJournalText());

  expect(await page.evaluate(() => localStorage.getItem('sense6:journal'))).toBe(before);
  await expect(page.getByRole('heading', { name: /Measure what your senses notice/i })).toBeVisible();
  await expect(page.locator('[data-journal-entry="deferred-import"]')).toHaveCount(0);
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
