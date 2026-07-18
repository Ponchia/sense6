import { circularHueDistance, deltaEok } from './color.js';
import { randomInt, seededRandom, shuffle } from './random.js';

export const PHASES = [
  {
    id: 'threshold',
    number: '01',
    name: 'Threshold',
    short: 'Find the different tile.',
    trials: 14,
  },
  {
    id: 'field',
    number: '02',
    name: 'Field',
    short: 'Find the shifted dot field.',
    trials: 12,
  },
  {
    id: 'sequence',
    number: '03',
    name: 'Sequence',
    short: 'Put each hue run in order.',
    trials: 3,
  },
];

export const HUE_FAMILIES = [
  { hue: 18, label: 'Rose' },
  { hue: 62, label: 'Amber' },
  { hue: 118, label: 'Lime' },
  { hue: 170, label: 'Green' },
  { hue: 222, label: 'Cyan' },
  { hue: 276, label: 'Blue' },
  { hue: 326, label: 'Magenta' },
];

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

export function updateStaircase(staircase, correct) {
  const next = { ...staircase, reversals: [...staircase.reversals], history: [...staircase.history] };
  next.history.push({ level: next.level, correct });
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

export function staircaseThreshold(staircase) {
  const samples =
    staircase.reversals.length >= 4
      ? staircase.reversals.slice(-6)
      : staircase.history.slice(-6).map(({ level }) => level);

  if (samples.length === 0) return staircase.level;
  const ordered = [...samples].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

export function sequenceScore(order) {
  const count = order.length;
  let inversions = 0;

  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      if (order[first] > order[second]) inversions += 1;
    }
  }

  const maximum = (count * (count - 1)) / 2;
  return maximum === 0 ? 100 : Math.round((1 - inversions / maximum) * 100);
}

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

function createSequenceTrial(random, round) {
  const count = 9;
  const starts = [8, 126, 238];
  const span = 92;
  const start = starts[round % starts.length] + (random() - 0.5) * 8;
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
  constructor(seed = Date.now()) {
    this.seed = String(seed);
    this.random = seededRandom(this.seed);
    this.phaseIndex = 0;
    this.trialIndex = 0;
    this.staircases = {
      threshold: createStaircase({ initial: 21 }),
      field: createStaircase({ initial: 24 }),
    };
    this.responses = { threshold: [], field: [], sequence: [] };
    this.hueDecks = { threshold: [], field: [] };
    this.currentTrial = this.createTrial();
  }

  /**
   * Draw hue families from a shuffled deck that refills when empty, so every
   * family is sampled evenly across a phase and the hue profile has data in
   * every direction.
   */
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
    return deck.pop();
  }

  get phase() {
    return PHASES[this.phaseIndex];
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

  createTrial() {
    if (this.phase.id === 'sequence') return createSequenceTrial(this.random, this.trialIndex);
    return createDiscriminationTrial(
      this.random,
      this.staircases[this.phase.id],
      this.phase.id,
      this.nextBaseHue(this.phase.id),
    );
  }

  answerChoice(choice, elapsedMs = 0) {
    if (this.phase.id === 'sequence') throw new Error('Use submitSequence for sequence trials.');
    const correct = choice === this.currentTrial.answer;
    const response = {
      correct,
      choice,
      answer: this.currentTrial.answer,
      delta: this.currentTrial.delta,
      level: this.staircases[this.phase.id].level,
      hue: this.currentTrial.reference.h,
      elapsedMs,
    };
    this.responses[this.phase.id].push(response);
    this.staircases[this.phase.id] = updateStaircase(this.staircases[this.phase.id], correct);
    return { correct, response, done: this.advance() };
  }

  swapSequence(firstIndex, secondIndex) {
    const order = [...this.currentTrial.order];
    [order[firstIndex], order[secondIndex]] = [order[secondIndex], order[firstIndex]];
    this.currentTrial = { ...this.currentTrial, order };
  }

  moveSequence(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= this.currentTrial.order.length) return false;
    this.swapSequence(index, target);
    return true;
  }

  /** Remove the tile at fromIndex and re-insert it at toIndex, shifting the rest. */
  insertSequence(fromIndex, toIndex) {
    const length = this.currentTrial.order.length;
    if (fromIndex === toIndex) return false;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= length || toIndex >= length) return false;
    const order = [...this.currentTrial.order];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    this.currentTrial = { ...this.currentTrial, order };
    return true;
  }

  submitSequence(elapsedMs = 0) {
    const score = sequenceScore(this.currentTrial.order);
    this.responses.sequence.push({ score, order: [...this.currentTrial.order], elapsedMs });
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
    const thresholdDelta = this.levelToDelta('threshold', thresholdLevel);
    const fieldDelta = this.levelToDelta('field', fieldLevel);
    const sequence = Math.round(
      this.responses.sequence.reduce((sum, response) => sum + response.score, 0) /
        Math.max(1, this.responses.sequence.length),
    );
    const thresholdAccuracy = accuracy(this.responses.threshold);
    const fieldAccuracy = accuracy(this.responses.field);
    const thresholdScore = discriminationScore(thresholdDelta);
    const fieldScore = discriminationScore(fieldDelta);
    const overall = Math.round(thresholdScore * 0.35 + fieldScore * 0.35 + sequence * 0.3);

    return {
      overall,
      thresholdScore,
      fieldScore,
      sequenceScore: sequence,
      thresholdDegrees: thresholdLevel,
      fieldDegrees: fieldLevel,
      thresholdDelta,
      fieldDelta,
      thresholdAccuracy,
      fieldAccuracy,
      hueProfile: hueProfile([...this.responses.threshold, ...this.responses.field]),
      elapsedMs: [...this.responses.threshold, ...this.responses.field, ...this.responses.sequence].reduce(
        (sum, response) => sum + response.elapsedMs,
        0,
      ),
      seed: this.seed,
    };
  }

  levelToDelta(kind, level) {
    const reference = { l: kind === 'field' ? 0.7 : 0.67, c: kind === 'field' ? 0.095 : 0.105, h: 0 };
    return deltaEok(reference, { ...reference, h: level });
  }
}

function accuracy(responses) {
  if (responses.length === 0) return 0;
  return Math.round((responses.filter(({ correct }) => correct).length / responses.length) * 100);
}

function discriminationScore(delta) {
  return Math.round(Math.max(0, Math.min(100, 112 - delta * 22)));
}

function nearestFamilyIndex(hue) {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  HUE_FAMILIES.forEach((family, index) => {
    const distance = circularHueDistance(hue, family.hue);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

/**
 * Share of correct choices per hue family. The staircase keeps overall
 * difficulty near the observer's boundary, so differences between families
 * show relative strengths rather than absolute ability.
 */
function hueProfile(responses) {
  return HUE_FAMILIES.map((family, index) => {
    const inFamily = responses.filter(({ hue }) => nearestFamilyIndex(hue) === index);
    if (inFamily.length === 0) return { ...family, score: null, trials: 0 };
    const correct = inFamily.filter((response) => response.correct).length;
    return { ...family, score: Math.round((correct / inFamily.length) * 100), trials: inFamily.length };
  });
}
