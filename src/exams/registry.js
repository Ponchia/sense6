/**
 * Presentation metadata for routing, gallery cards, static output, and module
 * loading. Non-visual service rules live in contracts.js.
 */
import { EXAM_IDS as CONTRACT_IDS, examContract } from './contracts.js';

/** @typedef {import('./contracts.js').ExamId} ExamId */
/** @typedef {import('./contracts.js').ExamContract} ExamContract */
/** @typedef {import('./module-contract.js').ExamMountContext} ExamMountContext */
/** @typedef {readonly [string, string]} ResearchSource */
/** @typedef {{ mount: (context: ExamMountContext) => (() => void) }} ExamModule */
/** @typedef {{ id: ExamId, name: string, tagline: string, blurb: string, accent: string, durationMinutes: number, glyph: string, category: string, facts: string[], pageTitle: string, limit: string, load: () => Promise<ExamModule>, sources: ResearchSource[] }} ExamDefinition */
/** @typedef {Readonly<Omit<ExamDefinition, 'facts' | 'sources'> & { route: ExamId, metricTest: string, contract: Readonly<ExamContract>, facts: readonly string[], sources: readonly Readonly<ResearchSource>[] }>} RegisteredExam */

/** @type {readonly RegisteredExam[]} */
export const EXAMS = Object.freeze([
  exam({
    id: 'tetracromia',
    name: 'Tetracromia',
    tagline: 'How finely do you see colour?',
    blurb:
      'An adaptive colour-discrimination lab: three instruments measure the smallest hue steps you can resolve on this screen.',
    accent: 'var(--accent)',
    durationMinutes: 4,
    glyph: 'ΔE',
    category: 'Colour discrimination',
    facts: ['Adaptive difficulty', '3 instruments', 'Detailed profile'],
    pageTitle: 'Tetracromia — colour discrimination | Sense6',
    limit: 'This is not a medical test and cannot confirm tetrachromacy.',
    load: () => import('./tetracromia.js'),
    sources: [
      ['CIEDE2000 colour-difference formula', 'https://doi.org/10.1002/col.1049'],
      ['W3C CSS Color 4: OKLab and OKLCH', 'https://www.w3.org/TR/css-color-4/#ok-lab'],
      [
        'Cleveland Clinic: tetrachromacy and online-test limits',
        'https://my.clevelandclinic.org/health/articles/tetrachromacy',
      ],
    ],
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
    facts: ['Adaptive thresholds', '3 display directions', 'Run-relative result'],
    pageTitle: 'Experimental colour-vision check — Daltonia | Sense6',
    limit: 'Experimental and unvalidated. This is not a screening result or diagnosis.',
    load: () => import('./color-blindness.js'),
    sources: [
      ['CIE 2006 LMS cone fundamentals', 'https://doi.org/10.25039/CIE.DS.tijidesg'],
      [
        'Regan, Reffin, and Mollon: luminance noise and colour discrimination',
        'https://doi.org/10.1016/0042-6989(94)90203-8',
      ],
      ['W3C CSS Color 4 conversion reference', 'https://www.w3.org/TR/css-color-4/#color-conversion-code'],
    ],
  }),
  exam({
    id: 'riflessi',
    name: 'Riflessi',
    tagline: 'Response speed, choice cost & consistency',
    blurb:
      'Three short instruments separate a simple visual response from decision cost and within-run stability.',
    accent: '#f4b942',
    durationMinutes: 7,
    glyph: 'R',
    category: 'Response timing',
    facts: ['3 instruments', 'Device-relative timing', 'No composite score'],
    pageTitle: 'Response speed and consistency — Riflessi | Sense6',
    limit: 'Compare only on the same device and input. Not a clinical or population score.',
    load: () => import('./riflessi.js'),
    sources: [
      [
        'Deary, Liewald, and Nissan: browser reaction-time programme',
        'https://doi.org/10.3758/s13428-010-0024-1',
      ],
      [
        'Basner and Dinges: brief psychomotor vigilance testing',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/',
      ],
      ['Bridges et al.: timing accuracy of experiment generators', 'https://doi.org/10.7717/peerj.9414'],
    ],
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
    sources: [
      ['Woods et al.: headphone screening for web experiments', 'https://doi.org/10.3758/s13414-017-1361-2'],
      ['Levitt: transformed up-down methods in psychoacoustics', 'https://doi.org/10.1121/1.1912375'],
      ['W3C Web Audio API', 'https://www.w3.org/TR/webaudio-1.0/'],
    ],
  }),
  exam({
    id: 'acutezza',
    name: 'Acutezza',
    tagline: 'Calibrated sharpness & meridional clarity',
    blurb:
      'Three per-eye instruments measure angular detail, low-contrast cost, and repeatable orientation preference without making a clinical claim.',
    accent: '#8357ff',
    durationMinutes: 8,
    glyph: 'A',
    category: 'Calibrated sharpness experiment',
    facts: ['Physical screen calibration', '3 per-eye instruments', 'No clinical label'],
    pageTitle: 'Calibrated sharpness experiment — Acutezza | Sense6',
    limit: 'No 20/20 label, diagnosis, astigmatism detection, or prescription.',
    load: () => import('./acutezza.js'),
    sources: [
      [
        'Li et al.: online screen and viewing-distance calibration',
        'https://www.nature.com/articles/s41598-019-57204-1',
      ],
      ['ISO 8596 visual-acuity optotype principles', 'https://www.iso.org/standard/69042.html'],
      [
        'WHO: blindness and vision impairment',
        'https://www.who.int/news-room/fact-sheets/detail/blindness-and-visual-impairment',
      ],
    ],
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
    sources: Object.freeze(definition.sources.map((source) => Object.freeze(source))),
  });
}
