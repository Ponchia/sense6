import { renderInstrumentList, renderResearchSection } from '../landing.js';
import { sourcesFor } from '../sources.js';

export const UDITO_INSTRUMENTS = {
  headphones: {
    number: '01',
    name: 'Cuffie',
    eyebrow: 'Headphone confidence',
    title: 'Which tone is quietest?',
    body: 'Three low tones play in sequence. Choose the quietest. A phase-based decoy helps check whether the sound is arriving like headphones, without claiming to identify your hardware.',
  },
  range: {
    number: '02',
    name: 'Portata',
    eyebrow: 'Upper audibility boundary',
    title: 'Which interval contains the tone?',
    body: 'One of three intervals contains a tone. Its frequency adapts to find the upper boundary available in this run, on this device, while you report keeping volume unchanged.',
  },
  pitch: {
    number: '03',
    name: 'Intonazione',
    eyebrow: 'Pitch discrimination',
    title: 'Which tone was higher?',
    body: 'Two tones play in sequence. Separate adaptive tracks estimate the smallest pitch step resolved around 500 Hz and 2 kHz.',
  },
};

const RESEARCH_SOURCES = sourcesFor('udito');

/**
 * @param {{ setupQuality: string } | null} previous
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 */
export function uditoIntroMarkup(previous, message) {
  return `
    <div class="au-intro">
      <section class="au-intro__hero ui-container ui-container--wide">
        <button class="back-link exam-back" type="button" data-action="au-home"><span aria-hidden="true">←</span> ${message('nav.allTests')}</button>
        <div class="au-hero">
        <div class="au-hero__copy">
          <p class="ui-eyebrow">Listening lab / three instruments / about 6 minutes</p>
          <h1>Listen for the boundary.<br><em>Keep the limits audible.</em></h1>
          <p class="au-lede">Udito checks headphone-like presentation, maps an upper audibility boundary, and estimates pitch discrimination at two frequencies. Every result belongs to this device, volume, room, and run.</p>
          <div class="ui-cluster au-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="au-setup">Prepare the sound lab <span aria-hidden="true">→</span></button>
            <button class="ui-link ui-link--cta" type="button" data-action="au-method">${message('action.seeMethod')}</button>
          </div>
          <p class="hero__limit"><span aria-hidden="true">◇</span> No dB HL, hearing age, diagnosis, or population score.</p>
          ${previous ? `<p class="previous-score">Last run on this browser: <strong>${previous.setupQuality}</strong></p>` : ''}
        </div>
        <div class="au-scope" aria-hidden="true">
          <div class="au-scope__dial"><i></i><i></i><i></i><span>U</span></div>
          <div class="au-wave">${Array.from({ length: 42 }, (_, index) => `<i style="--bar:${index}"></i>`).join('')}</div>
          <div class="au-scope__readout"><span>Output</span><strong>device relative</strong></div>
        </div>
        </div>
      </section>

      <div class="au-signal-strip" aria-hidden="true">
        ${Array.from({ length: 56 }, (_, index) => `<i style="--wave:${index}"></i>`).join('')}
      </div>

      <section class="au-method section" id="au-method" aria-labelledby="au-method-title">
        <div class="ui-container ui-container--wide">
          <div class="section-heading">
            <div><p class="ui-eyebrow">${message('section.methodLimits')}</p><h2 id="au-method-title">Three questions. No synthetic score.</h2></div>
            <p>The instruments stay separate because confidence in the setup is not the same thing as audibility or pitch discrimination.</p>
          </div>
          ${renderInstrumentList(UDITO_INSTRUMENTS, { classPrefix: 'au', visual: instrumentVisual })}
        </div>
      </section>

      <section class="method section au-safety" aria-labelledby="au-safety-title">
        <div class="ui-container ui-container--wide method__layout">
          <div class="method__intro"><p class="ui-eyebrow">Before listening</p><h2 id="au-safety-title">Comfort sets the ceiling.</h2><p>Start with device volume low. Raise it only until the reference is quiet and comfortable, never beyond about 60%. Then lock it for the whole run.</p></div>
          <div class="au-safety__copy">
            <div class="au-safety-meter" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i style="--level:${index}"></i>`).join('')}<span>60%</span></div>
            <p><strong>Never raise volume to chase a missing high tone.</strong> Stop immediately for discomfort, pain, pressure, or ringing.</p>
          </div>
        </div>
      </section>

      ${renderResearchSection({
        className: 'au-research',
        titleId: 'au-research-title',
        title: 'What informed Udito.',
        description:
          'Established task structures inform the experiment. Consumer audio hardware remains uncalibrated.',
        label: message('section.researchTrail'),
        sources: RESEARCH_SOURCES,
      })}

      <section class="closing-cta au-closing ui-container ui-container--wide">
        <div><p class="ui-eyebrow">Listening lab / three instruments / about 6 minutes</p><h2>Headphone confidence, audibility &amp; pitch</h2></div>
        <button class="ui-button ui-button--lg" type="button" data-action="au-setup-closing">${message('action.openTest')} <span aria-hidden="true">→</span></button>
      </section>
    </div>
  `;
}

/** @param {string} id */
function instrumentVisual(id) {
  if (id === 'headphones') return '<i></i><i></i><i></i>';
  if (id === 'range') {
    return Array.from({ length: 18 }, (_, index) => `<i style="--tone:${index}"></i>`).join('');
  }
  const wave = Array.from({ length: 14 }, (_, index) => `<i style="--tone:${index}"></i>`).join('');
  return `<span>${wave}</span><span>${wave}</span>`;
}
