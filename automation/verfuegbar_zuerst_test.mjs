/**
 * Ende-zu-Ende-Test für verfuegbar_zuerst.mjs und den Pin-Teil von bewertung_zuerst.mjs gegen eine Attrappe des Shops (lib/fake_shopify_sortierung.mjs).
 * Kein Netz: das Skript läuft als eigener Prozess mit `--import` der Attrappe, in einem Wegwerf-Ordner (eigenes dropship/kategorien_ledger.txt).
 * Geprüft wird, was der tägliche Lager-Wächter tut: Pins vorn halten, ausverkaufte Pins nach hinten, ohne Pin-Datei alles wie vorher.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinZustand } from './bewertung_zuerst.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const SKRIPT = join(HIER, 'verfuegbar_zuerst.mjs'), BEWERTUNG = join(HIER, 'bewertung_zuerst.mjs'), FAKE = join(HIER, 'lib', 'fake_shopify_sortierung.mjs');
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const G = x => `gid://shopify/Product/${x}`;
const prod = (x, inv = 5, status = 'ACTIVE', tracks = true) => ({ id: G(x), handle: `p${x}`, status, totalInventory: inv, tracksInventory: tracks });
/** 20 Produkte, alle lieferbar: unter jeder Schwelle. */
const voll20 = () => Array.from({ length: 20 }, (_, i) => prod(i + 1));

function lauf(shop, { pins, env = {}, skript = SKRIPT } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'vz-test-'));
  mkdirSync(join(dir, 'dropship'));
  const fs = join(dir, 'shop.json'); writeFileSync(fs, JSON.stringify({ log: [], ...shop }));
  let pinPfad = join(dir, 'gibt-es-nicht.json');
  if (pins !== undefined) { pinPfad = join(dir, 'pins.json'); writeFileSync(pinPfad, typeof pins === 'string' ? pins : JSON.stringify(pins)); }
  const r = spawnSync(process.execPath, ['--import', FAKE, skript], { cwd: dir, encoding: 'utf8', timeout: 60000,
    env: { PATH: process.env.PATH, FAKE_SHOP: fs, SHOPIFY_SHOP: 'fake-test.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', PINS: pinPfad, ...env } });
  const nach = JSON.parse(readFileSync(fs, 'utf8'));
  const ledger = existsSync(join(dir, 'dropship/kategorien_ledger.txt')) ? readFileSync(join(dir, 'dropship/kategorien_ledger.txt'), 'utf8') : '';
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), shop: nach, ledger };
}
const pinDatei = (h, ids, modus = 'reihenfolge') => ({ version: 1, kategorien: { [h]: { modus, datum: '2026-11-11', grund: 'Test', produkte: ids.map(x => ({ id: G(x), handle: `p${x}`, grund: 'Test' })) } } });
const reihe = (shop, h) => shop.collections[h].products.map(p => Number(p.id.split('/').pop()));
const C = (h, products, sortOrder = 'MANUAL', id = 'gid://shopify/Collection/1') => ({ [h]: { id, sortOrder, products } });

t('ohne Pin-Datei und unter der Schwelle: keine Änderung, Ausgabe ohne Pin-Zahlen (Verhalten wie vorher)', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log.length, 0); assert.match(r.out, /Pins: keine Datei/); assert.doesNotMatch(r.out, /Pin-Befunde/);
});
t('Trockenlauf mit Pins: zeigt «nur Kopf» und Plätze vorher/nachher, schreibt nichts', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { pins: pinDatei('w', [7, 3, 12, 1]), env: { HANDLES: 'w', SCHWELLE: '0.1', ZEIGE_PLAETZE: '8' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log.length, 0);
  assert.match(r.out, /nur Kopf \(unter Schwelle\)/); assert.match(r.out, /w vorher: {2}1\. p1 \| 2\. p2/); assert.match(r.out, /w nachher: 1\. p7 \| 2\. p3 \| 3\. p12 \| 4\. p1 \| 5\. p2 \| 6\. p4/);
});
t('LIVE mit Pins unter der Schwelle: Pins auf 1 bis 4 in Pin-Reihenfolge, der Rest bleibt in seiner Reihenfolge', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { pins: pinDatei('w', [7, 3, 12, 1]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(reihe(r.shop, 'w'), [7, 3, 12, 1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.match(r.out, /✓ nachgelesen, Kopf steht \(Pins geprüft\)/); assert.match(r.ledger, /verfuegbar-zuerst w vorher=MANUAL .* pins=4\/4 nurKopf/);
});
t('zweiter Lauf: nichts mehr zu tun (keine weiteren Züge)', () => {
  const start = [7, 3, 12, 1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20].map(x => prod(x));
  const r = lauf({ menu: [], collections: C('w', start) }, { pins: pinDatei('w', [7, 3, 12, 1]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log.length, 0);
});
t('ausverkaufter Pin: Befund, rückt ans Ende; die anderen Pins rücken auf', () => {
  const ps = voll20(); ps[2].totalInventory = 0;   // p3 ausverkauft
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [7, 3, 12, 1]), env: { HANDLES: 'w', SCHWELLE: '0.5', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /PIN-BEFUND w: p3 ausverkauft/);
  const z = reihe(r.shop, 'w'); assert.deepEqual(z.slice(0, 3), [7, 12, 1]); assert.equal(z[z.length - 1], 3); assert.match(r.out, /Pin-Befunde 1/);
});
t('nicht getrackter Pin (CJ-Ware, Bestand 0) zählt als lieferbar', () => {
  const ps = voll20(); ps[6].totalInventory = 0; ps[6].tracksInventory = false;
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [7]), env: { HANDLES: 'w', SCHWELLE: '0.5', LIVE: '1' } });
  assert.equal(reihe(r.shop, 'w')[0], 7); assert.doesNotMatch(r.out, /PIN-BEFUND/);
});
t('Entwurf als Pin: Befund «nicht aktiv», steht nicht vorn', () => {
  const ps = voll20(); ps[6].status = 'DRAFT';
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [7, 3]), env: { HANDLES: 'w', SCHWELLE: '0.5', LIVE: '1' } });
  assert.match(r.out, /PIN-BEFUND w: p7 nicht aktiv/); assert.equal(reihe(r.shop, 'w')[0], 3);
});
t('über der Schwelle: volle Teilung, Pins vorn, Ausverkaufte hinten', () => {
  const ps = voll20(); for (const i of [0, 1, 4]) ps[i].totalInventory = 0;   // p1, p2, p5 ausverkauft
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [9, 4]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(reihe(r.shop, 'w'), [9, 4, 3, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 1, 2, 5]); assert.match(r.out, /verfügbar steht vorn \(Pins geprüft\)/);
});
t('ohne Pins über der Schwelle: genau die alte Teilung', () => {
  const ps = voll20(); for (const i of [0, 1, 4]) ps[i].totalInventory = 0;
  const r = lauf({ menu: [], collections: C('w', ps) }, { env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.deepEqual(reihe(r.shop, 'w'), [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 1, 2, 5]);
});
t('MENUE=1: eine gepinnte Kategorie ausserhalb des Menüs wird mitgeprüft', () => {
  const shop = { menu: ['m'], collections: { ...C('m', voll20()), ...C('w', voll20(), 'MANUAL', 'gid://shopify/Collection/2') } };
  const r = lauf(shop, { pins: pinDatei('w', [5]), env: { MENUE: '1', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /Ziele: 2 Collections/); assert.equal(reihe(r.shop, 'w')[0], 5); assert.equal(reihe(r.shop, 'm')[0], 1);
});
t('modus «kopf»: Kategorie wird nicht umsortiert und nicht auf MANUAL gestellt', () => {
  const r = lauf({ menu: [], collections: C('w', voll20(), 'BEST_SELLING') }, { pins: pinDatei('w', [5], 'kopf'), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log.length, 0); assert.equal(r.shop.collections.w.sortOrder, 'BEST_SELLING');
});
t('Pins auf einer BEST_SELLING-Collection (modus reihenfolge): erst MANUAL, neu lesen, dann Pins vorn', () => {
  const r = lauf({ menu: [], collections: C('w', voll20(), 'BEST_SELLING') }, { pins: pinDatei('w', [5]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log[0].art, 'sortOrder'); assert.equal(r.shop.collections.w.sortOrder, 'MANUAL'); assert.equal(reihe(r.shop, 'w')[0], 5);
});
t('BEST_SELLING mit anderer Bestseller-Reihenfolge: nach dem Umschalten zählt die gespeicherte Handreihenfolge (neu gelesen)', () => {
  const ps = voll20(), w = C('w', ps, 'BEST_SELLING'); w.w.bsReihe = [...ps].reverse().map(p => p.id);
  const r = lauf({ menu: [], collections: w }, { pins: pinDatei('w', [5]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.deepEqual(reihe(r.shop, 'w'), [5, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
});
t('fehlerhafte Pin-Datei: Meldung, Exit 1, der Rest läuft wie ohne Pins', () => {
  const ps = voll20(); for (const i of [0, 1, 4]) ps[i].totalInventory = 0;
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: '{kaputt', env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 1, r.out); assert.match(r.out, /PIN-DATEI-FEHLER: Pin-Datei .* unlesbar/); assert.deepEqual(reihe(r.shop, 'w').slice(-3), [1, 2, 5]);
});
t('Eintrag mit 5 Produkten: wird nicht verwendet, Exit 1', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { pins: pinDatei('w', [5, 6, 7, 8, 9]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 1, r.out); assert.equal(r.shop.log.length, 0); assert.match(r.out, /w: 5 Produkte, höchstens 4/);
});
t('Pin, der kein Mitglied ist: Befund, die anderen Pins gelten', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { pins: pinDatei('w', [99, 6]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.match(r.out, /PIN-BEFUND w: gid:\/\/shopify\/Product\/99 kein Mitglied/); assert.equal(reihe(r.shop, 'w')[0], 6);
});
t('nur Kopf: ein ausverkauftes NICHT gepinntes Produkt vorn bleibt, wo es ist (Nachlese prüft nur den Kopf)', () => {
  const ps = voll20(); ps[1].totalInventory = 0;   // p2 ausverkauft, 1 von 20 = unter der Schwelle 0.1
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [7]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.deepEqual(reihe(r.shop, 'w').slice(0, 4), [7, 1, 2, 3]); assert.match(r.out, /✓ nachgelesen, Kopf steht/);
});
t('bewertung_zuerst.mjs LIVE: Pins zuerst (Pin-Reihenfolge), dann die Bewerteten, dann die Bestseller; ausverkaufter Pin wird nicht nach vorn gezogen', () => {
  const ps = Array.from({ length: 12 }, (_, i) => prod(i + 1)); ps[5].totalInventory = 0;   // p6 ausverkauft
  const bulk = ps.map(p => ({ id: p.id, handle: p.handle, title: `Produkt ${p.handle}`, productType: '', tags: ['x'],
    metafield: p.id === G(3) ? { value: JSON.stringify({ number_of_reviews: 8, average_rating: '5.0' }) } : null }));
  const shop = { menu: [], bulk, collections: { w: { id: 'gid://shopify/Collection/1', sortOrder: 'BEST_SELLING', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'x' }] }, products: ps } } };
  const dir = mkdtempSync(join(tmpdir(), 'bz-cache-'));
  const r = lauf(shop, { pins: pinDatei('w', [9, 6, 4]), skript: BEWERTUNG, env: { HANDLES: 'w', LIVE: '1', NEU: '1', BULK_CACHE: join(dir, 'bulk.jsonl') } });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /PIN-BEFUND w: gid:\/\/shopify\/Product\/6 ausverkauft/); assert.match(r.out, /2\/3 Pins zuerst/);
  assert.deepEqual(reihe(r.shop, 'w').slice(0, 4), [9, 4, 3, 1]); assert.equal(r.shop.collections.w.sortOrder, 'MANUAL');
});
t('bewertung_zuerst.mjs LIVE: Eintrag im modus «kopf» zieht nichts nach vorn (nur Bewertete, dann Bestseller)', () => {
  const ps = Array.from({ length: 12 }, (_, i) => prod(i + 1));
  const bulk = ps.map(p => ({ id: p.id, handle: p.handle, title: `Produkt ${p.handle}`, productType: '', tags: ['x'],
    metafield: p.id === G(3) ? { value: JSON.stringify({ number_of_reviews: 8, average_rating: '5.0' }) } : null }));
  const shop = { menu: [], bulk, collections: { w: { id: 'gid://shopify/Collection/1', sortOrder: 'MANUAL', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'x' }] }, products: ps } } };
  const dir = mkdtempSync(join(tmpdir(), 'bz-cache-'));
  const r = lauf(shop, { pins: pinDatei('w', [9, 4], 'kopf'), skript: BEWERTUNG, env: { HANDLES: 'w', LIVE: '1', NEU: '1', BULK_CACHE: join(dir, 'bulk.jsonl') } });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.code, 0, r.out); assert.deepEqual(reihe(r.shop, 'w').slice(0, 3), [3, 1, 2]); assert.doesNotMatch(r.out, /Pins zuerst/);
});
t('bewertung_zuerst.mjs: fehlerhafte Pin-Datei bricht vor jedem Schreiben ab', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { pins: '{kaputt', skript: BEWERTUNG, env: { HANDLES: 'w', LIVE: '1' } });
  assert.equal(r.code, 1, r.out); assert.match(r.out, /Abbruch vor jedem Schreiben/); assert.equal(r.shop.log.length, 0);
});

// Korrektur-Runde 15.11.2026: Sichtbarkeit im Onlineshop, Nachlese bei veränderter Produktzahl
t('Pin nicht im Onlineshop veröffentlicht: Befund «nicht im Onlineshop», steht nicht vorn, die anderen Pins rücken auf', () => {
  const ps = voll20(); ps[6].online = false;   // p7 aktiv, lieferbar, aber unsichtbar
  const r = lauf({ menu: [], collections: C('w', ps) }, { pins: pinDatei('w', [7, 3, 12]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /PIN-BEFUND w: p7 nicht im Onlineshop/);
  const z = reihe(r.shop, 'w'); assert.deepEqual(z.slice(0, 2), [3, 12]); assert.notEqual(z.indexOf(7), 2); assert.equal(z[z.length - 1], 7);
  assert.match(r.out, /✓ nachgelesen, Kopf steht/);
});
t('Kanal «Online Store» fehlt: Meldung, Pins gelten ohne Sichtbarkeitsprüfung (unveröffentlichter Pin bleibt vorn)', () => {
  const ps = voll20(); ps[6].online = false;
  const r = lauf({ menu: [], ohneOnlineStore: true, collections: C('w', ps) }, { pins: pinDatei('w', [7, 3]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /Sichtbarkeit im Onlineshop wird NICHT geprüft/); assert.deepEqual(reihe(r.shop, 'w').slice(0, 2), [7, 3]); assert.doesNotMatch(r.out, /PIN-BEFUND/);
});
t('ohne Pin-Datei: keine Kanal-Abfrage (Verhalten und Last wie vorher)', () => {
  const r = lauf({ menu: [], collections: C('w', voll20()) }, { env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.kanalAbfragen || 0, 0); assert.doesNotMatch(r.out, /Sichtbarkeit/);
});
t('Nachlese: verschwindet nach dem Umsortieren ein Produkt (Produktzahl anders), zählt es NICHT als geändert (✗, Exit 1)', () => {
  const r = lauf({ menu: [], nachReorderEntfernen: G(20), collections: C('w', voll20()) }, { pins: pinDatei('w', [7, 3]), env: { HANDLES: 'w', SCHWELLE: '0.1', LIVE: '1' } });
  assert.equal(r.code, 1, r.out); assert.match(r.out, /✗ Nachlese/); assert.doesNotMatch(r.out, /✓ nachgelesen/);
  assert.deepEqual(reihe(r.shop, 'w').slice(0, 2), [7, 3], 'die Umsortierung selbst lief');
});
t('bewertung_zuerst.mjs LIVE: unveröffentlichter Pin wird nicht nach vorn gezogen, Befund «nicht im Onlineshop»', () => {
  const ps = Array.from({ length: 12 }, (_, i) => prod(i + 1)); ps[8].online = false;   // p9 unsichtbar
  const bulk = ps.map(p => ({ id: p.id, handle: p.handle, title: `Produkt ${p.handle}`, productType: '', tags: ['x'],
    metafield: p.id === G(3) ? { value: JSON.stringify({ number_of_reviews: 8, average_rating: '5.0' }) } : null }));
  const shop = { menu: [], bulk, collections: { w: { id: 'gid://shopify/Collection/1', sortOrder: 'MANUAL', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'x' }] }, products: ps } } };
  const dir = mkdtempSync(join(tmpdir(), 'bz-cache-'));
  const r = lauf(shop, { pins: pinDatei('w', [9, 4]), skript: BEWERTUNG, env: { HANDLES: 'w', LIVE: '1', NEU: '1', BULK_CACHE: join(dir, 'bulk.jsonl') } });
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /PIN-BEFUND w: gid:\/\/shopify\/Product\/9 nicht im Onlineshop/); assert.match(r.out, /1\/2 Pins zuerst/);
  assert.deepEqual(reihe(r.shop, 'w').slice(0, 2), [4, 3]);
});

// pinZustand (bewertung_zuerst.mjs) mit einer Abfrage-Attrappe
const fakeQ = (produkte, mitglieder) => async (_q, v) => ({ nodes: v.ids.map(id => { const p = produkte.find(x => x.id === id); return p ? { ...p, inCollection: mitglieder.includes(id) } : null; }) });
const lauefe = [];
lauefe.push((async () => {
  const ps = [prod(1), prod(2, 0), prod(3, 0, 'ACTIVE', false), prod(4, 5, 'DRAFT'), prod(5)];
  const z = await pinZustand(fakeQ(ps, [G(1), G(2), G(3), G(4)]), [G(3), G(2), G(5), G(1)], 'gid://shopify/Collection/1');
  t('pinZustand: Kopf in Pin-Reihenfolge nur aus Mitgliedern, aktiv und lieferbar', () => assert.deepEqual(z.kopf, [G(3), G(1)]));
  t('pinZustand: Befunde für ausverkauft und kein Mitglied', () => assert.deepEqual(z.befunde, [{ id: G(2), grund: 'ausverkauft' }, { id: G(5), grund: 'kein Mitglied' }]));
  const leer = await pinZustand(async () => { throw new Error('darf ohne Pins nicht fragen'); }, [], 'c');
  t('pinZustand: ohne Pins keine Abfrage', () => assert.deepEqual(leer, { kopf: [], befunde: [] }));
  const unbekannt = await pinZustand(fakeQ([], []), [G(7)], 'c');
  t('pinZustand: gelöschtes Produkt (null) ist «kein Mitglied»', () => assert.deepEqual(unbekannt.befunde, [{ id: G(7), grund: 'kein Mitglied' }]));
  const entwurf = await pinZustand(fakeQ(ps, [G(1), G(4)]), [G(4), G(1)], 'c');
  t('pinZustand: Entwurf als Pin → Befund «nicht aktiv», nicht im Kopf', () => { assert.deepEqual(entwurf.kopf, [G(1)]); assert.deepEqual(entwurf.befunde, [{ id: G(4), grund: 'nicht aktiv' }]); });
  const ps2 = [prod(1), { ...prod(2), online: false }, { ...prod(3, 5, 'DRAFT'), online: false }];
  const qOs = async (_q, v) => { assert.equal(v.p, 'os'); return { nodes: v.ids.map(id => { const p = ps2.find(x => x.id === id); return { ...p, inCollection: true, publishedOnPublication: p.online !== false }; }) }; };
  const sicht = await pinZustand(qOs, [G(2), G(1), G(3)], 'c', 'os');
  t('pinZustand mit Kanal-ID: unveröffentlichter Pin → «nicht im Onlineshop», ein unveröffentlichter Entwurf bleibt «nicht aktiv»', () => {
    assert.deepEqual(sicht.kopf, [G(1)]); assert.deepEqual(sicht.befunde, [{ id: G(2), grund: 'nicht im Onlineshop' }, { id: G(3), grund: 'nicht aktiv' }]);
  });
  let gefragtMitKanal = null;
  await pinZustand(async (query, v) => { gefragtMitKanal = 'p' in v || query.includes('publishedOnPublication'); return { nodes: [] }; }, [G(1)], 'c');
  t('pinZustand ohne Kanal-ID: Abfrage ohne Sichtbarkeit (wie vorher)', () => assert.equal(gefragtMitKanal, false));
})());
await Promise.all(lauefe);
if (!process.exitCode) console.log(`verfuegbar_zuerst_test: ${n} Prüfungen ok`);
