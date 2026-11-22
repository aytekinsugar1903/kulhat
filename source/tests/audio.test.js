import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "../dist/audio.js";

// Minimal Web Audio stand-in: records oscillator frequencies and node starts/stops.
function mockHost() {
  const state = { frequencies: [], starts: 0, stops: 0, timers: new Map(), id: 0, buffers: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
  const source = (extra = {}) =>
    node({
      start() {
        state.starts++;
      },
      stop() {
        state.stops++;
      },
      ...extra,
    });
  class AudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.state = "running";
      this.destination = {};
    }
    createGain() {
      return node({ gain: param() });
    }
    createOscillator() {
      const frequency = param();
      frequency.setValueAtTime = (f) => state.frequencies.push(f);
      return source({ frequency, type: "sine" });
    }
    createBiquadFilter() {
      return node({ frequency: param(), Q: param(), type: "lowpass" });
    }
    createBufferSource() {
      return source({ buffer: null });
    }
    createBuffer(channels, length) {
      state.buffers++;
      const data = [...Array(channels)].map(() => new Float32Array(length));
      return { getChannelData: (c) => data[c] };
    }
    createConvolver() {
      return node({ buffer: null });
    }
    createDynamicsCompressor() {
      return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
  }
  return {
    state,
    AudioContext,
    setInterval(fn) {
      const id = ++state.id;
      state.timers.set(id, fn);
      return id;
    },
    clearInterval: (id) => state.timers.delete(id),
  };
}

test("each map has its own music; re-entry never stacks timers; stop silences every voice", () => {
  const host = mockHost(),
    audio = new GameAudio(host);
  audio.start("western");
  const western = host.state.frequencies.slice(0, 12).join();
  assert.equal(host.state.timers.size, 1);
  assert(audio.voices.size > 0);
  audio.start("western");
  assert.equal(host.state.timers.size, 1);
  const voices = audio.voices.size;
  audio.stop();
  assert.equal(host.state.timers.size, 0);
  assert.equal(audio.context.state, "suspended");
  assert.equal(audio.voices.size, 0);
  assert(host.state.stops >= voices);
  host.state.frequencies = [];
  audio.start("trail");
  assert.notEqual(host.state.frequencies.slice(0, 12).join(), western);
  audio.setMuted(true);
  const starts = host.state.starts;
  audio.effect(430);
  audio.sfx("coin");
  audio.start("western");
  assert.equal(host.state.starts, starts);
  assert.equal(host.state.timers.size, 0);
  audio.setMuted(false);
  audio.start("trail");
  assert.equal(host.state.timers.size, 1);
});

test("a full song loop schedules bass, accompaniment, lead and percussion", () => {
  for (const map of ["western", "trail"]) {
    const host = mockHost(),
      audio = new GameAudio(host);
    audio.unlock();
    audio.map = map;
    for (let i = 0; i < 16 * 8; i++) audio.scheduleStep(i, i * 0.15);
    const f = host.state.frequencies;
    assert(f.some((x) => x < 120), map + ": bass register");
    assert(f.some((x) => x > 500 && x < 1500), map + ": lead register");
    assert(host.state.starts > 250, map + ": dense enough to be music");
    audio.stop();
  }
});

test("tension adds drums without changing the song", () => {
  const count = (tension) => {
    const host = mockHost(),
      audio = new GameAudio(host);
    audio.unlock();
    audio.setTension(tension);
    for (let i = 0; i < 64; i++) audio.scheduleStep(i, i * 0.15);
    return host.state.starts;
  };
  assert(count(true) > count(false));
});

test("every named effect plays, unknown names are ignored, effects wake a suspended context", async () => {
  const names = [
    "jump", "land", "step", "slide", "coin", "gem", "power", "shield", "repair", "fire", "reload",
    "spark", "explode", "damage", "blocked", "bump", "fall", "warning", "rumble", "route", "ui",
    "buy", "reward", "success", "fail", "record",
  ];
  const host = mockHost(),
    audio = new GameAudio(host);
  audio.unlock();
  for (const name of names) {
    const before = host.state.starts;
    audio.sfx(name, { weapon: "storm", surface: "wood" });
    assert(host.state.starts > before, name);
  }
  for (const weapon of ["sidearm", "burst", "ion", "rail", "repeater", "storm"]) {
    const before = host.state.starts;
    audio.sfx("fire", { weapon });
    assert(host.state.starts > before, weapon);
  }
  const before = host.state.starts;
  audio.sfx("no-such-effect");
  assert.equal(host.state.starts, before);
  audio.stop();
  audio.sfx("ui");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(audio.context.state, "running");
  assert(host.state.starts > before);
});

test("coin streaks climb in pitch", () => {
  const host = mockHost(),
    audio = new GameAudio(host);
  audio.unlock();
  const first = () => host.state.frequencies[host.state.frequencies.length - 3];
  audio.sfx("coin");
  const a = first();
  audio.sfx("coin");
  const b = first();
  assert(b > a);
});

test("unsupported audio devices fail silently without remote fallbacks", () => {
  const audio = new GameAudio({});
  assert.doesNotThrow(() => {
    audio.effect(430);
    audio.sfx("coin");
    audio.start("western");
    audio.stop();
    audio.setMuted(true);
  });
});
