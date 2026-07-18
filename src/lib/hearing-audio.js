import { dbToGain } from './hearing.js';

export class HearingAudio {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.master = null;
    this.nodes = new Set();
    this.timers = new Set();
    this.pendingWaits = new Set();
    this.playToken = 0;
  }

  get supported() {
    return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  get sampleRate() {
    return this.context?.sampleRate ?? null;
  }

  async init() {
    if (!this.supported) throw new Error('Web Audio is unavailable');
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      this.context = new AudioContextClass({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = this.config.masterGain;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }

  async playReference() {
    await this.init();
    this.stop();
    const token = this.playToken;
    const startAt = this.context.currentTime + 0.05;
    const durationSeconds = this.config.referenceMs / 1000;
    const source = this.context.createBufferSource();
    const samples = Math.ceil(this.context.sampleRate * durationSeconds);
    const buffer = this.context.createBuffer(2, samples, this.context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      let memory = 0;
      for (let index = 0; index < samples; index += 1) {
        const white = Math.random() * 2 - 1;
        memory = memory * 0.92 + white * 0.08;
        data[index] = memory * 1.8;
      }
    }
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.55;
    const envelope = this.context.createGain();
    scheduleEnvelope(envelope.gain, startAt, durationSeconds, Math.min(0.08, durationSeconds / 3), 0.68);
    source.connect(filter).connect(envelope).connect(this.master);
    this.track(source, filter, envelope);
    source.start(startAt);
    source.stop(startAt + durationSeconds + 0.02);
    return this.waitFor(durationSeconds + 0.08, token);
  }

  async playHeadphoneTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) => ({
      frequencyHz: 200,
      gain: index === trial.quietInterval ? dbToGain(-6) : 1,
      antiPhase: index === trial.antiPhaseInterval,
    }));
    return this.playIntervals(intervals, onInterval);
  }

  async playRangeTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) =>
      index === trial.toneInterval ? { frequencyHz: trial.frequencyHz, gain: 0.82 } : null,
    );
    return this.playIntervals(intervals, onInterval);
  }

  async playPitchTrial(trial, onInterval) {
    const upperHz = trial.anchorHz * (1 + trial.deltaPercent / 100);
    const intervals = [0, 1].map((index) => ({
      frequencyHz: index === trial.higherInterval ? upperHz : trial.anchorHz,
      gain: 0.78 * dbToGain(trial.roveDb[index]),
    }));
    return this.playIntervals(intervals, onInterval);
  }

  async playIntervals(intervals, onInterval) {
    await this.init();
    this.stop();
    const token = this.playToken;
    const toneSeconds = this.config.toneMs / 1000;
    const gapSeconds = this.config.gapMs / 1000;
    const rampSeconds = Math.min(this.config.rampMs / 1000, toneSeconds / 3);
    const startAt = this.context.currentTime + 0.08;

    intervals.forEach((interval, index) => {
      const intervalStart = startAt + index * (toneSeconds + gapSeconds);
      if (interval) {
        this.scheduleTone({ ...interval, startAt: intervalStart, toneSeconds, rampSeconds });
      }
      this.scheduleTimer(
        () => onInterval?.(index),
        Math.max(0, (intervalStart - this.context.currentTime) * 1000),
      );
    });
    const totalSeconds = intervals.length * toneSeconds + (intervals.length - 1) * gapSeconds + 0.1;
    return this.waitFor(totalSeconds, token);
  }

  scheduleTone({ frequencyHz, gain, antiPhase = false, startAt, toneSeconds, rampSeconds }) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const left = this.context.createGain();
    const right = this.context.createGain();
    const merger = this.context.createChannelMerger(2);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequencyHz, startAt);
    scheduleEnvelope(envelope.gain, startAt, toneSeconds, rampSeconds, gain);
    left.gain.value = Math.SQRT1_2;
    right.gain.value = antiPhase ? -Math.SQRT1_2 : Math.SQRT1_2;
    oscillator.connect(envelope);
    envelope.connect(left).connect(merger, 0, 0);
    envelope.connect(right).connect(merger, 0, 1);
    merger.connect(this.master);
    this.track(oscillator, envelope, left, right, merger);
    oscillator.start(startAt);
    oscillator.stop(startAt + toneSeconds + 0.02);
  }

  async suspend() {
    this.stop();
    if (this.context?.state === 'running') await this.context.suspend();
  }

  stop() {
    this.playToken += 1;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const pending of this.pendingWaits) pending.resolve(false);
    this.pendingWaits.clear();
    for (const node of this.nodes) {
      try {
        node.stop?.();
      } catch {
        // Nodes that have already ended cannot be stopped twice.
      }
      try {
        node.disconnect?.();
      } catch {
        // A disconnected node is already clean.
      }
    }
    this.nodes.clear();
  }

  async close() {
    this.stop();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
    this.master = null;
  }

  track(...nodes) {
    for (const node of nodes) this.nodes.add(node);
  }

  scheduleTimer(callback, delayMs) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }

  waitFor(seconds, token) {
    return new Promise((resolve) => {
      const pending = { resolve };
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.pendingWaits.delete(pending);
        resolve(token === this.playToken);
      }, seconds * 1000);
      this.pendingWaits.add(pending);
      this.timers.add(timer);
    });
  }
}

function scheduleEnvelope(audioParam, startAt, durationSeconds, rampSeconds, gain) {
  const endAt = startAt + durationSeconds;
  audioParam.cancelScheduledValues(startAt);
  audioParam.setValueAtTime(0.0001, startAt);
  audioParam.linearRampToValueAtTime(gain, startAt + rampSeconds);
  audioParam.setValueAtTime(gain, Math.max(startAt + rampSeconds, endAt - rampSeconds));
  audioParam.linearRampToValueAtTime(0.0001, endAt);
}
