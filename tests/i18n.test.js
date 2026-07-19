import assert from 'node:assert/strict';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { journalCopy, journalSetupLabel } from '../src/journal-copy.js';
import { DEFAULT_LOCALE, LOCALES, loadMessages, localeMetadata, resolveLocale } from '../src/locales.js';
import { privacyCopy } from '../src/privacy.js';

test('the supported global locale set has complete catalog keys', async () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(
    LOCALES.map((locale) => locale.code),
    ['en', 'it', 'de', 'fr', 'es', 'pt', 'pt-br', 'ar', 'ja', 'ko', 'hi', 'zh-hans'],
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
    if (code !== DEFAULT_LOCALE) {
      const untranslated = [...catalogs[code]].filter(([source, value]) => source === value);
      assert.ok(
        untranslated.length <= 25,
        `${code} leaves ${untranslated.length} source phrases untranslated`,
      );
    }
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

test('regional browser locales resolve without collapsing distinct language variants', () => {
  assert.equal(resolveLocale('pt-BR'), 'pt-br');
  assert.equal(resolveLocale('pt-Latn-BR'), 'pt-br');
  assert.equal(resolveLocale('pt-PT'), 'pt');
  assert.equal(resolveLocale('zh-CN'), 'zh-hans');
  assert.equal(resolveLocale('zh-SG'), 'zh-hans');
  assert.equal(resolveLocale('zh-Hans-CN'), 'zh-hans');
  assert.equal(resolveLocale('zh-TW'), null);
  assert.equal(resolveLocale('zh-Hant-TW'), null);
  assert.equal(resolveLocale('ar-EG'), 'ar');
  assert.equal(resolveLocale('ja-JP'), 'ja');
  assert.equal(localeMetadata('ar').direction, 'rtl');
  assert.equal(localeMetadata('pt-br').languageTag, 'pt-BR');
  assert.equal(localeMetadata('zh-hans').languageTag, 'zh-Hans');
});

test('privacy and journal routes have dedicated copy in every supported language', () => {
  const englishPrivacy = privacyCopy('en');
  const englishJournalKeys = Object.keys(journalCopy('en')).sort();
  const setupKeys = [
    'display',
    'viewport',
    'gamut',
    'inputMode',
    'frameCadence',
    'timingHealth',
    'interruptions',
    'device',
    'sampleRate',
    'volumeLockedWithinRun',
    'correction',
    'distanceMm',
    'calibrationState',
    'cardWidthCssPx',
  ];
  for (const { code } of LOCALES) {
    const privacy = privacyCopy(code);
    const journal = journalCopy(code);
    assert.ok(privacy.title);
    assert.deepEqual(
      privacy.sections.map(({ paragraphs }) => paragraphs.length),
      englishPrivacy.sections.map(({ paragraphs }) => paragraphs.length),
      `${code} privacy structure differs from English`,
    );
    assert.ok(journal.title);
    assert.ok(journal.reasonSetup);
    assert.deepEqual(
      Object.keys(journal).sort(),
      englishJournalKeys,
      `${code} journal keys differ from English`,
    );
    for (const key of setupKeys) assert.ok(journalSetupLabel(key, code), `${code} is missing ${key}`);
    if (code === 'en') continue;
    assert.notEqual(privacy.title, englishPrivacy.title, `${code} privacy copy fell back to English`);
    assert.notEqual(journal.title, journalCopy('en').title, `${code} journal copy fell back to English`);
    assert.notEqual(
      journalSetupLabel('display', code),
      journalSetupLabel('display', 'en'),
      `${code} journal setup labels fell back to English`,
    );
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
  ]).concat([
    '≈ {minutes} min',
    'Open test',
    'What this test includes',
    'Method and limits',
    'Research trail',
  ]);

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const source of sources) assert.ok(messages.has(source), `${code} is missing: ${source}`);
  }
});
