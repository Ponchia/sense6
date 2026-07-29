import assert from 'node:assert/strict';
import test from 'node:test';
import { seededRandom } from '../src/lib/random.js';
import {
  createChoiceSchedule,
  createSignalSchedule,
  DEFAULT_REFLEX_CONFIG,
  median,
  medianAbsoluteDeviation,
  mergeReflexConfig,
  percentile,
  randomWait,
  roundToFive,
  summarizeRiflessi,
} from '../src/lib/reflexes.js';

test('signal schedule is deterministic, bounded, and includes catch trials', () => {
  const options = { trials: 20, catches: 2, minWaitMs: 1000, maxWaitMs: 3000 };
  const first = createSignalSchedule({ ...options, random: seededRandom('signal') });
  const second = createSignalSchedule({ ...options, random: seededRandom('signal') });

  assert.deepEqual(first, second);
  assert.equal(first.length, 22);
  assert.equal(first.filter((trial) => trial.kind === 'catch').length, 2);
  assert.ok(first.every((trial) => trial.waitMs >= 1000 && trial.waitMs <= 3000));
});

test('choice schedule balances sides and randomizes their order', () => {
  const schedule = createChoiceSchedule({
    trials: 32,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    random: seededRandom('choice'),
  });

  assert.equal(schedule.filter((trial) => trial.side === 'left').length, 16);
  assert.equal(schedule.filter((trial) => trial.side === 'right').length, 16);
  assert.ok(schedule.some((trial, index) => index % 2 === 0 && trial.side === 'right'));
});

test('statistics use robust centers and display-safe rounding', () => {
  assert.equal(median([100, 500, 200, 300]), 250);
  assert.equal(median([]), null);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.8), 4);
  assert.equal(percentile([], 0.8), null);
  assert.equal(roundToFive(247), 245);
  assert.equal(roundToFive(Number.NaN), null);
});

test('summary reports independent response dimensions without a composite score', () => {
  const summary = summarizeRiflessi(
    {
      signal: [200, 210, 220, 230].map((rt) => ({ outcome: 'correct', rt })),
      choice: [300, 310, 320].map((rt) => ({ outcome: 'correct', rt })).concat({ outcome: 'wrong' }),
      stability: [200, 210, 220, 230, 260, 300].map((rt) => ({ outcome: 'correct', rt })),
    },
    { signal: 4, choice: 4, stability: 4 },
  );

  assert.equal(summary.signal.medianMs, 215);
  assert.equal(summary.choice.medianMs, 310);
  assert.equal(summary.choice.blockDifferenceMs, 95);
  assert.equal(summary.choice.conditionalAccuracyPercent, 75);
  assert.equal(summary.choice.scheduledAccuracyPercent, 75);
  assert.equal(summary.stability.slowestGapMs, 55);
  assert.equal(summary.stability.driftMs, 50);
  assert.equal(summary.events.wrongChoices, 1);
  assert.equal(summary.usable, false);
  assert.deepEqual(summary.qualityReasons, ['choice-valid-responses-low']);
  assert.equal('score' in summary, false);
});

test('quality requires complete schedules, all catches, and no interruption', () => {
  const records = {
    signal: [...[200, 210, 220, 230].map((rt) => ({ outcome: 'correct', rt })), { outcome: 'catch-correct' }],
    choice: [300, 310, 320, 330].map((rt) => ({ outcome: 'correct', rt })),
    stability: [230, 240, 250, 260].map((rt) => ({ outcome: 'correct', rt })),
  };
  const expected = { signal: 4, signalScheduled: 5, choice: 4, stability: 4, catches: 1 };
  assert.equal(summarizeRiflessi(records, expected).usable, true);
  assert.deepEqual(summarizeRiflessi(records, { ...expected, interruptions: 1 }).qualityReasons, [
    'timing-interrupted',
  ]);
});

test('config overrides stay isolated to their instrument', () => {
  const config = mergeReflexConfig({ signal: { scoredTrials: 2 }, feedbackMs: 1 });
  assert.equal(config.signal.scoredTrials, 2);
  assert.equal(config.choice.scoredTrials, 32);
  assert.equal(config.feedbackMs, 1);
});

// ---------------------------------------------------------------------------
// Ground-truth assertions.
//
// Everything below asserts computed values rather than their presence, both
// sides of every branch, and the exact boundary of every threshold. Mutation
// testing showed the original fixtures never exercised the `miss`,
// `false-start`, `anticipation`, or `catch-correct` outcomes at all, so the
// event counters could be inverted without a single test failing.
// ---------------------------------------------------------------------------

const MIXED_RECORDS = Object.freeze({
  signal: Object.freeze([
    { outcome: 'correct', rt: 200 },
    { outcome: 'correct', rt: 240 },
    { outcome: 'false-start' },
    { outcome: 'anticipation' },
    { outcome: 'miss' },
    { outcome: 'catch-correct' },
  ]),
  choice: Object.freeze([
    { outcome: 'correct', rt: 300 },
    { outcome: 'wrong' },
    { outcome: 'miss' },
    { outcome: 'false-start' },
  ]),
  stability: Object.freeze([
    { outcome: 'correct', rt: 400 },
    { outcome: 'miss' },
    { outcome: 'anticipation' },
  ]),
});

test('every event counter is computed from its own outcome across all three blocks', () => {
  const summary = summarizeRiflessi(structuredClone(MIXED_RECORDS), {
    signal: 2,
    signalScheduled: 6,
    choice: 4,
    stability: 1,
    catches: 1,
  });

  // Distinct, non-zero, mutually different counts: swapping any two outcome
  // comparisons, or inverting one, changes at least one of these numbers.
  assert.deepEqual(summary.events, {
    falseStarts: 2,
    anticipations: 2,
    misses: 3,
    wrongChoices: 1,
    catchesPassed: 1,
    catchesScheduled: 1,
  });
});

test('only correct responses with a finite time enter the timing statistics', () => {
  const summary = summarizeRiflessi(
    {
      signal: [
        { outcome: 'correct', rt: 200 },
        { outcome: 'correct', rt: 240 },
        { outcome: 'wrong', rt: 1 },
        { outcome: 'miss', rt: 5000 },
        { outcome: 'correct', rt: Number.NaN },
        { outcome: 'correct', rt: Number.POSITIVE_INFINITY },
        { outcome: 'correct' },
        { outcome: 'correct', rt: null },
      ],
      choice: [],
      stability: [],
    },
    { signal: 2, signalScheduled: 8 },
  );

  assert.equal(summary.signal.valid, 2, 'only the two finite correct times may count');
  assert.equal(summary.signal.medianMs, 220);
  assert.equal(summary.signal.withinRunSpreadMs, 20);
});

test('the summary counts events from every block, not only the signal block', () => {
  const onlyChoice = summarizeRiflessi({
    signal: [],
    choice: [{ outcome: 'miss' }, { outcome: 'false-start' }, { outcome: 'anticipation' }],
    stability: [],
  });
  assert.equal(onlyChoice.events.misses, 1);
  assert.equal(onlyChoice.events.falseStarts, 1);
  assert.equal(onlyChoice.events.anticipations, 1);

  const onlyStability = summarizeRiflessi({
    signal: [],
    choice: [],
    stability: [{ outcome: 'miss' }, { outcome: 'miss' }, { outcome: 'false-start' }],
  });
  assert.equal(onlyStability.events.misses, 2);
  assert.equal(onlyStability.events.falseStarts, 1);
  assert.equal(onlyStability.events.wrongChoices, 0, 'wrong choices come only from the choice block');
});

test('a wrong answer outside the choice block never inflates wrongChoices', () => {
  const summary = summarizeRiflessi({
    signal: [{ outcome: 'wrong' }, { outcome: 'wrong' }],
    choice: [{ outcome: 'wrong' }],
    stability: [{ outcome: 'wrong' }],
  });
  assert.equal(summary.events.wrongChoices, 1);
});

test('catch trials are only credited when the outcome is catch-correct', () => {
  const base = { choice: [], stability: [] };
  assert.equal(
    summarizeRiflessi({ ...base, signal: [{ outcome: 'catch-correct' }] }).events.catchesPassed,
    1,
  );
  assert.equal(summarizeRiflessi({ ...base, signal: [{ outcome: 'miss' }] }).events.catchesPassed, 0);
  assert.equal(
    summarizeRiflessi({ ...base, signal: [{ outcome: 'correct', rt: 5 }] }).events.catchesPassed,
    0,
  );
});

test('choice accuracy separates attempted responses from scheduled trials', () => {
  const summary = summarizeRiflessi(
    {
      signal: [],
      choice: [
        { outcome: 'correct', rt: 300 },
        { outcome: 'correct', rt: 320 },
        { outcome: 'correct', rt: 340 },
        { outcome: 'wrong' },
        { outcome: 'miss' },
        { outcome: 'false-start' },
        { outcome: 'anticipation' },
        { outcome: 'miss' },
      ],
      stability: [],
    },
    { choice: 8 },
  );

  // 3 correct of 4 attempts (correct + wrong) = 75%; 3 of 8 scheduled = 38%.
  assert.equal(summary.choice.attempts, 4);
  assert.equal(summary.choice.valid, 3);
  assert.equal(summary.choice.conditionalAccuracyPercent, 75);
  assert.equal(summary.choice.scheduledAccuracyPercent, 38);
  assert.equal(summary.choice.scheduled, 8);
});

test('accuracy is null rather than a divide-by-zero when nothing was attempted', () => {
  const summary = summarizeRiflessi({ signal: [], choice: [], stability: [] }, { choice: 0 });
  assert.equal(summary.choice.conditionalAccuracyPercent, null);
  assert.equal(summary.choice.scheduledAccuracyPercent, null);
  assert.equal(summary.choice.blockDifferenceMs, null);
  assert.equal(summary.stability.slowestGapMs, null);
  assert.equal(summary.stability.driftMs, null);
});

test('block difference and drift keep their direction', () => {
  const slowerChoice = summarizeRiflessi({
    signal: [{ outcome: 'correct', rt: 200 }],
    choice: [{ outcome: 'correct', rt: 320 }],
    stability: [],
  });
  assert.equal(slowerChoice.choice.blockDifferenceMs, 120, 'choice minus signal, never the reverse');

  const fasterChoice = summarizeRiflessi({
    signal: [{ outcome: 'correct', rt: 320 }],
    choice: [{ outcome: 'correct', rt: 200 }],
    stability: [],
  });
  assert.equal(fasterChoice.choice.blockDifferenceMs, -120);

  // Second half slower than the first half: positive drift.
  const drifting = summarizeRiflessi({
    signal: [],
    choice: [],
    stability: [200, 210, 400, 410].map((rt) => ({ outcome: 'correct', rt })),
  });
  assert.equal(drifting.stability.driftMs, 200);

  const improving = summarizeRiflessi({
    signal: [],
    choice: [],
    stability: [400, 410, 200, 210].map((rt) => ({ outcome: 'correct', rt })),
  });
  assert.equal(improving.stability.driftMs, -200);
});

test('the slowest-fifth gap measures the tail above the overall median', () => {
  const summary = summarizeRiflessi({
    signal: [],
    choice: [],
    stability: [200, 210, 220, 230, 240, 500].map((rt) => ({ outcome: 'correct', rt })),
  });
  // Median = 225; the 80th percentile cutoff is 240, so the slow tail is
  // [240, 500] with a median of 370 — a gap of 145, rounded to five.
  assert.equal(summary.stability.medianMs, 225);
  assert.equal(summary.stability.slowestGapMs, 145);
  assert.equal(summary.stability.valid, 6);
});

test('quality thresholds fire exactly at their boundary and not one trial earlier', () => {
  const correct = (count) =>
    Array.from({ length: count }, (_, index) => ({ outcome: 'correct', rt: 200 + index }));

  // 80% of 10 scheduled signal trials = 8 valid responses required.
  const atSignalBoundary = summarizeRiflessi(
    { signal: [...correct(8), ...Array(2).fill({ outcome: 'miss' })], choice: [], stability: [] },
    { signal: 10, signalScheduled: 10, choice: 0, stability: 0 },
  );
  assert.equal(atSignalBoundary.qualityReasons.includes('signal-valid-responses-low'), false);

  const belowSignalBoundary = summarizeRiflessi(
    { signal: [...correct(7), ...Array(3).fill({ outcome: 'miss' })], choice: [], stability: [] },
    { signal: 10, signalScheduled: 10, choice: 0, stability: 0 },
  );
  assert.equal(belowSignalBoundary.qualityReasons.includes('signal-valid-responses-low'), true);

  // The sustained block requires an absolute count, defaulting to six.
  const atStabilityBoundary = summarizeRiflessi(
    { signal: [], choice: [], stability: correct(6) },
    { signal: 0, signalScheduled: 0, choice: 0 },
  );
  assert.deepEqual(atStabilityBoundary.qualityReasons, []);
  assert.equal(atStabilityBoundary.usable, true);

  const belowStabilityBoundary = summarizeRiflessi(
    { signal: [], choice: [], stability: correct(5) },
    { signal: 0, signalScheduled: 0, choice: 0 },
  );
  assert.deepEqual(belowStabilityBoundary.qualityReasons, ['sustained-valid-responses-low']);
});

test('an incomplete or over-long schedule is reported in either direction', () => {
  const short = summarizeRiflessi(
    { signal: [{ outcome: 'correct', rt: 200 }], choice: [], stability: [] },
    { signal: 1, signalScheduled: 2, choice: 0, stability: 0 },
  );
  assert.equal(short.qualityReasons.includes('signal-schedule-incomplete'), true);

  const long = summarizeRiflessi(
    {
      signal: [
        { outcome: 'correct', rt: 200 },
        { outcome: 'correct', rt: 210 },
      ],
      choice: [],
      stability: [],
    },
    { signal: 2, signalScheduled: 1, choice: 0, stability: 0 },
  );
  assert.equal(long.qualityReasons.includes('signal-schedule-incomplete'), true);

  const choiceMismatch = summarizeRiflessi(
    { signal: [], choice: [{ outcome: 'correct', rt: 300 }], stability: [] },
    { signal: 0, signalScheduled: 0, choice: 2, stability: 0 },
  );
  assert.equal(choiceMismatch.qualityReasons.includes('choice-schedule-incomplete'), true);
});

test('a catch mismatch in either direction invalidates the run', () => {
  const base = { signal: [], choice: [], stability: [] };
  const expected = { signal: 0, signalScheduled: 0, choice: 0, stability: 0 };

  assert.deepEqual(summarizeRiflessi(base, { ...expected, catches: 0 }).qualityReasons, []);
  assert.deepEqual(summarizeRiflessi(base, { ...expected, catches: 1 }).qualityReasons, [
    'signal-catches-failed',
  ]);
  assert.deepEqual(
    summarizeRiflessi(
      { ...base, signal: [{ outcome: 'catch-correct' }] },
      { ...expected, signalScheduled: 1, catches: 0 },
    ).qualityReasons,
    ['signal-catches-failed'],
    'passing a catch that was never scheduled is also a mismatch',
  );
});

test('interruptions invalidate the run only when at least one occurred', () => {
  const base = { signal: [], choice: [], stability: [] };
  const expected = { signal: 0, signalScheduled: 0, choice: 0, stability: 0 };
  assert.equal(summarizeRiflessi(base, { ...expected, interruptions: 0 }).usable, true);
  assert.equal(summarizeRiflessi(base, { ...expected, interruptions: 1 }).usable, false);
  assert.deepEqual(summarizeRiflessi(base, { ...expected, interruptions: 3 }).qualityReasons, [
    'timing-interrupted',
  ]);
});

test('median, percentile, spread, and rounding return exact values on both parities', () => {
  assert.equal(median([1, 2, 3]), 2, 'odd length takes the middle element');
  assert.equal(median([1, 2, 3, 4]), 2.5, 'even length averages the two middle elements');
  assert.equal(median([3, 1, 2]), 2, 'the input is sorted before the middle is taken');
  assert.equal(median([7]), 7);

  assert.equal(percentile([1, 2, 3, 4, 5], 0), 1, 'the index floor is zero, never negative');
  assert.equal(percentile([1, 2, 3, 4, 5], 0.2), 1);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.4), 2);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.8), 4);
  assert.equal(percentile([1, 2, 3, 4, 5], 1), 5, 'the index is clamped to the last element');
  assert.equal(percentile([5, 1, 3], 0.5), 3, 'the input is sorted first');

  assert.equal(medianAbsoluteDeviation([200, 210, 220, 230]), 10);
  assert.equal(medianAbsoluteDeviation([5]), 0);
  assert.equal(medianAbsoluteDeviation([]), null);

  assert.equal(roundToFive(247), 245);
  assert.equal(roundToFive(248), 250);
  assert.equal(roundToFive(242), 240);
  assert.equal(roundToFive(0), 0);
  assert.equal(roundToFive(-247), -245);
  assert.equal(roundToFive(Number.POSITIVE_INFINITY), null);
  assert.equal(roundToFive(null), null);
});

test('randomWait spans exactly the configured window', () => {
  assert.equal(
    randomWait(1000, 3000, () => 0),
    1000,
  );
  assert.equal(
    randomWait(1000, 3000, () => 1),
    3000,
  );
  assert.equal(
    randomWait(1000, 3000, () => 0.5),
    2000,
  );
  assert.equal(
    randomWait(1000, 3000, () => 0.25),
    1500,
  );
});

test('the signal schedule is an exact, reproducible list of trials and waits', () => {
  const schedule = createSignalSchedule({
    trials: 6,
    catches: 2,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    random: seededRandom('signal'),
  });

  assert.deepEqual(schedule, [
    { kind: 'signal', waitMs: 1371 },
    { kind: 'catch', waitMs: 2539 },
    { kind: 'signal', waitMs: 2008 },
    { kind: 'signal', waitMs: 1658 },
    { kind: 'signal', waitMs: 2451 },
    { kind: 'signal', waitMs: 1201 },
    { kind: 'catch', waitMs: 1388 },
    { kind: 'signal', waitMs: 2772 },
  ]);
});

test('a schedule with no catch trials contains only signals', () => {
  const schedule = createSignalSchedule({
    trials: 2,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    random: seededRandom('x'),
  });
  assert.deepEqual(schedule, [
    { kind: 'signal', waitMs: 2593 },
    { kind: 'signal', waitMs: 1591 },
  ]);
});

test('waits are spread across buckets that span the whole window', () => {
  // Five buckets over [1000, 3000] are 400 ms wide. A random source pinned to
  // the bottom of its bucket must produce exactly the bucket lower bounds, so a
  // sign or divisor error in the bucket maths is visible.
  const schedule = createSignalSchedule({
    trials: 5,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    random: () => 0,
  });
  assert.deepEqual(
    schedule.map((trial) => trial.waitMs).sort((left, right) => left - right),
    [1000, 1400, 1800, 2200, 2600],
  );

  const ceilings = createSignalSchedule({
    trials: 5,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    random: () => 0.999999,
  });
  assert.deepEqual(
    ceilings.map((trial) => trial.waitMs).sort((left, right) => left - right),
    [1400, 1800, 2200, 2600, 3000],
  );
});

test('the choice schedule is an exact, reproducible list of sides and waits', () => {
  assert.deepEqual(
    createChoiceSchedule({
      trials: 4,
      minWaitMs: 1000,
      maxWaitMs: 2000,
      random: seededRandom('choice'),
    }),
    [
      { kind: 'choice', side: 'right', waitMs: 1416 },
      { kind: 'choice', side: 'right', waitMs: 1888 },
      { kind: 'choice', side: 'left', waitMs: 1077 },
      { kind: 'choice', side: 'left', waitMs: 1655 },
    ],
  );
});

test('an odd choice schedule still balances sides as evenly as possible', () => {
  const schedule = createChoiceSchedule({
    trials: 5,
    minWaitMs: 1000,
    maxWaitMs: 2000,
    random: seededRandom('odd'),
  });
  assert.equal(schedule.filter((trial) => trial.side === 'left').length, 3);
  assert.equal(schedule.filter((trial) => trial.side === 'right').length, 2);
});

test('an empty schedule request produces no trials rather than throwing', () => {
  assert.deepEqual(createSignalSchedule({ trials: 0, minWaitMs: 1, maxWaitMs: 2, random: () => 0 }), []);
  assert.deepEqual(createChoiceSchedule({ trials: 0, minWaitMs: 1, maxWaitMs: 2, random: () => 0 }), []);
});

test('the default configuration is the published instrument contract', () => {
  const config = mergeReflexConfig();
  assert.equal(config.anticipationMs, 100);
  assert.equal(config.feedbackMs, 520);
  assert.deepEqual(config.signal, {
    practiceTrials: 8,
    scoredTrials: 20,
    catchTrials: 2,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    responseTimeoutMs: 1500,
  });
  assert.deepEqual(config.choice, {
    practiceTrials: 8,
    scoredTrials: 32,
    minWaitMs: 1000,
    maxWaitMs: 3000,
    responseTimeoutMs: 1800,
  });
  assert.deepEqual(config.stability, {
    durationMs: 180_000,
    minWaitMs: 1000,
    maxWaitMs: 4000,
    responseTimeoutMs: 1500,
  });
});

test('a partial instrument override merges without dropping its siblings', () => {
  const config = mergeReflexConfig({ stability: { durationMs: 60_000 } });
  assert.equal(config.stability.durationMs, 60_000);
  assert.equal(config.stability.minWaitMs, 1000);
  assert.equal(config.stability.responseTimeoutMs, 1500);
  assert.equal(config.signal.scoredTrials, 20);
  assert.equal(DEFAULT_REFLEX_CONFIG.stability.durationMs, 180_000, 'the frozen default is untouched');
});
