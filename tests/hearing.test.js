import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHeadphoneTrials,
  createPitchTracks,
  createRangeTrack,
  dbToGain,
  HEARING_DIGITAL_LEVELS,
  median,
  mergeHearingConfig,
  nextPitchTrial,
  nextRangeTrial,
  recordPitchResponse,
  recordRangeResponse,
  renderingFrequencyCeiling,
  summarizeHeadphones,
  summarizePitch,
  summarizeRange,
} from '../src/lib/hearing.js';

const sequenceRandom = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('headphone trials separate a quiet target from an anti-phase decoy', () => {
  const trials = createHeadphoneTrials({ count: 4, random: sequenceRandom(0, 0.9, 0.4, 0.1) });
  assert.equal(trials.length, 4);
  for (const trial of trials) {
    assert.notEqual(trial.quietInterval, trial.antiPhaseInterval);
    assert.ok([0, 1, 2].includes(trial.quietInterval));
    assert.ok([0, 1, 2].includes(trial.antiPhaseInterval));
  }
  assert.deepEqual(summarizeHeadphones([{ correct: true }, { correct: true }], 2), {
    correct: 2,
    trials: 2,
    accuracyPercent: 100,
    headphoneLike: true,
  });
});

test('range staircase moves up after two correct responses and down after one miss', () => {
  const track = createRangeTrack(16000, {
    controlAt: [],
    minTrials: 2,
    maxTrials: 9,
    targetReversals: 1,
  });
  const first = nextRangeTrial(track, () => 0);
  recordRangeResponse(track, first, first.toneInterval);
  assert.equal(track.frequencyHz, 6000);

  const second = nextRangeTrial(track, () => 0);
  recordRangeResponse(track, second, second.toneInterval);
  assert.ok(track.frequencyHz > 6000);

  const third = nextRangeTrial(track, () => 0);
  recordRangeResponse(track, third, 2);
  assert.equal(track.reversals.length, 1);
  assert.ok(track.frequencyHz < third.frequencyHz);
  assert.equal(track.complete, true);
  assert.equal(track.completionReason, 'converged');
});

test('range controls do not alter the adaptive frequency', () => {
  const track = createRangeTrack(18000, { controlAt: [0] });
  const trial = nextRangeTrial(track, () => 0.5);
  assert.equal(trial.control, true);
  assert.equal(trial.frequencyHz, 1000);
  recordRangeResponse(track, trial, trial.toneInterval);
  assert.equal(track.frequencyHz, 6000);
  assert.equal(track.records.length, 0);
  assert.equal(track.controls.length, 1);
});

test('range summary keeps ceiling boundaries explicit', () => {
  const track = createRangeTrack(8000, { controlAt: [] });
  track.records = [
    { correct: true, frequencyHz: 8000 },
    { correct: true, frequencyHz: 8000 },
  ];
  track.reversals = [6500, 7300, 6900, 7500];
  track.complete = true;
  track.completionReason = 'technical-ceiling';
  assert.deepEqual(summarizeRange(track), {
    thresholdHz: 8000,
    reversalRangeHz: 1000,
    atCeiling: true,
    settled: true,
    completionReason: 'technical-ceiling',
    reversals: 4,
    trials: 2,
    controlTrials: 0,
    expectedControls: 0,
    controlAccuracyPercent: null,
  });
});

test('interleaved pitch tracks use two-down one-up adaptation and remain separate', () => {
  const tracks = createPitchTracks({
    minTrials: 3,
    maxTrials: 8,
    targetReversals: 1,
  });
  const first = nextPitchTrial(tracks, () => 0);
  recordPitchResponse(tracks, first, first.higherInterval);
  const second = { ...first, deltaPercent: tracks[0].deltaPercent };
  recordPitchResponse(tracks, second, second.higherInterval);
  assert.ok(tracks[0].deltaPercent < 8);

  const miss = { ...first, deltaPercent: tracks[0].deltaPercent };
  recordPitchResponse(tracks, miss, miss.higherInterval === 0 ? 1 : 0);
  assert.equal(tracks[0].reversals.length, 1);
  assert.equal(tracks[0].complete, true);
  assert.equal(tracks[1].records.length, 0);
});

test('pitch summary reports percentages per anchor without a composite', () => {
  const tracks = createPitchTracks();
  tracks[0].reversals = [4, 3, 2, 3];
  tracks[0].records = [{ correct: true }, { correct: false }];
  tracks[0].complete = true;
  tracks[0].completionReason = 'converged';
  const summary = summarizePitch(tracks);
  assert.equal(summary[0].thresholdPercent, 3);
  assert.equal(summary[0].reversalRangePercent, 2);
  assert.equal(summary[0].accuracyPercent, 50);
  assert.equal(summary[0].settled, true);
  assert.equal(summary[0].completionReason, 'converged');
  assert.equal(summary[1].thresholdPercent, null);
  assert.equal(summary[1].settled, false);
  assert.equal('score' in summary, false);
});

test('max-trial tracks with one reversal remain explicitly non-settled', () => {
  const range = createRangeTrack(16000, {
    controlAt: [],
    minTrials: 3,
    maxTrials: 3,
    targetReversals: 8,
  });
  const firstRange = nextRangeTrial(range, () => 0);
  recordRangeResponse(range, firstRange, firstRange.toneInterval);
  const secondRange = nextRangeTrial(range, () => 0);
  recordRangeResponse(range, secondRange, secondRange.toneInterval);
  const thirdRange = nextRangeTrial(range, () => 0);
  recordRangeResponse(range, thirdRange, 1);
  assert.equal(range.reversals.length, 1);
  assert.equal(range.completionReason, 'max-trials');
  assert.equal(summarizeRange(range).settled, false);
  assert.equal(summarizeRange(range).thresholdHz, null);

  const pitch = createPitchTracks({ minTrials: 3, maxTrials: 3, targetReversals: 6 });
  const pitchTrial = () => ({
    kind: 'pitch',
    anchorHz: 500,
    deltaPercent: pitch[0].deltaPercent,
    higherInterval: 0,
    roveDb: [0, 0],
  });
  const firstPitch = pitchTrial();
  recordPitchResponse(pitch, firstPitch, 0);
  const secondPitch = pitchTrial();
  recordPitchResponse(pitch, secondPitch, 0);
  const thirdPitch = pitchTrial();
  recordPitchResponse(pitch, thirdPitch, 1);
  const firstSummary = summarizePitch(pitch).find((item) => item.anchorHz === 500);
  assert.equal(firstSummary.reversals, 1);
  assert.equal(firstSummary.completionReason, 'max-trials');
  assert.equal(firstSummary.settled, false);
  assert.equal(firstSummary.thresholdPercent, null);
});

test('audio helpers convert digital level and cap frequencies below Nyquist', () => {
  assert.ok(Math.abs(dbToGain(-6) - 0.5012) < 0.001);
  assert.equal(renderingFrequencyCeiling(44100), 18000);
  assert.equal(renderingFrequencyCeiling(32000), 13440);
});

test('range convergence waits until every scheduled control has been presented', () => {
  const track = createRangeTrack(18000, {
    controlAt: [0, 4],
    minTrials: 2,
    maxTrials: 8,
    targetReversals: 1,
  });
  track.reversals = [6500];

  let trial = nextRangeTrial(track, () => 0);
  recordRangeResponse(track, trial, trial.toneInterval);
  for (let count = 0; count < 3; count += 1) {
    trial = nextRangeTrial(track, () => 0);
    recordRangeResponse(track, trial, count === 1 ? 2 : trial.toneInterval);
  }
  assert.equal(track.complete, false);

  trial = nextRangeTrial(track, () => 0);
  assert.equal(trial.control, true);
  recordRangeResponse(track, trial, trial.toneInterval);
  assert.equal(track.complete, true);
});

test('technical ceiling requires two consecutive recent correct ceiling records', () => {
  const track = createRangeTrack(8000, { controlAt: [] });
  track.complete = true;
  track.completionReason = 'max-trials';
  track.records = [
    { correct: true, frequencyHz: 8000 },
    { correct: true, frequencyHz: 8000 },
    { correct: false, frequencyHz: 7000 },
  ];
  assert.equal(summarizeRange(track).atCeiling, false);

  track.records.push({ correct: true, frequencyHz: 8000 }, { correct: true, frequencyHz: 8000 });
  assert.equal(summarizeRange(track).atCeiling, true);
});

test('the setup reference bounds every later representative digital stimulus', () => {
  const laterGains = [
    HEARING_DIGITAL_LEVELS.headphones,
    HEARING_DIGITAL_LEVELS.range,
    HEARING_DIGITAL_LEVELS.pitchBase * dbToGain(HEARING_DIGITAL_LEVELS.pitchRoveMaxDb),
  ];
  for (const gain of laterGains) {
    const differenceDb = 20 * Math.log10(gain / HEARING_DIGITAL_LEVELS.reference);
    assert.ok(differenceDb <= 0, `later gain exceeded reference by ${differenceDb.toFixed(2)} dB`);
  }
});

test('pitch trials use the configured loudness-rove bound', () => {
  const tracks = createPitchTracks({ pitchRoveMaxDb: 0.75 });
  const trial = nextPitchTrial(tracks, sequenceRandom(0, 0, 0, 1));

  assert.deepEqual(trial.roveDb, [-0.75, 0.75]);
  assert.equal(tracks[0].config.pitchRoveMaxDb, 0.75);
  assert.equal(mergeHearingConfig().pitch.pitchRoveMaxDb, HEARING_DIGITAL_LEVELS.pitchRoveMaxDb);
});

test('production configuration accepts an explicit null development override', () => {
  const config = mergeHearingConfig(null);
  assert.equal(config.audio.toneMs, 460);
  assert.equal(config.headphones.scoredTrials, 6);
});

// ---------------------------------------------------------------------------
// Ground-truth assertions.
//
// Mutation testing left the staircase step-size switch, the settled/threshold
// gating, the technical-ceiling evidence rule, and the interleaving policy
// alive. Each test below pins a computed value or drives both sides of the
// exact boundary those mutants moved.
// ---------------------------------------------------------------------------

test('the range staircase switches to its fine step at exactly two reversals', () => {
  const track = createRangeTrack(18000, {
    controlAt: [],
    minTrials: 40,
    maxTrials: 40,
    targetReversals: 40,
    startHz: 6000,
    initialStepOctaves: 1,
    fineStepOctaves: 0.5,
  });

  const step = (correct) => {
    const trial = nextRangeTrial(track, () => 0);
    recordRangeResponse(track, trial, correct ? trial.toneInterval : 2);
    return track.frequencyHz;
  };

  // Two correct answers move up one octave. No reversals yet: coarse step.
  step(true);
  assert.equal(step(true), 12000);
  assert.equal(track.reversals.length, 0);

  // A miss turns the staircase around. The reversal is recorded before the
  // move, so this is reversal 1 and the move is still coarse.
  assert.equal(step(false), 6000);
  assert.equal(track.reversals.length, 1);

  // Two more correct answers turn it around again. That records reversal 2
  // *before* the step size is chosen, so this move is already the fine step:
  // 6000 * 2^0.5, not the coarse 6000 * 2^1 = 12000.
  step(true);
  const fine = step(true);
  assert.equal(track.reversals.length, 2);
  assert.ok(Math.abs(fine - 6000 * Math.SQRT2) < 1e-9, `fine step produced ${fine}`);
  assert.notEqual(Math.round(fine), 12000, 'the coarse step must no longer apply');
});

test('the pitch staircase switches to its fine factor at exactly two reversals', () => {
  const tracks = createPitchTracks({
    anchorsHz: [500],
    startPercent: 8,
    minPercent: 0.01,
    maxPercent: 100,
    minTrials: 40,
    maxTrials: 40,
    targetReversals: 40,
    initialFactor: 2,
    fineFactor: 4,
  });
  const step = (correct) => {
    const trial = {
      kind: 'pitch',
      anchorHz: 500,
      deltaPercent: tracks[0].deltaPercent,
      higherInterval: 0,
      roveDb: [0, 0],
    };
    recordPitchResponse(tracks, trial, correct ? 0 : 1);
    return tracks[0].deltaPercent;
  };

  step(true);
  assert.equal(step(true), 4, 'two correct answers halve the delta with the coarse factor');
  step(false);
  assert.equal(tracks[0].reversals.length, 1);
  step(true);
  step(true);
  assert.equal(tracks[0].reversals.length, 2);
  // The third turn uses the fine factor of 4, not the coarse factor of 2.
  const afterFine = step(false);
  assert.equal(afterFine, tracks[0].records.at(-2).nextDeltaPercent * 4);
});

test('range convergence requires the minimum trial count exactly, not one more', () => {
  const build = () =>
    createRangeTrack(18000, { controlAt: [], minTrials: 3, maxTrials: 40, targetReversals: 1 });

  const drive = (track, count) => {
    for (let index = 0; index < count; index += 1) {
      const trial = nextRangeTrial(track, () => 0);
      // Alternate so a reversal is recorded early.
      recordRangeResponse(track, trial, index === 2 ? 2 : trial.toneInterval);
    }
  };

  const short = build();
  drive(short, 2);
  assert.equal(short.complete, false, 'two trials is below the minimum of three');

  const atBoundary = build();
  drive(atBoundary, 3);
  assert.ok(atBoundary.reversals.length >= 1);
  assert.equal(atBoundary.complete, true, 'the third trial reaches the minimum');
  assert.equal(atBoundary.completionReason, 'converged');
});

test('a converged track at the technical ceiling is reported as such, not as converged', () => {
  const track = createRangeTrack(18000, {
    controlAt: [],
    minTrials: 2,
    maxTrials: 40,
    targetReversals: 0,
    startHz: 18000,
    maxHz: 18000,
    initialStepOctaves: 0,
    fineStepOctaves: 0,
  });
  for (let index = 0; index < 2; index += 1) {
    const trial = nextRangeTrial(track, () => 0);
    recordRangeResponse(track, trial, trial.toneInterval);
  }
  assert.equal(track.complete, true);
  assert.equal(track.completionReason, 'technical-ceiling');
  assert.equal(summarizeRange(track).atCeiling, true);
  assert.equal(summarizeRange(track).settled, true);
  assert.equal(summarizeRange(track).thresholdHz, 18000);
});

test('ceiling evidence needs both recent records correct and both at the ceiling', () => {
  const build = (records) => {
    const track = createRangeTrack(8000, { controlAt: [] });
    track.complete = true;
    track.completionReason = 'max-trials';
    track.records = records;
    return summarizeRange(track).atCeiling;
  };

  assert.equal(
    build([
      { correct: true, frequencyHz: 8000 },
      { correct: true, frequencyHz: 8000 },
    ]),
    true,
  );
  assert.equal(
    build([
      { correct: true, frequencyHz: 8000 },
      { correct: false, frequencyHz: 8000 },
    ]),
    false,
    'an incorrect answer at the ceiling is not ceiling evidence',
  );
  assert.equal(
    build([
      { correct: true, frequencyHz: 8000 },
      { correct: true, frequencyHz: 7000 },
    ]),
    false,
    'a correct answer below the ceiling is not ceiling evidence',
  );
  assert.equal(build([{ correct: true, frequencyHz: 8000 }]), false, 'one record is not enough');
  assert.equal(build([]), false);
});

test('a settled range needs a converged reason and at least one reversal', () => {
  const build = (completionReason, reversals) => {
    const track = createRangeTrack(8000, { controlAt: [] });
    track.complete = true;
    track.completionReason = completionReason;
    track.reversals = reversals;
    return summarizeRange(track);
  };

  assert.equal(build('converged', [7000, 7200]).settled, true);
  assert.equal(build('converged', []).settled, false, 'converged with no reversals is not settled');
  assert.equal(build('max-trials', [7000, 7200]).settled, false);
  assert.equal(build('incomplete', [7000, 7200]).settled, false);
  assert.equal(build('max-trials', [7000, 7200]).thresholdHz, null);
  assert.equal(build('converged', [7000, 7200]).thresholdHz, 7100);
});

test('the reversal range is reported from two reversals onward and rounds to 100 Hz', () => {
  const build = (reversals) => {
    const track = createRangeTrack(8000, { controlAt: [] });
    track.complete = true;
    track.completionReason = 'converged';
    track.reversals = reversals;
    return summarizeRange(track);
  };

  assert.equal(build([7000]).reversalRangeHz, null, 'a single reversal has no range');
  assert.equal(build([7000, 7250]).reversalRangeHz, 300, 'exactly two reversals produce a range');
  assert.equal(build([6500, 7300, 6900, 7500]).reversalRangeHz, 1000);
  assert.equal(build([7000, 7250]).thresholdHz, 7100, 'the threshold is the median, rounded to 100 Hz');
});

test('the pitch reversal range is reported from two reversals onward', () => {
  const build = (reversals) => {
    const tracks = createPitchTracks({ anchorsHz: [500] });
    tracks[0].reversals = reversals;
    tracks[0].complete = true;
    tracks[0].completionReason = 'converged';
    return summarizePitch(tracks)[0];
  };

  assert.equal(build([4]).reversalRangePercent, null);
  assert.equal(build([4, 3]).reversalRangePercent, 1);
  assert.equal(build([4, 3]).thresholdPercent, 3.5);
  assert.equal(build([]).settled, false, 'converged with no reversals is not settled');
  assert.equal(build([]).thresholdPercent, null);
});

test('headphone detection requires trials as well as a passing score', () => {
  assert.equal(summarizeHeadphones([], 0).headphoneLike, false, 'zero trials can never pass');
  assert.deepEqual(summarizeHeadphones([], 0), {
    correct: 0,
    trials: 0,
    accuracyPercent: null,
    headphoneLike: false,
  });
  assert.equal(summarizeHeadphones([{ correct: true }, { correct: false }], 2).headphoneLike, false);
  assert.equal(summarizeHeadphones([{ correct: true }, { correct: true }], 2).headphoneLike, true);
  assert.equal(
    summarizeHeadphones([{ correct: true }, { correct: false }], 1).headphoneLike,
    true,
    'the boundary is inclusive',
  );
  assert.equal(summarizeHeadphones([{ correct: true }, { correct: false }], 2).accuracyPercent, 50);
});

test('the interleaver only offers tracks within one trial of the shortest', () => {
  const tracks = createPitchTracks({ anchorsHz: [500, 2000], minTrials: 99, maxTrials: 99 });
  tracks[0].records = [1, 2, 3, 4].map(() => ({ correct: true }));
  tracks[1].records = [1, 2].map(() => ({ correct: true }));

  // Track 1 is two trials behind, so it is the only candidate whichever way the
  // random index falls. A `<= shortest + 1` widened to `<` would exclude the
  // shortest track itself and pick nothing.
  for (const random of [() => 0, () => 0.99]) {
    assert.equal(nextPitchTrial(tracks, random).anchorHz, 2000);
  }

  // One trial apart: both are candidates, so the random index selects between them.
  tracks[0].records = [1, 2, 3].map(() => ({ correct: true }));
  assert.equal(nextPitchTrial(tracks, () => 0).anchorHz, 500);
  assert.equal(nextPitchTrial(tracks, () => 0.99).anchorHz, 2000);
});

test('a completed track is never offered again and an empty set yields no trial', () => {
  const tracks = createPitchTracks({ anchorsHz: [500, 2000] });
  tracks[0].complete = true;
  assert.equal(nextPitchTrial(tracks, () => 0).anchorHz, 2000);
  tracks[1].complete = true;
  assert.equal(
    nextPitchTrial(tracks, () => 0),
    null,
  );
});

test('a rove of zero decibels produces no loudness jitter at all', () => {
  const tracks = createPitchTracks({ anchorsHz: [500], pitchRoveMaxDb: 0 });
  assert.deepEqual(nextPitchTrial(tracks, () => 0.9).roveDb, [0, 0]);

  const negative = createPitchTracks({ anchorsHz: [500], pitchRoveMaxDb: -4 });
  assert.deepEqual(nextPitchTrial(negative, () => 0.9).roveDb, [0, 0], 'a negative bound is clamped to zero');
});

test('the rove spans the full symmetric window in both directions', () => {
  const tracks = createPitchTracks({ anchorsHz: [500], pitchRoveMaxDb: 2 });
  assert.deepEqual(nextPitchTrial(tracks, () => 0).roveDb, [-2, -2], 'the bottom of the window is negative');
  assert.deepEqual(nextPitchTrial(tracks, () => 1).roveDb, [2, 2], 'the top of the window is positive');
  assert.deepEqual(nextPitchTrial(tracks, () => 0.5).roveDb, [0, 0]);
});

test('a random source that returns one never indexes past the last element', () => {
  // `randomIndex` clamps to length - 1; widening the clamp would produce an
  // undefined interval and a thrown RangeError.
  const trials = createHeadphoneTrials({ count: 3, random: () => 1 });
  for (const trial of trials) {
    assert.equal(trial.quietInterval, 2);
    assert.equal(trial.antiPhaseInterval, 1);
  }
  const tracks = createPitchTracks({ anchorsHz: [500] });
  assert.equal(nextPitchTrial(tracks, () => 1).higherInterval, 1);
});

test('practice headphone trials carry no anti-phase decoy', () => {
  const trials = createHeadphoneTrials({ count: 2, practice: true, random: () => 0 });
  for (const trial of trials) {
    assert.equal(trial.practice, true);
    assert.equal(trial.antiPhaseInterval, null);
    assert.equal(trial.quietInterval, 0);
  }
});

test('the median helper handles both parities and unsorted input', () => {
  assert.equal(median([]), null);
  assert.equal(median([5]), 5);
  assert.equal(median([1, 2]), 1.5);
  assert.equal(median([3, 1, 2]), 2, 'the input is sorted before the middle is taken');
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('gain and Nyquist helpers return exact values', () => {
  assert.equal(dbToGain(0), 1);
  assert.equal(dbToGain(20), 10);
  assert.equal(dbToGain(-20), 0.1);
  assert.ok(Math.abs(dbToGain(-6) - 0.5011872336272722) < 1e-12);

  assert.equal(renderingFrequencyCeiling(44100), 18000, 'the configured ceiling wins above 42.8 kHz');
  assert.equal(renderingFrequencyCeiling(32000), 13440, '42% of the sample rate wins below it');
  assert.equal(renderingFrequencyCeiling(48000), 18000);
  assert.equal(renderingFrequencyCeiling(8000), 3360);
  assert.equal(renderingFrequencyCeiling(32000, 10000), 10000, 'an explicit ceiling is honoured');
});

test('the default hearing configuration is the published instrument contract', () => {
  const config = mergeHearingConfig();
  assert.deepEqual(config.range, {
    startHz: 6000,
    minHz: 2500,
    maxHz: 18000,
    targetReversals: 8,
    minTrials: 12,
    maxTrials: 28,
    controlAt: [8, 17],
    initialStepOctaves: 0.28,
    fineStepOctaves: 0.12,
  });
  assert.deepEqual(config.pitch, {
    anchorsHz: [500, 2000],
    startPercent: 8,
    minPercent: 0.2,
    maxPercent: 20,
    targetReversals: 6,
    minTrials: 10,
    maxTrials: 18,
    initialFactor: 1.55,
    fineFactor: 1.22,
    pitchRoveMaxDb: HEARING_DIGITAL_LEVELS.pitchRoveMaxDb,
  });
});
