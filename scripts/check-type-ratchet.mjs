import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const CONFIG_PATH = path.join(PROJECT_ROOT, 'jsconfig.json');
const STRICT_ROOTS = ['src/lib', 'src/exams/views', 'src/i18n', 'src/locales'];
const STRICT_FILES = [
  'src/crawler-policy.js',
  'src/exams/contracts.js',
  'src/exams/landing.js',
  'src/exams/registry.js',
  'src/i18n.js',
  'src/journal-copy.js',
  'src/locale-metadata.js',
  'src/locales.js',
  'src/metrics.js',
  'src/router.js',
];
const FORBIDDEN_ESCAPE =
  /@ts-(?:ignore|nocheck|expect-error)|@(?:type|param|returns|typedef)\s*\{[^}\n]*\bany\b/;

const compiler = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsc');
const listed = spawnSync(compiler, ['-p', CONFIG_PATH, '--listFilesOnly'], {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
});
if (listed.status !== 0) fail(listed.stderr || listed.stdout || 'Unable to list checked files.');
const checked = new Set(
  listed.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => path.resolve(file)),
);
const required = [
  ...STRICT_FILES.map((file) => path.join(PROJECT_ROOT, file)),
  ...STRICT_ROOTS.flatMap((directory) => javascriptFiles(path.join(PROJECT_ROOT, directory))),
];
const missing = required.filter((file) => !checked.has(path.resolve(file)));
if (missing.length) {
  fail(`Strict type coverage regressed:\n${missing.map(relative).join('\n')}`);
}

const escapes = required.filter((file) => FORBIDDEN_ESCAPE.test(readFileSync(file, 'utf8')));
if (escapes.length) {
  fail(`Strict files contain a forbidden type-check escape:\n${escapes.map(relative).join('\n')}`);
}

const lineCount = required.reduce(
  (total, file) => total + readFileSync(file, 'utf8').split(/\r?\n/).length,
  0,
);
console.log(`Strict typed-JavaScript ratchet · ${required.length} modules · ${lineCount} lines`);

/** @param {string} directory @returns {string[]} */
function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && target.endsWith('.js') ? [target] : [];
  });
}

/** @param {string} file */
function relative(file) {
  return path.relative(PROJECT_ROOT, file);
}

/** @param {string} message @returns {never} */
function fail(message) {
  throw new Error(message);
}
