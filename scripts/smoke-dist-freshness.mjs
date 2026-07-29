/**
 * Refuse to validate a stale build.
 *
 * `npm run test:static` reads `dist/` and has no build dependency, so running it
 * on its own silently asserted whatever the last build happened to leave behind.
 * In CI that is harmless — `check:core` builds immediately beforehand — but
 * locally it meant a green `test:static` could describe a tree that no longer
 * exists. This guard makes the staleness visible instead.
 *
 * The comparison is by modification time: if any build input is newer than the
 * oldest generated artifact, `dist/` predates the current sources.
 */
import { readdir, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('../', import.meta.url)));
const dist = resolve(repository, 'dist');

/** Directories and files whose contents are compiled into `dist`. */
const INPUTS = ['src', 'public', 'index.html', 'vite.config.js', 'scripts/generate-static-pages.mjs'];

/**
 * Build *output* that happens to live under an input directory.
 *
 * `src/content-fingerprints.json` is written by `generate-static-pages.mjs`
 * after the pages it fingerprints, so it is always newer than `dist` and would
 * report the freshest possible build as stale.
 */
const GENERATED = new Set([resolve(repository, 'src/content-fingerprints.json')]);

/** Tolerate a checkout that stamps every file with the same second. */
const TOLERANCE_MS = 2_000;

const distFiles = await walk(dist).catch(() => []);
if (distFiles.length === 0) {
  throw new Error('dist/ is empty or missing. Run `npm run build` before validating the static output.');
}

const oldestArtifact = Math.min(
  ...(await Promise.all(distFiles.map(async (file) => (await stat(file)).mtimeMs))),
);

/** @type {{ path: string, ageMs: number }[]} */
const stale = [];
for (const input of INPUTS) {
  const target = resolve(repository, input);
  const files = await walk(target).catch(() => []);
  for (const file of files) {
    if (GENERATED.has(file)) continue;
    const { mtimeMs } = await stat(file);
    if (mtimeMs > oldestArtifact + TOLERANCE_MS) {
      stale.push({ path: relative(repository, file), ageMs: mtimeMs - oldestArtifact });
    }
  }
}

if (stale.length > 0) {
  const worst = stale.sort((left, right) => right.ageMs - left.ageMs).slice(0, 5);
  throw new Error(
    `dist/ is older than ${stale.length} build input(s); run \`npm run build\` first.\n  - ${worst
      .map(({ path, ageMs }) => `${path} (${Math.round(ageMs / 1000)}s newer than dist)`)
      .join('\n  - ')}`,
  );
}

console.log(`dist/ is newer than every build input · ${distFiles.length} artifacts checked`);

/** @param {string} target @returns {Promise<string[]>} */
async function walk(target) {
  const info = await stat(target);
  if (info.isFile()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => walk(resolve(target, entry.name)).catch(() => [])));
  return nested.flat();
}
