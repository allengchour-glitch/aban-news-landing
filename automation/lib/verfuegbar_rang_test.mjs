import assert from 'node:assert/strict';
import { verfuegbar, zielReihenfolge, zuege, ausverkauftVorn, anteilVorn, istVerfuegbarVorn, pinKopf, pinBefunde, kopfStimmt, zielMitPins, planen, nachleseOk, MAX_KOPF, mitSichtbarkeit, befundeMitSichtbarkeit } from './verfuegbar_rang.mjs';
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


// ── Schaufenster-Pins (11.11.2026) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const VOLL = B({ a: 5, b: 0, c: 3, d: Infinity, e: 2, f: 0, g: null, h: 7 });   // b, f ausverkauft; g Entwurf
t('Pin-Kopf: Reihenfolge der Pin-Liste, nicht die der Collection', () => assert.deepEqual(pinKopf(IDS, VOLL, ['h', 'c', 'a']), ['h', 'c', 'a']));
t('Pin-Kopf: ausverkaufte, inaktive und fremde Pins fallen weg, die übrigen rücken auf', () => { assert.deepEqual(pinKopf(IDS, VOLL, ['b', 'h', 'g', 'e']), ['h', 'e']); assert.deepEqual(pinKopf(IDS, VOLL, ['x', 'a']), ['a']); });
t('Pin-Kopf: nur die ersten 4 Einträge der Pin-Liste zählen (ein 5. rückt nicht nach)', () => assert.deepEqual(pinKopf(IDS, VOLL, ['b', 'h', 'g', 'x', 'e']), ['h']));
t('Pin-Kopf: Produkte ohne Bestandsführung (Infinity) zählen als verfügbar', () => assert.deepEqual(pinKopf(IDS, VOLL, ['d']), ['d']));
t('Pin-Kopf: höchstens 4, Doppelte nur einmal', () => { assert.equal(MAX_KOPF, 4); assert.deepEqual(pinKopf(IDS, VOLL, ['a', 'a', 'c', 'd', 'e', 'h']), ['a', 'c', 'd']); assert.deepEqual(pinKopf(IDS, VOLL, ['a', 'c', 'd', 'e', 'h']), ['a', 'c', 'd', 'e']); });
t('Pin-Befunde nennen den Grund je Pin', () => assert.deepEqual(pinBefunde(IDS, VOLL, ['a', 'b', 'g', 'x']), [{ id: 'b', grund: 'ausverkauft' }, { id: 'g', grund: 'nicht aktiv' }, { id: 'x', grund: 'kein Mitglied' }]));
t('Pin-Befunde: alles in Ordnung ergibt keine Befunde', () => assert.deepEqual(pinBefunde(IDS, VOLL, ['a', 'c', 'd', 'h']), []));
t('Ziel voll: Pins vorn, danach die stabile Teilung des Rests', () => assert.deepEqual(zielMitPins(IDS, VOLL, ['h', 'c']), ['h', 'c', 'a', 'd', 'e', 'b', 'f', 'g']));
t('Ziel voll ohne Pins = alte Teilung (Verhalten wie vorher)', () => assert.deepEqual(zielMitPins(IDS, VOLL, []), zielReihenfolge(IDS, VOLL)));
t('Ziel voll: ein ausverkaufter Pin rückt nach hinten wie jedes ausverkaufte Produkt', () => { const z = zielMitPins(IDS, VOLL, ['b', 'h']); assert.deepEqual(z.slice(0, 1), ['h']); assert.ok(z.indexOf('b') > z.indexOf('e')); });
t('Ziel nur Kopf: Pins vorn, der Rest bleibt in seiner Reihenfolge (auch ausverkaufte Nicht-Pins bleiben, wo sie sind)', () => assert.deepEqual(zielMitPins(IDS, VOLL, ['h', 'c'], { voll: false }), ['h', 'c', 'a', 'b', 'd', 'e', 'f', 'g']));
t('Ziel nur Kopf: ein ausverkaufter Pin geht ans Ende', () => assert.deepEqual(zielMitPins(['b', 'a', 'c'], B({ a: 1, b: 0, c: 2 }), ['b', 'c'], { voll: false }), ['c', 'a', 'b']));
t('Ziel nur Kopf ohne Pins = unverändert', () => assert.deepEqual(zielMitPins(IDS, VOLL, [], { voll: false }), IDS));
t('Kopf stimmt: Pins genau vorn in Pin-Reihenfolge', () => { assert.equal(kopfStimmt(['h', 'c', 'a'], VOLL, ['h', 'c']), true); assert.equal(kopfStimmt(['c', 'h', 'a'], VOLL, ['h', 'c']), false); assert.equal(kopfStimmt(['a', 'h', 'c'], VOLL, ['h', 'c']), false); });
t('Kopf stimmt nicht, solange ein ausverkaufter Pin vor einem verfügbaren Produkt steht', () => { const b = B({ a: 1, b: 0, c: 2, z: 0 }); assert.equal(kopfStimmt(['c', 'b', 'a', 'z'], b, ['c', 'b']), false); assert.equal(kopfStimmt(['c', 'a', 'b', 'z'], b, ['c', 'b']), true); assert.equal(kopfStimmt(['c', 'a', 'z', 'b'], b, ['c', 'b']), true); });
t('Kopf stimmt ohne Pins immer, auch ohne verfügbare Produkte', () => { assert.equal(kopfStimmt(IDS, VOLL, []), true); assert.equal(kopfStimmt(['b', 'f'], VOLL, ['b']), true); });
t('Planen ohne Pins: gleiche Entscheidung wie die alte Regel', () => {
  // alte Regel: nichts, wenn Anteil < Schwelle oder (Schwelle 0 und nichts ausverkauft und schon sortiert); sonst Teilung
  let s = 11; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 300; k++) {
    const ids = Array.from({ length: 5 + Math.floor(r() * 40) }, (_, i) => `p${i}`);
    const b = new Map(ids.map(id => [id, r() < 0.25 ? 0 : r() < 0.1 ? null : r() < 0.3 ? Infinity : 1 + Math.floor(r() * 9)]));
    for (const schwelle of [0, 0.1, 0.2]) {
      const alt = (anteilVorn(ids, b) < schwelle || (schwelle === 0 && ausverkauftVorn(ids, b).aus === 0 && istVerfuegbarVorn(ids, b))) ? 'nichts' : 'voll';
      const p = planen(ids, b, [], schwelle);
      assert.equal(p.aktion, alt); assert.deepEqual(p.ziel, alt === 'voll' ? zielReihenfolge(ids, b) : ids);
    }
  }
});
t('Planen: unter der Schwelle und Kopf falsch → nur Kopf, der Rest bleibt', () => { const p = planen(['a', 'c', 'h'], B({ a: 1, c: 1, h: 1 }), ['h'], 0.2); assert.equal(p.aktion, 'nurKopf'); assert.deepEqual(p.ziel, ['h', 'a', 'c']); });
t('Planen: unter der Schwelle und Kopf stimmt → nichts', () => assert.equal(planen(['h', 'a', 'c'], B({ a: 1, c: 1, h: 1 }), ['h'], 0.2).aktion, 'nichts'));
t('Planen: über der Schwelle → volle Teilung mit Pins vorn', () => { const p = planen(['b', 'f', 'a', 'h'], B({ a: 1, b: 0, f: 0, h: 2 }), ['h'], 0.1); assert.equal(p.aktion, 'voll'); assert.deepEqual(p.ziel, ['h', 'a', 'b', 'f']); });
t('Planen mit Schwelle 0: sortiert und Kopf stimmt → nichts; Kopf falsch → nur Kopf', () => { const b = B({ a: 1, h: 2 }); assert.equal(planen(['h', 'a'], b, ['h'], 0).aktion, 'nichts'); assert.equal(planen(['a', 'h'], b, ['h'], 0).aktion, 'nurKopf'); });
t('Planen meldet Befunde und den Kopf', () => { const p = planen(['a', 'b'], B({ a: 1, b: 0 }), ['b', 'a', 'x'], 0.9); assert.deepEqual(p.kopf, ['a']); assert.deepEqual(p.befunde.map(x => x.grund), ['ausverkauft', 'kein Mitglied']); });
t('Zufallsprobe mit Pins: Züge führen zum Ziel, danach stimmt die Nachlese und ein zweiter Plan ist «nichts»', () => {
  let s = 5; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 300; k++) {
    const ids = Array.from({ length: 6 + Math.floor(r() * 50) }, (_, i) => `p${i}`);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const b = new Map(ids.map(id => [id, r() < 0.3 ? 0 : r() < 0.1 ? null : 1 + Math.floor(r() * 9)]));
    const pins = Array.from({ length: 1 + Math.floor(r() * 4) }, () => r() < 0.1 ? 'fremd' : ids[Math.floor(r() * ids.length)]);
    const schwelle = [0, 0.1, 0.2, 0.9][Math.floor(r() * 4)];
    const p = planen(ids, b, pins, schwelle);
    if (p.aktion === 'nichts') { assert.equal(kopfStimmt(ids, b, pins), true); continue; }
    const nach = abspielen(ids, zuege(ids, p.ziel));
    assert.deepEqual(nach, p.ziel);
    assert.deepEqual(nach.slice(0, p.kopf.length), p.kopf);
    assert.equal(nachleseOk(nach, b, pins, p.aktion === 'voll'), true);
    assert.equal(planen(nach, b, pins, schwelle).aktion === 'nurKopf', false, 'nach dem Umstellen darf kein weiterer Kopf-Zug nötig sein');
  }
});
t('Nachlese: Kopf falsch → nicht ok; volle Teilung verlangt zusätzlich «verfügbar vorn»', () => { const b = B({ a: 1, b: 0, h: 1 }); assert.equal(nachleseOk(['a', 'h', 'b'], b, ['h'], false), false); assert.equal(nachleseOk(['h', 'b', 'a'], b, ['h'], false), true); assert.equal(nachleseOk(['h', 'b', 'a'], b, ['h'], true), false); assert.equal(nachleseOk(['h', 'a', 'b'], b, ['h'], true), true); assert.equal(nachleseOk(['h', 'a', 'b'], b, [], true), true); });

// Sichtbarkeit (15.11.2026): ein Pin, der nicht im Onlineshop veröffentlicht ist, darf keinen Kopfplatz belegen
t('Sichtbarkeit: ohne unsichtbare Pins derselbe Bestand (gleiches Objekt, Verhalten wie vorher)', () => { const b = B({ a: 1 }); assert.equal(mitSichtbarkeit(b, new Set()), b); assert.equal(mitSichtbarkeit(b), b); });
t('Sichtbarkeit: unsichtbarer Pin wird null, das Original bleibt unverändert, Nichtmitglieder kommen nicht dazu', () => {
  const b = B({ a: 1, h: Infinity, d: null }), m = mitSichtbarkeit(b, new Set(['h', 'x', 'd']));
  assert.equal(m.get('h'), null); assert.equal(m.get('a'), 1); assert.equal(m.has('x'), false); assert.equal(m.get('d'), null); assert.equal(b.get('h'), Infinity);
});
t('Sichtbarkeit: unsichtbarer Pin steht nicht vorn, die anderen Pins rücken auf, Befund «nicht im Onlineshop»', () => {
  const b = B({ a: 1, h: 1, k: 1 }), u = new Set(['h']), m = mitSichtbarkeit(b, u);
  const p = planen(['a', 'h', 'k'], m, ['h', 'k'], 0.5);
  assert.deepEqual(p.kopf, ['k']); assert.equal(p.aktion, 'nurKopf'); assert.deepEqual(p.ziel, ['k', 'a', 'h']);
  assert.deepEqual(befundeMitSichtbarkeit(p.befunde, b, u), [{ id: 'h', grund: 'nicht im Onlineshop' }]);
});
t('Sichtbarkeit: ein Entwurf bleibt «nicht aktiv», auch wenn er zusätzlich unveröffentlicht ist; andere Gründe bleiben', () => {
  const b = B({ d: null, z: 0 }), u = new Set(['d', 'z']);
  assert.deepEqual(befundeMitSichtbarkeit([{ id: 'd', grund: 'nicht aktiv' }, { id: 'z', grund: 'ausverkauft' }, { id: 'x', grund: 'kein Mitglied' }], b, u),
    [{ id: 'd', grund: 'nicht aktiv' }, { id: 'z', grund: 'ausverkauft' }, { id: 'x', grund: 'kein Mitglied' }]);
});
t('Sichtbarkeit: «nicht aktiv» ohne Eintrag im Set bleibt «nicht aktiv»', () => assert.deepEqual(befundeMitSichtbarkeit([{ id: 'h', grund: 'nicht aktiv' }], B({ h: 1 }), new Set()), [{ id: 'h', grund: 'nicht aktiv' }]));

if (!process.exitCode) console.log(`verfuegbar_rang_test: ${n} Prüfungen ok`);
