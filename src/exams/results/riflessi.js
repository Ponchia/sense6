import { isRecord } from '../../lib/storage.js';

/** @typedef {{ inputMode: 'keyboard' | 'pointer', timing: 'Timing appeared steady' | 'Timing interruptions observed', recordedAt: number }} RiflessiResultContext */
/** @typedef {ReturnType<typeof import('../../lib/reflexes.js').summarizeRiflessi> & RiflessiResultContext} CurrentRiflessiLatestResult */
/** @typedef {{ medianMs: number | null, valid: number }} ReflexMetric */
/** @typedef {ReflexMetric & { spreadMs: number | null }} LegacySignalResult */
/** @typedef {ReflexMetric & { accuracyPercent: number | null, costMs: number | null, attempts: number }} LegacyChoiceResult */
/** @typedef {{ signal: LegacySignalResult, choice: LegacyChoiceResult, stability: CurrentRiflessiLatestResult['stability'], events: { falseStarts: number, anticipations: number, misses: number, wrongChoices: number }, usable: boolean } & RiflessiResultContext} LegacyRiflessiLatestResult */
/** @typedef {CurrentRiflessiLatestResult | LegacyRiflessiLatestResult} RiflessiLatestResult */

const RESULT_KEYS = [
  'choice',
  'events',
  'inputMode',
  'recordedAt',
  'signal',
  'stability',
  'timing',
  'usable',
];
const EVENT_FIELDS = ['falseStarts', 'anticipations', 'misses', 'wrongChoices'];
const QUALITY_REASONS = new Set([
  'signal-schedule-incomplete',
  'choice-schedule-incomplete',
  'signal-valid-responses-low',
  'choice-valid-responses-low',
  'sustained-valid-responses-low',
  'signal-catches-failed',
  'timing-interrupted',
]);

/**
 * Keep historical summaries in their original shape. Their older accuracy and
 * spread fields do not acquire modern denominators or protocol identity.
 * @param {unknown} value
 * @returns {value is RiflessiLatestResult}
 */
export function isRiflessiLatestResult(value) {
  if (!isRecord(value) || !validContext(value) || typeof value.usable !== 'boolean') return false;
  if (!validStability(value.stability)) return false;
  return Object.hasOwn(value, 'qualityReasons') ? validCurrentResult(value) : validLegacyResult(value);
}

/** @param {Record<string, unknown>} value */
function validContext(value) {
  return (
    (value.inputMode === 'keyboard' || value.inputMode === 'pointer') &&
    (value.timing === 'Timing appeared steady' || value.timing === 'Timing interruptions observed') &&
    typeof value.recordedAt === 'number' &&
    Number.isSafeInteger(value.recordedAt) &&
    value.recordedAt > 0 &&
    value.recordedAt <= 8_640_000_000_000_000
  );
}

/** @param {Record<string, unknown>} value */
function validCurrentResult(value) {
  if (!hasExactKeys(value, [...RESULT_KEYS, 'qualityReasons'])) return false;
  if (!validCurrentSignal(value.signal) || !validCurrentChoice(value.choice)) return false;
  if (!validCurrentEvents(value.events)) return false;
  if (
    value.events.catchesPassed > value.events.catchesScheduled ||
    value.signal.valid + value.events.catchesPassed > value.signal.scheduled ||
    value.events.catchesScheduled > value.signal.scheduled ||
    value.events.wrongChoices > value.choice.attempts - value.choice.valid ||
    !validBlockDifference(value.signal.medianMs, value.choice.medianMs, value.choice.blockDifferenceMs)
  ) {
    return false;
  }
  const reasons = value.qualityReasons;
  return (
    Array.isArray(reasons) &&
    reasons.every((reason) => typeof reason === 'string' && QUALITY_REASONS.has(reason)) &&
    new Set(reasons).size === reasons.length &&
    value.usable === (reasons.length === 0)
  );
}

/** @param {Record<string, unknown>} value */
function validLegacyResult(value) {
  if (!hasExactKeys(value, RESULT_KEYS)) return false;
  if (!validLegacySignal(value.signal) || !validLegacyChoice(value.choice)) return false;
  return (
    validLegacyEvents(value.events) &&
    value.events.wrongChoices <= value.choice.attempts - value.choice.valid &&
    validBlockDifference(value.signal.medianMs, value.choice.medianMs, value.choice.costMs)
  );
}

/** @param {unknown} value @returns {value is CurrentRiflessiLatestResult['signal']} */
function validCurrentSignal(value) {
  return (
    validCommonMetric(value) &&
    hasExactKeys(value, ['medianMs', 'scheduled', 'valid', 'withinRunSpreadMs']) &&
    validSpread(value.withinRunSpreadMs, value.valid) &&
    isCount(value.scheduled) &&
    value.valid <= value.scheduled
  );
}

/** @param {unknown} value @returns {value is LegacySignalResult} */
function validLegacySignal(value) {
  return (
    validCommonMetric(value) &&
    hasExactKeys(value, ['medianMs', 'spreadMs', 'valid']) &&
    validSpread(value.spreadMs, value.valid)
  );
}

/** @param {unknown} value @returns {value is CurrentRiflessiLatestResult['choice']} */
function validCurrentChoice(value) {
  return (
    validCommonMetric(value) &&
    hasExactKeys(value, [
      'attempts',
      'blockDifferenceMs',
      'conditionalAccuracyPercent',
      'medianMs',
      'scheduled',
      'scheduledAccuracyPercent',
      'valid',
    ]) &&
    isCount(value.attempts) &&
    isCount(value.scheduled) &&
    value.valid <= value.attempts &&
    value.attempts <= value.scheduled &&
    validPercentage(value.conditionalAccuracyPercent, value.attempts) &&
    validPercentage(value.scheduledAccuracyPercent, value.scheduled) &&
    isNullableFinite(value.blockDifferenceMs)
  );
}

/** @param {unknown} value @returns {value is LegacyChoiceResult} */
function validLegacyChoice(value) {
  return (
    validCommonMetric(value) &&
    hasExactKeys(value, ['accuracyPercent', 'attempts', 'costMs', 'medianMs', 'valid']) &&
    isCount(value.attempts) &&
    value.valid <= value.attempts &&
    validPercentage(value.accuracyPercent, value.attempts) &&
    isNullableFinite(value.costMs)
  );
}

/** @param {unknown} value @returns {value is CurrentRiflessiLatestResult['stability']} */
function validStability(value) {
  return (
    validCommonMetric(value) &&
    hasExactKeys(value, ['driftMs', 'medianMs', 'slowestGapMs', 'valid']) &&
    validSpread(value.slowestGapMs, value.valid) &&
    isNullableFinite(value.driftMs) &&
    (value.valid < 2 ? value.driftMs === null : value.driftMs !== null)
  );
}

/** @param {unknown} value @returns {value is Record<string, unknown> & ReflexMetric} */
function validCommonMetric(value) {
  return (
    isRecord(value) &&
    isCount(value.valid) &&
    isNullableFinite(value.medianMs) &&
    (value.valid === 0 ? value.medianMs === null : value.medianMs !== null && value.medianMs >= 0)
  );
}

/** @param {unknown} value @returns {value is CurrentRiflessiLatestResult['events']} */
function validCurrentEvents(value) {
  return hasCountFields(value, [...EVENT_FIELDS, 'catchesPassed', 'catchesScheduled']);
}

/** @param {unknown} value @returns {value is LegacyRiflessiLatestResult['events']} */
function validLegacyEvents(value) {
  return hasCountFields(value, EVENT_FIELDS);
}

/** @param {unknown} value @param {string[]} fields */
function hasCountFields(value, fields) {
  return isRecord(value) && hasExactKeys(value, fields) && fields.every((field) => isCount(value[field]));
}

/** @param {number | null} signal @param {number | null} choice @param {number | null} difference */
function validBlockDifference(signal, choice, difference) {
  return signal === null || choice === null ? difference === null : difference !== null;
}

/** @param {unknown} value @param {number} count */
function validSpread(value, count) {
  return count === 0 ? value === null : typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** @param {unknown} value @param {number} denominator */
function validPercentage(value, denominator) {
  return denominator === 0
    ? value === null
    : typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

/** @param {unknown} value @returns {value is number | null} */
function isNullableFinite(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

/** @param {unknown} value @returns {value is number} */
function isCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** @param {Record<string, unknown>} value @param {string[]} keys */
function hasExactKeys(value, keys) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
