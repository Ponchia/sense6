import assert from 'node:assert/strict';
import test from 'node:test';
import { learnPageData } from '../scripts/learn-structured-data.mjs';
import { learnMarkup, learnMetadata, learnPage } from '../src/learn.js';
import { LEARN_ROUTES } from '../src/routes.js';

test('English-only guides have original substantive answers, methods and references', () => {
  assert.deepEqual(LEARN_ROUTES, ['learn', 'tetrachromacy-guide', 'reaction-time-guide']);
  const descriptions = new Set();
  for (const route of LEARN_ROUTES) {
    const meta = learnMetadata(route);
    const content = learnPage(route);
    const html = learnMarkup(route);
    assert.equal(meta.title, content.metaTitle);
    assert.equal(meta.description, content.description);
    assert.match(html, /data-sense6-view="learn"/);
    assert.match(html, new RegExp(`data-sense6-route="${route}"`));
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    assert.ok(!descriptions.has(content.description), 'guide descriptions must be distinct');
    descriptions.add(content.description);
    const words = html
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    assert.ok(words.length > (route === 'learn' ? 130 : 500), `${route} is thin`);
    assert.ok(!html.includes('undefined') && !html.includes('NaN'));
    const schema = learnPageData(route);
    const record = schema['@graph'][0];
    assert.equal(record['@type'], route === 'learn' ? 'CollectionPage' : 'Article');
    assert.equal(record.url, `https://sense6.net/en/${route}/`);
    assert.equal(record.inLanguage, 'en');
    assert.equal(record.datePublished, route === 'learn' ? undefined : '2026-10-09');
    assert.equal(record.dateModified, '2026-10-09');
    assert.equal(record.author.name, 'Zeno');
    assert.equal(schema['@graph'][1]['@type'], 'BreadcrumbList');
    assert.equal(schema['@graph'][1].itemListElement.length, route === 'learn' ? 2 : 3);
  }
});

test('independent published research never claims validation of Sense6', () => {
  const tetra = learnPage('tetrachromacy-guide');
  const timing = learnPage('reaction-time-guide');
  assert.match(tetra.summary, /No ordinary RGB-screen test can demonstrate/);
  assert.match(timing.summary, /not an instrument-calibrated measurement/);
  for (const article of [tetra, timing]) {
    assert.equal(article.facts.length, 3);
    assert.ok(article.sections.length >= 4);
    assert.ok(article.sections.every((section) => section.paragraphs.length >= 2));
    assert.ok(article.sources.length >= 3);
    assert.ok(
      article.sources.every(({ role, title, href }) => role && title && /^https:\/\/|^\/en\//.test(href)),
    );
    assert.ok(article.sources.some(({ href }) => href.startsWith('https://doi.org/')));
    assert.ok(article.sources.some(({ role }) => role.includes('Sense6')));
  }
  const tetraHTML = learnMarkup('tetrachromacy-guide');
  assert.match(tetraHTML, /not a device calibration/);
  assert.match(tetraHTML, /href="\/en\/tetracromia\/"/);
  assert.match(learnMarkup('reaction-time-guide'), /href="\/en\/riflessi\/\?scope=signal"/);
  assert.equal(learnMetadata('wrong-guide'), null);
  assert.throws(() => learnMarkup('wrong-guide'), /Unknown/);
});
