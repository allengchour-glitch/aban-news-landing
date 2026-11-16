import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  start,
  step,
  snapshot,
  validSnapshot,
  routeCache,
  combatRoute,
  fire,
  MAX_SHOTS,
  MAX_FEEDBACK,
  HEIGHT_LIMIT,
  FLIGHT_LIMIT,
} from "../../js/neon-flug/core.mjs";
import { profile, award } from "../../js/neon-flug/profile.mjs";
import { predictPilot } from "../../js/neon-flug/timing.mjs";
import { FlightMotion, TRAIL_LIMIT } from "../../js/neon-flug/motion.mjs";
const live = (options) => {
  const s = createState(0, [], options);
  start(s);
  return s;
};
const tick = (s, seconds, inputs = [{}, {}], hz = 60) => {
  for (let i = 0; i < Math.round(seconds * hz); i++) step(s, inputs, 1 / hz);
};
function approach(s, e) {
  s.t = e.t - 0.01;
  Object.assign(s.players[0], { x: e.type === "duet" ? -7 : e.x, y: e.y });
  Object.assign(s.players[1], { x: e.type === "duet" ? 7 : e.x, y: e.y });
}
test("Ein Ring ergibt genau eine Sammlung, auch bei zwei Piloten und wiederholtem Crossing", () => {
  for (const bonus of [false, true]) {
    const e = routeCache[0].find((e) => e.type === "ring" && e.bonus === bonus),
      s = live();
    approach(s, e);
    step(s, [{}, {}], 0.02);
    assert.equal(
      s.players.reduce((n, p) => n + p.rings, 0),
      1,
    );
    assert.deepEqual(s.collected, [e.id]);
    const score = s.score;
    s.t = e.t - 0.01;
    step(s, [{}, {}], 0.02);
    assert.equal(s.score, score);
    assert.equal(s.feedback.length, 1);
  }
});
test("Doppelring entfernt beide Hälften gemeinsam und wertet nur einmal", () => {
  const e = routeCache[0].find((e) => e.type === "duet"),
    s = live();
  approach(s, e);
  step(s, [{}, {}], 0.02);
  assert.equal(s.duets, 1);
  assert.deepEqual(s.collected, [e.id]);
  assert.equal(s.feedback.length, 2);
  assert.equal(s.combo, 1);
  s.t = e.t - 0.01;
  step(s, [{}, {}], 0.02);
  assert.equal(s.duets, 1);
});
test("Verpasste normale, Bonus- und Doppelringe bleiben ungesammelt", () => {
  for (const e of [
    routeCache[0][0],
    routeCache[0].find((e) => e.bonus),
    routeCache[0].find((e) => e.type === "duet"),
  ]) {
    const s = live();
    approach(s, e);
    s.players.forEach((p) => {
      p.x = 4;
      p.y = e.y > 0 ? -3 : 3;
    });
    step(s, [{}, {}], 0.02);
    assert.equal(s.collected.length, 0);
    assert.equal(s.score, 0);
  }
});
test("Höhe entscheidet über Ring und Hindernis; Nähe zur Rettung ist zweidimensional", () => {
  for (const type of ["ring", "hazard"]) {
    const e = routeCache[0].find((e) => e.type === type && e.y === 0);
    for (const y of [0, 3]) {
      const s = live();
      approach(s, e);
      s.players[0].y = y;
      s.players[1].x = 9;
      step(s, [{}, {}], 0.02);
      assert.equal(
        type === "ring" ? s.players[0].rings : 3 - s.players[0].hp,
        y === 0 ? 1 : 0,
      );
    }
  }
  const s = live();
  Object.assign(s.players[0], { x: 0, y: 3, hp: 0, down: 20 });
  Object.assign(s.players[1], { x: 0, y: -3 });
  tick(s, 3, [{}, { rescue: true }]);
  assert.equal(s.players[0].hp, 0);
});
test("Vier Richtungen, Diagonalspeed und Bounds stimmen bei 30/60/120 Hz", () => {
  const positions = [];
  for (const hz of [30, 60, 120]) {
    const s = live();
    tick(s, 0.1, [{ axis: 1, vertical: 1 }, {}], hz);
    positions.push([s.players[0].x, s.players[0].y]);
    assert(
      Math.abs(Math.hypot(s.players[0].x + 3.2, s.players[0].y) - 1.55) < 1e-8,
    );
    tick(s, 1, [{ axis: 1, vertical: 1 }, {}], hz);
    assert.equal(s.players[0].y, HEIGHT_LIMIT);
    tick(s, 3, [{ axis: -1, vertical: -1 }, {}], hz);
    assert.equal(s.players[0].x, -FLIGHT_LIMIT);
    assert.equal(s.players[0].y, -HEIGHT_LIMIT);
  }
  positions.forEach((p) =>
    assert(Math.hypot(p[0] - positions[0][0], p[1] - positions[0][1]) < 1e-8),
  );
});
test("Gastvorhersage nutzt dieselben Achsen, Diagonalen und Grenzen", () => {
  const s = live(),
    input = { axis: 0.5, vertical: 1 };
  const p = predictPilot(s.players[0], input, 0.05);
  step(s, [input, {}], 0.05);
  assert.equal(p.x, s.players[0].x);
  assert.equal(p.y, s.players[0].y);
});
test("Snapshot transportiert Höhe, Sammlungen, Treffer und Feedback ohne Referenzteilung", () => {
  const s = live({ mode: "shoot" });
  fire(s, 0);
  approach(
    s,
    combatRoute.find((e) => e.type === "ring"),
  );
  step(s, [{}, {}], 0.02);
  const replica = JSON.parse(JSON.stringify(snapshot(s)));
  assert(validSnapshot(replica));
  assert.deepEqual(replica, snapshot(s));
  replica.collected.length = 0;
  replica.players[0].y = NaN;
  replica.shots[0].x = 99;
  assert.equal(s.collected.length, 1);
  assert.notEqual(s.shots[0].x, 99);
  assert(!validSnapshot(replica));
  for (const bad of [
    { ...snapshot(s), version: 3 },
    { ...snapshot(s), collected: [NaN] },
    { ...snapshot(s), shots: Array(17).fill(s.shots[0]) },
  ])
    assert(!validSnapshot(bad));
});
test("Klassischer Flug bleibt kampffrei, Schüsse respektieren Cooldown und Pool", () => {
  const classic = live();
  assert(!fire(classic, 0));
  tick(classic, 2, [{ fire: true }, {}]);
  assert.equal(classic.shots.length, 0);
  const s = live({ mode: "shoot" });
  assert(fire(s, 0));
  assert(!fire(s, 0));
  tick(s, 0.25);
  assert(fire(s, 0));
  for (let i = 0; i < 100; i++) {
    s.players[0].shotCooldown = 0;
    s.players[0].overheated = false;
    fire(s, 0);
  }
  assert.equal(s.shots.length, MAX_SHOTS);
});
test("Zwei echte Projektiltreffer zerstören eine Drohne; falsche Höhe verfehlt", () => {
  for (const y of [0, 3]) {
    const s = live({ mode: "shoot" });
    s.t = 3;
    Object.assign(s.players[0], { x: 0, y });
    s.players[1].x = 9;
    tick(s, 0.7, [{ fire: true }, {}]);
    assert.equal(s.kills, y === 0 ? 1 : 0);
    if (y === 0) {
      assert.deepEqual(s.destroyed, [0]);
      assert(s.feedback.some((f) => f.kind === "hit"));
      assert(s.feedback.some((f) => f.kind === "destroy"));
    }
  }
});
test("Dauerfeuer überhitzt, Abkühlen erlaubt wieder Schüsse, Pause friert Waffen ein", () => {
  const s = live({ mode: "shoot" });
  s.players[0].x = -9;
  for (let i = 0; i < 120 && !s.players[0].overheated; i++)
    step(s, [{ fire: true }, {}], 1 / 60);
  assert(s.players[0].overheated);
  assert(!fire(s, 0));
  s.phase = "paused";
  const copy = snapshot(s);
  tick(s, 2, [{ fire: true }, {}]);
  assert.deepEqual(snapshot(s), copy);
  s.phase = "playing";
  tick(s, 3);
  assert(!s.players[0].overheated);
  assert(fire(s, 0));
});
test("Schießrunde endet bei 60 Sekunden; Abschüsse geben begrenzte XP ohne Kampagnenzwang", () => {
  const s = live({ mode: "shoot" });
  s.t = 59.99;
  s.kills = 7;
  step(s, [{}, {}], 0.02);
  assert.equal(s.phase, "victory");
  const result = award(profile(null), s);
  assert.equal(result.gained, 135);
  assert.equal(result.breakdown.combat, 35);
});
test("XP bleiben nach erneuter Verbindung, JSON-Reload und wiederholter Auszahlung identisch", () => {
  const s = live();
  s.phase = "result";
  s.duets = 2;
  s.bestCombo = 10;
  const first = award(profile(null), s);
  assert(first.gained > 100);
  const reloaded = profile(JSON.parse(JSON.stringify(first.profile)));
  const again = award(reloaded, JSON.parse(JSON.stringify(snapshot(s))));
  assert.equal(again.gained, 0);
  assert.deepEqual(again.profile, reloaded);
  assert.equal(
    award(reloaded, { ...s, runId: "next-flight" }).profile.missions,
    2,
  );
});
test("Training und Niederlage geben auch mit frischer Kennung niemals XP", () => {
  for (const mode of ["classic", "shoot"])
    for (const phase of ["victory", "result", "failed"]) {
      const s = live({ training: true, mode });
      s.phase = phase;
      s.kills = 100;
      s.bonuses = 100;
      assert.equal(award(profile(null), s).gained, 0);
    }
});
test("Feedback und Trail-Historie bleiben begrenzt; reduced-motion unterdrückt Zusatzeffekte", () => {
  const s = live();
  for (const e of routeCache[0].filter((e) => e.type !== "hazard")) {
    approach(s, e);
    step(s, [{}, {}], 0.02);
  }
  assert(s.feedback.length <= MAX_FEEDBACK);
  assert.equal(s.feedback.length, MAX_FEEDBACK);
  const m = new FlightMotion();
  let bursts = 0;
  m.update(s, 0.1, false, () => bursts++);
  const count = bursts;
  m.update(s, 0.1, false, () => bursts++);
  assert.equal(bursts, count);
  for (let i = 0; i < 300; i++) m.update(s, 1 / 60, false, () => {});
  assert.equal(m.trails[0].length, TRAIL_LIMIT);
  m.update(s, 0.1, true, () => {
    throw Error("Reduzierte Bewegung erzeugt Partikel");
  });
  assert.equal(m.trails[0].length, 0);
});
test("Trail-Abstände sind bei 30 und 120 Bildern pro Sekunde gleich", () => {
  const paths = [];
  for (const hz of [30, 120]) {
    const m = new FlightMotion(),
      s = live();
    m.update(s, 0, false, () => {});
    for (let i = 1; i <= hz; i++) {
      s.players[0].x = i / hz;
      m.update(s, 1 / hz, false, () => {});
    }
    paths.push(m.trails[0]);
  }
  assert.equal(paths[0].length, paths[1].length);
  paths[0].forEach((p, i) => assert(Math.abs(p.x - paths[1][i].x) < 1e-8));
});
