import assert from 'node:assert/strict';
import test from 'node:test';
import { createExamLifecycle } from '../src/lib/lifecycle.js';
import { allowsNavigation } from '../src/lib/navigation.js';

test('a new owner mount disposes the previous mount exactly once', () => {
  globalThis.document = { body: { classList: { remove() {}, toggle() {} } } };
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
  globalThis.document = {
    body: { classList: { remove: (...classes) => removed.push(...classes), toggle() {} } },
  };
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
    assert.deepEqual(removed, ['measurement-active', 'lab-mode', 'running']);
  } finally {
    console.error = originalError;
    delete globalThis.document;
  }
});

test('active measurements guard navigation and release the shell on completion', () => {
  const toggles = [];
  const locale = { disabled: false };
  const theme = { disabled: false };
  globalThis.document = {
    body: {
      classList: {
        remove() {},
        toggle: (name, active) => toggles.push([name, active]),
      },
    },
    querySelectorAll: () => [locale, theme],
  };
  globalThis.confirm = () => false;
  try {
    const lifecycle = createExamLifecycle(Symbol('exam'));
    lifecycle.setActive(true, 'Keep this run?');
    assert.equal(allowsNavigation({ locale: 'en', route: '' }), false);
    assert.equal(locale.disabled, true);
    assert.equal(theme.disabled, true);
    lifecycle.setActive(false);
    assert.equal(allowsNavigation({ locale: 'en', route: '' }), true);
    assert.equal(locale.disabled, false);
    assert.equal(theme.disabled, false);
    assert.deepEqual(toggles, [
      ['measurement-active', true],
      ['measurement-active', false],
    ]);
    lifecycle.dispose();
  } finally {
    delete globalThis.confirm;
    delete globalThis.document;
  }
});

test('present resets scroll and moves focus to the new screen heading', () => {
  const calls = [];
  const heading = {
    hasAttribute: () => false,
    setAttribute: (name, value) => calls.push(['attribute', name, value]),
    focus: (options) => calls.push(['focus', options]),
  };
  const root = { querySelector: () => heading };
  globalThis.document = { body: { classList: { remove() {}, toggle() {} } } };
  globalThis.window = { scrollTo: (options) => calls.push(['scroll', options]) };
  globalThis.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  try {
    const lifecycle = createExamLifecycle(Symbol('exam'));
    lifecycle.present(root);
    assert.deepEqual(calls, [
      ['scroll', { top: 0, left: 0, behavior: 'instant' }],
      ['scroll', { top: 0, left: 0, behavior: 'instant' }],
      ['attribute', 'tabindex', '-1'],
      ['focus', { preventScroll: true }],
    ]);
    lifecycle.dispose();
  } finally {
    delete globalThis.requestAnimationFrame;
    delete globalThis.window;
    delete globalThis.document;
  }
});
