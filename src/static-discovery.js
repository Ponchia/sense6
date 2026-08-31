/** @typedef {{ eyebrow: string, heading: string, paragraphs: readonly string[] }} SearchIntentCopy */

/**
 * Crawlable question-led copy that complements, but does not ship inside, the
 * interactive experiment registry.
 * @type {Readonly<Partial<Record<import('./exams/contracts.js').ExamId, Readonly<SearchIntentCopy>>>>}
 */
export const STATIC_SEARCH_INTENT_COPY = Object.freeze({
  tetracromia: Object.freeze({
    eyebrow: 'The fourth-cone question',
    heading: 'An RGB screen cannot test tetrachromacy.',
    paragraphs: Object.freeze([
      'Consumer displays mix three primaries. Confirming functional tetrachromacy requires spectral stimuli that can separate a fourth response, specialized hardware, genetics, and controlled conditions. Tetracromia measures ordinary on-screen color discrimination instead—and says exactly that.',
    ]),
  }),
});

/**
 * Original English explainers for the questions people actually bring to each
 * experiment. They are intentionally not copied into eleven languages without
 * linguistic review: translated experiment pages keep their existing localized
 * method and boundary copy, while the English canonical pages carry the deeper
 * editorial layer used for organic discovery.
 * @type {Readonly<Record<import('./exams/contracts.js').ExamId, Readonly<SearchIntentCopy>>>}
 */
export const ENGLISH_EXPLAINER_COPY = Object.freeze({
  tetracromia: Object.freeze({
    eyebrow: 'What the colour result means',
    heading: 'A colour-discrimination result belongs to this display and this run.',
    paragraphs: Object.freeze([
      'Tetracromia keeps tile matching, noisy colour fields, and hue ordering separate because they ask different questions. A smaller visible difference in one task does not become a universal colour score, and the three observations are not combined into a tetrachromacy claim.',
      'For a useful comparison, repeat the same task on the same screen with the same brightness, colour settings, lighting, viewing distance, and browser zoom. A changed result can reflect the setup, attention, practice, or ordinary run-to-run variation—not a new cone type.',
    ]),
  }),
  'color-blindness': Object.freeze({
    eyebrow: 'Online colour discrimination',
    heading: 'Measure colour discrimination on this display.',
    paragraphs: Object.freeze([
      'Daltonia is an online colour-discrimination experiment built around a gap in luminance-noise dots. Three independent adaptive tracks estimate the smallest display-relative shift followed along three colour directions, so the result describes what happened on this screen rather than assigning a colour-vision label.',
      'That makes repeated runs useful when the display, colour profile, brightness, lighting, viewing distance, and browser stay fixed. It does not replace an Ishihara plate, anomaloscope, CAD test, Cambridge Colour Test, or assessment by an eye-care professional.',
    ]),
  }),
  riflessi: Object.freeze({
    eyebrow: 'Reaction time and choice response',
    heading: 'Measure reaction time without hiding the device.',
    paragraphs: Object.freeze([
      'Riflessi reports simple visual response time, the extra time required to choose between alternatives, and consistency during a sustained run as separate observations. Keeping those tasks apart shows whether a change appeared in the first response, the decision step, or later in the session.',
      'A browser reaction-time result includes the screen, input device, operating system, browser scheduling, posture, attention, and practice. Compare runs on the same setup; do not treat the number as a population percentile, neurological assessment, concussion check, or driving-fitness result.',
    ]),
  }),
  udito: Object.freeze({
    eyebrow: 'Hearing range and pitch discrimination',
    heading: 'Explore hearing range and pitch discrimination on this setup.',
    paragraphs: Object.freeze([
      'Udito separates confidence in the headphone setup, an upper audibility boundary, and pitch discrimination near two reference frequencies. The audibility track asks when a digitally generated tone stops being reported, while the pitch tasks ask which of two tones sounds higher.',
      'Headphones, device volume, audio processing, ambient noise, and the listener all shape the result. Because a browser cannot measure sound pressure at the ear, Udito reports no dB HL hearing threshold, hearing age, diagnosis, or comparison with a calibrated audiogram.',
    ]),
  }),
  acutezza: Object.freeze({
    eyebrow: 'Visual acuity and contrast',
    heading: 'Explore screen-calibrated visual acuity and contrast sensitivity.',
    paragraphs: Object.freeze([
      'Acutezza uses a calibrated Landolt-C gap task to describe angular detail for each eye, then repeats the task at lower nominal contrast. In clinical language, visual acuity is the ability to resolve fine detail; this browser experiment records a related, screen-relative observation rather than a Snellen or 20/20 result.',
      'Physical screen calibration reduces one source of scale error, but it does not calibrate display luminance, optical correction, room lighting, viewing distance throughout the run, or a clinical protocol. Compare only under the same setup and seek an eye-care professional for diagnosis, prescription, or concerns about vision.',
    ]),
  }),
});
