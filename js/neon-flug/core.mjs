import { ROLES, loadout } from "./profile.mjs";
// Autoritative, zeitbasierte Koop-Simulation. Darstellung und Netzwerk bleiben getrennt.
export const VERSION = 2;
export const FLIGHT_LIMIT = 9;
export const LANE_WIDTH = 7;
export const LEVELS = [
  {
    name: "LICHTSCHLUCHT",
    subtitle: "Wo eure Reise beginnt.",
    duration: 90,
    accent: 0xffad66,
    sky: 0x111c2e,
    fog: 0x29303c,
    seed: 17,
  },
  {
    name: "STURMKANAL",
    subtitle: "Zwei Gleiter. Ein Weg durch den Sturm.",
    duration: 95,
    accent: 0x82e8ed,
    sky: 0x091928,
    fog: 0x183844,
    seed: 41,
  },
  {
    name: "NACHTKERN",
    subtitle: "Bringt das letzte Leuchtfeuer zum Leben.",
    duration: 100,
    accent: 0xc7adff,
    sky: 0x0a0d25,
    fog: 0x20233e,
    seed: 83,
  },
];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function route(level) {
  const a = [];
  let seed = LEVELS[level].seed;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let t = 5; t < LEVELS[level].duration - 4; t += 1.8) {
    const lane = Math.floor(rnd() * 3) - 1;
    const danger = t > 13 && rnd() < 0.48 + level * 0.06;
    a.push({
      id: a.length,
      t,
      type: t > 15 && a.length % 7 === 5 ? "duet" : danger ? "hazard" : "ring",
      x: lane * LANE_WIDTH,
      moving: danger && level > 0 && rnd() < 0.3,
      phase: rnd() * Math.PI * 2,
    });
  }
  return a;
}
export function eventX(e, time) {
  return e.x + (e.moving ? Math.sin(time * 1.4 + e.phase) * 1.6 : 0);
}
const pilot = (i, setup) => ({
  ...loadout(setup),
  lastDash: -100,
  x: i ? 3.2 : -3.2,
  hp: 3,
  inv: 0,
  dash: 0,
  cooldown: 0,
  rings: 0,
  down: 0,
  rescue: 0,
});
export function createState(level = 0, setups = []) {
  return {
    version: VERSION,
    phase: "briefing",
    level,
    t: 0,
    players: [pilot(0, setups[0]), pilot(1, setups[1])],
    resonance: 0,
    overdrive: 0,
    duets: 0,
    rescues: 0,
    syncs: 0,
    score: 0,
    combo: 0,
    events: [],
    notice: "",
    medal: 0,
  };
}
export function start(s) {
  if (s.phase === "briefing") s.phase = "playing";
}
export function dash(s, i) {
  const p = s.players[i];
  if (s.phase !== "playing" || p.hp <= 0 || p.cooldown > 0) return false;
  const role = ROLES[p.role];
  p.dash = role.dash;
  p.inv = Math.max(p.inv, role.dash);
  p.cooldown = role.cooldown - (p.mod === "capacitor" ? 0.7 : 0);
  p.lastDash = s.t;
  const partner = s.players[1 - i];
  if (partner.hp > 0 && s.t - partner.lastDash <= 0.35) {
    s.syncs++;
    charge(s, 15);
    s.notice = "ZWILLINGSSCHUB";
    p.inv = Math.max(p.inv, 1.2);
    partner.inv = Math.max(partner.inv, 1.2);
  }
  return true;
}
export function charge(s, value) {
  if (s.overdrive > 0) return;
  s.resonance = Math.min(100, s.resonance + value);
  if (s.resonance >= 100) {
    s.resonance = 0;
    s.overdrive = 5;
    s.notice = "RESONANZFLUG";
    s.players.forEach((p) => {
      if (p.hp > 0) {
        p.inv = Math.max(p.inv, 1.2);
        p.cooldown = 0;
      }
    });
  }
}
export function hit(s, i) {
  const p = s.players[i];
  if (s.phase !== "playing" || p.hp <= 0 || p.inv > 0) return false;
  p.hp--;
  p.inv = 1.8;
  s.combo = 0;
  if (p.hp === 0) {
    p.down = 20;
    p.rescue = 0;
  }
  return true;
}
export function step(s, inputs, dt) {
  if (s.phase !== "playing") return;
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  s.overdrive = Math.max(0, s.overdrive - dt);
  const old = s.t;
  s.t += dt;
  for (let i = 0; i < 2; i++) {
    const p = s.players[i],
      q = s.players[1 - i],
      v = inputs[i] || {};
    p.inv = Math.max(0, p.inv - dt);
    p.dash = Math.max(0, p.dash - dt);
    p.cooldown = Math.max(
      0,
      p.cooldown - dt * (Math.abs(p.x - q.x) < 2.8 ? 1.35 : 1),
    );
    if (p.hp > 0) {
      const speed = ROLES[p.role].speed;
      const target = Number.isFinite(v.target)
        ? clamp(v.target, -FLIGHT_LIMIT, FLIGHT_LIMIT)
        : null;
      const axis = Number.isFinite(v.axis) ? clamp(v.axis, -1, 1) : 0;
      p.x = clamp(
        p.x +
          (target === null
            ? axis * speed * dt
            : clamp(target - p.x, -speed * dt, speed * dt)),
        -FLIGHT_LIMIT,
        FLIGHT_LIMIT,
      );
    } else {
      p.down = Math.max(0, p.down - dt);
      const rescue =
        q.hp > 0 &&
        inputs[1 - i]?.rescue &&
        Math.abs(p.x - q.x) < (q.role === "medic" ? 3.2 : 2.6);
      p.rescue = rescue ? p.rescue + dt : Math.max(0, p.rescue - dt * 0.5);
      if (p.rescue >= ROLES[q.role].rescue) {
        p.hp = q.mod === "anchor" ? 3 : 2;
        p.inv = 3;
        p.down = 0;
        p.rescue = 0;
        s.notice = "RETTUNG ERFOLGREICH";
        s.rescues++;
        charge(s, 25);
      } else if (p.down <= 0) s.phase = "failed";
    }
  }
  if (s.phase !== "playing") return;
  if (s.players.every((p) => p.hp === 0)) {
    s.phase = "failed";
    return;
  }
  for (const e of routeCache[s.level]) {
    if (e.t <= old || e.t > s.t) continue;
    s.events.push(e.id);
    const x = eventX(e, s.t);
    if (e.type === "duet") {
      const [a, b] = s.players;
      const success =
        a.hp > 0 &&
        b.hp > 0 &&
        ((Math.abs(a.x + LANE_WIDTH) < 2.4 &&
          Math.abs(b.x - LANE_WIDTH) < 2.4) ||
          (Math.abs(b.x + LANE_WIDTH) < 2.4 &&
            Math.abs(a.x - LANE_WIDTH) < 2.4));
      if (success) {
        s.duets++;
        s.score += s.overdrive > 0 ? 1000 : 500;
        a.rings++;
        b.rings++;
        charge(s, 25);
        if (s.notice !== "RESONANZFLUG") s.notice = "DOPPELRING · ZUSAMMEN";
      }
      continue;
    }
    for (let i = 0; i < 2; i++) {
      const p = s.players[i];
      if (p.hp <= 0) continue;
      const d = Math.abs(p.x - x);
      if (e.type === "hazard" && d < 2.8) hit(s, i);
      if (e.type === "ring" && d < (p.mod === "focus" ? 2.7 : 2.1)) {
        p.rings++;
        s.combo++;
        s.score +=
          (100 + Math.min(s.combo, 10) * 10) * (s.overdrive > 0 ? 2 : 1);
      }
    }
  }
  if (s.phase === "playing" && s.t >= LEVELS[s.level].duration) {
    s.phase = s.level === 2 ? "victory" : "result";
    const total =
      routeCache[s.level].filter((e) => e.type !== "hazard").length * 2;
    const ratio = s.players.reduce((n, p) => n + p.rings, 0) / total;
    s.medal = ratio > 0.65 ? 3 : ratio > 0.35 ? 2 : 1;
  }
}
export const routeCache = LEVELS.map((_, i) => route(i));
export function snapshot(s) {
  return { ...s, players: s.players.map((p) => ({ ...p })), events: undefined };
}
export function validSnapshot(s) {
  return (
    s &&
    s.version === VERSION &&
    ["briefing", "playing", "paused", "result", "failed", "victory"].includes(
      s.phase,
    ) &&
    Number.isInteger(s.level) &&
    s.level >= 0 &&
    s.level < 3 &&
    Number.isFinite(s.t) &&
    s.t >= 0 &&
    s.t <= 110 &&
    Number.isFinite(s.score) &&
    ["resonance", "overdrive", "duets", "rescues", "syncs"].every(
      (k) => Number.isFinite(s[k]) && s[k] >= 0,
    ) &&
    s.resonance <= 100 &&
    s.overdrive <= 5 &&
    Array.isArray(s.players) &&
    s.players.length === 2 &&
    s.players.every(
      (p) =>
        ["x", "hp", "inv", "dash", "cooldown", "rings", "down", "rescue"].every(
          (k) => Number.isFinite(p[k]),
        ) &&
        Number.isFinite(p.lastDash) &&
        Object.hasOwn(ROLES, p.role) &&
        ["none", "capacitor", "focus", "anchor"].includes(p.mod) &&
        Math.abs(p.x) <= FLIGHT_LIMIT &&
        p.hp >= 0 &&
        p.hp <= 3,
    )
  );
}
