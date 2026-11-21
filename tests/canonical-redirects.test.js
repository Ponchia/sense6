import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SEARCH_ROUTES } from '../audits/routes.js';
import { assertNoNormalizedSelfRedirects } from '../scripts/canonical-redirects.mjs';

test('the reviewed locale aliases remain valid without adding canonical slash redirects', async () => {
  const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  assert.doesNotThrow(() => assertNoNormalizedSelfRedirects(redirects));
  assert.match(redirects, /^\/pt-BR\/\* \/pt-br\/:splat 301$/m);
  assert.match(redirects, /^\/zh-CN\/\* \/zh-hans\/:splat 301$/m);
});

test('slash aliases of every published page fail before an edge can redirect its canonical path', () => {
  for (const path of SEARCH_ROUTES.filter((path) => path !== '/')) {
    assert.throws(
      () => assertNoNormalizedSelfRedirects(`${path}/ ${path} 301`),
      /normalized self redirect/,
      path,
    );
  }
  assert.throws(
    () =>
      assertNoNormalizedSelfRedirects(
        '/education//browser-reaction-time// /education/browser-reaction-time/ 301',
      ),
    /normalized self redirect/,
  );
});

test('normalized wildcard self redirects fail while real route and host moves remain valid', () => {
  for (const rule of ['/en//* /en/:splat 301', '/en/ /en/ 302', '/en/./ /en/ 308']) {
    assert.throws(() => assertNoNormalizedSelfRedirects(rule), /normalized self redirect/);
  }
  assert.doesNotThrow(() =>
    assertNoNormalizedSelfRedirects(
      '# Reviewed redirects\n/old/* /en/:splat 301\nhttps://www.sense6.net/* https://sense6.net/:splat 301\n',
    ),
  );
});
