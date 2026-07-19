import { toast } from '@ponchia/ui/behaviors';
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
import { seededRandom } from '../lib/random.js';

export const meta = {
  id: 'udito',
  name: 'Udito',
  tagline: 'Headphone confidence, audibility & pitch',
  blurb:
    'Three listening instruments map this setup without pretending an uncalibrated browser is an audiometer.',
  accent: '#4cc9f0',
  duration: '≈ 6 min',
  glyph: 'U',
};

const STORAGE_KEY = 'sensoria:udito:last';
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
    body: 'One of three intervals contains a tone. Its frequency adapts to find the upper boundary available in this run, on this device, at the locked volume.',
  },
  pitch: {
    number: '03',
    name: 'Intonazione',
    eyebrow: 'Pitch discrimination',
    title: 'Which tone was higher?',
    body: 'Two tones play in sequence. Separate adaptive tracks estimate the smallest pitch step resolved around 500 Hz and 2 kHz.',
  },
};

let app = null;
let announcer = null;
let goHome = null;
let config = null;
let audio = null;
let session = null;
let activeTrial = null;
let responseOpen = false;
let feedbackTimer = 0;
let referencePlayed = false;

export function mount(context) {
  app = context.app;
  announcer = context.announcer;
  goHome = context.navigateHome;
  config = runtimeConfig();
  audio = new HearingAudio(config.audio);
  const controller = new AbortController();
  wireEvents(controller.signal);
  renderIntro();

  return () => {
    controller.abort();
    clearTimeout(feedbackTimer);
    audio?.close();
    audio = null;
    session = null;
    document.body.classList.remove('lab-mode', 'au-running');
  };
}

function renderIntro() {
  stopPlayback();
  session = null;
  referencePlayed = false;
  document.body.classList.remove('lab-mode', 'au-running');
  document.title = 'Device-relative hearing lab — Udito | Sensoria';
  const previous = loadLast();

  app.innerHTML = `
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
}

function researchCard(eyebrow, title, body, href) {
  return `<article class="ui-card au-research__card"><p class="ui-eyebrow ui-eyebrow--muted">${eyebrow}</p><h3>${title}</h3><p>${body}</p><a class="ui-link" href="${href}" target="_blank" rel="noreferrer">Read the primary source <span aria-hidden="true">↗</span></a></article>`;
}

function renderSetup() {
  stopPlayback();
  referencePlayed = false;
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = 'Prepare your audio setup — Udito | Sensoria';
  window.scrollTo({ top: 0, behavior: 'instant' });
  const supported = audio.supported;
  app.innerHTML = `
    <section class="au-setup ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="au-setup__grid">
        <div class="au-setup__copy">
          <p class="ui-eyebrow">Audio setup / volume locks after this screen</p>
          <h1>Quiet room.<br>Low volume.<br>Headphones.</h1>
          <p class="au-lede">Take off hearing protection only if you normally would. If you use hearing aids or another listening device, leave your usual setup unchanged and record it below.</p>
          ${
            supported
              ? `<div class="au-reference">
                  <button class="ui-button ui-button--ghost" type="button" data-action="au-reference">Play quiet reference</button>
                  <div class="au-reference__meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
                  <p data-au-reference-status aria-live="polite">Start device volume low before playing.</p>
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
}

async function playReference() {
  const button = app.querySelector('[data-action="au-reference"]');
  const status = app.querySelector('[data-au-reference-status]');
  if (!button || !status) return;
  button.disabled = true;
  button.textContent = 'Playing quiet reference…';
  status.textContent = 'Keep this quiet and comfortable.';
  try {
    await audio.playReference();
    referencePlayed = true;
    button.textContent = 'Play reference again';
    status.textContent = `Reference played · ${formatNumber(audio.sampleRate)} Hz audio context · now leave volume unchanged.`;
    updateSetupGate();
  } catch {
    status.textContent = 'Audio could not start. Check browser audio permissions and try again.';
    toast('The reference sound could not start.');
  } finally {
    button.disabled = false;
  }
}

function updateSetupGate() {
  const consent = app.querySelector('[data-au-consent]');
  const start = app.querySelector('[data-action="au-start"]');
  if (start) start.disabled = !(referencePlayed && consent?.checked);
}

function startSession() {
  const consent = app.querySelector('[data-au-consent]');
  if (!referencePlayed || !consent?.checked) {
    toast('Play the quiet reference and confirm the volume contract first.');
    return;
  }
  const random = seededRandom(`${Date.now()}-${Math.random()}`);
  const maxHz = safeFrequencyCeiling(audio.sampleRate, config.range.maxHz);
  session = {
    instrument: 'headphones',
    block: null,
    queue: [],
    index: 0,
    random,
    device: app.querySelector('[data-au-device]')?.value ?? 'other',
    sampleRate: audio.sampleRate,
    headphoneRecords: [],
    rangeTrack: createRangeTrack(maxHz, config.range),
    pitchTracks: createPitchTracks(config.pitch),
    interruptions: 0,
  };
  renderBrief('headphones');
}

function renderBrief(instrument) {
  stopPlayback();
  session.instrument = instrument;
  const info = INSTRUMENTS[instrument];
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = `${info.name} — Udito | Sensoria`;
  app.innerHTML = `
    <section class="au-brief ui-container ui-container--wide">
      <div class="au-brief__index" aria-hidden="true">${info.number}</div>
      <div class="au-brief__copy">
        <p class="ui-eyebrow">Instrument ${info.number} of 03 / ${info.eyebrow}</p><h1>${info.title}</h1><p class="au-lede">${info.body}</p>
        <div class="au-brief__rules">${briefRules(instrument)}</div>
        <button class="ui-button ui-button--lg" type="button" data-action="au-begin-stage">${instrument === 'headphones' ? 'Start practice' : `Start ${info.name}`} <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
}

function briefRules(instrument) {
  if (instrument === 'headphones')
    return '<span>1</span><span>2</span><span>3</span><p>Choose the quietest tone. Two practice trials come first; the measured check is six trials.</p>';
  if (instrument === 'range')
    return '<span>1</span><span>2</span><span>3</span><p>Choose the interval containing the tone. Silence is a valid experience—guess without changing volume.</p>';
  return '<span>1</span><span>2</span><p>Choose which tone was higher. Loudness changes slightly on purpose, so follow pitch rather than loudness.</p>';
}

function beginStage() {
  if (session.instrument === 'headphones') {
    session.block = 'practice';
    session.queue = createHeadphoneTrials({
      count: config.headphones.practiceTrials,
      practice: true,
      random: session.random,
    });
    session.index = 0;
  }
  renderRunner();
  prepareNextTrial();
}

function beginMeasuredHeadphones() {
  session.block = 'scored';
  session.queue = createHeadphoneTrials({
    count: config.headphones.scoredTrials,
    random: session.random,
  });
  session.index = 0;
  renderRunner();
  prepareNextTrial();
}

function renderRunner() {
  stopPlayback();
  document.body.classList.add('lab-mode', 'au-running');
  const info = INSTRUMENTS[session.instrument];
  const choices = session.instrument === 'pitch' ? 2 : 3;
  app.innerHTML = `
    <section class="au-runner" data-au-runner data-au-instrument="${session.instrument}">
      <header class="au-runner__header"><div><p class="ui-eyebrow">${info.number} / ${info.name}</p><strong>${session.block === 'practice' ? 'Practice' : 'Adaptive run'}</strong></div><span data-au-count>Preparing…</span><button type="button" data-action="au-stop">Stop safely</button></header>
      <div class="au-listening">
        <p class="au-listening__status" data-au-status aria-live="polite">Preparing the sounds…</p>
        <div class="au-intervals" data-au-intervals aria-hidden="true">${Array.from({ length: choices }, (_, index) => `<div><span>${index + 1}</span><i></i></div>`).join('')}</div>
        <div class="au-responses" aria-label="Sound interval choices">${Array.from({ length: choices }, (_, index) => `<button type="button" data-au-response="${index}" disabled><span>${index + 1}</span>${session.instrument === 'pitch' ? (index ? 'Second tone' : 'First tone') : `Interval ${index + 1}`}</button>`).join('')}</div>
        <div class="au-feedback" data-au-feedback aria-live="polite"></div>
      </div>
      <footer class="au-runner__footer"><span>Volume locked</span><span>Keys ${choices === 2 ? '1 · 2' : '1 · 2 · 3'}</span><span>Short ramped tones</span></footer>
    </section>`;
}

function prepareNextTrial() {
  if (!session) return;
  if (session.instrument === 'headphones') {
    if (session.index >= session.queue.length) {
      finishHeadphoneBlock();
      return;
    }
    activeTrial = session.queue[session.index];
  } else if (session.instrument === 'range') {
    if (session.rangeTrack.complete) {
      finishInstrument('range');
      return;
    }
    activeTrial = nextRangeTrial(session.rangeTrack, session.random);
  } else {
    activeTrial = nextPitchTrial(session.pitchTracks, session.random);
    if (!activeTrial) {
      renderResults();
      return;
    }
  }
  updateRunnerMeta();
  playTrial();
}

async function playTrial() {
  responseOpen = false;
  setResponseDisabled(true);
  const runner = app.querySelector('[data-au-runner]');
  if (runner) runner.dataset.correctInterval = String(correctInterval(activeTrial));
  const status = app.querySelector('[data-au-status]');
  const feedback = app.querySelector('[data-au-feedback]');
  if (status) status.textContent = 'Listen…';
  if (feedback) feedback.textContent = '';
  let completed = false;
  try {
    const onInterval = (index) => showInterval(index);
    if (session.instrument === 'headphones')
      completed = await audio.playHeadphoneTrial(activeTrial, onInterval);
    if (session.instrument === 'range') completed = await audio.playRangeTrial(activeTrial, onInterval);
    if (session.instrument === 'pitch') completed = await audio.playPitchTrial(activeTrial, onInterval);
  } catch {
    pauseRun('Audio playback was interrupted.');
    return;
  }
  if (!completed || !session || !document.body.classList.contains('au-running')) return;
  clearIntervalHighlights();
  responseOpen = true;
  setResponseDisabled(false);
  if (status) status.textContent = questionFor(session.instrument);
  app.querySelector('[data-au-response]')?.focus({ preventScroll: true });
}

function showInterval(index) {
  clearIntervalHighlights();
  app.querySelectorAll('[data-au-intervals] > div')[index]?.classList.add('is-live');
  const status = app.querySelector('[data-au-status]');
  if (status) status.textContent = `Sound ${index + 1}`;
}

function clearIntervalHighlights() {
  for (const interval of app.querySelectorAll('[data-au-intervals] > div'))
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
  if (!responseOpen || !activeTrial || !session) return;
  responseOpen = false;
  setResponseDisabled(true);
  const correct = selectedInterval === correctInterval(activeTrial);
  if (session.instrument === 'headphones') {
    if (session.block === 'scored') session.headphoneRecords.push({ ...activeTrial, correct });
    session.index += 1;
  } else if (session.instrument === 'range') {
    recordRangeResponse(session.rangeTrack, activeTrial, selectedInterval);
  } else {
    recordPitchResponse(session.pitchTracks, activeTrial, selectedInterval);
  }
  const feedback = app.querySelector('[data-au-feedback]');
  if (feedback) feedback.textContent = feedbackText(correct);
  feedbackTimer = window.setTimeout(prepareNextTrial, config.feedbackMs);
}

function feedbackText(correct) {
  if (session.instrument === 'headphones' && session.block === 'practice')
    return correct ? 'Yes—that was the quieter tone.' : 'Listen for the tone with lower level.';
  if (session.instrument === 'range' && activeTrial.control)
    return correct ? 'Control tone found.' : 'Control tone missed; setup confidence will be limited.';
  return 'Response recorded.';
}

function finishHeadphoneBlock() {
  stopPlayback();
  document.body.classList.remove('au-running');
  if (session.block === 'practice') {
    app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">Cuffie / practice complete</p><h1>Now six measured trials.</h1><p>The phase-based decoy appears only in the measured block. Keep the volume unchanged.</p><button class="ui-button ui-button--lg" type="button" data-action="au-begin-measured">Begin headphone check <span aria-hidden="true">→</span></button></section>`;
    return;
  }
  finishInstrument('headphones');
}

function finishInstrument(completed) {
  stopPlayback();
  document.body.classList.remove('au-running');
  const next = completed === 'headphones' ? 'range' : 'pitch';
  const summary =
    completed === 'headphones'
      ? summarizeHeadphones(session.headphoneRecords, config.headphones.passCorrect)
      : summarizeRange(session.rangeTrack);
  const line =
    completed === 'headphones'
      ? `${summary.correct} of ${summary.trials} quiet targets located. This is evidence about presentation, not proof of hardware.`
      : `${summary.trials} adaptive presentations recorded${summary.controlAccuracyPercent === null ? '' : `; control accuracy ${summary.controlAccuracyPercent}%`} without changing volume.`;
  app.innerHTML = `<section class="au-transition ui-container"><span class="au-transition__mark" aria-hidden="true">${INSTRUMENTS[completed].number}</span><p class="ui-eyebrow">Instrument complete</p><h1>Measurement recorded: ${INSTRUMENTS[completed].name}.</h1><p>${line}</p><button class="ui-button ui-button--lg" type="button" data-action="au-next-stage" data-next="${next}">Continue to ${INSTRUMENTS[next].name} <span aria-hidden="true">→</span></button></section>`;
}

function updateRunnerMeta() {
  const count = app.querySelector('[data-au-count]');
  if (!count) return;
  if (session.instrument === 'headphones')
    count.textContent = `${session.index + 1} / ${session.queue.length}`;
  if (session.instrument === 'range') {
    const complete = session.rangeTrack.records.length;
    count.textContent = `Adaptive · ${complete + 1}`;
  }
  if (session.instrument === 'pitch') {
    const complete = session.pitchTracks.reduce((sum, track) => sum + track.records.length, 0);
    count.textContent = `Interleaved · ${complete + 1}`;
  }
}

function renderResults() {
  stopPlayback();
  document.body.classList.add('lab-mode');
  document.body.classList.remove('au-running');
  document.title = 'Your listening profile — Udito | Sensoria';
  const headphones = summarizeHeadphones(session.headphoneRecords, config.headphones.passCorrect);
  const range = summarizeRange(session.rangeTrack);
  const pitch = summarizePitch(session.pitchTracks);
  const controlsOkay = range.controlAccuracyPercent === null || range.controlAccuracyPercent >= 50;
  const settled = pitch.every((item) => item.thresholdPercent !== null) && range.thresholdHz !== null;
  const usable = headphones.headphoneLike && controlsOkay && settled;
  const setupQuality = usable ? 'Setup checks coherent' : 'Interpret with caution';
  const result = { headphones, range, pitch, usable, setupQuality };
  session.result = result;
  saveLast({ setupQuality, sampleRate: session.sampleRate, recordedAt: Date.now() });

  app.innerHTML = `
    <section class="au-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-home"><span aria-hidden="true">←</span> All tests</button>
      <header class="au-results__hero"><div><p class="ui-eyebrow">Udito / this setup / this run</p><h1>Three listening measures.<br><em>No hearing label.</em></h1><p>${usable ? 'The setup checks and adaptive tracks produced a coherent run-level profile.' : 'At least one setup check or adaptive track did not settle. The observations remain visible, but comparison should wait for a steadier repeat.'}</p></div><div class="au-results__stamp ${usable ? '' : 'is-limited'}"><span>${setupQuality}</span><strong>03 / 03</strong></div></header>
      <div class="au-result-grid">
        ${resultCard('01', 'Headphone confidence', headphones.headphoneLike ? 'Headphone-like' : 'Uncertain', `${headphones.correct} / ${headphones.trials}`, 'A phase-based presentation check, not hardware detection.')}
        ${resultCard('02', 'Upper run boundary', formatHertz(range), range.spreadHz ? `spread ${formatNumber(range.spreadHz)} Hz` : 'boundary estimate', range.atCeiling ? 'Reached the device-safe test ceiling; your personal boundary may be higher.' : 'Relative to this device, fixed volume, room, and audio sample rate.')}
        ${resultCard('03a', 'Pitch step near 500 Hz', formatPitch(pitch, 500), pitchDetail(pitch, 500), 'Reversal-based just-noticeable difference for this run.')}
        ${resultCard('03b', 'Pitch step near 2 kHz', formatPitch(pitch, 2000), pitchDetail(pitch, 2000), 'Reported separately; no composite hearing score is calculated.')}
      </div>
      <div class="au-context-grid">
        <article class="ui-card"><p class="ui-eyebrow">Run context</p><h2>What travelled with the sound.</h2><dl><div><dt>Listening setup</dt><dd>${deviceLabel(session.device)}</dd></div><div><dt>Audio context</dt><dd>${formatNumber(session.sampleRate)} Hz</dd></div><div><dt>Portata controls</dt><dd>${range.controlAccuracyPercent === null ? 'Not sampled' : `${range.controlAccuracyPercent}%`}</dd></div><div><dt>Interruptions</dt><dd>${session.interruptions}</dd></div></dl></article>
        <article class="ui-card"><p class="ui-eyebrow">Interpretation boundary</p><h2>Device-relative, never dB HL.</h2><p>A browser knows digital amplitude, not sound pressure at your eardrum. Headphone response, fit, output, age, room noise, device processing, and the volume setting all shape these numbers.</p><p>Do not infer hearing age, “normal” hearing, safety for work, or a medical diagnosis. If hearing concerns affect daily life, use calibrated clinical audiometry.</p></article>
      </div>
      <aside class="au-results__safety"><strong>Keep the same volume only for comparison.</strong><p>Compare your own runs only with the same device, headphones, fit, room, and volume. Stop testing if any sound is uncomfortable.</p></aside>
      <div class="ui-cluster au-results__actions"><button class="ui-button" type="button" data-action="au-restart">Run again</button><button class="ui-button ui-button--ghost" type="button" data-action="au-copy">Copy result summary</button></div>
    </section>`;
}

function resultCard(index, label, value, detail, copy) {
  return `<article class="au-metric"><div><span>${index}</span><p>${label}</p></div><strong>${value}</strong><small>${detail}</small><p>${copy}</p></article>`;
}

function formatHertz(result) {
  if (result.thresholdHz === null) return 'Not settled';
  return `${result.atCeiling ? '≥ ' : ''}${formatNumber(result.thresholdHz)} Hz`;
}

function formatPitch(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  return result?.thresholdPercent === null ? 'Not settled' : `${result.thresholdPercent}%`;
}

function pitchDetail(results, anchorHz) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  return result?.spreadPercent ? `reversal spread ${result.spreadPercent}%` : 'adaptive estimate';
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

function pauseRun(message = 'This playback was interrupted.') {
  if (!session || !document.body.classList.contains('au-running')) return;
  stopPlayback();
  audio?.suspend();
  session.interruptions += 1;
  document.body.classList.remove('au-running');
  app.innerHTML = `<section class="au-transition ui-container" data-au-paused><span class="au-transition__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Listening paused</p><h1>${message}</h1><p>The current trial was discarded. Return when the tab can stay visible; the same trial will replay from the beginning.</p><button class="ui-button ui-button--lg" type="button" data-action="au-resume">Replay this trial <span aria-hidden="true">→</span></button></section>`;
}

function resumeRun() {
  renderRunner();
  updateRunnerMeta();
  playTrial();
}

function stopSafely() {
  stopPlayback();
  renderIntro();
  toast('Listening stopped. No unfinished result was saved.');
}

function copyResults() {
  if (!session?.result) return;
  const { headphones, range, pitch } = session.result;
  const text = [
    t('Udito — device-relative listening profile'),
    t('Setup: {device}; {sampleRate} Hz audio context', {
      device: t(deviceLabel(session.device)),
      sampleRate: formatNumber(session.sampleRate),
    }),
    t('Headphone confidence: {correct}/{trials} ({confidence})', {
      correct: headphones.correct,
      trials: headphones.trials,
      confidence: t(headphones.headphoneLike ? 'headphone-like' : 'uncertain'),
    }),
    t('Upper run boundary: {boundary}', { boundary: formatHertz(range) }),
    t('Pitch step near 500 Hz: {step}', { step: formatPitch(pitch, 500) }),
    t('Pitch step near 2 kHz: {step}', { step: formatPitch(pitch, 2000) }),
    t('This is not dB HL, a hearing-age score, screening, or diagnosis.'),
  ].join('\n');
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast('Result summary copied.'))
    .catch(() => toast('Copy was unavailable in this browser.'));
}

function setResponseDisabled(disabled) {
  for (const button of app.querySelectorAll('[data-au-response]')) button.disabled = disabled;
}

function stopPlayback() {
  clearTimeout(feedbackTimer);
  feedbackTimer = 0;
  responseOpen = false;
  audio?.stop();
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
          goHome();
          break;
        case 'au-intro':
          renderIntro();
          break;
        case 'au-setup':
          renderSetup();
          break;
        case 'au-method':
          app.querySelector('#au-method')?.scrollIntoView({ behavior: 'smooth' });
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
          session.instrument = action.dataset.next;
          session.block = 'adaptive';
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
      }
    },
    { signal },
  );
  document.addEventListener(
    'change',
    (event) => event.target.matches('[data-au-consent]') && updateSetupGate(),
    {
      signal,
    },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || !responseOpen || !['1', '2', '3'].includes(event.key)) return;
      const selected = Number(event.key) - 1;
      if (app.querySelector(`[data-au-response="${selected}"]`)) {
        event.preventDefault();
        chooseInterval(selected);
      }
    },
    { signal },
  );
  document.addEventListener('visibilitychange', () => document.hidden && pauseRun(), { signal });
}

function runtimeConfig() {
  const override =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSORIA_TEST_CONFIG__?.udito
      : null;
  return mergeHearingConfig(override);
}

function saveLast(result) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    if (announcer) announcer.textContent = 'The result is ready, but local storage was unavailable.';
  }
}

function loadLast() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
