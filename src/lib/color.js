const TAU = Math.PI * 2;

/** @typedef {{ l: number, c: number, h: number }} OklchColor */

/** @param {number} value @param {number} minimum @param {number} maximum */
function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** @param {number} value */
function linearToSrgb(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

/** @param {number} lightness @param {number} chroma @param {number} hue @returns {[number, number, number]} */
export function oklchToOklab(lightness, chroma, hue) {
  const radians = ((hue % 360) / 360) * TAU;
  return [lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)];
}

/** @param {number} lightness @param {number} a @param {number} b @returns {[number, number, number]} */
export function oklabToLinearSrgb(lightness, a, b) {
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** @param {readonly number[]} channels */
export function isInSrgbGamut(channels) {
  return channels.every((channel) => channel >= 0 && channel <= 1);
}

/**
 * Convert OKLCH into display-safe sRGB. Chroma is reduced, rather than clipping
 * channels independently, so hue and lightness remain stable at the gamut edge.
 *
 * @param {number} lightness
 * @param {number} chroma
 * @param {number} hue
 */
export function oklchToSrgb(lightness, chroma, hue) {
  let mappedChroma = Math.max(0, chroma);
  let linear = oklabToLinearSrgb(...oklchToOklab(lightness, mappedChroma, hue));

  if (!isInSrgbGamut(linear)) {
    let low = 0;
    let high = mappedChroma;

    for (let iteration = 0; iteration < 24; iteration += 1) {
      mappedChroma = (low + high) / 2;
      linear = oklabToLinearSrgb(...oklchToOklab(lightness, mappedChroma, hue));

      if (isInSrgbGamut(linear)) low = mappedChroma;
      else high = mappedChroma;
    }
  }

  const channels = linear.map((channel) => Math.round(clamp(linearToSrgb(channel)) * 255));
  return { channels, mappedChroma };
}

/** @param {number} lightness @param {number} chroma @param {number} hue */
export function toRgbCss(lightness, chroma, hue) {
  const { channels } = oklchToSrgb(lightness, chroma, hue);
  return `rgb(${channels.join(' ')})`;
}

/**
 * Return the W3C ΔEOK distance, expressed on a legible 0–100 scale.
 *
 * @param {OklchColor} first
 * @param {OklchColor} second
 */
export function deltaEok(first, second) {
  const [l1, a1, b1] = oklchToOklab(first.l, first.c, first.h);
  const [l2, a2, b2] = oklchToOklab(second.l, second.c, second.h);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}

/** @param {number} first @param {number} second */
export function circularHueDistance(first, second) {
  const distance = Math.abs(first - second) % 360;
  return distance > 180 ? 360 - distance : distance;
}
