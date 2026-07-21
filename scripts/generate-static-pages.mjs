import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ABOUT_DATE_MODIFIED, aboutCopy, aboutMarkup } from '../src/about.js';
import { CRAWLER_POLICY, renderRobots } from '../src/crawler-policy.js';
import { EXAMS } from '../src/exams/registry.js';
import { SOURCE_ROLE_LABELS } from '../src/exams/sources.js';
import { journalCopy } from '../src/journal-copy.js';
import { LOCALES, loadMessages } from '../src/locales.js';
import { privacyCopy, privacyHtml } from '../src/privacy.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const ORIGIN = 'https://sense6.net';
const SITE_DATE_MODIFIED = '2026-07-21';
const template = await readFile(join(DIST, 'index.html'), 'utf8');
const routeStyles = await indexRouteStyles();
const canonicalPaths = [{ path: '/', lastModified: SITE_DATE_MODIFIED }];
const examById = new Map(EXAMS.map((definition) => [definition.id, definition]));
const catalogs = new Map(
  await Promise.all(LOCALES.map(async ({ code }) => [code, await loadMessages(code)])),
);

await writePage('index.html', {
  locale: 'en',
  languageTag: 'en',
  direction: 'ltr',
  path: '/',
  title: 'Sense6 — choose your language',
  description:
    'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
  socialImage: '/social/sense6.png',
  socialImageAlt: 'Sense6 browser perception experiments',
  main: rootMarkup(),
  stylesheet: routeStyles.get('gallery'),
  alternates: galleryAlternates(),
  structuredData: websiteData('en'),
});

for (const { code: locale, languageTag, direction } of LOCALES) {
  const messages = await loadMessages(locale);
  const translate = (source, values = {}) =>
    Object.entries(values).reduce(
      (output, [key, value]) => output.replaceAll(`{${key}}`, String(value)),
      messages.get(source) ?? source,
    );
  const galleryPath = `/${locale}/`;
  canonicalPaths.push({ path: galleryPath, lastModified: SITE_DATE_MODIFIED });
  await writePage(`${locale}/index.html`, {
    locale,
    languageTag,
    direction,
    path: galleryPath,
    title: translate('Sense6 — measure what your senses notice'),
    description: translate(
      'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
    ),
    socialImage: '/social/sense6.png',
    socialImageAlt: translate(
      'Private browser tests for colour, response timing, and hearing. Answers and results stay in your browser.',
    ),
    main: galleryMarkup(locale, translate),
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
    canonicalPaths.push({ path, lastModified: SITE_DATE_MODIFIED });
    await writePage(`${locale}/${definition.route}/index.html`, {
      locale,
      languageTag,
      direction,
      path,
      title: translate(definition.pageTitle),
      description: translate(definition.blurb),
      socialImage: `/social/${definition.id}.png`,
      socialImageAlt: `${definition.name} — ${translate(definition.tagline)}`,
      main: examMarkup(definition, locale, translate),
      stylesheet: routeStyles.get(definition.id),
      alternates: pageAlternates(definition.route),
      structuredData: examData(definition, languageTag, path, translate),
    });
  }

  const about = aboutCopy(locale);
  const aboutPath = `/${locale}/about/`;
  canonicalPaths.push({ path: aboutPath, lastModified: ABOUT_DATE_MODIFIED });
  await writePage(`${locale}/about/index.html`, {
    locale,
    languageTag,
    direction,
    path: aboutPath,
    title: about.pageTitle,
    description: about.description,
    socialImage: '/social/sense6.png',
    socialImageAlt: about.description,
    main: aboutMarkup(locale),
    stylesheet: routeStyles.get('about'),
    alternates: pageAlternates('about'),
    structuredData: aboutData(about, languageTag, aboutPath),
  });

  const journal = journalCopy(locale);
  const journalPath = `/${locale}/journal/`;
  canonicalPaths.push({ path: journalPath });
  await writePage(`${locale}/journal/index.html`, {
    locale,
    languageTag,
    direction,
    path: journalPath,
    title: `${journal.title} | Sense6`,
    description: journal.intro,
    socialImage: '/social/sense6.png',
    socialImageAlt: journal.intro,
    main: journalMarkup(journal, locale),
    stylesheet: routeStyles.get('journal'),
    alternates: pageAlternates('journal'),
    structuredData: webpageData(`${journal.title} | Sense6`, journal.intro, languageTag, journalPath),
  });

  const copy = privacyCopy(locale);
  const privacyPath = `/${locale}/privacy/`;
  canonicalPaths.push({ path: privacyPath });
  await writePage(`${locale}/privacy/index.html`, {
    locale,
    languageTag,
    direction,
    path: privacyPath,
    title: `${copy.title} | Sense6`,
    description: copy.intro,
    socialImage: '/social/sense6.png',
    socialImageAlt: copy.intro,
    main: privacyMarkup(copy, locale),
    stylesheet: routeStyles.get('privacy'),
    alternates: pageAlternates('privacy'),
    structuredData: webpageData(`${copy.title} | Sense6`, copy.intro, languageTag, privacyPath),
  });
}

await write404();
await writeDiscoveryFiles();

async function writePage(relativePath, page) {
  const json = JSON.stringify(page.structuredData);
  let html = localizeShell(template, page.locale);
  html = html.replace(
    /<html lang="[^"]+"(?: dir="[^"]+")?/,
    `<html lang="${page.languageTag}" dir="${page.direction}"`,
  );
  html = replaceTitle(html, page.title);
  html = replaceMeta(html, 'name', 'description', page.description);
  html = replaceMeta(html, 'property', 'og:title', page.title);
  html = replaceMeta(html, 'property', 'og:description', page.description);
  html = replaceMeta(html, 'property', 'og:url', `${ORIGIN}${page.path}`);
  html = replaceMeta(html, 'property', 'og:image', `${ORIGIN}${page.socialImage}`);
  html = replaceMeta(html, 'property', 'og:image:alt', page.socialImageAlt);
  html = replaceMeta(html, 'name', 'twitter:title', page.title);
  html = replaceMeta(html, 'name', 'twitter:description', page.description);
  html = replaceMeta(html, 'name', 'twitter:image', `${ORIGIN}${page.socialImage}`);
  html = replaceMeta(html, 'name', 'twitter:image:alt', page.socialImageAlt);
  html = html.replace(
    /<link rel="canonical" href="[^"]+"\s*\/?>/,
    `<link rel="canonical" href="${ORIGIN}${page.path}">`,
  );
  html = html.replace(
    '</head>',
    `    <link rel="stylesheet" crossorigin href="/assets/${page.stylesheet}">\n    ${page.alternates}\n    <script type="application/ld+json">${json}</script>\n  </head>`,
  );
  html = html.replace('<div id="app"></div>', `<div id="app">${page.main}</div>`);
  const output = join(DIST, relativePath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
}

async function indexRouteStyles() {
  const assets = await readdir(join(DIST, 'assets'));
  const routeNames = ['gallery', ...EXAMS.map(({ id }) => id), 'about', 'journal', 'privacy'];
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

function localizeShell(html, locale) {
  const catalog = catalogs.get(locale);
  if (!catalog) throw new Error(`Catalog ${locale} was not primed`);
  const tr = (source) => catalog.get(source) ?? source;
  return html
    .replace('>Skip to content<', `>${escapeHtml(tr('Skip to content'))}<`)
    .replace('aria-label="Sense6 — all tests"', `aria-label="${escapeAttribute(tr('Sense6 — all tests'))}"`)
    .replace('>Checking display…<', `>${escapeHtml(tr('Checking display…'))}<`)
    .replace('>Language<', `>${escapeHtml(tr('Language'))}<`)
    .replace('aria-label="Language"', `aria-label="${escapeAttribute(tr('Language'))}"`)
    .replace(
      'aria-label="Toggle light and dark theme"',
      `aria-label="${escapeAttribute(tr('Toggle light and dark theme'))}"`,
    )
    .replace('>Theme<', `>${escapeHtml(tr('Theme'))}<`)
    .replace('Measure carefully. Keep it private.', escapeHtml(tr('Measure carefully. Keep it private.')))
    .replace('>About<', `>${escapeHtml(tr('About'))}<`)
    .replace('>Journal<', `>${escapeHtml(tr('Journal'))}<`)
    .replace('>Privacy<', `>${escapeHtml(tr('Privacy'))}<`)
    .replace('>All tests<', `>${escapeHtml(tr('All tests'))}<`)
    .replaceAll('href="/en/"', `href="/${locale}/"`)
    .replace('href="/en/about/"', `href="/${locale}/about/"`)
    .replace('href="/en/journal/"', `href="/${locale}/journal/"`)
    .replace('href="/en/privacy/"', `href="/${locale}/privacy/"`)
    .replace(
      `<select data-locale-select aria-label="${escapeAttribute(tr('Language'))}"></select>`,
      `<select data-locale-select aria-label="${escapeAttribute(tr('Language'))}">${LOCALES.map(
        ({ code, languageTag, direction, label }) =>
          `<option value="${code}" lang="${languageTag}" dir="${direction}"${code === locale ? ' selected' : ''}>${label}</option>`,
      ).join('')}</select>`,
    );
}

function rootMarkup() {
  return `<section class="static-entry ui-container ui-container--wide">
    <p class="ui-eyebrow">Sense6</p>
    <h1>Measure what your senses notice.</h1>
    <p>Choose your language to read about private, device-relative perception experiments and open a test.</p>
    <p><strong>Experimental perception tests for curiosity and fun—not medical tests or diagnoses.</strong></p>
    <nav class="static-language-list" aria-label="Language">${LOCALES.map(
      ({ code, languageTag, direction, label }) =>
        `<a href="/${code}/" hreflang="${languageTag}" lang="${languageTag}" dir="${direction}">${label}</a>`,
    ).join('')}</nav>
  </section>`;
}

function galleryMarkup(locale, tr) {
  return `<section class="static-entry ui-container ui-container--wide">
    <p class="ui-eyebrow">Sense6</p>
    <h1>${escapeHtml(tr('Sense6 — measure what your senses notice'))}</h1>
    <p>${escapeHtml(tr('Short, careful tests that turn what you notice into honest, device-relative results.'))}</p>
    <p>${escapeHtml(tr('No account, no answers or results uploaded.'))}</p>
    <p><strong>${escapeHtml(tr('Experimental perception tests for curiosity and fun—not medical tests or diagnoses.'))}</strong></p>
    <p><a data-sense6-route="about" href="/${locale}/about/">${escapeHtml(tr('How Sense6 works'))}</a></p>
    <h2>${escapeHtml(tr('Start with what you want to learn.'))}</h2>
    <div class="static-page-grid">${EXAMS.map(
      (definition) => `<article class="ui-card">
        <p class="ui-eyebrow">${escapeHtml(tr(definition.category))} · ${escapeHtml(tr('≈ {minutes} min', { minutes: definition.durationMinutes }))}</p>
        <h3><a data-sense6-route="${definition.route}" href="/${locale}/${definition.route}/">${escapeHtml(definition.name)}</a></h3>
        <p>${escapeHtml(tr(definition.tagline))}</p>
        <p>${escapeHtml(tr(definition.blurb))}</p>
      </article>`,
    ).join('')}</div>
  </section>`;
}

function examMarkup(definition, locale, tr) {
  const related = definition.discovery.related.map((id) => {
    const entry = examById.get(id);
    if (!entry) throw new Error(`Unknown related experiment: ${id}`);
    return entry;
  });
  return `<article class="static-entry ui-container ui-container--wide" id="interactive-test">
    <a class="back-link" data-sense6-route="" href="/${locale}/"><span aria-hidden="true">←</span> ${escapeHtml(tr('All tests'))}</a>
    <header>
      <p class="ui-eyebrow">${escapeHtml(tr(definition.category))} · ${escapeHtml(tr('≈ {minutes} min', { minutes: definition.durationMinutes }))}</p>
      <h1>${escapeHtml(definition.name)} — ${escapeHtml(tr(definition.tagline))}</h1>
      <p>${escapeHtml(tr(definition.blurb))}</p>
      <a class="ui-button" href="#interactive-test">${escapeHtml(tr('Open test'))}</a>
    </header>
    <figure class="static-preview">
      <img src="/social/${definition.id}.svg" width="1200" height="630" alt="${escapeAttribute(`${definition.name} — ${tr(definition.tagline)}`)}" loading="lazy">
    </figure>
    <section>
      <h2>${escapeHtml(tr('What this test includes'))}</h2>
      ${definition.discovery.paragraphs.map((paragraph) => `<p>${escapeHtml(tr(paragraph))}</p>`).join('')}
      <ul>${definition.facts.map((fact) => `<li>${escapeHtml(tr(fact))}</li>`).join('')}</ul>
    </section>
    <section>
      <h2>${escapeHtml(tr('Method and limits'))}</h2>
      <p>${escapeHtml(tr(definition.limit))}</p>
    </section>
    <section>
      <h2>${escapeHtml(tr('Research trail'))}</h2>
      <ul>${definition.sources
        .map(
          ({ label, href, role }) =>
            `<li><strong>${escapeHtml(tr(sourceRoleLabel(role)))}:</strong> <a href="${escapeAttribute(href)}" rel="noreferrer">${escapeHtml(label)}</a></li>`,
        )
        .join('')}</ul>
    </section>
    <section>
      <h2>${escapeHtml(tr('Start with what you want to learn.'))}</h2>
      <div class="static-page-grid">${related
        .map(
          (entry) => `<article class="ui-card">
            <h3><a data-sense6-route="${entry.route}" href="/${locale}/${entry.route}/">${escapeHtml(entry.name)} — ${escapeHtml(tr(entry.tagline))}</a></h3>
            <p>${escapeHtml(tr(entry.blurb))}</p>
          </article>`,
        )
        .join('')}</div>
    </section>
  </article>`;
}

function privacyMarkup(copy, locale) {
  return `<article class="static-entry ui-container">
    <a class="back-link" data-sense6-route="" href="/${locale}/"><span aria-hidden="true">←</span> ${escapeHtml(copy.back)}</a>
    <header><p class="ui-eyebrow">${escapeHtml(copy.eyebrow)}</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p><p>${escapeHtml(copy.updated)}</p></header>
    <aside><h2>${escapeHtml(copy.summaryTitle)}</h2><p>${escapeHtml(copy.summary)}</p></aside>
    ${copy.sections
      .map(
        (section) =>
          `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs
            .map((paragraph) => `<p>${privacyHtml(paragraph)}</p>`)
            .join('')}</section>`,
      )
      .join('')}
  </article>`;
}

function journalMarkup(copy, locale) {
  return `<article class="static-entry ui-container">
    <a class="back-link" data-sense6-route="" href="/${locale}/"><span aria-hidden="true">←</span> ${escapeHtml(copy.back)}</a>
    <header><p class="ui-eyebrow">${escapeHtml(copy.eyebrow)}</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p></header>
    <aside><p><strong>${escapeHtml(copy.privacy)}</strong></p><p>${escapeHtml(copy.empty)}</p></aside>
    <section><h2>${escapeHtml(copy.setup)}</h2><p>${escapeHtml(copy.reasonSetup)} ${escapeHtml(copy.reasonMinor)}</p></section>
    <section><h2>${escapeHtml(copy.measurements)}</h2><p>${escapeHtml(copy.comparable)} · ${escapeHtml(copy.caution)} · ${escapeHtml(copy.notComparable)}. ${escapeHtml(copy.noUncertainty)}; ${escapeHtml(copy.bounded)}.</p></section>
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

function websiteData(locale, description = 'Private, device-relative browser perception experiments.') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    name: 'Sense6',
    alternateName: 'Sense6 browser perception lab',
    url: ORIGIN,
    inLanguage: locale,
    description,
    image: `${ORIGIN}/social/sense6.png`,
    dateModified: SITE_DATE_MODIFIED,
    creator: {
      '@type': 'Person',
      '@id': `${ORIGIN}/#creator`,
      name: 'Zeno',
      url: 'https://personal.brontolotto.observer',
    },
  };
}

function aboutData(copy, locale, path) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${ORIGIN}${path}#page`,
        url: `${ORIGIN}${path}`,
        name: copy.pageTitle,
        description: copy.description,
        inLanguage: locale,
        dateModified: ABOUT_DATE_MODIFIED,
        about: { '@id': `${ORIGIN}/#website` },
        mainEntity: { '@id': `${ORIGIN}/#website` },
      },
      {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        name: 'Sense6',
        alternateName: 'Sense6 browser perception lab',
        url: ORIGIN,
        description: 'A privacy-first collection of experimental browser perception tests.',
        inLanguage: LOCALES.map(({ languageTag }) => languageTag),
        creator: { '@id': `${ORIGIN}/#creator` },
      },
      {
        '@type': 'Person',
        '@id': `${ORIGIN}/#creator`,
        name: 'Zeno',
        url: 'https://personal.brontolotto.observer',
      },
    ],
  };
}

function examData(definition, locale, path, tr) {
  const url = `${ORIGIN}${path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#application`,
        name: definition.name,
        url,
        description: tr(definition.blurb),
        applicationCategory: 'EducationalApplication',
        isAccessibleForFree: true,
        inLanguage: locale,
        image: `${ORIGIN}/social/${definition.id}.png`,
        dateModified: SITE_DATE_MODIFIED,
        creator: creatorData(),
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${ORIGIN}/#website`,
          name: 'Sense6',
          url: ORIGIN,
        },
        citation: definition.sources.map(({ href }) => href),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: tr('All tests'),
            item: `${ORIGIN}/${path.split('/')[1]}/`,
          },
          { '@type': 'ListItem', position: 2, name: definition.name, item: url },
        ],
      },
    ],
  };
}

function creatorData() {
  return {
    '@type': 'Person',
    '@id': `${ORIGIN}/#creator`,
    name: 'Zeno',
    url: 'https://personal.brontolotto.observer',
  };
}

function webpageData(name, description, locale, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${ORIGIN}${path}`,
    inLanguage: locale,
  };
}

async function write404() {
  let html = localizeShell(template, 'en');
  html = replaceTitle(html, 'Page not found | Sense6');
  html = replaceMeta(html, 'name', 'description', 'This Sense6 page does not exist.');
  html = html.replace('</head>', '    <meta name="robots" content="noindex">\n  </head>');
  html = html.replace(
    '<div id="app"></div>',
    '<div id="app"><section class="static-entry ui-container"><p class="ui-eyebrow">404</p><h1>Page not found.</h1><p>The requested Sense6 page does not exist.</p><a href="/en/">All tests</a></section></div>',
  );
  html = html.replace(/\s*<script type="module"[^>]*><\/script>/, '');
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
  const llms = `# Sense6\n\nSense6 is a privacy-first collection of experimental, device-relative browser perception tests made for curiosity and fun. It is not validated, certified, diagnostic, or intended to become a medical product. Answers and results stay in the browser; the service stores only anonymous daily activity totals.\n\n## Main pages\n\n- [English test gallery](${ORIGIN}/en/)\n- [About Sense6 and its methodology](${ORIGIN}/en/about/)\n- [Private measurement journal](${ORIGIN}/en/journal/)\n- [Privacy notice](${ORIGIN}/en/privacy/)\n\n## Crawler policy\n\n${CRAWLER_POLICY.intent} The policy was reviewed on ${CRAWLER_POLICY.reviewedAt} and must be reviewed again by ${CRAWLER_POLICY.reviewBy}. robots.txt is advisory; llms.txt is a discovery aid, not an access-control mechanism.\n\n## Experiments\n\n${EXAMS.map(
    (definition) =>
      `- [${definition.name}](${ORIGIN}/en/${definition.route}/): ${definition.blurb} ${definition.limit}`,
  ).join(
    '\n',
  )}\n\n## Research sources\n\n${EXAMS.flatMap((definition) => definition.sources.map(({ label, href, role }) => `- ${definition.name} (${sourceRoleLabel(role)}): [${label}](${href})`)).join('\n')}\n`;
  await writeFile(join(DIST, 'llms.txt'), llms);
}

function replaceTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*\\/?>`);
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeAttribute(value)}">`);
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
