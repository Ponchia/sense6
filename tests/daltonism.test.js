import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADAPTIVE_CONFIG,
  AXIS_CONFIGS,
  AXIS_TYPES,
  CONFUSION_DIRECTIONS,
  createAdaptiveRun,
  currentAdaptiveTrial,
  displayEnvironmentChange,
  lmsOf,
  makeTargetPair,
  ORIENTATIONS,
  recordAdaptiveAnswer,
  srgbDistance,
  summarizeAdaptiveRun,
} from '../src/lib/daltonism.js';

const fixedRandom = () => 0.25;

const displayEnvironment = Object.freeze({
  theme: 'light',
  forcedColors: false,
  dpr: 2,
  orientation: 'portrait-primary',
  viewportWidth: 390,
  viewportHeight: 844,
});

test('display integrity changes invalidate a measured run', () => {
  assert.equal(displayEnvironmentChange(displayEnvironment, { ...displayEnvironment }), null);
  assert.equal(
    displayEnvironmentChange(displayEnvironment, { ...displayEnvironment, theme: 'dark' }),
    'theme',
  );
  assert.equal(
    displayEnvironmentChange(displayEnvironment, { ...displayEnvironment, forcedColors: true }),
    'forced-colors',
  );
  assert.equal(displayEnvironmentChange(displayEnvironment, { ...displayEnvironment, dpr: 3 }), 'dpr');
  assert.equal(
    displayEnvironmentChange(displayEnvironment, {
      ...displayEnvironment,
      orientation: 'landscape-primary',
    }),
    'orientation',
  );
  assert.equal(
    displayEnvironmentChange(displayEnvironment, { ...displayEnvironment, viewportHeight: 700 }),
    'geometry',
  );
  assert.equal(
    displayEnvironmentChange(displayEnvironment, { ...displayEnvironment, viewportHeight: 843.5 }),
    null,
  );
});

test('display-model directions are normalized', () => {
  for (const direction of Object.values(CONFUSION_DIRECTIONS)) {
    assert.ok(Math.abs(Math.hypot(...direction) - 1) < 1e-9);
  }
});

test('each model direction predominantly drives its corresponding LMS channel', () => {
  const cone = { protan: 0, deutan: 1, tritan: 2 };
  for (const [type, index] of Object.entries(cone)) {
    const lms = lmsOf(CONFUSION_DIRECTIONS[type]);
    const others = lms.filter((_, candidate) => candidate !== index).map(Math.abs);
    assert.ok(Math.abs(lms[index]) > 5 * Math.max(...others), `${type} leaks into other channels`);
  }
});

test('the full adaptive range stays in gamut and produces visible easy targets', () => {
  for (const [type, config] of Object.entries(AXIS_CONFIGS)) {
    const pair = makeTargetPair(config.background, type, ADAPTIVE_CONFIG.maximumStrength);
    assert.ok(
      pair.targetLinear.every((channel) => channel > 0 && channel < 1),
      `${type} clipped`,
    );
    assert.ok(srgbDistance(pair.field, pair.target) > 40, `${type} easy target is too subtle`);
  }
});

test('a run interleaves twelve trials per direction with three task controls', () => {
  const run = createAdaptiveRun(fixedRandom);
  assert.equal(run.schedule.length, AXIS_TYPES.length * ADAPTIVE_CONFIG.trialsPerAxis + 3);
  assert.equal(run.schedule.filter(({ type }) => type === 'control').length, 3);
  for (const type of AXIS_TYPES) {
    assert.equal(run.schedule.filter((slot) => slot.type === type).length, ADAPTIVE_CONFIG.trialsPerAxis);
  }
  assert.ok(run.schedule.every(({ orientation }) => ORIENTATIONS.includes(orientation)));
});

test('two correct answers lower an axis strength and one error raises it', () => {
  const run = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(run)?.type === 'control') {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.orientation);
  }

  const first = currentAdaptiveTrial(run);
  const type = first.type;
  const initial = run.axes[type].strength;
  recordAdaptiveAnswer(run, first.orientation);

  while (currentAdaptiveTrial(run)?.type !== type) {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.orientation);
  }
  recordAdaptiveAnswer(run, currentAdaptiveTrial(run).orientation);
  assert.ok(run.axes[type].strength < initial);

  while (currentAdaptiveTrial(run)?.type !== type) {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.orientation);
  }
  const strengthBeforeError = run.axes[type].strength;
  recordAdaptiveAnswer(run, 'not-an-orientation');
  assert.ok(run.axes[type].strength > strengthBeforeError);
  assert.equal(run.axes[type].reversals.length, 1);
});

test('a no-gap response is a miss and makes that direction easier', () => {
  const run = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(run)?.type === 'control') {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.orientation);
  }

  const trial = currentAdaptiveTrial(run);
  const initial = trial.strength;
  const response = recordAdaptiveAnswer(run, 'unseen');
  assert.equal(response.correct, false);
  assert.equal(response.answer, 'unseen');
  assert.ok(run.axes[trial.type].strength > initial);
});

test('confirmed floor performance ends an axis instead of repeating floor trials', () => {
  const run = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(run)) {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.orientation);
  }

  const result = summarizeAdaptiveRun(run);
  for (const axis of result.axes) {
    const presentations = run.axes[axis.type].presentations;
    const atFloor = presentations.filter(({ strength }) => strength === ADAPTIVE_CONFIG.minimumStrength);
    assert.equal(axis.limit, 'floor');
    assert.equal(atFloor.length, 2);
    assert.ok(axis.presentations < ADAPTIVE_CONFIG.trialsPerAxis);
  }
});

test('two no-gap responses at maximum end an axis at the experiment maximum', () => {
  const run = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(run)) {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.type === 'control' ? trial.orientation : 'unseen');
  }

  const result = summarizeAdaptiveRun(run);
  assert.ok(result.controlOk);
  for (const axis of result.axes) {
    assert.equal(axis.limit, 'ceiling');
    assert.equal(axis.threshold, ADAPTIVE_CONFIG.maximumStrength);
    assert.ok(axis.presentations < ADAPTIVE_CONFIG.trialsPerAxis);
  }
});

test('all-correct runs return lower display-relative thresholds than all-error runs', () => {
  const correctRun = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(correctRun)) {
    recordAdaptiveAnswer(correctRun, currentAdaptiveTrial(correctRun).orientation);
  }

  const errorRun = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(errorRun)) {
    const trial = currentAdaptiveTrial(errorRun);
    recordAdaptiveAnswer(errorRun, trial.type === 'control' ? trial.orientation : 'wrong');
  }

  const correct = summarizeAdaptiveRun(correctRun);
  const errors = summarizeAdaptiveRun(errorRun);
  assert.ok(correct.controlOk);
  assert.ok(errors.controlOk);
  for (let index = 0; index < AXIS_TYPES.length; index += 1) {
    assert.ok(correct.axes[index].threshold < errors.axes[index].threshold);
  }
});

test('missing two task controls makes a run inconclusive without a diagnostic label', () => {
  const run = createAdaptiveRun(fixedRandom);
  while (currentAdaptiveTrial(run)) {
    const trial = currentAdaptiveTrial(run);
    recordAdaptiveAnswer(run, trial.type === 'control' ? 'wrong' : trial.orientation);
  }
  const result = summarizeAdaptiveRun(run);
  assert.equal(result.controlOk, false);
  assert.match(result.title, /inconclusive/i);
  assert.doesNotMatch(result.title, /deficiency|normal|typical/i);
});
