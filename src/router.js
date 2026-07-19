import { LOCALE_CODES } from './locales.js';

export function currentLocation(location = window.location) {
  const legacy = parseParts(location.hash.replace(/^#\/?/, ''));
  if (location.hash.startsWith('#/') && (legacy.locale || legacy.route)) {
    return { ...legacy, legacy: true };
  }
  return { ...parseParts(location.pathname.replace(/^\/+|\/+$/g, '')), legacy: false };
}

export function currentRoute() {
  return currentLocation().route;
}

export function navigate(name, locale = 'en', { replace = false } = {}) {
  const route = String(name).replace(/^\/+|\/+$/g, '');
  const target = `/${locale}/${route ? `${route}/` : ''}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function startRouter(onRoute) {
  const handle = () => void onRoute(currentLocation());
  const handleClick = (event) => {
    const link = event.target.closest?.('a[data-sense6-route]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const locale = link.pathname.split('/').filter(Boolean)[0] || 'en';
    navigate(link.dataset.sense6Route, locale);
  };
  window.addEventListener('popstate', handle);
  document.addEventListener('click', handleClick);
  handle();
  return () => {
    window.removeEventListener('popstate', handle);
    document.removeEventListener('click', handleClick);
  };
}

function parseParts(raw) {
  const parts = raw.split('/').filter(Boolean);
  const locale = LOCALE_CODES.has(parts[0]) ? parts.shift() : null;
  return { locale, route: parts[0] || '' };
}
