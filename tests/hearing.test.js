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
  const summary = summarizeRange(track);
  assert.equal(summary.atCeiling, true);
  // Walking straight up to the rendering ceiling is not convergence, and the
  // reason label says so. It is still usable evidence: the boundary is at or
  // above `maxHz`, reported as a lower bound. A staircase pinned at `maxHz`
  // cannot bank a reversal, so requiring one here would ask for unobtainable
  // evidence rather than raise the standard.
  assert.equal(summary.settled, true, 'ceiling evidence bounds the run on its own');
  assert.equal(summary.reversals, 0, 'the absence of convergence stays visible');
  assert.equal(summary.thresholdHz, 18000, 'the ceiling is published as the lower bound');
  assert.equal(summary.reversalRangeHz, null, 'no reversals means no reversal range');
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

  // The 0.1%-of-maxHz tolerance is exclusive. At maxHz 8000 that boundary is
  // exactly 8 Hz, so pin both sides of it: the tolerance exists to absorb the
  // rounding of a clamped geometric step, not to widen what counts as "at the
  // ceiling".
  assert.equal(
    build([
      { correct: true, frequencyHz: 8000 },
      { correct: true, frequencyHz: 8007.9 },
    ]),
    true,
    'just inside 0.1% of maxHz still counts as the ceiling',
  );
  assert.equal(
    build([
      { correct: true, frequencyHz: 8000 },
      { correct: true, frequencyHz: 8008 },
    ]),
    false,
    'exactly 0.1% away is outside the tolerance',
  );
});

test('a settled range needs a completing reason plus reversal or ceiling evidence', () => {
  const build = (completionReason, reversals, records = []) => {
    const track = createRangeTrack(8000, { controlAt: [] });
    track.complete = true;
    track.completionReason = completionReason;
    track.reversals = reversals;
    track.records = records;
    return summarizeRange(track);
  };
  const ceilingRecords = [
    { correct: true, frequencyHz: 8000 },
    { correct: true, frequencyHz: 8000 },
  ];

  // A completing reason is necessary but never sufficient on its own.
  assert.equal(build('converged', [7000, 7200]).settled, true);
  assert.equal(build('max-trials', [7000, 7200]).settled, false);
  assert.equal(build('incomplete', [7000, 7200]).settled, false);
  assert.equal(build('max-trials', [7000, 7200]).thresholdHz, null);
  assert.equal(build('converged', [7000, 7200]).thresholdHz, 7100);

  // Reversals and ceiling evidence are two independent sufficient classes.
  // Either one bounds the run; neither present leaves it unsettled.
  assert.equal(build('converged', []).settled, false, 'no reversals and no ceiling evidence is not settled');
  assert.equal(build('converged', []).thresholdHz, null);
  assert.equal(
    build('technical-ceiling', [], ceilingRecords).settled,
    true,
    'ceiling evidence alone settles the run as a lower bound',
  );
  assert.equal(build('technical-ceiling', [], ceilingRecords).thresholdHz, 8000);
  assert.equal(
    build('incomplete', [], ceilingRecords).settled,
    false,
    'ceiling evidence on a track that never completed is still not settled',
  );
  // Ceiling evidence outranks the reversal median: the run is bounded from
  // below by the device, not estimated at the reversal midpoint.
  assert.equal(build('technical-ceiling', [7000, 7200], ceilingRecords).thresholdHz, 8000);
});

test('a flawless ceiling run reports at least as much as a one-error ceiling run', () => {
  // The property this pins: honest reporting must be monotone in performance.
  // A listener who never missed a trial must never be told less than one who
  // missed one. A staircase pinned at `maxHz` cannot produce a reversal, so a
  // reversal requirement inverted this ordering — the flawless run lost both
  // its bound and its `settled` flag while the one-error run kept them.
  const drive = (missAt) => {
    const track = createRangeTrack(18000, { controlAt: [] });
    const misses = new Set(missAt);
    let guard = 0;
    while (!track.complete && guard < 500) {
      const trial = nextRangeTrial(track, () => 0);
      const answer = misses.has(track.records.length) ? (trial.toneInterval + 1) % 3 : trial.toneInterval;
      recordRangeResponse(track, trial, answer);
      guard += 1;
    }
    return summarizeRange(track);
  };

  const flawless = drive([]);
  assert.equal(flawless.atCeiling, true, 'a flawless listener reaches the device ceiling');
  assert.equal(flawless.reversals, 0, 'and cannot bank a reversal there');
  assert.equal(flawless.settled, true);
  assert.equal(flawless.thresholdHz, 18000);

  /** How much a run is willing to publish about itself. */
  const disclosed = (summary) => Number(summary.settled) + Number(summary.thresholdHz !== null);

  for (let missAt = 0; missAt < 8; missAt += 1) {
    const lapsed = drive([missAt]);
    assert.ok(
      disclosed(flawless) >= disclosed(lapsed),
      `a flawless run disclosed ${disclosed(flawless)} but a run missing trial ${missAt} disclosed ${disclosed(lapsed)}`,
    );
    assert.ok(
      lapsed.thresholdHz === null || flawless.thresholdHz >= lapsed.thresholdHz,
      `a flawless run bounded at ${flawless.thresholdHz} Hz but a run missing trial ${missAt} bounded higher at ${lapsed.thresholdHz} Hz`,
    );
  }

  // The specific inversion that shipped: a single early miss banks one
  // reversal and used to be the only way to earn a published bound.
  for (const missAt of [0, 1]) {
    const lapsed = drive([missAt]);
    assert.equal(lapsed.atCeiling, true, `miss at ${missAt} still ends at the ceiling`);
    assert.equal(lapsed.reversals, 1);
    assert.equal(lapsed.settled, true);
    assert.equal(disclosed(flawless), disclosed(lapsed), 'both are bounded by the same ceiling');
  }
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

test('a max-trials track that ends at the ceiling is reported as a technical ceiling', () => {
  const track = createRangeTrack(18000, {
    controlAt: [],
    minTrials: 99,
    maxTrials: 2,
    targetReversals: 99,
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
  assert.equal(
    track.completionReason,
    'technical-ceiling',
    'running out of trials at the ceiling is a ceiling result, not a max-trials result',
  );
  assert.equal(
    summarizeRange(track).settled,
    true,
    'ceiling evidence bounds the run even when the trial budget ran out',
  );
  assert.equal(summarizeRange(track).thresholdHz, 18000, 'reported as a lower bound');
  assert.equal(summarizeRange(track).reversals, 0);
});

test('exhausting the trial budget below the ceiling is not settled', () => {
  const track = createRangeTrack(8000, {
    controlAt: [],
    startHz: 6000,
    maxHz: 8000,
    minTrials: 99,
    maxTrials: 4,
    targetReversals: 99,
    initialStepOctaves: 0,
    fineStepOctaves: 0,
  });
  for (let index = 0; index < 4; index += 1) {
    const trial = nextRangeTrial(track, () => 0);
    recordRangeResponse(track, trial, (trial.toneInterval + 1) % 3);
  }
  const summary = summarizeRange(track);
  assert.equal(summary.completionReason, 'max-trials');
  assert.equal(summary.atCeiling, false, 'the track never reached the device ceiling');
  assert.equal(summary.settled, false, 'no reversals and no ceiling evidence bounds nothing');
  assert.equal(summary.thresholdHz, null);
});

/*
 * Termination is a behaviour, not a flag. `nextPitchTrial` only stops serving
 * because `recordPitchResponse` marks a track complete, so asserting the
 * completion reason alone leaves the exit path untested: dropping
 * `track.complete = true` from the max-trials branch left an unbounded pitch
 * staircase and a self-contradictory public state (`completionReason:
 * 'max-trials'` while `complete: false`) that the whole unit suite passed.
 * These two tests assert the loop actually exits, and that it exits because the
 * module stopped serving rather than because the safety cap was reached.
 */
test('the pitch staircase stops serving trials when the trial budget runs out', () => {
  const tracks = createPitchTracks({ anchorsHz: [500], minTrials: 99, maxTrials: 6, targetReversals: 99 });
  const CAP = 200;
  let served = 0;
  // Always correct, so the staircase only ever steps down and banks no
  // reversals: convergence can never fire and max-trials is the only exit.
  let trial = nextPitchTrial(tracks, () => 0);
  while (trial && served < CAP) {
    recordPitchResponse(tracks, trial, trial.higherInterval);
    served += 1;
    trial = nextPitchTrial(tracks, () => 0);
  }

  assert.equal(trial, null, 'the staircase must stop serving trials, not run to the safety cap');
  assert.ok(served < CAP, `served ${served} trials without terminating`);
  assert.equal(served, 6, 'exactly maxTrials trials are served');
  assert.equal(tracks[0].reversals.length, 0, 'no reversals, so this is the max-trials path');
  assert.equal(tracks[0].complete, true, 'a track out of trials must mark itself complete');
  assert.equal(tracks[0].completionReason, 'max-trials');
  assert.equal(summarizePitch(tracks)[0].settled, false, 'and it is not a settled result');
});

test('the pitch staircase stops serving trials once every track converges', () => {
  const tracks = createPitchTracks({
    anchorsHz: [500, 2000],
    minTrials: 2,
    maxTrials: 99,
    targetReversals: 1,
  });
  const CAP = 400;
  let served = 0;
  // Two correct then one wrong, counted per track rather than globally, because
  // the two anchors are interleaved. Two correct steps down, the wrong answer
  // steps back up, and that direction change banks the reversal convergence
  // needs — so convergence is the exit here, not the trial budget.
  let trial = nextPitchTrial(tracks, () => 0);
  while (trial && served < CAP) {
    const track = tracks.find((entry) => entry.anchorHz === trial.anchorHz);
    const wrong = track.records.length % 3 === 2;
    recordPitchResponse(tracks, trial, wrong ? (trial.higherInterval + 1) % 2 : trial.higherInterval);
    served += 1;
    trial = nextPitchTrial(tracks, () => 0);
  }

  assert.equal(trial, null, 'the staircase must stop serving trials, not run to the safety cap');
  assert.ok(served < CAP, `served ${served} trials without terminating`);
  for (const track of tracks) {
    assert.equal(track.complete, true, `the ${track.anchorHz} Hz track must mark itself complete`);
    assert.equal(track.completionReason, 'converged');
    assert.ok(track.records.length < 99, 'convergence, not the trial budget, ended the track');
  }
});

test('the range staircase stops serving trials once the track completes', () => {
  const track = createRangeTrack(18000, { controlAt: [], minTrials: 2, maxTrials: 6, targetReversals: 99 });
  const CAP = 200;
  let served = 0;
  while (!track.complete && served < CAP) {
    const trial = nextRangeTrial(track, () => 0);
    recordRangeResponse(track, trial, trial.toneInterval);
    served += 1;
  }

  assert.ok(served < CAP, `served ${served} trials without completing`);
  assert.equal(served, 6, 'exactly maxTrials trials are served');
  assert.equal(track.complete, true);
});

test('a track that never completed is never settled', () => {
  const summary = summarizeRange(createRangeTrack(18000));
  assert.equal(summary.completionReason, 'incomplete');
  assert.equal(summary.settled, false);
  assert.equal(summary.thresholdHz, null);
});

test('the pitch fine factor applies on the move that records the second reversal', () => {
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
    recordPitchResponse(
      tracks,
      {
        kind: 'pitch',
        anchorHz: 500,
        deltaPercent: tracks[0].deltaPercent,
        higherInterval: 0,
        roveDb: [0, 0],
      },
      correct ? 0 : 1,
    );
    return tracks[0].deltaPercent;
  };

  step(true);
  assert.equal(step(true), 4, 'coarse factor of 2 while there are no reversals');
  assert.equal(step(false), 8, 'reversal 1, still the coarse factor');
  assert.equal(tracks[0].reversals.length, 1);

  step(true);
  // This move records reversal 2 before choosing the step, so it must already
  // use the fine factor: 8 / 4, not the coarse 8 / 2.
  const afterSecondReversal = step(true);
  assert.equal(tracks[0].reversals.length, 2);
  assert.equal(afterSecondReversal, 2);
});
