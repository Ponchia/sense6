import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCatalog } from '../src/i18n/catalog-audit.js';
import { MESSAGE_SOURCES } from '../src/i18n/message-ids.js';
import { landingRows } from '../src/locales/landing-copy.js';
import { mobileUxRows } from '../src/locales/mobile-ux-copy.js';
import { registryRows } from '../src/locales/registry-copy.js';
import { DEFAULT_LOCALE, LOCALES } from '../src/locales.js';

const detailed = process.argv.includes('--details');
const json = process.argv.includes('--json');
const catalogs = await Promise.all(
  LOCALES.map(async ({ code }) => {
    const module = await import(`../src/locales/${code}.js`);
    return { code, messages: module.default, rowCount: module.MESSAGE_COUNT };
  }),
);
const english = catalogs.find(({ code }) => code === DEFAULT_LOCALE);
if (!english) throw new Error(`Default locale ${DEFAULT_LOCALE} has no catalog`);
const englishKeys = [...english.messages.keys()];
const deadSources = await findDeadSources(englishKeys);
const audits = catalogs.map(({ code, messages, rowCount }) =>
  auditCatalog({
    locale: code,
    catalog: messages,
    englishKeys,
    messageSources: MESSAGE_SOURCES,
    rowCount,
    defaultLocale: DEFAULT_LOCALE,
  }),
);

if (json) {
  console.log(JSON.stringify(audits, null, 2));
} else {
  console.log(`Sense6 locale catalogs · ${englishKeys.length} source messages · ${audits.length} locales`);
  for (const audit of audits) {
    const status = audit.valid ? 'valid' : 'invalid';
    console.log(
      `${audit.locale.padEnd(7)} ${audit.progress.toFixed(1).padStart(6)}% · ${String(audit.translated).padStart(4)}/${audit.total} translated · ${String(audit.untranslated.length).padStart(2)} source-equal · ${status}`,
    );
    reportList('missing', audit.missing, detailed);
    reportList('extra', audit.extra, detailed);
    reportList('empty', audit.empty, detailed);
    reportList('placeholder drift', audit.placeholderDrift, detailed);
    reportList('missing stable IDs', audit.missingStableIds, detailed);
    if (audit.duplicateRows) console.log(`  duplicate rows: ${audit.duplicateRows}`);
    if (audit.untranslated.length) reportList('source-equal', audit.untranslated, detailed);
  }
  reportList('dead source keys', deadSources, detailed);
}

if (audits.some((audit) => !audit.valid || audit.untranslated.length > 25) || deadSources.length) {
  process.exitCode = 1;
}

/** @param {string[]} catalogSources */
async function findDeadSources(catalogSources) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const files = [];
  await collectProductionFiles(join(root, 'src'), files);
  files.push(join(root, 'index.html'), join(root, 'scripts/generate-static-pages.mjs'));
  const searchable = (await Promise.all(files.map((file) => readFile(file, 'utf8'))))
    .join('\n')
    .replace(/\s+/g, ' ');
  const dynamicSources = new Set(
    [...registryRows('en'), ...mobileUxRows('en'), ...landingRows('en')].map(([source]) => source),
  );
  return catalogSources.filter(
    (source) => !dynamicSources.has(source) && !searchable.includes(source.replace(/\s+/g, ' ')),
  );
}

/** @param {string} directory @param {string[]} files */
async function collectProductionFiles(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'locales') await collectProductionFiles(path, files);
    } else if (path.endsWith('.js')) {
      files.push(path);
    }
  }
}

/** @param {string} label @param {string[]} values @param {boolean} showAll */
function reportList(label, values, showAll) {
  if (values.length === 0) return;
  const visible = showAll ? values : values.slice(0, 5);
  console.log(
    `  ${label}: ${visible.join(' · ')}${visible.length < values.length ? ` · … ${values.length - visible.length} more (use --details)` : ''}`,
  );
}
