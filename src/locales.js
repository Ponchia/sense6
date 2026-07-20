import { DEFAULT_LOCALE, LOCALE_CODES } from './locale-metadata.js';

/** @typedef {import('./locale-metadata.js').LocaleCode} LocaleCode */
/** @typedef {() => Promise<{ default: Map<string, string> }>} LocaleLoader */

export {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  LOCALES,
  localeMetadata,
  resolveLocale,
} from './locale-metadata.js';

/** @type {Readonly<Record<LocaleCode, LocaleLoader>>} */
const LOADERS = Object.freeze({
  en: () => import('./locales/en.js'),
  it: () => import('./locales/it.js'),
  de: () => import('./locales/de.js'),
  fr: () => import('./locales/fr.js'),
  es: () => import('./locales/es.js'),
  pt: () => import('./locales/pt.js'),
  'pt-br': () => import('./locales/pt-br.js'),
  ar: () => import('./locales/ar.js'),
  ja: () => import('./locales/ja.js'),
  ko: () => import('./locales/ko.js'),
  hi: () => import('./locales/hi.js'),
  'zh-hans': () => import('./locales/zh-hans.js'),
});

/** @param {string} locale */
export async function loadMessages(locale) {
  const code = LOCALE_CODES.has(locale) ? /** @type {LocaleCode} */ (locale) : DEFAULT_LOCALE;
  const loader = LOADERS[code];
  return (await loader()).default;
}
