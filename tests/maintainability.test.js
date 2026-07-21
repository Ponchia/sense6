import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const LINE_CEILINGS = Object.freeze({
  'scripts/generate-static-pages.mjs': 600,
  'src/exams/acutezza.js': 1_250,
  'src/exams/color-blindness.js': 1_000,
  'src/exams/riflessi.js': 1_250,
  'src/exams/tetracromia.js': 1_050,
  'src/exams/udito.js': 1_250,
  'src/styles/acutezza.css': 1_300,
  'src/styles/color-blindness.css': 900,
  'src/styles/riflessi.css': 1_400,
  'src/styles/tetracromia.css': 1_000,
  'src/styles/udito.css': 1_400,
});

test('known large modules cannot grow past their decomposition ceilings', async () => {
  for (const [path, ceiling] of Object.entries(LINE_CEILINGS)) {
    const content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    const lines = content.split('\n').length;
    assert.ok(
      lines <= ceiling,
      `${path} has ${lines} lines; extract a focused module instead of raising the ${ceiling}-line ceiling`,
    );
  }
});
