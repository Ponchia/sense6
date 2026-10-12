/**
 * Optional, operator-invoked IndexNow submission for content changed between
 * two VERIFIED Sense6 production releases. Not part of the deploy path.
 * Default is strictly read-only dry-run; --submit explicitly enables network
 * notifications, after current production and public key validation.
 *
 * Never submit a historical bulk sitemap. The API key is a public ownership
 * proof (served as /<key>.txt), not a credential to paste into GitHub issues.
 */
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SEARCH_ROUTES } from '../audits/routes.js';
import { SITE_ORIGIN } from '../src/routes.js';

const ROOT = new URL('../', import.meta.url);
const PUBLIC = new URL('../public/', import.meta.url);
const ELIGIBLE = new Set(SEARCH_ROUTES);
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_FILE_PATTERN = /^([a-f0-9]{32})\.txt$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;

/**
 * @param {Record<string, { hash: string }>} previous
 * @param {Record<string, { hash: string }>} current
 * @param {Set<string>} [eligible]
 * @returns {string[]}
 */
export function changedPublicPaths(previous, current, eligible = ELIGIBLE) {
  if (!previous || !current || Array.isArray(previous) || Array.isArray(current)) {
    throw new Error('Expected two complete content-fingerprint maps');
  }
  const paths = [];
  for (const path of eligible) {
    const next = current[path];
    if (!next) continue; // Removed pages require an explicit deletion workflow.
    if (!/^[a-f0-9]{32}$/.test(next.hash ?? '')) {
      throw new Error(`Invalid content fingerprint on published page ${path}`);
    }
    if (previous[path]?.hash !== next.hash) paths.push(path);
  }
  return paths.sort();
}

/** @param {string[]} paths @param {string} key @param {string} keyLocation */
export function indexNowPayload(paths, key, keyLocation) {
  if (!KEY_FILE_PATTERN.test(`${key}.txt`)) throw new Error('Invalid IndexNow ownership key');
  if (keyLocation !== `${SITE_ORIGIN}/${key}.txt`) {
    throw new Error('Ownership proof must be hosted in the exact Sense6 root');
  }
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > ELIGIBLE.size) {
    throw new Error('Expected a nonempty, bounded set of published paths');
  }
  if (new Set(paths).size !== paths.length || paths.some((path) => !ELIGIBLE.has(path))) {
    throw new Error('Refusing unknown, duplicate, or nonindexable URL');
  }
  return {
    host: 'sense6.net',
    key,
    keyLocation,
    urlList: paths.map((path) => `${SITE_ORIGIN}${path}`),
  };
}

export async function publicIndexNowKey() {
  const files = (await readdir(PUBLIC)).filter((name) => KEY_FILE_PATTERN.test(name));
  if (files.length !== 1) throw new Error('Expected exactly one hosted public IndexNow key file');
  const file = files[0];
  const key = file.slice(0, -4);
  if ((await readFile(new URL(file, PUBLIC), 'utf8')).trim() !== key) {
    throw new Error('Public IndexNow key file does not contain its filename key');
  }
  return { key, file, url: `${SITE_ORIGIN}/${file}` };
}

/** @param {string} sha @param {string} path */
function gitFile(sha, path) {
  if (!COMMIT_PATTERN.test(sha)) throw new Error('Expected exact 40-character git commit SHA');
  return execFileSync('git', ['show', `${sha}:${path}`], {
    cwd: fileURLToPath(ROOT),
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** @param {string[]} args */
function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const options = { submit: false, before: '', after: '' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--submit' && !options.submit) options.submit = true;
    else if (arg === '--before' && !options.before) options.before = args[++index] ?? '';
    else if (arg === '--after' && !options.after) options.after = args[++index] ?? '';
    else throw new Error(`Unknown or duplicate option: ${arg}`);
  }
  if (!COMMIT_PATTERN.test(options.before) || !COMMIT_PATTERN.test(options.after)) {
    throw new Error('Provide --before and --after as two distinct 40-character commit SHAs');
  }
  if (options.before === options.after) throw new Error('No release change to submit');
  return options;
}

/** @param {string} url */
async function liveFetch(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Live verification failed (${response.status}) for ${url}`);
  return response;
}

/** @param {string[]} args */
export async function runIndexNow(args) {
  const opts = parseArgs(args);
  if (!opts) {
    console.log(
      'Usage: node scripts/submit-indexnow.mjs --before <previous-deployed-SHA> --after <new-deployed-SHA> [--submit]',
    );
    console.log(
      'Default: offline dry-run. --submit verifies the deployed version and key, then notifies IndexNow.',
    );
    return;
  }
  const { key, file, url } = await publicIndexNowKey();
  const current = JSON.parse(gitFile(opts.after, 'src/content-fingerprints.json'));
  const previous = JSON.parse(gitFile(opts.before, 'src/content-fingerprints.json'));
  const paths = changedPublicPaths(previous, current);
  console.log(`IndexNow candidate: ${paths.length} changed indexable pages (no sitemap-wide backfill)`);
  for (const path of paths) console.log(`  ${SITE_ORIGIN}${path}`);
  if (!opts.submit || paths.length === 0) {
    console.log('Dry-run/no changes: no network notification sent.');
    return;
  }

  // The first key-file rollout is not a license to re-submit the historical
  // site. Require that the previous verified release already hosted this key.
  let established = false;
  try {
    established =
      gitFile(opts.before, `public/${file}`).trim() === key &&
      gitFile(opts.after, `public/${file}`).trim() === key;
  } catch {
    // First key-file deployment is not permission to submit historical URLs.
  }
  if (!established) {
    throw new Error(
      'Public IndexNow key must exist in both verified releases; do not backfill earlier site changes',
    );
  }
  const live = await liveFetch(`${SITE_ORIGIN}/build-meta.json`);
  if ((await live.json()).commit !== opts.after) {
    throw new Error('Refusing to notify IndexNow for a revision not currently deployed');
  }
  const proof = await liveFetch(url);
  if ((await proof.text()).trim() !== key) {
    throw new Error('Public IndexNow ownership proof mismatches the committed key');
  }
  // Verify each requested path is a live indexable HTML page. The release
  // smoke already confirms CDN content propagation before a verified deploy.
  for (const path of paths) {
    const response = await liveFetch(`${SITE_ORIGIN}${path}`);
    if (!response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Refusing non-HTML URL ${path}`);
    }
    const html = await response.text();
    if (
      !html.includes(`<link rel="canonical" href="${SITE_ORIGIN}${path}">`) ||
      /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)
    ) {
      throw new Error(`Refusing missing-self-canonical or noindex route ${path}`);
    }
  }
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowPayload(paths, key, url)),
    signal: AbortSignal.timeout(15_000),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow endpoint refused the submission: HTTP ${response.status}`);
  }
  console.log(
    `IndexNow HTTP ${response.status}: ${paths.length} changed URLs received${response.status === 202 ? ' (key validation pending)' : ''}; indexing is not guaranteed.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runIndexNow(process.argv.slice(2));
}
