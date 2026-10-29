// Original procedural short loops and effects; no recordings or external assets.
export class GameAudio {
  constructor(host) {
    this.host = host;
    this.muted = false;
    this.playing = false;
    this.map = "western";
    this.step = 0;
    this.voices = new Set();
  }
  unlock() {
    if (this.muted) return false;
    try {
      this.context ??= new (this.host.AudioContext ||
        this.host.webkitAudioContext)();
      this.master ??= this.context.createGain();
      this.master.gain.value = 0.55;
      if (!this.connected) {
        this.master.connect(this.context.destination);
        this.connected = true;
      }
      this.context.resume()?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }
  tone(f, d = 0.1, type = "sine", volume = 0.04, at) {
    if (this.muted || !this.context || this.context.state === "suspended")
      return;
    const ctx = this.context,
      t = at ?? ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(this.master);
    this.voices.add(o);
    o.onended = () => {
      this.voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + d + 0.02);
  }
  effect(f, d = 0.1, type = "sine") {
    if (this.unlock()) this.tone(f, d, type, 0.045);
  }
  start(map) {
    this.map = map;
    if (!this.unlock()) return;
    this.playing = true;
    if (this.timer) return;
    this.step = 0;
    this.next = this.context.currentTime + 0.03;
    const tick = () => {
      if (!this.playing || this.muted) return;
      const notes =
        this.map === "western"
          ? [57, 64, 69, 64, 60, 67, 72, 67, 62, 69, 74, 69, 64, 71, 76, 71]
          : [62, 69, 74, 76, 65, 72, 77, 74, 60, 67, 72, 74, 57, 64, 69, 72];
      if (this.next < this.context.currentTime) this.next = this.context.currentTime;
      while (this.next < this.context.currentTime + 0.2) {
        const n = notes[this.step % notes.length],
          western = this.map === "western";
        this.tone(
          440 * 2 ** ((n - 69) / 12),
          western ? 0.19 : 0.32,
          western ? "triangle" : "sine",
          0.025,
          this.next,
        );
        if (this.step % 4 === 0)
          this.tone(
            440 * 2 ** ((n - 24 - 69) / 12),
            0.42,
            "sine",
            0.04,
            this.next,
          );
        this.step++;
        this.next += western ? 0.24 : 0.3;
      }
    };
    tick();
    this.timer = this.host.setInterval(tick, 80);
  }
  stop() {
    this.playing = false;
    if (this.timer) this.host.clearInterval(this.timer);
    this.timer = null;
    for (const o of this.voices) {
      try {
        o.stop();
      } catch {}
    }
    this.voices.clear();
    this.context?.suspend()?.catch?.(() => {});
  }
  setMuted(value) {
    this.muted = value;
    if (value) this.stop();
  }
}
