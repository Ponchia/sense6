/*
 * Minimal locale-aware hash router. Routes look like `#/it/udito`; legacy
 * links such as `#/udito` remain valid and are normalized by the app shell.
 * Hash routing keeps the app static, with no server rewrites to maintain.
 */

import { LOCALE_CODES } from './locales.js';

export function currentLocation() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  const locale = LOCALE_CODES.has(parts[0]) ? parts.shift() : null;
  return { locale, route: parts[0] || '' };
}

export function currentRoute() {
  return currentLocation().route;
}

export function navigate(name, locale = 'en') {
  const target = `#/${locale}/${name}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function startRouter(onRoute) {
  const handle = () => onRoute(currentLocation());
  window.addEventListener('hashchange', handle);
  handle();
  return () => window.removeEventListener('hashchange', handle);
}
