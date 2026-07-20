import { renderInstrumentList, renderResearchSection } from '../landing.js';

export const ACUTEZZA_INSTRUMENTS = {
  high: {
    number: '01',
    name: 'Nitidezza',
    eyebrow: 'High-contrast sharpness',
    title: 'Find the opening.',
    body: 'A Landolt ring changes size while you identify its opening. The estimate belongs to this calibrated distance and display.',
  },
  low: {
    number: '02',
    name: 'Contrasto',
    eyebrow: 'Low-contrast cost',
    title: 'Find the quieter opening.',
    body: 'The same task repeats with a pale target. Sense6 compares conditions within this run, not across devices.',
  },
  meridian: {
    number: '03',
    name: 'Meridiani',
    eyebrow: 'Orientation consistency',
    title: 'Which line field looks clearer?',
    body: 'Line fields repeat at two scales and changing pixel phases. A preference appears only when it replicates.',
  },
};

const RESEARCH_SOURCES = /** @type {const} */ ([
  ['Li et al., 2020', 'https://www.nature.com/articles/s41598-019-57204-1'],
  ['ISO 8596:2017', 'https://www.iso.org/standard/69042.html'],
  ['Bach, 2024', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11868300/'],
  [
    'National Eye Institute',
    'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/floaters',
  ],
]);

/**
 * @param {{ setupQuality?: unknown } | null} previous
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 */
export function acutezzaIntroMarkup(previous, message) {
  return `
    <div class="ac-intro">
      <section class="ac-intro__hero ui-container ui-container--wide">
        <button class="back-link exam-back" type="button" data-action="ac-home"><span aria-hidden="true">←</span> ${message('nav.allTests')}</button>
        <div class="ac-hero">
        <div class="ac-hero__copy">
          <p class="ui-eyebrow">Vision lab / three instruments / about 8 minutes</p>
          <h1>Calibrate the screen.<br><em>Resolve the opening.</em></h1>
          <p class="ac-lede">Acutezza measures the angular detail resolved by each eye, the cost of lower contrast, and whether a directional clarity preference repeats. It is a perception experiment, not an eye examination.</p>
          <div class="ui-cluster ac-hero__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-prepare">Prepare the vision lab <span aria-hidden="true">→</span></button><button class="ui-link ui-link--cta" type="button" data-action="ac-method">${message('action.seeMethod')}</button></div>
          <p class="hero__limit"><span aria-hidden="true">◇</span> No 20/20 label, diagnosis, astigmatism detection, or prescription.</p>
          ${previous ? `<p class="previous-score">Last run on this browser: <strong>${String(previous.setupQuality ?? '')}</strong></p>` : ''}
        </div>
        <div class="ac-scope" aria-hidden="true"><div class="ac-scope__ring"><i></i><span></span></div><div class="ac-scope__axis ac-scope__axis--one"></div><div class="ac-scope__axis ac-scope__axis--two"></div><div class="ac-scope__readout"><span>Gap angle</span><strong>calibrated</strong></div></div>
        </div>
      </section>

      <div class="ac-calibration-strip" aria-hidden="true">
        ${Array.from({ length: 41 }, (_, index) => `<i style="--mark:${index}"></i>`).join('')}
      </div>

      <section class="ac-method section" id="ac-method" aria-labelledby="ac-method-title">
        <div class="ui-container ui-container--wide">
          <div class="section-heading"><div><p class="ui-eyebrow">${message('section.methodLimits')}</p><h2 id="ac-method-title">Three observations. No composite score.</h2></div><p>High-contrast detail, low-contrast cost, and directional preference remain separate.</p></div>
          ${renderInstrumentList(ACUTEZZA_INSTRUMENTS, { classPrefix: 'ac', visual: instrumentVisual })}
        </div>
      </section>
      <section class="method section ac-safety" aria-labelledby="ac-safety-title">
        <div class="ui-container ui-container--wide method__layout">
          <div class="method__intro"><p class="ui-eyebrow">Before testing</p><h2 id="ac-safety-title">Comfort and context come first.</h2><p>Use your usual correction for this distance. Cover one eye without pressing it, keep your head upright, and stop for discomfort.</p></div>
          <div class="ac-safety__copy"><div class="ac-safety-ruler" aria-hidden="true">${Array.from({ length: 18 }, (_, index) => `<i style="--mark:${index}"></i>`).join('')}<span>Keep distance fixed</span></div><p><strong>Sudden vision loss, severe eye pain, new flashes or floaters, or a curtain-like shadow needs prompt professional assessment.</strong> Do not delay care to take this test.</p></div>
        </div>
      </section>
      ${renderResearchSection({
        className: 'ac-research',
        titleId: 'ac-research-title',
        title: 'What informed Acutezza.',
        description:
          'Published methods shape the task. They do not make this implementation clinically validated.',
        label: message('section.researchTrail'),
        sources: RESEARCH_SOURCES,
      })}

      <section class="closing-cta ac-closing ui-container ui-container--wide">
        <div><p class="ui-eyebrow">Vision lab / three instruments / about 8 minutes</p><h2>Calibrated sharpness &amp; meridional clarity</h2></div>
        <button class="ui-button ui-button--lg" type="button" data-action="ac-prepare-closing">${message('action.openTest')} <span aria-hidden="true">→</span></button>
      </section>
    </div>`;
}

/** @param {string} id */
function instrumentVisual(id) {
  if (id !== 'meridian') return '<div class="mini-acuity"><i></i><span></span></div>';
  return Array.from({ length: 12 }, (_, index) => `<i style="--line:${index}"></i>`).join('');
}
