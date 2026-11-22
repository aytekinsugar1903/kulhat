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
    this.samples = new Map();
    this.place = "open";
    this.stepSide = 1;
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
        this.ambBus = ctx.createGain();
        this.ambBus.gain.value = 0.22;
        this.ambBus.connect(this.out);
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
  hiss(t, dur, peak, { type = "bandpass", f = 1000, q = 1, sweep, attack = 0.003, bus = this.sfxBus, wet = 0, pan = 0 } = {}) {
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
    this.send(this.pan(g, pan), bus, wet);
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

  // Optional stereo placement (-1 left … 1 right).
  pan(node, value) {
    if (!value || !this.context.createStereoPanner) return node;
    const p = this.context.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, value));
    node.connect(p);
    return p;
  }
  // Play a pre-rendered mono buffer through a gain envelope.
  play(buf, t, peak, { bus = this.sfxBus, wet = 0, pan = 0, rate = 1, dur, lp } = {}) {
    if (!buf) return;
    const ctx = this.context,
      src = ctx.createBufferSource(),
      g = ctx.createGain();
    src.buffer = buf;
    if (src.playbackRate) src.playbackRate.value = rate;
    const len = dur ?? (buf.duration || 1) / rate;
    g.gain.setValueAtTime(peak, t);
    g.gain.setValueAtTime(peak, t + Math.max(0.01, len - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    let head = src;
    if (lp) {
      const f = this.filter("lowpass", lp);
      src.connect(f);
      head = f;
    }
    head.connect(g);
    this.send(this.pan(g, pan), bus, wet);
    this.track(src, [t, t + len + 0.02], g);
  }
  // Karplus-Strong plucked string, rendered once per pitch/timbre and cached.
  // bright 0…1 = pick brightness, t60 = seconds to fade by 60 dB.
  string(freq, { bright = 0.6, t60 = 1.2, len = 1.4 } = {}) {
    const key = [Math.round(freq * 10), bright, t60, len].join();
    if (this.samples.has(key)) return this.samples.get(key);
    const ctx = this.context;
    if (!ctx.createBuffer) return null;
    const sr = ctx.sampleRate || 44100,
      n = Math.floor(sr * len),
      buf = ctx.createBuffer(1, n, sr),
      out = buf.getChannelData?.(0);
    if (!out) return null;
    const period = Math.max(2, Math.round(sr / freq)),
      line = new Float32Array(period),
      decay = Math.pow(0.001, 1 / (t60 * freq));
    let seed = Math.round(freq * 977) >>> 0,
      prev = 0;
    for (let i = 0; i < period; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      prev += (0.15 + bright * 0.85) * (noise - prev);
      line[i] = prev;
    }
    let idx = 0,
      peak = 0;
    for (let i = 0; i < n; i++) {
      const cur = line[idx],
        next = line[(idx + 1) % period];
      line[idx] = decay * 0.5 * (cur + next);
      out[i] = cur;
      peak = Math.max(peak, Math.abs(cur));
      idx = (idx + 1) % period;
    }
    const norm = peak > 0 ? 0.8 / peak : 1;
    for (let i = 0; i < n; i++) out[i] *= norm;
    this.samples.set(key, buf);
    return buf;
  }
  // Layered gunshot: sharp crack, chesty body, low thump, dusty tail.
  gunBuffer(kind) {
    const key = "gun:" + kind;
    if (this.samples.has(key)) return this.samples.get(key);
    const ctx = this.context;
    if (!ctx.createBuffer) return null;
    const sr = ctx.sampleRate || 44100,
      n = Math.floor(sr * 0.7),
      buf = ctx.createBuffer(1, n, sr),
      out = buf.getChannelData?.(0);
    if (!out) return null;
    const heavy = kind === "heavy",
      light = kind === "light";
    let seed = heavy ? 71 : light ? 37 : 53,
      body = 0,
      tail = 0,
      peak = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      body += 0.08 * (noise - body);
      tail += 0.025 * (noise - tail);
      const crack = noise * Math.exp(-t / (light ? 0.004 : 0.007)),
        chest = body * 3 * Math.exp(-t / (heavy ? 0.09 : light ? 0.035 : 0.06)),
        thump = Math.sin(2 * Math.PI * (heavy ? 70 : 95) * t * (1 - t * 2)) * Math.exp(-t / (heavy ? 0.08 : 0.05)),
        dust = tail * 2.2 * Math.exp(-t / (light ? 0.12 : 0.22));
      out[i] = crack * 0.9 + chest + thump * (heavy ? 0.9 : 0.6) + dust;
      peak = Math.max(peak, Math.abs(out[i]));
    }
    const norm = peak > 0 ? 0.95 / peak : 1;
    for (let i = 0; i < n; i++) out[i] *= norm;
    this.samples.set(key, buf);
    return buf;
  }

  // ------------------------------------------------------------ instruments
  // Plucked string (guitar / banjo) from the Karplus-Strong cache.
  pluck(t, f, dur, peak, bright = 1, bus = this.musicBus, wet = 0.12, pan = 0) {
    const buf = this.string(f, { bright: Math.min(1, 0.35 + bright * 0.4), t60: Math.max(0.4, dur * 2.5), len: Math.min(2, dur + 0.6) });
    if (buf) this.play(buf, t, peak * 3, { bus, wet, pan, dur: dur + 0.25, lp: 7000 });
  }
  // Upright-bass pluck: dark string plus a little sine weight underneath.
  bassNote(t, f, dur, peak) {
    const buf = this.string(f, { bright: 0.25, t60: 1.6, len: 1.2 });
    if (buf) this.play(buf, t, peak * 2.4, { bus: this.musicBus, dur: dur + 0.2, lp: 900 });
    this.osc("sine", f, t, dur * 0.7, peak * 0.35, { attack: 0.006, bus: this.musicBus });
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
    this.hiss(t, 0.05, peak, { type: "highpass", f: 6500, q: 0.7, bus: this.musicBus, attack: 0.008, pan: 0.4 });
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
    this.startAmbience();
    const tick = () => {
      if (!this.playing || this.muted || !this.context) return;
      this.ambienceTick();
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
      if (s % 2 === 1) this.shaker(t, this.tension ? 0.075 : 0.05);
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
        chord.forEach((n, k) => this.pluck(t + k * 0.014, midi(n), 0.45, 0.07, 1.25, this.musicBus, 0.15, -0.35));
      if (s === 6 || s === 14) this.pluck(t, midi(chord[0] + 12), 0.15, 0.035, 0.5, this.musicBus, 0.1, -0.35);
    } else if (s % 2 === 0) {
      // Banjo-style roll over the chord.
      const roll = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
      this.pluck(t, midi(roll[(s / 2) % 4]), 0.3, 0.075, 1.6, this.musicBus, 0.12, 0.35);
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
  // Background bed under the music: desert wind outdoors, rumble and drips in the mine.
  setPlace(place) {
    if (place === this.place) return;
    this.place = place;
    if (this.ambFilter && this.context) {
      const t = this.now,
        mine = place === "mine";
      this.ambFilter.type = mine ? "lowpass" : "bandpass";
      this.ambFilter.frequency.setTargetAtTime?.(mine ? 220 : 650, t, 0.4);
    }
  }
  startAmbience() {
    if (this.ambSource || !this.noise) return;
    const ctx = this.context,
      src = ctx.createBufferSource(),
      flt = this.filter(this.place === "mine" ? "lowpass" : "bandpass", this.place === "mine" ? 220 : 650, 0.6),
      g = ctx.createGain();
    src.buffer = this.noise;
    src.loop = true;
    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, this.now);
    g.gain.linearRampToValueAtTime(0.5, this.now + 1.5);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.ambBus);
    this.ambSource = src;
    this.ambFilter = flt;
    this.ambGain = g;
    this.nextGust = this.now + 1;
    this.voices.add(src);
    src.onended = () => {
      this.voices.delete(src);
      try {
        src.disconnect();
        flt.disconnect();
        g.disconnect();
      } catch {}
    };
    src.start(this.now);
  }
  ambienceTick() {
    if (!this.ambGain) return;
    const t = this.now;
    if (t < this.nextGust) return;
    const mine = this.place === "mine";
    // Wind gusts swell and fall; the mine gets a steadier rumble and the odd drip.
    const level = mine ? 0.35 + Math.random() * 0.2 : 0.25 + Math.random() * 0.75,
      span = 1.2 + Math.random() * 2.5;
    this.ambGain.gain.linearRampToValueAtTime(level, t + span);
    if (mine && Math.random() < 0.7) {
      const at = t + Math.random() * span,
        f = 1400 + Math.random() * 900;
      this.osc("sine", f, at, 0.09, 0.05, { to: f * 0.6, glide: 0.07, bus: this.ambBus, wet: 0.9 });
    }
    this.nextGust = t + span;
  }
  stop() {
    this.playing = false;
    this.ambSource = this.ambFilter = this.ambGain = null;
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
    this.stepSide = -this.stepSide;
    const pan = this.stepSide * 0.12;
    if (surface === "wood") {
      this.hiss(t, 0.03, 0.1, { f: 420 + Math.random() * 80, q: 6, pan });
      this.thud(t, 95, 50, 0.07, 0.11);
    } else {
      // Boot on packed dirt: a soft crunch with a little grit on top.
      this.hiss(t, 0.06, 0.07, { type: "bandpass", f: 600 + Math.random() * 250, q: 1.1, pan });
      this.hiss(t + 0.01, 0.04, 0.025, { type: "highpass", f: 3500, pan });
      this.thud(t, 75, 45, 0.05, 0.09);
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
    this.osc("triangle", base, t, 0.07, 0.14);
    // Second hit rings with inharmonic partials, like a real coin.
    for (const [m, a] of [[1.5, 0.12], [3.76, 0.035], [5.4, 0.02]])
      this.osc("sine", base * m, t + 0.055, 0.3, a, { wet: 0.15 });
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
    const kind = weapon === "storm" ? "heavy" : weapon === "repeater" || weapon === "burst" ? "light" : "normal";
    // Small random pitch keeps rapid fire from sounding like one sample on repeat.
    this.play(this.gunBuffer(kind), t, kind === "light" ? 0.5 : 0.65, {
      wet: 0.45,
      rate: 0.93 + Math.random() * 0.14,
    });
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
  // Low double thump while on the last heart.
  fx_heartbeat(t) {
    this.thud(t, 70, 40, 0.12, 0.22);
    this.thud(t + 0.18, 62, 38, 0.14, 0.16);
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
