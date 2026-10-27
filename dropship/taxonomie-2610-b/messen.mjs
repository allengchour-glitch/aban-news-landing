#!/usr/bin/env node
/**
 * Misst eine Bereichsdatei der Taxonomie «Rest des Shops» am frischen Katalog. NUR LESEN, kein Shopify.
 *   node dropship/taxonomie-2610-b/messen.mjs bereiche/<bereich>.json [--katalog /tmp/katalog_taxo.json] [--zeige h1,h2] [--n 40] [--luecke 40] [--alle]
 * Ausgabe: Prüfungen der Datei (Handles, Regexe, Schwelle), Tabelle je Kategorie (Treffer, schon in bestehender sort-Kategorie, Überlappung),
 *          Überlappungen unter Geschwistern, Lücke im Universum. Mitgliederlisten: /tmp/taxo_b/<bereich>/<handle>.txt (handle | titel | google).
 * --zeige: Stichprobe der Mitglieder (Titel + Google-Kategorie, fest gemischt) UND Google-Verteilung der Mitglieder
 * --luecke: Beispiele für Produkte im Universum ohne Kategorie in dieser Datei
 * --alle: Handle-Kollisionen auch gegen alle anderen Dateien in bereiche/ prüfen
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { passt, imUnterfilter, imUniversum, normiere, HANDLE_RE, R } from './kern.mjs';
import { KATEGORIEN } from '../../automation/lib/kategorien.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const datei = process.argv[2]; if (!datei || datei.startsWith('--')) { console.error('Aufruf: messen.mjs bereiche/<bereich>.json'); process.exit(1); }
const KAT = arg('--katalog') || '/tmp/katalog_taxo.json';
const B = JSON.parse(readFileSync(resolve(process.cwd(), datei), 'utf8'));
const katalog = JSON.parse(readFileSync(KAT, 'utf8')); const P = katalog.produkte.map(normiere);
const fehler = [], warn = [];

// ── Prüfungen der Datei ──
const koll = existsSync('/tmp/taxo_b/collections.json') ? JSON.parse(readFileSync('/tmp/taxo_b/collections.json', 'utf8')) : [];
const kollHandles = new Set(koll.map(c => c.handle));
const andere = new Set(); if (process.argv.includes('--alle')) for (const f of readdirSync(`${HIER}/bereiche`)) { if (f.endsWith('.json') && resolve(`${HIER}/bereiche/${f}`) !== resolve(process.cwd(), datei)) { try { for (const k of JSON.parse(readFileSync(`${HIER}/bereiche/${f}`, 'utf8')).kategorien || []) andere.add(k.handle); } catch {} } }
const sehen = new Set();
const pruefeRx = (wo, arr) => { for (const s of arr || []) { try { R(s); } catch (e) { fehler.push(`${wo}: ungültige Regex «${s}» (${e.message})`); } } };
for (const k of B.kategorien || []) {
  if (!HANDLE_RE.test(k.handle || '')) fehler.push(`${k.handle}: Handle nur a-z, 0-9, Bindestrich`);
  if (sehen.has(k.handle)) fehler.push(`${k.handle}: doppelt in der Datei`); sehen.add(k.handle);
  if (kollHandles.has(k.handle)) fehler.push(`${k.handle}: KOLLISION, im Shop gibt es schon eine Collection mit diesem Handle («${koll.find(c => c.handle === k.handle).titel}») - anderen Handle wählen`);
  if (andere.has(k.handle)) fehler.push(`${k.handle}: Kollision mit einer anderen Bereichsdatei`);
  if (!k.titel) fehler.push(`${k.handle}: Titel fehlt`);
  if (!(k.g_prefix || []).length && !(k.titel_muss || []).length) fehler.push(`${k.handle}: weder g_prefix noch titel_muss`);
  if (!k.beschreibung || k.beschreibung.length < 40) warn.push(`${k.handle}: Beschreibung fehlt oder ist sehr kurz`);
  for (const f of ['titel_muss', 'titel_nicht']) pruefeRx(`${k.handle}.${f}`, k[f]);
  for (const u of k.unterfilter || []) { if (!HANDLE_RE.test(u.handle || '')) fehler.push(`${u.handle}: Unterfilter-Handle ungültig`); if (sehen.has(u.handle)) fehler.push(`${u.handle}: doppelt`); sehen.add(u.handle); if (kollHandles.has(u.handle)) fehler.push(`${u.handle}: KOLLISION (Unterfilter)`); pruefeRx(`${u.handle}.titel_muss`, u.titel_muss); pruefeRx(`${u.handle}.titel_nicht`, u.titel_nicht); }
}
pruefeRx('universum.titel_muss', B.universum?.titel_muss); pruefeRx('universum.titel_nicht', B.universum?.titel_nicht);
const katHandles = new Set((B.kategorien || []).map(k => k.handle));
for (const g of B.gruppen || []) for (const h of g.kinder || []) if (!katHandles.has(h) && !kollHandles.has(h) && !andere.has(h)) fehler.push(`Gruppe «${g.titel}»: Kind «${h}» ist weder neue Kategorie noch bestehende Collection`);
const eingeordnet = new Set((B.gruppen || []).flatMap(g => g.kinder || []));
for (const k of B.kategorien || []) if (!eingeordnet.has(k.handle)) warn.push(`${k.handle}: steht in keiner Gruppe (kein Menüplatz)`);
if (!B.menue?.oben) fehler.push('menue.oben fehlt (Zweig des Hauptmenüs, in den die Gruppen kommen)');

// ── Bestehende sort-Kategorien (nur zur Einordnung) ──
const tagTitel = new Map(KATEGORIEN.map(k => [k.tag, k.titel]));

// ── Messung ──
const mitglieder = new Map(); const proProdukt = new Map();
for (const k of B.kategorien || []) {
  const m = P.filter(p => passt(k, p)); mitglieder.set(k.handle, m);
  for (const p of m) { const a = proProdukt.get(p.handle) || []; a.push(k.handle); proProdukt.set(p.handle, a); }
}
const universum = B.universum ? P.filter(p => imUniversum(B.universum, p)) : [];
const dirOut = `/tmp/taxo_b/${B.bereich || 'x'}`; mkdirSync(dirOut, { recursive: true });
const gKurz = (g, n = 3) => (g || '(ohne)').split(' > ').slice(0, n).join(' > ');
const MIN = 15;
console.log(`\n=== ${B.bereich} «${B.titel}» · Katalog ${P.length} aktiv (${KAT}) · Universum ${universum.length} · ${(B.kategorien || []).length} Kategorien ===`);
if (fehler.length) { console.log('\nFEHLER:'); fehler.forEach(f => console.log('  ✗', f)); }
if (warn.length) { console.log('\nHINWEISE:'); warn.forEach(f => console.log('  !', f)); }
console.log('\nHANDLE'.padEnd(46) + 'TREFFER  <15  SCHON-DA  ÜBERLAPP  BESTEHENDE KATEGORIE (häufigste)');
for (const k of B.kategorien || []) {
  const m = mitglieder.get(k.handle); writeFileSync(`${dirOut}/${k.handle}.txt`, m.map(p => `${p.handle} | ${p.title} | ${p.g}`).join('\n') + '\n');
  const schon = m.filter(p => p.tags.some(t => tagTitel.has(t) && !t.startsWith('sort-m-')) || p.tags.some(t => t.startsWith('sort-')));
  const cnt = new Map(); for (const p of m) for (const t of p.tags) if (t.startsWith('sort-') && tagTitel.has(t)) cnt.set(tagTitel.get(t), (cnt.get(tagTitel.get(t)) || 0) + 1);
  const top = [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t, n]) => `${t} ${n}`).join(' · ');
  const ue = m.filter(p => proProdukt.get(p.handle).length > 1).length;
  console.log(k.handle.padEnd(45) + String(m.length).padStart(7) + (m.length < MIN ? '   ZU' : '     ') + String(schon.length).padStart(10) + String(ue).padStart(10) + '  ' + top);
  for (const u of k.unterfilter || []) { const mu = m.filter(p => imUnterfilter(u, p)); console.log('   └ ' + u.handle.padEnd(40) + String(mu.length).padStart(7) + (mu.length < MIN ? '   ZU' : '')); }
}
// Überlappung unter Geschwistern
const paare = new Map(); for (const [h, a] of proProdukt) if (a.length > 1) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const key = a[i] + ' + ' + a[j]; const o = paare.get(key) || []; o.push(h); paare.set(key, o); }
const byHandle = new Map(P.map(p => [p.handle, p]));
if (paare.size) { console.log('\nÜBERLAPPUNGEN (Produkt in zwei Kategorien dieser Datei):'); for (const [key, hs] of [...paare].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) console.log(`  ${String(hs.length).padStart(4)}  ${key}  z. B. ${hs.slice(0, 3).map(h => byHandle.get(h).title.slice(0, 40)).join(' | ')}`); }
else console.log('\nÜberlappungen: keine');
// Lücke
const luecke = universum.filter(p => !proProdukt.has(p.handle));
const abgedeckt = universum.length - luecke.length;
console.log(`\nUNIVERSUM: ${universum.length} · in einer Kategorie ${abgedeckt} (${universum.length ? (abgedeckt / universum.length * 100).toFixed(1) : 0} %) · ohne Kategorie ${luecke.length}`);
const gl = new Map(); for (const p of luecke) gl.set(gKurz(p.g), (gl.get(gKurz(p.g)) || 0) + 1);
console.log('  Lücke nach Google-Kategorie:'); for (const [g, n] of [...gl].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log('   ', String(n).padStart(5), g);
const mix = (arr, salt) => [...arr].sort((a, b) => ((hash(a.handle + salt) - hash(b.handle + salt)) || 0));
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }
const nL = Number(arg('--luecke') || 0);
if (nL) { console.log(`\nLÜCKE (${nL} Beispiele):`); for (const p of mix(luecke, 'l').slice(0, nL)) console.log('   ', p.title.slice(0, 80).padEnd(80), '|', gKurz(p.g)); }
writeFileSync(`${dirOut}/_luecke.txt`, luecke.map(p => `${p.handle} | ${p.title} | ${p.g}`).join('\n') + '\n');
// Stichproben
const nZ = Number(arg('--n') || 40);
for (const h of (arg('--zeige') || '').split(',').filter(Boolean)) {
  const m = mitglieder.get(h); if (!m) { console.log(`\n--zeige ${h}: unbekannt`); continue; }
  const g = new Map(); for (const p of m) g.set(gKurz(p.g), (g.get(gKurz(p.g)) || 0) + 1);
  console.log(`\n── ${h} (${m.length}) · Google-Verteilung:`); for (const [x, n] of [...g].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log('   ', String(n).padStart(5), x);
  console.log(`   Stichprobe (${Math.min(nZ, m.length)}):`); for (const p of mix(m, h).slice(0, nZ)) console.log('    ', p.title.slice(0, 84).padEnd(84), '|', gKurz(p.g, 2));
}
process.exitCode = fehler.length ? 2 : 0;
