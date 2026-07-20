import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAllowedMetric,
  isProductionMetricOrigin,
  METRIC_EVENTS,
  METRIC_TESTS,
  PRODUCTION_METRIC_ORIGIN,
  sendMetric,
} from '../src/metrics.js';

const PRODUCTION_LOCATION = { origin: PRODUCTION_METRIC_ORIGIN };

test('the metric allowlist accepts only defined event and test pairs', () => {
  assert.equal(isAllowedMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.udito), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.acutezza), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.udito), false);
  assert.equal(isAllowedMetric('answer_submitted', METRIC_TESTS.udito), false);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testCompleted, 'unknown'), false);
});

test('sendMetric sends a credential-free, no-referrer request', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true };
  };

  const sent = await sendMetric(
    METRIC_EVENTS.testStarted,
    METRIC_TESTS.riflessi,
    fetchImpl,
    PRODUCTION_LOCATION,
  );

  assert.equal(sent, true);
  assert.equal(capturedUrl, '/api/metric');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.credentials, 'omit');
  assert.equal(capturedOptions.referrerPolicy, 'no-referrer');
  assert.equal(capturedOptions.cache, 'no-store');
  assert.equal(capturedOptions.keepalive, true);
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    event: METRIC_EVENTS.testStarted,
    test: METRIC_TESTS.riflessi,
  });
});

test('sendMetric ignores invalid metrics and transport failures', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    throw new Error('offline');
  };

  assert.equal(await sendMetric('unknown', METRIC_TESTS.site, fetchImpl, PRODUCTION_LOCATION), false);
  assert.equal(requests, 0);
  assert.equal(
    await sendMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site, fetchImpl, PRODUCTION_LOCATION),
    false,
  );
  assert.equal(requests, 1);
});

test('metrics stay disabled away from the canonical production origin', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return { ok: true };
  };

  assert.equal(isProductionMetricOrigin(PRODUCTION_LOCATION), true);
  assert.equal(isProductionMetricOrigin({ origin: 'https://pr-33.sense6.pages.dev' }), false);
  assert.equal(
    await sendMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site, fetchImpl, {
      origin: 'https://pr-33.sense6.pages.dev',
    }),
    false,
  );
  assert.equal(requests, 0);
});
