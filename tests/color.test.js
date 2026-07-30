import assert from 'node:assert/strict';
import test from 'node:test';

import {
  circularHueDistance,
  DELTA_EOK_DISPLAY_SCALE,
  deltaEok,
  deltaEokSpec,
  oklchToSrgb,
  toRgbCss,
} from '../src/lib/color.js';

test('OKLCH conversion stays in displayable sRGB across the hue circle', () => {
  for (let hue = 0; hue < 360; hue += 3) {
    const { channels, mappedChroma } = oklchToSrgb(0.7, 0.22, hue);
    assert.equal(channels.length, 3);
    assert.ok(channels.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255));
    assert.ok(mappedChroma >= 0 && mappedChroma <= 0.22);
  }
});

test('CSS output uses modern space-separated rgb syntax', () => {
  assert.match(toRgbCss(0.7, 0.1, 120), /^rgb\(\d+ \d+ \d+\)$/);
});

test('ΔEOK is symmetric, zero for the same color, and grows with hue separation', () => {
  const base = { l: 0.67, c: 0.105, h: 20 };
  const near = { ...base, h: 24 };
  const far = { ...base, h: 42 };

  assert.equal(deltaEok(base, base), 0);
  assert.equal(deltaEok(base, near), deltaEok(near, base));
  assert.ok(deltaEok(base, far) > deltaEok(base, near));
});

/*
 * The page cites W3C CSS Color 4 as its method source and then shows a value
 * scaled by 100, so the two numbers must stay explicitly distinguishable in
 * code. A reader who compares a displayed 0.975 against the spec finds 0.00975.
 */
test('the displayed ΔEOK is a scaled value, not the value CSS Color 4 defines', () => {
  const base = { l: 0.67, c: 0.105, h: 20 };
  const target = { ...base, h: 24 };

  const spec = deltaEokSpec(base, target);
  assert.ok(spec > 0.001 && spec < 0.05, `spec ΔEOK should be a small number, got ${spec}`);
  assert.equal(deltaEok(base, target), spec * DELTA_EOK_DISPLAY_SCALE);
  assert.equal(DELTA_EOK_DISPLAY_SCALE, 100);
  assert.equal(deltaEokSpec(base, base), 0);
});

test('circular hue distance crosses the 360-degree seam correctly', () => {
  assert.equal(circularHueDistance(358, 2), 4);
  assert.equal(circularHueDistance(30, 210), 180);
  assert.equal(circularHueDistance(0, 200), 160);
  assert.equal(circularHueDistance(200, 0), 160);
  assert.equal(circularHueDistance(-20, 20), 40);
});

test('the staircase floor still renders reference and target as distinct sRGB', () => {
  // Threshold stimuli are flat fills at l=0.67 c=0.105; if the minimum level
  // ever quantized both colors to the same 8-bit value the trial would be
  // unanswerable while still being scored.
  const floor = 1.2;
  for (let hue = 0; hue < 360; hue += 1) {
    for (const direction of [1, -1]) {
      const target = (hue + direction * floor + 360) % 360;
      assert.notEqual(
        toRgbCss(0.67, 0.105, hue),
        toRgbCss(0.67, 0.105, target),
        `hue ${hue}, direction ${direction}`,
      );
    }
  }
});
