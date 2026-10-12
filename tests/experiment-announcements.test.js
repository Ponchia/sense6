import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCALES } from '../src/locale-metadata.js';
import { loadMessages } from '../src/locales.js';

const NARRATION_MESSAGES = Object.freeze([
  'Which tile is different?',
  'Response recorded.',
  'Session complete',
  'Where is the clear gap?',
  'Where is the gap?',
]);

test('screen reader task notices are present in all experiment language catalogs', async () => {
  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const source of NARRATION_MESSAGES) {
      const translated = messages.get(source);
      assert.ok(translated?.trim(), code + ' is missing ' + source + ' narration');
      if (code !== 'en') {
        assert.notEqual(translated, source, code + ' did not translate ' + source);
      }
    }
  }
});
