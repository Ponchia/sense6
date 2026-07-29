import { readFile } from 'node:fs/promises';

const candidate = process.argv[2] ?? 'https://sense6.net';
const expectedCommit = process.argv[3];
const production = new URL(candidate);
if (production.protocol !== 'https:' || production.hostname !== 'sense6.net') {
  throw new Error(`Refusing to smoke-test unexpected production host: ${production.origin}`);
}

/**
 * Cloudflare Pages returns from the publish call before every edge location is
 * serving the new bundle. Runs 29904179754 and 30445054721 both started the
 * deployed browser journey about four seconds after publishing, so a red result
 * could not be told apart from "the edge has not caught up" — which made
 * retry-until-green structurally necessary, and therefore made a real
 * regression indistinguishable from propagation noise.
 *
 * Wait for a known condition instead: the deployed HTML must reference the
 * asset hashes built locally, several fetches in a row. Only then is a failing
 * journey unambiguous.
 */
if (expectedCommit) await expectCommit(production, expectedCommit);
await expectAssetPropagation(production);

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

/**
 * Require the deployed HTML to reference the locally built asset hashes on
 * `required` consecutive fetches before any further gate runs.
 * @param {URL} production
 * @param {{ required?: number, attempts?: number, waitMs?: number, probe?: string }} [options]
 */
async function expectAssetPropagation(production, options = {}) {
  const { required = 3, attempts = 30, waitMs = 5_000, probe = '/en/tetracromia/' } = options;
  const expected = await builtAssetPaths();
  if (expected.length === 0) {
    throw new Error('The local dist manifest named no entry assets to wait for');
  }

  let streak = 0;
  let lastFailure = 'no response';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(new URL(`${probe}?propagation=${attempt}`, production), {
        cache: 'no-store',
      });
      const html = response.ok ? await response.text() : '';
      const missing = expected.filter((asset) => !html.includes(asset));
      if (response.ok && missing.length === 0) {
        streak += 1;
        if (streak >= required) {
          console.log(
            `Edge is serving the built assets (${required} consecutive checks): ${expected.join(', ')}`,
          );
          return;
        }
      } else {
        streak = 0;
        lastFailure = response.ok ? `missing ${missing.join(', ')}` : `${probe} returned ${response.status}`;
      }
    } catch (error) {
      streak = 0;
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(
    `Production never served the built assets ${required} times in a row; last failure: ${lastFailure}`,
  );
}

/** Entry-chunk JavaScript and CSS paths from the local Vite manifest. */
async function builtAssetPaths() {
  const manifest = JSON.parse(
    await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'),
  );
  const entry = Object.values(manifest).find((record) => record.isEntry);
  if (!entry) throw new Error('Vite manifest has no entry chunk');
  return [entry.file, ...(entry.css ?? [])].map((file) => `/${file}`);
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
