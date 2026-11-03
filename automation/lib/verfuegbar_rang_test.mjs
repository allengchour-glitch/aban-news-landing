import assert from 'node:assert/strict';
import { verfuegbar, zielReihenfolge, zuege, ausverkauftVorn, anteilVorn, istVerfuegbarVorn } from './verfuegbar_rang.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const B = obj => new Map(Object.entries(obj));
/** Spielt Verschiebungen wie Shopify ab (nacheinander, jeweils auf dem Zwischenstand). */
const abspielen = (ist, moves) => { const a = [...ist]; for (const m of moves) { const von = a.indexOf(m.id); a.splice(von, 1); a.splice(Number(m.newPosition), 0, m.id); } return a; };

t('verfügbar heisst aktiv und Bestand über 0', () => { const b = B({ a: 3, b: 0, c: null, d: -2 }); assert.deepEqual(['a', 'b', 'c', 'd', 'x'].map(i => verfuegbar(b, i)), [true, false, false, false, false]); });
t('Produkte ohne Bestandsführung (CJ: Bestand 0, aber kaufbar) kommen als Infinity an und zählen als verfügbar', () => assert.equal(verfuegbar(B({ a: Infinity }), 'a'), true));
t('Gegenprobe: Bestand 0 ist NICHT verfügbar (0 ist in JavaScript falsy, hier aber gewollt)', () => assert.equal(verfuegbar(B({ a: 0 }), 'a'), false));
t('ein Bestand als Zeichenkette zählt nicht als verfügbar (die API liefert nur Zahlen oder null)', () => assert.equal(verfuegbar(B({ a: '5' }), 'a'), false));
t('Teilung ist stabil: Reihenfolge innerhalb der Gruppen bleibt', () => assert.deepEqual(zielReihenfolge(['a', 'b', 'c', 'd', 'e'], B({ a: 0, b: 5, c: 0, d: 1, e: 9 })), ['b', 'd', 'e', 'a', 'c']));
t('Entwürfe (null) und unbekannte IDs gehen ans Ende', () => assert.deepEqual(zielReihenfolge(['d', 'a', 'x'], B({ d: null, a: 2 })), ['a', 'd', 'x']));
t('schon sortiert: keine Verschiebung nötig', () => assert.deepEqual(zuege(['a', 'b', 'c'], ['a', 'b', 'c']), []));
t('Verschiebungen führen, nacheinander abgespielt, genau zur Zielreihenfolge', () => {
  const ist = ['a', 'b', 'c', 'd', 'e', 'f'], b = B({ a: 0, b: 5, c: 0, d: 1, e: 0, f: 9 });
  const ziel = zielReihenfolge(ist, b);
  assert.deepEqual(abspielen(ist, zuege(ist, ziel)), ziel);
});
t('Zufallsprobe: 200 Mischungen enden immer in der Zielreihenfolge', () => {
  let s = 7; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 200; k++) {
    const ist = Array.from({ length: 30 }, (_, i) => `p${i}`);
    for (let i = ist.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ist[i], ist[j]] = [ist[j], ist[i]]; }
    const b = new Map(ist.map(id => [id, r() < 0.3 ? 0 : r() < 0.1 ? null : 1 + Math.floor(r() * 9)]));
    const ziel = zielReihenfolge(ist, b), z = zuege(ist, ziel);
    assert.deepEqual(abspielen(ist, z), ziel); assert.ok(z.length <= ist.length);
  }
});
t('Positionen sind Zeichenketten (UnsignedInt64 in der API)', () => assert.equal(typeof zuege(['a', 'b'], ['b', 'a'])[0].newPosition, 'string'));
t('Mutation: eine falsch abgespielte Liste wird erkannt (Gegenprobe des Prüfers)', () => {
  const ist = ['a', 'b', 'c'], ziel = ['c', 'a', 'b'];
  assert.notDeepEqual(abspielen(ist, [{ id: 'c', newPosition: '1' }]), ziel);
});
t('ausverkauft vorn zählt nur aktive Produkte (Entwürfe sind im Shop unsichtbar)', () => {
  const ids = ['e1', 'e2', 'a', 'b', 'c'], b = B({ e1: null, e2: null, a: 0, b: 4, c: 0 });
  assert.deepEqual(ausverkauftVorn(ids, b, 48), { von: 3, aus: 2 });
});
t('ausverkauft vorn schaut nur auf die ersten n aktiven', () => assert.deepEqual(ausverkauftVorn(['a', 'b', 'c'], B({ a: 1, b: 0, c: 0 }), 2), { von: 2, aus: 1 }));
t('Anteil: leere Collection ergibt 0 statt NaN', () => assert.equal(anteilVorn([], new Map()), 0));
t('Anteil: halb ausverkauft', () => assert.equal(anteilVorn(['a', 'b'], B({ a: 0, b: 3 })), 0.5));
t('Nachlese: alles Verfügbare vor allem Übrigen', () => {
  const b = B({ a: 1, b: 2, c: 0, d: null });
  assert.equal(istVerfuegbarVorn(['a', 'b', 'c', 'd'], b), true);
  assert.equal(istVerfuegbarVorn(['a', 'c', 'b', 'd'], b), false);
  assert.equal(istVerfuegbarVorn(['c', 'd'], b), true);
  assert.equal(istVerfuegbarVorn([], b), true);
});

if (!process.exitCode) console.log(`verfuegbar_rang_test: ${n} Prüfungen ok`);
