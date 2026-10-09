// The field-guide pages are original English content, not translated routes.
export const LEARN_ROUTES = Object.freeze([
  'learn',
  'tetrachromacy-guide',
  'reaction-time-guide',
  'color-blindness-guide',
]);
export const UTILITY_ROUTES = Object.freeze(['about', 'journal', 'privacy']);
export const NON_INDEXABLE_ROUTES = Object.freeze(['journal', 'privacy']);
export const STATIC_ADOPTED_ROUTES = Object.freeze(['', 'about', 'privacy', ...LEARN_ROUTES]);
export const SITE_ORIGIN = 'https://sense6.net';

/** @typedef {{ locale: string, route: string, path: string, title: string, description: string, canonical: string, socialImage: string, socialImageAlt: string, indexable: boolean }} RouteMetadata */

/** @param {string} locale @param {string} route */
export function routePath(locale, route = '') {
  return `/${locale}/${route ? `${route}/` : ''}`;
}

/**
 * Build the canonical identity shared by static output and runtime navigation.
 * @param {{ locale: string, route?: string, path?: string, title: string, description: string, socialImage?: string, socialImageAlt?: string, indexable?: boolean }} value
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
  });
}

/** Apply every route-owned identity field in one committed navigation update. */
export function applyRouteMetadata(metadata, root = document) {
  root.title = metadata.title;
  setMeta(root, 'name', 'description', metadata.description);
  setMeta(root, 'property', 'og:title', metadata.title);
  setMeta(root, 'property', 'og:description', metadata.description);
  setMeta(root, 'property', 'og:url', metadata.canonical);
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
}

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

function setMeta(root, attribute, key, value) {
  const meta = root.querySelector(`meta[${attribute}="${key}"]`);
  if (!(meta instanceof HTMLMetaElement)) throw new Error(`Metadata ${key} is unavailable`);
  meta.content = value;
}
