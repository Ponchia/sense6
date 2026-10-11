import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { relatedGuideFor, relatedGuideMarkup } from '../src/exams/related-guide.js';
import { LEARN_PUBLISHED_LOCALES } from '../src/learn-publication.js';

const DIST = new URL('../dist/', import.meta.url);

test('every generated experiment landing links only to an actually published guide in its language', async () => {
  for (const exam of EXAMS) {
    for (const locale of LEARN_PUBLISHED_LOCALES) {
      const html = await readFile(new URL(`${locale}/${exam.route}/index.html`, DIST), 'utf8');
      const related = relatedGuideMarkup(exam.id, locale);
      const guide = relatedGuideFor(exam.id, locale);
      assert.ok(guide);
      assert.ok(html.includes(related), `${locale}/${exam.route} is missing its localized guide`);
      assert.match(related, /data-sense6-route="[a-z-]+"/);
      assert.ok(related.includes(`href="${guide.href}"`));
      assert.ok(html.includes(`href="${guide.href}"`));
    }
  }
});
