/*
 * Pseudoisochromatic ("Ishihara-style") plate colour logic.
 *
 * The trick of a colour-vision plate is that the figure and the background
 * differ ONLY along a direction that a specific cone type carries. Someone
 * missing (or weak in) that cone cannot separate figure from background, so
 * the number fades; a typical trichromat sees a clear hue difference.
 *
 * We get that direction physiologically rather than by eyeballing hues:
 * convert linear sRGB to LMS cone responses, and the linear-sRGB colour that
 * changes ONLY the L cone is exactly what a protan cannot see (only M -> deutan,
 * only S -> tritan). That colour is the corresponding column of the LMS->RGB
 * matrix. Offsetting the figure from the background along that vector yields a
 * pair that collapses for the target deficiency but stays distinct for typical
 * vision. This is a screen approximation, not a calibrated clinical test.
 */

// Linear sRGB -> LMS (Smith–Pokorny fundamentals, the matrix used across the
// CVD-simulation literature) and its inverse.
const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
];
const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
];

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(value) {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * clamp01(value) ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(v) * 255);
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((component) => component / length);
}

// The confusion direction for each deficiency is the linear-sRGB colour that
// drives a single cone: column 0/1/2 of LMS->RGB (protan/deutan/tritan).
export const CONFUSION_DIRECTIONS = {
  protan: normalize(LMS_TO_RGB.map((row) => row[0])),
  deutan: normalize(LMS_TO_RGB.map((row) => row[1])),
  tritan: normalize(LMS_TO_RGB.map((row) => row[2])),
  // A luminance direction — everyone can see this, used for control plates that
  // verify the screen and that the person is engaging with the task.
  mono: normalize([1, 1, 1]),
};

export function lmsOf(linearRgb) {
  return RGB_TO_LMS.map((row) => row[0] * linearRgb[0] + row[1] * linearRgb[1] + row[2] * linearRgb[2]);
}

/**
 * Build a figure/background colour pair for a plate. The figure sits at
 * background ± strength along the deficiency's confusion direction, so it is
 * invisible along that axis to the targeted deficiency but visible to typical
 * vision. Colours are returned as 0–255 sRGB triples.
 */
export function makePlatePair(backgroundLinear, type, strength) {
  const direction = CONFUSION_DIRECTIONS[type] ?? CONFUSION_DIRECTIONS.deutan;
  const figureLinear = backgroundLinear.map((channel, index) =>
    clamp01(channel + direction[index] * strength),
  );
  return {
    background: backgroundLinear.map(linearToSrgb),
    figure: figureLinear.map(linearToSrgb),
    backgroundLinear,
    figureLinear,
  };
}

/**
 * Camouflage a base colour per dot: jitter luminance (so the figure has no
 * consistent brightness edge) with the SAME distribution used for both figure
 * and background dots. Returns an sRGB triple.
 */
export function jitterDotColor(baseLinear, random, luminanceJitter = 0.16) {
  const scale = 1 + (random() - 0.5) * 2 * luminanceJitter;
  return baseLinear.map((channel) => linearToSrgb(channel * scale));
}

export function rgbCss(channels) {
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

/** Perceptual-ish sRGB distance, weighted for quick "are these distinct" checks. */
export function srgbDistance(a, b) {
  const rMean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

// Plate deck. `type` selects the confusion axis; `strength` sets how far the
// figure sits along it — larger is easier for typical and mildly-deficient
// vision, smaller isolates finer discrimination. Backgrounds are mid, chromatic
// linear-sRGB colours chosen to keep both figure and background inside gamut.
export const PLATES = [
  {
    id: 'control-12',
    axis: 'control',
    type: 'mono',
    digit: '12',
    strength: 0.36,
    background: [0.3, 0.28, 0.11],
  },
  {
    id: 'rg-8',
    axis: 'red-green',
    type: 'deutan',
    digit: '8',
    strength: 0.26,
    background: [0.34, 0.31, 0.13],
  },
  {
    id: 'rg-3',
    axis: 'red-green',
    type: 'protan',
    digit: '3',
    strength: 0.24,
    background: [0.46, 0.34, 0.24],
  },
  {
    id: 'rg-29',
    axis: 'red-green',
    type: 'deutan',
    digit: '29',
    strength: 0.19,
    background: [0.4, 0.3, 0.18],
  },
  {
    id: 'rg-5',
    axis: 'red-green',
    type: 'protan',
    digit: '5',
    strength: 0.16,
    background: [0.36, 0.32, 0.16],
  },
  {
    id: 'rg-74',
    axis: 'red-green',
    type: 'deutan',
    digit: '74',
    strength: 0.17,
    background: [0.48, 0.36, 0.26],
  },
  {
    id: 'rg-6',
    axis: 'red-green',
    type: 'protan',
    digit: '6',
    strength: 0.21,
    background: [0.33, 0.3, 0.14],
  },
  {
    id: 'by-45',
    axis: 'blue-yellow',
    type: 'tritan',
    digit: '45',
    strength: 0.26,
    background: [0.36, 0.34, 0.2],
  },
  {
    id: 'by-2',
    axis: 'blue-yellow',
    type: 'tritan',
    digit: '2',
    strength: 0.2,
    background: [0.34, 0.33, 0.22],
  },
  {
    id: 'by-97',
    axis: 'blue-yellow',
    type: 'tritan',
    digit: '97',
    strength: 0.22,
    background: [0.38, 0.35, 0.19],
  },
];

/**
 * Turn a list of {plate, answer} into an honest, non-diagnostic summary.
 * Answers are strings; an empty string means "no number seen".
 */
export function classifyResults(responses) {
  const byAxis = { control: [], 'red-green': [], 'blue-yellow': [] };
  for (const response of responses) {
    const plate = PLATES.find((entry) => entry.id === response.plateId);
    if (!plate) continue;
    byAxis[plate.axis].push(response.answer.trim() === plate.digit);
  }

  const rate = (list) => (list.length === 0 ? null : list.filter(Boolean).length / list.length);
  const controlOk = byAxis.control.every(Boolean) && byAxis.control.length > 0;
  const redGreen = rate(byAxis['red-green']) ?? 1;
  const blueYellow = rate(byAxis['blue-yellow']) ?? 1;

  let category;
  let title;
  let detail;
  if (!controlOk) {
    category = 'inconclusive';
    title = 'Inconclusive — check the screen';
    detail =
      'A plate that everyone should read was missed, so the run cannot be scored. Turn off any colour filters and try again in even light.';
  } else if (redGreen >= 0.8 && blueYellow >= 0.8) {
    category = 'typical';
    title = 'No colour-vision deficiency detected';
    detail = 'You read the plates on both the red–green and blue–yellow axes on this screen.';
  } else if (redGreen < 0.8 && blueYellow >= 0.6) {
    category = 'red-green';
    title = 'Red–green pattern suggested';
    detail =
      'Several red–green plates were missed while blue–yellow plates read cleanly — the pattern seen with protan or deutan (the common) deficiencies. A screen test cannot tell protan from deutan.';
  } else if (blueYellow < 0.6 && redGreen >= 0.8) {
    category = 'blue-yellow';
    title = 'Blue–yellow pattern suggested';
    detail =
      'Blue–yellow plates were missed while red–green plates read cleanly — the rarer tritan pattern. Blue–yellow plates are also the most sensitive to screen calibration.';
  } else {
    category = 'general';
    title = 'Mixed pattern — retest carefully';
    detail =
      'Plates on more than one axis were missed. That can mean a broad deficiency, but it more often means screen filters, low brightness, or glare. Re-run with colour filters off before reading much into it.';
  }

  return {
    controlOk,
    redGreenScore: Math.round(redGreen * 100),
    blueYellowScore: Math.round(blueYellow * 100),
    category,
    title,
    detail,
  };
}
