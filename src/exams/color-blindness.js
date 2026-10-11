import { toast } from '@ponchia/ui/behaviors';
import '../styles/color-blindness.css';
import { formatNumber, m, t } from '../i18n.js';
import {
  createAdaptiveRun,
  currentAdaptiveTrial,
  DEMO_TARGET,
  displayEnvironmentChange,
  jitterDotColor,
  makeTargetPair,
  recordAdaptiveAnswer,
  rgbCss,
  summarizeAdaptiveRun,
} from '../lib/daltonism.js';
import { captureDisplayPassport, saveJournalRun } from '../lib/journal.js';
import {
  createExamLifecycle,
  forcedColorsActive,
  isCurrentMount,
  watchForcedColors,
} from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { resultActionLabel, shareOrCopyResult } from '../lib/result-sharing.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';
import { protocolPassport } from './protocols.js';
import { relatedGuideResultLink } from './related-guide.js';
import { colorBlindnessIntroMarkup } from './views/color-blindness-intro.js';

const RESULT_STORE = createResultStore({
  key: 'sense6:daltonia:last',
  legacyKeys: ['daltonia-last'],
  validate: (value) => isRecord(value) && value.schemaVersion === 3 && Array.isArray(value.levels),
});
const MOUNT_OWNER = Symbol('daltonia');
const EDITABLE_CONTROL_SELECTOR = 'input, select, textarea, [contenteditable]:not([contenteditable="false"])';

const DIRECTION_LABELS = {
  up: 'top',
  right: 'right',
  down: 'bottom',
  left: 'left',
};

const DIRECTION_GLYPHS = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};

const PRACTICE_TARGETS = [
  {
    id: 'practice-right',
    type: 'control',
    orientation: 'right',
    strength: 0.32,
    background: [0.27, 0.32, 0.18],
  },
  {
    id: 'practice-up',
    type: 'control',
    orientation: 'up',
    strength: 0.26,
    background: [0.27, 0.32, 0.18],
  },
];

let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, { bodyClasses: ['lab-mode', 'cb-active'] });
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    gamutChip: context.gamutChip,
    goHome: context.navigateHome,
    lifecycle,
    locale: context.locale,
    run: null,
    active: false,
    phase: 'intro',
    practiceIndex: 0,
    practiceFeedback: null,
    measurementEnvironment: null,
    dprGuardCleanup: () => {},
    responseOpen: false,
    renderToken: 0,
    stageFrame: 0,
    announcementFrame: 0,
  };
  state = mountState;
  wireEvents(lifecycle.signal);
  renderIntro();

  lifecycle.onCleanup(() => {
    cancelPendingFrames(mountState);
    mountState.dprGuardCleanup();
    mountState.active = false;
    mountState.phase = 'intro';
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

/**
 * Drop every deferred callback this mount still owns. Disposal runs in the
 * same frame as a pending callback, so an uncancelled frame would otherwise
 * dereference the module state this mount just released.
 */
function cancelPendingFrames(mountState) {
  cancelAnimationFrame(mountState.stageFrame);
  cancelAnimationFrame(mountState.announcementFrame);
  mountState.stageFrame = 0;
  mountState.announcementFrame = 0;
}

/** Paint the freshly rendered screen only while this mount still owns it. */
function scheduleStageFrame(callback) {
  const mountState = state;
  cancelAnimationFrame(mountState.stageFrame);
  mountState.stageFrame = requestAnimationFrame(() => {
    mountState.stageFrame = 0;
    if (!isCurrentMount(state, mountState)) return;
    callback(mountState);
  });
}

function renderIntro() {
  state.dprGuardCleanup();
  state.active = false;
  state.lifecycle.setActive(false);
  state.phase = 'intro';
  document.body.classList.remove('lab-mode');
  document.title = t('Experimental colour-vision check — Daltonia | Sense6');

  const previous = loadLast();

  state.app.innerHTML = colorBlindnessIntroMarkup(previous, m, state.locale);

  scheduleStageFrame((mountState) => {
    const canvas = mountState.app.querySelector('[data-preview-target]');
    if (canvas) drawTarget(canvas, DEMO_TARGET, 'preview');
  });
}

function renderSetup() {
  state.dprGuardCleanup();
  state.active = false;
  state.lifecycle.setActive(false);
  state.phase = 'setup';
  document.body.classList.add('lab-mode');
  document.title = t('Prepare your display — Daltonia | Sense6');
  window.scrollTo({ top: 0, behavior: 'instant' });

  state.app.innerHTML = `
    <section class="setup-view ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">←</span> Back</button>
      <div class="setup-grid">
        <div class="setup-copy">
          <p class="ui-eyebrow">Viewing setup / 01 of 01</p>
          <h1>Colour filters off, please.</h1>
          <p class="setup-lede">
            The adaptive track only describes this browser, display, lighting, and viewing position.
            Colour-shifting features can move them substantially.
          </p>
          <div class="ui-alert ui-alert--info forced-colors-warning">
            <div class="ui-alert__body">
              <strong class="ui-alert__title">Colour override detected</strong>
              <p>Turn off forced-colours or high-contrast mode before this colour task.</p>
            </div>
          </div>
          <ol class="setup-list">
            <li><span>1</span><p>Turn off Night Shift, True Tone, blue-light filters, and vivid display modes.</p></li>
            <li><span>2</span><p>Use comfortable medium brightness in even room light, without glare.</p></li>
            <li><span>3</span><p>View the display straight on at a normal reading distance. Use “No gap visible” when the target disappears.</p></li>
          </ol>
        </div>

        <div class="setup-panel ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Display check</p>
              <h2>Ready to begin</h2>
            </div>
            <span class="ui-badge ui-badge--muted">${state.gamutChip.textContent}</span>
          </div>
          <div class="cb-swatch-row" aria-hidden="true">
            ${['#c94f4f', '#d98a3d', '#c9b83d', '#5aa54f', '#3f8fbf', '#7a5ac9']
              .map((color) => `<span style="background:${color}"></span>`)
              .join('')}
          </div>
          <p class="calibration-hint">These six swatches are a gross display check, not colour calibration.</p>
          <label class="ui-check ready-check">
            <input type="checkbox" id="cb-ready" />
            <span><strong class="experiment-boundary">I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.</strong> My colour filters are off and I understand this is an unvalidated browser experiment.</span>
          </label>
          <button class="ui-button ui-button--lg" id="cb-start" type="button" data-action="cb-begin" disabled>
            Start practice <span aria-hidden="true">→</span>
          </button>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Everything runs locally. No answer leaves the browser.</p>
        </div>
      </div>
    </section>
  `;
  updateSetupEligibility();
}

function startPractice() {
  state.lifecycle.setActive(true, t('Leave the experiment? Your progress will be lost.'));
  state.active = true;
  state.phase = 'practice';
  state.practiceIndex = 0;
  state.practiceFeedback = null;
  document.body.classList.add('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderPractice();
  announce('Practice one of two. Find the clear gap in the C.');
}

function renderPractice() {
  const trial = PRACTICE_TARGETS[state.practiceIndex];
  const correct = state.practiceFeedback?.correct === true;
  document.title = `Practice ${state.practiceIndex + 1} of ${PRACTICE_TARGETS.length} — Daltonia | Sense6`;

  state.app.innerHTML = `
    <section class="cb-view">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">×</span> End experiment</button>
        <p class="cb-topbar__label">Learn the C-gap task</p>
        <span class="trial-count"><b>0${state.practiceIndex + 1}</b> / 0${PRACTICE_TARGETS.length}</span>
      </div>

      <div class="cb-stage ui-container cb-stage--practice${correct ? ' is-answered' : ''}">
        <div class="cb-plate-wrap">
          <div class="cb-plate">
            <canvas data-target aria-label="Clear dotted practice target with a C-shaped gap"></canvas>
          </div>
        </div>

        <div class="cb-answer">
          <p class="ui-eyebrow">Practice with feedback</p>
          <h1 class="cb-prompt" tabindex="-1" data-trial-focus>Where is the clear gap?</h1>
          <p class="cb-trial-hint">Learn the shape here. The measured targets will later become faint.</p>
          ${correct ? '' : responseSetMarkup(true)}
          ${state.practiceFeedback ? practiceFeedbackMarkup(state.practiceFeedback) : ''}
          ${
            correct
              ? `<button class="ui-button ui-button--lg" type="button" data-action="cb-practice-next">${
                  state.practiceIndex === PRACTICE_TARGETS.length - 1
                    ? 'Begin measured run'
                    : 'Next practice target'
                } <span aria-hidden="true">→</span></button>`
              : ''
          }
        </div>
      </div>
    </section>
  `;

  scheduleStageFrame((mountState) => {
    const canvas = mountState.app.querySelector('[data-target]');
    if (canvas) drawTarget(canvas, trial, trial.id);
    const focusTarget = correct
      ? mountState.app.querySelector('[data-action="cb-practice-next"]')
      : mountState.app.querySelector('[data-trial-focus]');
    focusTarget?.focus({ preventScroll: true });
  });
}

function practiceFeedbackMarkup(feedback) {
  const tone = feedback.correct ? 'success' : 'warning';
  return `<div class="ui-alert ui-alert--${tone} cb-practice-feedback" role="status">
    <div class="ui-alert__body">
      <strong class="ui-alert__title">${feedback.correct ? 'That is the gap' : 'Try this target again'}</strong>
      <p>${feedback.message}</p>
    </div>
  </div>`;
}

function submitPracticeAnswer(answer) {
  if (state.practiceFeedback?.correct) return;
  const trial = PRACTICE_TARGETS[state.practiceIndex];
  const correct = answer === trial.orientation;
  state.practiceFeedback = {
    correct,
    message: correct
      ? `The gap is on the ${DIRECTION_LABELS[trial.orientation]}.`
      : `This clear practice gap is on the ${DIRECTION_LABELS[trial.orientation]}. Follow the open side of the coloured C.`,
  };
  renderPractice();
  announce(state.practiceFeedback.message);
}

function advancePractice() {
  state.practiceIndex += 1;
  state.practiceFeedback = null;
  if (state.practiceIndex >= PRACTICE_TARGETS.length) {
    beginAdaptiveRun();
    return;
  }
  renderPractice();
  announce(`Practice ${state.practiceIndex + 1} of ${PRACTICE_TARGETS.length}. Find the clear gap.`);
}

function beginAdaptiveRun() {
  if (forcedColorsActive()) {
    renderSetup();
    announce('Turn off forced-colours or high-contrast mode before this colour task.');
    return;
  }
  const entropy = adaptiveRunEntropy();
  state.run = createAdaptiveRun(seededRandom(`daltonia:${entropy}`));
  const practicePlate = state.app.querySelector('.cb-plate');
  const stimulusCssPixels = Math.max(1, Math.round(practicePlate?.getBoundingClientRect().width ?? 320));
  state.measurementEnvironment = captureMeasurementEnvironment(stimulusCssPixels);
  armDprGuard();
  state.active = true;
  trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.daltonia);
  state.phase = 'run';
  document.body.classList.add('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderTrial();
  announce('Trial one. Choose where the gap in the C points.');
}

function renderTrial() {
  if (!state.active || !state.run) return;
  const trial = currentAdaptiveTrial(state.run);
  if (!trial) {
    renderResults();
    return;
  }

  const total = state.run.schedule.length;
  const trialNumber = state.run.responses.length + 1;
  const progress = Math.round((state.run.index / total) * 100);
  state.responseOpen = false;
  state.renderToken += 1;
  const renderToken = state.renderToken;
  document.title = `Response ${trialNumber}, up to ${total} — Daltonia | Sense6`;

  state.app.innerHTML = `
    <section class="cb-view" data-measurement-active style="--cb-stimulus-size:${state.measurementEnvironment.stimulusCssPixels}px">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">×</span> End experiment</button>
        <p class="cb-topbar__label">Exploratory adaptive colour track</p>
        <span class="trial-count"><b>${String(trialNumber).padStart(2, '0')}</b> / ≤${String(total).padStart(2, '0')}</span>
      </div>

      <div class="ui-progress lab-progress" role="progressbar" aria-label="Experiment progress"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
        <div class="ui-progress__bar" style="--value:${progress}"></div>
      </div>

      <div class="cb-stage ui-container">
        <div class="cb-plate-wrap">
          <div class="cb-plate">
            <canvas data-target aria-label="Dotted colour target with a C-shaped gap"></canvas>
          </div>
        </div>

        <div class="cb-answer">
          <p class="ui-eyebrow">Adaptive response</p>
          <h1 class="cb-prompt" tabindex="-1" data-trial-focus>Where is the gap?</h1>
          <p class="cb-trial-hint">Some targets should disappear. Say so instead of guessing and that direction will become easier.</p>
          ${responseSetMarkup(false, true)}
          <p class="cb-key-hint">Keyboard: arrow keys · N for no gap</p>
        </div>
      </div>
    </section>
  `;

  scheduleStageFrame((mountState) => {
    if (mountState.renderToken !== renderToken || !mountState.active) return;
    const canvas = mountState.app.querySelector('[data-target]');
    if (canvas) drawTarget(canvas, trial, `run-${trial.id}`);
    // Open responses one frame after the stimulus is painted so an early key
    // press cannot be recorded against a target the person has not seen.
    scheduleStageFrame(() => {
      if (mountState.renderToken !== renderToken || !mountState.active) return;
      mountState.responseOpen = true;
      mountState.app.querySelectorAll('[data-orientation]').forEach((button) => {
        button.disabled = false;
      });
      mountState.app.querySelector('[data-trial-focus]')?.focus({ preventScroll: true });
    });
  });
}

function responseSetMarkup(practice, disabled = false) {
  const label = practice ? 'Choose the practice gap direction' : 'Choose the gap direction';
  return `<div class="cb-response-set" role="group" aria-label="${label}">
    <div class="cb-directions">
      ${directionButton('up', disabled)}
      ${directionButton('left', disabled)}
      <span class="cb-directions__center" aria-hidden="true">C</span>
      ${directionButton('right', disabled)}
      ${directionButton('down', disabled)}
    </div>
    <button class="ui-button ui-button--ghost cb-unseen" type="button" data-orientation="unseen" ${disabled ? 'disabled' : ''}>
      <span>No gap visible</span>
      <small>${practice ? 'Practice with feedback' : 'Adaptive response'}</small>
    </button>
  </div>`;
}

function directionButton(direction, disabled = false) {
  const label = DIRECTION_LABELS[direction];
  return `<button class="cb-direction cb-direction--${direction}" type="button" data-orientation="${direction}" aria-label="Gap at ${label}" ${disabled ? 'disabled' : ''}>
    <span aria-hidden="true">${DIRECTION_GLYPHS[direction]}</span><small>${label}</small>
  </button>`;
}

function submitOrientation(orientation) {
  if (!state.active) return;
  if (!['up', 'right', 'down', 'left', 'unseen'].includes(orientation)) return;
  if (state.phase === 'practice') {
    submitPracticeAnswer(orientation);
    return;
  }
  if (state.phase !== 'run' || !state.run) return;
  if (!state.responseOpen) return;
  state.responseOpen = false;
  state.app.querySelectorAll('[data-orientation]').forEach((button) => {
    button.disabled = true;
  });
  if (!recordAdaptiveAnswer(state.run, orientation)) return;
  if (state.run.index >= state.run.schedule.length) {
    renderResults();
    return;
  }
  renderTrial();
  announce(`Response ${state.run.responses.length + 1}. Choose a direction or no gap visible.`);
}

function renderResults() {
  state.active = false;
  state.lifecycle.setActive(false);
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.daltonia);
  state.phase = 'results';
  document.body.classList.add('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = t('Your display-relative adaptive levels — Daltonia | Sense6');
  const result = summarizeAdaptiveRun(state.run);
  state.dprGuardCleanup();

  const colorGuideLink = relatedGuideResultLink(
    'color-blindness',
    state.locale,
    'Understand what an online colour-vision result means',
  );
  state.app.innerHTML = `
    <section class="results-view ui-container ui-container--wide">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">Experimental run complete</p>
          <h1>${result.title}.</h1>
          <p>${result.detail}</p>
        </div>
        ${resultVerdict(result)}
      </div>

      <div class="cb-scorecards">
        ${result.axes.map(thresholdCard).join('')}
        ${controlCard(result)}
      </div>

      <div class="result-note ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">What this result cannot tell you</strong>
          <p>
            Daltonia has no clinical norms and has not been validated against an anomaloscope,
            CAD, Cambridge Colour Test, or a diagnosed cohort. These values cannot confirm or rule
            out a colour-vision deficiency. Compare repeat runs only on the same display and setup.
          </p>
          ${colorGuideLink ? `<p class="cb-result-note__learn">${colorGuideLink}</p>` : ''}
        </div>
      </div>

      <div data-cb-persistence></div>

      <div class="results-actions" data-cb-result-actions>
        <button class="ui-button ui-button--subtle" type="button" data-action="gallery">${m('nav.allTests')}</button>
      </div>
    </section>
  `;

  const lastResultSaved = saveLast(result);
  const journalOutcome = saveJournalResult(result);
  const storageOk = lastResultSaved && journalOutcome === 'saved';
  const persistence = state.app.querySelector('[data-cb-persistence]');
  if (storageOk) persistence?.remove();
  else if (persistence) {
    persistence.outerHTML = `<div class="cb-save-warning ui-alert ui-alert--warning" role="alert">
      <div class="ui-alert__body">
        <strong class="ui-alert__title">${t('This result was not saved')}</strong>
        <p>${
          journalOutcome === 'invalid'
            ? t(
                'This run did not match the journal record format, so it was not saved. Copy the summary to keep it.',
              )
            : t('Browser storage is unavailable. Copy the run summary before leaving this page.')
        }</p>
      </div>
    </div>`;
  }
  state.app
    .querySelector('[data-cb-result-actions]')
    ?.insertAdjacentHTML(
      'afterbegin',
      storageOk
        ? `<button class="ui-button ui-button--lg" type="button" data-action="cb-setup">${t('Repeat independently')}</button><button class="ui-button ui-button--ghost" type="button" data-action="cb-copy">${resultActionLabel(t, 'Copy run summary')}</button>`
        : `<button class="ui-button ui-button--lg" type="button" data-action="cb-copy">${resultActionLabel(t, 'Copy run summary')}</button><button class="ui-button ui-button--ghost" type="button" data-action="cb-setup">${t('Repeat independently')}</button>`,
    );

  document.querySelector('#main').focus({ preventScroll: true });
  announce(`Experiment complete. ${result.title}. ${result.detail}`);
}

function resultVerdict(result) {
  const label =
    result.controlStatus === 'passed'
      ? t('Controls passed')
      : result.controlStatus === 'caution'
        ? t('Control caution')
        : t('Controls not passed');
  const symbol = result.controlStatus === 'passed' ? '✓' : result.controlStatus === 'caution' ? '!' : '×';
  return `<div class="cb-verdict cb-verdict--${result.controlStatus}">
    <span class="cb-verdict__symbol" aria-hidden="true">${symbol}</span>
    <div>
      <strong>${label}</strong>
      <small>${result.controls.correct}/${result.controls.total} ${t('correct / scheduled')}</small>
    </div>
  </div>`;
}

function thresholdCard(axis) {
  const prefix = axis.limit === 'floor' ? '≤' : axis.limit === 'ceiling' ? '≥' : '';
  let note = `${axis.stability === 'settled' ? 'Staircase settled' : 'Limited reversals'} · ${axis.reversals} reversals`;
  if (axis.limit === 'floor') {
    note = `Track reached its minimum colour separation · ${axis.presentations} presentations`;
  } else if (axis.limit === 'ceiling') {
    note = `Track reached its maximum colour separation · ${axis.presentations} presentations`;
  }
  const spread = axis.limit
    ? `<p class="cb-threshold-card__spread"><span>${axis.limit === 'floor' ? 'upper bound on required separation (≤)' : 'lower bound on required separation (≥)'}</span></p>`
    : `<p class="cb-threshold-card__spread">${formatNumber(axis.spread, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span>adaptive-track spread, not uncertainty</span></p>`;
  return `<article class="cb-scorecard cb-threshold-card">
    <div class="cb-scorecard__head">
      <div><h2>${axis.label}</h2><p>${axis.description}</p></div>
      <div class="cb-scorecard__value">
        <span>Ending adaptive level</span>
        <strong>${prefix}${formatNumber(axis.threshold, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>
    </div>
    ${spread}
    <p class="cb-scorecard__note">${note}</p>
  </article>`;
}

function controlCard(result) {
  const evidence = t('{correct} of {total} scheduled high-contrast gap controls were answered correctly.', {
    correct: result.controls.correct,
    total: result.controls.total,
  });
  return `<article class="cb-scorecard cb-scorecard--control">
    <div class="cb-scorecard__head">
      <div><h2>Task controls</h2><p>High-contrast gap trials</p></div>
      <div class="cb-scorecard__value">
        <span>${t('Correct / scheduled')}</span>
        <strong>${result.controls.correct}/${result.controls.total}</strong>
      </div>
    </div>
    <p class="cb-scorecard__note">${
      result.controlStatus === 'passed'
        ? `${evidence} ${t('Enough controls were read to report this run.')}`
        : result.controlStatus === 'caution'
          ? `${evidence} ${t('Keep these observations only with a control caution.')}`
          : `${evidence} ${t('Too many controls were missed; repeat before interpreting thresholds.')}`
    }</p>
  </article>`;
}

/*
 * Draw a Landolt-C-like target from luminance-jittered dots. Target orientation
 * is randomized by the run, while target/field chromatic separation comes from
 * the current independent staircase.
 */
function drawTarget(canvas, trial, seed) {
  const bounds = canvas.getBoundingClientRect();
  const cssSize = Math.max(1, Math.min(bounds.width || 320, bounds.height || bounds.width || 320));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(cssSize * ratio);
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, pixels, pixels);

  const pair = makeTargetPair(trial.background, trial.type, trial.strength);
  const random = seededRandom(`${trial.id ?? trial.type}:${seed}`);
  const center = pixels / 2;
  const radius = pixels / 2 - pixels * 0.01;
  const spacing = pixels * 0.03;
  const dotBase = spacing * 0.52;
  const rows = Math.ceil(pixels / (spacing * 0.87)) + 1;
  const cols = Math.ceil(pixels / spacing) + 1;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * spacing + (row % 2) * spacing * 0.5 + (random() - 0.5) * spacing * 0.5;
      const y = row * spacing * 0.87 + (random() - 0.5) * spacing * 0.5;
      if (Math.hypot(x - center, y - center) > radius - dotBase) continue;

      const dotRadius = dotBase * (0.55 + random() * 0.5);
      const isTarget = samplesLandoltC(x, y, pixels, trial.orientation);
      const baseLinear = isTarget ? pair.targetLinear : pair.fieldLinear;
      context.fillStyle = rgbCss(jitterDotColor(baseLinear, random));
      context.beginPath();
      context.arc(x, y, dotRadius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function samplesLandoltC(x, y, size, orientation) {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const distance = Math.hypot(dx, dy);
  const insideRing = distance >= size * 0.17 && distance <= size * 0.3;
  if (!insideRing) return false;

  const gapAngles = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };
  const angle = Math.atan2(dy, dx);
  const delta = Math.atan2(
    Math.sin(angle - gapAngles[orientation]),
    Math.cos(angle - gapAngles[orientation]),
  );
  return Math.abs(delta) > 0.36;
}

/**
 * Re-announce through the shell-global live region. The region outlives this
 * mount, so a frame that survives disposal would overwrite whatever the next
 * route already announced.
 */
function announce(message) {
  const mountState = state;
  const mountedAnnouncer = mountState.announcer;
  cancelAnimationFrame(mountState.announcementFrame);
  mountedAnnouncer.textContent = '';
  mountState.announcementFrame = requestAnimationFrame(() => {
    mountState.announcementFrame = 0;
    if (!isCurrentMount(state, mountState)) return;
    mountedAnnouncer.textContent = t(message);
  });
}

async function copyResults() {
  const result = summarizeAdaptiveRun(state.run);
  const levels = result.axes
    .map((axis) => {
      const prefix = axis.limit === 'floor' ? '≤' : axis.limit === 'ceiling' ? '≥' : '';
      const spread = axis.limit
        ? ''
        : ` (track spread ${formatNumber(axis.spread, { maximumFractionDigits: 2 })})`;
      return `${t(axis.label)} ${prefix}${formatNumber(axis.threshold, { maximumFractionDigits: 2 })}${spread}`;
    })
    .join(', ');
  const summary = `Daltonia exploratory browser run — ending adaptive levels: ${levels}; task controls ${result.controls.correct}/${result.controls.total}. Display-relative HPE/sRGB coordinates, unvalidated, not cone thresholds, and not diagnostic.`;
  try {
    const outcome = await shareOrCopyResult({
      title: t('Experimental colour-vision check — Daltonia | Sense6'),
      summary,
      route: 'color-blindness',
      locale: state.locale,
    });
    if (outcome === 'copied') toast(t('Run summary copied'), { tone: 'success' });
  } catch {
    toast(t('Could not access the clipboard'), { tone: 'danger' });
  }
}

function loadLast() {
  return RESULT_STORE.load();
}

function saveLast(result) {
  return RESULT_STORE.save({
    schemaVersion: 3,
    levels: result.axes.map(({ type, threshold, spread }) => ({ type, level: threshold, spread })),
    controlOk: result.controlOk,
    savedAt: new Date().toISOString(),
  });
}

/** @returns {import('../lib/journal.js').JournalSaveOutcome} */
function saveJournalResult(result) {
  const measurement = state.measurementEnvironment;
  return saveJournalRun({
    examId: 'color-blindness',
    locale: state.locale,
    quality: result.controlOk ? 'usable' : result.controlStatus === 'caution' ? 'caution' : 'limited',
    protocol: protocolPassport('color-blindness'),
    setup: {
      ...captureDisplayPassport(),
      theme: measurement?.theme ?? currentTheme(),
      stimulusCssPixels: measurement?.stimulusCssPixels ?? null,
      measurementViewport: measurement ? `${measurement.viewportWidth}x${measurement.viewportHeight}` : null,
      measurementDpr: measurement?.dpr ?? window.devicePixelRatio ?? 1,
      orientation: measurement?.orientation ?? currentOrientation(),
    },
    qualityEvidence: {
      controlsCorrect: result.controls.correct,
      controlsScheduled: result.controls.total,
      controlStatus: result.controlStatus,
      responseCount: state.run?.responses.length ?? 0,
      protanPresentations: result.axes.find(({ type }) => type === 'protan')?.presentations ?? 0,
      deutanPresentations: result.axes.find(({ type }) => type === 'deutan')?.presentations ?? 0,
      tritanPresentations: result.axes.find(({ type }) => type === 'tritan')?.presentations ?? 0,
      protanReversals: result.axes.find(({ type }) => type === 'protan')?.reversals ?? 0,
      deutanReversals: result.axes.find(({ type }) => type === 'deutan')?.reversals ?? 0,
      tritanReversals: result.axes.find(({ type }) => type === 'tritan')?.reversals ?? 0,
      protanLimit: result.axes.find(({ type }) => type === 'protan')?.limit ?? 'none',
      deutanLimit: result.axes.find(({ type }) => type === 'deutan')?.limit ?? 'none',
      tritanLimit: result.axes.find(({ type }) => type === 'tritan')?.limit ?? 'none',
    },
    measurements: result.axes.map((axis) => ({
      id: axis.type,
      value: axis.threshold,
      unit: 'relative',
      ...(axis.limit ? { bound: axis.limit === 'floor' ? 'upper' : 'lower' } : {}),
    })),
    notes:
      result.controlStatus === 'passed'
        ? ['exploratory-display-direction-levels']
        : result.controlStatus === 'caution'
          ? ['exploratory-display-direction-levels', 'one-task-control-missed']
          : ['task-controls-limited'],
  });
}

function adaptiveRunEntropy() {
  const testSeed =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSE6_TEST_CONFIG__?.daltonia?.seed
      : null;
  return typeof testSeed === 'string' && testSeed
    ? testSeed
    : (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${performance.now()}`);
}

function currentTheme() {
  return (
    document.documentElement.dataset.theme ??
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

function currentOrientation() {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const aspect = viewportWidth > viewportHeight ? 'landscape' : 'portrait';
  const angle = screen.orientation?.angle;
  return Number.isFinite(angle) ? `${aspect}-${angle}` : aspect;
}

function captureMeasurementEnvironment(stimulusCssPixels) {
  const viewport = window.visualViewport;
  return {
    theme: currentTheme(),
    forcedColors: forcedColorsActive(),
    dpr: window.devicePixelRatio || 1,
    orientation: currentOrientation(),
    viewportWidth: Math.round((viewport?.width ?? window.innerWidth) * 100) / 100,
    viewportHeight: Math.round((viewport?.height ?? window.innerHeight) * 100) / 100,
    stimulusCssPixels,
  };
}

function armDprGuard() {
  state.dprGuardCleanup();
  const query = window.matchMedia?.(`(resolution: ${state.measurementEnvironment.dpr}dppx)`);
  if (!query) return;
  const validate = () => validateMeasurementEnvironment();
  query.addEventListener('change', validate);
  state.dprGuardCleanup = () => {
    query.removeEventListener('change', validate);
    state.dprGuardCleanup = () => {};
  };
}

function validateMeasurementEnvironment() {
  if (!state.active || state.phase !== 'run' || !state.measurementEnvironment) return;
  const current = captureMeasurementEnvironment(state.measurementEnvironment.stimulusCssPixels);
  const change = displayEnvironmentChange(state.measurementEnvironment, current);
  if (change) invalidateMeasurement(change);
}

function invalidateMeasurement(reason) {
  if (!state.active || state.phase !== 'run') return;
  state.active = false;
  state.responseOpen = false;
  state.renderToken += 1;
  state.lifecycle.setActive(false);
  state.phase = 'invalidated';
  state.run = null;
  state.dprGuardCleanup();
  document.title = t('Prepare your display — Daltonia | Sense6');
  state.app.innerHTML = `<section class="setup-view ui-container ui-container--wide cb-invalidated" data-invalidated-by="${reason}">
    <div class="ui-alert ui-alert--warning" role="alert" tabindex="-1">
      <div class="ui-alert__body">
        <strong class="ui-alert__title">Display conditions changed</strong>
        <p>This measured run stopped before a result. Nothing was saved. Return to setup and keep the theme, window, orientation, and display scale unchanged.</p>
      </div>
    </div>
    <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">Return to display setup</button>
  </section>`;
  state.app.querySelector('[role="alert"]')?.focus?.({ preventScroll: true });
  announce('Display conditions changed. This measured run stopped and was not saved.');
}

function updateSetupEligibility() {
  const ready = state.app.querySelector('#cb-ready');
  const start = state.app.querySelector('#cb-start');
  if (!ready || !start) return;
  const blocked = forcedColorsActive();
  start.disabled = !ready.checked || blocked;
  const warning = state.app.querySelector('.forced-colors-warning');
  warning?.setAttribute('aria-hidden', String(!blocked));
}

function wireEvents(signal) {
  document.addEventListener(
    'change',
    (event) => {
      if (event.target.matches('#cb-ready')) {
        updateSetupEligibility();
      }
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      const orientation = event.target.closest('[data-orientation]');
      if (orientation) {
        submitOrientation(orientation.dataset.orientation);
        return;
      }

      const action = event.target.closest('[data-action]');
      if (!action) return;
      const name = action.dataset.action;

      if (name === 'cb-how') {
        event.preventDefault();
        state.app.querySelector('#cb-how')?.scrollIntoView({ behavior: 'smooth' });
      }
      if (name === 'cb-setup' || name === 'cb-setup-closing') renderSetup();
      if (name === 'cb-home') {
        if (state.active && !window.confirm(t('End this experiment? Your progress will be lost.'))) return;
        renderIntro();
      }
      if (name === 'cb-begin' && !action.disabled) startPractice();
      if (name === 'cb-practice-next') advancePractice();
      if (name === 'cb-copy') copyResults();
      if (name === 'gallery') {
        if (state.active && !window.confirm(t('Leave the experiment? Your progress will be lost.'))) return;
        state.goHome();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!state.active || event.repeat || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.cb-stage') || target.closest(EDITABLE_CONTROL_SELECTOR)) return;
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        submitOrientation('unseen');
        return;
      }
      const direction = {
        ArrowUp: 'up',
        ArrowRight: 'right',
        ArrowDown: 'down',
        ArrowLeft: 'left',
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      submitOrientation(direction);
    },
    { signal },
  );

  const validateEnvironment = () => validateMeasurementEnvironment();
  window.addEventListener('resize', validateEnvironment, { signal });
  window.addEventListener('orientationchange', validateEnvironment, { signal });
  window.visualViewport?.addEventListener('resize', validateEnvironment, { signal });
  document.documentElement.addEventListener('bronto:themechange', validateEnvironment, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden' && state.active && state.phase === 'run') {
        invalidateMeasurement('visibility');
      }
    },
    { signal },
  );
  watchForcedColors(() => {
    updateSetupEligibility();
    validateMeasurementEnvironment();
  }, signal);
}
