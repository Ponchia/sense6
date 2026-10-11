import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { CONTENT_DATES } from '../src/content-dates.js';
import english from '../src/learn-content.json' with { type: 'json' };
import englishUI from '../src/learn-locales/en-ui.json' with { type: 'json' };
import { LEARN_PUBLISHED_LOCALES, learnNavigationLabel } from '../src/learn-publication.js';
import { LOCALE_CODES } from '../src/locale-metadata.js';
import { LEARN_ROUTES } from '../src/routes.js';

export function learnSourceHash() {
  return createHash('sha256')
    .update(JSON.stringify({ content: english, ui: englishUI }))
    .digest('hex');
}

const PLACEHOLDER =
  /\b(?:TODO|TBD|FIXME|lorem ipsum|placeholder|translate me|translation pending)\b|\[\s*(?:translate|insert)[^\]]*\]/i;
const FALSE_REVIEW = /(?:professionally|natively)[ -](?:translated|reviewed)|certified translation/i;
const IMMUTABLE = /(?:\.id|\.href|\.route|\.sourceIds\.\d+)$/;
const DATES = /\.(?:dateModified|publishedDate)$/;
const SOURCE_TITLE = /\.sources\.\d+\.title$/;
const normalize = (text) =>
  text
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function validDate(value, path, today) {
  requireValue(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      new Date(value).toISOString().slice(0, 10) === value &&
      value <= today,
    `Invalid/future date: ${path}`,
  );
}

/** Exact source shape, immutable identities, full prose and UI; no fallback. */
function compare(source, target, path) {
  if (typeof source === 'string') {
    requireValue(typeof target === 'string' && target.trim(), `Missing text: ${path}`);
    if (IMMUTABLE.test(path)) {
      requireValue(source === target, `Changed source identity: ${path}`);
      return;
    }
    requireValue(
      !PLACEHOLDER.test(target) && !FALSE_REVIEW.test(target),
      `Placeholder or unsupported review claim: ${path}`,
    );
    if (DATES.test(path)) return;
    // Bibliographic titles may remain verbatim to identify the cited work.
    if (SOURCE_TITLE.test(path) && target === source) return;
    const original = normalize(source);
    const translated = normalize(target);
    requireValue(
      translated !== original && !(original.length > 18 && translated.includes(original)),
      `Untranslated text: ${path}`,
    );
    // Reject labels in place of long article paragraphs, even for compact scripts.
    if (/\.paragraphs\.\d+$/.test(path)) {
      requireValue([...target].length >= Math.max(60, [...source].length * 0.2), `Thin paragraph: ${path}`);
    }
    return;
  }
  requireValue(
    target && typeof target === 'object' && Array.isArray(source) === Array.isArray(target),
    `Invalid shape: ${path}`,
  );
  const keys = Object.keys(source).sort();
  requireValue(
    JSON.stringify(keys) === JSON.stringify(Object.keys(target).sort()),
    `Missing/extra fields: ${path}`,
  );
  for (const key of keys) compare(source[key], target[key], `${path}.${key}`);
}

export function validateLearnReferences(content, today = new Date().toISOString().slice(0, 10)) {
  requireValue(
    JSON.stringify(Object.keys(content.articles).sort()) ===
      JSON.stringify(LEARN_ROUTES.filter((route) => route !== 'learn').sort()),
    'Missing/phantom Learn routes',
  );
  for (const [route, article] of Object.entries(content.articles)) {
    const ids = new Set(article.sources.map(({ id }) => id));
    requireValue(
      ids.size === article.sources.length && article.sources.length >= 3,
      `Duplicate/missing sources: ${route}`,
    );
    for (const source of article.sources) {
      requireValue(
        /^[a-z0-9-]+$/.test(source.id) && source.title?.trim() && source.role?.trim(),
        `Invalid source: ${route}`,
      );
      requireValue(
        /^https:\/\/[^\s<>"']+$/.test(source.href) ||
          /^\/en\/(?:about|tetracromia|riflessi|color-blindness|udito|acutezza)\/$/.test(source.href),
        `Unsafe/unknown source URL: ${route}`,
      );
    }
    for (const section of article.sections) {
      requireValue(
        section.sourceIds.length > 0 && section.sourceIds.every((id) => ids.has(id)),
        `Unknown/missing reference: ${route}`,
      );
    }
    validDate(article.publishedDate, `${route}.publishedDate`, today);
    validDate(article.dateModified, `${route}.dateModified`, today);
    requireValue(article.publishedDate <= article.dateModified, `Date order: ${route}`);
  }
}

export function validateLearnCatalog(catalog, locale, today = new Date().toISOString().slice(0, 10)) {
  requireValue(LOCALE_CODES.has(locale) && locale !== 'en', 'Unknown translation locale');
  requireValue(
    JSON.stringify(Object.keys(catalog).sort()) ===
      JSON.stringify(['content', 'locale', 'review', 'reviewedDate', 'sourceHash', 'ui'].sort()),
    'Invalid catalog envelope',
  );
  requireValue(catalog.locale === locale, 'Catalog locale mismatch');
  requireValue(
    catalog.sourceHash === learnSourceHash(),
    'Stale English source/UI hash; re-review translation',
  );
  validDate(catalog.reviewedDate, 'reviewedDate', today);
  requireValue(catalog.reviewedDate >= CONTENT_DATES.learn, 'Review predates English source');
  const review = catalog.review;
  requireValue(
    review &&
      Object.keys(review).sort().join(',') ===
        'boundariesPreserved,complete,protocolsUnchanged,referencesPreserved,reviewer',
    'Missing/extra review fields',
  );
  requireValue(
    typeof review.reviewer === 'string' && review.reviewer.trim() && !PLACEHOLDER.test(review.reviewer),
    'Missing reviewer',
  );
  for (const key of ['complete', 'boundariesPreserved', 'protocolsUnchanged', 'referencesPreserved']) {
    requireValue(review[key] === true, `Review not attested: ${key}`);
  }
  compare(english, catalog.content, 'content');
  compare(englishUI, catalog.ui, 'ui');
  validateLearnReferences(catalog.content, today);
  for (const article of Object.values(catalog.content.articles)) {
    requireValue(article.dateModified === catalog.reviewedDate, 'Article review date mismatch');
  }
  return catalog;
}

export async function validateLearnPublication(
  directory = new URL('../src/learn-locales/', import.meta.url),
) {
  validateLearnReferences(english);
  const files = (await readdir(directory)).filter(
    (name) => name.endsWith('.json') && !['published.json', 'en-ui.json'].includes(name),
  );
  const expected = LEARN_PUBLISHED_LOCALES.filter((locale) => locale !== 'en').map(
    (locale) => `${locale}.json`,
  );
  requireValue(
    JSON.stringify(files.sort()) === JSON.stringify(expected.sort()),
    'Missing published catalog or unlisted public draft',
  );
  for (const locale of LEARN_PUBLISHED_LOCALES.filter((code) => code !== 'en')) {
    const catalog = validateLearnCatalog(
      JSON.parse(await readFile(new URL(`${locale}.json`, directory), 'utf8')),
      locale,
    );
    requireValue(
      catalog.ui.Learn === learnNavigationLabel(locale),
      'Manifest navigation label differs from translated UI',
    );
  }
  return LEARN_PUBLISHED_LOCALES;
}
