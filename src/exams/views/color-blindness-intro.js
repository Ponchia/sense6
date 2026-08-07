import { renderMethodSteps, renderResearchSection } from '../landing.js';
import { sourcesFor } from '../sources.js';

const METHOD_STEPS = [
  {
    title: 'Practice first',
    body: 'Two clear targets teach the C-gap interaction with immediate feedback before the exploratory track.',
  },
  {
    title: 'Luminance noise',
    body: 'Target and field are luminance-matched in linear sRGB and share the same dot-level brightness variation.',
  },
  {
    title: 'Three staircases',
    body: 'Directions become harder after correct responses. “No gap visible” counts as a miss and makes that display direction easier.',
  },
];

const RESEARCH_SOURCES = sourcesFor('color-blindness');

/**
 * @param {unknown} previous
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 * @returns {string}
 */
export function colorBlindnessIntroMarkup(previous, message) {
  return `
    <div class="cb-intro">
      <section class="cb-intro__hero ui-container ui-container--wide">
        <button class="back-link exam-back" type="button" data-action="gallery">
          <span aria-hidden="true">←</span> ${message('nav.allTests')}
        </button>
        <div class="cb-hero">
        <div class="cb-hero__copy">
          <p class="ui-eyebrow">Colour vision / adaptive experiment / about 3 minutes</p>
          <h1>Find the gap <em>in the dots</em>.</h1>
          <p class="cb-lede">
            A C-shaped target becomes harder to separate from its field. Three independent
            staircases record where each short display-relative track ends during this run.
          </p>
          <div class="ui-cluster cb-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">
              Start the experiment <span aria-hidden="true">→</span>
            </button>
            <a class="ui-link ui-link--cta" href="#cb-how" data-action="cb-how">How it works</a>
          </div>
          <p class="hero__limit">
            <span aria-hidden="true">◇</span>
            Experimental and unvalidated. This is not a colour blindness test: it is not a screening result or diagnosis.
          </p>
          ${
            previous
              ? '<p class="previous-score">Last run on this browser: <strong>exploratory adaptive levels recorded</strong></p>'
              : ''
          }
        </div>
        <div class="cb-hero__plate" aria-hidden="true">
          <canvas data-preview-target></canvas>
        </div>
        </div>
      </section>

      <div class="cb-signal-strip" aria-hidden="true">
        ${Array.from({ length: 36 }, (_, index) => `<i style="--dot:${index};--band:${index % 3}"></i>`).join(
          '',
        )}
      </div>

      <section class="cb-explain section" id="cb-how">
        <div class="ui-container ui-container--wide">
          <div class="section-heading">
            <div>
              <p class="ui-eyebrow">Three display directions</p>
              <h2>An adaptive task, not a plate score.</h2>
            </div>
            <p>The design borrows established psychophysical techniques without claiming their clinical validation.</p>
          </div>
          <div class="cb-axis-display" aria-hidden="true">
            <div class="cb-axis-display__card cb-axis-display__card--l"><span>L</span><i></i><i></i><i></i></div>
            <div class="cb-axis-display__card cb-axis-display__card--m"><span>M</span><i></i><i></i><i></i></div>
            <div class="cb-axis-display__card cb-axis-display__card--s"><span>S</span><i></i><i></i><i></i></div>
          </div>
        </div>
      </section>

      <section class="method section cb-boundary">
        <div class="ui-container ui-container--wide method__layout">
          <div class="method__intro">
            <p class="ui-eyebrow">${message('section.methodLimits')}</p>
            <h2>Run-relative output</h2>
            <p>You receive ending adaptive levels and track evidence, not cone thresholds, a normal/deficient label, or a clinical score.</p>
          </div>
          ${renderMethodSteps(METHOD_STEPS)}
        </div>
      </section>

      ${renderResearchSection({
        className: 'cb-research',
        titleId: 'cb-research-title',
        title: 'What informed Daltonia.',
        description:
          'These sources inform the stimulus model and task design. They do not validate this implementation.',
        label: message('section.researchTrail'),
        sources: RESEARCH_SOURCES,
      })}

      <section class="closing-cta cb-closing ui-container ui-container--wide">
        <div>
          <p class="ui-eyebrow">Colour vision / adaptive experiment / about 3 minutes</p>
          <h2>Adaptive browser colour-vision experiment</h2>
        </div>
        <button class="ui-button ui-button--lg" type="button" data-action="cb-setup-closing">
          ${message('action.openTest')} <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  `;
}
