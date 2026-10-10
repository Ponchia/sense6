import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import { EXAM_BY_ID, EXAMS, loadExam } from './exams/registry.js';
import { getLocale, initializeI18n, localeHref, localizedRoot, m, setLocale, t } from './i18n.js';
import { disposeActiveMounts } from './lib/mount-registry.js';
import { LOCALES } from './locales.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from './metrics.js';
import { currentLocation, currentRoute, navigate, startRouter } from './router.js';
import { applyRouteMetadata, createRouteMetadata, LEARN_ROUTES } from './routes.js';
import { renderGallery } from './site.js';

const appElement = document.querySelector('#app');
const app = localizedRoot(appElement);
const announcer = document.querySelector('#announcer');
const gamutChip = document.querySelector('#gamut-chip');
const initialLocation = currentLocation();
const isRootGateway = !initialLocation.legacy && !initialLocation.locale && !initialLocation.route;

await initializeI18n({
  initialLocale: isRootGateway ? 'en' : initialLocation.locale,
  onLocaleChange: async (nextLocale) => {
    if (isRootGateway) {
      window.location.assign(localeHref('', nextLocale));
      return;
    }
    // No translated guides: language switching leads to that locale's gallery.
    const route = currentRoute();
    navigate(LEARN_ROUTES.includes(route) ? '' : route, nextLocale);
  },
});

if (
  !isRootGateway &&
  (initialLocation.legacy || !initialLocation.canonical || initialLocation.locale !== getLocale())
) {
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

if (isRootGateway) {
  if (!appElement.firstElementChild) {
    const { ROOT_GATEWAY, rootGatewayMarkup } = await import('./root-gateway.js');
    app.innerHTML = rootGatewayMarkup(LOCALES);
    applyRouteMetadata(
      createRouteMetadata({
        locale: 'en',
        path: '/',
        title: ROOT_GATEWAY.title,
        description: ROOT_GATEWAY.description,
        socialImageAlt: ROOT_GATEWAY.socialImageAlt,
      }),
    );
  }
  appElement.dataset.sense6Hydrated = 'language';
} else {
  startRouter(renderRoute);
  void renderRoute(currentLocation());
}

async function renderRoute({ route, locale }) {
  const token = ++renderToken;
  try {
    if (!(await routeLocaleAvailable(locale))) return;
    if (token !== renderToken) return;
    retireOutgoingRoute();

    let mountRoute;
    let metadata;
    if (['journal', 'about', 'privacy'].includes(route) || LEARN_ROUTES.includes(route)) {
      const page = await prepareInformationalRoute(route, locale);
      if (token !== renderToken || !page) return;
      mountRoute = page.mountRoute;
      metadata = page.metadata;
    } else if (EXAM_BY_ID.has(route)) {
      const definition = EXAM_BY_ID.get(route);
      const [exam, { examDescriptionSource }] = await Promise.all([
        loadExam(route),
        import('./exams/metadata.js'),
      ]);
      if (token !== renderToken || !exam) return;
      mountRoute = () => exam.mount(context());
      metadata = createRouteMetadata({
        locale,
        route,
        title: t(definition.pageTitle),
        description: t(examDescriptionSource(definition, locale)),
        socialImage: `/social/${definition.id}.png`,
        // Identical to the static build's alt (scripts/generate-static-pages.mjs):
        // the identity alone, never the identity plus the tagline.
        socialImageAlt: t(definition.discoveryName ?? definition.name),
      });
    } else if (route) {
      navigate('', getLocale(), { replace: true });
      return;
    } else {
      await import('./styles/gallery.css');
      if (token !== renderToken) return;
      mountRoute = () => renderGallery({ ...context(), exams: EXAMS });
      metadata = createRouteMetadata({
        locale,
        title: t('Sense6 — measure what your senses notice'),
        description: t(
          'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
        ),
        socialImageAlt: t(
          'Private browser tests for colour, response timing, and hearing. Answers and results stay in your browser.',
        ),
      });
    }

    const initial = !committedRoute;
    // A direct-link visitor should be able to act as soon as the route is
    // hydrated. Entry animations can intercept the first click on slower
    // browsers; reserve view transitions for navigation between mounted routes.
    const animate = !initial && route !== committedRouteName;
    const committed = await commitRoute(mountRoute, {
      animate,
      initial,
      routeName: route || 'gallery',
      token,
      metadata,
    });
    if (!committed) return;
    if (EXAM_BY_ID.has(route)) trackMetric(METRIC_EVENTS.testViewed, METRIC_TESTS[route]);
    committedRoute = true;
    committedRouteName = route;
  } catch (error) {
    if (token === renderToken) await renderRouteLoadFailure(error, route, token);
  }
}

/**
 * Keep the route commit state machine small. Editorial and utility views load
 * lazily, and their markup can be adopted without a flash after hydration.
 */
async function prepareInformationalRoute(route, locale) {
  if (route === 'journal') {
    const [{ renderJournal }, { journalCopy, prepareJournalCopy }] = await Promise.all([
      import('./journal.js'),
      import('./journal-copy.js'),
      import('./styles/journal.css'),
    ]);
    await prepareJournalCopy(locale);
    const copy = journalCopy(locale);
    return {
      mountRoute: () => renderJournal({ ...context(), exams: EXAMS }),
      metadata: createRouteMetadata({
        locale,
        route,
        title: `${copy.title} | Sense6`,
        description: copy.intro,
        socialImageAlt: copy.intro,
        indexable: false,
      }),
    };
  }
  if (route === 'about') {
    const [{ aboutCopy, renderAbout }] = await Promise.all([
      import('./about.js'),
      import('./styles/about.css'),
    ]);
    const copy = aboutCopy(locale);
    return {
      mountRoute: () => renderAbout(context()),
      metadata: createRouteMetadata({
        locale,
        route,
        title: copy.pageTitle,
        description: copy.description,
        socialImageAlt: copy.description,
      }),
    };
  }
  if (route === 'privacy') {
    const [{ preparePrivacyCopy, privacyCopy, renderPrivacy }] = await Promise.all([
      import('./privacy.js'),
      import('./styles/privacy.css'),
    ]);
    await preparePrivacyCopy(locale);
    const copy = privacyCopy(locale);
    return {
      mountRoute: () => renderPrivacy(context()),
      metadata: createRouteMetadata({
        locale,
        route,
        title: `${copy.title} | Sense6`,
        description: copy.intro,
        socialImageAlt: copy.intro,
        indexable: false,
      }),
    };
  }

  if (locale !== 'en') {
    // A route without a translated guide must not masquerade as translated.
    navigate('', locale, { replace: true });
    return null;
  }
  const [{ learnMetadata, renderLearn }] = await Promise.all([
    import('./learn.js'),
    import('./styles/learn.css'),
  ]);
  const page = learnMetadata(route);
  if (!page) throw new Error('Unknown Learn guide');
  return {
    mountRoute: () => renderLearn(context(), route),
    metadata: createRouteMetadata({
      locale,
      route,
      title: page.title,
      description: page.description,
      socialImageAlt: page.socialImageAlt,
    }),
  };
}

async function routeLocaleAvailable(locale) {
  if (!locale || locale === getLocale()) return true;
  const localeChanged = await setLocale(locale, { notify: false });
  return localeChanged || locale === getLocale();
}

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
 * @param {{ animate: boolean, initial: boolean, routeName: string, token: number, metadata: import('./routes.js').RouteMetadata, updateLinks?: boolean }} options
 * @returns {Promise<boolean>}
 */
async function commitRoute(mountRoute, { animate, initial, routeName, token, metadata, updateLinks = true }) {
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
      applyRouteMetadata(metadata);
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
        metadata: errorRouteMetadata(),
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
  applyRouteMetadata(errorRouteMetadata());
  committedRoute = true;
  committedRouteName = route;
}

function errorRouteMetadata() {
  return createRouteMetadata({
    locale: getLocale(),
    route: currentRoute(),
    title: 'Page unavailable | Sense6',
    description: 'This Sense6 page could not load.',
    socialImageAlt: 'Sense6 browser perception experiments',
  });
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
    // The persistent EN-only Learn link is already handled by i18n's
    // localizeInternalLinks. Rewriting it here would create /it/learn/.
    if (link.hasAttribute('data-sense6-english-only')) continue;
    link.href = localeHref(link.dataset.sense6Route);
  }
}
