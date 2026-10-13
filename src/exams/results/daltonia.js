import { ADAPTIVE_CONFIG, AXIS_TYPES } from '../../lib/daltonism.js';
import { isRecord } from '../../lib/storage.js';

/** @typedef {{ type: import('../../lib/daltonism.js').AxisType, level: number, spread: number }} DaltoniaAxisLevel */
/** @typedef {{ schemaVersion: 3, levels: DaltoniaAxisLevel[], controlOk: boolean, savedAt: string }} DaltoniaLatestResult */

const RESULT_KEYS = ['schemaVersion', 'levels', 'controlOk', 'savedAt'];
const LEVEL_KEYS = ['type', 'level', 'spread'];

/**
 * Schema 3 records display-relative ending levels. Older schema-2 thresholds
 * deliberately stay outside this contract rather than acquiring new meaning.
 * @param {unknown} value
 * @returns {value is DaltoniaLatestResult}
 */
export function isDaltoniaLatestResult(value) {
  if (!isRecord(value) || !hasExactKeys(value, RESULT_KEYS)) return false;
  if (value.schemaVersion !== 3 || typeof value.controlOk !== 'boolean' || !isSavedAt(value.savedAt)) {
    return false;
  }
  const levels = value.levels;
  return (
    Array.isArray(levels) &&
    levels.length === AXIS_TYPES.length &&
    levels.every(isAxisLevel) &&
    AXIS_TYPES.every((type) => levels.some((level) => level.type === type))
  );
}

/** @param {unknown} value @returns {value is DaltoniaAxisLevel} */
function isAxisLevel(value) {
  return (
    isRecord(value) &&
    hasExactKeys(value, LEVEL_KEYS) &&
    (value.type === 'protan' || value.type === 'deutan' || value.type === 'tritan') &&
    isInRange(value.level, ADAPTIVE_CONFIG.minimumStrength, ADAPTIVE_CONFIG.maximumStrength) &&
    isInRange(value.spread, 0, ADAPTIVE_CONFIG.maximumStrength - ADAPTIVE_CONFIG.minimumStrength)
  );
}

/** @param {unknown} value @param {number} minimum @param {number} maximum */
function isInRange(value, minimum, maximum) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

/** @param {unknown} value @returns {value is string} */
function isSavedAt(value) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

/** @param {Record<string, unknown>} value @param {string[]} keys */
function hasExactKeys(value, keys) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
