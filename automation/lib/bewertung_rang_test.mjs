import assert from 'node:assert/strict';
import { wert, rangliste, bewegungen, bewertungAus, MIN_STERNE } from './bewertung_rang.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const B = obj => new Map(Object.entries(obj));
const M = (...ids) => ids.map(id => ({ id }));

t('eine einzelne 5 schlägt nicht 4,8 aus vierzehn Stimmen', () => assert.ok(wert(5, 1) < wert(4.8, 14)));
t('Gegenprobe: bei gleicher Stimmenzahl gewinnt das höhere Mittel', () => assert.ok(wert(4.9, 5) > wert(4.5, 5)));
t('Rangfolge: viele gute Stimmen vor einer einzelnen', () => assert.deepEqual(rangliste(B({ a: { a: 5, c: 1 }, b: { a: 4.8, c: 14 }, c: { a: 4.3, c: 3 } }), M('a', 'b', 'c')), ['b', 'a', 'c']));
t('unter 4 Sternen wird nie nach vorn gehoben', () => assert.deepEqual(rangliste(B({ a: { a: 3.9, c: 30 }, b: { a: 4, c: 1 } }), M('a', 'b')), ['b']));
t('Gegenprobe: genau 4,0 Sterne zählt', () => assert.equal(MIN_STERNE, 4.0));
t('Produkte ohne Bewertung fehlen in der Rangliste', () => assert.deepEqual(rangliste(B({ a: { a: 5, c: 2 } }), M('a', 'x', 'y')), ['a']));
t('nur Mitglieder der Collection kommen vor', () => assert.deepEqual(rangliste(B({ a: { a: 5, c: 2 }, fremd: { a: 5, c: 99 } }), M('a')), ['a']));
t('Höchstzahl wird eingehalten', () => assert.equal(rangliste(B(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`p${i}`, { a: 5, c: i + 1 }]))), M(...Array.from({ length: 10 }, (_, i) => `p${i}`)), { max: 4 }).length, 4));
t('Gleichstand ist stabil (Stimmen, dann ID)', () => assert.deepEqual(rangliste(B({ b: { a: 5, c: 4 }, a: { a: 5, c: 4 } }), M('b', 'a')), ['a', 'b']));
t('leere Eingaben stürzen nicht', () => { assert.deepEqual(rangliste(new Map(), []), []); assert.deepEqual(bewegungen([], []), []); });

t('Bewegungen: erst bewertet, dann Bestseller, ohne Doppelte, Positionen lückenlos', () => {
  const m = bewegungen(['r1', 'r2'], ['r2', 'b1', 'b2']);
  assert.deepEqual(m.map(x => x.id), ['r1', 'r2', 'b1', 'b2']); assert.deepEqual(m.map(x => x.newPosition), ['0', '1', '2', '3']);
});
t('Bewegungen: Bestseller-Anteil ist begrenzt', () => assert.equal(bewegungen([], Array.from({ length: 300 }, (_, i) => `b${i}`), { nachBestseller: 50 }).length, 50));
t('Positionen sind Zeichenketten (UnsignedInt64 in der API)', () => assert.equal(typeof bewegungen(['a'], [])[0].newPosition, 'string'));

t('Judge.me-Feld: gültig', () => assert.deepEqual(bewertungAus('{"number_of_reviews":7,"average_rating":"4.86"}'), { a: 4.86, c: 7 }));
t('Judge.me-Feld: null Bewertungen → null', () => assert.equal(bewertungAus('{"number_of_reviews":0,"average_rating":"0.00"}'), null));
t('Judge.me-Feld: Müll → null', () => { assert.equal(bewertungAus('kein json'), null); assert.equal(bewertungAus(null), null); assert.equal(bewertungAus('{}'), null); });

console.log(`bewertung_rang_test: ${n} ok`);
