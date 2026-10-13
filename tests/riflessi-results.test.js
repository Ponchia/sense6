import assert from 'node:assert/strict';
import test from 'node:test';
import { isRiflessiLatestResult } from '../src/exams/results/riflessi.js';
import { summarizeRiflessi } from '../src/lib/reflexes.js';
import { createResultStore } from '../src/lib/storage.js';

const KEY = 'sense6:riflessi:last';
const CONTEXT = {
  inputMode: 'keyboard',
  timing: 'Timing appeared steady',
  recordedAt: 1_750_000_000_000,
};

test('Riflessi latest-result validation accepts each producer scope and limited observations', () => {
  for (const scope of ['signal', 'signal-choice', 'complete']) {
    const result = currentResult(scope);
    assert.equal(isRiflessiLatestResult(result), true, scope);
  }

  const empty = {
    ...summarizeRiflessi(
      { signal: [], choice: [], stability: [] },
      { signal: 20, signalScheduled: 22, choice: 32, catches: 2, interruptions: 1 },
    ),
    ...CONTEXT,
    timing: 'Timing interruptions observed',
  };
  assert.equal(empty.usable, false);
  assert.equal(isRiflessiLatestResult(empty), true, 'null estimates remain valid in a limited run');

  const signed = currentResult('complete');
  signed.choice.blockDifferenceMs = -90;
  signed.stability.driftMs = -15;
  assert.equal(isRiflessiLatestResult(signed), true, 'block differences and drift may be negative');
});

test('Riflessi keeps captured historical summaries without inventing current fields', () => {
  const historicalResults = [
    {
      ...legacyResult(),
      stability: { medianMs: null, slowestGapMs: null, driftMs: null, valid: 0 },
      usable: false,
    },
    legacyResult(),
    {
      ...legacyResult(),
      stability: { medianMs: 240, slowestGapMs: 55, driftMs: 10, valid: 4 },
    },
  ];
  for (const historical of historicalResults) {
    assert.equal(isRiflessiLatestResult(historical), true);
    const storage = memoryStorage(JSON.stringify(historical));
    const store = createResultStore({ key: KEY, validate: isRiflessiLatestResult });

    assert.deepEqual(store.load(storage), historical);
    const saved = JSON.parse(storage.getItem(KEY));
    assert.equal(saved.format, 'sense6-result');
    assert.equal(saved.schemaVersion, 1);
    assert.deepEqual(saved.payload, historical);
    assert.equal(Object.hasOwn(saved.payload, 'qualityReasons'), false);
    assert.equal(Object.hasOwn(saved.payload.choice, 'scheduled'), false);
    assert.equal(Object.hasOwn(saved.payload.signal, 'withinRunSpreadMs'), false);
  }
});

test('Riflessi rejects malformed current measurements, context, denominators, and quality evidence', () => {
  const original = currentResult('complete');
  const mutations = [
    [
      'extra payload',
      (value) => {
        value.unexpected = true;
      },
    ],
    [
      'unknown input',
      (value) => {
        value.inputMode = 'gamepad';
      },
    ],
    [
      'unknown timing',
      (value) => {
        value.timing = 'perfect';
      },
    ],
    [
      'invalid date',
      (value) => {
        value.recordedAt = 9_000_000_000_000_000;
      },
    ],
    [
      'fractional date',
      (value) => {
        value.recordedAt = 1.5;
      },
    ],
    [
      'negative date',
      (value) => {
        value.recordedAt = -1;
      },
    ],
    [
      'negative median',
      (value) => {
        value.signal.medianMs = -5;
      },
    ],
    [
      'missing spread',
      (value) => {
        delete value.signal.withinRunSpreadMs;
      },
    ],
    [
      'non-finite spread',
      (value) => {
        value.signal.withinRunSpreadMs = Number.POSITIVE_INFINITY;
      },
    ],
    [
      'missing denominator',
      (value) => {
        delete value.signal.scheduled;
      },
    ],
    [
      'fractional count',
      (value) => {
        value.signal.valid = 1.5;
      },
    ],
    [
      'count exceeds schedule',
      (value) => {
        value.signal.valid = value.signal.scheduled + 1;
      },
    ],
    [
      'missing observed estimate',
      (value) => {
        value.signal.medianMs = null;
      },
    ],
    [
      'invented empty estimate',
      (value) => {
        value.signal.valid = 0;
      },
    ],
    [
      'extra nested field',
      (value) => {
        value.signal.uncertainty = 10;
      },
    ],
    [
      'invalid accuracy',
      (value) => {
        value.choice.conditionalAccuracyPercent = 101;
      },
    ],
    [
      'missing accuracy',
      (value) => {
        delete value.choice.scheduledAccuracyPercent;
      },
    ],
    [
      'missing attempts',
      (value) => {
        delete value.choice.attempts;
      },
    ],
    [
      'valid exceeds attempts',
      (value) => {
        value.choice.attempts = value.choice.valid - 1;
      },
    ],
    [
      'attempts exceed schedule',
      (value) => {
        value.choice.scheduled = value.choice.attempts - 1;
      },
    ],
    [
      'missing block difference',
      (value) => {
        value.choice.blockDifferenceMs = null;
      },
    ],
    [
      'invalid signed metric',
      (value) => {
        value.stability.driftMs = 'slower';
      },
    ],
    [
      'negative slow tail',
      (value) => {
        value.stability.slowestGapMs = -1;
      },
    ],
    [
      'missing catch evidence',
      (value) => {
        delete value.events.catchesScheduled;
      },
    ],
    [
      'catch passes exceed schedule',
      (value) => {
        value.events.catchesPassed = 3;
      },
    ],
    [
      'wrong choices exceed attempts',
      (value) => {
        value.events.wrongChoices = 1;
      },
    ],
    [
      'unknown quality reason',
      (value) => {
        value.qualityReasons = ['excellent'];
        value.usable = false;
      },
    ],
    [
      'missing quality reasons',
      (value) => {
        delete value.qualityReasons;
      },
    ],
    [
      'inconsistent usability',
      (value) => {
        value.usable = false;
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(original);
    mutate(candidate);
    assert.equal(isRiflessiLatestResult(candidate), false, label);
  }
  for (const value of [null, [], {}, 'result']) assert.equal(isRiflessiLatestResult(value), false);
});

test('Riflessi legacy validation rejects incomplete or impossible summaries without rewriting them', () => {
  const original = legacyResult();
  const invalid = [
    { ...original, signal: { medianMs: 215, valid: 20 } },
    { ...original, choice: { ...original.choice, accuracyPercent: -1 } },
    { ...original, choice: { ...original.choice, attempts: 1 } },
    { ...original, stability: { ...original.stability, driftMs: undefined } },
    { ...original, events: { ...original.events, falseStarts: -1 } },
    { ...original, usable: 'yes' },
  ];
  const store = createResultStore({ key: KEY, validate: isRiflessiLatestResult });
  for (const candidate of invalid) {
    const raw = JSON.stringify(candidate);
    const storage = memoryStorage(raw);
    assert.equal(store.load(storage), null);
    assert.equal(storage.getItem(KEY), raw, 'rejected data remains available for deliberate recovery');
    assert.equal(store.save(candidate, storage), false);
  }
});

test('Riflessi current summaries round-trip and future envelopes remain untouched', () => {
  const store = createResultStore({ key: KEY, validate: isRiflessiLatestResult });
  const result = currentResult('signal');
  const storage = memoryStorage();
  assert.equal(store.save(result, storage), true);
  assert.deepEqual(store.load(storage), result);

  const future = JSON.stringify({ format: 'sense6-result', schemaVersion: 99, payload: result });
  const futureStorage = memoryStorage(future);
  assert.equal(store.load(futureStorage), null);
  assert.equal(futureStorage.getItem(KEY), future);
});

function currentResult(scope) {
  const choice = scope !== 'signal';
  const stability = scope === 'complete';
  const clean = (count, rt) => Array.from({ length: count }, () => ({ outcome: 'correct', rt }));
  return {
    ...summarizeRiflessi(
      {
        signal: [...clean(20, 215), { outcome: 'catch-correct' }, { outcome: 'catch-correct' }],
        choice: choice ? clean(32, 310) : [],
        stability: stability ? clean(18, 245) : [],
      },
      { signal: 20, signalScheduled: 22, catches: 2, choice: choice ? 32 : 0, stability: stability ? 6 : 0 },
    ),
    ...CONTEXT,
  };
}

// Captured by executing summarizeRiflessi at da418b998d761d6321861784cd98006443f4da65
// and 04b24134a56b080bac6461b01762409b7c5970ce (the last pre-audit revision).
// Signal RTs [201, 209, 218, 247] plus false-start/anticipation; choice RTs
// [260, 287] plus a miss; stability RTs [] / [263] / [263, 221, 208, 299].
// Expected counts: signal 4, choice 3, stability 1. Both producers agree.
function legacyResult() {
  return {
    signal: { medianMs: 215, spreadMs: 10, valid: 4 },
    choice: { medianMs: 275, accuracyPercent: 67, costMs: 60, valid: 2, attempts: 3 },
    stability: { medianMs: 265, slowestGapMs: 0, driftMs: null, valid: 1 },
    events: { falseStarts: 1, anticipations: 1, misses: 1, wrongChoices: 0 },
    usable: true,
    ...CONTEXT,
    inputMode: 'pointer',
  };
}

function memoryStorage(raw = null) {
  const values = new Map(raw === null ? [] : [[KEY, raw]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
