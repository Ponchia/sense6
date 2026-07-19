/** @typedef {{ locale: string | null, route: string }} RouteTarget */

/** @type {null | ((next: RouteTarget) => boolean)} */
let navigationGuard = null;

/**
 * Install the single lifecycle-scoped guard used by an active measurement.
 * Returning false keeps the current route and exact in-memory test state.
 * @param {null | ((next: RouteTarget) => boolean)} guard
 */
export function setNavigationGuard(guard) {
  navigationGuard = guard;
  return () => {
    if (navigationGuard === guard) navigationGuard = null;
  };
}

/** @param {RouteTarget} next */
export function allowsNavigation(next) {
  return navigationGuard?.(next) !== false;
}
