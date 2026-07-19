import { toast } from '@ponchia/ui/behaviors';
import '../styles/udito.css';
import { formatNumber, t } from '../i18n.js';
import {
  createHeadphoneTrials,
  createPitchTracks,
  createRangeTrack,
  mergeHearingConfig,
  nextPitchTrial,
  nextRangeTrial,
  recordPitchResponse,
  recordRangeResponse,
  safeFrequencyCeiling,
  summarizeHeadphones,
  summarizePitch,
  summarizeRange,
} from '../lib/hearing.js';
import { HearingAudio } from '../lib/hearing-audio.js';
import { appendJournalEntry, captureDisplayPassport, createJournalEntry } from '../lib/journal.js';
import { createExamLifecycle } from '../lib/lifecycle.js';
import { seededRandom } from '../lib/random.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';

const STORAGE_KEY = 'sense6:udito:last';
const RESULT_STORE = createResultStore({ key: STORAGE_KEY, validate: isRecord });
const MOUNT_OWNER = Symbol('udito');
const TRIAL_PHASES = Object.freeze({
  idle: 'idle',
  playing: 'playing',
  awaitingResponse: 'awaiting-response',
  committedFeedback: 'committed-feedback',
  paused: 'paused',
});
const INSTRUMENTS = {
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
    trialPhase: TRIAL_PHASES.idle,
    pausedFrom: TRIAL_PHASES.idle,
    trialSequence: 0,
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
    if (mountState.audio) {
      mountState.audio.onStateChange = null;
      mountState.audio.onOutputChange = null;
    }
    mountState.audio?.close();
    mountState.audio = null;
    mountState.session = null;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  state.lifecycle.setActive(false);
  stopPlayback();
  state.session = null;
  state.referencePlayed = false;
  document.body.classList.remove('lab-mode', 'au-running');
  document.title = t('Device-relative hearing lab — Udito | Sense6');
  const previous = loadLast();

  state.app.innerHTML = `
    <section class="au-intro ui-container ui-container--wide">
      <button class="back-link exam-back" type="button" data-action="au-home"><span aria-hidden="true">←</span> All tests</button>
      <div class="au-hero">
        <div class="au-hero__copy">
          <p class="ui-eyebrow">Listening lab / three instruments / about 6 minutes</p>
          <h1>Listen for the boundary.<br><em>Keep the limits audible.</em></h1>
          <p class="au-lede">Udito checks headphone-like presentation, maps an upper audibility boundary, and estimates pitch discrimination at two frequencies. Every result belongs to this device, volume, room, and run.</p>
          <div class="ui-cluster au-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="au-setup">Prepare the sound lab <span aria-hidden="true">→</span></button>
            <button class="ui-link ui-link--cta" type="button" data-action="au-method">See the method</button>
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

      <section class="au-method section" id="au-method" aria-labelledby="au-method-title">
        <div class="section-heading">
          <div><p class="ui-eyebrow">Method and limits</p><h2 id="au-method-title">Three questions. No synthetic score.</h2></div>
          <p>The instruments stay separate because confidence in the setup is not the same thing as audibility or pitch discrimination.</p>
        </div>
        <ol class="au-instrument-list">
          ${Object.values(INSTRUMENTS)
            .map(
              (item) =>
                `<li><span>${item.number}</span><div><p class="ui-eyebrow ui-eyebrow--muted">${item.eyebrow}</p><h3>${item.name}</h3><p>${item.body}</p></div></li>`,
            )
            .join('')}
        </ol>
      </section>

      <section class="au-safety section" aria-labelledby="au-safety-title">
        <div><p class="ui-eyebrow">Before listening</p><h2 id="au-safety-title">Comfort sets the ceiling.</h2></div>
        <div class="au-safety__copy">
          <p>Start with device volume low. Raise it only until the reference is quiet and comfortable, never beyond about 60%. Then lock it for the whole run.</p>
          <p><strong>Never raise volume to chase a missing high tone.</strong> Stop immediately for discomfort, pain, pressure, or ringing.</p>
        </div>
      </section>

      <section class="au-research section" aria-labelledby="au-research-title">
        <div class="section-heading">
          <div><p class="ui-eyebrow">Research trail</p><h2 id="au-research-title">What informed Udito.</h2></div>
          <p>Established task structures inform the experiment. Consumer audio hardware remains uncalibrated.</p>
        </div>
        <div class="ui-grid au-research__grid">
          ${researchCard(
            'Headphone confidence',
            'Woods et al., 2017',
            'A six-trial, three-alternative phase-cancellation task informs Cuffie and its cautious setup language.',
            'https://doi.org/10.3758/s13414-017-1361-2',
          )}
          ${researchCard(
            'Adaptive thresholds',
            'Levitt, 1971',
            'Transformed up-down staircases inform the reversal-based Portata and Intonazione estimates.',
            'https://doi.org/10.1121/1.1912375',
          )}
          ${researchCard(
            'Browser psychoacoustics',
            'Grassi et al., 2024',
            'Web and mobile adaptive frequency-discrimination work supports the browser task structure—not clinical interpretation.',
            'https://pubmed.ncbi.nlm.nih.gov/38709452/',
          )}
          ${researchCard(
            'Safe listening',
            'WHO–ITU standard',
            'Safe-listening guidance informs the low reference, volume lock, short tones, and stop warnings.',
            'https://www.who.int/publications-detail-redirect/9789241515276',
          )}
        </div>
      </section>
    </section>
  `;
  focusStage('h1', 'Udito listening lab ready.');
}

function researchCard(eyebrow, title, body, href) {
  return `<article class="ui-card au-research__card"><p class="ui-eyebrow ui-eyebrow--muted">${eyebrow}</p><h3>${title}</h3><p>${body}</p><a class="ui-link" href="${href}" target="_blank" rel="noreferrer">Read the primary source <span aria-hidden="true">↗</span></a></article>`;
}

function renderSetup() {
  state.lifecycle.setActive(false);
  stopPlayback();
  state.referencePlayed = false;
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
          <h1>Quiet room.<br>Low volume.<br>Headphones.</h1>
          <p class="au-lede">Take off hearing protection only if you normally would. If you use hearing aids or another listening device, leave your usual setup unchanged and record it below.</p>
          ${
            supported
              ? `<div class="au-reference">
                  <button class="ui-button ui-button--ghost" type="button" data-action="au-reference">Play maximum-level reference</button>
                  <div class="au-reference__meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
                  <p data-au-reference-status role="status" aria-live="polite">Start device volume low before playing. This 1 kHz preview represents the loudest digital level used later; it does not measure acoustic output.</p>
                </div>`
              : `<div class="ui-notice ui-notice--danger" role="alert"><strong>Web Audio is unavailable.</strong><p>Udito cannot present controlled intervals in this browser. Try a current browser with audio enabled.</p></div>`
          }
          <label class="au-device-label">Listening setup
            <select data-au-device ${supported ? '' : 'disabled'}>
              <option value="headphones">Over-ear / on-ear headphones</option>
              <option value="earbuds">Earbuds / in-ear headphones</option>
              <option value="assistive">Usual hearing aid / assistive setup</option>
              <option value="other">Other / unsure</option>
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
          <label class="au-consent"><input type="checkbox" data-au-consent ${supported ? '' : 'disabled'}><span>The reference is quiet and comfortable; the room is quiet; I will not change volume or raise it to chase a tone; I understand this is not clinical audiometry.</span></label>
          <button class="ui-button ui-button--lg" type="button" data-action="au-start" disabled>Begin instrument 01 <span aria-hidden="true">→</span></button>
        </div>
        <aside class="au-setup__rules" aria-label="Safe listening rules">
          <p class="ui-eyebrow">Volume contract</p>
          <strong>≤ 60%</strong>
          <p>A device control, not a measured sound-pressure level. The browser cannot know dB SPL.</p>
          <ol><li>Start low</li><li>Find quiet comfort</li><li>Lock volume</li><li>Stop for discomfort</li></ol>
          <dl><div><dt>Upload</dt><dd>None</dd></div><div><dt>Microphone</dt><dd>Not used</dd></div><div><dt>Calibration</dt><dd>User-set only</dd></div></dl>
        </aside>
      </div>
    </section>
  `;
  focusStage('h1', 'Audio setup ready. Play the maximum-level reference before beginning.');
}

async function playReference() {
  const button = state.app.querySelector('[data-action="au-reference"]');
  const status = state.app.querySelector('[data-au-reference-status]');
  if (!button || !status) return;
  invalidateReference();
  button.disabled = true;
  button.textContent = t('Playing maximum-level reference…');
  status.textContent = t(
    'Keep this quiet and comfortable. Later signals use the same or a lower digital level.',
  );
  try {
    const completed = await state.audio.playReference();
    if (!completed || state.audio.state !== 'running') throw new Error('Reference did not complete');
    state.referencePlayed = true;
    button.textContent = t('Play reference again');
    status.textContent = t(
      'Reference completed on the audio clock · {sampleRate} Hz context · now leave volume unchanged.',
      { sampleRate: formatNumber(state.audio.sampleRate) },
    );
    updateSetupGate();
  } catch {
    invalidateReference(
      'The reference did not complete on the audio clock. Check browser audio output and play it again.',
    );
    button.textContent = t('Play reference again');
    toast('The reference sound did not complete.');
  } finally {
    button.disabled = false;
  }
}

function invalidateReference(message = '') {
  state.referencePlayed = false;
  updateSetupGate();
  const status = state.app.querySelector('[data-au-reference-status]');
  if (message && status) status.textContent = t(message);
}

function updateSetupGate() {
  const consent = state.app.querySelector('[data-au-consent]');
  const start = state.app.querySelector('[data-action="au-start"]');
  if (start) start.disabled = !(state.referencePlayed && consent?.checked);
}

function startSession() {
  const consent = state.app.querySelector('[data-au-consent]');
  if (!state.referencePlayed || !consent?.checked) {
    toast(t('Play the maximum-level reference and confirm the volume contract first.'));
    return;
  }
  const random = seededRandom(`${Date.now()}-${Math.random()}`);
  const maxHz = safeFrequencyCeiling(state.audio.sampleRate, state.config.range.maxHz);
  state.session = {
    instrument: 'headphones',
    block: null,
    queue: [],
    index: 0,
    random,
    device: state.app.querySelector('[data-au-device]')?.value ?? 'other',
    connection: state.app.querySelector('[data-au-connection]')?.value ?? 'other',
    sampleRate: state.audio.sampleRate,
    headphoneRecords: [],
    rangeTrack: createRangeTrack(maxHz, state.config.range),
    pitchTracks: createPitchTracks(state.config.pitch),
    interruptions: 0,
    outputChanges: 0,
    committedTrialIds: new Set(),
  };
  renderBrief('headphones');
}

function renderBrief(instrument) {
  state.lifecycle.setActive(true, t('Leave this listening run? Your progress will be lost.'));
  stopPlayback();
  state.session.instrument = instrument;
  const info = INSTRUMENTS[instrument];
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = `${t(info.name)} — Udito | Sense6`;
  state.app.innerHTML = `
    <section class="au-brief ui-container ui-container--wide">
      <div class="au-brief__index" aria-hidden="true">${info.number}</div>
      <div class="au-brief__copy">
        <p class="ui-eyebrow">Instrument ${info.number} of 03 / ${info.eyebrow}</p><h1>${info.title}</h1><p class="au-lede">${info.body}</p>
        <div class="au-brief__rules">${briefRules(instrument)}</div>
        <button class="ui-button ui-button--lg" type="button" data-action="au-begin-stage">${instrument === 'headphones' ? 'Start practice' : `Start ${info.name}`} <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
  focusStage('h1', `${info.name} instructions ready.`);
}

function briefRules(instrument) {
  if (instrument === 'headphones')
    return '<span>1</span><span>2</span><span>3</span><p>Choose the quietest tone. Two practice trials come first; the measured check is six trials.</p>';
  if (instrument === 'range')
    return '<span>1</span><span>2</span><span>3</span><p>Choose the interval containing the tone. Silence is a valid experience—guess without changing volume.</p>';
  return '<span>1</span><span>2</span><p>Choose which tone was higher. Loudness changes slightly on purpose, so follow pitch rather than loudness.</p>';
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
      <header class="au-runner__header"><div><p class="ui-eyebrow">${info.number} / ${info.name}</p><strong>${state.session.block === 'practice' ? 'Practice' : 'Adaptive run'}</strong></div><span data-au-count>Preparing…</span><button type="button" data-action="au-stop" aria-keyshortcuts="Escape">Stop safely</button></header>
      <div class="au-listening">
        <p class="au-listening__status" data-au-status role="status" aria-live="polite" tabindex="-1">Preparing the sounds…</p>
        <div class="au-intervals" data-au-intervals aria-hidden="true">${Array.from({ length: choices }, (_, index) => `<div><span>${index + 1}</span><i></i></div>`).join('')}</div>
        <div class="au-responses" aria-label="Sound interval choices">${Array.from({ length: choices }, (_, index) => `<button type="button" data-au-response="${index}" disabled><span>${index + 1}</span>${state.session.instrument === 'pitch' ? (index ? 'Second tone' : 'First tone') : `Interval ${index + 1}`}</button>`).join('')}</div>
        <div class="au-feedback" data-au-feedback role="status" aria-live="polite">${state.lastFeedback}</div>
      </div>
      <footer class="au-runner__footer"><span>Volume reported unchanged</span><span>Keys ${choices === 2 ? '1 · 2' : '1 · 2 · 3'}</span><span>Short ramped tones</span></footer>
    </section>`;
  focusStage('[data-au-status]', `${info.name} sound runner ready.`);
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
      renderResults();
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
  if (!state.activeTrial || !state.session) return;
  state.trialPhase = TRIAL_PHASES.playing;
  state.responseOpen = false;
  setResponseDisabled(true);
  const runner = state.app.querySelector('[data-au-runner]');
  if (runner) {
    runner.dataset.correctInterval = String(correctInterval(state.activeTrial));
    runner.dataset.trialId = state.activeTrial.trialId;
    runner.dataset.trialPhase = state.trialPhase;
  }
  const status = state.app.querySelector('[data-au-status]');
  if (status) status.textContent = t('Listen…');
  let completed = false;
  try {
    const onInterval = (index) => showInterval(index);
    if (state.session.instrument === 'headphones')
      completed = await state.audio.playHeadphoneTrial(state.activeTrial, onInterval);
    if (state.session.instrument === 'range')
      completed = await state.audio.playRangeTrial(state.activeTrial, onInterval);
    if (state.session.instrument === 'pitch')
      completed = await state.audio.playPitchTrial(state.activeTrial, onInterval);
  } catch {
    pauseRun('Audio playback was interrupted.');
    return;
  }
  if (!completed) {
    if (state.session && document.body.classList.contains('au-running'))
      pauseRun('Audio playback did not complete.');
    return;
  }
  if (!state.session || !document.body.classList.contains('au-running')) return;
  clearIntervalHighlights();
  state.trialPhase = TRIAL_PHASES.awaitingResponse;
  if (runner) runner.dataset.trialPhase = state.trialPhase;
  state.responseOpen = true;
  setResponseDisabled(false);
  if (status) status.textContent = t(questionFor(state.session.instrument));
  state.app.querySelector('[data-au-response]')?.focus({ preventScroll: true });
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
    state.app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">Cuffie / practice complete</p><h1>Now six measured trials.</h1><p>The phase-based decoy appears only in the measured block. Keep the volume unchanged.</p><button class="ui-button ui-button--lg" type="button" data-action="au-begin-measured">Begin headphone check <span aria-hidden="true">→</span></button></section>`;
    focusStage('h1', 'Cuffie practice complete.');
    return;
  }
  finishInstrument('headphones');
}

function finishInstrument(completed) {
  stopPlayback();
  state.trialPhase = TRIAL_PHASES.idle;
  document.body.classList.remove('au-running');
  const next = completed === 'headphones' ? 'range' : 'pitch';
  const summary =
    completed === 'headphones'
      ? summarizeHeadphones(state.session.headphoneRecords, state.config.headphones.passCorrect)
      : summarizeRange(state.session.rangeTrack);
  const line =
    completed === 'headphones'
      ? `${summary.correct} of ${summary.trials} quiet targets located. This is evidence about presentation, not proof of hardware.`
      : `${summary.trials} adaptive presentations recorded${summary.controlAccuracyPercent === null ? '' : `; control accuracy ${summary.controlAccuracyPercent}%`} without changing volume.`;
  state.app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">${INSTRUMENTS[completed].number}</span><p class="ui-eyebrow">Instrument complete</p><h1>Measurement recorded: ${INSTRUMENTS[completed].name}.</h1><p>${line}</p><button class="ui-button ui-button--lg" type="button" data-action="au-next-stage" data-next="${next}">Continue to ${INSTRUMENTS[next].name} <span aria-hidden="true">→</span></button></section>`;
  focusStage('h1', `${INSTRUMENTS[completed].name} complete.`);
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
  document.title = t('Your listening profile — Udito | Sense6');
  const headphones = summarizeHeadphones(state.session.headphoneRecords, state.config.headphones.passCorrect);
  const range = summarizeRange(state.session.rangeTrack);
  const pitch = summarizePitch(state.session.pitchTracks);
  const controlsOkay =
    range.expectedControls > 0 &&
    range.controlTrials === range.expectedControls &&
    range.controlAccuracyPercent === 100;
  const settled = pitch.every((item) => item.settled) && range.settled;
  const interruptionFree = state.session.interruptions === 0;
  const usable = headphones.headphoneLike && controlsOkay && settled && interruptionFree;
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
  saveLast({ setupQuality, sampleRate: state.session.sampleRate, recordedAt: Date.now() });
  const journalSaved = saveJournalResult(result);
  state.session.journalSaved = journalSaved;

  state.app.innerHTML = `
    <section class="au-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-home"><span aria-hidden="true">←</span> All tests</button>
      <header class="au-results__hero"><div><p class="ui-eyebrow">Udito / this setup / this run</p><h1>Three listening measures.<br><em>No hearing label.</em></h1><p>${usable ? 'The setup checks and adaptive tracks produced a coherent run-level profile.' : 'At least one setup check, interruption check, or adaptive track was limited. The observations remain visible, but comparison should wait for a steadier repeat.'}</p></div><div class="au-results__stamp ${usable ? '' : 'is-limited'}"><span>${setupQuality}</span><strong>03 / 03</strong></div></header>
      <div class="ui-notice ${journalSaved ? '' : 'ui-notice--danger'}" data-au-journal-status role="${journalSaved ? 'status' : 'alert'}"><strong>${journalSaved ? 'Saved to the private journal on this device.' : 'Journal entry not saved.'}</strong><p>${journalSaved ? 'The structured run context is available for later same-setup comparison.' : 'The result remains available here and can still be copied, but it was not added to the private journal.'}</p></div>
      <div class="au-result-grid">
        ${resultCard('01', 'Headphone confidence', headphones.headphoneLike ? 'Headphone-like' : 'Uncertain', `${headphones.correct} / ${headphones.trials}`, 'A phase-based presentation check, not hardware detection.')}
        ${resultCard('02', 'Upper run boundary', formatHertz(range), rangeDetail(range), range.atCeiling && range.settled ? 'Reached the technical frequency ceiling; your personal boundary may be higher.' : 'Relative to this device, self-reported unchanged volume, room, and audio sample rate.')}
        ${resultCard('03a', 'Pitch step near 500 Hz', formatPitch(pitch, 500), pitchDetail(pitch, 500), 'Reversal-based just-noticeable difference for this run.')}
        ${resultCard('03b', 'Pitch step near 2 kHz', formatPitch(pitch, 2000), pitchDetail(pitch, 2000), 'Reported separately; no composite hearing score is calculated.')}
      </div>
      <div class="au-context-grid">
        <article class="ui-card"><p class="ui-eyebrow">Run context</p><h2>What travelled with the sound.</h2><dl><div><dt>Listening setup</dt><dd>${deviceLabel(state.session.device)}</dd></div><div><dt>Connection</dt><dd>${connectionLabel(state.session.connection)}</dd></div><div><dt>Audio context</dt><dd>${formatNumber(state.session.sampleRate)} Hz</dd></div><div><dt>Volume</dt><dd>Self-reported unchanged</dd></div><div><dt>Portata controls</dt><dd>${formatControlAccuracy(range)}</dd></div><div><dt>Interruptions</dt><dd>${state.session.interruptions}</dd></div></dl></article>
        <article class="ui-card"><p class="ui-eyebrow">Interpretation boundary</p><h2>Device-relative, never dB HL.</h2><p>A browser knows digital amplitude, not sound pressure at your eardrum. Headphone response, fit, output, age, room noise, device processing, and the volume setting all shape these numbers.</p><p>Do not infer hearing age, “normal” hearing, safety for work, or a medical diagnosis. If hearing concerns affect daily life, use calibrated clinical audiometry.</p></article>
      </div>
      <aside class="au-results__safety"><strong>Keep the same volume only for comparison.</strong><p>Compare your own runs only with the same device, headphones, fit, room, and volume. Stop testing if any sound is uncomfortable.</p></aside>
      <div class="ui-cluster au-results__actions"><button class="ui-button" type="button" data-action="au-restart">Run again</button><button class="ui-button ui-button--ghost" type="button" data-action="au-copy">Copy result summary</button>${journalSaved ? '<button class="ui-button ui-button--ghost" type="button" data-action="au-journal">Open private journal</button>' : ''}</div>
    </section>`;
  focusStage(
    'h1',
    journalSaved
      ? `Udito results ready. ${setupQuality}. Saved to the private journal.`
      : `Udito results ready. ${setupQuality}. The journal entry was not saved.`,
  );
}

function resultCard(index, label, value, detail, copy) {
  const headingId = `au-metric-${index}`;
  return `<article class="au-metric" aria-labelledby="${headingId}"><div><span>${index}</span><h2 id="${headingId}">${label}</h2></div><strong>${value}</strong><small>${detail}</small><p>${copy}</p></article>`;
}

function formatHertz(result) {
  if (result.thresholdHz === null) return 'Not settled';
  return `${result.atCeiling ? '≥ ' : ''}${formatNumber(result.thresholdHz)} Hz`;
}

function rangeDetail(result) {
  const completion = completionReasonLabel(result.completionReason);
  const spread = result.spreadHz ? ` · reversal spread ${formatNumber(result.spreadHz)} Hz` : '';
  return `${completion} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

function formatPitch(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  return !result || result.thresholdPercent === null ? 'Not settled' : `${result.thresholdPercent}%`;
}

function pitchDetail(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  if (!result) return 'Track unavailable';
  const spread = result.spreadPercent ? ` · reversal spread ${result.spreadPercent}%` : '';
  return `${completionReasonLabel(result.completionReason)} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

function completionReasonLabel(reason) {
  return (
    {
      converged: 'Converged to the configured reversal target',
      'technical-ceiling': 'Bounded at the technical frequency ceiling',
      'max-trials': 'Maximum trials reached before convergence',
      incomplete: 'Incomplete',
    }[reason] ?? 'Incomplete'
  );
}

function deviceLabel(device) {
  return (
    {
      headphones: 'Over-ear / on-ear',
      earbuds: 'Earbuds / in-ear',
      assistive: 'Usual assistive setup',
      other: 'Other / unsure',
    }[device] ?? 'Other / unsure'
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
  const accuracy = range.controlAccuracyPercent === null ? 'Not sampled' : `${range.controlAccuracyPercent}%`;
  return `${accuracy} (${range.controlTrials}/${range.expectedControls} controls)`;
}

function resultCautionReasons({ headphones, range, pitch }) {
  const reasons = [];
  if (!headphones.headphoneLike)
    reasons.push(`Cuffie found ${headphones.correct}/${headphones.trials} quiet targets`);
  if (range.controlTrials < range.expectedControls)
    reasons.push(`Portata sampled ${range.controlTrials}/${range.expectedControls} controls`);
  else if (range.controlAccuracyPercent === null) reasons.push('Portata controls were not sampled');
  else if (range.controlAccuracyPercent < 100)
    reasons.push(`Portata control accuracy was ${range.controlAccuracyPercent}%`);
  if (!range.settled) reasons.push(`Portata: ${completionReasonLabel(range.completionReason).toLowerCase()}`);
  for (const item of pitch) {
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
  if (!state.session || !document.body.classList.contains('au-running')) return;
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
  focusStage('h1', `Listening paused. ${explanation}`);
}

async function resumeRun() {
  await state.pausePromise;
  if (!state.session || state.trialPhase !== TRIAL_PHASES.paused) return;
  const resumeFrom = state.pausedFrom;
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
  if (document.body.classList.contains('au-running')) {
    pauseRun('The audio context stopped before the presentation completed.');
  }
}

function handleOutputDeviceChange() {
  if (!state) return;
  if (state.app.querySelector('[data-au-reference-status]')) {
    invalidateReference(
      'The available audio outputs changed. Confirm the route and play the maximum-level reference again.',
    );
  }
  if (state.session && document.body.classList.contains('au-running')) {
    state.session.outputChanges += 1;
    pauseRun('The available audio output changed.', { setupRequired: true });
  } else if (state.session && state.app.querySelector('[data-au-paused]')) {
    state.session.outputChanges += 1;
    renderSetup();
    invalidateReference(
      'The available audio outputs changed. Confirm the route and play the maximum-level reference again.',
    );
  } else if (state.session) {
    state.session.outputChanges += 1;
    renderSetup();
    invalidateReference(
      'The available audio outputs changed. Confirm the route and play the maximum-level reference again.',
    );
  }
}

function copyResults() {
  if (!state.session?.result) return;
  const { headphones, range, pitch, usable, setupQuality, cautionReasons } = state.session.result;
  const text = [
    t('Udito — device-relative listening profile'),
    t('Run quality: {quality}', { quality: t(setupQuality) }),
    t('Setup: {device}; {connection}; {sampleRate} Hz audio context', {
      device: t(deviceLabel(state.session.device)),
      connection: t(connectionLabel(state.session.connection)),
      sampleRate: formatNumber(state.session.sampleRate),
    }),
    t('Volume: self-reported unchanged during the run; the browser could not verify it.'),
    t('Headphone confidence: {correct}/{trials} ({confidence})', {
      correct: headphones.correct,
      trials: headphones.trials,
      confidence: t(headphones.headphoneLike ? 'headphone-like' : 'uncertain'),
    }),
    t('Upper run boundary: {boundary}; {completion}; {reversals} reversals / {trials} trials', {
      boundary: formatHertz(range),
      completion: completionReasonLabel(range.completionReason),
      reversals: range.reversals,
      trials: range.trials,
    }),
    t('Portata control accuracy: {accuracy}', { accuracy: formatControlAccuracy(range) }),
    ...pitch.map((item) =>
      t('Pitch step near {anchor} Hz: {step}; {completion}; {reversals} reversals / {trials} trials', {
        anchor: formatNumber(item.anchorHz),
        step: formatPitch(pitch, item.anchorHz),
        completion: completionReasonLabel(item.completionReason),
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
  const copy = navigator.clipboard?.writeText(text);
  if (!copy) {
    toast(t('Copy was unavailable in this browser.'));
    return;
  }
  copy
    .then(() => toast(t('Result summary copied.')))
    .catch(() => toast(t('Copy was unavailable in this browser.')));
}

function setResponseDisabled(disabled) {
  for (const button of state.app.querySelectorAll('[data-au-response]')) button.disabled = disabled;
}

function stopPlayback() {
  clearTimeout(state.feedbackTimer);
  state.feedbackTimer = 0;
  state.responseOpen = false;
  state.audio?.stop();
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
          renderSetup();
          break;
        case 'au-method':
          state.app.querySelector('#au-method')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'au-reference':
          playReference();
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
      if (event.target.matches('[data-au-consent]')) updateSetupGate();
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
        (document.body.classList.contains('au-running') || state.app.querySelector('[data-au-paused]'))
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

function focusStage(selector, announcement) {
  state.lifecycle.present(state.app, { focus: selector });
  const target = state.app.querySelector(selector);
  if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  if (state.announcer && announcement) state.announcer.textContent = t(announcement);
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

function saveJournalResult(result) {
  const rangeMeasurement = {
    id: 'range-hz',
    value: result.range.thresholdHz,
    unit: 'Hz',
    ...(result.range.atCeiling && result.range.settled
      ? { bound: 'lower' }
      : !result.range.settled || result.range.spreadHz === null
        ? {}
        : { uncertainty: result.range.spreadHz / 2 }),
  };
  const entry = createJournalEntry({
    examId: 'udito',
    locale: state.locale,
    quality: result.usable ? 'usable' : 'caution',
    setup: {
      ...captureDisplayPassport(),
      device: state.session.device,
      connection: state.session.connection,
      sampleRate: state.session.sampleRate,
      interruptions: state.session.interruptions,
      selfReportedVolumeConsistent: true,
      portataControlAccuracy: result.range.controlAccuracyPercent,
      portataControlTrials: result.range.controlTrials,
      portataExpectedControls: result.range.expectedControls,
      rangeCompletion: result.range.completionReason,
      pitch500Completion: result.pitch.find((pitch) => pitch.anchorHz === 500)?.completionReason ?? null,
      pitch2000Completion: result.pitch.find((pitch) => pitch.anchorHz === 2000)?.completionReason ?? null,
    },
    measurements: [
      {
        id: 'headphone-confidence',
        value: result.headphones.correct,
        unit: `/ ${result.headphones.trials}`,
      },
      rangeMeasurement,
      ...result.pitch.map((pitch) => ({
        id: `pitch-${pitch.anchorHz}`,
        value: pitch.thresholdPercent,
        unit: '%',
        ...(!pitch.settled || pitch.spreadPercent === null ? {} : { uncertainty: pitch.spreadPercent / 2 }),
      })),
    ],
    notes: result.usable
      ? ['volume-self-reported-not-verified']
      : ['setup-check-limited', 'volume-self-reported-not-verified'],
  });
  return Boolean(entry && appendJournalEntry(entry));
}

function loadLast() {
  return RESULT_STORE.load();
}
