import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalResultUrl, resultActionLabel, shareOrCopyResult } from '../src/lib/result-sharing.js';

test('canonical result links retain locale and experiment route', () => {
  assert.equal(canonicalResultUrl('color-blindness', 'pt-br'), 'https://sense6.net/pt-br/color-blindness/');
  assert.throws(() => canonicalResultUrl('../privacy', 'en'), /URL-safe slugs/);
});

test('the result action describes the available platform behavior', () => {
  const translate = (value) => `translated:${value}`;
  assert.equal(resultActionLabel(translate, 'Copy run summary', {}), 'translated:Copy run summary');
  assert.equal(
    resultActionLabel(translate, 'Copy run summary', { share: async () => {} }),
    'translated:Share result',
  );
});

test('native sharing receives a canonical URL without touching the clipboard', async () => {
  let shared;
  let copied = '';
  const outcome = await shareOrCopyResult({
    title: 'Riflessi',
    summary: 'Device-relative result',
    route: 'riflessi',
    locale: 'it',
    browserNavigator: {
      share: async (data) => {
        shared = data;
      },
      clipboard: { writeText: async (value) => (copied = value) },
    },
  });

  assert.equal(outcome, 'shared');
  assert.deepEqual(shared, {
    title: 'Riflessi',
    text: 'Device-relative result',
    url: 'https://sense6.net/it/riflessi/',
  });
  assert.equal(copied, '');
});

test('clipboard fallback includes the canonical result page', async () => {
  let copied = '';
  const outcome = await shareOrCopyResult({
    title: 'Udito',
    summary: 'Listening observation',
    route: 'udito',
    locale: 'en',
    browserNavigator: { clipboard: { writeText: async (value) => (copied = value) } },
  });

  assert.equal(outcome, 'copied');
  assert.equal(copied, 'Listening observation\nhttps://sense6.net/en/udito/');
});

test('a cancelled native share does not copy behind the user’s back', async () => {
  let copied = false;
  const abort = new Error('cancelled');
  abort.name = 'AbortError';
  const outcome = await shareOrCopyResult({
    title: 'Acutezza',
    summary: 'Sharpness observation',
    route: 'acutezza',
    locale: 'en',
    browserNavigator: {
      share: async () => {
        throw abort;
      },
      clipboard: { writeText: async () => (copied = true) },
    },
  });

  assert.equal(outcome, 'cancelled');
  assert.equal(copied, false);
});
