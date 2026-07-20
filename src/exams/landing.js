/** @typedef {{ title: string, body: string }} MethodStep */
/** @typedef {{ number: string, name: string, eyebrow: string, body: string }} InstrumentSummary */
/** @typedef {import('./sources.js').EvidenceSource} ResearchSource */
/** @typedef {{ className: string, titleId: string, title: string, description: string, sources: readonly ResearchSource[], label: string }} ResearchSection */

/**
 * Render the repeated numbered method pattern used by experiment landing pages.
 * @param {readonly MethodStep[]} steps
 */
export function renderMethodSteps(steps) {
  return `<ol class="method-steps">${steps
    .map(
      ({ title, body }, index) =>
        `<li><span>${index + 1}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div></li>`,
    )
    .join('')}</ol>`;
}

/**
 * Render the common experiment-instrument index while preserving route-specific visuals.
 * Visual renderers return trusted, repository-authored markup.
 * @param {Record<string, InstrumentSummary>} instruments
 * @param {{ classPrefix: string, visual: (id: string) => string }} options
 */
export function renderInstrumentList(instruments, { classPrefix, visual }) {
  const prefix = escapeAttribute(classPrefix);
  return `<ol class="${prefix}-instrument-list">${Object.entries(instruments)
    .map(
      ([id, instrument]) => `<li>
        <div class="${prefix}-instrument-visual ${prefix}-instrument-visual--${escapeAttribute(id)}" aria-hidden="true">
          ${visual(id)}
        </div>
        <div class="${prefix}-instrument-copy">
          <span>${escapeHtml(instrument.number)}</span>
          <div><p class="ui-eyebrow ui-eyebrow--muted">${escapeHtml(instrument.eyebrow)}</p><h3>${escapeHtml(instrument.name)}</h3><p>${escapeHtml(instrument.body)}</p></div>
        </div>
      </li>`,
    )
    .join('')}</ol>`;
}

/**
 * Render a consistent research trail while each experiment owns its claims and sources.
 * @param {ResearchSection} section
 */
export function renderResearchSection(section) {
  return `
      <section class="science ${escapeAttribute(section.className)} section ui-container ui-container--wide" aria-labelledby="${escapeAttribute(section.titleId)}">
        <div class="science__statement">
          <p class="ui-eyebrow">${escapeHtml(section.label)}</p>
          <h2 id="${escapeAttribute(section.titleId)}">${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.description)}</p>
        </div>
        <aside class="ui-card science__sources">
          <p class="ui-eyebrow ui-eyebrow--muted">${escapeHtml(section.label)}</p>
          <ul class="source-list">
            ${section.sources
              .map(
                ({ label, href, role }) =>
                  `<li><span class="source-role">${escapeHtml(sourceRoleLabel(role))}</span><a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a></li>`,
              )
              .join('')}
          </ul>
        </aside>
      </section>`;
}

/** @param {ResearchSource['role']} role */
function sourceRoleLabel(role) {
  return SOURCE_ROLE_LABELS[role];
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** @param {string} value */
function escapeAttribute(value) {
  return escapeHtml(value);
}

import { SOURCE_ROLE_LABELS } from './sources.js';
