import assert from 'node:assert/strict';
import test from 'node:test';
import { seededRandom } from '../src/lib/random.js';
import {
  createChoiceSchedule,
  createSignalSchedule,
  median,
  mergeReflexConfig,
  percentile,
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
  assert.equal(summary.choice.costMs, 95);
  assert.equal(summary.choice.accuracyPercent, 75);
  assert.equal(summary.stability.slowestGapMs, 55);
  assert.equal(summary.stability.driftMs, 50);
  assert.equal(summary.events.wrongChoices, 1);
  assert.equal(summary.usable, true);
  assert.equal('score' in summary, false);
});

test('config overrides stay isolated to their instrument', () => {
  const config = mergeReflexConfig({ signal: { scoredTrials: 2 }, feedbackMs: 1 });
  assert.equal(config.signal.scoredTrials, 2);
  assert.equal(config.choice.scoredTrials, 32);
  assert.equal(config.feedbackMs, 1);
});
