// KÜLHAT audio: original procedural music and sound effects, synthesised with
// Web Audio at run time. No recordings, samples or network requests.
//
// Signal path:  voices → music / sfx bus → (reverb send) → compressor → master → out
//
// Music is a small step sequencer (16th-note grid, look-ahead scheduling):
//   western  A minor, 96 BPM: gallop percussion, plucked guitar, bass, whistled lead
//   trail    D dorian, 84 BPM: banjo-style arpeggio, train-beat brushes, harmonica lead
// setTension(true) adds toms and a busier shaker while the hunter is close.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const SONGS = {
  western: {
    bpm: 96,
    // Andalusian cadence: Am G F E
    chords: [
      [57, 60, 64],
      [55, 59, 62],
      [53, 57, 60],
      [52, 56, 59],
    ],
    bass: [45, 43, 41, 40],
    // [bar, step, midi, length in 16ths]; two 4-bar phrases.
    lead: [
      [0, 0, 76, 6], [0, 6, 74, 2], [0, 8, 72, 4], [0, 12, 69, 4],
      [1, 0, 74, 6], [1, 6, 71, 2], [1, 8, 67, 8],
      [2, 0, 72, 4], [2, 4, 69, 4], [2, 8, 69, 2], [2, 10, 72, 2], [2, 12, 74, 4],
      [3, 0, 76, 12],
      [4, 0, 81, 6], [4, 6, 79, 2], [4, 8, 76, 4], [4, 12, 72, 4],
      [5, 0, 74, 4], [5, 4, 76, 2], [5, 6, 74, 2], [5, 8, 71, 8],
      [6, 0, 72, 3], [6, 3, 74, 3], [6, 6, 76, 2], [6, 8, 77, 4], [6, 12, 76, 4],
      [7, 0, 76, 4], [7, 4, 75, 2], [7, 6, 76, 10],
    ],
    leadVoice: "whistle",
  },
  trail: {
    bpm: 84,
    // Dm C G Dm (dorian colour from the major IV)
    chords: [
      [62, 65, 69],
      [60, 64, 67],
      [55, 59, 62],
      [62, 65, 69],
    ],
    bass: [38, 36, 43, 38],
    lead: [
      [0, 0, 74, 4], [0, 4, 77, 4], [0, 8, 76, 2], [0, 10, 74, 2], [0, 12, 72, 4],
      [1, 0, 72, 6], [1, 6, 71, 2], [1, 8, 67, 8],
      [2, 0, 71, 4], [2, 4, 74, 4], [2, 8, 79, 6], [2, 14, 77, 2],
      [3, 0, 74, 12],
      [4, 0, 81, 4], [4, 4, 79, 2], [4, 6, 77, 2], [4, 8, 76, 4], [4, 12, 74, 4],
      [5, 0, 76, 4], [5, 4, 72, 4], [5, 8, 71, 4], [5, 12, 72, 4],
      [6, 0, 74, 4], [6, 4, 71, 4], [6, 8, 67, 4], [6, 12, 71, 4],
      [7, 0, 74, 14],
    ],
    leadVoice: "harmonica",
  },
};

export class GameAudio {
  constructor(host) {
    this.host = host;
    this.muted = false;
    this.playing = false;
    this.tension = false;
    this.map = "western";
    this.step = 0;
    this.voices = new Set();
    this.coinStreak = 0;
    this.lastCoin = -1;
  }

  // ------------------------------------------------------------------ setup
  unlock() {
    if (this.muted) return false;
    try {
      if (!this.context) {
        const Ctx = this.host.AudioContext || this.host.webkitAudioContext;
        if (!Ctx) return false;
        const ctx = (this.context = new Ctx());
        this.master = ctx.createGain();
        this.master.gain.value = 1;
        this.comp = ctx.createDynamicsCompressor?.();
        if (this.comp) {
          this.comp.threshold.value = -16;
          this.comp.knee.value = 10;
          this.comp.ratio.value = 4;
          this.comp.attack.value = 0.004;
          this.comp.release.value = 0.2;
          this.comp.connect(this.master);
        }
        this.out = this.comp || this.master;
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0.34;
        this.musicBus.connect(this.out);
        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = 0.8;
        this.sfxBus.connect(this.out);
        this.noise = this.makeNoise();
        this.reverb = this.makeReverb();
      }
      if (!this.connected) {
        this.master.connect(this.context.destination);
        this.connected = true;
      }
      this.context.resume?.()?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }
  makeNoise() {
    const ctx = this.context;
    if (!ctx.createBuffer) return null;
    const len = Math.floor((ctx.sampleRate || 44100) * 1.5),
      buf = ctx.createBuffer(1, len, ctx.sampleRate || 44100),
      data = buf.getChannelData?.(0);
    if (data) {
      let seed = 1234567;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = seed / 2147483648 - 1;
      }
    }
    return buf;
  }
  // Short synthetic room / canyon: decaying stereo noise impulse.
  makeReverb() {
    const ctx = this.context;
    if (!ctx.createConvolver || !ctx.createBuffer) return null;
    const rate = ctx.sampleRate || 44100,
      len = Math.floor(rate * 1.9),
      buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData?.(ch);
      if (!d) continue;
      let seed = 99 + ch * 7919;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const t = i / len;
        d[i] = (seed / 2147483648 - 1) * Math.pow(1 - t, 3.2) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    const conv = ctx.createConvolver(),
      ret = ctx.createGain();
    conv.buffer = buf;
    ret.gain.value = 0.32;
    conv.connect(ret);
    ret.connect(this.out);
    return conv;
  }
  get ready() {
    return !this.muted && this.context && this.context.state !== "suspended";
  }
  get now() {
    return this.context.currentTime;
  }

  // ------------------------------------------------------------- primitives
  track(node, stopAt, ...chain) {
    this.voices.add(node);
    node.onended = () => {
      this.voices.delete(node);
      try {
        node.disconnect();
        for (const n of chain) n.disconnect();
      } catch {}
    };
    node.start(Math.max(0, stopAt[0]));
    node.stop(stopAt[1]);
  }
  env(gain, t, attack, peak, decay, sustain = 0.0001) {
    const g = gain.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + attack + decay);
  }
  filter(type, freq, q = 0.7) {
    const f = this.context.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }
  // Route a node to a bus, optionally with a reverb send.
  send(node, bus, wet = 0) {
    node.connect(bus);
    if (wet > 0 && this.reverb) {
      const s = this.context.createGain();
      s.gain.value = wet;
      node.connect(s);
      s.connect(this.reverb);
    }
  }
  osc(type, freq, t, dur, peak, { attack = 0.005, bus = this.sfxBus, wet = 0, to, glide, lp } = {}) {
    const ctx = this.context,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + (glide ?? dur));
    this.env(g, t, attack, peak, dur);
    let head = o;
    if (lp) {
      const f = this.filter("lowpass", lp);
      o.connect(f);
      head = f;
    }
    head.connect(g);
    this.send(g, bus, wet);
    this.track(o, [t, t + attack + dur + 0.05], g);
    return o;
  }
  // Filtered noise burst; `sweep` moves the filter from f to sweep.
  hiss(t, dur, peak, { type = "bandpass", f = 1000, q = 1, sweep, attack = 0.003, bus = this.sfxBus, wet = 0 } = {}) {
    if (!this.noise) return;
    const ctx = this.context,
      src = ctx.createBufferSource(),
      flt = this.filter(type, f, q),
      g = ctx.createGain();
    src.buffer = this.noise;
    if (sweep) flt.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), t + dur);
    this.env(g, t, attack, peak, dur);
    src.connect(flt);
    flt.connect(g);
    this.send(g, bus, wet);
    const offset = ((this.step * 0.137) % 1) * 0.5;
    this.voices.add(src);
    src.onended = () => {
      this.voices.delete(src);
      try {
        src.disconnect();
        flt.disconnect();
        g.disconnect();
      } catch {}
    };
    src.start(t, offset);
    src.stop(t + attack + dur + 0.05);
  }
  thud(t, from, to, dur, peak, bus = this.sfxBus) {
    this.osc("sine", from, t, dur, peak, { attack: 0.002, to, glide: dur * 0.7, bus });
  }

  // ------------------------------------------------------------ instruments
  pluck(t, f, dur, peak, bright = 1, bus = this.musicBus, wet = 0.12) {
    const ctx = this.context,
      o = ctx.createOscillator(),
      o2 = ctx.createOscillator(),
      flt = this.filter("lowpass", Math.min(12000, f * 9 * bright), 1.2),
      g = ctx.createGain();
    o.type = "sawtooth";
    o2.type = "triangle";
    o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f * 1.003, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + dur * 0.5);
    this.env(g, t, 0.003, peak, dur);
    o.connect(flt);
    o2.connect(flt);
    flt.connect(g);
    this.send(g, bus, wet);
    this.track(o, [t, t + dur + 0.05], flt, g);
    this.track(o2, [t, t + dur + 0.05]);
  }
  bassNote(t, f, dur, peak) {
    this.osc("triangle", f, t, dur, peak, { attack: 0.006, bus: this.musicBus, lp: 500 });
    this.osc("sine", f / 2, t, dur * 0.8, peak * 0.6, { attack: 0.006, bus: this.musicBus });
  }
  // Whistled lead: sine with a pitch scoop, delayed vibrato and breath.
  whistle(t, f, dur, peak) {
    const ctx = this.context,
      o = ctx.createOscillator(),
      g = ctx.createGain(),
      lfo = ctx.createOscillator(),
      depth = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    lfo.frequency.value = 5.6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.35, dur * 0.6));
    lfo.connect(depth);
    depth.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.05);
    g.gain.setValueAtTime(peak * 0.85, t + Math.max(0.06, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    o.connect(g);
    this.send(g, this.musicBus, 0.5);
    this.track(o, [t, t + dur + 0.1], g);
    this.track(lfo, [t, t + dur + 0.1], depth);
    this.hiss(t, dur * 0.8, peak * 0.05, { f: f * 2, q: 6, bus: this.musicBus, attack: 0.04 });
  }
  // Harmonica-like reed: bandpassed saw with vibrato.
  harmonica(t, f, dur, peak) {
    const ctx = this.context,
      o = ctx.createOscillator(),
      bp = this.filter("bandpass", f * 2.2, 1.4),
      lp = this.filter("lowpass", 3200),
      g = ctx.createGain(),
      lfo = ctx.createOscillator(),
      depth = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f, t);
    lfo.frequency.value = 6.2;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.01, t + 0.25);
    lfo.connect(depth);
    depth.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.04);
    g.gain.setValueAtTime(peak * 0.8, t + Math.max(0.05, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    this.send(g, this.musicBus, 0.35);
    this.track(o, [t, t + dur + 0.1], bp, lp, g);
    this.track(lfo, [t, t + dur + 0.1], depth);
  }
  woodblock(t, f, peak, bus = this.musicBus) {
    this.hiss(t, 0.035, peak, { f, q: 9, bus });
    this.osc("sine", f * 0.5, t, 0.05, peak * 0.6, { attack: 0.001, bus });
  }
  shaker(t, peak) {
    this.hiss(t, 0.05, peak, { type: "highpass", f: 6500, q: 0.7, bus: this.musicBus, attack: 0.008 });
  }
  kick(t, peak) {
    this.thud(t, 130, 42, 0.22, peak, this.musicBus);
  }
  tom(t, f, peak) {
    this.thud(t, f * 1.6, f, 0.25, peak, this.musicBus);
  }

  // ------------------------------------------------------------------ music
  start(map) {
    this.map = SONGS[map] ? map : "western";
    if (!this.unlock()) return;
    this.playing = true;
    if (this.timer) return;
    this.step = 0;
    this.next = this.now + 0.06;
    const tick = () => {
      if (!this.playing || this.muted || !this.context) return;
      while (this.next < this.now + 0.14) {
        this.scheduleStep(this.step, this.next);
        this.step++;
        this.next += 60 / SONGS[this.map].bpm / 4;
      }
    };
    tick();
    this.timer = this.host.setInterval(tick, 25);
  }
  scheduleStep(i, t) {
    const song = SONGS[this.map],
      western = this.map === "western",
      s = i % 16,
      bar = Math.floor(i / 16),
      chord = song.chords[bar % 4],
      loop = Math.floor(bar / 8);
    // Percussion
    if (western) {
      // Gallop: ta-ka-TUM on each half bar.
      if (s % 8 === 0) this.woodblock(t, 900, 0.16);
      if (s % 8 === 3) this.woodblock(t, 1300, 0.1);
      if (s % 8 === 4) this.woodblock(t, 1100, 0.13);
      if (s % 2 === 1) this.shaker(t, this.tension ? 0.06 : 0.035);
      if (s === 0 || s === 8) this.kick(t, 0.32);
    } else {
      // Train beat: brushed 8ths with an accent on 2 and 4.
      if (s % 2 === 0) this.hiss(t, s % 8 === 4 ? 0.09 : 0.05, s % 8 === 4 ? 0.09 : 0.045, { type: "highpass", f: 3500, bus: this.musicBus, attack: 0.01 });
      if (s === 0 || s === 10) this.kick(t, 0.3);
    }
    if (this.tension && (s === 4 || s === 12 || s === 14)) this.tom(t, s === 14 ? 110 : 85, 0.22);
    // Bass: root on 1, fifth on 3, passing note into the next bar.
    const root = song.bass[bar % 4];
    if (s === 0) this.bassNote(t, midi(root), 0.45, 0.3);
    if (s === 8) this.bassNote(t, midi(root + 7), 0.35, 0.24);
    if (s === 14 && western) this.bassNote(t, midi(song.bass[(bar + 1) % 4] + (bar % 2 ? 2 : -1)), 0.15, 0.16);
    // Accompaniment
    if (western) {
      // Off-beat strums with a light gallop between them.
      if (s === 4 || s === 12)
        chord.forEach((n, k) => this.pluck(t + k * 0.012, midi(n), 0.32, 0.075, 1));
      if (s === 6 || s === 14) this.pluck(t, midi(chord[0] + 12), 0.12, 0.04, 0.6);
    } else if (s % 2 === 0) {
      // Banjo-style roll over the chord.
      const roll = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
      this.pluck(t, midi(roll[(s / 2) % 4]), 0.26, 0.085, 1.6);
    }
    // Lead: rests every third loop so the groove can breathe.
    if (loop % 3 !== 2)
      for (const [b, st, n, len] of song.lead)
        if (b === bar % 8 && st === s) {
          const dur = (len * 60) / song.bpm / 4;
          if (song.leadVoice === "whistle") this.whistle(t, midi(n), dur, 0.13);
          else this.harmonica(t, midi(n - 12), dur, 0.16);
        }
  }
  setTension(on) {
    this.tension = !!on;
  }
  stop() {
    this.playing = false;
    if (this.timer) this.host.clearInterval(this.timer);
    this.timer = null;
    for (const v of this.voices) {
      try {
        v.stop();
      } catch {}
    }
    this.voices.clear();
    this.context?.suspend?.()?.catch?.(() => {});
  }
  setMuted(value) {
    this.muted = value;
    if (value) this.stop();
  }

  // ---------------------------------------------------------------- effects
  // Legacy tone entry point (kept for simple UI cues).
  effect(f, d = 0.1, type = "sine") {
    if (!this.unlock() || !this.ready) return;
    this.osc(type === "sine" ? "triangle" : type, f, this.now, d, 0.12, { lp: 3000 });
  }
  // Named effects. `opt` may carry {weapon, surface, value}.
  sfx(name, opt = {}) {
    const fn = this["fx_" + name];
    if (!fn || !this.unlock()) return;
    const play = () => {
      if (!this.ready) return;
      try {
        fn.call(this, this.now + 0.005, opt);
      } catch {}
    };
    // After stop() the context is suspended; menu and result sounds wake it.
    if (this.context.state === "suspended" && this.context.resume)
      Promise.resolve(this.context.resume()).then(play, () => {});
    else play();
  }
  fx_jump(t) {
    this.hiss(t, 0.2, 0.22, { f: 500, sweep: 1800, q: 1.4 });
    this.osc("triangle", 260, t, 0.12, 0.08, { to: 520, lp: 2000 });
  }
  fx_land(t, { surface } = {}) {
    this.thud(t, 110, 45, 0.16, 0.5);
    this.hiss(t, 0.09, 0.18, { type: "lowpass", f: 900 });
    if (surface === "wood") this.woodblock(t, 420, 0.3, this.sfxBus);
  }
  fx_step(t, { surface } = {}) {
    if (surface === "wood") {
      this.woodblock(t, 380 + Math.random() * 60, 0.14, this.sfxBus);
      this.thud(t, 90, 50, 0.06, 0.12);
    } else {
      this.hiss(t, 0.05, 0.1, { type: "bandpass", f: 700 + Math.random() * 300, q: 0.9 });
      this.thud(t, 80, 45, 0.05, 0.12);
    }
  }
  fx_slide(t) {
    this.hiss(t, 0.5, 0.3, { f: 1400, sweep: 350, q: 0.8, attack: 0.02 });
    this.hiss(t, 0.35, 0.12, { type: "lowpass", f: 400 });
  }
  fx_coin(t) {
    // Streaks climb in pitch so a coin line sounds like a run, not a beep.
    const now = this.now;
    this.coinStreak = now - this.lastCoin < 0.45 ? Math.min(8, this.coinStreak + 1) : 0;
    this.lastCoin = now;
    const base = midi(88 + [0, 2, 4, 5, 7, 9, 11, 12, 14][this.coinStreak]);
    this.osc("triangle", base, t, 0.07, 0.16);
    this.osc("triangle", base * 1.5, t + 0.055, 0.22, 0.13);
    this.osc("sine", base * 4, t + 0.055, 0.12, 0.04);
  }
  fx_gem(t) {
    [84, 88, 91, 96].forEach((n, k) => {
      const f = midi(n),
        at = t + k * 0.06;
      this.osc("sine", f, at, 0.7, 0.12, { wet: 0.4 });
      this.osc("sine", f * 2.76, at, 0.35, 0.04, { wet: 0.4 });
    });
  }
  fx_power(t) {
    [60, 64, 67, 72, 76].forEach((n, k) =>
      this.osc("square", midi(n), t + k * 0.055, 0.12, 0.06, { lp: 2400, wet: 0.2 }),
    );
  }
  fx_shield(t) {
    this.osc("sine", 520, t, 0.6, 0.1, { to: 1040, glide: 0.4, wet: 0.5 });
    this.osc("sine", 526, t, 0.6, 0.08, { to: 1050, glide: 0.4, wet: 0.5 });
    this.hiss(t, 0.5, 0.05, { f: 5000, sweep: 9000, q: 2, wet: 0.4 });
  }
  fx_repair(t) {
    [69, 73, 76].forEach((n) => this.osc("triangle", midi(n), t, 0.6, 0.08, { wet: 0.4, lp: 3000 }));
  }
  fx_fire(t, { weapon } = {}) {
    if (weapon === "ion") {
      this.osc("sawtooth", 1600, t, 0.18, 0.12, { to: 180, lp: 4000, wet: 0.2 });
      this.hiss(t, 0.08, 0.15, { f: 3000, q: 3 });
      return;
    }
    if (weapon === "rail") {
      this.hiss(t, 0.06, 0.5, { type: "highpass", f: 1500, attack: 0.001 });
      this.osc("sawtooth", 2400, t, 0.3, 0.07, { to: 600, lp: 5000, wet: 0.3 });
      this.thud(t, 140, 50, 0.12, 0.4);
      return;
    }
    const heavy = weapon === "storm",
      light = weapon === "repeater" || weapon === "burst";
    // Revolver crack: sharp noise transient, body thump and a canyon tail.
    this.hiss(t, light ? 0.06 : 0.1, light ? 0.45 : 0.6, { type: "bandpass", f: heavy ? 1200 : 1900, q: 0.6, attack: 0.001, wet: 0.35 });
    this.hiss(t, 0.03, 0.4, { type: "highpass", f: 3500, attack: 0.0005 });
    this.thud(t, heavy ? 170 : 150, 55, heavy ? 0.14 : 0.08, heavy ? 0.5 : 0.35);
  }
  fx_reload(t) {
    this.woodblock(t, 2400, 0.12, this.sfxBus);
    this.woodblock(t + 0.12, 1800, 0.14, this.sfxBus);
    this.woodblock(t + 0.32, 2600, 0.12, this.sfxBus);
  }
  fx_spark(t) {
    this.osc("sine", 2200 + Math.random() * 600, t, 0.08, 0.06);
    this.hiss(t, 0.03, 0.12, { type: "highpass", f: 4000 });
  }
  fx_explode(t) {
    this.hiss(t, 1.1, 0.7, { type: "lowpass", f: 3200, sweep: 160, q: 0.8, attack: 0.002, wet: 0.5 });
    this.thud(t, 90, 28, 0.6, 0.7);
    this.woodblock(t + 0.02, 600, 0.15, this.sfxBus);
  }
  fx_damage(t) {
    this.hiss(t, 0.22, 0.5, { type: "lowpass", f: 1400, sweep: 300, attack: 0.001 });
    this.thud(t, 140, 40, 0.25, 0.6);
    this.osc("square", 320, t + 0.02, 0.2, 0.06, { to: 110, lp: 1200 });
  }
  fx_blocked(t) {
    [1, 2.4, 3.9].forEach((m, k) => this.osc("sine", 620 * m, t, 0.5 - k * 0.1, 0.1 - k * 0.025, { wet: 0.4 }));
    this.hiss(t, 0.05, 0.2, { type: "highpass", f: 3000 });
  }
  fx_bump(t) {
    this.woodblock(t, 300, 0.35, this.sfxBus);
    this.thud(t, 100, 50, 0.12, 0.4);
  }
  fx_fall(t) {
    this.osc("sine", 900, t, 0.42, 0.1, { to: 160, glide: 0.4 });
    this.thud(t + 0.32, 90, 35, 0.3, 0.6);
    this.hiss(t + 0.32, 0.3, 0.3, { type: "lowpass", f: 700 });
  }
  fx_warning(t) {
    this.woodblock(t, 1500, 0.1, this.sfxBus);
    this.woodblock(t + 0.1, 1500, 0.08, this.sfxBus);
  }
  fx_rumble(t) {
    this.hiss(t, 0.9, 0.16, { type: "lowpass", f: 220, attack: 0.25 });
    this.thud(t, 55, 40, 0.8, 0.15);
  }
  fx_route(t) {
    this.hiss(t, 0.7, 0.22, { f: 300, sweep: 2400, q: 0.9, attack: 0.1, wet: 0.3 });
  }
  fx_ui(t) {
    this.woodblock(t, 1700, 0.18, this.sfxBus);
  }
  fx_buy(t) {
    [0, 0.07, 0.14].forEach((d, k) => this.osc("triangle", midi(84 + k * 4), t + d, 0.15, 0.12));
    this.hiss(t + 0.14, 0.2, 0.08, { type: "highpass", f: 6000 });
  }
  fx_reward(t) {
    [72, 76, 79, 84].forEach((n, k) => this.osc("triangle", midi(n), t + k * 0.08, 0.35, 0.1, { wet: 0.3 }));
  }
  fx_success(t) {
    // Brass-ish fanfare: filtered saws on an A major arpeggio and final chord.
    const brass = (n, at, dur, peak) =>
      this.osc("sawtooth", midi(n), at, dur, peak, { attack: 0.03, lp: 2200, wet: 0.35 });
    [57, 61, 64].forEach((n, k) => brass(n + 12, t + k * 0.13, 0.18, 0.09));
    [57, 61, 64, 69].forEach((n) => brass(n + 12, t + 0.42, 1.1, 0.07));
    this.hiss(t + 0.42, 1.2, 0.06, { type: "highpass", f: 7000, attack: 0.01, wet: 0.4 });
    this.kick(t + 0.42, 0.4);
  }
  fx_fail(t) {
    [64, 60, 57, 52].forEach((n, k) => this.pluck(t + k * 0.2, midi(n), 0.6, 0.12, 0.8, this.sfxBus, 0.3));
  }
  fx_record(t) {
    this.fx_success(t);
    [81, 85, 88, 93].forEach((n, k) => this.osc("triangle", midi(n), t + 0.7 + k * 0.07, 0.5, 0.07, { wet: 0.4 }));
  }
}
