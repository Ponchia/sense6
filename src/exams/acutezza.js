import { toast } from '@ponchia/ui/behaviors';
import '../styles/acutezza.css';
import { formatNumber, t } from '../i18n.js';
import {
  ACUITY_DIRECTIONS,
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  contrastGrays,
  createAcuityTrack,
  createMeridianSchedule,
  createOrientationSchedule,
  estimateViewingDistance,
  landoltDiameterCssPixels,
  measurableGapBounds,
  mergeAcuityConfig,
  nextAcuityTrial,
  pixelsPerMillimetre,
  recordAcuityResponse,
  summarizeAcuity,
  summarizeBlindSpot,
  summarizeContrastCost,
  summarizeMeridians,
} from '../lib/acuity.js';
import { appendJournalEntry, captureDisplayPassport, createJournalEntry } from '../lib/journal.js';
import { createExamLifecycle } from '../lib/lifecycle.js';
import { drawLandoltRing, drawMeridianField } from '../lib/optotypes.js';
import { seededRandom } from '../lib/random.js';
import { createResultStore, isRecord } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';

const STORAGE_KEY = 'sense6:acutezza:last';
const RESULT_STORE = createResultStore({ key: STORAGE_KEY, validate: isRecord });
const MOUNT_OWNER = Symbol('acutezza');
const INSTRUMENTS = {
  high: {
    number: '01',
    name: 'Nitidezza',
    eyebrow: 'High-contrast sharpness',
    title: 'Find the opening.',
    body: 'A Landolt ring changes size while you identify its opening. The estimate belongs to this calibrated distance and display.',
  },
  low: {
    number: '02',
    name: 'Contrasto',
    eyebrow: 'Low-contrast cost',
    title: 'Find the quieter opening.',
    body: 'The same task repeats with a pale target. Sense6 compares conditions within this run, not across devices.',
  },
  meridian: {
    number: '03',
    name: 'Meridiani',
    eyebrow: 'Orientation consistency',
    title: 'Which line field looks clearer?',
    body: 'Line fields repeat at two scales and changing pixel phases. A preference appears only when it replicates.',
  },
};

let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, {
    bodyClasses: ['ac-active', 'lab-mode', 'ac-running'],
  });
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    goHome: context.navigateHome,
    locale: context.locale,
    config: runtimeConfig(),
    session: null,
    activeTrial: null,
    responseOpen: false,
    feedbackTimer: 0,
    sweepFrame: 0,
    sweepStartedAt: 0,
    sweepGeometry: null,
    geometryTimer: 0,
    pendingAdvance: false,
    trialSequence: 0,
    themeToggle: null,
    themeToggleWasDisabled: false,
  };
  state = mountState;
  document.body.classList.add('ac-active');
  wireEvents(lifecycle.signal);
  const themeObserver = new MutationObserver(themeChanged);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  renderIntro();
  lifecycle.onCleanup(() => {
    clearRuntime();
    releaseThemeFreeze();
    themeObserver.disconnect();
    mountState.session = null;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  clearRuntime();
  releaseThemeFreeze();
  state.session = null;
  document.body.classList.remove('lab-mode', 'ac-running');
  document.title = t('Calibrated sharpness experiment — Acutezza | Sense6');
  const previous = loadLast();
  renderScreen(`
    <section class="ac-intro ui-container ui-container--wide">
      <button class="back-link exam-back" type="button" data-action="ac-home"><span aria-hidden="true">←</span> All tests</button>
      <div class="ac-hero">
        <div class="ac-hero__copy">
          <p class="ui-eyebrow">Vision lab / three instruments / about 8 minutes</p>
          <h1>Calibrate the screen.<br><em>Resolve the opening.</em></h1>
          <p class="ac-lede">Acutezza measures the angular detail resolved by each eye, the cost of lower contrast, and whether a directional clarity preference repeats. It is a perception experiment, not an eye examination.</p>
          <div class="ui-cluster ac-hero__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-prepare">Prepare the vision lab <span aria-hidden="true">→</span></button><button class="ui-link ui-link--cta" type="button" data-action="ac-method">See the method</button></div>
          <p class="hero__limit"><span aria-hidden="true">◇</span> No 20/20 label, diagnosis, astigmatism detection, or prescription.</p>
          ${previous ? `<p class="previous-score">Last run on this browser: <strong>${previous.setupQuality}</strong></p>` : ''}
        </div>
        <div class="ac-scope" aria-hidden="true"><div class="ac-scope__ring"><i></i><span></span></div><div class="ac-scope__axis ac-scope__axis--one"></div><div class="ac-scope__axis ac-scope__axis--two"></div><div class="ac-scope__readout"><span>Gap angle</span><strong>calibrated</strong></div></div>
      </div>
      <section class="ac-method section" id="ac-method" aria-labelledby="ac-method-title">
        <div class="section-heading"><div><p class="ui-eyebrow">Method and limits</p><h2 id="ac-method-title">Three observations. No composite score.</h2></div><p>High-contrast detail, low-contrast cost, and directional preference remain separate.</p></div>
        <ol class="ac-instrument-list">${Object.values(INSTRUMENTS)
          .map(
            (item) =>
              `<li><span>${item.number}</span><div><p class="ui-eyebrow ui-eyebrow--muted">${item.eyebrow}</p><h3>${item.name}</h3><p>${item.body}</p></div></li>`,
          )
          .join('')}</ol>
      </section>
      <section class="ac-safety section" aria-labelledby="ac-safety-title"><div><p class="ui-eyebrow">Before testing</p><h2 id="ac-safety-title">Comfort and context come first.</h2></div><div class="ac-safety__copy"><p>Use your usual correction for this distance. Cover one eye without pressing it, keep your head upright, and stop for discomfort.</p><p><strong>Sudden vision loss, severe eye pain, new flashes or floaters, or a curtain-like shadow needs prompt professional assessment.</strong> Do not delay care to take this test.</p></div></section>
      <section class="ac-research section" aria-labelledby="ac-research-title">
        <div class="section-heading"><div><p class="ui-eyebrow">Research trail</p><h2 id="ac-research-title">What informed Acutezza.</h2></div><p>Published methods shape the task. They do not make this implementation clinically validated.</p></div>
        <div class="ui-grid ac-research__grid">${researchCard('Calibration', 'Li et al., 2020', 'A physical card and blind-spot sweeps establish screen scale and estimated viewing distance.', 'https://www.nature.com/articles/s41598-019-57204-1')}${researchCard('Standard optotype', 'ISO 8596:2017', 'The Landolt ring provides language-independent, eight-direction geometry.', 'https://www.iso.org/standard/69042.html')}${researchCard('Adaptive burden', 'Bach, 2024', 'Eighteen eight-choice trials balance precision and effort in FrACT research.', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11868300/')}${researchCard('Urgent symptoms', 'National Eye Institute', 'Safety copy reflects guidance for sudden floaters, flashes, or curtain-like shadows.', 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/floaters')}</div>
      </section>
    </section>`);
}

function researchCard(eyebrow, title, body, href) {
  return `<article class="ui-card ac-research__card"><p class="ui-eyebrow ui-eyebrow--muted">${eyebrow}</p><h3>${title}</h3><p>${body}</p><a class="ui-link" href="${href}" target="_blank" rel="noreferrer">Read the primary source <span aria-hidden="true">↗</span></a></article>`;
}

function renderPreparation() {
  clearRuntime();
  document.body.classList.add('lab-mode');
  document.title = t('Prepare your vision setup — Acutezza | Sense6');
  renderScreen(`
    <section class="ac-setup ui-container ui-container--wide"><button class="back-link" type="button" data-action="ac-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="ac-setup__grid"><div class="ac-setup__copy"><p class="ui-eyebrow">Setup / adult near-vision experiment</p><h1>Stable screen.<br>Steady distance.<br>One eye.</h1><p class="ac-lede">Use a laptop, tablet, or monitor without glare. Reset browser zoom, keep brightness comfortable, and leave the display still after calibration.</p>
        <label class="ac-field">Correction during this run<select data-ac-correction><option value="none">No correction</option><option value="glasses">Glasses</option><option value="contacts">Contact lenses</option></select></label>
        <label class="ac-field">First eye<select data-ac-eye-order><option value="right">Right eye first</option><option value="left">Left eye first</option></select></label>
        <label class="ac-consent"><input type="checkbox" data-ac-consent><span>I am 18 or older; I will use my usual correction for this distance; I can cover either eye without pressing it; I understand this is not an eye examination.</span></label>
        <button class="ui-button ui-button--lg" type="button" data-action="ac-card" disabled>Calibrate the screen <span aria-hidden="true">→</span></button></div>
        <aside class="ac-setup__rules" aria-label="Acutezza setup rules"><p class="ui-eyebrow">Setup contract</p><strong>01 / 03</strong><ol><li>Match a physical card</li><li>Estimate viewing distance</li><li>Lock display geometry</li></ol><dl><div><dt>Camera</dt><dd>Not used</dd></div><div><dt>Upload</dt><dd>None</dd></div><div><dt>Result</dt><dd>Run relative</dd></div></dl></aside>
      </div></section>`);
}

function beginCalibration() {
  if (!state.app.querySelector('[data-ac-consent]')?.checked) return;
  const firstEye = state.app.querySelector('[data-ac-eye-order]')?.value ?? 'right';
  state.session = {
    random: seededRandom(`${Date.now()}-${Math.random()}`),
    correction: state.app.querySelector('[data-ac-correction]')?.value ?? 'none',
    eyes: firstEye === 'right' ? ['right', 'left'] : ['left', 'right'],
    eyeIndex: 0,
    eyeResults: [],
    calibration: { state: 'invalid', valid: false, readings: [] },
    contrast: state.config.low.contrast,
    interruptions: 0,
  };
  renderCardCalibration();
}

function renderCardCalibration() {
  clearRuntime();
  const maximum = Math.max(180, Math.min(620, window.innerWidth - 40));
  const initial = Math.min(340, maximum);
  document.title = t('Calibrate screen size — Acutezza | Sense6');
  renderScreen(`
    <section class="ac-calibration ui-container"><div class="ac-calibration__head"><p class="ui-eyebrow">Calibration 01 / physical screen scale</p><h1>Match a real card.</h1><p>Place the blank side of a standard bank or identity card against the screen. Adjust the rectangle until its outer edges match. Sense6 reads no card details and uses no camera.</p></div>
      <div class="ac-card-stage"><div class="ac-card" data-ac-card-shape style="inline-size:${initial}px" aria-hidden="true"><i></i><span>${CARD_WIDTH_MM.toFixed(1)} × ${CARD_HEIGHT_MM.toFixed(2)} mm</span></div><label>Card width<input type="range" data-ac-card-size min="160" max="${maximum}" value="${initial}" step="1"></label><div class="ac-card-controls"><button class="ui-button ui-button--ghost" type="button" data-action="ac-card-smaller">Smaller</button><output data-ac-card-output>${initial} px</output><button class="ui-button ui-button--ghost" type="button" data-action="ac-card-larger">Larger</button></div></div>
      <div class="ui-notice"><strong>No card?</strong><p>Use a ruler and set the rectangle to exactly 85.6 mm wide. If the card cannot fit, rotate to landscape or use a larger screen.</p></div>
      <div class="ui-cluster ac-calibration__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-card">The edges match <span aria-hidden="true">→</span></button><button class="ui-link" type="button" data-action="ac-card-no-fit">The card cannot fit</button></div></section>`);
}

function adjustCard(delta) {
  const input = state.app.querySelector('[data-ac-card-size]');
  if (!input) return;
  input.value = String(Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) + delta)));
  updateCardSize();
}

function updateCardSize() {
  const input = state.app.querySelector('[data-ac-card-size]');
  const shape = state.app.querySelector('[data-ac-card-shape]');
  if (!input || !shape) return;
  shape.style.inlineSize = `${input.value}px`;
  const output = state.app.querySelector('[data-ac-card-output]');
  if (output) output.textContent = `${input.value} px`;
}

function confirmCard() {
  const widthCssPx = state.app.querySelector('[data-ac-card-shape]')?.getBoundingClientRect().width;
  if (!(widthCssPx > 0)) return;
  state.session.calibration.cardWidthCssPx = widthCssPx;
  state.session.calibration.cssPixelsPerMm = pixelsPerMillimetre(widthCssPx);
  renderBlindSpotCalibration();
}

function renderCardNoFit() {
  renderScreen(
    `<section class="ac-blocked ui-container"><span aria-hidden="true">↔</span><p class="ui-eyebrow">Display too narrow</p><h1>This screen cannot show the calibration card at physical size.</h1><p>Rotate to landscape or continue on a larger tablet, laptop, or monitor. Acutezza will not guess physical screen size.</p><button class="ui-button" type="button" data-action="ac-card-retry">Try card calibration again</button></section>`,
  );
}

function renderBlindSpotCalibration({ recheck = false } = {}) {
  clearSweep();
  state.session.sweep = {
    recheck,
    readings: [],
    expected: recheck ? 1 : state.config.calibration.repetitions,
  };
  document.title = t('Estimate viewing distance — Acutezza | Sense6');
  renderScreen(`
    <section class="ac-calibration ac-distance ui-container ui-container--wide"><div class="ac-calibration__head"><p class="ui-eyebrow">${recheck ? 'Between-eye distance check' : 'Calibration 02 / estimated viewing distance'}</p><h1>${recheck ? 'Check the same distance.' : 'Find the natural blind spot.'}</h1><p>Cover your right eye. Keep your left eye fixed on the square at the right. Start a sweep, then press Space or the button when the violet dot disappears. Do not follow the dot.</p></div>
      <div class="ac-sweep" data-ac-sweep-field><div class="ac-sweep__dot" data-ac-sweep-dot aria-hidden="true"></div><div class="ac-sweep__fixation" data-ac-fixation role="img" aria-label="Fixation square"></div></div>
      <div class="ac-sweep__status" aria-live="polite"><strong data-ac-sweep-count>${state.session.sweep.expected} sweeps remaining</strong><span data-ac-sweep-status>Keep the right eye covered and look only at the square.</span></div>
      <div class="ui-cluster ac-calibration__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-start-sweep">Start sweep</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-record-sweep" disabled>Dot disappeared <span aria-hidden="true">· Space</span></button><button class="ui-link" type="button" data-action="ac-manual-distance">Use a ruler-measured distance</button></div></section>`);
  requestAnimationFrame(checkSweepSpace);
}

function checkSweepSpace() {
  const field = state.app.querySelector('[data-ac-sweep-field]');
  if (!field || !state.session?.sweep) return;
  const maxOffsetMm = (field.getBoundingClientRect().width * 0.82) / state.session.calibration.cssPixelsPerMm;
  const maxDistance = maxOffsetMm / Math.tan((state.config.calibration.blindSpotDegrees * Math.PI) / 180);
  if (maxDistance < state.config.calibration.minDistanceMm) {
    field.classList.add('is-too-small');
    state.app.querySelector('[data-action="ac-start-sweep"]').disabled = true;
    state.app.querySelector('[data-ac-sweep-status]').textContent = t(
      'This viewport is too narrow for a reliable sweep. Use landscape, a larger display, or a ruler-measured distance.',
    );
  }
}

function startSweep() {
  if (state.sweepFrame || !state.session?.sweep) return;
  const field = state.app.querySelector('[data-ac-sweep-field]');
  const dot = state.app.querySelector('[data-ac-sweep-dot]');
  const fixation = state.app.querySelector('[data-ac-fixation]');
  if (!field || !dot || !fixation) return;
  const fieldRect = field.getBoundingClientRect();
  const fixRect = fixation.getBoundingClientRect();
  const fixCenter = fixRect.left - fieldRect.left + fixRect.width / 2;
  state.sweepGeometry = { fixCenter, startOffset: fieldRect.width * 0.08, endOffset: fieldRect.width * 0.88 };
  state.sweepStartedAt = performance.now();
  state.app.querySelector('[data-action="ac-start-sweep"]').disabled = true;
  state.app.querySelector('[data-action="ac-record-sweep"]').disabled = false;
  state.app.querySelector('[data-ac-sweep-status]').textContent = t(
    'The dot is moving. Keep looking at the square.',
  );
  const animate = (now) => {
    const progress = Math.min(1, (now - state.sweepStartedAt) / state.config.calibration.sweepMs);
    const offset =
      state.sweepGeometry.startOffset +
      (state.sweepGeometry.endOffset - state.sweepGeometry.startOffset) * progress;
    state.sweepGeometry.currentOffset = offset;
    dot.style.insetInlineStart = `${fixCenter - offset}px`;
    if (progress >= 1) {
      clearSweep();
      state.app.querySelector('[data-action="ac-start-sweep"]').disabled = false;
      state.app.querySelector('[data-ac-sweep-status]').textContent = t(
        'The sweep ended without a response. Start again or use a ruler-measured distance.',
      );
      return;
    }
    state.sweepFrame = requestAnimationFrame(animate);
  };
  state.sweepFrame = requestAnimationFrame(animate);
}

function recordSweep() {
  if (!state.sweepFrame || !state.sweepGeometry?.currentOffset) return;
  const distance = estimateViewingDistance(
    state.sweepGeometry.currentOffset,
    state.session.calibration.cssPixelsPerMm,
    state.config.calibration.blindSpotDegrees,
  );
  state.session.sweep.readings.push(distance);
  clearSweep();
  const remaining = state.session.sweep.expected - state.session.sweep.readings.length;
  if (remaining > 0) {
    state.app.querySelector('[data-action="ac-start-sweep"]').disabled = false;
    state.app.querySelector('[data-ac-sweep-count]').textContent = t('{count} sweeps remaining', {
      count: remaining,
    });
    state.app.querySelector('[data-ac-sweep-status]').textContent = t(
      'Recorded. Look at the square and start the next sweep.',
    );
    return;
  }
  if (state.session.sweep.recheck) finishDistanceRecheck(distance);
  else renderDistanceReview();
}

function renderDistanceReview() {
  const result = summarizeBlindSpot(state.session.sweep.readings, state.config.calibration);
  state.session.pendingDistance = result;
  state.session.calibration.readings = result.readings;
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark ${result.coherent ? '' : 'is-limited'}" aria-hidden="true">${result.coherent ? '✓' : '!'}</span><p class="ui-eyebrow">Viewing-distance estimate</p><h1>${result.coherent ? `${Math.round(result.distanceMm / 10)} cm from the screen.` : 'The sweeps did not agree.'}</h1><p>${result.coherent ? `The three estimates varied by ${formatNumber(result.spreadPercent)}%. Keep your chair and screen in this position.` : 'Repeat without following the dot, or enter a distance measured from eye to screen.'}</p><div class="ui-cluster ac-calibration__actions">${result.coherent ? '<button class="ui-button ui-button--lg" type="button" data-action="ac-accept-distance">Use this distance <span aria-hidden="true">→</span></button>' : ''}<button class="ui-button ui-button--ghost" type="button" data-action="ac-repeat-distance">Repeat the sweeps</button><button class="ui-link" type="button" data-action="ac-manual-distance">Enter measured distance</button></div></section>`,
  );
}

function acceptDistance() {
  if (!state.session.pendingDistance?.coherent) return;
  Object.assign(state.session.calibration, {
    distanceMm: state.session.pendingDistance.distanceMm,
    spreadPercent: state.session.pendingDistance.spreadPercent,
    state: 'measured',
  });
  renderContrastCheck();
}

function renderManualDistance() {
  clearSweep();
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark" aria-hidden="true">cm</span><p class="ui-eyebrow">Ruler-measured fallback</p><h1>Measure eye to screen.</h1><p>Sit in the position you will keep and measure from the bridge of your nose to the screen. This run remains labelled “assumed distance.”</p><label class="ac-field">Distance in centimetres<input type="number" data-ac-manual-distance min="30" max="100" step="1" value="50" inputmode="decimal"></label><div class="ui-cluster ac-calibration__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-manual-distance">Use measured distance</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-repeat-distance">Return to blind-spot sweeps</button></div></section>`,
  );
}

function confirmManualDistance() {
  const centimetres = Number(state.app.querySelector('[data-ac-manual-distance]')?.value);
  if (centimetres < 30 || centimetres > 100) return toast('Enter a distance from 30 to 100 centimetres.');
  Object.assign(state.session.calibration, {
    distanceMm: centimetres * 10,
    spreadPercent: null,
    state: 'assumed',
  });
  renderContrastCheck();
}

function renderContrastCheck({ stronger = false } = {}) {
  const contrast = stronger ? 0.2 : state.config.low.contrast;
  const colors = contrastGrays(contrast);
  state.session.pendingContrast = contrast;
  renderScreen(
    `<section class="ac-contrast ui-container"><p class="ui-eyebrow">Calibration 03 / contrast availability</p><h1>Can you see the inset square?</h1><p>${t('Keep brightness comfortable. This checks whether the display preserves the nominal {contrast}% condition; it does not calibrate luminance.', { contrast: Math.round(contrast * 100) })}</p><div class="ac-contrast__sample" style="--contrast-bg:${colors.background};--contrast-target:${colors.target}" role="img" aria-label="Low-contrast square inside a larger gray field"><i></i></div><div class="ui-cluster ac-calibration__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-contrast-visible">Yes, clearly</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-contrast-hidden">Not clearly</button></div><p class="ac-contrast__note">If unavailable, Acutezza skips Contrasto instead of producing a misleading value.</p></section>`,
  );
}

function acceptContrast() {
  state.session.contrast = state.session.pendingContrast;
  lockCalibration();
}

function rejectContrast() {
  if (state.session.pendingContrast < 0.2) renderContrastCheck({ stronger: true });
  else {
    state.session.contrast = null;
    lockCalibration();
  }
}

function lockCalibration() {
  const maxDiameterCssPx = maximumAcuityCanvasBox();
  const bounds = measurableGapBounds({
    distanceMm: state.session.calibration.distanceMm,
    cssPixelsPerMm: state.session.calibration.cssPixelsPerMm,
    devicePixelRatio: window.devicePixelRatio,
    maxDiameterCssPx,
    configuredMin: state.config.estimator.minGapArcmin,
    configuredMax: state.config.estimator.maxGapArcmin,
  });
  if (!(bounds.maxGapArcmin > bounds.minGapArcmin * 1.5))
    return renderCalibrationInvalid(
      'This display and distance cannot present a useful range of Landolt-ring sizes.',
    );
  Object.assign(state.session.calibration, { bounds, geometry: captureGeometry(), valid: true });
  state.session.theme = currentTheme();
  freezeTheme();
  renderCalibrationSummary();
}

function renderCalibrationSummary() {
  if (!ensureGeometry()) return;
  const calibration = state.session.calibration;
  renderScreen(
    `<section class="ac-calibration-summary ui-container ui-container--wide"><div class="ac-calibration-summary__hero"><p class="ui-eyebrow">Calibration locked</p><h1>The screen now has physical scale.</h1><p>Keep this viewport, browser zoom, orientation, viewing distance, and ${state.session.theme} surround unchanged.</p></div><dl class="ac-calibration-summary__grid"><div><dt>Card width</dt><dd>${Math.round(calibration.cardWidthCssPx)} CSS px</dd></div><div><dt>Viewing distance</dt><dd>${Math.round(calibration.distanceMm / 10)} cm · ${t(calibration.state)}</dd></div><div><dt>Low contrast</dt><dd>${state.session.contrast ? `${Math.round(state.session.contrast * 100)}% ${t('nominal')}` : 'Unavailable'}</dd></div><div><dt>Measurable gap range</dt><dd>${formatArcmin(calibration.bounds.minGapArcmin)}–${formatArcmin(calibration.bounds.maxGapArcmin)}</dd></div></dl><div class="ui-notice ${calibration.state === 'assumed' ? 'ui-notice--warning' : ''}"><strong>${calibration.state === 'measured' ? 'Measured setup' : 'Assumed distance'}</strong><p>${calibration.state === 'measured' ? 'Card scale and repeated blind-spot sweeps agreed.' : 'Screen scale is measured, but distance came from manual entry. Results retain this caution.'}</p></div><button class="ui-button ui-button--lg" type="button" data-action="ac-first-eye">${t('Prepare {eye}', { eye: t(eyeLabel(state.session.eyes[0])) })} <span aria-hidden="true">→</span></button></section>`,
  );
}

function renderEyeBrief() {
  if (!ensureGeometry()) return;
  clearRuntime();
  const eye = state.session.eyes[state.session.eyeIndex];
  const other = eye === 'right' ? 'left' : 'right';
  document.title = `${eyeLabel(eye)} — Acutezza | Sense6`;
  renderScreen(
    `<section class="ac-eye-brief ui-container ui-container--wide"><div class="ac-eye-brief__mark" aria-hidden="true">${eye === 'right' ? 'R' : 'L'}</div><div><p class="ui-eyebrow">${t('Eye {current} of 2 / {eye}', { current: state.session.eyeIndex + 1, eye: t(eyeLabel(eye)) })}</p><h1>${t('Cover the {eye}.', { eye: t(eyeLabel(other)) })}<br>${t('Keep the {eye} open.', { eye: t(eyeLabel(eye)) })}</h1><p class="ac-lede">${t('Use an opaque card or your palm without pressing the covered eye. Keep your head upright and remain at about {distance} cm.', { distance: Math.round(state.session.calibration.distanceMm / 10) })}</p><ul><li>Four easy practice targets come first.</li><li>Use the direction pad or matching number keys.</li><li>Guess when uncertain; do not move closer.</li></ul><button class="ui-button ui-button--lg" type="button" data-action="ac-begin-eye">Start practice <span aria-hidden="true">→</span></button></div></section>`,
  );
}

function beginEye() {
  if (!ensureGeometry()) return;
  const bounds = state.session.calibration.bounds;
  state.session.currentEye = {
    eye: state.session.eyes[state.session.eyeIndex],
    stage: 'practice',
    practiceIndex: 0,
    practiceOrientations: createOrientationSchedule(state.config.practiceTrials, state.session.random),
    high: createAcuityTrack({
      ...bounds,
      trials: state.config.high.trials,
      controlAt: state.config.high.controlAt,
      estimator: state.config.estimator,
      random: state.session.random,
    }),
    low: state.session.contrast
      ? createAcuityTrack({
          ...bounds,
          trials: state.config.low.trials,
          controlAt: state.config.low.controlAt,
          estimator: state.config.estimator,
          random: state.session.random,
        })
      : null,
    meridianSchedule: createMeridianSchedule({ ...state.config.meridian, random: state.session.random }),
    meridianRecords: [],
    meridianIndex: 0,
  };
  if (renderAcuityRunner()) prepareAcuityTrial();
}

function renderAcuityRunner() {
  if (!ensureGeometry()) return false;
  document.body.classList.add('lab-mode', 'ac-running');
  const stage = state.session.currentEye.stage;
  const info = stage === 'low' ? INSTRUMENTS.low : INSTRUMENTS.high;
  state.app.innerHTML = `<section class="ac-runner" data-ac-runner data-ac-stage="${stage}"><header class="ac-runner__header"><div><p class="ui-eyebrow">${stage === 'practice' ? 'Practice' : `${info.number} / ${info.name}`}</p><h1 tabindex="-1" data-ac-runner-heading>${eyeLabel(state.session.currentEye.eye)} ${stage === 'practice' ? 'practice' : info.name}</h1></div><span data-ac-count>Preparing…</span><button type="button" data-action="ac-stop">Stop safely</button></header><div class="ac-stimulus"><p data-ac-status aria-live="polite">Look at the ring and locate its opening.</p><canvas data-ac-optotype aria-label="Landolt ring target"></canvas><div class="ac-direction-pad" aria-label="Direction of the opening">${ACUITY_DIRECTIONS.map((direction) => `<button type="button" data-ac-direction="${direction.id}" aria-label="Gap ${directionLabel(direction.id)}"><span aria-hidden="true">${direction.symbol}</span><small>${direction.key}</small></button>`).join('')}</div><div class="ac-feedback" data-ac-feedback aria-live="polite"></div></div><footer class="ac-runner__footer"><span>${stage === 'low' ? `${Math.round(state.session.contrast * 100)}% ${t('nominal contrast')}` : 'High contrast'}</span><span>Keep distance fixed</span><span>Forced choice</span></footer></section>`;
  resetScrollAndFocus('[data-ac-runner-heading]');
  return true;
}

function prepareAcuityTrial() {
  if (!state.session?.currentEye || !ensureGeometry()) return;
  const eye = state.session.currentEye;
  if (eye.stage === 'practice') {
    if (eye.practiceIndex >= state.config.practiceTrials) return renderStageTransition('practice');
    state.activeTrial = withTrialIdentity({
      gapArcmin: Math.min(12, state.session.calibration.bounds.maxGapArcmin),
      orientation: eye.practiceOrientations[eye.practiceIndex],
      control: false,
      practice: true,
    });
  } else {
    const track = eye[eye.stage];
    if (track.complete) return renderStageTransition(eye.stage);
    state.activeTrial = withTrialIdentity(nextAcuityTrial(track));
  }
  if (!drawCurrentAcuity()) return;
  updateAcuityProgress();
  state.responseOpen = true;
  for (const button of state.app.querySelectorAll('[data-ac-direction]')) button.disabled = false;
}

function drawCurrentAcuity() {
  const canvas = state.app.querySelector('[data-ac-optotype]');
  if (!canvas || !state.activeTrial) return false;
  const boxCssPx = availableAcuityCanvasBox();
  const diameterCssPx = landoltDiameterCssPixels(
    state.activeTrial.gapArcmin,
    state.session.calibration.distanceMm,
    state.session.calibration.cssPixelsPerMm,
  );
  if (!(diameterCssPx > 0) || diameterCssPx > boxCssPx)
    return renderCalibrationInvalid(
      'This viewport cannot contain the calibrated Landolt ring without clipping.',
    );
  const direction = ACUITY_DIRECTIONS.find((entry) => entry.id === state.activeTrial.orientation);
  const colors =
    state.session.currentEye.stage === 'low'
      ? contrastGrays(state.session.contrast)
      : { target: 'rgb(16 16 16)', background: 'rgb(244 244 242)' };
  drawLandoltRing(canvas, {
    diameterCssPx,
    orientationDegrees: direction.degrees,
    target: colors.target,
    background: colors.background,
    boxCssPx,
  });
  Object.assign(canvas.dataset, {
    trialId: state.activeTrial.id,
    gap: String(state.activeTrial.gapArcmin),
    orientation: state.activeTrial.orientation,
    diameter: String(diameterCssPx),
  });
  return true;
}

function chooseDirection(direction) {
  if (!state.responseOpen || !state.activeTrial || !state.session?.currentEye) return;
  state.responseOpen = false;
  for (const button of state.app.querySelectorAll('[data-ac-direction]')) button.disabled = true;
  const eye = state.session.currentEye;
  const trial = state.activeTrial;
  const correct = direction === state.activeTrial.orientation;
  const feedback = state.app.querySelector('[data-ac-feedback]');
  if (eye.stage === 'practice') {
    if (feedback)
      feedback.textContent = t(
        correct
          ? 'Yes — that is the opening.'
          : 'Try the same target again. Follow the opening, not the ring.',
      );
    if (correct) eye.practiceIndex += 1;
  } else {
    recordAcuityResponse(eye[eye.stage], trial, direction);
    if (feedback)
      feedback.textContent = t(
        state.activeTrial.control && !correct
          ? 'Easy control missed; setup confidence will be limited.'
          : 'Response recorded.',
      );
  }
  trial.responseCommitted = true;
  state.pendingAdvance = true;
  state.feedbackTimer = window.setTimeout(advanceCommittedTrial, state.config.feedbackMs);
}

function updateAcuityProgress() {
  const count = state.app.querySelector('[data-ac-count]');
  if (!count) return;
  const eye = state.session.currentEye;
  count.textContent =
    eye.stage === 'practice'
      ? `${eye.practiceIndex + 1} / ${state.config.practiceTrials}`
      : `${eye[eye.stage].records.length + 1} / ${eye[eye.stage].trials}`;
}

function renderStageTransition(completed) {
  if (!ensureGeometry()) return;
  clearRuntime();
  document.body.classList.remove('ac-running');
  const eye = state.session.currentEye;
  if (completed === 'practice') {
    eye.stage = 'high';
    return renderTransition(
      'Practice complete',
      'Now measure high-contrast sharpness.',
      'Begin Nitidezza',
      'ac-next-acuity',
    );
  }
  if (completed === 'high' && eye.low) {
    eye.stage = 'low';
    const summary = summarizeAcuity(eye.high);
    return renderTransition(
      'Instrument 01 complete',
      t('A calibrated estimate was recorded with {trials} measured targets.', {
        trials: summary.trials,
      }),
      'Continue to Contrasto',
      'ac-next-acuity',
    );
  }
  eye.stage = 'meridian';
  const note =
    completed === 'high'
      ? 'Contrasto is unavailable on this setup, so no low-contrast value will be inferred.'
      : 'High- and low-contrast estimates remain separate in the result.';
  renderTransition('Threshold tasks complete', note, 'Continue to Meridiani', 'ac-next-meridian');
}

function renderTransition(eyebrow, title, button, action) {
  renderScreen(
    `<section class="ac-transition ui-container"><span class="ac-transition__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">${eyebrow}</p><h1>${title}</h1><p>Rest your eye for a moment. Keep the same correction, distance, screen, and covered eye.</p><button class="ui-button ui-button--lg" type="button" data-action="${action}">${button} <span aria-hidden="true">→</span></button></section>`,
  );
}

function continueAcuity() {
  if (!ensureGeometry()) return;
  if (
    state.session.currentEye.stage === 'high' &&
    state.session.currentEye.high.records.length === 0 &&
    !state.session.metricStarted
  ) {
    state.session.metricStarted = true;
    trackMetric(METRIC_EVENTS.testStarted, METRIC_TESTS.acutezza);
  }
  if (renderAcuityRunner()) prepareAcuityTrial();
}

function renderMeridianRunner() {
  if (!ensureGeometry()) return;
  document.body.classList.add('lab-mode', 'ac-running');
  const eye = state.session.currentEye;
  if (eye.meridianIndex >= eye.meridianSchedule.length) return finishEye();
  state.activeTrial = withTrialIdentity(eye.meridianSchedule[eye.meridianIndex]);
  state.responseOpen = true;
  state.app.innerHTML = `<section class="ac-runner ac-meridian-runner" data-ac-meridian-runner data-ac-trial-id="${state.activeTrial.id}"><header class="ac-runner__header"><div><p class="ui-eyebrow">03 / Meridiani</p><h1 tabindex="-1" data-ac-runner-heading>${eyeLabel(eye.eye)} Meridiani</h1></div><span>${eye.meridianIndex + 1} / ${eye.meridianSchedule.length}</span><button type="button" data-action="ac-stop">Stop safely</button></header><div class="ac-meridian"><p>Without moving closer, which line field looks clearer?</p><div class="ac-meridian__fields"><canvas data-ac-meridian="left" aria-label="Left line field"></canvas><canvas data-ac-meridian="right" aria-label="Right line field"></canvas></div><div class="ac-meridian__choices"><button type="button" data-ac-meridian-choice="left"><span aria-hidden="true">←</span> Left clearer <small>1</small></button><button type="button" data-ac-meridian-choice="equal">No difference <small>2</small></button><button type="button" data-ac-meridian-choice="right">Right clearer <span aria-hidden="true">→</span><small>3</small></button></div><div class="ac-feedback" data-ac-feedback aria-live="polite"></div></div><footer class="ac-runner__footer"><span>Two repeated scales</span><span>Changing pixel phase</span><span>No astigmatism claim</span></footer></section>`;
  drawCurrentMeridians();
  resetScrollAndFocus('[data-ac-runner-heading]');
}

function drawCurrentMeridians() {
  const size = Math.max(120, Math.min(210, (window.innerWidth - 64) / 2, window.innerHeight - 420));
  for (const side of ['left', 'right']) {
    const canvas = state.app.querySelector(`[data-ac-meridian="${side}"]`);
    const angleDegrees = state.activeTrial[`${side}Angle`];
    drawMeridianField(canvas, {
      angleDegrees,
      scale: state.activeTrial.scale,
      phase: state.activeTrial.phase,
      boxCssPx: size,
    });
    canvas.dataset.angle = String(angleDegrees);
  }
}

function chooseMeridian(choice) {
  if (!state.responseOpen || !state.activeTrial || !state.session?.currentEye) return;
  state.responseOpen = false;
  const trial = state.activeTrial;
  state.session.currentEye.meridianRecords.push({ ...trial, choice });
  state.session.currentEye.meridianIndex += 1;
  for (const button of state.app.querySelectorAll('[data-ac-meridian-choice]')) button.disabled = true;
  state.app.querySelector('[data-ac-feedback]').textContent = t('Comparison recorded.');
  trial.responseCommitted = true;
  state.pendingAdvance = true;
  state.feedbackTimer = window.setTimeout(advanceCommittedTrial, state.config.feedbackMs);
}

function finishEye() {
  if (!ensureGeometry()) return;
  clearRuntime();
  document.body.classList.remove('ac-running');
  const eye = state.session.currentEye;
  const high = summarizeAcuity(eye.high);
  const low = eye.low ? summarizeAcuity(eye.low) : null;
  const contrastCost = summarizeContrastCost(high, low);
  const meridian = summarizeMeridians(eye.meridianRecords, state.config.meridian);
  state.session.eyeResults.push({
    eye: eye.eye,
    high,
    low,
    contrastCostPercent: contrastCost.value,
    contrastCostBounded: contrastCost.bounded,
    meridian,
  });
  state.session.currentEye = null;
  if (state.session.eyeIndex === 0) renderBetweenEyes();
  else renderResults();
}

function renderBetweenEyes() {
  if (!ensureGeometry()) return;
  const result = state.session.eyeResults[0];
  const nextEye = state.session.eyes[1];
  renderScreen(
    `<section class="ac-between ui-container ui-container--wide"><div><p class="ui-eyebrow">First eye complete</p><h1>${eyeLabel(result.eye)} recorded.<br>Rest before switching.</h1><p>Uncover both eyes and blink normally. The completed eye is retained in this session.</p></div><aside><p class="ui-eyebrow">Provisional observations</p><strong>${formatBoundedAcuity(result.high)}</strong><span>high-contrast angular gap</span><p>${result.meridian.stable ? `Stable ${result.meridian.preferredAngle}° preference appeared.` : 'No stable meridional preference appeared.'}</p></aside><div class="ui-cluster"><button class="ui-button ui-button--lg" type="button" data-action="ac-next-eye">Check distance, then test ${eyeLabel(nextEye)} <span aria-hidden="true">→</span></button><button class="ui-button ui-button--ghost" type="button" data-action="ac-finish-one-eye">Finish with one eye</button></div></section>`,
  );
}

function startNextEye() {
  if (!ensureGeometry()) return;
  state.session.eyeIndex = 1;
  if (state.session.calibration.state === 'measured') renderBlindSpotCalibration({ recheck: true });
  else renderAssumedDistanceRecheck();
}

function renderAssumedDistanceRecheck() {
  if (!ensureGeometry()) return;
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Between-eye setup check</p><h1>${t('Return to {distance} cm.', { distance: Math.round(state.session.calibration.distanceMm / 10) })}</h1><p>Re-measure from eye to screen, confirm the viewport is unchanged, then continue.</p><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-next-eye">Setup unchanged — continue</button></section>`,
  );
}

function finishDistanceRecheck(distanceMm) {
  const difference =
    Math.abs(distanceMm - state.session.calibration.distanceMm) / state.session.calibration.distanceMm;
  if (difference > 0.2)
    return renderCalibrationInvalid(
      'The between-eye distance check differed by more than 20%. Recalibrate before continuing.',
    );
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">Distance coherent</p><h1>The setup remains close to the original distance.</h1><p>The quick check differed by ${formatNumber(difference * 100, { maximumFractionDigits: 1 })}%.</p><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-next-eye">Prepare ${eyeLabel(state.session.eyes[1])} <span aria-hidden="true">→</span></button></section>`,
  );
}

function confirmNextEye() {
  if (!geometryMatches(state.session.calibration.geometry, captureGeometry()))
    return renderCalibrationInvalid('The viewport changed between eyes. Recalibrate before continuing.');
  renderEyeBrief();
}

function renderResults() {
  if (!ensureGeometry()) return;
  clearRuntime();
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.acutezza);
  document.body.classList.add('lab-mode');
  const summaries = state.session.eyeResults.flatMap((result) => [result.high, result.low].filter(Boolean));
  const controlCorrect = summaries.reduce((sum, result) => sum + result.controlCorrect, 0);
  const controlCount = summaries.reduce((sum, result) => sum + result.controls, 0);
  const bounded = summaries.some((result) => result.atFloor || result.atCeiling);
  const usable =
    state.session.calibration.valid && (controlCount === 0 || controlCorrect >= controlCount - 1);
  const setupQuality =
    usable && !bounded ? 'Setup checks coherent' : usable ? 'Interpret with caution' : 'Run unusable';
  state.session.result = { setupQuality, usable, bounded, controlCorrect, controlCount };
  saveLast({ setupQuality, eyes: state.session.eyeResults.length, recordedAt: Date.now() });
  saveJournalResult({ setupQuality, usable, bounded, controlCorrect, controlCount });
  releaseThemeFreeze();
  document.title = t('Your calibrated sharpness profile — Acutezza | Sense6');
  renderScreen(
    `<section class="ac-results ui-container ui-container--wide"><button class="back-link" type="button" data-action="ac-home"><span aria-hidden="true">←</span> All tests</button><header class="ac-results__hero"><div><p class="ui-eyebrow">Acutezza / this display / this distance</p><h1>Separate observations.<br><em>No vision label.</em></h1><p>${usable ? 'The calibration and task controls support interpretation of this run at the stated distance.' : 'A calibration or task-control check was limited. Repeat before comparing runs.'}</p></div><div class="ac-results__stamp ${usable && !bounded ? '' : 'is-limited'}"><span>${setupQuality}</span><strong>${String(state.session.eyeResults.length).padStart(2, '0')} / 02</strong></div></header><div class="ac-eye-results">${state.session.eyeResults.map(eyeResultMarkup).join('')}</div><div class="ac-context-grid"><article class="ui-card"><p class="ui-eyebrow">Run context</p><h2>What travelled with the target.</h2><dl><div><dt>Correction</dt><dd>${correctionLabel(state.session.correction)}</dd></div><div><dt>Distance</dt><dd>${Math.round(state.session.calibration.distanceMm / 10)} cm · ${t(state.session.calibration.state)}</dd></div><div><dt>Card scale</dt><dd>${Math.round(state.session.calibration.cardWidthCssPx)} CSS px</dd></div><div><dt>Low contrast</dt><dd>${contrastLabel()}</dd></div><div><dt>Surround theme</dt><dd>${state.session.theme}</dd></div><div><dt>Task controls</dt><dd>${controlCorrect} / ${controlCount}</dd></div><div><dt>Interruptions</dt><dd>${state.session.interruptions}</dd></div></dl></article><article class="ui-card"><p class="ui-eyebrow">Interpretation boundary</p><h2>Calibrated experiment, not an eye examination.</h2><p>Acutezza describes one self-administered run on this display at this estimated distance. It is not vision screening, diagnosis, or a prescription.</p><p>Do not infer normal vision, 20/20, refractive error, cylinder power, or an astigmatism axis.</p></article></div><aside class="ac-results__safety"><strong>Sudden changes need care, not another run.</strong><p>Promptly seek professional assessment for sudden vision loss, severe eye pain, new flashes or floaters, or a curtain or shadow in the visual field.</p></aside><div class="ui-cluster ac-results__actions"><button class="ui-button" type="button" data-action="ac-restart">Run again</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-copy">Copy result summary</button></div></section>`,
  );
}

function eyeResultMarkup(result) {
  const lowValue = result.low ? formatBoundedAcuity(result.low) : 'Unavailable';
  const cost = result.contrastCostPercent;
  const meridianValue = result.meridian.stable
    ? `${result.meridian.preferredAngle}° preference`
    : 'No stable preference';
  const costDetail = result.contrastCostBounded
    ? 'Contrast cost is indeterminate because an estimate meets the display range.'
    : cost === null
      ? 'not measured'
      : t('{cost}% gap size versus high contrast', {
          cost: `${cost >= 0 ? '+' : ''}${formatNumber(cost)}`,
        });
  const consistency = t('{consistency}% leading-choice consistency', {
    consistency: formatNumber(result.meridian.consistencyPercent),
  });
  return `<section class="ac-eye-result" aria-label="${eyeLabel(result.eye)}"><header><p class="ui-eyebrow">${eyeLabel(result.eye)}</p><h2>Three measures for this eye.</h2></header><div class="ac-metric-grid">${resultCard('01', 'High-contrast angular gap', formatBoundedAcuity(result.high), acuityInterval(result.high), acuityInterpretation(result.high, 'A calibrated angular threshold from forced-choice trials.'))}${resultCard('02', 'Low-contrast angular gap', lowValue, result.low ? acuityInterval(result.low) : 'not measured', result.low ? `${costDetail} A within-run difference, not clinical contrast sensitivity.` : 'The display could not preserve a dependable low-contrast condition.')}${resultCard('03', 'Meridional consistency', meridianValue, consistency, result.meridian.stable ? 'The preference repeated at both scales. It does not identify astigmatism.' : 'No preference met the replication rule across scale and pixel phase.')}</div></section>`;
}

function resultCard(index, label, value, detail, copy) {
  return `<article class="ac-metric"><div><span>${index}</span><p>${label}</p></div><strong>${value}</strong><small>${detail}</small><p>${copy}</p></article>`;
}

function copyResults() {
  if (!state.session?.result) return;
  const resultState = state.session.result;
  const lines = [
    t('Acutezza — calibrated sharpness profile'),
    t('Setup: {distance} cm ({distanceState}); correction: {correction}', {
      distance: Math.round(state.session.calibration.distanceMm / 10),
      distanceState: t(state.session.calibration.state),
      correction: t(correctionLabel(state.session.correction)),
    }),
    `Calibration: card ${Math.round(state.session.calibration.cardWidthCssPx)} CSS px; contrast ${contrastLabel()}; surround ${state.session.theme}`,
    `Quality: ${resultState.setupQuality}; controls ${resultState.controlCorrect} / ${resultState.controlCount}; interruptions ${state.session.interruptions}`,
  ];
  for (const result of state.session.eyeResults)
    lines.push(
      t(
        '{eye}: high-contrast gap {gap}; low-contrast gap {low}; contrast cost {cost}; meridians {meridians}',
        {
          eye: t(eyeLabel(result.eye)),
          gap: clipboardAcuity(result.high),
          low: result.low ? clipboardAcuity(result.low) : t('Unavailable'),
          cost: result.contrastCostBounded
            ? t('indeterminate (display-range bound)')
            : result.contrastCostPercent === null
              ? t('not measured')
              : `${result.contrastCostPercent >= 0 ? '+' : ''}${formatNumber(result.contrastCostPercent)}%`,
          meridians: result.meridian.stable
            ? `${result.meridian.preferredAngle}° ${t('preference')}`
            : t('no stable preference'),
        },
      ),
    );
  if (!resultState.usable || resultState.bounded)
    lines.push(t('Interpret with caution; repeat before comparing runs.'));
  lines.push(t('This is not vision screening, diagnosis, or a prescription.'));
  navigator.clipboard
    ?.writeText(lines.join('\n'))
    .then(() => toast('Result summary copied.'))
    .catch(() => toast('Copy was unavailable in this browser.'));
}

function pauseRun() {
  if (!state.session?.currentEye || !document.body.classList.contains('ac-running')) return;
  clearTimeout(state.feedbackTimer);
  state.feedbackTimer = 0;
  state.responseOpen = false;
  state.session.interruptions += 1;
  document.body.classList.remove('ac-running');
  const committed = state.pendingAdvance || state.activeTrial?.responseCommitted;
  renderScreen(
    `<section class="ac-transition ui-container" data-ac-paused><span class="ac-transition__mark" aria-hidden="true">Ⅱ</span><p class="ui-eyebrow">Vision task paused</p><h1>${committed ? 'Your response was recorded.' : 'The unanswered target will be presented again.'}</h1><p>Return when the tab can stay visible. Keep the same distance and covered eye. ${committed ? 'Resume advances to the next target exactly once.' : 'No response was counted.'}</p><button class="ui-button ui-button--lg" type="button" data-action="ac-resume">Resume this instrument <span aria-hidden="true">→</span></button></section>`,
  );
}

function resumeRun() {
  if (!ensureGeometry()) return;
  const stage = state.session.currentEye.stage;
  const shouldAdvance = state.pendingAdvance || state.activeTrial?.responseCommitted;
  state.pendingAdvance = false;
  state.activeTrial = null;
  if (stage === 'meridian') return renderMeridianRunner();
  if (renderAcuityRunner()) prepareAcuityTrial();
  if (!shouldAdvance)
    state.app.querySelector('[data-ac-status]').textContent = t('The unanswered target is presented again.');
}

function geometryChanged() {
  clearTimeout(state.geometryTimer);
  if (!hasLockedSession()) return;
  state.geometryTimer = window.setTimeout(() => {
    ensureGeometry('Browser zoom, viewport size, pixel ratio, or orientation changed during the run.');
  }, 120);
}

function ensureGeometry(
  reason = 'Browser zoom, viewport size, pixel ratio, or orientation changed after calibration.',
) {
  if (!hasLockedSession()) return true;
  if (geometryMatches(state.session.calibration.geometry, captureGeometry())) return true;
  return renderCalibrationInvalid(reason);
}

function hasLockedSession() {
  return Boolean(state.session?.calibration?.valid && !state.session.result);
}

function themeChanged() {
  if (!hasLockedSession() || currentTheme() === state.session.theme) return;
  renderCalibrationInvalid('The light or dark surround changed after calibration.');
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function freezeTheme() {
  const toggle = document.querySelector('[data-bronto-theme-toggle]');
  if (!(toggle instanceof HTMLButtonElement)) return;
  state.themeToggle = toggle;
  state.themeToggleWasDisabled = toggle.disabled;
  toggle.disabled = true;
  toggle.setAttribute('aria-description', 'Theme is fixed during the calibrated Acutezza session.');
}

function releaseThemeFreeze() {
  const toggle = state?.themeToggle;
  if (!(toggle instanceof HTMLButtonElement)) return;
  toggle.disabled = state.themeToggleWasDisabled;
  toggle.removeAttribute('aria-description');
  state.themeToggle = null;
  state.themeToggleWasDisabled = false;
}

function renderCalibrationInvalid(reason) {
  clearRuntime();
  if (state.session?.calibration) state.session.calibration.valid = false;
  releaseThemeFreeze();
  document.body.classList.remove('ac-running');
  renderScreen(
    `<section class="ac-blocked ui-container"><span aria-hidden="true">!</span><p class="ui-eyebrow">Calibration invalid</p><h1>The measured geometry changed.</h1><p>${reason}</p><p>No unfinished value will be saved. Return to a stable display and calibrate again.</p><button class="ui-button ui-button--lg" type="button" data-action="ac-recalibrate">Recalibrate</button></section>`,
  );
  return false;
}

function captureGeometry() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    scale: window.visualViewport?.scale ?? 1,
    orientation: screen.orientation?.type ?? `${window.orientation ?? 0}`,
  };
}

function geometryMatches(left, right) {
  return (
    left &&
    Math.abs(left.width - right.width) <= 2 &&
    Math.abs(left.height - right.height) <= 20 &&
    Math.abs(left.dpr - right.dpr) < 0.01 &&
    Math.abs(left.scale - right.scale) < 0.01 &&
    left.orientation === right.orientation
  );
}

function guardShellNavigation(event) {
  const link = event.target.closest?.('a[data-sense6-route]');
  if (!link || !hasLockedSession()) return;
  if (window.confirm('Stop the calibrated Acutezza session and leave? No unfinished result will be saved.'))
    return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function guardLocaleNavigation(event) {
  if (!event.target.matches?.('[data-locale-select]') || !hasLockedSession()) return;
  if (
    window.confirm(
      'Changing language stops the calibrated Acutezza session. Leave without saving an unfinished result?',
    )
  )
    return;
  event.preventDefault();
  event.stopImmediatePropagation();
  event.target.value = state.locale;
}

function guardBrowserNavigation(event) {
  if (!hasLockedSession() || event.navigationType !== 'traverse' || !event.cancelable) return;
  if (
    window.confirm(
      'Browser navigation stops the calibrated Acutezza session. Leave without saving an unfinished result?',
    )
  )
    return;
  event.preventDefault();
}

function guardPageExit(event) {
  if (!hasLockedSession()) return;
  event.preventDefault();
  event.returnValue = '';
}

function wireEvents(signal) {
  document.addEventListener('click', guardShellNavigation, { capture: true, signal });
  document.addEventListener('change', guardLocaleNavigation, { capture: true, signal });
  window.navigation?.addEventListener('navigate', guardBrowserNavigation, { signal });
  window.addEventListener('beforeunload', guardPageExit, { signal });
  document.addEventListener(
    'click',
    (event) => {
      const direction = event.target.closest('[data-ac-direction]');
      const meridian = event.target.closest('[data-ac-meridian-choice]');
      if (direction) chooseDirection(direction.dataset.acDirection);
      if (meridian) chooseMeridian(meridian.dataset.acMeridianChoice);
      const action = event.target.closest('[data-action]');
      if (!action) return;
      const actions = {
        'ac-home': () => state.goHome(),
        'ac-intro': renderIntro,
        'ac-prepare': renderPreparation,
        'ac-method': () => state.app.querySelector('#ac-method')?.scrollIntoView({ behavior: 'smooth' }),
        'ac-card': beginCalibration,
        'ac-card-smaller': () => adjustCard(-4),
        'ac-card-larger': () => adjustCard(4),
        'ac-confirm-card': confirmCard,
        'ac-card-no-fit': renderCardNoFit,
        'ac-card-retry': renderCardCalibration,
        'ac-start-sweep': startSweep,
        'ac-record-sweep': recordSweep,
        'ac-repeat-distance': () => renderBlindSpotCalibration(),
        'ac-accept-distance': acceptDistance,
        'ac-manual-distance': renderManualDistance,
        'ac-confirm-manual-distance': confirmManualDistance,
        'ac-contrast-visible': acceptContrast,
        'ac-contrast-hidden': rejectContrast,
        'ac-first-eye': renderEyeBrief,
        'ac-begin-eye': beginEye,
        'ac-next-acuity': continueAcuity,
        'ac-next-meridian': renderMeridianRunner,
        'ac-next-eye': startNextEye,
        'ac-confirm-next-eye': confirmNextEye,
        'ac-finish-one-eye': renderResults,
        'ac-resume': resumeRun,
        'ac-stop': () => {
          renderIntro();
          toast('Vision task stopped. No unfinished result was saved.');
        },
        'ac-restart': renderPreparation,
        'ac-copy': copyResults,
        'ac-recalibrate': renderPreparation,
      };
      actions[action.dataset.action]?.();
    },
    { signal },
  );
  document.addEventListener(
    'change',
    (event) => {
      if (event.target.matches('[data-ac-consent]'))
        state.app.querySelector('[data-action="ac-card"]').disabled = !event.target.checked;
    },
    { signal },
  );
  document.addEventListener(
    'input',
    (event) => event.target.matches('[data-ac-card-size]') && updateCardSize(),
    { signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat || event.target.matches('input, select, textarea')) return;
      if (state.sweepFrame && event.code === 'Space') {
        event.preventDefault();
        return recordSweep();
      }
      if (!state.responseOpen) return;
      if (state.session?.currentEye?.stage === 'meridian') {
        const choices = {
          1: 'left',
          ArrowLeft: 'left',
          2: 'equal',
          ArrowDown: 'equal',
          3: 'right',
          ArrowRight: 'right',
        };
        if (choices[event.key]) {
          event.preventDefault();
          chooseMeridian(choices[event.key]);
        }
        return;
      }
      const direction = ACUITY_DIRECTIONS.find(
        (entry) =>
          entry.key === event.key ||
          (entry.id === 'up' && event.key === 'ArrowUp') ||
          (entry.id === 'right' && event.key === 'ArrowRight') ||
          (entry.id === 'down' && event.key === 'ArrowDown') ||
          (entry.id === 'left' && event.key === 'ArrowLeft'),
      );
      if (direction) {
        event.preventDefault();
        chooseDirection(direction.id);
      }
    },
    { signal },
  );
  document.addEventListener('visibilitychange', () => document.hidden && pauseRun(), { signal });
  window.addEventListener('resize', geometryChanged, { signal });
  window.addEventListener('orientationchange', geometryChanged, { signal });
  window.visualViewport?.addEventListener('resize', geometryChanged, { signal });
}

function clearSweep() {
  cancelAnimationFrame(state.sweepFrame);
  state.sweepFrame = 0;
  state.sweepStartedAt = 0;
  state.sweepGeometry = null;
  const record = state.app?.querySelector('[data-action="ac-record-sweep"]');
  if (record) record.disabled = true;
}

function clearRuntime() {
  clearSweep();
  clearTimeout(state.feedbackTimer);
  clearTimeout(state.geometryTimer);
  state.feedbackTimer = 0;
  state.geometryTimer = 0;
  state.responseOpen = false;
  state.activeTrial = null;
  state.pendingAdvance = false;
}

function advanceCommittedTrial() {
  if (!state.pendingAdvance || !state.session?.currentEye) return;
  clearTimeout(state.feedbackTimer);
  state.feedbackTimer = 0;
  state.pendingAdvance = false;
  state.activeTrial = null;
  if (state.session.currentEye.stage === 'meridian') renderMeridianRunner();
  else prepareAcuityTrial();
}

function withTrialIdentity(trial) {
  state.trialSequence += 1;
  return { ...trial, id: `acutezza-${state.trialSequence}`, responseCommitted: false };
}

function maximumAcuityCanvasBox() {
  const shortWide = window.innerWidth >= 701 && window.innerHeight <= 760;
  const blockBudget = window.innerHeight - (shortWide ? 192 : 350);
  return Math.max(96, Math.floor(Math.min(340, window.innerWidth - 24, blockBudget)));
}

function availableAcuityCanvasBox() {
  const stimulus = state.app.querySelector('.ac-stimulus');
  const canvas = state.app.querySelector('[data-ac-optotype]');
  if (!stimulus || !canvas) return maximumAcuityCanvasBox();
  const style = getComputedStyle(stimulus);
  const paddingInline =
    Number.parseFloat(style.paddingInlineStart) + Number.parseFloat(style.paddingInlineEnd);
  const paddingBlock = Number.parseFloat(style.paddingBlockStart) + Number.parseFloat(style.paddingBlockEnd);
  const gap = Number.parseFloat(style.rowGap) || 0;
  const statusHeight = state.app.querySelector('[data-ac-status]')?.getBoundingClientRect().height ?? 0;
  const controlsHeight = state.app.querySelector('.ac-direction-pad')?.getBoundingClientRect().height ?? 0;
  const feedbackHeight = state.app.querySelector('.ac-feedback')?.getBoundingClientRect().height ?? 0;
  const shortWide = window.innerWidth >= 701 && window.innerHeight <= 760;
  const reserved = shortWide
    ? statusHeight + feedbackHeight + paddingBlock + gap * 2
    : statusHeight + controlsHeight + feedbackHeight + paddingBlock + gap * 3;
  const blockBudget = stimulus.clientHeight - reserved;
  const inlineBudget = shortWide ? stimulus.clientWidth * 0.42 : stimulus.clientWidth - paddingInline;
  return Math.max(1, Math.floor(Math.min(maximumAcuityCanvasBox(), blockBudget, inlineBudget)));
}

function renderScreen(markup) {
  state.app.innerHTML = markup;
  resetScrollAndFocus('h1');
}

function resetScrollAndFocus(selector) {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const heading = state.app.querySelector(selector);
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
}

function directionLabel(direction) {
  return (
    {
      up: 'at top',
      'up-right': 'at upper right',
      right: 'at right',
      'down-right': 'at lower right',
      down: 'at bottom',
      'down-left': 'at lower left',
      left: 'at left',
      'up-left': 'at upper left',
    }[direction] ?? direction
  );
}

function eyeLabel(eye) {
  return eye === 'right' ? 'Right eye' : 'Left eye';
}
function correctionLabel(correction) {
  return (
    { none: 'No correction', glasses: 'Glasses', contacts: 'Contact lenses' }[correction] ?? 'No correction'
  );
}

function contrastLabel() {
  return state.session.contrast === null
    ? t('Unavailable')
    : `${Math.round(state.session.contrast * 100)}% ${t('nominal')}`;
}

function formatArcmin(value) {
  return `${formatNumber(value, { maximumFractionDigits: 2 })} arcmin`;
}

function formatBoundedAcuity(result) {
  const prefix = result.atFloor ? '≤ ' : result.atCeiling ? '≥ ' : '';
  return `${prefix}${formatArcmin(result.thresholdArcmin)}`;
}

function acuityInterval(result) {
  const interval = t('{lower}–{upper} uncertainty interval', {
    lower: formatArcmin(result.lowerArcmin),
    upper: formatArcmin(result.upperArcmin),
  });
  const bound = acuityBoundLabel(result);
  return bound ? `${interval} · ${bound}` : interval;
}

function acuityBoundLabel(result) {
  if (result.atFloor) return t('upper bound at the display floor');
  if (result.atCeiling) return t('lower bound at the display ceiling');
  return '';
}

function acuityInterpretation(result, fallback) {
  const bound = acuityBoundLabel(result);
  const article = result.atFloor ? 'an' : 'a';
  return bound ? `The estimate is ${article} ${bound}; do not read it as an exact threshold.` : fallback;
}

function clipboardAcuity(result) {
  const bound = acuityBoundLabel(result);
  const details = [
    `${formatArcmin(result.lowerArcmin)}–${formatArcmin(result.upperArcmin)} interval`,
    `controls ${result.controlCorrect} / ${result.controls}`,
  ];
  if (bound) details.push(bound);
  return `${formatBoundedAcuity(result)} (${details.join('; ')})`;
}

function runtimeConfig() {
  const override =
    import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
      ? window.__SENSORIA_TEST_CONFIG__?.acutezza
      : null;
  return mergeAcuityConfig(override);
}

function saveLast(result) {
  if (!RESULT_STORE.save(result)) {
    if (state.announcer)
      state.announcer.textContent = t('The result is ready, but local storage was unavailable.');
  }
}

function saveJournalResult({ setupQuality, usable, bounded, controlCorrect, controlCount }) {
  const measurements = state.session.eyeResults.flatMap((eye) => {
    const prefix = eye.eye;
    return [
      acuityMeasurement(`${prefix}-high`, eye.high),
      ...(eye.low ? [acuityMeasurement(`${prefix}-low`, eye.low)] : []),
      { id: `${prefix}-contrast-cost`, value: eye.contrastCostPercent, unit: '%' },
      {
        id: `${prefix}-meridian`,
        value: eye.meridian.consistencyPercent,
        unit: '%',
      },
    ];
  });
  const entry = createJournalEntry({
    examId: 'acutezza',
    locale: state.locale,
    quality: usable && !bounded ? 'usable' : usable ? 'caution' : 'limited',
    setup: {
      ...captureDisplayPassport(),
      correction: state.session.correction,
      distanceMm: state.session.calibration.distanceMm,
      calibrationState: state.session.calibration.state,
      cardWidthCssPx: Math.round(state.session.calibration.cardWidthCssPx),
      contrastPercent: state.session.contrast === null ? null : state.session.contrast * 100,
      theme: state.session.theme,
      setupQuality,
      controlsCorrect: controlCorrect,
      controlsPresented: controlCount,
      interruptions: state.session.interruptions,
    },
    measurements,
    notes: [
      ...(bounded ? ['display-range-bound'] : []),
      ...(!usable ? ['setup-check-limited'] : []),
      ...(state.session.contrast === null ? ['low-contrast-unavailable'] : []),
    ],
  });
  if (entry) appendJournalEntry(entry);
}

function acuityMeasurement(id, result) {
  return {
    id,
    value: result.thresholdArcmin,
    unit: 'arcmin',
    lower: result.lowerArcmin,
    upper: result.upperArcmin,
    ...(result.atFloor ? { bound: 'upper' } : result.atCeiling ? { bound: 'lower' } : {}),
  };
}

function loadLast() {
  return RESULT_STORE.load();
}
