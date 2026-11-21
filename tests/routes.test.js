import assert from 'node:assert/strict';
import test from 'node:test';
import { aboutData, examData, webpageData, websiteData } from '../scripts/static-structured-data.mjs';
import { aboutCopy } from '../src/about.js';
import { EXAMS } from '../src/exams/registry.js';
import { LOCALES, openGraphLocale } from '../src/locale-metadata.js';
import { applyRouteMetadata, createRouteMetadata } from '../src/routes.js';
import { HOME_METADATA } from '../src/site-copy.js';
import { timingExplorerPageData } from '../src/timing-explorer-seo.js';

test('route metadata derives one canonical and social identity record', () => {
  assert.deepEqual(
    createRouteMetadata({
      locale: 'it',
      route: 'acutezza',
      title: 'Acutezza',
      description: 'Descrizione',
      socialImage: '/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
    }),
    {
      locale: 'it',
      route: 'acutezza',
      path: '/it/acutezza/',
      title: 'Acutezza',
      description: 'Descrizione',
      canonical: 'https://sense6.net/it/acutezza/',
      socialImage: 'https://sense6.net/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
      indexable: true,
    },
  );
});

test('each published language has one explicit social preview locale', () => {
  const used = new Set();
  for (const { code } of LOCALES) {
    const locale = openGraphLocale(code);
    assert.match(locale, /^[a-z]{2}_[A-Z]{2}$/);
    assert.ok(!used.has(locale), `${code} has a distinct Open Graph language`);
    used.add(locale);
  }
  assert.equal(openGraphLocale('unknown'), 'en_US');
  assert.equal(openGraphLocale('pt-br'), 'pt_BR');
  assert.equal(openGraphLocale('zh-hans'), 'zh_CN');
});

test('experiment JSON-LD survives hydration but leaves when the gallery becomes canonical', () => {
  const experiment = EXAMS.find(({ id }) => id === 'riflessi');
  assert.ok(experiment);
  const site = websiteData('en');
  const application = examData(experiment, 'en', '/en/riflessi/', (source) => source, experiment.blurb);
  const environment = installMetadataDocument([site, application]);
  try {
    applyRouteMetadata(
      createRouteMetadata({
        locale: 'en',
        route: 'riflessi',
        title: experiment.pageTitle,
        description: experiment.blurb,
      }),
      environment.document,
    );
    assert.deepEqual(environment.schemas(), [site, application], 'hydration keeps matching static schema');

    applyRouteMetadata(createRouteMetadata({ locale: 'en', ...HOME_METADATA }), environment.document);
    assert.equal(environment.canonical.href, 'https://sense6.net/en/');
    assert.deepEqual(environment.schemas(), [site], 'the old experiment and its breadcrumb must leave');
  } finally {
    environment.restore();
  }
});

test('About JSON-LD stays during hydration and is removed on navigation to an experiment', () => {
  const copy = aboutCopy('en');
  const about = aboutData(copy, 'en', '/en/about/');
  const environment = installMetadataDocument([about]);
  try {
    applyRouteMetadata(
      createRouteMetadata({
        locale: 'en',
        route: 'about',
        title: copy.pageTitle,
        description: copy.description,
      }),
      environment.document,
    );
    assert.deepEqual(environment.schemas(), [about], 'creator and website URLs do not invalidate About');

    applyRouteMetadata(
      createRouteMetadata({
        locale: 'en',
        route: 'udito',
        title: 'Udito',
        description: 'Listening experiment',
      }),
      environment.document,
    );
    assert.deepEqual(environment.schemas(), [], 'the old AboutPage must not describe the listening route');
  } finally {
    environment.restore();
  }
});

test('a supplied resource graph replaces earlier schema once and is retired on exit', () => {
  const oldPage = webpageData('Privacy', 'Private results', 'en', '/en/privacy/');
  const environment = installMetadataDocument([oldPage]);
  const resource = timingExplorerPageData();
  const metadata = createRouteMetadata({
    locale: 'en',
    route: 'browser-timing-explorer',
    title: 'Browser timing explorer',
    description: 'Hypothetical examples',
    structuredData: resource,
  });
  try {
    applyRouteMetadata(
      createRouteMetadata({
        locale: 'en',
        route: 'privacy',
        title: 'Privacy',
        description: 'Private results',
      }),
      environment.document,
    );
    assert.deepEqual(environment.schemas(), [oldPage], 'top-level WebPage schema survives its own hydration');

    applyRouteMetadata(metadata, environment.document);
    applyRouteMetadata(metadata, environment.document);
    assert.deepEqual(
      environment.schemas(),
      [resource],
      'repeated hydration never duplicates the resource graph',
    );

    applyRouteMetadata(createRouteMetadata({ locale: 'en', ...HOME_METADATA }), environment.document);
    assert.deepEqual(environment.schemas(), [], 'the resource graph must leave with its route');
  } finally {
    environment.restore();
  }
});

/** Minimal metadata DOM, following the router tests' scoped browser-environment fixtures. */
function installMetadataDocument(schemaData) {
  const elements = [];
  class Element {
    remove() {
      const index = elements.indexOf(this);
      if (index >= 0) elements.splice(index, 1);
    }
    setAttribute(name, value) {
      this[name] = value;
    }
  }
  class LinkElement extends Element {}
  class MetaElement extends Element {}
  const originals = ['HTMLLinkElement', 'HTMLMetaElement'].map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ]);
  globalThis.HTMLLinkElement = LinkElement;
  globalThis.HTMLMetaElement = MetaElement;

  const canonical = new LinkElement();
  canonical.rel = 'canonical';
  elements.push(canonical);
  const meta = new Map();
  const document = {
    title: '',
    head: { append: (element) => elements.push(element) },
    createElement: (tag) =>
      tag === 'link' ? new LinkElement() : tag === 'meta' ? new MetaElement() : new Element(),
    querySelector(selector) {
      if (selector === 'link[rel="canonical"]') return canonical;
      if (selector === 'meta[name="robots"]')
        return elements.find((entry) => entry.name === 'robots') ?? null;
      if (!meta.has(selector)) meta.set(selector, new MetaElement());
      return meta.get(selector);
    },
    querySelectorAll(selector) {
      if (selector === 'link[rel="alternate"][hreflang]') {
        return elements.filter((entry) => entry.rel === 'alternate');
      }
      if (selector === 'script[type="application/ld+json"]') {
        return elements.filter((entry) => entry.type === 'application/ld+json');
      }
      return [];
    },
  };
  for (const data of schemaData) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.append(script);
  }
  return {
    document,
    canonical,
    schemas: () =>
      document
        .querySelectorAll('script[type="application/ld+json"]')
        .map((script) => JSON.parse(script.textContent)),
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}
