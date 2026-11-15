import test from "node:test";
import assert from "node:assert/strict";
import {
  frameTime,
  PresentationClock,
  predictPilot,
  AdaptiveScale,
  SnapshotGate,
} from "../../js/neon-flug/timing.mjs";
import { createState, start, step } from "../../js/neon-flug/core.mjs";
test("Zehn langsame Frames verlieren keine halbe Sekunde Spielzeit", () => {
  const s = createState();
  start(s);
  let accumulator = 0;
  for (let i = 0; i < 10; i++) {
    accumulator += frameTime(0.1).seconds;
    while (accumulator >= 1 / 60) {
      step(s, [{}, {}], 1 / 60);
      accumulator -= 1 / 60;
    }
  }
  assert(Math.abs(s.t - 1) < 0.017);
});
test("Ein echter Hänger wird als Unterbrechung behandelt statt blind nachgespielt", () => {
  assert.deepEqual(frameTime(2), { seconds: 0, stalled: true });
  assert.equal(frameTime(0.25).seconds, 0.25);
  assert(frameTime(NaN).stalled);
});
test("Verspätete Snapshots bewegen die Welt nicht rückwärts", () => {
  const c = new PresentationClock();
  const s = { level: 0, phase: "playing", t: 2 };
  c.sample(s, 0, 0);
  let prev = 0;
  for (let now = 16; now < 500; now += 16) {
    const v = c.sample(
      { ...s, t: now < 160 ? 2 : 2.08 },
      now < 160 ? 0 : 160,
      now,
    );
    assert(v >= prev);
    prev = v;
  }
  assert(prev <= 2.28 + 1e-9);
});
test("Ohne neue Snapshots läuft die Darstellung höchstens 200 ms voraus", () => {
  const c = new PresentationClock();
  c.sample({ level: 0, phase: "playing", t: 3 }, 0, 0);
  assert(c.sample({ level: 0, phase: "playing", t: 3 }, 0, 10000) <= 3.2);
});
test("Neues Level setzt die Präsentationszeit zurück", () => {
  const c = new PresentationClock();
  c.sample({ level: 0, phase: "playing", t: 80 }, 0, 0);
  assert.equal(c.sample({ level: 1, phase: "briefing", t: 0 }, 100, 100), 0);
});
test("Eigene Steuerung wird visuell vorhergesagt, ohne den autoritativen Spieler zu verändern", () => {
  const p = createState().players[0],
    x = p.x;
  assert(predictPilot(p, { axis: 1 }, 0.1).x > x);
  assert.equal(p.x, x);
  assert.equal(predictPilot({ ...p, x: 8.9 }, { axis: 1 }, 0.2).x, 9);
  assert.equal(predictPilot({ ...p, hp: 0 }, { axis: 1 }, 0.2).x, p.x);
});
test("Automatische Grafik reagiert auf dauerhafte Last und erholt sich erst nach stabilen Frames", () => {
  const a = new AdaptiveScale();
  for (let i = 0; i < 120; i++) a.sample(1 / 20);
  assert(a.scale < 1);
  const low = a.scale;
  for (let i = 0; i < 60; i++) a.sample(1 / 60);
  assert.equal(a.scale, low);
  for (let i = 0; i < 1100; i++) a.sample(1 / 60);
  assert(a.scale > low);
});
test("Einzelner langer Frame schaltet die Grafik nicht hin und her", () => {
  const a = new AdaptiveScale();
  for (let i = 0; i < 120; i++) a.sample(1 / 60);
  a.sample(0.2);
  for (let i = 0; i < 30; i++) a.sample(1 / 60);
  assert.equal(a.scale, 1);
});

test("Verspätete oder doppelte schnelle Snapshots überschreiben keinen neueren Spielzustand", () => {
  const g = new SnapshotGate();
  assert(g.accept(2));
  assert(!g.accept(1));
  assert(!g.accept(2));
  assert(!g.accept(NaN));
  assert(!g.accept(undefined));
  assert(g.accept(3));
  g.reset();
  assert(g.accept(1));
});
test("Alte zuverlässige Hosts bleiben nur ohne gemischte Sequenzfolgen lesbar", () => {
  const g = new SnapshotGate();
  assert(g.accept(undefined));
  assert(g.accept(undefined));
  assert(g.accept(5));
  assert(!g.accept(undefined));
});
