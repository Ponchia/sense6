import { toast } from '@ponchia/ui/behaviors';
import '../styles/udito.css';
import { formatNumber, m, t } from '../i18n.js';
import {
  createHeadphoneTrials,
  createPitchTracks,
  createRangeTrack,
  mergeHearingConfig,
  nextPitchTrial,
  nextRangeTrial,
  recordPitchResponse,
  recordRangeResponse,
  renderingFrequencyCeiling,
  summarizeHeadphones,
  summarizePitch,
  summarizeRange,
} from '../lib/hearing.js';
import { HearingAudio } from '../lib/hearing-audio.js';
import { captureDisplayPassport, saveJournalRun } from '../lib/journal.js';
import { createExamLifecycle, isCurrentMount } from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { resultActionLabel, shareOrCopyResult } from '../lib/result-sharing.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';
import { protocolPassport } from './protocols.js';
import { applyScopeSelection, scopeOptionMarkup } from './views/scope-picker.js';
import { UDITO_INSTRUMENTS, uditoIntroMarkup } from './views/udito-intro.js';

const STORAGE_KEY = 'sense6:udito:last';
const SETUP_QUALITIES = new Set(['Setup checks coherent', 'Interpret with caution']);
const RESULT_STORE = createResultStore({ key: STORAGE_KEY, validate: isLatestResult });
const MOUNT_OWNER = Symbol('udito');
const TRIAL_PHASES = Object.freeze({
  idle: 'idle',
  playing: 'playing',
  awaitingResponse: 'awaiting-response',
  committedFeedback: 'committed-feedback',
  paused: 'paused',
});
const INSTRUMENTS = UDITO_INSTRUMENTS;
// A presentation is in flight. The `au-running` body class is styling only and
// must never decide whether a response or an interruption is recorded.
const RUNNER_PHASES = new Set([
  TRIAL_PHASES.playing,
  TRIAL_PHASES.awaitingResponse,
  TRIAL_PHASES.committedFeedback,
]);

let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, { bodyClasses: ['lab-mode', 'au-running'] });
  const config = runtimeConfig();
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    goHome: context.navigateHome,
    goJournal: () => context.navigate('journal'),
    lifecycle,
    locale: context.locale,
    config,
    audio: new HearingAudio(config.audio),
    session: null,
    activeTrial: null,
    responseOpen: false,
    feedbackTimer: 0,
    referencePlayed: false,
    anchorsPlayed: false,
    selectedScope: 'standard',
    trialPhase: TRIAL_PHASES.idle,
    pausedFrom: TRIAL_PHASES.idle,
    trialSequence: 0,
    playbackOperation: 0,
    lastFeedback: '',
    pausePromise: Promise.resolve(),
  };
  mountState.audio.onStateChange = handleAudioStateChange;
  mountState.audio.onOutputChange = handleOutputDeviceChange;
  state = mountState;
  wireEvents(lifecycle.signal);
  renderIntro();

  lifecycle.onCleanup(() => {
    clearTimeout(mountState.feedbackTimer);
    mountState.playbackOperation += 1;
    if (mountState.audio) {
      mountState.audio.onStateChange = null;
      mountState.audio.onOutputChange = null;
    }
    // close() rejects when the context is already closing; an unhandled
    // rejection during unmount would surface as a page-level error.
    void mountState.audio?.close().catch(() => {});
    mountState.audio = null;
    mountState.session = null;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  state.lifecycle.setActive(false);
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  state.session = null;
  state.referencePlayed = false;
  state.anchorsPlayed = false;
  document.body.classList.remove('lab-mode', 'au-running');
  document.title = t('Device-relative hearing lab — Udito | Sense6');
  state.app.innerHTML = uditoIntroMarkup(loadLast(), m, state.locale);
  focusStage('h1', 'Udito listening lab ready.');
}

function renderSetup() {
  state.lifecycle.setActive(false);
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  state.referencePlayed = false;
  state.anchorsPlayed = false;
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = t('Prepare your audio setup — Udito | Sense6');
  window.scrollTo({ top: 0, behavior: 'instant' });
  const supported = state.audio.supported;
  state.app.innerHTML = `
    <section class="au-setup ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="au-setup__grid">
        <div class="au-setup__copy">
          <p class="ui-eyebrow">Audio setup / keep volume unchanged after this screen</p>
          <h1>${t('Quiet room.')}<br>${t('Low volume.')}<br>${t('Headphones.')}</h1>
          <p class="au-lede">${t('Take off hearing protection only if you normally would. If you use hearing aids or another listening device, leave your usual setup unchanged and record it below.')}</p>
          <div class="ui-alert ui-alert--warning"><strong class="ui-alert__title">Sound sensitivity comes first.</strong><p class="ui-alert__body">If you have tinnitus, hyperacusis, or sounds are uncomfortable today, skip the experiment or stop immediately. Sense6 cannot measure sound pressure.</p></div>
          <label class="au-device-label">${t('Listening setup')}
            <select data-au-device ${supported ? '' : 'disabled'}>
              <option value="headphones">${t('Over-ear / on-ear headphones')}</option>
              <option value="earbuds">${t('Earbuds / in-ear headphones')}</option>
              <option value="assistive">${t('Usual hearing aid / assistive setup')}</option>
              <option value="other">${t('Other / unsure')}</option>
            </select>
          </label>
          <label class="au-device-label">Connection
            <select data-au-connection ${supported ? '' : 'disabled'}>
              <option value="other">Other / unsure</option>
              <option value="wired">Wired</option>
              <option value="wireless">Wireless / Bluetooth</option>
              <option value="integrated">Built-in / assistive route</option>
            </select>
          </label>
          ${
            supported
              ? `<div class="au-reference">
                  <button class="ui-button ui-button--ghost" type="button" data-action="au-reference">Play maximum-level reference</button>
                  <div class="au-reference__meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
                  <p data-au-reference-status role="status" aria-live="polite">Start device volume low before playing. This 1 kHz preview represents the loudest digital level used later; it does not measure acoustic output.</p>
                </div>`
              : `<div class="ui-alert ui-alert--danger" role="alert"><strong class="ui-alert__title">Web Audio is unavailable.</strong><p class="ui-alert__body">Udito cannot present controlled intervals in this browser. Try a current browser with audio enabled.</p></div>`
          }
          <div class="au-reference">
            <button class="ui-button ui-button--ghost" type="button" data-action="au-anchors" ${supported ? '' : 'disabled'}>Play 200 Hz, 500 Hz, and 2 kHz audibility anchors</button>
            <p data-au-anchor-status role="status">Confirm that all three are audible at the same comfortable volume. This is a self-report gate, not calibration.</p>
            <label><input type="checkbox" data-au-anchors-confirmed disabled> I heard all three anchors comfortably without changing volume.</label>
          </div>
          <fieldset class="au-scope-picker" data-au-scope-picker>
            <legend>Choose this run's scope</legend>
            ${audioScopeButton('focused', 'Focused', 'Cuffie + Portata · about 3–4 minutes')}
            ${audioScopeButton('standard', 'Standard', 'All three instruments · about 5–7 minutes')}
          </fieldset>
          <label class="au-consent"><input type="checkbox" data-au-consent ${supported ? '' : 'disabled'}><span><strong class="experiment-boundary">${t('I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.')}</strong> ${t('The reference is quiet and comfortable; the room is quiet; I will not change volume or raise it to chase a tone; I understand this is not clinical audiometry.')}</span></label>
          <button class="ui-button ui-button--lg" type="button" data-action="au-start" disabled>Begin selected scope <span aria-hidden="true">→</span></button>
        </div>
        <aside class="au-setup__rules" aria-label="Safe listening rules">
          <p class="ui-eyebrow">${t('Volume contract')}</p>
          <strong>≤ 60%</strong>
          <p>${t('A device control, not a measured sound-pressure level. The browser cannot know dB SPL.')}</p>
          <ol><li>${t('Start low')}</li><li>${t('Find quiet comfort')}</li><li>${t('Lock volume')}</li><li>${t('Stop for discomfort')}</li></ol>
          <dl><div><dt>${t('Upload')}</dt><dd>${t('None')}</dd></div><div><dt>${t('Microphone')}</dt><dd>${t('Not used')}</dd></div><div><dt>${t('Calibration')}</dt><dd>${t('User-set only')}</dd></div></dl>
        </aside>
      </div>
    </section>
  `;
  focusStage('h1', 'Audio setup ready. Play the maximum-level reference before beginning.');
}

async function playReference() {
  const mountState = state;
  const audio = mountState?.audio;
  const button = mountState?.app.querySelector('[data-action="au-reference"]');
  const status = mountState?.app.querySelector('[data-au-reference-status]');
  if (!mountState || !audio || !button || !status) return;
  const operation = beginPlaybackOperation(mountState);
  invalidateReference();
  button.disabled = true;
  button.textContent = t('Playing maximum-level reference…');
  status.textContent = t(
    'Keep this quiet and comfortable. Later signals use the same or a lower digital level.',
  );
  try {
    const completed = await audio.playReference();
    if (!isCurrentPlayback(mountState, operation)) return;
    if (!completed || audio.state !== 'running') throw new Error('Reference did not complete');
    mountState.referencePlayed = true;
    button.textContent = t('Play reference again');
    status.textContent = t(
      'Reference completed on the audio clock · {sampleRate} Hz context · now leave volume unchanged.',
      { sampleRate: formatNumber(audio.sampleRate) },
    );
    updateSetupGate();
  } catch {
    if (!isCurrentPlayback(mountState, operation)) return;
    invalidateReference(
      'The reference did not complete on the audio clock. Check browser audio output and play it again.',
    );
    button.textContent = t('Play reference again');
    toast(t('The reference sound did not complete.'));
  } finally {
    if (isCurrentMount(state, mountState) && mountState.app.contains(button)) button.disabled = false;
  }
}

function invalidateReference(message = '') {
  state.referencePlayed = false;
  state.anchorsPlayed = false;
  const anchors = state.app.querySelector('[data-au-anchors-confirmed]');
  if (anchors) {
    anchors.checked = false;
    anchors.disabled = true;
  }
  updateSetupGate();
  const status = state.app.querySelector('[data-au-reference-status]');
  if (message && status) status.textContent = t(message);
}

async function playAudibilityAnchors() {
  const mountState = state;
  const audio = mountState?.audio;
  const button = mountState?.app.querySelector('[data-action="au-anchors"]');
  const status = mountState?.app.querySelector('[data-au-anchor-status]');
  const confirmation = mountState?.app.querySelector('[data-au-anchors-confirmed]');
  if (!mountState || !audio || !button || !status || !confirmation) return;
  const operation = beginPlaybackOperation(mountState);
  mountState.anchorsPlayed = false;
  confirmation.checked = false;
  confirmation.disabled = true;
  button.disabled = true;
  status.textContent = 'Playing low, mid, and pitch-task anchors at the fixed digital level…';
  try {
    const completed = await audio.playAudibilityAnchors();
    if (!isCurrentPlayback(mountState, operation)) return;
    if (!completed || audio.state !== 'running') throw new Error('Anchor playback did not complete');
    mountState.anchorsPlayed = true;
    confirmation.disabled = false;
    confirmation.focus();
    status.textContent = 'Anchor playback completed. Confirm all three were audible without changing volume.';
  } catch {
    if (!isCurrentPlayback(mountState, operation)) return;
    status.textContent = 'Anchor playback did not complete. Check the audio route and try again.';
  } finally {
    if (isCurrentMount(state, mountState) && mountState.app.contains(button)) button.disabled = false;
    if (isCurrentPlayback(mountState, operation)) updateSetupGate();
  }
}

/** @param {'focused' | 'standard'} id @param {string} label @param {string} detail */
function audioScopeButton(id, label, detail) {
  return scopeOptionMarkup({
    action: 'au-scope',
    className: 'au-scope-option',
    id,
    selected: state.selectedScope === id,
    label: t(label),
    detail: t(detail),
  });
}

/** @param {'focused' | 'standard'} scope */
function selectAudioScope(scope) {
  state.selectedScope = scope;
  applyScopeSelection(state.app, 'au-scope', scope);
}

function updateSetupGate() {
  const consent = state.app.querySelector('[data-au-consent]');
  const anchors = state.app.querySelector('[data-au-anchors-confirmed]');
  const start = state.app.querySelector('[data-action="au-start"]');
  if (start)
    start.disabled = !(state.referencePlayed && state.anchorsPlayed && anchors?.checked && consent?.checked);
}

function startSession() {
  const consent = state.app.querySelector('[data-au-consent]');
  const anchors = state.app.querySelector('[data-au-anchors-confirmed]');
  if (!state.referencePlayed || !state.anchorsPlayed || !anchors?.checked || !consent?.checked) {
    toast(t('Play the reference and audibility anchors, then confirm the volume contract first.'));
    return;
  }
  const random = seededRandom(`${Date.now()}-${Math.random()}`);
  const maxHz = renderingFrequencyCeiling(state.audio.sampleRate, state.config.range.maxHz);
  state.session = {
    instrument: 'headphones',
    block: null,
    queue: [],
    index: 0,
    random,
    device: state.app.querySelector('[data-au-device]')?.value ?? 'other',
    connection: state.app.querySelector('[data-au-connection]')?.value ?? 'other',
    scope: state.selectedScope,
    sampleRate: state.audio.sampleRate,
    volumeConsistent: null,
    headphoneRecords: [],
    rangeTrack: createRangeTrack(maxHz, state.config.range),
    pitchTracks: createPitchTracks(state.config.pitch),
    interruptions: 0,
    committedTrialIds: new Set(),
  };
  renderBrief('headphones');
}

function renderBrief(instrument) {
  state.lifecycle.setActive(true, t('Leave this listening run? Your progress will be lost.'));
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  state.session.instrument = instrument;
  const info = INSTRUMENTS[instrument];
  const instrumentTotal = state.session.scope === 'focused' ? '02' : '03';
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = `${t(info.name)} — Udito | Sense6`;
  state.app.innerHTML = `
    <section class="au-brief ui-container ui-container--wide">
      <div class="au-brief__index" aria-hidden="true">${info.number}</div>
      <div class="au-brief__copy">
        <p class="ui-eyebrow">${t('Instrument')} ${info.number} ${t('of')} ${instrumentTotal} / ${t(info.eyebrow)}</p><h1>${t(info.title)}</h1><p class="au-lede">${t(info.body)}</p>
        <div class="au-brief__rules">${briefRules(instrument)}</div>
        <button class="ui-button ui-button--lg" type="button" data-action="au-begin-stage">${t(instrument === 'headphones' ? 'Start practice' : `Start ${info.name}`)} <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
  focusStage('h1', '{name} instructions ready.', { name: t(info.name) });
}

function briefRules(instrument) {
  if (instrument === 'headphones')
    return `<span>1</span><span>2</span><span>3</span><p>${t('Choose the quietest tone. Two practice trials come first; the measured check is six trials.')}</p>`;
  if (instrument === 'range')
    return `<span>1</span><span>2</span><span>3</span><p>${t('Choose the interval containing the tone. Silence is a valid experience—guess without changing volume.')}</p>`;
  return `<span>1</span><span>2</span><p>${t('Choose which tone was higher. Loudness changes slightly on purpose, so follow pitch rather than loudness.')}</p>`;
}

function beginStage() {
  state.lastFeedback = '';
  if (state.session.instrument === 'headphones') {
    state.session.block = 'practice';
    state.session.queue = createHeadphoneTrials({
      count: state.config.headphones.practiceTrials,
      practice: true,
      random: state.session.random,
    });
    state.session.index = 0;
  }
  renderRunner();
  prepareNextTrial();
}

function beginMeasuredHeadphones() {
  state.lastFeedback = '';
  state.session.block = 'scored';
  trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.udito);
  state.session.queue = createHeadphoneTrials({
    count: state.config.headphones.scoredTrials,
    random: state.session.random,
  });
  state.session.index = 0;
  renderRunner();
  prepareNextTrial();
}

function renderRunner() {
  stopPlayback();
  document.body.classList.add('lab-mode', 'au-running');
  const info = INSTRUMENTS[state.session.instrument];
  const choices = state.session.instrument === 'pitch' ? 2 : 3;
  state.app.innerHTML = `
    <section class="au-runner" data-au-runner data-au-instrument="${state.session.instrument}" style="--au-choices: ${choices}">
      <h1 class="sr-only" tabindex="-1" data-au-runner-heading>${t('{name} listening runner', { name: t(info.name) })}</h1>
      <header class="au-runner__header"><div><p class="ui-eyebrow">${info.number} / ${t(info.name)}</p><strong>${t(state.session.block === 'practice' ? 'Practice' : 'Adaptive run')}</strong></div><span data-au-count>${t('Preparing…')}</span><button type="button" data-action="au-stop" aria-keyshortcuts="Escape">${t('Stop safely')}</button></header>
      <div class="au-listening">
        <p class="au-listening__status" data-au-status tabindex="-1">${t('Preparing the sounds…')}</p>
        <div class="au-intervals" data-au-intervals aria-hidden="true">${Array.from({ length: choices }, (_, index) => `<div><span>${index + 1}</span><i></i></div>`).join('')}</div>
        <div class="au-responses" aria-label="${t('Sound interval choices')}">${Array.from({ length: choices }, (_, index) => `<button type="button" data-au-response="${index}" disabled><span>${index + 1}</span><small>${state.session.instrument === 'pitch' ? t(index ? 'Second tone' : 'First tone') : `${t('Interval')} ${index + 1}`}</small></button>`).join('')}</div>
        <div class="au-feedback" data-au-feedback role="status" aria-live="polite">${state.lastFeedback}</div>
      </div>
      <footer class="au-runner__footer"><span>Volume reported unchanged</span><span>${t('Keys')} ${choices === 2 ? '1 · 2' : '1 · 2 · 3'}</span><span>${t('Short ramped tones')}</span></footer>
    </section>`;
  focusStage('[data-au-status]', '{name} sound runner ready.', { name: t(info.name) });
}

function prepareNextTrial() {
  if (!state.session) return;
  if (state.session.instrument === 'headphones') {
    if (state.session.index >= state.session.queue.length) {
      finishHeadphoneBlock();
      return;
    }
    state.activeTrial = state.session.queue[state.session.index];
  } else if (state.session.instrument === 'range') {
    if (state.session.rangeTrack.complete) {
      finishInstrument('range');
      return;
    }
    state.activeTrial = nextRangeTrial(state.session.rangeTrack, state.session.random);
  } else {
    state.activeTrial = nextPitchTrial(state.session.pitchTracks, state.session.random);
    if (!state.activeTrial) {
      renderVolumeCheck();
      return;
    }
  }
  state.trialSequence += 1;
  state.activeTrial = {
    ...state.activeTrial,
    trialId: `${state.session.instrument}:${state.session.block}:${state.trialSequence}`,
  };
  updateRunnerMeta();
  playTrial();
}

async function playTrial() {
  const mountState = state;
  const session = mountState?.session;
  const trial = mountState?.activeTrial;
  const audio = mountState?.audio;
  if (!mountState || !session || !trial || !audio) return;
  const operation = beginPlaybackOperation(mountState);
  mountState.trialPhase = TRIAL_PHASES.playing;
  mountState.responseOpen = false;
  setResponseDisabled(true);
  const runner = mountState.app.querySelector('[data-au-runner]');
  if (runner) {
    runner.dataset.correctInterval = String(correctInterval(trial));
    runner.dataset.trialId = trial.trialId;
    runner.dataset.trialPhase = mountState.trialPhase;
  }
  const status = mountState.app.querySelector('[data-au-status]');
  if (status) status.textContent = t('Listen…');
  let completed = false;
  try {
    const onInterval = (index) => {
      if (isCurrentPlayback(mountState, operation)) showInterval(index);
    };
    if (session.instrument === 'headphones') completed = await audio.playHeadphoneTrial(trial, onInterval);
    if (session.instrument === 'range') completed = await audio.playRangeTrial(trial, onInterval);
    if (session.instrument === 'pitch') completed = await audio.playPitchTrial(trial, onInterval);
  } catch {
    if (!isCurrentPlayback(mountState, operation)) return;
    pauseRun('Audio playback was interrupted.');
    return;
  }
  if (!isCurrentPlayback(mountState, operation)) return;
  if (!completed) {
    pauseRun('Audio playback did not complete.');
    return;
  }
  if (!mountState.session || mountState.trialPhase !== TRIAL_PHASES.playing) return;
  clearIntervalHighlights();
  mountState.trialPhase = TRIAL_PHASES.awaitingResponse;
  if (runner) runner.dataset.trialPhase = mountState.trialPhase;
  mountState.responseOpen = true;
  setResponseDisabled(false);
  if (status) status.textContent = t(questionFor(mountState.session.instrument));
  mountState.app.querySelector('[data-au-response]')?.focus({ preventScroll: true });
}

function showInterval(index) {
  clearIntervalHighlights();
  state.app.querySelectorAll('[data-au-intervals] > div')[index]?.classList.add('is-live');
  const status = state.app.querySelector('[data-au-status]');
  if (status) status.textContent = t('Sound {number}', { number: index + 1 });
}

function clearIntervalHighlights() {
  for (const interval of state.app.querySelectorAll('[data-au-intervals] > div'))
    interval.classList.remove('is-live');
}

function questionFor(instrument) {
  if (instrument === 'headphones') return 'Which tone was quietest?';
  if (instrument === 'range') return 'Which interval contained the tone?';
  return 'Which tone was higher?';
}

function correctInterval(trial) {
  if (trial.kind === 'headphones') return trial.quietInterval;
  if (trial.kind === 'range') return trial.toneInterval;
  return trial.higherInterval;
}

function chooseInterval(selectedInterval) {
  if (
    !state.responseOpen ||
    state.trialPhase !== TRIAL_PHASES.awaitingResponse ||
    !state.activeTrial ||
    !state.session ||
    state.session.committedTrialIds.has(state.activeTrial.trialId)
  )
    return;
  state.responseOpen = false;
  setResponseDisabled(true);
  const trial = state.activeTrial;
  const correct = selectedInterval === correctInterval(trial);
  const feedbackMessage = t(feedbackText(correct));
  state.session.committedTrialIds.add(trial.trialId);
  if (state.session.instrument === 'headphones') {
    if (state.session.block === 'scored') state.session.headphoneRecords.push({ ...trial, correct });
    state.session.index += 1;
  } else if (state.session.instrument === 'range') {
    recordRangeResponse(state.session.rangeTrack, trial, selectedInterval);
  } else {
    recordPitchResponse(state.session.pitchTracks, trial, selectedInterval);
  }
  state.trialPhase = TRIAL_PHASES.committedFeedback;
  state.lastFeedback = feedbackMessage;
  state.activeTrial = null;
  const runner = state.app.querySelector('[data-au-runner]');
  if (runner) runner.dataset.trialPhase = state.trialPhase;
  const feedback = state.app.querySelector('[data-au-feedback]');
  if (feedback) feedback.textContent = feedbackMessage;
  state.feedbackTimer = window.setTimeout(prepareNextTrial, state.config.feedbackMs);
}

function feedbackText(correct) {
  if (state.session.instrument === 'headphones' && state.session.block === 'practice')
    return correct ? 'Yes—that was the quieter tone.' : 'Listen for the tone with lower level.';
  if (state.session.instrument === 'range' && state.activeTrial.control)
    return correct ? 'Control tone found.' : 'Control tone missed; setup confidence will be limited.';
  return 'Response recorded.';
}

function finishHeadphoneBlock() {
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  document.body.classList.remove('au-running');
  if (state.session.block === 'practice') {
    state.app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">${t('Cuffie / practice complete')}</p><h1>${t('Now six measured trials.')}</h1><p>${t('The phase-based decoy appears only in the measured block. Keep the volume unchanged.')}</p><button class="ui-button ui-button--lg" type="button" data-action="au-begin-measured">${t('Begin headphone check')} <span aria-hidden="true">→</span></button></section>`;
    focusStage('h1', 'Cuffie practice complete.');
    return;
  }
  finishInstrument('headphones');
}

function finishInstrument(completed) {
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  document.body.classList.remove('au-running');
  if (completed === 'range' && state.session.scope === 'focused') {
    renderVolumeCheck();
    return;
  }
  const next = completed === 'headphones' ? 'range' : 'pitch';
  const summary =
    completed === 'headphones'
      ? summarizeHeadphones(state.session.headphoneRecords, state.config.headphones.passCorrect)
      : summarizeRange(state.session.rangeTrack);
  const line =
    completed === 'headphones'
      ? `${summary.correct} ${t('of')} ${summary.trials} ${t('quiet targets located. This is evidence about presentation, not proof of hardware.')}`
      : `${summary.trials} ${t('adaptive presentations recorded')}${summary.controlAccuracyPercent === null ? '' : `; control accuracy ${summary.controlAccuracyPercent}%`} ${t('without changing volume.')}`;
  state.app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">${INSTRUMENTS[completed].number}</span><p class="ui-eyebrow">${t('Instrument complete')}</p><h1>${t('Measurement recorded:')} ${t(INSTRUMENTS[completed].name)}.</h1><p>${line}</p><button class="ui-button ui-button--lg" type="button" data-action="au-next-stage" data-next="${next}">${t('Continue to')} ${t(INSTRUMENTS[next].name)} <span aria-hidden="true">→</span></button></section>`;
  focusStage('h1', '{name} complete.', { name: t(INSTRUMENTS[completed].name) });
}

function renderVolumeCheck() {
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  document.body.classList.remove('au-running');
  state.app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">Setup recheck</p><h1>Did the device volume stay unchanged?</h1><p>Answer honestly. A changed or uncertain volume keeps the observations visible but prevents a usable same-setup result.</p><div class="ui-cluster"><button class="ui-button ui-button--lg" type="button" data-action="au-volume-check" data-volume-consistent="true">Yes, unchanged</button><button class="ui-button ui-button--ghost" type="button" data-action="au-volume-check" data-volume-consistent="false">Changed or unsure</button></div></section>`;
  focusStage('h1', 'Confirm whether device volume stayed unchanged during the run.');
}

/** @param {boolean} consistent */
function finishVolumeCheck(consistent) {
  state.session.volumeConsistent = consistent;
  renderResults();
}

function updateRunnerMeta() {
  const count = state.app.querySelector('[data-au-count]');
  if (!count) return;
  if (state.session.instrument === 'headphones')
    count.textContent = `${state.session.index + 1} / ${state.session.queue.length}`;
  if (state.session.instrument === 'range') {
    const complete = state.session.rangeTrack.records.length;
    count.textContent = t('Adaptive · {count}', { count: complete + 1 });
  }
  if (state.session.instrument === 'pitch') {
    const complete = state.session.pitchTracks.reduce((sum, track) => sum + track.records.length, 0);
    count.textContent = t('Interleaved · {count}', { count: complete + 1 });
  }
}

function renderResults() {
  state.lifecycle.setActive(false);
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.udito);
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = t('Your listening observations — Udito | Sense6');
  const headphones = summarizeHeadphones(state.session.headphoneRecords, state.config.headphones.passCorrect);
  const range = summarizeRange(state.session.rangeTrack);
  const pitch = summarizePitch(state.session.pitchTracks);
  const includesPitch = state.session.scope === 'standard';
  const controlsOkay =
    range.expectedControls > 0 &&
    range.controlTrials === range.expectedControls &&
    range.controlAccuracyPercent === 100;
  const settled = (!includesPitch || pitch.every((item) => item.settled)) && range.settled;
  const interruptionFree = state.session.interruptions === 0;
  const usable =
    headphones.headphoneLike &&
    controlsOkay &&
    settled &&
    interruptionFree &&
    state.session.volumeConsistent === true;
  const setupQuality = usable ? 'Setup checks coherent' : 'Interpret with caution';
  const result = {
    headphones,
    range,
    pitch,
    usable,
    setupQuality,
    cautionReasons: resultCautionReasons({ headphones, range, pitch }),
  };
  state.session.result = result;

  state.app.innerHTML = `
    <section class="au-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-home"><span aria-hidden="true">←</span> ${m('nav.allTests')}</button>
      <header class="au-results__hero"><div><p class="ui-eyebrow">${t('Udito / this setup / this run')}</p><h1>${includesPitch ? t('Three listening measures.') : 'Two focused listening measures.'}<br><em>${t('No hearing label.')}</em></h1><p>${usable ? 'The setup checks and adaptive tracks produced coherent run-level observations.' : 'At least one setup check, interruption check, volume check, or adaptive track was limited. The observations remain visible, but comparison should wait for a steadier repeat.'}</p></div><div class="au-results__stamp ${usable ? '' : 'is-limited'}"><span>${t('Upper run boundary')}</span><strong>${formatHertz(range)}</strong><span>${t(setupQuality)}</span></div></header>
      <div data-au-persistence></div>
      <div class="au-result-grid">
        ${resultCard('01', 'Headphone confidence', headphones.headphoneLike ? 'Headphone-like' : 'Uncertain', `${headphones.correct} / ${headphones.trials}`, 'A phase-based presentation check, not hardware detection.')}
        ${resultCard('02', 'Upper run boundary', formatHertz(range), rangeDetail(range), range.atCeiling && range.settled ? 'Reached the technical frequency ceiling; your personal boundary may be higher.' : 'Relative to this device, self-reported unchanged volume, room, and audio sample rate.')}
        ${includesPitch ? resultCard('03a', 'Pitch step near 500 Hz', formatPitch(pitch, 500), pitchDetail(pitch, 500), 'Adaptive ending estimate for this run; reversal range is not estimate uncertainty.') : ''}
        ${includesPitch ? resultCard('03b', 'Pitch step near 2 kHz', formatPitch(pitch, 2000), pitchDetail(pitch, 2000), 'Reported separately; no composite hearing score is calculated.') : ''}
      </div>
      <div class="au-context-grid">
        <article class="ui-card"><p class="ui-eyebrow">${t('Run context')}</p><h2>${t('What travelled with the sound.')}</h2><dl><div><dt>${t('Listening setup')}</dt><dd>${deviceLabel(state.session.device)}</dd></div><div><dt>Connection</dt><dd>${connectionLabel(state.session.connection)}</dd></div><div><dt>${t('Audio context')}</dt><dd>${formatNumber(state.session.sampleRate)} Hz</dd></div><div><dt>Audibility anchors</dt><dd>200 Hz, 500 Hz, and 2 kHz confirmed</dd></div><div><dt>Volume</dt><dd>${state.session.volumeConsistent ? 'Self-reported unchanged' : 'Changed or unsure'}</dd></div><div><dt>${t('Portata controls')}</dt><dd>${formatControlAccuracy(range)}</dd></div><div><dt>${t('Interruptions')}</dt><dd>${state.session.interruptions}</dd></div></dl></article>
        <article class="ui-card"><p class="ui-eyebrow">${t('Interpretation boundary')}</p><h2>${t('Device-relative, never dB HL.')}</h2><p>${t('A browser knows digital amplitude, not sound pressure at your eardrum. Headphone response, fit, output, age, room noise, device processing, and the volume setting all shape these numbers.')}</p><p>${t('Do not infer hearing age, “normal” hearing, safety for work, or a medical diagnosis. If hearing concerns affect daily life, use calibrated clinical audiometry.')}</p>${state.locale === 'en' ? '<p class="au-results__learn"><a class="ui-link" data-sense6-route="hearing-range-guide" href="/en/hearing-range-guide/">Understand what a browser hearing test can tell you →</a></p>' : ''}</article>
      </div>
      <aside class="au-results__safety"><strong>${t('Keep the same volume only for comparison.')}</strong><p>${t('Compare your own runs only with the same device, headphones, fit, room, and volume. Stop testing if any sound is uncomfortable.')}</p></aside>
      <div class="ui-cluster au-results__actions"></div>
    </section>`;
  saveLast({ setupQuality, sampleRate: state.session.sampleRate, recordedAt: Date.now() });
  const journalOutcome = saveJournalResult(result);
  const journalSaved = journalOutcome === 'saved';
  const journalNote = journalStatusNote(journalOutcome);
  const persistence = state.app.querySelector('[data-au-persistence]');
  if (persistence) {
    persistence.outerHTML = `<div class="ui-alert ${journalSaved ? 'ui-alert--success' : 'ui-alert--danger'}" data-au-journal-status role="${journalSaved ? 'status' : 'alert'}"><strong class="ui-alert__title">${t(journalSaved ? 'Saved to the private journal on this device.' : 'Journal entry not saved.')}</strong><p class="ui-alert__body">${journalNote}</p></div>`;
  }
  const actions = state.app.querySelector('.au-results__actions');
  if (actions) {
    actions.innerHTML = `<button class="ui-button" type="button" data-action="au-restart">${t('Repeat this scope independently')}</button><button class="ui-button ui-button--ghost" type="button" data-action="au-copy">${resultActionLabel(t)}</button>${journalSaved ? `<button class="ui-button ui-button--ghost" type="button" data-action="au-journal">${t('Open private journal')}</button>` : ''}`;
  }
  focusStage(
    'h1',
    journalSaved
      ? 'Udito results ready. {quality}. Saved to the private journal.'
      : 'Udito results ready. {quality}. The journal entry was not saved.',
    { quality: t(setupQuality) },
  );
}

/** @param {import('../lib/journal.js').JournalSaveOutcome} outcome */
function journalStatusNote(outcome) {
  if (outcome === 'saved')
    return t('The structured run context is available for later same-setup comparison.');
  if (outcome === 'invalid')
    return t(
      'This run did not match the journal record format, so it was not saved. Copy the summary to keep it.',
    );
  return t(
    'The result remains available here and can still be copied, but it was not added to the private journal.',
  );
}

function resultCard(index, label, value, detail, copy) {
  const headingId = `au-metric-${index}`;
  return `<article class="au-metric" aria-labelledby="${headingId}"><div><span>${index}</span><h2 id="${headingId}">${t(label)}</h2></div><strong>${t(value)}</strong><small>${detail}</small><p>${t(copy)}</p></article>`;
}

function formatHertz(result) {
  if (result.thresholdHz === null) return t('Not settled');
  return `${result.atCeiling ? '≥ ' : ''}${formatNumber(result.thresholdHz)} Hz`;
}

function rangeDetail(result) {
  const completion = completionReasonLabel(result.completionReason);
  const spread = result.reversalRangeHz
    ? ` · reversal range ${formatNumber(result.reversalRangeHz)} Hz (not uncertainty)`
    : '';
  return `${completion} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

function formatPitch(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  return !result || result.thresholdPercent === null ? t('Not settled') : `${result.thresholdPercent}%`;
}

function pitchDetail(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  if (!result) return 'Track unavailable';
  const spread = result.reversalRangePercent
    ? ` · reversal range ${result.reversalRangePercent}% (not uncertainty)`
    : '';
  return `${completionReasonLabel(result.completionReason)} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

function completionReasonLabel(reason) {
  return t(
    {
      converged: 'Converged to the configured reversal target',
      'technical-ceiling': 'Bounded at the technical frequency ceiling',
      'max-trials': 'Maximum trials reached before convergence',
      incomplete: 'Incomplete',
    }[reason] ?? 'Incomplete',
  );
}

function deviceLabel(device) {
  return t(
    {
      headphones: 'Over-ear / on-ear',
      earbuds: 'Earbuds / in-ear',
      assistive: 'Usual assistive setup',
      other: 'Other / unsure',
    }[device] ?? 'Other / unsure',
  );
}

function connectionLabel(connection) {
  return (
    {
      wired: 'Wired',
      wireless: 'Wireless / Bluetooth',
      integrated: 'Built-in / assistive route',
      other: 'Other / unsure',
    }[connection] ?? 'Other / unsure'
  );
}

function formatControlAccuracy(range) {
  const accuracy =
    range.controlAccuracyPercent === null ? t('Not sampled') : `${range.controlAccuracyPercent}%`;
  return `${accuracy} (${range.controlTrials}/${range.expectedControls} controls)`;
}

function resultCautionReasons({ headphones, range, pitch }) {
  const reasons = [];
  if (state.session.volumeConsistent !== true) reasons.push('Device volume changed or was uncertain');
  if (!headphones.headphoneLike)
    reasons.push(`Cuffie found ${headphones.correct}/${headphones.trials} quiet targets`);
  if (range.controlTrials < range.expectedControls)
    reasons.push(`Portata sampled ${range.controlTrials}/${range.expectedControls} controls`);
  else if (range.controlAccuracyPercent === null) reasons.push('Portata controls were not sampled');
  else if (range.controlAccuracyPercent < 100)
    reasons.push(`Portata control accuracy was ${range.controlAccuracyPercent}%`);
  if (!range.settled) reasons.push(`Portata: ${completionReasonLabel(range.completionReason).toLowerCase()}`);
  for (const item of state.session.scope === 'standard' ? pitch : []) {
    if (!item.settled)
      reasons.push(
        `Intonazione near ${formatNumber(item.anchorHz)} Hz: ${completionReasonLabel(item.completionReason).toLowerCase()}`,
      );
  }
  if (state.session.interruptions)
    reasons.push(
      `${state.session.interruptions} playback interruption${state.session.interruptions === 1 ? '' : 's'}`,
    );
  return reasons;
}

function pauseRun(message = 'This playback was interrupted.', { setupRequired = false } = {}) {
  if (!runnerActive()) return;
  const pausedFrom = state.trialPhase;
  stopPlayback();
  state.pausePromise = state.audio?.suspend().catch(() => {}) ?? Promise.resolve();
  state.session.interruptions += 1;
  state.pausedFrom = pausedFrom;
  state.trialPhase = TRIAL_PHASES.paused;
  document.body.classList.remove('au-running');
  const committed = pausedFrom === TRIAL_PHASES.committedFeedback;
  const explanation = setupRequired
    ? 'The audio route may have changed, so the completed reference no longer bounds this setup. Return to setup before any more trials.'
    : committed
      ? 'The recorded response is kept exactly once. Resume with the next trial.'
      : 'No response was recorded for this presentation. Resume to replay the same trial from the beginning.';
  const primaryAction = setupRequired ? 'au-restart' : 'au-resume';
  const primaryLabel = setupRequired
    ? 'Return to audio setup'
    : committed
      ? 'Continue after recorded response'
      : 'Replay this trial';
  state.app.innerHTML = `<section class="au-transition ui-container" data-au-paused data-resume-mode="${setupRequired ? 'setup' : committed ? 'advance' : 'replay'}"><span class="au-transition__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Listening paused</p><h1>${message}</h1><p>${explanation}</p><div class="ui-cluster au-pause__actions"><button class="ui-button ui-button--lg" type="button" data-action="${primaryAction}">${primaryLabel} <span aria-hidden="true">→</span></button><button class="ui-button ui-button--ghost" type="button" data-action="au-stop">End run and return to Udito</button></div></section>`;
  focusStage('h1', 'Listening paused. {explanation}', { explanation: t(explanation) });
}

async function resumeRun() {
  const mountState = state;
  if (!mountState) return;
  const operation = mountState.playbackOperation;
  await mountState.pausePromise;
  if (!isCurrentPlayback(mountState, operation)) return;
  if (!mountState.session || mountState.trialPhase !== TRIAL_PHASES.paused) return;
  const resumeFrom = mountState.pausedFrom;
  renderRunner();
  if (resumeFrom === TRIAL_PHASES.committedFeedback) {
    prepareNextTrial();
  } else {
    updateRunnerMeta();
    playTrial();
  }
}

function stopSafely() {
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  renderIntro();
  toast(t('Listening stopped. No unfinished result was saved.'));
}

function handleAudioStateChange(contextState) {
  if (!state || contextState === 'running') return;
  if (state.app.querySelector('[data-au-reference-status]')) {
    invalidateReference(
      'Audio output paused or changed. Play the maximum-level reference again before beginning.',
    );
  }
  pauseRun('The audio context stopped before the presentation completed.');
}

function handleOutputDeviceChange() {
  if (!state) return;
  if (state.app.querySelector('[data-au-reference-status]')) {
    invalidateReference(
      'The available audio outputs changed. Confirm the route and play the maximum-level reference again.',
    );
  }
  if (!state.session || state.session.result) return;
  if (runnerActive()) {
    pauseRun('The available audio output changed.', { setupRequired: true });
    return;
  }
  renderSetup();
  invalidateReference(
    'The available audio outputs changed. Confirm the route and play the maximum-level reference again.',
  );
}

async function copyResults() {
  const mountState = state;
  if (!mountState?.session?.result) return;
  const { headphones, range, pitch, usable, setupQuality, cautionReasons } = mountState.session.result;
  const text = [
    t('Udito — device-relative listening observations'),
    t('Run quality: {quality}', { quality: t(setupQuality) }),
    t('Setup: {device}; {connection}; {sampleRate} Hz audio context', {
      device: t(deviceLabel(state.session.device)),
      connection: t(connectionLabel(state.session.connection)),
      sampleRate: formatNumber(state.session.sampleRate),
    }),
    `Volume: ${state.session.volumeConsistent ? 'self-reported unchanged' : 'changed or unsure'} during the run; the browser could not verify it.`,
    t('Headphone confidence: {correct}/{trials} ({confidence})', {
      correct: headphones.correct,
      trials: headphones.trials,
      confidence: t(headphones.headphoneLike ? 'headphone-like' : 'uncertain'),
    }),
    t('Upper run boundary: {boundary}; {completion}; {reversals} reversals / {trials} trials', {
      boundary: formatHertz(range),
      completion: t(completionReasonLabel(range.completionReason)),
      reversals: range.reversals,
      trials: range.trials,
    }),
    t('Portata control accuracy: {accuracy}', { accuracy: formatControlAccuracy(range) }),
    ...(state.session.scope === 'standard' ? pitch : []).map((item) =>
      t('Pitch step near {anchor} Hz: {step}; {completion}; {reversals} reversals / {trials} trials', {
        anchor: formatNumber(item.anchorHz),
        step: formatPitch(pitch, item.anchorHz),
        completion: t(completionReasonLabel(item.completionReason)),
        reversals: item.reversals,
        trials: item.trials,
      }),
    ),
    t('Playback interruptions: {count}', { count: state.session.interruptions }),
    ...(usable
      ? []
      : [
          t('Interpret with caution: {evidence}', {
            evidence: cautionReasons.join('; '),
          }),
        ]),
    t('This is not dB HL, a hearing-age score, screening, or diagnosis.'),
  ].join('\n');
  try {
    const outcome = await shareOrCopyResult({
      title: t('Device-relative hearing lab — Udito | Sense6'),
      summary: text,
      route: 'udito',
      locale: mountState.locale,
    });
    if (!isCurrentMount(state, mountState)) return;
    if (outcome === 'copied') toast(t('Result summary copied.'));
  } catch {
    if (!isCurrentMount(state, mountState)) return;
    toast(t('Copy was unavailable in this browser.'));
  }
}

function setResponseDisabled(disabled) {
  for (const button of state.app.querySelectorAll('[data-au-response]')) button.disabled = disabled;
}

function stopPlayback(mountState = state) {
  if (!mountState) return;
  mountState.playbackOperation += 1;
  clearTimeout(mountState.feedbackTimer);
  mountState.feedbackTimer = 0;
  mountState.responseOpen = false;
  mountState.audio?.stop();
}

function beginPlaybackOperation(mountState) {
  mountState.playbackOperation += 1;
  return mountState.playbackOperation;
}

/** @param {typeof state} mountState */
function runnerActive(mountState = state) {
  return Boolean(mountState?.session) && RUNNER_PHASES.has(mountState.trialPhase);
}

function isCurrentPlayback(mountState, operation) {
  return isCurrentMount(state, mountState) && mountState.playbackOperation === operation;
}

function wireEvents(signal) {
  document.addEventListener(
    'click',
    (event) => {
      const action = event.target.closest('[data-action]');
      const response = event.target.closest('[data-au-response]');
      if (response) chooseInterval(Number(response.dataset.auResponse));
      if (!action) return;
      if (action.matches('a')) event.preventDefault();
      switch (action.dataset.action) {
        case 'au-home':
          state.goHome();
          break;
        case 'au-intro':
          renderIntro();
          break;
        case 'au-setup':
        case 'au-setup-closing':
          renderSetup();
          break;
        case 'au-method':
          state.app.querySelector('#au-method')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'au-reference':
          playReference();
          break;
        case 'au-anchors':
          playAudibilityAnchors();
          break;
        case 'au-scope':
          if (['focused', 'standard'].includes(action.dataset.scope)) {
            selectAudioScope(action.dataset.scope);
          }
          break;
        case 'au-start':
          startSession();
          break;
        case 'au-begin-stage':
          beginStage();
          break;
        case 'au-begin-measured':
          beginMeasuredHeadphones();
          break;
        case 'au-next-stage':
          state.session.instrument = action.dataset.next;
          state.session.block = 'adaptive';
          renderBrief(action.dataset.next);
          break;
        case 'au-resume':
          resumeRun();
          break;
        case 'au-volume-check':
          finishVolumeCheck(action.dataset.volumeConsistent === 'true');
          break;
        case 'au-stop':
          stopSafely();
          break;
        case 'au-restart':
          renderSetup();
          break;
        case 'au-copy':
          copyResults();
          break;
        case 'au-journal':
          state.goJournal();
          break;
      }
    },
    { signal },
  );
  document.addEventListener(
    'change',
    (event) => {
      if (event.target.matches('[data-au-consent], [data-au-anchors-confirmed]')) updateSetupGate();
      if (event.target.matches('[data-au-device], [data-au-connection]')) {
        invalidateReference(
          'The listening setup changed. Play the maximum-level reference again before beginning.',
        );
      }
    },
    {
      signal,
    },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape' &&
        state.session &&
        (runnerActive() || state.trialPhase === TRIAL_PHASES.paused)
      ) {
        event.preventDefault();
        stopSafely();
        return;
      }
      if (event.repeat || !state.responseOpen || !['1', '2', '3'].includes(event.key)) return;
      const selected = Number(event.key) - 1;
      if (state.app.querySelector(`[data-au-response="${selected}"]`)) {
        event.preventDefault();
        chooseInterval(selected);
      }
    },
    { signal },
  );
  document.addEventListener('visibilitychange', () => document.hidden && pauseRun(), { signal });
  navigator.mediaDevices?.addEventListener?.('devicechange', handleOutputDeviceChange, { signal });
}

/**
 * @param {string} selector
 * @param {string} announcement
 * @param {Record<string, string | number>} [values]
 */
function focusStage(selector, announcement, values = {}) {
  state.lifecycle.present(state.app, { focus: selector });
  const target = state.app.querySelector(selector);
  if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  if (state.announcer && announcement) state.announcer.textContent = t(announcement, values);
}

function runtimeConfig() {
  const override =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSE6_TEST_CONFIG__?.udito
      : null;
  return mergeHearingConfig(override);
}

function saveLast(result) {
  if (!RESULT_STORE.save(result)) {
    if (state.announcer)
      state.announcer.textContent = t('The result is ready, but local storage was unavailable.');
  }
}

/** @returns {import('../lib/journal.js').JournalSaveOutcome} */
function saveJournalResult(result) {
  const rangeMeasurement = {
    id: 'range-hz',
    value: result.range.thresholdHz,
    unit: 'Hz',
    ...(result.range.atCeiling && result.range.settled ? { bound: 'lower' } : {}),
  };
  return saveJournalRun({
    examId: 'udito',
    locale: state.locale,
    quality: result.usable ? 'usable' : 'caution',
    protocol: protocolPassport('udito', state.session.scope),
    setup: {
      ...captureDisplayPassport(),
      device: state.session.device,
      connection: state.session.connection,
      sampleRate: state.session.sampleRate,
      interruptions: state.session.interruptions,
      selfReportedVolumeConsistent: state.session.volumeConsistent,
      portataControlAccuracy: result.range.controlAccuracyPercent,
      portataControlTrials: result.range.controlTrials,
      portataExpectedControls: result.range.expectedControls,
      rangeCompletion: result.range.completionReason,
      pitch500Completion: result.pitch.find((pitch) => pitch.anchorHz === 500)?.completionReason ?? null,
      pitch2000Completion: result.pitch.find((pitch) => pitch.anchorHz === 2000)?.completionReason ?? null,
    },
    qualityEvidence: {
      headphoneCorrect: result.headphones.correct,
      headphoneTrials: result.headphones.trials,
      rangeTrials: result.range.trials,
      rangeReversals: result.range.reversals,
      rangeCompletion: result.range.completionReason,
      rangeControls: result.range.controlTrials,
      rangeExpectedControls: result.range.expectedControls,
      rangeControlAccuracy: result.range.controlAccuracyPercent,
      pitch500Trials: result.pitch.find((pitch) => pitch.anchorHz === 500)?.trials ?? 0,
      pitch500Reversals: result.pitch.find((pitch) => pitch.anchorHz === 500)?.reversals ?? 0,
      pitch2000Trials: result.pitch.find((pitch) => pitch.anchorHz === 2000)?.trials ?? 0,
      pitch2000Reversals: result.pitch.find((pitch) => pitch.anchorHz === 2000)?.reversals ?? 0,
      interruptions: state.session.interruptions,
      volumeConsistent: state.session.volumeConsistent,
    },
    measurements: [
      {
        id: 'headphone-confidence',
        value: result.headphones.correct,
        unit: `/ ${result.headphones.trials}`,
      },
      rangeMeasurement,
      ...(state.session.scope === 'standard' ? result.pitch : []).map((pitch) => ({
        id: `pitch-${pitch.anchorHz}`,
        value: pitch.thresholdPercent,
        unit: '%',
      })),
    ],
    notes: result.usable
      ? ['volume-self-reported-not-verified', 'device-relative-not-audiometry']
      : ['setup-check-limited', 'volume-self-reported-not-verified', ...result.cautionReasons],
  });
}

function loadLast() {
  return RESULT_STORE.load();
}

function isLatestResult(value) {
  return (
    isRecord(value) &&
    SETUP_QUALITIES.has(value.setupQuality) &&
    typeof value.sampleRate === 'number' &&
    Number.isFinite(value.sampleRate) &&
    value.sampleRate > 0 &&
    typeof value.recordedAt === 'number' &&
    Number.isFinite(value.recordedAt) &&
    value.recordedAt >= 0
  );
}
