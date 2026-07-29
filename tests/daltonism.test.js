import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADAPTIVE_CONFIG,
  AXIS_CONFIGS,
  AXIS_TYPES,
  CONFUSION_DIRECTIONS,
  coneLuminance,
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
const incorrectOrientation = (orientation) => ORIENTATIONS.find((candidate) => candidate !== orientation);

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
    assert.equal(pair.appliedStrength, ADAPTIVE_CONFIG.maximumStrength);
  }
});

/*
 * The stimulus exists to isolate a chromatic direction, so a mean brightness
 * step between target and field is not a rounding detail — it is an alternative
 * route to the answer that needs no colour discrimination at all.
 *
 * The relevant luminance channel is the one this module's own cone model
 * implies, L+M, not the photopic sRGB Y coefficients: those describe a
 * different observer. Matching Y instead left up to 2.5% of L+M contrast in the
 * stimulus. The dot ring carries ~217 target and ~685 field dots under +/-18%
 * per-dot luminance jitter, so the standard error of the ring-mean difference is
 * about 0.81%; a 2.5% residual sits ~3 sigma above that noise and is therefore
 * usable. Nothing asserted this, which is why it shipped.
 */
test('target and field match on L+M cone luminance across the whole adaptive range', () => {
  const RING_MEAN_NOISE = 0.0081;
  for (const [type, config] of Object.entries(AXIS_CONFIGS)) {
    for (let strength = 0; strength <= ADAPTIVE_CONFIG.maximumStrength + 1e-9; strength += 0.0025) {
      const pair = makeTargetPair(config.background, type, strength);
      const residual =
        Math.abs(coneLuminance(pair.targetLinear) - coneLuminance(pair.fieldLinear)) /
        coneLuminance(pair.fieldLinear);
      assert.ok(
        residual < 1e-12,
        `${type} @${strength.toFixed(4)} leaves ${(residual * 100).toFixed(4)}% L+M contrast`,
      );
      assert.ok(residual < RING_MEAN_NOISE / 1000, `${type} residual is not far below the noise floor`);
    }
  }
});

test('the control direction is also L+M matched so it tests attention, not brightness', () => {
  const background = /** @type {[number, number, number]} */ ([0.27, 0.32, 0.18]);
  for (const strength of [0, 0.1, ADAPTIVE_CONFIG.controlStrength]) {
    const pair = makeTargetPair(background, 'control', strength);
    const residual =
      Math.abs(coneLuminance(pair.targetLinear) - coneLuminance(pair.fieldLinear)) /
      coneLuminance(pair.fieldLinear);
    assert.ok(residual < 1e-12, `control @${strength} leaves ${(residual * 100).toFixed(4)}% L+M contrast`);
  }
});

/*
 * Guard the boundary, not just the fix. Only the S axis is simultaneously a
 * confusion line and an isoluminant direction, so tritan is the one direction
 * where the equiluminance rescale is the identity. If this ever stops holding,
 * the direction basis or the cone matrix has drifted.
 */
test('the tritan axis needs no luminance correction at all', () => {
  const background = AXIS_CONFIGS.tritan.background;
  const direction = CONFUSION_DIRECTIONS.tritan;

  // The S direction carries ~1e-8 of L+M per unit, which is the rounding of the
  // eight-decimal inverse matrix rather than real luminance. 1e-6 is therefore
  // far tighter than any true rescale (protan and deutan need ~5e-2) and far
  // looser than that matrix noise.
  for (const strength of [0.035, 0.2, ADAPTIVE_CONFIG.maximumStrength]) {
    const pair = makeTargetPair(background, 'tritan', strength);
    for (let channel = 0; channel < 3; channel += 1) {
      const uncorrected = background[channel] + direction[channel] * strength;
      const scale = pair.targetLinear[channel] / uncorrected;
      assert.ok(
        Math.abs(scale - 1) < 1e-6,
        `tritan @${strength} was rescaled by ${scale} on channel ${channel}`,
      );
    }
  }
});

/*
 * Documented, deliberate limitation. Equal L+M is reached by scaling every cone
 * excitation by a common factor, and a dichromat of the matching type reads that
 * factor as a small uniform intensity step. No scalar removes it: a protanope
 * sees nothing only when the factor is exactly 1, and L+M matches only when it
 * is not. The residual is confined to the pure-intensity direction because that
 * is the subspace the per-dot luminance jitter masks. This test pins the size of
 * that known residual so a later change cannot quietly inflate it.
 */
test('the unavoidable dichromat intensity residual stays within its documented bound', () => {
  const untouchedCone = { protan: 1, deutan: 0 };
  for (const [type, cone] of Object.entries(untouchedCone)) {
    const pair = makeTargetPair(AXIS_CONFIGS[type].background, type, ADAPTIVE_CONFIG.maximumStrength);
    const ratio = lmsOf(pair.targetLinear)[cone] / lmsOf(pair.fieldLinear)[cone];
    assert.ok(Math.abs(ratio - 1) > 0.01, `${type} residual vanished; the direction basis probably changed`);
    assert.ok(
      Math.abs(ratio - 1) < 0.09,
      `${type} common-mode residual grew to ${((ratio - 1) * 100).toFixed(2)}%`,
    );
  }
});

test('an out-of-gamut request reduces separation instead of clamping channels', () => {
  const bright = /** @type {[number, number, number]} */ ([0.9, 0.9, 0.85]);
  const requested = ADAPTIVE_CONFIG.maximumStrength;
  const pair = makeTargetPair(bright, 'protan', requested);

  assert.ok(pair.appliedStrength < requested, 'expected the gamut path to reduce the request');
  assert.ok(pair.appliedStrength > 0, 'the reduced separation must remain a real stimulus');
  assert.ok(
    pair.targetLinear.every((channel) => channel >= 0 && channel <= 1),
    'gamut mapping left a channel outside the unit cube',
  );

  // The point of reducing strength rather than clamping: the luminance match and
  // the confusion direction both survive. Per-channel clamping breaks both.
  const residual =
    Math.abs(coneLuminance(pair.targetLinear) - coneLuminance(pair.fieldLinear)) /
    coneLuminance(pair.fieldLinear);
  assert.ok(residual < 1e-12, `gamut mapping reintroduced ${(residual * 100).toFixed(4)}% L+M contrast`);

  const offset = [0, 1, 2].map((channel) => pair.targetLinear[channel] - bright[channel]);
  const scale = offset[0] / CONFUSION_DIRECTIONS.protan[0];
  for (let channel = 1; channel < 3; channel += 1) {
    assert.ok(
      Math.abs(offset[channel] - CONFUSION_DIRECTIONS.protan[channel] * scale) < 0.02,
      'gamut mapping tilted the confusion direction',
    );
  }
});

test('a zero-luminance background cannot produce a divide-by-zero target', () => {
  const pair = makeTargetPair([0, 0, 0], 'deutan', 0.2);
  assert.ok(pair.targetLinear.every((channel) => Number.isFinite(channel)));
  assert.ok(pair.targetLinear.every((channel) => channel >= 0 && channel <= 1));
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
  recordAdaptiveAnswer(run, 'unseen');
  assert.ok(run.axes[type].strength > strengthBeforeError);
  assert.equal(run.axes[type].reversals.length, 1);
});

test('invalid response strings neither score nor advance the adaptive run', () => {
  const run = createAdaptiveRun(fixedRandom);
  const index = run.index;
  const responses = run.responses.length;
  assert.equal(recordAdaptiveAnswer(run, 'not-an-orientation'), null);
  assert.equal(run.index, index);
  assert.equal(run.responses.length, responses);
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
    recordAdaptiveAnswer(errorRun, trial.type === 'control' ? trial.orientation : 'unseen');
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
    recordAdaptiveAnswer(
      run,
      trial.type === 'control' ? incorrectOrientation(trial.orientation) : trial.orientation,
    );
  }
  const result = summarizeAdaptiveRun(run);
  assert.equal(result.controlOk, false);
  assert.match(result.title, /inconclusive/i);
  assert.doesNotMatch(result.title, /deficiency|normal|typical/i);
});
