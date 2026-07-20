import { dbToGain, HEARING_DIGITAL_LEVELS } from './hearing.js';

/** @typedef {{ toneMs: number, gapMs: number, rampMs: number, referenceMs: number, masterGain: number }} HearingAudioConfig */
/** @typedef {{ quietInterval: number, antiPhaseInterval: number | null }} HeadphoneTrial */
/** @typedef {{ toneInterval: number, frequencyHz: number }} RangeTrial */
/** @typedef {{ anchorHz: number, deltaPercent: number, higherInterval: number, roveDb: [number, number] }} PitchTrial */
/** @typedef {{ frequencyHz: number, gain: number, antiPhase?: boolean }} ToneInterval */
/** @typedef {ToneInterval & { startAt: number, toneSeconds: number, rampSeconds: number }} ScheduledTone */
/** @typedef {{ resolve: (completed: boolean) => void }} PendingWait */
/** @typedef {AudioNode & { stop?: () => void }} TrackedAudioNode */
/** @typedef {typeof globalThis & { webkitAudioContext?: typeof AudioContext }} AudioGlobal */

export class HearingAudio {
  /** @param {HearingAudioConfig} config */
  constructor(config) {
    this.config = config;
    /** @type {AudioContext | null} */
    this.context = null;
    /** @type {GainNode | null} */
    this.master = null;
    /** @type {Set<TrackedAudioNode>} */
    this.nodes = new Set();
    /** @type {Set<PendingWait>} */
    this.pendingWaits = new Set();
    this.playToken = 0;
    /** @type {((state: AudioContextState) => void) | null} */
    this.onStateChange = null;
    /** @type {(() => void) | null} */
    this.onOutputChange = null;
    this.handleContextStateChange = () => {
      const contextState = this.context?.state ?? 'closed';
      if (contextState !== 'running') this.stop();
      this.onStateChange?.(contextState);
    };
    this.handleSinkChange = () => this.onOutputChange?.();
  }

  get supported() {
    const audioGlobal = /** @type {AudioGlobal} */ (globalThis);
    return Boolean(audioGlobal.AudioContext || audioGlobal.webkitAudioContext);
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
      const audioGlobal = /** @type {AudioGlobal} */ (globalThis);
      const AudioContextClass = audioGlobal.AudioContext || audioGlobal.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is unavailable');
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
    const context = this.requireContext();
    const token = this.playToken;
    const startAt = context.currentTime + 0.05;
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

  async playAudibilityAnchors() {
    return this.playIntervals(
      [200, 500, 2000].map((frequencyHz) => ({
        frequencyHz,
        gain: HEARING_DIGITAL_LEVELS.pitchBase,
      })),
    );
  }

  /** @param {HeadphoneTrial} trial @param {(index: number) => void} [onInterval] */
  async playHeadphoneTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) => ({
      frequencyHz: 200,
      gain: HEARING_DIGITAL_LEVELS.headphones * (index === trial.quietInterval ? dbToGain(-6) : 1),
      antiPhase: index === trial.antiPhaseInterval,
    }));
    return this.playIntervals(intervals, onInterval);
  }

  /** @param {RangeTrial} trial @param {(index: number) => void} [onInterval] */
  async playRangeTrial(trial, onInterval) {
    const intervals = [0, 1, 2].map((index) =>
      index === trial.toneInterval
        ? { frequencyHz: trial.frequencyHz, gain: HEARING_DIGITAL_LEVELS.range }
        : null,
    );
    return this.playIntervals(intervals, onInterval);
  }

  /** @param {PitchTrial} trial @param {(index: number) => void} [onInterval] */
  async playPitchTrial(trial, onInterval) {
    const upperHz = trial.anchorHz * (1 + trial.deltaPercent / 100);
    const intervals = trial.roveDb.map((roveDb, index) => ({
      frequencyHz: index === trial.higherInterval ? upperHz : trial.anchorHz,
      gain: HEARING_DIGITAL_LEVELS.pitchBase * dbToGain(roveDb),
    }));
    return this.playIntervals(intervals, onInterval);
  }

  /** @param {(ToneInterval | null)[]} intervals @param {(index: number) => void} [onInterval] */
  async playIntervals(intervals, onInterval) {
    await this.init();
    this.stop();
    const context = this.requireContext();
    const token = this.playToken;
    const toneSeconds = this.config.toneMs / 1000;
    const gapSeconds = this.config.gapMs / 1000;
    const rampSeconds = Math.min(this.config.rampMs / 1000, toneSeconds / 3);
    const startAt = context.currentTime + 0.08;

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

  /** @param {ScheduledTone} tone */
  scheduleTone({ frequencyHz, gain, antiPhase = false, startAt, toneSeconds, rampSeconds }) {
    const context = this.requireContext();
    const master = this.requireMaster();
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const left = context.createGain();
    const right = context.createGain();
    const merger = context.createChannelMerger(2);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequencyHz, startAt);
    scheduleEnvelope(envelope.gain, startAt, toneSeconds, rampSeconds, gain);
    left.gain.value = Math.SQRT1_2;
    right.gain.value = antiPhase ? -Math.SQRT1_2 : Math.SQRT1_2;
    oscillator.connect(envelope);
    envelope.connect(left).connect(merger, 0, 0);
    envelope.connect(right).connect(merger, 0, 1);
    merger.connect(master);
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

  /** @param {...TrackedAudioNode} nodes */
  track(...nodes) {
    for (const node of nodes) this.nodes.add(node);
  }

  /** @param {number} at @param {number} token @param {() => void} callback */
  scheduleAudioMarker(at, token, callback) {
    const context = this.requireContext();
    const marker = context.createBufferSource();
    marker.buffer = context.createBuffer(1, 1, context.sampleRate);
    marker.connect(this.requireMaster());
    marker.onended = () => {
      this.nodes.delete(marker);
      marker.disconnect?.();
      if (token === this.playToken && this.context?.state === 'running') callback();
    };
    this.track(marker);
    marker.start(at);
  }

  /** @param {number} endAt @param {number} token @returns {Promise<boolean>} */
  waitForAudioTime(endAt, token) {
    return new Promise((resolve) => {
      const context = this.requireContext();
      let settled = false;
      const marker = context.createBufferSource();
      marker.buffer = context.createBuffer(1, 1, context.sampleRate);
      marker.connect(this.requireMaster());
      /** @param {boolean} completed */
      const settle = (completed) => {
        if (settled) return;
        settled = true;
        this.pendingWaits.delete(pending);
        this.nodes.delete(marker);
        marker.disconnect?.();
        resolve(completed);
      };
      /** @type {PendingWait} */
      const pending = { resolve: () => settle(false) };
      this.pendingWaits.add(pending);
      this.track(marker);
      marker.onended = () =>
        settle(
          token === this.playToken && context.state === 'running' && context.currentTime >= endAt - 0.005,
        );
      marker.start(endAt);
    });
  }

  requireContext() {
    if (!this.context) throw new Error('Audio context has not been initialized');
    return this.context;
  }

  requireMaster() {
    if (!this.master) throw new Error('Audio output has not been initialized');
    return this.master;
  }
}

/** @param {AudioParam} audioParam @param {number} startAt @param {number} durationSeconds @param {number} rampSeconds @param {number} gain */
function scheduleEnvelope(audioParam, startAt, durationSeconds, rampSeconds, gain) {
  const endAt = startAt + durationSeconds;
  audioParam.cancelScheduledValues(startAt);
  audioParam.setValueAtTime(0.0001, startAt);
  audioParam.linearRampToValueAtTime(gain, startAt + rampSeconds);
  audioParam.setValueAtTime(gain, Math.max(startAt + rampSeconds, endAt - rampSeconds));
  audioParam.linearRampToValueAtTime(0.0001, endAt);
}
