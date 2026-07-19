import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import { EXAM_BY_ID, EXAMS, loadExam } from './exams/registry.js';
import { getLocale, initializeI18n, localeHref, localizedRoot, setLocale, t, translateTree } from './i18n.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from './metrics.js';
import { currentLocation, currentRoute, navigate, startRouter } from './router.js';
import { renderGallery } from './site.js';

const appElement = document.querySelector('#app');
const app = localizedRoot(appElement);
const announcer = document.querySelector('#announcer');
const gamutChip = document.querySelector('#gamut-chip');
const initialLocation = currentLocation();

await initializeI18n({
  initialLocale: initialLocation.locale,
  onLocaleChange: async (nextLocale) => navigate(currentRoute(), nextLocale),
});

if (initialLocation.legacy) {
  navigate(initialLocation.route, initialLocation.locale ?? getLocale(), { replace: true });
} else if (!initialLocation.locale) {
  navigate(initialLocation.route, getLocale(), { replace: true });
}

initThemeToggle();
detectDisplay();
trackMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site);

let cleanup = null;
let renderToken = 0;

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

startRouter(async ({ route, locale }) => {
  const token = ++renderToken;
  if (locale && locale !== getLocale()) await setLocale(locale, { notify: false });
  if (token !== renderToken) return;

  cleanup?.();
  cleanup = null;
  document.body.classList.remove('lab-mode', 'measurement-active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (route === 'journal') {
    const [{ renderJournal }] = await Promise.all([import('./journal.js'), import('./styles/journal.css')]);
    if (token !== renderToken) return;
    app.innerHTML = '';
    cleanup = renderJournal({ ...context(), exams: EXAMS });
  } else if (route === 'privacy') {
    const [{ renderPrivacy }] = await Promise.all([import('./privacy.js'), import('./styles/privacy.css')]);
    if (token !== renderToken) return;
    app.innerHTML = '';
    cleanup = renderPrivacy(context());
  } else if (EXAM_BY_ID.has(route)) {
    const definition = EXAM_BY_ID.get(route);
    const exam = await loadExam(route);
    if (token !== renderToken || !exam) return;
    app.innerHTML = '';
    cleanup = exam.mount(context());
    document.title = t(definition.pageTitle);
  } else if (route) {
    navigate('', getLocale(), { replace: true });
  } else {
    app.innerHTML = '';
    cleanup = renderGallery({ ...context(), exams: EXAMS });
  }
  translateTree(appElement);
  updateShellLinks();
});

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  gamutChip.textContent = p3 ? t('P3 reported') : srgb ? t('sRGB reported') : t('Color gamut unknown');
  gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}

function updateShellLinks() {
  for (const link of document.querySelectorAll('a[data-sense6-route]')) {
    link.href = localeHref(link.dataset.sense6Route);
  }
}
