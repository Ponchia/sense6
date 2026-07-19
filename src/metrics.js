export const METRIC_EVENTS = Object.freeze({
  siteLoaded: 'site_loaded',
  testStarted: 'test_started',
  testCompleted: 'test_completed',
  reportDownloaded: 'report_downloaded',
});

export const METRIC_TESTS = Object.freeze({
  site: 'site',
  tetracromia: 'tetracromia',
  daltonia: 'daltonia',
  riflessi: 'riflessi',
  udito: 'udito',
});

const ALLOWED_PAIRS = new Set([
  `${METRIC_EVENTS.siteLoaded}:${METRIC_TESTS.site}`,
  ...Object.values(METRIC_TESTS)
    .filter((test) => test !== METRIC_TESTS.site)
    .flatMap((test) => [
      `${METRIC_EVENTS.testStarted}:${test}`,
      `${METRIC_EVENTS.testCompleted}:${test}`,
      `${METRIC_EVENTS.reportDownloaded}:${test}`,
    ]),
]);

export function isAllowedMetric(event, test) {
  return ALLOWED_PAIRS.has(`${event}:${test}`);
}

export async function sendMetric(event, test, fetchImpl = globalThis.fetch) {
  if (!isAllowedMetric(event, test) || typeof fetchImpl !== 'function') return false;

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

export function trackMetric(event, test) {
  void sendMetric(event, test);
}
