import { toast } from '@ponchia/ui/behaviors';
import '../styles/acutezza.css';
import { formatNumber, m, t } from '../i18n.js';
import {
  ACUITY_DIRECTIONS,
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  contrastGrays,
  createAcuityTrack,
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
} from '../lib/acuity.js';
import { appendJournalEntry, captureDisplayPassport, createJournalEntry } from '../lib/journal.js';
import { createExamLifecycle } from '../lib/lifecycle.js';
import { drawLandoltRing } from '../lib/optotypes.js';
import { seededRandom } from '../lib/random.js';
import { resultActionLabel, shareOrCopyResult } from '../lib/result-sharing.js';
import { createResultStore } from '../lib/storage.js';
import { METRIC_EVENTS, METRIC_TESTS, trackMetric } from '../metrics.js';
import { protocolPassport } from './protocols.js';
import {
  isAcutezzaLatestResult,
  isLegacyAcutezzaLatestResult,
  migrateLegacyAcutezzaLatestResult,
} from './results/acutezza.js';
import { ACUTEZZA_INSTRUMENTS, acutezzaIntroMarkup } from './views/acutezza-intro.js';

const STORAGE_KEY = 'sense6:acutezza:last';
const LEGACY_RESULT_STORE = createResultStore({
  key: STORAGE_KEY,
  version: 1,
  validate: isLegacyAcutezzaLatestResult,
});
const RESULT_STORE = createResultStore({
  key: STORAGE_KEY,
  version: 2,
  validate: isAcutezzaLatestResult,
  migrations: { 2: migrateLegacyAcutezzaLatestResult },
});
const MOUNT_OWNER = Symbol('acutezza');
let state = null;

export function mount(context) {
  const lifecycle = createExamLifecycle(MOUNT_OWNER, {
    bodyClasses: ['ac-active', 'lab-mode', 'ac-running'],
  });
  const mountState = {
    app: context.app,
    announcer: context.announcer,
    goHome: context.navigateHome,
    goJournal: () => context.navigate('journal'),
    lifecycle,
    locale: context.locale,
    config: runtimeConfig(),
    selectedScope: 'standard',
    session: null,
    activeTrial: null,
    responseOpen: false,
    feedbackTimer: 0,
    sweepFrame: 0,
    sweepCheckFrame: 0,
    sweepStartedAt: 0,
    sweepGeometry: null,
    geometryTimer: 0,
    pendingAdvance: false,
    trialSequence: 0,
  };
  state = mountState;
  document.body.classList.add('ac-active');
  wireEvents(lifecycle.signal);
  const themeObserver = new MutationObserver(() => {
    if (isCurrentMount(mountState)) themeChanged();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  renderIntro();
  lifecycle.onCleanup(() => {
    clearRuntime();
    themeObserver.disconnect();
    mountState.session = null;
    if (state === mountState) state = null;
  });
  return lifecycle.dispose;
}

function renderIntro() {
  state.lifecycle.setActive(false);
  clearRuntime();
  state.session = null;
  document.body.classList.remove('lab-mode', 'ac-running');
  document.title = t('Calibrated sharpness experiment — Acutezza | Sense6');
  const previous = loadLast();
  renderScreen(acutezzaIntroMarkup(previous, m));
}

function renderPreparation() {
  state.lifecycle.setActive(false);
  clearRuntime();
  document.body.classList.add('lab-mode');
  document.title = t('Prepare your vision setup — Acutezza | Sense6');
  renderScreen(`
    <section class="ac-setup ui-container ui-container--wide"><button class="back-link" type="button" data-action="ac-intro"><span aria-hidden="true">←</span> Back</button>
      <div class="ac-setup__grid"><div class="ac-setup__copy"><p class="ui-eyebrow">Setup / adult near-vision experiment</p><h1>Stable screen.<br>Steady distance.<br>One eye.</h1><p class="ac-lede">Use a laptop, tablet, or monitor without glare. Reset browser zoom, keep brightness comfortable, and leave the display still after calibration.</p>
        <label class="ac-field">Correction during this run<select data-ac-correction><option value="none">No correction</option><option value="glasses">Glasses</option><option value="contacts">Contact lenses</option></select></label>
        <label class="ac-field">First eye<select data-ac-eye-order><option value="right">Right eye first</option><option value="left">Left eye first</option></select></label>
        <fieldset class="ac-scope-picker"><legend>Choose this run's scope</legend>${acuityScopeButton('focused', 'Focused Sharpness', '24 interactions per eye')}${acuityScopeButton('standard', 'Sharpness + nominal contrast', '44 interactions per eye')}</fieldset>
        <label class="ac-consent"><input type="checkbox" data-ac-consent><span><strong class="experiment-boundary">I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.</strong> I am 18 or older; I will use my usual correction for this distance; I can cover either eye without pressing it; I understand this is not an eye examination.</span></label>
        <button class="ui-button ui-button--lg" type="button" data-action="ac-card" disabled>Calibrate the screen <span aria-hidden="true">→</span></button></div>
        <aside class="ac-setup__rules" aria-label="Acutezza setup rules"><p class="ui-eyebrow">Setup contract</p><strong>01 / 03</strong><ol><li>Match a physical card</li><li>Estimate viewing distance</li><li>Lock display geometry</li></ol><dl><div><dt>Camera</dt><dd>Not used</dd></div><div><dt>Upload</dt><dd>None</dd></div><div><dt>Result</dt><dd>Run relative</dd></div></dl></aside>
      </div></section>`);
}

/** @param {'focused' | 'standard'} id @param {string} label @param {string} detail */
function acuityScopeButton(id, label, detail) {
  const selected = state.selectedScope === id;
  return `<button class="ac-scope-option ${selected ? 'is-selected' : ''}" type="button" data-action="ac-scope" data-scope="${id}" aria-pressed="${selected}"><strong>${label}</strong><small>${detail}</small></button>`;
}

/** @param {'focused' | 'standard'} scope */
function selectAcuityScope(scope) {
  state.selectedScope = scope;
  for (const button of state.app.querySelectorAll('[data-action="ac-scope"]')) {
    const selected = button.dataset.scope === scope;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

function beginCalibration() {
  if (!state.app.querySelector('[data-ac-consent]')?.checked) return;
  const firstEye = state.app.querySelector('[data-ac-eye-order]')?.value ?? 'right';
  state.session = {
    random: seededRandom(`${Date.now()}-${Math.random()}`),
    correction: state.app.querySelector('[data-ac-correction]')?.value ?? 'none',
    scope: state.selectedScope,
    eyes: firstEye === 'right' ? ['right', 'left'] : ['left', 'right'],
    eyeIndex: 0,
    eyeResults: [],
    calibration: { state: 'invalid', valid: false, readings: [] },
    contrast: state.config.low.contrast,
    interruptions: 0,
    distanceRecheckPassed: null,
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
      <div class="ui-alert ui-alert--info"><strong class="ui-alert__title">No card?</strong><p class="ui-alert__body">Use a ruler and set the rectangle to exactly 85.6 mm wide. If the card cannot fit, rotate to landscape or use a larger screen.</p></div>
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
  const mountState = state;
  state.sweepCheckFrame = requestAnimationFrame(() => checkSweepSpace(mountState));
}

function checkSweepSpace(mountState) {
  if (!isCurrentMount(mountState)) return;
  mountState.sweepCheckFrame = 0;
  const field = mountState.app.querySelector('[data-ac-sweep-field]');
  if (!field || !mountState.session?.sweep) return;
  const maxOffsetMm =
    (field.getBoundingClientRect().width * 0.82) / mountState.session.calibration.cssPixelsPerMm;
  const maxDistance =
    maxOffsetMm / Math.tan((mountState.config.calibration.blindSpotDegrees * Math.PI) / 180);
  if (maxDistance < mountState.config.calibration.minDistanceMm) {
    field.classList.add('is-too-small');
    mountState.app.querySelector('[data-action="ac-start-sweep"]').disabled = true;
    mountState.app.querySelector('[data-ac-sweep-status]').textContent = t(
      'This viewport is too narrow for a reliable sweep. Use landscape, a larger display, or a ruler-measured distance.',
    );
  }
}

function startSweep() {
  if (state.sweepFrame || !state.session?.sweep) return;
  const mountState = state;
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
  state.app.querySelector('[data-ac-sweep-status]').textContent = t(
    'The dot is moving. Keep looking at the square.',
  );
  const animate = (now) => {
    if (!isCurrentMount(mountState) || !mountState.session?.sweep) return;
    const progress = Math.min(1, (now - mountState.sweepStartedAt) / mountState.config.calibration.sweepMs);
    const offset =
      mountState.sweepGeometry.startOffset +
      (mountState.sweepGeometry.endOffset - mountState.sweepGeometry.startOffset) * progress;
    mountState.sweepGeometry.currentOffset = offset;
    dot.style.insetInlineStart = `${fixCenter - offset}px`;
    if (progress >= 1) {
      clearSweep();
      mountState.app.querySelector('[data-action="ac-start-sweep"]').disabled = false;
      mountState.app.querySelector('[data-ac-sweep-status]').textContent = t(
        'The sweep ended without a response. Start again or use a ruler-measured distance.',
      );
      return;
    }
    // Do not expose a response until a position can actually be recorded.
    mountState.app.querySelector('[data-action="ac-record-sweep"]').disabled = false;
    mountState.sweepFrame = requestAnimationFrame(animate);
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
  continueAfterDistance();
}

function renderManualDistance() {
  clearSweep();
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark" aria-hidden="true">cm</span><p class="ui-eyebrow">Ruler-measured fallback</p><h1>Measure eye to screen.</h1><p>Sit in the position you will keep and measure from the bridge of your nose to the screen. This run remains labelled “assumed distance.”</p><label class="ac-field">Distance in centimetres<input type="number" data-ac-manual-distance min="30" max="100" step="1" value="50" inputmode="decimal"></label><div class="ui-cluster ac-calibration__actions"><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-manual-distance">Use measured distance</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-repeat-distance">Return to blind-spot sweeps</button></div></section>`,
  );
}

function confirmManualDistance() {
  const centimetres = Number(state.app.querySelector('[data-ac-manual-distance]')?.value);
  if (centimetres < 30 || centimetres > 100) return toast(t('Enter a distance from 30 to 100 centimetres.'));
  Object.assign(state.session.calibration, {
    distanceMm: centimetres * 10,
    spreadPercent: null,
    state: 'assumed',
  });
  continueAfterDistance();
}

function continueAfterDistance() {
  if (state.session.scope === 'focused') {
    state.session.contrast = null;
    lockCalibration();
  } else {
    renderContrastCheck();
  }
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
  state.lifecycle.setActive(
    true,
    t('Leave this calibrated vision session? Your unfinished result will not be saved.'),
  );
  renderCalibrationSummary();
}

function renderCalibrationSummary() {
  if (!ensureGeometry()) return;
  const calibration = state.session.calibration;
  renderScreen(
    `<section class="ac-calibration-summary ui-container ui-container--wide"><div class="ac-calibration-summary__hero"><p class="ui-eyebrow">Calibration locked</p><h1>The screen now has physical scale.</h1><p>Keep this viewport, browser zoom, orientation, viewing distance, and ${state.session.theme} surround unchanged.</p></div><dl class="ac-calibration-summary__grid"><div><dt>Card width</dt><dd>${Math.round(calibration.cardWidthCssPx)} CSS px</dd></div><div><dt>Viewing distance</dt><dd>${Math.round(calibration.distanceMm / 10)} cm · ${t(calibration.state)}</dd></div><div><dt>Low contrast</dt><dd>${state.session.contrast ? `${Math.round(state.session.contrast * 100)}% ${t('nominal')}` : 'Unavailable'}</dd></div><div><dt>Measurable gap range</dt><dd>${formatArcmin(calibration.bounds.minGapArcmin)}–${formatArcmin(calibration.bounds.maxGapArcmin)}</dd></div></dl><div class="ui-alert ${calibration.state === 'assumed' ? 'ui-alert--warning' : 'ui-alert--success'}"><strong class="ui-alert__title">${calibration.state === 'measured' ? 'Measured setup' : 'Assumed distance'}</strong><p class="ui-alert__body">${calibration.state === 'measured' ? 'Card scale and repeated blind-spot sweeps agreed.' : 'Screen scale is measured, but distance came from manual entry. Results retain this caution.'}</p></div><button class="ui-button ui-button--lg" type="button" data-action="ac-first-eye">${t('Prepare {eye}', { eye: t(eyeLabel(state.session.eyes[0])) })} <span aria-hidden="true">→</span></button></section>`,
  );
}

function renderEyeBrief() {
  if (!ensureGeometry()) return;
  clearRuntime();
  const eye = state.session.eyes[state.session.eyeIndex];
  const other = eye === 'right' ? 'left' : 'right';
  document.title = `${t(eyeLabel(eye))} — Acutezza | Sense6`;
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
  };
  if (renderAcuityRunner()) prepareAcuityTrial();
}

function renderAcuityRunner() {
  if (!ensureGeometry()) return false;
  document.body.classList.add('lab-mode', 'ac-running');
  const stage = state.session.currentEye.stage;
  const info = stage === 'low' ? ACUTEZZA_INSTRUMENTS.low : ACUTEZZA_INSTRUMENTS.high;
  state.app.innerHTML = `<section class="ac-runner" data-ac-runner data-ac-stage="${stage}"><header class="ac-runner__header"><div><p class="ui-eyebrow">${stage === 'practice' ? t('Practice') : `${info.number} / ${info.name}`}</p><h1 tabindex="-1" data-ac-runner-heading>${t('{eye} — {instrument}', { eye: t(eyeLabel(state.session.currentEye.eye)), instrument: t(stage === 'practice' ? 'Practice' : info.name) })}</h1></div><span data-ac-count>Preparing…</span><button type="button" data-action="ac-stop">Stop safely</button></header><div class="ac-stimulus"><p data-ac-status aria-live="polite">Look at the ring and locate its opening.</p><canvas data-ac-optotype aria-label="Landolt ring target"></canvas><div class="ac-direction-pad" aria-label="Direction of the opening">${ACUITY_DIRECTIONS.map((direction) => `<button type="button" data-ac-direction="${direction.id}" aria-label="Gap ${directionLabel(direction.id)}"><span aria-hidden="true">${direction.symbol}</span><small>${direction.key}</small></button>`).join('')}</div><div class="ac-feedback" data-ac-feedback aria-live="polite"></div></div><footer class="ac-runner__footer"><span>${stage === 'low' ? `${Math.round(state.session.contrast * 100)}% ${t('nominal contrast')}` : 'High contrast'}</span><span>Keep distance fixed</span><span>Forced choice</span></footer></section>`;
  state.lifecycle.present(state.app, { focus: '[data-ac-runner-heading]' });
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
  const mountState = state;
  state.feedbackTimer = window.setTimeout(() => advanceCommittedTrial(mountState), state.config.feedbackMs);
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
  finishEye();
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

function finishEye() {
  if (!ensureGeometry()) return;
  clearRuntime();
  document.body.classList.remove('ac-running');
  const eye = state.session.currentEye;
  const high = summarizeAcuity(eye.high);
  const low = eye.low ? summarizeAcuity(eye.low) : null;
  const contrastCost = summarizeContrastCost(high, low);
  state.session.eyeResults.push({
    eye: eye.eye,
    high,
    low,
    contrastCostPercent: contrastCost.value,
    contrastCostBounded: contrastCost.bounded,
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
    `<section class="ac-between ui-container ui-container--wide"><div><p class="ui-eyebrow">First eye complete</p><h1>${eyeLabel(result.eye)} recorded.<br>Rest before switching.</h1><p>Uncover both eyes and blink normally. The completed eye is retained in this session.</p></div><aside><p class="ui-eyebrow">Provisional observation</p><strong>${formatBoundedAcuity(result.high)}</strong><span>high-contrast angular gap estimate</span><p>Any nominal low-contrast condition remains separate.</p></aside><div class="ui-cluster"><button class="ui-button ui-button--lg" type="button" data-action="ac-next-eye">Check distance, then test ${eyeLabel(nextEye)} <span aria-hidden="true">→</span></button><button class="ui-button ui-button--ghost" type="button" data-action="ac-finish-one-eye">Finish with one eye</button></div></section>`,
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
  state.session.distanceRecheckPassed = true;
  renderScreen(
    `<section class="ac-distance-result ui-container"><span class="ac-distance-result__mark" aria-hidden="true">✓</span><p class="ui-eyebrow">Distance coherent</p><h1>The setup remains close to the original distance.</h1><p>The quick check differed by ${formatNumber(difference * 100, { maximumFractionDigits: 1 })}%.</p><button class="ui-button ui-button--lg" type="button" data-action="ac-confirm-next-eye">${t('Prepare {eye}', { eye: t(eyeLabel(state.session.eyes[1])) })} <span aria-hidden="true">→</span></button></section>`,
  );
}

function confirmNextEye() {
  if (!geometryMatches(state.session.calibration.geometry, captureGeometry()))
    return renderCalibrationInvalid('The viewport changed between eyes. Recalibrate before continuing.');
  state.session.distanceRecheckPassed = true;
  renderEyeBrief();
}

function renderResults() {
  if (!ensureGeometry()) return;
  state.lifecycle.setActive(false);
  clearRuntime();
  trackMetric(METRIC_EVENTS.testCompleted, METRIC_TESTS.acutezza);
  document.body.classList.add('lab-mode');
  const summaries = state.session.eyeResults.flatMap((result) => [result.high, result.low].filter(Boolean));
  const controlCorrect = summaries.reduce((sum, result) => sum + result.controlCorrect, 0);
  const controlCount = summaries.reduce((sum, result) => sum + result.controls, 0);
  const bounded = summaries.some((result) => result.atFloor || result.atCeiling);
  const controlsUsable = summaries.every((result) => result.controls >= 2 && result.controlCorrect >= 1);
  const controlsCoherent = summaries.every(
    (result) => result.controls >= 2 && result.controlCorrect === result.controls,
  );
  const usable = state.session.calibration.valid && controlsUsable;
  const strongest =
    usable &&
    controlsCoherent &&
    !bounded &&
    state.session.calibration.state === 'measured' &&
    state.session.interruptions === 0 &&
    state.session.distanceRecheckPassed !== false;
  const setupQuality = strongest
    ? 'Setup checks coherent'
    : usable
      ? 'Interpret with caution'
      : 'Run unusable';
  state.session.result = { setupQuality, usable, strongest, bounded, controlCorrect, controlCount };
  const completion = acutezzaCompletion();
  const latestResultSaved = saveLast({ setupQuality, completion, recordedAt: Date.now() });
  const journalSaved = saveJournalResult({
    setupQuality,
    usable,
    strongest,
    bounded,
    controlCorrect,
    controlCount,
    completion,
  });
  state.session.journalSaved = journalSaved;
  document.title = t('Your calibrated sharpness observations — Acutezza | Sense6');
  renderScreen(
    `<section class="ac-results ui-container ui-container--wide"><button class="back-link" type="button" data-action="ac-home"><span aria-hidden="true">←</span> All tests</button><header class="ac-results__hero"><div><p class="ui-eyebrow">Acutezza / this display / this distance</p><h1>Separate observations.<br><em>No vision label.</em></h1><p>${strongest ? 'Measured calibration and every per-condition task-control pair support this run at the stated distance.' : usable ? 'At least one calibration, bound, interruption, or control condition requires caution before comparison.' : 'A per-condition task-control check failed. Repeat before interpreting this run.'}</p></div><div class="ac-results__stamp ${strongest ? '' : 'is-limited'}"><span>${setupQuality}</span><strong>${String(state.session.eyeResults.length).padStart(2, '0')} / 02</strong></div></header>${latestResultSaved && journalSaved ? '' : `<div class="ui-alert ui-alert--danger" data-ac-journal-status role="alert"><strong class="ui-alert__title">${t('The result is ready, but this browser did not allow local storage.')}</strong></div>`}<div class="ac-eye-results">${state.session.eyeResults.map(eyeResultMarkup).join('')}</div><div class="ac-context-grid"><article class="ui-card"><p class="ui-eyebrow">Run context</p><h2>What travelled with the target.</h2><dl><div><dt>Scope</dt><dd>${state.session.scope === 'focused' ? 'Focused Sharpness' : 'Sharpness + nominal contrast'}</dd></div><div><dt>Correction</dt><dd>${correctionLabel(state.session.correction)}</dd></div><div><dt>Distance</dt><dd>${Math.round(state.session.calibration.distanceMm / 10)} cm · ${t(state.session.calibration.state)}</dd></div><div><dt>Second-eye distance recheck</dt><dd>${state.session.distanceRecheckPassed === null ? 'Not applicable' : state.session.distanceRecheckPassed ? 'Passed' : 'Not passed'}</dd></div><div><dt>Card scale</dt><dd>${Math.round(state.session.calibration.cardWidthCssPx)} CSS px</dd></div><div><dt>Low contrast</dt><dd>${contrastLabel()}</dd></div><div><dt>Surround theme</dt><dd>${state.session.theme}</dd></div><div><dt>Task controls</dt><dd>${controlCorrect} / ${controlCount}, assessed per condition</dd></div><div><dt>Interruptions</dt><dd>${state.session.interruptions}</dd></div></dl></article><article class="ui-card"><p class="ui-eyebrow">Interpretation boundary</p><h2>Calibrated experiment, not an eye examination.</h2><p>Acutezza describes one self-administered run on this display at this estimated distance. It is not vision screening, diagnosis, or a prescription.</p><p>Do not infer normal vision, 20/20, refractive error, cylinder power, or an astigmatism axis. Meridiani scoring is suspended.</p></article></div><aside class="ac-results__safety"><strong>Sudden changes need care, not another run.</strong><p>Promptly seek professional assessment for sudden vision loss, severe eye pain, new flashes or floaters, or a curtain or shadow in the visual field.</p></aside><div class="ui-cluster ac-results__actions">${latestResultSaved && journalSaved ? `<button class="ui-button" type="button" data-action="ac-restart">Repeat this scope independently</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-copy">${resultActionLabel(t)}</button>` : `<button class="ui-button" type="button" data-action="ac-copy">${resultActionLabel(t)}</button><button class="ui-button ui-button--ghost" type="button" data-action="ac-restart">Repeat this scope independently</button>`}${journalSaved ? `<button class="ui-button ui-button--ghost" type="button" data-action="ac-journal">${t('Open private journal')}</button>` : ''}</div></section>`,
  );
}

function eyeResultMarkup(result) {
  const lowValue = result.low ? formatBoundedAcuity(result.low) : 'Unavailable';
  const cost = result.contrastCostPercent;
  const costDetail = result.contrastCostBounded
    ? 'Contrast cost is indeterminate because an estimate meets the display range.'
    : cost === null
      ? 'not measured'
      : t('{cost}% gap size versus high contrast', {
          cost: `${cost >= 0 ? '+' : ''}${formatNumber(cost)}`,
        });
  return `<section class="ac-eye-result" aria-label="${eyeLabel(result.eye)}"><header><p class="ui-eyebrow">${eyeLabel(result.eye)}</p><h2>${result.low ? 'Two separate conditions' : 'Focused sharpness'} for this eye.</h2></header><div class="ac-metric-grid">${resultCard('01', 'High-contrast angular gap estimate', formatBoundedAcuity(result.high), acuityInterval(result.high), acuityInterpretation(result.high, 'A model-based angular-gap estimate from forced-choice trials.'))}${result.low ? resultCard('02', 'Nominal low-contrast angular gap estimate', lowValue, acuityInterval(result.low), `${costDetail} A within-run difference, not clinical contrast sensitivity.`) : ''}</div></section>`;
}

function resultCard(index, label, value, detail, copy) {
  return `<article class="ac-metric"><div><span>${index}</span><p>${label}</p></div><strong>${value}</strong><small>${detail}</small><p>${copy}</p></article>`;
}

async function copyResults() {
  if (!state.session?.result) return;
  const mountState = state;
  const resultState = state.session.result;
  const lines = [
    t('Acutezza — calibrated sharpness observations'),
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
      t('{eye}: high-contrast gap {gap}; low-contrast gap {low}; contrast cost {cost}', {
        eye: t(eyeLabel(result.eye)),
        gap: clipboardAcuity(result.high),
        low: result.low ? clipboardAcuity(result.low) : t('Unavailable'),
        cost: result.contrastCostBounded
          ? t('indeterminate (display-range bound)')
          : result.contrastCostPercent === null
            ? t('not measured')
            : `${result.contrastCostPercent >= 0 ? '+' : ''}${formatNumber(result.contrastCostPercent)}%`,
      }),
    );
  if (!resultState.usable || resultState.bounded)
    lines.push(t('Interpret with caution; repeat before comparing runs.'));
  lines.push(t('This is not vision screening, diagnosis, or a prescription.'));
  try {
    const outcome = await shareOrCopyResult({
      title: t('Calibrated sharpness experiment — Acutezza | Sense6'),
      summary: lines.join('\n'),
      route: 'acutezza',
      locale: state.locale,
    });
    if (isCurrentMount(mountState) && outcome === 'copied') toast(t('Result summary copied.'));
  } catch {
    if (isCurrentMount(mountState)) toast(t('Copy was unavailable in this browser.'));
  }
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
  const shouldAdvance = state.pendingAdvance || state.activeTrial?.responseCommitted;
  state.pendingAdvance = false;
  state.activeTrial = null;
  if (renderAcuityRunner()) prepareAcuityTrial();
  if (!shouldAdvance)
    state.app.querySelector('[data-ac-status]').textContent = t('The unanswered target is presented again.');
}

function geometryChanged() {
  clearTimeout(state.geometryTimer);
  if (!hasLockedSession()) return;
  const mountState = state;
  state.geometryTimer = window.setTimeout(() => {
    if (!isCurrentMount(mountState)) return;
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

function renderCalibrationInvalid(reason) {
  state.lifecycle.setActive(false);
  clearRuntime();
  if (state.session?.calibration) state.session.calibration.valid = false;
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

function wireEvents(signal) {
  document.addEventListener(
    'click',
    (event) => {
      const direction = event.target.closest('[data-ac-direction]');
      if (direction) chooseDirection(direction.dataset.acDirection);
      const action = event.target.closest('[data-action]');
      if (!action) return;
      const actions = {
        'ac-home': () => state.goHome(),
        'ac-intro': renderIntro,
        'ac-prepare': renderPreparation,
        'ac-prepare-closing': renderPreparation,
        'ac-method': () => state.app.querySelector('#ac-method')?.scrollIntoView({ behavior: 'smooth' }),
        'ac-scope': () => {
          if (['focused', 'standard'].includes(action.dataset.scope)) selectAcuityScope(action.dataset.scope);
        },
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
        'ac-next-eye': startNextEye,
        'ac-confirm-next-eye': confirmNextEye,
        'ac-finish-one-eye': renderResults,
        'ac-resume': resumeRun,
        'ac-stop': () => {
          renderIntro();
          toast(t('Vision task stopped. No unfinished result was saved.'));
        },
        'ac-restart': renderPreparation,
        'ac-copy': copyResults,
        'ac-journal': () => state.goJournal(),
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
  cancelAnimationFrame(state.sweepCheckFrame);
  cancelAnimationFrame(state.sweepFrame);
  state.sweepCheckFrame = 0;
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

function advanceCommittedTrial(mountState) {
  if (!isCurrentMount(mountState) || !state.pendingAdvance || !state.session?.currentEye) return;
  clearTimeout(state.feedbackTimer);
  state.feedbackTimer = 0;
  state.pendingAdvance = false;
  state.activeTrial = null;
  prepareAcuityTrial();
}

function withTrialIdentity(trial) {
  state.trialSequence += 1;
  return { ...trial, id: `acutezza-${state.trialSequence}`, responseCommitted: false };
}

function isCurrentMount(mountState) {
  return state === mountState && !mountState.lifecycle.signal.aborted;
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
  state.lifecycle.present(state.app);
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
  return `${formatNumber(value, { maximumFractionDigits: 1 })} arcmin`;
}

function formatBoundedAcuity(result) {
  const prefix = result.atFloor ? '≤ ' : result.atCeiling ? '≥ ' : '';
  return `${prefix}${formatArcmin(result.thresholdArcmin)}`;
}

function acuityInterval(result) {
  const interval = t('{lower}–{upper} 90% model interval', {
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
    `${formatArcmin(result.lowerArcmin)}–${formatArcmin(result.upperArcmin)} 90% model interval`,
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
  const saved = RESULT_STORE.save(result);
  if (!saved) {
    if (state.announcer)
      state.announcer.textContent = t('The result is ready, but this browser did not allow local storage.');
  }
  return saved;
}

function saveJournalResult({
  setupQuality,
  usable,
  strongest,
  bounded,
  controlCorrect,
  controlCount,
  completion,
}) {
  const measurements = state.session.eyeResults.flatMap((eye) => {
    const prefix = eye.eye;
    return [
      acuityMeasurement(`${prefix}-high`, eye.high),
      ...(eye.low ? [acuityMeasurement(`${prefix}-low`, eye.low)] : []),
      ...(eye.low ? [{ id: `${prefix}-contrast-cost`, value: eye.contrastCostPercent, unit: '%' }] : []),
    ];
  });
  const entry = createJournalEntry({
    examId: 'acutezza',
    locale: state.locale,
    quality: strongest ? 'usable' : usable ? 'caution' : 'limited',
    protocol: protocolPassport('acutezza', state.session.scope),
    setup: {
      ...captureDisplayPassport(),
      correction: state.session.correction,
      distanceMm: state.session.calibration.distanceMm,
      calibrationState: state.session.calibration.state,
      cardWidthCssPx: Math.round(state.session.calibration.cardWidthCssPx),
      contrastPercent: state.session.contrast === null ? null : state.session.contrast * 100,
      contrastLinear: state.session.contrast,
      theme: state.session.theme,
      setupQuality,
      controlsCorrect: controlCorrect,
      controlsPresented: controlCount,
      interruptions: state.session.interruptions,
      distanceRecheckPassed: state.session.distanceRecheckPassed,
      completedEyes: completion.eyes.join(','),
      completionVariant: completion.variant,
    },
    qualityEvidence: Object.fromEntries(
      state.session.eyeResults.flatMap((eye) => [
        [`${eye.eye}HighControls`, `${eye.high.controlCorrect}/${eye.high.controls}`],
        ...(eye.low ? [[`${eye.eye}LowControls`, `${eye.low.controlCorrect}/${eye.low.controls}`]] : []),
      ]),
    ),
    measurements,
    notes: [
      ...(bounded ? ['display-range-bound'] : []),
      ...(!usable ? ['setup-check-limited'] : []),
      ...(state.session.contrast === null ? ['low-contrast-unavailable'] : []),
      'posterior-90-percent-model-interval',
      ...(state.session.calibration.state === 'assumed'
        ? ['manual-distance-cannot-receive-strongest-quality']
        : []),
      ...(state.session.distanceRecheckPassed === true ? ['second-eye-distance-recheck-passed'] : []),
    ],
  });
  return Boolean(entry && appendJournalEntry(entry));
}

function acutezzaCompletion() {
  const eyes = state.session.eyeResults.map(({ eye }) => eye).sort();
  return {
    variant: eyes.length === 2 ? 'both-eyes' : 'single-eye',
    eyes,
  };
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
  const current = RESULT_STORE.load();
  if (current) return current;
  const legacy = LEGACY_RESULT_STORE.load();
  const migrated = migrateLegacyAcutezzaLatestResult(legacy);
  if (!migrated) return null;
  RESULT_STORE.save(migrated);
  return migrated;
}
