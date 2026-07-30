/*
 * Daltonia's display-colour model and adaptive threshold logic.
 *
 * The fixed matrix below follows the common Hunt–Pointer–Estévez transform
 * multiplied by the standard linear-sRGB-to-XYZ matrix. It is useful for choosing repeatable cone-like stimulus
 * directions on an sRGB display, but it does not measure an observer's cone
 * fundamentals or the spectral output of their device. The product copy must
 * therefore describe these as display-relative directions, never as exact cone
 * excitations.
 *
 * Luminance:
 * Target and field are matched on the L+M cone sum rather than on the photopic
 * sRGB Y coefficients. The reason is self-consistency, not a claim that L+M is
 * the observer's luminance channel — it is not, and the earlier claim that this
 * matrix implies L+M while Y "describes a different observer" is false:
 *   - `RGB_TO_LMS` is white-normalised, not V(lambda)-normalised. Its rows sum
 *     to 1.000001, 0.999968 and 0.999764, so it carries no luminance scaling of
 *     its own from which an implied luminance channel could follow.
 *   - sRGB Y lies in the span of this matrix's own L and M rows:
 *     Y = 0.360771*L + 0.639248*M reproduces the Y blue weight (0.0722) to
 *     within 1.3e-6. Y is therefore not a different observer but a different
 *     weighting of the same two cones — and it is the CIE photopic one.
 *   - Equal-weight L+M is an ad-hoc choice. Cone-fundamental luminance is
 *     roughly 1.98*Lbar + Mbar (Smith-Pokorny), even further from 50:50.
 * The change therefore did one thing: reweight the luminance channel from
 * (0.361, 0.639) to (0.500, 0.500). It is kept because the stimulus directions
 * are defined in this same white-normalised cone basis, so matching in that
 * basis keeps the construction and its matching criterion internally coherent —
 * one basis defines both what "along a confusion line" and what "equal
 * luminance" mean here. That is a consistency argument, not a claim of greater
 * physiological accuracy.
 *
 * What the reweighting cost and bought, in the dichromat intensity residual
 * described under Boundary below. Protan got worse, deutan got better, and
 * neither ends below the noise floor:
 *   protan, starting strength 0.20:  -3.55% -> -4.82%   (4.4 -> 5.9 sigma)
 *   protan, maximum strength 0.32:   -5.57% -> -7.50%   (6.9 -> 9.3 sigma)
 *   deutan, starting strength 0.20:  -7.16% -> -5.65%   (8.8 -> 7.0 sigma)
 *   deutan, maximum strength 0.32:  -10.99% -> -8.74%  (13.6 -> 10.8 sigma)
 * The defect the change removed is smaller than either side of that trade:
 * matching Y left a 0.24%-2.47% residual in the L+M channel across the adaptive
 * range (1.33% at the starting strength, which is where the previously quoted
 * "1.3%" came from — it is not the floor), i.e. at most about 3 sigma.
 * Sigma throughout is the ring-mean standard error of `jitterDotColor`'s
 * per-dot +/-18% uniform luminance jitter averaged over the ~200 dots of one
 * Landolt ring: 0.81% of mean luminance. Simulating the actual dot lattice puts
 * it slightly lower (0.70% unweighted, 0.75% weighted by dot area), so the
 * sigma figures above are, if anything, conservative. The conclusion does not
 * turn on the exact value: every residual listed is several times the noise
 * under any of these estimates.
 *
 * Boundary (deliberate, not a defect):
 * Only the S (tritan) axis is simultaneously a confusion line and an isoluminant
 * direction, because S does not contribute to L+M. Protan and deutan confusion
 * lines hold M,S and L,S constant respectively, and L+M necessarily varies along
 * them. Re-scaling to equal L+M therefore multiplies every cone excitation by a
 * common factor, which a dichromat of the matching type perceives as a uniform
 * intensity step: -4.82% protan and -5.65% deutan at the starting strength,
 * -7.50% and -8.74% at the maximum. No scalar can remove both residuals at
 * once: the protanope sees nothing only when the factor is exactly 1, and L+M
 * matches only when it is not. This residual is the real limitation of the
 * experiment. It is irreducible under any single fixed luminance weighting —
 * every choice, Y included, only redistributes it between the protan and deutan
 * axes.
 *
 * The residual lies in the pure-intensity subspace that `jitterDotColor`
 * perturbs. That was equally true of the Y match (-3.55% was just as purely an
 * intensity step as -4.82%), so it is a property of the confusion-direction
 * basis and not something this change achieved. Nor does the noise remove the
 * cue: a 4.8%-8.7% step is several times the ring-mean noise, and an ideal
 * spatial integrator would still read it. It is masked in practice only to the
 * degree that a real observer is a non-ideal integrator of a noisy dot field,
 * which is the mechanism the Regan/Reffin/Mollon Cambridge Colour Test relies on
 * and why that citation is apt. Product copy must not claim these stimuli are
 * invisible to dichromats.
 *
 * Outstanding follow-up:
 * The Cambridge Colour Test's actual remedy is not the dot noise alone but
 * randomizing the mean luminance of target and field on every trial, so that no
 * fixed intensity step is available for an observer to learn or accumulate
 * across trials. That would remove the residual as a usable cue instead of
 * relying on masking. It is not implemented here.
 *
 * Background:
 * - IEC 61966-2-1 sRGB: https://webstore.iec.ch/en/publication/6169
 * - sRGB transfer and primary definitions: https://www.w3.org/TR/css-color-4/#color-conversion-code
 * - Dichromat simulation model: https://doi.org/10.1364/JOSAA.14.002647
 * - Anomalous-trichromacy model: https://doi.org/10.1109/TVCG.2009.113
 * - Luminance noise masking residual luminance cues: https://doi.org/10.1016/0042-6989(94)90203-8
 */

/** @typedef {() => number} RandomSource */
/** @typedef {'protan' | 'deutan' | 'tritan'} AxisType */
/** @typedef {AxisType | 'control'} TrialType */
/** @typedef {'up' | 'right' | 'down' | 'left'} Orientation */
/** @typedef {'up' | 'down'} StaircaseDirection */
/** @typedef {'floor' | 'ceiling'} AxisLimit */
/** @typedef {readonly [number, number, number]} RgbVector */
/** @typedef {{ label: string, description: string, background: RgbVector }} AxisConfig */
/** @typedef {{ field: RgbVector, target: RgbVector, fieldLinear: RgbVector, targetLinear: RgbVector, appliedStrength: number }} TargetPair */
/** @typedef {{ forcedColors: boolean, theme: string, dpr: number, orientation: string, viewportWidth: number, viewportHeight: number }} DisplayEnvironment */
/** @typedef {{ strength: number, correct: boolean }} AxisPresentation */
/** @typedef {{ strength: number, step: number, correctStreak: number, lastDirection: StaircaseDirection | null, reversals: number[], presentations: AxisPresentation[], boundaryMisses: number, finished: boolean, limit: AxisLimit | null }} AxisState */
/** @typedef {{ id: string, type: TrialType, orientation: Orientation }} AdaptiveSlot */
/** @typedef {AdaptiveSlot & { label: string, description: string, background: RgbVector, strength: number }} AdaptiveTrial */
/** @typedef {{ trialId: string, type: TrialType, orientation: Orientation, answer: string, strength: number, correct: boolean }} AdaptiveResponse */
/** @typedef {{ index: number, schedule: AdaptiveSlot[], axes: Record<AxisType, AxisState>, controls: { correct: number, total: number }, responses: AdaptiveResponse[] }} AdaptiveRun */

/** @type {readonly [RgbVector, RgbVector, RgbVector]} */
const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
];

/** @type {readonly [RgbVector, RgbVector, RgbVector]} */
const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
];

/**
 * Weights of the L+M cone sum in linear sRGB: the luminance criterion this
 * module matches on, chosen to sit in the same cone basis as the stimulus
 * directions. Not a photopic luminance function — sRGB Y is itself a weighting
 * of these same L and M rows (0.361, 0.639). See the header note on Luminance.
 *
 * @type {RgbVector}
 */
const CONE_LUMINANCE_WEIGHTS = [
  RGB_TO_LMS[0][0] + RGB_TO_LMS[1][0],
  RGB_TO_LMS[0][1] + RGB_TO_LMS[1][1],
  RGB_TO_LMS[0][2] + RGB_TO_LMS[1][2],
];

/** @param {number} value @param {number} minimum @param {number} maximum */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** @param {number} value */
function clamp01(value) {
  return clamp(value, 0, 1);
}

/** @param {RgbVector} vector @returns {[number, number, number]} */
function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
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
    const current = requiredElement(copy[index], 'shuffle current index');
    const swap = requiredElement(copy[target], 'shuffle target index');
    copy[index] = swap;
    copy[target] = current;
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

/** @type {Record<TrialType, RgbVector>} */
export const CONFUSION_DIRECTIONS = {
  protan: normalize([LMS_TO_RGB[0][0], LMS_TO_RGB[1][0], LMS_TO_RGB[2][0]]),
  deutan: normalize([LMS_TO_RGB[0][1], LMS_TO_RGB[1][1], LMS_TO_RGB[2][1]]),
  tritan: normalize([LMS_TO_RGB[0][2], LMS_TO_RGB[1][2], LMS_TO_RGB[2][2]]),
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

/** @param {RgbVector} linearRgb @returns {[number, number, number]} */
export function lmsOf(linearRgb) {
  return [
    dotProduct(RGB_TO_LMS[0], linearRgb),
    dotProduct(RGB_TO_LMS[1], linearRgb),
    dotProduct(RGB_TO_LMS[2], linearRgb),
  ];
}

/**
 * The L+M cone sum of a linear-sRGB colour, used as this module's luminance
 * matching criterion. See the header note on Luminance for why this weighting
 * is a consistency choice rather than a photopic one.
 *
 * @param {RgbVector} linearRgb
 */
export function coneLuminance(linearRgb) {
  return dotProduct(CONE_LUMINANCE_WEIGHTS, linearRgb);
}

/** @param {RgbVector} channels */
function withinUnitCube(channels) {
  return channels.every((channel) => channel >= 0 && channel <= 1);
}

/**
 * Return a field/target pair separated along one fixed display-model direction.
 * Both values are retained in linear sRGB so luminance noise can be applied
 * before encoding for canvas.
 *
 * The pair is matched on `coneLuminance`, so the separation carries no mean
 * brightness step in the L+M channel the stimulus directions are defined
 * against. A dichromat still sees a uniform intensity step on the protan and
 * deutan axes; see the header note on Boundary for its size and why no
 * luminance weighting removes it. `appliedStrength`
 * reports the separation actually rendered: at the gamut edge the requested
 * separation is reduced rather than clamped per channel, because clamping would
 * both tilt the confusion direction and undo the luminance match applied before
 * it.
 *
 * @param {RgbVector} backgroundLinear
 * @param {TrialType} type
 * @param {number} strength
 * @returns {TargetPair}
 */
export function makeTargetPair(backgroundLinear, type, strength) {
  const direction = CONFUSION_DIRECTIONS[type] ?? CONFUSION_DIRECTIONS.deutan;
  const fieldLuminance = coneLuminance(backgroundLinear);

  /** @param {number} offset @returns {[number, number, number]} */
  const equiluminantTarget = (offset) => {
    /** @type {[number, number, number]} */
    const directed = [
      backgroundLinear[0] + direction[0] * offset,
      backgroundLinear[1] + direction[1] * offset,
      backgroundLinear[2] + direction[2] * offset,
    ];
    const directedLuminance = coneLuminance(directed);
    const scale = directedLuminance > 0 ? fieldLuminance / directedLuminance : 1;
    return [directed[0] * scale, directed[1] * scale, directed[2] * scale];
  };

  let appliedStrength = strength;
  let targetLinear = equiluminantTarget(appliedStrength);

  if (!withinUnitCube(targetLinear)) {
    let displayable = 0;
    let clipped = strength;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const candidate = (displayable + clipped) / 2;
      if (withinUnitCube(equiluminantTarget(candidate))) displayable = candidate;
      else clipped = candidate;
    }
    appliedStrength = displayable;
    targetLinear = equiluminantTarget(displayable);
  }

  return {
    appliedStrength,
    field: [
      linearToSrgb(backgroundLinear[0]),
      linearToSrgb(backgroundLinear[1]),
      linearToSrgb(backgroundLinear[2]),
    ],
    target: [linearToSrgb(targetLinear[0]), linearToSrgb(targetLinear[1]), linearToSrgb(targetLinear[2])],
    fieldLinear: backgroundLinear,
    targetLinear,
  };
}

/**
 * Apply the same luminance-noise distribution to target and field dots.
 *
 * @param {RgbVector} baseLinear
 * @param {RandomSource} random
 * @param {number} luminanceJitter
 * @returns {RgbVector}
 */
export function jitterDotColor(baseLinear, random, luminanceJitter = 0.18) {
  const scale = 1 + (random() - 0.5) * 2 * luminanceJitter;
  return [
    linearToSrgb(baseLinear[0] * scale),
    linearToSrgb(baseLinear[1] * scale),
    linearToSrgb(baseLinear[2] * scale),
  ];
}

/** @param {RgbVector} channels */
export function rgbCss(channels) {
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

/** @param {RgbVector} a @param {RgbVector} b */
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
    orientation: requiredElement(
      ORIENTATIONS[Math.floor(random() * ORIENTATIONS.length)],
      'adaptive orientation',
    ),
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
    const next = run.schedule[run.index];
    if (!next) throw new RangeError('Adaptive schedule index is missing');
    const nextType = next.type;
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
  if (answer !== 'unseen' && !ORIENTATIONS.includes(/** @type {Orientation} */ (answer))) return null;

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
  const controlStatus =
    run.controls.total !== ADAPTIVE_CONFIG.controlTrials || run.controls.correct < 2
      ? 'failed'
      : run.controls.correct === ADAPTIVE_CONFIG.controlTrials
        ? 'passed'
        : 'caution';
  const controlOk = controlStatus === 'passed';
  return {
    complete: run.index >= run.schedule.length,
    controlOk,
    controls: { ...run.controls },
    controlStatus,
    axes: AXIS_TYPES.map((type) => summarizeAxis(type, run.axes[type])),
    title:
      controlStatus === 'passed'
        ? 'Display-relative adaptive levels from this run'
        : controlStatus === 'caution'
          ? 'Display-relative observations with a control caution'
          : 'Run inconclusive — repeat the controls',
    detail:
      controlStatus === 'passed'
        ? 'Lower values mean the short adaptive track ended at a smaller colour shift in that direction on this display. These are not precise thresholds, cone measurements, clinical scores, or diagnoses.'
        : controlStatus === 'caution'
          ? 'Two of three high-contrast task controls passed. The observations are retained with a caution, but should not be treated as a strong run.'
          : 'Fewer than two high-contrast task controls passed, so the adaptive levels are not treated as usable. Check the instructions and viewing setup, then try again.',
  };
}

/** @param {RgbVector} left @param {RgbVector} right */
function dotProduct(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

/**
 * @template T
 * @param {T | undefined} value
 * @param {string} label
 * @returns {T}
 */
function requiredElement(value, label) {
  if (value === undefined) throw new RangeError(`Missing ${label}`);
  return value;
}
