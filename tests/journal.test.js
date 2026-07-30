import assert from 'node:assert/strict';
import test from 'node:test';
import { protocolPassport } from '../src/exams/protocols.js';
import { journalCopy, journalSetupLabel, prepareJournalCopy } from '../src/journal-copy.js';
import {
  appendJournalEntry,
  buildJournalEntry,
  captureDisplayPassport,
  clearJournal,
  compareJournalEntries,
  createJournalEntry,
  exportJournal,
  importJournal,
  JOURNAL_DISCLOSURE_KEYS,
  JOURNAL_EXPORT_SCHEMA,
  JOURNAL_LIMITS,
  loadJournal,
  measurementChanges,
  previewJournalImport,
  readJournalState,
  removeJournalEntry,
  saveJournalRun,
} from '../src/lib/journal.js';
import { LOCALE_CODES } from '../src/locale-metadata.js';

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

test('journal entries accept supported regional and script-qualified locales', () => {
  for (const locale of ['pt-br', 'zh-hans']) {
    assert.equal(createJournalEntry(entry({ locale }))?.locale, locale);
  }
  assert.equal(createJournalEntry(entry({ locale: 'zh-tw' })), null);
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

test('journal reads distinguish every recovery and healthy state', () => {
  assert.deepEqual(readJournalState(null), {
    status: 'inaccessible',
    entries: [],
    raw: null,
    writable: false,
  });
  assert.deepEqual(readJournalState(memoryStorage()), {
    status: 'empty',
    entries: [],
    raw: null,
    writable: true,
  });

  const malformedRaw = '{';
  assert.deepEqual(readJournalState(memoryStorage({ 'sense6:journal': malformedRaw })), {
    status: 'malformed',
    entries: [],
    raw: malformedRaw,
    writable: false,
  });

  const oversizedRaw = 'x'.repeat(JOURNAL_LIMITS.maxImportBytes + 1);
  assert.deepEqual(readJournalState(memoryStorage({ 'sense6:journal': oversizedRaw })), {
    status: 'oversized',
    entries: [],
    raw: oversizedRaw,
    writable: false,
  });

  const futureRaw = JSON.stringify({
    format: 'sense6-journal',
    schemaVersion: 99,
    entries: [],
  });
  assert.deepEqual(readJournalState(memoryStorage({ 'sense6:journal': futureRaw })), {
    status: 'future-schema',
    entries: [],
    raw: futureRaw,
    writable: false,
  });

  const readyStorage = memoryStorage();
  const readyEntry = entry({ id: 'ready' });
  appendJournalEntry(readyEntry, readyStorage);
  const ready = readJournalState(readyStorage);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.writable, true);
  assert.deepEqual(ready.entries, [readyEntry]);
  assert.equal(typeof ready.raw, 'string');

  assert.deepEqual(
    readJournalState({
      getItem() {
        throw new Error('read denied');
      },
      setItem() {},
    }),
    { status: 'inaccessible', entries: [], raw: null, writable: false },
  );
});

test('a throwing localStorage getter cannot crash optional journal storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('storage access denied');
    },
  });

  try {
    assert.deepEqual(loadJournal(), []);
    assert.equal(readJournalState().status, 'inaccessible');
    assert.equal(appendJournalEntry(entry()), false);
    assert.equal(clearJournal(), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('exports merge idempotently and reject unsafe imports', () => {
  const source = memoryStorage();
  appendJournalEntry(entry({ id: 'portable' }), source);
  const exported = exportJournal(source);
  const target = memoryStorage();
  const firstPreview = previewJournalImport(exported, target);
  assert.deepEqual(firstPreview, {
    ok: true,
    additions: 1,
    duplicates: 0,
    discarded: 0,
    evicted: 0,
    total: 1,
  });
  assert.deepEqual(loadJournal(target), [], 'preview must not write');
  assert.deepEqual(importJournal(exported, target), { ok: false, reason: 'confirmation-required' });
  assert.deepEqual(importJournal(exported, target, firstPreview), firstPreview);
  const duplicatePreview = previewJournalImport(exported, target);
  assert.deepEqual(duplicatePreview, {
    ok: true,
    additions: 0,
    duplicates: 1,
    discarded: 0,
    evicted: 0,
    total: 1,
  });
  assert.deepEqual(importJournal(exported, target, duplicatePreview), duplicatePreview);
  assert.deepEqual(importJournal('{', target), { ok: false, reason: 'malformed' });
  assert.deepEqual(importJournal('x'.repeat(JOURNAL_LIMITS.maxImportBytes + 1), target), {
    ok: false,
    reason: 'too-large',
  });
  assert.deepEqual(importJournal(JSON.stringify({}), target), { ok: false, reason: 'invalid' });
  assert.deepEqual(
    importJournal(JSON.stringify({ format: 'sense6-journal-export', schemaVersion: 3, entries: [] }), target),
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
  const duplicateSource = JSON.stringify({
    format: 'sense6-journal-export',
    schemaVersion: 2,
    entries: [duplicateEntry, duplicateEntry],
  });
  const insidePreview = previewJournalImport(duplicateSource, target);
  assert.deepEqual(insidePreview, {
    ok: true,
    additions: 1,
    duplicates: 1,
    discarded: 0,
    evicted: 0,
    total: 2,
  });
  assert.deepEqual(importJournal(duplicateSource, target, insidePreview), insidePreview);
  assert.equal(loadJournal(target).filter(({ id }) => id === duplicateEntry.id).length, 1);
});

test('imports report only additions retained after the cap and distinguish evictions', () => {
  const full = memoryStorage();
  for (let index = 0; index < JOURNAL_LIMITS.maxEntries; index += 1) {
    appendJournalEntry(
      entry({ id: `current-${index}`, recordedAt: new Date(2026, 0, index + 1).toISOString() }),
      full,
    );
  }

  const older = entry({ id: 'older-import', recordedAt: '2025-01-01T00:00:00.000Z' });
  const olderSource = exportWith([older]);
  const olderPreview = previewJournalImport(olderSource, full);
  assert.deepEqual(olderPreview, {
    ok: true,
    additions: 0,
    duplicates: 0,
    discarded: 1,
    evicted: 0,
    total: JOURNAL_LIMITS.maxEntries,
  });
  assert.deepEqual(importJournal(olderSource, full, olderPreview), olderPreview);
  assert.equal(
    loadJournal(full).some(({ id }) => id === older.id),
    false,
  );

  const newer = entry({ id: 'newer-import', recordedAt: '2027-01-01T00:00:00.000Z' });
  const newerSource = exportWith([newer]);
  const newerPreview = previewJournalImport(newerSource, full);
  assert.deepEqual(newerPreview, {
    ok: true,
    additions: 1,
    duplicates: 0,
    discarded: 0,
    evicted: 1,
    total: JOURNAL_LIMITS.maxEntries,
  });
  assert.deepEqual(importJournal(newerSource, full, newerPreview), newerPreview);
  assert.equal(loadJournal(full)[0].id, newer.id);
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

test('protocol identity prevents incompatible runs from appearing comparable', () => {
  const older = entry({ id: 'protocol-before' });
  for (const field of [
    'methodVersion',
    'profileId',
    'configDigest',
    'stimulusVersion',
    'estimator',
    'stoppingRule',
    'responsePolicy',
    'interruptionPolicy',
    'replayPolicy',
  ]) {
    const newer = entry({
      id: `protocol-${field}`,
      protocol: { ...older.protocol, [field]: `${older.protocol[field]}-changed` },
    });
    assert.deepEqual(compareJournalEntries(newer, older), {
      status: 'not-comparable',
      reasons: [`changed:${field}`],
    });
  }
});

test('schema-one entries remain readable but migrate into an explicit legacy cohort', () => {
  const legacy = entry({
    id: 'legacy-run',
    notes: Array.from({ length: 12 }, (_, index) => `legacy-note-${index}`),
  });
  const { protocol: _protocol, qualityEvidence: _qualityEvidence, ...schemaOneEntry } = legacy;
  const storage = memoryStorage({
    'sense6:journal': JSON.stringify({
      format: 'sense6-journal',
      schemaVersion: 1,
      entries: [schemaOneEntry],
    }),
  });
  const [migrated] = loadJournal(storage);
  assert.equal(migrated.protocol.profileId, 'legacy-exploratory');
  assert.equal(migrated.protocol.methodVersion, 'tetracromia-v1-legacy');
  assert.deepEqual(migrated.qualityEvidence, {});
  assert.ok(migrated.notes.includes('legacy-exploratory'));
  assert.equal(migrated.notes.length, 12);
  assert.deepEqual(compareJournalEntries(entry({ id: 'current-run' }), migrated), {
    status: 'not-comparable',
    reasons: ['legacy-protocol'],
  });
});

test('instrument rules include distance tolerance, run quality, and unverifiable audio volume', () => {
  const acutezza = acutezzaEntry({
    id: 'acutezza-one',
    eyes: ['left', 'right'],
  });
  acutezza.setup.contrastPercent = 20;
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
  const differentContrast = entry({
    ...acutezza,
    id: 'acutezza-contrast',
    setup: { ...acutezza.setup, contrastPercent: 10 },
  });
  assert.deepEqual(compareJournalEntries(differentContrast, acutezza), {
    status: 'not-comparable',
    reasons: ['changed:contrastPercent'],
  });

  const audioSetup = {
    device: 'headphones',
    connection: 'wired',
    sampleRate: 48_000,
    interruptions: 0,
  };
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
  const changedConnection = entry({
    ...audio,
    id: 'audio-wireless',
    setup: { ...audioSetup, connection: 'bluetooth' },
  });
  assert.deepEqual(compareJournalEntries(changedConnection, audio), {
    status: 'not-comparable',
    reasons: ['changed:connection'],
  });
});

test('Acutezza comparisons require a common completed eye and preserve useful shared-eye deltas', () => {
  const full = acutezzaEntry({ id: 'full', eyes: ['left', 'right'] });
  const repeatedFull = acutezzaEntry({
    id: 'full-repeat',
    eyes: ['left', 'right'],
    values: { left: 4, right: 5 },
  });
  const leftOnly = acutezzaEntry({ id: 'left-only', eyes: ['left'], values: { left: 4 } });
  const rightOnly = acutezzaEntry({ id: 'right-only', eyes: ['right'], values: { right: 5 } });

  assert.deepEqual(compareJournalEntries(repeatedFull, full), { status: 'comparable', reasons: [] });
  assert.deepEqual(compareJournalEntries(rightOnly, leftOnly), {
    status: 'not-comparable',
    reasons: ['no-common-eye'],
  });
  assert.deepEqual(measurementChanges(rightOnly, leftOnly), []);
  assert.deepEqual(compareJournalEntries(leftOnly, full), {
    status: 'caution',
    reasons: ['changed:completedEyes'],
  });
  assert.deepEqual(measurementChanges(leftOnly, full), [
    { id: 'left-high', delta: 1, unit: 'arcmin', bounded: false },
  ]);
});

test('legacy Acutezza journal entries infer completed eyes from measurements', () => {
  const legacyFull = acutezzaEntry({ id: 'legacy-full', eyes: ['left', 'right'], persistCompletion: false });
  const currentFull = acutezzaEntry({ id: 'current-full', eyes: ['left', 'right'] });
  const legacyLeft = acutezzaEntry({ id: 'legacy-left', eyes: ['left'], persistCompletion: false });
  const currentRight = acutezzaEntry({ id: 'current-right', eyes: ['right'] });

  assert.deepEqual(compareJournalEntries(currentFull, legacyFull), { status: 'comparable', reasons: [] });
  assert.deepEqual(compareJournalEntries(currentRight, legacyLeft), {
    status: 'not-comparable',
    reasons: ['no-common-eye'],
  });
});

test('Daltonia comparisons preserve its measured display environment', () => {
  const setup = {
    display: '100x100@2',
    gamut: 'srgb',
    theme: 'dark',
    stimulusCssPixels: 104,
    measurementDpr: 2,
    measurementViewport: '390x844',
    orientation: 'portrait-0',
  };
  const first = entry({ id: 'daltonia-one', examId: 'color-blindness', setup });
  const same = entry({ ...first, id: 'daltonia-two' });
  assert.deepEqual(compareJournalEntries(same, first), { status: 'comparable', reasons: [] });

  const changedTheme = entry({
    ...first,
    id: 'daltonia-theme',
    setup: { ...setup, theme: 'light' },
  });
  assert.deepEqual(compareJournalEntries(changedTheme, first), {
    status: 'not-comparable',
    reasons: ['changed:theme'],
  });

  const changedOrientation = entry({
    ...first,
    id: 'daltonia-landscape',
    setup: { ...setup, orientation: 'landscape-90' },
  });
  assert.deepEqual(compareJournalEntries(changedOrientation, first), {
    status: 'caution',
    reasons: ['changed:orientation'],
  });
});

test('the journal labels enriched setup evidence in every supported language', async () => {
  await Promise.all([...LOCALE_CODES].map((locale) => prepareJournalCopy(locale)));
  const connections = {
    en: 'Connection',
    it: 'Connessione',
    de: 'Verbindung',
    fr: 'Connexion',
    es: 'Conexión',
    pt: 'Ligação',
  };
  for (const [locale, label] of Object.entries(connections)) {
    assert.equal(journalSetupLabel('connection', locale), label);
    assert.notEqual(journalSetupLabel('contrastPercent', locale), 'Contrast Percent');
    assert.notEqual(journalSetupLabel('measurementDpr', locale), 'Measurement Dpr');
  }
  assert.equal(journalSetupLabel('contrastPercent', 'de'), 'Nennkontrast');
  const physicalSetup = {
    en: 'Physical setup',
    it: 'Configurazione fisica',
    de: 'Physische Einrichtung',
    fr: 'Installation physique',
    es: 'Configuración física',
    pt: 'Configuração física',
    'pt-br': 'Configuração física',
    ar: 'الإعداد المادي',
    ja: '物理的な設定',
    ko: '물리적 설정',
    hi: 'भौतिक सेटअप',
    'zh-hans': '物理设置',
  };
  for (const [locale, label] of Object.entries(physicalSetup)) {
    assert.equal(journalSetupLabel('physicalSetup', locale), label);
    if (locale !== 'en')
      assert.notEqual(
        journalSetupLabel('audibilityAnchorsConfirmed', locale),
        'Audibility anchors confirmed',
      );
  }
});

test('measurement changes report bounded deltas and never relabel model intervals', () => {
  const older = entry({
    id: 'before',
    measurements: [
      { id: 'score', value: 10, unit: 'ms' },
      { id: 'interval', value: 5, unit: 'x', lower: 3, upper: 7 },
      { id: 'missing', value: null, unit: 'x' },
    ],
  });
  const newer = entry({
    id: 'after',
    measurements: [
      { id: 'score', value: 13, unit: 'ms', bound: 'lower' },
      { id: 'interval', value: 7, unit: 'x', lower: 6, upper: 8 },
      { id: 'new', value: 1, unit: 'x' },
    ],
  });
  const changes = measurementChanges(newer, older);
  assert.equal(changes.length, 2);
  // A `bound` marks the delta as a floor/ceiling, not a point estimate.
  assert.deepEqual(changes[0], {
    id: 'score',
    delta: 3,
    unit: 'ms',
    bounded: true,
  });
  // A model interval (lower/upper) must never be promoted into an uncertainty claim.
  assert.deepEqual(changes[1], {
    id: 'interval',
    delta: 2,
    unit: 'x',
    bounded: false,
  });
  assert.deepEqual(
    measurementChanges(
      entry({ id: 'changed-setup', setup: { ...newer.setup, display: 'different' } }),
      older,
    ),
    [],
  );
  assert.deepEqual(
    measurementChanges(
      entry({ id: 'changed-unit', measurements: [{ id: 'score', value: 13, unit: 's' }] }),
      older,
    ),
    [],
  );
  assert.match(captureDisplayPassport().display, /^\d+x\d+@/);
});

test('journal entries are canonical and every export schema field has localized disclosure', async () => {
  const canonical = createJournalEntry({
    ...entry(),
    extra: 'discard me',
    setup: { zeta: true, alpha: 'first' },
    measurements: [{ id: 'score', value: 10, unit: '/100', extra: 'discard me' }],
  });
  assert.deepEqual(Object.keys(canonical), JOURNAL_EXPORT_SCHEMA.entry);
  assert.deepEqual(Object.keys(canonical.setup), ['alpha', 'zeta']);
  assert.deepEqual(Object.keys(canonical.measurements[0]), ['id', 'value', 'unit']);
  const exported = JSON.parse(exportJournal(memoryStorage()));
  assert.deepEqual(Object.keys(exported), JOURNAL_EXPORT_SCHEMA.envelope);

  for (const locale of LOCALE_CODES) {
    await prepareJournalCopy(locale);
    assert.deepEqual(Object.keys(journalCopy(locale).exportDisclosure), JOURNAL_DISCLOSURE_KEYS);
  }
});

test('a refused entry names the exact field that failed, not a generic rejection', () => {
  /** @type {[string, Record<string, unknown>][]} */
  const cases = [
    ['examId', { examId: 'not-an-exam' }],
    ['examId', { examId: 42 }],
    ['id', { id: '' }],
    ['id', { id: 'x'.repeat(129) }],
    ['id', { id: 17 }],
    ['recordedAt', { recordedAt: 'not-a-date' }],
    ['recordedAt', { recordedAt: '2026-01-01T00:00:00.000Z-and-then-some-trailing-text' }],
    ['locale', { locale: 'zh-tw' }],
    ['quality', { quality: 'excellent' }],
    ['protocol', { protocol: {} }],
    ['protocol', { protocol: 'tetracromia-v1' }],
    ['setup', { setup: { bad_key: true } }],
    ['setup', { setup: null }],
    ['qualityEvidence', { qualityEvidence: { 'Bad Key': 1 } }],
    ['qualityEvidence', { qualityEvidence: [] }],
    ['measurements', { measurements: [] }],
    ['measurements', { measurements: 'score=10' }],
    ['measurements.length', { measurements: manyMeasurements(25) }],
    [
      'measurements[1]',
      {
        measurements: [
          { id: 'first', value: 1, unit: 'x' },
          { id: 'bad id', value: 1, unit: 'x' },
        ],
      },
    ],
    ['notes', { notes: Array.from({ length: 13 }, (_, index) => `note-${index}`) }],
    ['notes', { notes: ['x'.repeat(101)] }],
    ['notes', { notes: [42] }],
  ];

  for (const [expected, override] of cases) {
    const built = buildJournalEntry({ ...entry(), ...override });
    assert.equal(built.entry, null, `${JSON.stringify(override)} must not produce an entry`);
    assert.equal(built.reason, expected, `wrong field named for ${JSON.stringify(override)}`);
    // The public wrapper keeps its old contract on top of the same check.
    assert.equal(createJournalEntry({ ...entry(), ...override }), null);
  }

  // The 24-measurement cap is a boundary, not an approximation.
  assert.equal(buildJournalEntry({ ...entry(), measurements: manyMeasurements(24) }).reason, null);
  assert.equal(buildJournalEntry({ ...entry(), notes: Array.from({ length: 12 }, () => 'ok') }).reason, null);
  assert.equal(buildJournalEntry({ ...entry(), notes: ['x'.repeat(100)] }).reason, null);
});

test('an Acutezza entry whose declared eyes contradict its measurements is refused by name', () => {
  const oneEye = acutezzaEntry({ id: 'variant-mismatch', eyes: ['left'], values: { left: 3 } });
  assert.equal(buildJournalEntry(oneEye).reason, null);

  const wrongVariant = {
    ...oneEye,
    setup: { ...oneEye.setup, completionVariant: 'both-eyes' },
  };
  assert.equal(buildJournalEntry(wrongVariant).reason, 'completedEyes');

  const { completionVariant: _variant, ...withoutVariant } = oneEye.setup;
  assert.equal(buildJournalEntry({ ...oneEye, setup: withoutVariant }).reason, 'completedEyes');

  const unparseableEyes = {
    ...oneEye,
    setup: { ...oneEye.setup, completedEyes: 'left,left' },
  };
  assert.equal(buildJournalEntry(unparseableEyes).reason, 'completedEyes');

  const unmeasuredEye = {
    ...oneEye,
    setup: { ...oneEye.setup, completedEyes: 'right' },
  };
  assert.equal(buildJournalEntry(unmeasuredEye).reason, 'completedEyes');
});

test('buildJournalEntry derives every field the caller may omit', () => {
  const before = Date.now();
  const built = buildJournalEntry({
    examId: 'tetracromia',
    locale: 'en',
    quality: 'usable',
    setup: { display: '100x100@1', viewport: '800x600', gamut: 'srgb' },
    measurements: [{ id: 'score', value: 10, unit: '/100' }],
  });

  assert.equal(built.reason, null);
  const entryValue = /** @type {NonNullable<typeof built.entry>} */ (built.entry);
  assert.deepEqual(Object.keys(entryValue), JOURNAL_EXPORT_SCHEMA.entry);
  assert.deepEqual(entryValue.protocol, protocolPassport('tetracromia'));
  assert.deepEqual(entryValue.qualityEvidence, {});
  assert.deepEqual(entryValue.notes, []);
  assert.match(entryValue.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const recordedAt = Date.parse(entryValue.recordedAt);
  assert.equal(entryValue.recordedAt, new Date(recordedAt).toISOString());
  assert.ok(recordedAt >= before - 1000 && recordedAt <= Date.now() + 1000);

  // A caller may hand over a Date or epoch milliseconds; both normalize to ISO.
  assert.equal(
    buildJournalEntry({ ...entry(), recordedAt: new Date('2026-02-03T04:05:06.000Z') }).entry?.recordedAt,
    '2026-02-03T04:05:06.000Z',
  );
  assert.equal(
    buildJournalEntry({ ...entry(), recordedAt: Date.UTC(2026, 1, 3, 4, 5, 6) }).entry?.recordedAt,
    '2026-02-03T04:05:06.000Z',
  );
});

test('a browser without randomUUID still produces an acceptable entry identifier', () => {
  const descriptor = /** @type {PropertyDescriptor} */ (
    Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  );
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try {
    const generated = buildJournalEntry({ ...entry(), id: undefined }).entry?.id ?? '';
    const parts = /^run-(\d+)-([a-z0-9]+)$/.exec(generated);
    assert.ok(parts, `fallback identifier has an unexpected shape: ${generated}`);
    assert.ok(Math.abs(Number(parts[1]) - Date.now()) < 10_000, 'the fallback id carries a real timestamp');
    assert.ok(generated.length <= 128, 'a generated id must satisfy the schema it is built for');
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});

test('saveJournalRun separates a rejected run from a browser that refuses storage', () => {
  const storage = memoryStorage();
  assert.equal(saveJournalRun(entry({ id: 'accepted' }), storage), 'saved');
  assert.deepEqual(
    loadJournal(storage).map(({ id }) => id),
    ['accepted'],
  );

  // A schema failure is a defect in the run, and it is reported as such.
  const reports = [];
  const originalError = console.error;
  console.error = (...args) => reports.push(args);
  try {
    assert.equal(saveJournalRun({ ...entry({ id: 'rejected' }), quality: 'excellent' }, storage), 'invalid');
  } finally {
    console.error = originalError;
  }
  assert.equal(reports.length, 1, 'a refused run must be reported exactly once');
  assert.equal(
    reports[0][0],
    'Sense6 rejected a tetracromia journal entry: quality failed validation.',
    'the log must name the instrument and the failing field',
  );
  assert.equal(reports[0][1].id, 'rejected', 'the refused value is logged for diagnosis');
  assert.deepEqual(
    loadJournal(storage).map(({ id }) => id),
    ['accepted'],
    'a refused run must not be stored',
  );

  // A storage failure is a browser problem, and it must not be logged as a
  // validation defect nor reported to the user as one.
  const silenced = [];
  console.error = (...args) => silenced.push(args);
  try {
    assert.equal(saveJournalRun(entry({ id: 'unstorable' }), null), 'storage-unavailable');
    const futureSchema = memoryStorage({
      'sense6:journal': JSON.stringify({ format: 'sense6-journal', schemaVersion: 99, entries: [] }),
    });
    assert.equal(saveJournalRun(entry({ id: 'newer-schema-present' }), futureSchema), 'storage-unavailable');
    assert.equal(
      saveJournalRun(entry({ id: 'write-denied' }), {
        getItem: () => null,
        setItem() {
          throw new Error('quota exceeded');
        },
      }),
      'storage-unavailable',
    );
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(silenced, [], 'a storage failure is not a validation failure');
});

test('stored entries that are not records or not known instruments are refused on read', () => {
  // `journalEntryViolation` guards reads as well as writes: these two shapes are
  // only reachable from stored or imported data, never from a live run.
  const target = memoryStorage();
  assert.deepEqual(importJournal(exportWith([null]), target), { ok: false, reason: 'invalid' });
  assert.deepEqual(importJournal(exportWith([{ ...entry(), examId: 'not-an-exam' }]), target), {
    ok: false,
    reason: 'invalid',
  });
  assert.deepEqual(loadJournal(target), [], 'nothing may be written by a refused import');
});

function manyMeasurements(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `measure-${index}`,
    value: index,
    unit: 'x',
  }));
}

function entry(overrides = {}) {
  return {
    id: 'run-one',
    examId: 'tetracromia',
    recordedAt: '2026-01-01T00:00:00.000Z',
    locale: 'en',
    quality: 'usable',
    protocol: protocolPassport(overrides.examId ?? 'tetracromia'),
    setup: { display: '100x100@1', viewport: '800x600', gamut: 'srgb' },
    qualityEvidence: {},
    measurements: [{ id: 'score', value: 10, unit: '/100' }],
    notes: [],
    ...overrides,
  };
}

function acutezzaEntry({ id, eyes, values = { left: 3, right: 6 }, persistCompletion = true }) {
  const setup = {
    display: '100x100@1',
    correction: 'glasses',
    contrastPercent: 10,
    theme: 'light',
    distanceMm: 500,
    calibrationState: 'measured',
    cardWidthCssPx: 320,
    ...(persistCompletion
      ? {
          completedEyes: [...eyes].sort().join(','),
          completionVariant: eyes.length === 2 ? 'both-eyes' : 'single-eye',
        }
      : {}),
  };
  return entry({
    id,
    examId: 'acutezza',
    protocol: protocolPassport('acutezza'),
    setup,
    measurements: eyes.map((eye) => ({ id: `${eye}-high`, value: values[eye], unit: 'arcmin' })),
  });
}

function exportWith(entries) {
  return JSON.stringify({ format: 'sense6-journal-export', schemaVersion: 2, entries });
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
