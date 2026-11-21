import { learnAlternates } from './learn-publication.js';
import { LOCALES, openGraphLocale } from './locale-metadata.js';
// Stable Learn identities shared by all complete published locale catalogs.
export const LEARN_ROUTES = Object.freeze([
  'learn',
  'tetrachromacy-guide',
  'reaction-time-guide',
  'color-blindness-guide',
  'hearing-range-guide',
  'visual-acuity-guide',
]);
export const UTILITY_ROUTES = Object.freeze(['about', 'journal', 'privacy']);
export const NON_INDEXABLE_ROUTES = Object.freeze(['journal', 'privacy']);
// Standalone resources publish only where complete content exists. They do not
// inherit the experiment UI's twelve-language availability.
export const ENGLISH_ONLY_ROUTES = Object.freeze(['browser-timing-explorer']);
export const STATIC_ADOPTED_ROUTES = Object.freeze([
  '',
  'about',
  'privacy',
  ...LEARN_ROUTES,
  ...ENGLISH_ONLY_ROUTES,
]);
export const SITE_ORIGIN = 'https://sense6.net';

/** @typedef {{ locale: string, route: string, path: string, title: string, description: string, canonical: string, socialImage: string, socialImageAlt: string, indexable: boolean, structuredData?: object }} RouteMetadata */

/** @param {string} locale @param {string} route */
export function routePath(locale, route = '') {
  return `/${locale}/${route ? `${route}/` : ''}`;
}

/**
 * Build the canonical identity shared by static output and runtime navigation.
 * @param {{ locale: string, route?: string, path?: string, title: string, description: string, socialImage?: string, socialImageAlt?: string, indexable?: boolean, structuredData?: object }} value
 * @returns {Readonly<RouteMetadata>}
 */
export function createRouteMetadata({
  locale,
  route = '',
  path = routePath(locale, route),
  title,
  description,
  socialImage = '/social/sense6.png',
  socialImageAlt = description,
  indexable = true,
  structuredData,
}) {
  return Object.freeze({
    locale,
    route,
    path,
    title,
    description,
    canonical: new URL(path, SITE_ORIGIN).href,
    socialImage: new URL(socialImage, SITE_ORIGIN).href,
    socialImageAlt,
    indexable,
    ...(structuredData ? { structuredData } : {}),
  });
}

/**
 * Apply every route-owned identity field in one committed navigation update.
 * @param {RouteMetadata} metadata
 * @param {Document} [root]
 */
export function applyRouteMetadata(metadata, root = document) {
  root.title = metadata.title;
  setMeta(root, 'name', 'description', metadata.description);
  setMeta(root, 'property', 'og:title', metadata.title);
  setMeta(root, 'property', 'og:description', metadata.description);
  setMeta(root, 'property', 'og:url', metadata.canonical);
  setMeta(root, 'property', 'og:locale', openGraphLocale(metadata.locale));
  setMeta(root, 'property', 'og:image', metadata.socialImage);
  setMeta(root, 'property', 'og:image:alt', metadata.socialImageAlt);
  setMeta(root, 'name', 'twitter:title', metadata.title);
  setMeta(root, 'name', 'twitter:description', metadata.description);
  setMeta(root, 'name', 'twitter:image', metadata.socialImage);
  setMeta(root, 'name', 'twitter:image:alt', metadata.socialImageAlt);
  const canonical = root.querySelector('link[rel="canonical"]');
  if (!(canonical instanceof HTMLLinkElement)) throw new Error('Canonical link is unavailable');
  canonical.href = metadata.canonical;
  applyRobotsMetadata(root, metadata.indexable);
  setMeta(
    root,
    'property',
    'og:type',
    LEARN_ROUTES.includes(metadata.route) && metadata.route !== 'learn' ? 'article' : 'website',
  );
  for (const link of root.querySelectorAll('link[rel="alternate"][hreflang]')) link.remove();
  const alternates = ENGLISH_ONLY_ROUTES.includes(metadata.route)
    ? []
    : LEARN_ROUTES.includes(metadata.route)
      ? learnAlternates(metadata.route)
      : [
          ...LOCALES.map(({ code, languageTag }) => ({
            languageTag,
            href: `${SITE_ORIGIN}${routePath(code, metadata.route)}`,
          })),
          {
            languageTag: 'x-default',
            href:
              metadata.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${routePath('en', metadata.route)}`,
          },
        ];
  for (const alternate of alternates) {
    const link = root.createElement('link');
    link.rel = 'alternate';
    link.hreflang = alternate.languageTag;
    link.href = alternate.href;
    root.head.append(link);
  }
  // Keep matching static schema during hydration. On navigation, retire the
  // previous page's complete graph, including its breadcrumb, while retaining
  // standalone site-wide identity. A supplied destination graph replaces both.
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    const data = JSON.parse(script.textContent ?? '{}');
    if (metadata.structuredData || describesAnotherRoute(data, metadata.canonical)) script.remove();
  }
  if (metadata.structuredData) {
    const script = root.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(metadata.structuredData);
    root.head.append(script);
  }
}

const ROUTE_SCHEMA_TYPES = new Set(['WebApplication', 'AboutPage', 'Article', 'CollectionPage', 'WebPage']);

/**
 * Current static and resource builders put the page identity in `url`.
 * Person and WebSite URLs describe shared entities, not the active route.
 * @param {{ '@graph'?: Array<{ '@type'?: string | string[], url?: string }>, '@type'?: string | string[], url?: string }} data
 * @param {string} canonical
 */
function describesAnotherRoute(data, canonical) {
  const entries = data['@graph'] ?? [data];
  return entries.some((entry) => {
    const types = Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']];
    return (
      types.some((type) => ROUTE_SCHEMA_TYPES.has(type ?? '')) &&
      typeof entry.url === 'string' &&
      entry.url !== canonical
    );
  });
}

/** @param {Document} root @param {boolean} indexable */
function applyRobotsMetadata(root, indexable) {
  const current = root.querySelector('meta[name="robots"]');
  if (indexable) {
    current?.remove();
    return;
  }
  const meta = current ?? root.createElement('meta');
  meta.setAttribute('name', 'robots');
  meta.setAttribute('content', 'noindex');
  if (!current) root.head.append(meta);
}

/** @param {Document} root @param {'name' | 'property'} attribute @param {string} key @param {string} value */
function setMeta(root, attribute, key, value) {
  const meta = root.querySelector(`meta[${attribute}="${key}"]`);
  if (!(meta instanceof HTMLMetaElement)) throw new Error(`Metadata ${key} is unavailable`);
  meta.content = value;
}
