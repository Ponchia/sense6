import assert from 'node:assert/strict';
import test from 'node:test';

import { EXAMS } from '../src/exams/registry.js';
import {
  isAllowedMetric,
  isLoopbackMetricOrigin,
  isProductionMetricOrigin,
  METRIC_EVENTS,
  METRIC_TESTS,
  PRODUCTION_METRIC_ORIGIN,
  sendMetric,
} from '../src/metrics.js';

const PRODUCTION_LOCATION = { origin: PRODUCTION_METRIC_ORIGIN };

test('the metric allowlist accepts only defined event and test pairs', () => {
  assert.equal(isAllowedMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testViewed, METRIC_TESTS.tetracromia), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.udito), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.acutezza), true);
  assert.equal(isAllowedMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.udito), false);
  assert.equal(isAllowedMetric(METRIC_EVENTS.testViewed, METRIC_TESTS.site), false);
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

test('the development origin guard accepts only actual HTTP localhost and IPv4 loopback origins', () => {
  for (const origin of [
    'http://localhost',
    'http://localhost:4173',
    'http://localhost:4543',
    'http://127.0.0.1',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:4543',
    'http://127.0.0.1:65535',
  ]) {
    assert.equal(isLoopbackMetricOrigin({ origin }), true, origin);
  }

  for (const origin of [
    '',
    'null',
    'not a URL',
    'https://localhost:4543',
    'https://127.0.0.1:4543',
    'http://localhost.example:4543',
    'http://127.0.0.1.example:4543',
    'http://localhost@external.example:4543',
    'http://external.example@localhost:4543',
    'http://localhost:4543/path',
    'http://localhost:4543?query',
    'http://localhost:4543#fragment',
    'http://localhost:65536',
    'http://localhost:invalid',
    'http://localhost.:4543',
    'http://127.1:4543',
    'http://[::1]:4543',
    'http://192.168.1.2:4543',
    PRODUCTION_METRIC_ORIGIN,
  ]) {
    assert.equal(isLoopbackMetricOrigin({ origin }), false, origin);
  }
  assert.equal(isLoopbackMetricOrigin({}), false);
  assert.equal(isLoopbackMetricOrigin(undefined), false);
});

test('metrics stay disabled outside production without a development build', async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return { ok: true };
  };

  assert.equal(isProductionMetricOrigin(PRODUCTION_LOCATION), true);
  for (const origin of [
    'https://pr-33.sense6.pages.dev',
    'http://localhost',
    'http://localhost:4173',
    'http://localhost:4543',
    'http://127.0.0.1:4543',
    'http://localhost.example:4543',
    'https://sense6.net.example',
    'http://sense6.net',
  ]) {
    assert.equal(isProductionMetricOrigin({ origin }), false, origin);
    assert.equal(
      await sendMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site, fetchImpl, { origin }),
      false,
      origin,
    );
  }
  assert.equal(requests, 0);
});

test('every experiment route maps to an allowed anonymous metric identity', () => {
  for (const exam of EXAMS) {
    assert.equal(
      isAllowedMetric(METRIC_EVENTS.testViewed, exam.metricTest),
      true,
      `${exam.route} must resolve to its approved metric key`,
    );
  }
  const daltonia = EXAMS.find((exam) => exam.id === 'color-blindness');
  assert.equal(daltonia?.metricTest, METRIC_TESTS.daltonia);
  assert.equal(METRIC_TESTS['color-blindness'], undefined);
});
