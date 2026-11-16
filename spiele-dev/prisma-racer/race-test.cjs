"use strict";
const assert = require("node:assert/strict");
require("../../js/prisma-racer/race.js");
const R = global.PrismaRace;
let checks = 0;
function test(n, f) {
  f();
  checks++;
  console.log("OK " + n);
}
test("18 verschiedene verankerte Tore in drei Sektoren, Zeichen und Seiten wiederholbar", () => {
  const a = R.create(),
    b = R.create();
  assert.deepEqual(a, b);
  assert.equal(a.gates.length, 18);
  assert.equal(new Set(a.gates.map((g) => g.d)).size, 18);
  assert(
    a.gates.every(
      (g) => g.d > 0 && g.d < R.length && Math.abs(g.offset) + 2.55 < 7,
    ),
  );
  assert.deepEqual([...new Set(a.gates.map((g) => g.polarity))].sort(), [0, 1]);
});
test("Durchfahren bei 30/60/120 Schritten pro Sekunde ergibt gleiche Tore und Energie", () => {
  const all = [];
  for (const fps of [30, 60, 120]) {
    let s = R.create(),
      d = 0;
    for (let f = 0; f < fps * 50; f++) {
      const g = s.gates.find((q) => !q.resolved),
        old = d;
      d = Math.min(R.length, d + 80 / fps);
      s.polarity = g ? g.polarity : 0;
      R.advance(s, 1 / fps, old, d, g ? g.offset : 0);
    }
    all.push({
      matched: s.matched,
      missed: s.missed,
      charge: s.charge,
      chain: s.bestChain,
    });
  }
  assert.deepEqual(all, [all[0], all[0], all[0]]);
  assert.equal(all[0].matched, 18);
  assert.equal(all[0].charge, 3);
});
test("Segmentüberquerung zählt ein Tor genau einmal, auch bei großen Schritten", () => {
  const s = R.create();
  s.polarity = s.gates[0].polarity;
  assert.equal(R.advance(s, 0.1, 150, 180, 0)[0].kind, "match");
  R.advance(s, 0.1, 150, 180, 0);
  assert.equal(s.matched, 1);
});
test("Falscher Pol und seitlich verpasst unterscheiden sich, Serie endet", () => {
  let s = R.create();
  assert.equal(R.advance(s, 0.1, 150, 170, 0)[0].kind, "wrong");
  s = R.create();
  assert.equal(R.advance(s, 0.1, 150, 170, 6)[0].kind, "miss");
  assert.equal(s.missed, 1);
  assert.equal(s.charge, 0);
});
test("Umschalt-Sperre läuft nur durch Simulation ab; Boost braucht drei Treffer", () => {
  const s = R.create();
  assert(R.flip(s));
  assert(!R.flip(s));
  assert(!R.boost(s));
  R.advance(s, 0.1, 0, 0, 0);
  assert(!R.flip(s));
  R.advance(s, 0.13, 0, 0, 0);
  assert(R.flip(s));
  s.charge = 3;
  assert(R.boost(s));
  assert.equal(s.charge, 0);
  assert(!R.boost(s));
});
test("Ergebnis einmalig, Nullschild gewinnt nicht; alle Medaillenschwellen", () => {
  for (const [hits, medal] of [
    [8, "Bronze"],
    [11, "Bronze"],
    [12, "Silber"],
    [15, "Silber"],
    [16, "Gold"],
    [18, "Gold"],
  ]) {
    const s = R.create();
    s.matched = hits;
    const r = R.result(s, 90, 8, R.length);
    assert(r.won);
    assert.equal(r.medal, medal);
    assert.equal(R.result(s, 90, 8, R.length), null);
    assert(!R.flip(s));
  }
  assert(!R.result(R.create(), 0, 0, R.length).won);
  assert(!R.result(R.create(), 100, 0, 100).won);
});
test("Ohne acht Resonanzen gibt es auch bei voller Schildenergie im Ziel keinen Sieg",()=>{
  for(const hits of [0,1,7]){const s=R.create();s.matched=hits;const r=R.result(s,100,99,R.length);assert.equal(r.won,false);assert.equal(r.medal,"Keine");assert.equal(r.qualified,false);}
});
test("Endlos bleibt ohne Tore und Zieleinlauf, bestehende Profilwerte unverändert", () => {
  const s = R.create("endless");
  assert.deepEqual(R.advance(s, 60, 0, 9999, 0), []);
  const p = { runs: 2, wins: 1, bestScore: 500, bestTime: 44, gateRecord: 12 };
  assert.deepEqual(R.record(p, R.result(s, 100, 5, 9999)), p);
});
test("Profil: nur fertige Rallyes verbessern Rekorde, beschädigte Daten begrenzt", () => {
  let p = R.profile(null);
  let s = R.create();
  s.time = 52;
  s.matched = 16;
  const r = R.result(s, 60, 8, R.length);
  p = R.record(p, r);
  assert.equal(p.wins, 1);
  assert.equal(p.runs, 1);
  assert.equal(p.bestTime, 52);
  const lost = R.create();
  lost.time = 8;
  p = R.record(p, R.result(lost, 0, 0, 100));
  assert.equal(p.runs, 2);
  assert.equal(p.wins, 1);
  assert.equal(p.bestTime, 52);
  assert.deepEqual(
    R.profile({
      runs: NaN,
      wins: Infinity,
      bestScore: -1,
      bestTime: NaN,
      gateRecord: 999,
    }),
    { runs: 0, wins: 0, bestScore: 0, bestTime: 0, gateRecord: 18 },
  );
});
console.log(checks + " ok, 0 Fehler");
