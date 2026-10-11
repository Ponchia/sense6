import { isLearnPublished, learnNavigationLabel } from '../learn-publication.js';
import { LEARN_ROUTES } from '../routes.js';
import localizedTitles from './related-guide-titles.json' with { type: 'json' };

/** @type {Record<string, Record<string, string>>} */
const guideTitles = localizedTitles;

/** One researched article per experiment, referenced by a small title index
 * instead of eagerly importing long research catalogs on experiment routes.
 */
const RELATED = Object.freeze({
  tetracromia: 'tetrachromacy-guide',
  'color-blindness': 'color-blindness-guide',
  riflessi: 'reaction-time-guide',
  udito: 'hearing-range-guide',
  acutezza: 'visual-acuity-guide',
});

/**
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 */
export function relatedGuideFor(examId, locale) {
  if (!isLearnPublished(locale)) return null;
  const route = RELATED[examId];
  const title = guideTitles[locale]?.[examId];
  if (!route || !LEARN_ROUTES.includes(route) || !title?.trim()) return null;
  return { route, title, href: `/${locale}/${route}/` };
}

/**
 * Static and interactive experiment landings render the same localized link.
 * English markup remains visually unchanged; published translations use their
 * real guide titles, never a duplicated English fallback.
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 */
export function relatedGuideMarkup(examId, locale) {
  const guide = relatedGuideFor(examId, locale);
  if (!guide) return '';
  const label = locale === 'en' ? 'Related research explanation' : guide.title;
  const eyebrow = locale === 'en' ? 'Research, explained' : learnNavigationLabel(locale);
  return `<aside class="experiment-guide-link ui-container ui-container--wide" aria-label="${esc(label)}">
    <p class="ui-eyebrow">${esc(eyebrow)}</p>
    <a class="ui-link" data-sense6-route="${guide.route}" href="${guide.href}">${esc(guide.title)} →</a>
  </aside>`;
}

/**
 * Reuse the same canonical guide identity in a result interpretation.
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 * @param {string} englishLabel - Existing English result action text.
 * @param {string} [cssClass] - Existing result-scoped style class.
 */
export function relatedGuideResultLink(examId, locale, englishLabel, cssClass = '') {
  const guide = relatedGuideFor(examId, locale);
  if (!guide) return '';
  const label = locale === 'en' ? englishLabel : guide.title;
  return `<a class="ui-link${cssClass ? ` ${cssClass}` : ''}" data-sense6-route="${guide.route}" href="${guide.href}">${esc(label)} →</a>`;
}

/** @param {string} value */
function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
