const LOADERS = Object.freeze({
  ar: () => import('./supplemental/ar.js'),
  hi: () => import('./supplemental/hi.js'),
  ja: () => import('./supplemental/ja.js'),
  ko: () => import('./supplemental/ko.js'),
  'pt-br': () => import('./supplemental/pt-br.js'),
  'zh-hans': () => import('./supplemental/zh-hans.js'),
});

/** @typedef {Awaited<ReturnType<(typeof LOADERS)[keyof typeof LOADERS]>>} SupplementalModule */

/** @type {Map<string, SupplementalModule>} */
const CACHE = new Map();

/** Load only the supplemental copy needed by the active utility route. @param {string} locale */
export async function loadSupplementalLocale(locale) {
  const loader = supplementalLoader(locale);
  if (!loader || CACHE.has(locale)) return Boolean(loader);
  CACHE.set(locale, await loader());
  return true;
}

/** @param {string} locale */
function supplementalLoader(locale) {
  if (locale === 'ar') return LOADERS.ar;
  if (locale === 'hi') return LOADERS.hi;
  if (locale === 'ja') return LOADERS.ja;
  if (locale === 'ko') return LOADERS.ko;
  if (locale === 'pt-br') return LOADERS['pt-br'];
  if (locale === 'zh-hans') return LOADERS['zh-hans'];
  return null;
}

/** @param {string} locale */
export function supplementalPrivacy(locale) {
  return CACHE.get(locale)?.privacy;
}

/** @param {string} locale */
export function supplementalJournal(locale) {
  return CACHE.get(locale)?.journal;
}

/** @param {string} locale */
export function supplementalSetupLabels(locale) {
  return CACHE.get(locale)?.setupLabels;
}
