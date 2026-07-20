/**
 * Presentation metadata for routing, gallery cards, static output, and module
 * loading. Non-visual service rules live in contracts.js.
 */
import { EXAM_IDS as CONTRACT_IDS, examContract } from './contracts.js';
import { sourcesFor } from './sources.js';

/** @typedef {import('./contracts.js').ExamId} ExamId */
/** @typedef {import('./contracts.js').ExamContract} ExamContract */
/** @typedef {import('./module-contract.js').ExamMountContext} ExamMountContext */
/** @typedef {import('./sources.js').EvidenceSource} ResearchSource */
/** @typedef {{ mount: (context: ExamMountContext) => (() => void) }} ExamModule */
/** @typedef {{ id: ExamId, name: string, tagline: string, blurb: string, accent: string, durationMinutes: number, glyph: string, category: string, facts: string[], pageTitle: string, limit: string, load: () => Promise<ExamModule>, sources: readonly Readonly<ResearchSource>[] }} ExamDefinition */
/** @typedef {Readonly<Omit<ExamDefinition, 'facts' | 'sources'> & { route: ExamId, metricTest: string, contract: Readonly<ExamContract>, facts: readonly string[], sources: readonly Readonly<ResearchSource>[] }>} RegisteredExam */

/** @type {readonly RegisteredExam[]} */
export const EXAMS = Object.freeze([
  exam({
    id: 'tetracromia',
    name: 'Screen Colour Lab',
    tagline: 'Three short colour observations',
    blurb:
      'Tetracromia is a recreational screen-colour lab with three separate, short-run observations and no overall score.',
    accent: 'var(--accent)',
    durationMinutes: 4,
    glyph: 'ΔE',
    category: 'Colour discrimination',
    facts: ['Fixed 29-block dose', '3 separate observations', 'No composite score'],
    pageTitle: 'Screen Colour Lab — Tetracromia | Sense6',
    limit: 'This is not a medical test and cannot confirm tetrachromacy.',
    load: () => import('./tetracromia.js'),
    sources: sourcesFor('tetracromia'),
  }),
  exam({
    id: 'color-blindness',
    name: 'Daltonia',
    tagline: 'Adaptive browser colour-vision experiment',
    blurb:
      'Find a gap hidden in luminance-noise dots while three display-relative colour directions adapt independently.',
    accent: '#3bd6a2',
    durationMinutes: 3,
    glyph: 'C',
    category: 'Colour-vision experiment',
    facts: ['Adaptive levels', '3 display directions', 'Run-relative result'],
    pageTitle: 'Experimental colour-vision check — Daltonia | Sense6',
    limit: 'Experimental and unvalidated. This is not a screening result or diagnosis.',
    load: () => import('./color-blindness.js'),
    sources: sourcesFor('color-blindness'),
  }),
  exam({
    id: 'riflessi',
    name: 'Riflessi',
    tagline: 'Response speed, choice task & consistency',
    blurb:
      'Three instruments keep simple response, a choice task, and within-run stability as separate observations.',
    accent: '#f4b942',
    durationMinutes: 7,
    glyph: 'R',
    category: 'Response timing',
    facts: ['3 instruments', 'Device-relative timing', 'No composite score'],
    pageTitle: 'Response speed and consistency — Riflessi | Sense6',
    limit: 'Compare only on the same device and input. Not a clinical or population score.',
    load: () => import('./riflessi.js'),
    sources: sourcesFor('riflessi'),
  }),
  exam({
    id: 'udito',
    name: 'Udito',
    tagline: 'Headphone confidence, audibility & pitch',
    blurb:
      'Three listening instruments map this setup without pretending an uncalibrated browser is an audiometer.',
    accent: '#4cc9f0',
    durationMinutes: 6,
    glyph: 'U',
    category: 'Listening experiment',
    facts: ['3 instruments', 'Volume safety contract', 'No hearing label'],
    pageTitle: 'Device-relative hearing lab — Udito | Sense6',
    limit: 'No dB HL, hearing age, diagnosis, or population score.',
    load: () => import('./udito.js'),
    sources: sourcesFor('udito'),
  }),
  exam({
    id: 'acutezza',
    name: 'Acutezza',
    tagline: 'Calibrated sharpness & nominal contrast',
    blurb:
      'Two per-eye conditions describe angular detail and nominal low-contrast cost without making a clinical claim.',
    accent: '#8357ff',
    durationMinutes: 8,
    glyph: 'A',
    category: 'Calibrated sharpness experiment',
    facts: ['Physical screen calibration', '2 per-eye conditions', 'No clinical label'],
    pageTitle: 'Calibrated sharpness experiment — Acutezza | Sense6',
    limit: 'No 20/20 label, diagnosis, astigmatism detection, or prescription.',
    load: () => import('./acutezza.js'),
    sources: sourcesFor('acutezza'),
  }),
]);

/** @type {ReadonlyMap<string, RegisteredExam>} */
export const EXAM_BY_ID = new Map(EXAMS.map((entry) => [entry.id, entry]));
export const EXAM_IDS = CONTRACT_IDS;

/** @param {string} id @returns {Promise<ExamModule | null>} */
export async function loadExam(id) {
  const definition = EXAM_BY_ID.get(id);
  return definition ? definition.load() : null;
}

/** @param {ExamDefinition} definition @returns {RegisteredExam} */
function exam(definition) {
  const contract = examContract(definition.id);
  if (!contract) throw new Error(`Missing exam contract: ${definition.id}`);
  return Object.freeze({
    ...definition,
    route: definition.id,
    metricTest: contract.metricTest,
    contract,
    facts: Object.freeze(definition.facts),
    sources: definition.sources,
  });
}
