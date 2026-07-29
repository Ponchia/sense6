import assert from 'node:assert/strict';
import test from 'node:test';

import { seededRandom, shuffle } from '../src/lib/random.js';

test('seeded random sequences are repeatable and different seeds diverge', () => {
  const first = seededRandom('same-seed');
  const second = seededRandom('same-seed');
  assert.deepEqual(Array.from({ length: 20 }, first), Array.from({ length: 20 }, second));

  // Pinned values: a generator that silently degraded to a constant would still
  // satisfy the repeatability check above.
  assert.deepEqual(
    Array.from({ length: 5 }, seededRandom('same-seed')),
    [0.42831624625250697, 0.053841064684093, 0.9561180372256786, 0.6989174503833055, 0.7377086200285703],
  );

  assert.notDeepEqual(
    Array.from({ length: 20 }, seededRandom('same-seed')),
    Array.from({ length: 20 }, seededRandom('other-seed')),
  );

  for (const value of Array.from({ length: 200 }, seededRandom('range'))) {
    assert.ok(value >= 0 && value < 1, `seededRandom produced ${value} outside [0, 1)`);
  }
});

test('shuffle actually reorders, deterministically, for a known seed', () => {
  const values = [0, 1, 2, 3, 4, 5, 6];

  // This test previously asserted only determinism and membership, both of
  // which an identity function satisfies. Pin the permutation instead.
  assert.deepEqual(shuffle(values, seededRandom('shuffle')), [2, 3, 5, 1, 0, 4, 6]);
  assert.deepEqual(shuffle(values, seededRandom('shuffle')), [2, 3, 5, 1, 0, 4, 6]);
  assert.deepEqual(shuffle(values, seededRandom('other')), [4, 0, 5, 3, 2, 1, 6]);
  assert.notDeepEqual(shuffle(values, seededRandom('shuffle')), values);
});

test('shuffle preserves every member and leaves the input untouched', () => {
  const values = [0, 1, 2, 3, 4, 5, 6];
  const result = shuffle(values, seededRandom('shuffle'));
  assert.deepEqual(
    [...result].sort((left, right) => left - right),
    values,
  );
  assert.deepEqual(values, [0, 1, 2, 3, 4, 5, 6], 'shuffle must not mutate its input');
  assert.notEqual(result, values, 'shuffle must return a new array');
});

test('shuffle handles degenerate inputs without reordering anything', () => {
  assert.deepEqual(shuffle([], seededRandom('empty')), []);
  assert.deepEqual(shuffle([9], seededRandom('single')), [9]);
});

test('shuffle rejects random sources outside the documented half-open range', () => {
  assert.throws(() => shuffle([1, 2], () => 1), /missing shuffle target index/i);
});
