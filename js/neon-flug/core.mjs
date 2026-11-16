import { ROLES, MODULES, loadout } from "./profile.mjs";
// Autoritative, zeitbasierte Koop-Simulation. Darstellung und Netzwerk bleiben getrennt.
export const VERSION = 4;
export const HEIGHT_LIMIT = 3;
export const MAX_SHOTS = 16;
export const MAX_FEEDBACK = 24;
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
      y: a.length < 4 ? 0 : [0, 2.4, -2.4][a.length % 3],
      moving: danger && level > 0 && rnd() < 0.3,
      phase: rnd() * Math.PI * 2,
      bonus: !danger && a.length % 6 === 3,
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
  y: 0,
  heat: 0,
  overheated: false,
  shotCooldown: 0,
  hp: 3,
  inv: 0,
  dash: 0,
  cooldown: 0,
  rings: 0,
  down: 0,
  rescue: 0,
});
export function createState(level = 0, setups = [], options = {}) {
  return {
    version: VERSION,
    runId: options.runId || globalThis.crypto.randomUUID(),
    mode: options.mode === "shoot" ? "shoot" : "classic",
    training: options.training === true,
    collected: [],
    destroyed: [],
    droneHits: {},
    shots: [],
    shotSerial: 0,
    feedback: [],
    feedbackSerial: 0,
    kills: 0,
    bestCombo: 0,
    phase: "briefing",
    level,
    t: 0,
    players: [pilot(0, setups[0]), pilot(1, setups[1])],
    resonance: 0,
    bonuses: 0,
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
  p.cooldown =
    role.cooldown - (p.mod === "coil" ? 1.2 : p.mod === "capacitor" ? 0.7 : 0);
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
  s.resonance = Math.min(
    100,
    s.resonance +
      value * (s.players.some((p) => p.mod === "resonance") ? 1.25 : 1),
  );
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
  p.inv = p.mod === "guard" ? 2.6 : 1.8;
  s.combo = 0;
  if (p.hp === 0) {
    p.down = 20;
    p.rescue = 0;
  }
  return true;
}
export const duration = (s) =>
  s.mode === "shoot" ? 60 : LEVELS[s.level].duration;
export const eventsFor = (s) =>
  s.mode === "shoot" ? combatRoute : routeCache[s.level];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function movePilot(p, v, dt) {
  const speed = ROLES[p.role].speed + (p.mod === "vector" ? 2 : 0);
  const axis = Number.isFinite(v.axis) ? clamp(v.axis, -1, 1) : 0;
  const vertical = Number.isFinite(v.vertical) ? clamp(v.vertical, -1, 1) : 0;
  const norm = Math.max(1, Math.hypot(axis, vertical));
  for (const [key, targetKey, axisValue, limit] of [
    ["x", "target", axis, FLIGHT_LIMIT],
    ["y", "targetY", vertical, HEIGHT_LIMIT],
  ]) {
    const target = Number.isFinite(v[targetKey])
      ? clamp(v[targetKey], -limit, limit)
      : null;
    p[key] = clamp(
      p[key] +
        (target === null
          ? (axisValue / norm) * speed * dt
          : clamp(target - p[key], -speed * dt, speed * dt)),
      -limit,
      limit,
    );
  }
}
function feedback(s, kind, x, y, points = 0, z = 0) {
  s.feedback.push({ id: ++s.feedbackSerial, t: s.t, kind, x, y, points, z });
  if (s.feedback.length > MAX_FEEDBACK) s.feedback.shift();
}
function combo(s) {
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  if (s.combo % 5 === 0) {
    s.bonuses++;
    s.score += 200;
    charge(s, 10);
  }
}
export function fire(s, i) {
  const p = s.players[i];
  if (
    s.mode !== "shoot" ||
    s.phase !== "playing" ||
    p.hp <= 0 ||
    p.overheated ||
    p.shotCooldown > 0 ||
    s.shots.length >= MAX_SHOTS
  )
    return false;
  s.shots.push({ id: ++s.shotSerial, owner: i, x: p.x, y: p.y, z: 0 });
  p.shotCooldown = Math.max(0, p.shotCooldown + 0.22);
  p.heat = Math.min(1, p.heat + 0.24);
  if (p.heat >= 1) p.overheated = true;
  return true;
}
function combat(s, inputs, dt, old) {
  for (let i = 0; i < 2; i++) {
    const p = s.players[i];
    p.shotCooldown = Math.max(-dt, p.shotCooldown - dt);
    p.heat = Math.max(0, p.heat - dt * 0.25);
    if (p.heat <= 0.3) p.overheated = false;
    if (inputs[i]?.fire) fire(s, i);
  }
  // Swept-Z-Prüfung: auch ein langsamer Frame überspringt kein Ziel.
  s.shots = s.shots.filter((shot) => {
    const before = shot.z;
    shot.z -= dt * 100;
    for (const e of combatRoute) {
      if (e.type !== "drone" || s.destroyed.includes(e.id) || e.t <= old)
        continue;
      const z = -(e.t - s.t) * 22,
        oldZ = -(e.t - old) * 22;
      if (before >= oldZ && shot.z <= z && distance(shot, e) < 1.8) {
        s.droneHits[e.id] = (s.droneHits[e.id] || 0) + 1;
        const killed = s.droneHits[e.id] >= 2;
        if (killed) {
          s.destroyed.push(e.id);
          s.kills++;
          combo(s);
          s.score += 250;
          charge(s, 8);
          s.notice = "DROHNE +250 · KETTE ×" + s.combo;
        }
        feedback(s, killed ? "destroy" : "hit", e.x, e.y, killed ? 250 : 0, z);
        return false;
      }
    }
    return shot.z > -180;
  });
}
export function step(s, inputs, dt) {
  if (s.phase !== "playing") return;
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  s.overdrive = Math.max(0, s.overdrive - dt);
  const old = s.t;
  s.t = Math.min(duration(s), s.t + dt);
  for (let i = 0; i < 2; i++) {
    const p = s.players[i],
      q = s.players[1 - i],
      v = inputs[i] || {};
    p.inv = Math.max(0, p.inv - dt);
    p.dash = Math.max(0, p.dash - dt);
    p.cooldown = Math.max(
      0,
      p.cooldown -
        dt *
          (distance(p, q) < 2.8
            ? p.mod === "link" || q.mod === "link"
              ? 1.7
              : 1.35
            : 1),
    );
    if (p.hp > 0) {
      movePilot(p, v, dt);
    } else {
      p.down = Math.max(0, p.down - dt);
      const rescue =
        q.hp > 0 &&
        inputs[1 - i]?.rescue &&
        distance(p, q) < (q.role === "medic" ? 3.2 : 2.6);
      p.rescue = rescue ? p.rescue + dt : Math.max(0, p.rescue - dt * 0.5);
      if (p.rescue >= ROLES[q.role].rescue) {
        p.hp = q.mod === "anchor" ? 3 : 2;
        p.inv = q.mod === "savior" ? 5 : 3;
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
  if (s.mode === "shoot") combat(s, inputs, dt, old);
  for (const e of eventsFor(s)) {
    if (e.t <= old || e.t > s.t || s.events.includes(e.id)) continue;
    s.events.push(e.id);
    const x = eventX(e, s.t),
      y = e.y;
    const before = s.score;
    if (e.type === "duet") {
      const [a, b] = s.players;
      const left = { x: -LANE_WIDTH, y },
        right = { x: LANE_WIDTH, y };
      if (
        a.hp > 0 &&
        b.hp > 0 &&
        ((distance(a, left) < 2.4 && distance(b, right) < 2.4) ||
          (distance(b, left) < 2.4 && distance(a, right) < 2.4))
      ) {
        s.collected.push(e.id);
        s.duets++;
        s.score += s.overdrive > 0 ? 1000 : 500;
        a.rings++;
        b.rings++;
        combo(s);
        charge(s, 25);
        s.notice = "DOPPELRING +" + (s.score - before) + " · KETTE ×" + s.combo;
        feedback(s, "duet", -LANE_WIDTH, y, s.score - before);
        feedback(s, "duet", LANE_WIDTH, y);
      }
    } else if (e.type === "ring") {
      // Ein Ring gehört dem nächsten lebenden Piloten, nie beiden zugleich.
      const eligible = s.players.filter(
        (p) =>
          p.hp > 0 && distance(p, { x, y }) < (p.mod === "focus" ? 2.7 : 2.1),
      );
      eligible.sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }));
      if (eligible.length) {
        s.collected.push(e.id);
        eligible[0].rings++;
        combo(s);
        if (e.bonus) {
          s.bonuses++;
          s.score += 300;
          charge(s, 10);
        }
        s.score +=
          (100 + Math.min(s.combo, 10) * 10) * (s.overdrive > 0 ? 2 : 1);
        s.notice =
          (e.bonus ? "BONUSRING" : "RING") +
          " +" +
          (s.score - before) +
          " · KETTE ×" +
          s.combo;
        feedback(s, e.bonus ? "bonus" : "ring", x, y, s.score - before);
      }
    } else if (!s.destroyed.includes(e.id)) {
      for (let i = 0; i < 2; i++) {
        const p = s.players[i];
        if (Math.hypot((p.x - x) / 2.8, (p.y - y) / 2.1) < 1) hit(s, i);
      }
    }
  }
  if (
    s.phase === "playing" &&
    s.t >= duration(s) &&
    s.players.some((p) => p.hp === 0)
  )
    s.notice = "ZIEL ERREICHT · PARTNER RETTEN";
  if (
    s.phase === "playing" &&
    s.t >= duration(s) &&
    s.players.every((p) => p.hp > 0)
  ) {
    s.phase = s.mode === "shoot" || s.level === 2 ? "victory" : "result";
    const total = eventsFor(s).reduce(
      (n, e) => n + (e.type === "duet" ? 2 : e.type === "ring" ? 1 : 0),
      0,
    );
    const ratio =
      s.mode === "shoot"
        ? s.kills / combatRoute.filter((e) => e.type === "drone").length
        : s.players.reduce((n, p) => n + p.rings, 0) / Math.max(1, total);
    s.medal = ratio > 0.65 ? 3 : ratio > 0.35 ? 2 : 1;
  }
}
export const routeCache = LEVELS.map((_, i) => route(i));
export const combatRoute = Array.from({ length: 25 }, (_, id) => ({
  id,
  t: 5 + id * 2.1,
  type: id % 4 === 3 ? "ring" : "drone",
  x: [0, -7, 7][id % 3],
  y: [0, 2.4, -2.4][Math.floor(id / 3) % 3],
  bonus: id % 8 === 3,
}));
export function snapshot(s) {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p })),
    events: [...s.events],
    collected: [...s.collected],
    destroyed: [...s.destroyed],
    droneHits: { ...s.droneHits },
    shots: s.shots.map((p) => ({ ...p })),
    feedback: s.feedback.map((p) => ({ ...p })),
  };
}
export function validSnapshot(s) {
  return (
    s &&
    s.version === VERSION &&
    typeof s.runId === "string" &&
    s.runId.length > 0 &&
    s.runId.length <= 100 &&
    ["classic", "shoot"].includes(s.mode) &&
    typeof s.training === "boolean" &&
    ["events", "collected", "destroyed"].every(
      (k) =>
        Array.isArray(s[k]) &&
        s[k].length <= 60 &&
        s[k].every((id) => Number.isInteger(id) && id >= 0 && id < 60),
    ) &&
    Array.isArray(s.shots) &&
    s.shots.length <= MAX_SHOTS &&
    s.shots.every(
      (p) =>
        ["id", "x", "y", "z", "owner"].every((k) => Number.isFinite(p[k])) &&
        Math.abs(p.x) <= FLIGHT_LIMIT &&
        Math.abs(p.y) <= HEIGHT_LIMIT &&
        p.z <= 0 &&
        p.z >= -185,
    ) &&
    Array.isArray(s.feedback) &&
    s.feedback.length <= MAX_FEEDBACK &&
    s.feedback.every(
      (p) =>
        ["id", "t", "x", "y", "points", "z"].every((k) =>
          Number.isFinite(p[k]),
        ) && ["ring", "bonus", "duet", "hit", "destroy"].includes(p.kind),
    ) &&
    s.droneHits &&
    typeof s.droneHits === "object" &&
    ["kills", "combo", "bestCombo", "feedbackSerial", "shotSerial"].every(
      (k) => Number.isInteger(s[k]) && s[k] >= 0,
    ) &&
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
    ["resonance", "overdrive", "duets", "rescues", "syncs", "bonuses"].every(
      (k) => Number.isFinite(s[k]) && s[k] >= 0,
    ) &&
    s.resonance <= 100 &&
    s.overdrive <= 5 &&
    Array.isArray(s.players) &&
    s.players.length === 2 &&
    s.players.every(
      (p) =>
        [
          "x",
          "y",
          "heat",
          "shotCooldown",
          "hp",
          "inv",
          "dash",
          "cooldown",
          "rings",
          "down",
          "rescue",
        ].every((k) => Number.isFinite(p[k])) &&
        Number.isFinite(p.lastDash) &&
        Object.hasOwn(ROLES, p.role) &&
        Object.hasOwn(MODULES, p.mod) &&
        Math.abs(p.x) <= FLIGHT_LIMIT &&
        Math.abs(p.y) <= HEIGHT_LIMIT &&
        p.heat >= 0 &&
        p.heat <= 1 &&
        typeof p.overheated === "boolean" &&
        p.hp >= 0 &&
        p.hp <= 3,
    )
  );
}
