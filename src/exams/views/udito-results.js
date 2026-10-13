/** @typedef {Readonly<ReturnType<typeof import('../../lib/hearing.js').summarizeHeadphones>>} UditoHeadphoneSummary */
/** @typedef {Readonly<ReturnType<typeof import('../../lib/hearing.js').summarizeRange>>} UditoRangeSummary */
/** @typedef {Readonly<ReturnType<typeof import('../../lib/hearing.js').summarizePitch>[number]>} UditoPitchSummary */
/** @typedef {Readonly<{ headphones: UditoHeadphoneSummary, range: UditoRangeSummary, pitch: readonly UditoPitchSummary[], usable: boolean, setupQuality: import('../results/udito.js').UditoSetupQuality, cautionReasons: readonly string[] }>} UditoResult */
/** @typedef {Readonly<{ scope: 'focused' | 'standard', device: string, connection: string, sampleRate: number, volumeConsistent: boolean, interruptions: number }>} UditoResultContext */
/** @typedef {Readonly<{ t: typeof import('../../i18n.js').t, m: typeof import('../../i18n.js').m, formatNumber: typeof import('../../i18n.js').formatNumber }>} UditoResultTranslations */

const COMPLETION_LABELS = new Map([
  ['converged', 'Converged to the configured reversal target'],
  ['technical-ceiling', 'Bounded at the technical frequency ceiling'],
  ['max-trials', 'Maximum trials reached before convergence'],
  ['incomplete', 'Incomplete'],
]);
const DEVICE_LABELS = new Map([
  ['headphones', 'Over-ear / on-ear'],
  ['earbuds', 'Earbuds / in-ear'],
  ['assistive', 'Usual assistive setup'],
  ['other', 'Other / unsure'],
]);
const CONNECTION_LABELS = new Map([
  ['wired', 'Wired'],
  ['wireless', 'Wireless / Bluetooth'],
  ['integrated', 'Built-in / assistive route'],
  ['other', 'Other / unsure'],
]);

/** @param {UditoResult} result @param {UditoResultContext} context @param {UditoResultTranslations} translations @param {string} guideLink */
export function uditoResultsMarkup(result, context, translations, guideLink) {
  const { headphones, range, pitch, usable, setupQuality } = result;
  const { t, m, formatNumber } = translations;
  const includesPitch = context.scope === 'standard';
  return `
    <section class="au-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="au-home"><span aria-hidden="true">←</span> ${m('nav.allTests')}</button>
      <header class="au-results__hero"><div><p class="ui-eyebrow">${t('Udito / this setup / this run')}</p><h1>${includesPitch ? t('Three listening measures.') : t('Two focused listening measures.')}<br><em>${t('No hearing label.')}</em></h1><p>${usable ? t('The setup checks and adaptive tracks produced coherent run-level observations.') : t('At least one setup check, interruption check, volume check, or adaptive track was limited. The observations remain visible, but comparison should wait for a steadier repeat.')}</p></div><div class="au-results__stamp ${usable ? '' : 'is-limited'}"><span>${t('Upper run boundary')}</span><strong>${formatHertz(range, translations)}</strong><span>${t(setupQuality)}</span></div></header>
      <div data-au-persistence></div>
      <div class="au-result-grid">
        ${resultCard('01', 'Headphone confidence', headphones.headphoneLike ? 'Headphone-like' : 'Uncertain', `${headphones.correct} / ${headphones.trials}`, 'A phase-based presentation check, not hardware detection.', t)}
        ${resultCard('02', 'Upper run boundary', formatHertz(range, translations), rangeDetail(range, translations), range.atCeiling && range.settled ? 'Reached the technical frequency ceiling; your personal boundary may be higher.' : 'Relative to this device, self-reported unchanged volume, room, and audio sample rate.', t)}
        ${includesPitch ? resultCard('03a', 'Pitch step near 500 Hz', formatPitch(pitch, 500, t), pitchDetail(pitch, 500, t), 'Adaptive ending estimate for this run; reversal range is not estimate uncertainty.', t) : ''}
        ${includesPitch ? resultCard('03b', 'Pitch step near 2 kHz', formatPitch(pitch, 2000, t), pitchDetail(pitch, 2000, t), 'Reported separately; no composite hearing score is calculated.', t) : ''}
      </div>
      <div class="au-context-grid">
        <article class="ui-card"><p class="ui-eyebrow">${t('Run context')}</p><h2>${t('What travelled with the sound.')}</h2><dl><div><dt>${t('Listening setup')}</dt><dd>${deviceLabel(context.device, t)}</dd></div><div><dt>Connection</dt><dd>${connectionLabel(context.connection)}</dd></div><div><dt>${t('Audio context')}</dt><dd>${formatNumber(context.sampleRate)} Hz</dd></div><div><dt>Audibility anchors</dt><dd>200 Hz, 500 Hz, and 2 kHz confirmed</dd></div><div><dt>Volume</dt><dd>${context.volumeConsistent ? 'Self-reported unchanged' : 'Changed or unsure'}</dd></div><div><dt>${t('Portata controls')}</dt><dd>${formatControlAccuracy(range, t)}</dd></div><div><dt>${t('Interruptions')}</dt><dd>${context.interruptions}</dd></div></dl></article>
        <article class="ui-card"><p class="ui-eyebrow">${t('Interpretation boundary')}</p><h2>${t('Device-relative, never dB HL.')}</h2><p>${t('A browser knows digital amplitude, not sound pressure at your eardrum. Headphone response, fit, output, age, room noise, device processing, and the volume setting all shape these numbers.')}</p><p>${t('Do not infer hearing age, “normal” hearing, safety for work, or a medical diagnosis. If hearing concerns affect daily life, use calibrated clinical audiometry.')}</p>${guideLink ? `<p class="au-results__learn">${guideLink}</p>` : ''}</article>
      </div>
      <aside class="au-results__safety"><strong>${t('Keep the same volume only for comparison.')}</strong><p>${t('Compare your own runs only with the same device, headphones, fit, room, and volume. Stop testing if any sound is uncomfortable.')}</p></aside>
      <div class="ui-cluster au-results__actions"></div>
    </section>`;
}

/** @param {UditoResult} result @param {UditoResultContext} context @param {UditoResultTranslations} translations */
export function uditoResultSummary(result, context, translations) {
  const { headphones, range, pitch, usable, setupQuality, cautionReasons } = result;
  const { t, formatNumber } = translations;
  return [
    t('Udito — device-relative listening observations'),
    t('Run quality: {quality}', { quality: t(setupQuality) }),
    t('Setup: {device}; {connection}; {sampleRate} Hz audio context', {
      device: t(deviceLabel(context.device, t)),
      connection: t(connectionLabel(context.connection)),
      sampleRate: formatNumber(context.sampleRate),
    }),
    `Volume: ${context.volumeConsistent ? 'self-reported unchanged' : 'changed or unsure'} during the run; the browser could not verify it.`,
    t('Headphone confidence: {correct}/{trials} ({confidence})', {
      correct: headphones.correct,
      trials: headphones.trials,
      confidence: t(headphones.headphoneLike ? 'headphone-like' : 'uncertain'),
    }),
    t('Upper run boundary: {boundary}; {completion}; {reversals} reversals / {trials} trials', {
      boundary: formatHertz(range, translations),
      completion: t(uditoCompletionReasonLabel(range.completionReason, t)),
      reversals: range.reversals,
      trials: range.trials,
    }),
    t('Portata control accuracy: {accuracy}', { accuracy: formatControlAccuracy(range, t) }),
    ...(context.scope === 'standard' ? pitch : []).map((item) =>
      t('Pitch step near {anchor} Hz: {step}; {completion}; {reversals} reversals / {trials} trials', {
        anchor: formatNumber(item.anchorHz),
        step: formatPitch(pitch, item.anchorHz, t),
        completion: t(uditoCompletionReasonLabel(item.completionReason, t)),
        reversals: item.reversals,
        trials: item.trials,
      }),
    ),
    t('Playback interruptions: {count}', { count: context.interruptions }),
    ...(usable
      ? []
      : [
          t('Interpret with caution: {evidence}', {
            evidence: cautionReasons.join('; '),
          }),
        ]),
    t('This is not dB HL, a hearing-age score, screening, or diagnosis.'),
  ].join('\n');
}

/** @param {import('../../lib/journal.js').JournalSaveOutcome} outcome @param {UditoResultTranslations['t']} t */
export function uditoJournalStatusMarkup(outcome, t) {
  const journalSaved = outcome === 'saved';
  const journalNote = journalStatusNote(outcome, t);
  return `<div class="ui-alert ${journalSaved ? 'ui-alert--success' : 'ui-alert--danger'}" data-au-journal-status role="${journalSaved ? 'status' : 'alert'}"><strong class="ui-alert__title">${t(journalSaved ? 'Saved to the private journal on this device.' : 'Journal entry not saved.')}</strong><p class="ui-alert__body">${journalNote}</p></div>`;
}

/** @param {{ journalSaved: boolean, copyLabel: string }} options @param {UditoResultTranslations['t']} t */
export function uditoResultActions({ journalSaved, copyLabel }, t) {
  return `<button class="ui-button" type="button" data-action="au-restart">${t('Repeat this scope independently')}</button><button class="ui-button ui-button--ghost" type="button" data-action="au-copy">${copyLabel}</button>${journalSaved ? `<button class="ui-button ui-button--ghost" type="button" data-action="au-journal">${t('Open private journal')}</button>` : ''}`;
}

/** @param {import('../../lib/journal.js').JournalSaveOutcome} outcome @param {UditoResultTranslations['t']} t */
function journalStatusNote(outcome, t) {
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

/** @param {string} index @param {string} label @param {string} value @param {string} detail @param {string} copy @param {UditoResultTranslations['t']} t */
function resultCard(index, label, value, detail, copy, t) {
  const headingId = `au-metric-${index}`;
  return `<article class="au-metric" aria-labelledby="${headingId}"><div><span>${index}</span><h2 id="${headingId}">${t(label)}</h2></div><strong>${t(value)}</strong><small>${detail}</small><p>${t(copy)}</p></article>`;
}

/** @param {UditoRangeSummary} result @param {UditoResultTranslations} translations */
function formatHertz(result, { t, formatNumber }) {
  if (result.thresholdHz === null) return t('Not settled');
  return `${result.atCeiling ? '≥ ' : ''}${formatNumber(result.thresholdHz)} Hz`;
}

/** @param {UditoRangeSummary} result @param {UditoResultTranslations} translations */
function rangeDetail(result, translations) {
  const completion = uditoCompletionReasonLabel(result.completionReason, translations.t);
  const spread = result.reversalRangeHz
    ? ` · reversal range ${translations.formatNumber(result.reversalRangeHz)} Hz (not uncertainty)`
    : '';
  return `${completion} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

/** @param {readonly UditoPitchSummary[]} results @param {number} anchorHz @param {UditoResultTranslations['t']} t */
function formatPitch(results, anchorHz, t) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  return !result || result.thresholdPercent === null ? t('Not settled') : `${result.thresholdPercent}%`;
}

/** @param {readonly UditoPitchSummary[]} results @param {number} anchorHz @param {UditoResultTranslations['t']} t */
function pitchDetail(results, anchorHz, t) {
  const result = results.find((item) => item.anchorHz === anchorHz);
  if (!result) return 'Track unavailable';
  const spread = result.reversalRangePercent
    ? ` · reversal range ${result.reversalRangePercent}% (not uncertainty)`
    : '';
  return `${uditoCompletionReasonLabel(result.completionReason, t)} · ${result.reversals} reversals / ${result.trials} trials${spread}`;
}

/** @param {string} reason @param {UditoResultTranslations['t']} t */
export function uditoCompletionReasonLabel(reason, t) {
  return t(COMPLETION_LABELS.get(reason) ?? 'Incomplete');
}

/** @param {string} device @param {UditoResultTranslations['t']} t */
function deviceLabel(device, t) {
  return t(DEVICE_LABELS.get(device) ?? 'Other / unsure');
}

/** @param {string} connection */
function connectionLabel(connection) {
  return CONNECTION_LABELS.get(connection) ?? 'Other / unsure';
}

/** @param {UditoRangeSummary} range @param {UditoResultTranslations['t']} t */
function formatControlAccuracy(range, t) {
  const accuracy =
    range.controlAccuracyPercent === null ? t('Not sampled') : `${range.controlAccuracyPercent}%`;
  return `${accuracy} (${range.controlTrials}/${range.expectedControls} controls)`;
}
