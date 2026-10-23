import { toast } from '@ponchia/ui/behaviors';
import '../styles/riflessi-landing.css';
import '../styles/riflessi.css';
import '../styles/riflessi-compact-landing.css';
import { m, t } from '../i18n.js';
import { captureDisplayPassport, saveJournalRun } from '../lib/journal.js';
import { createExamLifecycle, isCurrentMount } from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import {
  createChoiceSchedule,
  createSignalSchedule,
  mergeReflexConfig,
  randomWait,
  summarizeRiflessi,
} from '../lib/reflexes.js';
import { resultActionLabel, shareOrCopyResult } from '../lib/result-sharing.js';
import { createResultStore } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';
import { protocolPassport } from './protocols.js';
import { isRiflessiLatestResult } from './results/riflessi.js';
import { RIFLESSI_INSTRUMENTS, riflessiIntroMarkup } from './views/riflessi-intro.js';
import {
  riflessiPersistenceStatus,
  riflessiResultActions,
  riflessiResultSummary,
  riflessiResultsMarkup,
} from './views/riflessi-results.js';
import { applyScopeSelection, scopeOptionMarkup } from './views/scope-picker.js';

const STORAGE_KEY = 'sense6:riflessi:last';
const RESULT_STORE = createResultStore({ key: STORAGE_KEY, validate: isRiflessiLatestResult });
const MOUNT_OWNER = Symbol('riflessi');
// A press only counts while the trial itself is in one of these phases. The
// `rx-running` body class is presentation and must never gate measurement.
const RESPONSE_PHASES = new Set(['waiting', 'catch', 'live']);
const RUNNER_PHASES = new Set(['waiting', 'catch', 'live', 'feedback']);

let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, { bodyClasses: ['lab-mode', 'rx-running'] });
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    goHome: context.navigateHome,
    lifecycle,
    locale: context.locale,
    session: null,
    config: runtimeConfig(),
    selectedMode: window.matchMedia?.('(pointer: coarse)').matches ? 'pointer' : 'keyboard',
    // A homepage deep link can preselect the existing short scope. The setup
    // and explicit consent gate remain mandatory; no trial starts on arrival.
    selectedScope:
      new URLSearchParams(window.location.search).get('scope') === 'signal' ? 'signal' : 'complete',
    timeoutId: 0,
    deadlineId: 0,
    clockId: 0,
    frameId: 0,
    cadenceFrameId: 0,
    activeTrial: null,
    trialState: 'idle',
    onsetAt: 0,
    expectedOnsetAt: 0,
  };
  state = mountState;
  wireEvents(lifecycle.signal);
  if (mountState.selectedScope === 'signal') renderSetup();
  else renderIntro();

  lifecycle.onCleanup(() => {
    stopClocks();
    mountState.session = null;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  stopClocks();
  state.session = null;
  state.lifecycle.setActive(false);
  document.body.classList.remove('lab-mode', 'rx-running');
  document.title = t('Response speed and consistency — Riflessi | Sense6');
  const previous = loadLast();

  state.app.innerHTML = riflessiIntroMarkup(previous, m, state.locale);
  resetScreen();
}

function renderSetup() {
  state.lifecycle.setActive(false);
  stopClocks();
  state.session = null;
  state.activeTrial = null;
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = t('Prepare your response setup — Riflessi | Sense6');
  window.scrollTo({ top: 0, behavior: 'instant' });

  state.app.innerHTML = `
    <section class="rx-setup ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="rx-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="rx-setup__grid">
        <div class="rx-setup__copy">
          <p class="ui-eyebrow">Input setup / before timing starts</p>
          <h1 tabindex="-1" data-rx-screen-title>Choose one response path.</h1>
          <p class="rx-lede">Use the same device and input mode when comparing runs. Keep this tab visible and silence interruptions.</p>
          <fieldset class="rx-mode-picker">
            <legend>How will you respond?</legend>
            <button class="rx-mode ${state.selectedMode === 'keyboard' ? 'is-selected' : ''}" type="button" data-action="rx-mode" data-mode="keyboard" aria-pressed="${state.selectedMode === 'keyboard'}">
              <span class="rx-mode__key" aria-hidden="true">space</span><strong>Keyboard</strong><small>Space, then ← / →</small>
            </button>
            <button class="rx-mode ${state.selectedMode === 'pointer' ? 'is-selected' : ''}" type="button" data-action="rx-mode" data-mode="pointer" aria-pressed="${state.selectedMode === 'pointer'}">
              <span class="rx-mode__tap" aria-hidden="true">●</span><strong>Touch / pointer</strong><small>Tap the chamber or side</small>
            </button>
          </fieldset>
          <fieldset class="rx-mode-picker" data-rx-scope-picker>
            <legend>${t('How much do you want to run?')}</legend>
            ${scopeButton('signal', 'Segnale', t('about 2 minutes'))}
            ${scopeButton('signal-choice', 'Segnale + Scelta', t('about 4 minutes'))}
            ${scopeButton('complete', 'Complete set', t('about 7 minutes'))}
          </fieldset>
          <label class="rx-setup-field">${t('Physical setup')}
            <select data-rx-position>
              <option value="seated-stable">${t('Seated · device on a stable surface')}</option>
              <option value="handheld-or-standing">${t('Handheld or standing')}</option>
            </select>
          </label>
          <label class="rx-consent">
            <input type="checkbox" data-rx-consent>
            <span><strong class="experiment-boundary">I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.</strong> I understand this measures this browser, device, input, and moment—not a clinical trait.</span>
          </label>
          <button class="ui-button ui-button--lg" type="button" data-action="rx-start" disabled>
            ${t('Begin selected scope')} <span aria-hidden="true">→</span>
          </button>
        </div>
        <aside class="rx-calibration" aria-label="Timing readiness">
          <p class="ui-eyebrow">Frame cadence check</p>
          <div class="rx-calibration__pulse" aria-hidden="true"><i></i><i></i><i></i></div>
          <strong data-rx-cadence>Measuring…</strong>
          <p data-rx-cadence-note>Sampling animation frames without changing your measured responses.</p>
          <dl>
            <div><dt>Display correction</dt><dd>None</dd></div>
            <div><dt>Timing clock</dt><dd>Monotonic</dd></div>
            <div><dt>Privacy</dt><dd>Answers stay local</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  `;

  resetScreen();
  measureFrameCadence();
}

function selectMode(mode) {
  state.selectedMode = mode;
  for (const button of state.app.querySelectorAll('[data-action="rx-mode"]')) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

/** @param {'signal' | 'signal-choice' | 'complete'} id @param {string} label @param {string} duration */
function scopeButton(id, label, duration) {
  return scopeOptionMarkup({
    action: 'rx-scope',
    className: 'rx-mode',
    id,
    selected: state.selectedScope === id,
    label,
    detail: duration,
  });
}

/** @param {'signal' | 'signal-choice' | 'complete'} scope */
function selectScope(scope) {
  state.selectedScope = scope;
  applyScopeSelection(state.app, 'rx-scope', scope);
}

function startSession() {
  const consent = state.app.querySelector('[data-rx-consent]');
  if (!consent?.checked) {
    toast(t('Please acknowledge the device-relative limit before starting.'));
    consent?.focus();
    return;
  }

  const seed = `${Date.now()}-${Math.random()}`;
  state.session = {
    inputMode: state.selectedMode,
    physicalSetup: state.app.querySelector('[data-rx-position]')?.value ?? 'unrecorded',
    scope: state.selectedScope,
    instrument: 'signal',
    block: null,
    queue: [],
    index: 0,
    records: { signal: [], choice: [], stability: [] },
    random: seededRandom(seed),
    diagnostics: {
      frameMedianMs: Number(state.app.querySelector('[data-rx-cadence]')?.dataset.frameMs) || null,
      droppedFrames: Number(state.app.querySelector('[data-rx-cadence]')?.dataset.dropped) || 0,
      lateOnsets: 0,
      onsets: 0,
      interruptions: 0,
    },
    stabilityEndsAt: 0,
    pauseStartedAt: 0,
  };
  renderInstrumentBrief('signal');
}

function renderInstrumentBrief(instrument) {
  state.lifecycle.setActive(true, t('Leave this run? Your progress will be lost.'));
  stopClocks();
  state.session.instrument = instrument;
  state.session.block = null;
  const info = RIFLESSI_INSTRUMENTS[instrument];
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = `${t(info.name)} — Riflessi | Sense6`;
  window.scrollTo({ top: 0, behavior: 'instant' });

  state.app.innerHTML = `
    <section class="rx-brief ui-container ui-container--wide">
      <div class="rx-brief__index" aria-hidden="true">${info.number}</div>
      <div class="rx-brief__copy">
        <p class="ui-eyebrow">${t('Instrument')} ${info.number} ${t('of')} 03 / ${t(info.eyebrow)}</p>
        <h1 tabindex="-1" data-rx-screen-title>${t(info.title)}</h1>
        <p class="rx-lede">${t(info.body)}</p>
        <p class="rx-brief__note"><span aria-hidden="true">◇</span>${t(info.note)}</p>
        <div class="rx-instructions">${inputInstructions(instrument)}</div>
        <button class="ui-button ui-button--lg" type="button" data-action="rx-begin-stage">
          ${instrument === 'stability' ? 'Start the 3-minute run' : 'Start practice'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  `;
  resetScreen();
}

function inputInstructions(instrument) {
  if (state.session.inputMode === 'keyboard') {
    return instrument === 'choice'
      ? '<span class="rx-key">←</span><span class="rx-key">→</span><p>Rest one hand near the arrow keys. Use the matching key.</p>'
      : '<span class="rx-key rx-key--wide">space</span><p>Rest one thumb or finger on Space. Do not hold it down.</p>';
  }
  return instrument === 'choice'
    ? '<span class="rx-tap-icon">L</span><span class="rx-tap-icon">R</span><p>Keep two thumbs or fingers ready. Tap the matching side.</p>'
    : '<span class="rx-tap-icon">●</span><p>Keep one finger ready. Tap anywhere inside the chamber.</p>';
}

function beginStage() {
  if (state.session.instrument === 'stability') {
    state.session.block = 'scored';
    state.session.index = 0;
    state.session.stabilityEndsAt = performance.now() + state.config.stability.durationMs;
    renderRunner();
    state.deadlineId = window.setTimeout(finishCurrentInstrument, state.config.stability.durationMs);
    state.clockId = window.setInterval(updateRunnerProgress, 250);
    prepareStabilityTrial();
    return;
  }

  state.session.block = 'practice';
  state.session.index = 0;
  state.session.queue = makeSchedule(state.session.instrument, true);
  renderRunner();
  prepareQueuedTrial();
}

function beginScoredBlock() {
  state.session.block = 'scored';
  if (state.session.instrument === 'signal') {
    trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.riflessi);
  }
  state.session.index = 0;
  state.session.queue = makeSchedule(state.session.instrument, false);
  renderRunner();
  prepareQueuedTrial();
}

function makeSchedule(instrument, practice) {
  if (instrument === 'signal') {
    return createSignalSchedule({
      trials: practice ? state.config.signal.practiceTrials : state.config.signal.scoredTrials,
      catches: practice ? 0 : state.config.signal.catchTrials,
      minWaitMs: state.config.signal.minWaitMs,
      maxWaitMs: state.config.signal.maxWaitMs,
      random: state.session.random,
    });
  }
  return createChoiceSchedule({
    trials: practice ? state.config.choice.practiceTrials : state.config.choice.scoredTrials,
    minWaitMs: state.config.choice.minWaitMs,
    maxWaitMs: state.config.choice.maxWaitMs,
    random: state.session.random,
  });
}

function renderRunner() {
  stopClocks();
  document.body.classList.add('lab-mode', 'rx-running');
  const info = RIFLESSI_INSTRUMENTS[state.session.instrument];
  const choice = state.session.instrument === 'choice';
  const stability = state.session.instrument === 'stability';

  state.app.innerHTML = `
    <section class="rx-runner" data-rx-instrument="${state.session.instrument}">
      <h1 class="sr-only" tabindex="-1" data-rx-screen-title>${t('{name} response runner', { name: t(info.name) })}</h1>
      <header class="rx-runner__header">
        <div><p class="ui-eyebrow">${t(info.name)} · instrument ${scopeInstrumentOrdinal(state.session.instrument)} of ${scopeInstrumentCount(state.session.scope)}</p><strong data-rx-block>${t(stability ? 'Measured run' : state.session.block === 'practice' ? 'Practice' : 'Measured run')}</strong></div>
        <div class="rx-progress" role="progressbar" aria-label="Instrument progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0% complete" data-rx-progressbar><i data-rx-progress></i></div>
        <span class="rx-runner__count" data-rx-count>${stability ? formatClock(state.config.stability.durationMs) : `0 / ${state.session.queue.length}`}</span>
        <button class="rx-runner__stop" type="button" data-action="rx-stop">Stop safely</button>
      </header>
      <div class="rx-chamber" data-rx-chamber data-rx-state="waiting">
        <div class="rx-status-row">
          <div class="rx-chamber__status" data-rx-status>Wait for the signal</div>
          <div class="rx-chamber__status rx-chamber__status--reserve" aria-hidden="true">${t('Wait for the signal')}</div>
          <div class="rx-chamber__status rx-chamber__status--reserve" aria-hidden="true">${t(choice ? 'Choose the matching side' : 'Respond now')}</div>
        </div>
        <div class="rx-stimulus">
          <div class="rx-target" data-rx-target aria-hidden="true">
            ${choice ? '<span class="rx-arrow" data-rx-arrow>→</span>' : '<span class="rx-flash"><i></i></span>'}
          </div>
          <div class="rx-feedback" data-rx-feedback aria-live="polite"></div>
        </div>
        ${
          choice
            ? `<div class="rx-choice-zones">
                <button type="button" data-rx-response="left" aria-labelledby="rx-response-left-label rx-response-left-purpose"><span aria-hidden="true">←</span><small id="rx-response-left-label">${state.session.inputMode === 'keyboard' ? 'left key' : 'tap left'}</small><span id="rx-response-left-purpose" hidden>Respond left</span></button>
                <button type="button" data-rx-response="right" aria-labelledby="rx-response-right-label rx-response-right-purpose"><span aria-hidden="true">→</span><small id="rx-response-right-label">${state.session.inputMode === 'keyboard' ? 'right key' : 'tap right'}</small><span id="rx-response-right-purpose" hidden>Respond right</span></button>
              </div>`
            : `<button class="rx-response-pad" type="button" data-rx-response="signal" aria-labelledby="rx-response-signal-label rx-response-signal-purpose">
                <span id="rx-response-signal-label">${state.session.inputMode === 'keyboard' ? 'press space' : 'tap chamber'}</span>
                <span id="rx-response-signal-purpose" hidden>Respond to signal</span>
              </button>`
        }
      </div>
      <footer class="rx-runner__footer">
        <span>Respond only after the signal</span><span>${state.session.inputMode === 'pointer' ? 'Touch / pointer' : 'Keyboard'} timing</span>
      </footer>
    </section>
  `;
  updateRunnerProgress();
  resetScreen();
}

function prepareQueuedTrial() {
  if (!state.session || state.session.index >= state.session.queue.length) {
    finishBlock();
    return;
  }
  state.activeTrial = state.session.queue[state.session.index];
  prepareTrial(state.activeTrial, state.config[state.session.instrument].responseTimeoutMs);
}

function prepareStabilityTrial() {
  if (!state.session || performance.now() >= state.session.stabilityEndsAt) {
    finishCurrentInstrument();
    return;
  }
  state.activeTrial = {
    kind: 'signal',
    waitMs: randomWait(
      state.config.stability.minWaitMs,
      state.config.stability.maxWaitMs,
      state.session.random,
    ),
  };
  prepareTrial(state.activeTrial, state.config.stability.responseTimeoutMs);
}

function prepareTrial(trial, responseTimeoutMs) {
  clearTrialClocks();
  state.trialState = 'waiting';
  state.onsetAt = 0;
  const chamber = state.app.querySelector('[data-rx-chamber]');
  chamber?.setAttribute('data-rx-state', 'waiting');
  const status = state.app.querySelector('[data-rx-status]');
  if (status) status.textContent = t('Wait for the signal');
  const feedback = state.app.querySelector('[data-rx-feedback]');
  if (feedback) feedback.textContent = '';
  const arrow = state.app.querySelector('[data-rx-arrow]');
  if (arrow) {
    arrow.textContent = '';
    delete arrow.dataset.side;
  }
  updateRunnerProgress();
  state.expectedOnsetAt = performance.now() + trial.waitMs;
  const mountState = state;
  state.timeoutId = window.setTimeout(() => {
    if (!isCurrentMount(state, mountState)) return;
    if (trial.kind === 'catch') {
      mountState.trialState = 'catch';
      mountState.timeoutId = window.setTimeout(() => recordOutcome('catch-correct'), responseTimeoutMs);
      return;
    }
    mountState.frameId = requestAnimationFrame((timestamp) => {
      mountState.frameId = 0;
      if (isCurrentMount(state, mountState)) revealSignal(timestamp, responseTimeoutMs);
    });
  }, trial.waitMs);
}

function revealSignal(timestamp, responseTimeoutMs) {
  state.trialState = 'live';
  state.onsetAt = timestamp;
  state.session.diagnostics.onsets += 1;
  const tolerance = Math.max(12, (state.session.diagnostics.frameMedianMs || 16.7) * 1.5);
  if (timestamp - state.expectedOnsetAt > tolerance) state.session.diagnostics.lateOnsets += 1;
  const chamber = state.app.querySelector('[data-rx-chamber]');
  const arrow = state.app.querySelector('[data-rx-arrow]');
  if (arrow && state.activeTrial?.side) {
    arrow.textContent = state.activeTrial.side === 'left' ? '←' : '→';
    arrow.dataset.side = state.activeTrial.side;
  }
  chamber?.setAttribute('data-rx-state', 'live');
  const status = state.app.querySelector('[data-rx-status]');
  if (status)
    status.textContent = t(
      state.session.instrument === 'choice' ? 'Choose the matching side' : 'Respond now',
    );
  state.timeoutId = window.setTimeout(() => recordOutcome('miss'), responseTimeoutMs);
}

function handleResponse(response, event) {
  if (!state.session || !RESPONSE_PHASES.has(state.trialState)) return;
  if (state.session.inputMode === 'keyboard' && event.type === 'pointerdown') return;
  if (state.session.inputMode === 'pointer' && event.type === 'keydown') return;

  if (state.trialState === 'waiting' || state.trialState === 'catch') {
    recordOutcome('false-start');
    return;
  }
  if (state.trialState !== 'live') return;

  const rt = eventTimestamp(event) - state.onsetAt;
  if (rt < state.config.anticipationMs) {
    recordOutcome('anticipation', rt);
    return;
  }
  if (state.session.instrument === 'choice') {
    recordOutcome(response === state.activeTrial.side ? 'correct' : 'wrong', rt);
    return;
  }
  recordOutcome('correct', rt);
}

function recordOutcome(outcome, rt = null) {
  if (!state.session || ['feedback', 'paused', 'idle'].includes(state.trialState)) return;
  clearTrialClocks();
  state.trialState = 'feedback';
  const isScored = state.session.block === 'scored';
  if (isScored) {
    state.session.records[state.session.instrument].push({ outcome, rt });
  }
  const chamber = state.app.querySelector('[data-rx-chamber]');
  chamber?.setAttribute('data-rx-state', outcomeClass(outcome));
  const feedback = state.app.querySelector('[data-rx-feedback]');
  if (feedback)
    feedback.textContent = t(isScored ? measuredFeedbackText(outcome) : feedbackText(outcome, rt));

  if (state.session.instrument !== 'stability') state.session.index += 1;
  state.timeoutId = window.setTimeout(() => {
    if (!state.session) return;
    if (state.session.instrument === 'stability') {
      prepareStabilityTrial();
    } else {
      prepareQueuedTrial();
    }
  }, state.config.feedbackMs);
}

function measuredFeedbackText(outcome) {
  if (outcome === 'catch-correct') return 'No-signal check recorded';
  if (outcome === 'correct') return 'Response recorded';
  if (outcome === 'wrong' || outcome === 'miss') return 'Response event recorded';
  return 'Early response recorded';
}

function outcomeClass(outcome) {
  if (outcome === 'correct' || outcome === 'catch-correct') return 'correct';
  if (outcome === 'wrong' || outcome === 'miss') return 'error';
  return 'early';
}

function feedbackText(outcome, rt) {
  if (outcome === 'correct') return `${Math.round(rt)} ms`;
  if (outcome === 'catch-correct') return 'Good wait';
  if (outcome === 'wrong') return 'Other side';
  if (outcome === 'miss') return 'No response';
  return 'Too early';
}

function finishBlock() {
  stopClocks();
  document.body.classList.remove('rx-running');
  if (state.session.block === 'practice') {
    renderPracticeComplete();
  } else {
    finishCurrentInstrument();
  }
}

function renderPracticeComplete() {
  const info = RIFLESSI_INSTRUMENTS[state.session.instrument];
  state.app.innerHTML = `
    <section class="rx-transition ui-container">
      <span class="rx-transition__mark" aria-hidden="true">✓</span>
      <p class="ui-eyebrow">${info.name} / practice complete</p>
      <h1 tabindex="-1" data-rx-screen-title>Now the measured block.</h1>
      <p>Keep the same hand position. Early responses, misses, and ${state.session.instrument === 'choice' ? 'wrong sides' : 'no-signal responses'} will be recorded.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-begin-scored">Begin measured block <span aria-hidden="true">→</span></button>
    </section>
  `;
  resetScreen();
}

function finishCurrentInstrument() {
  if (!state.session) return;
  stopClocks();
  document.body.classList.remove('rx-running');
  const completed = state.session.instrument;
  if (
    completed === 'stability' ||
    (completed === 'signal' && state.session.scope === 'signal') ||
    (completed === 'choice' && state.session.scope === 'signal-choice')
  ) {
    renderResults();
    return;
  }
  const next = completed === 'signal' ? 'choice' : 'stability';
  const valid = state.session.records[completed].filter((record) => record.outcome === 'correct').length;
  const total = state.session.records[completed].length;
  state.app.innerHTML = `
    <section class="rx-transition ui-container">
      <span class="rx-transition__mark" aria-hidden="true">${RIFLESSI_INSTRUMENTS[completed].number}</span>
      <p class="ui-eyebrow">Instrument complete</p>
      <h1 tabindex="-1" data-rx-screen-title>Measurement recorded: ${RIFLESSI_INSTRUMENTS[completed].name}.</h1>
      <p>${valid} clean response${valid === 1 ? '' : 's'} captured across ${total} measured event${total === 1 ? '' : 's'}. Interpretation waits until the selected scope is complete. Take a short break now if needed, without changing device or input.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-next-stage" data-next="${next}">
        Continue to ${RIFLESSI_INSTRUMENTS[next].name} <span aria-hidden="true">→</span>
      </button>
    </section>
  `;
  resetScreen();
}

function renderResults() {
  state.lifecycle.setActive(false);
  stopClocks();
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.riflessi);
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = t('Your response observations — Riflessi | Sense6');
  const includesChoice = state.session.scope !== 'signal';
  const includesStability = state.session.scope === 'complete';
  const result = summarizeRiflessi(state.session.records, {
    signal: state.config.signal.scoredTrials,
    signalScheduled: state.config.signal.scoredTrials + state.config.signal.catchTrials,
    catches: state.config.signal.catchTrials,
    choice: includesChoice ? state.config.choice.scoredTrials : 0,
    stability: includesStability ? requiredStabilityResponses() : 0,
    interruptions: state.session.diagnostics.interruptions,
  });
  const timing = timingHealth(state.session.diagnostics);
  const stored = {
    ...result,
    inputMode: state.session.inputMode,
    timing: timing.label,
    recordedAt: Date.now(),
  };
  state.session.result = result;

  state.app.innerHTML = riflessiResultsMarkup({
    result,
    context: {
      scope: state.session.scope,
      inputMode: state.session.inputMode,
      physicalSetup: state.session.physicalSetup,
      frameMedianMs: state.session.diagnostics.frameMedianMs ?? null,
      interruptions: state.session.diagnostics.interruptions,
      anticipationMs: state.config.anticipationMs,
      locale: state.locale,
    },
    timing,
    translate: t,
    message: m,
  });

  const lastResultSaved = saveLast(stored);
  const journalOutcome = saveJournalResult(result, timing);
  const journalSaved = journalOutcome === 'saved';
  const persistence = state.app.querySelector('[data-rx-persistence]');
  if (lastResultSaved && journalSaved) persistence?.remove();
  else if (persistence) {
    persistence.outerHTML = riflessiPersistenceStatus({ lastResultSaved, journalOutcome, translate: t });
  }
  const actions = state.app.querySelector('.rx-results__actions');
  if (actions) {
    actions.innerHTML = riflessiResultActions({
      allSaved: lastResultSaved && journalSaved,
      actionLabel: resultActionLabel(t),
      translate: t,
    });
  }
  resetScreen();
}

/** @param {'signal' | 'signal-choice' | 'complete'} scope */
function scopeInstrumentCount(scope) {
  if (scope === 'signal') return 1;
  if (scope === 'signal-choice') return 2;
  return 3;
}

/** @param {'signal' | 'choice' | 'stability'} instrument */
function scopeInstrumentOrdinal(instrument) {
  return { signal: 1, choice: 2, stability: 3 }[instrument];
}

function updateRunnerProgress() {
  if (!state.session) return;
  const progress = state.app.querySelector('[data-rx-progress]');
  const progressbar = state.app.querySelector('[data-rx-progressbar]');
  const count = state.app.querySelector('[data-rx-count]');
  if (!progress || !progressbar || !count) return;
  if (state.session.instrument === 'stability') {
    const remaining = Math.max(0, state.session.stabilityEndsAt - performance.now());
    const complete = 1 - remaining / state.config.stability.durationMs;
    const percent = Math.min(100, Math.max(0, complete * 100));
    const coarsePercent = percent >= 67 ? 67 : percent >= 33 ? 33 : 0;
    progress.style.transform = `scaleX(${coarsePercent / 100})`;
    progressbar.setAttribute('aria-valuenow', String(Math.round(percent)));
    progressbar.setAttribute('aria-valuetext', `${formatClock(remaining)} remaining`);
    count.textContent =
      percent >= 67 ? 'Final section' : percent >= 33 ? 'Middle section' : 'Opening section';
  } else {
    const percent = (state.session.index / state.session.queue.length) * 100;
    progress.style.transform = `scaleX(${percent / 100})`;
    progressbar.setAttribute('aria-valuenow', String(Math.round(percent)));
    progressbar.setAttribute(
      'aria-valuetext',
      `${state.session.index} of ${state.session.queue.length} trials complete`,
    );
    count.textContent = `${Math.min(state.session.index + 1, state.session.queue.length)} / ${state.session.queue.length}`;
  }
}

function formatClock(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function pauseRun() {
  if (!state.session || !RUNNER_PHASES.has(state.trialState)) return;
  clearTrialClocks();
  if (state.session.instrument === 'stability') {
    window.clearTimeout(state.deadlineId);
    window.clearInterval(state.clockId);
  }
  state.trialState = 'paused';
  state.session.pauseStartedAt = performance.now();
  state.session.diagnostics.interruptions += 1;
  if (state.session.instrument === 'choice' && state.session.block === 'scored') {
    state.session.queue[state.session.index] = createChoiceSchedule({
      trials: 1,
      minWaitMs: state.config.choice.minWaitMs,
      maxWaitMs: state.config.choice.maxWaitMs,
      random: state.session.random,
    })[0];
  } else if (state.session.instrument === 'signal' && state.session.block === 'scored') {
    const active = state.session.queue[state.session.index];
    state.session.queue[state.session.index] = {
      kind: active?.kind ?? 'signal',
      waitMs: randomWait(state.config.signal.minWaitMs, state.config.signal.maxWaitMs, state.session.random),
    };
  }
  document.body.classList.remove('rx-running');
  state.app.innerHTML = `
    <section class="rx-transition ui-container" data-rx-paused>
      <span class="rx-transition__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Timing paused</p>
      <h1 tabindex="-1" data-rx-screen-title>This trial was interrupted.</h1><p>The current trial has been discarded. Return when this tab can stay visible and focused.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-resume">Resume with a fresh trial <span aria-hidden="true">→</span></button>
    </section>`;
  resetScreen();
}

function resumeRun() {
  if (!state.session) return;
  if (state.session.instrument === 'stability') {
    state.session.stabilityEndsAt += performance.now() - state.session.pauseStartedAt;
  }
  renderRunner();
  if (state.session.instrument === 'stability') {
    const remaining = Math.max(0, state.session.stabilityEndsAt - performance.now());
    state.deadlineId = window.setTimeout(finishCurrentInstrument, remaining);
    state.clockId = window.setInterval(updateRunnerProgress, 250);
    prepareStabilityTrial();
  } else {
    prepareQueuedTrial();
  }
}

/*
 * The setup-screen cadence sampler owns its own frame slot. Sharing one with
 * the trial-onset frame let a starting trial cancel the sampler, and a running
 * sampler survive a trial teardown.
 */
function measureFrameCadence() {
  const mountState = state;
  const intervals = [];
  let previous = 0;
  const sample = (timestamp) => {
    mountState.cadenceFrameId = 0;
    if (!isCurrentMount(state, mountState)) return;
    if (!mountState.app.querySelector('[data-rx-cadence]')) return;
    if (previous) intervals.push(timestamp - previous);
    previous = timestamp;
    if (intervals.length < 45) {
      mountState.cadenceFrameId = requestAnimationFrame(sample);
      return;
    }
    const sorted = [...intervals].sort((left, right) => left - right);
    const frameMs = sorted[Math.floor(sorted.length / 2)];
    const dropped = intervals.filter((value) => value > frameMs * 1.8).length;
    const output = mountState.app.querySelector('[data-rx-cadence]');
    const note = mountState.app.querySelector('[data-rx-cadence-note]');
    if (output) {
      output.textContent = `≈ ${frameMs.toFixed(1)} ms / frame`;
      output.dataset.frameMs = String(frameMs);
      output.dataset.dropped = String(dropped);
    }
    if (note)
      note.textContent = dropped
        ? t('{count} long frame intervals observed in the sample.', { count: dropped })
        : t('The setup sample was steady.');
  };
  mountState.cadenceFrameId = requestAnimationFrame(sample);
}

/**
 * Expect the clean responses the configured sustained block can actually
 * schedule. Each cycle costs one randomized wait, one response window, and one
 * feedback pause; budgeting the slowest response keeps the expectation
 * reachable, and the same 80% floor as the other blocks then applies.
 */
function requiredStabilityResponses() {
  const { durationMs, minWaitMs, maxWaitMs, responseTimeoutMs } = state.config.stability;
  const cycleMs = (minWaitMs + maxWaitMs) / 2 + responseTimeoutMs + state.config.feedbackMs;
  return Math.max(1, Math.ceil(Math.floor(durationMs / cycleMs) * 0.8));
}

function timingHealth(diagnostics) {
  const lateRate = diagnostics.onsets ? diagnostics.lateOnsets / diagnostics.onsets : 0;
  if (diagnostics.interruptions || lateRate > 0.1 || diagnostics.droppedFrames > 3) {
    return {
      label: 'Timing interruptions observed',
      copy: 'At least one focus interruption or unusually late presentation occurred. Raw response times were not “corrected”; repeat if conditions were unstable.',
    };
  }
  return {
    label: 'Timing appeared steady',
    copy: 'No major interruption was observed by the page. This does not remove unknown display or input-device latency.',
  };
}

async function copyResults() {
  const mountState = state;
  const session = mountState?.session;
  if (!session?.result) return;
  const result = session.result;
  const ownsResult = () =>
    isCurrentMount(state, mountState) && mountState.session === session && session.result === result;
  const timing = timingHealth(session.diagnostics);
  const summary = riflessiResultSummary({
    result,
    context: {
      scope: session.scope,
      inputMode: session.inputMode,
      interruptions: session.diagnostics.interruptions,
    },
    timingLabel: timing.label,
    translate: t,
  });
  try {
    const outcome = await shareOrCopyResult({
      title: t('Response speed and consistency — Riflessi | Sense6'),
      summary,
      route: 'riflessi',
      locale: mountState.locale,
    });
    if (outcome === 'copied' && ownsResult()) toast(t('Result summary copied.'));
  } catch {
    if (ownsResult()) toast(t('Copy was unavailable in this browser.'));
  }
}

function wireEvents(signal) {
  document.addEventListener(
    'click',
    (event) => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.matches('a')) event.preventDefault();
      switch (action.dataset.action) {
        case 'rx-home':
          state.goHome();
          break;
        case 'rx-intro':
          renderIntro();
          break;
        case 'rx-setup':
        case 'rx-setup-closing':
          renderSetup();
          break;
        case 'rx-method':
          state.app.querySelector('#rx-method')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'rx-mode':
          selectMode(action.dataset.mode);
          break;
        case 'rx-scope':
          if (['signal', 'signal-choice', 'complete'].includes(action.dataset.scope)) {
            selectScope(action.dataset.scope);
          }
          break;
        case 'rx-start':
          startSession();
          break;
        case 'rx-begin-stage':
          beginStage();
          break;
        case 'rx-begin-scored':
          beginScoredBlock();
          break;
        case 'rx-next-stage':
          renderInstrumentBrief(action.dataset.next);
          break;
        case 'rx-resume':
          resumeRun();
          break;
        case 'rx-stop':
          if (confirmActiveExit('End this run? Your progress will be lost.')) renderIntro();
          break;
        case 'rx-restart':
          renderSetup();
          break;
        case 'rx-copy':
          copyResults();
          break;
      }
    },
    { signal },
  );

  document.addEventListener(
    'change',
    (event) => {
      if (!event.target.matches('[data-rx-consent]')) return;
      const start = state.app.querySelector('[data-action="rx-start"]');
      if (start) start.disabled = !event.target.checked;
    },
    { signal },
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const response = event.target.closest('[data-rx-response]');
      if (response) handleResponse(response.dataset.rxResponse, event);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || !state.session || state.session.inputMode !== 'keyboard') return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.rx-runner')) return;
      let response = null;
      const responseControl = target.closest('[data-rx-response]');
      if (responseControl && (event.code === 'Space' || event.key === ' ' || event.key === 'Enter')) {
        response = responseControl.dataset.rxResponse;
      } else if (!target.closest('button, input, select, textarea, [contenteditable]')) {
        if (state.session.instrument === 'choice' && event.key === 'ArrowLeft') response = 'left';
        if (state.session.instrument === 'choice' && event.key === 'ArrowRight') response = 'right';
      }
      if (response) {
        event.preventDefault();
        handleResponse(response, event);
      }
    },
    { signal },
  );

  document.addEventListener('visibilitychange', () => document.hidden && pauseRun(), { signal });
  window.addEventListener('blur', pauseRun, { signal });
}

function hasActiveSession() {
  return Boolean(state?.session && !state.session.result);
}

function confirmActiveExit(message) {
  return !hasActiveSession() || window.confirm(t(message));
}

function resetScreen() {
  state.lifecycle.present(state.app, { focus: '[data-rx-screen-title]' });
}

function eventTimestamp(event) {
  const now = performance.now();
  return Number.isFinite(event.timeStamp) && Math.abs(event.timeStamp - now) < 60_000 ? event.timeStamp : now;
}

function stopClocks() {
  clearTrialClocks();
  cancelAnimationFrame(state.cadenceFrameId);
  window.clearTimeout(state.deadlineId);
  window.clearInterval(state.clockId);
  state.cadenceFrameId = 0;
  state.deadlineId = 0;
  state.clockId = 0;
  state.trialState = 'idle';
}

function clearTrialClocks() {
  window.clearTimeout(state.timeoutId);
  cancelAnimationFrame(state.frameId);
  state.timeoutId = 0;
  state.frameId = 0;
}

function runtimeConfig() {
  const testOverride =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSE6_TEST_CONFIG__
      : null;
  return mergeReflexConfig(testOverride?.riflessi);
}

function saveLast(result) {
  return RESULT_STORE.save(result);
}

/** @returns {import('../lib/journal.js').JournalSaveOutcome} */
function saveJournalResult(result, timing) {
  const profileId =
    state.session.scope === 'signal'
      ? 'signal'
      : state.session.scope === 'signal-choice'
        ? 'signal-choice'
        : 'complete';
  return saveJournalRun({
    examId: 'riflessi',
    locale: state.locale,
    quality: result.usable ? 'usable' : 'limited',
    protocol: protocolPassport('riflessi', profileId),
    setup: {
      ...captureDisplayPassport(),
      inputMode: state.session.inputMode,
      physicalSetup: state.session.physicalSetup,
      frameCadence: state.session.diagnostics.frameMedianMs ?? null,
      timingHealth: timing.label,
      interruptions: state.session.diagnostics.interruptions,
    },
    qualityEvidence: {
      signalScheduled: result.signal.scheduled,
      signalValid: result.signal.valid,
      choiceScheduled: result.choice.scheduled,
      choiceValid: result.choice.valid,
      sustainedValid: result.stability.valid,
      catchesPassed: result.events.catchesPassed,
      catchesScheduled: result.events.catchesScheduled,
      falseStarts: result.events.falseStarts,
      anticipations: result.events.anticipations,
      misses: result.events.misses,
      wrongChoices: result.events.wrongChoices,
      interruptions: state.session.diagnostics.interruptions,
      qualityReasons: result.qualityReasons.join(','),
    },
    measurements: [
      {
        id: 'signal-median',
        value: result.signal.medianMs,
        unit: 'ms',
      },
      { id: 'choice-median', value: result.choice.medianMs, unit: 'ms' },
      { id: 'choice-block-difference', value: result.choice.blockDifferenceMs, unit: 'ms' },
      { id: 'choice-scheduled-accuracy', value: result.choice.scheduledAccuracyPercent, unit: '%' },
      { id: 'stability-median', value: result.stability.medianMs, unit: 'ms' },
      { id: 'slowest-gap', value: result.stability.slowestGapMs, unit: 'ms' },
      { id: 'drift', value: result.stability.driftMs, unit: 'ms' },
    ],
    notes: result.usable ? ['device-relative-custom-tasks'] : ['limited-run', ...result.qualityReasons],
  });
}

function loadLast() {
  return RESULT_STORE.load();
}
