import assert from 'node:assert/strict';
import test from 'node:test';
import { createExamLifecycle } from '../src/lib/lifecycle.js';

test('a new owner mount disposes the previous mount exactly once', () => {
  globalThis.document = { body: { classList: { remove() {} } } };
  const owner = Symbol('exam');
  let firstCleanups = 0;
  const first = createExamLifecycle(owner);
  first.onCleanup(() => firstCleanups++);
  const second = createExamLifecycle(owner);
  assert.equal(first.signal.aborted, true);
  assert.equal(firstCleanups, 1);
  second.dispose();
  second.dispose();
  assert.equal(second.signal.aborted, true);
  delete globalThis.document;
});

test('cleanup failures do not strand later cleanup or body state', () => {
  const removed = [];
  globalThis.document = { body: { classList: { remove: (...classes) => removed.push(...classes) } } };
  const originalError = console.error;
  let reports = 0;
  console.error = () => reports++;
  try {
    const lifecycle = createExamLifecycle(Symbol('exam'), { bodyClasses: ['lab-mode', 'running'] });
    let completed = false;
    lifecycle.onCleanup(() => {
      completed = true;
    });
    lifecycle.onCleanup(() => {
      throw new Error('cleanup failure');
    });
    lifecycle.dispose();

    assert.equal(completed, true);
    assert.equal(reports, 1);
    assert.deepEqual(removed, ['lab-mode', 'running']);
  } finally {
    console.error = originalError;
    delete globalThis.document;
  }
});
