import test from "node:test";
import assert from "node:assert/strict";
import {
  profile,
  loadout,
  nickname,
  award,
  rank,
} from "../../js/neon-flug/profile.mjs";
test("Neue Piloten starten mit spielbarer Rolle ohne künstlichen Fortschritt", () => {
  const p = profile(null);
  assert.equal(p.xp, 0);
  assert.equal(rank(p.xp), 1);
  assert.equal(p.mod, "none");
});
test("Gesperrte Module und ungültige Rollen werden verworfen", () => {
  assert.equal(profile({ xp: 0, role: "pulse", mod: "anchor" }).mod, "none");
  assert.deepEqual(loadout({ role: "__proto__", mod: "constructor" }), {
    role: "navigator",
    mod: "none",
  });
});
test("Rufnamen werden begrenzt und Kontrollzeichen entfernt", () => {
  assert.equal(nickname(" <Max>\n "), "Max");
  assert.equal(nickname("x".repeat(100)).length, 18);
  assert.equal(nickname({}), "Pilot");
});
test("Abschluss vergibt nachvollziehbare XP und schaltet das erste Modul frei", () => {
  const r = award(profile(null), { phase: "result", duets: 2, rescues: 1 });
  assert.equal(r.gained, 170);
  assert(r.unlocked.includes("capacitor"));
  assert.equal(r.profile.missions, 1);
});
test("Niederlage vergibt keine Abschlussbelohnung und verändert das Profil nicht", () => {
  const p = profile({ name: "Pilotin", xp: 260, mod: "focus", missions: 2 });
  assert.deepEqual(award(p, { phase: "failed" }).profile, p);
  assert.equal(award(p, { phase: "failed" }).gained, 0);
});
test("Ungültiger Speicher erzeugt weder negative noch unendliche Erfahrung", () => {
  for (const xp of [Infinity, -9, NaN]) assert.equal(profile({ xp }).xp, 0);
});
