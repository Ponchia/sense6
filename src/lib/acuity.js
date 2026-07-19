import { shuffle } from './random.js';

export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
export const BLIND_SPOT_DEGREES = 13.5;

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
  high: Object.freeze({ trials: 18, controlAt: Object.freeze([6]) }),
  low: Object.freeze({ trials: 18, controlAt: Object.freeze([11]), contrast: 0.1 }),
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
  meridian: Object.freeze({
    angles: Object.freeze([0, 30, 60, 90, 120, 150]),
    scales: Object.freeze([1.25, 1.8]),
    stableRate: 0.65,
    stableMargin: 0.08,
  }),
});

export function mergeAcuityConfig(override = {}) {
  const safe = override ?? {};
  return {
    ...DEFAULT_ACUITY_CONFIG,
    ...safe,
    calibration: { ...DEFAULT_ACUITY_CONFIG.calibration, ...safe.calibration },
    high: { ...DEFAULT_ACUITY_CONFIG.high, ...safe.high },
    low: { ...DEFAULT_ACUITY_CONFIG.low, ...safe.low },
    estimator: { ...DEFAULT_ACUITY_CONFIG.estimator, ...safe.estimator },
    meridian: { ...DEFAULT_ACUITY_CONFIG.meridian, ...safe.meridian },
  };
}

export function pixelsPerMillimetre(cardWidthCssPx, cardWidthMm = CARD_WIDTH_MM) {
  if (!(cardWidthCssPx > 0) || !(cardWidthMm > 0)) throw new RangeError('Card dimensions must be positive');
  return cardWidthCssPx / cardWidthMm;
}

export function estimateViewingDistance(offsetCssPx, cssPixelsPerMm, blindSpotDegrees = BLIND_SPOT_DEGREES) {
  if (!(offsetCssPx > 0) || !(cssPixelsPerMm > 0)) return null;
  const offsetMm = offsetCssPx / cssPixelsPerMm;
  return offsetMm / Math.tan(degreesToRadians(blindSpotDegrees));
}

export function summarizeBlindSpot(readingsMm, options = {}) {
  const config = { ...DEFAULT_ACUITY_CONFIG.calibration, ...options };
  const readings = readingsMm.filter((value) => Number.isFinite(value) && value > 0);
  if (readings.length < config.repetitions) {
    return { coherent: false, distanceMm: null, spreadPercent: null, readings };
  }
  const distanceMm = median(readings);
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

export function arcminToCssPixels(gapArcmin, distanceMm, cssPixelsPerMm) {
  if (!(gapArcmin > 0) || !(distanceMm > 0) || !(cssPixelsPerMm > 0)) return null;
  const gapRadians = degreesToRadians(gapArcmin / 60);
  const gapMm = 2 * distanceMm * Math.tan(gapRadians / 2);
  return gapMm * cssPixelsPerMm;
}

export function landoltDiameterCssPixels(gapArcmin, distanceMm, cssPixelsPerMm) {
  const gapCssPx = arcminToCssPixels(gapArcmin, distanceMm, cssPixelsPerMm);
  return gapCssPx === null ? null : gapCssPx * 5;
}

export function cssPixelsToArcmin(gapCssPx, distanceMm, cssPixelsPerMm) {
  if (!(gapCssPx > 0) || !(distanceMm > 0) || !(cssPixelsPerMm > 0)) return null;
  const gapMm = gapCssPx / cssPixelsPerMm;
  return radiansToDegrees(2 * Math.atan(gapMm / (2 * distanceMm))) * 60;
}

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

export function createAcuityTrack({
  trials = DEFAULT_ACUITY_CONFIG.high.trials,
  controlAt = DEFAULT_ACUITY_CONFIG.high.controlAt,
  minGapArcmin = DEFAULT_ACUITY_CONFIG.estimator.minGapArcmin,
  maxGapArcmin = DEFAULT_ACUITY_CONFIG.estimator.maxGapArcmin,
  estimator = {},
  random = Math.random,
} = {}) {
  const config = { ...DEFAULT_ACUITY_CONFIG.estimator, ...estimator, minGapArcmin, maxGapArcmin };
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
    gapArcmin = clamp(
      track.records.at(-1).gapArcmin / 2,
      track.config.minGapArcmin,
      track.config.maxGapArcmin,
    );
  } else {
    gapArcmin = mostInformativeStimulus(track);
  }
  return {
    gapArcmin,
    orientation: track.orientations[presentation % track.orientations.length],
    control,
  };
}

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

export function summarizeAcuity(track) {
  const tail = (1 - track.config.credibleMass) / 2;
  const thresholdArcmin = posteriorQuantile(track, 0.5);
  const lowerArcmin = posteriorQuantile(track, tail);
  const upperArcmin = posteriorQuantile(track, 1 - tail);
  const rangeRatio = upperArcmin / lowerArcmin;
  return {
    thresholdArcmin: roundTo(thresholdArcmin, 0.01),
    lowerArcmin: roundTo(lowerArcmin, 0.01),
    upperArcmin: roundTo(upperArcmin, 0.01),
    uncertaintyRatio: roundTo(rangeRatio, 0.01),
    atFloor: lowerArcmin <= track.config.minGapArcmin * 1.05,
    atCeiling: upperArcmin >= track.config.maxGapArcmin * 0.95,
    trials: track.records.length,
    controlCorrect: track.controls.filter((record) => record.correct).length,
    controls: track.controls.length,
  };
}

export function createOrientationSchedule(count, random = Math.random) {
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

export function createMeridianSchedule(options = {}) {
  const angles = [...(options.angles ?? DEFAULT_ACUITY_CONFIG.meridian.angles)];
  const scales = [...(options.scales ?? DEFAULT_ACUITY_CONFIG.meridian.scales)];
  const random = options.random ?? Math.random;
  const schedule = [];
  for (const [block, scale] of scales.entries()) {
    const pairs = [];
    for (let left = 0; left < angles.length; left += 1) {
      for (let right = left + 1; right < angles.length; right += 1) {
        const swap = random() >= 0.5;
        pairs.push({
          block,
          scale,
          phase: random(),
          leftAngle: swap ? angles[right] : angles[left],
          rightAngle: swap ? angles[left] : angles[right],
        });
      }
    }
    schedule.push(...shuffle(pairs, random));
  }
  return schedule;
}

export function summarizeMeridians(records, options = {}) {
  const config = { ...DEFAULT_ACUITY_CONFIG.meridian, ...options };
  const blocks = [...new Set(records.map((record) => record.block))];
  const summarize = (subset) => {
    const scores = new Map(config.angles.map((angle) => [angle, { angle, points: 0, appearances: 0 }]));
    for (const record of subset) {
      const left = scores.get(record.leftAngle);
      const right = scores.get(record.rightAngle);
      if (!left || !right) continue;
      left.appearances += 1;
      right.appearances += 1;
      if (record.choice === 'left') left.points += 1;
      if (record.choice === 'right') right.points += 1;
      if (record.choice === 'equal') {
        left.points += 0.5;
        right.points += 0.5;
      }
    }
    return [...scores.values()]
      .map((entry) => ({
        ...entry,
        rate: entry.appearances ? entry.points / entry.appearances : 0,
      }))
      .sort((left, right) => right.rate - left.rate || left.angle - right.angle);
  };
  const overall = summarize(records);
  const perBlock = blocks.map((block) => summarize(records.filter((record) => record.block === block)));
  const leader = overall[0];
  const runnerUp = overall[1];
  const sameLeader = perBlock.length > 1 && perBlock.every((block) => block[0]?.angle === leader?.angle);
  const margin = (leader?.rate ?? 0) - (runnerUp?.rate ?? 0);
  const equalPercent = records.length
    ? (records.filter((record) => record.choice === 'equal').length / records.length) * 100
    : 0;
  const stable =
    Boolean(leader) && sameLeader && leader.rate >= config.stableRate && margin >= config.stableMargin;
  return {
    stable,
    preferredAngle: stable ? leader.angle : null,
    consistencyPercent: roundTo((leader?.rate ?? 0) * 100, 1),
    marginPercent: roundTo(margin * 100, 1),
    equalPercent: roundTo(equalPercent, 1),
    comparisons: records.length,
    angles: overall,
  };
}

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

export function percentContrastCost(highThresholdArcmin, lowThresholdArcmin) {
  if (!(highThresholdArcmin > 0) || !(lowThresholdArcmin > 0)) return null;
  return roundTo((lowThresholdArcmin / highThresholdArcmin - 1) * 100, 1);
}

function updatePosterior(track, stimulusArcmin, correct) {
  const stimulusLog = Math.log10(stimulusArcmin);
  track.posterior = normalize(
    track.posterior.map((prior, index) => {
      const probability = probabilityCorrect(stimulusLog, Math.log10(track.grid[index]), track.config);
      return prior * (correct ? probability : 1 - probability);
    }),
  );
}

function mostInformativeStimulus(track) {
  let best = posteriorQuantile(track, 0.5);
  let bestEntropy = Number.POSITIVE_INFINITY;
  for (const stimulus of track.grid) {
    let correctProbability = 0;
    const likelihoods = track.grid.map((threshold, index) => {
      const probability = probabilityCorrect(Math.log10(stimulus), Math.log10(threshold), track.config);
      correctProbability += track.posterior[index] * probability;
      return probability;
    });
    const incorrectProbability = 1 - correctProbability;
    const correctPosterior = likelihoods.map(
      (likelihood, index) => (track.posterior[index] * likelihood) / Math.max(correctProbability, 1e-12),
    );
    const incorrectPosterior = likelihoods.map(
      (likelihood, index) =>
        (track.posterior[index] * (1 - likelihood)) / Math.max(incorrectProbability, 1e-12),
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

function posteriorQuantile(track, probability) {
  let cumulative = 0;
  for (let index = 0; index < track.grid.length; index += 1) {
    cumulative += track.posterior[index];
    if (cumulative >= probability) return track.grid[index];
  }
  return track.grid.at(-1);
}

function probabilityCorrect(stimulusLog, thresholdLog, config) {
  const logistic = 1 / (1 + Math.exp(-config.slope * (stimulusLog - thresholdLog)));
  return config.guessRate + (1 - config.guessRate - config.lapseRate) * logistic;
}

function logarithmicGrid(minimum, maximum, step) {
  const lower = Math.log10(minimum);
  const upper = Math.log10(maximum);
  const count = Math.ceil((upper - lower) / step);
  return Array.from({ length: count + 1 }, (_, index) => 10 ** (lower + ((upper - lower) * index) / count));
}

function gaussian(value, center, sigma) {
  return Math.exp(-0.5 * ((value - center) / sigma) ** 2);
}

function normalize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return values.map(() => 1 / values.length);
  return values.map((value) => value / total);
}

function entropy(values) {
  return -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0);
}

function linearToSrgb(value) {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return clamp(channel, 0, 1);
}

function grayscaleCss(value) {
  const byte = Math.round(value * 255);
  return `rgb(${byte} ${byte} ${byte})`;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}
