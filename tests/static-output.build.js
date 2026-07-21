import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { measureInitialLocaleGraph } from '../scripts/vite-manifest.mjs';
import { CRAWLER_POLICY } from '../src/crawler-policy.js';
import { EXAMS } from '../src/exams/registry.js';
import { LOCALES } from '../src/locales.js';
import { routePath, UTILITY_ROUTES } from '../src/routes.js';

const DIST = new URL('../dist/', import.meta.url);
const expectedPaths = [
  '/',
  ...LOCALES.flatMap(({ code }) => [
    routePath(code),
    ...EXAMS.map(({ route }) => routePath(code, route)),
    ...UTILITY_ROUTES.map((route) => routePath(code, route)),
  ]),
];

test('every canonical route has substantive, localized raw HTML', async () => {
  const headers = await readFile(new URL('_headers', DIST), 'utf8');
  const titles = new Set();
  for (const path of expectedPaths) {
    const html = await readFile(new URL(path === '/' ? 'index.html' : `.${path}index.html`, DIST), 'utf8');
    const locale = path.split('/').filter(Boolean)[0] ?? 'en';
    const metadata = LOCALES.find(({ code }) => code === locale) ?? LOCALES[0];
    assert.match(html, new RegExp(`<html lang="${metadata.languageTag}" dir="${metadata.direction}"`), path);
    assert.match(html, /<h1[ >]/, path);
    assert.match(html, /<meta name="description" content="[^"].+">/, path);
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/sense6\.net\/social\/[^".]+\.png">/,
      path,
    );
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"\s*\/?>/, path);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://sense6\\.net${escapeRegex(path)}">`),
      path,
    );
    assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, LOCALES.length + 1, path);
    assert.match(html, /<script type="application\/ld\+json">.+<\/script>/, path);
    const displayFontPreload =
      /<link rel="preload" href="\/assets\/doto-800-[^"]+\.woff2" as="font" type="font\/woff2" crossorigin media="not \(prefers-reduced-data: reduce\)">/;
    if (['ar', 'hi', 'ja', 'ko', 'zh-hans'].includes(locale)) {
      assert.doesNotMatch(html, displayFontPreload, `${path} uses native script metrics instead of Doto`);
    } else {
      assert.match(html, displayFontPreload, `${path} must preload the above-fold display face`);
    }
    const stylesheet = path.split('/').filter(Boolean)[1] ?? 'gallery';
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
    const localizedTitle = `${locale}:${title}`;
    if (path !== '/') assert.ok(!titles.has(localizedTitle), `duplicate title within ${locale}: ${title}`);
    titles.add(localizedTitle);
  }
});

test('RTL static interpolation matches the runtime directional-isolate contract', async () => {
  const html = await readFile(new URL('ar/index.html', DIST), 'utf8');
  assert.match(html, /\u2068\d+\u2069/);
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
    assert.equal(data['@graph'][0].dateModified, '2026-07-21');
    assert.equal(data['@graph'][0].creator.url, 'https://personal.brontolotto.observer');
    assert.equal(data['@graph'][0].image, `https://sense6.net/social/${definition.id}.png`);
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
  assert.deepEqual(sitemapPaths, expectedPaths);
  const lastModified = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  assert.equal(lastModified.length, 1 + LOCALES.length * (EXAMS.length + 2));
  for (const date of lastModified) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(`${date}T00:00:00Z`) <= Date.now(), `future sitemap date: ${date}`);
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
  for (const { name, route } of EXAMS) {
    assert.match(llms, new RegExp(`\\[${escapeRegex(name)}\\]\\(https://sense6\\.net/en/${route}/\\)`));
  }

  const notFound = await readFile(new URL('404.html', DIST), 'utf8');
  assert.match(notFound, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(notFound, /<script type="module"/);

  const privacy = await readFile(new URL('en/privacy/index.html', DIST), 'utf8');
  assert.match(privacy, /<!--email_off--><a href="mailto:privacy@sense6\.net">/);
  assert.match(privacy, /href="mailto:privacy@sense6\.net"/);
  assert.match(privacy, /href="https:\/\/www\.cloudflare\.com\/privacypolicy\/"/);

  const journal = await readFile(new URL('en/journal/index.html', DIST), 'utf8');
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
  assert.match(about, /href="https:\/\/personal\.brontolotto\.observer" rel="author">Zeno<\/a>/);
  assert.deepEqual(
    aboutJson['@graph'].map((entry) => entry['@type']),
    ['AboutPage', 'WebSite', 'Person'],
  );
  assert.equal(aboutJson['@graph'][0].dateModified, '2026-07-19');
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
  const INITIAL_JS_BUDGET = 110_000;
  const ENTRY_CSS_BUDGET = 125_000;
  const ROUTE_CSS_BUDGET = 40_000;
  const COMBINED_CSS_BUDGET = 150_000;
  const files = await readdir(new URL('assets/', DIST));
  const initialGraph = await measureInitialLocaleGraph('en', DIST);
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
