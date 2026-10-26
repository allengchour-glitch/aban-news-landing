// Tests für lib/unterfilter_plan.mjs (rein). Gegenproben: fehlende Collections, unbekannter Elternteil, Kategorien ohne Filter.
import { planMetafelder, pakete } from './unterfilter_plan.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

const K = [
  { id: 'm-a', handle: 'a' }, { id: 'm-a1', handle: 'a-1', filter: true, eltern_id: 'm-a' }, { id: 'm-a2', handle: 'a-2', filter: true, eltern_id: 'm-a' },
  { id: 'm-b', handle: 'b' },                                              // Kategorie ohne Filter
  { id: 'm-c', handle: 'c' }, { id: 'm-c1', handle: 'c-1', filter: true, eltern_id: 'm-c' },
  { id: 'm-x1', handle: 'x-1', filter: true, eltern_id: 'm-gibtsnicht' }, // Filter mit unbekanntem Elternteil
];
const G = { a: 'gid://c/a', 'a-1': 'gid://c/a1', 'a-2': 'gid://c/a2', b: 'gid://c/b', c: 'gid://c/c', 'c-1': 'gid://c/c1', 'x-1': 'gid://c/x1' };
const p = planMetafelder(K, G);
ist('je Elternteil EIN Listenfeld, je Filter ein Rückverweis', p.writes.map(w => `${w.handle}:${w.key}`), ['a:unterfilter', 'a-1:eltern', 'a-2:eltern', 'c:unterfilter', 'c-1:eltern']);
ist('Listenwert = JSON-Liste der Filter-IDs in Reihenfolge', JSON.parse(p.writes[0].value), ['gid://c/a1', 'gid://c/a2']);
ist('Typen stimmen (Liste / einzelne Referenz)', [p.writes[0].type, p.writes[1].type], ['list.collection_reference', 'collection_reference']);
ist('Rückverweis zeigt auf den Elternteil', p.writes[1].value, 'gid://c/a');
ist('Kategorie ohne Filter bekommt nichts', p.writes.some(w => w.handle === 'b'), false);
ist('Filter mit unbekanntem Elternteil wird gemeldet, nicht geschrieben', [p.uebersprungen.length, p.writes.some(w => w.handle === 'x-1')], [1, false]);

// fehlende Collections
const G2 = { ...G, 'a-2': null };
const p2 = planMetafelder(K, G2);
ist('fehlender Filter: nur der vorhandene wird eingetragen', JSON.parse(p2.writes[0].value), ['gid://c/a1']);
ist('fehlender Filter wird gemeldet', p2.fehlend, ['a-2']);
ist('fehlender Filter bekommt keinen Rückverweis', p2.writes.some(w => w.handle === 'a-2'), false);
const p3 = planMetafelder(K, { ...G, a: null });
ist('fehlender Elternteil: nichts für seine Filter, gemeldet', [p3.writes.some(w => w.handle === 'a' || w.handle === 'a-1'), p3.fehlend.includes('a')], [false, true]);
ist('leere Eingaben', planMetafelder([], {}), { writes: [], fehlend: [], uebersprungen: [] });

// Pakete
ist('Pakete zu 25', pakete(Array.from({ length: 60 }, (_, i) => i)).map(x => x.length), [25, 25, 10]);
ist('Pakete: leer', pakete([]), []);
ist('Pakete: genau 25', pakete(Array.from({ length: 25 }, (_, i) => i)).length, 1);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
