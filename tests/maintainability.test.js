import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const LINE_CEILINGS = Object.freeze({
  'scripts/generate-static-pages.mjs': 520,
  'scripts/static-structured-data.mjs': 160,
  'src/exams/acutezza.js': 1_200,
  'src/exams/color-blindness.js': 960,
  'src/exams/riflessi.js': 1_180,
  'src/exams/tetracromia.js': 1_050,
  'src/exams/udito.js': 1_180,
  'src/exams/views/acutezza-results.js': 180,
  'src/exams/views/udito-intro.js': 150,
  'src/styles/acutezza.css': 1_300,
  'src/styles/color-blindness.css': 900,
  'src/styles/riflessi.css': 1_120,
  'src/styles/riflessi-landing.css': 380,
  'src/styles/tetracromia.css': 750,
  'src/styles/tetracromia-landing.css': 350,
  'src/styles/udito.css': 1_400,
});

/**
 * How far a ceiling may sit above the file it governs.
 *
 * KNOWN LIMITATION: this is a self-editable ratchet. Nothing here stops a commit
 * from raising a ceiling by the same number of lines it adds, because the
 * comparison is against a value in the same diff. Closing that would mean
 * comparing against the pull request's base revision, which a unit test has no
 * access to; the honest fix is a CI step that diffs LINE_CEILINGS against the
 * base ref and fails when a ceiling rises. Until then, the slack bound below at
 * least stops a ceiling drifting far above reality and banking headroom for
 * later — the current worst case is 61 lines of headroom.
 */
const MAX_CEILING_SLACK = 80;

test('known large modules cannot grow past their decomposition ceilings', async () => {
  for (const [path, ceiling] of Object.entries(LINE_CEILINGS)) {
    const content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    const lines = content.split('\n').length;
    assert.ok(
      lines <= ceiling,
      `${path} has ${lines} lines; extract a focused module instead of raising the ${ceiling}-line ceiling`,
    );
    assert.ok(
      ceiling - lines <= MAX_CEILING_SLACK,
      `${path} has ${lines} lines against a ${ceiling}-line ceiling. Lower the ceiling to within ` +
        `${MAX_CEILING_SLACK} lines so it cannot bank headroom for a future commit.`,
    );
  }
});
