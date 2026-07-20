/**
 * Frozen protocol passports for locally stored results.
 *
 * These identifiers describe software methods, not clinical validation. A
 * method/config/stimulus change creates a new comparison cohort. Historical
 * schema-v1 records are deliberately labelled as legacy exploratory runs.
 */

/** @typedef {import('./contracts.js').ExamId} ExamId */
/** @typedef {{ methodVersion: string, profileId: string, configDigest: string, stimulusVersion: string, estimator: string, stoppingRule: string, responsePolicy: string, interruptionPolicy: string, replayPolicy: string }} ProtocolPassport */
/** @typedef {Readonly<Record<string, Partial<ProtocolPassport>>>} ProtocolProfileOverrides */

/** @type {Readonly<Record<ExamId, Readonly<ProtocolPassport>>>} */
export const EXAM_PROTOCOLS = Object.freeze({
  tetracromia: protocol({
    methodVersion: 'screen-colour-lab-v2',
    profileId: 'quick-observation',
    configDigest: 'threshold14-field12-order3',
    stimulusVersion: 'oklch-screen-stimuli-v2',
    estimator: 'separate short-run task summaries',
    stoppingRule: 'fixed 14 + 12 + 3 blocks',
    responsePolicy: 'one locked response after first paint',
    interruptionPolicy: 'invalidate active stimulus after visibility or material geometry change',
    replayPolicy: 'fresh stimulus; never pool or keep a best run',
  }),
  'color-blindness': protocol({
    methodVersion: 'daltonia-display-directions-v3',
    profileId: 'exploratory-adaptive',
    configDigest: '3axis-12max-3control-2practice',
    stimulusVersion: 'hpe-srgb-noise-v2',
    estimator: 'recent reversal or presentation level by display direction',
    stoppingRule: '2-down/1-up; fixed cap; declared floor and ceiling',
    responsePolicy: 'validated four-way/no-gap response after first paint',
    interruptionPolicy: 'invalidate run after visibility or display-environment change',
    replayPolicy: 'fresh randomized target after a restart',
  }),
  riflessi: protocol({
    methodVersion: 'riflessi-v2',
    profileId: 'complete',
    configDigest: 'signal8p20m2c-choice8p32m-sustain180s',
    stimulusVersion: 'visual-response-v2',
    estimator: 'median valid response and within-run spread',
    stoppingRule: 'fixed scheduled events and fixed sustained duration',
    responsePolicy: 'first eligible pointer or scoped Space response',
    interruptionPolicy: 'pause and discard the interrupted active event',
    replayPolicy: 'fresh random choice side and delay after interruption',
  }),
  udito: protocol({
    methodVersion: 'udito-v2',
    profileId: 'standard',
    configDigest: 'cuffie2p6m-portata12to28-2control-pitch2x10to18',
    stimulusVersion: 'web-audio-tones-v2',
    estimator: 'separate headphone, audibility-range, and pitch summaries',
    stoppingRule: 'declared controls and per-track adaptive caps',
    responsePolicy: 'one locked response per completed audio interval',
    interruptionPolicy: 'pause audio and replay a fresh trial after setup confirmation',
    replayPolicy: 'independent track; never pool or retain only the best',
  }),
  acutezza: protocol({
    methodVersion: 'acutezza-v2',
    profileId: 'standard',
    configDigest: '4practice-18score-2control-per-condition-eye',
    stimulusVersion: 'landolt-calibrated-v2',
    estimator: 'Bayesian angular-detail estimate with 90% model interval',
    stoppingRule: 'fixed per-eye and per-condition schedule',
    responsePolicy: 'one eight-way response after first paint',
    interruptionPolicy: 'pause and require distance/setup recheck',
    replayPolicy: 'fresh trial; repeat runs remain independent',
  }),
});

/** @type {Readonly<Partial<Record<ExamId, ProtocolProfileOverrides>>>} */
const PROFILE_OVERRIDES = Object.freeze({
  riflessi: Object.freeze({
    signal: Object.freeze({
      configDigest: 'signal8p20m2c',
      stoppingRule: 'fixed 20 signal + 2 catch schedule',
    }),
    'signal-choice': Object.freeze({
      configDigest: 'signal8p20m2c-choice8p32m',
      stoppingRule: 'fixed signal and choice schedules',
    }),
  }),
  udito: Object.freeze({
    focused: Object.freeze({
      configDigest: 'cuffie2p6m-portata12to28-2control',
      stoppingRule: 'declared headphone and range controls with an adaptive range cap',
    }),
  }),
  acutezza: Object.freeze({
    focused: Object.freeze({
      configDigest: '4practice-18score-2control-per-eye-high-only',
      stoppingRule: 'fixed per-eye high-contrast schedule',
    }),
  }),
});

/** @param {ExamId} examId @param {string} [profileId] */
export function protocolPassport(examId, profileId) {
  const base = EXAM_PROTOCOLS[examId];
  if (!profileId || profileId === base.profileId || profileId === defaultProfileAlias(examId)) return base;
  const overrides = PROFILE_OVERRIDES[examId]?.[profileId];
  if (!overrides) throw new RangeError(`Unknown ${examId} protocol profile: ${profileId}`);
  return Object.freeze({ ...base, ...overrides, profileId });
}

/** @param {ExamId} examId */
function defaultProfileAlias(examId) {
  /** @type {Partial<Record<ExamId, string>>} */
  const aliases = { riflessi: 'complete', udito: 'standard', acutezza: 'standard' };
  return aliases[examId] ?? null;
}

/** @param {ExamId} examId */
export function legacyProtocolPassport(examId) {
  return protocol({
    methodVersion: `${examId}-v1-legacy`,
    profileId: 'legacy-exploratory',
    configDigest: 'legacy-unrecorded-config',
    stimulusVersion: 'legacy-unrecorded-stimulus',
    estimator: 'legacy unversioned estimator',
    stoppingRule: 'legacy unrecorded stopping rule',
    responsePolicy: 'legacy unrecorded response policy',
    interruptionPolicy: 'legacy unrecorded interruption policy',
    replayPolicy: 'legacy unrecorded replay policy',
  });
}

/** @param {ProtocolPassport} value */
function protocol(value) {
  return Object.freeze({ ...value });
}
