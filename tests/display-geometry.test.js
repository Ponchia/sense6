import assert from 'node:assert/strict';
import test from 'node:test';

import { captureDisplayGeometry, displayGeometryMatches } from '../src/lib/display-geometry.js';

/**
 * Install the browser globals `captureDisplayGeometry` reads, run `body`, and
 * restore whatever was there before so tests stay order-independent.
 * @param {{ innerWidth?: number, innerHeight?: number, devicePixelRatio?: number, visualViewport?: unknown, orientation?: unknown }} windowLike
 * @param {unknown} screenLike
 * @param {() => void} body
 */
function withBrowserGlobals(windowLike, screenLike, body) {
  const scope = /** @type {Record<string, unknown>} */ (globalThis);
  const hadWindow = 'window' in scope;
  const hadScreen = 'screen' in scope;
  const previousWindow = scope.window;
  const previousScreen = scope.screen;
  scope.window = windowLike;
  scope.screen = screenLike;
  try {
    body();
  } finally {
    if (hadWindow) scope.window = previousWindow;
    else delete scope.window;
    if (hadScreen) scope.screen = previousScreen;
    else delete scope.screen;
  }
}

const BASE = Object.freeze({
  width: 1280,
  height: 900,
  dpr: 2,
  scale: 1,
  orientation: 'landscape-primary',
});

test('capture reads viewport, pixel ratio, visual-viewport scale, and orientation', () => {
  withBrowserGlobals(
    {
      innerWidth: 1280,
      innerHeight: 900,
      devicePixelRatio: 2.5,
      visualViewport: { scale: 1.25 },
    },
    { orientation: { type: 'portrait-primary' } },
    () => {
      assert.deepEqual(captureDisplayGeometry(), {
        width: 1280,
        height: 900,
        dpr: 2.5,
        scale: 1.25,
        orientation: 'portrait-primary',
      });
    },
  );
});

test('capture falls back to window.orientation and a unit scale when the modern APIs are absent', () => {
  withBrowserGlobals({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, orientation: 90 }, {}, () => {
    assert.deepEqual(captureDisplayGeometry(), {
      width: 390,
      height: 844,
      dpr: 3,
      scale: 1,
      orientation: '90',
    });
  });
});

test('capture reports a zero orientation rather than an empty string when nothing is exposed', () => {
  withBrowserGlobals({ innerWidth: 800, innerHeight: 600, devicePixelRatio: 1 }, {}, () => {
    assert.equal(captureDisplayGeometry().orientation, '0');
    assert.equal(captureDisplayGeometry().scale, 1);
  });
});

test('a missing left checkpoint never matches', () => {
  assert.equal(displayGeometryMatches(null, BASE), false);
  assert.equal(displayGeometryMatches(undefined, BASE), false);
  assert.equal(displayGeometryMatches(BASE, BASE), true);
});

test('width tolerance accepts 2 css pixels of browser noise and rejects 3', () => {
  // The boundary is inclusive: `<= 2`. Both signs of the difference must behave
  // identically, which a `<`/`<=` or a sign error would break.
  assert.equal(displayGeometryMatches({ ...BASE, width: 1282 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, width: 1278 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, width: 1283 }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, width: 1277 }, BASE), false);
});

test('height tolerance absorbs a 20 pixel mobile toolbar and rejects 21', () => {
  assert.equal(displayGeometryMatches({ ...BASE, height: 920 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, height: 880 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, height: 921 }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, height: 879 }, BASE), false);
});

test('device pixel ratio and page zoom use a hundredth tolerance', () => {
  // 0.01 is not exactly representable, so `Math.abs(2.01 - 2) < 0.01` is true.
  // Assert either side of the boundary rather than on it.
  assert.equal(displayGeometryMatches({ ...BASE, dpr: 2.009 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, dpr: 1.991 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, dpr: 2.02 }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, dpr: 1.98 }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, dpr: 2.5 }, BASE), false);

  assert.equal(displayGeometryMatches({ ...BASE, scale: 1.009 }, BASE), true);
  assert.equal(displayGeometryMatches({ ...BASE, scale: 1.02 }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, scale: 1.5 }, BASE), false);
});

test('orientation is compared exactly, with no tolerance', () => {
  assert.equal(displayGeometryMatches({ ...BASE, orientation: 'landscape-secondary' }, BASE), false);
  assert.equal(displayGeometryMatches({ ...BASE, orientation: '0' }, BASE), false);
});

test('every checked field can independently invalidate a calibration', () => {
  // Guards against an `&&` chain collapsing into `||`: each single-field
  // deviation on its own must produce false.
  const deviations = [
    { width: 1400 },
    { height: 400 },
    { dpr: 1 },
    { scale: 2 },
    { orientation: 'portrait-primary' },
  ];
  for (const deviation of deviations) {
    assert.equal(
      displayGeometryMatches({ ...BASE, ...deviation }, BASE),
      false,
      `${Object.keys(deviation)[0]} alone did not invalidate the checkpoint`,
    );
  }
});

test('the match result is a boolean, never a truthy checkpoint object', () => {
  assert.strictEqual(displayGeometryMatches(BASE, BASE), true);
  assert.strictEqual(displayGeometryMatches(null, BASE), false);
});
