import assert from 'node:assert/strict';
import test from 'node:test';
import { isUditoLatestResult } from '../src/exams/results/udito.js';
import { createResultStore } from '../src/lib/storage.js';

const KEY = 'sense6:udito:last';
const STORE = createResultStore({ key: KEY, validate: isUditoLatestResult });
const RESULT = {
  setupQuality: 'Setup checks coherent',
  sampleRate: 48_000,
  recordedAt: 1_721_000_000_000,
};

test('Udito latest results retain both known quality labels and legitimate legacy numeric values', () => {
  for (const setupQuality of ['Setup checks coherent', 'Interpret with caution']) {
    for (const sampleRate of [8_000, 44_100, 44_100.5, 48_000, 96_000]) {
      assert.equal(isUditoLatestResult({ ...RESULT, setupQuality, sampleRate }), true);
    }
  }
  assert.equal(isUditoLatestResult({ ...RESULT, recordedAt: 0 }), true);
  assert.equal(isUditoLatestResult({ ...RESULT, recordedAt: 8_640_000_000_000_000 }), true);
});

test('Udito latest results reject malformed shapes, unknown fields, and invalid numeric values', () => {
  for (const malformed of [
    null,
    [],
    'result',
    {},
    Object.create(RESULT),
    { ...RESULT, extra: true },
    { ...RESULT, setupQuality: '<img src=x onerror=alert(1)>' },
    { ...RESULT, setupQuality: 'Run unusable' },
    { ...RESULT, setupQuality: 1 },
    { ...RESULT, sampleRate: '48000' },
    { ...RESULT, sampleRate: null },
    { ...RESULT, sampleRate: 0 },
    { ...RESULT, sampleRate: -1 },
    { ...RESULT, sampleRate: Number.NaN },
    { ...RESULT, sampleRate: Number.POSITIVE_INFINITY },
    { ...RESULT, recordedAt: null },
    { ...RESULT, recordedAt: '1721000000000' },
    { ...RESULT, recordedAt: -1 },
    { ...RESULT, recordedAt: 1.5 },
    { ...RESULT, recordedAt: Number.NaN },
    { ...RESULT, recordedAt: Number.POSITIVE_INFINITY },
    { ...RESULT, recordedAt: 8_640_000_000_000_001 },
    { ...RESULT, recordedAt: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.equal(isUditoLatestResult(malformed), false, JSON.stringify(malformed));
  }
  for (const key of Object.keys(RESULT)) {
    const incomplete = { ...RESULT };
    delete incomplete[key];
    assert.equal(isUditoLatestResult(incomplete), false, key);
  }
});

test('raw legacy Udito records normalize into schema one without losing or inventing result data', () => {
  const legacy = { ...RESULT, setupQuality: 'Interpret with caution' };
  const storage = memoryStorage(JSON.stringify(legacy));
  assert.deepEqual(STORE.load(storage), legacy);
  const stored = JSON.parse(storage.getItem(KEY));
  assert.equal(stored.format, 'sense6-result');
  assert.equal(stored.schemaVersion, 1);
  assert.deepEqual(stored.payload, legacy);
  assert.deepEqual(STORE.load(storage), legacy);
});

test('current Udito envelopes remain readable without being rewritten', () => {
  const raw = JSON.stringify({
    format: 'sense6-result',
    schemaVersion: 1,
    savedAt: '2024-07-15T00:00:00.000Z',
    payload: RESULT,
  });
  const storage = memoryStorage(raw);
  assert.deepEqual(STORE.load(storage), RESULT);
  assert.equal(storage.getItem(KEY), raw);
});

test('malformed and future Udito envelopes stay untouched and cannot become previous-result claims', () => {
  for (const value of [
    { format: 'sense6-result', schemaVersion: 1 },
    { format: 'sense6-result', schemaVersion: '1', payload: RESULT },
    { format: 'sense6-result', schemaVersion: 1.5, payload: RESULT },
    { format: 'sense6-result', schemaVersion: 2, payload: RESULT },
    { format: 'sense6-result', schemaVersion: 1, payload: { ...RESULT, extra: true } },
    { format: 'sense6-result', schemaVersion: 1, payload: { ...RESULT, recordedAt: 1.5 } },
  ]) {
    const raw = JSON.stringify(value);
    const storage = memoryStorage(raw);
    assert.equal(STORE.load(storage), null);
    assert.equal(storage.getItem(KEY), raw);
  }
});

test('invalid Udito writes preserve the previous result', () => {
  const storage = memoryStorage();
  assert.equal(STORE.save(RESULT, storage), true);
  const previous = storage.getItem(KEY);
  assert.equal(STORE.save({ ...RESULT, unexpected: 'data' }, storage), false);
  assert.equal(storage.getItem(KEY), previous);
  assert.deepEqual(STORE.load(storage), RESULT);
});

function memoryStorage(raw = null) {
  const values = new Map(raw === null ? [] : [[KEY, raw]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
