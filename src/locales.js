import { DEFAULT_LOCALE, LOCALE_CODES } from './locale-metadata.js';

export {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  LOCALES,
  localeMetadata,
  resolveLocale,
} from './locale-metadata.js';

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

export async function loadMessages(locale) {
  const loader = LOADERS[LOCALE_CODES.has(locale) ? locale : DEFAULT_LOCALE];
  return (await loader()).default;
}
