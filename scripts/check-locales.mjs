import { auditCatalog } from '../src/i18n/catalog-audit.js';
import { MESSAGE_SOURCES } from '../src/i18n/message-ids.js';
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
}

if (audits.some((audit) => !audit.valid || audit.untranslated.length > 25)) process.exitCode = 1;

/** @param {string} label @param {string[]} values @param {boolean} showAll */
function reportList(label, values, showAll) {
  if (values.length === 0) return;
  const visible = showAll ? values : values.slice(0, 5);
  console.log(
    `  ${label}: ${visible.join(' · ')}${visible.length < values.length ? ` · … ${values.length - visible.length} more (use --details)` : ''}`,
  );
}
