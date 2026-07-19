import assert from 'node:assert/strict';
import test from 'node:test';
import {
  arcminToCssPixels,
  CARD_WIDTH_MM,
  contrastGrays,
  createAcuityTrack,
  createMeridianSchedule,
  createOrientationSchedule,
  cssPixelsToArcmin,
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
  summarizeMeridians,
} from '../src/lib/acuity.js';
import { setSquareCanvasSize } from '../src/lib/optotypes.js';
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

test('orientation schedules are balanced and deterministic', () => {
  const first = createOrientationSchedule(18, seededRandom('directions'));
  const second = createOrientationSchedule(18, seededRandom('directions'));
  assert.deepEqual(first, second);
  const counts = Object.values(Object.groupBy(first, (direction) => direction)).map(
    (entries) => entries.length,
  );
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test('meridian schedules cover every pair at both scales and require replication', () => {
  const schedule = createMeridianSchedule({ random: seededRandom('meridians') });
  assert.equal(schedule.length, 30);
  assert.equal(schedule.filter((trial) => trial.block === 0).length, 15);
  assert.equal(schedule.filter((trial) => trial.block === 1).length, 15);
  const records = schedule.map((trial) => {
    const leftPreferred = trial.leftAngle === 60;
    const rightPreferred = trial.rightAngle === 60;
    return {
      ...trial,
      choice: leftPreferred ? 'left' : rightPreferred ? 'right' : 'equal',
    };
  });
  const summary = summarizeMeridians(records);
  assert.equal(summary.stable, true);
  assert.equal(summary.preferredAngle, 60);
  assert.equal(summary.comparisons, 30);
  const inconsistent = summarizeMeridians(
    schedule.map((trial) => ({
      ...trial,
      choice:
        trial.block === 0
          ? trial.leftAngle === 30
            ? 'left'
            : trial.rightAngle === 30
              ? 'right'
              : 'equal'
          : trial.leftAngle === 120
            ? 'left'
            : trial.rightAngle === 120
              ? 'right'
              : 'equal',
    })),
  );
  assert.equal(inconsistent.stable, false);
  assert.equal(inconsistent.preferredAngle, null);
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
