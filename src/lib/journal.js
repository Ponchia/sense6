const FORMAT = 'sense6-journal';
const EXPORT_FORMAT = 'sense6-journal-export';
const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'sense6:journal';
const MAX_ENTRIES = 100;
const MAX_IMPORT_BYTES = 1_000_000;

const EXAM_IDS = new Set(['tetracromia', 'color-blindness', 'riflessi', 'udito', 'acutezza']);
const QUALITY = new Set(['usable', 'caution', 'limited']);
const BOUNDS = new Set(['lower', 'upper']);

/** @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void }} JournalStorage */
/** @typedef {{ id: string, value: number | null, unit: string, lower?: number, upper?: number, uncertainty?: number, bound?: 'lower' | 'upper' }} JournalMeasurement */
/** @typedef {{ id: string, examId: string, recordedAt: string, locale: string, quality: 'usable' | 'caution' | 'limited', setup: Record<string, string | number | boolean | null>, measurements: JournalMeasurement[], notes: string[] }} JournalEntry */

/**
 * Create a portable, language-neutral journal entry.
 * @param {Omit<JournalEntry, 'id' | 'recordedAt' | 'notes'> & { id?: string, recordedAt?: string | number | Date, notes?: string[] }} value
 * @returns {JournalEntry | null}
 */
export function createJournalEntry(value) {
  const entry = {
    id: value.id ?? createId(),
    examId: value.examId,
    recordedAt: toIsoDate(value.recordedAt ?? new Date()),
    locale: value.locale,
    quality: value.quality,
    setup: value.setup,
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
 * @returns {{ ok: true, imported: number, duplicates: number, total: number } | { ok: false, reason: 'too-large' | 'malformed' | 'future' | 'invalid' | 'storage' }}
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
  if (
    parsed.schemaVersion !== SCHEMA_VERSION ||
    !Array.isArray(parsed.entries) ||
    parsed.entries.length > MAX_ENTRIES ||
    !parsed.entries.every(isJournalEntry)
  ) {
    return { ok: false, reason: 'invalid' };
  }
  const journal = readJournal(storage);
  if (!journal.writable) return { ok: false, reason: 'storage' };
  const current = journal.entries;
  const known = new Set(current.map((entry) => entry.id));
  /** @type {JournalEntry[]} */
  const additions = [];
  let duplicates = 0;
  for (const entry of /** @type {JournalEntry[]} */ (parsed.entries)) {
    if (known.has(entry.id)) {
      duplicates += 1;
      continue;
    }
    known.add(entry.id);
    additions.push(entry);
  }
  const entries = sortEntries([...current, ...additions]).slice(0, MAX_ENTRIES);
  if (!writeJournal(entries, storage)) return { ok: false, reason: 'storage' };
  return {
    ok: true,
    imported: additions.length,
    duplicates,
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
  const reasons = [];
  const hard = hardSetupDifferences(newer, older);
  if (hard.length) return { status: 'not-comparable', reasons: hard };

  for (const field of cautionFields(newer.examId)) {
    if (!hasValue(newer.setup[field]) || !hasValue(older.setup[field])) reasons.push(`missing:${field}`);
    else if (newer.setup[field] !== older.setup[field]) reasons.push(`changed:${field}`);
  }
  if (newer.examId === 'udito') reasons.push('volume-not-verifiable');
  if (newer.examId === 'acutezza') {
    const newerDistance = Number(newer.setup.distanceMm);
    const olderDistance = Number(older.setup.distanceMm);
    if (
      newerDistance > 0 &&
      olderDistance > 0 &&
      Math.abs(newerDistance - olderDistance) / olderDistance > 0.05
    ) {
      reasons.push('changed:distanceMm');
    }
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
    if (
      parsed?.format !== FORMAT ||
      parsed.schemaVersion !== SCHEMA_VERSION ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length > MAX_ENTRIES ||
      !parsed.entries.every(isJournalEntry)
    ) {
      return { entries: [], writable: false };
    }
    return { entries: sortEntries(parsed.entries), writable: true };
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
    EXAM_IDS.has(value.examId) &&
    isIsoDate(value.recordedAt) &&
    typeof value.locale === 'string' &&
    /^[a-z]{2}$/.test(value.locale) &&
    QUALITY.has(value.quality) &&
    validSetup(value.setup) &&
    Array.isArray(value.measurements) &&
    value.measurements.length > 0 &&
    value.measurements.length <= 24 &&
    value.measurements.every(isMeasurement) &&
    Array.isArray(value.notes) &&
    value.notes.length <= 12 &&
    value.notes.every((note) => typeof note === 'string' && note.length <= 100)
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
    (value.bound === undefined || BOUNDS.has(value.bound)) &&
    !(Number.isFinite(value.lower) && Number.isFinite(value.upper) && value.lower > value.upper)
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

/** @param {JournalEntry} newer @param {JournalEntry} older */
function hardSetupDifferences(newer, older) {
  const reasons = [];
  for (const field of hardFields(newer.examId)) {
    if (!hasValue(newer.setup[field]) || !hasValue(older.setup[field])) reasons.push(`missing:${field}`);
    else if (newer.setup[field] !== older.setup[field]) reasons.push(`changed:${field}`);
  }
  if (newer.examId === 'acutezza') {
    const newerDistance = Number(newer.setup.distanceMm);
    const olderDistance = Number(older.setup.distanceMm);
    if (!(newerDistance > 0 && olderDistance > 0)) reasons.push('missing:distanceMm');
    else if (Math.abs(newerDistance - olderDistance) / olderDistance > 0.1)
      reasons.push('changed:distanceMm');
  }
  return reasons;
}

/** @param {string} examId */
function hardFields(examId) {
  if (examId === 'riflessi') return ['display', 'inputMode'];
  if (examId === 'udito') return ['device', 'connection', 'sampleRate'];
  if (examId === 'acutezza') return ['display', 'correction'];
  return ['display', 'gamut'];
}

/** @param {string} examId */
function cautionFields(examId) {
  if (examId === 'riflessi') return ['frameCadence'];
  if (examId === 'udito') return ['interruptions'];
  if (examId === 'acutezza') return ['calibrationState', 'cardWidthCssPx'];
  return ['viewport'];
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
  if (Number.isFinite(measurement.lower) && Number.isFinite(measurement.upper)) {
    const upper = /** @type {number} */ (measurement.upper);
    const lower = /** @type {number} */ (measurement.lower);
    return (upper - lower) / 2;
  }
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

/** @param {unknown} value @returns {value is Record<string, any>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {string} value */
function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
