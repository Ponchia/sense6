import assert from 'node:assert/strict';
import test from 'node:test';
import { setNavigationGuard } from '../src/lib/navigation.js';
import { navigate, startRouter } from '../src/router.js';

test('programmatic navigation asks once and does not mutate history when rejected', () => {
  const listeners = new Map();
  const location = { hash: '', pathname: '/en/riflessi/', search: '' };
  const history = {
    state: { __sense6Index: 0 },
    pushState(state, _title, href) {
      this.state = state;
      location.pathname = href;
    },
    replaceState(state, _title, href) {
      this.state = state;
      location.pathname = href;
    },
  };
  globalThis.window = {
    location,
    history,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    dispatchEvent: () => listeners.get('popstate')?.(),
  };
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.PopStateEvent = class PopStateEvent {};

  let routes = 0;
  const stopRouter = startRouter(() => routes++);
  let guardCalls = 0;
  let allow = false;
  const clearGuard = setNavigationGuard(() => {
    guardCalls += 1;
    return allow;
  });

  try {
    assert.equal(navigate('', 'en'), false);
    assert.equal(location.pathname, '/en/riflessi/');
    assert.equal(history.state.__sense6Index, 0);
    assert.equal(routes, 1);
    assert.equal(guardCalls, 1);

    allow = true;
    assert.equal(navigate('', 'en'), true);
    assert.equal(location.pathname, '/en/');
    assert.equal(history.state.__sense6Index, 1);
    assert.equal(routes, 2);
    assert.equal(guardCalls, 2, 'accepted navigation must not ask a second time in popstate');
  } finally {
    clearGuard();
    stopRouter();
    delete globalThis.PopStateEvent;
    delete globalThis.document;
    delete globalThis.window;
  }
});
