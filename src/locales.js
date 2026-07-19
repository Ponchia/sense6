export const LOCALES = Object.freeze([
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'it', label: 'Italiano', short: 'IT' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'pt', label: 'Português', short: 'PT' },
]);

export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = new Set(LOCALES.map((locale) => locale.code));

const LOADERS = Object.freeze({
  en: () => import('./locales/en.js'),
  it: () => import('./locales/it.js'),
  de: () => import('./locales/de.js'),
  fr: () => import('./locales/fr.js'),
  es: () => import('./locales/es.js'),
  pt: () => import('./locales/pt.js'),
});

export async function loadMessages(locale) {
  const loader = LOADERS[LOCALE_CODES.has(locale) ? locale : DEFAULT_LOCALE];
  return (await loader()).default;
}
