import { toast } from '@ponchia/ui/behaviors';

import {
  createAdaptiveRun,
  currentAdaptiveTrial,
  DEMO_TARGET,
  jitterDotColor,
  makeTargetPair,
  recordAdaptiveAnswer,
  rgbCss,
  summarizeAdaptiveRun,
} from '../lib/daltonism.js';
import { seededRandom } from '../lib/random.js';

export const meta = {
  id: 'color-blindness',
  name: 'Daltonia',
  tagline: 'Adaptive browser colour-vision experiment',
  blurb:
    'Find a gap hidden in luminance-noise dots while three display-relative colour directions adapt independently.',
  accent: '#3bd6a2',
  duration: '≈ 3 min',
  glyph: 'C',
};

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

let app = null;
let announcer = null;
let gamutChip = null;
let goHome = null;
let run = null;
let active = false;

export function mount(context) {
  app = context.app;
  announcer = context.announcer;
  gamutChip = context.gamutChip;
  goHome = context.navigateHome;

  const controller = new AbortController();
  wireEvents(controller.signal);
  renderIntro();

  return () => {
    controller.abort();
    active = false;
    document.body.classList.remove('lab-mode');
  };
}

function renderIntro() {
  active = false;
  document.body.classList.remove('lab-mode');
  document.title = 'Experimental colour-vision check — Daltonia | Sensoria';

  const previous = loadLast();

  app.innerHTML = `
    <section class="cb-intro ui-container ui-container--wide">
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
            <a class="ui-link ui-link--cta" href="#/color-blindness" data-action="cb-how">How it works</a>
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

      <div class="cb-explain section" id="cb-how">
        <div class="section-heading">
          <div>
            <p class="ui-eyebrow">Method and limits</p>
            <h2>An adaptive task, not a plate score.</h2>
          </div>
          <p>The design borrows established psychophysical techniques without claiming their clinical validation.</p>
        </div>
        <ol class="method-steps cb-steps">
          <li><span>1</span><div><strong>Random C-gap</strong><p>Choose top, right, bottom, or left. Random orientation prevents memorized digits from driving the result.</p></div></li>
          <li><span>2</span><div><strong>Luminance noise</strong><p>Target and field dots share the same brightness variation, reducing a consistent lightness cue.</p></div></li>
          <li><span>3</span><div><strong>Three staircases</strong><p>Protan-, deutan-, and tritan-aligned display directions become harder after correct responses and easier after errors.</p></div></li>
          <li><span>4</span><div><strong>Run-relative output</strong><p>You receive thresholds and run spread, not a normal/deficient label or a clinical score.</p></div></li>
        </ol>
      </div>

      <section class="cb-research section" aria-labelledby="cb-research-title">
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
    </section>
  `;

  requestAnimationFrame(() => {
    const canvas = app.querySelector('[data-preview-target]');
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
  document.body.classList.add('lab-mode');
  document.title = 'Prepare your display — Daltonia | Sensoria';
  window.scrollTo({ top: 0, behavior: 'instant' });

  app.innerHTML = `
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
            <li><span>3</span><p>View the display straight on at a normal reading distance. Make a best guess when uncertain.</p></li>
          </ol>
        </div>

        <div class="setup-panel ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Display check</p>
              <h2>Ready to begin</h2>
            </div>
            <span class="ui-badge ui-badge--muted">${gamutChip.textContent}</span>
          </div>
          <div class="cb-swatch-row" aria-hidden="true">
            ${['#c94f4f', '#d98a3d', '#c9b83d', '#5aa54f', '#3f8fbf', '#7a5ac9']
              .map((color) => `<span style="background:${color}"></span>`)
              .join('')}
          </div>
          <p class="calibration-hint">These six swatches are a gross display check, not colour calibration.</p>
          <label class="ui-check ready-check">
            <input type="checkbox" id="cb-ready" />
            <span>My colour filters are off and I understand this is an unvalidated browser experiment.</span>
          </label>
          <button class="ui-button ui-button--lg" id="cb-start" type="button" data-action="cb-begin" disabled>
            Begin adaptive check <span aria-hidden="true">→</span>
          </button>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Everything runs locally. No answer leaves the browser.</p>
        </div>
      </div>
    </section>
  `;
}

function startRun() {
  const entropy = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${performance.now()}`;
  run = createAdaptiveRun(seededRandom(`daltonia:${entropy}`));
  active = true;
  document.body.classList.add('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderTrial();
  announce('Trial one. Choose where the gap in the C points.');
}

function renderTrial() {
  if (!active || !run) return;
  const trial = currentAdaptiveTrial(run);
  if (!trial) {
    renderResults();
    return;
  }

  const total = run.schedule.length;
  const trialNumber = run.index + 1;
  const progress = Math.round((run.index / total) * 100);
  document.title = `Trial ${trialNumber} of ${total} — Daltonia | Sensoria`;

  app.innerHTML = `
    <section class="cb-view">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">×</span> End experiment</button>
        <p class="cb-topbar__label">Adaptive colour threshold</p>
        <span class="trial-count"><b>${String(trialNumber).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}</span>
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
          <p class="ui-eyebrow">Four-choice task</p>
          <h1 class="cb-prompt">Where is the gap?</h1>
          <p class="cb-trial-hint">Choose the closest answer even when the target is faint.</p>
          <div class="cb-directions" role="group" aria-label="Choose the gap direction">
            ${directionButton('up')}
            ${directionButton('left')}
            <span class="cb-directions__center" aria-hidden="true">C</span>
            ${directionButton('right')}
            ${directionButton('down')}
          </div>
          <p class="cb-key-hint">Keyboard: arrow keys</p>
        </div>
      </div>
    </section>
  `;

  requestAnimationFrame(() => {
    const canvas = app.querySelector('[data-target]');
    if (canvas) drawTarget(canvas, trial, `run-${trial.id}`);
  });
}

function directionButton(direction) {
  const label = DIRECTION_LABELS[direction];
  return `<button class="cb-direction cb-direction--${direction}" type="button" data-orientation="${direction}" aria-label="Gap at ${label}">
    <span aria-hidden="true">${DIRECTION_GLYPHS[direction]}</span><small>${label}</small>
  </button>`;
}

function submitOrientation(orientation) {
  if (!active || !run) return;
  recordAdaptiveAnswer(run, orientation);
  if (run.index >= run.schedule.length) {
    renderResults();
    return;
  }
  renderTrial();
  announce(`Trial ${run.index + 1}. Choose where the gap points.`);
}

function renderResults() {
  active = false;
  document.body.classList.add('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = 'Your display-relative thresholds — Daltonia | Sensoria';
  const result = summarizeAdaptiveRun(run);
  saveLast(result);

  app.innerHTML = `
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

      <div class="results-actions">
        <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">Run again</button>
        <button class="ui-button ui-button--ghost" type="button" data-action="cb-copy">Copy run summary</button>
        <button class="ui-button ui-button--subtle" type="button" data-action="gallery">All tests</button>
      </div>
    </section>
  `;

  document.querySelector('#main').focus({ preventScroll: true });
  announce(`Experiment complete. ${result.title}. ${result.detail}`);
}

function thresholdCard(axis) {
  return `<article class="cb-scorecard cb-threshold-card">
    <div class="cb-scorecard__head">
      <div><h2>${axis.label}</h2><p>${axis.description}</p></div>
      <strong>${axis.threshold.toFixed(3)}</strong>
    </div>
    <p class="cb-threshold-card__spread">±${axis.spread.toFixed(3)} <span>run spread</span></p>
    <p class="cb-scorecard__note">${axis.stability === 'settled' ? 'Staircase settled' : 'Limited reversals'} · ${axis.reversals} reversals</p>
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
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

async function copyResults() {
  const result = summarizeAdaptiveRun(run);
  const thresholds = result.axes
    .map((axis) => `${axis.label} ${axis.threshold.toFixed(3)} ±${axis.spread.toFixed(3)}`)
    .join(', ');
  const summary = `Daltonia experimental browser run — ${thresholds}; task controls ${result.controls.correct}/${result.controls.total}. Display-relative, unvalidated, and not diagnostic.`;
  try {
    await navigator.clipboard.writeText(summary);
    toast('Run summary copied', { tone: 'success' });
  } catch {
    toast('Could not access the clipboard', { tone: 'danger' });
  }
}

function loadLast() {
  try {
    const saved = JSON.parse(localStorage.getItem('daltonia-last'));
    return saved?.schemaVersion === 2 ? saved : null;
  } catch {
    return null;
  }
}

function saveLast(result) {
  try {
    localStorage.setItem(
      'daltonia-last',
      JSON.stringify({
        schemaVersion: 2,
        thresholds: result.axes.map(({ type, threshold, spread }) => ({ type, threshold, spread })),
        controlOk: result.controlOk,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {}
}

function wireEvents(signal) {
  document.addEventListener(
    'change',
    (event) => {
      if (event.target.matches('#cb-ready')) {
        app.querySelector('#cb-start').disabled = !event.target.checked;
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
        app.querySelector('#cb-how')?.scrollIntoView({ behavior: 'smooth' });
      }
      if (name === 'cb-setup') renderSetup();
      if (name === 'cb-home') {
        if (active && !window.confirm('End this experiment? Your progress will be lost.')) return;
        renderIntro();
      }
      if (name === 'cb-begin' && !action.disabled) startRun();
      if (name === 'cb-copy') copyResults();
      if (name === 'gallery') {
        if (active && !window.confirm('Leave the experiment? Your progress will be lost.')) return;
        goHome();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!active) return;
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
}
