import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import { EXAM_BY_ID, EXAMS, loadExam } from './exams/registry.js';
import {
  getLocale,
  initializeI18n,
  localeHref,
  localizedRoot,
  m,
  setLocale,
  t,
  translateTree,
} from './i18n.js';
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

if (initialLocation.legacy || !initialLocation.canonical) {
  navigate(initialLocation.route, initialLocation.locale ?? getLocale(), { replace: true });
} else if (!initialLocation.locale) {
  navigate(initialLocation.route, getLocale(), { replace: true });
}

initThemeToggle();
detectDisplay();
trackMetric(METRIC_EVENTS.siteLoaded, METRIC_TESTS.site);

let cleanup = null;
let renderToken = 0;
let committedRoute = false;
let committedRouteName = null;
let routeCommitGeneration = 0;

function context() {
  return {
    app,
    announcer,
    gamutChip,
    locale: getLocale(),
    localeHref,
    m,
    t,
    navigate: (name) => navigate(name, getLocale()),
    navigateHome: () => navigate('', getLocale()),
  };
}

startRouter(async ({ route, locale }) => {
  const token = ++renderToken;
  retireOutgoingRoute();
  if (locale && locale !== getLocale()) await setLocale(locale, { notify: false });
  if (token !== renderToken) return;

  let mountRoute;
  try {
    if (route === 'journal') {
      const [{ renderJournal }] = await Promise.all([import('./journal.js'), import('./styles/journal.css')]);
      if (token !== renderToken) return;
      mountRoute = () => renderJournal({ ...context(), exams: EXAMS });
    } else if (route === 'about') {
      const [{ renderAbout }] = await Promise.all([import('./about.js'), import('./styles/about.css')]);
      if (token !== renderToken) return;
      mountRoute = () => renderAbout(context());
    } else if (route === 'privacy') {
      const [{ renderPrivacy }] = await Promise.all([import('./privacy.js'), import('./styles/privacy.css')]);
      if (token !== renderToken) return;
      mountRoute = () => renderPrivacy(context());
    } else if (EXAM_BY_ID.has(route)) {
      const definition = EXAM_BY_ID.get(route);
      const exam = await loadExam(route);
      if (token !== renderToken || !exam) return;
      mountRoute = () => {
        const dispose = exam.mount(context());
        document.title = t(definition.pageTitle);
        return dispose;
      };
    } else if (route) {
      navigate('', getLocale(), { replace: true });
      return;
    } else {
      await import('./styles/gallery.css');
      if (token !== renderToken) return;
      mountRoute = () => renderGallery({ ...context(), exams: EXAMS });
    }
  } catch (error) {
    if (token === renderToken) renderRouteLoadFailure(error, route, token);
    return;
  }

  const initial = !committedRoute;
  const adoptsStaticView = route === '' || route === 'about' || route === 'privacy';
  const animate = initial ? !adoptsStaticView : route !== committedRouteName;
  commitRoute(mountRoute, { animate, initial, routeName: route || 'gallery', token });
  committedRoute = true;
  committedRouteName = route;
});

function retireOutgoingRoute() {
  if (!committedRoute) return;
  cleanup?.();
  cleanup = null;
  appElement.inert = true;
  delete appElement.dataset.sense6Hydrated;
}

/**
 * Keep the outgoing view intact while its replacement code and CSS load, then
 * swap atomically. Static pages whose renderer can be adopted do not mutate at
 * all; the same path still handles personalized and experiment views.
 * @param {() => (() => void)} mountRoute
 * @param {{ animate: boolean, initial: boolean, routeName: string, token: number }} options
 */
function commitRoute(mountRoute, { animate, initial, routeName, token }) {
  const generation = ++routeCommitGeneration;
  const previousHeight = appElement.getBoundingClientRect().height;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const releaseHeight = () => releaseRouteHeight(generation);

  const render = () => {
    if (token !== renderToken) return;
    cleanup?.();
    cleanup = null;
    document.body.classList.remove('lab-mode', 'measurement-active');
    if (!initial) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (previousHeight > 0) appElement.style.minBlockSize = `${Math.ceil(previousHeight)}px`;
    appElement.inert = false;
    cleanup = mountRoute();
    translateTree(appElement);
    updateShellLinks();
    appElement.dataset.sense6Hydrated = routeName;
  };

  if (animate && !reduceMotion && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(render);
    void transition.finished.then(releaseHeight, releaseHeight);
    return;
  }

  render();
  if (animate && !reduceMotion && typeof appElement.animate === 'function') {
    const animation = appElement.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    void animation.finished.then(releaseHeight, releaseHeight);
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(releaseHeight));
}

function releaseRouteHeight(generation) {
  if (generation !== routeCommitGeneration) return;
  appElement.style.minBlockSize = '';
}

function renderRouteLoadFailure(error, route, token) {
  console.error('Sense6 route failed to load.', error);
  const initial = !committedRoute;
  commitRoute(
    () => {
      document.title = 'Sense6';
      app.innerHTML = `<section class="static-entry ui-container">
        <p class="ui-eyebrow">Sense6</p>
        <h1>Page unavailable.</h1>
        <p>This page could not load. Check your connection, then try again.</p>
        <p><a class="ui-link" href="${window.location.href}">Try again</a></p>
        <p><a class="ui-link" data-sense6-route="" href="${localeHref('')}">${m('nav.allTests')}</a></p>
      </section>`;
      return () => {};
    },
    { animate: false, initial, routeName: 'error', token },
  );
  committedRoute = true;
  committedRouteName = route;
}

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
