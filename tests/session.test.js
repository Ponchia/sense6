import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ColorLabSession,
  createStaircase,
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
  assert.equal(result.sequenceScore, 100);
  assert.equal(result.thresholdAccuracy, 100);
  assert.equal(result.fieldAccuracy, 100);
  assert.ok(result.overall >= 0 && result.overall <= 100);
  assert.equal(result.hueProfile.length, 6);
  assert.ok(result.hueProfile.every((value) => value >= 0 && value <= 100));
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
