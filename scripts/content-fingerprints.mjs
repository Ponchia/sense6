/*
 * Freshness gate for public content.
 *
 * `src/content-dates.js` feeds both the sitemap `lastmod` and the JSON-LD
 * `dateModified`, but nothing used to compare those dates against the content
 * they describe: the registry only agreed with itself, so a rewritten page
 * could ship under a stale date and nobody would notice.
 *
 * Every generated route whose freshness is published is fingerprinted here
 * (title + meta description + rendered `<main>`). The build fails when a
 * fingerprint moves while its `CONTENT_DATES` entry still claims an earlier
 * day, and rewrites the checked-in manifest once the date covers the change.
 * Comparing against the build day rather than against the recorded date keeps
 * same-day iteration free while still catching a forgotten bump the next day.
 * Journal and privacy publish no `lastmod`, so they are deliberately outside
 * the gate.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_DATES } from '../src/content-dates.js';
import { EXAM_IDS } from '../src/exams/contracts.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST = join(ROOT, 'src/content-fingerprints.json');
const recorded = new Map();

/**
 * Fingerprint one generated route. Routes without a published content date are
 * ignored rather than silently gated against a date that does not exist.
 * @param {{ path: string, title: string, description: string, main: string }} page
 */
export function recordContentFingerprint({ path, title, description, main }) {
  const key = contentDateKey(path);
  if (!key) return;
  recorded.set(path, {
    key,
    date: contentDate(key),
    hash: createHash('sha256').update(`${title}\n${description}\n${main}`).digest('hex').slice(0, 32),
  });
}

/**
 * Compare every fingerprint against the checked-in manifest and refresh it.
 * @returns {Promise<number>} the number of gated routes
 */
export async function verifyContentFingerprints(today = new Date().toISOString().slice(0, 10)) {
  const previous = await readManifest();
  const stale = new Map();
  for (const [path, entry] of recorded) {
    const before = previous[path];
    if (!before || before.hash === entry.hash || entry.date >= today) continue;
    const paths = stale.get(entry.key) ?? [];
    paths.push(path);
    stale.set(entry.key, paths);
  }
  if (stale.size) throw new Error(staleContentMessage(stale, today));
  const manifest = Object.fromEntries([...recorded].sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return recorded.size;
}

/** @param {Map<string, string[]>} stale @param {string} today */
function staleContentMessage(stale, today) {
  const detail = [...stale]
    .map(([key, paths]) => {
      const shown = paths.slice(0, 4).join(', ');
      const rest = paths.length > 4 ? `, … ${paths.length - 4} more` : '';
      return `  ${shown}${rest} changed, but CONTENT_DATES.${key} still claims ${contentDate(key)}`;
    })
    .join('\n');
  return `Public content changed without a freshness bump:\n${detail}\nSet each listed key in src/content-dates.js to '${today}', then rebuild.`;
}

/** @param {string} path @returns {string | null} */
function contentDateKey(path) {
  const route = path.split('/').filter(Boolean)[1];
  if (!route) return 'site';
  if (route === 'about') return 'about';
  if (['learn', 'tetrachromacy-guide', 'reaction-time-guide'].includes(route)) return 'learn';
  return EXAM_IDS.includes(route) ? `exams.${route}` : null;
}

/** @param {string} key */
function contentDate(key) {
  const [group, exam] = key.split('.');
  const date = exam ? CONTENT_DATES.exams[exam] : CONTENT_DATES[group];
  if (!date) throw new Error(`Missing public-content date for ${key}`);
  return date;
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    return {};
  }
}
