import { renderInstrumentList, renderMethodSteps, renderResearchSection } from '../landing.js';
import { sourcesFor } from '../sources.js';

export const RIFLESSI_INSTRUMENTS = {
  signal: {
    number: '01',
    name: 'Segnale',
    eyebrow: 'Simple visual response',
    title: 'One signal. One action.',
    body: 'Wait while the chamber is quiet, then respond as soon as the central mark appears. Random waits make anticipation visible.',
    note: '8 practice responses, then 20 measured signals and 2 no-signal checks.',
  },
  choice: {
    number: '02',
    name: 'Scelta',
    eyebrow: 'Two-choice response',
    title: 'See a side. Choose it.',
    body: 'A left or right arrow appears. Respond on the matching side. The block median can be described alongside Segnale, with fixed-order and motor differences left explicit.',
    note: '8 practice choices, then 32 balanced measured choices.',
  },
  stability: {
    number: '03',
    name: 'Tenuta',
    eyebrow: 'Sustained response',
    title: 'Keep the response steady.',
    body: 'For three minutes, respond to the same simple signal across longer, irregular waits. The pattern within this run matters more than one fastest press.',
    note: 'A custom 3-minute sustained-response block. It is not the validated PVT-B protocol and has no clinical lapse metric.',
  },
};
const METHOD_STEPS = [
  {
    title: 'Simple and choice response',
    body: 'A transparent reaction-time task with practice, randomized intervals, and separate simple and choice measures.',
  },
  {
    title: 'Custom sustained block',
    body: 'A three-minute sequence describes changes within this run. PVT-B is a comparator, not validation of this different event schedule.',
  },
  {
    title: 'Browser timing reality',
    body: 'Browser experiments can be precise enough for many effects, while input hardware and presentation still add latency.',
  },
];
const RESEARCH_SOURCES = sourcesFor('riflessi');

/**
 * @param {{ inputMode?: unknown } | null} previous
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 * @returns {string}
 */
export function riflessiIntroMarkup(previous, message) {
  return `
    <div class="rx-intro">
      <section class="rx-intro__hero ui-container ui-container--wide">
        <button class="back-link exam-back" type="button" data-action="rx-home">
          <span aria-hidden="true">←</span> ${message('nav.allTests')}
        </button>
        <div class="rx-hero">
        <div class="rx-hero__copy">
          <p class="ui-eyebrow">Response lab / three instruments / about 7 minutes</p>
          <h1 tabindex="-1" data-rx-screen-title>Notice the signal.<br><em>Measure the response.</em></h1>
          <p class="rx-lede">
            Riflessi separates simple response speed, the extra cost of choosing, and how
            responses change across a sustained run. It reports this device and this session—nothing broader.
          </p>
          <div class="ui-cluster rx-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="rx-setup">
              Prepare the lab <span aria-hidden="true">→</span>
            </button>
            <a class="ui-link ui-link--cta" href="#rx-method" data-action="rx-method">${message('action.seeMethod')}</a>
          </div>
          <p class="hero__limit"><span aria-hidden="true">◇</span> Browser and device latency remain in every measurement.</p>
          ${
            previous
              ? `<p class="previous-score">Last run on this browser: <strong>${previous.inputMode === 'pointer' ? 'touch / pointer' : 'keyboard'} input</strong></p>`
              : ''
          }
        </div>
        <div class="rx-hero__instrument" aria-hidden="true">
          <div class="rx-scope">
            <span class="rx-scope__ring"></span>
            <span class="rx-scope__signal"></span>
            <span class="rx-scope__sweep"></span>
          </div>
          <div class="rx-hero__readout"><span>Signal</span><strong>ready</strong><i></i></div>
        </div>
        </div>
      </section>

      <div class="rx-signal-strip" aria-hidden="true">
        ${Array.from({ length: 48 }, (_, index) => `<i style="--tick:${index}"></i>`).join('')}
      </div>

      <section class="rx-method section" id="rx-method" aria-labelledby="rx-method-title">
        <div class="ui-container ui-container--wide">
          <div class="section-heading">
            <div>
              <p class="ui-eyebrow">${message('section.methodLimits')}</p>
              <h2 id="rx-method-title">Three questions, kept separate.</h2>
            </div>
            <p>No percentile, “brain age,” or reflex rating. Each instrument answers a narrower question.</p>
          </div>
          ${renderInstrumentList(RIFLESSI_INSTRUMENTS, { classPrefix: 'rx', visual: instrumentVisual })}
        </div>
      </section>

      <section class="method section rx-boundary">
        <div class="ui-container ui-container--wide method__layout">
          <div class="method__intro">
            <p class="ui-eyebrow">${message('section.methodLimits')}</p>
            <h2>Browser and device latency remain in every measurement.</h2>
            <p>Compare only on the same device and input. Not a clinical or population score.</p>
          </div>
          ${renderMethodSteps(METHOD_STEPS)}
        </div>
      </section>

      ${renderResearchSection({
        className: 'rx-research',
        titleId: 'rx-research-title',
        title: 'What informed Riflessi.',
        description:
          'Established task structures inform the design. They do not validate an uncontrolled browser as a clinical instrument.',
        label: message('section.researchTrail'),
        sources: RESEARCH_SOURCES,
      })}

      <section class="closing-cta rx-closing ui-container ui-container--wide">
        <div>
          <p class="ui-eyebrow">Response lab / three instruments / about 7 minutes</p>
          <h2>Response speed, choice task &amp; consistency</h2>
        </div>
        <button class="ui-button ui-button--lg" type="button" data-action="rx-setup-closing">
          ${message('action.openTest')} <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  `;
}

/** @param {string} id @returns {string} */
function instrumentVisual(id) {
  if (id === 'signal') return '<i class="rx-visual-signal"></i><span></span>';
  if (id === 'choice') return '<i>←</i><span></span><i>→</i>';
  return Array.from({ length: 12 }, (_, index) => `<i style="--bar:${index}"></i>`).join('');
}
