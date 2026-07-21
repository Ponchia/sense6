import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXAM_CONTRACTS,
  EXAM_IDS,
  examContract,
  isAcutezzaLatestResult,
  isLegacyAcutezzaLatestResult,
  METRIC_TEST_IDS,
  migrateLegacyAcutezzaLatestResult,
} from '../src/exams/contracts.js';
import { EXAM_PROTOCOLS, protocolPassport } from '../src/exams/protocols.js';
import { EXAMS } from '../src/exams/registry.js';
import { EXAM_SOURCES, sourcesByRole, sourcesFor } from '../src/exams/sources.js';
import { DEFAULT_ACUITY_CONFIG } from '../src/lib/acuity.js';
import { ADAPTIVE_CONFIG, createAdaptiveRun } from '../src/lib/daltonism.js';
import { DEFAULT_HEARING_CONFIG } from '../src/lib/hearing.js';
import { DEFAULT_REFLEX_CONFIG } from '../src/lib/reflexes.js';
import { PHASES } from '../src/lib/session.js';

test('every registered exam has one complete service contract', () => {
  assert.deepEqual(
    EXAMS.map(({ id }) => id),
    EXAM_IDS,
  );
  assert.equal(new Set(EXAM_IDS).size, EXAM_IDS.length);
  assert.equal(new Set(METRIC_TEST_IDS).size, METRIC_TEST_IDS.length);

  for (const id of EXAM_IDS) {
    const contract = examContract(id);
    const registryEntry = EXAMS.find((exam) => exam.id === id);
    assert.equal(contract, EXAM_CONTRACTS[id]);
    assert.equal(registryEntry?.contract, contract);
    assert.equal(registryEntry?.metricTest, contract?.metricTest);
    assert.ok(Object.isFrozen(contract));
    assert.ok(Object.isFrozen(contract?.journal));
    assert.ok(Object.isFrozen(contract?.journal.hard));
    assert.ok(Object.isFrozen(contract?.journal.caution));
    assert.ok(Object.isFrozen(contract?.journal.alwaysCaution));
  }
});

test('unknown exam IDs do not inherit another experiment contract', () => {
  assert.equal(examContract('future-exam'), null);
});

test('Acutezza latest-result validation is strict and migrates the legacy count-only shape', () => {
  const legacy = {
    setupQuality: 'Interpret with caution',
    eyes: 1,
    recordedAt: 1_753_084_800_000,
  };
  const migrated = migrateLegacyAcutezzaLatestResult(legacy);

  assert.equal(isLegacyAcutezzaLatestResult(legacy), true);
  assert.deepEqual(migrated, {
    setupQuality: 'Interpret with caution',
    recordedAt: 1_753_084_800_000,
    completion: { variant: 'legacy-count', eyes: [], count: 1 },
  });
  assert.equal(isAcutezzaLatestResult(migrated), true);
  assert.equal(
    isAcutezzaLatestResult({
      setupQuality: 'Setup checks coherent',
      recordedAt: 1_753_084_800_000,
      completion: { variant: 'both-eyes', eyes: ['left', 'right'] },
    }),
    true,
  );
  for (const malformed of [
    {},
    { setupQuality: 'anything', recordedAt: 1, completion: { variant: 'single-eye', eyes: ['left'] } },
    { setupQuality: 'Run unusable', recordedAt: 1, completion: { variant: 'single-eye', eyes: [] } },
    {
      setupQuality: 'Run unusable',
      recordedAt: 1,
      completion: { variant: 'both-eyes', eyes: ['left', 'left'] },
    },
    { ...migrated, extra: true },
  ]) {
    assert.equal(isAcutezzaLatestResult(malformed), false);
  }
});

test('every exam uses one categorized source ledger with no implied validation', () => {
  const sourceIds = new Set();
  for (const exam of EXAMS) {
    assert.equal(exam.sources, sourcesFor(exam.id));
    assert.equal(exam.sources, EXAM_SOURCES[exam.id]);
    assert.equal(sourcesByRole(exam.id, 'validation').length, 0);
    for (const source of exam.sources) {
      assert.ok(['method', 'boundary', 'comparator', 'validation'].includes(source.role));
      assert.match(source.href, /^https:\/\//);
      assert.ok(!sourceIds.has(`${exam.id}:${source.id}`));
      sourceIds.add(`${exam.id}:${source.id}`);
      assert.ok(Object.isFrozen(source));
    }
  }
});

test('protocol passports are frozen and scope changes create distinct cohorts', () => {
  for (const id of EXAM_IDS) {
    const passport = protocolPassport(id);
    assert.equal(passport, EXAM_PROTOCOLS[id]);
    assert.ok(Object.isFrozen(passport));
    for (const value of Object.values(passport)) assert.ok(String(value).trim().length > 0);
  }

  const focusedHearing = protocolPassport('udito', 'focused');
  assert.equal(focusedHearing.profileId, 'focused');
  assert.notEqual(focusedHearing.configDigest, EXAM_PROTOCOLS.udito.configDigest);
  assert.equal(protocolPassport('udito', 'standard'), EXAM_PROTOCOLS.udito);

  const signalOnly = protocolPassport('riflessi', 'signal');
  assert.equal(signalOnly.profileId, 'signal');
  assert.notEqual(signalOnly.configDigest, EXAM_PROTOCOLS.riflessi.configDigest);

  const focusedAcuity = protocolPassport('acutezza', 'focused');
  assert.equal(focusedAcuity.profileId, 'focused');
  assert.notEqual(focusedAcuity.configDigest, EXAM_PROTOCOLS.acutezza.configDigest);
  assert.throws(() => protocolPassport('udito', 'unknown'), /unknown udito protocol profile/i);
});

test('production experiment doses remain explicit invariants', () => {
  assert.deepEqual(
    PHASES.map(({ id, trials }) => [id, trials]),
    [
      ['threshold', 14],
      ['field', 12],
      ['sequence', 3],
    ],
  );

  const daltonia = createAdaptiveRun(() => 0.25);
  assert.equal(daltonia.schedule.length, ADAPTIVE_CONFIG.trialsPerAxis * 3 + ADAPTIVE_CONFIG.controlTrials);
  assert.equal(daltonia.schedule.filter(({ type }) => type === 'control').length, 3);

  assert.deepEqual(
    {
      signalPractice: DEFAULT_REFLEX_CONFIG.signal.practiceTrials,
      signalScored: DEFAULT_REFLEX_CONFIG.signal.scoredTrials,
      signalCatches: DEFAULT_REFLEX_CONFIG.signal.catchTrials,
      choicePractice: DEFAULT_REFLEX_CONFIG.choice.practiceTrials,
      choiceScored: DEFAULT_REFLEX_CONFIG.choice.scoredTrials,
      sustainedMs: DEFAULT_REFLEX_CONFIG.stability.durationMs,
    },
    {
      signalPractice: 8,
      signalScored: 20,
      signalCatches: 2,
      choicePractice: 8,
      choiceScored: 32,
      sustainedMs: 180_000,
    },
  );

  assert.deepEqual(DEFAULT_HEARING_CONFIG.range.controlAt, [8, 17]);
  assert.equal(DEFAULT_HEARING_CONFIG.range.targetReversals, 8);
  assert.deepEqual(DEFAULT_HEARING_CONFIG.pitch.anchorsHz, [500, 2000]);
  assert.equal(DEFAULT_HEARING_CONFIG.pitch.targetReversals, 6);

  assert.equal(DEFAULT_ACUITY_CONFIG.practiceTrials, 4);
  assert.deepEqual(DEFAULT_ACUITY_CONFIG.high, { trials: 18, controlAt: [6, 14] });
  assert.deepEqual(DEFAULT_ACUITY_CONFIG.low.controlAt, [5, 13]);
  assert.equal(DEFAULT_ACUITY_CONFIG.low.trials, 18);
});
