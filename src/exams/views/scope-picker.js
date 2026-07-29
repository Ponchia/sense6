/**
 * Run-scope picker markup shared by the multi-instrument experiments.
 *
 * Riflessi, Udito, and Acutezza all offer "how much of this experiment do you
 * want to run" before measurement starts. Only the action name, the option
 * class, and the copy differ, so the markup and the pressed-state update live
 * here. Callers translate their own label and detail, which keeps every
 * message source a literal the locale audit can still find.
 */

/**
 * @param {{
 *   action: string,
 *   className: string,
 *   id: string,
 *   selected: boolean,
 *   label: string,
 *   detail: string
 * }} option
 * @returns {string}
 */
export function scopeOptionMarkup({ action, className, id, selected, label, detail }) {
  return `<button class="${className} ${selected ? 'is-selected' : ''}" type="button" data-action="${action}" data-scope="${id}" aria-pressed="${selected}"><strong>${label}</strong><small>${detail}</small></button>`;
}

/**
 * Move the pressed state onto one option without rebuilding the screen.
 * @param {ParentNode} root
 * @param {string} action
 * @param {string} scope
 * @returns {void}
 */
export function applyScopeSelection(root, action, scope) {
  for (const button of root.querySelectorAll(`[data-action="${action}"]`)) {
    const selected = button.getAttribute('data-scope') === scope;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}
