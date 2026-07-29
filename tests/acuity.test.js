import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACUITY_DIRECTIONS,
  arcminToCssPixels,
  CARD_WIDTH_MM,
  contrastGrays,
  createAcuityTrack,
  createOrientationSchedule,
  cssPixelsToArcmin,
  DEFAULT_ACUITY_CONFIG,
  estimateViewingDistance,
  landoltDiameterCssPixels,
  measurableGapBounds,
  nextAcuityTrial,
  percentContrastCost,
  pixelsPerMillimetre,
  recordAcuityResponse,
  summarizeAcuity,
  summarizeBlindSpot,
  summarizeContrastCost,
} from '../src/lib/acuity.js';
import { drawLandoltRing, setSquareCanvasSize } from '../src/lib/optotypes.js';
import { seededRandom } from '../src/lib/random.js';

test('card and blind-spot calibration recover physical scale and distance', () => {
  const cssPixelsPerMm = pixelsPerMillimetre(342.4);
  assert.equal(cssPixelsPerMm, 4);
  assert.equal(CARD_WIDTH_MM, 85.6);
  const expectedDistance = 500;
  const offsetCssPx = Math.tan((13.5 * Math.PI) / 180) * expectedDistance * cssPixelsPerMm;
  assert.ok(Math.abs(estimateViewingDistance(offsetCssPx, cssPixelsPerMm) - expectedDistance) < 1e-9);
  assert.deepEqual(summarizeBlindSpot([490, 500, 510]), {
    coherent: true,
    distanceMm: 500,
    spreadPercent: 4,
    readings: [490, 500, 510],
  });
  assert.equal(summarizeBlindSpot([360, 500, 700]).coherent, false);
});

test('angular gap conversion round-trips and preserves five-unit Landolt geometry', () => {
  const gapCssPx = arcminToCssPixels(2, 500, 4);
  assert.ok(Math.abs(cssPixelsToArcmin(gapCssPx, 500, 4) - 2) < 1e-9);
  assert.ok(Math.abs(landoltDiameterCssPixels(2, 500, 4) - gapCssPx * 5) < 1e-9);
  const bounds = measurableGapBounds({
    distanceMm: 500,
    cssPixelsPerMm: 4,
    devicePixelRatio: 2,
    maxDiameterCssPx: 300,
  });
  assert.ok(bounds.minGapArcmin >= 0.35);
  assert.ok(bounds.maxGapArcmin > bounds.minGapArcmin);
});

test('Bayesian tracks move toward a simulated threshold and keep controls out of the posterior', () => {
  const random = seededRandom('acuity-threshold');
  const track = createAcuityTrack({ trials: 18, controlAt: [6], random });
  const simulatedThreshold = 2.4;
  while (!track.complete) {
    const trial = nextAcuityTrial(track);
    const correct = trial.control || trial.gapArcmin >= simulatedThreshold;
    recordAcuityResponse(track, trial, correct ? trial.orientation : 'wrong');
  }
  const summary = summarizeAcuity(track);
  assert.equal(summary.trials, 18);
  assert.equal(summary.controls, 1);
  assert.equal(summary.controlCorrect, 1);
  assert.ok(summary.thresholdArcmin > 1.2 && summary.thresholdArcmin < 4.8);
  assert.ok(summary.lowerArcmin < summary.thresholdArcmin);
  assert.ok(summary.upperArcmin > summary.thresholdArcmin);
});

test('acuity tracks reject invalid sizes and corrupted schedules explicitly', () => {
  assert.throws(() => createAcuityTrack({ trials: 0 }), /trials must be positive/i);

  const missingOrientation = createAcuityTrack({ trials: 1 });
  missingOrientation.orientations = [];
  assert.throws(() => nextAcuityTrial(missingOrientation), /orientation schedule is empty/i);

  const missingPosterior = createAcuityTrack({ trials: 1 });
  missingPosterior.posterior = [];
  assert.throws(() => summarizeAcuity(missingPosterior), /missing acuity posterior/i);
});

test('orientation schedules are balanced and deterministic', () => {
  const first = createOrientationSchedule(18, seededRandom('directions'));
  const second = createOrientationSchedule(18, seededRandom('directions'));
  assert.deepEqual(first, second);
  const counts = Object.values(Object.groupBy(first, (direction) => direction)).map(
    (entries) => entries.length,
  );
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test('low-contrast colors and within-run cost remain explicit', () => {
  const colors = contrastGrays(0.1);
  assert.equal(colors.contrast, 0.1);
  assert.ok(colors.targetLinear < colors.backgroundLinear);
  assert.match(colors.target, /^rgb\(/);
  assert.equal(percentContrastCost(2, 3), 50);
  assert.equal(percentContrastCost(null, 3), null);
  assert.deepEqual(
    summarizeContrastCost(
      { thresholdArcmin: 2, atFloor: false, atCeiling: false },
      { thresholdArcmin: 3, atFloor: false, atCeiling: false },
    ),
    { value: 50, bounded: false },
  );
  assert.deepEqual(
    summarizeContrastCost(
      { thresholdArcmin: 2, atFloor: true, atCeiling: false },
      { thresholdArcmin: 3, atFloor: false, atCeiling: false },
    ),
    { value: null, bounded: true },
  );
});

test('canvas sizing defeats independent responsive axis constraints', () => {
  const canvas = {
    style: {
      inlineSize: '',
      blockSize: '',
      maxInlineSize: '78vw',
      maxBlockSize: '42svh',
      aspectRatio: '',
    },
  };
  setSquareCanvasSize(canvas, 237.5);
  assert.deepEqual(canvas.style, {
    inlineSize: '237.5px',
    blockSize: '237.5px',
    maxInlineSize: 'none',
    maxBlockSize: 'none',
    aspectRatio: '1 / 1',
  });
  assert.throws(() => setSquareCanvasSize(canvas, 0), /positive/);
});

test('optotype renderers keep square backing stores and execute complete drawing paths', () => {
  const landolt = fakeCanvas();
  const ring = drawLandoltRing(landolt.canvas, {
    boxCssPx: 100,
    devicePixelRatio: 2,
    diameterCssPx: 25,
    orientationDegrees: 90,
    supersample: 2,
  });
  assert.deepEqual(ring, { backing: 400, diameter: 100, unit: 20 });
  assert.equal(landolt.canvas.width, 400);
  assert.equal(landolt.canvas.height, 400);
  assert.equal(landolt.calls.filter(([name]) => name === 'arc').length, 2);
  assert.ok(landolt.calls.some(([name]) => name === 'fillRect'));
});

test('optotype renderers reject canvases without a two-dimensional context', () => {
  const canvas = {
    getContext: () => null,
    height: 0,
    style: {},
    width: 0,
  };

  assert.throws(
    () =>
      drawLandoltRing(canvas, {
        boxCssPx: 100,
        devicePixelRatio: 1,
        diameterCssPx: 25,
        orientationDegrees: 90,
      }),
    /two-dimensional canvas context/i,
  );
});

function fakeCanvas() {
  const calls = [];
  const context = {};
  for (const name of [
    'arc',
    'beginPath',
    'clip',
    'fill',
    'fillRect',
    'lineTo',
    'moveTo',
    'restore',
    'rotate',
    'save',
    'setTransform',
    'stroke',
    'translate',
  ]) {
    context[name] = (...args) => calls.push([name, ...args]);
  }
  const canvas = {
    getContext: () => context,
    height: 0,
    style: {},
    width: 0,
  };
  return { calls, canvas };
}

// ---------------------------------------------------------------------------
// Ground-truth assertions.
//
// Mutation testing left 54 of the arithmetic and comparison operators in
// acuity.js alive, including the psychometric function itself
// (`guessRate + (1 - guessRate - lapseRate) * logistic`), the credible-interval
// tail, the entropy search, and every calibration guard. The estimator is
// deterministic for a seeded observer, so the tests below pin its output
// instead of bounding it loosely.
// ---------------------------------------------------------------------------

/** Run a full seeded track against a simulated observer with a fixed threshold. */
function simulate(thresholdArcmin, options = {}) {
  const track = createAcuityTrack({
    trials: 18,
    controlAt: [6],
    random: seededRandom('acuity-threshold'),
    ...options,
  });
  const gaps = [];
  while (!track.complete) {
    const trial = nextAcuityTrial(track);
    gaps.push(trial);
    const correct = trial.control || trial.gapArcmin >= thresholdArcmin;
    recordAcuityResponse(track, trial, correct ? trial.orientation : 'wrong');
  }
  return { track, gaps, summary: summarizeAcuity(track) };
}

test('the Bayesian estimator recovers a simulated threshold to the tenth of an arcminute', () => {
  const { summary } = simulate(2.4);

  // Ground truth for the seeded observer. Any change to the psychometric
  // function, the entropy search, the posterior update, or the credible
  // interval moves at least one of these numbers.
  // NOTE: `roundTo(value, 0.1)` is `Math.round(v / 0.1) * 0.1`, which returns
  // 2.3000000000000003 rather than 2.3 — see the report on src/lib/acuity.js
  // rounding. Compare within a tolerance so this test pins the estimator, not
  // the float representation.
  assert.equal(summary.atFloor, false);
  assert.equal(summary.atCeiling, false);
  assert.equal(summary.trials, 18);
  assert.equal(summary.controlCorrect, 1);
  assert.equal(summary.controls, 1);
  assert.equal(summary.uncertaintyRatio, 2.1);
  for (const [field, expected] of [
    ['thresholdArcmin', 2.3],
    ['lowerArcmin', 1.6],
    ['upperArcmin', 3.3],
  ]) {
    assert.ok(
      Math.abs(summary[field] - expected) < 1e-9,
      `${field} was ${summary[field]}, expected ${expected}`,
    );
  }
});

test('the estimator tracks a different simulated observer to a different answer', () => {
  // A second fixed point: an estimator that ignored the responses would report
  // the same prior-driven threshold for both observers.
  const sharp = simulate(0.8).summary;
  const blunt = simulate(8).summary;
  assert.ok(sharp.thresholdArcmin < 2.3, `sharp observer measured ${sharp.thresholdArcmin}`);
  assert.ok(blunt.thresholdArcmin > 2.3, `blunt observer measured ${blunt.thresholdArcmin}`);
  assert.ok(sharp.thresholdArcmin < blunt.thresholdArcmin);
});

test('the opening staircase halves the gap while the first answers are all correct', () => {
  const { gaps } = simulate(2.4);

  // The first stimulus is the configured start; the next two halve it while the
  // observer is perfect; from the fourth the entropy search takes over.
  assert.equal(gaps[0].gapArcmin, 12);
  assert.equal(gaps[1].gapArcmin, 6);
  assert.equal(gaps[2].gapArcmin, 3);
  assert.notEqual(gaps[3].gapArcmin, 1.5, 'the fourth trial is chosen by the entropy search');
  assert.ok(Math.abs(gaps[3].gapArcmin - 1.4570138459605715) < 1e-12);
  assert.ok(Math.abs(gaps[4].gapArcmin - 2.204388912310346) < 1e-12);
});

test('the halving shortcut stops as soon as an answer is wrong', () => {
  const track = createAcuityTrack({ trials: 6, controlAt: [], random: seededRandom('halving') });
  const first = nextAcuityTrial(track);
  assert.equal(first.gapArcmin, 12);
  recordAcuityResponse(track, first, 'wrong');

  const second = nextAcuityTrial(track);
  assert.notEqual(second.gapArcmin, 6, 'a wrong answer must not be followed by a blind halving');
});

test('control trials sit well above the estimate and stay out of the posterior', () => {
  const { track, gaps, summary } = simulate(2.4);
  const control = gaps.find((trial) => trial.control);

  assert.equal(control.gapArcmin, 10, 'the control is at least 10 arcmin');
  assert.equal(track.controls.length, 1);
  assert.equal(track.records.length, 18, 'the control is not one of the 18 scored trials');
  assert.equal(summary.trials, 18);
  assert.equal(summary.controls, 1);
  assert.equal(summary.controlCorrect, 1);
});

test('a track completes only once every scored trial and every control has run', () => {
  const track = createAcuityTrack({ trials: 2, controlAt: [5], random: seededRandom('completion') });
  for (let index = 0; index < 5; index += 1) {
    const trial = nextAcuityTrial(track);
    assert.equal(trial.control, false);
    recordAcuityResponse(track, trial, trial.orientation);
  }
  assert.equal(track.records.length, 5);
  assert.equal(track.complete, false, 'the scheduled control at presentation 5 has not been shown yet');

  const control = nextAcuityTrial(track);
  assert.equal(control.control, true);
  recordAcuityResponse(track, control, control.orientation);
  assert.equal(track.complete, true);
  assert.equal(nextAcuityTrial(track), null, 'a complete track offers no further trials');
});

test('the orientation schedule covers every presentation including the controls and spares', () => {
  const track = createAcuityTrack({ trials: 18, controlAt: [6, 14], random: seededRandom('schedule') });
  assert.equal(track.orientations.length, 24, '18 scored + 2 controls + 4 spare');
  assert.equal(track.grid.length, 104);
  assert.equal(track.grid[0], 0.35);
  assert.ok(Math.abs(track.grid.at(-1) - 40) < 1e-9);
});

test('the direction table is the eight-way Landolt contract', () => {
  assert.deepEqual(
    ACUITY_DIRECTIONS.map(({ id, degrees, key }) => [id, degrees, key]),
    [
      ['up', 0, '8'],
      ['up-right', 45, '9'],
      ['right', 90, '6'],
      ['down-right', 135, '3'],
      ['down', 180, '2'],
      ['down-left', 225, '1'],
      ['left', 270, '4'],
      ['up-left', 315, '7'],
    ],
  );
});

test('the credible interval brackets the threshold on both sides', () => {
  const { track } = simulate(2.4);
  const wide = summarizeAcuity({ ...track, config: { ...track.config, credibleMass: 0.5 } });
  const narrow = summarizeAcuity(track);

  // A wider credible mass must produce a wider interval, never a narrower one,
  // and the upper bound must come from the upper tail rather than the lower.
  assert.ok(wide.upperArcmin < narrow.upperArcmin);
  assert.ok(wide.lowerArcmin > narrow.lowerArcmin);
  assert.ok(narrow.lowerArcmin < narrow.thresholdArcmin);
  assert.ok(narrow.upperArcmin > narrow.thresholdArcmin);
  assert.equal(narrow.uncertaintyRatio, Math.round((3.3 / 1.6) * 10) / 10);
});

test('floor and ceiling flags fire at their exact multiples of the measurable range', () => {
  const build = (lower, upper) => {
    const config = { ...DEFAULT_ACUITY_CONFIG.estimator, minGapArcmin: 1, maxGapArcmin: 100 };
    // A two-point grid with all the mass on one cell makes the quantiles exact.
    return summarizeAcuity({
      config,
      grid: [lower, upper],
      posterior: [0.5, 0.5],
      records: [],
      controls: [],
    });
  };

  // atFloor when the lower bound is at or below minGap * 1.05 = 1.05.
  assert.equal(build(1.05, 50).atFloor, true);
  assert.equal(build(1.06, 50).atFloor, false);
  // atCeiling when the upper bound is at or above maxGap * 0.95 = 95.
  assert.equal(build(2, 95).atCeiling, true);
  assert.equal(build(2, 94.9).atCeiling, false);
});

test('the posterior quantile returns the first grid point that reaches the mass', () => {
  const config = { ...DEFAULT_ACUITY_CONFIG.estimator, minGapArcmin: 1, maxGapArcmin: 100 };
  const track = { config, grid: [2, 4, 8], posterior: [0.25, 0.25, 0.5], records: [], controls: [] };
  const summary = summarizeAcuity(track);

  // Median: cumulative reaches 0.5 exactly at the second cell, so the median is
  // 4 — a strict `>` would skip to 8.
  assert.equal(summary.thresholdArcmin, 4);
  assert.equal(summary.lowerArcmin, 2, 'the 5% tail lands in the first cell');
  assert.equal(summary.upperArcmin, 8, 'the 95% tail lands in the last cell');
});

test('a posterior that never reaches the requested mass falls back to the last grid point', () => {
  const config = { ...DEFAULT_ACUITY_CONFIG.estimator, minGapArcmin: 1, maxGapArcmin: 100 };
  const track = { config, grid: [2, 4, 8], posterior: [0.1, 0.1, 0.1], records: [], controls: [] };
  assert.equal(summarizeAcuity(track).upperArcmin, 8);
});

test('card calibration rejects each non-positive dimension on its own', () => {
  assert.equal(pixelsPerMillimetre(342.4), 4);
  assert.equal(pixelsPerMillimetre(200, 100), 2);
  assert.throws(() => pixelsPerMillimetre(0), /positive/i);
  assert.throws(() => pixelsPerMillimetre(-1), /positive/i);
  assert.throws(() => pixelsPerMillimetre(Number.NaN), /positive/i);
  assert.throws(() => pixelsPerMillimetre(342.4, 0), /positive/i);
  assert.throws(() => pixelsPerMillimetre(342.4, -85.6), /positive/i);
});

test('distance estimation rejects each non-positive input on its own', () => {
  assert.equal(estimateViewingDistance(0, 4), null);
  assert.equal(estimateViewingDistance(-10, 4), null);
  assert.equal(estimateViewingDistance(100, 0), null);
  assert.equal(estimateViewingDistance(100, -4), null);
  assert.ok(estimateViewingDistance(100, 4) > 0);

  // The distance scales linearly with the measured offset.
  const single = estimateViewingDistance(100, 4);
  assert.ok(Math.abs(estimateViewingDistance(200, 4) - 2 * single) < 1e-9);
  assert.ok(Math.abs(estimateViewingDistance(100, 8) - single / 2) < 1e-9);
});

test('angular conversions reject each non-positive input on its own', () => {
  for (const args of [
    [0, 500, 4],
    [-2, 500, 4],
    [2, 0, 4],
    [2, -500, 4],
    [2, 500, 0],
    [2, 500, -4],
  ]) {
    assert.equal(arcminToCssPixels(...args), null, `arcminToCssPixels(${args}) should refuse`);
    assert.equal(cssPixelsToArcmin(...args), null, `cssPixelsToArcmin(${args}) should refuse`);
    assert.equal(landoltDiameterCssPixels(...args), null);
  }
  assert.ok(Math.abs(arcminToCssPixels(2, 500, 4) - 1.1635528674812636) < 1e-12);
  assert.ok(Math.abs(landoltDiameterCssPixels(2, 500, 4) - 5 * 1.1635528674812636) < 1e-12);
});

test('blind-spot calibration needs the full repetition count and a coherent spread', () => {
  // Fewer readings than repetitions is incoherent, with no distance reported.
  assert.deepEqual(summarizeBlindSpot([500, 500]), {
    coherent: false,
    distanceMm: null,
    spreadPercent: null,
    readings: [500, 500],
  });
  // Exactly the repetition count is enough.
  assert.equal(summarizeBlindSpot([500, 500, 500]).coherent, true);

  // Non-finite and non-positive readings are dropped before the count is taken.
  assert.equal(summarizeBlindSpot([500, 500, 500, 0, -1, Number.NaN]).readings.length, 3);
  assert.equal(summarizeBlindSpot([500, 500, 0]).coherent, false, 'a dropped reading breaks the count');

  // The distance is the median of an unsorted list, on both parities.
  assert.equal(summarizeBlindSpot([510, 490, 500]).distanceMm, 500);
  assert.equal(summarizeBlindSpot([520, 480, 500, 500]).distanceMm, 500);
});

test('the coherence window is inclusive at both ends and on the spread', () => {
  const at = (readings, options) => summarizeBlindSpot(readings, options).coherent;
  assert.equal(at([300, 300, 300]), true, 'the 300 mm minimum is inclusive');
  assert.equal(at([299, 299, 299]), false);
  assert.equal(at([1000, 1000, 1000]), true, 'the 1000 mm maximum is inclusive');
  assert.equal(at([1001, 1001, 1001]), false);

  // A spread of exactly 20% of the median is accepted; more is not.
  assert.equal(at([450, 500, 550]), true);
  assert.equal(summarizeBlindSpot([450, 500, 550]).spreadPercent, 20);
  assert.equal(at([440, 500, 560]), false);
  assert.equal(summarizeBlindSpot([440, 500, 560]).spreadPercent, 24);
});

test('measurable bounds are the tighter of the configured and the physical limit', () => {
  const bounds = measurableGapBounds({
    distanceMm: 500,
    cssPixelsPerMm: 4,
    devicePixelRatio: 2,
    maxDiameterCssPx: 300,
  });
  assert.ok(Math.abs(bounds.minGapArcmin - 0.6445775176337654) < 1e-12);
  assert.equal(bounds.maxGapArcmin, 40, 'the configured 40 arcmin ceiling is tighter than the display');

  // A near display makes the physical floor much coarser than the configured
  // floor, because one device pixel subtends a larger angle.
  const near = measurableGapBounds({ distanceMm: 200, cssPixelsPerMm: 4, maxDiameterCssPx: 300 });
  assert.ok(Math.abs(near.minGapArcmin - 3.222887361559574) < 1e-12);
  assert.ok(near.minGapArcmin > DEFAULT_ACUITY_CONFIG.estimator.minGapArcmin);
  assert.equal(near.maxGapArcmin, 40);

  // A far display drops below the configured floor, which then wins.
  const far = measurableGapBounds({ distanceMm: 5000, cssPixelsPerMm: 4, maxDiameterCssPx: 300 });
  assert.equal(far.minGapArcmin, DEFAULT_ACUITY_CONFIG.estimator.minGapArcmin);
  assert.ok(Math.abs(far.maxGapArcmin - 10.313232577435025) < 1e-12);

  // A tiny canvas makes the physical ceiling tighter than the configured one.
  const small = measurableGapBounds({ distanceMm: 500, cssPixelsPerMm: 4, maxDiameterCssPx: 20 });
  assert.ok(Math.abs(small.maxGapArcmin - 6.875491249740074) < 1e-12);
  assert.ok(small.maxGapArcmin < 40);
  assert.ok(small.maxGapArcmin > small.minGapArcmin);

  // A device pixel ratio below one is clamped, so the floor cannot be inflated.
  assert.deepEqual(
    measurableGapBounds({ distanceMm: 500, cssPixelsPerMm: 4, devicePixelRatio: 0.5, maxDiameterCssPx: 300 }),
    measurableGapBounds({ distanceMm: 500, cssPixelsPerMm: 4, devicePixelRatio: 1, maxDiameterCssPx: 300 }),
  );
});

test('an unmeasurable configured range is refused rather than silently inverted', () => {
  assert.throws(() => createAcuityTrack({ minGapArcmin: 10, maxGapArcmin: 10 }), /not measurable/i);
  assert.throws(() => createAcuityTrack({ minGapArcmin: 10, maxGapArcmin: 1 }), /not measurable/i);
  assert.throws(() => createAcuityTrack({ trials: 1.5 }), /positive/i);
  assert.throws(() => createAcuityTrack({ trials: -1 }), /positive/i);
});

test('contrast grays place the target below the background and clamp the request', () => {
  const tenth = contrastGrays(0.1);
  assert.deepEqual(tenth, {
    background: 'rgb(188 188 188)',
    target: 'rgb(171 171 171)',
    backgroundLinear: 0.5,
    targetLinear: (0.5 * 0.9) / 1.1,
    contrast: 0.1,
  });

  assert.equal(contrastGrays(0).targetLinear, 0.5, 'zero contrast means an invisible target');
  assert.equal(contrastGrays(0).target, contrastGrays(0).background);
  assert.equal(contrastGrays(3).contrast, 0.95, 'the request is clamped to 0.95');
  assert.equal(contrastGrays(-1).contrast, 0, 'a negative request is clamped to 0');

  // A very dark target crosses into the linear segment of the sRGB transfer
  // function, where the encoded value is 12.92x rather than the power curve.
  const dark = contrastGrays(0.95, 0.01);
  assert.ok(dark.targetLinear < 0.0031308, `targetLinear was ${dark.targetLinear}`);
  assert.equal(
    dark.target,
    `rgb(${Math.round(12.92 * dark.targetLinear * 255)} ${Math.round(12.92 * dark.targetLinear * 255)} ${Math.round(12.92 * dark.targetLinear * 255)})`,
  );
});

test('the contrast cost keeps its direction and rejects non-positive thresholds', () => {
  assert.equal(percentContrastCost(2, 3), 50, 'a slower low-contrast threshold is a positive cost');
  assert.equal(percentContrastCost(3, 2), -33, 'the reverse is a negative cost');
  assert.equal(percentContrastCost(2, 2), 0);
  assert.equal(percentContrastCost(0, 3), null);
  assert.equal(percentContrastCost(-2, 3), null);
  assert.equal(percentContrastCost(2, 0), null);
  assert.equal(percentContrastCost(2, -3), null);
});

test('a bounded threshold on either side suppresses the contrast cost', () => {
  const clean = { thresholdArcmin: 2, atFloor: false, atCeiling: false };
  const other = { thresholdArcmin: 3, atFloor: false, atCeiling: false };
  assert.deepEqual(summarizeContrastCost(clean, other), { value: 50, bounded: false });

  // Each of the four flags must independently suppress the value.
  for (const [side, flag] of [
    ['high', 'atFloor'],
    ['high', 'atCeiling'],
    ['low', 'atFloor'],
    ['low', 'atCeiling'],
  ]) {
    const high = side === 'high' ? { ...clean, [flag]: true } : clean;
    const low = side === 'low' ? { ...other, [flag]: true } : other;
    assert.deepEqual(
      summarizeContrastCost(high, low),
      { value: null, bounded: true },
      `${side}.${flag} did not suppress the contrast cost`,
    );
  }

  // A missing summary on either side is reported as unbounded and unavailable.
  assert.deepEqual(summarizeContrastCost(null, other), { value: null, bounded: false });
  assert.deepEqual(summarizeContrastCost(clean, null), { value: null, bounded: false });
  assert.deepEqual(summarizeContrastCost(null, null), { value: null, bounded: false });
});

test('orientation schedules cycle the full direction set before repeating', () => {
  const schedule = createOrientationSchedule(8, seededRandom('cycle'));
  assert.deepEqual([...schedule].sort(), ACUITY_DIRECTIONS.map(({ id }) => id).sort());

  const short = createOrientationSchedule(3, seededRandom('cycle'));
  assert.deepEqual(short, schedule.slice(0, 3), 'a short schedule is a prefix of the full cycle');

  const long = createOrientationSchedule(20, seededRandom('cycle'));
  assert.equal(long.length, 20);
  assert.deepEqual(long.slice(0, 8), schedule, 'the first cycle is reused before reshuffling');
});
