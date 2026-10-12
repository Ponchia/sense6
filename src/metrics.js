import { METRIC_TEST_IDS } from './exams/contracts.js';

export const METRIC_EVENTS = Object.freeze({
  siteLoaded: 'site_loaded',
  testViewed: 'test_viewed',
  testStarted: 'test_started',
  testCompleted: 'test_completed',
  reportDownloaded: 'report_downloaded',
});

export const METRIC_TESTS = Object.freeze({
  site: 'site',
  ...Object.fromEntries(METRIC_TEST_IDS.map((metricTest) => [metricTest, metricTest])),
});

export const PRODUCTION_METRIC_ORIGIN = 'https://sense6.net';

const ALLOWED_PAIRS = new Set([
  `${METRIC_EVENTS.siteLoaded}:${METRIC_TESTS.site}`,
  ...Object.values(METRIC_TESTS)
    .filter((test) => test !== METRIC_TESTS.site)
    .flatMap((test) => [
      `${METRIC_EVENTS.testViewed}:${test}`,
      `${METRIC_EVENTS.testStarted}:${test}`,
      `${METRIC_EVENTS.testCompleted}:${test}`,
      `${METRIC_EVENTS.reportDownloaded}:${test}`,
    ]),
]);

/** @param {string} event @param {string} test */
export function isAllowedMetric(event, test) {
  return ALLOWED_PAIRS.has(`${event}:${test}`);
}

/** @param {{ origin?: string } | undefined} location */
export function isProductionMetricOrigin(location = globalThis.location) {
  return location?.origin === PRODUCTION_METRIC_ORIGIN;
}

/** @param {{ origin?: string } | undefined} location */
export function isLoopbackMetricOrigin(location) {
  if (!location?.origin) return false;
  try {
    const url = new URL(location.origin);
    return (
      url.origin === location.origin &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/** @param {{ origin?: string } | undefined} location */
function isMetricTransportEnabled(location) {
  if (isProductionMetricOrigin(location)) return true;
  return import.meta.env?.DEV === true && isLoopbackMetricOrigin(location);
}

/**
 * @param {string} event
 * @param {string} test
 * @param {typeof fetch} [fetchImpl]
 * @param {{ origin?: string }} [location]
 */
export async function sendMetric(event, test, fetchImpl = globalThis.fetch, location = globalThis.location) {
  if (!isMetricTransportEnabled(location) || !isAllowedMetric(event, test) || typeof fetchImpl !== 'function')
    return false;

  try {
    const response = await fetchImpl('/api/metric', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, test }),
      cache: 'no-store',
      credentials: 'omit',
      keepalive: true,
      referrerPolicy: 'no-referrer',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** @param {string} event @param {string} test */
export function trackMetric(event, test) {
  void sendMetric(event, test);
}
