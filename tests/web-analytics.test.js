import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startWebAnalytics, WEB_ANALYTICS_ORIGIN, WEB_ANALYTICS_SITE } from '../src/web-analytics.js';

function fakeDocument() {
  const scripts = [];
  return {
    scripts,
    querySelector: (query) => (query === 'script[data-cf-beacon]' ? (scripts[0] ?? null) : null),
    createElement(name) {
      assert.equal(name, 'script');
      return { dataset: {} };
    },
    head: {
      append(script) {
        scripts.push(script);
      },
    },
  };
}

test('only the exact canonical site loads web analytics, never previews or localhost', () => {
  for (const hostname of [
    '',
    'localhost',
    '127.0.0.1',
    'preview.sense6.net',
    'sense6.pages.dev',
    'other-sense6.net',
  ]) {
    const document = fakeDocument();
    assert.equal(startWebAnalytics({ hostname, document }), false, hostname);
    assert.equal(document.scripts.length, 0);
  }
});

test('a production page loads exactly one Cloudflare RUM beacon and no custom test events', () => {
  const document = fakeDocument();
  assert.equal(startWebAnalytics({ hostname: WEB_ANALYTICS_SITE, document }), true);
  assert.equal(startWebAnalytics({ hostname: WEB_ANALYTICS_SITE, document }), false);
  assert.equal(document.scripts.length, 1);
  assert.equal(document.scripts[0].src, WEB_ANALYTICS_ORIGIN);
  assert.equal(document.scripts[0].type, 'module');
  const options = JSON.parse(document.scripts[0].dataset.cfBeacon);
  assert.match(options.token, /^[a-f0-9]{32}$/);
  assert.equal(options.spa, true);
  assert.deepEqual(Object.keys(options).sort(), ['spa', 'token']);
});
