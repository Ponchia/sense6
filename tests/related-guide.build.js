import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXAMS } from '../src/exams/registry.js';
import { relatedGuideMarkup } from '../src/exams/related-guide.js';

const DIST = new URL('../dist/', import.meta.url);

test('crawlable experiment pages point to matching, genuinely published research guides', async () => {
  for (const exam of EXAMS) {
    for (const locale of ['en', 'de']) {
      const html = await readFile(new URL(`${locale}/${exam.route}/index.html`, DIST), 'utf8');
      const related = relatedGuideMarkup(exam.id, locale);
      if (related) {
        assert.ok(html.includes(related), `${locale}/${exam.route} missing related article`);
        assert.match(related, /data-sense6-route="[a-z-]+"/);
      } else {
        assert.ok(!html.includes('class="experiment-guide-link'), `${locale} false translation`);
      }
    }
  }
});
