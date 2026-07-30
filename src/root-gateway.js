import { messageSource } from './i18n/message-ids.js';

export const ROOT_GATEWAY = Object.freeze({
  title: 'Sense6 — choose your language',
  description:
    'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
  socialImageAlt: 'Sense6 browser perception experiments',
  boundaryTitle: 'Experimental, not medical — in every language',
});

const BOUNDARY = messageSource('boundary.recreational');

/**
 * The site root is a self-canonical language gateway: it never navigates to a
 * locale, so it cannot inherit one locale's catalog. The safety boundary is
 * therefore rendered once per language at build time, next to that language's
 * own entry link, instead of being detected or redirected to.
 *
 * @param {readonly { code: string, languageTag: string, direction: string, label: string }[]} locales
 * @param {(code: string, source: string) => string} [translate] build-time catalog lookup
 */
export function rootGatewayMarkup(locales, translate = (_code, source) => source) {
  return `<section class="static-entry ui-container ui-container--wide">
    <p class="ui-eyebrow">Sense6</p>
    <h1>Measure what your senses notice.</h1>
    <p>Choose your language to read about private, device-relative perception experiments and open a test.</p>
    <nav class="static-language-list" aria-label="Language">${locales
      .map(
        ({ code, languageTag, direction, label }) =>
          `<a href="/${code}/" hreflang="${languageTag}" lang="${languageTag}" dir="${direction}">${label}</a>`,
      )
      .join('')}</nav>
    <section class="static-boundary" aria-labelledby="root-boundary-title">
      <h2 id="root-boundary-title">${escapeHtml(ROOT_GATEWAY.boundaryTitle)}</h2>
      <ul class="static-boundary-list">${locales
        .map(
          ({ code, languageTag, direction, label }) =>
            `<li lang="${languageTag}" dir="${direction}"><strong>${escapeHtml(label)}</strong> — ${escapeHtml(translate(code, BOUNDARY))}</li>`,
        )
        .join('')}</ul>
    </section>
  </section>`;
}

/** @param {string} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
