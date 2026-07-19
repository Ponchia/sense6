import { toast } from '@ponchia/ui/behaviors';
import { t } from '../i18n.js';
import { seededRandom } from '../lib/random.js';
import {
  createChoiceSchedule,
  createSignalSchedule,
  mergeReflexConfig,
  randomWait,
  summarizeRiflessi,
} from '../lib/reflexes.js';

export const meta = {
  id: 'riflessi',
  name: 'Riflessi',
  tagline: 'Response speed, choice cost & consistency',
  blurb:
    'Three short instruments separate a simple visual response from decision cost and within-run stability.',
  accent: '#f4b942',
  duration: '≈ 7 min',
  glyph: 'R',
};

const STORAGE_KEY = 'sense6:riflessi:last';
const INSTRUMENTS = {
  signal: {
    number: '01',
    name: 'Segnale',
    eyebrow: 'Simple visual response',
    title: 'One signal. One action.',
    body: 'Wait while the chamber is quiet, then respond as soon as the central mark appears. Random waits make anticipation visible.',
    note: '8 practice responses, then 20 measured signals and 2 no-signal checks.',
  },
  choice: {
    number: '02',
    name: 'Scelta',
    eyebrow: 'Two-choice response',
    title: 'See a side. Choose it.',
    body: 'A left or right arrow appears. Respond on the matching side. The difference from Segnale estimates the cost of choosing.',
    note: '8 practice choices, then 32 balanced measured choices.',
  },
  stability: {
    number: '03',
    name: 'Tenuta',
    eyebrow: 'Sustained response',
    title: 'Keep the response steady.',
    body: 'For three minutes, respond to the same simple signal across longer, irregular waits. The pattern within this run matters more than one fastest press.',
    note: 'A 3-minute PVT-B-inspired sequence. No fatigue or attention diagnosis is inferred.',
  },
};

let app = null;
let announcer = null;
let goHome = null;
let session = null;
let config = null;
let selectedMode = 'keyboard';
let timeoutId = 0;
let deadlineId = 0;
let clockId = 0;
let frameId = 0;
let activeTrial = null;
let trialState = 'idle';
let onsetAt = 0;
let expectedOnsetAt = 0;

export function mount(context) {
  app = context.app;
  announcer = context.announcer;
  goHome = context.navigateHome;
  selectedMode = window.matchMedia?.('(pointer: coarse)').matches ? 'pointer' : 'keyboard';
  config = runtimeConfig();

  const controller = new AbortController();
  wireEvents(controller.signal);
  renderIntro();

  return () => {
    controller.abort();
    stopClocks();
    session = null;
    document.body.classList.remove('lab-mode', 'rx-running');
  };
}

function renderIntro() {
  stopClocks();
  session = null;
  document.body.classList.remove('lab-mode', 'rx-running');
  document.title = 'Response speed and consistency — Riflessi | Sense6';
  const previous = loadLast();

  app.innerHTML = `
    <section class="rx-intro ui-container ui-container--wide">
      <button class="back-link exam-back" type="button" data-action="rx-home">
        <span aria-hidden="true">←</span> All tests
      </button>
      <div class="rx-hero">
        <div class="rx-hero__copy">
          <p class="ui-eyebrow">Response lab / three instruments / about 7 minutes</p>
          <h1>Notice the signal.<br><em>Measure the response.</em></h1>
          <p class="rx-lede">
            Riflessi separates simple response speed, the extra cost of choosing, and how
            responses change across a sustained run. It reports this device and this session—nothing broader.
          </p>
          <div class="ui-cluster rx-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="rx-setup">
              Prepare the lab <span aria-hidden="true">→</span>
            </button>
            <a class="ui-link ui-link--cta" href="#/riflessi" data-action="rx-method">See the method</a>
          </div>
          <p class="hero__limit"><span aria-hidden="true">◇</span> Browser and device latency remain in every measurement.</p>
          ${
            previous
              ? `<p class="previous-score">Last run on this browser: <strong>${previous.inputMode === 'pointer' ? 'touch / pointer' : 'keyboard'} input</strong></p>`
              : ''
          }
        </div>
        <div class="rx-hero__instrument" aria-hidden="true">
          <div class="rx-scope">
            <span class="rx-scope__ring"></span>
            <span class="rx-scope__signal"></span>
            <span class="rx-scope__sweep"></span>
          </div>
          <div class="rx-hero__readout"><span>Signal</span><strong>ready</strong><i></i></div>
        </div>
      </div>

      <section class="rx-method section" id="rx-method" aria-labelledby="rx-method-title">
        <div class="section-heading">
          <div>
            <p class="ui-eyebrow">Method and limits</p>
            <h2 id="rx-method-title">Three questions, kept separate.</h2>
          </div>
          <p>No percentile, “brain age,” or reflex rating. Each instrument answers a narrower question.</p>
        </div>
        <ol class="rx-instrument-list">
          ${Object.values(INSTRUMENTS)
            .map(
              (instrument) => `<li>
                <span>${instrument.number}</span>
                <div><p class="ui-eyebrow ui-eyebrow--muted">${instrument.eyebrow}</p><h3>${instrument.name}</h3><p>${instrument.body}</p></div>
              </li>`,
            )
            .join('')}
        </ol>
      </section>

      <section class="rx-research section" aria-labelledby="rx-research-title">
        <div class="section-heading">
          <div><p class="ui-eyebrow">Research trail</p><h2 id="rx-research-title">What informed Riflessi.</h2></div>
          <p>Established task structures inform the design. They do not validate an uncontrolled browser as a clinical instrument.</p>
        </div>
        <div class="ui-grid rx-research__grid">
          ${researchCard(
            'Simple and choice response',
            'Deary, Liewald & Nissan, 2011',
            'A transparent reaction-time task with practice, randomized intervals, and separate simple and choice measures.',
            'https://doi.org/10.3758/s13428-010-0024-1',
          )}
          ${researchCard(
            'Brief vigilance task',
            'Basner & Dinges, 2011',
            'The three-minute PVT-B informs the sustained-response duration and emphasis on lapses and false starts.',
            'https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/',
          )}
          ${researchCard(
            'Browser timing reality',
            'Bridges et al., 2020',
            'Browser experiments can be precise enough for many effects, while input hardware and presentation still add latency.',
            'https://doi.org/10.7717/peerj.9414',
          )}
        </div>
      </section>
    </section>
  `;
}

function researchCard(eyebrow, title, body, href) {
  return `<article class="ui-card rx-research__card">
    <p class="ui-eyebrow ui-eyebrow--muted">${eyebrow}</p><h3>${title}</h3><p>${body}</p>
    <a class="ui-link" href="${href}" target="_blank" rel="noreferrer">Read the primary source <span aria-hidden="true">↗</span></a>
  </article>`;
}

function renderSetup() {
  stopClocks();
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = 'Prepare your response setup — Riflessi | Sense6';
  window.scrollTo({ top: 0, behavior: 'instant' });

  app.innerHTML = `
    <section class="rx-setup ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="rx-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="rx-setup__grid">
        <div class="rx-setup__copy">
          <p class="ui-eyebrow">Input setup / before timing starts</p>
          <h1>Choose one response path.</h1>
          <p class="rx-lede">Use the same device and input mode when comparing runs. Keep this tab visible and silence interruptions.</p>
          <fieldset class="rx-mode-picker">
            <legend>How will you respond?</legend>
            <button class="rx-mode ${selectedMode === 'keyboard' ? 'is-selected' : ''}" type="button" data-action="rx-mode" data-mode="keyboard" aria-pressed="${selectedMode === 'keyboard'}">
              <span class="rx-mode__key" aria-hidden="true">space</span><strong>Keyboard</strong><small>Space, then ← / →</small>
            </button>
            <button class="rx-mode ${selectedMode === 'pointer' ? 'is-selected' : ''}" type="button" data-action="rx-mode" data-mode="pointer" aria-pressed="${selectedMode === 'pointer'}">
              <span class="rx-mode__tap" aria-hidden="true">●</span><strong>Touch / pointer</strong><small>Tap the chamber or side</small>
            </button>
          </fieldset>
          <label class="rx-consent">
            <input type="checkbox" data-rx-consent>
            <span>I understand this measures this browser, device, input, and moment—not a clinical trait.</span>
          </label>
          <button class="ui-button ui-button--lg" type="button" data-action="rx-start" disabled>
            Begin instrument 01 <span aria-hidden="true">→</span>
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
            <div><dt>Privacy</dt><dd>Local only</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  `;

  measureFrameCadence();
}

function selectMode(mode) {
  selectedMode = mode;
  for (const button of app.querySelectorAll('[data-action="rx-mode"]')) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

function startSession() {
  const consent = app.querySelector('[data-rx-consent]');
  if (!consent?.checked) {
    toast('Please acknowledge the device-relative limit before starting.');
    consent?.focus();
    return;
  }

  const seed = `${Date.now()}-${Math.random()}`;
  session = {
    inputMode: selectedMode,
    instrument: 'signal',
    block: null,
    queue: [],
    index: 0,
    records: { signal: [], choice: [], stability: [] },
    random: seededRandom(seed),
    diagnostics: {
      frameMedianMs: Number(app.querySelector('[data-rx-cadence]')?.dataset.frameMs) || null,
      droppedFrames: Number(app.querySelector('[data-rx-cadence]')?.dataset.dropped) || 0,
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
  stopClocks();
  session.instrument = instrument;
  session.block = null;
  const info = INSTRUMENTS[instrument];
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = `${info.name} — Riflessi | Sense6`;
  window.scrollTo({ top: 0, behavior: 'instant' });

  app.innerHTML = `
    <section class="rx-brief ui-container ui-container--wide">
      <div class="rx-brief__index" aria-hidden="true">${info.number}</div>
      <div class="rx-brief__copy">
        <p class="ui-eyebrow">Instrument ${info.number} of 03 / ${info.eyebrow}</p>
        <h1>${info.title}</h1>
        <p class="rx-lede">${info.body}</p>
        <p class="rx-brief__note"><span aria-hidden="true">◇</span>${info.note}</p>
        <div class="rx-instructions">${inputInstructions(instrument)}</div>
        <button class="ui-button ui-button--lg" type="button" data-action="rx-begin-stage">
          ${instrument === 'stability' ? 'Start the 3-minute run' : 'Start practice'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  `;
}

function inputInstructions(instrument) {
  if (session.inputMode === 'keyboard') {
    return instrument === 'choice'
      ? '<span class="rx-key">←</span><span class="rx-key">→</span><p>Rest one hand near the arrow keys. Use the matching key.</p>'
      : '<span class="rx-key rx-key--wide">space</span><p>Rest one thumb or finger on Space. Do not hold it down.</p>';
  }
  return instrument === 'choice'
    ? '<span class="rx-tap-icon">L</span><span class="rx-tap-icon">R</span><p>Keep two thumbs or fingers ready. Tap the matching side.</p>'
    : '<span class="rx-tap-icon">●</span><p>Keep one finger ready. Tap anywhere inside the chamber.</p>';
}

function beginStage() {
  if (session.instrument === 'stability') {
    session.block = 'scored';
    session.index = 0;
    session.stabilityEndsAt = performance.now() + config.stability.durationMs;
    renderRunner();
    deadlineId = window.setTimeout(finishCurrentInstrument, config.stability.durationMs);
    clockId = window.setInterval(updateRunnerProgress, 250);
    prepareStabilityTrial();
    return;
  }

  session.block = 'practice';
  session.index = 0;
  session.queue = makeSchedule(session.instrument, true);
  renderRunner();
  prepareQueuedTrial();
}

function beginScoredBlock() {
  session.block = 'scored';
  session.index = 0;
  session.queue = makeSchedule(session.instrument, false);
  renderRunner();
  prepareQueuedTrial();
}

function makeSchedule(instrument, practice) {
  if (instrument === 'signal') {
    return createSignalSchedule({
      trials: practice ? config.signal.practiceTrials : config.signal.scoredTrials,
      catches: practice ? 0 : config.signal.catchTrials,
      minWaitMs: config.signal.minWaitMs,
      maxWaitMs: config.signal.maxWaitMs,
      random: session.random,
    });
  }
  return createChoiceSchedule({
    trials: practice ? config.choice.practiceTrials : config.choice.scoredTrials,
    minWaitMs: config.choice.minWaitMs,
    maxWaitMs: config.choice.maxWaitMs,
    random: session.random,
  });
}

function renderRunner() {
  stopClocks();
  document.body.classList.add('lab-mode', 'rx-running');
  const info = INSTRUMENTS[session.instrument];
  const choice = session.instrument === 'choice';
  const stability = session.instrument === 'stability';

  app.innerHTML = `
    <section class="rx-runner" data-rx-instrument="${session.instrument}">
      <header class="rx-runner__header">
        <div><p class="ui-eyebrow">${info.number} / ${info.name}</p><strong data-rx-block>${stability ? 'Measured run' : session.block}</strong></div>
        <div class="rx-progress" aria-label="Instrument progress"><i data-rx-progress></i></div>
        <span class="rx-runner__count" data-rx-count>${stability ? formatClock(config.stability.durationMs) : `0 / ${session.queue.length}`}</span>
      </header>
      <div class="rx-chamber" data-rx-chamber data-rx-state="waiting">
        <div class="rx-chamber__status" aria-live="polite" data-rx-status>Wait for the signal</div>
        <div class="rx-target" data-rx-target aria-hidden="true">
          ${choice ? '<span class="rx-arrow" data-rx-arrow>→</span>' : '<span class="rx-flash"><i></i></span>'}
        </div>
        ${
          choice
            ? `<div class="rx-choice-zones">
                <button type="button" data-rx-response="left" aria-label="Respond left"><span aria-hidden="true">←</span><small>${session.inputMode === 'keyboard' ? 'left key' : 'tap left'}</small></button>
                <button type="button" data-rx-response="right" aria-label="Respond right"><span aria-hidden="true">→</span><small>${session.inputMode === 'keyboard' ? 'right key' : 'tap right'}</small></button>
              </div>`
            : `<button class="rx-response-pad" type="button" data-rx-response="signal" aria-label="Respond to signal">
                <span>${session.inputMode === 'keyboard' ? 'press space' : 'tap chamber'}</span>
              </button>`
        }
        <div class="rx-feedback" data-rx-feedback aria-live="polite"></div>
      </div>
      <footer class="rx-runner__footer">
        <span>Respond only after the signal</span><span>${session.inputMode === 'pointer' ? 'Touch / pointer' : 'Keyboard'} timing</span>
      </footer>
    </section>
  `;
  updateRunnerProgress();
}

function prepareQueuedTrial() {
  if (!session || session.index >= session.queue.length) {
    finishBlock();
    return;
  }
  activeTrial = session.queue[session.index];
  prepareTrial(activeTrial, config[session.instrument].responseTimeoutMs);
}

function prepareStabilityTrial() {
  if (!session || performance.now() >= session.stabilityEndsAt) {
    finishCurrentInstrument();
    return;
  }
  activeTrial = {
    kind: 'signal',
    waitMs: randomWait(config.stability.minWaitMs, config.stability.maxWaitMs, session.random),
  };
  prepareTrial(activeTrial, config.stability.responseTimeoutMs);
}

function prepareTrial(trial, responseTimeoutMs) {
  clearTrialClocks();
  trialState = 'waiting';
  onsetAt = 0;
  const chamber = app.querySelector('[data-rx-chamber]');
  chamber?.setAttribute('data-rx-state', 'waiting');
  const status = app.querySelector('[data-rx-status]');
  if (status) status.textContent = 'Wait for the signal';
  const feedback = app.querySelector('[data-rx-feedback]');
  if (feedback) feedback.textContent = '';
  const arrow = app.querySelector('[data-rx-arrow]');
  if (arrow && trial.side) {
    arrow.textContent = trial.side === 'left' ? '←' : '→';
    arrow.dataset.side = trial.side;
  }
  updateRunnerProgress();
  expectedOnsetAt = performance.now() + trial.waitMs;
  timeoutId = window.setTimeout(() => {
    if (trial.kind === 'catch') {
      trialState = 'catch';
      timeoutId = window.setTimeout(() => recordOutcome('catch-correct'), responseTimeoutMs);
      return;
    }
    frameId = requestAnimationFrame((timestamp) => revealSignal(timestamp, responseTimeoutMs));
  }, trial.waitMs);
}

function revealSignal(timestamp, responseTimeoutMs) {
  trialState = 'live';
  onsetAt = timestamp;
  session.diagnostics.onsets += 1;
  const tolerance = Math.max(12, (session.diagnostics.frameMedianMs || 16.7) * 1.5);
  if (timestamp - expectedOnsetAt > tolerance) session.diagnostics.lateOnsets += 1;
  const chamber = app.querySelector('[data-rx-chamber]');
  chamber?.setAttribute('data-rx-state', 'live');
  const status = app.querySelector('[data-rx-status]');
  if (status)
    status.textContent = session.instrument === 'choice' ? 'Choose the matching side' : 'Respond now';
  timeoutId = window.setTimeout(() => recordOutcome('miss'), responseTimeoutMs);
}

function handleResponse(response, event) {
  if (!session || !document.body.classList.contains('rx-running')) return;
  if (session.inputMode === 'keyboard' && event.type === 'pointerdown') return;
  if (session.inputMode === 'pointer' && event.type === 'keydown') return;

  if (trialState === 'waiting' || trialState === 'catch') {
    recordOutcome('false-start');
    return;
  }
  if (trialState !== 'live') return;

  const rt = eventTimestamp(event) - onsetAt;
  if (rt < config.anticipationMs) {
    recordOutcome('anticipation', rt);
    return;
  }
  if (session.instrument === 'choice') {
    recordOutcome(response === activeTrial.side ? 'correct' : 'wrong', rt);
    return;
  }
  recordOutcome('correct', rt);
}

function recordOutcome(outcome, rt = null) {
  if (!session || ['feedback', 'paused', 'idle'].includes(trialState)) return;
  clearTrialClocks();
  trialState = 'feedback';
  const isScored = session.block === 'scored';
  if (isScored && outcome !== 'catch-correct') {
    session.records[session.instrument].push({ outcome, rt });
  }
  const chamber = app.querySelector('[data-rx-chamber]');
  chamber?.setAttribute('data-rx-state', outcomeClass(outcome));
  const feedback = app.querySelector('[data-rx-feedback]');
  if (feedback) feedback.textContent = feedbackText(outcome, rt);

  if (session.instrument !== 'stability') session.index += 1;
  timeoutId = window.setTimeout(() => {
    if (!session) return;
    if (session.instrument === 'stability') {
      prepareStabilityTrial();
    } else {
      prepareQueuedTrial();
    }
  }, config.feedbackMs);
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
  if (session.block === 'practice') {
    renderPracticeComplete();
  } else {
    finishCurrentInstrument();
  }
}

function renderPracticeComplete() {
  const info = INSTRUMENTS[session.instrument];
  app.innerHTML = `
    <section class="rx-transition ui-container">
      <span class="rx-transition__mark" aria-hidden="true">✓</span>
      <p class="ui-eyebrow">${info.name} / practice complete</p>
      <h1>Now the measured block.</h1>
      <p>Keep the same hand position. Early responses, misses, and ${session.instrument === 'choice' ? 'wrong sides' : 'no-signal responses'} will be recorded.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-begin-scored">Begin measured block <span aria-hidden="true">→</span></button>
    </section>
  `;
}

function finishCurrentInstrument() {
  if (!session) return;
  stopClocks();
  document.body.classList.remove('rx-running');
  const completed = session.instrument;
  if (completed === 'stability') {
    renderResults();
    return;
  }
  const next = completed === 'signal' ? 'choice' : 'stability';
  const valid = session.records[completed].filter((record) => record.outcome === 'correct').length;
  const total = session.records[completed].length;
  app.innerHTML = `
    <section class="rx-transition ui-container">
      <span class="rx-transition__mark" aria-hidden="true">${INSTRUMENTS[completed].number}</span>
      <p class="ui-eyebrow">Instrument complete</p>
      <h1>Measurement recorded: ${INSTRUMENTS[completed].name}.</h1>
      <p>${valid} clean response${valid === 1 ? '' : 's'} captured across ${total} measured event${total === 1 ? '' : 's'}. Interpretation waits until all three instruments are complete.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-next-stage" data-next="${next}">
        Continue to ${INSTRUMENTS[next].name} <span aria-hidden="true">→</span>
      </button>
    </section>
  `;
}

function renderResults() {
  stopClocks();
  document.body.classList.add('lab-mode');
  document.body.classList.remove('rx-running');
  document.title = 'Your response profile — Riflessi | Sense6';
  const expectedStability = config.stability.durationMs < 10_000 ? 1 : 6;
  const result = summarizeRiflessi(session.records, {
    signal: config.signal.scoredTrials,
    choice: config.choice.scoredTrials,
    stability: expectedStability,
  });
  const timing = timingHealth(session.diagnostics);
  const stored = { ...result, inputMode: session.inputMode, timing: timing.label, recordedAt: Date.now() };
  saveLast(stored);
  session.result = result;

  app.innerHTML = `
    <section class="rx-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="rx-home"><span aria-hidden="true">←</span> All tests</button>
      <header class="rx-results__hero">
        <div>
          <p class="ui-eyebrow">Riflessi / this run / this device</p>
          <h1>Your response has <em>more than one dimension.</em></h1>
          <p>${result.usable ? 'The three instruments captured enough clean responses for a run-level profile.' : 'Several responses were interrupted or invalid. Treat the numbers as a partial run and repeat under steadier conditions.'}</p>
        </div>
        <div class="rx-results__stamp ${result.usable ? '' : 'is-limited'}"><span>${result.usable ? 'Run usable' : 'Limited run'}</span><strong>03 / 03</strong></div>
      </header>

      <div class="rx-result-grid">
        ${metricCard('01', 'Typical signal response', metric(result.signal.medianMs), 'ms', `Median of ${result.signal.valid} clean simple responses. Typical is more robust than your single fastest response.`)}
        ${metricCard('02', 'Choice response', metric(result.choice.medianMs), 'ms', `${metric(result.choice.accuracyPercent)}% correct across ${result.choice.attempts} valid choices.`)}
        ${metricCard('Δ', 'Choice cost', signedMetric(result.choice.costMs), 'ms', 'Difference between the choice and simple-response medians in this run.')}
        ${metricCard('03', 'Sustained response', metric(result.stability.medianMs), 'ms', `Median of ${result.stability.valid} clean responses across the sustained block.`)}
        ${metricCard('20%', 'Slow-response tail', signedMetric(result.stability.slowestGapMs), 'ms', 'How much slower the slowest fifth was than the sustained median.')}
        ${metricCard('↗', 'Within-run drift', signedMetric(result.stability.driftMs), 'ms', driftCopy(result.stability.driftMs))}
      </div>

      <div class="rx-result-notes">
        <article class="ui-card rx-events">
          <p class="ui-eyebrow">Response events</p><h2>What accompanied the medians.</h2>
          <dl>
            <div><dt>False starts</dt><dd>${result.events.falseStarts}</dd></div>
            <div><dt>Under ${config.anticipationMs} ms</dt><dd>${result.events.anticipations}</dd></div>
            <div><dt>Missed signals</dt><dd>${result.events.misses}</dd></div>
            <div><dt>Wrong choices</dt><dd>${result.events.wrongChoices}</dd></div>
          </dl>
        </article>
        <article class="ui-card rx-timing">
          <p class="ui-eyebrow">Timing context</p><h2>${timing.label}</h2><p>${timing.copy}</p>
          <dl>
            <div><dt>Input</dt><dd>${session.inputMode === 'pointer' ? 'Touch / pointer' : 'Keyboard'}</dd></div>
            <div><dt>Frame cadence</dt><dd>${session.diagnostics.frameMedianMs ? `≈ ${session.diagnostics.frameMedianMs.toFixed(1)} ms` : 'Unknown'}</dd></div>
            <div><dt>Interrupted trials</dt><dd>${session.diagnostics.interruptions}</dd></div>
          </dl>
        </article>
      </div>

      <aside class="rx-limit">
        <p class="ui-eyebrow">How to use this result</p>
        <h2>Compare conditions, not people.</h2>
        <p>Browser, display, keyboard, touchscreen, operating system, posture, and attention all remain in the numbers. Compare repeated runs only on the same device and input. Riflessi does not assess concussion, driving fitness, fatigue, neurological health, or a population percentile.</p>
      </aside>

      <div class="ui-cluster rx-results__actions">
        <button class="ui-button" type="button" data-action="rx-restart">Run again</button>
        <button class="ui-button ui-button--ghost" type="button" data-action="rx-copy">Copy result summary</button>
      </div>
    </section>
  `;
}

function metricCard(index, label, value, unit, copy) {
  return `<article class="rx-metric">
    <div><span>${index}</span><p>${label}</p></div><strong>${value}<small>${unit}</small></strong><p>${copy}</p>
  </article>`;
}

function metric(value) {
  return value === null ? '—' : String(value);
}

function signedMetric(value) {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
}

function driftCopy(value) {
  if (value === null) return 'Not enough clean responses to estimate a first-to-second-half change.';
  if (Math.abs(value) < 10) return 'The first and second halves were similar after rounding to 5 ms.';
  return value > 0
    ? 'The second half was slower than the first half in this run.'
    : 'The second half was faster than the first half in this run.';
}

function updateRunnerProgress() {
  if (!session) return;
  const progress = app.querySelector('[data-rx-progress]');
  const count = app.querySelector('[data-rx-count]');
  if (!progress || !count) return;
  if (session.instrument === 'stability') {
    const remaining = Math.max(0, session.stabilityEndsAt - performance.now());
    const complete = 1 - remaining / config.stability.durationMs;
    progress.style.inlineSize = `${Math.min(100, Math.max(0, complete * 100))}%`;
    count.textContent = formatClock(remaining);
  } else {
    progress.style.inlineSize = `${(session.index / session.queue.length) * 100}%`;
    count.textContent = `${Math.min(session.index + 1, session.queue.length)} / ${session.queue.length}`;
  }
}

function formatClock(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function pauseRun() {
  if (!session || !document.body.classList.contains('rx-running') || trialState === 'paused') return;
  clearTrialClocks();
  if (session.instrument === 'stability') {
    window.clearTimeout(deadlineId);
    window.clearInterval(clockId);
  }
  trialState = 'paused';
  session.pauseStartedAt = performance.now();
  session.diagnostics.interruptions += 1;
  document.body.classList.remove('rx-running');
  app.innerHTML = `
    <section class="rx-transition ui-container" data-rx-paused>
      <span class="rx-transition__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Timing paused</p>
      <h1>This trial was interrupted.</h1><p>The current trial has been discarded. Return when this tab can stay visible and focused.</p>
      <button class="ui-button ui-button--lg" type="button" data-action="rx-resume">Resume with a fresh trial <span aria-hidden="true">→</span></button>
    </section>`;
}

function resumeRun() {
  if (!session) return;
  if (session.instrument === 'stability') {
    session.stabilityEndsAt += performance.now() - session.pauseStartedAt;
  }
  renderRunner();
  if (session.instrument === 'stability') {
    const remaining = Math.max(0, session.stabilityEndsAt - performance.now());
    deadlineId = window.setTimeout(finishCurrentInstrument, remaining);
    clockId = window.setInterval(updateRunnerProgress, 250);
    prepareStabilityTrial();
  } else {
    prepareQueuedTrial();
  }
}

function measureFrameCadence() {
  const intervals = [];
  let previous = 0;
  const sample = (timestamp) => {
    if (!app.querySelector('[data-rx-cadence]')) return;
    if (previous) intervals.push(timestamp - previous);
    previous = timestamp;
    if (intervals.length < 45) {
      frameId = requestAnimationFrame(sample);
      return;
    }
    const sorted = [...intervals].sort((left, right) => left - right);
    const frameMs = sorted[Math.floor(sorted.length / 2)];
    const dropped = intervals.filter((value) => value > frameMs * 1.8).length;
    const output = app.querySelector('[data-rx-cadence]');
    const note = app.querySelector('[data-rx-cadence-note]');
    if (output) {
      output.textContent = `≈ ${frameMs.toFixed(1)} ms / frame`;
      output.dataset.frameMs = String(frameMs);
      output.dataset.dropped = String(dropped);
    }
    if (note)
      note.textContent = dropped
        ? `${dropped} long frame interval${dropped === 1 ? '' : 's'} observed in the sample.`
        : 'The setup sample was steady.';
  };
  frameId = requestAnimationFrame(sample);
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

function copyResults() {
  if (!session?.result) return;
  const result = session.result;
  const text = [
    t('Riflessi — device-relative response profile'),
    t('Input: {input}', { input: t(session.inputMode === 'pointer' ? 'touch / pointer' : 'keyboard') }),
    t('Signal median: {value} ms', { value: metric(result.signal.medianMs) }),
    t('Choice median: {median} ms; accuracy: {accuracy}%; cost: {cost} ms', {
      median: metric(result.choice.medianMs),
      accuracy: metric(result.choice.accuracyPercent),
      cost: signedMetric(result.choice.costMs),
    }),
    t('Sustained median: {median} ms; slow tail: {tail} ms; drift: {drift} ms', {
      median: metric(result.stability.medianMs),
      tail: signedMetric(result.stability.slowestGapMs),
      drift: signedMetric(result.stability.driftMs),
    }),
    t('Events: {falseStarts} false starts, {anticipations} anticipations, {misses} misses', {
      falseStarts: result.events.falseStarts,
      anticipations: result.events.anticipations,
      misses: result.events.misses,
    }),
    t('Compare only on the same device and input. Not a clinical or population score.'),
  ].join('\n');
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast('Result summary copied.'))
    .catch(() => toast('Copy was unavailable in this browser.'));
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
          goHome();
          break;
        case 'rx-intro':
          renderIntro();
          break;
        case 'rx-setup':
          renderSetup();
          break;
        case 'rx-method':
          app.querySelector('#rx-method')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'rx-mode':
          selectMode(action.dataset.mode);
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
      const start = app.querySelector('[data-action="rx-start"]');
      if (start) start.disabled = !event.target.checked;
    },
    { signal },
  );

  document.addEventListener(
    'pointerdown',
    (event) => {
      const response = event.target.closest('[data-rx-response]');
      if (response) handleResponse(response.dataset.rxResponse, event);
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || !session || session.inputMode !== 'keyboard') return;
      let response = null;
      if (session.instrument === 'choice' && event.key === 'ArrowLeft') response = 'left';
      if (session.instrument === 'choice' && event.key === 'ArrowRight') response = 'right';
      if (session.instrument !== 'choice' && (event.code === 'Space' || event.key === ' '))
        response = 'signal';
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

function eventTimestamp(event) {
  const now = performance.now();
  return Number.isFinite(event.timeStamp) && Math.abs(event.timeStamp - now) < 60_000 ? event.timeStamp : now;
}

function announce(message) {
  if (announcer) announcer.textContent = message;
}

function stopClocks() {
  clearTrialClocks();
  window.clearTimeout(deadlineId);
  window.clearInterval(clockId);
  deadlineId = 0;
  clockId = 0;
  trialState = 'idle';
}

function clearTrialClocks() {
  window.clearTimeout(timeoutId);
  cancelAnimationFrame(frameId);
  timeoutId = 0;
  frameId = 0;
}

function runtimeConfig() {
  const testOverride =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSE6_TEST_CONFIG__
      : null;
  return mergeReflexConfig(testOverride?.riflessi);
}

function saveLast(result) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    announce('The result is ready, but this browser did not allow local storage.');
  }
}

function loadLast() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
