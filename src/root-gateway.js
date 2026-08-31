export const ROOT_GATEWAY = Object.freeze({
  title: 'Sense6 — choose your language',
  description:
    'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
  socialImageAlt: 'Sense6 browser perception experiments',
  boundary:
    'Experimental, device-relative perception exercises for curiosity—not medical tests or diagnoses.',
});

/**
 * The site root is a self-canonical language gateway: it never navigates to a
 * locale, so it cannot inherit one locale's catalog. Keep this gateway focused
 * on choosing a language; localized claims belong on the linked locale pages.
 *
 * @param {readonly { code: string, languageTag: string, direction: string, label: string }[]} locales
 */
export function rootGatewayMarkup(locales) {
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
    <p class="static-boundary"><strong>${escapeHtml(ROOT_GATEWAY.boundary)}</strong></p>
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
