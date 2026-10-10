import assert from 'node:assert/strict';
import test from 'node:test';
import { aboutCopy, aboutMarkup } from '../src/about.js';
import { EXAM_METADATA, examDescriptionSource } from '../src/exams/metadata.js';
import { EXAMS } from '../src/exams/registry.js';
import { MESSAGE_SOURCES, messageSource } from '../src/i18n/message-ids.js';
import { journalCopy, journalSetupLabel, prepareJournalCopy } from '../src/journal-copy.js';
import { journalRecoveryCopy } from '../src/journal-recovery-copy.js';
import { DEFAULT_LOCALE, LOCALES, loadMessages, localeMetadata, resolveLocale } from '../src/locales.js';
import { preparePrivacyCopy, privacyCopy } from '../src/privacy.js';
import { STATIC_SEARCH_INTENT_COPY } from '../src/static-discovery.js';

/**
 * Per-locale ratchet on source phrases that are still shown in English. Each
 * entry is the exact current count: translating one more phrase requires
 * lowering the number here, and leaving one untranslated fails.
 */
const UNTRANSLATED_CEILINGS = Object.freeze({
  fr: 15,
  it: 7,
  de: 6,
  es: 4,
  pt: 4,
  'pt-br': 4,
  ar: 1,
  ja: 1,
  ko: 1,
  hi: 1,
  'zh-hans': 1,
});

/** The English catalogue may grow but never shrink below its current size. */
const ENGLISH_KEY_FLOOR = 833;

test('the supported global locale set has complete catalog keys', async () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(
    LOCALES.map((locale) => locale.code),
    ['en', 'it', 'de', 'fr', 'es', 'pt', 'pt-br', 'ar', 'ja', 'ko', 'hi', 'zh-hans'],
  );
  const catalogs = Object.fromEntries(
    await Promise.all(LOCALES.map(async ({ code }) => [code, await loadMessages(code)])),
  );
  const englishKeys = [...catalogs.en.keys()];
  // Ratchets, not budgets. The English catalogue floor was 500 against an
  // actual 826, and the untranslated ceiling was 25 against a worst case of 15,
  // so both allowed a large regression to pass unnoticed. They are now set at
  // the measured values: coverage can only improve, and improving it requires
  // moving the number here in the same commit.
  assert.ok(
    englishKeys.length >= ENGLISH_KEY_FLOOR,
    `the English catalogue shrank to ${englishKeys.length} keys; the floor is ${ENGLISH_KEY_FLOOR}`,
  );
  for (const { code } of LOCALES) {
    const module = await import(`../src/locales/${code}.js`);
    assert.equal(module.MESSAGE_COUNT, catalogs[code].size, `${code} contains duplicate source phrases`);
    assert.equal(catalogs[code].size, englishKeys.length);
    if (code !== DEFAULT_LOCALE) {
      const untranslated = [...catalogs[code]].filter(([source, value]) => source === value);
      const ceiling = UNTRANSLATED_CEILINGS[code] ?? 0;
      assert.ok(
        untranslated.length <= ceiling,
        `${code} leaves ${untranslated.length} source phrases untranslated; the ceiling is ${ceiling}`,
      );
      assert.ok(
        untranslated.length >= ceiling,
        `${code} now leaves only ${untranslated.length} untranslated; lower its UNTRANSLATED_CEILINGS ` +
          `entry from ${ceiling} to ${untranslated.length} so the improvement cannot regress`,
      );
    }
    for (const key of englishKeys) {
      const value = catalogs[code].get(key);
      assert.equal(typeof value, 'string');
      assert.ok(value.trim(), `${code} translation is empty for ${key}`);
      assert.deepEqual(
        [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort(),
        [...key.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort(),
        `${code} placeholders differ for ${key}`,
      );
    }
  }
});

test('Udito focused-run heading and quality explanation stay localized in all 12 catalogs', async () => {
  const phrases = [
    'Two focused listening measures.',
    'The setup checks and adaptive tracks produced coherent run-level observations.',
    'At least one setup check, interruption check, volume check, or adaptive track was limited. The observations remain visible, but comparison should wait for a steadier repeat.',
  ];
  for (const { code } of LOCALES) {
    const catalog = await loadMessages(code);
    for (const phrase of phrases) {
      const translation = catalog.get(phrase);
      assert.ok(translation, `${code} is missing Udito result text: ${phrase}`);
      if (code !== 'en') {
        assert.notEqual(translation, phrase, `${code} shows English Udito result text`);
      }
    }
  }
});

test('richer English metadata never leaks into untranslated experiment routes', () => {
  assert.deepEqual(
    Object.keys(EXAM_METADATA),
    EXAMS.map(({ id }) => id),
  );
  for (const exam of EXAMS) {
    const { metaDescription } = EXAM_METADATA[exam.id];
    assert.ok(metaDescription.length >= 140, `${exam.id} metadata is still too terse`);
    assert.ok(metaDescription.length <= 160, `${exam.id} metadata exceeds the snippet budget`);
    assert.equal(examDescriptionSource(exam, 'en'), metaDescription);
    assert.notEqual(metaDescription, exam.blurb);

    for (const { code } of LOCALES) {
      const source = examDescriptionSource(exam, code);
      assert.equal(source, code === 'en' ? metaDescription : exam.blurb);
    }
  }
});

test('regional browser locales resolve without collapsing distinct language variants', () => {
  assert.equal(resolveLocale('pt-BR'), 'pt-br');
  assert.equal(resolveLocale('pt-Latn-BR'), 'pt-br');
  assert.equal(resolveLocale('pt-PT'), 'pt');
  assert.equal(resolveLocale('zh-CN'), 'zh-hans');
  assert.equal(resolveLocale('zh-SG'), 'zh-hans');
  assert.equal(resolveLocale('zh-Hans-CN'), 'zh-hans');
  assert.equal(resolveLocale('zh-TW'), null);
  assert.equal(resolveLocale('zh-Hant-TW'), null);
  assert.equal(resolveLocale('ar-EG'), 'ar');
  assert.equal(resolveLocale('ja-JP'), 'ja');
  assert.equal(resolveLocale('   '), null);
  assert.equal(localeMetadata('ar').direction, 'rtl');
  assert.equal(localeMetadata('pt-br').languageTag, 'pt-BR');
  assert.equal(localeMetadata('zh-hans').languageTag, 'zh-Hans');
  assert.equal(localeMetadata('unknown').code, DEFAULT_LOCALE);
});

test('privacy and journal routes have dedicated copy in every supported language', async () => {
  const englishPrivacy = privacyCopy('en');
  const englishJournalKeys = Object.keys(journalCopy('en')).sort();
  const englishRecoveryKeys = Object.keys(journalRecoveryCopy('en')).sort();
  const setupKeys = [
    'display',
    'viewport',
    'gamut',
    'inputMode',
    'frameCadence',
    'timingHealth',
    'interruptions',
    'device',
    'sampleRate',
    'volumeLockedWithinRun',
    'correction',
    'distanceMm',
    'calibrationState',
    'cardWidthCssPx',
  ];
  for (const { code } of LOCALES) {
    await Promise.all([preparePrivacyCopy(code), prepareJournalCopy(code)]);
    const privacy = privacyCopy(code);
    const journal = journalCopy(code);
    const recovery = journalRecoveryCopy(code);
    assert.ok(privacy.title);
    assert.deepEqual(
      privacy.sections.map(({ paragraphs }) => paragraphs.length),
      englishPrivacy.sections.map(({ paragraphs }) => paragraphs.length),
      `${code} privacy structure differs from English`,
    );
    assert.ok(journal.title);
    assert.ok(journal.reasonSetup);
    assert.ok(privacy.sections[1].paragraphs[1].length > 180, `${code} export disclosure is incomplete`);
    assert.match(privacy.updated, /22/);
    assert.deepEqual(
      Object.keys(journal).sort(),
      englishJournalKeys,
      `${code} journal keys differ from English`,
    );
    assert.deepEqual(
      Object.keys(recovery).sort(),
      englishRecoveryKeys,
      `${code} journal recovery keys differ from English`,
    );
    for (const key of setupKeys) assert.ok(journalSetupLabel(key, code), `${code} is missing ${key}`);
    if (code === 'en') continue;
    assert.notEqual(privacy.title, englishPrivacy.title, `${code} privacy copy fell back to English`);
    assert.notEqual(journal.title, journalCopy('en').title, `${code} journal copy fell back to English`);
    assert.notEqual(
      recovery.title,
      journalRecoveryCopy('en').title,
      `${code} journal recovery copy fell back to English`,
    );
    assert.notEqual(
      journalSetupLabel('display', code),
      journalSetupLabel('display', 'en'),
      `${code} journal setup labels fell back to English`,
    );
  }
});

test('critical navigation and safety copy exists in every language', async () => {
  const boundaryKeys = [
    'No account, no answers or results uploaded.',
    'Experimental perception tests for curiosity and fun—not medical tests or diagnoses.',
    'I understand this is a recreational experiment for curiosity and fun—not a medical test or diagnosis.',
  ];
  const keys = [
    'All tests',
    'About',
    'How Sense6 works',
    ...boundaryKeys,
    'Language',
    'Never raise volume to chase a missing high tone.',
    'Stop immediately for discomfort, pain, pressure, or ringing.',
    'An RGB screen cannot test tetrachromacy.',
    'No gap visible',
    'Compare conditions, not people.',
    'This is not vision screening, diagnosis, or a prescription.',
    'Sudden vision loss, severe eye pain, new flashes or floaters, or a curtain-like shadow needs prompt professional assessment.',
  ];
  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const key of keys) assert.ok(messages.get(key));
    if (code === DEFAULT_LOCALE) continue;
    for (const key of boundaryKeys) {
      assert.notEqual(messages.get(key), key, `${code} experimental boundary fell back to English`);
    }
  }
});

test('stable message IDs resolve in every catalog', async () => {
  for (const [id, source] of Object.entries(MESSAGE_SOURCES)) {
    assert.equal(messageSource(id), source);
  }
  assert.throws(() => messageSource('missing.message'), /Unknown message ID/);

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const [id, source] of Object.entries(MESSAGE_SOURCES)) {
      assert.ok(messages.has(source), `${code} is missing ${id}`);
    }
    if (code !== DEFAULT_LOCALE) {
      const boundary = MESSAGE_SOURCES['boundary.recreational'];
      assert.notEqual(messages.get(boundary), boundary, `${code} safety boundary fell back to English`);
    }
  }
});

test('the About page has complete, dedicated copy for every locale', () => {
  const examIds = EXAMS.map(({ id }) => id).sort();
  const english = aboutCopy('en');
  for (const { code } of LOCALES) {
    const page = aboutCopy(code);
    assert.equal(page.profileLabel, 'Zeno');
    assert.deepEqual(Object.keys(page.experiments).sort(), examIds);
    assert.match(page.summary, /Sense6/);
    assert.doesNotMatch(aboutMarkup(code), /\{(?:profile|privacy)\}/);
    if (code !== 'en') assert.notEqual(page.title, english.title);
  }
});

/**
 * The clinical visual-acuity term in each locale.
 *
 * English says "sharpness", never "acuity", because Acutezza measures nothing
 * clinically and must not imply it does. That distinction is invisible to a
 * translator working row by row: fr/es/pt/ko kept it, de/ar/hi/zh-hans each
 * reached for the term an optometrist uses and silently re-clinicalised the
 * experiment's own name. Product copy may say sharpness or clarity; naming the
 * clinical measure is what this forbids. The About page and the safety notices
 * are exempt by construction — they are not in CLINICAL_SCOPE below, because
 * they exist to disclaim exactly these terms.
 */
const CLINICAL_ACUITY_TERMS = Object.freeze({
  en: ['acuity'],
  it: ['acuità'],
  de: ['Sehschärfe', 'Visus'],
  fr: ['acuité'],
  es: ['agudeza'],
  pt: ['acuidade'],
  'pt-br': ['acuidade'],
  ar: ['الحدة البصرية', 'حدة البصر', 'حدّة بصرية', 'حدة بصرية'],
  ja: ['視力'],
  ko: ['시력'],
  hi: ['दृश्य तीक्ष्णता', 'दृष्टि तीक्ष्णता'],
  'zh-hans': ['视敏度', '视力'],
});

test('no locale names the clinical acuity measure in Acutezza product copy', async () => {
  const acutezza = EXAMS.find(({ id }) => id === 'acutezza');
  assert.ok(acutezza?.discoveryName, 'Acutezza needs a discovery identity to check');
  // `acutezza.name` is the bare brand noun and is deliberately not translated.
  const scope = [
    acutezza.discoveryName,
    acutezza.tagline,
    acutezza.blurb,
    acutezza.category,
    acutezza.pageTitle,
    'Acutezza — calibrated sharpness observations',
    'High-contrast sharpness',
    'Focused Sharpness',
    'Sharpness + nominal contrast',
  ];

  const acutezzaMetadata = EXAM_METADATA.acutezza.metaDescription;
  for (const term of CLINICAL_ACUITY_TERMS.en) {
    assert.ok(
      !acutezzaMetadata.toLowerCase().includes(term.toLowerCase()),
      `English metadata renders the clinical term "${term}": "${acutezzaMetadata}"`,
    );
  }

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    const terms = CLINICAL_ACUITY_TERMS[code];
    assert.ok(terms, `${code} has no declared clinical acuity term`);
    for (const source of scope) {
      const translated = messages.get(source);
      assert.ok(translated, `${code} is missing: ${source}`);
      for (const term of terms) {
        assert.ok(
          !translated.toLowerCase().includes(term.toLowerCase()),
          `${code} renders the clinical term "${term}" in Acutezza copy: "${translated}" (${source})`,
        );
      }
    }
  }
});

test('every registry field used by static pages is explicitly localized', async () => {
  const sources = EXAMS.flatMap((exam) => [
    ...(exam.discoveryName ? [exam.discoveryName] : []),
    exam.tagline,
    exam.blurb,
    exam.category,
    ...exam.facts,
    exam.pageTitle,
    exam.limit,
    ...exam.discovery.paragraphs,
    ...(STATIC_SEARCH_INTENT_COPY[exam.id]
      ? [
          STATIC_SEARCH_INTENT_COPY[exam.id].eyebrow,
          STATIC_SEARCH_INTENT_COPY[exam.id].heading,
          ...STATIC_SEARCH_INTENT_COPY[exam.id].paragraphs,
        ]
      : []),
  ]).concat([
    '≈ {minutes} min',
    'Open test',
    'What this test includes',
    'Method and limits',
    'Research trail',
  ]);

  for (const { code } of LOCALES) {
    const messages = await loadMessages(code);
    for (const source of sources) assert.ok(messages.has(source), `${code} is missing: ${source}`);
  }
});
