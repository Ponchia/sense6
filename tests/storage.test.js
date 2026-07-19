import assert from 'node:assert/strict';
import test from 'node:test';
import { createResultStore, isRecord } from '../src/lib/storage.js';

test('result stores wrap payloads in a versioned envelope', () => {
  const storage = memoryStorage();
  const store = createResultStore({ key: 'sense6:test:last', validate: isRecord });
  assert.equal(store.save({ score: 42 }, storage), true);
  const stored = JSON.parse(storage.getItem(store.key));
  assert.equal(stored.format, 'sense6-result');
  assert.equal(stored.schemaVersion, 1);
  assert.deepEqual(stored.payload, { score: 42 });
  assert.deepEqual(store.load(storage), { score: 42 });
});

test('legacy payloads migrate without deleting the recoverable source', () => {
  const storage = memoryStorage({ legacy: JSON.stringify({ score: 7 }) });
  const store = createResultStore({ key: 'sense6:test:last', legacyKeys: ['legacy'] });
  assert.deepEqual(store.load(storage), { score: 7 });
  assert.ok(storage.getItem('legacy'));
  assert.equal(JSON.parse(storage.getItem(store.key)).schemaVersion, 1);
});

test('invalid, corrupt, and future payloads fail closed', () => {
  const store = createResultStore({
    key: 'sense6:test:last',
    validate: (value) => isRecord(value) && Number.isFinite(value.score),
  });
  const corrupt = memoryStorage({ [store.key]: '{' });
  const invalid = memoryStorage({ [store.key]: JSON.stringify({ nope: true }) });
  const future = memoryStorage({
    [store.key]: JSON.stringify({ format: 'sense6-result', schemaVersion: 99, payload: { score: 1 } }),
  });
  assert.equal(store.load(corrupt), null);
  assert.equal(store.load(invalid), null);
  assert.equal(store.load(future), null);
});

test('a future canonical payload is never replaced by older legacy data', () => {
  const key = 'sense6:test:last';
  const futureValue = JSON.stringify({
    format: 'sense6-result',
    schemaVersion: 99,
    payload: { score: 10 },
  });
  const storage = memoryStorage({ [key]: futureValue, legacy: JSON.stringify({ score: 1 }) });
  const store = createResultStore({ key, legacyKeys: ['legacy'] });

  assert.equal(store.load(storage), null);
  assert.equal(storage.getItem(key), futureValue);
});

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
