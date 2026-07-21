const candidate = process.argv[2] ?? 'https://sense6.net';
const expectedCommit = process.argv[3];
const production = new URL(candidate);
if (production.protocol !== 'https:' || production.hostname !== 'sense6.net') {
  throw new Error(`Refusing to smoke-test unexpected production host: ${production.origin}`);
}

if (expectedCommit) await expectCommit(production, expectedCommit);

for (const path of ['/en/', '/en/about/', '/en/udito/']) {
  const route = new URL(path, production);
  const response = await fetchReady(route);
  const html = await response.text();
  if (!response.headers.get('content-type')?.includes('text/html') || !html.includes('Sense6')) {
    throw new Error(`Production did not serve substantive Sense6 HTML at ${route}`);
  }
  if (response.headers.get('x-robots-tag')?.toLowerCase().includes('noindex')) {
    throw new Error(`Production unexpectedly returned noindex at ${route}`);
  }
  assertSecurityHeaders(response, route);
}

const metric = await fetch(new URL('/api/metric', production), {
  method: 'GET',
  headers: { origin: production.origin, 'sec-fetch-site': 'same-origin' },
});
if (metric.status !== 405) {
  throw new Error(`Read-only production metric probe expected 405; received ${metric.status}`);
}

console.log(`Production smoke passed: ${production.origin}`);

async function expectCommit(production, expected) {
  if (!/^[a-f0-9]{40}$/.test(expected)) throw new Error(`Invalid expected commit: ${expected}`);
  let observed = 'missing';
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(new URL(`/build-meta.json?attempt=${attempt}`, production), {
        cache: 'no-store',
      });
      if (response.ok) {
        observed = (await response.json()).commit ?? 'missing';
        if (observed === expected) return;
      }
    } catch (error) {
      observed = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Production exposes commit ${observed}; expected ${expected}`);
}

async function fetchReady(url) {
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
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

function assertSecurityHeaders(response, route) {
  const expected = {
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  };
  for (const [name, value] of Object.entries(expected)) {
    if (response.headers.get(name) !== value) {
      throw new Error(`${route} returned ${name}=${response.headers.get(name) ?? 'missing'}`);
    }
  }
  if (!response.headers.get('strict-transport-security')?.includes('max-age=31536000')) {
    throw new Error(`${route} is missing the production HSTS contract`);
  }
}
