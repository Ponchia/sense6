import { shuffle } from './random.js';

/** @typedef {() => number} RandomSource */
/** @typedef {{ practiceTrials: number, scoredTrials: number, catchTrials: number, minWaitMs: number, maxWaitMs: number, responseTimeoutMs: number }} SignalConfig */
/** @typedef {{ practiceTrials: number, scoredTrials: number, minWaitMs: number, maxWaitMs: number, responseTimeoutMs: number }} ChoiceConfig */
/** @typedef {{ durationMs: number, minWaitMs: number, maxWaitMs: number, responseTimeoutMs: number }} StabilityConfig */
/** @typedef {{ anticipationMs: number, feedbackMs: number, signal: SignalConfig, choice: ChoiceConfig, stability: StabilityConfig }} ReflexConfig */
/** @typedef {Partial<Omit<ReflexConfig, 'signal' | 'choice' | 'stability'>> & { signal?: Partial<SignalConfig>, choice?: Partial<ChoiceConfig>, stability?: Partial<StabilityConfig> }} ReflexConfigOverride */
/** @typedef {'correct' | 'wrong' | 'miss' | 'false-start' | 'anticipation' | 'catch-correct'} ReflexOutcome */
/** @typedef {{ outcome: ReflexOutcome, rt?: number | null }} ReflexRecord */
/** @typedef {{ signal: ReflexRecord[], choice: ReflexRecord[], stability: ReflexRecord[] }} ReflexRecords */

export const DEFAULT_REFLEX_CONFIG = Object.freeze({
  anticipationMs: 100,
  feedbackMs: 520,
  signal: Object.freeze({
    practiceTrials: 8,
    scoredTrials: 20,
    catchTrials: 2,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    responseTimeoutMs: 1500,
  }),
  choice: Object.freeze({
    practiceTrials: 8,
    scoredTrials: 32,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    responseTimeoutMs: 1800,
  }),
  stability: Object.freeze({
    durationMs: 180_000,
    minWaitMs: 1000,
    maxWaitMs: 4000,
    responseTimeoutMs: 1500,
  }),
});

/** @param {ReflexConfigOverride} override @returns {ReflexConfig} */
export function mergeReflexConfig(override = {}) {
  return {
    ...DEFAULT_REFLEX_CONFIG,
    ...override,
    signal: { ...DEFAULT_REFLEX_CONFIG.signal, ...override.signal },
    choice: { ...DEFAULT_REFLEX_CONFIG.choice, ...override.choice },
    stability: { ...DEFAULT_REFLEX_CONFIG.stability, ...override.stability },
  };
}

/**
 * @param {{ trials: number, catches?: number, minWaitMs: number, maxWaitMs: number, random: RandomSource }} options
 */
export function createSignalSchedule({ trials, catches = 0, minWaitMs, maxWaitMs, random }) {
  const signalTrials = balancedWaits(trials, minWaitMs, maxWaitMs, random).map((waitMs) => ({
    kind: 'signal',
    waitMs,
  }));
  const catchTrials = balancedWaits(catches, minWaitMs, maxWaitMs, random).map((waitMs) => ({
    kind: 'catch',
    waitMs,
  }));

  return shuffle([...signalTrials, ...catchTrials], random);
}

/** @param {{ trials: number, minWaitMs: number, maxWaitMs: number, random: RandomSource }} options */
export function createChoiceSchedule({ trials, minWaitMs, maxWaitMs, random }) {
  const sides = Array.from({ length: trials }, (_, index) => (index % 2 === 0 ? 'left' : 'right'));
  const waits = balancedWaits(trials, minWaitMs, maxWaitMs, random);
  const shuffledSides = shuffle(sides, random);

  return waits.map((waitMs, index) => ({
    kind: 'choice',
    side: requiredElement(shuffledSides[index], 'choice side'),
    waitMs,
  }));
}

/** @param {number} minWaitMs @param {number} maxWaitMs @param {RandomSource} random */
export function randomWait(minWaitMs, maxWaitMs, random) {
  return Math.round(minWaitMs + random() * (maxWaitMs - minWaitMs));
}

/** @param {readonly number[]} values */
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  if (sorted.length % 2 !== 0) return upper;
  const lower = sorted[middle - 1];
  return lower === undefined ? null : (lower + upper) / 2;
}

/** @param {readonly number[]} values @param {number} proportion */
export function percentile(values, proportion) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(proportion * sorted.length) - 1));
  return sorted[index] ?? null;
}

/** @param {readonly number[]} values */
export function medianAbsoluteDeviation(values) {
  const center = median(values);
  return center === null ? null : median(values.map((value) => Math.abs(value - center)));
}

/** @param {number | null} value */
export function roundToFive(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value / 5) * 5 : null;
}

/** @param {ReflexRecords} records @param {{ signal?: number, signalScheduled?: number, choice?: number, stability?: number, catches?: number, interruptions?: number }} expected */
export function summarizeRiflessi(records, expected = {}) {
  const signalTimes = correctTimes(records.signal);
  const choiceTimes = correctTimes(records.choice);
  const stabilityTimes = correctTimes(records.stability);
  const signalMedian = median(signalTimes);
  const choiceMedian = median(choiceTimes);
  const stabilityMedian = median(stabilityTimes);
  const slowestCutoff = percentile(stabilityTimes, 0.8);
  const slowestTimes = slowestCutoff === null ? [] : stabilityTimes.filter((value) => value >= slowestCutoff);
  const slowestMedian = median(slowestTimes);
  const middle = Math.floor(stabilityTimes.length / 2);
  const firstHalf = stabilityTimes.slice(0, middle);
  const secondHalf = stabilityTimes.slice(middle);
  const firstHalfMedian = median(firstHalf);
  const secondHalfMedian = median(secondHalf);
  const choiceAttempts = records.choice.filter((record) =>
    ['correct', 'wrong'].includes(record.outcome),
  ).length;
  const choiceScheduled = expected.choice ?? records.choice.length;
  const signalScheduled = expected.signalScheduled ?? expected.signal ?? records.signal.length;
  const catchesPassed = records.signal.filter((record) => record.outcome === 'catch-correct').length;
  const allRecords = [...records.signal, ...records.choice, ...records.stability];
  const requiredSignal = Math.ceil((expected.signal ?? signalTimes.length) * 0.8);
  const requiredChoice = Math.ceil(choiceScheduled * 0.8);
  const requiredStability = expected.stability ?? 6;
  const reasons = [];
  if (records.signal.length !== signalScheduled) reasons.push('signal-schedule-incomplete');
  if (records.choice.length !== choiceScheduled) reasons.push('choice-schedule-incomplete');
  if (signalTimes.length < requiredSignal) reasons.push('signal-valid-responses-low');
  if (choiceTimes.length < requiredChoice) reasons.push('choice-valid-responses-low');
  if (stabilityTimes.length < requiredStability) reasons.push('sustained-valid-responses-low');
  if (catchesPassed !== (expected.catches ?? 0)) reasons.push('signal-catches-failed');
  if ((expected.interruptions ?? 0) > 0) reasons.push('timing-interrupted');

  return {
    signal: {
      medianMs: roundToFive(signalMedian),
      withinRunSpreadMs: roundToFive(medianAbsoluteDeviation(signalTimes)),
      valid: signalTimes.length,
      scheduled: signalScheduled,
    },
    choice: {
      medianMs: roundToFive(choiceMedian),
      conditionalAccuracyPercent: choiceAttempts
        ? Math.round((choiceTimes.length / choiceAttempts) * 100)
        : null,
      scheduledAccuracyPercent: choiceScheduled
        ? Math.round((choiceTimes.length / choiceScheduled) * 100)
        : null,
      blockDifferenceMs:
        signalMedian === null || choiceMedian === null ? null : roundToFive(choiceMedian - signalMedian),
      valid: choiceTimes.length,
      attempts: choiceAttempts,
      scheduled: choiceScheduled,
    },
    stability: {
      medianMs: roundToFive(stabilityMedian),
      slowestGapMs:
        stabilityMedian === null || slowestMedian === null
          ? null
          : roundToFive(slowestMedian - stabilityMedian),
      driftMs:
        firstHalfMedian === null || secondHalfMedian === null
          ? null
          : roundToFive(secondHalfMedian - firstHalfMedian),
      valid: stabilityTimes.length,
    },
    events: {
      falseStarts: allRecords.filter((record) => record.outcome === 'false-start').length,
      anticipations: allRecords.filter((record) => record.outcome === 'anticipation').length,
      misses: allRecords.filter((record) => record.outcome === 'miss').length,
      wrongChoices: records.choice.filter((record) => record.outcome === 'wrong').length,
      catchesPassed,
      catchesScheduled: expected.catches ?? 0,
    },
    qualityReasons: reasons,
    usable: reasons.length === 0,
  };
}

/** @param {number} count @param {number} minWaitMs @param {number} maxWaitMs @param {RandomSource} random */
function balancedWaits(count, minWaitMs, maxWaitMs, random) {
  if (count <= 0) return [];
  const span = maxWaitMs - minWaitMs;
  const buckets = Math.min(5, count);
  const values = Array.from({ length: count }, (_, index) => {
    const bucket = index % buckets;
    const lower = minWaitMs + (span * bucket) / buckets;
    const upper = minWaitMs + (span * (bucket + 1)) / buckets;
    return Math.round(lower + random() * (upper - lower));
  });
  return shuffle(values, random);
}

/** @param {ReflexRecord[]} records */
function correctTimes(records = []) {
  return records.flatMap((record) =>
    record.outcome === 'correct' && typeof record.rt === 'number' && Number.isFinite(record.rt)
      ? [record.rt]
      : [],
  );
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
