// Eigene prozedurale Klangwelt: keine externen Tracks, kein Autoplay.
export class FlightAudio {
  constructor(settings) {
    this.settings = settings;
    this.enabled = false;
    this.ctx = null;
    this.active = false;
    this.next = 0;
    this.beat = 0;
  }
  unlock() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.ctx = new A();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.65;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.ratio.value = 5;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this.enabled) this.ctx.resume().catch(() => {});
    else this.silence();
  }
  tone(freq, duration, volume, type = "sine", delay = 0) {
    if (
      !this.enabled ||
      !this.ctx ||
      this.ctx.state !== "running" ||
      volume <= 0
    )
      return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain(),
      t = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.05);
  }
  effect(kind) {
    const v = (this.settings.effects / 100) * 0.17;
    if (kind === "ring") {
      this.tone(659, 0.16, v);
      this.tone(988, 0.25, v * 0.5, "sine", 0.06);
    }
    if (kind === "hit") {
      this.tone(82, 0.32, v, "triangle");
      this.tone(61, 0.4, v, "sawtooth");
    }
    if (kind === "dash") {
      this.tone(165, 0.2, v, "triangle");
      this.tone(440, 0.35, v * 0.35, "sine", 0.06);
    }
    if (kind === "rescue" || kind === "win") {
      [262, 330, 392, 523].forEach((f, i) =>
        this.tone(f, 0.8, v * 0.55, "sine", i * 0.12),
      );
    }
  }
  update(active, level) {
    if (!active || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (t < this.next) return;
    this.next = t + 0.42;
    const chords = [
        [130.81, 164.81, 196, 246.94],
        [110, 130.81, 164.81, 196],
        [98, 123.47, 146.83, 196],
        [110, 146.83, 174.61, 220],
      ],
      ch = chords[Math.floor(this.beat / 16) % 4],
      v = (this.settings.music / 100) * 0.06;
    this.tone(ch[(this.beat + level) % 4] * 2, 0.85, v);
    if (this.beat % 4 === 0) this.tone(ch[0] / 2, 1.3, v * 1.5, "triangle");
    if (this.beat % 16 === 0) ch.forEach((f) => this.tone(f, 2.5, v * 0.25));
    this.beat++;
  }
  silence() {
    if (this.ctx && this.ctx.state === "running")
      this.ctx.suspend().catch(() => {});
  }
}
