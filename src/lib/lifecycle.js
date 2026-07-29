import { activeMount, clearActiveMount, registerActiveMount } from './mount-registry.js';
import { setNavigationGuard } from './navigation.js';

/** @typedef {{ signal: AbortSignal, onCleanup: (callback: (() => void)) => (() => void), setActive: (active: boolean, message?: string) => void, present: (root?: ParentNode, options?: { focus?: string | false, scroll?: boolean }) => void, dispose: () => void }} ExamLifecycle */

const FORCED_COLORS_QUERY = '(forced-colors: active)';

/**
 * Report whether the platform is overriding presented colours right now.
 *
 * Forced-colors and high-contrast modes replace the exact colours, grays, and
 * contrast an experiment presents, so a colour, contrast, or optotype task
 * must refuse to measure while one is active.
 */
export function forcedColorsActive() {
  return window.matchMedia?.(FORCED_COLORS_QUERY).matches === true;
}

/**
 * Observe forced-colors changes for the lifetime of one mount.
 * @param {() => void} onChange
 * @param {AbortSignal} signal
 * @returns {void}
 */
export function watchForcedColors(onChange, signal) {
  window.matchMedia?.(FORCED_COLORS_QUERY).addEventListener('change', onChange, { signal });
}

/**
 * Report whether a captured mount is still the one its module is driving.
 *
 * Every deferred callback — animation frames, timers, awaited clipboard or
 * audio work — must check this before touching mount state or the shared
 * shell. Disposal happens synchronously in the same frame as a pending
 * callback, so an unguarded callback reads state the mount already released.
 * @template {{ lifecycle: ExamLifecycle }} MountState
 * @param {MountState | null} current
 * @param {MountState} mountState
 * @returns {boolean}
 */
export function isCurrentMount(current, mountState) {
  return current === mountState && !mountState.lifecycle.signal.aborted;
}

/**
 * Own one exam mount and guarantee idempotent, exclusive cleanup.
 *
 * `bodyClassesToRelease` only removes: an exam adds its own body classes when
 * a screen needs them, and the lifecycle guarantees they are gone after
 * disposal.
 * @param {symbol} owner
 * @param {{ bodyClassesToRelease?: string[] }} [options]
 * @returns {ExamLifecycle}
 */
export function createExamLifecycle(owner, { bodyClassesToRelease = [] } = {}) {
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
      if (bodyClassesToRelease.length) document.body.classList.remove(...bodyClassesToRelease);
      clearActiveMount(owner, lifecycle);
    },
  });
  registerActiveMount(owner, lifecycle);
  return lifecycle;
}
