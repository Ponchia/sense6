import assert from 'node:assert/strict';
import test from 'node:test';

import { seededRandom, shuffle } from '../src/lib/random.js';

test('seeded random sequences are repeatable', () => {
  const first = seededRandom('same-seed');
  const second = seededRandom('same-seed');
  assert.deepEqual(Array.from({ length: 20 }, first), Array.from({ length: 20 }, second));
});

test('shuffle is repeatable and preserves every member', () => {
  const values = [0, 1, 2, 3, 4, 5, 6];
  const first = shuffle(values, seededRandom('shuffle'));
  const second = shuffle(values, seededRandom('shuffle'));
  assert.deepEqual(first, second);
  assert.deepEqual([...first].sort(), values);
});

test('shuffle rejects random sources outside the documented half-open range', () => {
  assert.throws(() => shuffle([1, 2], () => 1), /missing shuffle target index/i);
});
