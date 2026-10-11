import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aboutCopy, aboutMarkup } from '../src/about.js';
import { CONTENT_DATES, examContentDate } from '../src/content-dates.js';
import { CRAWLER_POLICY, renderRobots } from '../src/crawler-policy.js';
import { examDescriptionSource } from '../src/exams/metadata.js';
import { EXAMS } from '../src/exams/registry.js';
import { relatedGuideMarkup } from '../src/exams/related-guide.js';
import { SOURCE_ROLE_LABELS, sourcesFor } from '../src/exams/sources.js';
import { galleryMarkup } from '../src/gallery-markup.js';
import { messageSource } from '../src/i18n/message-ids.js';
import { interpolateMessage } from '../src/i18n.js';
import { journalCopy, prepareJournalCopy } from '../src/journal-copy.js';
import { learnCatalog, prepareLearnLocale } from '../src/learn-catalog.js';
import { isLearnPublished, LEARN_PUBLISHED_LOCALES } from '../src/learn-publication.js';
import { openGraphLocale } from '../src/locale-metadata.js';
import { LOCALES, loadMessages } from '../src/locales.js';
import { preparePrivacyCopy, privacyCopy, privacyMarkup } from '../src/privacy.js';
import { ROOT_GATEWAY, rootGatewayMarkup } from '../src/root-gateway.js';
import { createRouteMetadata, LEARN_ROUTES, SITE_ORIGIN, UTILITY_ROUTES } from '../src/routes.js';
import { ENGLISH_EXPLAINER_COPY, STATIC_SEARCH_INTENT_COPY } from '../src/static-discovery.js';
import { recordContentFingerprint, verifyContentFingerprints } from './content-fingerprints.mjs';
import { learnDiscoveryLinks, writeLearnPages } from './learn-pages.mjs';
import { aboutData, examData, webpageData, websiteData } from './static-structured-data.mjs';
import { activeRouteModuleFiles } from './vite-manifest.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const ORIGIN = SITE_ORIGIN;
const template = await readFile(join(DIST, 'index.html'), 'utf8');
const builtAssets = await readdir(join(DIST, 'assets'));
const routeStyles = indexRouteStyles(builtAssets);
const criticalDisplayFonts = new Map(
  [400, 700, 800].map((weight) => [weight, findCriticalDisplayFont(builtAssets, weight)]),
);
const canonicalPaths = [{ path: '/', lastModified: CONTENT_DATES.site }];
const examById = new Map(EXAMS.map((definition) => [definition.id, definition]));
const catalogs = new Map(
  await Promise.all(LOCALES.map(async ({ code }) => [code, await loadMessages(code)])),
);

await Promise.all(LEARN_PUBLISHED_LOCALES.map(prepareLearnLocale));

await writePage('index.html', {
  locale: 'en',
  languageTag: 'en',
  direction: 'ltr',
  route: '',
  path: '/',
  title: ROOT_GATEWAY.title,
  description: ROOT_GATEWAY.description,
  socialImage: '/social/sense6.png',
  socialImageAlt: ROOT_GATEWAY.socialImageAlt,
  main: rootGatewayMarkup(LOCALES),
  stylesheet: routeStyles.get('gallery'),
  alternates: galleryAlternates(),
  structuredData: websiteData('en'),
  preloadModules: false,
});

for (const { code: locale, languageTag, direction } of LOCALES) {
  const messages = await loadMessages(locale);
  const translate = (source, values = {}) =>
    interpolateMessage(messages.get(source) ?? source, values, locale);
  const galleryPath = `/${locale}/`;
  canonicalPaths.push({ path: galleryPath, lastModified: CONTENT_DATES.site });
  await writePage(`${locale}/index.html`, {
    locale,
    languageTag,
    direction,
    route: '',
    path: galleryPath,
    title: translate('Sense6 — measure what your senses notice'),
    description: translate(
      'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
    ),
    socialImage: '/social/sense6.png',
    socialImageAlt: translate(
      'Private browser tests for colour, response timing, and hearing. Answers and results stay in your browser.',
    ),
    main: galleryMarkup({
      exams: EXAMS,
      locale,
      localeHref: (route) => `/${locale}/${route ? `${route}/` : ''}`,
      m: (id) => translate(messageSource(id)),
      t: translate,
      learnInfo: locale !== 'en' && isLearnPublished(locale) ? learnCatalog(locale) : null,
    }),
    stylesheet: routeStyles.get('gallery'),
    alternates: galleryAlternates(),
    structuredData: websiteData(
      languageTag,
      translate(
        'Private browser tests for colour, response timing, and hearing. Answers and results stay in your browser.',
      ),
    ),
  });

  for (const definition of EXAMS) {
    const path = `/${locale}/${definition.route}/`;
    const description = translate(examDescriptionSource(definition, locale));
    canonicalPaths.push({ path, lastModified: examContentDate(definition.id) });
    await writePage(`${locale}/${definition.route}/index.html`, {
      locale,
      languageTag,
      direction,
      route: definition.route,
      path,
      title: translate(definition.pageTitle),
      description,
      socialImage: `/social/${definition.id}.png`,
      socialImageAlt: translate(definition.discoveryName ?? definition.name),
      main: examMarkup(definition, locale, translate),
      stylesheet: routeStyles.get(definition.id),
      alternates: pageAlternates(definition.route),
      structuredData: examData(definition, languageTag, path, translate, description),
    });
  }

  const about = aboutCopy(locale);
  const aboutPath = `/${locale}/about/`;
  canonicalPaths.push({ path: aboutPath, lastModified: CONTENT_DATES.about });
  await writePage(`${locale}/about/index.html`, {
    locale,
    languageTag,
    direction,
    route: 'about',
    path: aboutPath,
    title: about.pageTitle,
    description: about.description,
    socialImage: '/social/sense6.png',
    socialImageAlt: about.description,
    main: aboutMarkup(locale, translate),
    stylesheet: routeStyles.get('about'),
    alternates: pageAlternates('about'),
    structuredData: aboutData(about, languageTag, aboutPath),
  });

  await prepareJournalCopy(locale);
  const journal = journalCopy(locale);
  const journalPath = `/${locale}/journal/`;
  await writePage(`${locale}/journal/index.html`, {
    locale,
    languageTag,
    direction,
    route: 'journal',
    path: journalPath,
    title: `${journal.title} | Sense6`,
    description: journal.intro,
    socialImage: '/social/sense6.png',
    socialImageAlt: journal.intro,
    main: journalMarkup(journal, locale),
    stylesheet: routeStyles.get('journal'),
    alternates: pageAlternates('journal'),
    structuredData: webpageData(`${journal.title} | Sense6`, journal.intro, languageTag, journalPath),
    indexable: false,
  });

  await preparePrivacyCopy(locale);
  const copy = privacyCopy(locale);
  const privacyPath = `/${locale}/privacy/`;
  await writePage(`${locale}/privacy/index.html`, {
    locale,
    languageTag,
    direction,
    route: 'privacy',
    path: privacyPath,
    title: `${copy.title} | Sense6`,
    description: copy.intro,
    socialImage: '/social/sense6.png',
    socialImageAlt: copy.intro,
    main: privacyMarkup(copy, (route) => `/${locale}/${route ? `${route}/` : ''}`, locale),
    stylesheet: routeStyles.get('privacy'),
    alternates: pageAlternates('privacy'),
    structuredData: webpageData(`${copy.title} | Sense6`, copy.intro, languageTag, privacyPath),
    indexable: false,
  });
}

await writeLearnPages({ writePage, canonicalPaths, routeStyles });

await write404();
await writeDiscoveryFiles();
console.log(`Public-content freshness gate · ${await verifyContentFingerprints()} dated routes`);

async function writePage(relativePath, page) {
  const json = JSON.stringify(page.structuredData);
  const metadata = createRouteMetadata(page);
  recordContentFingerprint({ ...metadata, main: page.main, lastModified: page.lastModified });
  let html = localizeShell(template, page.locale);
  const routeFiles =
    page.preloadModules === false ? [] : await activeRouteModuleFiles(page.locale, page.route);
  const modulePreloads = routeFiles
    .filter((file) => !html.includes(`href="/${file}"`))
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">\n    `)
    .join('');
  html = replaceChecked(
    html,
    /<html lang="[^"]+"(?: dir="[^"]+")?/,
    `<html lang="${page.languageTag}" dir="${page.direction}"`,
    'document language and direction',
  );
  html = replaceTitle(html, metadata.title);
  html = replaceMeta(html, 'name', 'description', metadata.description);
  html = replaceMeta(html, 'property', 'og:title', metadata.title);
  html = replaceMeta(html, 'property', 'og:description', metadata.description);
  html = replaceMeta(
    html,
    'property',
    'og:type',
    LEARN_ROUTES.includes(page.route) && page.route !== 'learn' ? 'article' : 'website',
  );
  html = replaceMeta(html, 'property', 'og:url', metadata.canonical);
  html = replaceMeta(html, 'property', 'og:locale', openGraphLocale(page.locale));
  html = replaceMeta(html, 'property', 'og:image', metadata.socialImage);
  html = replaceMeta(html, 'property', 'og:image:alt', metadata.socialImageAlt);
  html = replaceMeta(html, 'name', 'twitter:title', metadata.title);
  html = replaceMeta(html, 'name', 'twitter:description', metadata.description);
  html = replaceMeta(html, 'name', 'twitter:image', metadata.socialImage);
  html = replaceMeta(html, 'name', 'twitter:image:alt', metadata.socialImageAlt);
  html = replaceChecked(
    html,
    /<link rel="canonical" href="[^"]+"\s*\/?>/,
    // Discover self-hosted Doto before the module script, not after it.
    `<link rel="canonical" href="${metadata.canonical}">
    ${displayFontPreload(page.locale, page.route)}`,
    'canonical link and early font preloads',
  );
  html = replaceChecked(
    html,
    '</head>',
    `    ${metadata.indexable ? '' : '<meta name="robots" content="noindex">\n    '}${modulePreloads}<link rel="stylesheet" crossorigin href="/assets/${page.stylesheet}">\n    ${page.alternates}\n    <script type="application/ld+json">${json}</script>\n  </head>`,
    'head insertion point',
  );
  html = replaceChecked(
    html,
    '<div id="app"></div>',
    `<div id="app">${page.main}</div>`,
    'static application mount',
  );
  const output = join(DIST, relativePath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
}

function displayFontPreload(locale, route) {
  if (['ar', 'hi', 'ja', 'ko', 'zh-hans'].includes(locale)) return '';
  // Udito's hydrated hero uses regular and bold Doto, while its static entry
  // and shell use 800. Discover all three before the hydration/font reflow.
  const weights = route === 'udito' ? [400, 700, 800] : [800];
  return weights
    .map(
      (weight) =>
        `<link rel="preload" href="/assets/${criticalDisplayFonts.get(weight)}" as="font" type="font/woff2" crossorigin>\n    `,
    )
    .join('');
}

function indexRouteStyles(assets) {
  const routeNames = ['gallery', 'learn', ...EXAMS.map(({ id }) => id), ...UTILITY_ROUTES];
  return new Map(
    routeNames.map((name) => {
      const pattern = new RegExp(`^${escapeRegExp(name)}-.+\\.css$`);
      const matches = assets.filter((asset) => pattern.test(asset));
      if (matches.length !== 1) {
        throw new Error(`Expected one generated stylesheet for ${name}, found ${matches.length}`);
      }
      return [name, matches[0]];
    }),
  );
}

function findCriticalDisplayFont(assets, weight) {
  const pattern = new RegExp(`^doto-${weight}-.+\\.woff2$`);
  const matches = assets.filter((asset) => pattern.test(asset));
  if (matches.length !== 1) {
    throw new Error(`Expected one generated Doto ${weight} font, found ${matches.length}`);
  }
  return matches[0];
}

function localizeShell(html, locale) {
  const catalog = catalogs.get(locale);
  if (!catalog) throw new Error(`Catalog ${locale} was not primed`);
  const tr = (source) => catalog.get(source) ?? source;
  let localized = html;
  for (const [source, replacement] of [
    ['Skip to content', tr('Skip to content')],
    ['Checking display…', tr('Checking display…')],
    ['Language', tr('Language')],
    ['Theme', tr('Theme')],
    ['Measure carefully. Keep it private.', tr('Measure carefully. Keep it private.')],
    ['About', tr('About')],
    ['Journal', tr('Journal')],
    ['Privacy', tr('Privacy')],
    ['All tests', tr('All tests')],
  ]) {
    localized = replaceChecked(
      localized,
      `>${source}<`,
      `>${escapeHtml(replacement)}<`,
      `shell message: ${source}`,
    );
  }
  for (const source of ['Sense6 — all tests', 'Language', 'Toggle light and dark theme']) {
    localized = replaceChecked(
      localized,
      ` aria-label="${source}"`,
      ` aria-label="${escapeAttribute(tr(source))}"`,
      `shell accessible label: ${source}`,
    );
  }
  localized = replaceChecked(localized, 'href="/en/"', `href="/${locale}/"`, 'gallery links', 2);
  if (locale !== 'en' && isLearnPublished(locale)) {
    localized = replaceChecked(
      localized,
      'data-sense6-english-only href="/en/learn/" lang="en">Learn</a>',
      `data-sense6-english-only href="/${locale}/learn/" lang="${locale}">${escapeHtml(learnCatalog(locale).ui.Learn)}</a>`,
      'Published Learn navigation',
    );
  } else if (locale !== 'en') {
    localized = replaceChecked(
      localized,
      'data-sense6-english-only href="/en/learn/"',
      `data-sense6-english-only hidden href="/${locale}/"`,
      'English-only research navigation',
    );
  }
  for (const route of UTILITY_ROUTES) {
    localized = replaceChecked(
      localized,
      `href="/en/${route}/"`,
      `href="/${locale}/${route}/"`,
      `${route} shell link`,
    );
  }
  const languageLabel = escapeAttribute(tr('Language'));
  return replaceChecked(
    localized,
    `<select data-locale-select aria-label="${languageLabel}" data-i18n-aria-label="Language"></select>`,
    `<select data-locale-select aria-label="${languageLabel}" data-i18n-aria-label="Language">${LOCALES.map(
      ({ code, languageTag, direction, label }) =>
        `<option value="${code}" lang="${languageTag}" dir="${direction}"${code === locale ? ' selected' : ''}>${label}</option>`,
    ).join('')}</select>`,
    'locale options',
  );
}

/*
 * One descriptor per identity string.
 *
 * `discoveryName` already carries brand plus descriptor, so the tagline that
 * used to be appended to the bare `name` now produces three descriptors in one
 * string ("Acutezza — Visual Sharpness Lab — Calibrated sharpness & nominal
 * contrast"). The localized `discoveryName` therefore stands alone wherever an
 * experiment labels itself: the <h1>, the social and figure alt text, the
 * related-experiment link, WebApplication.name, and llms.txt. The tagline stays
 * a separate element on gallery cards; the breadcrumb crumb uses the short
 * `name` (see scripts/static-structured-data.mjs).
 */
function examMarkup(definition, locale, tr) {
  const discoveryName = tr(definition.discoveryName ?? definition.name);
  const related = definition.discovery.related.map((id) => {
    const entry = examById.get(id);
    if (!entry) throw new Error(`Unknown related experiment: ${id}`);
    return entry;
  });
  const relatedGuide = relatedGuideMarkup(definition.id, locale);
  return `<article class="static-entry ui-container ui-container--wide" id="interactive-test">
    <a class="back-link" data-sense6-route="" href="/${locale}/"><span aria-hidden="true">←</span> ${escapeHtml(tr('All tests'))}</a>
    <header>
      <p class="ui-eyebrow">${escapeHtml(tr(definition.category))} · ${escapeHtml(tr('≈ {minutes} min', { minutes: definition.durationMinutes }))}</p>
      <h1>${escapeHtml(discoveryName)}</h1>
      <p>${escapeHtml(tr(definition.blurb))}</p>
      <a class="ui-button" href="#interactive-test">${escapeHtml(tr('Open test'))}</a>
    </header>
    <figure class="static-preview">
      <img src="/social/${definition.id}.svg" width="1200" height="630" alt="${escapeAttribute(discoveryName)}" loading="lazy">
    </figure>
    <section>
      <h2>${escapeHtml(tr('What this test includes'))}</h2>
      ${definition.discovery.paragraphs.map((paragraph) => `<p>${escapeHtml(tr(paragraph))}</p>`).join('')}
      <ul>${definition.facts.map((fact) => `<li>${escapeHtml(tr(fact))}</li>`).join('')}</ul>
    </section>
    ${searchIntentMarkup(ENGLISH_EXPLAINER_COPY[definition.id], (source) => source, locale === 'en')}
    ${searchIntentMarkup(STATIC_SEARCH_INTENT_COPY[definition.id], tr)}
    <section>
      <h2>${escapeHtml(tr('Method and limits'))}</h2>
      <p>${escapeHtml(tr(definition.limit))}</p>
    </section>
    <section>
      <h2>${escapeHtml(tr('Research trail'))}</h2>
      <ul>${sourcesFor(definition.id)
        .map(
          ({ label, href, role }) =>
            `<li><strong>${escapeHtml(tr(sourceRoleLabel(role)))}:</strong> <a href="${escapeAttribute(href)}" rel="noreferrer">${escapeHtml(label)}</a></li>`,
        )
        .join('')}</ul>
    </section>
    ${relatedGuide ? `${relatedGuide}\n    ` : ''}<section>
      <h2>${escapeHtml(tr('Start with what you want to learn.'))}</h2>
      <div class="static-page-grid">${related
        .map(
          (entry) => `<article class="ui-card">
            <h3><a data-sense6-route="${entry.route}" href="/${locale}/${entry.route}/">${escapeHtml(tr(entry.discoveryName ?? entry.name))}</a></h3>
            <p>${escapeHtml(tr(entry.blurb))}</p>
          </article>`,
        )
        .join('')}</div>
    </section>
  </article>`;
}

function searchIntentMarkup(searchIntent, tr, enabled = true) {
  if (!searchIntent || !enabled) return '';
  return `<section class="static-search-intent">
      <p class="ui-eyebrow">${escapeHtml(tr(searchIntent.eyebrow))}</p>
      <h2>${escapeHtml(tr(searchIntent.heading))}</h2>
      ${searchIntent.paragraphs.map((paragraph) => `<p>${escapeHtml(tr(paragraph))}</p>`).join('')}
    </section>`;
}

function journalMarkup(copy, locale) {
  return `<article class="static-entry ui-container">
    <a class="back-link" data-sense6-route="" href="/${locale}/"><span aria-hidden="true">←</span> ${escapeHtml(copy.back)}</a>
    <header><p class="ui-eyebrow">${escapeHtml(copy.eyebrow)}</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p></header>
    <aside><p><strong>${escapeHtml(copy.privacy)}</strong></p><ul>${Object.values(copy.exportDisclosure)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')}</ul><p>${escapeHtml(copy.empty)}</p></aside>
    <section><h2>${escapeHtml(copy.setup)}</h2><p>${escapeHtml(copy.reasonSetup)} ${escapeHtml(copy.reasonMinor)}</p></section>
    <section><h2>${escapeHtml(copy.measurements)}</h2><p>${escapeHtml(copy.comparable)} · ${escapeHtml(copy.caution)} · ${escapeHtml(copy.notComparable)}. ${escapeHtml(copy.modelInterval)}; ${escapeHtml(copy.bounded)}.</p></section>
  </article>`;
}

function galleryAlternates() {
  return `${LOCALES.map(
    ({ code, languageTag }) => `<link rel="alternate" hreflang="${languageTag}" href="${ORIGIN}/${code}/">`,
  ).join('\n    ')}\n    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;
}

function pageAlternates(route) {
  return `${LOCALES.map(
    ({ code, languageTag }) =>
      `<link rel="alternate" hreflang="${languageTag}" href="${ORIGIN}/${code}/${route}/">`,
  ).join('\n    ')}\n    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/en/${route}/">`;
}

async function write404() {
  let html = localizeShell(template, 'en');
  html = replaceTitle(html, 'Page not found | Sense6');
  html = replaceMeta(html, 'name', 'description', 'This Sense6 page does not exist.');
  html = replaceChecked(html, /\s*<link rel="canonical" href="[^"]+"\s*\/?>/, '', '404 canonical removal');
  html = html.replace(/\s*<meta\s+property="og:[^"]+"\s+content="[^"]*"\s*\/?>/g, '');
  html = html.replace(/\s*<meta\s+name="twitter:[^"]+"\s+content="[^"]*"\s*\/?>/g, '');
  html = replaceChecked(
    html,
    '</head>',
    '    <meta name="robots" content="noindex">\n  </head>',
    '404 head insertion point',
  );
  html = replaceChecked(
    html,
    '<div id="app"></div>',
    '<div id="app"><section class="static-entry ui-container"><p class="ui-eyebrow">404</p><h1>Page not found.</h1><p>The requested Sense6 page does not exist.</p><a href="/en/">All tests</a></section></div>',
    '404 application mount',
  );
  html = replaceChecked(html, /\s*<script type="module"[^>]*><\/script>/, '', '404 module script removal');
  await writeFile(join(DIST, '404.html'), html);
}

async function writeDiscoveryFiles() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${canonicalPaths
    .map(
      ({ path, lastModified }) =>
        `  <url><loc>${ORIGIN}${path}</loc>${lastModified ? `<lastmod>${lastModified}</lastmod>` : ''}</url>`,
    )
    .join('\n')}\n</urlset>\n`;
  await writeFile(join(DIST, 'sitemap.xml'), sitemap);
  await writeFile(join(DIST, 'robots.txt'), renderRobots(ORIGIN));
  const llms = `# Sense6\n\nSense6 is a privacy-first collection of experimental, device-relative browser perception tests made for curiosity and fun. It is not validated, certified, diagnostic, or intended to become a medical product. Answers and results stay in the browser; the service stores only anonymous daily activity totals.\n\n## Main pages\n\n- [English test gallery](${ORIGIN}/en/)\n${learnDiscoveryLinks(ORIGIN)}\n- [About Sense6 and its methodology](${ORIGIN}/en/about/)\n- [Private measurement journal](${ORIGIN}/en/journal/)\n- [Privacy notice](${ORIGIN}/en/privacy/)\n\n## Crawler policy\n\n${CRAWLER_POLICY.intent} The policy was reviewed on ${CRAWLER_POLICY.reviewedAt} and must be reviewed again by ${CRAWLER_POLICY.reviewBy}. robots.txt is advisory; llms.txt is a discovery aid, not an access-control mechanism.\n\n## Experiments\n\n${EXAMS.map(
    (definition) =>
      `- [${definition.discoveryName ?? definition.name}](${ORIGIN}/en/${definition.route}/): ${definition.blurb} ${definition.limit}`,
  ).join(
    '\n',
  )}\n\n## Research sources\n\n${EXAMS.flatMap((definition) => sourcesFor(definition.id).map(({ label, href, role }) => `- ${definition.discoveryName ?? definition.name} (${sourceRoleLabel(role)}): [${label}](${href})`)).join('\n')}\n`;
  await writeFile(join(DIST, 'llms.txt'), llms);
}

function replaceTitle(html, title) {
  return replaceChecked(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
    'document title',
  );
}

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*\\/?>`);
  return replaceChecked(
    html,
    pattern,
    `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`,
    `${key} metadata`,
  );
}

function replaceChecked(source, search, replacement, label, expected = 1) {
  const pattern =
    typeof search === 'string'
      ? new RegExp(escapeRegExp(search), 'g')
      : new RegExp(search.source, search.flags.includes('g') ? search.flags : `${search.flags}g`);
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== expected) {
    throw new Error(
      `Expected ${expected} ${label} match${expected === 1 ? '' : 'es'}, found ${matches.length}`,
    );
  }
  return source.replace(pattern, replacement);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}

function sourceRoleLabel(role) {
  return SOURCE_ROLE_LABELS[role];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
