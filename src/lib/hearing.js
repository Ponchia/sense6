/** @typedef {() => number} RandomSource */
/** @typedef {{ toneMs: number, gapMs: number, rampMs: number, referenceMs: number, masterGain: number }} HearingAudioConfig */
/** @typedef {{ practiceTrials: number, scoredTrials: number, passCorrect: number }} HeadphoneConfig */
/** @typedef {{ startHz: number, minHz: number, maxHz: number, targetReversals: number, minTrials: number, maxTrials: number, controlAt: readonly number[], initialStepOctaves: number, fineStepOctaves: number }} RangeConfig */
/** @typedef {{ anchorsHz: readonly number[], startPercent: number, minPercent: number, maxPercent: number, targetReversals: number, minTrials: number, maxTrials: number, initialFactor: number, fineFactor: number }} PitchConfig */
/** @typedef {{ feedbackMs: number, audio: HearingAudioConfig, headphones: HeadphoneConfig, range: RangeConfig, pitch: PitchConfig }} HearingConfig */
/** @typedef {Partial<Omit<HearingConfig, 'audio' | 'headphones' | 'range' | 'pitch'>> & { audio?: Partial<HearingAudioConfig>, headphones?: Partial<HeadphoneConfig>, range?: Partial<RangeConfig>, pitch?: Partial<PitchConfig> }} HearingConfigOverride */
/** @typedef {'up' | 'down'} StaircaseDirection */
/** @typedef {'converged' | 'max-trials' | 'technical-ceiling'} CompletionReason */
/** @typedef {{ kind: 'headphones', quietInterval: number, antiPhaseInterval: number | null, practice: boolean }} HeadphoneTrial */
/** @typedef {HeadphoneTrial & { selectedInterval: number, correct: boolean }} HeadphoneRecord */
/** @typedef {{ kind: 'range', control: boolean, frequencyHz: number, toneInterval: number }} RangeTrial */
/** @typedef {RangeTrial & { selectedInterval: number, correct: boolean }} RangeControlRecord */
/** @typedef {RangeControlRecord & { direction: StaircaseDirection | null, nextFrequencyHz: number }} RangeRecord */
/** @typedef {{ config: RangeConfig, frequencyHz: number, correctStreak: number, lastDirection: StaircaseDirection | null, reversals: number[], records: RangeRecord[], controls: RangeControlRecord[], complete: boolean, completionReason: CompletionReason | null }} RangeTrack */
/** @typedef {{ kind: 'pitch', anchorHz: number, deltaPercent: number, higherInterval: number, roveDb: [number, number] }} PitchTrial */
/** @typedef {PitchTrial & { selectedInterval: number, correct: boolean, direction: StaircaseDirection | null, nextDeltaPercent: number }} PitchRecord */
/** @typedef {{ anchorHz: number, config: PitchConfig, deltaPercent: number, correctStreak: number, lastDirection: StaircaseDirection | null, reversals: number[], records: PitchRecord[], complete: boolean, completionReason: CompletionReason | null }} PitchTrack */
/** @typedef {{ correct: boolean }} CorrectnessRecord */

export const DEFAULT_HEARING_CONFIG = Object.freeze({
  feedbackMs: 420,
  audio: Object.freeze({
    toneMs: 460,
    gapMs: 260,
    rampMs: 25,
    referenceMs: 1800,
    masterGain: 0.075,
  }),
  headphones: Object.freeze({
    practiceTrials: 2,
    scoredTrials: 6,
    passCorrect: 5,
  }),
  range: Object.freeze({
    startHz: 6000,
    minHz: 2500,
    maxHz: 18000,
    targetReversals: 8,
    minTrials: 12,
    maxTrials: 28,
    controlAt: Object.freeze([8, 17]),
    initialStepOctaves: 0.28,
    fineStepOctaves: 0.12,
  }),
  pitch: Object.freeze({
    anchorsHz: Object.freeze([500, 2000]),
    startPercent: 8,
    minPercent: 0.2,
    maxPercent: 20,
    targetReversals: 6,
    minTrials: 10,
    maxTrials: 18,
    initialFactor: 1.55,
    fineFactor: 1.22,
  }),
});

export const HEARING_DIGITAL_LEVELS = Object.freeze({
  reference: 1.12,
  headphones: 1,
  range: 0.82,
  pitchBase: 0.78,
  pitchRoveMaxDb: 3,
});

/** @param {HearingConfigOverride | null} override @returns {HearingConfig} */
export function mergeHearingConfig(override = {}) {
  const safeOverride = override ?? {};
  return {
    ...DEFAULT_HEARING_CONFIG,
    ...safeOverride,
    audio: { ...DEFAULT_HEARING_CONFIG.audio, ...safeOverride.audio },
    headphones: { ...DEFAULT_HEARING_CONFIG.headphones, ...safeOverride.headphones },
    range: { ...DEFAULT_HEARING_CONFIG.range, ...safeOverride.range },
    pitch: { ...DEFAULT_HEARING_CONFIG.pitch, ...safeOverride.pitch },
  };
}

/** @param {{ count: number, practice?: boolean, random?: RandomSource }} options @returns {HeadphoneTrial[]} */
export function createHeadphoneTrials({ count, practice = false, random = Math.random }) {
  return Array.from({ length: count }, () => {
    const quietInterval = randomIndex(3, random);
    const remaining = [0, 1, 2].filter((index) => index !== quietInterval);
    const antiPhaseInterval = practice
      ? null
      : requiredElement(remaining[randomIndex(remaining.length, random)], 'headphone anti-phase interval');
    return {
      kind: 'headphones',
      quietInterval,
      antiPhaseInterval,
      practice,
    };
  });
}

/** @param {number} maxHz @param {Partial<RangeConfig>} options @returns {RangeTrack} */
export function createRangeTrack(maxHz, options = {}) {
  const config = { ...DEFAULT_HEARING_CONFIG.range, ...options };
  const ceilingHz = clamp(maxHz, config.minHz, config.maxHz);
  return {
    config: { ...config, maxHz: ceilingHz },
    frequencyHz: clamp(config.startHz, config.minHz, ceilingHz),
    correctStreak: 0,
    lastDirection: null,
    reversals: [],
    records: [],
    controls: [],
    complete: false,
    completionReason: null,
  };
}

/** @param {RangeTrack} track @param {RandomSource} random @returns {RangeTrial} */
export function nextRangeTrial(track, random = Math.random) {
  const presentation = track.records.length + track.controls.length;
  const control = track.config.controlAt.includes(presentation);
  return {
    kind: 'range',
    control,
    frequencyHz: control ? 1000 : track.frequencyHz,
    toneInterval: randomIndex(3, random),
  };
}

/** @param {RangeTrack} track @param {RangeTrial} trial @param {number} selectedInterval */
export function recordRangeResponse(track, trial, selectedInterval) {
  const correct = selectedInterval === trial.toneInterval;
  if (trial.control) {
    track.controls.push({ ...trial, selectedInterval, correct });
    return track;
  }

  /** @type {StaircaseDirection | null} */
  let direction = null;
  if (correct) {
    track.correctStreak += 1;
    if (track.correctStreak >= 2) {
      direction = 'up';
      track.correctStreak = 0;
    }
  } else {
    direction = 'down';
    track.correctStreak = 0;
  }

  if (direction) {
    if (track.lastDirection && direction !== track.lastDirection) {
      track.reversals.push(track.frequencyHz);
    }
    track.lastDirection = direction;
    const step = track.reversals.length >= 2 ? track.config.fineStepOctaves : track.config.initialStepOctaves;
    const factor = 2 ** (direction === 'up' ? step : -step);
    track.frequencyHz = clamp(track.frequencyHz * factor, track.config.minHz, track.config.maxHz);
  }

  track.records.push({
    ...trial,
    selectedInterval,
    correct,
    direction,
    nextFrequencyHz: track.frequencyHz,
  });
  const converged =
    track.records.length >= track.config.minTrials && track.reversals.length >= track.config.targetReversals;
  if (converged) {
    track.complete = true;
    track.completionReason = hasTechnicalCeilingEvidence(track) ? 'technical-ceiling' : 'converged';
  } else if (track.records.length >= track.config.maxTrials) {
    track.complete = true;
    track.completionReason = hasTechnicalCeilingEvidence(track) ? 'technical-ceiling' : 'max-trials';
  }
  return track;
}

/** @param {RangeTrack} track */
export function summarizeRange(track) {
  const reversalWindow = track.reversals.slice(-6);
  const reversalMedian = median(reversalWindow);
  const atCeiling = hasTechnicalCeilingEvidence(track);
  const completionReason = track.completionReason ?? 'incomplete';
  const settled =
    completionReason === 'technical-ceiling' ||
    (completionReason === 'converged' && reversalWindow.length > 0);
  const thresholdHz =
    settled && (atCeiling || reversalMedian !== null)
      ? atCeiling
        ? track.config.maxHz
        : roundTo(/** @type {number} */ (reversalMedian), 100)
      : null;
  return {
    thresholdHz,
    spreadHz: reversalWindow.length >= 2 ? roundTo(range(reversalWindow), 100) : null,
    atCeiling,
    settled,
    completionReason,
    reversals: track.reversals.length,
    trials: track.records.length,
    controlTrials: track.controls.length,
    expectedControls: track.config.controlAt.length,
    controlAccuracyPercent: percentCorrect(track.controls),
  };
}

/** @param {Partial<PitchConfig>} options @returns {PitchTrack[]} */
export function createPitchTracks(options = {}) {
  const config = { ...DEFAULT_HEARING_CONFIG.pitch, ...options };
  return config.anchorsHz.map((anchorHz) => ({
    anchorHz,
    config,
    deltaPercent: config.startPercent,
    correctStreak: 0,
    lastDirection: null,
    reversals: [],
    records: [],
    complete: false,
    completionReason: null,
  }));
}

/** @param {PitchTrack[]} tracks @param {RandomSource} random @returns {PitchTrial | null} */
export function nextPitchTrial(tracks, random = Math.random) {
  const open = tracks.filter((track) => !track.complete);
  if (!open.length) return null;
  const shortest = Math.min(...open.map((track) => track.records.length));
  const candidates = open.filter((track) => track.records.length <= shortest + 1);
  const track = requiredElement(candidates[randomIndex(candidates.length, random)], 'pitch track');
  return {
    kind: 'pitch',
    anchorHz: track.anchorHz,
    deltaPercent: track.deltaPercent,
    higherInterval: randomIndex(2, random),
    roveDb: [randomBetween(-3, 3, random), randomBetween(-3, 3, random)],
  };
}

/** @param {PitchTrack[]} tracks @param {PitchTrial} trial @param {number} selectedInterval */
export function recordPitchResponse(tracks, trial, selectedInterval) {
  const track = tracks.find((entry) => entry.anchorHz === trial.anchorHz);
  if (!track) throw new Error(`Unknown pitch anchor: ${trial.anchorHz}`);
  const correct = selectedInterval === trial.higherInterval;
  /** @type {StaircaseDirection | null} */
  let direction = null;
  if (correct) {
    track.correctStreak += 1;
    if (track.correctStreak >= 2) {
      direction = 'down';
      track.correctStreak = 0;
    }
  } else {
    direction = 'up';
    track.correctStreak = 0;
  }

  if (direction) {
    if (track.lastDirection && direction !== track.lastDirection) {
      track.reversals.push(track.deltaPercent);
    }
    track.lastDirection = direction;
    const factor = track.reversals.length >= 2 ? track.config.fineFactor : track.config.initialFactor;
    track.deltaPercent = clamp(
      direction === 'down' ? track.deltaPercent / factor : track.deltaPercent * factor,
      track.config.minPercent,
      track.config.maxPercent,
    );
  }

  track.records.push({
    ...trial,
    selectedInterval,
    correct,
    direction,
    nextDeltaPercent: track.deltaPercent,
  });
  const converged =
    track.records.length >= track.config.minTrials && track.reversals.length >= track.config.targetReversals;
  if (converged) {
    track.complete = true;
    track.completionReason = 'converged';
  } else if (track.records.length >= track.config.maxTrials) {
    track.complete = true;
    track.completionReason = 'max-trials';
  }
  return tracks;
}

/** @param {PitchTrack[]} tracks */
export function summarizePitch(tracks) {
  return tracks.map((track) => {
    const reversalWindow = track.reversals.slice(-4);
    const reversalMedian = median(reversalWindow);
    const completionReason = track.completionReason ?? 'incomplete';
    const settled = completionReason === 'converged' && reversalWindow.length > 0;
    return {
      anchorHz: track.anchorHz,
      thresholdPercent: settled && reversalMedian !== null ? roundTo(reversalMedian, 0.1) : null,
      spreadPercent: reversalWindow.length >= 2 ? roundTo(range(reversalWindow), 0.1) : null,
      settled,
      completionReason,
      reversals: track.reversals.length,
      trials: track.records.length,
      accuracyPercent: percentCorrect(track.records),
    };
  });
}

/** @param {HeadphoneRecord[]} records @param {number} passCorrect */
export function summarizeHeadphones(records, passCorrect) {
  const correct = records.filter((record) => record.correct).length;
  return {
    correct,
    trials: records.length,
    accuracyPercent: records.length ? Math.round((correct / records.length) * 100) : null,
    headphoneLike: records.length > 0 && correct >= passCorrect,
  };
}

/** @param {number} db */
export function dbToGain(db) {
  return 10 ** (db / 20);
}

/** @param {number} sampleRate @param {number} configuredMax */
export function safeFrequencyCeiling(sampleRate, configuredMax = 18000) {
  return Math.round(Math.min(configuredMax, sampleRate * 0.42));
}

/** @param {readonly number[]} values */
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  if (sorted.length % 2) return upper;
  const lower = sorted[middle - 1];
  return lower === undefined ? null : (lower + upper) / 2;
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

/** @param {RangeTrack} track */
function hasTechnicalCeilingEvidence(track) {
  return (
    track.records.filter(
      (record) =>
        record.correct && Math.abs(record.frequencyHz - track.config.maxHz) < track.config.maxHz * 0.001,
    ).length >= 2
  );
}

/** @param {CorrectnessRecord[]} records */
function percentCorrect(records) {
  return records.length
    ? Math.round((records.filter((record) => record.correct).length / records.length) * 100)
    : null;
}

/** @param {readonly number[]} values */
function range(values) {
  return Math.max(...values) - Math.min(...values);
}

/** @param {number} value @param {number} increment */
function roundTo(value, increment) {
  return Math.round(value / increment) * increment;
}

/** @param {number} length @param {RandomSource} random */
function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(random() * length));
}

/** @param {number} minimum @param {number} maximum @param {RandomSource} random */
function randomBetween(minimum, maximum, random) {
  return minimum + random() * (maximum - minimum);
}

/** @param {number} value @param {number} minimum @param {number} maximum */
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
