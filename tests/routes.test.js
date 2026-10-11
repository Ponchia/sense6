import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCALES, openGraphLocale } from '../src/locale-metadata.js';
import { createRouteMetadata } from '../src/routes.js';

test('route metadata derives one canonical and social identity record', () => {
  assert.deepEqual(
    createRouteMetadata({
      locale: 'it',
      route: 'acutezza',
      title: 'Acutezza',
      description: 'Descrizione',
      socialImage: '/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
    }),
    {
      locale: 'it',
      route: 'acutezza',
      path: '/it/acutezza/',
      title: 'Acutezza',
      description: 'Descrizione',
      canonical: 'https://sense6.net/it/acutezza/',
      socialImage: 'https://sense6.net/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
      indexable: true,
    },
  );
});

test('each published language has one explicit social preview locale', () => {
  const used = new Set();
  for (const { code } of LOCALES) {
    const locale = openGraphLocale(code);
    assert.match(locale, /^[a-z]{2}_[A-Z]{2}$/);
    assert.ok(!used.has(locale), `${code} has a distinct Open Graph language`);
    used.add(locale);
  }
  assert.equal(openGraphLocale('unknown'), 'en_US');
  assert.equal(openGraphLocale('pt-br'), 'pt_BR');
  assert.equal(openGraphLocale('zh-hans'), 'zh_CN');
});
