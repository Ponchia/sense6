import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ColorLabSession,
  createStaircase,
  HUE_FAMILIES,
  sequenceScore,
  staircaseThreshold,
  updateStaircase,
} from '../src/lib/session.js';

test('two correct answers lower the staircase and one miss raises it', () => {
  const start = createStaircase({ initial: 20 });
  const oneCorrect = updateStaircase(start, true);
  const twoCorrect = updateStaircase(oneCorrect, true);
  const miss = updateStaircase(twoCorrect, false);

  assert.equal(oneCorrect.level, 20);
  assert.ok(twoCorrect.level < 20);
  assert.ok(miss.level > twoCorrect.level);
  assert.equal(miss.reversals.length, 1);
});

test('threshold uses recent reversals when enough exist', () => {
  const staircase = createStaircase();
  staircase.reversals = [9, 7, 8, 6, 7, 5];
  assert.equal(staircaseThreshold(staircase), 7);
});

test('sequence scoring rewards the ideal order and penalizes inversions', () => {
  assert.equal(sequenceScore([1, 2, 3, 4]), 100);
  assert.equal(sequenceScore([4, 3, 2, 1]), 0);
  assert.ok(sequenceScore([1, 3, 2, 4]) > 70);
});

test('insertSequence removes the tile and re-inserts it, shifting the rest', () => {
  const lab = new ColorLabSession('insert-test');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);

  const before = [...lab.currentTrial.order];
  assert.ok(lab.insertSequence(1, 4));
  const after = lab.currentTrial.order;
  assert.equal(after[4], before[1]);
  assert.deepEqual(after.slice(1, 4), before.slice(2, 5));
  assert.deepEqual(
    [...after].sort((a, b) => a - b),
    [...before].sort((a, b) => a - b),
  );

  assert.ok(lab.insertSequence(4, 1));
  assert.deepEqual(lab.currentTrial.order, before);

  assert.equal(lab.insertSequence(2, 2), false);
  assert.equal(lab.insertSequence(-1, 3), false);
  assert.equal(lab.insertSequence(0, 7), false);
});

test('sequence swaps preserve state when an index is out of range', () => {
  const lab = new ColorLabSession('swap-guards');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);

  const before = [...lab.currentTrial.order];
  assert.equal(lab.swapSequence(-1, 0), false);
  assert.equal(lab.swapSequence(0, before.length), false);
  assert.deepEqual(lab.currentTrial.order, before);

  assert.equal(lab.swapSequence(0, 1), true);
  assert.deepEqual(lab.currentTrial.order.slice(0, 2), [before[1], before[0]]);
});

test('phase-specific operations reject invalid state transitions', () => {
  const lab = new ColorLabSession('state-guards');

  assert.equal(lab.phase.id, 'threshold');
  assert.throws(() => lab.submitSequence(), /sequence trial is required/i);
  assert.throws(() => lab.insertSequence(0, 1), /sequence trial is required/i);

  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);

  assert.throws(() => lab.answerChoice(0), /use submitSequence/i);
});

test('unknown phase indexes fail explicitly instead of producing partial state', () => {
  const lab = new ColorLabSession('invalid-phase');
  lab.phaseIndex = Number.MAX_SAFE_INTEGER;

  assert.throws(() => lab.phase, /unknown session phase index/i);
});

test('a complete deterministic session produces bounded results', () => {
  const lab = new ColorLabSession('unit-session');
  let done = false;

  while (!done) {
    if (lab.phase.id === 'sequence') {
      lab.currentTrial.order.sort((first, second) => first - second);
      ({ done } = lab.submitSequence(800));
    } else {
      ({ done } = lab.answerChoice(lab.currentTrial.answer, 500));
    }
  }

  const result = lab.results();
  assert.equal(result.ordering.orderedPairsPercent, 100);
  assert.equal(result.ordering.runs, 3);
  assert.equal(result.tile.accuracyPercent, 100);
  assert.equal(result.tile.presentations, 14);
  assert.equal(result.field.accuracyPercent, 100);
  assert.equal(result.field.presentations, 12);
  assert.equal('overall' in result, false);
  assert.equal('hueProfile' in result, false);
});

test('hue families are sampled evenly across each discrimination phase', () => {
  const lab = new ColorLabSession('balanced-sampling');
  const seen = { threshold: new Map(), field: new Map() };

  while (lab.phase.id !== 'sequence') {
    const nearest = HUE_FAMILIES.reduce(
      (best, family, index) => {
        const raw = Math.abs(lab.currentTrial.reference.h - family.hue) % 360;
        const distance = raw > 180 ? 360 - raw : raw;
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    ).index;
    const counts = seen[lab.phase.id];
    counts.set(nearest, (counts.get(nearest) ?? 0) + 1);
    lab.answerChoice(0, 100);
  }

  // 14 threshold trials over 7 families = exactly two per family; 12 field
  // trials = one full cycle plus five, so every family appears 1-2 times.
  assert.ok([...seen.threshold.values()].every((count) => count === 2));
  assert.equal(seen.threshold.size, HUE_FAMILIES.length);
  assert.equal(seen.field.size, HUE_FAMILIES.length);
  assert.ok([...seen.field.values()].every((count) => count >= 1 && count <= 2));
});

test('sessions with the same seed generate the same trial sequence', () => {
  const first = new ColorLabSession('repeatable');
  const second = new ColorLabSession('repeatable');

  for (let trial = 0; trial < 10; trial += 1) {
    assert.deepEqual(first.currentTrial, second.currentTrial);
    first.answerChoice(0, 100);
    second.answerChoice(0, 100);
  }
});

// ---------------------------------------------------------------------------
// Ground-truth assertions.
//
// Mutation testing showed the Tetracromia trial generator was executed by every
// test and asserted by none: the hue direction could be inverted, the field and
// tile reference colours swapped, and the sequence spacing negated without a
// single failure. The tests below pin the computed values for known seeds and
// exercise both sides of every guard.
// ---------------------------------------------------------------------------

test('a seeded discrimination trial is generated exactly, including hue direction', () => {
  const lab = new ColorLabSession('pinned');

  assert.deepEqual(lab.currentTrial, {
    kind: 'threshold',
    answer: 2,
    reference: { l: 0.67, c: 0.105, h: 11.75624668551609 },
    target: { l: 0.67, c: 0.105, h: 350.7562466855161 },
    delta: 3.8269460353351015,
    nonce: 192939459,
  });

  // The target sits `direction * level` away from the reference: here the
  // direction is negative, so the target hue wraps below the reference through
  // 360. Inverting the direction, or negating the wrap term, moves it to 32.76.
  const first = lab.currentTrial;
  assert.equal((first.target.h - first.reference.h + 360) % 360, 339, 'the hue offset must keep its sign');

  lab.answerChoice(first.answer, 100);
  const second = lab.currentTrial;
  assert.deepEqual(second.reference, { l: 0.67, c: 0.105, h: 112.4927590652369 });
  assert.deepEqual(second.target, { l: 0.67, c: 0.105, h: 91.4927590652369 });
  assert.equal(second.answer, 0);
  assert.equal(second.nonce, 793577074);
});

test('the tile and field phases use different reference colours and choice counts', () => {
  const lab = new ColorLabSession('phase-shapes');
  assert.equal(lab.phase.id, 'threshold');
  assert.equal(lab.currentTrial.reference.l, 0.67);
  assert.equal(lab.currentTrial.reference.c, 0.105);
  assert.ok(lab.currentTrial.answer >= 0 && lab.currentTrial.answer < 16, 'the tile phase offers 16 choices');

  while (lab.phase.id === 'threshold') lab.answerChoice(lab.currentTrial.answer, 100);

  assert.equal(lab.phase.id, 'field');
  assert.equal(lab.currentTrial.reference.l, 0.7, 'the field phase is lighter than the tile phase');
  assert.equal(lab.currentTrial.reference.c, 0.095, 'the field phase is less chromatic than the tile phase');
  assert.ok(lab.currentTrial.answer >= 0 && lab.currentTrial.answer < 4, 'the field phase offers 4 choices');
});

test('the reference hue always stays inside a single revolution', () => {
  // The base hue jitters +-7 degrees around a family hue, so the first family
  // (18) can go negative before the wrap. Every generated hue must still land
  // in [0, 360).
  for (const seed of ['wrap-a', 'wrap-b', 'wrap-c', 'wrap-d']) {
    const lab = new ColorLabSession(seed);
    while (lab.phase.id !== 'sequence') {
      const { reference, target } = lab.currentTrial;
      assert.ok(reference.h >= 0 && reference.h < 360, `${seed} produced reference hue ${reference.h}`);
      assert.ok(target.h >= 0 && target.h < 360, `${seed} produced target hue ${target.h}`);
      lab.answerChoice(0, 100);
    }
  }
});

test('the delta of a discrimination trial matches the staircase level it was drawn at', () => {
  const lab = new ColorLabSession('delta-check');
  const trial = lab.currentTrial;
  const separation = Math.abs(((trial.target.h - trial.reference.h + 540) % 360) - 180);
  assert.ok(Math.abs(separation - 21) < 1e-9, 'the tile staircase starts at 21 degrees');
  assert.ok(trial.delta > 0);
  assert.ok(Math.abs(trial.delta - lab.levelToDelta('threshold', 21)) < 1e-12);
  assert.ok(Math.abs(trial.delta - 3.826946035335) < 1e-9, `delta was ${trial.delta}`);
});

test('a sequence trial lays nine colours out over a fixed span in ascending hue order', () => {
  const lab = new ColorLabSession('sequence-shape');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);

  const { colors, order } = lab.currentTrial;
  assert.equal(colors.length, 9);
  assert.deepEqual(
    colors.map(({ id }) => id),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  for (const color of colors) {
    assert.equal(color.l, 0.7);
    assert.equal(color.c, 0.105);
    assert.ok(color.h >= 0 && color.h < 360);
  }

  // 92 degrees across eight gaps = 11.5 degrees per step, ascending. Negating
  // the span term would make the ramp descend.
  const steps = colors.slice(1).map((color, index) => color.h - colors[index].h);
  for (const step of steps) assert.ok(Math.abs(step - 11.5) < 1e-9, `hue step was ${step}`);

  // Only the seven interior tiles are shuffled; the anchors stay pinned.
  assert.deepEqual(
    [...order].sort((left, right) => left - right),
    [1, 2, 3, 4, 5, 6, 7],
  );
});

test('progress counts every completed trial across all three phases', () => {
  const lab = new ColorLabSession('progress');
  assert.equal(lab.totalTrials, 29, '14 tile + 12 field + 3 ordering runs');
  assert.equal(lab.completedTrials, 0);
  assert.equal(lab.progress, 0);

  lab.answerChoice(lab.currentTrial.answer, 100);
  assert.equal(lab.completedTrials, 1);
  assert.equal(lab.progress, 3);

  while (lab.phase.id === 'threshold') lab.answerChoice(lab.currentTrial.answer, 100);
  assert.equal(lab.completedTrials, 14, 'the field phase starts after all 14 tile trials');

  lab.answerChoice(lab.currentTrial.answer, 100);
  assert.equal(lab.completedTrials, 15, 'earlier phases are added, never subtracted');
});

test('the staircase threshold prefers reversals only once four have been recorded', () => {
  const base = createStaircase({ initial: 20 });
  const history = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => ({ level, correct: true }));

  // Exactly four reversals is enough: the median of [9, 7, 8, 6] is 7.5.
  assert.equal(staircaseThreshold({ ...base, reversals: [9, 7, 8, 6], history }), 7.5);
  // Three is not: it falls back to the last six history levels, median 5.5.
  assert.equal(staircaseThreshold({ ...base, reversals: [9, 7, 8], history }), 5.5);
});

test('the threshold window is the most recent six reversals, not the oldest', () => {
  const base = createStaircase({ initial: 20 });
  // A wild first reversal must be dropped by the trailing window.
  assert.equal(staircaseThreshold({ ...base, reversals: [1000, 9, 7, 8, 6, 7, 5] }), 7);
});

test('the threshold handles odd and even sample counts and an empty staircase', () => {
  const base = createStaircase({ initial: 20 });
  assert.equal(staircaseThreshold(base), 20, 'with no samples the current level is reported');
  assert.equal(staircaseThreshold({ ...base, reversals: [9, 7, 8, 6, 5] }), 7, 'odd: middle element');
  assert.equal(staircaseThreshold({ ...base, reversals: [9, 7, 8, 6] }), 7.5, 'even: mean of the middle two');
});

test('the staircase steps by fixed factors and records reversals at the turn', () => {
  const start = createStaircase({ initial: 20 });
  const one = updateStaircase(start, true);
  assert.equal(one.level, 20, 'a single correct answer does not move the level');
  assert.equal(one.correctStreak, 1);
  assert.deepEqual(one.reversals, []);

  const two = updateStaircase(one, true);
  assert.equal(two.level, 20 * 0.76, 'two correct answers step down by 0.76');
  assert.equal(two.correctStreak, 0);
  assert.equal(two.previousDirection, 'down');

  const miss = updateStaircase(two, false);
  assert.equal(miss.level, 20 * 0.76 * 1.26, 'a miss steps up by 1.26');
  assert.equal(miss.previousDirection, 'up');
  assert.deepEqual(miss.reversals, [20 * 0.76], 'the reversal records the level before the turn');

  const second = updateStaircase(miss, false);
  assert.deepEqual(second.reversals, [20 * 0.76], 'a continued direction is not a reversal');
});

test('the staircase respects its floor and ceiling', () => {
  const low = createStaircase({ initial: 1, minimum: 1, maximum: 40 });
  assert.equal(updateStaircase(updateStaircase(low, true), true).level, 1);
  const high = createStaircase({ initial: 40, minimum: 1, maximum: 40 });
  assert.equal(updateStaircase(high, false).level, 40);
});

test('sequence scoring is an exact inversion count, not a threshold', () => {
  assert.equal(sequenceScore([1, 2, 3, 4]), 100, 'no inversions');
  assert.equal(sequenceScore([4, 3, 2, 1]), 0, 'all six pairs inverted');
  assert.equal(sequenceScore([1, 3, 2, 4]), 83, 'one of six pairs inverted');
  assert.equal(sequenceScore([2, 1, 4, 3]), 67, 'two of six pairs inverted');
  assert.equal(sequenceScore([1]), 100, 'a single element has no pairs to invert');
  assert.equal(sequenceScore([]), 100);
});

test('swapSequence rejects each out-of-range index independently', () => {
  const lab = new ColorLabSession('swap-bounds');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);
  const length = lab.currentTrial.order.length;
  const before = [...lab.currentTrial.order];

  // Only one index is invalid in each case, so an `&&` chain would accept them.
  assert.equal(lab.swapSequence(-1, 0), false);
  assert.equal(lab.swapSequence(0, -1), false);
  assert.equal(lab.swapSequence(length, 0), false);
  assert.equal(lab.swapSequence(0, length), false);
  assert.deepEqual(lab.currentTrial.order, before, 'a rejected swap must not mutate the trial');

  // The last valid index is length - 1, so that swap must succeed.
  assert.equal(lab.swapSequence(0, length - 1), true);
  assert.equal(lab.currentTrial.order[0], before[length - 1]);
  assert.equal(lab.currentTrial.order[length - 1], before[0]);
});

test('insertSequence rejects each out-of-range index independently', () => {
  const lab = new ColorLabSession('insert-bounds');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);
  const length = lab.currentTrial.order.length;
  const before = [...lab.currentTrial.order];

  assert.equal(lab.insertSequence(-1, 0), false);
  assert.equal(lab.insertSequence(0, -1), false);
  assert.equal(lab.insertSequence(length, 0), false);
  assert.equal(lab.insertSequence(0, length), false);
  assert.equal(lab.insertSequence(1, 1), false, 'a no-op move is refused');
  assert.deepEqual(lab.currentTrial.order, before);

  assert.equal(lab.insertSequence(0, length - 1), true, 'the last index is a valid destination');
});

test('moveSequence walks one step and stops exactly at both ends', () => {
  const lab = new ColorLabSession('move-bounds');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);
  const length = lab.currentTrial.order.length;
  const before = [...lab.currentTrial.order];

  assert.equal(lab.moveSequence(0, -1), false, 'the first tile cannot move left');
  assert.equal(lab.moveSequence(length - 1, 1), false, 'the last tile cannot move right');
  assert.deepEqual(lab.currentTrial.order, before);

  assert.equal(lab.moveSequence(0, 1), true);
  assert.deepEqual(lab.currentTrial.order.slice(0, 2), [before[1], before[0]]);

  assert.equal(lab.moveSequence(length - 1, -1), true);
});

test('a complete deterministic session produces exact observations', () => {
  const lab = new ColorLabSession('unit-session');
  let done = false;
  while (!done) {
    if (lab.phase.id === 'sequence') {
      lab.currentTrial.order.sort((first, second) => first - second);
      ({ done } = lab.submitSequence(800));
    } else {
      ({ done } = lab.answerChoice(lab.currentTrial.answer, 500));
    }
  }

  assert.deepEqual(lab.results(), {
    tile: {
      adaptiveLevelDegrees: 5.3,
      deltaEok: 0.975,
      accuracyPercent: 100,
      correct: 14,
      presentations: 14,
      reversals: 0,
      presentedMinimum: 4,
      presentedMaximum: 21,
    },
    field: {
      adaptiveLevelDegrees: 8,
      deltaEok: 1.327,
      accuracyPercent: 100,
      correct: 12,
      presentations: 12,
      reversals: 0,
      presentedMinimum: 6.1,
      presentedMaximum: 24,
    },
    ordering: { orderedPairsPercent: 100, runs: 3, runPercentages: [100, 100, 100] },
    // 26 discrimination trials at 500 ms plus 3 ordering runs at 800 ms.
    elapsedMs: 26 * 500 + 3 * 800,
    seed: 'unit-session',
  });
});

test('elapsed time is summed across every phase', () => {
  const lab = new ColorLabSession('elapsed');
  let done = false;
  let expected = 0;
  while (!done) {
    if (lab.phase.id === 'sequence') {
      expected += 1200;
      ({ done } = lab.submitSequence(1200));
    } else {
      expected += 250;
      ({ done } = lab.answerChoice(lab.currentTrial.answer, 250));
    }
  }
  assert.equal(lab.results().elapsedMs, expected);
  assert.equal(expected, 26 * 250 + 3 * 1200);
});

test('the level-to-delta conversion is phase specific', () => {
  const lab = new ColorLabSession('delta-phase');
  const field = lab.levelToDelta('field', 10);
  const tile = lab.levelToDelta('threshold', 10);
  assert.equal(field, 1.6559591122055055);
  assert.equal(tile, 1.8302705977008213);
  assert.notEqual(field, tile, 'the field and tile references must not collapse together');
});

test('the ordering ramp starts at a jittered anchor hue, not at the anchor itself', () => {
  const lab = new ColorLabSession('sequence-shape');
  while (lab.phase.id !== 'sequence') lab.answerChoice(lab.currentTrial.answer, 100);

  // Round one is anchored at 8 degrees with up to +-4 degrees of jitter. Pinning
  // the exact ramp catches a sign error in either the anchor or the jitter.
  assert.deepEqual(
    lab.currentTrial.colors.map(({ h }) => h),
    [
      11.263719411566854, 22.763719411566854, 34.26371941156685, 45.76371941156685, 57.26371941156685,
      68.76371941156685, 80.26371941156685, 91.76371941156685, 103.26371941156685,
    ],
  );
  assert.ok(Math.abs(lab.currentTrial.colors[0].h - 8) <= 4, 'the start stays within the jitter window');
});
