import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendJournalEntry,
  captureDisplayPassport,
  clearJournal,
  compareJournalEntries,
  createJournalEntry,
  exportJournal,
  importJournal,
  JOURNAL_LIMITS,
  loadJournal,
  measurementChanges,
  removeJournalEntry,
} from '../src/lib/journal.js';

test('the journal stores newest-first portable entries and caps retained history', () => {
  const storage = memoryStorage();
  for (let index = 0; index < JOURNAL_LIMITS.maxEntries + 2; index += 1) {
    assert.equal(
      appendJournalEntry(
        entry({ id: `run-${index}`, recordedAt: new Date(2026, 0, index + 1).toISOString() }),
        storage,
      ),
      true,
    );
  }
  const entries = loadJournal(storage);
  assert.equal(entries.length, JOURNAL_LIMITS.maxEntries);
  assert.equal(entries[0].id, 'run-101');
  assert.equal(entries.at(-1).id, 'run-2');
});

test('entry creation rejects malformed setup, measurements, dates, and identifiers', () => {
  assert.equal(createJournalEntry({ ...entry(), id: '', notes: [] }), null);
  assert.equal(createJournalEntry({ ...entry(), recordedAt: 'not-a-date', notes: [] }), null);
  assert.equal(createJournalEntry({ ...entry(), setup: { bad_key: true }, notes: [] }), null);
  assert.equal(
    createJournalEntry({ ...entry(), measurements: [{ id: 'bad id', value: 1, unit: 'x' }], notes: [] }),
    null,
  );
  assert.equal(
    createJournalEntry({
      ...entry(),
      measurements: [{ id: 'score', value: 1, unit: 'x', lower: 3, upper: 2 }],
      notes: [],
    }),
    null,
  );
  assert.equal(appendJournalEntry(/** @type {any} */ ({ nope: true }), memoryStorage()), false);
});

test('corrupt, oversized, invalid, and future stored journals fail closed', () => {
  assert.deepEqual(loadJournal(memoryStorage({ 'sense6:journal': '{' })), []);
  assert.deepEqual(
    loadJournal(memoryStorage({ 'sense6:journal': 'x'.repeat(JOURNAL_LIMITS.maxImportBytes + 1) })),
    [],
  );

  const futureRaw = JSON.stringify({ format: 'sense6-journal', schemaVersion: 99, entries: [] });
  const future = memoryStorage({ 'sense6:journal': futureRaw });
  assert.equal(appendJournalEntry(entry({ id: 'must-not-overwrite' }), future), false);
  assert.equal(future.getItem('sense6:journal'), futureRaw);
  assert.deepEqual(
    loadJournal(memoryStorage({ 'sense6:journal': JSON.stringify({ format: 'wrong', entries: [] }) })),
    [],
  );
  assert.deepEqual(
    loadJournal(
      memoryStorage({
        'sense6:journal': JSON.stringify({
          format: 'sense6-journal',
          schemaVersion: 99,
          entries: [],
        }),
      }),
    ),
    [],
  );
});

test('exports merge idempotently and reject unsafe imports', () => {
  const source = memoryStorage();
  appendJournalEntry(entry({ id: 'portable' }), source);
  const exported = exportJournal(source);
  const target = memoryStorage();
  assert.deepEqual(importJournal(exported, target), { ok: true, imported: 1, duplicates: 0, total: 1 });
  assert.deepEqual(importJournal(exported, target), { ok: true, imported: 0, duplicates: 1, total: 1 });
  assert.deepEqual(importJournal('{', target), { ok: false, reason: 'malformed' });
  assert.deepEqual(importJournal('x'.repeat(JOURNAL_LIMITS.maxImportBytes + 1), target), {
    ok: false,
    reason: 'too-large',
  });
  assert.deepEqual(importJournal(JSON.stringify({}), target), { ok: false, reason: 'invalid' });
  assert.deepEqual(
    importJournal(JSON.stringify({ format: 'sense6-journal-export', schemaVersion: 2, entries: [] }), target),
    { ok: false, reason: 'future' },
  );
  assert.deepEqual(
    importJournal(
      JSON.stringify({ format: 'sense6-journal-export', schemaVersion: 1, entries: [{}] }),
      target,
    ),
    { ok: false, reason: 'invalid' },
  );

  const duplicateEntry = entry({ id: 'duplicate-inside-export' });
  assert.deepEqual(
    importJournal(
      JSON.stringify({
        format: 'sense6-journal-export',
        schemaVersion: 1,
        entries: [duplicateEntry, duplicateEntry],
      }),
      target,
    ),
    { ok: true, imported: 1, duplicates: 1, total: 2 },
  );
  assert.equal(loadJournal(target).filter(({ id }) => id === duplicateEntry.id).length, 1);
});

test('delete operations preserve unrelated entries and tolerate unavailable storage', () => {
  const storage = memoryStorage();
  appendJournalEntry(entry({ id: 'one' }), storage);
  appendJournalEntry(entry({ id: 'two' }), storage);
  assert.equal(removeJournalEntry('one', storage), true);
  assert.deepEqual(
    loadJournal(storage).map(({ id }) => id),
    ['two'],
  );
  assert.equal(clearJournal(storage), true);
  assert.deepEqual(loadJournal(storage), []);
  assert.equal(clearJournal(null), false);
  assert.equal(removeJournalEntry('two', null), false);
  assert.deepEqual(importJournal('{}', null), { ok: false, reason: 'storage' });
});

test('setup passports classify comparisons without inventing comparability', () => {
  const older = entry({ id: 'older' });
  const same = entry({ id: 'same', recordedAt: '2026-01-02T00:00:00.000Z' });
  assert.deepEqual(compareJournalEntries(same, older), { status: 'comparable', reasons: [] });

  const otherExam = entry({ id: 'other', examId: 'riflessi' });
  assert.deepEqual(compareJournalEntries(otherExam, older), {
    status: 'not-comparable',
    reasons: ['different-instrument'],
  });
  const changedDisplay = entry({ id: 'display', setup: { ...older.setup, display: 'different' } });
  assert.deepEqual(compareJournalEntries(changedDisplay, older), {
    status: 'not-comparable',
    reasons: ['changed:display'],
  });
  const changedViewport = entry({ id: 'viewport', setup: { ...older.setup, viewport: '900x700' } });
  assert.deepEqual(compareJournalEntries(changedViewport, older), {
    status: 'caution',
    reasons: ['changed:viewport'],
  });
});

test('instrument rules include distance tolerance, run quality, and unverifiable audio volume', () => {
  const acutezza = entry({
    id: 'acutezza-one',
    examId: 'acutezza',
    setup: {
      display: '100x100@1',
      correction: 'glasses',
      distanceMm: 500,
      calibrationState: 'measured',
      cardWidthCssPx: 320,
    },
  });
  const close = entry({ ...acutezza, id: 'acutezza-two', setup: { ...acutezza.setup, distanceMm: 525 } });
  assert.deepEqual(compareJournalEntries(close, acutezza), { status: 'comparable', reasons: [] });
  const caution = entry({
    ...acutezza,
    id: 'acutezza-caution',
    setup: { ...acutezza.setup, distanceMm: 540 },
  });
  assert.deepEqual(compareJournalEntries(caution, acutezza), {
    status: 'caution',
    reasons: ['changed:distanceMm'],
  });
  const far = entry({ ...acutezza, id: 'acutezza-three', setup: { ...acutezza.setup, distanceMm: 600 } });
  assert.deepEqual(compareJournalEntries(far, acutezza), {
    status: 'not-comparable',
    reasons: ['changed:distanceMm'],
  });

  const audioSetup = { device: 'headphones', sampleRate: 48_000, interruptions: 0 };
  const audio = entry({ id: 'audio-one', examId: 'udito', setup: audioSetup });
  const audioLimited = entry({
    id: 'audio-two',
    examId: 'udito',
    quality: 'caution',
    setup: audioSetup,
  });
  assert.deepEqual(compareJournalEntries(audioLimited, audio), {
    status: 'caution',
    reasons: ['volume-not-verifiable', 'limited-run'],
  });
});

test('measurement changes combine intervals and retain bound warnings', () => {
  const older = entry({
    id: 'before',
    measurements: [
      { id: 'score', value: 10, unit: 'ms', uncertainty: 2 },
      { id: 'interval', value: 5, unit: 'x', lower: 3, upper: 7 },
      { id: 'missing', value: null, unit: 'x' },
    ],
  });
  const newer = entry({
    id: 'after',
    measurements: [
      { id: 'score', value: 13, unit: 'ms', uncertainty: 3, bound: 'lower' },
      { id: 'interval', value: 7, unit: 'x', lower: 6, upper: 8 },
      { id: 'new', value: 1, unit: 'x' },
    ],
  });
  const changes = measurementChanges(newer, older);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes[0], {
    id: 'score',
    delta: 3,
    unit: 'ms',
    uncertainty: Math.sqrt(13),
    bounded: true,
  });
  assert.deepEqual(changes[1], {
    id: 'interval',
    delta: 2,
    unit: 'x',
    uncertainty: Math.sqrt(5),
    bounded: false,
  });
  assert.match(captureDisplayPassport().display, /^\d+x\d+@/);
});

function entry(overrides = {}) {
  return {
    id: 'run-one',
    examId: 'tetracromia',
    recordedAt: '2026-01-01T00:00:00.000Z',
    locale: 'en',
    quality: 'usable',
    setup: { display: '100x100@1', viewport: '800x600', gamut: 'srgb' },
    measurements: [{ id: 'score', value: 10, unit: '/100' }],
    notes: [],
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
