import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXAMS } from '../src/exams/registry.js';
import { LOCALES, loadMessages } from '../src/locales.js';
import { privacyCopy, privacyHtml } from '../src/privacy.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const ORIGIN = 'https://sense6.net';
const template = await readFile(join(DIST, 'index.html'), 'utf8');
const canonicalPaths = ['/'];
const catalogs = new Map(
  await Promise.all(LOCALES.map(async ({ code }) => [code, await loadMessages(code)])),
);

await writePage('index.html', {
  locale: 'en',
  path: '/',
  title: 'Sense6 — choose your language',
  description:
    'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
  main: rootMarkup(),
  alternates: galleryAlternates(),
  structuredData: websiteData('en', '/'),
});

for (const { code: locale } of LOCALES) {
  const messages = await loadMessages(locale);
  const translate = (source) => messages.get(source) ?? source;
  const galleryPath = `/${locale}/`;
  canonicalPaths.push(galleryPath);
  await writePage(`${locale}/index.html`, {
    locale,
    path: galleryPath,
    title: translate('Sense6 — measure what your senses notice'),
    description: translate(
      'Sense6 offers short, careful browser perception tests with honest, screen-relative results. No account and no answers or results uploaded.',
    ),
    main: galleryMarkup(locale, translate),
    alternates: galleryAlternates(),
    structuredData: websiteData(locale, galleryPath),
  });

  for (const definition of EXAMS) {
    const path = `/${locale}/${definition.route}/`;
    canonicalPaths.push(path);
    await writePage(`${locale}/${definition.route}/index.html`, {
      locale,
      path,
      title: translate(definition.pageTitle),
      description: translate(definition.blurb),
      main: examMarkup(definition, locale, translate),
      alternates: pageAlternates(definition.route),
      structuredData: examData(definition, locale, path, translate),
    });
  }

  const copy = privacyCopy(locale);
  const privacyPath = `/${locale}/privacy/`;
  canonicalPaths.push(privacyPath);
  await writePage(`${locale}/privacy/index.html`, {
    locale,
    path: privacyPath,
    title: `${copy.title} | Sense6`,
    description: copy.intro,
    main: privacyMarkup(copy, locale),
    alternates: pageAlternates('privacy'),
    structuredData: webpageData(`${copy.title} | Sense6`, copy.intro, locale, privacyPath),
  });
}

await write404();
await writeDiscoveryFiles();

async function writePage(relativePath, page) {
  const json = JSON.stringify(page.structuredData);
  let html = localizeShell(template, page.locale);
  html = html.replace(/<html lang="[^"]+"/, `<html lang="${page.locale}"`);
  html = replaceTitle(html, page.title);
  html = replaceMeta(html, 'name', 'description', page.description);
  html = replaceMeta(html, 'property', 'og:title', page.title);
  html = replaceMeta(html, 'property', 'og:description', page.description);
  html = replaceMeta(html, 'property', 'og:url', `${ORIGIN}${page.path}`);
  html = html.replace(
    /<link rel="canonical" href="[^"]+"\s*\/?>/,
    `<link rel="canonical" href="${ORIGIN}${page.path}">`,
  );
  html = html.replace(
    '</head>',
    `${page.alternates}\n    <script type="application/ld+json">${json}</script>\n  </head>`,
  );
  html = html.replace('<div id="app"></div>', `<div id="app">${page.main}</div>`);
  const output = join(DIST, relativePath);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
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
    .replace('Anonymous daily counts · no cookies', escapeHtml(tr('Anonymous daily counts · no cookies')))
    .replace(
      '>Privacy<',
      `>${escapeHtml(privacyCopy(locale).title.replace(/ (at|chez|bei|en|na) Sense6$/, ''))}<`,
    )
    .replace('>All tests<', `>${escapeHtml(tr('All tests'))}<`)
    .replaceAll('href="/en/"', `href="/${locale}/"`)
    .replace('href="/en/privacy/"', `href="/${locale}/privacy/"`)
    .replace(
      `<select data-locale-select aria-label="${escapeAttribute(tr('Language'))}"></select>`,
      `<select data-locale-select aria-label="${escapeAttribute(tr('Language'))}">${LOCALES.map(
        ({ code, label }) => `<option value="${code}"${code === locale ? ' selected' : ''}>${label}</option>`,
      ).join('')}</select>`,
    );
}

function rootMarkup() {
  return `<section class="static-entry ui-container ui-container--wide">
    <p class="ui-eyebrow">Sense6</p>
    <h1>Measure what your senses notice.</h1>
    <p>Choose your language to read about private, device-relative perception experiments and open a test.</p>
    <nav class="static-language-list" aria-label="Language">${LOCALES.map(
      ({ code, label }) => `<a href="/${code}/" hreflang="${code}">${label}</a>`,
    ).join('')}</nav>
  </section>`;
}

function galleryMarkup(locale, tr) {
  return `<section class="static-entry ui-container ui-container--wide">
    <p class="ui-eyebrow">Sense6</p>
    <h1>${escapeHtml(tr('Sense6 — measure what your senses notice'))}</h1>
    <p>${escapeHtml(tr('Short, careful tests that turn what you notice into honest, device-relative results.'))}</p>
    <p>${escapeHtml(tr('No account, no answers or results uploaded, no diagnosis theatre.'))}</p>
    <h2>${escapeHtml(tr('Start with what you want to learn.'))}</h2>
    <div class="static-page-grid">${EXAMS.map(
      (definition) => `<article class="ui-card">
        <p class="ui-eyebrow">${escapeHtml(tr(definition.category))} · ${escapeHtml(definition.duration)}</p>
        <h3><a data-sense6-route="${definition.route}" href="/${locale}/${definition.route}/">${escapeHtml(definition.name)}</a></h3>
        <p>${escapeHtml(tr(definition.tagline))}</p>
        <p>${escapeHtml(tr(definition.blurb))}</p>
      </article>`,
    ).join('')}</div>
  </section>`;
}

function examMarkup(definition, locale, tr) {
  return `<article class="static-entry ui-container ui-container--wide" id="interactive-test">
    <a data-sense6-route="" href="/${locale}/">← ${escapeHtml(tr('All tests'))}</a>
    <header>
      <p class="ui-eyebrow">${escapeHtml(tr(definition.category))} · ${escapeHtml(definition.duration)}</p>
      <h1>${escapeHtml(definition.name)} — ${escapeHtml(tr(definition.tagline))}</h1>
      <p>${escapeHtml(tr(definition.blurb))}</p>
      <a class="ui-button" href="#interactive-test">${escapeHtml(tr('Open test'))}</a>
    </header>
    <section>
      <h2>${escapeHtml(tr('What this test includes'))}</h2>
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
          ([label, href]) =>
            `<li><a href="${escapeAttribute(href)}" rel="noreferrer">${escapeHtml(label)}</a></li>`,
        )
        .join('')}</ul>
    </section>
  </article>`;
}

function privacyMarkup(copy, locale) {
  return `<article class="static-entry ui-container">
    <a data-sense6-route="" href="/${locale}/">← ${escapeHtml(copy.back)}</a>
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

function galleryAlternates() {
  return `${LOCALES.map(
    ({ code }) => `<link rel="alternate" hreflang="${code}" href="${ORIGIN}/${code}/">`,
  ).join('\n    ')}\n    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;
}

function pageAlternates(route) {
  return `${LOCALES.map(
    ({ code }) => `<link rel="alternate" hreflang="${code}" href="${ORIGIN}/${code}/${route}/">`,
  ).join('\n    ')}\n    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/en/${route}/">`;
}

function websiteData(locale, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sense6',
    url: `${ORIGIN}${path}`,
    inLanguage: locale,
    description: 'Private, device-relative browser perception experiments.',
  };
}

function examData(definition, locale, path, tr) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: definition.name,
    url: `${ORIGIN}${path}`,
    description: tr(definition.blurb),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any modern browser',
    browserRequirements: 'JavaScript and a modern browser are required for the interactive experiment.',
    isAccessibleForFree: true,
    inLanguage: locale,
    citation: definition.sources.map(([, href]) => href),
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
    .map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  await writeFile(join(DIST, 'sitemap.xml'), sitemap);
  await writeFile(
    join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
  );
  const llms = `# Sense6\n\nSense6 is a privacy-first collection of device-relative browser perception experiments. It does not provide medical screening or diagnosis. Answers and results stay in the browser; the service stores only anonymous daily activity totals.\n\n## Main pages\n\n- [English test gallery](${ORIGIN}/en/)\n- [Privacy notice](${ORIGIN}/en/privacy/)\n\n## Experiments\n\n${EXAMS.map(
    (definition) =>
      `- [${definition.name}](${ORIGIN}/en/${definition.route}/): ${definition.blurb} ${definition.limit}`,
  ).join(
    '\n',
  )}\n\n## Research sources\n\n${EXAMS.flatMap((definition) => definition.sources.map(([label, href]) => `- ${definition.name}: [${label}](${href})`)).join('\n')}\n`;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
