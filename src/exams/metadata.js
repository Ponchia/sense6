/** @typedef {import('./contracts.js').ExamId} ExamId */

/** @type {Readonly<Record<ExamId, Readonly<{ metaDescription: string }>>>} */
export const EXAM_METADATA = Object.freeze({
  tetracromia: Object.freeze({
    metaDescription:
      'Try three screen-colour discrimination experiments—tile matching, noisy fields, and hue ordering—with private, device-relative results and no overall score.',
  }),
  'color-blindness': Object.freeze({
    metaDescription:
      'Explore display-relative colour discrimination by finding a gap in luminance-noise dots while three colour directions produce separate, non-diagnostic results.',
  }),
  riflessi: Object.freeze({
    metaDescription:
      'Explore browser reaction time, choice-task cost, and consistency as separate, device-relative observations with no percentile or clinical score.',
  }),
  udito: Object.freeze({
    metaDescription:
      'Explore hearing range and pitch with headphone confidence, audibility, and pitch discrimination—private, device-relative results without a hearing diagnosis.',
  }),
  acutezza: Object.freeze({
    metaDescription:
      'Explore calibrated browser visual sharpness and contrast across two conditions per eye, with private, device-relative results and no 20/20 or clinical label.',
  }),
});

/**
 * Keep metadata-specific English copy out of untranslated routes until each
 * catalogue has reviewed equivalent wording. Localized pages retain their
 * existing translated blurb rather than silently falling back to English.
 * @param {{ id: ExamId, blurb: string }} definition
 * @param {string} locale
 */
export function examDescriptionSource(definition, locale) {
  return locale === 'en' ? EXAM_METADATA[definition.id].metaDescription : definition.blurb;
}
