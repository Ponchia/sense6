import assert from 'node:assert/strict';
import test from 'node:test';

import { circularHueDistance, deltaEok, oklchToSrgb, toRgbCss } from '../src/lib/color.js';

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

test('circular hue distance crosses the 360-degree seam correctly', () => {
  assert.equal(circularHueDistance(358, 2), 4);
  assert.equal(circularHueDistance(30, 210), 180);
});
