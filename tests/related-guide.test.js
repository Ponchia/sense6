import assert from 'node:assert/strict';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { relatedGuideFor, relatedGuideMarkup } from '../src/exams/related-guide.js';
import { LEARN_ROUTES } from '../src/routes.js';

test('only reviewed English guides are linked from matching experiments', () => {
  const guideRoutes = new Set();
  for (const exam of EXAMS) {
    const guide = relatedGuideFor(exam.id, 'en');
    const english = relatedGuideMarkup(exam.id, 'en');
    for (const locale of ['it', 'de', 'es', 'ar', 'ja']) {
      assert.equal(relatedGuideFor(exam.id, locale), null);
      assert.equal(relatedGuideMarkup(exam.id, locale), '', `${exam.id} invented a translation`);
    }
    if (!guide) {
      assert.equal(english, '', 'instruments without a reviewed guide do not invent one');
      continue;
    }
    assert.ok(LEARN_ROUTES.includes(guide.route));
    assert.ok(english.includes(guide.title));
    const route = english.match(/data-sense6-route="([^"]+)"/)?.[1];
    assert.ok(route && LEARN_ROUTES.includes(route), `${exam.id} linked an unpublished guide`);
    assert.match(english, new RegExp(`href="/en/${route}/"`));
    assert.match(english, /class="experiment-guide-link/);
    assert.match(english, /Related research explanation/);
    assert.ok(!guideRoutes.has(route), 'duplicated explanation for distinct experiments');
    guideRoutes.add(route);
  }
  assert.ok(guideRoutes.size >= 3, 'existing colour and reaction guides must stay connected');
});
