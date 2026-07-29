import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createExamLifecycle,
  forcedColorsActive,
  isCurrentMount,
  watchForcedColors,
} from '../src/lib/lifecycle.js';
import { disposeActiveMounts } from '../src/lib/mount-registry.js';
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

test('all partial exam mounts can be retired after a route commit failure', () => {
  globalThis.document = { body: { classList: { remove() {}, toggle() {} } } };
  try {
    const first = createExamLifecycle(Symbol('first'));
    const second = createExamLifecycle(Symbol('second'));
    let cleanups = 0;
    first.onCleanup(() => cleanups++);
    second.onCleanup(() => cleanups++);

    disposeActiveMounts();
    disposeActiveMounts();

    assert.equal(first.signal.aborted, true);
    assert.equal(second.signal.aborted, true);
    assert.equal(cleanups, 2);
  } finally {
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

test('the lifecycle owns its body classes for the whole mount, not only at teardown', () => {
  const events = [];
  globalThis.document = {
    body: {
      classList: {
        add: (...classes) => events.push(['add', ...classes]),
        remove: (...classes) => events.push(['remove', ...classes]),
        toggle() {},
      },
    },
  };
  try {
    const lifecycle = createExamLifecycle(Symbol('exam'), { bodyClasses: ['udito-route', 'lab-mode'] });
    assert.deepEqual(
      events,
      [['add', 'udito-route', 'lab-mode']],
      'the classes must be applied at creation, not left to the caller',
    );

    lifecycle.dispose();
    assert.deepEqual(events, [
      ['add', 'udito-route', 'lab-mode'],
      ['remove', 'measurement-active'],
      ['remove', 'udito-route', 'lab-mode'],
    ]);

    // A mount that declares no classes must touch neither add nor remove.
    events.length = 0;
    createExamLifecycle(Symbol('bare')).dispose();
    assert.deepEqual(events, [['remove', 'measurement-active']]);
  } finally {
    delete globalThis.document;
  }
});

test('forced-colors detection asks the platform for a definite match', () => {
  const queries = [];
  try {
    globalThis.window = {
      matchMedia: (query) => {
        queries.push(query);
        return { matches: true };
      },
    };
    assert.equal(forcedColorsActive(), true);
    assert.deepEqual(queries, ['(forced-colors: active)'], 'any other query answers a different question');

    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(forcedColorsActive(), false);

    // `matches` is required to be exactly true: a truthy stand-in is not a match.
    globalThis.window = { matchMedia: () => ({ matches: 'active' }) };
    assert.equal(forcedColorsActive(), false);

    // A platform without media queries cannot be overriding colours.
    globalThis.window = {};
    assert.equal(forcedColorsActive(), false);
  } finally {
    delete globalThis.window;
  }
});

test('a forced-colors watcher is scoped to the mount that registered it', () => {
  const registrations = [];
  const controller = new AbortController();
  const onChange = () => {};
  try {
    globalThis.window = {
      matchMedia: (query) => ({
        addEventListener: (type, listener, options) => registrations.push({ query, type, listener, options }),
      }),
    };
    watchForcedColors(onChange, controller.signal);
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].query, '(forced-colors: active)');
    assert.equal(registrations[0].type, 'change');
    assert.equal(registrations[0].listener, onChange);
    assert.equal(
      registrations[0].options.signal,
      controller.signal,
      'the listener must be released with the mount, not leaked across routes',
    );

    // A platform without media queries registers nothing and must not throw.
    globalThis.window = {};
    watchForcedColors(onChange, controller.signal);
    assert.equal(registrations.length, 1);
  } finally {
    delete globalThis.window;
  }
});

test('a captured mount is current only while it is both the active mount and undisposed', () => {
  globalThis.document = { body: { classList: { add() {}, remove() {}, toggle() {} } } };
  try {
    const mount = { lifecycle: createExamLifecycle(Symbol('exam')) };
    const other = { lifecycle: createExamLifecycle(Symbol('other')) };

    assert.equal(isCurrentMount(mount, mount), true);
    assert.equal(isCurrentMount(other, mount), false, 'a different mount is driving the module now');
    assert.equal(isCurrentMount(null, mount), false, 'nothing is mounted');

    // Identity alone is not enough: disposal happens in the same frame as a
    // pending callback, so an aborted signal must retire the captured mount.
    mount.lifecycle.dispose();
    assert.equal(isCurrentMount(mount, mount), false);
    assert.equal(isCurrentMount(other, other), true, 'an unrelated mount stays current');

    other.lifecycle.dispose();
    assert.equal(isCurrentMount(other, other), false);
  } finally {
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
