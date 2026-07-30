import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const globalCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const tetracromiaCss = ['tetracromia-landing.css', 'tetracromia.css']
  .map((filename) => readFileSync(new URL(`../src/styles/${filename}`, import.meta.url), 'utf8'))
  .join('\n');
const uditoCss = readFileSync(new URL('../src/styles/udito.css', import.meta.url), 'utf8');
const galleryCss = readFileSync(new URL('../src/styles/gallery.css', import.meta.url), 'utf8');
const galleryMarkupSource = readFileSync(new URL('../src/gallery-markup.js', import.meta.url), 'utf8');

test('Tetracromia owns its forced-colors selectors without an Udito route dependency', () => {
  for (const selector of [
    '.color-tile',
    '.field-choice',
    '.sequence-anchor',
    '.sequence-tile',
    '.calibration-steps > span',
    '.calibration-gradient',
  ]) {
    assert.match(tetracromiaCss, new RegExp(escapeRegex(selector)));
    assert.doesNotMatch(uditoCss, new RegExp(escapeRegex(selector)));
  }
  assert.match(tetracromiaCss, /@media \(forced-colors: active\)/);
  assert.match(tetracromiaCss, /forced-color-adjust: none/);
});

test('shared print rules live in global CSS and route CSS does not own them', () => {
  assert.match(globalCss, /@media print\s*{/);
  for (const selector of ['.site-chrome', '.ui-sitefooter', '.results-actions', '.results-view']) {
    assert.match(globalCss, new RegExp(escapeRegex(selector)));
  }
  assert.doesNotMatch(uditoCss, /@media print\s*{/);
});

test('Tetracromia hero selectors are route-namespaced', () => {
  assert.match(tetracromiaCss, /\.tetracromia-hero\s*{/);
  assert.doesNotMatch(tetracromiaCss, /(^|[,{]\s*)\.hero(?:\s|[,{.:>])/m);
  assert.doesNotMatch(globalCss, /(^|[,{]\s*)\.hero(?:\s|[,{.:>])/m);
});

/*
 * .exam-card__limit shipped as a class name with no rules at all: it reused
 * .exam-card__blurb, so each experiment's interpretation limit inherited body
 * copy and read as a third marketing paragraph, while the same sentence on exam
 * pages gets .hero__limit's mono face and accent ◇ marker. A caveat needs a
 * caveat affordance, and a class the gallery renders needs an owner.
 */
test('the gallery interpretation limit is styled as a caveat, not as blurb copy', () => {
  assert.match(galleryMarkupSource, /class="exam-card__limit"/);
  assert.doesNotMatch(
    galleryMarkupSource,
    /class="[^"]*exam-card__blurb[^"]*exam-card__limit/,
    'the limit must not reuse blurb styling',
  );
  assert.match(galleryCss, /\.exam-card__limit\s*{[^}]*font-family:\s*var\(--mono\)/);
  assert.match(galleryCss, /\.exam-card__limit-mark\s*{[^}]*color:\s*var\(--accent-text\)/);
  assert.match(galleryMarkupSource, /class="exam-card__limit-mark" aria-hidden="true"/);
  // Honest metrics, larger than most of the page: the caveat reads as a caveat
  // through face and marker, never by shrinking below the inherited size.
  assert.doesNotMatch(galleryCss, /\.exam-card__limit\s*(?:>\s*small\s*)?{[^}]*font-size/);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
