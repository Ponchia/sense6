/**
 * @typedef {object} LocaleMetadata
 * @property {string} code
 * @property {string} languageTag
 * @property {string} label
 * @property {string} short
 * @property {'ltr' | 'rtl'} direction
 * @property {readonly string[]} [aliases]
 */

/** @type {readonly LocaleMetadata[]} */
export const LOCALES = Object.freeze([
  { code: 'en', languageTag: 'en', label: 'English', short: 'EN', direction: 'ltr' },
  { code: 'it', languageTag: 'it', label: 'Italiano', short: 'IT', direction: 'ltr' },
  { code: 'de', languageTag: 'de', label: 'Deutsch', short: 'DE', direction: 'ltr' },
  { code: 'fr', languageTag: 'fr', label: 'Français', short: 'FR', direction: 'ltr' },
  { code: 'es', languageTag: 'es', label: 'Español', short: 'ES', direction: 'ltr' },
  {
    code: 'pt',
    languageTag: 'pt-PT',
    label: 'Português PT',
    short: 'PT',
    direction: 'ltr',
  },
  {
    code: 'pt-br',
    languageTag: 'pt-BR',
    label: 'Português BR',
    short: 'PT-BR',
    direction: 'ltr',
  },
  { code: 'ar', languageTag: 'ar', label: 'العربية', short: 'AR', direction: 'rtl' },
  { code: 'ja', languageTag: 'ja', label: '日本語', short: 'JA', direction: 'ltr' },
  { code: 'ko', languageTag: 'ko', label: '한국어', short: 'KO', direction: 'ltr' },
  { code: 'hi', languageTag: 'hi', label: 'हिन्दी', short: 'HI', direction: 'ltr' },
  {
    code: 'zh-hans',
    languageTag: 'zh-Hans',
    aliases: ['zh-cn', 'zh-sg'],
    label: '简体中文',
    short: 'ZH',
    direction: 'ltr',
  },
]);

export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = new Set(LOCALES.map((locale) => locale.code));

const LOCALE_BY_CODE = new Map(LOCALES.map((locale) => [locale.code, locale]));
const LOCALE_ALIASES = new Map(
  LOCALES.flatMap((locale) => (locale.aliases ?? []).map((alias) => [alias, locale.code])),
);

/** @param {string} locale */
export function localeMetadata(locale) {
  return LOCALE_BY_CODE.get(locale) ?? LOCALES[0];
}

/** @param {unknown} value */
export function resolveLocale(value) {
  if (!value) return null;
  const normalized = String(value).trim().replaceAll('_', '-').toLowerCase();
  if (LOCALE_CODES.has(normalized)) return normalized;
  const alias = LOCALE_ALIASES.get(normalized);
  if (alias) return alias;
  const subtags = normalized.split('-');
  const base = subtags[0];
  if (base === 'pt' && subtags.includes('br')) return 'pt-br';
  if (base === 'zh') {
    return subtags.some((subtag) => ['hans', 'cn', 'sg'].includes(subtag)) ? 'zh-hans' : null;
  }
  return LOCALE_CODES.has(base) ? base : null;
}
