import { allowsNavigation } from './lib/navigation.js';
import { resolveLocale } from './locales.js';

/** @typedef {{ locale: string | null, route: string, canonical: boolean, legacy: boolean }} RouteLocation */
/** @typedef {{ hash: string, pathname: string, search: string }} LocationSource */

const HISTORY_INDEX = '__sense6Index';
let historyIndex = 0;
/** @type {string | null} */
let approvedHref = null;

/** @param {LocationSource} location @returns {RouteLocation} */
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

/** @param {string} name @param {string} locale @param {{ replace?: boolean }} options */
export function navigate(name, locale = 'en', { replace = false } = {}) {
  const route = String(name).replace(/^\/+|\/+$/g, '');
  const current = currentLocation();
  if (
    (current.route !== route || current.locale !== locale) &&
    !allowsNavigation({ route, locale, legacy: false })
  ) {
    return false;
  }
  const target = `/${locale}/${route ? `${route}/` : ''}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return true;
  }
  const nextIndex = replace ? historyIndex : historyIndex + 1;
  approvedHref = target;
  window.history[replace ? 'replaceState' : 'pushState']({ [HISTORY_INDEX]: nextIndex }, '', target);
  historyIndex = nextIndex;
  window.dispatchEvent(new PopStateEvent('popstate'));
  return true;
}

/** @param {(location: RouteLocation) => void | Promise<void>} onRoute */
export function startRouter(onRoute) {
  const initialState = window.history.state ?? {};
  historyIndex = Number.isInteger(initialState[HISTORY_INDEX]) ? initialState[HISTORY_INDEX] : 0;
  if (!Number.isInteger(initialState[HISTORY_INDEX])) {
    window.history.replaceState({ ...initialState, [HISTORY_INDEX]: historyIndex }, '', window.location.href);
  }
  let acceptedIndex = historyIndex;
  let acceptedLocation = currentLocation();
  let acceptedHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  /** @type {number | null} */
  let restoringIndex = null;

  const handle = () => {
    const stateIndex = window.history.state?.[HISTORY_INDEX];
    const nextIndex = Number.isInteger(stateIndex) ? stateIndex : historyIndex;
    historyIndex = nextIndex;

    if (restoringIndex !== null && nextIndex === restoringIndex) {
      restoringIndex = null;
      return;
    }

    const next = currentLocation();
    const nextHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const wasApproved = approvedHref === nextHref;
    if (wasApproved) approvedHref = null;
    const routeChanged = next.locale !== acceptedLocation.locale || next.route !== acceptedLocation.route;
    if (routeChanged && !wasApproved && !allowsNavigation(next)) {
      const delta = acceptedIndex - nextIndex;
      if (delta) {
        restoringIndex = acceptedIndex;
        window.history.go(delta);
      } else {
        window.history.replaceState(
          { ...(window.history.state ?? {}), [HISTORY_INDEX]: acceptedIndex },
          '',
          acceptedHref,
        );
        historyIndex = acceptedIndex;
      }
      return;
    }

    acceptedIndex = nextIndex;
    acceptedLocation = next;
    acceptedHref = nextHref;
    void onRoute(next);
  };
  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-sense6-route]');
    if (!(link instanceof HTMLAnchorElement)) return;
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const locale = link.pathname.split('/').filter(Boolean)[0] || 'en';
    navigate(link.dataset.sense6Route ?? '', locale);
  };
  window.addEventListener('popstate', handle);
  document.addEventListener('click', handleClick);
  handle();
  return () => {
    window.removeEventListener('popstate', handle);
    document.removeEventListener('click', handleClick);
  };
}

/** @param {string} raw */
function parseParts(raw) {
  const parts = raw.split('/').filter(Boolean);
  const requestedLocale = parts[0] ?? '';
  const locale = resolveLocale(requestedLocale);
  if (locale) parts.shift();
  return { locale, route: parts[0] || '', canonical: !locale || requestedLocale === locale };
}
