import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHeadphoneTrials,
  createPitchTracks,
  createRangeTrack,
  dbToGain,
  mergeHearingConfig,
  nextPitchTrial,
  nextRangeTrial,
  recordPitchResponse,
  recordRangeResponse,
  safeFrequencyCeiling,
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
  assert.deepEqual(summarizeRange(track), {
    thresholdHz: 8000,
    spreadHz: 1000,
    atCeiling: true,
    reversals: 4,
    trials: 2,
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
  const summary = summarizePitch(tracks);
  assert.equal(summary[0].thresholdPercent, 3);
  assert.equal(summary[0].spreadPercent, 2);
  assert.equal(summary[0].accuracyPercent, 50);
  assert.equal(summary[1].thresholdPercent, null);
  assert.equal('score' in summary, false);
});

test('audio helpers convert digital level and cap frequencies below Nyquist', () => {
  assert.ok(Math.abs(dbToGain(-6) - 0.5012) < 0.001);
  assert.equal(safeFrequencyCeiling(44100), 18000);
  assert.equal(safeFrequencyCeiling(32000), 13440);
});

test('production configuration accepts an explicit null development override', () => {
  const config = mergeHearingConfig(null);
  assert.equal(config.audio.toneMs, 460);
  assert.equal(config.headphones.scoredTrials, 6);
});
