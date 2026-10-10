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
 * Keep the pre-rendered HTML and hydrated introductions aligned.
 * @param {import('./contracts.js').ExamId} examId
 * @param {string} locale
 */
export function relatedGuideMarkup(examId, locale) {
  if (locale !== 'en') return '';
  const guide = RELATED[examId];
  if (!guide || !LEARN_ROUTES.includes(guide.route)) return '';
  return `<aside class="experiment-guide-link ui-container ui-container--wide" aria-label="Related research explanation">
    <p class="ui-eyebrow">Research, explained</p>
    <a class="ui-link" data-sense6-route="${guide.route}" href="/en/${guide.route}/">${guide.title} →</a>
  </aside>`;
}
