import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('every tracked nonvisual site audit is selected by the site-audit command', () => {
  const expected = readdirSync(new URL('../audits/', import.meta.url))
    .filter((file) => file.endsWith('.spec.js') && file !== 'visual-regression.spec.js')
    .sort();
  const command = packageJson.scripts['test:site-audit'];
  assert.equal(typeof command, 'string');
  for (const file of expected) {
    assert.match(command, new RegExp(`audits/${escapeRegex(file)}(?:\\s|$)`));
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
