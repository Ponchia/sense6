import manifest from './learn-locales/published.json' with { type: 'json' };
import { LOCALE_CODES, localeMetadata } from './locale-metadata.js';

/** @type {Record<string, {label: string, publishedAt?: string}>} */
const published = manifest;
const codes = Object.keys(published);
// This small manifest is safe in the initial graph; article catalogs are not.
if (
  codes[0] !== 'en' ||
  codes.some((code) => {
    const entry = published[code];
    if (!LOCALE_CODES.has(code) || !entry?.label?.trim()) return true;
    if (code === 'en') return Boolean(entry.publishedAt);
    const date = entry.publishedAt;
    return (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date > new Date().toISOString().slice(0, 10)
    );
  })
) {
  throw new Error('Invalid Learn publication manifest');
}
export const LEARN_PUBLISHED_LOCALES = Object.freeze(codes);

/** @param {string} locale */
export function learnNavigationLabel(locale) {
  return published[locale]?.label ?? '';
}

/** @param {string} locale */
export function isLearnPublished(locale) {
  return LEARN_PUBLISHED_LOCALES.includes(locale);
}

/** First public release of the localized edition; not its most recent review.
 * @param {string} locale
 */
export function learnPublicationDate(locale) {
  return locale === 'en' ? null : (published[locale]?.publishedAt ?? null);
}

/** Reciprocal alternatives exist only once at least two locales are published.
 * @param {string} route
 */
export function learnAlternates(route) {
  return LEARN_PUBLISHED_LOCALES.length < 2
    ? []
    : LEARN_PUBLISHED_LOCALES.map((locale) => ({
        languageTag: localeMetadata(locale).languageTag,
        href: `https://sense6.net/${locale}/${route}/`,
      }));
}
