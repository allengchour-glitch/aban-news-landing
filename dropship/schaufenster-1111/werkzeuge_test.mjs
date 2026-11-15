/**
 * Test für die Schaufenster-Werkzeuge reihenfolge.mjs (Sicherung/Rücknahme der Handreihenfolge) und kopf_setzen.mjs (Kopf-Fotos) gegen die Shop-Attrappe
 * automation/lib/fake_shopify_sortierung.mjs. Kein Netz. Aufruf: node dropship/schaufenster-1111/werkzeuge_test.mjs
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const REIHE = join(HIER, 'reihenfolge.mjs'), KOPF = join(HIER, 'kopf_setzen.mjs'), FAKE = join(HIER, '..', '..', 'automation', 'lib', 'fake_shopify_sortierung.mjs');
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };
const G = x => `gid://shopify/Product/${x}`;
const prod = x => ({ id: G(x), handle: `p${x}`, status: 'ACTIVE', totalInventory: 5, tracksInventory: true });
const coll = (id, xs, extra = {}) => ({ id: `gid://shopify/Collection/${id}`, sortOrder: 'MANUAL', products: xs.map(prod), ...extra });

/** Läuft ein Werkzeug gegen die Attrappe in einem Wegwerf-Ordner. dateien: { relativer Pfad: Inhalt } vorher anlegen. */
function lauf(skript, shop, { env = {}, dateien = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'sf-werkzeug-'));
  mkdirSync(join(dir, 'dropship', 'schaufenster-1111'), { recursive: true });
  for (const [p, inhalt] of Object.entries(dateien)) writeFileSync(join(dir, p), typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt));
  const fs = join(dir, 'shop.json'); writeFileSync(fs, JSON.stringify({ log: [], ...shop }));
  const r = spawnSync(process.execPath, ['--import', FAKE, skript], { cwd: dir, encoding: 'utf8', timeout: 60000,
    env: { PATH: process.env.PATH, FAKE_SHOP: fs, SHOPIFY_SHOP: 'fake-test.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', ...env } });
  const lies = p => existsSync(join(dir, p)) ? readFileSync(join(dir, p), 'utf8') : null;
  const out = { code: r.status, out: (r.stdout || '') + (r.stderr || ''), shop: JSON.parse(readFileSync(fs, 'utf8')), lies };
  out.dateien = Object.fromEntries(['sicherung.json', 'dropship/schaufenster-1111/kopf-sicherung.json'].map(p => [p, lies(p)]));
  rmSync(dir, { recursive: true, force: true });
  return out;
}
const reihe = (shop, h) => shop.collections[h].products.map(p => Number(p.id.split('/').pop()));

// ── reihenfolge.mjs ──
const s1 = lauf(REIHE, { collections: { a: coll(1, [3, 1, 2]), b: coll(2, [9, 8]) } }, { env: { MODUS: 'sichern', HANDLES: 'a,b', DATEI: 'sicherung.json' } });
t('sichern: Reihenfolge je Collection in die Datei, nichts geschrieben', () => {
  assert.equal(s1.code, 0, s1.out); assert.equal(s1.shop.log.length, 0);
  const s = JSON.parse(s1.dateien['sicherung.json']); assert.deepEqual(s.collections.a.ids, [G(3), G(1), G(2)]); assert.equal(s.collections.b.sortOrder, 'MANUAL'); assert.ok(s.gesichert);
});
t('sichern: fehlende Collection → Exit 1', () => { const r = lauf(REIHE, { collections: { a: coll(1, [1]) } }, { env: { MODUS: 'sichern', HANDLES: 'a,gibts-nicht', DATEI: 'sicherung.json' } }); assert.equal(r.code, 1, r.out); assert.match(r.out, /gibts-nicht: fehlt/); });
t('ohne MODUS oder DATEI: Exit 1, nichts geschrieben', () => { const r = lauf(REIHE, { collections: {} }, { env: { DATEI: 'x.json' } }); assert.equal(r.code, 1); const r2 = lauf(REIHE, { collections: {} }, { env: { MODUS: 'sichern' } }); assert.equal(r2.code, 1); });
const sicherung = { gesichert: '2026-11-15T21:03:30Z', collections: { a: { id: 'gid://shopify/Collection/1', sortOrder: 'MANUAL', ids: [G(3), G(1), G(2), G(4)] } } };
t('zurück im Trockenlauf: zeigt die Züge, schreibt nichts', () => {
  const r = lauf(REIHE, { collections: { a: coll(1, [4, 2, 3, 1]) } }, { env: { MODUS: 'zurueck', DATEI: 'sicherung.json' }, dateien: { 'sicherung.json': sicherung } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /a: \d+ Züge \[Trockenlauf\]/); assert.equal(r.shop.log.length, 0);
});
t('zurück LIVE: gesicherte Reihenfolge, seither neue Produkte hinten, verschwundene fallen weg, nachgelesen gleich', () => {
  const r = lauf(REIHE, { collections: { a: coll(1, [7, 4, 2, 3]) } }, { env: { MODUS: 'zurueck', DATEI: 'sicherung.json', LIVE: '1' }, dateien: { 'sicherung.json': sicherung } });
  assert.equal(r.code, 0, r.out); assert.deepEqual(reihe(r.shop, 'a'), [3, 2, 4, 7]); assert.match(r.out, /✓ nachgelesen gleich der Sicherung/);
});
t('zurück: Collection nicht mehr MANUAL → übersprungen, nichts geschrieben', () => {
  const r = lauf(REIHE, { collections: { a: coll(1, [2, 1, 3, 4], { sortOrder: 'BEST_SELLING' }) } }, { env: { MODUS: 'zurueck', DATEI: 'sicherung.json', LIVE: '1' }, dateien: { 'sicherung.json': sicherung } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /übersprungen/); assert.equal(r.shop.log.length, 0);
});
t('zurück: andere Collection-ID → Exit 1, nichts geschrieben', () => {
  const r = lauf(REIHE, { collections: { a: coll(5, [2, 1, 3, 4]) } }, { env: { MODUS: 'zurueck', DATEI: 'sicherung.json', LIVE: '1' }, dateien: { 'sicherung.json': sicherung } });
  assert.equal(r.code, 1, r.out); assert.equal(r.shop.log.length, 0);
});
t('zurück: verschwindet während der Nachlese ein Produkt → ✗, Exit 1', () => {
  const r = lauf(REIHE, { nachReorderEntfernen: G(4), collections: { a: coll(1, [4, 2, 3, 1]) } }, { env: { MODUS: 'zurueck', DATEI: 'sicherung.json', LIVE: '1' }, dateien: { 'sicherung.json': sicherung } });
  assert.equal(r.code, 1, r.out); assert.match(r.out, /✗ Nachlese weicht ab/);
});

// ── kopf_setzen.mjs ──
const pins = { version: 1, kategorien: {
  k: { modus: 'kopf', datum: '2026-11-15', grund: 'Test', produkte: [{ id: G(5), handle: 'p5', grund: 'x' }, { id: G(6), handle: 'p6', grund: 'x' }] },
  r: { modus: 'reihenfolge', datum: '2026-11-15', grund: 'Test', produkte: [{ id: G(1), handle: 'p1', grund: 'x' }] } } };
const shopK = () => ({ collections: { k: coll(1, [5, 6, 7], { sortOrder: 'BEST_SELLING' }), r: coll(2, [1, 2], { kopf: [G(2)] }) } });
const envK = { PINS: 'pins.json', SICHERUNG: 'sicherung.json' };
t('Kopf-Fotos Trockenlauf: nur Kategorien im modus «kopf», nichts geschrieben', () => {
  const r = lauf(KOPF, shopK(), { env: envK, dateien: { 'pins.json': pins } });
  assert.equal(r.code, 0, r.out); assert.match(r.out, /k \(BEST_SELLING\): \(leer\) → .*Trockenlauf/); assert.doesNotMatch(r.out, /^r /m); assert.equal(r.shop.log.length, 0); assert.equal(r.dateien['sicherung.json'], null);
});
t('Kopf-Fotos LIVE: Metafeld gesetzt, Sicherung mit altem Wert (leer), Sortierung unverändert, zurückgelesen', () => {
  const r = lauf(KOPF, shopK(), { env: { ...envK, LIVE: '1' }, dateien: { 'pins.json': pins } });
  assert.equal(r.code, 0, r.out); assert.deepEqual(r.shop.collections.k.kopf, [G(5), G(6)]); assert.equal(r.shop.collections.k.sortOrder, 'BEST_SELLING');
  assert.deepEqual(JSON.parse(r.dateien['sicherung.json']).k.value, null); assert.match(r.out, /✓ zurückgelesen gleich/); assert.deepEqual(r.shop.collections.r.kopf, [G(2)], 'modus «reihenfolge» ohne HANDLES unberührt');
});
t('Kopf-Fotos HANDLES=r: auch eine Kategorie im modus «reihenfolge», alter Wert gesichert', () => {
  const r = lauf(KOPF, shopK(), { env: { ...envK, LIVE: '1', HANDLES: 'r' }, dateien: { 'pins.json': pins } });
  assert.equal(r.code, 0, r.out); assert.deepEqual(r.shop.collections.r.kopf, [G(1)]); assert.equal(r.shop.collections.k.kopf, undefined);
  assert.equal(JSON.parse(r.dateien['sicherung.json']).r.value, JSON.stringify([G(2)]));
});
t('Kopf-Fotos HANDLES mit einer Kategorie, die nicht in der Pin-Datei steht → Exit 1, nichts geschrieben', () => {
  const r = lauf(KOPF, shopK(), { env: { ...envK, LIVE: '1', HANDLES: 'gibts-nicht' }, dateien: { 'pins.json': pins } });
  assert.equal(r.code, 1, r.out); assert.equal(r.shop.log.length, 0);
});
t('Kopf-Fotos zurück LIVE: vorher leer → Metafeld gelöscht; vorher gesetzt → alter Wert; beide zurückgelesen', () => {
  const s = { k: { value: null, gesichert: 'x' }, r: { value: JSON.stringify([G(2)]), gesichert: 'x' } };
  const shop = shopK(); shop.collections.k.kopf = [G(5), G(6)]; shop.collections.r.kopf = [G(1)];
  const r = lauf(KOPF, shop, { env: { ...envK, LIVE: '1', ZURUECK: '1' }, dateien: { 'sicherung.json': s } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.collections.k.kopf, undefined); assert.deepEqual(r.shop.collections.r.kopf, [G(2)]);
  assert.equal((r.out.match(/✓ zurück, zurückgelesen gleich der Sicherung/g) || []).length, 2);
});
t('Kopf-Fotos: eine vorhandene Sicherung wird NICHT überschrieben (der erste alte Wert bleibt)', () => {
  const shop = shopK(); shop.collections.r.kopf = [G(7)];
  const r = lauf(KOPF, shop, { env: { ...envK, LIVE: '1', HANDLES: 'r' }, dateien: { 'pins.json': pins, 'sicherung.json': { r: { value: JSON.stringify([G(2)]), gesichert: 'früher' } } } });
  assert.equal(r.code, 0, r.out); assert.equal(JSON.parse(r.dateien['sicherung.json']).r.value, JSON.stringify([G(2)]));
});
t('Kopf-Fotos: Schreiben ohne Wirkung wird beim Zurücklesen erkannt (setzen und zurück je ✗, Exit 1)', () => {
  const a = lauf(KOPF, { ...shopK(), metafeldKlemmt: true }, { env: { ...envK, LIVE: '1' }, dateien: { 'pins.json': pins } });
  assert.equal(a.code, 1, a.out); assert.match(a.out, /✗ zurückgelesen/);
  const shop = { ...shopK(), metafeldKlemmt: true }; shop.collections.k.kopf = [G(5)];
  const b = lauf(KOPF, shop, { env: { ...envK, LIVE: '1', ZURUECK: '1' }, dateien: { 'sicherung.json': { k: { value: null } } } });
  assert.equal(b.code, 1, b.out); assert.match(b.out, /k: ✗ zurückgelesen/);
});
t('Kopf-Fotos zurück im Trockenlauf: nichts geschrieben', () => {
  const shop = shopK(); shop.collections.k.kopf = [G(5)];
  const r = lauf(KOPF, shop, { env: { ...envK, ZURUECK: '1' }, dateien: { 'sicherung.json': { k: { value: null } } } });
  assert.equal(r.code, 0, r.out); assert.equal(r.shop.log.length, 0); assert.match(r.out, /würde zurück/);
});
t('Kopf-Fotos zurück ohne Sicherung → Exit 1', () => { const r = lauf(KOPF, shopK(), { env: { ...envK, LIVE: '1', ZURUECK: '1' } }); assert.equal(r.code, 1, r.out); assert.equal(r.shop.log.length, 0); });
t('Kopf-Fotos: fehlerhafte Pin-Datei → Exit 1, nichts geschrieben', () => { const r = lauf(KOPF, shopK(), { env: { ...envK, LIVE: '1' }, dateien: { 'pins.json': '{kaputt' } }); assert.equal(r.code, 1, r.out); assert.equal(r.shop.log.length, 0); });

if (!process.exitCode) console.log(`werkzeuge_test: ${n} Prüfungen ok`);
