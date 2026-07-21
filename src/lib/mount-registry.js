/** @typedef {{ dispose: () => void }} DisposableMount */

/** @type {Map<symbol, DisposableMount>} */
const activeMounts = new Map();

/** @param {symbol} owner */
export function activeMount(owner) {
  return activeMounts.get(owner) ?? null;
}

/** @param {symbol} owner @param {DisposableMount} mount */
export function registerActiveMount(owner, mount) {
  activeMounts.set(owner, mount);
}

/** @param {symbol} owner @param {DisposableMount} mount */
export function clearActiveMount(owner, mount) {
  if (activeMounts.get(owner) === mount) activeMounts.delete(owner);
}

export function disposeActiveMounts() {
  for (const mount of [...activeMounts.values()]) mount.dispose();
}
