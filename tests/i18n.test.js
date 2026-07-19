import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LOCALE, LOCALES, MESSAGE_COUNT, MESSAGES } from '../src/locales.js';

test('the supported European locale set has complete catalog keys', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(
    LOCALES.map((locale) => locale.code),
    ['en', 'it', 'de', 'fr', 'es', 'pt'],
  );
  const englishKeys = [...MESSAGES.en.keys()];
  assert.ok(englishKeys.length >= 500);
  assert.equal(MESSAGE_COUNT, englishKeys.length, 'English source phrases must be unique');
  for (const { code } of LOCALES) {
    assert.equal(MESSAGES[code].size, englishKeys.length);
    for (const key of englishKeys) {
      const value = MESSAGES[code].get(key);
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

test('critical navigation and safety copy exists in every language', () => {
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
    for (const key of keys) assert.ok(MESSAGES[code].get(key));
  }
});
