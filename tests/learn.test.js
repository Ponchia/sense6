import assert from 'node:assert/strict';
import test from 'node:test';
import { learnPageData } from '../scripts/learn-structured-data.mjs';
import { learnMarkup, learnMetadata, learnPage } from '../src/learn.js';
import { LEARN_ROUTES } from '../src/routes.js';

test('English-only guides have original substantive answers, methods and references', () => {
  assert.deepEqual(LEARN_ROUTES, [
    'learn',
    'tetrachromacy-guide',
    'reaction-time-guide',
    'color-blindness-guide',
    'hearing-range-guide',
    'visual-acuity-guide',
  ]);
  const descriptions = new Set();
  for (const route of LEARN_ROUTES) {
    const meta = learnMetadata(route);
    const content = learnPage(route);
    const html = learnMarkup(route);
    assert.equal(meta.title, content.metaTitle);
    assert.equal(meta.description, content.description);
    const expectedImage =
      route === 'learn' ? '/social/sense6.png' : `/social/${content.experiment.route}.png`;
    assert.equal(meta.socialImage, expectedImage);
    assert.equal(
      meta.socialImageAlt,
      route === 'learn' ? content.description : `Sense6 experiment artwork: ${content.experiment.title}`,
    );
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
    assert.equal(record.datePublished, route === 'learn' ? undefined : content.publishedDate);
    assert.equal(record.dateModified, meta.dateModified);
    assert.equal(record.author.name, 'Zeno');
    assert.equal(record.image, route === 'learn' ? undefined : `https://sense6.net${expectedImage}`);
    assert.equal(schema['@graph'][1]['@type'], 'BreadcrumbList');
    assert.equal(schema['@graph'][1].itemListElement.length, route === 'learn' ? 2 : 3);
  }
});

test('every research short answer offers one direct, scope-preserving experiment link', () => {
  for (const route of LEARN_ROUTES.filter((name) => name !== 'learn')) {
    const article = learnPage(route);
    const html = learnMarkup(route);
    const target = article.experiment.href ?? `/en/${article.experiment.route}/`;
    const entry = `<a class="ui-link" data-learn-early-experiment href="${target}">`;
    assert.equal(
      (html.match(/data-learn-early-experiment/g) ?? []).length,
      1,
      `${route} should offer one early experiment link`,
    );
    assert.ok(html.includes(entry), `${route} does not preserve the experiment route/scope`);
    assert.ok(
      html.indexOf('class="learn-answer__try"') > html.indexOf('id="answer-title"') &&
        html.indexOf('class="learn-answer__try"') < html.indexOf('class="learn-contents"'),
      `${route} must offer the task after the answer, before the long reading`,
    );
    assert.ok(html.includes(article.experiment.hint), `${route} needs the truthful setup hint`);
    assert.ok(html.includes('class="learn-experiment"'), `${route} must retain the full task card`);
  }
});

test('all Learn sections link to specific declared source roles and navigation targets', () => {
  for (const route of LEARN_ROUTES.filter((name) => name !== 'learn')) {
    const article = learnPage(route);
    const html = learnMarkup(route);
    const sourceIds = article.sources.map((source) => source.id);
    assert.equal(new Set(sourceIds).size, sourceIds.length, `${route} has duplicate source IDs`);
    assert.ok(
      sourceIds.every((id) => /^[a-z][a-z0-9-]+$/.test(id)),
      `${route} has invalid IDs`,
    );
    assert.equal(
      (html.match(/class="learn-section-sources"/g) ?? []).length,
      article.sections.length,
      `${route} must link its source roles at every section`,
    );
    assert.equal(
      (html.match(/class="learn-contents"/g) ?? []).length,
      1,
      `${route} must have exactly one reading navigation`,
    );
    for (const [index, section] of article.sections.entries()) {
      const anchor = `learn-section-${index + 1}`;
      assert.ok(html.includes(`id="${anchor}"`), `${route} lacks ${anchor} target`);
      assert.ok(html.includes(`href="#${anchor}"`), `${route} lacks ${anchor} jump link`);
      assert.ok(section.sourceIds.length > 0, `${route} section ${index + 1} lacks sources`);
      assert.equal(
        new Set(section.sourceIds).size,
        section.sourceIds.length,
        `${route} section ${index + 1} repeats a reference`,
      );
      for (const id of section.sourceIds) {
        assert.ok(sourceIds.includes(id), `${route} section ${index + 1} has unknown ${id}`);
        assert.ok(html.includes(`href="#learn-source-${id}"`), `${route} lacks source jump ${id}`);
      }
    }
    for (const id of sourceIds) {
      assert.ok(html.includes(`id="learn-source-${id}"`), `${route} lacks cited source ${id}`);
    }
    assert.ok(html.includes('href="#research-sources"'), `${route} lacks source index jump`);
    assert.doesNotMatch(html, /onclick=|javascript:/i, `${route} should use native links only`);
  }
});

test('independent published research never claims validation of Sense6', () => {
  const tetra = learnPage('tetrachromacy-guide');
  const timing = learnPage('reaction-time-guide');
  const colourVision = learnPage('color-blindness-guide');
  const hearing = learnPage('hearing-range-guide');
  const visual = learnPage('visual-acuity-guide');
  assert.match(tetra.summary, /No ordinary RGB-screen test can demonstrate/);
  assert.match(timing.summary, /not an instrument-calibrated measurement/);
  assert.match(colourVision.summary, /cannot, by itself, confirm or rule out/);
  assert.match(hearing.summary, /not an audiogram/);
  assert.match(visual.summary, /cannot establish eye health/);
  for (const article of [tetra, timing, colourVision, hearing, visual]) {
    assert.equal(article.facts.length, 3);
    assert.ok(article.sections.length >= 4);
    assert.ok(article.sections.every((section) => section.paragraphs.length >= 2));
    assert.ok(article.sources.length >= 3);
    assert.ok(
      article.sources.every(({ role, title, href }) => role && title && /^https:\/\/|^\/en\//.test(href)),
    );
    assert.ok(article.sources.filter(({ href }) => href.startsWith('https://')).length >= 2);
    assert.ok(article.sources.some(({ role }) => role.includes('Sense6')));
  }
  const tetraHTML = learnMarkup('tetrachromacy-guide');
  assert.match(tetraHTML, /not a device calibration/);
  assert.match(tetraHTML, /href="\/en\/tetracromia\/"/);
  assert.match(learnMarkup('reaction-time-guide'), /href="\/en\/riflessi\/\?scope=signal"/);
  assert.match(learnMarkup('color-blindness-guide'), /href="\/en\/color-blindness\/"/);
  assert.match(learnMarkup('color-blindness-guide'), /National Eye Institute/);
  assert.match(learnMarkup('hearing-range-guide'), /href="\/en\/udito\/"/);
  assert.match(learnMarkup('hearing-range-guide'), /American Speech-Language-Hearing Association/);
  assert.match(learnMarkup('visual-acuity-guide'), /href="\/en\/acutezza\/"/);
  assert.match(learnMarkup('visual-acuity-guide'), /National Eye Institute/);
  assert.equal(learnMetadata('wrong-guide'), null);
  assert.throws(() => learnMarkup('wrong-guide'), /Unknown/);
});
