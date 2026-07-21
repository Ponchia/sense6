export const UTILITY_ROUTES = Object.freeze(['about', 'journal', 'privacy']);
export const STATIC_ADOPTED_ROUTES = Object.freeze(['', 'about', 'privacy']);

/** @param {string} locale @param {string} route */
export function routePath(locale, route = '') {
  return `/${locale}/${route ? `${route}/` : ''}`;
}
