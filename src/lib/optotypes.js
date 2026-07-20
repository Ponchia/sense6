/**
 * @typedef {object} LandoltRingOptions
 * @property {number} diameterCssPx
 * @property {number} orientationDegrees
 * @property {string} [target]
 * @property {string} [background]
 * @property {number} [boxCssPx]
 * @property {number} [devicePixelRatio]
 * @property {number} [supersample]
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {LandoltRingOptions} options
 */
export function drawLandoltRing(
  canvas,
  {
    diameterCssPx,
    orientationDegrees,
    target = 'rgb(18 18 18)',
    background = 'rgb(244 244 242)',
    boxCssPx = 320,
    devicePixelRatio = window.devicePixelRatio || 1,
    supersample = 3,
  },
) {
  const renderScale = Math.max(1, devicePixelRatio) * supersample;
  const backing = Math.max(1, Math.round(boxCssPx * renderScale));
  canvas.width = backing;
  canvas.height = backing;
  setSquareCanvasSize(canvas, boxCssPx);
  const context = requireCanvasContext(canvas);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, backing, backing);

  const diameter = diameterCssPx * renderScale;
  const radius = diameter / 2;
  const unit = diameter / 5;
  const center = backing / 2;
  context.save();
  context.translate(center, center);
  context.fillStyle = target;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = background;
  context.beginPath();
  context.arc(0, 0, radius - unit, 0, Math.PI * 2);
  context.fill();
  context.rotate(((orientationDegrees - 90) * Math.PI) / 180);
  context.fillRect(-unit / 2, -unit / 2, radius + unit, unit);
  context.restore();
  return { backing, diameter, unit };
}

/** @param {HTMLCanvasElement} canvas @param {number} boxCssPx */
export function setSquareCanvasSize(canvas, boxCssPx) {
  if (!(boxCssPx > 0)) throw new RangeError('Canvas size must be positive');
  const size = `${boxCssPx}px`;
  canvas.style.inlineSize = size;
  canvas.style.blockSize = size;
  canvas.style.maxInlineSize = 'none';
  canvas.style.maxBlockSize = 'none';
  canvas.style.aspectRatio = '1 / 1';
}

/** @param {HTMLCanvasElement} canvas */
function requireCanvasContext(canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('A two-dimensional canvas context is required');
  return context;
}
