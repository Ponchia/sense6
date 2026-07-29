import assert from 'node:assert/strict';
import test from 'node:test';
import { dbToGain, HEARING_DIGITAL_LEVELS } from '../src/lib/hearing.js';
import { HearingAudio } from '../src/lib/hearing-audio.js';

const CONFIG = Object.freeze({
  toneMs: 400,
  gapMs: 200,
  rampMs: 30,
  referenceMs: 900,
  masterGain: 0.5,
});

// ---------------------------------------------------------------------------
// A deterministic Web Audio stub.
//
// `currentTime` never advances on its own: the test drives it with
// `context.advanceTo(seconds)`, which fires every buffer-source scheduled at or
// before that time. That makes tone scheduling, interval markers, and the
// completion promise fully observable without real audio hardware.
// ---------------------------------------------------------------------------

class FakeAudioParam {
  constructor(owner, name) {
    this.owner = owner;
    this.name = name;
    this.value = 0;
    /** @type {{ kind: string, value?: number, at: number }[]} */
    this.automation = [];
  }
  cancelScheduledValues(at) {
    this.automation.push({ kind: 'cancel', at });
    return this;
  }
  setValueAtTime(value, at) {
    this.automation.push({ kind: 'set', value, at });
    return this;
  }
  linearRampToValueAtTime(value, at) {
    this.automation.push({ kind: 'ramp', value, at });
    return this;
  }
}

class FakeNode {
  constructor(context, kind) {
    this.context = context;
    this.kind = kind;
    /** @type {{ target: FakeNode, output: number, input: number }[]} */
    this.connections = [];
    this.disconnected = false;
    context.created.push(this);
  }
  connect(target, output = 0, input = 0) {
    this.connections.push({ target, output, input });
    return target;
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeGain extends FakeNode {
  constructor(context) {
    super(context, 'gain');
    this.gain = new FakeAudioParam(this, 'gain');
  }
}

class FakeOscillator extends FakeNode {
  constructor(context) {
    super(context, 'oscillator');
    this.type = '';
    this.frequency = new FakeAudioParam(this, 'frequency');
    this.startedAt = null;
    this.stoppedAt = null;
    /** Every `stop()` argument, in order. Scheduling passes a time; teardown passes nothing. */
    this.stopArgs = [];
  }
  start(at) {
    this.startedAt = at;
  }
  stop(at) {
    this.stopArgs.push(at);
    if (at !== undefined) this.stoppedAt = at;
  }
}

class FakeBufferSource extends FakeNode {
  constructor(context) {
    super(context, 'buffer-source');
    this.buffer = null;
    this.onended = null;
    this.startedAt = null;
    this.fired = false;
    this.stopCalls = 0;
  }
  start(at) {
    this.startedAt = at;
    this.context.pendingMarkers.add(this);
  }
  stop() {
    this.stopCalls += 1;
    this.context.pendingMarkers.delete(this);
  }
}

class FakeAudioContext {
  constructor(options) {
    this.options = options;
    this.state = 'suspended';
    this.sampleRate = 48_000;
    this.currentTime = 0;
    this.destination = { kind: 'destination' };
    /** @type {FakeNode[]} */
    this.created = [];
    /** @type {Set<FakeBufferSource>} */
    this.pendingMarkers = new Set();
    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
    this.resumeCalls = 0;
    this.suspendCalls = 0;
    this.closeCalls = 0;
    this.resumeShouldStick = true;
  }
  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  removeEventListener(type, listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((entry) => entry !== listener),
    );
  }
  emit(type) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
  createGain() {
    return new FakeGain(this);
  }
  createOscillator() {
    return new FakeOscillator(this);
  }
  createBufferSource() {
    return new FakeBufferSource(this);
  }
  createChannelMerger(channels) {
    const node = new FakeNode(this, 'merger');
    node.channels = channels;
    return node;
  }
  createBuffer(channels, length, sampleRate) {
    return { channels, length, sampleRate };
  }
  async resume() {
    this.resumeCalls += 1;
    if (this.resumeShouldStick) this.state = 'running';
    this.emit('statechange');
  }
  async suspend() {
    this.suspendCalls += 1;
    this.state = 'suspended';
    this.emit('statechange');
  }
  async close() {
    this.closeCalls += 1;
    this.state = 'closed';
    this.emit('statechange');
  }
  /** Advance the audio clock and fire every marker scheduled at or before it. */
  advanceTo(seconds) {
    this.currentTime = seconds;
    for (const marker of [...this.pendingMarkers]) {
      if (marker.startedAt !== null && marker.startedAt <= seconds) {
        this.pendingMarkers.delete(marker);
        marker.fired = true;
        marker.onended?.();
      }
    }
  }
  nodesOfKind(kind) {
    return this.created.filter((node) => node.kind === kind);
  }
}

/** Install a fake AudioContext constructor, run `body`, restore the global. */
async function withAudio(body, { key = 'AudioContext', install = true } = {}) {
  const scope = /** @type {Record<string, unknown>} */ (globalThis);
  const saved = { AudioContext: scope.AudioContext, webkitAudioContext: scope.webkitAudioContext };
  delete scope.AudioContext;
  delete scope.webkitAudioContext;
  /** @type {FakeAudioContext[]} */
  const contexts = [];
  if (install) {
    scope[key] = class extends FakeAudioContext {
      constructor(options) {
        super(options);
        contexts.push(this);
      }
    };
  }
  try {
    return await body(contexts);
  } finally {
    delete scope.AudioContext;
    delete scope.webkitAudioContext;
    if (saved.AudioContext !== undefined) scope.AudioContext = saved.AudioContext;
    if (saved.webkitAudioContext !== undefined) scope.webkitAudioContext = saved.webkitAudioContext;
  }
}

/** Let the `await init()` inside a play call settle before inspecting the graph. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** Resolve `promise` after letting the audio clock run past `endAt`. */
async function settle(context, promise, endAt) {
  context.advanceTo(endAt);
  return promise;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

test('support detection accepts either the standard or the webkit constructor', async () => {
  await withAudio(async () => {
    assert.equal(new HearingAudio(CONFIG).supported, true);
  });
  await withAudio(
    async () => {
      assert.equal(new HearingAudio(CONFIG).supported, true);
    },
    { key: 'webkitAudioContext' },
  );
  await withAudio(
    async () => {
      assert.equal(new HearingAudio(CONFIG).supported, false);
    },
    { install: false },
  );
});

test('init refuses to run without Web Audio and reports a closed engine', async () => {
  await withAudio(
    async () => {
      const audio = new HearingAudio(CONFIG);
      assert.equal(audio.state, 'closed');
      assert.equal(audio.sampleRate, null);
      await assert.rejects(() => audio.init(), /Web Audio is unavailable/);
      assert.throws(() => audio.requireContext(), /Audio context has not been initialized/);
      assert.throws(() => audio.requireMaster(), /Audio output has not been initialized/);
    },
    { install: false },
  );
});

test('init builds the master chain once and resumes a suspended context', async () => {
  await withAudio(async (contexts) => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();

    assert.equal(contexts.length, 1);
    assert.deepEqual(context.options, { latencyHint: 'interactive' });
    assert.equal(context.resumeCalls, 1);
    assert.equal(audio.state, 'running');
    assert.equal(audio.sampleRate, 48_000);
    assert.equal(audio.master.gain.value, CONFIG.masterGain);
    assert.equal(audio.master.connections[0].target, context.destination);

    // A second init must reuse the context rather than build a parallel graph.
    const again = await audio.init();
    assert.equal(again, context);
    assert.equal(contexts.length, 1);
    assert.equal(context.resumeCalls, 1);
  });
});

test('init fails loudly when the context refuses to resume', async () => {
  await withAudio(async (contexts) => {
    const audio = new HearingAudio(CONFIG);
    const scope = /** @type {Record<string, unknown>} */ (globalThis);
    const Original = scope.AudioContext;
    scope.AudioContext = class extends Original {
      constructor(options) {
        super(options);
        this.resumeShouldStick = false;
      }
    };
    await assert.rejects(() => audio.init(), /Audio context is not running/);
    assert.equal(contexts.at(-1).resumeCalls, 1);
    scope.AudioContext = Original;
  });
});

test('init rebuilds after close, so a closed context is never reused', async () => {
  await withAudio(async (contexts) => {
    const audio = new HearingAudio(CONFIG);
    const first = await audio.init();
    await audio.close();
    assert.equal(first.closeCalls, 1);
    assert.equal(audio.context, null);
    assert.equal(audio.master, null);

    const second = await audio.init();
    assert.notEqual(second, first);
    assert.equal(contexts.length, 2);
  });
});

test('a closed-but-retained context is discarded on the next init', async () => {
  await withAudio(async (contexts) => {
    const audio = new HearingAudio(CONFIG);
    const first = await audio.init();
    first.state = 'closed';
    const second = await audio.init();
    assert.notEqual(second, first);
    assert.equal(contexts.length, 2);
  });
});

test('close on an engine that never initialized is a no-op', async () => {
  await withAudio(async (contexts) => {
    const audio = new HearingAudio(CONFIG);
    await audio.close();
    assert.equal(contexts.length, 0);
    assert.equal(audio.state, 'closed');
  });
});

test('close detaches both context listeners and skips closing twice', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    assert.equal(context.listeners.get('statechange').length, 1);
    assert.equal(context.listeners.get('sinkchange').length, 1);

    context.state = 'closed';
    await audio.close();
    assert.equal(context.closeCalls, 0, 'an already closed context must not be closed again');
    assert.equal(context.listeners.get('statechange').length, 0);
    assert.equal(context.listeners.get('sinkchange').length, 0);
  });
});

test('suspend stops playback and only suspends a running context', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    await audio.suspend();
    assert.equal(context.suspendCalls, 1);

    await audio.suspend();
    assert.equal(context.suspendCalls, 1, 'a suspended context must not be suspended again');
  });
});

// ---------------------------------------------------------------------------
// State and output notifications
// ---------------------------------------------------------------------------

test('a non-running state change stops playback and notifies the owner', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    /** @type {string[]} */
    const states = [];
    audio.onStateChange = (state) => states.push(state);
    const context = await audio.init();
    assert.deepEqual(states, ['running']);

    const playing = audio.playReference();
    await flush();
    assert.equal(audio.nodes.size > 0, true);

    context.state = 'interrupted';
    context.emit('statechange');
    assert.deepEqual(states, ['running', 'interrupted']);
    assert.equal(audio.nodes.size, 0, 'a non-running context must release every tracked node');
    assert.equal(await playing, false, 'an interrupted playback resolves as not completed');
  });
});

test('a running state change leaves scheduled playback intact', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playReference();
    await flush();
    const trackedBefore = audio.nodes.size;

    context.emit('statechange');
    assert.equal(audio.nodes.size, trackedBefore, 'a running context must not clear the graph');
    assert.equal(await settle(context, playing, 10), true);
  });
});

test('a sink change is forwarded to the output-change handler', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    let outputChanges = 0;
    audio.onOutputChange = () => {
      outputChanges += 1;
    };
    const context = await audio.init();
    context.emit('sinkchange');
    context.emit('sinkchange');
    assert.equal(outputChanges, 2);
  });
});

test('state and sink changes are safe with no handlers attached', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    context.emit('sinkchange');
    context.state = 'suspended';
    context.emit('statechange');
    assert.equal(audio.state, 'suspended');
  });
});

// ---------------------------------------------------------------------------
// Tone scheduling
// ---------------------------------------------------------------------------

test('the reference tone is a 1 kHz sine at the calibration level with a ramped envelope', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playReference();
    await flush();

    const [oscillator] = context.nodesOfKind('oscillator');
    assert.equal(oscillator.type, 'sine');
    assert.deepEqual(oscillator.frequency.automation, [{ kind: 'set', value: 1000, at: 0.05 }]);
    assert.equal(oscillator.startedAt, 0.05);
    assert.equal(oscillator.stoppedAt, 0.05 + 0.9 + 0.02);

    // Envelope: cancel, floor, ramp up to the reference gain, hold, ramp down.
    const envelope = context.nodesOfKind('gain').find((node) => node.gain.automation.length > 0);
    const rampSeconds = Math.min(0.08, 0.9 / 3);
    assert.deepEqual(envelope.gain.automation, [
      { kind: 'cancel', at: 0.05 },
      { kind: 'set', value: 0.0001, at: 0.05 },
      { kind: 'ramp', value: HEARING_DIGITAL_LEVELS.reference, at: 0.05 + rampSeconds },
      {
        kind: 'set',
        value: HEARING_DIGITAL_LEVELS.reference,
        at: Math.max(0.05 + rampSeconds, 0.05 + 0.9 - rampSeconds),
      },
      { kind: 'ramp', value: 0.0001, at: 0.05 + 0.9 },
    ]);

    assert.equal(await settle(context, playing, 5), true);
  });
});

test('a short reference tone shortens its ramp instead of overlapping itself', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio({ ...CONFIG, referenceMs: 90 });
    const context = await audio.init();
    const playing = audio.playReference();
    await flush();
    const envelope = context.nodesOfKind('gain').find((node) => node.gain.automation.length > 0);
    const rampSeconds = 0.09 / 3;
    assert.ok(rampSeconds < 0.08, 'the third-of-duration ramp must win for short tones');
    assert.equal(envelope.gain.automation[2].at, 0.05 + rampSeconds);
    assert.equal(await settle(context, playing, 5), true);
  });
});

test('each tone is panned into an explicit stereo pair through a channel merger', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playIntervals([{ frequencyHz: 440, gain: 0.2 }]);
    await flush();

    const merger = context.nodesOfKind('merger')[0];
    assert.equal(merger.channels, 2);
    const gains = context.nodesOfKind('gain');
    const left = gains.find((node) =>
      node.connections.some((edge) => edge.input === 0 && edge.target === merger),
    );
    const right = gains.find((node) =>
      node.connections.some((edge) => edge.input === 1 && edge.target === merger),
    );
    assert.equal(left.gain.value, Math.SQRT1_2);
    assert.equal(right.gain.value, Math.SQRT1_2);
    assert.equal(merger.connections[0].target, audio.master);

    assert.equal(await settle(context, playing, 5), true);
  });
});

test('an anti-phase interval inverts only the right channel', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playIntervals([{ frequencyHz: 200, gain: 0.2, antiPhase: true }]);
    await flush();

    const merger = context.nodesOfKind('merger')[0];
    const gains = context.nodesOfKind('gain');
    const left = gains.find((node) =>
      node.connections.some((edge) => edge.input === 0 && edge.target === merger),
    );
    const right = gains.find((node) =>
      node.connections.some((edge) => edge.input === 1 && edge.target === merger),
    );
    assert.equal(left.gain.value, Math.SQRT1_2);
    assert.equal(right.gain.value, -Math.SQRT1_2);

    assert.equal(await settle(context, playing, 5), true);
  });
});

// ---------------------------------------------------------------------------
// Interval timing
// ---------------------------------------------------------------------------

test('intervals are spaced by tone plus gap and report their index in order', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    /** @type {number[]} */
    const seen = [];
    const playing = audio.playIntervals(
      [
        { frequencyHz: 300, gain: 0.1 },
        { frequencyHz: 400, gain: 0.1 },
        { frequencyHz: 500, gain: 0.1 },
      ],
      (index) => seen.push(index),
    );
    await flush();

    const step = CONFIG.toneMs / 1000 + CONFIG.gapMs / 1000;
    const oscillators = context.nodesOfKind('oscillator');
    assert.equal(oscillators.length, 3);
    assert.deepEqual(
      oscillators.map((node) => node.startedAt),
      [0.08, 0.08 + step, 0.08 + 2 * step],
    );
    assert.deepEqual(
      oscillators.map((node) => node.frequency.automation[0].value),
      [300, 400, 500],
    );

    context.advanceTo(0.08);
    assert.deepEqual(seen, [0]);
    context.advanceTo(0.08 + step);
    assert.deepEqual(seen, [0, 1]);

    const endAt = 0.08 + 3 * (CONFIG.toneMs / 1000) + 2 * (CONFIG.gapMs / 1000) + 0.03;
    assert.equal(await settle(context, playing, endAt), true);
    assert.deepEqual(seen, [0, 1, 2]);
  });
});

test('a silent interval still advances the interval marker without scheduling a tone', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    /** @type {number[]} */
    const seen = [];
    const playing = audio.playIntervals([null, { frequencyHz: 900, gain: 0.1 }, null], (index) =>
      seen.push(index),
    );
    await flush();

    assert.equal(context.nodesOfKind('oscillator').length, 1, 'only the sounding interval makes a tone');
    const endAt = 0.08 + 3 * 0.4 + 2 * 0.2 + 0.03;
    assert.equal(await settle(context, playing, endAt), true);
    assert.deepEqual(seen, [0, 1, 2], 'silent intervals must still be announced');
  });
});

test('playback that is superseded resolves false and fires no further interval callbacks', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    /** @type {number[]} */
    const seen = [];
    const first = audio.playIntervals(
      [
        { frequencyHz: 300, gain: 0.1 },
        { frequencyHz: 400, gain: 0.1 },
      ],
      (index) => seen.push(index),
    );
    await flush();

    const second = audio.playIntervals([{ frequencyHz: 800, gain: 0.1 }]);
    await flush();
    assert.equal(await first, false, 'a superseded playback resolves as not completed');

    // Advancing past the superseded schedule must not re-enter its callback.
    context.advanceTo(10);
    assert.deepEqual(seen, []);
    assert.equal(await second, true);
  });
});

test('the completion promise reports false when the clock has not reached the end', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playIntervals([{ frequencyHz: 440, gain: 0.1 }]);
    await flush();

    // Fire the completion marker early, as a suspended-then-resumed context does.
    const marker = [...context.pendingMarkers].at(-1);
    context.currentTime = 0.1;
    context.pendingMarkers.delete(marker);
    marker.onended();
    assert.equal(await playing, false);
  });
});

test('interval callbacks are suppressed while the context is not running', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    /** @type {number[]} */
    const seen = [];
    const playing = audio.playIntervals([{ frequencyHz: 440, gain: 0.1 }], (index) => seen.push(index));
    await flush();

    // Take the context out of `running` without going through `stop()`.
    context.state = 'suspended';
    context.advanceTo(0.08);
    assert.deepEqual(seen, [], 'a non-running context must not drive the trial forward');

    context.state = 'running';
    assert.equal(await settle(context, playing, 5), true);
  });
});

// ---------------------------------------------------------------------------
// Trial shapes
// ---------------------------------------------------------------------------

test('a headphone trial attenuates the quiet interval by 6 dB and inverts the decoy', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playHeadphoneTrial({ quietInterval: 1, antiPhaseInterval: 2 });
    await flush();

    const merger = context.nodesOfKind('merger');
    assert.equal(merger.length, 3);
    const oscillators = context.nodesOfKind('oscillator');
    assert.deepEqual(
      oscillators.map((node) => node.frequency.automation[0].value),
      [200, 200, 200],
    );

    const rampTargets = context
      .nodesOfKind('gain')
      .filter((node) => node.gain.automation.length > 0)
      .map((node) => node.gain.automation[2].value);
    assert.deepEqual(rampTargets, [
      HEARING_DIGITAL_LEVELS.headphones,
      HEARING_DIGITAL_LEVELS.headphones * dbToGain(-6),
      HEARING_DIGITAL_LEVELS.headphones,
    ]);
    assert.ok(rampTargets[1] < rampTargets[0], 'the quiet interval must actually be quieter');

    // Only the anti-phase interval inverts its right channel.
    const inverted = context.nodesOfKind('gain').filter((node) => node.gain.value === -Math.SQRT1_2);
    assert.equal(inverted.length, 1);
    assert.equal(inverted[0].connections[0].target, merger[2]);

    assert.equal(await settle(context, playing, 5), true);
  });
});

test('a headphone trial with no decoy inverts nothing', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playHeadphoneTrial({ quietInterval: 0, antiPhaseInterval: null });
    await flush();
    assert.equal(context.nodesOfKind('gain').filter((node) => node.gain.value === -Math.SQRT1_2).length, 0);
    assert.equal(await settle(context, playing, 5), true);
  });
});

test('a range trial sounds exactly one interval at the adaptive frequency', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playRangeTrial({ toneInterval: 2, frequencyHz: 12_500 });
    await flush();

    const oscillators = context.nodesOfKind('oscillator');
    assert.equal(oscillators.length, 1);
    assert.equal(oscillators[0].frequency.automation[0].value, 12_500);
    // The third interval starts two tone+gap steps after the lead-in.
    assert.equal(oscillators[0].startedAt, 0.08 + 2 * (0.4 + 0.2));

    const envelope = context.nodesOfKind('gain').find((node) => node.gain.automation.length > 0);
    assert.equal(envelope.gain.automation[2].value, HEARING_DIGITAL_LEVELS.range);

    assert.equal(await settle(context, playing, 5), true);
  });
});

test('a pitch trial raises only the target interval by the requested percentage', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playPitchTrial({
      anchorHz: 1000,
      deltaPercent: 8,
      higherInterval: 1,
      roveDb: [0, -2],
    });
    await flush();

    const oscillators = context.nodesOfKind('oscillator');
    assert.equal(oscillators.length, 2);
    assert.deepEqual(
      oscillators.map((node) => node.frequency.automation[0].value),
      [1000, 1080],
    );

    const rampTargets = context
      .nodesOfKind('gain')
      .filter((node) => node.gain.automation.length > 0)
      .map((node) => node.gain.automation[2].value);
    assert.deepEqual(rampTargets, [
      HEARING_DIGITAL_LEVELS.pitchBase * dbToGain(0),
      HEARING_DIGITAL_LEVELS.pitchBase * dbToGain(-2),
    ]);

    assert.equal(await settle(context, playing, 5), true);
  });
});

test('a pitch trial with the higher tone first swaps the frequencies, not the rove', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playPitchTrial({
      anchorHz: 500,
      deltaPercent: 4,
      higherInterval: 0,
      roveDb: [1, -1],
    });
    await flush();
    assert.deepEqual(
      context.nodesOfKind('oscillator').map((node) => node.frequency.automation[0].value),
      [520, 500],
    );
    assert.equal(await settle(context, playing, 5), true);
  });
});

test('the audibility anchors sweep three fixed frequencies at the pitch base level', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playAudibilityAnchors();
    await flush();

    assert.deepEqual(
      context.nodesOfKind('oscillator').map((node) => node.frequency.automation[0].value),
      [200, 500, 2000],
    );
    const rampTargets = context
      .nodesOfKind('gain')
      .filter((node) => node.gain.automation.length > 0)
      .map((node) => node.gain.automation[2].value);
    assert.deepEqual(rampTargets, [
      HEARING_DIGITAL_LEVELS.pitchBase,
      HEARING_DIGITAL_LEVELS.pitchBase,
      HEARING_DIGITAL_LEVELS.pitchBase,
    ]);
    assert.equal(await settle(context, playing, 5), true);
  });
});

// ---------------------------------------------------------------------------
// stop() teardown
// ---------------------------------------------------------------------------

test('stop tears every tracked node down and survives nodes that throw', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    await audio.init();
    audio.playIntervals([{ frequencyHz: 440, gain: 0.1 }]);
    await flush();

    const tracked = [...audio.nodes];
    assert.ok(tracked.length >= 6, 'oscillator, envelope, pan pair, merger, and markers are tracked');

    const hostile = {
      stop() {
        throw new Error('already ended');
      },
      disconnect() {
        throw new Error('already disconnected');
      },
    };
    audio.track(hostile);

    audio.stop();
    assert.equal(audio.nodes.size, 0);
    assert.equal(audio.pendingWaits.size, 0);
    for (const node of tracked) {
      if (node.kind === 'oscillator') {
        // One scheduled stop at the end of the tone, one unconditional teardown.
        assert.deepEqual(node.stopArgs, [0.08 + 0.4 + 0.02, undefined]);
      }
      assert.equal(node.disconnected, true);
    }
  });
});

test('stop invalidates the play token so a stale marker cannot complete a trial', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playIntervals([{ frequencyHz: 440, gain: 0.1 }]);
    await flush();
    const before = audio.playToken;

    audio.stop();
    assert.equal(audio.playToken, before + 1);
    assert.equal(await playing, false);

    // The completion marker is gone; advancing the clock resolves nothing new.
    context.advanceTo(30);
    assert.equal(audio.pendingWaits.size, 0);
  });
});

test('a completion promise settles exactly once', async () => {
  await withAudio(async () => {
    const audio = new HearingAudio(CONFIG);
    const context = await audio.init();
    const playing = audio.playIntervals([{ frequencyHz: 440, gain: 0.1 }]);
    await flush();
    const marker = [...context.pendingMarkers].at(-1);

    assert.equal(await settle(context, playing, 5), true);
    const trackedAfter = audio.nodes.size;

    // A duplicate `onended` (a real browser can deliver one after stop) is inert.
    marker.onended();
    assert.equal(audio.nodes.size, trackedAfter);
    assert.equal(await playing, true);
  });
});
