import assert from 'node:assert/strict';
import test from 'node:test';

import { acutezzaIntroMarkup } from '../src/exams/views/acutezza-intro.js';
import { tetracromiaHomeMarkup } from '../src/exams/views/tetracromia-home.js';

const message = (id) => `message:${id}`;
const translate = (source) => source;

test('the Acutezza intro is a pure view with stable actions and sections', () => {
  const markup = acutezzaIntroMarkup({ setupQuality: 'measured' }, message);
  assert.match(markup, /data-action="ac-prepare"/);
  assert.match(markup, /message:nav\.allTests/);
  assert.match(markup, /Last run on this browser: <strong>measured<\/strong>/);
  assert.equal((markup.match(/class="ac-instrument-visual /g) ?? []).length, 3);
});

test('the Tetracromia home view renders the supplied phase contract', () => {
  const phases = [
    { id: 'threshold', number: '01', name: 'Threshold', trials: 14 },
    { id: 'field', number: '02', name: 'Field', trials: 12 },
    { id: 'sequence', number: '03', name: 'Sequence', trials: 3 },
  ];
  const markup = tetracromiaHomeMarkup(phases, translate, message, () => 'rgb(0 0 0)');
  assert.match(markup, /message:nav\.allTests/);
  assert.match(markup, /data-action="setup"/);
  assert.equal((markup.match(/class="test-card"/g) ?? []).length, 3);
  assert.equal((markup.match(/--bar-color:/g) ?? []).length, 28);
});
