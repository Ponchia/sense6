import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONFUSION_DIRECTIONS,
  classifyResults,
  lmsOf,
  makePlatePair,
  PLATES,
  srgbDistance,
} from '../src/lib/daltonism.js';

test('confusion directions are unit vectors', () => {
  for (const direction of Object.values(CONFUSION_DIRECTIONS)) {
    assert.ok(Math.abs(Math.hypot(...direction) - 1) < 1e-9);
  }
});

test('each confusion direction drives only its own cone', () => {
  const cone = { protan: 0, deutan: 1, tritan: 2 };
  for (const [type, index] of Object.entries(cone)) {
    const lms = lmsOf(CONFUSION_DIRECTIONS[type]);
    const others = lms.filter((_, i) => i !== index).map(Math.abs);
    // The driven cone response dominates the other two by a wide margin.
    assert.ok(Math.abs(lms[index]) > 5 * Math.max(...others), `${type} leaks into other cones`);
  }
});

test('plate pairs collapse for the target cone but stay visible to typical vision', () => {
  const coneOf = { protan: 0, deutan: 1, tritan: 2 };
  for (const plate of PLATES) {
    if (plate.type === 'mono') continue;
    const pair = makePlatePair(plate.background, plate.type, plate.strength);

    // Figure stayed in gamut, so the confusion-axis property is exact.
    assert.ok(
      pair.figureLinear.every((c) => c > 0 && c < 1),
      `${plate.id} figure clipped out of gamut`,
    );

    const bgLms = lmsOf(plate.background);
    const figLms = lmsOf(pair.figureLinear);
    const driven = coneOf[plate.type];
    for (let cone = 0; cone < 3; cone += 1) {
      if (cone === driven) {
        assert.ok(Math.abs(figLms[cone] - bgLms[cone]) > 0.01, `${plate.id} did not shift its cone`);
      } else {
        assert.ok(Math.abs(figLms[cone] - bgLms[cone]) < 1e-6, `${plate.id} leaked into cone ${cone}`);
      }
    }

    // Typical vision sees a clear difference.
    assert.ok(srgbDistance(pair.background, pair.figure) > 40, `${plate.id} too subtle for typical vision`);
  }
});

test('classify flags red-green when those plates are missed', () => {
  const responses = PLATES.map((plate) => ({
    plateId: plate.id,
    answer: plate.axis === 'red-green' ? '' : plate.digit,
  }));
  const result = classifyResults(responses);
  assert.equal(result.category, 'red-green');
  assert.ok(result.controlOk);
  assert.ok(result.redGreenScore < 80);
});

test('classify reports typical vision for a perfect run', () => {
  const responses = PLATES.map((plate) => ({ plateId: plate.id, answer: plate.digit }));
  const result = classifyResults(responses);
  assert.equal(result.category, 'typical');
  assert.equal(result.redGreenScore, 100);
  assert.equal(result.blueYellowScore, 100);
});

test('classify is inconclusive when the control plate is missed', () => {
  const responses = PLATES.map((plate) => ({
    plateId: plate.id,
    answer: plate.axis === 'control' ? '0' : plate.digit,
  }));
  assert.equal(classifyResults(responses).category, 'inconclusive');
});
