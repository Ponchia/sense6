import { formatNumber, t } from '../../i18n.js';
import { resultActionLabel } from '../../lib/result-sharing.js';

/** @typedef {'left' | 'right'} AcutezzaEye */
/** @typedef {'none' | 'glasses' | 'contacts'} AcutezzaCorrection */
/** @typedef {{ thresholdArcmin: number, lowerArcmin: number, upperArcmin: number, atFloor: boolean, atCeiling: boolean, controlCorrect: number, controls: number }} AcuitySummary */
/** @typedef {{ eye: AcutezzaEye, high: AcuitySummary, low: AcuitySummary | null, contrastCostPercent: number | null, contrastCostBounded: boolean }} AcutezzaEyeResult */
/** @typedef {{ scope: string, correction: AcutezzaCorrection, contrast: number | null, theme: string, interruptions: number, distanceRecheckPassed: boolean | null, calibration: { distanceMm: number, cardWidthCssPx: number, state: string }, eyeResults: AcutezzaEyeResult[] }} AcutezzaResultSession */
/** @typedef {{ setupQuality: string, usable: boolean, bounded: boolean, controlCorrect: number, controlCount: number }} AcutezzaResultState */

/** @param {{ session: AcutezzaResultSession, strongest: boolean, usable: boolean, setupQuality: string, controlCorrect: number, controlCount: number }} options */
export function acutezzaResultsMarkup({
  session,
  strongest,
  usable,
  setupQuality,
  controlCorrect,
  controlCount,
}) {
  const qualityExplanation = strongest
    ? 'Measured calibration and every per-condition task-control pair support this run at the stated distance.'
    : usable
      ? 'At least one calibration, bound, interruption, or control condition requires caution before comparison.'
      : 'A per-condition task-control check failed. Repeat before interpreting this run.';
  return `<section class="ac-results ui-container ui-container--wide"><button class="back-link" type="button" data-action="ac-home"><span aria-hidden="true">←</span> All tests</button><header class="ac-results__hero"><div><p class="ui-eyebrow">Acutezza / this display / this distance</p><h1>Separate observations.<br><em>No vision label.</em></h1><p>${qualityExplanation}</p></div><div class="ac-results__stamp ${strongest ? '' : 'is-limited'}"><span>${setupQuality}</span><strong>${String(session.eyeResults.length).padStart(2, '0')} / 02</strong></div></header><div class="ac-eye-results">${session.eyeResults.map(eyeResultMarkup).join('')}</div><div class="ac-context-grid"><article class="ui-card"><p class="ui-eyebrow">Run context</p><h2>What travelled with the target.</h2><dl><div><dt>Scope</dt><dd>${session.scope === 'focused' ? 'Focused Sharpness' : 'Sharpness + nominal contrast'}</dd></div><div><dt>Correction</dt><dd>${correctionLabel(session.correction)}</dd></div><div><dt>Distance</dt><dd>${Math.round(session.calibration.distanceMm / 10)} cm · ${t(session.calibration.state)}</dd></div><div><dt>Second-eye distance recheck</dt><dd>${session.distanceRecheckPassed === null ? 'Not applicable' : session.distanceRecheckPassed ? 'Passed' : 'Not passed'}</dd></div><div><dt>Card scale</dt><dd>${Math.round(session.calibration.cardWidthCssPx)} CSS px</dd></div><div><dt>Low contrast</dt><dd>${contrastLabel(session)}</dd></div><div><dt>Surround theme</dt><dd>${session.theme}</dd></div><div><dt>Task controls</dt><dd>${controlCorrect} / ${controlCount}, assessed per condition</dd></div><div><dt>Interruptions</dt><dd>${session.interruptions}</dd></div></dl></article><article class="ui-card"><p class="ui-eyebrow">Interpretation boundary</p><h2>Calibrated experiment, not an eye examination.</h2><p>Acutezza describes one self-administered run on this display at this estimated distance. It is not vision screening, diagnosis, or a prescription.</p><p>Do not infer normal vision, 20/20, refractive error, cylinder power, or an astigmatism axis. Meridiani scoring is suspended.</p></article></div><aside class="ac-results__safety"><strong>Sudden changes need care, not another run.</strong><p>Promptly seek professional assessment for sudden vision loss, severe eye pain, new flashes or floaters, or a curtain or shadow in the visual field.</p></aside><div class="ui-cluster ac-results__actions"></div></section>`;
}

/** @param {{ allSaved: boolean, journalSaved: boolean }} options */
export function acutezzaResultActions({ allSaved, journalSaved }) {
  const repeat = `<button class="ui-button${allSaved ? '' : ' ui-button--ghost'}" type="button" data-action="ac-restart">${t('Repeat this scope independently')}</button>`;
  const copy = `<button class="ui-button${allSaved ? ' ui-button--ghost' : ''}" type="button" data-action="ac-copy">${resultActionLabel(t)}</button>`;
  const journal = journalSaved
    ? `<button class="ui-button ui-button--ghost" type="button" data-action="ac-journal">${t('Open private journal')}</button>`
    : '';
  return `${allSaved ? `${repeat}${copy}` : `${copy}${repeat}`}${journal}`;
}

/** @param {AcutezzaResultSession} session @param {AcutezzaResultState} resultState */
export function acutezzaResultSummary(session, resultState) {
  const lines = [
    t('Acutezza — calibrated sharpness observations'),
    t('Setup: {distance} cm ({distanceState}); correction: {correction}', {
      distance: Math.round(session.calibration.distanceMm / 10),
      distanceState: t(session.calibration.state),
      correction: t(correctionLabel(session.correction)),
    }),
    `Calibration: card ${Math.round(session.calibration.cardWidthCssPx)} CSS px; contrast ${contrastLabel(session)}; surround ${session.theme}`,
    `Quality: ${resultState.setupQuality}; controls ${resultState.controlCorrect} / ${resultState.controlCount}; interruptions ${session.interruptions}`,
  ];
  for (const result of session.eyeResults) {
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
  }
  if (!resultState.usable || resultState.bounded) {
    lines.push(t('Interpret with caution; repeat before comparing runs.'));
  }
  lines.push(t('This is not vision screening, diagnosis, or a prescription.'));
  return lines.join('\n');
}

/** @param {AcutezzaEye} eye */
export function eyeLabel(eye) {
  return eye === 'right' ? 'Right eye' : 'Left eye';
}

/** @param {number} value */
export function formatArcmin(value) {
  return `${formatNumber(value, { maximumFractionDigits: 1 })} arcmin`;
}

/** @param {AcuitySummary} result */
export function formatBoundedAcuity(result) {
  const prefix = result.atFloor ? '≤ ' : result.atCeiling ? '≥ ' : '';
  return `${prefix}${formatArcmin(result.thresholdArcmin)}`;
}

/** @param {AcutezzaEyeResult} result */
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

/** @param {string} index @param {string} label @param {string} value @param {string} detail @param {string} copy */
function resultCard(index, label, value, detail, copy) {
  return `<article class="ac-metric"><div><span>${index}</span><p>${label}</p></div><strong>${value}</strong><small>${detail}</small><p>${copy}</p></article>`;
}

/** @param {AcutezzaCorrection} correction */
function correctionLabel(correction) {
  return (
    { none: 'No correction', glasses: 'Glasses', contacts: 'Contact lenses' }[correction] ?? 'No correction'
  );
}

/** @param {AcutezzaResultSession} session */
function contrastLabel(session) {
  return session.contrast === null
    ? t('Unavailable')
    : `${Math.round(session.contrast * 100)}% ${t('nominal')}`;
}

/** @param {AcuitySummary} result */
function acuityInterval(result) {
  const interval = t('{lower}–{upper} 90% model interval', {
    lower: formatArcmin(result.lowerArcmin),
    upper: formatArcmin(result.upperArcmin),
  });
  const bound = acuityBoundLabel(result);
  return bound ? `${interval} · ${bound}` : interval;
}

/** @param {AcuitySummary} result */
function acuityBoundLabel(result) {
  if (result.atFloor) return t('upper bound at the display floor');
  if (result.atCeiling) return t('lower bound at the display ceiling');
  return '';
}

/** @param {AcuitySummary} result @param {string} fallback */
function acuityInterpretation(result, fallback) {
  const bound = acuityBoundLabel(result);
  const article = result.atFloor ? 'an' : 'a';
  return bound ? `The estimate is ${article} ${bound}; do not read it as an exact threshold.` : fallback;
}

/** @param {AcuitySummary} result */
function clipboardAcuity(result) {
  const bound = acuityBoundLabel(result);
  const details = [
    `${formatArcmin(result.lowerArcmin)}–${formatArcmin(result.upperArcmin)} 90% model interval`,
    `controls ${result.controlCorrect} / ${result.controls}`,
  ];
  if (bound) details.push(bound);
  return `${formatBoundedAcuity(result)} (${details.join('; ')})`;
}
