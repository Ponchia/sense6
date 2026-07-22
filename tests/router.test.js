import assert from 'node:assert/strict';
import test from 'node:test';
import { setNavigationGuard } from '../src/lib/navigation.js';
import { currentLocation, navigate, startRouter } from '../src/router.js';

test('the caller explicitly dispatches the initial route once', () => {
  const environment = installRouterEnvironment('/en/riflessi/');
  let mounts = 0;
  const onRoute = () => mounts++;
  const stopRouter = startRouter(onRoute);

  try {
    assert.equal(mounts, 0);
    onRoute(currentLocation());
    assert.equal(mounts, 1);
  } finally {
    stopRouter();
    environment.restore();
  }
});

test('exact programmatic navigation is a no-op without guards or duplicate mounts', () => {
  const environment = installRouterEnvironment('/en/riflessi/', { state: null });
  let mounts = 0;
  let guardCalls = 0;
  const clearGuard = setNavigationGuard(() => {
    guardCalls += 1;
    return false;
  });
  const stopRouter = startRouter(() => mounts++);

  try {
    assert.equal(navigate('riflessi', 'en'), true);
    assert.equal(environment.href(), '/en/riflessi/');
    assert.equal(environment.history.state.__sense6Index, 0);
    assert.equal(environment.historyWrites.length, 1, 'only history initialization may write');
    assert.equal(mounts, 0);
    assert.equal(guardCalls, 0);
  } finally {
    clearGuard();
    stopRouter();
    environment.restore();
  }
});

test('hash-only history preserves the mounted route and native fragment clicks', () => {
  const environment = installRouterEnvironment('/en/riflessi/');
  let mounts = 0;
  const onRoute = () => mounts++;
  const stopRouter = startRouter(onRoute);

  try {
    onRoute(currentLocation());
    environment.pushHistory('/en/riflessi/#results');
    environment.dispatchPopState();
    assert.equal(mounts, 1);
    assert.equal(environment.href(), '/en/riflessi/#results');

    const fragmentClick = environment.clickFragment('#method');
    assert.equal(fragmentClick.defaultPrevented, false);
    assert.equal(mounts, 1);
  } finally {
    stopRouter();
    environment.restore();
  }
});

test('programmatic navigation asks once and does not mutate history when rejected', () => {
  const environment = installRouterEnvironment('/en/riflessi/');
  let routes = 0;
  const onRoute = () => routes++;
  const stopRouter = startRouter(onRoute);
  onRoute(currentLocation());
  let guardCalls = 0;
  let allow = false;
  const clearGuard = setNavigationGuard(() => {
    guardCalls += 1;
    return allow;
  });

  try {
    assert.equal(navigate('', 'en'), false);
    assert.equal(environment.href(), '/en/riflessi/');
    assert.equal(environment.history.state.__sense6Index, 0);
    assert.equal(routes, 1);
    assert.equal(guardCalls, 1);

    allow = true;
    assert.equal(navigate('', 'en'), true);
    assert.equal(environment.href(), '/en/');
    assert.equal(environment.history.state.__sense6Index, 1);
    assert.equal(routes, 2);
    assert.equal(guardCalls, 2, 'accepted navigation must not ask a second time in popstate');
  } finally {
    clearGuard();
    stopRouter();
    environment.restore();
  }
});

test('legacy hash routes still resolve without treating plain fragments as routes', () => {
  assert.deepEqual(currentLocation({ hash: '#/it/udito/', pathname: '/', search: '' }), {
    canonical: true,
    legacy: true,
    locale: 'it',
    route: 'udito',
  });
  assert.deepEqual(currentLocation({ hash: '#results', pathname: '/en/riflessi/', search: '' }), {
    canonical: true,
    legacy: false,
    locale: 'en',
    route: 'riflessi',
  });
});

function installRouterEnvironment(initialHref, { state = { __sense6Index: 0 } } = {}) {
  const listeners = new Map();
  const documentListeners = new Map();
  const location = { hash: '', pathname: '/', search: '' };
  const historyWrites = [];
  const entries = [{ href: initialHref, state }];
  let entryIndex = 0;

  function applyHref(href) {
    const parsed = new URL(href, 'https://sense6.test');
    location.pathname = parsed.pathname;
    location.search = parsed.search;
    location.hash = parsed.hash;
  }
  applyHref(initialHref);

  const history = {
    get state() {
      return entries[entryIndex].state;
    },
    pushState(nextState, _title, href) {
      const nextHref = String(href);
      entries.splice(entryIndex + 1, entries.length, { href: nextHref, state: nextState });
      entryIndex += 1;
      historyWrites.push({ method: 'pushState', href: nextHref });
      applyHref(nextHref);
    },
    replaceState(nextState, _title, href) {
      const nextHref = String(href);
      entries[entryIndex] = { href: nextHref, state: nextState };
      historyWrites.push({ method: 'replaceState', href: nextHref });
      applyHref(nextHref);
    },
    go(delta) {
      entryIndex += delta;
      applyHref(entries[entryIndex].href);
      listeners.get('popstate')?.();
    },
  };

  class FakeElement {
    closest() {
      return null;
    }
  }
  class FakeAnchorElement extends FakeElement {}
  class FakePopStateEvent {}

  Object.defineProperty(location, 'href', {
    configurable: true,
    get: () => `https://sense6.test${location.pathname}${location.search}${location.hash}`,
  });
  globalThis.window = {
    location,
    history,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    dispatchEvent: () => listeners.get('popstate')?.(),
  };
  globalThis.document = {
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    removeEventListener: (name) => documentListeners.delete(name),
  };
  globalThis.Element = FakeElement;
  globalThis.HTMLAnchorElement = FakeAnchorElement;
  globalThis.PopStateEvent = FakePopStateEvent;

  return {
    history,
    historyWrites,
    href: () => `${location.pathname}${location.search}${location.hash}`,
    pushHistory(href) {
      history.pushState({ __sense6Index: history.state.__sense6Index + 1 }, '', href);
    },
    dispatchPopState() {
      listeners.get('popstate')?.();
    },
    clickFragment(href) {
      const event = {
        target: new FakeAnchorElement(),
        button: 0,
        defaultPrevented: false,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        href,
      };
      documentListeners.get('click')?.(event);
      return event;
    },
    restore() {
      delete globalThis.PopStateEvent;
      delete globalThis.HTMLAnchorElement;
      delete globalThis.Element;
      delete globalThis.document;
      delete globalThis.window;
    },
  };
}
