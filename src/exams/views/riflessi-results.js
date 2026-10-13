import { relatedGuideResultLink } from '../related-guide.js';

/** @typedef {ReturnType<typeof import('../../lib/reflexes.js').summarizeRiflessi>} RiflessiSummary */
/** @typedef {Readonly<{ signal: Readonly<RiflessiSummary['signal']>, choice: Readonly<RiflessiSummary['choice']>, stability: Readonly<RiflessiSummary['stability']>, events: Readonly<RiflessiSummary['events']>, qualityReasons: Readonly<RiflessiSummary['qualityReasons']>, usable: RiflessiSummary['usable'] }>} RiflessiResult */
/** @typedef {typeof import('../../i18n.js').t} Translate */
/** @typedef {typeof import('../../i18n.js').m} Message */
/** @typedef {Readonly<{ scope: 'signal' | 'signal-choice' | 'complete', inputMode: 'keyboard' | 'pointer', physicalSetup: 'seated-stable' | 'handheld-or-standing', frameMedianMs: number | null, interruptions: number, anticipationMs: number, locale: string }>} RiflessiViewContext */
/** @typedef {Readonly<{ label: import('../results/riflessi.js').RiflessiResultContext['timing'], copy: string }>} RiflessiTimingContext */

/** @param {{ result: RiflessiResult, context: RiflessiViewContext, timing: RiflessiTimingContext, translate: Translate, message: Message }} options */
export function riflessiResultsMarkup({ result, context, timing, translate: t, message: m }) {
  const includesChoice = context.scope !== 'signal';
  const includesStability = context.scope === 'complete';
  return `
    <section class="rx-results ui-container ui-container--wide">
      <button class="back-link" type="button" data-action="rx-home"><span aria-hidden="true">←</span> ${m('nav.allTests')}</button>
      <header class="rx-results__hero">
        <div>
          <p class="ui-eyebrow">Riflessi / this run / this device</p>
          <h1 tabindex="-1" data-rx-screen-title>${includesChoice ? 'Your response has <em>more than one dimension.</em>' : t('Typical signal response')}</h1>
          <p>${result.usable ? t('The selected instruments captured enough clean responses for separate run-level observations.') : t('Several responses were interrupted or invalid. Treat the numbers as a partial run and repeat under steadier conditions.')}</p>
        </div>
        <div class="rx-results__stamp ${result.usable ? '' : 'is-limited'}"><span>${t('Typical signal response')}</span><strong>${metric(result.signal.medianMs)}<small> ms</small></strong><span>${t(result.usable ? 'Run usable' : 'Limited run')}</span></div>
      </header>

      <div data-rx-persistence></div>

      <div class="rx-result-grid">
        ${metricCard('01', t('Typical signal response'), metric(result.signal.medianMs), 'ms', t('Median of {valid} clean simple responses from {scheduled} scheduled events. Within-run spread: {spread} ms; this is not estimate uncertainty.', { valid: result.signal.valid, scheduled: result.signal.scheduled, spread: metric(result.signal.withinRunSpreadMs) }))}
        ${includesChoice ? metricCard('02', t('Choice response'), metric(result.choice.medianMs), 'ms', t('{scheduledAccuracy}% correct across all {scheduled} scheduled choices; {conditionalAccuracy}% among left/right responses.', { scheduledAccuracy: metric(result.choice.scheduledAccuracyPercent), scheduled: result.choice.scheduled, conditionalAccuracy: metric(result.choice.conditionalAccuracyPercent) })) : ''}
        ${includesChoice ? metricCard('Δ', t('Descriptive block difference'), signedMetric(result.choice.blockDifferenceMs), 'ms', t('Choice-block median minus the earlier simple-response median. Fixed order and different motor responses remain confounded.')) : ''}
        ${includesStability ? metricCard('03', t('Sustained response'), metric(result.stability.medianMs), 'ms', t('Median of {valid} clean responses across this custom sustained block.', { valid: result.stability.valid })) : ''}
        ${includesStability ? metricCard('20%', t('Slow-response tail'), signedMetric(result.stability.slowestGapMs), 'ms', t('A descriptive slow-tail difference for this custom block—not a PVT lapse count.')) : ''}
        ${includesStability ? metricCard('↗', 'Within-run drift', signedMetric(result.stability.driftMs), 'ms', driftCopy(result.stability.driftMs)) : ''}
      </div>

      <div class="rx-result-notes">
        <article class="ui-card rx-events">
          <p class="ui-eyebrow">Response events</p><h2>What accompanied the medians.</h2>
          <dl>
            <div><dt>False starts</dt><dd>${result.events.falseStarts}</dd></div>
            <div><dt>Under ${context.anticipationMs} ms</dt><dd>${result.events.anticipations}</dd></div>
            <div><dt>Missed signals</dt><dd>${result.events.misses}</dd></div>
            ${includesChoice ? `<div><dt>Wrong choices</dt><dd>${result.events.wrongChoices}</dd></div>` : ''}
            <div><dt>${t('No-signal checks')}</dt><dd>${result.events.catchesPassed} / ${result.events.catchesScheduled}</dd></div>
          </dl>
        </article>
        <article class="ui-card rx-timing">
          <p class="ui-eyebrow">Timing context</p><h2>${timing.label}</h2><p>${timing.copy}</p>
          <dl>
            <div><dt>Input</dt><dd>${context.inputMode === 'pointer' ? 'Touch / pointer' : 'Keyboard'}</dd></div>
            <div><dt>${t('Physical setup')}</dt><dd>${physicalSetupLabel(context.physicalSetup, t)}</dd></div>
            <div><dt>Frame cadence</dt><dd>${context.frameMedianMs ? `≈ ${context.frameMedianMs.toFixed(1)} ms` : 'Unknown'}</dd></div>
            <div><dt>Interrupted trials</dt><dd>${context.interruptions}</dd></div>
          </dl>
        </article>
      </div>

      <aside class="rx-limit">
        <p class="ui-eyebrow">How to use this result</p>
        <h2>Compare conditions, not people.</h2>
        <p>Browser, display, keyboard, touchscreen, operating system, posture, and attention all remain in the numbers. Compare repeated runs only on the same device and input. Riflessi does not assess concussion, driving fitness, fatigue, neurological health, or a population percentile.</p>
        ${relatedGuideResultLink('riflessi', context.locale, 'Understand browser reaction timing', 'rx-limit__learn')}
      </aside>

      <div class="ui-cluster rx-results__actions"></div>
    </section>
  `;
}

/** @param {{ allSaved: boolean, actionLabel: string, translate: Translate }} options */
export function riflessiResultActions({ allSaved, actionLabel, translate: t }) {
  return allSaved
    ? `<button class="ui-button" type="button" data-action="rx-restart">${t('Repeat this scope independently')}</button><button class="ui-button ui-button--ghost" type="button" data-action="rx-copy">${actionLabel}</button>`
    : `<button class="ui-button" type="button" data-action="rx-copy">${actionLabel}</button><button class="ui-button ui-button--ghost" type="button" data-action="rx-restart">${t('Repeat this scope independently')}</button>`;
}

/** @param {{ lastResultSaved: boolean, journalOutcome: import('../../lib/journal.js').JournalSaveOutcome, translate: Translate }} options */
export function riflessiPersistenceStatus({ lastResultSaved, journalOutcome, translate: t }) {
  if (lastResultSaved && journalOutcome === 'saved') return '';
  const message =
    journalOutcome === 'invalid'
      ? t(
          'This run did not match the journal record format, so it was not saved. Copy the summary to keep it.',
        )
      : t('The result is ready, but this browser did not allow local storage.');
  return `<div class="ui-alert ui-alert--danger rx-persistence-status" data-rx-persistence-status role="alert"><strong class="ui-alert__title">${message}</strong></div>`;
}

/** @param {{ result: RiflessiResult, context: Pick<RiflessiViewContext, 'scope' | 'inputMode' | 'interruptions'>, timingLabel: RiflessiTimingContext['label'], translate: Translate }} options */
export function riflessiResultSummary({ result, context, timingLabel, translate: t }) {
  const includesChoice = context.scope !== 'signal';
  const includesStability = context.scope === 'complete';
  const lines = [
    t('Riflessi — device-relative response observations'),
    t('Input: {input}', {
      input: t(context.inputMode === 'pointer' ? 'touch / pointer' : 'keyboard'),
    }),
    t('Run quality: {quality}', { quality: t(result.usable ? 'Usable run' : 'Limited run') }),
    t('Timing: {timing}; interruptions: {interruptions}', {
      timing: t(timingLabel),
      interruptions: context.interruptions,
    }),
    t('Signal median: {value} ms', { value: metric(result.signal.medianMs) }),
  ];
  if (includesChoice) {
    lines.push(
      t('Choice median: {median} ms; accuracy: {accuracy}%; cost: {cost} ms', {
        median: metric(result.choice.medianMs),
        accuracy: metric(result.choice.scheduledAccuracyPercent),
        cost: signedMetric(result.choice.blockDifferenceMs),
      }),
    );
  }
  if (includesStability) {
    lines.push(
      t('Sustained median: {median} ms; slow tail: {tail} ms; drift: {drift} ms', {
        median: metric(result.stability.medianMs),
        tail: signedMetric(result.stability.slowestGapMs),
        drift: signedMetric(result.stability.driftMs),
      }),
    );
  }
  lines.push(
    t(
      includesChoice
        ? 'Events: {falseStarts} false starts, {anticipations} anticipations, {misses} misses, {wrongChoices} wrong choices'
        : 'Events: {falseStarts} false starts, {anticipations} anticipations, {misses} misses',
      {
        falseStarts: result.events.falseStarts,
        anticipations: result.events.anticipations,
        misses: result.events.misses,
        wrongChoices: result.events.wrongChoices,
      },
    ),
    t('Compare only on the same device and input. Not a clinical or population score.'),
  );
  return lines.join('\n');
}

/** @param {string} index @param {string} label @param {string} value @param {string} unit @param {string} copy */
function metricCard(index, label, value, unit, copy) {
  return `<article class="rx-metric">
    <div><span>${index}</span><p>${label}</p></div><strong>${value}<small>${unit}</small></strong><p>${copy}</p>
  </article>`;
}

/** @param {RiflessiViewContext['physicalSetup']} value @param {Translate} t */
function physicalSetupLabel(value, t) {
  return value === 'handheld-or-standing'
    ? t('Handheld or standing')
    : t('Seated · device on a stable surface');
}

/** @param {number | null} value */
function metric(value) {
  return value === null ? '—' : String(value);
}

/** @param {number | null} value */
function signedMetric(value) {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value}`;
}

/** @param {number | null} value */
function driftCopy(value) {
  if (value === null) return 'Not enough clean responses to estimate a first-to-second-half change.';
  if (Math.abs(value) < 10) return 'The first and second halves were similar after rounding to 5 ms.';
  return value > 0
    ? 'The second half was slower than the first half in this run.'
    : 'The second half was faster than the first half in this run.';
}
