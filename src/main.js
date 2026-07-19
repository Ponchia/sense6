import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import * as colorBlindness from './exams/color-blindness.js';
import * as riflessi from './exams/riflessi.js';
import * as tetracromia from './exams/tetracromia.js';
import * as udito from './exams/udito.js';
import { getLocale, initializeI18n, localeHref, setLocale, t, translateTree } from './i18n.js';
import { currentRoute, navigate, startRouter } from './router.js';
import { renderGallery } from './site.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const gamutChip = document.querySelector('#gamut-chip');

const exams = [tetracromia, colorBlindness, riflessi, udito];
const registry = new Map(exams.map((exam) => [exam.meta.id, exam]));

const initialLocale = window.location.hash.match(/^#\/([a-z]{2})(?:\/|$)/)?.[1];
initializeI18n({
  initialLocale,
  onLocaleChange: (nextLocale) => navigate(currentRoute(), nextLocale),
});
initThemeToggle();
detectDisplay();

let cleanup = null;

function context() {
  return {
    app,
    announcer,
    gamutChip,
    locale: getLocale(),
    localeHref,
    t,
    navigate: (name) => navigate(name, getLocale()),
    navigateHome: () => navigate('', getLocale()),
  };
}

startRouter(({ route, locale }) => {
  if (locale) setLocale(locale, { notify: false });
  if (!locale) {
    window.history.replaceState(null, '', localeHref(route));
  }
  cleanup?.();
  cleanup = null;
  app.innerHTML = '';
  document.body.classList.remove('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });

  const exam = registry.get(route);
  if (exam) {
    cleanup = exam.mount(context());
  } else if (route) {
    // Unknown route — normalize to the gallery; the hashchange re-runs this.
    navigate('');
  } else {
    cleanup = renderGallery({ ...context(), exams: exams.map((entry) => entry.meta) });
  }
  translateTree(document);
});

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  gamutChip.textContent = p3 ? t('P3 reported') : srgb ? t('sRGB reported') : t('Color gamut unknown');
  gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}
