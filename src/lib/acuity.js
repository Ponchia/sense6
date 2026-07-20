import { shuffle } from './random.js';

/** @typedef {() => number} RandomSource */
/** @typedef {{ id: string, degrees: number, symbol: string, key: string }} AcuityDirection */
/** @typedef {{ blindSpotDegrees: number, repetitions: number, sweepMs: number, minDistanceMm: number, maxDistanceMm: number, maxSpreadPercent: number }} CalibrationConfig */
/** @typedef {{ trials: number, controlAt: readonly number[], contrast?: number }} AcuityStageConfig */
/** @typedef {{ minGapArcmin: number, maxGapArcmin: number, startGapArcmin: number, gridStepLog10: number, priorMedianArcmin: number, priorSigmaLog10: number, slope: number, guessRate: number, lapseRate: number, credibleMass: number }} AcuityEstimatorConfig */
/** @typedef {{ feedbackMs: number, practiceTrials: number, calibration: CalibrationConfig, high: AcuityStageConfig, low: AcuityStageConfig & { contrast: number }, estimator: AcuityEstimatorConfig }} AcuityConfig */
/** @typedef {Partial<Omit<AcuityConfig, 'calibration' | 'high' | 'low' | 'estimator'>> & { calibration?: Partial<CalibrationConfig>, high?: Partial<AcuityStageConfig>, low?: Partial<AcuityStageConfig & { contrast: number }>, estimator?: Partial<AcuityEstimatorConfig> }} AcuityConfigOverride */
/** @typedef {{ gapArcmin: number, orientation: string, control: boolean }} AcuityTrial */
/** @typedef {AcuityTrial & { selectedOrientation: string, correct: boolean }} AcuityRecord */
/** @typedef {{ config: AcuityEstimatorConfig, trials: number, controlAt: number[], grid: number[], posterior: number[], records: AcuityRecord[], controls: AcuityRecord[], orientations: string[], complete: boolean }} AcuityTrack */
/** @typedef {{ trials?: number, controlAt?: readonly number[], minGapArcmin?: number, maxGapArcmin?: number, estimator?: Partial<AcuityEstimatorConfig>, random?: RandomSource }} AcuityTrackOptions */
/** @typedef {{ distanceMm: number, cssPixelsPerMm: number, devicePixelRatio?: number, maxDiameterCssPx: number, minGapDevicePixels?: number, configuredMin?: number, configuredMax?: number }} GapBoundsOptions */
/** @typedef {{ thresholdArcmin: number, lowerArcmin: number, upperArcmin: number, uncertaintyRatio: number, atFloor: boolean, atCeiling: boolean, trials: number, controlCorrect: number, controls: number }} AcuitySummary */

export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
export const BLIND_SPOT_DEGREES = 13.5;

/** @type {readonly Readonly<AcuityDirection>[]} */
export const ACUITY_DIRECTIONS = Object.freeze([
  Object.freeze({ id: 'up', degrees: 0, symbol: '↑', key: '8' }),
  Object.freeze({ id: 'up-right', degrees: 45, symbol: '↗', key: '9' }),
  Object.freeze({ id: 'right', degrees: 90, symbol: '→', key: '6' }),
  Object.freeze({ id: 'down-right', degrees: 135, symbol: '↘', key: '3' }),
  Object.freeze({ id: 'down', degrees: 180, symbol: '↓', key: '2' }),
  Object.freeze({ id: 'down-left', degrees: 225, symbol: '↙', key: '1' }),
  Object.freeze({ id: 'left', degrees: 270, symbol: '←', key: '4' }),
  Object.freeze({ id: 'up-left', degrees: 315, symbol: '↖', key: '7' }),
]);

export const DEFAULT_ACUITY_CONFIG = Object.freeze({
  feedbackMs: 180,
  practiceTrials: 4,
  calibration: Object.freeze({
    blindSpotDegrees: BLIND_SPOT_DEGREES,
    repetitions: 3,
    sweepMs: 6500,
    minDistanceMm: 300,
    maxDistanceMm: 1000,
    maxSpreadPercent: 20,
  }),
  high: Object.freeze({ trials: 18, controlAt: Object.freeze([6, 14]) }),
  low: Object.freeze({ trials: 18, controlAt: Object.freeze([5, 13]), contrast: 0.1 }),
  estimator: Object.freeze({
    minGapArcmin: 0.35,
    maxGapArcmin: 40,
    startGapArcmin: 12,
    gridStepLog10: 0.02,
    priorMedianArcmin: 2,
    priorSigmaLog10: 0.5,
    slope: 6,
    guessRate: 0.125,
    lapseRate: 0.02,
    credibleMass: 0.9,
  }),
});

/** @param {AcuityConfigOverride | null} override @returns {AcuityConfig} */
export function mergeAcuityConfig(override = {}) {
  const safe = override ?? {};
  return {
    ...DEFAULT_ACUITY_CONFIG,
    ...safe,
    calibration: { ...DEFAULT_ACUITY_CONFIG.calibration, ...safe.calibration },
    high: { ...DEFAULT_ACUITY_CONFIG.high, ...safe.high },
    low: { ...DEFAULT_ACUITY_CONFIG.low, ...safe.low },
    estimator: { ...DEFAULT_ACUITY_CONFIG.estimator, ...safe.estimator },
  };
}

/** @param {number} cardWidthCssPx @param {number} cardWidthMm */
export function pixelsPerMillimetre(cardWidthCssPx, cardWidthMm = CARD_WIDTH_MM) {
  if (!(cardWidthCssPx > 0) || !(cardWidthMm > 0)) throw new RangeError('Card dimensions must be positive');
  return cardWidthCssPx / cardWidthMm;
}

/** @param {number} offsetCssPx @param {number} cssPixelsPerMm @param {number} blindSpotDegrees */
export function estimateViewingDistance(offsetCssPx, cssPixelsPerMm, blindSpotDegrees = BLIND_SPOT_DEGREES) {
  if (!(offsetCssPx > 0) || !(cssPixelsPerMm > 0)) return null;
  const offsetMm = offsetCssPx / cssPixelsPerMm;
  return offsetMm / Math.tan(degreesToRadians(blindSpotDegrees));
}

/** @param {readonly number[]} readingsMm @param {Partial<CalibrationConfig>} options */
export function summarizeBlindSpot(readingsMm, options = {}) {
  const config = { ...DEFAULT_ACUITY_CONFIG.calibration, ...options };
  const readings = readingsMm.filter((value) => Number.isFinite(value) && value > 0);
  if (readings.length < config.repetitions) {
    return { coherent: false, distanceMm: null, spreadPercent: null, readings };
  }
  const distanceMm = median(readings);
  if (distanceMm === null) {
    return { coherent: false, distanceMm: null, spreadPercent: null, readings };
  }
  const spreadPercent = ((Math.max(...readings) - Math.min(...readings)) / distanceMm) * 100;
  const coherent =
    distanceMm >= config.minDistanceMm &&
    distanceMm <= config.maxDistanceMm &&
    spreadPercent <= config.maxSpreadPercent;
  return {
    coherent,
    distanceMm: roundTo(distanceMm, 1),
    spreadPercent: roundTo(spreadPercent, 0.1),
    readings,
  };
}

/** @param {number} gapArcmin @param {number} distanceMm @param {number} cssPixelsPerMm */
export function arcminToCssPixels(gapArcmin, distanceMm, cssPixelsPerMm) {
  if (!(gapArcmin > 0) || !(distanceMm > 0) || !(cssPixelsPerMm > 0)) return null;
  const gapRadians = degreesToRadians(gapArcmin / 60);
  const gapMm = 2 * distanceMm * Math.tan(gapRadians / 2);
  return gapMm * cssPixelsPerMm;
}

/** @param {number} gapArcmin @param {number} distanceMm @param {number} cssPixelsPerMm */
export function landoltDiameterCssPixels(gapArcmin, distanceMm, cssPixelsPerMm) {
  const gapCssPx = arcminToCssPixels(gapArcmin, distanceMm, cssPixelsPerMm);
  return gapCssPx === null ? null : gapCssPx * 5;
}

/** @param {number} gapCssPx @param {number} distanceMm @param {number} cssPixelsPerMm */
export function cssPixelsToArcmin(gapCssPx, distanceMm, cssPixelsPerMm) {
  if (!(gapCssPx > 0) || !(distanceMm > 0) || !(cssPixelsPerMm > 0)) return null;
  const gapMm = gapCssPx / cssPixelsPerMm;
  return radiansToDegrees(2 * Math.atan(gapMm / (2 * distanceMm))) * 60;
}

/** @param {GapBoundsOptions} options */
export function measurableGapBounds({
  distanceMm,
  cssPixelsPerMm,
  devicePixelRatio = 1,
  maxDiameterCssPx,
  minGapDevicePixels = 0.75,
  configuredMin = DEFAULT_ACUITY_CONFIG.estimator.minGapArcmin,
  configuredMax = DEFAULT_ACUITY_CONFIG.estimator.maxGapArcmin,
}) {
  const floor = cssPixelsToArcmin(
    minGapDevicePixels / Math.max(devicePixelRatio, 1),
    distanceMm,
    cssPixelsPerMm,
  );
  const ceiling = cssPixelsToArcmin(maxDiameterCssPx / 5, distanceMm, cssPixelsPerMm);
  return {
    minGapArcmin: Math.max(configuredMin, floor ?? configuredMin),
    maxGapArcmin: Math.min(configuredMax, ceiling ?? configuredMax),
  };
}

/** @param {AcuityTrackOptions} options @returns {AcuityTrack} */
export function createAcuityTrack({
  trials = DEFAULT_ACUITY_CONFIG.high.trials,
  controlAt = DEFAULT_ACUITY_CONFIG.high.controlAt,
  minGapArcmin = DEFAULT_ACUITY_CONFIG.estimator.minGapArcmin,
  maxGapArcmin = DEFAULT_ACUITY_CONFIG.estimator.maxGapArcmin,
  estimator = {},
  random = Math.random,
} = {}) {
  const config = { ...DEFAULT_ACUITY_CONFIG.estimator, ...estimator, minGapArcmin, maxGapArcmin };
  if (!Number.isInteger(trials) || trials < 1) throw new RangeError('Acuity trials must be positive');
  if (!(config.maxGapArcmin > config.minGapArcmin)) throw new RangeError('Acuity range is not measurable');
  const grid = logarithmicGrid(config.minGapArcmin, config.maxGapArcmin, config.gridStepLog10);
  const priorCenter = Math.log10(config.priorMedianArcmin);
  const posterior = normalize(
    grid.map((value) => gaussian(Math.log10(value), priorCenter, config.priorSigmaLog10)),
  );
  return {
    config,
    trials,
    controlAt: [...controlAt],
    grid,
    posterior,
    records: [],
    controls: [],
    orientations: createOrientationSchedule(trials + controlAt.length + 4, random),
    complete: false,
  };
}

/** @param {AcuityTrack} track @returns {AcuityTrial | null} */
export function nextAcuityTrial(track) {
  if (track.complete) return null;
  const presentation = track.records.length + track.controls.length;
  const control = track.controlAt.includes(presentation);
  const estimate = posteriorQuantile(track, 0.5);
  let gapArcmin;
  if (control) {
    gapArcmin = clamp(Math.max(10, estimate * 4), track.config.minGapArcmin, track.config.maxGapArcmin);
  } else if (track.records.length === 0) {
    gapArcmin = clamp(track.config.startGapArcmin, track.config.minGapArcmin, track.config.maxGapArcmin);
  } else if (track.records.length < 3 && track.records.every((record) => record.correct)) {
    const previous = track.records.at(-1);
    if (!previous) throw new Error('Acuity track is missing its previous response');
    gapArcmin = clamp(previous.gapArcmin / 2, track.config.minGapArcmin, track.config.maxGapArcmin);
  } else {
    gapArcmin = mostInformativeStimulus(track);
  }
  const orientation = track.orientations[presentation % track.orientations.length];
  if (!orientation) throw new Error('Acuity orientation schedule is empty');
  return {
    gapArcmin,
    orientation,
    control,
  };
}

/** @param {AcuityTrack} track @param {AcuityTrial} trial @param {string} selectedOrientation */
export function recordAcuityResponse(track, trial, selectedOrientation) {
  const correct = selectedOrientation === trial.orientation;
  const record = { ...trial, selectedOrientation, correct };
  if (trial.control) {
    track.controls.push(record);
  } else {
    updatePosterior(track, trial.gapArcmin, correct);
    track.records.push(record);
  }
  const totalPresentations = track.records.length + track.controls.length;
  track.complete =
    track.records.length >= track.trials &&
    track.controlAt.every((position) => totalPresentations > position);
  return record;
}

/** @param {AcuityTrack} track @returns {AcuitySummary} */
export function summarizeAcuity(track) {
  const tail = (1 - track.config.credibleMass) / 2;
  const thresholdArcmin = posteriorQuantile(track, 0.5);
  const lowerArcmin = posteriorQuantile(track, tail);
  const upperArcmin = posteriorQuantile(track, 1 - tail);
  const rangeRatio = upperArcmin / lowerArcmin;
  return {
    thresholdArcmin: roundTo(thresholdArcmin, 0.1),
    lowerArcmin: roundTo(lowerArcmin, 0.1),
    upperArcmin: roundTo(upperArcmin, 0.1),
    uncertaintyRatio: roundTo(rangeRatio, 0.1),
    atFloor: lowerArcmin <= track.config.minGapArcmin * 1.05,
    atCeiling: upperArcmin >= track.config.maxGapArcmin * 0.95,
    trials: track.records.length,
    controlCorrect: track.controls.filter((record) => record.correct).length,
    controls: track.controls.length,
  };
}

/** @param {number} count @param {RandomSource} random @returns {string[]} */
export function createOrientationSchedule(count, random = Math.random) {
  /** @type {string[]} */
  const schedule = [];
  while (schedule.length < count) {
    schedule.push(
      ...shuffle(
        ACUITY_DIRECTIONS.map((direction) => direction.id),
        random,
      ),
    );
  }
  return schedule.slice(0, count);
}

/** @param {number} michelsonContrast @param {number} backgroundLinear */
export function contrastGrays(michelsonContrast, backgroundLinear = 0.5) {
  const contrast = clamp(michelsonContrast, 0, 0.95);
  const targetLinear = (backgroundLinear * (1 - contrast)) / (1 + contrast);
  return {
    background: grayscaleCss(linearToSrgb(backgroundLinear)),
    target: grayscaleCss(linearToSrgb(targetLinear)),
    backgroundLinear,
    targetLinear,
    contrast,
  };
}

/** @param {number} highThresholdArcmin @param {number} lowThresholdArcmin */
export function percentContrastCost(highThresholdArcmin, lowThresholdArcmin) {
  if (!(highThresholdArcmin > 0) || !(lowThresholdArcmin > 0)) return null;
  return roundTo((lowThresholdArcmin / highThresholdArcmin - 1) * 100, 1);
}

/** @param {AcuitySummary | null} high @param {AcuitySummary | null} low */
export function summarizeContrastCost(high, low) {
  if (!high || !low) return { value: null, bounded: false };
  const bounded = high.atFloor || high.atCeiling || low.atFloor || low.atCeiling;
  return {
    value: bounded ? null : percentContrastCost(high.thresholdArcmin, low.thresholdArcmin),
    bounded,
  };
}

/** @param {AcuityTrack} track @param {number} stimulusArcmin @param {boolean} correct */
function updatePosterior(track, stimulusArcmin, correct) {
  const stimulusLog = Math.log10(stimulusArcmin);
  track.posterior = normalize(
    track.posterior.map((prior, index) => {
      const threshold = requiredNumber(track.grid[index], 'acuity threshold grid');
      const probability = probabilityCorrect(stimulusLog, Math.log10(threshold), track.config);
      return prior * (correct ? probability : 1 - probability);
    }),
  );
}

/** @param {AcuityTrack} track */
function mostInformativeStimulus(track) {
  let best = posteriorQuantile(track, 0.5);
  let bestEntropy = Number.POSITIVE_INFINITY;
  for (const stimulus of track.grid) {
    let correctProbability = 0;
    const likelihoods = track.grid.map((threshold, index) => {
      const probability = probabilityCorrect(Math.log10(stimulus), Math.log10(threshold), track.config);
      correctProbability += requiredNumber(track.posterior[index], 'acuity posterior') * probability;
      return probability;
    });
    const incorrectProbability = 1 - correctProbability;
    const correctPosterior = likelihoods.map(
      (likelihood, index) =>
        (requiredNumber(track.posterior[index], 'acuity posterior') * likelihood) /
        Math.max(correctProbability, 1e-12),
    );
    const incorrectPosterior = likelihoods.map(
      (likelihood, index) =>
        (requiredNumber(track.posterior[index], 'acuity posterior') * (1 - likelihood)) /
        Math.max(incorrectProbability, 1e-12),
    );
    const expectedEntropy =
      correctProbability * entropy(correctPosterior) + incorrectProbability * entropy(incorrectPosterior);
    if (expectedEntropy < bestEntropy) {
      bestEntropy = expectedEntropy;
      best = stimulus;
    }
  }
  return best;
}

/** @param {AcuityTrack} track @param {number} probability */
function posteriorQuantile(track, probability) {
  let cumulative = 0;
  for (let index = 0; index < track.grid.length; index += 1) {
    cumulative += requiredNumber(track.posterior[index], 'acuity posterior');
    const threshold = requiredNumber(track.grid[index], 'acuity threshold grid');
    if (cumulative >= probability) return threshold;
  }
  return track.grid.at(-1) ?? track.config.maxGapArcmin;
}

/** @param {number} stimulusLog @param {number} thresholdLog @param {AcuityEstimatorConfig} config */
function probabilityCorrect(stimulusLog, thresholdLog, config) {
  const logistic = 1 / (1 + Math.exp(-config.slope * (stimulusLog - thresholdLog)));
  return config.guessRate + (1 - config.guessRate - config.lapseRate) * logistic;
}

/** @param {number} minimum @param {number} maximum @param {number} step */
function logarithmicGrid(minimum, maximum, step) {
  const lower = Math.log10(minimum);
  const upper = Math.log10(maximum);
  const count = Math.ceil((upper - lower) / step);
  return Array.from({ length: count + 1 }, (_, index) => 10 ** (lower + ((upper - lower) * index) / count));
}

/** @param {number} value @param {number} center @param {number} sigma */
function gaussian(value, center, sigma) {
  return Math.exp(-0.5 * ((value - center) / sigma) ** 2);
}

/** @param {readonly number[]} values */
function normalize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return values.map(() => 1 / values.length);
  return values.map((value) => value / total);
}

/** @param {readonly number[]} values */
function entropy(values) {
  return -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0);
}

/** @param {number} value */
function linearToSrgb(value) {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return clamp(channel, 0, 1);
}

/** @param {number} value */
function grayscaleCss(value) {
  const byte = Math.round(value * 255);
  return `rgb(${byte} ${byte} ${byte})`;
}

/** @param {number} degrees */
function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** @param {number} radians */
function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/** @param {readonly number[]} values @returns {number | null} */
function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  if (sorted.length % 2) return upper;
  const lower = sorted[middle - 1];
  return lower === undefined ? null : (lower + upper) / 2;
}

/** @param {number | undefined} value @param {string} label */
function requiredNumber(value, label) {
  if (value === undefined) throw new Error(`Missing ${label} value`);
  return value;
}

/** @param {number} value @param {number} minimum @param {number} maximum */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** @param {number} value @param {number} step */
function roundTo(value, step) {
  return Math.round(value / step) * step;
}
