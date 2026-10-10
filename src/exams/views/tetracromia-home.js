import { relatedGuideMarkup } from '../related-guide.js';
/** @typedef {{ id: string, number: string, name: string, trials: number }} Phase */

/**
 * @param {readonly Phase[]} phases
 * @param {(source: string) => string} _translate
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 * @param {(lightness: number, chroma: number, hue: number) => string} colorCss
 * @param {string} [locale]
 */
export function tetracromiaHomeMarkup(phases, _translate, message, colorCss, locale = 'en') {
  const spectrumBars = Array.from({ length: 28 }, (_, index) => {
    const hue = Math.round((index / 28) * 360);
    return `<span style="--bar-color: ${colorCss(0.7, 0.13, hue)}; --bar-delay: ${index * 18}ms"></span>`;
  }).join('');
  return `
    <section class="tetracromia-hero ui-container ui-container--wide" id="top">
      <div class="tetracromia-hero__copy">
        <button class="back-link exam-back" type="button" data-action="gallery">
          <span aria-hidden="true">←</span> ${message('nav.allTests')}
        </button>
        <p class="ui-eyebrow">Screen Colour Lab / 29 blocks / about 4 minutes</p>
        <h1><span>Tetracromia —</span> <span>Notice colour in</span> <em>three different ways</em>.</h1>
        <p class="tetracromia-hero__lede">
          Tetracromia is a short recreational experiment: 14 tile choices, 12 dot-field choices,
          and 3 ordering arcs. Each observation stays separate.
        </p>
        <div class="ui-cluster tetracromia-hero__actions">
          <button class="ui-button ui-button--lg" type="button" data-action="setup">
            Begin the color lab <span aria-hidden="true">→</span>
          </button>
          <a class="ui-link ui-link--cta" href="#method">${message('action.seeMethod')}</a>
        </div>
        <p class="hero__limit">
          <span aria-hidden="true">◇</span>
          This is not a medical test and cannot confirm tetrachromacy.
        </p>
      </div>

      <div class="tetracromia-hero__instrument" aria-hidden="true">
        <div class="color-orbit color-orbit--outer"></div>
        <div class="color-orbit color-orbit--middle"></div>
        <div class="color-orbit color-orbit--inner"></div>
        <div class="instrument-core">
          <span>Δ</span>
          <strong>E<sub>OK</sub></strong>
          <small>display relative</small>
        </div>
        <p class="instrument-note instrument-note--one">Hue</p>
        <p class="instrument-note instrument-note--two">Field</p>
        <p class="instrument-note instrument-note--three">Order</p>
      </div>
    </section>

    <div class="spectrum" aria-hidden="true">${spectrumBars}</div>

    <section class="ui-container ui-container--wide section" id="lab">
      <div class="section-heading">
        <div>
          <p class="ui-eyebrow">The lab</p>
          <h2>Three short screen-colour observations.</h2>
        </div>
        <p>No names, no account, no result upload. Your session stays in this browser.</p>
      </div>

      <div class="test-index">
        ${phases
          .map(
            (phase, index) => `
            <article class="test-card">
              <div class="test-card__visual test-card__visual--${phase.id}" aria-hidden="true">
                ${testCardVisual(phase.id)}
              </div>
              <div class="test-card__body">
                <div class="ui-cluster ui-cluster--between">
                  <span class="test-card__number">${phase.number}</span>
                  <span class="ui-tag">${index === 2 ? '3 runs' : `${phase.trials} trials`}</span>
                </div>
                <h3>${phase.name}</h3>
                <p>${testDescription(phase.id)}</p>
              </div>
            </article>
          `,
          )
          .join('')}
      </div>
    </section>

    <section class="method section" id="method">
      <div class="ui-container ui-container--wide method__layout">
        <div class="method__intro">
          <p class="ui-eyebrow">Method, not magic</p>
          <h2>The displayed difference adapts during two tasks.</h2>
          <p>
            Tile choices and Dot fields use a two-correct-down, one-error-up rule. With only
            14 and 12 choices, the ending level describes this run; it is not a stable threshold.
          </p>
        </div>
        <ol class="method-steps">
          <li>
            <span>1</span>
            <div><strong>Neutral surround</strong><p>Stimuli sit on the same middle-gray chamber in either theme.</p></div>
          </li>
          <li>
            <span>2</span>
            <div><strong>Perceptual spacing</strong><p>Colors are generated in OKLCH and mapped safely into sRGB.</p></div>
          </li>
          <li>
            <span>3</span>
            <div><strong>Adaptive path</strong><p>Correct and missed choices change the next displayed difference.</p></div>
          </li>
          <li>
            <span>4</span>
            <div><strong>Honest result</strong><p>Three observations describe this screen, light, fatigue level, and run—with no composite.</p></div>
          </li>
        </ol>
      </div>
    </section>

    <section class="ui-container ui-container--wide section science" id="science">
      <div class="science__statement">
        <p class="ui-eyebrow">The fourth-cone question</p>
        <h2>An RGB screen cannot test tetrachromacy.</h2>
        <p>
          Consumer displays mix three primaries. Confirming functional tetrachromacy requires
          spectral stimuli that can separate a fourth response, specialized hardware, genetics,
          and controlled conditions. Tetracromia measures ordinary on-screen color discrimination
          instead—and says exactly that.
        </p>
      </div>
      <div class="science__sources ui-card">
        <p class="ui-eyebrow ui-eyebrow--muted">${message('section.researchTrail')}</p>
        <ul class="source-list">${sourcesFor('tetracromia')
          .map(
            ({ role, label, href }) =>
              `<li><span class="source-role">${SOURCE_ROLE_LABELS[role]}</span><a href="${href}" rel="noreferrer">${label}</a></li>`,
          )
          .join('')}</ul>
      </div>
    </section>

    ${relatedGuideMarkup('tetracromia', locale)}

    <section class="closing-cta ui-container ui-container--wide">
      <div>
        <p class="ui-eyebrow">Ready when your screen is</p>
        <h2>Make three colour observations.</h2>
      </div>
      <button class="ui-button ui-button--lg" type="button" data-action="setup">
        Start the lab <span aria-hidden="true">→</span>
      </button>
    </section>
  `;
}

/** @param {string} id */
function testCardVisual(id) {
  if (id === 'threshold') {
    return Array.from(
      { length: 16 },
      (_, index) => `<i class="${index === 10 ? 'is-shifted' : ''}"></i>`,
    ).join('');
  }
  if (id === 'field') {
    return Array.from(
      { length: 46 },
      (_, index) =>
        `<i style="--x:${(index * 37) % 100}%;--y:${(index * 61) % 100}%;--s:${4 + (index % 5)}px"></i>`,
    ).join('');
  }
  return Array.from({ length: 9 }, (_, index) => `<i style="--i:${index};--offset:${index % 3}"></i>`).join(
    '',
  );
}

/** @param {string} id */
function testDescription(id) {
  if (id === 'threshold')
    return 'Pick the one tile whose hue is different. The offset adapts after every answer.';
  if (id === 'field') return 'Find the shifted quadrant through controlled lightness and dot-size noise.';
  return 'Arrange three short hue arcs between fixed endpoints, with no color names as clues.';
}

import { SOURCE_ROLE_LABELS, sourcesFor } from '../sources.js';
