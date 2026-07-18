import { shuffle } from './random.js';

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

export function mergeReflexConfig(override = {}) {
  return {
    ...DEFAULT_REFLEX_CONFIG,
    ...override,
    signal: { ...DEFAULT_REFLEX_CONFIG.signal, ...override.signal },
    choice: { ...DEFAULT_REFLEX_CONFIG.choice, ...override.choice },
    stability: { ...DEFAULT_REFLEX_CONFIG.stability, ...override.stability },
  };
}

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

export function createChoiceSchedule({ trials, minWaitMs, maxWaitMs, random }) {
  const sides = Array.from({ length: trials }, (_, index) => (index % 2 === 0 ? 'left' : 'right'));
  const waits = balancedWaits(trials, minWaitMs, maxWaitMs, random);
  const shuffledSides = shuffle(sides, random);

  return waits.map((waitMs, index) => ({ kind: 'choice', side: shuffledSides[index], waitMs }));
}

export function randomWait(minWaitMs, maxWaitMs, random) {
  return Math.round(minWaitMs + random() * (maxWaitMs - minWaitMs));
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function percentile(values, proportion) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(proportion * sorted.length) - 1));
  return sorted[index];
}

export function medianAbsoluteDeviation(values) {
  const center = median(values);
  return center === null ? null : median(values.map((value) => Math.abs(value - center)));
}

export function roundToFive(value) {
  return Number.isFinite(value) ? Math.round(value / 5) * 5 : null;
}

export function summarizeRiflessi(records, expected = {}) {
  const signalTimes = correctTimes(records.signal);
  const choiceTimes = correctTimes(records.choice);
  const stabilityTimes = correctTimes(records.stability);
  const signalMedian = median(signalTimes);
  const choiceMedian = median(choiceTimes);
  const stabilityMedian = median(stabilityTimes);
  const slowestCutoff = percentile(stabilityTimes, 0.8);
  const slowestTimes = slowestCutoff === null ? [] : stabilityTimes.filter((value) => value >= slowestCutoff);
  const middle = Math.floor(stabilityTimes.length / 2);
  const firstHalf = stabilityTimes.slice(0, middle);
  const secondHalf = stabilityTimes.slice(middle);
  const choiceAttempts = records.choice.filter((record) =>
    ['correct', 'wrong', 'miss'].includes(record.outcome),
  ).length;
  const allRecords = [...records.signal, ...records.choice, ...records.stability];
  const requiredSignal = Math.max(1, Math.floor((expected.signal ?? 20) * 0.6));
  const requiredChoice = Math.max(1, Math.floor((expected.choice ?? 32) * 0.6));
  const requiredStability = Math.max(1, expected.stability ?? 6);

  return {
    signal: {
      medianMs: roundToFive(signalMedian),
      spreadMs: roundToFive(medianAbsoluteDeviation(signalTimes)),
      valid: signalTimes.length,
    },
    choice: {
      medianMs: roundToFive(choiceMedian),
      accuracyPercent: choiceAttempts ? Math.round((choiceTimes.length / choiceAttempts) * 100) : null,
      costMs:
        signalMedian === null || choiceMedian === null ? null : roundToFive(choiceMedian - signalMedian),
      valid: choiceTimes.length,
      attempts: choiceAttempts,
    },
    stability: {
      medianMs: roundToFive(stabilityMedian),
      slowestGapMs:
        stabilityMedian === null || !slowestTimes.length
          ? null
          : roundToFive(median(slowestTimes) - stabilityMedian),
      driftMs:
        !firstHalf.length || !secondHalf.length ? null : roundToFive(median(secondHalf) - median(firstHalf)),
      valid: stabilityTimes.length,
    },
    events: {
      falseStarts: allRecords.filter((record) => record.outcome === 'false-start').length,
      anticipations: allRecords.filter((record) => record.outcome === 'anticipation').length,
      misses: allRecords.filter((record) => record.outcome === 'miss').length,
      wrongChoices: records.choice.filter((record) => record.outcome === 'wrong').length,
    },
    usable:
      signalTimes.length >= requiredSignal &&
      choiceTimes.length >= requiredChoice &&
      stabilityTimes.length >= requiredStability,
  };
}

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

function correctTimes(records = []) {
  return records
    .filter((record) => record.outcome === 'correct' && Number.isFinite(record.rt))
    .map((record) => record.rt);
}
