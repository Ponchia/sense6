import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import { EXAM_BY_ID, EXAMS, loadExam } from './exams/registry.js';
import { getLocale, initializeI18n, localeHref, localizedRoot, m, setLocale, t } from './i18n.js';
import { disposeActiveMounts } from './lib/mount-registry.js';
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
  try {
    retireOutgoingRoute();
    if (locale && locale !== getLocale()) await setLocale(locale, { notify: false });
    if (token !== renderToken) return;

    let mountRoute;
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

    const initial = !committedRoute;
    const adoptsStaticView = route === '' || route === 'about' || route === 'privacy';
    const animate = initial ? !adoptsStaticView : route !== committedRouteName;
    const committed = await commitRoute(mountRoute, {
      animate,
      initial,
      routeName: route || 'gallery',
      token,
    });
    if (!committed) return;
    committedRoute = true;
    committedRouteName = route;
  } catch (error) {
    if (token === renderToken) await renderRouteLoadFailure(error, route, token);
  }
});

function retireOutgoingRoute() {
  if (!committedRoute) return;
  disposeRoute(cleanup);
  cleanup = null;
  appElement.inert = true;
  delete appElement.dataset.sense6Hydrated;
}

/**
 * Keep the outgoing view intact while its replacement code and CSS load, then
 * swap atomically. Static pages whose renderer can be adopted do not mutate at
 * all; the same path still handles personalized and experiment views.
 * @param {() => (() => void)} mountRoute
 * @param {{ animate: boolean, initial: boolean, routeName: string, token: number, updateLinks?: boolean }} options
 * @returns {Promise<boolean>}
 */
async function commitRoute(mountRoute, { animate, initial, routeName, token, updateLinks = true }) {
  const generation = ++routeCommitGeneration;
  const previousHeight = appElement.getBoundingClientRect().height;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const releaseHeight = () => releaseRouteHeight(generation);

  let rendered = false;
  const render = () => {
    if (token !== renderToken) return;
    disposeRoute(cleanup);
    cleanup = null;
    let mountedCleanup = null;
    try {
      document.body.classList.remove('lab-mode', 'measurement-active');
      if (!initial) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (previousHeight > 0) appElement.style.minBlockSize = `${Math.ceil(previousHeight)}px`;
      appElement.inert = false;
      mountedCleanup = mountRoute();
      if (typeof mountedCleanup !== 'function') throw new TypeError('Route mount must return a cleanup.');
      cleanup = mountedCleanup;
      if (updateLinks) updateShellLinks();
      appElement.dataset.sense6Hydrated = routeName;
      rendered = true;
    } catch (error) {
      if (cleanup === mountedCleanup) cleanup = null;
      disposeRoute(mountedCleanup);
      disposeActiveMounts();
      throw error;
    }
  };

  if (animate && !reduceMotion && typeof document.startViewTransition === 'function') {
    let renderError = null;
    const transition = document.startViewTransition(() => {
      try {
        render();
      } catch (error) {
        renderError = error;
      }
    });
    void transition.finished.then(releaseHeight, releaseHeight);
    await transition.updateCallbackDone;
    if (renderError) throw renderError;
    return rendered;
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
    return rendered;
  }
  requestAnimationFrame(() => requestAnimationFrame(releaseHeight));
  return rendered;
}

function releaseRouteHeight(generation) {
  if (generation !== routeCommitGeneration) return;
  appElement.style.minBlockSize = '';
}

async function renderRouteLoadFailure(error, route, token) {
  console.error('Sense6 route failed to load.', error);
  disposeActiveMounts();
  const initial = !committedRoute;
  try {
    const committed = await commitRoute(
      () => {
        document.title = 'Sense6';
        appElement.innerHTML = `<section class="static-entry ui-container">
        <p class="ui-eyebrow">Sense6</p>
        <h1>Page unavailable.</h1>
        <p>This page could not load. Check your connection, then try again.</p>
        <p><a class="ui-link" href="">Try again</a></p>
        <p><a class="ui-link" data-sense6-route="" href="/${getLocale()}/">All tests</a></p>
      </section>`;
        return () => {};
      },
      {
        animate: false,
        initial,
        routeName: 'error',
        token,
        updateLinks: false,
      },
    );
    if (!committed) return;
    committedRoute = true;
    committedRouteName = route;
  } catch (fallbackError) {
    if (token !== renderToken) return;
    console.error('Sense6 route failure view could not mount.', fallbackError);
    forceRouteLoadFailure(route);
  }
}

function forceRouteLoadFailure(route) {
  disposeRoute(cleanup);
  cleanup = null;
  disposeActiveMounts();
  document.body.classList.remove('lab-mode', 'measurement-active');
  appElement.inert = false;
  appElement.style.minBlockSize = '';
  appElement.innerHTML = `<section class="static-entry ui-container">
    <p class="ui-eyebrow">Sense6</p>
    <h1>Page unavailable.</h1>
    <p>This page could not load. Reload to try again.</p>
  </section>`;
  appElement.dataset.sense6Hydrated = 'error';
  committedRoute = true;
  committedRouteName = route;
}

function disposeRoute(dispose) {
  if (typeof dispose !== 'function') return;
  try {
    dispose();
  } catch (error) {
    console.error('Sense6 route cleanup failed.', error);
  }
}

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  const source = p3 ? 'P3 reported' : srgb ? 'sRGB reported' : 'Color gamut unknown';
  gamutChip.dataset.i18nSource = source;
  gamutChip.textContent = t(source);
  gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}

function updateShellLinks() {
  for (const link of document.querySelectorAll('a[data-sense6-route]')) {
    link.href = localeHref(link.dataset.sense6Route);
  }
}
