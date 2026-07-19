import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequest } from '../functions/api/metric.js';

const ORIGIN = 'https://sense6.net';

function request(payload, headers = {}) {
  return new Request(`${ORIGIN}/api/metric`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'sec-fetch-site': 'same-origin',
      ...headers,
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

function database() {
  const calls = [];
  return {
    calls,
    binding: {
      prepare(sql) {
        const call = { sql, values: null };
        calls.push(call);
        return {
          bind(...values) {
            call.values = values;
            return {
              async run() {
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
}

test('the metric endpoint increments one server-dated aggregate row', async () => {
  const db = database();
  const result = await onRequest({
    request: request({ event: 'test_completed', test: 'udito' }),
    env: { ANALYTICS_DB: db.binding },
  });

  assert.equal(result.status, 204);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /ON CONFLICT/);
  assert.match(db.calls[0].values[0], /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(db.calls[0].values.slice(1), ['udito', 'test_completed']);
});

test('the metric endpoint rejects cross-origin and cross-site requests', async () => {
  const db = database();
  const wrongOrigin = await onRequest({
    request: request({ event: 'site_loaded', test: 'site' }, { origin: 'https://example.com' }),
    env: { ANALYTICS_DB: db.binding },
  });
  const crossSite = await onRequest({
    request: request({ event: 'site_loaded', test: 'site' }, { 'sec-fetch-site': 'cross-site' }),
    env: { ANALYTICS_DB: db.binding },
  });

  assert.equal(wrongOrigin.status, 403);
  assert.equal(crossSite.status, 403);
  assert.equal(db.calls.length, 0);
});

test('the metric endpoint accepts only the exact allowlisted schema', async () => {
  const invalidPayloads = [
    { event: 'answer_submitted', test: 'udito' },
    { event: 'site_loaded', test: 'udito' },
    { event: 'test_started', test: 'unknown' },
    { event: 'test_started', test: 'udito', score: 99 },
  ];

  for (const payload of invalidPayloads) {
    const db = database();
    const result = await onRequest({
      request: request(payload),
      env: { ANALYTICS_DB: db.binding },
    });
    assert.equal(result.status, 400);
    assert.equal(db.calls.length, 0);
  }
});

test('the metric endpoint rejects oversized bodies and missing storage', async () => {
  const tooLarge = await onRequest({
    request: request('x'.repeat(129)),
    env: { ANALYTICS_DB: database().binding },
  });
  const unavailable = await onRequest({
    request: request({ event: 'site_loaded', test: 'site' }),
    env: {},
  });

  assert.equal(tooLarge.status, 413);
  assert.equal(unavailable.status, 503);
});

test('the metric endpoint rejects non-POST methods without touching storage', async () => {
  const db = database();
  const result = await onRequest({
    request: new Request(`${ORIGIN}/api/metric`),
    env: { ANALYTICS_DB: db.binding },
  });

  assert.equal(result.status, 405);
  assert.equal(result.headers.get('allow'), 'POST');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(db.calls.length, 0);
});
