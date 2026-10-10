import { toast } from '@ponchia/ui/behaviors';
import { journalCopy, journalMetricLabel, journalSetupLabel } from './journal-copy.js';
import { journalRecoveryCopy } from './journal-recovery-copy.js';
import {
  clearJournal,
  compareJournalEntries,
  exportJournal,
  importJournal,
  JOURNAL_DISCLOSURE_KEYS,
  JOURNAL_LIMITS,
  measurementChanges,
  previewJournalImport,
  readJournalState,
  removeJournalEntry,
} from './lib/journal.js';
import { localeMetadata } from './locales.js';

export function renderJournal(context) {
  const { app, exams, locale, localeHref, t } = context;
  const copy = journalCopy(locale);
  const recoveryCopy = journalRecoveryCopy(locale);
  const controller = new AbortController();
  let filter = 'all';

  render();

  app.addEventListener('change', handleChange, { signal: controller.signal });
  app.addEventListener('click', handleClick, { signal: controller.signal });

  function render() {
    const journal = readJournalState();
    const entries = journal.entries;
    const recoveryRequired = !journal.writable;
    const visible = filter === 'all' ? entries : entries.filter((entry) => entry.examId === filter);
    app.innerHTML = `
      <article class="journal-view ui-container ui-container--wide">
        <a class="back-link" data-sense6-route="" href="${localeHref('')}"><span aria-hidden="true">←</span> ${escapeHtml(copy.back)}</a>
        <header class="journal-hero">
          <div>
            <p class="ui-eyebrow">${escapeHtml(copy.eyebrow)}</p>
            <h1>${escapeHtml(copy.title)}</h1>
            <p>${escapeHtml(copy.intro)}</p>
          </div>
          <aside class="ui-alert ui-alert--info"><div class="ui-alert__body"><p>${escapeHtml(copy.privacy)}</p><ul class="journal-export-disclosure">${JOURNAL_DISCLOSURE_KEYS.map((key) => `<li>${escapeHtml(copy.exportDisclosure[key])}</li>`).join('')}</ul></div></aside>
        </header>
        ${recoveryMarkup(journal, recoveryCopy)}
        <div class="journal-toolbar">
          <label><span>${escapeHtml(copy.filter)}</span><select data-journal-filter${recoveryRequired ? ' disabled' : ''}>${filterOptions(exams, copy, filter)}</select></label>
          <div class="ui-cluster">
            <button class="ui-button ui-button--ghost" type="button" data-journal-export${entries.length ? '' : ' disabled'}>${escapeHtml(copy.export)}</button>
            <label class="ui-button ui-button--ghost journal-import"${recoveryRequired ? ' aria-disabled="true"' : ''}>${escapeHtml(copy.import)}<input type="file" accept="application/json,.json" data-journal-import${recoveryRequired ? ' disabled' : ''}></label>
            <button class="ui-button ui-button--subtle" type="button" data-journal-clear${recoveryRequired || entries.length === 0 ? ' disabled' : ''}>${escapeHtml(copy.deleteAll)}</button>
          </div>
        </div>
        ${recoveryRequired ? '' : `<p class="journal-count" aria-live="polite">${entries.length} ${escapeHtml(copy.entries)}</p>`}
        <div data-journal-status class="sr-only" aria-live="polite"></div>
        ${
          recoveryRequired
            ? ''
            : visible.length
              ? `<div class="journal-list">${visible.map((entry) => entryMarkup(entry, entries, exams, copy, locale, t)).join('')}</div>`
              : emptyMarkup(copy, {
                  firstRun: entries.length === 0,
                  starterUrl: `${localeHref('riflessi')}?scope=signal`,
                  starterText: t('Try a short reaction test'),
                })
        }
      </article>`;
  }

  async function handleChange(event) {
    if (event.target.matches('[data-journal-filter]')) {
      filter = event.target.value;
      render();
      return;
    }
    const input = event.target.closest('[data-journal-import]');
    const file = input?.files?.[0];
    if (!file) return;
    let result = { ok: false, reason: 'too-large' };
    if (file.size <= JOURNAL_LIMITS.maxImportBytes) {
      try {
        const source = await file.text();
        if (controller.signal.aborted) return;
        const preview = previewJournalImport(source);
        if (preview.ok === false) result = preview;
        else if (!window.confirm(importPreviewMessage(copy.importPreview, preview))) {
          input.value = '';
          return;
        } else result = importJournal(source, undefined, preview);
      } catch {
        if (controller.signal.aborted) return;
        result = { ok: false, reason: 'invalid' };
      }
    }
    if (controller.signal.aborted) return;
    if (result.ok) {
      toast(copy.importSuccess, { tone: 'success' });
      render();
    } else {
      toast(result.reason === 'storage' ? copy.storageFailure : copy.importFailure, { tone: 'danger' });
      input.value = '';
    }
  }

  function handleClick(event) {
    if (handleRecoveryClick(event)) return;
    const exportButton = event.target.closest('[data-journal-export]');
    if (exportButton) {
      downloadJournal(exportJournal());
      return;
    }
    const deleteButton = event.target.closest('[data-journal-delete]');
    if (deleteButton && window.confirm(copy.confirmOne)) {
      if (!removeJournalEntry(deleteButton.dataset.journalDelete))
        toast(copy.storageFailure, { tone: 'danger' });
      render();
      return;
    }
    if (event.target.closest('[data-journal-clear]') && window.confirm(copy.confirmAll)) {
      if (!clearJournal()) toast(copy.storageFailure, { tone: 'danger' });
      render();
    }
  }

  function handleRecoveryClick(event) {
    const recoveryAction = event.target.closest('[data-journal-raw-backup], [data-journal-recovery-clear]');
    if (!recoveryAction) return false;
    const expectedStatus = recoveryAction.dataset.journalRecoveryState;
    const journal = readJournalState();
    if (journal.status !== expectedStatus) {
      render();
      return true;
    }
    if (recoveryAction.matches('[data-journal-raw-backup]')) {
      if (journal.raw !== null) downloadJournal(journal.raw, { raw: true });
      return true;
    }
    const confirmation = recoveryConfirmation(journal.status, recoveryCopy);
    if (!confirmation || !window.confirm(confirmation)) return true;
    if (!clearJournal()) toast(copy.storageFailure, { tone: 'danger' });
    render();
    return true;
  }

  return () => controller.abort();
}

function entryMarkup(entry, entries, exams, copy, locale, t) {
  const definition = exams.find((exam) => exam.id === entry.examId);
  const previous = entries.find(
    (candidate) => candidate.examId === entry.examId && candidate.recordedAt < entry.recordedAt,
  );
  const comparison = previous ? compareJournalEntries(entry, previous) : null;
  const changes = previous ? measurementChanges(entry, previous) : [];
  const date = new Intl.DateTimeFormat(localeMetadata(locale).languageTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(entry.recordedAt));
  return `<section class="journal-entry" data-journal-entry="${escapeAttribute(entry.id)}">
    <header>
      <div><p class="ui-eyebrow">${escapeHtml(definition?.category ?? entry.examId)}</p><h2>${escapeHtml(definition?.name ?? entry.examId)}</h2><p>${escapeHtml(date)} · ${escapeHtml(t(qualitySource(entry.quality)))}</p></div>
      <button class="ui-button ui-button--subtle ui-button--sm" type="button" data-journal-delete="${escapeAttribute(entry.id)}">${escapeHtml(copy.deleteOne)}</button>
    </header>
    <div class="journal-entry__grid">
      <section><h3>${escapeHtml(copy.measurements)}</h3><dl class="journal-measurements">${entry.measurements.map((measurement) => measurementMarkup(measurement, changes, copy, t)).join('')}</dl></section>
      <section><h3>${escapeHtml(copy.setup)}</h3><dl class="journal-setup">${Object.entries(entry.setup)
        .map(
          ([key, value]) =>
            `<div><dt>${escapeHtml(journalSetupLabel(key, locale))}</dt><dd>${escapeHtml(formatValue(key, value, copy, t))}</dd></div>`,
        )
        .join('')}</dl></section>
    </div>
    <aside class="journal-comparison journal-comparison--${comparison?.status ?? 'latest'}">
      <p class="ui-eyebrow">${escapeHtml(comparison ? copy.compare : copy.latest)}</p>
      <strong>${escapeHtml(comparison ? statusLabel(comparison.status, copy) : copy.noPrevious)}</strong>
      ${comparison?.reasons.length ? `<ul>${comparison.reasons.map((reason) => `<li>${escapeHtml(reasonLabel(reason, copy))}</li>`).join('')}</ul>` : ''}
    </aside>
  </section>`;
}

function measurementMarkup(measurement, changes, copy, t) {
  const change = changes.find((candidate) => candidate.id === measurement.id);
  const interval = intervalLabel(measurement, copy);
  return `<div><dt>${escapeHtml(journalMetricLabel(measurement.id, t))}</dt><dd><strong>${escapeHtml(formatMeasurement(measurement))}</strong>${interval ? `<small>${escapeHtml(interval)}</small>` : ''}${change ? `<small>${escapeHtml(copy.change)} ${signed(change.delta)} ${escapeHtml(change.unit)}${change.bounded ? ` · ${escapeHtml(copy.bounded)}` : ''}</small>` : ''}</dd></div>`;
}

function filterOptions(exams, copy, selected) {
  return [
    `<option value="all"${selected === 'all' ? ' selected' : ''}>${escapeHtml(copy.all)}</option>`,
    ...exams.map(
      (exam) =>
        `<option value="${escapeAttribute(exam.id)}"${selected === exam.id ? ' selected' : ''}>${escapeHtml(exam.name)}</option>`,
    ),
  ].join('');
}

function emptyMarkup(copy, { firstRun, starterUrl, starterText }) {
  return `<section class="journal-empty"><p class="ui-eyebrow">0 ${escapeHtml(copy.entries)}</p><h2>${escapeHtml(copy.emptyTitle)}</h2><p>${escapeHtml(copy.empty)}</p>${
    firstRun
      ? `<a class="ui-button journal-empty__starter" data-journal-starter href="${escapeAttribute(starterUrl)}">${escapeHtml(starterText)} <span aria-hidden="true">→</span></a>`
      : ''
  }</section>`;
}

function recoveryMarkup(journal, copy) {
  if (journal.writable) return '';
  const message = {
    inaccessible: copy.inaccessible,
    malformed: copy.malformed,
    oversized: copy.oversized,
    'future-schema': copy.future,
  }[journal.status];
  if (!message) return '';
  const actions =
    journal.raw === null
      ? ''
      : `<div class="ui-cluster">
          <button class="ui-button ui-button--ghost" type="button" data-journal-raw-backup data-journal-recovery-state="${journal.status}">${escapeHtml(copy.backup)}</button>
          <button class="ui-button ui-button--danger" type="button" data-journal-recovery-clear data-journal-recovery-state="${journal.status}">${escapeHtml(copy.clear)}</button>
        </div>`;
  return `<aside class="ui-alert ui-alert--danger" data-journal-recovery="${journal.status}" role="alert">
    <div class="ui-alert__body">
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(message)}</p>
      ${actions}
    </div>
  </aside>`;
}

function recoveryConfirmation(status, copy) {
  if (status === 'malformed') return copy.confirmMalformed;
  if (status === 'oversized') return copy.confirmOversized;
  if (status === 'future-schema') return copy.confirmFuture;
  return null;
}

function statusLabel(status, copy) {
  if (status === 'comparable') return copy.comparable;
  if (status === 'caution') return copy.caution;
  return copy.notComparable;
}

function qualitySource(quality) {
  if (quality === 'usable') return 'Run usable';
  if (quality === 'caution') return 'Interpret with caution';
  return 'Limited run';
}

function reasonLabel(reason, copy) {
  if (reason === 'different-instrument') return copy.reasonInstrument;
  if (
    reason === 'legacy-protocol' ||
    ['methodVersion', 'profileId', 'configDigest', 'stimulusVersion'].some((field) => reason.includes(field))
  )
    return copy.reasonProtocol ?? journalCopy('en').reasonProtocol;
  if (reason === 'volume-not-verifiable') return copy.reasonVolume;
  if (reason === 'limited-run') return copy.reasonLimited;
  if (reason.startsWith('changed:') || reason.startsWith('missing:'))
    return reason.includes('display') ||
      reason.includes('inputMode') ||
      reason.includes('device') ||
      reason.includes('sampleRate') ||
      reason.includes('correction') ||
      reason.includes('distanceMm')
      ? copy.reasonSetup
      : copy.reasonMinor;
  return copy.reasonMinor;
}

function intervalLabel(measurement, copy) {
  if (Number.isFinite(measurement.lower) && Number.isFinite(measurement.upper))
    return `${round(measurement.lower)}–${round(measurement.upper)} ${measurement.unit} · ${copy.modelInterval}`;
  if (measurement.bound) return measurement.bound === 'lower' ? copy.lowerBound : copy.upperBound;
  return '';
}

function importPreviewMessage(template, preview) {
  return ['additions', 'duplicates', 'discarded', 'evicted', 'total'].reduce(
    (message, key) => message.replaceAll(`{${key}}`, String(preview[key])),
    template,
  );
}

function formatMeasurement(measurement) {
  if (measurement.value === null) return '—';
  const prefix = measurement.bound === 'lower' ? '≥ ' : measurement.bound === 'upper' ? '≤ ' : '';
  return `${prefix}${round(measurement.value)} ${measurement.unit}`.trim();
}

function formatValue(key, value, copy, t) {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? copy.yes : copy.no;
  const source = SETUP_VALUE_SOURCES[key]?.[String(value)];
  if (source) return t(source);
  return String(value);
}

function signed(value) {
  return `${value > 0 ? '+' : ''}${round(value)}`;
}

function round(value) {
  return String(Math.round(value * 100) / 100);
}

function downloadJournal(contents, { raw = false } = {}) {
  const href = URL.createObjectURL(
    new Blob([contents], { type: raw ? 'application/octet-stream' : 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = href;
  link.download = `sense6-journal-${raw ? 'raw-backup-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

const SETUP_VALUE_SOURCES = Object.freeze({
  inputMode: Object.freeze({ keyboard: 'Keyboard', pointer: 'Touch / pointer' }),
  timingHealth: Object.freeze({
    'Timing appeared steady': 'Timing appeared steady',
    'Timing interruptions observed': 'Timing interruptions observed',
  }),
  device: Object.freeze({
    assistive: 'Usual hearing aid / assistive setup',
    earbuds: 'Earbuds / in-ear headphones',
    headphones: 'Over-ear / on-ear',
    other: 'Other / unsure',
  }),
  correction: Object.freeze({
    contacts: 'Contact lenses',
    glasses: 'Glasses',
    none: 'No correction',
  }),
  calibrationState: Object.freeze({ assumed: 'assumed', measured: 'measured' }),
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}
