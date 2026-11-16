'use strict';
const assert = require('node:assert/strict');
const TR = require('../../js/dungeon-trials/state.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('OK ' + name); }
function phase(level, type, cycle = 0, offset = 0.1) {
  const d = TR.definitions[level], duration = d.warn + d.attack + d.open + d.rest;
  return TR.sample(level, 2 + cycle * duration + (type === 'attack' ? d.warn : type === 'open' ? d.warn + d.attack : 0) + offset, true);
}
test('Stein: beide Ringfronten verletzen nur am Boden', () => {
  const s = phase(0, 'attack', 0, 2);
  for (const radius of s.radii) { assert.equal(TR.safe(s, radius, 0, -4), false); assert.equal(TR.safe(s, radius, 0.7, -4), true); }
  assert.equal(TR.safe(s, 0, 0, 10), true);
});
test('Eis: vier gerichtete Deckungen; Sprünge im Frost helfen nicht', () => {
  for (let cycle = 0; cycle < 8; cycle++) {
    const s = phase(1, 'attack', cycle), dx = Math.cos(s.direction), dz = Math.sin(s.direction);
    assert.equal(TR.safe(s, dx * 9, 0, dz * 9), true);
    assert.equal(TR.safe(s, -dx * 9, 3, -dz * 9), false);
    assert.equal(TR.safe(s, dx * 4, 0, dz * 4), false);
  }
});
test('Lava: Sektor wandert; Mitte, Gegenrichtung und Sprünge sind unsicher', () => {
  const a = phase(2, 'attack', 0, 0.1), b = phase(2, 'attack', 0, 5.9);
  assert.ok(b.direction - a.direction > 1.2);
  for (const s of [a, b]) { assert.equal(TR.safe(s, Math.cos(s.direction) * 8, 0, Math.sin(s.direction) * 8), true); assert.equal(TR.safe(s, 0, 3, 0), false); assert.equal(TR.safe(s, -Math.cos(s.direction) * 8, 3, -Math.sin(s.direction) * 8), false); }
  assert.equal(TR.safe(b, Math.cos(a.direction) * 8, 0, Math.sin(a.direction) * 8), false);
});
test('Warnung und Öffnung sind schadensfrei; jede Prüfung gewährt ein langes Fenster', () => {
  for (let level = 0; level < 3; level++) { const d = TR.definitions[level]; assert.ok(d.warn >= 2.4); assert.ok(d.open >= 5.5); assert.equal(TR.safe(phase(level, 'warn'), 0, 0, 0), true); assert.equal(TR.safe(phase(level, 'open'), 0, 0, 0), true); }
});
test('Laufgeschwindigkeit reicht für Deckungswechsel, Wandersektor und Faustfenster', () => {
  const speed = 6.2;
  assert.ok(21 / speed < TR.definitions[1].warn); // Selbst vom gegenüberliegenden Arenarand.
  assert.ok(21 / speed < TR.definitions[2].warn);
  assert.ok(12 * 0.22 < speed); // Sektor am äussersten Rand verfolgen.
  for (const d of TR.definitions) assert.ok(15 / speed + 0.6 < d.open);
});
test('Feste Zeit ergibt ohne Zufall identische Phasen über viele Zyklen', () => {
  const random = Math.random; Math.random = () => { throw Error('Zufall in Prüfungslogik'); };
  try { for (let level = 0; level < 3; level++) for (let i = 0; i < 5000; i++) assert.deepEqual(TR.sample(level, i / 20, true), TR.sample(level, i / 20, true)); } finally { Math.random = random; }
});
test('Nur Start aktiviert die Uhr; Frame-Aufteilung ändert kein Muster', () => {
  const a = TR.create(1, 'r'), b = TR.create(1, 'r'); TR.tick(a, 9); assert.equal(a.time, 0); TR.enter(a); TR.enter(b);
  for (let i = 0; i < 100; i++) TR.tick(a, 0.05); TR.tick(b, 5); assert.ok(Math.abs(a.time - b.time) < 1e-12); assert.equal(TR.sample(1, a.time, true).phase, TR.sample(1, b.time, true).phase);
});
test('Snapshots: Sequenz, Runde, Ebene und Schema verhindern Rücksprünge', () => {
  const host = TR.create(2, 'r'), guest = TR.create(2, 'r'); TR.enter(host); TR.tick(host, 8); const old = TR.snapshot(host); TR.tick(host, 1); const fresh = TR.snapshot(host);
  assert.equal(TR.receive(guest, fresh), true); assert.deepEqual(TR.sample(2, guest.time, true), TR.sample(2, host.time, true));
  for (const packet of [old, fresh, { ...fresh, seq: 80, run: 'old' }, { ...fresh, seq: 80, time: NaN }, { ...fresh, seq: 80, level: 1 }, { ...fresh, seq: 80, hp: -1 }, { ...fresh, seq: 80, hits: [null, null] }, { ...fresh, seq: 80, v: 0 }]) assert.equal(TR.receive(guest, packet), false);
  fresh.hits[0] = 999; assert.equal(guest.hits[0], -1);
});
test('Host validiert Phase, Entfernung, Runde, Waffe und einen Treffer je Person/Zyklus', () => {
  const state = TR.create(0, 'r'); TR.enter(state);
  const req = { run: 'r', cycle: 0, slot: 0, weapon: 0, x: -2.35, y: 0, z: -1 };
  assert.equal(TR.hit(state, req), 0); state.time = 2 + TR.definitions[0].warn + TR.definitions[0].attack + 1;
  for (const bad of [{ ...req, x: 50 }, { ...req, y: 99 }, { ...req, run: 'old' }, { ...req, cycle: 99 }, { ...req, weapon: 8 }, { ...req, slot: 2 }]) assert.equal(TR.hit(state, bad), 0);
  assert.equal(TR.hit(state, req), 1); assert.equal(TR.hit(state, req), 0); assert.equal(TR.hit(state, { ...req, slot: 1 }), 2); assert.equal(state.hp, 3);
  state.hp = 0; TR.heal(state); assert.equal(state.hp, 0); assert.equal(TR.hit(state, req), 0);
});
test('Rekorde trennen Ebene, Solo/Koop und Meister; Niederlagen überschreiben nichts', () => {
  const map = new Map(), storage = { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v) };
  for (let l = 0; l < 3; l++) for (const master of [false, true]) for (const online of [false, true]) assert.equal(TR.record(storage, l, master, online, 80 + l, 200, true).best, true);
  assert.equal(map.size, 12); assert.equal(TR.record(storage, 0, false, false, 90, 250, true).best, false); assert.equal(TR.record(storage, 0, false, false, 1, 999, false).value.time, 80);
  assert.equal(TR.record(storage, 0, false, false, 70, 220, true).value.score, 250);
  assert.doesNotThrow(() => TR.record(null, 0, false, false, 10, 200, true));
});
console.log(passed + ' ok, 0 Fehler');
