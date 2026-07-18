import { toast } from '@ponchia/ui/behaviors';

import { classifyResults, jitterDotColor, makePlatePair, PLATES, rgbCss } from '../lib/daltonism.js';
import { seededRandom } from '../lib/random.js';

export const meta = {
  id: 'color-blindness',
  name: 'Daltonia',
  tagline: 'Ishihara-style colour-blindness screen',
  blurb:
    'Read the numbers hidden in the dots. Plates target the red–green and blue–yellow axes to screen for the common colour-vision deficiencies.',
  accent: '#3bd6a2',
  duration: '≈ 2 min',
  glyph: '8',
};

let app = null;
let announcer = null;
let gamutChip = null;
let goHome = null;

let plates = [];
let plateIndex = 0;
let typed = '';
let responses = [];
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
  document.title = 'Colour Blindness Test — Ishihara-style plates | Daltonia';

  const previous = loadLast();

  app.innerHTML = `
    <section class="cb-intro ui-container ui-container--wide">
      <button class="back-link exam-back" type="button" data-action="gallery">
        <span aria-hidden="true">←</span> All tests
      </button>
      <div class="cb-hero">
        <div class="cb-hero__copy">
          <p class="ui-eyebrow">Colour vision / Ishihara-style plates / about 2 minutes</p>
          <h1>Read the number <em>in the dots</em>.</h1>
          <p class="cb-lede">
            Each plate hides a digit that only shows up if you can separate two colours along one
            axis. Miss the red–green plates and you see the pattern of the common deficiencies; miss
            the blue–yellow plates and you see the rarer one.
          </p>
          <div class="ui-cluster cb-hero__actions">
            <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">
              Start the screen <span aria-hidden="true">→</span>
            </button>
            <a class="ui-link ui-link--cta" href="#/color-blindness" data-action="cb-how">How it works</a>
          </div>
          <p class="hero__limit">
            <span aria-hidden="true">◇</span>
            A screening, not a diagnosis. Plates are generated, not the copyrighted Ishihara set.
          </p>
          ${previous ? `<p class="previous-score">Last run on this browser: <strong>${previous.title}</strong></p>` : ''}
        </div>
        <div class="cb-hero__plate" aria-hidden="true">
          <canvas data-preview-plate></canvas>
        </div>
      </div>

      <div class="cb-explain section" id="cb-how">
        <div class="section-heading">
          <div>
            <p class="ui-eyebrow">Method, not magic</p>
            <h2>How the plates are built.</h2>
          </div>
          <p>Figure and background differ only along one cone's axis, so the digit collapses for whoever lacks that cone.</p>
        </div>
        <ol class="method-steps cb-steps">
          <li><span>1</span><div><strong>Cone-true axes</strong><p>Colours are offset along the exact red-green (protan/deutan) or blue-yellow (tritan) confusion direction, computed from cone responses.</p></div></li>
          <li><span>2</span><div><strong>No brightness cue</strong><p>Every dot's lightness is jittered the same way in the figure and the field, so you cannot cheat by luminance.</p></div></li>
          <li><span>3</span><div><strong>Control plate</strong><p>One plate everyone can read checks your screen and attention before the result is scored.</p></div></li>
          <li><span>4</span><div><strong>Honest read-out</strong><p>You get a red-green and a blue-yellow score and a plain-language pattern — never a medical label.</p></div></li>
        </ol>
      </div>
    </section>
  `;

  requestAnimationFrame(() => {
    const canvas = app.querySelector('[data-preview-plate]');
    if (canvas) drawPlate(canvas, PLATES[1], 'preview');
  });
}

function renderSetup() {
  document.body.classList.add('lab-mode');
  document.title = 'Prepare your screen — Daltonia';
  window.scrollTo({ top: 0, behavior: 'instant' });

  app.innerHTML = `
    <section class="setup-view ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">←</span> Back</button>
      <div class="setup-grid">
        <div class="setup-copy">
          <p class="ui-eyebrow">Screen check / 01 of 01</p>
          <h1>Colour filters off, please.</h1>
          <p class="setup-lede">
            This screen is only as honest as your display. Colour-shifting features quietly change
            the very hues the plates depend on.
          </p>
          <div class="ui-alert ui-alert--info forced-colors-warning">
            <div class="ui-alert__body">
              <strong class="ui-alert__title">Colour override detected</strong>
              <p>Turn off forced-colors or high-contrast mode before a colour-vision task.</p>
            </div>
          </div>
          <ol class="setup-list">
            <li><span>1</span><p>Turn off Night Shift, True Tone, blue-light filters, dark-room and vivid modes.</p></li>
            <li><span>2</span><p>Set a comfortable, medium brightness in even light — no glare, no dim room.</p></li>
            <li><span>3</span><p>View the screen straight on, at a normal reading distance.</p></li>
          </ol>
        </div>

        <div class="setup-panel ui-card">
          <div class="ui-card__head">
            <div>
              <p class="ui-eyebrow ui-eyebrow--muted">Colours as intended</p>
              <h2>Ready check</h2>
            </div>
            <span class="ui-badge ui-badge--muted">${gamutChip.textContent}</span>
          </div>
          <div class="cb-swatch-row" aria-hidden="true">
            ${['#c94f4f', '#d98a3d', '#c9b83d', '#5aa54f', '#3f8fbf', '#7a5ac9']
              .map((color) => `<span style="background:${color}"></span>`)
              .join('')}
          </div>
          <p class="calibration-hint">You should see six clearly different colours above — red, orange, yellow, green, blue, violet.</p>
          <label class="ui-check ready-check">
            <input type="checkbox" id="cb-ready" />
            <span>My colour filters are off and the six swatches look distinct.</span>
          </label>
          <button class="ui-button ui-button--lg" id="cb-start" type="button" data-action="cb-begin" disabled>
            Show the first plate <span aria-hidden="true">→</span>
          </button>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Everything runs locally. No answer leaves the browser.</p>
        </div>
      </div>
    </section>
  `;
}

function startRun() {
  plates = shufflePreservingControl(PLATES);
  plateIndex = 0;
  typed = '';
  responses = [];
  active = true;
  document.body.classList.add('lab-mode');
  renderPlate();
  announce('Plate one. What number do you see?');
}

function shufflePreservingControl(source) {
  // Keep a control plate first (a sanity check happens before scoring), then a
  // fixed, considered order — deterministic so a session is reproducible.
  const control = source.filter((plate) => plate.axis === 'control');
  const rest = source.filter((plate) => plate.axis !== 'control');
  return [...control, ...rest];
}

function renderPlate() {
  if (!active) return;
  const plate = plates[plateIndex];
  const total = plates.length;
  const progress = Math.round((plateIndex / total) * 100);
  document.title = `Plate ${plateIndex + 1} of ${total} — Daltonia`;

  app.innerHTML = `
    <section class="cb-view">
      <div class="lab-topbar ui-container ui-container--wide">
        <button class="back-link" type="button" data-action="cb-home"><span aria-hidden="true">×</span> End screen</button>
        <p class="cb-topbar__label">Colour-blindness screen</p>
        <span class="trial-count"><b>${String(plateIndex + 1).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}</span>
      </div>

      <div class="ui-progress lab-progress" role="progressbar" aria-label="Screen progress"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
        <div class="ui-progress__bar" style="--value:${progress}"></div>
      </div>

      <div class="cb-stage ui-container">
        <div class="cb-plate-wrap">
          <div class="cb-plate">
            <canvas data-plate aria-label="Colour-vision plate ${plateIndex + 1}"></canvas>
          </div>
        </div>

        <div class="cb-answer">
          <p class="cb-prompt">What number do you see?</p>
          <div class="cb-readout" aria-live="polite">
            <span class="cb-readout__value" data-typed>${typed || '—'}</span>
          </div>
          <div class="cb-keypad" role="group" aria-label="Number entry">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
              .map((digit) => `<button class="cb-key" type="button" data-key="${digit}">${digit}</button>`)
              .join('')}
            <button class="cb-key cb-key--util" type="button" data-action="cb-backspace" aria-label="Delete last digit">⌫</button>
            <button class="cb-key" type="button" data-key="0">0</button>
            <button class="cb-key cb-key--submit" type="button" data-action="cb-submit" ${typed ? '' : 'disabled'} aria-label="Submit answer">Enter</button>
          </div>
          <button class="ui-button ui-button--ghost cb-nothing" type="button" data-action="cb-blank">
            I don't see a number
          </button>
        </div>
      </div>
    </section>
  `;

  requestAnimationFrame(() => {
    const canvas = app.querySelector('[data-plate]');
    if (canvas) drawPlate(canvas, plate, `run-${plateIndex}`);
  });
}

function typeDigit(digit) {
  if (!active || typed.length >= 2) return;
  typed += digit;
  refreshReadout();
}

function backspace() {
  if (!active || typed.length === 0) return;
  typed = typed.slice(0, -1);
  refreshReadout();
}

function refreshReadout() {
  const readout = app.querySelector('[data-typed]');
  if (readout) readout.textContent = typed || '—';
  const submit = app.querySelector('[data-action="cb-submit"]');
  if (submit) submit.disabled = typed.length === 0;
}

function submitAnswer(answer) {
  if (!active) return;
  const plate = plates[plateIndex];
  responses.push({ plateId: plate.id, answer });
  typed = '';

  if (plateIndex >= plates.length - 1) {
    renderResults();
    return;
  }
  plateIndex += 1;
  renderPlate();
  announce(`Plate ${plateIndex + 1}. What number do you see?`);
}

function renderResults() {
  active = false;
  document.body.classList.add('lab-mode');
  document.title = 'Your colour-vision screen — Daltonia';
  const result = classifyResults(responses);
  saveLast(result);

  const missed = responses
    .map((response) => {
      const plate = PLATES.find((entry) => entry.id === response.plateId);
      return plate && response.answer.trim() !== plate.digit ? plate : null;
    })
    .filter(Boolean);

  app.innerHTML = `
    <section class="results-view ui-container ui-container--wide">
      <div class="results-head">
        <div>
          <p class="ui-eyebrow">Screen complete</p>
          <h1>${result.title}.</h1>
          <p>${result.detail}</p>
        </div>
        <div class="cb-verdict cb-verdict--${result.category}" aria-hidden="true">
          <span>${categoryGlyph(result.category)}</span>
        </div>
      </div>

      <div class="cb-scorecards">
        ${scoreCard('Red–green', result.redGreenScore, 'Protan / deutan axis', result.category === 'red-green')}
        ${scoreCard('Blue–yellow', result.blueYellowScore, 'Tritan axis', result.category === 'blue-yellow')}
        ${controlCard(result.controlOk)}
      </div>

      ${
        missed.length
          ? `<p class="cb-missed">Plates you did not read: ${missed
              .map(
                (plate) =>
                  `<span class="cb-missed__chip cb-missed__chip--${plate.axis}">${plate.digit}</span>`,
              )
              .join('')}</p>`
          : '<p class="cb-missed">You read every plate on this screen.</p>'
      }

      <div class="result-note ui-alert ui-alert--info">
        <div class="ui-alert__body">
          <strong class="ui-alert__title">What this means</strong>
          <p>
            This is a screening on your uncalibrated display, not a diagnosis, and it cannot tell
            protan from deutan or grade severity. If it flags a pattern — or if colour naming causes
            you trouble day to day — an optometrist can run calibrated Ishihara, Farnsworth, or
            anomaloscope tests. Nothing here was uploaded.
          </p>
        </div>
      </div>

      <div class="results-actions">
        <button class="ui-button ui-button--lg" type="button" data-action="cb-setup">Run again</button>
        <button class="ui-button ui-button--ghost" type="button" data-action="cb-copy">Copy summary</button>
        <button class="ui-button ui-button--subtle" type="button" data-action="gallery">All tests</button>
      </div>
    </section>
  `;

  document.querySelector('#main').focus({ preventScroll: true });
  announce(`Screen complete. ${result.title}. ${result.detail}`);
}

function scoreCard(label, score, sub, flagged) {
  return `<article class="cb-scorecard ${flagged ? 'is-flagged' : ''}">
    <div class="cb-scorecard__head">
      <div><h3>${label}</h3><p>${sub}</p></div>
      <strong>${score}<small>/100</small></strong>
    </div>
    <div class="ui-meter ui-meter--accent" role="meter" aria-label="${label} plates read"
      aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}">
      <span class="ui-meter__fill" style="--value:${score}"></span>
    </div>
    <p class="cb-scorecard__note">${score}% of ${label.toLowerCase()} plates read</p>
  </article>`;
}

function controlCard(ok) {
  return `<article class="cb-scorecard cb-scorecard--control">
    <div class="cb-scorecard__head">
      <div><h3>Control</h3><p>Everyone should read this</p></div>
      <strong>${ok ? '✓' : '✕'}</strong>
    </div>
    <p class="cb-scorecard__note">${ok ? 'Screen and attention check passed.' : 'Control plate missed — result not scored.'}</p>
  </article>`;
}

function categoryGlyph(category) {
  if (category === 'typical') return '✓';
  if (category === 'red-green') return 'RG';
  if (category === 'blue-yellow') return 'BY';
  return '?';
}

/*
 * Plate renderer. Dots are laid on a jittered hex grid inside the plate circle;
 * each dot samples an offscreen digit mask to decide figure vs field, then
 * takes a luminance-jittered colour so no brightness edge betrays the figure.
 */
function drawPlate(canvas, plate, seed) {
  const bounds = canvas.getBoundingClientRect();
  const cssSize = Math.max(1, Math.min(bounds.width || 320, bounds.height || bounds.width || 320));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(cssSize * ratio);
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, pixels, pixels);

  const pair = makePlatePair(plate.background, plate.type, plate.strength);
  const mask = buildDigitMask(plate.digit, pixels);
  const random = seededRandom(`${plate.id}:${seed}`);

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
      const isFigure = sampleMask(mask, x, y, pixels);
      const baseLinear = isFigure ? pair.figureLinear : pair.backgroundLinear;
      context.fillStyle = rgbCss(jitterDotColor(baseLinear, random));
      context.beginPath();
      context.arc(x, y, dotRadius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function buildDigitMask(digit, size) {
  const mask = document.createElement('canvas');
  mask.width = size;
  mask.height = size;
  const context = mask.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, size, size);
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  let fontSize = size * 0.62;
  context.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  const maxWidth = size * 0.62;
  while (context.measureText(digit).width > maxWidth && fontSize > 8) {
    fontSize -= 4;
    context.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  }
  context.fillText(digit, size / 2, size / 2 + fontSize * 0.02);
  return context.getImageData(0, 0, size, size);
}

function sampleMask(mask, x, y, size) {
  const px = Math.max(0, Math.min(size - 1, Math.round(x)));
  const py = Math.max(0, Math.min(size - 1, Math.round(y)));
  return mask.data[(py * size + px) * 4 + 3] > 128;
}

function announce(message) {
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

async function copyResults() {
  const result = classifyResults(responses);
  const summary = `Daltonia colour-vision screen — ${result.title}. Red–green ${result.redGreenScore}/100, blue–yellow ${result.blueYellowScore}/100. Screen-based, not a diagnosis.`;
  try {
    await navigator.clipboard.writeText(summary);
    toast('Result summary copied', { tone: 'success' });
  } catch {
    toast('Could not access the clipboard', { tone: 'danger' });
  }
}

function loadLast() {
  try {
    return JSON.parse(localStorage.getItem('daltonia-last'));
  } catch {
    return null;
  }
}

function saveLast(result) {
  try {
    localStorage.setItem(
      'daltonia-last',
      JSON.stringify({ title: result.title, category: result.category, savedAt: new Date().toISOString() }),
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
      const key = event.target.closest('[data-key]');
      if (key) {
        typeDigit(key.dataset.key);
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
        if (active && !window.confirm('End this screen? Your progress will be lost.')) return;
        renderIntro();
      }
      if (name === 'cb-begin' && !action.disabled) startRun();
      if (name === 'cb-backspace') backspace();
      if (name === 'cb-submit' && !action.disabled) submitAnswer(typed);
      if (name === 'cb-blank') submitAnswer('');
      if (name === 'cb-copy') copyResults();
      if (name === 'gallery') {
        if (active && !window.confirm('Leave the screen? Your progress will be lost.')) return;
        goHome();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (!active) return;
      if (event.key >= '0' && event.key <= '9') {
        typeDigit(event.key);
      } else if (event.key === 'Backspace') {
        backspace();
      } else if (event.key === 'Enter' && typed) {
        submitAnswer(typed);
      }
    },
    { signal },
  );
}
