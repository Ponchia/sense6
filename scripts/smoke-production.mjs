import { readdir, readFile, stat } from 'node:fs/promises';

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
 * Wait for a known condition instead: the edge must be serving every hashed file
 * this build produced, several sweeps in a row. Only then is a failing journey
 * unambiguous.
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
 * Require the edge to serve every hashed file this build produced, on `required`
 * consecutive sweeps, before any further gate runs.
 *
 * This used to wait on one entry chunk and its stylesheet. An entry hash only
 * changes when the entry chunk's own content changes, so a change confined to a
 * route chunk — `src/exams/udito.js` becoming a new `assets/udito-*.js` — left
 * the waited-on hashes identical to the previous deployment's. The three
 * consecutive checks then passed instantly against a lagging edge and the wait
 * attested nothing about the code under test.
 *
 * A sweep now covers the whole artifact: each pre-rendered page must reference
 * the hashed assets that the local build of that page references, and every
 * hashed file no page names — locale chunks, dynamically imported modules, the
 * unused font weights — must be served. Only unhashed paths are outside this,
 * and `/build-meta.json`, the one that matters, has its own gate above.
 * @param {URL} production
 * @param {{ required?: number, attempts?: number, waitMs?: number }} [options]
 */
async function expectAssetPropagation(production, options = {}) {
  const { required = 3, attempts = 30, waitMs = 5_000 } = options;
  const { pages, unreferenced, total } = await builtArtifact();

  let streak = 0;
  let lastFailure = 'no response';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const gap = await findPropagationGap(production, pages, unreferenced, attempt);
    if (gap) {
      streak = 0;
      lastFailure = gap;
    } else {
      streak += 1;
      if (streak >= required) {
        console.log(
          `Edge is serving all ${total} hashed assets of this build across ${pages.length} ` +
            `pre-rendered pages (${required} consecutive sweeps)`,
        );
        return;
      }
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(
    `Production never served the built assets ${required} times in a row; last failure: ${lastFailure}`,
  );
}

/**
 * Describe the first thing the edge is not serving yet, or null when the whole
 * artifact is live.
 * @param {URL} production
 * @param {{ path: string, assets: string[] }[]} pages
 * @param {string[]} unreferenced
 * @param {number} attempt
 */
async function findPropagationGap(production, pages, unreferenced, attempt) {
  try {
    for (const { path, assets } of pages) {
      const response = await fetch(new URL(`${path}?propagation=${attempt}`, production), {
        cache: 'no-store',
      });
      if (!response.ok) return `${path} returned ${response.status}`;
      const html = await response.text();
      const missing = assets.filter((asset) => !html.includes(asset));
      if (missing.length > 0) return `${path} does not reference ${missing.join(', ')}`;
    }
    for (const asset of unreferenced) {
      const response = await fetch(new URL(asset, production), { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) return `${asset} returned ${response.status}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Every hashed file in the local build, split into the pre-rendered pages that
 * reference them and the files no page names.
 */
async function builtArtifact() {
  const dist = new URL('../dist/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', dist), 'utf8'));
  const hashed = new Set(
    Object.values(manifest)
      .flatMap((record) => [record.file, ...(record.css ?? [])])
      .map((file) => `/${file}`),
  );
  if (hashed.size === 0) throw new Error('The local dist manifest named no built assets to wait for');

  const referenced = new Set();
  const pages = [];
  for (const path of await prerenderedRoutes(dist)) {
    const html = await readFile(new URL(`.${path}index.html`, dist), 'utf8');
    const references = new Set(html.match(/\/assets\/[\w./-]+/g) ?? []);
    const assets = [...references].filter((asset) => hashed.has(asset));
    if (assets.length === 0) throw new Error(`The local build of ${path} references no hashed asset`);
    for (const asset of assets) referenced.add(asset);
    pages.push({ path, assets });
  }
  return {
    pages,
    unreferenced: [...hashed].filter((asset) => !referenced.has(asset)).sort(),
    total: hashed.size,
  };
}

/**
 * The root page plus every English page in the build.
 *
 * The English tree holds one page per exam and utility route, so its HTML names
 * every hashed asset a page can name; a localized page of the same route loads
 * the same chunks and adds only a locale chunk, which the unreferenced-asset
 * sweep covers. Discovering the set from `dist` rather than a list means a new
 * route is waited on the day it ships.
 * @param {URL} dist
 */
async function prerenderedRoutes(dist) {
  const entries = await readdir(new URL('en/', dist), { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  const candidates = ['/', '/en/', ...directories.map((entry) => `/en/${entry.name}/`)];
  const routes = [];
  for (const path of candidates) {
    const page = await stat(new URL(`.${path}index.html`, dist)).catch(() => null);
    if (page?.isFile()) routes.push(path);
  }
  if (routes.length < 2) throw new Error(`The local build has no pre-rendered pages under ${dist.pathname}`);
  return routes;
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
