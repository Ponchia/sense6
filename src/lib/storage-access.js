/**
 * Resolve optional browser storage without evaluating a throwing accessor in a
 * default parameter. Some privacy modes expose `localStorage` but throw when
 * code reads the property itself.
 * @template T
 * @param {T | null | undefined} [provided]
 * @returns {T | null}
 */
export function resolveOptionalStorage(provided) {
  if (provided !== undefined) return provided ?? null;
  try {
    return /** @type {T | null} */ (globalThis.localStorage ?? null);
  } catch {
    return null;
  }
}
