import { toast } from '@ponchia/ui/behaviors';
import { formatNumber, t } from '../i18n.js';
import { toRgbCss } from '../lib/color.js';
import { appendJournalEntry, captureDisplayPassport, createJournalEntry } from '../lib/journal.js';
import { createExamLifecycle } from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { ColorLabSession, PHASES } from '../lib/session.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';

const RESULT_STORE = createResultStore({
  key: 'sense6:tetracromia:best',
  legacyKeys: ['tetracromia-best'],
  validate: (value) => isRecord(value) && Number.isFinite(value.overall),
});
const MOUNT_OWNER = Symbol('tetracromia');
const RESPONSE_GATE_MS = 180;

let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, { bodyClasses: ['lab-mode'] });
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    gamutChip: context.gamutChip,
    goHome: context.navigateHome,
    lifecycle,
    locale: context.locale,
    session: null,
    labActive: false,
    trialStartedAt: 0,
    selectedSequenceIndex: null,
    sequenceDrag: null,
    suppressNextSequenceClick: false,
    responseReady: false,
    responseGateToken: 0,
    responseGateFrame: 0,
    responseUnlockTimer: 0,
    transitionFrame: 0,
    fieldResizeObserver: null,
    fieldRedrawFrame: 0,
  };
  state = mountState;
  mountState.fieldResizeObserver =
    typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleFieldRedraw) : null;
  wireEvents(lifecycle.signal);

  detectDisplay();
  renderHome();

  lifecycle.onCleanup(() => {
    cancelTrialEffects();
    mountState.session = null;
    mountState.labActive = false;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  state.gamutChip.textContent = p3 ? t('P3 reported') : srgb ? t('sRGB reported') : t('Color gamut unknown');
  state.gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}

function renderHome() {
  cancelTrialEffects();
  state.session = null;
  state.labActive = false;
  state.lifecycle.setActive(false);
  state.selectedSequenceIndex = null;
  document.body.classList.remove('lab-mode');
  document.title = t('Tetracromia — colour discrimination | Sense6');

  const spectrumBars = Array.from({ length: 28 }, (_, index) => {
    const hue = Math.round((index / 28) * 360);
    return `<span style="--bar-color: ${toRgbCss(0.7, 0.13, hue)}; --bar-delay: ${index * 18}ms"></span>`;
  }).join('');
  const headingTail = t('color?');

  state.app.innerHTML = `
    <section class="hero ui-container ui-container--wide" id="top">
      <div class="hero__copy">
        <button class="back-link exam-back" type="button" data-action="gallery">
          <span aria-hidden="true">←</span> All tests
        </button>
        <p class="ui-eyebrow">Color perception / 03 instruments / about 4 minutes</p>
        <h1>${t('How finely do you')} <em>${t('see')}</em>${headingTail === '?' ? '' : ' '}${headingTail}</h1>
        <p class="hero__lede">
          A careful, adaptive lab for the differences your display can reproduce—and your eyes can resolve.
        </p>
        <div class="ui-cluster hero__actions">
          <button class="ui-button ui-button--lg" type="button" data-action="setup">
            Begin the color lab <span aria-hidden="true">→</span>
          </button>
          <a class="ui-link ui-link--cta" href="#method">See the method</a>
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
        ${PHASES.map(
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
        ).join('')}
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
        <p class="ui-eyebrow ui-eyebrow--muted">Research trail</p>
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

function testDescription(id) {
  if (id === 'threshold')
    return 'Pick the one tile whose hue is different. The offset adapts after every answer.';
  if (id === 'field') return 'Find the shifted quadrant through controlled lightness and dot-size noise.';
  return 'Arrange three short hue arcs between fixed endpoints, with no color names as clues.';
}

function renderSetup() {
  cancelTrialEffects();
  state.session = null;
  state.labActive = false;
  state.lifecycle.setActive(false);
  document.body.classList.add('lab-mode');
  document.title = t('Prepare your screen — Tetracromia | Sense6');
  window.scrollTo({ top: 0, behavior: 'instant' });

  state.app.innerHTML = `
    <section class="setup-view ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="home"><span aria-hidden="true">←</span> Leave lab</button>
      <div class="setup-grid">
        <div class="setup-copy">
          <p class="ui-eyebrow">Screen check / 01 of 01</p>
          <h1>Set the room before the score.</h1>
          <p class="setup-lede">
            Display settings and ambient light can move a color threshold. This one-minute check
            makes your run more repeatable.
          </p>
          <div class="ui-alert ui-alert--info forced-colors-warning tetracromia-forced-colors-warning">
            <div class="ui-alert__body">
              <strong class="ui-alert__title">Color override detected</strong>
              <p>Turn off forced-colors or high-contrast mode before a visual color task.</p>
            </div>
          </div>
          <ol class="setup-list">
            <li><span>1</span><p>Use one screen. Disable Night Shift, True Tone, blue-light filters, and vivid modes.</p></li>
            <li><span>2</span><p>Avoid direct glare. Let your eyes settle on the neutral page for about 30 seconds.</p></li>
            <li><span>3</span><p>Set comfortable brightness. You should distinguish every neighboring step below.</p></li>
          </ol>
        </div>

        <div class="setup-panel ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Black → white</p>
              <h2>11-step check</h2>
            </div>
            <span class="ui-badge ui-badge--muted">${state.gamutChip.textContent}</span>
          </div>
          <div class="calibration-steps" role="img" aria-label="Eleven brightness steps from black to white">
            ${Array.from({ length: 11 }, (_, index) => `<span style="--step:${index / 10}"><b>${index}</b></span>`).join('')}
          </div>
          <div class="calibration-gradient" role="img" aria-label="Continuous grayscale gradient"></div>
          <p class="calibration-hint">Look for distinct edges above and a smooth ramp here—without a bright hotspot.</p>
          <label class="ui-check ready-check">
            <input type="checkbox" id="screen-ready" />
            <span>I can distinguish the steps and my color-shifting filters are off.</span>
          </label>
          <button class="ui-button ui-button--lg" id="start-lab" type="button" data-action="start" disabled>
            Start instrument 01 <span aria-hidden="true">→</span>
          </button>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Results are calculated locally and are not uploaded.</p>
        </div>
      </div>
    </section>
  `;
  updateSetupEligibility();
}

function startLab() {
  if (forcedColorsActive()) {
    updateSetupEligibility();
    announce('Turn off forced-colors or high-contrast mode before this color task.');
    return;
  }
  const seed = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  state.session = new ColorLabSession(seed);
  state.labActive = true;
  state.lifecycle.setActive(true, t('Leave the lab? Your progress will be lost.'));
  trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.tetracromia);
  state.selectedSequenceIndex = null;
  document.body.classList.add('lab-mode');
  state.trialStartedAt = performance.now();
  renderLab({ semanticTransition: true });
  announce('Instrument one. Threshold. Find the different tile.');
}

function renderLab({ semanticTransition = false, restoreChoice = null } = {}) {
  if (!state.session) return;
  state.fieldResizeObserver?.disconnect();
  const phase = state.session.phase;
  const phaseProgress = Math.round((state.session.trialIndex / phase.trials) * 100);
  const trial = state.session.currentTrial;
  document.title = `${t(phase.name)} ${state.session.trialIndex + 1} ${t('of')} ${phase.trials} — Tetracromia | Sense6`;

  state.app.innerHTML = `
    <section class="lab-view">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="home"><span aria-hidden="true">×</span> End session</button>
        <ol class="phase-list" aria-label="Lab progress">
          ${PHASES.map((item, index) => {
            const status =
              index < state.session.phaseIndex
                ? 'complete'
                : index === state.session.phaseIndex
                  ? 'current'
                  : 'upcoming';
            return `<li data-status="${status}" ${status === 'current' ? 'aria-current="step"' : ''}>
              <span>${item.number}</span><strong>${t(item.name)}</strong>
            </li>`;
          }).join('')}
        </ol>
        <span class="trial-count"><b>${String(state.session.trialIndex + 1).padStart(2, '0')}</b> / ${String(phase.trials).padStart(2, '0')}</span>
      </div>

      <div
        class="ui-progress lab-progress"
        role="progressbar"
        aria-label="Current instrument progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${phaseProgress}"
      >
        <div class="ui-progress__bar" style="--value:${phaseProgress}"></div>
      </div>

      <div class="lab-stage ui-container">
        <header class="trial-heading" tabindex="-1">
          <p class="ui-eyebrow">${t('Instrument')} ${phase.number} / ${t(phase.name)}</p>
          <h1>${t(phasePrompt(phase.id))}</h1>
          <p>${t(phaseHelp(phase.id))}</p>
        </header>

        ${trial.kind === 'threshold' ? renderThreshold(trial) : ''}
        ${trial.kind === 'field' ? renderField(trial) : ''}
        ${trial.kind === 'sequence' ? renderSequence(trial) : ''}

        <div class="trial-meta">
          <span><i aria-hidden="true"></i> Neutral surround</span>
          <span>Adaptive difficulty</span>
          <span>No answer is stored online</span>
        </div>
      </div>
    </section>
  `;

  armResponseGate(restoreChoice === null ? null : `[data-choice="${restoreChoice}"]`);
  if (trial.kind === 'field') {
    const nonce = trial.nonce;
    requestAnimationFrame(() => {
      if (state.session?.currentTrial.nonce !== nonce) return;
      drawFields(trial);
      document.querySelectorAll('canvas[data-field]').forEach((canvas) => {
        state.fieldResizeObserver?.observe(canvas);
      });
      scheduleFieldRedraw();
    });
  }
  if (semanticTransition) positionLabTransition();
}

function phasePrompt(id) {
  if (id === 'threshold') return 'Which tile is different?';
  if (id === 'field') return 'Which field shifts in color?';
  return 'Build the smoothest color path.';
}

function phaseHelp(id) {
  if (id === 'threshold') return 'Choose once. Trust the first stable difference you see.';
  if (id === 'field') return 'Ignore dot size and brightness. Look for a whole-field hue shift.';
  return 'The endpoints are fixed. Drag a tile into place — the row makes room. You can also tap two tiles to swap them.';
}

function renderThreshold(trial) {
  return `
    <div class="test-chamber threshold-chamber">
      <div class="threshold-grid" role="group" aria-label="Sixteen color tiles">
        ${Array.from({ length: 16 }, (_, index) => {
          const color = index === trial.answer ? trial.target : trial.reference;
          return `<button
            class="color-tile"
            type="button"
            data-choice="${index}"
            disabled
            aria-label="${t('Color tile')} ${index + 1}"
            style="--tile-color:${toRgbCss(color.l, color.c, color.h)}"
          ></button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderField() {
  return `
    <div class="test-chamber field-chamber">
      <div class="field-grid" role="group" aria-label="Four dotted color fields">
        ${Array.from(
          { length: 4 },
          (_, index) => `
          <button class="field-choice" type="button" data-choice="${index}" aria-label="${t('Dotted field')} ${index + 1}" disabled>
            <canvas data-field="${index}" aria-hidden="true"></canvas>
            <span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          </button>
        `,
        ).join('')}
      </div>
    </div>
  `;
}

function drawFields(trial) {
  document.querySelectorAll('canvas[data-field]').forEach((canvas) => {
    const index = Number(canvas.dataset.field);
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.fillStyle = '#747472';
    context.fillRect(0, 0, bounds.width, bounds.height);

    const random = seededRandom(`${trial.nonce}:${index}`);
    const base = index === trial.answer ? trial.target : trial.reference;
    const count = Math.round((bounds.width * bounds.height) / 145);

    for (let dot = 0; dot < count; dot += 1) {
      const lightness = base.l + (random() - 0.5) * 0.105;
      const chroma = Math.max(0.035, base.c + (random() - 0.5) * 0.036);
      const hue = base.h + (random() - 0.5) * 4.5;
      const radius = 2.2 + random() * 4.8;
      const x = radius + random() * (bounds.width - radius * 2);
      const y = radius + random() * (bounds.height - radius * 2);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = toRgbCss(lightness, chroma, hue);
      context.fill();
    }
  });
}

function cancelResponseGate() {
  state.responseGateToken += 1;
  state.responseReady = false;
  cancelAnimationFrame(state.responseGateFrame);
  clearTimeout(state.responseUnlockTimer);
  state.responseGateFrame = 0;
  state.responseUnlockTimer = 0;
}

function cancelTrialEffects() {
  if (!state) return;
  cancelResponseGate();
  cancelAnimationFrame(state.transitionFrame);
  cancelAnimationFrame(state.fieldRedrawFrame);
  state.transitionFrame = 0;
  state.fieldRedrawFrame = 0;
  state.fieldResizeObserver?.disconnect();
}

function armResponseGate(restoreFocusSelector) {
  cancelResponseGate();
  const mountedState = state;
  const token = state.responseGateToken;
  state.responseGateFrame = requestAnimationFrame(() => {
    state.responseGateFrame = 0;
    state.responseUnlockTimer = window.setTimeout(() => {
      if (state !== mountedState || state.responseGateToken !== token || !state.session) return;
      state.responseUnlockTimer = 0;
      state.responseReady = true;
      document.querySelectorAll('[data-choice], [data-action="submit-sequence"]').forEach((button) => {
        button.disabled = false;
      });
      scheduleFieldRedraw();
      if (restoreFocusSelector) {
        document.querySelector(restoreFocusSelector)?.focus({ preventScroll: true });
      }
    }, RESPONSE_GATE_MS);
  });
}

function claimTrialResponse() {
  if (!state.responseReady) return false;
  state.responseReady = false;
  document.querySelectorAll('[data-choice], [data-action="submit-sequence"]').forEach((button) => {
    button.disabled = true;
  });
  return true;
}

function positionLabTransition() {
  cancelAnimationFrame(state.transitionFrame);
  const mountedState = state;
  state.transitionFrame = requestAnimationFrame(() => {
    state.transitionFrame = 0;
    if (state !== mountedState) return;
    const heading = document.querySelector('.trial-heading');
    if (!heading) return;
    const chromeHeight = document.querySelector('.site-chrome')?.getBoundingClientRect().height ?? 0;
    const top = Math.max(0, window.scrollY + heading.getBoundingClientRect().top - chromeHeight - 8);
    window.scrollTo({ top, behavior: 'instant' });
    heading.focus({ preventScroll: true });
  });
}

function scheduleFieldRedraw() {
  if (state?.session?.currentTrial.kind !== 'field') return;
  cancelAnimationFrame(state.fieldRedrawFrame);
  const mountedState = state;
  const nonce = state.session.currentTrial.nonce;
  state.fieldRedrawFrame = requestAnimationFrame(() => {
    state.fieldRedrawFrame = 0;
    if (state !== mountedState || state.session?.currentTrial.nonce !== nonce) return;
    drawFields(state.session.currentTrial);
  });
}

function renderSequence(trial) {
  const first = trial.colors[0];
  const last = trial.colors.at(-1);

  return `
    <div class="test-chamber sequence-chamber">
      <div class="sequence-track" role="group" aria-label="${t('Hue ordering track')}">
        ${sequenceAnchor(first, t('Start anchor'))}
        <div class="sequence-run" id="sequence-run">
          ${trial.order
            .map((colorIndex, position) => {
              const color = trial.colors[colorIndex];
              const selected = state.selectedSequenceIndex === position;
              return `<button
              class="sequence-tile ${selected ? 'is-selected' : ''}"
              type="button"
              data-sequence-index="${position}"
              aria-label="${t('Movable color tile {position} of {total}{selected}', {
                position: position + 1,
                total: trial.order.length,
                selected: selected ? t(', selected') : '',
              })}"
              aria-pressed="${selected}"
              style="--tile-color:${toRgbCss(color.l, color.c, color.h)};--pos:${position}"
            ><span>${String(position + 1).padStart(2, '0')}</span></button>`;
            })
            .join('')}
        </div>
        ${sequenceAnchor(last, t('End anchor'))}
      </div>

      <div class="sequence-controls">
        <p id="sequence-status">${sequenceStatusText()}</p>
        <div class="ui-cluster">
          <button class="ui-button ui-button--ghost" type="button" data-action="move-sequence" data-direction="-1" ${state.selectedSequenceIndex === null ? 'disabled' : ''}>
            <span aria-hidden="true">←</span> Move left
          </button>
          <button class="ui-button ui-button--ghost" type="button" data-action="move-sequence" data-direction="1" ${state.selectedSequenceIndex === null ? 'disabled' : ''}>
            Move right <span aria-hidden="true">→</span>
          </button>
          <button class="ui-button" type="button" data-action="submit-sequence" disabled>Lock this order</button>
        </div>
      </div>
    </div>
  `;
}

function sequenceAnchor(color, label) {
  return `<div class="sequence-anchor" style="--tile-color:${toRgbCss(color.l, color.c, color.h)}">
    <span>${label}</span>
  </div>`;
}

function sequenceStatusText() {
  const run = `${t('Run')} ${state.session.trialIndex + 1} ${t('of')} ${state.session.phase.trials}`;
  return state.selectedSequenceIndex === null
    ? `${run} — ${t('drag a tile into place, or tap two tiles to swap them.')}`
    : `${run} — ${t('tile')} ${state.selectedSequenceIndex + 1} ${t('selected')}. ${t('Tap its new place to swap, or use the arrows.')}`;
}

/**
 * Update the sequence board in place. Rebuilding the DOM on every interaction
 * made the whole stage flash and dropped hover/focus state, which read as the
 * exercise "resetting".
 */
function syncSequenceUi(pulsePositions = []) {
  const trial = state.session.currentTrial;

  document.querySelectorAll('[data-sequence-index]').forEach((tile) => {
    const position = Number(tile.dataset.sequenceIndex);
    const color = trial.colors[trial.order[position]];
    const selected = state.selectedSequenceIndex === position;
    tile.style.setProperty('--tile-color', toRgbCss(color.l, color.c, color.h));
    tile.classList.toggle('is-selected', selected);
    tile.setAttribute('aria-pressed', String(selected));
    tile.setAttribute(
      'aria-label',
      t('Movable color tile {position} of {total}{selected}', {
        position: position + 1,
        total: trial.order.length,
        selected: selected ? t(', selected') : '',
      }),
    );
    tile.classList.remove('is-swapped');
    if (pulsePositions.includes(position)) {
      void tile.offsetWidth;
      tile.classList.add('is-swapped');
    }
  });

  const status = document.querySelector('#sequence-status');
  if (status) status.textContent = sequenceStatusText();
  document.querySelectorAll('[data-action="move-sequence"]').forEach((button) => {
    button.disabled = state.selectedSequenceIndex === null;
  });
}

function answerChoice(choice, { restoreFocus = false } = {}) {
  if (!state.session || state.session.phase.id === 'sequence' || !claimTrialResponse()) return;
  const phaseBefore = state.session.phase.id;
  const result = state.session.answerChoice(choice, performance.now() - state.trialStartedAt);

  if (result.done) {
    renderResults();
    return;
  }

  const phaseChanged = state.session.phase.id !== phaseBefore;
  if (phaseChanged) {
    announce(
      `${t('Instrument')} ${state.session.phase.number}. ${t(state.session.phase.name)}. ${t(phasePrompt(state.session.phase.id))}`,
    );
  } else {
    announce(result.correct ? 'Recorded. Next trial.' : 'Recorded. The difference will increase.');
  }

  state.selectedSequenceIndex = null;
  state.trialStartedAt = performance.now();
  renderLab({
    semanticTransition: phaseChanged,
    restoreChoice: !phaseChanged && restoreFocus ? choice : null,
  });
  state.app.dataset.feedback = result.correct ? 'correct' : 'miss';
  const mountedApp = state.app;
  window.setTimeout(() => delete mountedApp.dataset.feedback, 260);
}

function selectSequence(index) {
  if (state.session?.phase.id !== 'sequence') return;
  let pulse = [];

  if (state.selectedSequenceIndex === null) {
    state.selectedSequenceIndex = index;
    announce(t('Tile {position} selected.', { position: index + 1 }));
  } else if (state.selectedSequenceIndex === index) {
    state.selectedSequenceIndex = null;
  } else {
    // One-shot swap: clear the selection afterwards so the next tap starts
    // fresh instead of silently arming another swap.
    pulse = [state.selectedSequenceIndex, index];
    state.session.swapSequence(state.selectedSequenceIndex, index);
    state.selectedSequenceIndex = null;
    announce(t('Tiles {first} and {second} swapped.', { first: pulse[0] + 1, second: index + 1 }));
  }

  syncSequenceUi(pulse);
  document.querySelector(`[data-sequence-index="${index}"]`)?.focus();
}

function moveSequence(direction) {
  if (state.selectedSequenceIndex === null || !state.session) return;
  const moved = state.session.moveSequence(state.selectedSequenceIndex, direction);
  if (!moved) {
    announce('That tile is already at the edge.');
    return;
  }
  const pulse = [state.selectedSequenceIndex, state.selectedSequenceIndex + direction];
  state.selectedSequenceIndex += direction;
  syncSequenceUi(pulse);
  document.querySelector(`[data-sequence-index="${state.selectedSequenceIndex}"]`)?.focus();
  announce(t('Tile moved to position {position}.', { position: state.selectedSequenceIndex + 1 }));
}

function submitSequence() {
  if (state.session?.phase.id !== 'sequence' || !claimTrialResponse()) return;
  const result = state.session.submitSequence(performance.now() - state.trialStartedAt);
  state.selectedSequenceIndex = null;

  if (result.done) {
    renderResults();
    return;
  }

  state.trialStartedAt = performance.now();
  announce(
    t('Order recorded. Run {current} of {total}.', {
      current: state.session.trialIndex + 1,
      total: state.session.phase.trials,
    }),
  );
  renderLab();
}

function renderResults() {
  cancelTrialEffects();
  state.labActive = false;
  state.lifecycle.setActive(false);
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.tetracromia);
  document.body.classList.add('lab-mode');
  document.title = t('Your colour profile — Tetracromia | Sense6');
  const result = state.session.results();
  const previous = loadBestResult();
  if (!previous || result.overall > previous.overall) saveBestResult(result);
  saveJournalResult(result);
  const profile = profileLabel(result.overall);

  state.app.innerHTML = `
    <section class="results-view ui-container ui-container--wide" tabindex="-1">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">${t('Session complete')} / ${formatDuration(result.elapsedMs)}</p>
          <h1>Your visible boundary, on this display.</h1>
          <p>${profile.detail}</p>
        </div>
        <div class="score-lockup" aria-label="${t('Session index')} ${result.overall} / 100">
          <span>Session index</span>
          <strong>${result.overall}</strong>
          <small>/ 100</small>
        </div>
      </div>

      <div class="results-grid">
        <article class="profile-card ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Hue profile</p>
              <h2>${profile.title}</h2>
            </div>
            <span class="ui-badge ui-badge--accent">Display-relative</span>
          </div>
          ${renderRadar(result.hueProfile)}
          <p class="profile-explain">
            Each spoke is one hue region, drawn in its real color. The dot shows the share of
            discrimination trials you answered correctly there — the test keeps overall difficulty
            near your limit, so shorter spokes mark your relatively weaker directions.
          </p>
        </article>

        <div class="result-details">
          ${resultMetric('01', 'Threshold', result.thresholdScore, `${t('Finest step')} ≈ ${formatNumber(result.thresholdDegrees, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}° ${t('of hue')} (ΔEOK ${formatNumber(result.thresholdDelta, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, `${result.thresholdAccuracy}% ${t('correct · smaller angle = finer vision')}`)}
          ${resultMetric('02', 'Field', result.fieldScore, `${t('Finest shift')} ≈ ${formatNumber(result.fieldDegrees, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}° ${t('of hue')} ${t('through noise')} (ΔEOK ${formatNumber(result.fieldDelta, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, `${result.fieldAccuracy}% ${t('correct · smaller angle = finer vision')}`)}
          ${resultMetric('03', 'Sequence', result.sequenceScore, t('Hue ordering between fixed anchors'), `100 = ${t('perfect order · each out-of-place pair costs points')}`)}
        </div>
      </div>

      <div class="result-note ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">How to read this</strong>
          <p>
            Threshold and Field report the smallest hue difference you kept answering correctly,
            found adaptively (the app floor is 1.2°, near what an sRGB screen can render).
            The session index weighs them 35% + 35%, plus 30% for Sequence. Scores describe this
            run on this browser and screen — useful for comparing your own sessions under similar
            conditions, not a population percentile, diagnosis, or evidence for tetrachromacy.
          </p>
        </div>
      </div>

      <div class="results-actions">
        <button class="ui-button ui-button--lg" type="button" data-action="setup">Run again</button>
        <button class="ui-button ui-button--ghost" type="button" data-action="copy-results">Copy summary</button>
        <button class="ui-button ui-button--subtle" type="button" data-action="home">Return to method</button>
      </div>

      ${previous ? `<p class="previous-score">Previous best on this browser: <strong>${previous.overall}/100</strong></p>` : ''}
    </section>
  `;

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('.results-view').focus({ preventScroll: true });
  announce(
    `Session complete. Your display-relative index is ${result.overall} out of 100. ${profile.title}.`,
  );
}

function resultMetric(number, title, score, detail, note) {
  return `<article class="result-metric">
    <div class="result-metric__head">
      <span>${number}</span>
      <div><h3>${t(title)}</h3><p>${detail}</p></div>
      <strong>${score}</strong>
    </div>
    <div class="metric-meter">
      <div class="metric-meter__row"><span>${note}</span><strong>${score}/100</strong></div>
      <div class="ui-meter ui-meter--accent" role="meter" aria-label="${t(title)} — ${score}/100" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}">
        <span class="ui-meter__fill" style="--value:${score}"></span>
      </div>
    </div>
  </article>`;
}

function renderRadar(profile) {
  const center = 160;
  const radius = 100;
  const inner = 24;
  const count = profile.length;
  const angleAt = (index) => -Math.PI / 2 + (index * Math.PI * 2) / count;

  const points = profile
    .map(({ score }, index) => {
      const angle = angleAt(index);
      const distance = inner + (radius - inner) * ((score ?? 0) / 100);
      return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
    })
    .join(' ');

  const axes = profile
    .map((family, index) => {
      const angle = angleAt(index);
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const labelX = center + Math.cos(angle) * (radius + 24);
      const labelY = center + Math.sin(angle) * (radius + 24);
      const anchor = Math.cos(angle) > 0.35 ? 'end' : Math.cos(angle) < -0.35 ? 'start' : 'middle';
      return `
        <line class="profile-radar__axis" x1="${center}" y1="${center}" x2="${x}" y2="${y}" />
        <circle class="profile-radar__swatch" cx="${labelX}" cy="${labelY - 8}" r="6"
          fill="${toRgbCss(0.7, 0.12, family.hue)}" />
        <text class="profile-radar__label" x="${labelX}" y="${labelY + 8}" text-anchor="${anchor}">
          ${family.label} ${family.score ?? '–'}
        </text>`;
    })
    .join('');

  const summary = profile
    .map(({ label, score }) => `${label} ${score === null ? 'no data' : `${score} percent`}`)
    .join(', ');

  return `<svg class="profile-radar" viewBox="0 0 320 320" role="img"
    aria-label="Hue discrimination profile, share of correct answers per hue region: ${summary}">
    <g class="profile-radar__grid">
      <circle cx="${center}" cy="${center}" r="${inner}" />
      <circle cx="${center}" cy="${center}" r="${Math.round(inner + (radius - inner) * 0.5)}" />
      <circle cx="${center}" cy="${center}" r="${radius}" />
    </g>
    ${axes}
    <polygon class="profile-radar__area" points="${points}" />
    ${points
      .split(' ')
      .map((point, index) => {
        const [x, y] = point.split(',');
        return `<circle class="profile-radar__point" cx="${x}" cy="${y}" r="4.5"
          fill="${toRgbCss(0.7, 0.12, profile[index].hue)}" />`;
      })
      .join('')}
  </svg>`;
}

function profileLabel(score) {
  if (score >= 86)
    return {
      title: 'Very fine screen-level discrimination',
      detail: 'You resolved small display differences consistently across the three instruments.',
    };
  if (score >= 72)
    return {
      title: 'Fine screen-level discrimination',
      detail: 'You resolved subtle display differences with a stable overall profile.',
    };
  if (score >= 56)
    return {
      title: 'Moderate screen-level discrimination',
      detail: 'You found clear differences; the finest steps were less consistent in this run.',
    };
  return {
    title: 'Broad screen-level discrimination',
    detail: 'The smallest display steps were difficult in this run. Screen setup and fatigue can matter.',
  };
}

function formatDuration(milliseconds) {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function loadBestResult() {
  return RESULT_STORE.load();
}

function saveBestResult(result) {
  RESULT_STORE.save({ overall: result.overall, savedAt: new Date().toISOString() });
}

function saveJournalResult(result) {
  const entry = createJournalEntry({
    examId: 'tetracromia',
    locale: state.locale,
    quality: 'usable',
    setup: captureDisplayPassport(),
    measurements: [
      { id: 'overall', value: result.overall, unit: '/100' },
      { id: 'threshold-degrees', value: result.thresholdDegrees, unit: '° hue' },
      { id: 'field-degrees', value: result.fieldDegrees, unit: '° hue' },
      { id: 'sequence-score', value: result.sequenceScore, unit: '/100' },
    ],
  });
  if (entry) appendJournalEntry(entry);
}

async function copyResults() {
  if (!state.session) return;
  const result = state.session.results();
  const summary = t(
    'Tetracromia — {overall}/100 screen-level color discrimination. Threshold {threshold}, Field {field}, Sequence {sequence}. Device-relative, not diagnostic.',
    {
      overall: result.overall,
      threshold: result.thresholdScore,
      field: result.fieldScore,
      sequence: result.sequenceScore,
    },
  );

  try {
    await navigator.clipboard.writeText(summary);
    toast(t('Result summary copied'), { tone: 'success' });
  } catch {
    toast(t('Could not access the clipboard'), { tone: 'danger' });
  }
}

function announce(message) {
  const mountedAnnouncer = state.announcer;
  mountedAnnouncer.textContent = '';
  requestAnimationFrame(() => {
    mountedAnnouncer.textContent = t(message);
  });
}

function forcedColorsActive() {
  return window.matchMedia?.('(forced-colors: active)').matches === true;
}

function updateSetupEligibility() {
  const ready = state.app.querySelector('#screen-ready');
  const start = state.app.querySelector('#start-lab');
  if (!ready || !start) return;
  const blocked = forcedColorsActive();
  start.disabled = !ready.checked || blocked;
  state.app
    .querySelector('.tetracromia-forced-colors-warning')
    ?.setAttribute('aria-hidden', String(!blocked));
}

function wireEvents(signal) {
  document.addEventListener(
    'change',
    (event) => {
      if (event.target.matches('#screen-ready')) {
        updateSetupEligibility();
      }
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const choice = event.target.closest('[data-choice]');
      if (choice) {
        answerChoice(Number(choice.dataset.choice), { restoreFocus: event.detail === 0 });
        return;
      }

      const sequenceTile = event.target.closest('[data-sequence-index]');
      if (sequenceTile) {
        if (state.suppressNextSequenceClick) {
          state.suppressNextSequenceClick = false;
          return;
        }
        selectSequence(Number(sequenceTile.dataset.sequenceIndex));
        return;
      }

      const action = event.target.closest('[data-action]');
      if (!action) return;

      if (action.dataset.action === 'setup') renderSetup();
      if (action.dataset.action === 'start' && !action.disabled) startLab();
      if (action.dataset.action === 'home') {
        if (state.labActive && !window.confirm(t('End this session? Your progress will be lost.'))) return;
        renderHome();
      }
      if (action.dataset.action === 'gallery') {
        if (state.labActive && !window.confirm(t('Leave the lab? Your progress will be lost.'))) return;
        state.goHome();
      }
      if (action.dataset.action === 'move-sequence') moveSequence(Number(action.dataset.direction));
      if (action.dataset.action === 'submit-sequence') submitSequence();
      if (action.dataset.action === 'copy-results') copyResults();
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      const tile = event.target.closest('[data-sequence-index]');
      if (!tile || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      state.selectedSequenceIndex = Number(tile.dataset.sequenceIndex);
      moveSequence(event.key === 'ArrowLeft' ? -1 : 1);
    },
    { signal },
  );

  document.addEventListener('pointerdown', onSequencePointerDown, { signal });
  document.addEventListener('pointermove', onSequencePointerMove, { signal });
  document.addEventListener('pointerup', onSequencePointerUp, { signal });
  document.addEventListener('pointercancel', onSequencePointerCancel, { signal });
  window.addEventListener('resize', scheduleFieldRedraw, { signal });
  window.matchMedia?.('(forced-colors: active)').addEventListener(
    'change',
    () => {
      if (state.labActive && forcedColorsActive()) {
        renderSetup();
        announce('Color override detected. This run stopped and was not saved.');
        return;
      }
      updateSetupEligibility();
    },
    { signal },
  );
}

/*
 * Pointer-based drag with insertion semantics. HTML5 drag-and-drop never
 * fires from touch input, so the same pointer path serves mouse, touch, and
 * pen: press a tile, the row makes room at the insertion point, release to
 * drop. A small movement threshold keeps plain taps working as taps.
 */
const DRAG_THRESHOLD_PX = 8;

function sequenceTiles() {
  return [...document.querySelectorAll('[data-sequence-index]')];
}

function dragTargetIndex(drag, pointerX) {
  const { runLeft, step, count } = drag;
  const raw = Math.round((pointerX - runLeft - step / 2) / step);
  return Math.max(0, Math.min(count - 1, raw));
}

function previewDragShift(drag, targetIndex) {
  const { index, step } = drag;
  sequenceTiles().forEach((tile) => {
    const position = Number(tile.dataset.sequenceIndex);
    if (position === index) return;
    let shift = 0;
    if (index < targetIndex && position > index && position <= targetIndex) shift = -step;
    if (index > targetIndex && position >= targetIndex && position < index) shift = step;
    tile.style.transform = shift === 0 ? '' : `translateX(${shift}px)`;
  });
}

function endSequenceDrag(commit) {
  const drag = state.sequenceDrag;
  state.sequenceDrag = null;
  if (!drag) return;

  const tiles = sequenceTiles();
  tiles.forEach((tile) => {
    tile.style.transform = '';
    tile.classList.remove('is-drag-source');
  });
  document.querySelector('#sequence-run')?.classList.remove('is-reordering');

  if (!drag.started) return;
  state.suppressNextSequenceClick = true;
  const mountedState = state;
  window.setTimeout(() => {
    mountedState.suppressNextSequenceClick = false;
  }, 120);

  if (commit && state.session?.phase.id === 'sequence') {
    const target = dragTargetIndex(drag, drag.lastX);
    if (state.session.insertSequence(drag.index, target)) {
      state.selectedSequenceIndex = null;
      syncSequenceUi([target]);
      announce(t('Tile moved to position {position}.', { position: target + 1 }));
      document.querySelector(`[data-sequence-index="${target}"]`)?.focus();
      return;
    }
  }
  syncSequenceUi();
}

function onSequencePointerDown(event) {
  const tile = event.target.closest('[data-sequence-index]');
  if (!tile || state.session?.phase.id !== 'sequence' || !event.isPrimary || event.button !== 0) return;

  const run = document.querySelector('#sequence-run');
  const runBounds = run.getBoundingClientRect();
  const tileBounds = tile.getBoundingClientRect();
  const count = state.session.currentTrial.order.length;

  state.sequenceDrag = {
    pointerId: event.pointerId,
    index: Number(tile.dataset.sequenceIndex),
    started: false,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    cancelled: false,
    runLeft: runBounds.left,
    step: count > 1 ? (runBounds.width - tileBounds.width) / (count - 1) : tileBounds.width,
    count,
    tile,
  };
}

function onSequencePointerMove(event) {
  if (!state.sequenceDrag || event.pointerId !== state.sequenceDrag.pointerId) return;
  const drag = state.sequenceDrag;
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;

  if (!drag.started) {
    if (drag.cancelled) return;
    const horizontalDistance = Math.abs(event.clientX - drag.startX);
    const verticalDistance = Math.abs(event.clientY - drag.startY);
    if (horizontalDistance < DRAG_THRESHOLD_PX && verticalDistance < DRAG_THRESHOLD_PX) return;
    if (verticalDistance >= horizontalDistance) {
      drag.cancelled = true;
      return;
    }
    drag.started = true;
    drag.tile.classList.add('is-drag-source');
    document.querySelector('#sequence-run')?.classList.add('is-reordering');
    try {
      drag.tile.setPointerCapture(event.pointerId);
    } catch {}
  }

  drag.tile.style.transform = `translateX(${event.clientX - drag.startX}px)`;
  previewDragShift(drag, dragTargetIndex(drag, event.clientX));
}

function onSequencePointerUp(event) {
  if (!state.sequenceDrag || event.pointerId !== state.sequenceDrag.pointerId) return;
  endSequenceDrag(true);
}

function onSequencePointerCancel(event) {
  if (!state.sequenceDrag || event.pointerId !== state.sequenceDrag.pointerId) return;
  endSequenceDrag(false);
}
