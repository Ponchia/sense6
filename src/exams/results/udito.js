import { isRecord } from '../../lib/storage.js';

/** @typedef {'Setup checks coherent' | 'Interpret with caution'} UditoSetupQuality */
/** @typedef {{ setupQuality: UditoSetupQuality, sampleRate: number, recordedAt: number }} UditoLatestResult */

const RESULT_KEYS = ['setupQuality', 'sampleRate', 'recordedAt'];
// JavaScript Date cannot represent timestamps beyond this inclusive bound.
const MAX_RECORDED_AT = 8_640_000_000_000_000;

/** @param {unknown} value @returns {value is UditoLatestResult} */
export function isUditoLatestResult(value) {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).length === RESULT_KEYS.length &&
    RESULT_KEYS.every((key) => Object.hasOwn(value, key)) &&
    (value.setupQuality === 'Setup checks coherent' || value.setupQuality === 'Interpret with caution') &&
    typeof value.sampleRate === 'number' &&
    Number.isFinite(value.sampleRate) &&
    value.sampleRate > 0 &&
    typeof value.recordedAt === 'number' &&
    Number.isSafeInteger(value.recordedAt) &&
    value.recordedAt >= 0 &&
    value.recordedAt <= MAX_RECORDED_AT
  );
}
