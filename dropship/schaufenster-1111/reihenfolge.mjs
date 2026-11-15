#!/usr/bin/env node
/**
 * Sicherung und Rücknahme der Handreihenfolge von Collections (Weihnachts-Schaufenster). automation/verfuegbar_zuerst.mjs speichert die alte
 * Handreihenfolge NICHT (ZURUECK=1 dort setzt nur sortOrder zurück); dieses Werkzeug schon.
 *   MODUS=sichern HANDLES=a,b DATEI=<json>     liest die heutige Reihenfolge (nur lesen) und schreibt sie in DATEI
 *   MODUS=zurueck DATEI=<json> [LIVE=1]          stellt die gesicherte Reihenfolge wieder her (Trockenlauf Vorgabe). Produkte, die seither dazukamen,
 *                                                bleiben in ihrer heutigen Reihenfolge hinten; danach frisch nachlesen. Exit 1 bei jeder Abweichung.
 * WICHTIG vor MODUS=zurueck: erst die Pin-Einträge (dropship/kategorie-schaufenster-pins.json) auf main löschen, sonst stellt der Lager-Wächter
 * die Pins beim nächsten Zeitplanlauf wieder vorn (README in diesem Ordner).
 * Rechnung der Züge: zuege() aus automation/lib/verfuegbar_rang.mjs (getestet). Aufruf aus dem Repo-Wurzelordner.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { zuege } from '../../automation/lib/verfuegbar_rang.mjs';
import { verbinden, schlaf } from './shop.mjs';

const MODUS = process.env.MODUS, LIVE = process.env.LIVE === '1', DATEI = process.env.DATEI;
if (!DATEI) { console.error('DATEI=<json> fehlt'); process.exit(1); }
if (MODUS !== 'sichern' && MODUS !== 'zurueck') { console.error('MODUS=sichern oder MODUS=zurueck'); process.exit(1); }
const q = await verbinden();
async function ids(cid) { const out = []; let cur = null; for (;;) { const d = (await q(`query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id}}}}`, { id: cid, c: cur })).collection.products; out.push(...d.nodes.map(n => n.id)); if (!d.pageInfo.hasNextPage) return out; cur = d.pageInfo.endCursor; } }
const coll = async h => (await q(`query($h:String!){collectionByHandle(handle:$h){id sortOrder}}`, { h })).collectionByHandle;

if (MODUS === 'sichern') {
  const out = { gesichert: new Date().toISOString(), collections: {} }; let fehlt = 0;
  for (const h of (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const c = await coll(h); if (!c) { console.log(`${h}: fehlt`); fehlt++; continue; }
    out.collections[h] = { id: c.id, sortOrder: c.sortOrder, ids: await ids(c.id) };
    console.log(`${h}: ${out.collections[h].ids.length} Produkte gesichert (${c.sortOrder})`);
  }
  writeFileSync(DATEI, JSON.stringify(out) + '\n');
  if (fehlt || !Object.keys(out.collections).length) process.exitCode = 1;
} else {
  const s = JSON.parse(readFileSync(DATEI, 'utf8')); let fehler = 0;
  for (const [h, alt] of Object.entries(s.collections)) {
    const c = await coll(h); if (!c || c.id !== alt.id) { console.log(`${h}: Collection fehlt oder andere ID`); fehler++; continue; }
    if (c.sortOrder !== 'MANUAL') { console.log(`${h}: Sortierung ${c.sortOrder}, keine Handreihenfolge — übersprungen`); continue; }
    const jetzt = await ids(c.id), drin = new Set(jetzt), war = new Set(alt.ids);
    const ziel = [...alt.ids.filter(id => drin.has(id)), ...jetzt.filter(id => !war.has(id))];
    const m = zuege(jetzt, ziel);
    console.log(`${h}: ${m.length} Züge${LIVE ? '' : ' [Trockenlauf]'}`);
    if (!LIVE || !m.length) continue;
    let fehlerBeiZug = false;
    for (let k = 0; k < m.length; k += 250) {
      const r = (await q(`mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}`, { id: c.id, m: m.slice(k, k + 250) })).collectionReorderProducts;
      if (r.userErrors.length) { console.log(`   ✗ ${JSON.stringify(r.userErrors)}`); fehlerBeiZug = true; break; }
      await schlaf(4000);
    }
    if (fehlerBeiZug) { fehler++; continue; }
    let ok = false;
    for (let t = 0; t < 12 && !ok; t++) { await schlaf(5000); const n = await ids(c.id); ok = n.length === ziel.length && n.every((id, i) => id === ziel[i]); }
    console.log(ok ? '   ✓ nachgelesen gleich der Sicherung' : '   ✗ Nachlese weicht ab'); if (!ok) fehler++;
  }
  if (fehler) process.exitCode = 1;
}
