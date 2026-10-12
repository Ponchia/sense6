import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADAPTIVE_CONFIG,
  AXIS_CONFIGS,
  AXIS_TYPES,
  createAdaptiveRun,
  currentAdaptiveTrial,
  lmsOf,
  makeTargetPair,
  ORIENTATIONS,
  recordAdaptiveAnswer,
  summarizeAdaptiveRun,
} from '../src/lib/daltonism.js';
import { seededRandom } from '../src/lib/random.js';

// Synthetic software stress tests of the currently shipped adaptive method.
// These are NOT people, psychometric validation, medical simulations, normative
// data, device calibration, repeatability studies, or evidence that actual
// observers use the strategies below. No production protocol is modified.
const RUN_COUNT = 256;
const INCORRECT_ORIENTATIONS = Object.fromEntries(
  ORIENTATIONS.map((orientation) => [orientation, ORIENTATIONS.filter((item) => item !== orientation)]),
);

/** @param {number} seed @param {(trial: ReturnType<typeof currentAdaptiveTrial>, random: () => number) => string} respondent */
function simulate(seed, respondent) {
  const run = createAdaptiveRun(seededRandom(`daltonia-schedule-${seed}`));
  // An independent random stream prevents the synthetic response from altering
  // trial order, which is also generated from seeded randomness.
  const responseRandom = seededRandom(`daltonia-answer-${seed}`);
  for (let step = 0; step < run.schedule.length; step += 1) {
    const trial = currentAdaptiveTrial(run);
    if (!trial) break;
    const response = recordAdaptiveAnswer(run, respondent(trial, responseRandom));
    assert.ok(response, `synthetic response failed on schedule step ${step}`);
  }
  assert.equal(currentAdaptiveTrial(run), null, 'synthetic observer did not finish its run');
  const result = summarizeAdaptiveRun(run);
  assert.equal(result.complete, true);
  assert.equal(result.controls.total, ADAPTIVE_CONFIG.controlTrials);
  assert.ok(run.responses.length <= run.schedule.length);
  return result;
}

/** @param {string} mode @param {(trial: ReturnType<typeof currentAdaptiveTrial>, random: () => number) => string} respondent */
function cohort(mode, respondent) {
  const results = Array.from({ length: RUN_COUNT }, (_, seed) => simulate(seed, respondent));
  assert.equal(results.length, RUN_COUNT, `${mode} should use the entire frozen seed cohort`);
  return results;
}

/** @param {ReturnType<typeof summarizeAdaptiveRun>[]} results */
function meanAxisLevel(results) {
  return (
    results.reduce(
      (sum, result) => sum + result.axes.reduce((axisSum, axis) => axisSum + axis.threshold, 0),
      0,
    ) /
    (results.length * AXIS_TYPES.length)
  );
}

test('the ideal all-correct and all-missed synthetic observers terminate at opposite bounds', () => {
  const perfect = cohort('all correct', (trial) => trial.orientation);
  const missed = cohort('all missed except controls', (trial) =>
    trial.type === 'control' ? trial.orientation : 'unseen',
  );
  for (const result of perfect) {
    assert.equal(result.controlStatus, 'passed');
    assert.ok(result.axes.every((axis) => axis.limit === 'floor'));
    assert.ok(result.axes.every((axis) => axis.threshold === ADAPTIVE_CONFIG.minimumStrength));
  }
  for (const result of missed) {
    assert.equal(result.controlStatus, 'passed');
    assert.ok(result.axes.every((axis) => axis.limit === 'ceiling'));
    assert.ok(result.axes.every((axis) => axis.threshold === ADAPTIVE_CONFIG.maximumStrength));
  }
});

test('three task controls are not sufficient to prove genuine perception or attention', () => {
  const chance = cohort(
    'uniform guessing',
    (_, random) => ORIENTATIONS[Math.floor(random() * ORIENTATIONS.length)],
  );
  const passed = chance.filter((result) => result.controlStatus === 'passed').length;
  const cautious = chance.filter((result) => result.controlStatus === 'caution').length;
  assert.ok(passed > 0 && passed < RUN_COUNT / 10, 'occasional random control passes should be possible');
  assert.ok(cautious > 0 && cautious < RUN_COUNT / 4, 'control caution also occurs by chance');
  assert.ok(passed + cautious < RUN_COUNT / 3);

  // A model that answers easy controls but guesses every difficult stimulus
  // can pass all controls. The published limits explicitly prohibit interpreting
  // this result as proof of perception, a deficiency, or clinical screening.
  const controlOnly = cohort('controls correct; axes guessed', (trial, random) =>
    trial.type === 'control' ? trial.orientation : ORIENTATIONS[Math.floor(random() * ORIENTATIONS.length)],
  );
  assert.ok(controlOnly.every((result) => result.controlStatus === 'passed'));
  assert.ok(meanAxisLevel(controlOnly) > 0.25);
});

test('synthetic psychometric thresholds produce ordered but not calibrated adaptive levels', () => {
  /** @param {number} target */
  const observer = (target) => (trial, random) => {
    if (trial.type === 'control') return trial.orientation;
    const detection = 1 / (1 + Math.exp(-(trial.strength - target) / 0.025));
    const correctChance = 0.25 + 0.75 * detection;
    if (random() < correctChance) return trial.orientation;
    const incorrect = INCORRECT_ORIENTATIONS[trial.orientation];
    return incorrect[Math.floor(random() * incorrect.length)];
  };
  const easier = cohort('synthetic threshold 0.09', observer(0.09));
  const harder = cohort('synthetic threshold 0.23', observer(0.23));
  const easyLevel = meanAxisLevel(easier);
  const hardLevel = meanAxisLevel(harder);
  assert.ok(easier.every((result) => result.controlStatus === 'passed'));
  assert.ok(harder.every((result) => result.controlStatus === 'passed'));
  assert.ok(easyLevel > 0.07 && easyLevel < 0.14, `unexpected easy synthetic level ${easyLevel}`);
  assert.ok(hardLevel > 0.19 && hardLevel < 0.28, `unexpected hard synthetic level ${hardLevel}`);
  assert.ok(hardLevel - easyLevel > 0.09, 'synthetic adaptive method lost its basic level ordering');
});

test('idealized residual intensity alone remains a non-colour cue on two axes', () => {
  // Not a physiological dichromat simulator: only the source model's untouched
  // cone component is inspected. Spatial dot masking and real screens are not
  // modeled. This documents why even perfect software invariants cannot make
  // these colour tasks clinical tests.
  const preservedCone = { protan: 1, deutan: 0, tritan: 0 };
  const residuals = {};
  for (const type of AXIS_TYPES) {
    const pair = makeTargetPair(AXIS_CONFIGS[type].background, type, ADAPTIVE_CONFIG.initialStrength);
    const field = lmsOf(pair.fieldLinear);
    const target = lmsOf(pair.targetLinear);
    const index = preservedCone[type];
    residuals[type] = Math.abs((target[index] - field[index]) / field[index]);
  }
  assert.ok(residuals.protan > 0.04);
  assert.ok(residuals.deutan > 0.05);
  assert.ok(residuals.tritan < 0.000001);
});
