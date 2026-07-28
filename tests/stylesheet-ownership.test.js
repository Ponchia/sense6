import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const globalCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const tetracromiaCss = ['tetracromia-landing.css', 'tetracromia.css']
  .map((filename) => readFileSync(new URL(`../src/styles/${filename}`, import.meta.url), 'utf8'))
  .join('\n');
const uditoCss = readFileSync(new URL('../src/styles/udito.css', import.meta.url), 'utf8');

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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
