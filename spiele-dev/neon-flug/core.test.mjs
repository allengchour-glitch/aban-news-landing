import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  start,
  step,
  hit,
  dash,
  route,
  routeCache,
  LEVELS,
  snapshot,
  validSnapshot,
} from "../../js/neon-flug/core.mjs";
const safeInput = (s) => {
  const e = routeCache[s.level].find(
    (e) => e.type === "hazard" && e.t > s.t && e.t < s.t + 1.3,
  );
  const target = e ? (e.x >= 0 ? -8 : 8) : null;
  return s.players.map((p) => ({ target: target ?? p.x }));
};
const tick = (s, seconds, inputs) => {
  for (let t = 0; t < seconds; t += 1 / 120)
    step(s, inputs || safeInput(s), 1 / 120);
};
test("Ohne bestätigten Start läuft die Mission nicht", () => {
  const s = createState();
  tick(s, 1);
  assert.equal(s.t, 0);
});
test("Routen reproduzierbar und für jedes Level eigenständig", () => {
  assert.deepEqual(route(0), route(0));
  assert.notDeepEqual(route(0), route(1));
  assert(
    route(0)
      .filter((e) => e.t < 13)
      .every((e) => e.type === "ring"),
  );
});
test("30 und 120 Hz führen zum gleichen Kampagnenabschluss", () => {
  for (const hz of [30, 120]) {
    const s = createState();
    start(s);
    for (let i = 0; i < hz * 91; i++) step(s, safeInput(s), 1 / hz);
    assert.equal(s.phase, "result");
    assert.equal(s.medal, 1);
  }
});
test("Ein Treffer ist nicht in mehreren Frames mehrfach tödlich", () => {
  const s = createState();
  start(s);
  assert(hit(s, 0));
  assert.equal(s.players[0].hp, 2);
  assert(!hit(s, 0));
  assert.equal(s.players[0].hp, 2);
});
test("Dash schützt und lädt nicht unmittelbar erneut", () => {
  const s = createState();
  start(s);
  assert(dash(s, 0));
  assert(!dash(s, 0));
  assert(!hit(s, 0));
  tick(s, 0.7);
  assert(!dash(s, 0));
});
test("Rettung verlangt lebenden Partner, Nähe und gehaltene Eingabe", () => {
  const s = createState();
  start(s);
  Object.assign(s.players[0], { hp: 0, down: 20, x: -2 });
  s.players[1].x = -1;
  tick(s, 1, [{}, { rescue: false }]);
  assert.equal(s.players[0].hp, 0);
  tick(s, 2.1, [{}, { rescue: true }]);
  assert.equal(s.players[0].hp, 2);
  assert(s.players[0].inv > 0);
});
test("Rettung aus der Ferne wirkt nicht", () => {
  const s = createState();
  start(s);
  Object.assign(s.players[0], { hp: 0, down: 20, x: -6 });
  s.players[1].x = 6;
  tick(s, 3, [{}, { rescue: true }]);
  assert.equal(s.players[0].hp, 0);
});
test("Wenn beide ausfallen, endet der gemeinsame Flug", () => {
  const s = createState();
  start(s);
  s.players.forEach((p) => Object.assign(p, { hp: 0, down: 20 }));
  step(s, [{}, {}], 0.016);
  assert.equal(s.phase, "failed");
});
test("Rettungsfrist läuft ab und Pause hält Zeit und Eingaben an", () => {
  const s = createState();
  start(s);
  Object.assign(s.players[0], { hp: 0, down: 0.1 });
  tick(s, 0.2);
  assert.equal(s.phase, "failed");
  s.phase = "paused";
  const old = snapshot(s);
  tick(s, 5, [{ axis: 1 }, { axis: -1 }]);
  assert.deepEqual(snapshot(s), old);
});
test("Ungültige Eingaben beschädigen keine Koordinaten", () => {
  const s = createState();
  start(s);
  tick(s, 1, [{ axis: Infinity, target: NaN }, { axis: 999 }]);
  assert(Number.isFinite(s.players[0].x));
  assert(s.players[1].x <= 9);
  step(s, [{}, {}], NaN);
  assert(Number.isFinite(s.t));
});
test("Snapshots sind unabhängig und prüfen Protokoll und Zahlen", () => {
  const s = createState();
  const p = snapshot(s);
  p.players[0].hp = 0;
  assert.equal(s.players[0].hp, 3);
  assert(validSnapshot(snapshot(s)));
  assert(!validSnapshot({ ...p, level: 99 }));
  assert(!validSnapshot({ ...p, t: NaN }));
});
test("Nur das letzte Leuchtfeuer führt zum Kampagnensieg", () => {
  for (let level = 0; level < 3; level++) {
    const s = createState(level);
    start(s);
    tick(s, LEVELS[level].duration + 1);
    assert.equal(s.phase, level === 2 ? "victory" : "result");
  }
});

test("Am Rand stehen bleiben umgeht die Hindernisse nicht", () => {
  const s = createState();
  start(s);
  tick(s, 91, [{ target: -9 }, { target: 9 }]);
  assert.equal(s.phase, "failed");
});
