import { clamp, FLIGHT_LIMIT } from "./core.mjs";
import { ROLES } from "./profile.mjs";

// Begrenzte Nachholung statt Zeitverlust bei Frames unter 20 FPS.
export function frameTime(elapsed) {
  if (!Number.isFinite(elapsed) || elapsed < 0)
    return { seconds: 0, stalled: true };
  return elapsed > 1
    ? { seconds: 0, stalled: true }
    : { seconds: elapsed, stalled: false };
}

// Darstellung läuft zwischen Snapshots weiter, ohne bei Paket-Jitter rückwärts zu springen.
export class PresentationClock {
  constructor() {
    this.reset();
  }
  reset() {
    this.key = "";
    this.time = 0;
    this.now = 0;
  }
  sample(state, receivedAt, now) {
    const key = state.level + ":" + state.phase,
      age = clamp((now - receivedAt) / 1000, 0, 0.2),
      target = state.t + age;
    if (this.key !== key) {
      this.key = key;
      this.time = state.t;
      this.now = now;
    }
    const dt = clamp((now - this.now) / 1000, 0, 0.25);
    this.now = now;
    const proposed = this.time + dt,
      correction = clamp((target - proposed) * dt * 6, -dt * 0.3, dt * 0.3);
    this.time = Math.max(this.time, Math.min(target, proposed + correction));
    return this.time;
  }
}

export function predictPilot(p, input, age) {
  if (p.hp <= 0) return p;
  const dt = clamp(Number.isFinite(age) ? age : 0, 0, 0.15),
    speed = ROLES[p.role].speed;
  const movement = Number.isFinite(input.target)
    ? clamp(input.target - p.x, -speed * dt, speed * dt)
    : clamp(Number(input.axis) || 0, -1, 1) * speed * dt;
  return { ...p, x: clamp(p.x + movement, -FLIGHT_LIMIT, FLIGHT_LIMIT) };
}

// Auf schwächeren Geräten nur die Renderauflösung anpassen, nicht die Spielregeln.
export class AdaptiveScale {
  constructor() {
    this.reset();
  }
  reset() {
    this.scale = 1;
    this.slow = 0;
    this.fast = 0;
    this.settle = 0;
  }
  sample(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 1) return null;
    this.settle += dt;
    if (this.settle < 1) return null;
    this.slow = dt > 1 / 38 ? this.slow + dt : Math.max(0, this.slow - dt * 2);
    this.fast = dt < 1 / 55 ? this.fast + dt : 0;
    if (this.slow >= 0.8 && this.scale > 0.6) {
      this.scale = Math.max(0.6, this.scale - 0.15);
      this.slow = 0;
      this.fast = 0;
      this.settle = 0;
      return this.scale;
    }
    if (this.fast >= 12 && this.scale < 1) {
      this.scale = Math.min(1, this.scale + 0.1);
      this.fast = 0;
      this.slow = 0;
      this.settle = 0;
      return this.scale;
    }
    return null;
  }
}

export class SnapshotGate {
  constructor() {
    this.reset();
  }
  reset() {
    this.last = -1;
  }
  accept(seq) {
    if (seq === undefined) return this.last < 0;
    if (!Number.isSafeInteger(seq) || seq <= this.last) return false;
    this.last = seq;
    return true;
  }
}
