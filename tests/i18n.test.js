import assert from 'node:assert/strict';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { DEFAULT_LOCALE, LOCALES, loadMessages } from '../src/locales.js';

test('the supported European locale set has complete catalog keys', async () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(
    LOCALES.map((locale) => locale.code),
    ['en', 'it', 'de', 'fr', 'es', 'pt'],
  );
  const catalogs = Object.fromEntries(
    await Promise.all(LOCALES.map(async ({ code }) => [code, await loadMessages(code)])),
  );
  const englishKeys = [...catalogs.en.keys()];
  assert.ok(englishKeys.length >= 500);
  for (const { code } of LOCALES) {
    const module = await import(`../src/locales/${code}.js`);
    assert.equal(module.MESSAGE_COUNT, catalogs[code].size, `${code} contains duplicate source phrases`);
    assert.equal(catalogs[code].size, englishKeys.length);
    for (const key of englishKeys) {
      const value = catalogs[code].get(key);
      assert.equal(typeof value, 'string');
      assert.ok(value.trim(), `${code} translation is empty for ${key}`);
      assert.deepEqual(
        [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort(),
        [...key.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort(),
        `${code} placeholders differ for ${key}`,
      );
    }
  }
});

test('critical navigation and safety copy exists in every language', async () => {
  const keys = [
    'All tests',
    'Language',
    'Never raise volume to chase a missing high tone. Stop immediately for discomfort, pain, pressure, or ringing.',
    'An RGB screen cannot test tetrachromacy.',
    'No gap visible',
    'Compare conditions, not people.',
    'This is not vision screening, diagnosis, or a prescription.',
    'Sudden vision loss, severe eye pain, new flashes or floaters, or a curtain-like shadow needs prompt professional assessment.',
  ];
  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const key of keys) assert.ok(messages.get(key));
  }
});

test('every registry field used by static pages is explicitly localized', async () => {
  const sources = EXAMS.flatMap((exam) => [
    exam.tagline,
    exam.blurb,
    exam.category,
    ...exam.facts,
    exam.pageTitle,
    exam.limit,
  ]).concat(['Open test', 'What this test includes', 'Method and limits', 'Research trail']);

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const source of sources) assert.ok(messages.has(source), `${code} is missing: ${source}`);
  }
});
