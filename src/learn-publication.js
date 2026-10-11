import manifest from './learn-locales/published.json' with { type: 'json' };
import { LOCALE_CODES, localeMetadata } from './locale-metadata.js';

/** @type {Record<string, {label: string}>} */
const published = manifest;
const codes = Object.keys(published);
// This small manifest is safe in the initial graph; article catalogs are not.
if (codes[0] !== 'en' || codes.some((code) => !LOCALE_CODES.has(code) || !published[code]?.label?.trim())) {
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
