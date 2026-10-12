/** @typedef {'left' | 'right'} AcutezzaEye */
/** @typedef {{ variant: 'single-eye' | 'both-eyes', eyes: AcutezzaEye[] } | { variant: 'legacy-count', eyes: [], count: 1 | 2 }} AcutezzaCompletion */
/** @typedef {{ setupQuality: 'Setup checks coherent' | 'Interpret with caution' | 'Run unusable', recordedAt: number, completion: AcutezzaCompletion }} AcutezzaLatestResult */
/** @typedef {{ setupQuality: 'Setup checks coherent' | 'Interpret with caution' | 'Run unusable', recordedAt: number, eyes: 1 | 2 }} LegacyAcutezzaLatestResult */

const SETUP_QUALITIES = new Set(['Setup checks coherent', 'Interpret with caution', 'Run unusable']);

/** @param {unknown} value @returns {value is AcutezzaLatestResult} */
export function isAcutezzaLatestResult(value) {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, ['completion', 'recordedAt', 'setupQuality']) &&
    validSetupQuality(value.setupQuality) &&
    typeof value.recordedAt === 'number' &&
    Number.isSafeInteger(value.recordedAt) &&
    value.recordedAt > 0 &&
    value.recordedAt <= 8_640_000_000_000_000 &&
    validCompletion(value.completion)
  );
}

/** @param {unknown} value @returns {value is LegacyAcutezzaLatestResult} */
export function isLegacyAcutezzaLatestResult(value) {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, ['eyes', 'recordedAt', 'setupQuality']) &&
    validSetupQuality(value.setupQuality) &&
    typeof value.recordedAt === 'number' &&
    Number.isSafeInteger(value.recordedAt) &&
    value.recordedAt > 0 &&
    value.recordedAt <= 8_640_000_000_000_000 &&
    typeof value.eyes === 'number' &&
    Number.isInteger(value.eyes) &&
    (value.eyes === 1 || value.eyes === 2)
  );
}

/** @param {unknown} value @returns {AcutezzaLatestResult | null} */
export function migrateLegacyAcutezzaLatestResult(value) {
  if (!isLegacyAcutezzaLatestResult(value)) return null;
  return {
    setupQuality: value.setupQuality,
    recordedAt: value.recordedAt,
    completion: { variant: 'legacy-count', eyes: [], count: value.eyes },
  };
}

/** @param {unknown} value */
function validCompletion(value) {
  if (!isRecord(value) || !Array.isArray(value.eyes)) return false;
  if (value.variant === 'legacy-count') {
    return (
      hasExactKeys(value, ['count', 'eyes', 'variant']) &&
      value.eyes.length === 0 &&
      (value.count === 1 || value.count === 2)
    );
  }
  if (!hasExactKeys(value, ['eyes', 'variant'])) return false;
  const eyes = value.eyes;
  if (!eyes.every((eye) => eye === 'left' || eye === 'right') || new Set(eyes).size !== eyes.length) {
    return false;
  }
  if (value.variant === 'single-eye') return eyes.length === 1;
  return value.variant === 'both-eyes' && eyes.length === 2;
}

/** @param {unknown} value */
function validSetupQuality(value) {
  return typeof value === 'string' && SETUP_QUALITIES.has(value);
}

/** @param {Record<string, unknown>} value @param {string[]} keys */
function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
