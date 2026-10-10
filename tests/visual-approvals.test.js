import assert from 'node:assert/strict';
import test from 'node:test';
import { newVisualApprovals, parseVisualApprovals } from '../scripts/read-visual-approvals.mjs';

const home = 'en-mobile-chromium-linux.png  # First viewport research entry';
const colour = 'en-tetracromia-desktop-chromium-linux.png  # Research link beside methods';

test('only approvals introduced in this revision authorize visual differences', () => {
  assert.deepEqual(newVisualApprovals('', `${home}\n${colour}\n`), [
    'en-mobile-chromium-linux.png',
    'en-tetracromia-desktop-chromium-linux.png',
  ]);
  // Once merged into main, the approvals are inherited, not exemptions.
  assert.deepEqual(newVisualApprovals(`${home}\n${colour}\n`, `${home}\n${colour}\n`), []);
  assert.deepEqual(newVisualApprovals(`${home}\n`, `${home}\n${colour}\n`), [
    'en-tetracromia-desktop-chromium-linux.png',
  ]);
});

test('re-approval of an inherited screenshot needs a changed explanation', () => {
  assert.deepEqual(
    newVisualApprovals(home, 'en-mobile-chromium-linux.png # Updated to include Learn in hero'),
    ['en-mobile-chromium-linux.png'],
  );
  assert.deepEqual(
    newVisualApprovals(`${home}\n`, 'en-mobile-chromium-linux.png # First   viewport research entry\n'),
    [],
    'whitespace-only edits cannot approve a new difference',
  );
  assert.deepEqual(newVisualApprovals(`${home}\n${colour}`, `${colour}\n`), []);
});

test('approvals require valid screenshot names and a stated reason', () => {
  assert.deepEqual(
    [...parseVisualApprovals(`# Example\n\n${home}`)],
    [['en-mobile-chromium-linux.png', 'First viewport research entry']],
  );
  assert.throws(() => parseVisualApprovals('en-mobile-chromium-linux.png'), /screenshot name and reason/);
  assert.throws(() => parseVisualApprovals('en-mobile-chromium-linux.png # '), /screenshot name and reason/);
  assert.throws(() => parseVisualApprovals('not-an-image.png  # mistake'), /Invalid visual approval/);
  assert.throws(() => parseVisualApprovals(`${home}\n${home}`), /Duplicate visual approval/);
});

test('inherited approvals from earlier PRs cannot mask a new change', () => {
  const base = `# Previously reviewed\n${colour}\n`;
  const candidate = `# Carried over\n${colour}\n${home}\n`;
  assert.deepEqual(newVisualApprovals(base, candidate), ['en-mobile-chromium-linux.png']);
  assert.deepEqual(newVisualApprovals(candidate, candidate), []);
});
