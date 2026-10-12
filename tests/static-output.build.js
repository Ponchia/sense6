import './related-guide.build.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { publicIndexNowKey } from '../scripts/submit-indexnow.mjs';
import {
  activeRouteModuleFiles,
  measureActiveRouteGraph,
  measureInitialLocaleGraph,
} from '../scripts/vite-manifest.mjs';
import { aboutMarkup } from '../src/about.js';
import { CONTENT_DATES, examContentDate } from '../src/content-dates.js';
import { CRAWLER_POLICY } from '../src/crawler-policy.js';
import { examDescriptionSource } from '../src/exams/metadata.js';
import { EXAMS } from '../src/exams/registry.js';
import { galleryMarkup } from '../src/gallery-markup.js';
import { messageSource } from '../src/i18n/message-ids.js';
import { interpolateMessage } from '../src/i18n.js';
import { learnMarkup, learnMetadata, learnPage } from '../src/learn.js';
import { learnCatalog, prepareLearnLocale } from '../src/learn-catalog.js';
import {
  isLearnPublished,
  LEARN_PUBLISHED_LOCALES,
  learnAlternates,
  learnPublicationDate,
} from '../src/learn-publication.js';
import { openGraphLocale } from '../src/locale-metadata.js';
import { LOCALES, loadMessages } from '../src/locales.js';
import { LEARN_ROUTES, NON_INDEXABLE_ROUTES, routePath, UTILITY_ROUTES } from '../src/routes.js';
import { ENGLISH_EXPLAINER_COPY, STATIC_SEARCH_INTENT_COPY } from '../src/static-discovery.js';

const DIST = new URL('../dist/', import.meta.url);
/**
 * The descriptor half of every discovery identity. A bare brand noun is not a
 * heading anyone searches for, and PR #58 shipped four of them because the
 * only assertion here was that an <h1> element existed.
 */
const DISCOVERY_NAMES = Object.freeze({
  tetracromia: 'Tetracromia — Screen Colour Lab',
  'color-blindness': 'Daltonia — Colour Discrimination Lab',
  riflessi: 'Riflessi — Reaction Time Lab',
  udito: 'Udito — Hearing Range & Pitch Lab',
  acutezza: 'Acutezza — Visual Sharpness Lab',
});
const expectedPaths = [
  '/',
  ...LEARN_PUBLISHED_LOCALES.flatMap((locale) => LEARN_ROUTES.map((route) => routePath(locale, route))),
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    ...UTILITY_ROUTES.map((route) => routePath(code, route)),
  ]),
];
const expectedSitemapPaths = [
  '/',
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    routePath(code, 'about'),
  ]),
  // Static generator deliberately appends original English Learn pages after
  // its localized experiment and About pages. Sitemaps have no priority order.
  ...LEARN_PUBLISHED_LOCALES.flatMap((locale) => LEARN_ROUTES.map((route) => routePath(locale, route))),
];

test('IndexNow root ownership proof is copied into the production artifact unchanged', async () => {
  const { file, key } = await publicIndexNowKey();
  const published = await readFile(new URL(file, DIST), 'utf8');
  assert.equal(published.trim(), key, 'production build must serve the verified ownership key');
  assert.ok(!published.includes('<html'), 'ownership proof must be served as plain UTF-8 text');
});

test('every localized static gallery features the same short Riflessi entry without inventing a new route', async () => {
  for (const { code } of LOCALES) {
    const html = await readFile(new URL(`${code}/index.html`, DIST), 'utf8');
    const messages = await loadMessages(code);
    const starterCopy = messages.get('Try a short reaction test');
    assert.ok(starterCopy, `${code} has no translation for the starter`);
    if (code !== 'en') assert.notEqual(starterCopy, 'Try a short reaction test');
    assert.ok(html.includes(escapeHtml(starterCopy)), `${code} lacks localized action copy`);
    assert.ok(
      html.includes(`href="/${code}/riflessi/?scope=signal"`),
      `${code} lacks a direct link to the existing signal scope`,
    );
    assert.equal(
      (html.match(/data-sense6-starter="riflessi-signal"/g) ?? []).length,
      1,
      `${code} should have one prominent starter action`,
    );
  }
});

test('flagged East Asian gallery descriptions remain substantial and consistent in search and sharing metadata', async () => {
  const source =
    'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.';
  for (const locale of ['ja', 'ko', 'zh-hans']) {
    const html = await readFile(new URL(`${locale}/index.html`, DIST), 'utf8');
    const messages = await loadMessages(locale);
    const description = decodeEntities(html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? '');
    assert.equal(description, messages.get(source), `${locale} static metadata lost its locale source`);
    assert.ok(
      [...description].length >= 145 && [...description].length <= 190,
      `${locale} home summary needs useful substance, not repeated keywords or a truncated paragraph`,
    );
    assert.ok(description.includes('Sense6'), `${locale} home summary must identify the project`);
    for (const tag of ['<meta property="og:description"', '<meta name="twitter:description"']) {
      assert.ok(
        html.includes(`${tag} content="${escapeHtml(description)}">`),
        `${locale} share metadata diverges from the localized search description`,
      );
    }
    assert.ok(
      html.includes(`<link rel="canonical" href="https://sense6.net/${locale}/">`),
      `${locale} home canonical must remain self-referencing`,
    );
    assert.doesNotMatch(html, /<meta name="robots" content="noindex">/);
  }
});

test('the footer and gallery expose only actually published Learn locales', async () => {
  const root = await readFile(new URL('index.html', DIST), 'utf8');
  assert.match(root, /data-sense6-route="learn" data-sense6-english-only href="\/en\/learn\/"/);
  for (const { code } of LOCALES) {
    const published = isLearnPublished(code);
    if (published) await prepareLearnLocale(code);
    const html = await readFile(new URL(`${code}/index.html`, DIST), 'utf8');
    const links = [
      ...html.matchAll(
        /<a data-sense6-route="learn" data-sense6-english-only(?: hidden)? href="([^"]+)" lang="([^"]+)">([^<]*)<\/a>/g,
      ),
    ];
    assert.equal(links.length, 1, `${code} should have exactly one Learn footer link`);
    const link = links[0];
    assert.equal(link[0].includes(' hidden '), !published, `${code} footer visibility`);
    assert.equal(link[1], published ? `/${code}/learn/` : `/${code}/`, `${code} locale-safe href`);
    assert.equal(link[2], published ? code : 'en', `${code} footer language`);
    assert.equal(link[3], published ? learnCatalog(code).ui.Learn : 'Learn', `${code} footer text`);
    assert.equal(html.includes('class="gallery-learn '), published, `${code} gallery Learn preview`);
    if (!published) {
      assert.ok(!html.includes(`href="/${code}/learn/"`), `${code} phantom translation`);
    }
    assert.equal(html.includes('class="ui-link gallery-hero__learn"'), published);
  }
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: A release-level assertion intentionally follows all published languages, metadata and source boundaries.
test('all published Learn pages have full text, metadata and reciprocal alternatives', async () => {
  for (const locale of LEARN_PUBLISHED_LOCALES) {
    await prepareLearnLocale(locale);
    const gallery = await readFile(new URL(`${locale}/index.html`, DIST), 'utf8');
    assert.match(gallery, /data-sense6-route="learn"/);
    for (const route of LEARN_ROUTES) {
      const html = await readFile(new URL(`${locale}/${route}/index.html`, DIST), 'utf8');
      const socialImage = learnMetadata(route, locale).socialImage;
      const content = learnPage(route, locale);
      for (const element of ['<meta property="og:image"', '<meta name="twitter:image"']) {
        assert.ok(html.includes(`${element} content="https://sense6.net${socialImage}">`));
      }
      assert.ok((await stat(new URL(socialImage.slice(1), DIST))).size > 1000);
      assert.match(
        html,
        route === 'learn'
          ? /<meta property="og:type" content="website"/
          : /<meta property="og:type" content="article"/,
      );
      assert.ok(html.includes(learnMarkup(route, locale)), `${locale}/${route} differs on hydration`);
      assert.ok(html.includes(`href="/${locale}/"`), `${locale}/${route} must link to gallery`);
      assert.ok(html.includes('href="https://github.com/Ponchia"'), 'real author link is absent');
      const canonical = `https://sense6.net/${locale}/${route}/`;
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
      assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, learnAlternates(route).length);
      for (const alternative of learnAlternates(route)) {
        assert.ok(html.includes(`hreflang="${alternative.languageTag}" href="${alternative.href}"`));
      }
      const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}');
      const record = data['@graph'][0];
      assert.equal(record['@type'], route === 'learn' ? 'CollectionPage' : 'Article');
      assert.equal(record.url, canonical);
      assert.equal(record.dateModified, learnMetadata(route, locale).dateModified);
      if (route !== 'learn') {
        assert.equal(
          record.datePublished,
          locale === 'en' ? content.publishedDate : learnPublicationDate(locale),
          'Article datePublished must reflect that language edition, not English history',
        );
      }
      assert.equal(record.author.name, 'Zeno');
      assert.equal(record.inLanguage, LOCALES.find(({ code }) => code === locale).languageTag);
      if (route !== 'learn') {
        assert.equal(
          record.citation.length,
          content.sources.filter(({ href }) => href.startsWith('https://')).length,
        );
        assert.ok(
          html.includes(
            learnCatalog(locale).ui[
              'Sense6 is a recreational browser lab, not a clinical or diagnostic test. Answers and measurements stay on your device.'
            ],
          ),
        );
        assert.ok(
          html.includes(
            learnCatalog(locale).ui[
              'Research papers address the scientific question; standards describe equipment or browser behaviour. The Sense6 link documents the task implemented here. None validates the Sense6 protocol.'
            ],
          ),
        );
        if (route === 'reaction-time-guide') {
          assert.ok(
            html.includes(
              learnCatalog(locale).ui['not a latency measurement, calibration or correction formula'],
            ),
          );
        }
      }
    }
  }
  for (const { code } of LOCALES.filter(({ code }) => !isLearnPublished(code))) {
    await assert.rejects(stat(new URL(`${code}/learn/index.html`, DIST)), /ENOENT/);
  }
});

/** Keep font-loading assertions separate from the already substantial SEO test. */
function assertCriticalDisplayFontPreloads(html, path, locale, route) {
  const usesNativeMetrics = ['ar', 'hi', 'ja', 'ko', 'zh-hans'].includes(locale);
  const entryScript = html.indexOf('<script type="module"');
  const displayFontPreload =
    /<link rel="preload" href="\/assets\/doto-800-[^"]+\.woff2" as="font" type="font\/woff2" crossorigin>/;
  if (usesNativeMetrics) {
    assert.doesNotMatch(html, displayFontPreload, `${path} uses native script metrics instead of Doto`);
  } else {
    assert.match(html, displayFontPreload, `${path} must preload the above-fold display face`);
    const fontOffset = html.indexOf('<link rel="preload" href="/assets/doto-800-');
    assert.ok(
      fontOffset >= 0 && fontOffset < entryScript,
      `${path} must discover Doto 800 before application JavaScript`,
    );
  }
  for (const weight of [400, 700]) {
    const heroFontPreload = new RegExp(
      `<link rel="preload" href="/assets/doto-${weight}-[^"]+\\.woff2" as="font"`,
    );
    if (route === 'udito' && !usesNativeMetrics) {
      assert.match(html, heroFontPreload, `${path} must discover its hydrated hero font before paint`);
      const fontOffset = html.indexOf(`/assets/doto-${weight}-`);
      assert.ok(
        fontOffset >= 0 && fontOffset < entryScript,
        `${path} must discover Doto ${weight} before application JavaScript`,
      );
    } else {
      assert.doesNotMatch(html, heroFontPreload, `${path} must not preload Udito-only hero weights`);
    }
  }
}

test('every canonical route has substantive, localized raw HTML', async () => {
  const headers = await readFile(new URL('_headers', DIST), 'utf8');
  const titles = new Set();
  for (const path of expectedPaths) {
    const html = await readFile(new URL(path === '/' ? 'index.html' : `.${path}index.html`, DIST), 'utf8');
    const locale = path.split('/').filter(Boolean)[0] ?? 'en';
    const route = path.split('/').filter(Boolean)[1] ?? '';
    const publishedGuide = LEARN_ROUTES.includes(route);
    const metadata = LOCALES.find(({ code }) => code === locale) ?? LOCALES[0];
    assert.match(html, new RegExp(`<html lang="${metadata.languageTag}" dir="${metadata.direction}"`), path);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${path} needs exactly one top-level heading`);
    const heading = headingText(html);
    assert.ok(heading.length >= 8, `${path} heading "${heading}" is too thin to describe the page`);
    assert.match(html, /<meta name="description" content="[^"].+">/, path);
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/sense6\.net\/social\/[^".]+\.png">/,
      path,
    );
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?>/, path);
    const ogLocales = [...html.matchAll(/<meta property="og:locale" content="([^"]+)"\s*\/?>/g)];
    assert.equal(ogLocales.length, 1, `${path} must have exactly one Open Graph locale`);
    assert.equal(ogLocales[0]?.[1], openGraphLocale(locale), `${path} social preview language`);

    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://sense6\\.net${escapeRegex(path)}">`),
      path,
    );
    assert.equal(
      (html.match(/rel="alternate" hreflang=/g) ?? []).length,
      publishedGuide ? learnAlternates(route).length : LOCALES.length + 1,
      path,
    );
    assert.match(html, /<script type="application\/ld\+json">.+<\/script>/, path);
    if (NON_INDEXABLE_ROUTES.includes(route)) {
      assert.match(html, /<meta name="robots" content="noindex">/, path);
    } else {
      assert.doesNotMatch(html, /<meta name="robots" content="noindex">/, path);
    }
    assertCriticalDisplayFontPreloads(html, path, locale, route);
    const stylesheet = publishedGuide ? 'learn' : route || 'gallery';
    assert.match(
      html,
      new RegExp(`<link rel="stylesheet" crossorigin href="/assets/${escapeRegex(stylesheet)}-[^"]+\\.css">`),
      `${path} must load its route stylesheet before JavaScript`,
    );
    assert.match(
      html,
      new RegExp(`<a[^>]+href="/(?:${LOCALES.map(({ code }) => escapeRegex(code)).join('|')})/`),
      path,
    );
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
    assert.ok(stripTags(main).length >= 180, `${path} needs substantive raw main content`);
    assertBalanced(main, 'section', path);
    assertBalanced(main, 'article', path);
    for (const script of html.matchAll(/<script((?![^>]*\bsrc=)[^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/type="application\/ld\+json"/.test(script[1])) {
        assert.doesNotThrow(() => JSON.parse(script[2]), `${path} has invalid structured data`);
        continue;
      }
      const hash = `'sha256-${createHash('sha256').update(script[2]).digest('base64')}'`;
      assert.ok(headers.includes(hash), `${path} executable inline script is missing from the CSP`);
    }
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title, `${path} needs a title`);
    const description = decodeEntities(html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? '');
    // Thresholds sit just under the shortest legitimate CJK copy: they catch a
    // heading, title, or description collapsing to a bare label, not verbosity.
    assert.ok(title.length >= 15, `${path} title "${title}" is degenerate`);
    assert.ok(description.length >= 30, `${path} description "${description}" is degenerate`);
    assert.notEqual(description, decodeEntities(title), `${path} repeats its title as its description`);
    assert.notEqual(description, heading, `${path} repeats its heading as its description`);
    const localizedTitle = `${locale}:${title}`;
    if (path !== '/') assert.ok(!titles.has(localizedTitle), `duplicate title within ${locale}: ${title}`);
    titles.add(localizedTitle);
  }
});

test('RTL static interpolation matches the runtime directional-isolate contract', async () => {
  const html = await readFile(new URL('ar/index.html', DIST), 'utf8');
  assert.match(html, /\u2068\d+\u2069/);
});

test('display fonts reserve a fallback-blocking window', async () => {
  const assets = await readdir(new URL('assets/', DIST));
  const stylesheet = assets.find((asset) => /^index-.+\.css$/.test(asset));
  assert.ok(stylesheet, 'expected the generated application stylesheet');
  const css = await readFile(new URL(`assets/${stylesheet}`, DIST), 'utf8');
  for (const weight of [400, 500, 600, 700, 800, 900]) {
    assert.match(
      css,
      new RegExp(
        `font-display:block;font-family:(?:"Sense6 Doto"|Sense6 Doto);font-style:normal;font-weight:${weight}`,
      ),
      `Sense6 Doto ${weight} must use font-display: block`,
    );
  }
  assert.match(css, /--display:(?:"Sense6 Doto"|Sense6 Doto),\s*ui-monospace,\s*monospace/);
});

test('experiment discovery pages expose useful copy, related routes, images, and provenance', async () => {
  for (const definition of EXAMS) {
    const html = await readFile(new URL(`en/${definition.route}/index.html`, DIST), 'utf8');
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
    const words = stripTags(main).split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 200, `${definition.route} raw entry has only ${words.length} words`);
    assert.match(
      html,
      new RegExp(`<img src="/social/${escapeRegex(definition.id)}\\.svg" width="1200" height="630"`),
    );
    for (const related of definition.discovery.related) {
      assert.match(html, new RegExp(`href="/en/${escapeRegex(related)}/"`));
    }

    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}');
    assert.deepEqual(
      data['@graph'].map((entry) => entry['@type']),
      ['WebApplication', 'BreadcrumbList'],
    );
    assert.equal(data['@graph'][0].dateModified, examContentDate(definition.id));
    assert.equal(data['@graph'][0].creator.name, 'Zeno');
    assert.equal(data['@graph'][0].creator.url, undefined);
    assert.equal(data['@graph'][0].image, `https://sense6.net/social/${definition.id}.png`);
  }
});

test('experiment metadata is richer in English without leaking into localized routes or cards', async () => {
  const englishGallery = await readFile(new URL('en/index.html', DIST), 'utf8');
  const italianMessages = await loadMessages('it');

  for (const definition of EXAMS) {
    const english = await readFile(new URL(`en/${definition.route}/index.html`, DIST), 'utf8');
    const italian = await readFile(new URL(`it/${definition.route}/index.html`, DIST), 'utf8');
    const englishDescription = decodeEntities(
      english.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? '',
    );
    const italianDescription = decodeEntities(
      italian.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? '',
    );
    const expectedEnglish = examDescriptionSource(definition, 'en');
    const italianBlurb = italianMessages.get(definition.blurb);
    assert.equal(englishDescription, expectedEnglish);
    assert.equal(italianDescription, italianBlurb);
    assert.notEqual(italianDescription, expectedEnglish);
    assert.ok(englishGallery.includes(escapeHtml(definition.blurb)));
    assert.ok(!englishGallery.includes(escapeHtml(expectedEnglish)));

    for (const html of [english, italian]) {
      const description = decodeEntities(
        html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? '',
      );
      assert.ok(html.includes(`<meta property="og:description" content="${escapeHtml(description)}">`));
      assert.ok(html.includes(`<meta name="twitter:description" content="${escapeHtml(description)}">`));
      const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}');
      assert.equal(data['@graph'][0].description, description);
    }
  }
});

test('English experiment pages add original query-led explanation without leaking it into translations', async () => {
  for (const definition of EXAMS) {
    const explainer = ENGLISH_EXPLAINER_COPY[definition.id];
    const english = await readFile(new URL(`en/${definition.route}/index.html`, DIST), 'utf8');
    const italian = await readFile(new URL(`it/${definition.route}/index.html`, DIST), 'utf8');
    assert.ok(english.includes(escapeHtml(explainer.eyebrow)), `${definition.id} omits its explainer label`);
    assert.ok(
      english.includes(escapeHtml(explainer.heading)),
      `${definition.id} omits its explainer heading`,
    );
    for (const paragraph of explainer.paragraphs) {
      assert.ok(english.includes(escapeHtml(paragraph)), `${definition.id} omits explainer copy`);
      assert.ok(!italian.includes(escapeHtml(paragraph)), `${definition.id} leaked English into Italian`);
    }
  }
  const acutezza = await readFile(new URL('en/acutezza/index.html', DIST), 'utf8');
  assert.match(acutezza, /visual acuity/i);
  assert.match(acutezza, /contrast sensitivity/i);
  assert.match(acutezza, /rather than a Snellen or 20\/20 result/i);
});

test('every experiment heading names the brand and what it observes, in every language', async () => {
  assert.deepEqual(
    EXAMS.map(({ id, discoveryName }) => [id, discoveryName]),
    Object.entries(DISCOVERY_NAMES),
    'every experiment needs a discovery identity, not a bare brand noun',
  );

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const definition of EXAMS) {
      const expected = messages.get(definition.discoveryName);
      assert.ok(expected, `${code} is missing the ${definition.id} discovery identity`);
      const html = await readFile(new URL(`${code}/${definition.route}/index.html`, DIST), 'utf8');
      const heading = headingText(html);
      assert.equal(heading, expected, `${code}/${definition.route} renders the wrong heading`);
      assert.notEqual(
        heading,
        messages.get(definition.name) ?? definition.name,
        `${code}/${definition.route} fell back to the bare brand noun`,
      );
      assert.ok(
        heading.length > (messages.get(definition.name) ?? definition.name).length,
        `${code}/${definition.route} heading "${heading}" adds no descriptor`,
      );
      if (code !== 'en') {
        assert.notEqual(heading, definition.discoveryName, `${code} left the identity untranslated`);
      }
    }
  }
});

/*
 * `discoveryName` already carries brand plus descriptor. It replaced `name`
 * inside strings that were ALREADY concatenated with the tagline, so alt text,
 * related-experiment links, and the breadcrumb each shipped three descriptors in
 * one string. One descriptor per string, in every locale, on every surface.
 */
test('an identity is never glued to its tagline, and the breadcrumb stays short', async () => {
  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const definition of EXAMS) {
      const html = await readFile(new URL(`${code}/${definition.route}/index.html`, DIST), 'utf8');
      const identity = messages.get(definition.discoveryName);
      const tagline = messages.get(definition.tagline);
      assert.ok(identity && tagline, `${code} is missing ${definition.id} identity copy`);
      assert.ok(
        !html.includes(escapeHtml(`${identity} — ${tagline}`)),
        `${code}/${definition.route} renders "${identity} — ${tagline}" as one string`,
      );

      for (const attribute of [
        /<meta property="og:image:alt" content="([^"]*)">/,
        /<meta name="twitter:image:alt" content="([^"]*)">/,
        /<img src="\/social\/[^"]+\.svg"[^>]*\salt="([^"]*)"/,
      ]) {
        const rendered = decodeEntities(html.match(attribute)?.[1] ?? '');
        assert.equal(rendered, identity, `${code}/${definition.route} alt text is not the bare identity`);
      }

      for (const related of definition.discovery.related) {
        const entry = EXAMS.find(({ id }) => id === related);
        const pattern = new RegExp(
          `<h3><a data-sense6-route="${escapeRegex(related)}" href="/${escapeRegex(code)}/${escapeRegex(related)}/">([^<]*)</a></h3>`,
        );
        const label = decodeEntities(html.match(pattern)?.[1] ?? '');
        assert.equal(
          label,
          messages.get(entry.discoveryName),
          `${code}/${definition.route} related card for ${related} is not the bare identity`,
        );
      }

      const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}');
      const crumb = data['@graph'][1].itemListElement[1];
      // A bare brand noun ("Acutezza") has no catalog row and stays as written.
      const shortName = messages.get(definition.name) ?? definition.name;
      assert.equal(data['@graph'][0].name, identity, `${code}/${definition.route} application name`);
      assert.equal(crumb.name, shortName, `${code}/${definition.route} breadcrumb`);
      assert.ok(
        crumb.name.length < identity.length,
        `${code}/${definition.route} breadcrumb "${crumb.name}" is not shorter than the identity`,
      );
    }
  }
});

test('the shared gallery and About renderers are exactly what shipped in every locale', async () => {
  for (const { code: locale } of LOCALES) {
    const messages = await loadMessages(locale);
    const translate = (source, values = {}) =>
      interpolateMessage(messages.get(source) ?? source, values, locale);
    if (isLearnPublished(locale)) await prepareLearnLocale(locale);
    const gallery = galleryMarkup({
      exams: EXAMS,
      locale,
      localeHref: (route) => `/${locale}/${route ? `${route}/` : ''}`,
      m: (id) => translate(messageSource(id)),
      t: translate,
      learnInfo: isLearnPublished(locale) && locale !== 'en' ? learnCatalog(locale) : null,
    });
    const galleryHtml = await readFile(new URL(`${locale}/index.html`, DIST), 'utf8');
    assert.ok(
      galleryHtml.includes(gallery),
      `${locale} gallery diverges from the renderer the runtime adopts`,
    );
    for (const definition of EXAMS) {
      assert.ok(
        !gallery.includes(escapeHtml(translate(definition.limit))),
        `${locale} gallery card for ${definition.id} repeats its interpretation limit`,
      );
    }

    const aboutHtml = await readFile(new URL(`${locale}/about/index.html`, DIST), 'utf8');
    assert.ok(
      aboutHtml.includes(aboutMarkup(locale, translate)),
      `${locale} About page diverges from the renderer the runtime adopts`,
    );
    for (const definition of EXAMS) {
      const identity = messages.get(definition.discoveryName);
      assert.ok(
        aboutHtml.includes(escapeHtml(identity)),
        `${locale} About page omits the localized ${definition.id} identity`,
      );
      if (locale !== 'en') {
        assert.ok(
          !aboutHtml.includes(`>${definition.name}<`),
          `${locale} About page ships the untranslated ${definition.id} name`,
        );
      }
    }
    assert.equal(
      (aboutHtml.match(/href="https:\/\/github\.com\/Ponchia" rel="me noreferrer"/g) ?? []).length,
      2,
      `${locale} About page must link both authorship references to the public creator profile`,
    );
    assert.equal(
      (aboutHtml.match(/href="mailto:privacy@sense6\.net"/g) ?? []).length,
      1,
      `${locale} About page must expose one corrections channel`,
    );
  }
});

test('the site root stays a concise x-default language gateway', async () => {
  const html = await readFile(new URL('index.html', DIST), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/sense6\.net\/">/);
  assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, LOCALES.length + 1);
  assert.match(html, /Experimental, device-relative perception exercises for curiosity/);
  assert.doesNotMatch(html, /static-boundary-list/);
  for (const { code, languageTag } of LOCALES) {
    assert.ok(html.includes(`href="/${code}/" hreflang="${languageTag}"`), `missing ${code} entry`);
  }
});

test('sitemap, robots, llms index, and 404 match the registry', async () => {
  const redirects = await readFile(new URL('_redirects', DIST), 'utf8');
  assert.match(redirects, /^\/pt-BR\/\* \/pt-br\/:splat 301$/m);
  assert.match(redirects, /^\/zh-CN\/\* \/zh-hans\/:splat 301$/m);

  const sitemap = await readFile(new URL('sitemap.xml', DIST), 'utf8');
  const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/sense6\.net([^<]*)<\/loc>/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(sitemapPaths, expectedSitemapPaths);
  const sitemapDates = new Map(
    [
      ...sitemap.matchAll(
        /<url><loc>https:\/\/sense6\.net([^<]*)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g,
      ),
    ].map((match) => [match[1], match[2]]),
  );
  const expectedDates = new Map([
    ['/', CONTENT_DATES.site],
    ...LEARN_PUBLISHED_LOCALES.flatMap((locale) =>
      LEARN_ROUTES.map((route) => [routePath(locale, route), learnMetadata(route, locale).dateModified]),
    ),
    ...LOCALES.flatMap(({ code }) => [
      [routePath(code), CONTENT_DATES.site],
      ...EXAMS.map(({ route }) => [routePath(code, route), examContentDate(route)]),
      [routePath(code, 'about'), CONTENT_DATES.about],
    ]),
  ]);
  for (const path of expectedSitemapPaths) {
    assert.equal(sitemapDates.get(path), expectedDates.get(path), `${path} has a stale content date`);
  }
  const lastModified = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  assert.equal(
    lastModified.length,
    1 + LEARN_PUBLISHED_LOCALES.length * LEARN_ROUTES.length + LOCALES.length * (EXAMS.length + 2),
  );
  for (const date of lastModified) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(`${date}T00:00:00Z`) <= Date.now(), `future sitemap date: ${date}`);
  }

  const llmsIndex = await readFile(new URL('llms.txt', DIST), 'utf8');
  for (const locale of LEARN_PUBLISHED_LOCALES) {
    for (const route of LEARN_ROUTES) {
      assert.ok(
        llmsIndex.includes(`https://sense6.net/${locale}/${route}/`),
        `Text-discovery index omits ${locale}/${route}`,
      );
    }
  }

  const robots = await readFile(new URL('robots.txt', DIST), 'utf8');
  assert.ok(
    Date.now() <= Date.parse(`${CRAWLER_POLICY.reviewBy}T23:59:59Z`),
    'crawler policy review is overdue',
  );
  assert.match(
    robots,
    new RegExp(`Policy reviewed ${CRAWLER_POLICY.reviewedAt}; review by ${CRAWLER_POLICY.reviewBy}`),
  );
  assert.match(robots, /Sitemap: https:\/\/sense6\.net\/sitemap\.xml/);
  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
  assert.match(robots, /User-agent: ClaudeBot\nDisallow: \//);
  for (const { agent, allow } of CRAWLER_POLICY.rules) {
    assert.match(
      robots,
      new RegExp(`User-agent: ${escapeRegex(agent)}\\n${allow ? 'Allow' : 'Disallow'}: /`),
    );
  }

  const llms = await readFile(new URL('llms.txt', DIST), 'utf8');
  assert.match(llms, /not validated, certified, diagnostic, or intended to become a medical product/);
  assert.match(llms, /\[About Sense6 and its methodology\]\(https:\/\/sense6\.net\/en\/about\/\)/);
  assert.match(llms, /\[Private measurement journal\]\(https:\/\/sense6\.net\/en\/journal\/\)/);
  for (const { discoveryName, name, route } of EXAMS) {
    assert.match(
      llms,
      new RegExp(`\\[${escapeRegex(discoveryName ?? name)}\\]\\(https://sense6\\.net/en/${route}/\\)`),
    );
  }

  const notFound = await readFile(new URL('404.html', DIST), 'utf8');
  assert.match(notFound, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(notFound, /<script type="module"/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  assert.doesNotMatch(notFound, /property="og:/);
  assert.doesNotMatch(notFound, /name="twitter:/);

  const privacy = await readFile(new URL('en/privacy/index.html', DIST), 'utf8');
  assert.match(privacy, /<meta name="robots" content="noindex">/);
  assert.ok(!sitemapPaths.includes('/en/privacy/'));
  assert.match(privacy, /<!--email_off--><a href="mailto:privacy@sense6\.net">/);
  assert.match(privacy, /href="mailto:privacy@sense6\.net"/);
  assert.match(privacy, /href="https:\/\/www\.cloudflare\.com\/privacypolicy\/"/);

  const journal = await readFile(new URL('en/journal/index.html', DIST), 'utf8');
  assert.match(journal, /<meta name="robots" content="noindex">/);
  assert.ok(!sitemapPaths.includes('/en/journal/'));
  assert.match(journal, /Your private measurement journal/);
  assert.match(journal, /Entries, setup passports, comparisons, imports, and exports stay on this device/);

  const gallery = await readFile(new URL('en/index.html', DIST), 'utf8');
  assert.match(
    gallery,
    /Experimental perception tests for curiosity and fun—not medical tests or diagnoses\./,
  );

  const italianTetracromia = await readFile(new URL('it/tetracromia/index.html', DIST), 'utf8');
  assert.match(italianTetracromia, /Fonte del metodo/);
  assert.match(italianTetracromia, /Limite di interpretazione/);
  assert.doesNotMatch(italianTetracromia, />Method source</);

  const about = await readFile(new URL('en/about/index.html', DIST), 'utf8');
  const aboutJson = JSON.parse(
    about.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}',
  );
  assert.match(about, /Careful experiments\. Modest claims\./);
  assert.match(about, /No certification or formal validation is planned\./);
  assert.match(
    about,
    /created and maintained by <a href="https:\/\/github\.com\/Ponchia" rel="me noreferrer">Zeno<\/a>\./,
  );
  assert.match(
    about,
    /Questions and corrections can be sent to <a [^>]+>Zeno<\/a> at <!--email_off--><a href="mailto:privacy@sense6\.net">privacy@sense6\.net<\/a><!--\/email_off-->\./,
  );
  assert.doesNotMatch(about, /personal\.brontolotto\.observer/);
  assert.deepEqual(
    aboutJson['@graph'].map((entry) => entry['@type']),
    ['AboutPage', 'WebSite', 'Person'],
  );
  assert.equal(aboutJson['@graph'][2].url, 'https://github.com/Ponchia');
  assert.deepEqual(aboutJson['@graph'][2].sameAs, ['https://github.com/Ponchia']);
  assert.equal(aboutJson['@graph'][0].dateModified, CONTENT_DATES.about);
});

test('Tetracromia answers search intent consistently in every supported language', async () => {
  const definition = EXAMS.find(({ id }) => id === 'tetracromia');
  const searchIntent = STATIC_SEARCH_INTENT_COPY.tetracromia;
  assert.ok(definition?.discoveryName);
  assert.ok(searchIntent);

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    const html = await readFile(new URL(`${code}/tetracromia/index.html`, DIST), 'utf8');
    const identity = messages.get(definition.discoveryName);
    const intentHeading = messages.get(searchIntent.heading);
    const intentExplanation = messages.get(searchIntent.paragraphs[0]);
    const limit = messages.get(definition.limit);
    for (const [label, value] of [
      ['identity', identity],
      ['intent heading', intentHeading],
      ['intent explanation', intentExplanation],
      ['non-clinical limit', limit],
    ]) {
      assert.ok(value, `${code} is missing its Tetracromia ${label}`);
      assert.ok(html.includes(escapeHtml(value)), `${code} does not render its Tetracromia ${label}`);
    }

    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.+)<\/script>/)?.[1] ?? '{}');
    assert.equal(data['@graph'][0].name, identity);
    assert.equal(data['@graph'][1].itemListElement[1].name, messages.get(definition.name) ?? definition.name);
    assert.equal(data['@graph'][0].dateModified, CONTENT_DATES.exams.tetracromia);
    if (code !== 'en') {
      assert.notEqual(intentHeading, searchIntent.heading);
      assert.notEqual(limit, definition.limit);
    }
  }
});

test('static pages preload only the active route and requested supplemental locale graph', async () => {
  const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', DIST), 'utf8'));
  const supplementalFiles = Object.entries(manifest)
    .filter(([key]) => key.startsWith('src/locales/supplemental/'))
    .map(([, record]) => record.file);
  assert.equal(supplementalFiles.length, 6);

  for (const { code: locale } of LOCALES) {
    for (const route of [...EXAMS.map(({ route: examRoute }) => examRoute), ...UTILITY_ROUTES]) {
      const files = await activeRouteModuleFiles(locale, route);
      const html = await readFile(new URL(`${locale}/${route}/index.html`, DIST), 'utf8');
      assert.ok(files.length > 0, `${locale}/${route} must have an active route graph`);
      for (const file of files) {
        assert.match(
          html,
          new RegExp(`rel="modulepreload" crossorigin href="/${escapeRegex(file)}"`),
          `${locale}/${route} must preload ${file}`,
        );
      }
      const activeSupplemental = files.filter((file) => supplementalFiles.includes(file));
      const needsSupplemental =
        ['ar', 'hi', 'ja', 'ko', 'pt-br', 'zh-hans'].includes(locale) &&
        ['journal', 'privacy'].includes(route);
      assert.equal(
        activeSupplemental.length,
        needsSupplemental ? 1 : 0,
        `${locale}/${route} must preload only its requested supplemental locale chunk`,
      );
    }
  }

  const chooser = await readFile(new URL('index.html', DIST), 'utf8');
  const gallery = await readFile(new URL('en/index.html', DIST), 'utf8');
  assert.deepEqual(
    modulePreloadHrefs(chooser),
    modulePreloadHrefs(gallery),
    'the language chooser and gallery must contain only Vite entry preloads',
  );

  const englishPrivacy = await measureActiveRouteGraph('en', 'privacy');
  const arabicPrivacy = await measureActiveRouteGraph('ar', 'privacy');
  assert.ok(englishPrivacy.bytes > 0);
  assert.ok(arabicPrivacy.bytes > englishPrivacy.bytes, 'Arabic adds exactly its measured copy chunk');
});

test('Cloudflare headers and function routes stay fail-closed', async () => {
  const headers = await readFile(new URL('_headers', DIST), 'utf8');
  const rootBlock = headerBlock(headers, '/*');
  const csp = rootBlock.get('Content-Security-Policy') ?? '';
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
  ]) {
    assert.ok(csp.includes(directive), `CSP is missing ${directive}`);
  }
  assert.equal(rootBlock.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(rootBlock.get('Cross-Origin-Resource-Policy'), 'same-origin');
  assert.equal(
    rootBlock.get('Permissions-Policy'),
    'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  );
  assert.equal(rootBlock.get('Referrer-Policy'), 'no-referrer');
  assert.equal(rootBlock.get('Strict-Transport-Security'), 'max-age=31536000');
  assert.equal(rootBlock.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(rootBlock.get('X-Frame-Options'), 'DENY');

  assert.equal(headerBlock(headers, '/assets/*').get('Cache-Control'), 'public, max-age=31536000, immutable');
  for (const preview of ['https://sense6.pages.dev/*', 'https://:version.sense6.pages.dev/*']) {
    assert.equal(headerBlock(headers, preview).get('X-Robots-Tag'), 'noindex');
  }

  const routes = JSON.parse(await readFile(new URL('_routes.json', DIST), 'utf8'));
  assert.deepEqual(routes, { version: 1, include: ['/api/metric'], exclude: [] });
});

test('the entry bundle stays route-split and within its documented budget', async () => {
  // Generous raw-byte guardrails, not a mandate to refactor for a 2 KB change.
  // Real-world load/interaction budgets remain enforced by Lighthouse, while
  // Vite's import graph verifies route splitting and disallows runaway growth.
  const INITIAL_JS_BUDGET = 150_000;
  const ENTRY_CSS_BUDGET = 160_000;
  const ROUTE_CSS_BUDGET = 60_000;
  const COMBINED_CSS_BUDGET = 200_000;
  const files = await readdir(new URL('assets/', DIST));
  const initialGraph = await measureInitialLocaleGraph('en', DIST);
  assert.ok(
    // The tiny publication manifest is shared with the language switcher. The
    // actual article renderer and catalog must still be lazy, not startup JS.
    initialGraph.files.every(({ file }) => !/^assets\/learn-(?!publication-)[^/]+\.js$/.test(file)),
    'Learn articles must remain lazy-loaded, not part of the initial locale graph',
  );
  assert.ok(
    initialGraph.bytes <= INITIAL_JS_BUDGET,
    `initial English JS is ${initialGraph.bytes} bytes; budget is ${INITIAL_JS_BUDGET}; graph: ${initialGraph.files.map(({ file, bytes }) => `${file} (${bytes})`).join(', ')}`,
  );
  for (const { id } of EXAMS)
    assert.ok(
      files.some(
        (file) =>
          file.startsWith(`${id}-`) || (id === 'color-blindness' && file.startsWith('color-blindness-')),
      ),
    );

  const entryCss = files.find((file) => /^index-.+\.css$/.test(file));
  assert.ok(entryCss);
  const entryCssBytes = await sumSizes([entryCss]);
  assert.ok(
    entryCssBytes <= ENTRY_CSS_BUDGET,
    `entry CSS is ${entryCssBytes} bytes; budget is ${ENTRY_CSS_BUDGET}`,
  );
  const routeCss = files.filter((file) => file.endsWith('.css') && file !== entryCss);
  assert.ok(
    routeCss.some((file) => /^gallery-.+\.css$/.test(file)),
    'gallery CSS must remain route-scoped',
  );
  assert.ok(
    routeCss.some((file) => /^tetracromia-.+\.css$/.test(file)),
    'Tetracromia CSS must remain route-scoped',
  );
  const routeCssSizes = await Promise.all(
    routeCss.map(async (file) => [file, (await stat(new URL(`assets/${file}`, DIST))).size]),
  );
  for (const [file, bytes] of routeCssSizes) {
    assert.ok(bytes <= ROUTE_CSS_BUDGET, `${file} is ${bytes} bytes; budget is ${ROUTE_CSS_BUDGET}`);
  }
  assert.ok(
    entryCssBytes + Math.max(...routeCssSizes.map(([, bytes]) => bytes)) <= COMBINED_CSS_BUDGET,
    `entry CSS plus the largest route stylesheet exceeds ${COMBINED_CSS_BUDGET} bytes`,
  );

  const headers = await readFile(new URL('_headers', DIST), 'utf8');
  assert.match(headers, /https:\/\/sense6\.pages\.dev\/\*[\s\S]*X-Robots-Tag: noindex/);
  assert.equal((headers.match(/'sha256-/g) ?? []).length, 1);
  assert.ok(Math.max(...headers.split('\n').map((line) => line.length)) <= 2_000);
});

/*
 * A deleted copy key that the static generator still interpolates renders as the
 * literal string "undefined" in the crawlable HTML. Hydration overwrites it, so
 * it is invisible to every browser-driven check and visible only to crawlers,
 * no-JS visitors, and AI or social scrapers. `generate-static-pages.mjs` shipped
 * `escapeHtml(copy.noUncertainty)` after `noUncertainty` was removed from every
 * catalog, putting "undefined" into all 12 /journal/ pages, and build,
 * locales:check, test:static, test:html (vnu) and test:links all passed it: the
 * gates checked that copy was present, never what it said.
 *
 * This guard closes the class, not just the instance. It reads rendered text
 * only, because the tokens are legitimate elsewhere:
 *   - <script> blocks carry JSON-LD and the bundled app, where `undefined` and
 *     `NaN` are ordinary JavaScript and valid JSON values;
 *   - <style> blocks can contain them inside selectors or custom properties;
 *   - attributes and URLs (hrefs, srcs, integrity hashes, base64 data URIs) can
 *     contain the sequences incidentally.
 * So both element types are removed wholesale, then all remaining tags are
 * stripped, which discards every attribute value with them. What is left is what
 * a reader or a crawler actually reads.
 */
test('no generated page renders undefined, NaN, or a stringified object as text', async () => {
  const entries = await readdir(DIST, { recursive: true, withFileTypes: true });
  const pages = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => `${entry.parentPath}/${entry.name}`);
  assert.ok(pages.length >= 12, `expected the built locale pages, found ${pages.length}`);

  // `undefined` and `NaN` are bounded as whole words so that copy or an
  // identifier merely containing them cannot trip the gate.
  const forbidden = [/\bundefined\b/, /\bNaN\b/, /\[object [A-Z]\w*\]/];
  const offenders = [];
  for (const page of pages) {
    const html = await readFile(page, 'utf8');
    const text = decodeEntities(
      stripTags(
        html
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' '),
      ),
    );
    for (const pattern of forbidden) {
      const found = text.match(pattern);
      if (!found) continue;
      const at = text.indexOf(found[0]);
      offenders.push(
        `${page.replace(/^.*\/dist\//, 'dist/')}: ...${text.slice(Math.max(0, at - 70), at + 40)}...`,
      );
    }
  }
  assert.deepEqual(offenders, [], `unrendered values reached the crawlable HTML:\n${offenders.join('\n')}`);
});

async function sumSizes(files) {
  let total = 0;
  for (const file of files) total += (await stat(new URL(`assets/${file}`, DIST))).size;
  return total;
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Mirrors the escaping the static generator applies to every rendered string. */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeEntities(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/** The crawlable heading exactly as a reader sees it, markup and entities resolved. */
function headingText(html) {
  return decodeEntities(stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''));
}

function modulePreloadHrefs(html) {
  return [...html.matchAll(/<link rel="modulepreload"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
}

function assertBalanced(html, tag, path) {
  const opens = html.match(new RegExp(`<${tag}(?:\\s|>)`, 'g'))?.length ?? 0;
  const closes = html.match(new RegExp(`</${tag}>`, 'g'))?.length ?? 0;
  assert.equal(opens, closes, `${path} has unbalanced <${tag}> markup`);
}

function headerBlock(headers, route) {
  const lines = headers.split('\n');
  const start = lines.indexOf(route);
  assert.notEqual(start, -1, `missing _headers block for ${route}`);
  const entries = new Map();
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  ')) break;
    const separator = line.indexOf(':');
    assert.ok(separator > 2, `malformed header in ${route}: ${line}`);
    entries.set(line.slice(2, separator), line.slice(separator + 1).trim());
  }
  return entries;
}

test('production output carries the complete runtime and emitted-font license notices', async () => {
  const notice = await readFile(new URL('third-party-notices.txt', DIST), 'utf8');
  for (const source of [
    '../LICENSE',
    '../node_modules/@ponchia/ui/LICENSE',
    '../node_modules/@ponchia/ui/fonts/OFL.txt',
  ]) {
    const original = await readFile(new URL(source, import.meta.url), 'utf8');
    assert.ok(notice.includes(original), `the built site must preserve the complete notice from ${source}`);
  }
  const fonts = (await readdir(new URL('assets/', DIST))).filter((name) =>
    /\.(?:woff2?|ttf|otf|eot)$/i.test(name),
  );
  assert.ok(fonts.length > 0, 'this release includes font software');
  for (const font of fonts) assert.ok(notice.includes(`assets/${font}`), `${font} needs attribution`);
});
