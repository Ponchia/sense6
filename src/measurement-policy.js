/** @param {{ search?: string } | undefined} location */
function hasInspectionFlag(location) {
  return new URLSearchParams(location?.search ?? '').getAll('metrics').includes('off');
}

/**
 * Explicit inspection mode, not bot detection. Capture the initial choice before
 * the router can replace the URL. No cookies, storage or visitor identifiers.
 * A new document without the flag has the normal measurement policy again.
 * @param {{ search?: string } | undefined} [initialLocation]
 */
export function createMeasurementPolicy(initialLocation = globalThis.location) {
  const excludedAtLoad = hasInspectionFlag(initialLocation);
  /** @param {{ search?: string } | undefined} [location] */
  return (location = globalThis.location) => !excludedAtLoad && !hasInspectionFlag(location);
}

export const measurementsAllowed = createMeasurementPolicy();
