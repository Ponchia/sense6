import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SEARCH_ROUTES } from '../audits/routes.js';
import { renderCanonicalRedirects } from '../scripts/canonical-redirects.mjs';

function rulesFrom(text) {
  return text
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
}

test('observed duplicate URLs and their combined variant redirect directly to the canonical page', () => {
  const rules = rulesFrom(
    renderCanonicalRedirects([
      { path: '/' },
      { path: '/en/' },
      { path: '/en/reaction-time-guide/' },
      { path: '/en/browser-timing-explorer/' },
    ]),
  );
  const destinations = new Map(rules.map(([source, destination]) => [source, destination]));
  assert.equal(destinations.get('/en//'), '/en/');
  assert.equal(destinations.get('/en/reaction-time-guide//'), '/en/reaction-time-guide/');
  assert.equal(destinations.get('/en//reaction-time-guide/'), '/en/reaction-time-guide/');
  assert.equal(destinations.get('/en//reaction-time-guide//'), '/en/reaction-time-guide/');
  assert.equal(destinations.get('/en/browser-timing-explorer//'), '/en/browser-timing-explorer/');
  assert.equal(destinations.has('//'), false);
  assert.equal(destinations.has('/en/'), false);
  assert.equal(destinations.has('/en/reaction-time-guide/'), false);
  assert.equal(destinations.has('/en/missing-page//'), false);
  assert.ok(rules.every(([, destination, status]) => status === '301' && !destination.includes('?')));
});

test('all indexable routes get finite exact aliases, leaving utility and unknown URLs out', () => {
  const canonical = new Set(SEARCH_ROUTES);
  const rules = rulesFrom(renderCanonicalRedirects(SEARCH_ROUTES.map((path) => ({ path }))));
  assert.equal(new Set(rules.map(([source]) => source)).size, rules.length);
  for (const [source, destination, status] of rules) {
    assert.ok(canonical.has(destination), `${source} must target a published canonical route`);
    assert.ok(!canonical.has(source), `${source} must not redirect a canonical request`);
    assert.ok(!source.startsWith('//'), 'sources must remain local absolute paths');
    assert.doesNotMatch(source, /[?*:#]|\/(?:journal|privacy)\//);
    assert.equal(status, '301');
  }
});

test('existing locale aliases retain their contents and follow generated static rules', async () => {
  const existing = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8');
  const rendered = renderCanonicalRedirects([{ path: '/pt-br/riflessi/' }], existing);
  assert.ok(rendered.endsWith(`${existing.trimEnd()}\n`));
  assert.ok(rendered.indexOf('/pt-br/riflessi// /pt-br/riflessi/ 301') < rendered.indexOf('/pt-BR/*'));
  assert.match(rendered, /^\/zh-CN\/\* \/zh-hans\/:splat 301$/m);
});

test('canonical inputs cannot introduce query matching, external targets, or malformed paths', () => {
  for (const path of [
    'https://example.org/en/',
    '//example.org/',
    '/en//',
    '/en',
    '/en/?metrics=off',
    '/en/#guide',
    '/en/%2F/',
    undefined,
  ]) {
    assert.throws(() => renderCanonicalRedirects([{ path }]), /Invalid canonical directory path/);
  }
  assert.equal(
    renderCanonicalRedirects([{ path: '/en/' }, { path: '/en/' }]),
    renderCanonicalRedirects([{ path: '/en/' }]),
  );
});

test('a growing site fails the build before exceeding the hosting redirect limit', () => {
  const tooManyRoutes = Array.from({ length: 667 }, (_, index) => ({ path: `/en/page-${index}/` }));
  assert.throws(() => renderCanonicalRedirects(tooManyRoutes), /static redirect limit/);
  const alreadyFull = Array.from({ length: 2_000 }, (_, index) => `/old-${index}/ /en/ 301`).join('\n');
  assert.throws(() => renderCanonicalRedirects([{ path: '/en/' }], alreadyFull), /static redirect limit/);
  assert.throws(
    () => renderCanonicalRedirects([{ path: `/${'nested/'.repeat(12)}` }]),
    /static redirect limit/,
  );
});
