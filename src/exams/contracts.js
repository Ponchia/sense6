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
