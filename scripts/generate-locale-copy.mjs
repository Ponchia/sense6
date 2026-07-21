import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALE_CODES } from '../src/locale-metadata.js';
import { landingRows } from '../src/locales/landing-copy.js';
import { mobileUxRows } from '../src/locales/mobile-ux-copy.js';
import { registryRows } from '../src/locales/registry-copy.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT = join(ROOT, 'src/locales/generated');
const check = process.argv.includes('--check');
let stale = false;

for (const locale of LOCALE_CODES) {
  const rows = [...registryRows(locale), ...mobileUxRows(locale), ...landingRows(locale)];
  const content = `[\n${rows.map(formatRow).join(',\n')}\n]\n`;
  const output = join(OUTPUT, `${locale}.json`);
  if (check) {
    const existing = await readFile(output, 'utf8').catch(() => '');
    if (existing !== content) {
      console.error(`${output} is stale; run npm run locales:generate`);
      stale = true;
    }
  } else {
    await mkdir(OUTPUT, { recursive: true });
    await writeFile(output, content);
  }
}

if (stale) process.exitCode = 1;

/** @param {[string, string]} row */
function formatRow(row) {
  const compact = `[${JSON.stringify(row[0])}, ${JSON.stringify(row[1])}]`;
  if (compact.length + 2 <= 110) return `  ${compact}`;
  return `  [\n    ${JSON.stringify(row[0])},\n    ${JSON.stringify(row[1])}\n  ]`;
}
