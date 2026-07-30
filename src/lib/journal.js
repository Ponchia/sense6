import { examContract, isExamId } from '../exams/contracts.js';
import { legacyProtocolPassport, protocolPassport } from '../exams/protocols.js';
import { LOCALE_CODES } from '../locale-metadata.js';
import { resolveOptionalStorage } from './storage-access.js';

const FORMAT = 'sense6-journal';
const EXPORT_FORMAT = 'sense6-journal-export';
const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'sense6:journal';
const MAX_ENTRIES = 100;
const MAX_IMPORT_BYTES = 1_000_000;
const MAX_NOTES = 12;

const QUALITY = new Set(['usable', 'caution', 'limited']);
const BOUNDS = new Set(['lower', 'upper']);
/** @type {readonly (keyof ProtocolPassport)[]} */
const PROTOCOL_FIELDS = Object.freeze([
  'methodVersion',
  'profileId',
  'configDigest',
  'stimulusVersion',
  'estimator',
  'stoppingRule',
  'responsePolicy',
  'interruptionPolicy',
  'replayPolicy',
]);

/** @type {Readonly<Record<string, readonly string[]>>} */
export const JOURNAL_EXPORT_SCHEMA = Object.freeze({
  envelope: Object.freeze(['format', 'schemaVersion', 'exportedAt', 'entries']),
  entry: Object.freeze([
    'id',
    'examId',
    'recordedAt',
    'locale',
    'quality',
    'protocol',
    'setup',
    'qualityEvidence',
    'measurements',
    'notes',
  ]),
  protocol: PROTOCOL_FIELDS,
  // No experiment emits a combinable uncertainty: the acuity posterior publishes
  // a descriptive `lower`/`upper` model interval that deliberately excludes
  // geometry systematics, and every other instrument reports a bound or nothing.
  // Reading an older export that still carries an `uncertainty` field stays
  // safe — unknown measurement fields are ignored and dropped on import — so
  // removing it needs no schema version bump.
  measurement: Object.freeze(['id', 'value', 'unit', 'lower', 'upper', 'bound']),
});

/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
const JOURNAL_FIELD_DISCLOSURES = Object.freeze({
  envelope: Object.freeze({
    format: 'schema',
    schemaVersion: 'schema',
    exportedAt: 'exportTime',
    entries: 'measurements',
  }),
  entry: Object.freeze({
    id: 'identifiers',
    examId: 'identifiers',
    recordedAt: 'timestamps',
    locale: 'locale',
    quality: 'quality',
    protocol: 'protocol',
    setup: 'setup',
    qualityEvidence: 'quality',
    measurements: 'measurements',
    notes: 'notes',
  }),
  protocol: Object.freeze(Object.fromEntries(PROTOCOL_FIELDS.map((field) => [field, 'protocol']))),
  measurement: Object.freeze({
    id: 'measurements',
    value: 'measurements',
    unit: 'measurements',
    lower: 'measurements',
    upper: 'measurements',
    bound: 'measurements',
  }),
});

export const JOURNAL_DISCLOSURE_KEYS = Object.freeze([
  'schema',
  'exportTime',
  'identifiers',
  'timestamps',
  'locale',
  'protocol',
  'setup',
  'quality',
  'measurements',
  'notes',
  'idPurpose',
]);

for (const scope of Object.keys(JOURNAL_EXPORT_SCHEMA)) {
  const disclosed = JOURNAL_FIELD_DISCLOSURES[scope];
  const fields = JOURNAL_EXPORT_SCHEMA[scope];
  if (!fields) throw new Error(`Journal export schema scope ${scope} is unavailable`);
  for (const field of fields) {
    if (!disclosed?.[field]) throw new Error(`Journal export field ${scope}.${field} is not disclosed`);
  }
}
for (const disclosed of Object.values(JOURNAL_FIELD_DISCLOSURES).flatMap((scope) => Object.values(scope))) {
  if (!JOURNAL_DISCLOSURE_KEYS.includes(disclosed)) {
    throw new Error(`Journal disclosure category ${disclosed} has no public copy key`);
  }
}

/** @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void }} JournalStorage */
/** @typedef {{ id: string, value: number | null, unit: string, lower?: number, upper?: number, bound?: 'lower' | 'upper' }} JournalMeasurement */
/** @typedef {'saved' | 'invalid' | 'storage-unavailable'} JournalSaveOutcome */
/** @typedef {import('../exams/protocols.js').ProtocolPassport} ProtocolPassport */
/** @typedef {{ id: string, examId: string, recordedAt: string, locale: string, quality: 'usable' | 'caution' | 'limited', protocol: ProtocolPassport, setup: Record<string, string | number | boolean | null>, qualityEvidence: Record<string, string | number | boolean | null>, measurements: JournalMeasurement[], notes: string[] }} JournalEntry */
/** @typedef {Omit<JournalEntry, 'id' | 'recordedAt' | 'notes' | 'protocol' | 'qualityEvidence'> & { id?: string, recordedAt?: string | number | Date, notes?: string[], protocol?: ProtocolPassport, qualityEvidence?: Record<string, string | number | boolean | null> }} JournalEntryInput */
/** @typedef {'inaccessible' | 'malformed' | 'oversized' | 'future-schema' | 'empty' | 'ready'} JournalReadStatus */
/** @typedef {{ status: JournalReadStatus, entries: JournalEntry[], raw: string | null, writable: boolean }} JournalReadState */
/** @typedef {{ ok: true, additions: number, duplicates: number, discarded: number, evicted: number, total: number }} ImportSummary */
/** @typedef {{ ok: true, summary: ImportSummary, entries: JournalEntry[] }} ImportPlan */
/** @typedef {{ ok: false, reason: 'too-large' | 'malformed' | 'future' | 'invalid' | 'storage' | 'confirmation-required' | 'changed' }} ImportFailure */

/**
 * Create a portable, language-neutral journal entry.
 * @param {JournalEntryInput} value
 * @returns {JournalEntry | null}
 */
export function createJournalEntry(value) {
  return buildJournalEntry(value).entry;
}

/**
 * Build a journal entry and name the first schema violation when one exists.
 *
 * A rejected entry and a failed write are different problems: the first is a
 * defect in the experiment that produced the run, the second is a browser that
 * refuses local storage. Callers must not report them with the same message.
 * @param {JournalEntryInput} value
 * @returns {{ entry: JournalEntry, reason: null } | { entry: null, reason: string }}
 */
export function buildJournalEntry(value) {
  if (!isExamId(value.examId)) return { entry: null, reason: 'examId' };
  const candidate = {
    id: value.id ?? createId(),
    examId: value.examId,
    recordedAt: toIsoDate(value.recordedAt ?? new Date()),
    locale: value.locale,
    quality: value.quality,
    protocol: value.protocol ?? protocolPassport(value.examId),
    setup: value.setup,
    qualityEvidence: value.qualityEvidence ?? {},
    measurements: value.measurements,
    notes: value.notes ?? [],
  };
  const reason = journalEntryViolation(candidate);
  if (reason !== null) return { entry: null, reason };
  const entry = canonicalJournalEntry(candidate);
  return entry === null ? { entry: null, reason: 'canonical' } : { entry, reason: null };
}

/**
 * Record one finished run and report which of the two failure modes occurred.
 * @param {JournalEntryInput} value
 * @param {JournalStorage} [storage]
 * @returns {JournalSaveOutcome}
 */
export function saveJournalRun(value, storage) {
  const built = buildJournalEntry(value);
  if (built.entry === null) {
    console.error(
      `Sense6 rejected a ${String(value.examId)} journal entry: ${built.reason} failed validation.`,
      value,
    );
    return 'invalid';
  }
  return appendJournalEntry(built.entry, storage) ? 'saved' : 'storage-unavailable';
}

/** @param {JournalStorage} [storage] @returns {JournalEntry[]} */
export function loadJournal(storage) {
  return readJournalState(storage).entries;
}

/** @param {JournalEntry} entry @param {JournalStorage} [storage] */
export function appendJournalEntry(entry, storage) {
  const resolvedStorage = resolveOptionalStorage(storage);
  const canonical = canonicalJournalEntry(entry);
  if (!resolvedStorage || !canonical) return false;
  const journal = readJournal(resolvedStorage);
  if (!journal.writable) return false;
  const entries = journal.entries.filter((candidate) => candidate.id !== canonical.id);
  entries.unshift(canonical);
  return writeJournal(entries.slice(0, MAX_ENTRIES), resolvedStorage);
}

/** @param {string} id @param {JournalStorage} [storage] */
export function removeJournalEntry(id, storage) {
  const resolvedStorage = resolveOptionalStorage(storage);
  if (!resolvedStorage || typeof id !== 'string') return false;
  const journal = readJournal(resolvedStorage);
  if (!journal.writable) return false;
  return writeJournal(
    journal.entries.filter((entry) => entry.id !== id),
    resolvedStorage,
  );
}

/** @param {JournalStorage} [storage] */
export function clearJournal(storage) {
  const resolvedStorage = resolveOptionalStorage(storage);
  if (!resolvedStorage) return false;
  try {
    if (typeof resolvedStorage.removeItem === 'function') resolvedStorage.removeItem(STORAGE_KEY);
    else return writeJournal([], resolvedStorage);
    return true;
  } catch {
    return false;
  }
}

/** @param {JournalStorage} [storage] */
export function exportJournal(storage) {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      entries: loadJournal(storage),
    },
    null,
    2,
  );
}

/**
 * Preview a documented export without changing local storage. Existing IDs
 * win, making repeated imports idempotent.
 * @param {string} raw
 * @param {JournalStorage} [storage]
 * @returns {ImportSummary | ImportFailure}
 */
export function previewJournalImport(raw, storage) {
  const resolvedStorage = resolveOptionalStorage(storage);
  if (!resolvedStorage) return { ok: false, reason: 'storage' };
  const planned = planJournalImport(raw, resolvedStorage);
  return planned.ok === false ? planned : planned.summary;
}

/**
 * Commit a previously confirmed preview. Recompute it first so changed local
 * data cannot silently invalidate the counts that the person approved.
 * @param {string} raw
 * @param {JournalStorage} [storage]
 * @param {ImportSummary} [confirmedPreview]
 * @returns {ImportSummary | ImportFailure}
 */
export function importJournal(raw, storage, confirmedPreview) {
  const resolvedStorage = resolveOptionalStorage(storage);
  if (!resolvedStorage) return { ok: false, reason: 'storage' };
  const planned = planJournalImport(raw, resolvedStorage);
  if (planned.ok === false) return planned;
  if (!confirmedPreview) return { ok: false, reason: 'confirmation-required' };
  if (!sameImportSummary(planned.summary, confirmedPreview)) return { ok: false, reason: 'changed' };
  if (!writeJournal(planned.entries, resolvedStorage)) return { ok: false, reason: 'storage' };
  return planned.summary;
}

/** @param {string} raw @param {JournalStorage} storage @returns {ImportPlan | ImportFailure} */
function planJournalImport(raw, storage) {
  if (typeof raw !== 'string' || byteLength(raw) > MAX_IMPORT_BYTES)
    return { ok: false, reason: 'too-large' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (parsed?.format !== EXPORT_FORMAT || !Number.isInteger(parsed.schemaVersion))
    return { ok: false, reason: 'invalid' };
  if (parsed.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'future' };
  const migrated = migrateEntries(parsed.schemaVersion, parsed.entries);
  if (!migrated) {
    return { ok: false, reason: 'invalid' };
  }
  const journal = readJournal(storage);
  if (!journal.writable) return { ok: false, reason: 'storage' };
  const current = journal.entries;
  const known = new Set(current.map((entry) => entry.id));
  /** @type {JournalEntry[]} */
  const additions = [];
  let duplicates = 0;
  for (const entry of migrated) {
    if (known.has(entry.id)) {
      duplicates += 1;
      continue;
    }
    known.add(entry.id);
    additions.push(entry);
  }
  const entries = sortEntries([...current, ...additions]).slice(0, MAX_ENTRIES);
  const retained = new Set(entries.map((entry) => entry.id));
  const retainedAdditions = additions.filter((entry) => retained.has(entry.id)).length;
  const discarded = additions.length - retainedAdditions;
  const evicted = current.filter((entry) => !retained.has(entry.id)).length;
  return {
    ok: true,
    summary: {
      ok: true,
      additions: retainedAdditions,
      duplicates,
      discarded,
      evicted,
      total: entries.length,
    },
    entries,
  };
}

/** @param {ImportSummary} left @param {ImportSummary} right */
function sameImportSummary(left, right) {
  return (
    left.additions === right.additions &&
    left.duplicates === right.duplicates &&
    left.discarded === right.discarded &&
    left.evicted === right.evicted &&
    left.total === right.total
  );
}

/**
 * Compare the setup passports of two runs of the same instrument.
 * @param {JournalEntry} newer
 * @param {JournalEntry} older
 * @returns {{ status: 'comparable' | 'caution' | 'not-comparable', reasons: string[] }}
 */
export function compareJournalEntries(newer, older) {
  if (!isJournalEntry(newer) || !isJournalEntry(older) || newer.examId !== older.examId) {
    return { status: 'not-comparable', reasons: ['different-instrument'] };
  }
  if (isLegacyProtocol(newer.protocol) || isLegacyProtocol(older.protocol)) {
    return { status: 'not-comparable', reasons: ['legacy-protocol'] };
  }
  const protocolReasons = protocolDifferences(newer.protocol, older.protocol);
  if (protocolReasons.length) return { status: 'not-comparable', reasons: protocolReasons };
  const coverage = acutezzaCoverageDifferences(newer, older);
  if (coverage.hard.length) return { status: 'not-comparable', reasons: coverage.hard };
  const reasons = [...coverage.caution];
  const hard = hardSetupDifferences(newer, older);
  if (hard.length) return { status: 'not-comparable', reasons: hard };

  const policy = examContract(newer.examId)?.journal;
  if (!policy) return { status: 'not-comparable', reasons: ['unknown-instrument'] };
  for (const field of policy.caution) {
    if (!hasValue(newer.setup[field]) || !hasValue(older.setup[field])) reasons.push(`missing:${field}`);
    else if (newer.setup[field] !== older.setup[field]) reasons.push(`changed:${field}`);
  }
  reasons.push(...policy.alwaysCaution);
  if (
    policy.distanceTolerance &&
    setupDifferenceRatio(newer, older, policy.distanceTolerance.field) > policy.distanceTolerance.cautionRatio
  ) {
    reasons.push(`changed:${policy.distanceTolerance.field}`);
  }
  if (newer.quality !== 'usable' || older.quality !== 'usable') reasons.push('limited-run');
  return { status: reasons.length ? 'caution' : 'comparable', reasons };
}

/**
 * Calculate changes for measurements present in both entries. Positive means
 * the newer numeric value is larger; interpretation remains instrument-specific.
 *
 * A change carries no uncertainty. No instrument publishes a combinable
 * uncertainty, and a displayed model interval must never be relabelled as one.
 * @param {JournalEntry} newer
 * @param {JournalEntry} older
 */
export function measurementChanges(newer, older) {
  if (compareJournalEntries(newer, older).status === 'not-comparable') return [];
  const previous = new Map(older.measurements.map((measurement) => [measurement.id, measurement]));
  return newer.measurements.flatMap((measurement) => {
    const before = previous.get(measurement.id);
    if (
      !before ||
      measurement.unit !== before.unit ||
      !Number.isFinite(measurement.value) ||
      !Number.isFinite(before.value)
    )
      return [];
    return [
      {
        id: measurement.id,
        delta: /** @type {number} */ (measurement.value) - /** @type {number} */ (before.value),
        unit: measurement.unit,
        bounded: Boolean(measurement.bound || before.bound),
      },
    ];
  });
}

/** Capture non-identifying display conditions that affect browser measurements. */
export function captureDisplayPassport() {
  const screenWidth = globalThis.screen?.width ?? globalThis.innerWidth ?? 0;
  const screenHeight = globalThis.screen?.height ?? globalThis.innerHeight ?? 0;
  const dpr = globalThis.devicePixelRatio ?? 1;
  const gamut = globalThis.matchMedia?.('(color-gamut: p3)').matches
    ? 'p3'
    : globalThis.matchMedia?.('(color-gamut: srgb)').matches
      ? 'srgb'
      : 'unknown';
  return {
    display: `${screenWidth}x${screenHeight}@${dpr}`,
    viewport: `${globalThis.innerWidth ?? 0}x${globalThis.innerHeight ?? 0}`,
    gamut,
  };
}

export const JOURNAL_LIMITS = Object.freeze({ maxEntries: MAX_ENTRIES, maxImportBytes: MAX_IMPORT_BYTES });

/** @param {JournalEntry[]} entries @param {JournalStorage} storage */
function writeJournal(entries, storage) {
  try {
    const canonical = entries.map(canonicalJournalEntry);
    if (canonical.some((entry) => entry === null)) return false;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: FORMAT,
        schemaVersion: SCHEMA_VERSION,
        entries: sortEntries(/** @type {JournalEntry[]} */ (canonical)),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/** @param {JournalStorage} [storage] @returns {JournalReadState} */
export function readJournalState(storage) {
  const resolvedStorage = resolveOptionalStorage(storage);
  if (!resolvedStorage) {
    return { status: 'inaccessible', entries: [], raw: null, writable: false };
  }
  return readJournal(resolvedStorage);
}

/** @param {JournalStorage} storage @returns {JournalReadState} */
function readJournal(storage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'inaccessible', entries: [], raw: null, writable: false };
  }
  if (!raw) return { status: 'empty', entries: [], raw: null, writable: true };
  if (byteLength(raw) > MAX_IMPORT_BYTES) {
    return { status: 'oversized', entries: [], raw, writable: false };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed', entries: [], raw, writable: false };
  }
  if (parsed?.format !== FORMAT || !Number.isInteger(parsed.schemaVersion)) {
    return { status: 'malformed', entries: [], raw, writable: false };
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { status: 'future-schema', entries: [], raw, writable: false };
  }
  const entries = migrateEntries(parsed.schemaVersion, parsed.entries);
  if (!entries) return { status: 'malformed', entries: [], raw, writable: false };
  const sortedEntries = sortEntries(entries);
  return {
    status: sortedEntries.length ? 'ready' : 'empty',
    entries: sortedEntries,
    raw,
    writable: true,
  };
}

/** @param {unknown} value @returns {value is JournalEntry} */
function isJournalEntry(value) {
  return journalEntryViolation(value) === null;
}

/**
 * Name the first failing constraint, or null when the entry is valid.
 * Keeping the reason lets a caller log why a run was refused instead of
 * silently reporting it as a storage problem.
 * @param {unknown} value
 * @returns {string | null}
 */
function journalEntryViolation(value) {
  if (!isRecord(value)) return 'entry';
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 128) return 'id';
  if (typeof value.examId !== 'string' || !isExamId(value.examId)) return 'examId';
  if (typeof value.recordedAt !== 'string' || !isIsoDate(value.recordedAt)) return 'recordedAt';
  if (typeof value.locale !== 'string' || !LOCALE_CODES.has(value.locale)) return 'locale';
  if (typeof value.quality !== 'string' || !QUALITY.has(value.quality)) return 'quality';
  if (!validProtocol(value.protocol)) return 'protocol';
  if (!validSetup(value.setup)) return 'setup';
  if (!validEvidence(value.qualityEvidence)) return 'qualityEvidence';
  if (!Array.isArray(value.measurements) || value.measurements.length === 0) return 'measurements';
  if (value.measurements.length > 24) return 'measurements.length';
  const invalid = value.measurements.findIndex((measurement) => !isMeasurement(measurement));
  if (invalid !== -1) return `measurements[${invalid}]`;
  if (!Array.isArray(value.notes) || value.notes.length > MAX_NOTES) return 'notes';
  if (!value.notes.every((note) => typeof note === 'string' && note.length <= 100)) return 'notes';
  if (!validInstrumentEntry(value)) return 'completedEyes';
  return null;
}

/** @param {Record<string, unknown>} value */
function validInstrumentEntry(value) {
  if (value.examId !== 'acutezza') return true;
  const setup = /** @type {Record<string, unknown>} */ (value.setup);
  const hasCompletedEyes = Object.hasOwn(setup, 'completedEyes');
  const hasCompletionVariant = Object.hasOwn(setup, 'completionVariant');
  if (!hasCompletedEyes && !hasCompletionVariant) return true;
  if (!hasCompletedEyes || !hasCompletionVariant) return false;
  const completedEyes = parseCompletedEyes(setup.completedEyes);
  if (!completedEyes) return false;
  const expectedVariant = completedEyes.length === 2 ? 'both-eyes' : 'single-eye';
  if (setup.completionVariant !== expectedVariant) return false;
  const measuredEyes = measurementEyes(/** @type {JournalMeasurement[]} */ (value.measurements));
  return measuredEyes.length > 0 && sameValues(completedEyes, measuredEyes);
}

/** @param {unknown} value */
function validProtocol(value) {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).length === PROTOCOL_FIELDS.length &&
    PROTOCOL_FIELDS.every(
      (field) => typeof value[field] === 'string' && value[field].length > 0 && value[field].length <= 160,
    )
  );
}

/** @param {unknown} value @returns {value is JournalMeasurement} */
function isMeasurement(value) {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    /^[a-z0-9:-]{1,64}$/.test(value.id) &&
    (value.value === null || Number.isFinite(value.value)) &&
    typeof value.unit === 'string' &&
    value.unit.length <= 24 &&
    optionalFinite(value.lower) &&
    optionalFinite(value.upper) &&
    (value.bound === undefined || (typeof value.bound === 'string' && BOUNDS.has(value.bound))) &&
    !(
      typeof value.lower === 'number' &&
      Number.isFinite(value.lower) &&
      typeof value.upper === 'number' &&
      Number.isFinite(value.upper) &&
      value.lower > value.upper
    )
  );
}

/** @param {unknown} value */
function validSetup(value) {
  if (!isRecord(value) || Object.keys(value).length > 24) return false;
  return Object.entries(value).every(
    ([key, item]) =>
      /^[a-z][a-zA-Z0-9]{0,47}$/.test(key) &&
      (item === null || ['string', 'number', 'boolean'].includes(typeof item)) &&
      (typeof item !== 'string' || item.length <= 160) &&
      (typeof item !== 'number' || Number.isFinite(item)),
  );
}

/** @param {unknown} value */
function validEvidence(value) {
  return validScalarRecord(value, 32);
}

/** @param {unknown} value @param {number} maximumFields */
function validScalarRecord(value, maximumFields) {
  if (!isRecord(value) || Object.keys(value).length > maximumFields) return false;
  return Object.entries(value).every(
    ([key, item]) =>
      /^[a-z][a-zA-Z0-9]{0,47}$/.test(key) &&
      (item === null || ['string', 'number', 'boolean'].includes(typeof item)) &&
      (typeof item !== 'string' || item.length <= 160) &&
      (typeof item !== 'number' || Number.isFinite(item)),
  );
}

/** @param {ProtocolPassport} newer @param {ProtocolPassport} older */
function protocolDifferences(newer, older) {
  return PROTOCOL_FIELDS.flatMap((field) => (newer[field] === older[field] ? [] : [`changed:${field}`]));
}

/** @param {ProtocolPassport} protocol */
function isLegacyProtocol(protocol) {
  return protocol.profileId === 'legacy-exploratory' || protocol.methodVersion.includes('-v1-legacy');
}

/** @param {JournalEntry} newer @param {JournalEntry} older */
function acutezzaCoverageDifferences(newer, older) {
  if (newer.examId !== 'acutezza') return { hard: [], caution: [] };
  const newerEyes = completedEyesForComparison(newer);
  const olderEyes = completedEyesForComparison(older);
  if (newerEyes.length === 0 || olderEyes.length === 0) {
    return { hard: ['missing:completedEyes'], caution: [] };
  }
  if (!newerEyes.some((eye) => olderEyes.includes(eye))) {
    return { hard: ['no-common-eye'], caution: [] };
  }
  return sameValues(newerEyes, olderEyes)
    ? { hard: [], caution: [] }
    : { hard: [], caution: ['changed:completedEyes'] };
}

/** @param {JournalEntry} entry */
function completedEyesForComparison(entry) {
  const measuredEyes = measurementEyes(entry.measurements);
  if (measuredEyes.length) return measuredEyes;
  return parseCompletedEyes(entry.setup.completedEyes) ?? [];
}

/** @param {JournalMeasurement[]} measurements @returns {string[]} */
function measurementEyes(measurements) {
  const eyes = measurements.flatMap(({ id }) => {
    const match = /^(left|right)-/.exec(id);
    return match ? [match[1] ?? ''] : [];
  });
  return [...new Set(eyes)].filter(Boolean).sort();
}

/** @param {unknown} value @returns {string[] | null} */
function parseCompletedEyes(value) {
  if (typeof value !== 'string' || !['left', 'right', 'left,right'].includes(value)) return null;
  return value.split(',');
}

/** @param {string[]} left @param {string[]} right */
function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** @param {number} schemaVersion @param {unknown} entries @returns {JournalEntry[] | null} */
function migrateEntries(schemaVersion, entries) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) return null;
  if (schemaVersion === SCHEMA_VERSION) {
    if (!entries.every(isJournalEntry)) return null;
    return /** @type {JournalEntry[]} */ (entries.map(canonicalJournalEntry));
  }
  if (schemaVersion !== 1 || !entries.every(isLegacyJournalEntry)) return null;
  return /** @type {JournalEntry[]} */ (
    entries.map((entry) =>
      canonicalJournalEntry({
        ...entry,
        protocol: legacyProtocolPassport(
          /** @type {import('../exams/contracts.js').ExamId} */ (entry.examId),
        ),
        qualityEvidence: {},
        notes: entry.notes.includes('legacy-exploratory')
          ? entry.notes
          : [...entry.notes.slice(0, MAX_NOTES - 1), 'legacy-exploratory'],
      }),
    )
  );
}

/** @param {unknown} value @returns {JournalEntry | null} */
function canonicalJournalEntry(value) {
  if (!isJournalEntry(value)) return null;
  return {
    id: value.id,
    examId: value.examId,
    recordedAt: value.recordedAt,
    locale: value.locale,
    quality: value.quality,
    protocol: /** @type {ProtocolPassport} */ (
      Object.fromEntries(PROTOCOL_FIELDS.map((field) => [field, value.protocol[field]]))
    ),
    setup: canonicalScalarRecord(value.setup),
    qualityEvidence: canonicalScalarRecord(value.qualityEvidence),
    measurements: value.measurements.map(canonicalMeasurement),
    notes: [...value.notes],
  };
}

/** @param {JournalMeasurement} value @returns {JournalMeasurement} */
function canonicalMeasurement(value) {
  /** @type {JournalMeasurement} */
  const measurement = { id: value.id, value: value.value, unit: value.unit };
  if (value.lower !== undefined) measurement.lower = value.lower;
  if (value.upper !== undefined) measurement.upper = value.upper;
  if (value.bound !== undefined) measurement.bound = value.bound;
  return measurement;
}

/** @param {Record<string, string | number | boolean | null>} value */
function canonicalScalarRecord(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

/** @param {unknown} value */
function isLegacyJournalEntry(value) {
  if (!isRecord(value)) return false;
  return isJournalEntry({
    ...value,
    protocol:
      typeof value.examId === 'string' && isExamId(value.examId) ? legacyProtocolPassport(value.examId) : {},
    qualityEvidence: {},
  });
}

/** @param {JournalEntry} newer @param {JournalEntry} older */
function hardSetupDifferences(newer, older) {
  const reasons = [];
  const policy = examContract(newer.examId)?.journal;
  if (!policy) return ['unknown-instrument'];
  for (const field of policy.hard) {
    if (!hasValue(newer.setup[field]) || !hasValue(older.setup[field])) reasons.push(`missing:${field}`);
    else if (newer.setup[field] !== older.setup[field]) reasons.push(`changed:${field}`);
  }
  if (policy.distanceTolerance) {
    const field = policy.distanceTolerance.field;
    const newerDistance = Number(newer.setup[field]);
    const olderDistance = Number(older.setup[field]);
    if (!(newerDistance > 0 && olderDistance > 0)) reasons.push('missing:distanceMm');
    else if (setupDifferenceRatio(newer, older, field) > policy.distanceTolerance.hardRatio)
      reasons.push(`changed:${field}`);
  }
  return reasons;
}

/** @param {JournalEntry} newer @param {JournalEntry} older @param {string} field */
function setupDifferenceRatio(newer, older, field) {
  const newerValue = Number(newer.setup[field]);
  const olderValue = Number(older.setup[field]);
  return newerValue > 0 && olderValue > 0
    ? Math.abs(newerValue - olderValue) / olderValue
    : Number.POSITIVE_INFINITY;
}

/** @param {JournalEntry[]} entries */
function sortEntries(entries) {
  return [...entries].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {string | number | Date} value */
function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

/** @param {unknown} value */
function isIsoDate(value) {
  if (typeof value !== 'string' || value.length > 32) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

/** @param {unknown} value */
function optionalFinite(value) {
  return value === undefined || Number.isFinite(value);
}

/** @param {unknown} value */
function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {string} value */
function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
