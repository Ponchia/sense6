import { galleryMarkup } from './gallery-markup.js';

/**
 * Mount the gallery. On a localized static page the markup is already exactly
 * what this renderer produces, so only route behavior needs to be attached.
 */
export function renderGallery(context) {
  const { app, locale, t } = context;
  document.title = t('Sense6 — measure what your senses notice');

  if (!app.querySelector(`:scope > [data-sense6-view="gallery"][data-sense6-locale="${locale}"]`)) {
    app.innerHTML = galleryMarkup(context);
  }

  return () => {};
}
