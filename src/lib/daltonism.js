/*
 * Daltonia's display-colour model and adaptive threshold logic.
 *
 * The fixed matrix below is a normalized, D65-referenced LMS approximation for
 * linear sRGB. It is useful for choosing repeatable cone-like stimulus
 * directions on an sRGB display, but it does not measure an observer's cone
 * fundamentals or the spectral output of their device. The product copy must
 * therefore describe these as display-relative directions, never as exact cone
 * excitations.
 *
 * Background:
 * - CIE 2006 LMS cone fundamentals: https://doi.org/10.25039/CIE.DS.tijidesg
 * - sRGB transfer and primary definitions: https://www.w3.org/TR/css-color-4/#color-conversion-code
 * - Dichromat simulation model: https://doi.org/10.1364/JOSAA.14.002647
 * - Anomalous-trichromacy model: https://doi.org/10.1109/TVCG.2009.113
 */

/** @typedef {() => number} RandomSource */
/** @typedef {'protan' | 'deutan' | 'tritan'} AxisType */
/** @typedef {AxisType | 'control'} TrialType */
/** @typedef {'up' | 'right' | 'down' | 'left'} Orientation */
/** @typedef {'up' | 'down'} StaircaseDirection */
/** @typedef {'floor' | 'ceiling'} AxisLimit */
/** @typedef {{ label: string, description: string, background: readonly number[] }} AxisConfig */
/** @typedef {{ forcedColors: boolean, theme: string, dpr: number, orientation: string, viewportWidth: number, viewportHeight: number }} DisplayEnvironment */
/** @typedef {{ strength: number, correct: boolean }} AxisPresentation */
/** @typedef {{ strength: number, step: number, correctStreak: number, lastDirection: StaircaseDirection | null, reversals: number[], presentations: AxisPresentation[], boundaryMisses: number, finished: boolean, limit: AxisLimit | null }} AxisState */
/** @typedef {{ id: string, type: TrialType, orientation: Orientation }} AdaptiveSlot */
/** @typedef {AdaptiveSlot & { label: string, description: string, background: readonly number[], strength: number }} AdaptiveTrial */
/** @typedef {{ trialId: string, type: TrialType, orientation: Orientation, answer: string, strength: number, correct: boolean }} AdaptiveResponse */
/** @typedef {{ index: number, schedule: AdaptiveSlot[], axes: Record<AxisType, AxisState>, controls: { correct: number, total: number }, responses: AdaptiveResponse[] }} AdaptiveRun */

const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
];

const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
];

/** @param {number} value @param {number} minimum @param {number} maximum */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** @param {number} value */
function clamp01(value) {
  return clamp(value, 0, 1);
}

/** @param {readonly number[]} vector */
function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((component) => component / length);
}

/** @param {number} value */
function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

/** @param {readonly number[]} values */
function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * @template T
 * @param {readonly T[]} values
 * @param {RandomSource} random
 * @returns {T[]}
 */
function shuffled(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

/** @param {number} channel */
export function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** @param {number} value */
export function linearToSrgb(value) {
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * clamp01(value) ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(encoded) * 255);
}

/** @type {Record<TrialType, number[]>} */
export const CONFUSION_DIRECTIONS = {
  protan: normalize(LMS_TO_RGB.map((row) => row[0])),
  deutan: normalize(LMS_TO_RGB.map((row) => row[1])),
  tritan: normalize(LMS_TO_RGB.map((row) => row[2])),
  // A deliberately conspicuous mixed chromatic/luminance direction for task
  // controls. Passing it checks interaction and attention, not calibration.
  control: normalize([0.65, -0.2, 0.73]),
};

/** @type {Record<AxisType, AxisConfig>} */
export const AXIS_CONFIGS = {
  protan: {
    label: 'L direction',
    description: 'Protan-aligned display direction',
    background: [0.43, 0.34, 0.22],
  },
  deutan: {
    label: 'M direction',
    description: 'Deutan-aligned display direction',
    background: [0.4, 0.31, 0.18],
  },
  tritan: {
    label: 'S direction',
    description: 'Tritan-aligned display direction',
    background: [0.36, 0.34, 0.2],
  },
};

/** @type {readonly AxisType[]} */
export const AXIS_TYPES = Object.freeze(/** @type {AxisType[]} */ (Object.keys(AXIS_CONFIGS)));
/** @type {readonly Orientation[]} */
export const ORIENTATIONS = Object.freeze(['up', 'right', 'down', 'left']);

export const ADAPTIVE_CONFIG = Object.freeze({
  trialsPerAxis: 12,
  controlTrials: 3,
  initialStrength: 0.2,
  minimumStrength: 0.035,
  maximumStrength: 0.32,
  initialStep: 0.055,
  minimumStep: 0.012,
  controlStrength: 0.32,
});

/**
 * Identify display changes that make a browser-relative measurement run
 * incomparable with the conditions captured at its start.
 *
 * @param {DisplayEnvironment | null} baseline
 * @param {DisplayEnvironment | null} current
 */
export function displayEnvironmentChange(baseline, current) {
  if (!baseline || !current) return 'missing';
  if (baseline.forcedColors !== current.forcedColors) return 'forced-colors';
  if (baseline.theme !== current.theme) return 'theme';
  if (baseline.dpr !== current.dpr) return 'dpr';
  if (baseline.orientation !== current.orientation) return 'orientation';
  if (
    Math.abs(baseline.viewportWidth - current.viewportWidth) > 1 ||
    Math.abs(baseline.viewportHeight - current.viewportHeight) > 1
  ) {
    return 'geometry';
  }
  return null;
}

export const DEMO_TARGET = Object.freeze({
  type: 'deutan',
  orientation: 'right',
  strength: 0.2,
  background: AXIS_CONFIGS.deutan.background,
});

/** @param {readonly number[]} linearRgb */
export function lmsOf(linearRgb) {
  return RGB_TO_LMS.map((row) => row[0] * linearRgb[0] + row[1] * linearRgb[1] + row[2] * linearRgb[2]);
}

/**
 * Return a field/target pair separated along one fixed display-model direction.
 * Both values are retained in linear sRGB so luminance noise can be applied
 * before encoding for canvas.
 *
 * @param {readonly number[]} backgroundLinear
 * @param {TrialType} type
 * @param {number} strength
 */
export function makeTargetPair(backgroundLinear, type, strength) {
  const direction = CONFUSION_DIRECTIONS[type] ?? CONFUSION_DIRECTIONS.deutan;
  const targetLinear = backgroundLinear.map((channel, index) =>
    clamp01(channel + direction[index] * strength),
  );
  return {
    field: backgroundLinear.map(linearToSrgb),
    target: targetLinear.map(linearToSrgb),
    fieldLinear: backgroundLinear,
    targetLinear,
  };
}

/**
 * Apply the same luminance-noise distribution to target and field dots.
 *
 * @param {readonly number[]} baseLinear
 * @param {RandomSource} random
 * @param {number} luminanceJitter
 */
export function jitterDotColor(baseLinear, random, luminanceJitter = 0.18) {
  const scale = 1 + (random() - 0.5) * 2 * luminanceJitter;
  return baseLinear.map((channel) => linearToSrgb(channel * scale));
}

/** @param {readonly number[]} channels */
export function rgbCss(channels) {
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

/** @param {readonly number[]} a @param {readonly number[]} b */
export function srgbDistance(a, b) {
  const rMean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

/** @returns {AxisState} */
function createAxisState() {
  return {
    strength: ADAPTIVE_CONFIG.initialStrength,
    step: ADAPTIVE_CONFIG.initialStep,
    correctStreak: 0,
    lastDirection: null,
    reversals: [],
    presentations: [],
    boundaryMisses: 0,
    finished: false,
    limit: null,
  };
}

/** @param {RandomSource} random @returns {AdaptiveSlot[]} */
function buildSchedule(random) {
  /** @type {TrialType[]} */
  const schedule = [];
  const controlRounds = new Set(
    Array.from({ length: ADAPTIVE_CONFIG.controlTrials }, (_, index) =>
      Math.floor((index * ADAPTIVE_CONFIG.trialsPerAxis) / ADAPTIVE_CONFIG.controlTrials),
    ),
  );
  for (let round = 0; round < ADAPTIVE_CONFIG.trialsPerAxis; round += 1) {
    if (controlRounds.has(round)) schedule.push('control');
    schedule.push(...shuffled(AXIS_TYPES, random));
  }
  return schedule.map((type, index) => ({
    id: `${type}-${index + 1}`,
    type,
    orientation: ORIENTATIONS[Math.floor(random() * ORIENTATIONS.length)],
  }));
}

/**
 * Create one randomized, interleaved adaptive run.
 *
 * @param {RandomSource} random
 * @returns {AdaptiveRun}
 */
export function createAdaptiveRun(random = Math.random) {
  /** @type {Record<AxisType, AxisState>} */
  const axes = /** @type {Record<AxisType, AxisState>} */ (
    Object.fromEntries(AXIS_TYPES.map((type) => [type, createAxisState()]))
  );
  return {
    index: 0,
    schedule: buildSchedule(random),
    axes,
    controls: { correct: 0, total: 0 },
    responses: [],
  };
}

/** @param {AdaptiveRun} run @returns {AdaptiveTrial | null} */
export function currentAdaptiveTrial(run) {
  const slot = run.schedule[run.index];
  if (!slot) return null;
  if (slot.type === 'control') {
    return {
      ...slot,
      label: 'Task control',
      description: 'High-contrast task control',
      background: [0.27, 0.32, 0.18],
      strength: ADAPTIVE_CONFIG.controlStrength,
    };
  }

  return {
    ...slot,
    ...AXIS_CONFIGS[slot.type],
    strength: run.axes[slot.type].strength,
  };
}

/** @param {AxisState} state @param {boolean} correct */
function updateStaircase(state, correct) {
  state.presentations.push({ strength: state.strength, correct });

  if (correct) {
    state.boundaryMisses = 0;
  } else if (state.strength >= ADAPTIVE_CONFIG.maximumStrength) {
    state.boundaryMisses += 1;
    if (state.boundaryMisses >= 2) {
      state.finished = true;
      state.limit = 'ceiling';
      return;
    }
  } else {
    state.boundaryMisses = 0;
  }

  /** @type {StaircaseDirection | null} */
  let direction = null;
  if (correct) {
    state.correctStreak += 1;
    if (state.correctStreak >= 2) {
      direction = 'down';
      state.correctStreak = 0;
    }
  } else {
    direction = 'up';
    state.correctStreak = 0;
  }

  if (!direction) return;

  if (direction === 'down' && state.strength <= ADAPTIVE_CONFIG.minimumStrength) {
    state.finished = true;
    state.limit = 'floor';
    return;
  }

  if (state.lastDirection && state.lastDirection !== direction) {
    state.reversals.push(state.strength);
    state.step = Math.max(ADAPTIVE_CONFIG.minimumStep, state.step * 0.65);
  }

  state.lastDirection = direction;
  const change = direction === 'down' ? -state.step : state.step;
  state.strength = clamp(
    state.strength + change,
    ADAPTIVE_CONFIG.minimumStrength,
    ADAPTIVE_CONFIG.maximumStrength,
  );
}

/** @param {AdaptiveRun} run */
function skipFinishedAxisSlots(run) {
  while (run.index < run.schedule.length) {
    const nextType = run.schedule[run.index].type;
    if (nextType === 'control' || !run.axes[nextType].finished) return;
    run.index += 1;
  }
}

/**
 * Record a forced-choice answer and advance the run by one presentation.
 *
 * @param {AdaptiveRun} run
 * @param {string} answer
 */
export function recordAdaptiveAnswer(run, answer) {
  const trial = currentAdaptiveTrial(run);
  if (!trial) return null;

  const correct = answer === trial.orientation;
  if (trial.type === 'control') {
    run.controls.total += 1;
    if (correct) run.controls.correct += 1;
  } else {
    updateStaircase(run.axes[trial.type], correct);
  }

  const response = {
    trialId: trial.id,
    type: trial.type,
    orientation: trial.orientation,
    answer,
    strength: trial.strength,
    correct,
  };
  run.responses.push(response);
  run.index += 1;
  skipFinishedAxisSlots(run);
  return response;
}

/** @param {AxisType} type @param {AxisState} state */
function summarizeAxis(type, state) {
  if (state.limit) {
    const threshold =
      state.limit === 'floor' ? ADAPTIVE_CONFIG.minimumStrength : ADAPTIVE_CONFIG.maximumStrength;
    return {
      type,
      ...AXIS_CONFIGS[type],
      threshold,
      spread: rounded(state.step),
      reversals: state.reversals.length,
      stability: state.limit,
      limit: state.limit,
      presentations: state.presentations.length,
    };
  }

  const reversalWindow = state.reversals.slice(-4);
  const recentWindow = state.presentations.slice(-3).map((entry) => entry.strength);
  const window = reversalWindow.length >= 2 ? reversalWindow : recentWindow;
  const threshold = mean(window.length ? window : [state.strength]);
  const halfRange = window.length > 1 ? (Math.max(...window) - Math.min(...window)) / 2 : 0;
  const spread = Math.max(halfRange, state.step);

  return {
    type,
    ...AXIS_CONFIGS[type],
    threshold: rounded(threshold),
    spread: rounded(spread),
    reversals: state.reversals.length,
    stability: state.reversals.length >= 3 ? 'settled' : 'limited',
    limit: null,
    presentations: state.presentations.length,
  };
}

/**
 * Summarize only this run. No population norm or diagnostic classification is
 * applied because Daltonia has not been clinically validated.
 *
 * @param {AdaptiveRun} run
 */
export function summarizeAdaptiveRun(run) {
  const controlOk = run.controls.total === ADAPTIVE_CONFIG.controlTrials && run.controls.correct >= 2;
  return {
    complete: run.index >= run.schedule.length,
    controlOk,
    controls: { ...run.controls },
    axes: AXIS_TYPES.map((type) => summarizeAxis(type, run.axes[type])),
    title: controlOk ? 'Display-relative thresholds from this run' : 'Run inconclusive — repeat the controls',
    detail: controlOk
      ? 'Lower values mean you followed a smaller colour shift in that direction on this display. The three directions are not clinical scores and should not be compared as diagnoses.'
      : 'Too many high-contrast task controls were missed to interpret the adaptive thresholds. Check the instructions and viewing setup, then try again.',
  };
}
