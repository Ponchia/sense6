/** @typedef {{ signal: AbortSignal, onCleanup: (callback: (() => void)) => (() => void), dispose: () => void }} ExamLifecycle */

/** @type {Map<symbol, ExamLifecycle>} */
const activeMounts = new Map();

/**
 * Own one exam mount and guarantee idempotent, exclusive cleanup.
 * @param {symbol} owner
 * @param {{ bodyClasses?: string[] }} [options]
 * @returns {ExamLifecycle}
 */
export function createExamLifecycle(owner, { bodyClasses = [] } = {}) {
  activeMounts.get(owner)?.dispose();
  const controller = new AbortController();
  /** @type {Array<() => void>} */
  const cleanups = [];
  let disposed = false;

  const lifecycle = Object.freeze({
    signal: controller.signal,
    /** @param {() => void} callback */
    onCleanup(callback) {
      cleanups.push(callback);
      return callback;
    },
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
      if (bodyClasses.length) document.body.classList.remove(...bodyClasses);
      if (activeMounts.get(owner) === lifecycle) activeMounts.delete(owner);
    },
  });
  activeMounts.set(owner, lifecycle);
  return lifecycle;
}
