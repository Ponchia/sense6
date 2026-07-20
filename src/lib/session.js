import { deltaEok } from './color.js';
import { randomInt, seededRandom, shuffle } from './random.js';

/** @typedef {() => number} RandomSource */
/** @typedef {'threshold' | 'field'} DiscriminationKind */
/** @typedef {DiscriminationKind | 'sequence'} PhaseId */
/** @typedef {{ id: PhaseId, number: string, name: string, short: string, trials: number }} Phase */
/** @typedef {{ hue: number, label: string }} HueFamily */
/** @typedef {'up' | 'down'} StaircaseDirection */
/** @typedef {{ level: number, correct: boolean }} StaircaseHistory */
/** @typedef {{ level: number, minimum: number, maximum: number, correctStreak: number, previousDirection: StaircaseDirection | null, reversals: number[], history: StaircaseHistory[] }} Staircase */
/** @typedef {{ l: number, c: number, h: number }} LabColor */
/** @typedef {{ kind: DiscriminationKind, answer: number, reference: LabColor, target: LabColor, delta: number, nonce: number }} DiscriminationTrial */
/** @typedef {{ id: number, l: number, c: number, h: number }} SequenceColor */
/** @typedef {{ kind: 'sequence', colors: SequenceColor[], order: number[], selected: number | null, nonce: number }} SequenceTrial */
/** @typedef {DiscriminationTrial | SequenceTrial} ColorLabTrial */
/** @typedef {{ correct: boolean, choice: number, answer: number, delta: number, level: number, hue: number, elapsedMs: number }} DiscriminationResponse */
/** @typedef {{ score: number, order: number[], elapsedMs: number }} SequenceResponse */
/** @typedef {{ threshold: DiscriminationResponse[], field: DiscriminationResponse[], sequence: SequenceResponse[] }} SessionResponses */

/** @type {readonly Phase[]} */
export const PHASES = [
  {
    id: 'threshold',
    number: '01',
    name: 'Tile choices',
    short: 'Find the different tile.',
    trials: 14,
  },
  {
    id: 'field',
    number: '02',
    name: 'Dot fields',
    short: 'Find the shifted dot field.',
    trials: 12,
  },
  {
    id: 'sequence',
    number: '03',
    name: 'Hue ordering',
    short: 'Put each hue run in order.',
    trials: 3,
  },
];

/** @type {readonly HueFamily[]} */
export const HUE_FAMILIES = [
  { hue: 18, label: 'Rose' },
  { hue: 62, label: 'Amber' },
  { hue: 118, label: 'Lime' },
  { hue: 170, label: 'Green' },
  { hue: 222, label: 'Cyan' },
  { hue: 276, label: 'Blue' },
  { hue: 326, label: 'Magenta' },
];

/** @param {{ initial?: number, minimum?: number, maximum?: number }} options @returns {Staircase} */
export function createStaircase({ initial = 18, minimum = 1.2, maximum = 26 } = {}) {
  return {
    level: initial,
    minimum,
    maximum,
    correctStreak: 0,
    previousDirection: null,
    reversals: [],
    history: [],
  };
}

/** @param {Staircase} staircase @param {boolean} correct @returns {Staircase} */
export function updateStaircase(staircase, correct) {
  const next = { ...staircase, reversals: [...staircase.reversals], history: [...staircase.history] };
  next.history.push({ level: next.level, correct });
  /** @type {StaircaseDirection | null} */
  let direction = null;

  if (correct) {
    next.correctStreak += 1;
    if (next.correctStreak >= 2) {
      next.level = Math.max(next.minimum, next.level * 0.76);
      next.correctStreak = 0;
      direction = 'down';
    }
  } else {
    next.correctStreak = 0;
    next.level = Math.min(next.maximum, next.level * 1.26);
    direction = 'up';
  }

  if (direction && next.previousDirection && direction !== next.previousDirection) {
    next.reversals.push(staircase.level);
  }
  if (direction) next.previousDirection = direction;

  return next;
}

/** @param {Staircase} staircase */
export function staircaseThreshold(staircase) {
  const samples =
    staircase.reversals.length >= 4
      ? staircase.reversals.slice(-6)
      : staircase.history.slice(-6).map(({ level }) => level);

  if (samples.length === 0) return staircase.level;
  const ordered = [...samples].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle];
  if (upper === undefined) return staircase.level;
  if (ordered.length % 2 !== 0) return upper;
  const lower = ordered[middle - 1];
  return lower === undefined ? staircase.level : (lower + upper) / 2;
}

/** @param {readonly number[]} order */
export function sequenceScore(order) {
  const count = order.length;
  let inversions = 0;

  for (const [first, value] of order.entries()) {
    for (const later of order.slice(first + 1)) {
      if (value > later) inversions += 1;
    }
  }

  const maximum = (count * (count - 1)) / 2;
  return maximum === 0 ? 100 : Math.round((1 - inversions / maximum) * 100);
}

/** @param {RandomSource} random @param {Staircase} staircase @param {DiscriminationKind} kind @param {number} baseFamilyHue @returns {DiscriminationTrial} */
function createDiscriminationTrial(random, staircase, kind, baseFamilyHue) {
  const baseHue = baseFamilyHue + (random() - 0.5) * 14;
  const direction = random() > 0.5 ? 1 : -1;
  const reference = {
    l: kind === 'field' ? 0.7 : 0.67,
    c: kind === 'field' ? 0.095 : 0.105,
    h: (baseHue + 360) % 360,
  };
  const target = { ...reference, h: (reference.h + direction * staircase.level + 360) % 360 };
  const count = kind === 'field' ? 4 : 16;

  return {
    kind,
    answer: randomInt(random, count),
    reference,
    target,
    delta: deltaEok(reference, target),
    nonce: Math.floor(random() * 1_000_000_000),
  };
}

/** @param {RandomSource} random @param {number} round @returns {SequenceTrial} */
function createSequenceTrial(random, round) {
  const count = 9;
  const starts = /** @type {const} */ ([8, 126, 238]);
  const span = 92;
  const start = (starts[round % starts.length] ?? starts[0]) + (random() - 0.5) * 8;
  const colors = Array.from({ length: count }, (_, index) => ({
    id: index,
    l: 0.7,
    c: 0.105,
    h: (start + (span * index) / (count - 1)) % 360,
  }));

  return {
    kind: 'sequence',
    colors,
    order: shuffle(
      Array.from({ length: count - 2 }, (_, index) => index + 1),
      random,
    ),
    selected: null,
    nonce: Math.floor(random() * 1_000_000_000),
  };
}

export class ColorLabSession {
  /** @param {string | number} seed */
  constructor(seed = Date.now()) {
    this.seed = String(seed);
    this.random = seededRandom(this.seed);
    this.phaseIndex = 0;
    this.trialIndex = 0;
    /** @type {Record<DiscriminationKind, Staircase>} */
    this.staircases = {
      threshold: createStaircase({ initial: 21 }),
      field: createStaircase({ initial: 24 }),
    };
    /** @type {SessionResponses} */
    this.responses = { threshold: [], field: [], sequence: [] };
    /** @type {Record<DiscriminationKind, number[]>} */
    this.hueDecks = { threshold: [], field: [] };
    /** @type {ColorLabTrial} */
    this.currentTrial = this.createTrial();
  }

  /**
   * Draw hue families from a shuffled deck that refills when empty, so every
   * family is sampled evenly across a phase and the hue observations have data in
   * every direction.
   */
  /** @param {DiscriminationKind} kind */
  nextBaseHue(kind) {
    const deck = this.hueDecks[kind];
    if (deck.length === 0) {
      deck.push(
        ...shuffle(
          HUE_FAMILIES.map(({ hue }) => hue),
          this.random,
        ),
      );
    }
    const hue = deck.pop();
    if (hue === undefined) throw new Error(`Hue deck for ${kind} could not be refilled`);
    return hue;
  }

  get phase() {
    const phase = PHASES[this.phaseIndex];
    if (!phase) throw new Error(`Unknown session phase index: ${this.phaseIndex}`);
    return phase;
  }

  get completedTrials() {
    return PHASES.slice(0, this.phaseIndex).reduce((sum, phase) => sum + phase.trials, 0) + this.trialIndex;
  }

  get totalTrials() {
    return PHASES.reduce((sum, phase) => sum + phase.trials, 0);
  }

  get progress() {
    return Math.round((this.completedTrials / this.totalTrials) * 100);
  }

  /** @returns {ColorLabTrial} */
  createTrial() {
    const phase = this.phase;
    if (phase.id === 'sequence') return createSequenceTrial(this.random, this.trialIndex);
    return createDiscriminationTrial(
      this.random,
      this.staircases[phase.id],
      phase.id,
      this.nextBaseHue(phase.id),
    );
  }

  /** @param {number} choice @param {number} elapsedMs */
  answerChoice(choice, elapsedMs = 0) {
    const phase = this.phase;
    if (phase.id === 'sequence') throw new Error('Use submitSequence for sequence trials.');
    const trial = this.requireDiscriminationTrial();
    const correct = choice === trial.answer;
    const response = {
      correct,
      choice,
      answer: trial.answer,
      delta: trial.delta,
      level: this.staircases[phase.id].level,
      hue: trial.reference.h,
      elapsedMs,
    };
    this.responses[phase.id].push(response);
    this.staircases[phase.id] = updateStaircase(this.staircases[phase.id], correct);
    return { correct, response, done: this.advance() };
  }

  /** @param {number} firstIndex @param {number} secondIndex */
  swapSequence(firstIndex, secondIndex) {
    const trial = this.requireSequenceTrial();
    if (
      firstIndex < 0 ||
      secondIndex < 0 ||
      firstIndex >= trial.order.length ||
      secondIndex >= trial.order.length
    ) {
      return false;
    }
    const order = [...trial.order];
    const first = order[firstIndex];
    const second = order[secondIndex];
    if (first === undefined || second === undefined) return false;
    order[firstIndex] = second;
    order[secondIndex] = first;
    this.currentTrial = { ...trial, order };
    return true;
  }

  /** @param {number} index @param {number} direction */
  moveSequence(index, direction) {
    const trial = this.requireSequenceTrial();
    const target = index + direction;
    if (target < 0 || target >= trial.order.length) return false;
    return this.swapSequence(index, target);
  }

  /** @param {number} fromIndex @param {number} toIndex */
  insertSequence(fromIndex, toIndex) {
    const trial = this.requireSequenceTrial();
    const length = trial.order.length;
    if (fromIndex === toIndex) return false;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= length || toIndex >= length) return false;
    const order = [...trial.order];
    const [moved] = order.splice(fromIndex, 1);
    if (moved === undefined) return false;
    order.splice(toIndex, 0, moved);
    this.currentTrial = { ...trial, order };
    return true;
  }

  /** @param {number} elapsedMs */
  submitSequence(elapsedMs = 0) {
    const trial = this.requireSequenceTrial();
    const score = sequenceScore(trial.order);
    this.responses.sequence.push({ score, order: [...trial.order], elapsedMs });
    return { score, done: this.advance() };
  }

  advance() {
    this.trialIndex += 1;

    if (this.trialIndex >= this.phase.trials) {
      if (this.phaseIndex >= PHASES.length - 1) return true;
      this.phaseIndex += 1;
      this.trialIndex = 0;
    }

    this.currentTrial = this.createTrial();
    return false;
  }

  results() {
    const thresholdLevel = staircaseThreshold(this.staircases.threshold);
    const fieldLevel = staircaseThreshold(this.staircases.field);
    const orderedPairsPercent = Math.round(
      this.responses.sequence.reduce((sum, response) => sum + response.score, 0) /
        Math.max(1, this.responses.sequence.length),
    );

    return {
      tile: discriminationObservation(
        this.responses.threshold,
        this.staircases.threshold,
        thresholdLevel,
        this.levelToDelta('threshold', thresholdLevel),
      ),
      field: discriminationObservation(
        this.responses.field,
        this.staircases.field,
        fieldLevel,
        this.levelToDelta('field', fieldLevel),
      ),
      ordering: {
        orderedPairsPercent,
        runs: this.responses.sequence.length,
        runPercentages: this.responses.sequence.map(({ score }) => score),
      },
      elapsedMs: [...this.responses.threshold, ...this.responses.field, ...this.responses.sequence].reduce(
        (sum, response) => sum + response.elapsedMs,
        0,
      ),
      seed: this.seed,
    };
  }

  /** @param {DiscriminationKind} kind @param {number} level */
  levelToDelta(kind, level) {
    const reference = { l: kind === 'field' ? 0.7 : 0.67, c: kind === 'field' ? 0.095 : 0.105, h: 0 };
    return deltaEok(reference, { ...reference, h: level });
  }

  /** @returns {DiscriminationTrial} */
  requireDiscriminationTrial() {
    if (this.currentTrial.kind === 'sequence') {
      throw new Error('A discrimination trial is required for this operation.');
    }
    return this.currentTrial;
  }

  /** @returns {SequenceTrial} */
  requireSequenceTrial() {
    if (this.currentTrial.kind !== 'sequence') {
      throw new Error('A sequence trial is required for this operation.');
    }
    return this.currentTrial;
  }
}

/** @param {DiscriminationResponse[]} responses */
function accuracy(responses) {
  if (responses.length === 0) return 0;
  return Math.round((responses.filter(({ correct }) => correct).length / responses.length) * 100);
}

/**
 * @param {DiscriminationResponse[]} responses
 * @param {Staircase} staircase
 * @param {number} level
 * @param {number} delta
 */
function discriminationObservation(responses, staircase, level, delta) {
  const presentedLevels = responses.map(({ level: presented }) => presented);
  return {
    adaptiveLevelDegrees: Math.round(level * 10) / 10,
    deltaEok: Math.round(delta * 1000) / 1000,
    accuracyPercent: accuracy(responses),
    correct: responses.filter(({ correct }) => correct).length,
    presentations: responses.length,
    reversals: staircase.reversals.length,
    presentedMinimum: Math.round(Math.min(...presentedLevels) * 10) / 10,
    presentedMaximum: Math.round(Math.max(...presentedLevels) * 10) / 10,
  };
}
