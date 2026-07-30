/**
 * Dates for substantive public-content changes. Sitemap and structured-data
 * output both consume this registry so their freshness signals cannot drift.
 *
 * These dates are claims about rendered content, so `npm run build` verifies
 * them: scripts/content-fingerprints.mjs hashes every dated route's title,
 * description, and `<main>` into src/content-fingerprints.json and fails the
 * build when a hash moves while its entry here stands still.
 */
export const CONTENT_DATES = Object.freeze({
  site: '2026-07-30',
  about: '2026-07-30',
  exams: Object.freeze({
    tetracromia: '2026-07-30',
    'color-blindness': '2026-07-30',
    riflessi: '2026-07-30',
    udito: '2026-07-30',
    acutezza: '2026-07-30',
  }),
});

/** @param {string} examId */
export function examContentDate(examId) {
  const date = CONTENT_DATES.exams[examId];
  if (!date) throw new Error(`Missing public-content date for ${examId}`);
  return date;
}
