import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "../dist/audio.js";
function mockHost() {
  const state = {
    frequencies: [],
    starts: 0,
    stops: 0,
    timers: new Map(),
    id: 0,
  };
  const param = {
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
  class AudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
    }
    createGain() {
      return { gain: { ...param }, connect() {}, disconnect() {} };
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime: (f) => state.frequencies.push(f) },
        connect() {},
        disconnect() {},
        start() {
          state.starts++;
        },
        stop() {
          state.stops++;
        },
      };
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
test("original music differs by map; re-entry never stacks timers; stop suspends all voices", () => {
  const host = mockHost(),
    audio = new GameAudio(host);
  audio.start("western");
  const western = host.state.frequencies[0];
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
  assert.notEqual(host.state.frequencies[0], western);
  audio.setMuted(true);
  const starts = host.state.starts;
  audio.effect(430);
  audio.start("western");
  assert.equal(host.state.starts, starts);
  assert.equal(host.state.timers.size, 0);
  audio.setMuted(false);
  audio.start("trail");
  assert.equal(host.state.timers.size, 1);
});
test("unsupported audio devices fail silently without remote fallbacks", () => {
  const audio = new GameAudio({});
  assert.doesNotThrow(() => {
    audio.effect(430);
    audio.start("western");
    audio.stop();
    audio.setMuted(true);
  });
});
