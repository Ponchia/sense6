/**
 * Stable, non-visual contracts shared by routing-adjacent services.
 *
 * Keep measurement identity and journal comparability here. The registry owns
 * presentation metadata; controllers own each experiment's runtime.
 */

/** @typedef {'tetracromia' | 'color-blindness' | 'riflessi' | 'udito' | 'acutezza'} ExamId */
/** @typedef {{ field: string, cautionRatio: number, hardRatio: number }} DistanceTolerance */
/** @typedef {{ hard: readonly string[], caution: readonly string[], alwaysCaution: readonly string[], distanceTolerance?: Readonly<DistanceTolerance> }} JournalPolicy */
/** @typedef {{ id: ExamId, metricTest: string, journal: Readonly<JournalPolicy> }} ExamContract */
/** @typedef {'left' | 'right'} AcutezzaEye */
/** @typedef {{ variant: 'single-eye' | 'both-eyes', eyes: AcutezzaEye[] } | { variant: 'legacy-count', eyes: [], count: 1 | 2 }} AcutezzaCompletion */
/** @typedef {{ setupQuality: 'Setup checks coherent' | 'Interpret with caution' | 'Run unusable', recordedAt: number, completion: AcutezzaCompletion }} AcutezzaLatestResult */
/** @typedef {{ setupQuality: 'Setup checks coherent' | 'Interpret with caution' | 'Run unusable', recordedAt: number, eyes: 1 | 2 }} LegacyAcutezzaLatestResult */

const ACUTEZZA_SETUP_QUALITIES = new Set(['Setup checks coherent', 'Interpret with caution', 'Run unusable']);

/** @param {ExamContract} contract @returns {Readonly<ExamContract>} */
function defineContract(contract) {
  const distanceTolerance = contract.journal.distanceTolerance
    ? Object.freeze({ ...contract.journal.distanceTolerance })
    : undefined;
  return Object.freeze({
    ...contract,
    journal: Object.freeze({
      hard: Object.freeze([...contract.journal.hard]),
      caution: Object.freeze([...contract.journal.caution]),
      alwaysCaution: Object.freeze([...contract.journal.alwaysCaution]),
      ...(distanceTolerance ? { distanceTolerance } : {}),
    }),
  });
}

export const EXAM_CONTRACTS = Object.freeze({
  tetracromia: defineContract({
    id: 'tetracromia',
    metricTest: 'tetracromia',
    journal: {
      hard: ['display', 'gamut'],
      caution: ['viewport'],
      alwaysCaution: [],
    },
  }),
  'color-blindness': defineContract({
    id: 'color-blindness',
    metricTest: 'daltonia',
    journal: {
      hard: ['display', 'gamut', 'theme', 'stimulusCssPixels', 'measurementDpr'],
      caution: ['measurementViewport', 'orientation'],
      alwaysCaution: [],
    },
  }),
  riflessi: defineContract({
    id: 'riflessi',
    metricTest: 'riflessi',
    journal: {
      hard: ['display', 'inputMode'],
      caution: ['frameCadence'],
      alwaysCaution: [],
    },
  }),
  udito: defineContract({
    id: 'udito',
    metricTest: 'udito',
    journal: {
      hard: ['device', 'connection', 'sampleRate'],
      caution: ['interruptions'],
      alwaysCaution: ['volume-not-verifiable'],
    },
  }),
  acutezza: defineContract({
    id: 'acutezza',
    metricTest: 'acutezza',
    journal: {
      hard: ['display', 'correction', 'contrastPercent', 'theme'],
      caution: ['calibrationState', 'cardWidthCssPx'],
      alwaysCaution: [],
      distanceTolerance: {
        field: 'distanceMm',
        cautionRatio: 0.05,
        hardRatio: 0.1,
      },
    },
  }),
});

/** @type {readonly ExamId[]} */
export const EXAM_IDS = Object.freeze(/** @type {ExamId[]} */ (Object.keys(EXAM_CONTRACTS)));

const EXAM_ID_SET = new Set(EXAM_IDS);
export const METRIC_TEST_IDS = Object.freeze(EXAM_IDS.map((id) => EXAM_CONTRACTS[id].metricTest));

/** @param {string} id @returns {id is ExamId} */
export function isExamId(id) {
  return EXAM_ID_SET.has(/** @type {ExamId} */ (id));
}

/** @param {string} id @returns {Readonly<ExamContract> | null} */
export function examContract(id) {
  return Object.hasOwn(EXAM_CONTRACTS, id) ? EXAM_CONTRACTS[/** @type {ExamId} */ (id)] : null;
}

/** @param {unknown} value @returns {value is AcutezzaLatestResult} */
export function isAcutezzaLatestResult(value) {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, ['completion', 'recordedAt', 'setupQuality']) &&
    validAcutezzaSetupQuality(value.setupQuality) &&
    typeof value.recordedAt === 'number' &&
    Number.isInteger(value.recordedAt) &&
    value.recordedAt > 0 &&
    validAcutezzaCompletion(value.completion)
  );
}

/** @param {unknown} value @returns {value is LegacyAcutezzaLatestResult} */
export function isLegacyAcutezzaLatestResult(value) {
  if (!isRecord(value)) return false;
  return (
    hasExactKeys(value, ['eyes', 'recordedAt', 'setupQuality']) &&
    validAcutezzaSetupQuality(value.setupQuality) &&
    typeof value.recordedAt === 'number' &&
    Number.isInteger(value.recordedAt) &&
    value.recordedAt > 0 &&
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
    completion: {
      variant: 'legacy-count',
      eyes: [],
      count: value.eyes,
    },
  };
}

/** @param {unknown} value */
function validAcutezzaCompletion(value) {
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
  if (!eyes.every((eye) => eye === 'left' || eye === 'right') || new Set(eyes).size !== eyes.length)
    return false;
  if (value.variant === 'single-eye') return eyes.length === 1;
  return value.variant === 'both-eyes' && eyes.length === 2;
}

/** @param {unknown} value */
function validAcutezzaSetupQuality(value) {
  return typeof value === 'string' && ACUTEZZA_SETUP_QUALITIES.has(value);
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
