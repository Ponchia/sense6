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
