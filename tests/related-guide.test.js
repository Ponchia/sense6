import assert from 'node:assert/strict';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { relatedGuideFor, relatedGuideMarkup, relatedGuideResultLink } from '../src/exams/related-guide.js';
import localizedTitles from '../src/exams/related-guide-titles.json' with { type: 'json' };
import { learnCatalog, prepareLearnLocale } from '../src/learn-catalog.js';
import { isLearnPublished, LEARN_PUBLISHED_LOCALES, learnNavigationLabel } from '../src/learn-publication.js';
import { LEARN_ROUTES } from '../src/routes.js';

test('each published locale links every experiment to its actual reviewed guide title', async () => {
  const routes = new Set();
  assert.deepEqual(Object.keys(localizedTitles), LEARN_PUBLISHED_LOCALES);
  for (const locale of LEARN_PUBLISHED_LOCALES) {
    assert.equal(isLearnPublished(locale), true);
    await prepareLearnLocale(locale);
    const catalog = learnCatalog(locale);
    assert.deepEqual(Object.keys(localizedTitles[locale]).sort(), EXAMS.map((exam) => exam.id).sort());
    for (const exam of EXAMS) {
      const guide = relatedGuideFor(exam.id, locale);
      assert.ok(guide, `${locale}/${exam.id} must have a published guide`);
      assert.ok(LEARN_ROUTES.includes(guide.route));
      assert.equal(guide.title, catalog.content.articles[guide.route].title);
      assert.equal(guide.href, `/${locale}/${guide.route}/`);
      const landing = relatedGuideMarkup(exam.id, locale);
      assert.ok(landing.includes(`href="${guide.href}"`));
      assert.ok(landing.includes(`data-sense6-route="${guide.route}"`));
      assert.match(landing, /class="experiment-guide-link/);
      if (locale === 'en') assert.match(landing, /Related research explanation|Research, explained/);
      else assert.ok(landing.includes(learnNavigationLabel(locale)));

      const resultLink = relatedGuideResultLink(exam.id, locale, 'Understand the result', 'result-link');
      assert.ok(resultLink.includes(`href="${guide.href}"`));
      assert.ok(resultLink.includes('class="ui-link result-link"'));
      assert.ok(resultLink.includes(`data-sense6-route="${guide.route}"`));
      if (locale === 'en') assert.match(resultLink, />Understand the result →<\/a>/);
      routes.add(guide.route);
    }
  }
  assert.equal(routes.size, EXAMS.length);
});

test('unknown locale or instrument never produces a phantom research link', () => {
  assert.equal(relatedGuideFor('riflessi', 'unpublished'), null);
  assert.equal(relatedGuideMarkup('riflessi', 'unpublished'), '');
  assert.equal(relatedGuideResultLink('riflessi', 'unpublished', 'Example'), '');
  assert.equal(relatedGuideFor('unknown-exam', 'en'), null);
  assert.equal(relatedGuideMarkup('unknown-exam', 'en'), '');
  assert.equal(relatedGuideResultLink('unknown-exam', 'en', 'Example'), '');
});

test('existing English results retain their exact visible research actions', () => {
  assert.equal(
    relatedGuideResultLink('riflessi', 'en', 'Understand browser reaction timing', 'rx-limit__learn'),
    '<a class="ui-link rx-limit__learn" data-sense6-route="reaction-time-guide" href="/en/reaction-time-guide/">Understand browser reaction timing →</a>',
  );
});
