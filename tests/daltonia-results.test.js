import assert from 'node:assert/strict';
import test from 'node:test';
import { isDaltoniaLatestResult } from '../src/exams/results/daltonia.js';
import {
  createAdaptiveRun,
  currentAdaptiveTrial,
  recordAdaptiveAnswer,
  summarizeAdaptiveRun,
} from '../src/lib/daltonism.js';
import { seededRandom } from '../src/lib/random.js';
import { createResultStore } from '../src/lib/storage.js';

const KEY = 'sense6:daltonia:last';
const LEGACY_KEY = 'daltonia-last';
const SAVED_AT = '2025-06-15T15:06:40.000Z';
const AXES = ['protan', 'deutan', 'tritan'];

function resultStore() {
  return createResultStore({ key: KEY, legacyKeys: [LEGACY_KEY], validate: isDaltoniaLatestResult });
}

test('Daltonia latest storage accepts actual completed producer output at bounds and settled tracks', () => {
  for (const strategy of ['correct', 'wrong', 'mixed']) {
    const result = currentResult(strategy);
    assert.equal(isDaltoniaLatestResult(result), true, strategy);
    const storage = memoryStorage();
    assert.equal(resultStore().save(result, storage), true);
    assert.deepEqual(resultStore().load(storage), result);
  }
  const reordered = currentResult('mixed');
  reordered.levels.reverse();
  assert.equal(isDaltoniaLatestResult(reordered), true, 'named levels do not depend on array order');
});

test('Daltonia preserves captured schema-3 payloads through raw and historical-key envelope migration', () => {
  // Captured by executing both summarizeAdaptiveRun and saveLast at
  // 887d7c8247d1b8d08c61043d9f134e3b703c0991 and
  // 9396f84b4205ac08324696409d95855db4bac197. Seed: daltonia:captured-history;
  // answers: all correct, all wrong, or two correct then one wrong per axis
  // with the first of three controls wrong. Both revisions yield these values.
  for (const [level, spread, controlOk] of [
    [0.035, 0.055, true],
    [0.32, 0.055, false],
    [0.167, 0.012, false],
  ]) {
    const historical = {
      schemaVersion: 3,
      levels: AXES.map((type) => ({ type, level, spread })),
      controlOk,
      savedAt: SAVED_AT,
    };
    for (const key of [KEY, LEGACY_KEY]) {
      const raw = JSON.stringify(historical);
      const storage = memoryStorage([[key, raw]]);
      assert.deepEqual(resultStore().load(storage), historical);
      const migrated = JSON.parse(storage.getItem(KEY));
      assert.equal(migrated.format, 'sense6-result');
      assert.equal(migrated.schemaVersion, 1);
      assert.deepEqual(migrated.payload, historical);
      assert.equal(Object.hasOwn(migrated.payload, 'thresholds'), false);
      assert.equal(Object.hasOwn(migrated.payload, 'protocol'), false);
      if (key === LEGACY_KEY) assert.equal(storage.getItem(LEGACY_KEY), raw);
    }
  }
});

test('Daltonia rejects malformed levels and metadata without rewriting stored bytes', () => {
  const original = currentResult('mixed');
  const [protan, deutan, tritan] = original.levels;
  const invalid = [
    ['null result', null],
    ['array result', []],
    ['unknown schema', { ...original, schemaVersion: 4 }],
    ['extra payload', { ...original, clinicalScore: 100 }],
    ['missing levels', { schemaVersion: 3, controlOk: true, savedAt: SAVED_AT }],
    ['empty levels', { ...original, levels: [] }],
    ['missing axis', { ...original, levels: [protan, deutan] }],
    ['extra axis', { ...original, levels: [...original.levels, protan] }],
    ['duplicate axis', { ...original, levels: [protan, protan, tritan] }],
    ['null axis', { ...original, levels: [null, deutan, tritan] }],
    ['sparse levels', { ...original, levels: Object.assign(new Array(3), { 1: deutan, 2: tritan }) }],
    ['unknown axis', { ...original, levels: [{ ...protan, type: 'control' }, deutan, tritan] }],
    ['extra axis field', { ...original, levels: [{ ...protan, threshold: 0.167 }, deutan, tritan] }],
    ['nonnumeric level', { ...original, levels: [{ ...protan, level: '0.167' }, deutan, tritan] }],
    ['missing level', { ...original, levels: [{ type: 'protan', spread: 0.012 }, deutan, tritan] }],
    ['non-finite level', { ...original, levels: [{ ...protan, level: Number.NaN }, deutan, tritan] }],
    ['below track range', { ...original, levels: [{ ...protan, level: 0.034 }, deutan, tritan] }],
    ['above track range', { ...original, levels: [{ ...protan, level: 0.321 }, deutan, tritan] }],
    ['negative spread', { ...original, levels: [{ ...protan, spread: -1 }, deutan, tritan] }],
    ['excessive spread', { ...original, levels: [{ ...protan, spread: 1 }, deutan, tritan] }],
    ['non-finite spread', { ...original, levels: [{ ...protan, spread: Infinity }, deutan, tritan] }],
    ['missing spread', { ...original, levels: [{ type: 'protan', level: 0.167 }, deutan, tritan] }],
    ['nonnumeric spread', { ...original, levels: [{ ...protan, spread: 'narrow' }, deutan, tritan] }],
    ['invalid control flag', { ...original, controlOk: 'passed' }],
    ['missing control flag', { schemaVersion: 3, levels: original.levels, savedAt: SAVED_AT }],
    ['invalid date', { ...original, savedAt: 'yesterday' }],
    ['normalized invalid date', { ...original, savedAt: '2025-02-30T15:06:40.000Z' }],
    ['missing date', { schemaVersion: 3, levels: original.levels, controlOk: true }],
  ];
  for (const [label, candidate] of invalid) {
    assert.equal(isDaltoniaLatestResult(candidate), false, label);
    const raw = JSON.stringify(candidate);
    const storage = memoryStorage([[KEY, raw]]);
    assert.equal(resultStore().load(storage), null, label);
    assert.equal(storage.getItem(KEY), raw, label);
    assert.equal(resultStore().save(candidate, storage), false, label);
  }
});

test('Daltonia keeps genuine schema-2 thresholds outside the schema-3 contract', () => {
  // Captured from the original 9d590f78edd701fa1ce827e6d3600d76ca59c974
  // producer/writer using the mixed-answer history case above. Its two-passed
  // controls were still controlOk:true; schema 3 deliberately reports caution.
  const historical = {
    schemaVersion: 2,
    thresholds: AXES.map((type) => ({ type, threshold: 0.167, spread: 0.012 })),
    controlOk: true,
    savedAt: SAVED_AT,
  };
  const raw = JSON.stringify(historical);
  const storage = memoryStorage([[LEGACY_KEY, raw]]);
  assert.equal(resultStore().load(storage), null);
  assert.equal(storage.getItem(LEGACY_KEY), raw);
  assert.equal(storage.getItem(KEY), null);
  assert.equal(resultStore().save(historical, storage), false);
});

test('Daltonia retains canonical dates and leaves future envelopes in control of their key', () => {
  const result = currentResult('correct');
  for (const timestamp of [0, 8_640_000_000_000_000]) {
    assert.equal(isDaltoniaLatestResult({ ...result, savedAt: new Date(timestamp).toISOString() }), true);
  }
  const future = JSON.stringify({ format: 'sense6-result', schemaVersion: 99, payload: result });
  const legacy = JSON.stringify(result);
  const storage = memoryStorage([
    [KEY, future],
    [LEGACY_KEY, legacy],
  ]);
  assert.equal(resultStore().load(storage), null);
  assert.equal(storage.getItem(KEY), future);
  assert.equal(storage.getItem(LEGACY_KEY), legacy);
});

function currentResult(strategy) {
  const run = createAdaptiveRun(seededRandom('daltonia:captured-history'));
  const counts = { protan: 0, deutan: 0, tritan: 0, control: 0 };
  while (currentAdaptiveTrial(run)) {
    const trial = currentAdaptiveTrial(run);
    const count = counts[trial.type]++;
    const correct =
      strategy === 'correct' ||
      (strategy === 'mixed' && (trial.type === 'control' ? count > 0 : count % 3 < 2));
    recordAdaptiveAnswer(run, correct ? trial.orientation : trial.orientation === 'up' ? 'down' : 'up');
  }
  const result = summarizeAdaptiveRun(run);
  assert.equal(result.complete, true);
  return {
    schemaVersion: 3,
    levels: result.axes.map(({ type, threshold, spread }) => ({ type, level: threshold, spread })),
    controlOk: result.controlOk,
    savedAt: SAVED_AT,
  };
}

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
