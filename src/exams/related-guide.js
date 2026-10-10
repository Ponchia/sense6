import { LEARN_ROUTES } from '../routes.js';

/**
 * An honest, reviewed article for each experiment. Only publish links when
 * the guide exists in the registry. Other locales retain their own translated
 * experiment copy until a guide is reviewed in that language.
 */
const RELATED = Object.freeze({
  tetracromia: {
    route: 'tetrachromacy-guide',
    title: 'Can an online test detect tetrachromacy?',
  },
  'color-blindness': {
    route: 'color-blindness-guide',
    title: 'What can an online colour-blindness test tell you?',
  },
  riflessi: {
    route: 'reaction-time-guide',
    title: 'How accurate is a reaction-time test in a browser?',
  },
  udito: {
    route: 'hearing-range-guide',
    title: 'Can a browser test your hearing range?',
  },
  acutezza: {
    route: 'visual-acuity-guide',
    title: 'Can an online visual-acuity test replace an eye exam?',
  },
});

/**
 * Look up an existing, reviewed article for the experiment and active locale.
 * English is currently the only published Learn language.
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 */
export function relatedGuideFor(examId, locale) {
  if (locale !== 'en') return null;
  const guide = RELATED[examId];
  return guide && LEARN_ROUTES.includes(guide.route) ? guide : null;
}

/**
 * Render a link to the same reviewed guide for the experiment landing.
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 */
export function relatedGuideMarkup(examId, locale) {
  const guide = relatedGuideFor(examId, locale);
  if (!guide) return '';
  return `<aside class="experiment-guide-link ui-container ui-container--wide" aria-label="Related research explanation">
    <p class="ui-eyebrow">Research, explained</p>
    <a class="ui-link" data-sense6-route="${guide.route}" href="/en/${guide.route}/">${guide.title} →</a>
  </aside>`;
}
