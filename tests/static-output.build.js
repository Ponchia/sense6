import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { LOCALES } from '../src/locales.js';

const DIST = new URL('../dist/', import.meta.url);
const expectedPaths = [
  '/',
  ...LOCALES.flatMap(({ code }) => [
    `/${code}/`,
    ...EXAMS.map(({ route }) => `/${code}/${route}/`),
    `/${code}/privacy/`,
  ]),
];

test('every canonical route has substantive, localized raw HTML', async () => {
  const headers = await readFile(new URL('_headers', DIST), 'utf8');
  const titles = new Set();
  for (const path of expectedPaths) {
    const html = await readFile(new URL(path === '/' ? 'index.html' : `.${path}index.html`, DIST), 'utf8');
    const locale = path.split('/').filter(Boolean)[0] ?? 'en';
    assert.match(html, new RegExp(`<html lang="${locale}"`), path);
    assert.match(html, /<h1[ >]/, path);
    assert.match(html, /<meta name="description" content="[^"].+">/, path);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://sense6\\.net${escapeRegex(path)}">`),
      path,
    );
    assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 7, path);
    assert.match(html, /<script type="application\/ld\+json">.+<\/script>/, path);
    assert.match(html, /<a[^>]+href="\/(?:en|it|de|fr|es|pt)\//, path);
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
    if (path !== '/') assert.ok(!titles.has(title), `duplicate localized title: ${title}`);
    titles.add(title);
  }
});

test('sitemap, robots, llms index, and 404 match the registry', async () => {
  const sitemap = await readFile(new URL('sitemap.xml', DIST), 'utf8');
  const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/sense6\.net([^<]*)<\/loc>/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(sitemapPaths, expectedPaths);

  const robots = await readFile(new URL('robots.txt', DIST), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/sense6\.net\/sitemap\.xml/);
  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
  assert.match(robots, /User-agent: ClaudeBot\nDisallow: \//);

  const llms = await readFile(new URL('llms.txt', DIST), 'utf8');
  for (const { name, route } of EXAMS) {
    assert.match(llms, new RegExp(`\\[${escapeRegex(name)}\\]\\(https://sense6\\.net/en/${route}/\\)`));
  }

  const notFound = await readFile(new URL('404.html', DIST), 'utf8');
  assert.match(notFound, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(notFound, /<script type="module"/);

  const privacy = await readFile(new URL('en/privacy/index.html', DIST), 'utf8');
  assert.match(privacy, /href="mailto:privacy@sense6\.net"/);
  assert.match(privacy, /href="https:\/\/www\.cloudflare\.com\/privacypolicy\/"/);
});

test('the entry bundle stays route-split and within its documented budget', async () => {
  const files = await readdir(new URL('assets/', DIST));
  const entry = files.find((file) => /^index-.+\.js$/.test(file));
  const english = files.find((file) => /^en-.+\.js$/.test(file));
  const metrics = files.find((file) => /^metrics-.+\.js$/.test(file));
  assert.ok(entry && english && metrics);
  const initialBytes = await sumSizes([entry, english, metrics]);
  assert.ok(initialBytes <= 110_000, `initial English JS is ${initialBytes} bytes; budget is 110000`);
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
  assert.ok(entryCssBytes <= 130_000, `entry CSS is ${entryCssBytes} bytes; budget is 130000`);
  const routeCss = files.filter((file) =>
    /^(acutezza|color-blindness|riflessi|udito|privacy)-.+\.css$/.test(file),
  );
  assert.equal(routeCss.length, 5);
  assert.ok(
    entryCssBytes +
      Math.max(
        ...(await Promise.all(
          routeCss.map(async (file) => (await stat(new URL(`assets/${file}`, DIST))).size),
        )),
      ) <=
      150_000,
    'entry CSS plus the largest route stylesheet exceeds 150000 bytes',
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
