/*
 * Minimal hash router. Routes look like `#/`, `#/tetracromia`,
 * `#/color-blindness`. Hash routing keeps the app a single static file that
 * nginx serves for every path, with no server-side rewrites to maintain.
 */

export function currentRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return raw.split('/')[0] || '';
}

export function navigate(name) {
  const target = `#/${name}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function startRouter(onRoute) {
  const handle = () => onRoute(currentRoute());
  window.addEventListener('hashchange', handle);
  handle();
  return () => window.removeEventListener('hashchange', handle);
}
