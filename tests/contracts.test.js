import assert from 'node:assert/strict';
import test from 'node:test';
import { EXAM_CONTRACTS, EXAM_IDS, examContract, METRIC_TEST_IDS } from '../src/exams/contracts.js';
import { EXAMS } from '../src/exams/registry.js';

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
