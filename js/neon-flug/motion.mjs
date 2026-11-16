// Kleine feste Historie je Pilot, gleichmässig in Sekunden abgetastet.
// Auf schmaleren Querformaten bleibt auch der Partner am gegenüberliegenden Rand im Bild.
export const cameraOffset = (x, width, height) =>
  x * 0.16 * Math.max(0, Math.min(1, (width / height - 1.6) / 0.18));
export const TRAIL_LIMIT = 24;
export const EFFECT_LIMIT = 96;
export class FlightMotion {
  constructor() {
    this.reset("");
  }
  reset(run) {
    this.run = run;
    this.cursor = 0;
    this.time = 0;
    this.next = 0;
    this.trails = [[], []];
    this.previous = null;
  }
  update(s, dt, reduced, burst) {
    if (!s) return;
    if (this.run !== s.runId) this.reset(s.runId);
    for (const f of s.feedback || []) {
      if (f.id <= this.cursor) continue;
      this.cursor = f.id;
      if (s.t - f.t < 0.6 && !reduced)
        burst(
          f.x,
          f.kind === "destroy" || f.kind === "hit"
            ? 0xff8866
            : f.kind === "bonus"
              ? 0xffd786
              : 0x9aeee0,
          f.y,
          f.z,
        );
    }
    if (reduced || s.phase !== "playing") {
      if (reduced) this.trails = [[], []];
      this.previous = s.players.map((p) => ({ x: p.x, y: p.y }));
      return;
    }
    const start = this.time;
    this.time += dt;
    this.previous ||= s.players;
    // Zeitabstände statt ein neuer Punkt pro Bild; Speicher bleibt begrenzt.
    while (this.next <= this.time) {
      const f = dt > 0 ? Math.max(0, Math.min(1, (this.next - start) / dt)) : 1;
      s.players.forEach((p, i) => {
        this.trails[i].push({
          x: this.previous[i].x + (p.x - this.previous[i].x) * f,
          y: this.previous[i].y + (p.y - this.previous[i].y) * f,
          t: this.next,
        });
        if (this.trails[i].length > TRAIL_LIMIT) this.trails[i].shift();
      });
      this.next += 0.04;
    }
    this.previous = s.players.map((p) => ({ x: p.x, y: p.y }));
  }
}
