import { toast } from '@ponchia/ui/behaviors';
import '../styles/tetracromia-landing.css';
import '../styles/tetracromia.css';
import '../styles/tetracromia-compact-landing.css';
import { formatNumber, m, t } from '../i18n.js';
import { toRgbCss } from '../lib/color.js';
import { captureDisplayPassport, saveJournalRun } from '../lib/journal.js';
import {
  createExamLifecycle,
  forcedColorsActive,
  isCurrentMount,
  watchForcedColors,
} from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { resultActionLabel, shareOrCopyResult } from '../lib/result-sharing.js';
import { ColorLabSession, PHASES } from '../lib/session.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';
import { protocolPassport } from './protocols.js';
import { relatedGuideResultLink } from './related-guide.js';
import { tetracromiaHomeMarkup } from './views/tetracromia-home.js';

const MOUNT_OWNER = Symbol('tetracromia');
const RESPONSE_GATE_MS = 180;
const RAPID_TOUCH_COMMIT_MS = 600;
/** @typedef {{ width: number, height: number, dpr: number, gamut: string }} VisualEnvironment */

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
    lastTouchCommitAt: Number.NEGATIVE_INFINITY,
    responseReady: false,
    responseGateToken: 0,
    responseGateFrame: 0,
    responseUnlockTimer: 0,
    transitionFrame: 0,
    fieldRedrawFrame: 0,
    announcementFrame: 0,
    dragReleaseTimer: 0,
    measurementEnvironment: null,
  };
  state = mountState;
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

  state.app.innerHTML = tetracromiaHomeMarkup(PHASES, t, m, toRgbCss, state.locale);
}

function renderSetup({ invalidationMessage = '' } = {}) {
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
          <h1>Set the room before the observations.</h1>
          <p class="setup-lede">
            Display settings and ambient light can change what appears visible. This one-minute
            check makes the 29-block run easier to repeat under similar conditions.
          </p>
          ${
            invalidationMessage
              ? `<div class="ui-alert ui-alert--warning tetracromia-invalidation" role="alert" tabindex="-1" data-tetracromia-invalidation>${t(invalidationMessage)}</div>`
              : ''
          }
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
            <span><strong class="experiment-boundary">I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.</strong> I can distinguish the steps and my color-shifting filters are off.</span>
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
  if (invalidationMessage) {
    state.lifecycle.present(state.app, { focus: '[data-tetracromia-invalidation]' });
  }
}

function startLab() {
  if (forcedColorsActive()) {
    updateSetupEligibility();
    announce('Turn off forced-colors or high-contrast mode before this color task.');
    return;
  }
  const seed = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  state.session = new ColorLabSession(seed);
  state.measurementEnvironment = captureVisualEnvironment();
  state.labActive = true;
  state.lifecycle.setActive(true, t('Leave the lab? Your progress will be lost.'));
  trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.tetracromia);
  state.selectedSequenceIndex = null;
  document.body.classList.add('lab-mode');
  state.trialStartedAt = performance.now();
  renderLab({ semanticTransition: true });
  // The focused trial heading already names the instrument. Announce only the
  // existing, reviewed localized question instead of an English-only compound.
  announce('Which tile is different?');
}

function renderLab({ semanticTransition = false, restoreChoice = null } = {}) {
  if (!state.session) return;
  const phase = state.session.phase;
  const overallProgress = state.session.progress;
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
        aria-label="Whole run progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${overallProgress}"
      >
        <div class="ui-progress__bar" style="--value:${overallProgress}"></div>
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
          <span>${state.session.completedTrials + 1} of ${state.session.totalTrials} total blocks</span>
          <span>No answer is stored online</span>
        </div>
      </div>
    </section>
  `;

  armResponseGate(restoreChoice === null ? null : `[data-choice="${restoreChoice}"]`);
  if (trial.kind === 'field') {
    const mountedState = state;
    const nonce = trial.nonce;
    const frame = requestAnimationFrame(() => {
      if (state !== mountedState || mountedState.fieldRedrawFrame !== frame) return;
      mountedState.fieldRedrawFrame = 0;
      if (mountedState.session?.currentTrial.nonce !== nonce) return;
      drawFields(trial);
    });
    mountedState.fieldRedrawFrame = frame;
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
    // Layout dimensions stay stable while the choice's hover transform animates.
    // getBoundingClientRect() includes that transform and could leave the backing
    // store undersized after the pointer happened to rest over a field.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.fillStyle = '#747472';
    context.fillRect(0, 0, width, height);

    const random = seededRandom(`${trial.nonce}:common-field-noise`);
    const base = index === trial.answer ? trial.target : trial.reference;
    const count = Math.round((width * height) / 145);

    for (let dot = 0; dot < count; dot += 1) {
      const lightness = base.l + (random() - 0.5) * 0.105;
      const chroma = Math.max(0.035, base.c + (random() - 0.5) * 0.036);
      const hue = base.h + (random() - 0.5) * 4.5;
      const radius = 2.2 + random() * 4.8;
      const x = radius + random() * (width - radius * 2);
      const y = radius + random() * (height - radius * 2);
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
  cancelAnimationFrame(state.announcementFrame);
  clearTimeout(state.dragReleaseTimer);
  state.transitionFrame = 0;
  state.fieldRedrawFrame = 0;
  state.announcementFrame = 0;
  state.dragReleaseTimer = 0;
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
      guardVisualEnvironment();
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
    const compactLandscape = window.matchMedia('(min-width: 641px) and (max-height: 31.25rem)').matches;
    const chromeHeight = document.querySelector('.site-chrome')?.getBoundingClientRect().height ?? 0;
    const stimulusNeedsViewport = compactLandscape || state.session?.phase.id === 'sequence';
    const top = stimulusNeedsViewport
      ? Math.max(0, window.scrollY + heading.getBoundingClientRect().top - chromeHeight - 8)
      : 0;
    window.scrollTo({ top, left: 0, behavior: 'instant' });
    heading.focus({ preventScroll: true });
  });
}

/**
 * Stop the run when the display it was calibrated against changes. This never
 * repaints anything: a resized or rescaled viewport invalidates the measured
 * stimulus, so the only honest response is to end the run before saving.
 */
function guardVisualEnvironment() {
  if (!state?.labActive || !state.measurementEnvironment) return;
  if (visualEnvironmentChanged(state.measurementEnvironment, captureVisualEnvironment())) {
    invalidateVisualRun(
      'The display size changed. This run stopped before saving; restart after the layout is stable.',
    );
  }
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
    // The following trial is rendered immediately; this short confirmation is
    // already translated in every supported experiment locale.
    announce('Response recorded.');
  }

  state.selectedSequenceIndex = null;
  state.trialStartedAt = performance.now();
  renderLab({
    semanticTransition: phaseChanged,
    restoreChoice: !phaseChanged && restoreFocus ? choice : null,
  });
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
  document.title = t('Screen Colour Lab observations — Tetracromia | Sense6');
  const result = state.session.results();

  const tetracromiaGuideLink = relatedGuideResultLink(
    'tetracromia',
    state.locale,
    'Why an RGB screen cannot confirm tetrachromacy',
  );
  state.app.innerHTML = `
    <section class="results-view ui-container ui-container--wide" tabindex="-1">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">${t('Session complete')} / ${formatDuration(result.elapsedMs)}</p>
          <h1>Three observations from one short screen-colour run.</h1>
          <p>Keep the tasks separate. This fixed 29-block experiment is too short to establish a stable threshold, stable hue characteristic, or overall ability score.</p>
        </div>
        <div class="score-lockup" aria-label="29 completed blocks">
          <span>Completed</span>
          <strong>29</strong>
          <small>blocks</small>
        </div>
      </div>

      <div data-tetracromia-persistence></div>

      <div class="result-details">
        ${observationMetric('01', 'Tile choices', t('{correct} of {presentations} correct', { correct: result.tile.correct, presentations: result.tile.presentations }), t('The adaptive level ended near {level}° of OKLCH hue (ΔEOK {delta}).', { level: formatNumber(result.tile.adaptiveLevelDegrees, { maximumFractionDigits: 1 }), delta: formatNumber(result.tile.deltaEok, { maximumFractionDigits: 3 }) }), t('Presented range {minimum}°–{maximum}° · {reversals} direction changes', { minimum: result.tile.presentedMinimum, maximum: result.tile.presentedMaximum, reversals: result.tile.reversals }))}
        ${observationMetric('02', 'Dot-field choices', t('{correct} of {presentations} correct', { correct: result.field.correct, presentations: result.field.presentations }), t('The adaptive level ended near {level}° of OKLCH hue (ΔEOK {delta}).', { level: formatNumber(result.field.adaptiveLevelDegrees, { maximumFractionDigits: 1 }), delta: formatNumber(result.field.deltaEok, { maximumFractionDigits: 3 }) }), t('Presented range {minimum}°–{maximum}° · {reversals} direction changes', { minimum: result.field.presentedMinimum, maximum: result.field.presentedMaximum, reversals: result.field.reversals }))}
        ${observationMetric('03', 'Hue ordering', t('{percent}% of pairs ordered', { percent: result.ordering.orderedPairsPercent }), t('Mean pair ordering across {runs} fixed-anchor arcs.', { runs: result.ordering.runs }), t('Run values: {values}%', { values: result.ordering.runPercentages.join('%, ') }))}
      </div>

      <div class="result-note ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">How to read this</strong>
          <p>
            The ending adaptive levels summarize where this brief run happened to finish; they are
            not stable thresholds or uncertainty estimates. Ordering is a separate task. None of
            these observations is a population score, diagnosis, clinical screen, or evidence for
            tetrachromacy. A repeat is stored independently—Sense6 never pools runs or keeps a best.
          </p>
          ${tetracromiaGuideLink ? `<p class="result-note__learn">${tetracromiaGuideLink}</p>` : ''}
        </div>
      </div>

      <div class="results-actions" data-tetracromia-result-actions>
        <button class="ui-button ui-button--subtle" type="button" data-action="home">Return to method</button>
      </div>
    </section>
  `;

  const journalOutcome = saveJournalResult(result);
  const journalSaved = journalOutcome === 'saved';
  const persistence = state.app.querySelector('[data-tetracromia-persistence]');
  if (journalSaved) persistence?.remove();
  else if (persistence) {
    persistence.outerHTML = `<div class="ui-alert ui-alert--danger tetracromia-journal-status" data-tetracromia-journal-status role="alert"><strong class="ui-alert__title">${
      journalOutcome === 'invalid'
        ? t(
            'This run did not match the journal record format, so it was not saved. Copy the summary to keep it.',
          )
        : t('The result is ready, but this browser did not allow local storage.')
    }</strong></div>`;
  }
  state.app
    .querySelector('[data-tetracromia-result-actions]')
    ?.insertAdjacentHTML(
      'afterbegin',
      journalSaved
        ? `<button class="ui-button ui-button--lg" type="button" data-action="setup">${t('Repeat independently')}</button><button class="ui-button ui-button--ghost" type="button" data-action="copy-results">${resultActionLabel(t, 'Copy summary')}</button>`
        : `<button class="ui-button ui-button--lg" type="button" data-action="copy-results">${resultActionLabel(t, 'Copy summary')}</button><button class="ui-button ui-button--ghost" type="button" data-action="setup">${t('Repeat independently')}</button>`,
    );

  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('.results-view').focus({ preventScroll: true });
  // The focused results view contains the complete scientific boundary; keep
  // the live-region success notice brief and language-matched.
  announce('Session complete');
}

function observationMetric(number, title, value, detail, note) {
  return `<article class="result-metric">
    <div class="result-metric__head">
      <span>${number}</span>
      <div><h2>${t(title)}</h2><p>${detail}</p></div>
      <strong>${value}</strong>
    </div>
    <p class="observation-explain">${note}</p>
  </article>`;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/** @returns {import('../lib/journal.js').JournalSaveOutcome} */
function saveJournalResult(result) {
  return saveJournalRun({
    examId: 'tetracromia',
    locale: state.locale,
    quality: 'caution',
    protocol: protocolPassport('tetracromia'),
    setup: captureDisplayPassport(),
    qualityEvidence: {
      tilePresentations: result.tile.presentations,
      fieldPresentations: result.field.presentations,
      orderingRuns: result.ordering.runs,
      tileReversals: result.tile.reversals,
      fieldReversals: result.field.reversals,
      interrupted: false,
    },
    measurements: [
      { id: 'tile-adaptive-level', value: result.tile.adaptiveLevelDegrees, unit: '° hue' },
      { id: 'field-adaptive-level', value: result.field.adaptiveLevelDegrees, unit: '° hue' },
      { id: 'ordered-pairs', value: result.ordering.orderedPairsPercent, unit: '%' },
    ],
    notes: ['short-exploratory-protocol', 'not-a-stable-threshold'],
  });
}

async function copyResults() {
  const mountState = state;
  const session = mountState?.session;
  if (!session) return;
  const ownsResult = () => isCurrentMount(state, mountState) && mountState.session === session;
  const result = session.results();
  const summary = `Screen Colour Lab (Tetracromia) — tile ${result.tile.correct}/${result.tile.presentations} at an ending adaptive level near ${result.tile.adaptiveLevelDegrees}°; field ${result.field.correct}/${result.field.presentations} near ${result.field.adaptiveLevelDegrees}°; ordering ${result.ordering.orderedPairsPercent}% of pairs. Short-run, display-relative observations—not thresholds, a clinical test, or a diagnosis.`;

  try {
    const outcome = await shareOrCopyResult({
      title: t('Tetracromia — colour discrimination | Sense6'),
      summary,
      route: 'tetracromia',
      locale: mountState.locale,
    });
    if (!ownsResult()) return;
    if (outcome === 'copied') toast(t('Result summary copied'), { tone: 'success' });
  } catch {
    if (ownsResult()) toast(t('Could not access the clipboard'), { tone: 'danger' });
  }
}

function announce(message) {
  const mountedState = state;
  const mountedAnnouncer = mountedState.announcer;
  cancelAnimationFrame(mountedState.announcementFrame);
  mountedAnnouncer.textContent = '';
  mountedState.announcementFrame = requestAnimationFrame(() => {
    if (!isCurrentMount(state, mountedState)) return;
    mountedState.announcementFrame = 0;
    mountedAnnouncer.textContent = t(message);
  });
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

function captureVisualEnvironment() {
  return {
    width: Math.round(window.visualViewport?.width ?? window.innerWidth),
    height: Math.round(window.visualViewport?.height ?? window.innerHeight),
    dpr: window.devicePixelRatio || 1,
    gamut: state.gamutChip.dataset.gamut ?? 'unknown',
  };
}

/** @param {VisualEnvironment} baseline @param {VisualEnvironment} current */
function visualEnvironmentChanged(baseline, current) {
  return (
    baseline.dpr !== current.dpr ||
    baseline.gamut !== current.gamut ||
    Math.abs(baseline.width - current.width) > 1 ||
    Math.abs(baseline.height - current.height) > 1
  );
}

/** @param {string} message */
function invalidateVisualRun(message) {
  if (!state.labActive) return;
  state.measurementEnvironment = null;
  renderSetup({ invalidationMessage: message });
  announce(message);
}

function isRepeatedTouchCommit(event) {
  if (event.pointerType !== 'touch') return false;
  const elapsed = event.timeStamp - state.lastTouchCommitAt;
  if (elapsed >= 0 && elapsed < RAPID_TOUCH_COMMIT_MS) return true;
  state.lastTouchCommitAt = event.timeStamp;
  return false;
}

function wireEvents(signal) {
  document.addEventListener('change', handleSetupChange, { signal });
  document.addEventListener('click', handleLabClick, { signal });
  document.addEventListener('keydown', handleSequenceKeydown, { signal });

  document.addEventListener('pointerdown', onSequencePointerDown, { signal });
  document.addEventListener('pointermove', onSequencePointerMove, { signal });
  document.addEventListener('pointerup', onSequencePointerUp, { signal });
  document.addEventListener('pointercancel', onSequencePointerCancel, { signal });
  window.addEventListener('resize', guardVisualEnvironment, { signal });
  document.addEventListener('visibilitychange', handleVisibilityChange, { signal });
  watchForcedColors(handleForcedColorsChange, signal);
}

function handleSetupChange(event) {
  if (event.target.matches('#screen-ready')) updateSetupEligibility();
}

function handleLabClick(event) {
  const choice = event.target.closest('[data-choice]');
  if (choice) {
    if (isRepeatedTouchCommit(event)) return;
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
  if (action.dataset.action === 'home') return leaveLabForHome();
  if (action.dataset.action === 'gallery') return leaveLabForGallery();
  if (action.dataset.action === 'move-sequence') moveSequence(Number(action.dataset.direction));
  if (action.dataset.action === 'submit-sequence' && !isRepeatedTouchCommit(event)) submitSequence();
  if (action.dataset.action === 'copy-results') copyResults();
}

function leaveLabForHome() {
  if (state.labActive && !window.confirm(t('End this session? Your progress will be lost.'))) return;
  renderHome();
}

function leaveLabForGallery() {
  if (state.labActive && !window.confirm(t('Leave the lab? Your progress will be lost.'))) return;
  state.goHome();
}

function handleSequenceKeydown(event) {
  const tile = event.target.closest('[data-sequence-index]');
  if (!tile || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  state.selectedSequenceIndex = Number(tile.dataset.sequenceIndex);
  moveSequence(event.key === 'ArrowLeft' ? -1 : 1);
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'hidden') return;
  invalidateVisualRun(
    'The page was hidden. This run stopped before saving; restart when you can keep it visible.',
  );
}

function handleForcedColorsChange() {
  if (state.labActive && forcedColorsActive()) {
    invalidateVisualRun('Color override detected. This run stopped and was not saved.');
    return;
  }
  updateSetupEligibility();
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
  clearTimeout(mountedState.dragReleaseTimer);
  mountedState.dragReleaseTimer = window.setTimeout(() => {
    if (state !== mountedState) return;
    mountedState.dragReleaseTimer = 0;
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
