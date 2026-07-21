import { examContract, isExamId } from '../exams/contracts.js';
import { legacyProtocolPassport, protocolPassport } from '../exams/protocols.js';
import { LOCALE_CODES } from '../locale-metadata.js';

const FORMAT = 'sense6-journal';
const EXPORT_FORMAT = 'sense6-journal-export';
const SCHEMA_VERSION = 2;
const STORAGE_KEY = 'sense6:journal';
const MAX_ENTRIES = 100;
const MAX_IMPORT_BYTES = 1_000_000;
const MAX_NOTES = 12;

const QUALITY = new Set(['usable', 'caution', 'limited']);
const BOUNDS = new Set(['lower', 'upper']);

/** @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void }} JournalStorage */
/** @typedef {{ id: string, value: number | null, unit: string, lower?: number, upper?: number, uncertainty?: number, bound?: 'lower' | 'upper' }} JournalMeasurement */
/** @typedef {import('../exams/protocols.js').ProtocolPassport} ProtocolPassport */
/** @typedef {{ id: string, examId: string, recordedAt: string, locale: string, quality: 'usable' | 'caution' | 'limited', protocol: ProtocolPassport, setup: Record<string, string | number | boolean | null>, qualityEvidence: Record<string, string | number | boolean | null>, measurements: JournalMeasurement[], notes: string[] }} JournalEntry */

/**
 * Create a portable, language-neutral journal entry.
 * @param {Omit<JournalEntry, 'id' | 'recordedAt' | 'notes' | 'protocol' | 'qualityEvidence'> & { id?: string, recordedAt?: string | number | Date, notes?: string[], protocol?: ProtocolPassport, qualityEvidence?: Record<string, string | number | boolean | null> }} value
 * @returns {JournalEntry | null}
 */
export function createJournalEntry(value) {
  if (!isExamId(value.examId)) return null;
  const entry = {
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
  return isJournalEntry(entry) ? entry : null;
}

/** @param {JournalStorage} [storage] @returns {JournalEntry[]} */
export function loadJournal(storage = globalThis.localStorage) {
  return storage ? readJournal(storage).entries : [];
}

/** @param {JournalEntry} entry @param {JournalStorage} [storage] */
export function appendJournalEntry(entry, storage = globalThis.localStorage) {
  if (!storage || !isJournalEntry(entry)) return false;
  const journal = readJournal(storage);
  if (!journal.writable) return false;
  const entries = journal.entries.filter((candidate) => candidate.id !== entry.id);
  entries.unshift(entry);
  return writeJournal(entries.slice(0, MAX_ENTRIES), storage);
}

/** @param {string} id @param {JournalStorage} [storage] */
export function removeJournalEntry(id, storage = globalThis.localStorage) {
  if (!storage || typeof id !== 'string') return false;
  const journal = readJournal(storage);
  if (!journal.writable) return false;
  return writeJournal(
    journal.entries.filter((entry) => entry.id !== id),
    storage,
  );
}

/** @param {JournalStorage} [storage] */
export function clearJournal(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    if (typeof storage.removeItem === 'function') storage.removeItem(STORAGE_KEY);
    else return writeJournal([], storage);
    return true;
  } catch {
    return false;
  }
}

/** @param {JournalStorage} [storage] */
export function exportJournal(storage = globalThis.localStorage) {
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
 * Merge a documented export into local storage. Existing IDs win, making
 * repeated imports idempotent.
 * @param {string} raw
 * @param {JournalStorage} [storage]
 * @returns {{ ok: true, imported: number, duplicates: number, discarded: number, evicted: number, skipped: number, total: number } | { ok: false, reason: 'too-large' | 'malformed' | 'future' | 'invalid' | 'storage' }}
 */
export function importJournal(raw, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, reason: 'storage' };
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
  if (!writeJournal(entries, storage)) return { ok: false, reason: 'storage' };
  const retained = new Set(entries.map((entry) => entry.id));
  const imported = additions.filter((entry) => retained.has(entry.id)).length;
  const discarded = additions.length - imported;
  const evicted = current.filter((entry) => !retained.has(entry.id)).length;
  return {
    ok: true,
    imported,
    duplicates,
    discarded,
    evicted,
    skipped: duplicates + discarded,
    total: entries.length,
  };
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
 * @param {JournalEntry} newer
 * @param {JournalEntry} older
 */
export function measurementChanges(newer, older) {
  const previous = new Map(older.measurements.map((measurement) => [measurement.id, measurement]));
  return newer.measurements.flatMap((measurement) => {
    const before = previous.get(measurement.id);
    if (!before || !Number.isFinite(measurement.value) || !Number.isFinite(before.value)) return [];
    const uncertainty = combinedUncertainty(measurement, before);
    return [
      {
        id: measurement.id,
        delta: /** @type {number} */ (measurement.value) - /** @type {number} */ (before.value),
        unit: measurement.unit,
        uncertainty,
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
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ format: FORMAT, schemaVersion: SCHEMA_VERSION, entries: sortEntries(entries) }),
    );
    return true;
  } catch {
    return false;
  }
}

/** @param {JournalStorage} storage */
function readJournal(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], writable: true };
    if (byteLength(raw) > MAX_IMPORT_BYTES) return { entries: [], writable: false };
    const parsed = JSON.parse(raw);
    if (parsed?.format !== FORMAT || !Number.isInteger(parsed.schemaVersion)) {
      return { entries: [], writable: false };
    }
    if (parsed.schemaVersion > SCHEMA_VERSION) return { entries: [], writable: false };
    const entries = migrateEntries(parsed.schemaVersion, parsed.entries);
    if (!entries) return { entries: [], writable: false };
    return { entries: sortEntries(entries), writable: true };
  } catch {
    return { entries: [], writable: false };
  }
}

/** @param {unknown} value @returns {value is JournalEntry} */
function isJournalEntry(value) {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.examId === 'string' &&
    isExamId(value.examId) &&
    typeof value.recordedAt === 'string' &&
    isIsoDate(value.recordedAt) &&
    typeof value.locale === 'string' &&
    LOCALE_CODES.has(value.locale) &&
    typeof value.quality === 'string' &&
    QUALITY.has(value.quality) &&
    validProtocol(value.protocol) &&
    validSetup(value.setup) &&
    validEvidence(value.qualityEvidence) &&
    Array.isArray(value.measurements) &&
    value.measurements.length > 0 &&
    value.measurements.length <= 24 &&
    value.measurements.every(isMeasurement) &&
    Array.isArray(value.notes) &&
    value.notes.length <= MAX_NOTES &&
    value.notes.every((note) => typeof note === 'string' && note.length <= 100) &&
    validInstrumentEntry(value)
  );
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
  const fields = [
    'methodVersion',
    'profileId',
    'configDigest',
    'stimulusVersion',
    'estimator',
    'stoppingRule',
    'responsePolicy',
    'interruptionPolicy',
    'replayPolicy',
  ];
  return (
    Object.keys(value).length === fields.length &&
    fields.every(
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
    optionalFinite(value.uncertainty) &&
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
  /** @type {readonly (keyof ProtocolPassport)[]} */
  const fields = [
    'methodVersion',
    'profileId',
    'configDigest',
    'stimulusVersion',
    'estimator',
    'stoppingRule',
    'responsePolicy',
    'interruptionPolicy',
    'replayPolicy',
  ];
  return fields.flatMap((field) => (newer[field] === older[field] ? [] : [`changed:${field}`]));
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
    return entries.every(isJournalEntry) ? /** @type {JournalEntry[]} */ (entries) : null;
  }
  if (schemaVersion !== 1 || !entries.every(isLegacyJournalEntry)) return null;
  return entries.map((entry) => ({
    ...entry,
    protocol: legacyProtocolPassport(/** @type {import('../exams/contracts.js').ExamId} */ (entry.examId)),
    qualityEvidence: {},
    notes: entry.notes.includes('legacy-exploratory')
      ? entry.notes
      : [...entry.notes.slice(0, MAX_NOTES - 1), 'legacy-exploratory'],
  }));
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

/** @param {JournalMeasurement} measurement @param {JournalMeasurement} previous */
function combinedUncertainty(measurement, previous) {
  const current = measurementUncertainty(measurement);
  const before = measurementUncertainty(previous);
  return current === null || before === null ? null : Math.sqrt(current ** 2 + before ** 2);
}

/** @param {JournalMeasurement} measurement */
function measurementUncertainty(measurement) {
  if (Number.isFinite(measurement.uncertainty)) return /** @type {number} */ (measurement.uncertainty);
  return null;
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
