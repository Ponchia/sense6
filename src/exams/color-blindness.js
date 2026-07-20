import { toast } from '@ponchia/ui/behaviors';
import '../styles/color-blindness.css';
import { formatNumber, t } from '../i18n.js';
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
import { appendJournalEntry, captureDisplayPassport, createJournalEntry } from '../lib/journal.js';
import { createExamLifecycle } from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';

const RESULT_STORE = createResultStore({
  key: 'sense6:daltonia:last',
  legacyKeys: ['daltonia-last'],
  validate: (value) => isRecord(value) && value.schemaVersion === 2 && Array.isArray(value.thresholds),
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
  const lifecycle = createExamLifecycle(MOUNT_OWNER, { bodyClasses: ['lab-mode'] });
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
  };
  state = mountState;
  wireEvents(lifecycle.signal);
  renderIntro();

  lifecycle.onCleanup(() => {
    mountState.dprGuardCleanup();
    mountState.active = false;
    mountState.phase = 'intro';
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  state.dprGuardCleanup();
  state.active = false;
  state.lifecycle.setActive(false);
  state.phase = 'intro';
  document.body.classList.remove('lab-mode');
  document.title = t('Experimental colour-vision check — Daltonia | Sense6');

  const previous = loadLast();

  state.app.innerHTML = `
    <div class="cb-intro">
      <section class="cb-intro__hero ui-container ui-container--wide">
        <button class="back-link exam-back" type="button" data-action="gallery">
          <span aria-hidden="true">←</span> All tests
        </button>
        <div class="cb-hero">
        <div class="cb-hero__copy">
          <p class="ui-eyebrow">Colour vision / adaptive experiment / about 3 minutes</p>
          <h1>Find the gap <em>in the dots</em>.</h1>
          <p class="cb-lede">
            A C-shaped target becomes harder to separate from its field. Three independent
            staircases estimate the smallest colour shift you follow in each display-relative
            direction during this run.
          </p>
          <div class="ui-cluster cb-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">
              Start the experiment <span aria-hidden="true">→</span>
            </button>
            <a class="ui-link ui-link--cta" href="#cb-how" data-action="cb-how">How it works</a>
          </div>
          <p class="hero__limit">
            <span aria-hidden="true">◇</span>
            Experimental and unvalidated. This is not a screening result or diagnosis.
          </p>
          ${
            previous
              ? '<p class="previous-score">Last run on this browser: <strong>display-relative thresholds recorded</strong></p>'
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
              <p class="ui-eyebrow">Method and limits</p>
              <h2>An adaptive task, not a plate score.</h2>
            </div>
            <p>The design borrows established psychophysical techniques without claiming their clinical validation.</p>
          </div>
          <div class="cb-axis-display" aria-hidden="true">
            <div class="cb-axis-display__card cb-axis-display__card--l"><span>L</span><i></i><i></i><i></i></div>
            <div class="cb-axis-display__card cb-axis-display__card--m"><span>M</span><i></i><i></i><i></i></div>
            <div class="cb-axis-display__card cb-axis-display__card--s"><span>S</span><i></i><i></i><i></i></div>
          </div>
          <ol class="method-steps cb-steps">
            <li><span>1</span><div><strong>Practice first</strong><p>Two clear targets teach the C-gap interaction with immediate feedback before any threshold is measured.</p></div></li>
            <li><span>2</span><div><strong>Luminance noise</strong><p>Target and field dots share the same brightness variation, reducing a consistent lightness cue.</p></div></li>
            <li><span>3</span><div><strong>Three staircases</strong><p>Directions become harder after correct responses. “No gap visible” counts as a miss and makes that direction easier.</p></div></li>
            <li><span>4</span><div><strong>Run-relative output</strong><p>You receive thresholds and run spread, not a normal/deficient label or a clinical score.</p></div></li>
          </ol>
        </div>
      </section>

      <section class="cb-research section ui-container ui-container--wide" aria-labelledby="cb-research-title">
        <div class="section-heading">
          <div>
            <p class="ui-eyebrow">Research trail</p>
            <h2 id="cb-research-title">What informed Daltonia.</h2>
          </div>
          <p>These sources inform the stimulus model and task design. They do not validate this implementation.</p>
        </div>
        <div class="ui-grid cb-research__grid">
          ${researchCard(
            'Adaptive colour thresholds',
            'Regan, Reffin & Mollon, 1994',
            'Random Landolt-C orientation, spatial and luminance noise, and interleaved confusion-line staircases.',
            'https://doi.org/10.1016/0042-6989(94)90203-8',
          )}
          ${researchCard(
            'Cone-contrast testing',
            'Rabin, Gooch & Ivan, 2011',
            'Randomized cone-specific optotypes and validation against anomaloscope and plate results.',
            'https://doi.org/10.1167/iovs.10-6283',
          )}
          ${researchCard(
            'Modern screener validation',
            'Evans et al., 2025',
            'A multicentre comparison on calibrated displays demonstrates the evidence required for screening claims.',
            'https://doi.org/10.1364/JOSAA.544985',
          )}
        </div>
      </section>

      <section class="closing-cta cb-closing ui-container ui-container--wide">
        <div>
          <p class="ui-eyebrow">Colour vision / adaptive experiment / about 3 minutes</p>
          <h2>Adaptive browser colour-vision experiment</h2>
        </div>
        <button class="ui-button ui-button--lg" type="button" data-action="cb-setup-closing">
          Open test <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  `;

  requestAnimationFrame(() => {
    const canvas = state.app.querySelector('[data-preview-target]');
    if (canvas) drawTarget(canvas, DEMO_TARGET, 'preview');
  });
}

function researchCard(eyebrow, title, body, href) {
  return `<article class="ui-card cb-research__card">
    <p class="ui-eyebrow ui-eyebrow--muted">${eyebrow}</p>
    <h3>${title}</h3>
    <p>${body}</p>
    <a class="ui-link" href="${href}" target="_blank" rel="noreferrer">Read the primary source <span aria-hidden="true">↗</span></a>
  </article>`;
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
            The thresholds only describe this browser, display, lighting, and viewing position.
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
            <span><strong class="experiment-boundary">I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.</strong>My colour filters are off and I understand this is an unvalidated browser experiment.</span>
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

  requestAnimationFrame(() => {
    const canvas = state.app.querySelector('[data-target]');
    if (canvas) drawTarget(canvas, trial, trial.id);
    const focusTarget = correct
      ? state.app.querySelector('[data-action="cb-practice-next"]')
      : state.app.querySelector('[data-trial-focus]');
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
  const entropy = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${performance.now()}`;
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
  document.title = `Response ${trialNumber}, up to ${total} — Daltonia | Sense6`;

  state.app.innerHTML = `
    <section class="cb-view" data-measurement-active style="--cb-stimulus-size:${state.measurementEnvironment.stimulusCssPixels}px">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">×</span> End experiment</button>
        <p class="cb-topbar__label">Adaptive colour threshold</p>
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
          ${responseSetMarkup(false)}
          <p class="cb-key-hint">Keyboard: arrow keys · N for no gap</p>
        </div>
      </div>
    </section>
  `;

  requestAnimationFrame(() => {
    const canvas = state.app.querySelector('[data-target]');
    if (canvas) drawTarget(canvas, trial, `run-${trial.id}`);
    state.app.querySelector('[data-trial-focus]')?.focus({ preventScroll: true });
  });
}

function responseSetMarkup(practice) {
  const label = practice ? 'Choose the practice gap direction' : 'Choose the gap direction';
  return `<div class="cb-response-set" role="group" aria-label="${label}">
    <div class="cb-directions">
      ${directionButton('up')}
      ${directionButton('left')}
      <span class="cb-directions__center" aria-hidden="true">C</span>
      ${directionButton('right')}
      ${directionButton('down')}
    </div>
    <button class="ui-button ui-button--ghost cb-unseen" type="button" data-orientation="unseen">
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
  if (state.phase === 'practice') {
    submitPracticeAnswer(orientation);
    return;
  }
  if (state.phase !== 'run' || !state.run) return;
  recordAdaptiveAnswer(state.run, orientation);
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
  document.title = t('Your display-relative thresholds — Daltonia | Sense6');
  const result = summarizeAdaptiveRun(state.run);
  const lastResultSaved = saveLast(result);
  const journalSaved = saveJournalResult(result);
  const storageOk = lastResultSaved && journalSaved;
  state.dprGuardCleanup();

  state.app.innerHTML = `
    <section class="results-view ui-container ui-container--wide">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">Experimental run complete</p>
          <h1>${result.title}.</h1>
          <p>${result.detail}</p>
        </div>
        <div class="cb-verdict cb-verdict--${result.controlOk ? 'threshold' : 'inconclusive'}" aria-hidden="true">
          <span>${result.controlOk ? '≈' : '?'}</span>
        </div>
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
        </div>
      </div>

      ${
        storageOk
          ? ''
          : `<div class="cb-save-warning ui-alert ui-alert--warning" role="alert">
              <div class="ui-alert__body">
                <strong class="ui-alert__title">This result was not saved</strong>
                <p>Browser storage is unavailable. Copy the run summary before leaving this page.</p>
              </div>
            </div>`
      }

      <div class="results-actions">
        ${
          storageOk
            ? '<button class="ui-button ui-button--lg" type="button" data-action="cb-setup">Run again</button><button class="ui-button ui-button--ghost" type="button" data-action="cb-copy">Copy run summary</button>'
            : '<button class="ui-button ui-button--lg" type="button" data-action="cb-copy">Copy run summary</button><button class="ui-button ui-button--ghost" type="button" data-action="cb-setup">Run again</button>'
        }
        <button class="ui-button ui-button--subtle" type="button" data-action="gallery">All tests</button>
      </div>
    </section>
  `;

  document.querySelector('#main').focus({ preventScroll: true });
  announce(`Experiment complete. ${result.title}. ${result.detail}`);
}

function thresholdCard(axis) {
  const prefix = axis.limit === 'floor' ? '≤' : axis.limit === 'ceiling' ? '≥' : '';
  let note = `${axis.stability === 'settled' ? 'Staircase settled' : 'Limited reversals'} · ${axis.reversals} reversals`;
  if (axis.limit === 'floor') {
    note = `Experiment floor confirmed · ${axis.presentations} presentations`;
  } else if (axis.limit === 'ceiling') {
    note = `Experiment maximum reached · ${axis.presentations} presentations`;
  }
  const spread = axis.limit
    ? `<p class="cb-threshold-card__spread"><span>${axis.limit === 'floor' ? 'lower' : 'upper'} measurement bound</span></p>`
    : `<p class="cb-threshold-card__spread">±${formatNumber(axis.spread, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span>run spread</span></p>`;
  return `<article class="cb-scorecard cb-threshold-card">
    <div class="cb-scorecard__head">
      <div><h2>${axis.label}</h2><p>${axis.description}</p></div>
      <strong>${prefix}${formatNumber(axis.threshold, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</strong>
    </div>
    ${spread}
    <p class="cb-scorecard__note">${note}</p>
  </article>`;
}

function controlCard(result) {
  return `<article class="cb-scorecard cb-scorecard--control">
    <div class="cb-scorecard__head">
      <div><h2>Task controls</h2><p>High-contrast gap trials</p></div>
      <strong>${result.controls.correct}/${result.controls.total}</strong>
    </div>
    <p class="cb-scorecard__note">${
      result.controlOk
        ? 'Enough controls were read to report this run.'
        : 'Too many controls were missed; repeat before interpreting thresholds.'
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

function announce(message) {
  const mountedAnnouncer = state.announcer;
  mountedAnnouncer.textContent = '';
  requestAnimationFrame(() => {
    mountedAnnouncer.textContent = t(message);
  });
}

async function copyResults() {
  const result = summarizeAdaptiveRun(state.run);
  const thresholds = result.axes
    .map((axis) => {
      const prefix = axis.limit === 'floor' ? '≤' : axis.limit === 'ceiling' ? '≥' : '';
      const spread = axis.limit
        ? ''
        : ` ±${formatNumber(axis.spread, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
      return `${t(axis.label)} ${prefix}${formatNumber(axis.threshold, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}${spread}`;
    })
    .join(', ');
  const summary = t(
    'Daltonia experimental browser run — {thresholds}; task controls {correct}/{total}. Display-relative, unvalidated, and not diagnostic.',
    {
      thresholds,
      correct: result.controls.correct,
      total: result.controls.total,
    },
  );
  try {
    await navigator.clipboard.writeText(summary);
    toast(t('Run summary copied'), { tone: 'success' });
  } catch {
    toast(t('Could not access the clipboard'), { tone: 'danger' });
  }
}

function loadLast() {
  return RESULT_STORE.load();
}

function saveLast(result) {
  return RESULT_STORE.save({
    schemaVersion: 2,
    thresholds: result.axes.map(({ type, threshold, spread }) => ({ type, threshold, spread })),
    controlOk: result.controlOk,
    savedAt: new Date().toISOString(),
  });
}

function saveJournalResult(result) {
  const measurement = state.measurementEnvironment;
  const entry = createJournalEntry({
    examId: 'color-blindness',
    locale: state.locale,
    quality: result.controlOk ? 'usable' : 'limited',
    setup: {
      ...captureDisplayPassport(),
      theme: measurement?.theme ?? currentTheme(),
      stimulusCssPixels: measurement?.stimulusCssPixels ?? null,
      measurementViewport: measurement ? `${measurement.viewportWidth}x${measurement.viewportHeight}` : null,
      measurementDpr: measurement?.dpr ?? window.devicePixelRatio ?? 1,
      orientation: measurement?.orientation ?? currentOrientation(),
    },
    measurements: result.axes.map((axis) => ({
      id: axis.type,
      value: axis.threshold,
      unit: 'relative',
      ...(axis.limit ? { bound: axis.limit === 'floor' ? 'upper' : 'lower' } : { uncertainty: axis.spread }),
    })),
    notes: result.controlOk ? [] : ['task-controls-limited'],
  });
  return entry ? appendJournalEntry(entry) : false;
}

function forcedColorsActive() {
  return window.matchMedia?.('(forced-colors: active)').matches === true;
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
  const forcedColors = window.matchMedia?.('(forced-colors: active)');
  forcedColors?.addEventListener(
    'change',
    () => {
      updateSetupEligibility();
      validateMeasurementEnvironment();
    },
    { signal },
  );
}
