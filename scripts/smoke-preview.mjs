const candidate = process.argv[2];
if (!candidate) throw new Error('Usage: node scripts/smoke-preview.mjs <deployment-url>');

const preview = new URL(candidate);
if (preview.protocol !== 'https:' || !preview.hostname.endsWith('.sense6.pages.dev')) {
  throw new Error(`Refusing to smoke-test unexpected preview host: ${preview.origin}`);
}

const route = new URL('/en/tetracromia/', preview);
const page = await fetchReady(route);
const html = await page.text();
if (!page.headers.get('x-robots-tag')?.toLowerCase().includes('noindex')) {
  throw new Error(`Preview is missing X-Robots-Tag: noindex at ${route}`);
}
if (!page.headers.get('content-type')?.includes('text/html') || !html.includes('Sense6')) {
  throw new Error(`Preview did not serve substantive Sense6 HTML at ${route}`);
}

await expectPreviewMetricsClosed(preview);

console.log(`Preview smoke passed: ${route}`);

/** @param {URL} url */
async function fetchReady(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastError;
}

/** @param {URL} preview */
async function expectPreviewMetricsClosed(preview) {
  let status = 0;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const metric = await fetch(new URL('/api/metric', preview), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: preview.origin,
        'sec-fetch-site': 'same-origin',
      },
      body: JSON.stringify({ event: 'site_loaded', test: 'site' }),
    });
    status = metric.status;
    if (status === 403) return;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw new Error(`Preview metrics must fail closed with 403; received ${status}`);
}
