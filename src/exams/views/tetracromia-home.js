/** @typedef {{ id: string, number: string, name: string, trials: number }} Phase */

/**
 * @param {readonly Phase[]} phases
 * @param {(source: string) => string} translate
 * @param {(id: import('../../i18n/message-ids.js').MessageId) => string} message
 * @param {(lightness: number, chroma: number, hue: number) => string} colorCss
 */
export function tetracromiaHomeMarkup(phases, translate, message, colorCss) {
  const spectrumBars = Array.from({ length: 28 }, (_, index) => {
    const hue = Math.round((index / 28) * 360);
    return `<span style="--bar-color: ${colorCss(0.7, 0.13, hue)}; --bar-delay: ${index * 18}ms"></span>`;
  }).join('');
  const headingTail = translate('colour?');

  return `
    <section class="hero ui-container ui-container--wide" id="top">
      <div class="hero__copy">
        <button class="back-link exam-back" type="button" data-action="gallery">
          <span aria-hidden="true">←</span> ${message('nav.allTests')}
        </button>
        <p class="ui-eyebrow">Color perception / 03 instruments / about 4 minutes</p>
        <h1>${translate('How finely do you')} <em>${translate('see')}</em>${headingTail === '?' ? '' : ' '}${headingTail}</h1>
        <p class="hero__lede">
          A careful, adaptive lab for the differences your display can reproduce—and your eyes can resolve.
        </p>
        <div class="ui-cluster hero__actions">
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

      <div class="hero__instrument" aria-hidden="true">
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
          <h2>Three views of discrimination.</h2>
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
          <h2>The difference gets smaller as you succeed.</h2>
          <p>
            Threshold and Field use a two-correct-down, one-error-up staircase. It spends more
            trials near your current boundary instead of asking the same easy question repeatedly.
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
            <div><strong>Adaptive estimate</strong><p>Reversals around the boundary produce a session-relative threshold.</p></div>
          </li>
          <li>
            <span>4</span>
            <div><strong>Honest result</strong><p>Your profile describes this screen, light, fatigue level, and run.</p></div>
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
        <ul class="source-list">
          <li>
            <a href="https://doi.org/10.1167/10.8.12" rel="noreferrer">
              Jordan et al. (2010), functional tetrachromacy
            </a>
          </li>
          <li>
            <a href="https://www.xrite.com/visual-assessment-tools/fm-100-hue-test" rel="noreferrer">
              Farnsworth–Munsell 100 Hue method
            </a>
          </li>
          <li>
            <a href="https://www.w3.org/TR/css-color-4/#ok-lab" rel="noreferrer">
              W3C OKLab / OKLCH color model
            </a>
          </li>
          <li>
            <a href="https://my.clevelandclinic.org/health/articles/tetrachromacy" rel="noreferrer">
              Clinical limits of online tetrachromacy tests
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section class="closing-cta ui-container ui-container--wide">
      <div>
        <p class="ui-eyebrow">Ready when your screen is</p>
        <h2>Find your visible boundary.</h2>
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
