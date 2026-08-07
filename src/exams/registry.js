/**
 * Presentation metadata for routing, gallery cards, static output, and module
 * loading. Non-visual service rules live in contracts.js.
 */
import { EXAM_IDS as CONTRACT_IDS, examContract } from './contracts.js';

/** @typedef {import('./contracts.js').ExamId} ExamId */
/** @typedef {import('./contracts.js').ExamContract} ExamContract */
/** @typedef {import('./module-contract.js').ExamMountContext} ExamMountContext */
/** @typedef {{ mount: (context: ExamMountContext) => (() => void) }} ExamModule */
/** @typedef {{ paragraphs: string[], related: ExamId[] }} DiscoveryCopy */
/** @typedef {{ id: ExamId, name: string, discoveryName?: string, tagline: string, blurb: string, accent: string, durationMinutes: number, glyph: string, category: string, facts: string[], pageTitle: string, limit: string, discovery: DiscoveryCopy, load: () => Promise<ExamModule> }} ExamDefinition */
/** @typedef {Readonly<Omit<ExamDefinition, 'facts' | 'discovery'> & { route: ExamId, metricTest: string, contract: Readonly<ExamContract>, facts: readonly string[], discovery: Readonly<{ paragraphs: readonly string[], related: readonly ExamId[] }> }>} RegisteredExam */

/** @type {readonly RegisteredExam[]} */
export const EXAMS = Object.freeze([
  exam({
    id: 'tetracromia',
    name: 'Screen Colour Lab',
    discoveryName: 'Tetracromia — Screen Colour Lab',
    tagline: 'Three short colour observations',
    blurb:
      'Tetracromia is a recreational screen-colour lab with three separate, short-run observations and no overall score.',
    accent: 'var(--accent)',
    durationMinutes: 4,
    glyph: 'ΔE',
    category: 'Colour discrimination',
    facts: ['Fixed 29-block dose', '3 separate observations', 'No composite score'],
    pageTitle: 'Tetracromia — colour discrimination | Sense6',
    limit: 'This is not a medical test and cannot confirm tetrachromacy.',
    discovery: {
      paragraphs: [
        'Three observations from one short screen-colour run.',
        'No names, no account, no result upload. Your session stays in this browser.',
      ],
      related: ['color-blindness', 'acutezza'],
    },
    load: () => import('./tetracromia.js'),
  }),
  exam({
    id: 'color-blindness',
    name: 'Daltonia',
    discoveryName: 'Daltonia — Colour Discrimination Lab',
    tagline: 'Adaptive browser colour-vision experiment',
    blurb:
      'Find a gap hidden in luminance-noise dots while three display-relative colour directions adapt independently.',
    accent: '#3bd6a2',
    durationMinutes: 3,
    glyph: 'C',
    category: 'Colour-vision experiment',
    facts: ['Adaptive levels', '3 display directions', 'Run-relative result'],
    pageTitle: 'Experimental colour-vision check — Daltonia | Sense6',
    limit:
      'Experimental and unvalidated. This is not a colour blindness test: it is not a screening result or diagnosis.',
    discovery: {
      paragraphs: [
        'A C-shaped target becomes harder to separate from its field. Three independent staircases estimate the smallest colour shift you follow in each display-relative direction during this run.',
        'The design borrows established psychophysical techniques without claiming their clinical validation.',
        'Lower values mean you followed a smaller colour shift in that direction on this display. The three directions are not clinical scores and should not be compared as diagnoses.',
      ],
      related: ['tetracromia', 'acutezza'],
    },
    load: () => import('./color-blindness.js'),
  }),
  exam({
    id: 'riflessi',
    name: 'Riflessi',
    discoveryName: 'Riflessi — Reaction Time Lab',
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
    discovery: {
      paragraphs: [
        'Riflessi separates simple response speed, the extra cost of choosing, and how responses change across a sustained run. It reports this device and this session—nothing broader.',
        'No percentile, “brain age,” or reflex rating. Each instrument answers a narrower question.',
        'Browser, display, keyboard, touchscreen, operating system, posture, and attention all remain in the numbers. Compare repeated runs only on the same device and input. Riflessi does not assess concussion, driving fitness, fatigue, neurological health, or a population percentile.',
      ],
      related: ['acutezza', 'udito'],
    },
    load: () => import('./riflessi.js'),
  }),
  exam({
    id: 'udito',
    name: 'Udito',
    discoveryName: 'Udito — Hearing Range & Pitch Lab',
    tagline: 'Headphone confidence, audibility & pitch',
    blurb:
      'Three listening instruments map this setup without pretending an uncalibrated browser is an audiometer.',
    accent: '#4cc9f0',
    durationMinutes: 6,
    glyph: 'U',
    category: 'Listening experiment',
    facts: ['3 instruments', 'Volume safety contract', 'No hearing label'],
    pageTitle: 'Device-relative hearing lab — Udito | Sense6',
    limit: 'This is not a clinical hearing test: no dB HL, hearing age, diagnosis, or population score.',
    discovery: {
      paragraphs: [
        'Udito checks headphone-like presentation, maps an upper audibility boundary, and estimates pitch discrimination at two frequencies. Every result belongs to this device, volume, room, and run.',
        'The instruments stay separate because confidence in the setup is not the same thing as audibility or pitch discrimination.',
        'Start with device volume low. Raise it only until the reference is quiet and comfortable, never beyond about 60%. Then lock it for the whole run.',
      ],
      related: ['riflessi', 'acutezza'],
    },
    load: () => import('./udito.js'),
  }),
  exam({
    id: 'acutezza',
    name: 'Acutezza',
    discoveryName: 'Acutezza — Visual Sharpness Lab',
    tagline: 'Calibrated sharpness & nominal contrast',
    blurb:
      'Two per-eye conditions describe angular detail and nominal low-contrast cost without making a clinical claim.',
    accent: '#8357ff',
    durationMinutes: 8,
    glyph: 'A',
    category: 'Calibrated sharpness experiment',
    facts: ['Physical screen calibration', '2 per-eye conditions', 'No clinical label'],
    pageTitle: 'Calibrated sharpness experiment — Acutezza | Sense6',
    limit:
      'This is not a visual acuity test: no 20/20 label, diagnosis, astigmatism detection, or prescription.',
    discovery: {
      paragraphs: [
        'Use a laptop, tablet, or monitor without glare. Reset browser zoom, keep brightness comfortable, and leave the display still after calibration.',
        'Published methods shape the task. They do not make this implementation clinically validated.',
      ],
      related: ['tetracromia', 'udito'],
    },
    load: () => import('./acutezza.js'),
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
    discovery: Object.freeze({
      paragraphs: Object.freeze(definition.discovery.paragraphs),
      related: Object.freeze(definition.discovery.related),
    }),
  });
}
