import { activeMount, clearActiveMount, disposeActiveMounts, registerActiveMount } from './mount-registry.js';
import { setNavigationGuard } from './navigation.js';

/** @typedef {{ signal: AbortSignal, onCleanup: (callback: (() => void)) => (() => void), setActive: (active: boolean, message?: string) => void, present: (root?: ParentNode, options?: { focus?: string | false, scroll?: boolean }) => void, dispose: () => void }} ExamLifecycle */

/** Dispose every active exam mount after a route commit fails before returning its cleanup. */
export function disposeActiveExamLifecycles() {
  disposeActiveMounts();
}

/**
 * Own one exam mount and guarantee idempotent, exclusive cleanup.
 * @param {symbol} owner
 * @param {{ bodyClasses?: string[] }} [options]
 * @returns {ExamLifecycle}
 */
export function createExamLifecycle(owner, { bodyClasses = [] } = {}) {
  activeMount(owner)?.dispose();
  const controller = new AbortController();
  /** @type {Array<() => void>} */
  const cleanups = [];
  let disposed = false;
  let measurementActive = false;
  let navigationMessage = 'Leave this test? Your progress will be lost.';
  /** @type {Map<HTMLInputElement | HTMLButtonElement | HTMLSelectElement, boolean>} */
  const shellControlStates = new Map();
  const clearNavigationGuard = setNavigationGuard(
    () => !measurementActive || globalThis.confirm?.(navigationMessage) !== false,
  );

  /** @param {BeforeUnloadEvent} event */
  const preventActiveUnload = (event) => {
    if (!measurementActive) return;
    event.preventDefault();
    event.returnValue = '';
  };
  globalThis.addEventListener?.('beforeunload', preventActiveUnload);

  /** @param {boolean} active */
  function updateShellControls(active) {
    const controls = /** @type {NodeListOf<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>} */ (
      document.querySelectorAll?.('[data-locale-select], [data-bronto-theme-toggle]') ?? []
    );
    if (active) {
      for (const control of controls) {
        if (!shellControlStates.has(control)) shellControlStates.set(control, control.disabled);
        control.disabled = true;
      }
      return;
    }
    for (const [control, wasDisabled] of shellControlStates) control.disabled = wasDisabled;
    shellControlStates.clear();
  }

  /** @param {boolean} active @param {string} [message] */
  function setActive(active, message = navigationMessage) {
    measurementActive = active;
    navigationMessage = message;
    document.body.classList.toggle('measurement-active', measurementActive);
    updateShellControls(measurementActive);
  }

  /**
   * Position and announce a newly rendered semantic screen before interaction begins.
   * @param {ParentNode} [root]
   * @param {{ focus?: string | false, scroll?: boolean }} [options]
   */
  function present(root = document, { focus = 'h1', scroll = true } = {}) {
    if (scroll) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!scroll && !focus) return;
    requestAnimationFrame(() => {
      if (disposed) return;
      // Re-anchor after the replacement content has completed layout. Scroll
      // anchoring can otherwise restore part of the previous screen's offset.
      if (scroll) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (!focus) return;
      const target = /** @type {HTMLElement | null} */ (root.querySelector(focus));
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  const lifecycle = Object.freeze({
    signal: controller.signal,
    /** @param {() => void} callback */
    onCleanup(callback) {
      cleanups.push(callback);
      return callback;
    },
    setActive,
    present,
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const cleanup of cleanups.reverse()) {
        try {
          cleanup();
        } catch (error) {
          console.error('Sense6 cleanup failed.', error);
        }
      }
      clearNavigationGuard();
      globalThis.removeEventListener?.('beforeunload', preventActiveUnload);
      updateShellControls(false);
      document.body.classList.remove('measurement-active');
      if (bodyClasses.length) document.body.classList.remove(...bodyClasses);
      clearActiveMount(owner, lifecycle);
    },
  });
  registerActiveMount(owner, lifecycle);
  return lifecycle;
}
