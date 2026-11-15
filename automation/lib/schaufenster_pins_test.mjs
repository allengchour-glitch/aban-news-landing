import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pinsAus, ladePins, MAX_PINS, PIN_STANDARD, MODI, onlineStoreId, unsichtbarePins } from './schaufenster_pins.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const G = i => `gid://shopify/Product/${1000 + i}`;
const P = (...is) => is.map(i => ({ id: G(i), handle: `p${i}` }));
const datei = kategorien => ({ version: 1, kategorien });

t('gültige Datei: reihenfolge und kopf getrennt, IDs in Datei-Reihenfolge', () => {
  const r = pinsAus(datei({ a: { modus: 'reihenfolge', produkte: P(3, 1, 2) }, b: { modus: 'kopf', produkte: P(4) } }));
  assert.deepEqual(r.fehler, []); assert.deepEqual([...r.reihenfolge], [['a', [G(3), G(1), G(2)]]]); assert.deepEqual([...r.kopf], [['b', [G(4)]]]);
});
t('Modi und Höchstzahl sind die vereinbarten', () => { assert.deepEqual(MODI, ['reihenfolge', 'kopf']); assert.equal(MAX_PINS, 4); assert.equal(PIN_STANDARD, 'dropship/kategorie-schaufenster-pins.json'); });
t('genau 4 Produkte sind erlaubt', () => assert.deepEqual(pinsAus(datei({ a: { modus: 'reihenfolge', produkte: P(1, 2, 3, 4) } })).fehler, []));
t('5 Produkte: Fehler, Eintrag wird NICHT verwendet (kein stilles Abschneiden)', () => { const r = pinsAus(datei({ a: { modus: 'reihenfolge', produkte: P(1, 2, 3, 4, 5) } })); assert.equal(r.fehler.length, 1); assert.match(r.fehler[0], /^a: 5 Produkte/); assert.equal(r.reihenfolge.size, 0); });
t('leerer Handle (auch nur Leerzeichen): Fehler, Eintrag wird nicht verwendet', () => {
  for (const h of ['', '  ']) { const r = pinsAus(datei({ [h]: { modus: 'reihenfolge', produkte: P(1) } })); assert.equal(r.fehler.length, 1, JSON.stringify(h)); assert.match(r.fehler[0], /leerer Handle/); assert.equal(r.reihenfolge.size, 0); }
});
t('ein fehlerhafter Eintrag sperrt nur sich selbst, die anderen gelten', () => { const r = pinsAus(datei({ a: { modus: 'reihenfolge', produkte: [{ id: '123' }] }, b: { modus: 'reihenfolge', produkte: P(1) } })); assert.equal(r.fehler.length, 1); assert.deepEqual([...r.reihenfolge.keys()], ['b']); });
t('ID muss eine Produkt-GID sein (Collection-GID, Zahl, fehlend → Fehler)', () => {
  for (const id of ['gid://shopify/Collection/1', 1000, undefined, 'gid://shopify/Product/', ' gid://shopify/Product/1']) assert.equal(pinsAus(datei({ a: { modus: 'reihenfolge', produkte: [{ id }] } })).reihenfolge.size, 0, String(id));
});
t('doppelte Produkte: Fehler', () => assert.match(pinsAus(datei({ a: { modus: 'reihenfolge', produkte: P(1, 1) } })).fehler[0], /doppelt/));
t('unbekannter oder fehlender Modus: Fehler', () => { assert.equal(pinsAus(datei({ a: { modus: 'oben', produkte: P(1) } })).fehler.length, 1); assert.equal(pinsAus(datei({ a: { produkte: P(1) } })).fehler.length, 1); });
t('leere oder fehlende Produktliste: Fehler', () => { assert.equal(pinsAus(datei({ a: { modus: 'kopf', produkte: [] } })).fehler.length, 1); assert.equal(pinsAus(datei({ a: { modus: 'kopf' } })).fehler.length, 1); });
t('Eintrag ist kein Objekt: Fehler', () => { assert.equal(pinsAus(datei({ a: null })).fehler.length, 1); assert.equal(pinsAus(datei({ a: [G(1)] })).fehler.length, 1); });
t('falsche Version oder fehlende Kategorien: nichts wird verwendet', () => {
  assert.equal(pinsAus({ version: 2, kategorien: { a: { modus: 'reihenfolge', produkte: P(1) } } }).reihenfolge.size, 0);
  assert.equal(pinsAus({ version: 1 }).fehler.length, 1); assert.equal(pinsAus({ version: 1, kategorien: [] }).fehler.length, 1);
  for (const x of [null, [], 'text', 7]) assert.equal(pinsAus(x).fehler.length, 1);
});
t('Datei fehlt: fehlt=true, keine Fehler, keine Pins (Verhalten wie vorher)', () => { const r = ladePins('x.json', { gibtEs: () => false, lesen: () => { throw new Error('darf nicht lesen'); } }); assert.equal(r.fehlt, true); assert.deepEqual(r.fehler, []); assert.equal(r.reihenfolge.size + r.kopf.size, 0); });
t('Datei unlesbar (kein JSON): Fehler, keine Pins', () => { const r = ladePins('x.json', { gibtEs: () => true, lesen: () => '{kaputt' }); assert.equal(r.fehlt, false); assert.equal(r.fehler.length, 1); assert.match(r.fehler[0], /unlesbar/); assert.equal(r.reihenfolge.size, 0); });
t('Datei gültig: wird über ladePins gelesen', () => { const r = ladePins('x.json', { gibtEs: () => true, lesen: () => JSON.stringify(datei({ a: { modus: 'reihenfolge', produkte: P(1, 2) } })) }); assert.deepEqual(r.reihenfolge.get('a'), [G(1), G(2)]); assert.equal(r.pfad, 'x.json'); });

// Die echte Pin-Datei im Repo (falls vorhanden): ohne Fehler, jede Kategorie mit 1 bis 4 Produkten, Handles und Gründe gesetzt.
if (existsSync(PIN_STANDARD)) {
  const roh = JSON.parse(readFileSync(PIN_STANDARD, 'utf8')), r = ladePins(PIN_STANDARD);
  t('echte Pin-Datei: keine Fehler', () => assert.deepEqual(r.fehler, []));
  t('echte Pin-Datei: jede Kategorie mit Grund, Datum und je Produkt Handle und Grund', () => {
    for (const [h, e] of Object.entries(roh.kategorien)) {
      assert.ok(e.grund && /^\d{4}-\d{2}-\d{2}$/.test(e.datum), h);
      for (const p of e.produkte) assert.ok(p.handle && p.grund, `${h}: ${p.id}`);
    }
  });
  t('echte Pin-Datei: nicht leer', () => assert.ok(r.reihenfolge.size + r.kopf.size > 0));
} else console.log(`(echte Pin-Datei ${PIN_STANDARD} nicht vorhanden — nur Attrappen geprüft)`);

// Sichtbarkeit (15.11.2026): Kanal «Online Store» finden und unveröffentlichte Pins melden (Abfrage-Attrappe; erst rechnen, dann prüfen)
{
  const fragen = [];
  const q = async (query, v) => { fragen.push(query); if (query.includes('publications(')) return { publications: { nodes: [{ id: 'gid://shopify/Publication/7', name: 'Point of Sale' }, { id: 'gid://shopify/Publication/9', name: 'Online Store' }] } };
    return { nodes: v.ids.map(id => id === G(9) ? null : { id, publishedOnPublication: id !== G(2) }) }; };
  const os = await onlineStoreId(q);
  const ohne = await onlineStoreId(async () => ({ publications: { nodes: [{ id: 'x', name: 'Shop' }] } }));
  const u = await unsichtbarePins(q, [G(1), G(2), G(9)], os);
  const vorher = fragen.length;
  const leer1 = await unsichtbarePins(q, [G(1)], null), leer2 = await unsichtbarePins(q, [], os);
  t('onlineStoreId: findet den Kanal «Online Store» (nicht den ersten)', () => assert.equal(os, 'gid://shopify/Publication/9'));
  t('onlineStoreId: ohne Kanal «Online Store» → null', () => assert.equal(ohne, null));
  t('unsichtbarePins: nur das unveröffentlichte Produkt; gelöschte (null) zählen hier nicht', () => assert.deepEqual([...u], [G(2)]));
  t('unsichtbarePins: ohne Kanal-ID oder ohne Pins leer und OHNE Abfrage', () => { assert.equal(leer1.size + leer2.size, 0); assert.equal(fragen.length, vorher); });
}

if (!process.exitCode) console.log(`schaufenster_pins_test: ${n} Prüfungen ok`);
