/** @typedef {{ width: number, height: number, dpr: number, scale: number, orientation: string }} DisplayGeometry */

/** Capture the browser geometry fields that invalidate physical display calibration. @returns {DisplayGeometry} */
export function captureDisplayGeometry() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    scale: window.visualViewport?.scale ?? 1,
    orientation: screen.orientation?.type ?? `${window.orientation ?? 0}`,
  };
}

/** Compare two display checkpoints using the established browser-noise tolerances. @param {DisplayGeometry | null | undefined} left @param {DisplayGeometry} right @returns {boolean} */
export function displayGeometryMatches(left, right) {
  return Boolean(
    left &&
      Math.abs(left.width - right.width) <= 2 &&
      Math.abs(left.height - right.height) <= 20 &&
      Math.abs(left.dpr - right.dpr) < 0.01 &&
      Math.abs(left.scale - right.scale) < 0.01 &&
      left.orientation === right.orientation,
  );
}
