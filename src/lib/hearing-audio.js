import { dbToGain, HEARING_DIGITAL_LEVELS } from './hearing.js';

export class HearingAudio {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.master = null;
    this.nodes = new Set();
    this.pendingWaits = new Set();
    this.playToken = 0;
    this.onStateChange = null;
    this.onOutputChange = null;
    this.handleContextStateChange = () => {
      const contextState = this.context?.state ?? 'closed';
      if (contextState !== 'running') this.stop();
      this.onStateChange?.(contextState);
    };
    this.handleSinkChange = () => this.onOutputChange?.();
  }

  get supported() {
    return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  get sampleRate() {
    return this.context?.sampleRate ?? null;
  }

  get state() {
    return this.context?.state ?? 'closed';
  }

  async init() {
    if (!this.supported) throw new Error('Web Audio is unavailable');
    if (this.context?.state === 'closed') {
      this.context = null;
      this.master = null;
    }
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      this.context = new AudioContextClass({ latencyHint: 'interactive' });
      this.context.addEventListener?.('statechange', this.handleContextStateChange);
      this.context.addEventListener?.('sinkchange', this.handleSinkChange);
      this.master = this.context.createGain();
      this.master.gain.value = this.config.masterGain;
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio context is not running');
    return this.context;
  }

  async playReference() {
    await this.init();
    this.stop();
    const token = this.playToken;
    const startAt = this.context.currentTime + 0.05;
    const durationSeconds = this.config.referenceMs / 1000;
    this.scheduleTone({
      frequencyHz: 1000,
      gain: HEARING_DIGITAL_LEVELS.reference,
      startAt,
      toneSeconds: durationSeconds,
      rampSeconds: Math.min(0.08, durationSeconds / 3),
    });
    return this.waitForAudioTime(startAt + durationSeconds + 0.03, token);
  }

  async playHeadphoneTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) => ({
      frequencyHz: 200,
      gain: HEARING_DIGITAL_LEVELS.headphones * (index === trial.quietInterval ? dbToGain(-6) : 1),
      antiPhase: index === trial.antiPhaseInterval,
    }));
    return this.playIntervals(intervals, onInterval);
  }

  async playRangeTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) =>
      index === trial.toneInterval
        ? { frequencyHz: trial.frequencyHz, gain: HEARING_DIGITAL_LEVELS.range }
        : null,
    );
    return this.playIntervals(intervals, onInterval);
  }

  async playPitchTrial(trial, onInterval) {
    const upperHz = trial.anchorHz * (1 + trial.deltaPercent / 100);
    const intervals = [0, 1].map((index) => ({
      frequencyHz: index === trial.higherInterval ? upperHz : trial.anchorHz,
      gain: HEARING_DIGITAL_LEVELS.pitchBase * dbToGain(trial.roveDb[index]),
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
      this.scheduleAudioMarker(intervalStart, token, () => onInterval?.(index));
    });
    const endAt = startAt + intervals.length * toneSeconds + (intervals.length - 1) * gapSeconds + 0.03;
    return this.waitForAudioTime(endAt, token);
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
    if (this.context) {
      this.context.removeEventListener?.('statechange', this.handleContextStateChange);
      this.context.removeEventListener?.('sinkchange', this.handleSinkChange);
      if (this.context.state !== 'closed') await this.context.close();
    }
    this.context = null;
    this.master = null;
  }

  track(...nodes) {
    for (const node of nodes) this.nodes.add(node);
  }

  scheduleAudioMarker(at, token, callback) {
    const marker = this.context.createBufferSource();
    marker.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    marker.connect(this.master);
    marker.onended = () => {
      this.nodes.delete(marker);
      marker.disconnect?.();
      if (token === this.playToken && this.context?.state === 'running') callback();
    };
    this.track(marker);
    marker.start(at);
  }

  waitForAudioTime(endAt, token) {
    return new Promise((resolve) => {
      let settled = false;
      const marker = this.context.createBufferSource();
      marker.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      marker.connect(this.master);
      const settle = (completed) => {
        if (settled) return;
        settled = true;
        this.pendingWaits.delete(pending);
        this.nodes.delete(marker);
        marker.disconnect?.();
        resolve(completed);
      };
      const pending = { resolve: () => settle(false) };
      this.pendingWaits.add(pending);
      this.track(marker);
      marker.onended = () =>
        settle(
          token === this.playToken &&
            this.context?.state === 'running' &&
            this.context.currentTime >= endAt - 0.005,
        );
      marker.start(endAt);
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
