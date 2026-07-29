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
