#!/usr/bin/env node
/**
 * «Verfügbares zuerst»: stellt auf Kategorieseiten die kaufbaren Produkte nach vorn und die ausverkauften ans Ende.
 * Grund (GEMESSEN 3.11.2026): in `kostueme-fasnacht` standen 22 von den ersten 48 aktiven Produkten ausverkauft, in `ft-kostuem-accessoire` 28.
 * Die Reihenfolge innerhalb der beiden Gruppen bleibt (neu zuerst, Bewertung zuerst, Handsortierung). Rechnung: lib/verfuegbar_rang.mjs (getestet).
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Es wird nichts versteckt oder gelöscht, nur umsortiert.
 * Rückgängig: je Collection sortOrder auf den «vorher=»-Wert aus dropship/kategorien_ledger.txt setzen (ZURUECK=1 + LIVE=1 macht das;
 * war die Collection vorher MANUAL, bleibt sie MANUAL — die alte Handreihenfolge wird nicht gespeichert).
 *
 * Aufruf:  MENUE=1 node automation/verfuegbar_zuerst.mjs                         (alle Hauptmenü-Collections, nur die ab SCHWELLE angezeigt)
 *          HANDLES=kostueme-fasnacht LIVE=1 node automation/verfuegbar_zuerst.mjs
 * Schalter: SCHWELLE=0.2 (Anteil Ausverkaufter unter den ersten 48 aktiven, ab dem umsortiert wird; mit HANDLES=… 0 = immer) · MIN_MITGLIEDER=10
 *
 * Wiederholen: der Bestand ändert sich (Fortura-Abgleich, Verkäufe), die Reihenfolge veraltet. Mindestens wöchentlich, vor der Fasnacht täglich.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { zielReihenfolge, zuege, ausverkauftVorn, anteilVorn, istVerfuegbarVorn } from './lib/verfuegbar_rang.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const MIN = Number(process.env.MIN_MITGLIEDER || 10);
const LEDGER = 'dropship/kategorien_ledger.txt';
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function lesen(q, id) {
  const ids = [], bestand = new Map(); let cur = null;
  for (;;) {
    const d = (await q(`query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id totalInventory tracksInventory status}}}}`, { id, c: cur })).collection;
    for (const p of d.products.nodes) { ids.push(p.id); bestand.set(p.id, p.status !== 'ACTIVE' ? null : (p.tracksInventory ? p.totalInventory : Infinity)); }
    if (!d.products.pageInfo.hasNextPage) break;
    cur = d.products.pageInfo.endCursor;
  }
  return { ids, bestand };
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  const explizit = handles.length > 0;
  if (!handles.length && process.env.MENUE === '1') {
    const set = new Set();
    const m = (await q(`query{menus(first:1,query:"handle:main-menu"){nodes{items{url items{url items{url}}}}}}`)).menus.nodes[0];
    (function lauf(l) { for (const i of l || []) { const mm = (i.url || '').match(/\/collections\/([a-z0-9%\-]+)/i); if (mm) set.add(decodeURIComponent(mm[1])); lauf(i.items); } })(m.items);
    handles = [...set];
  }
  if (!handles.length) { console.error('HANDLES=a,b oder MENUE=1 angeben'); process.exit(1); }
  const SCHWELLE = process.env.SCHWELLE !== undefined ? Number(process.env.SCHWELLE) : (explizit ? 0 : 0.2);

  const vorher = new Map();
  if (ZURUECK && existsSync(LEDGER)) {
    for (const z of readFileSync(LEDGER, 'utf8').split('\n')) { const m = z.match(/verfuegbar-zuerst (\S+) vorher=(\S+)/); if (m) vorher.set(m[1], m[2]); }
  }
  console.log(`Ziele: ${handles.length} Collections · Schwelle ${SCHWELLE}${LIVE ? '' : ' [Trockenlauf]'}${ZURUECK ? ' [ZURÜCK]' : ''}\n`);

  const stat = { geaendert: 0, unterSchwelle: 0, klein: 0, fehlt: 0, fehler: 0 };
  for (const h of handles) {
    try {
      const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id sortOrder productsCount{count}}}`, { h })).collectionByHandle;
      if (!c) { stat.fehlt++; console.log(`${h}: Collection fehlt`); continue; }
      if (ZURUECK) {
        const alt = vorher.get(h);
        if (!alt || alt === 'MANUAL' || c.sortOrder !== 'MANUAL') continue;
        if (LIVE) { const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, sortOrder: alt } })).collectionUpdate; console.log(`${h}: zurück auf ${alt} ${JSON.stringify(u.userErrors)}`); stat.geaendert++; }
        else console.log(`${h}: würde zurück auf ${alt}`);
        continue;
      }
      if (c.productsCount.count < MIN) { stat.klein++; continue; }
      let { ids, bestand } = await lesen(q, c.id);
      const anteil = anteilVorn(ids, bestand), { von, aus } = ausverkauftVorn(ids, bestand);
      if (anteil < SCHWELLE || (SCHWELLE === 0 && aus === 0 && istVerfuegbarVorn(ids, bestand))) { stat.unterSchwelle++; continue; }
      let ziel = zielReihenfolge(ids, bestand), moves = zuege(ids, ziel);
      console.log(`${h}: ${ids.length} Produkte · ausverkauft unter den ersten ${von} aktiven: ${aus} · Sortierung ${c.sortOrder} · Züge ${moves.length}`);
      if (!LIVE || !moves.length) continue;
      if (c.sortOrder !== 'MANUAL') {
        const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, sortOrder: 'MANUAL' } })).collectionUpdate;
        if (u.userErrors.length) { console.log(`   ✗ sortOrder: ${JSON.stringify(u.userErrors)}`); stat.fehler++; continue; }
        // Reihenfolge nach dem Umschalten NEU lesen: die Züge müssen zur gespeicherten Handreihenfolge passen, nicht zur alten Sortierung
        ({ ids, bestand } = await lesen(q, c.id)); ziel = zielReihenfolge(ids, bestand); moves = zuege(ids, ziel);
      }
      appendFileSync(LEDGER, `${new Date().toISOString()} · verfuegbar-zuerst ${h} vorher=${c.sortOrder} verfuegbar=${ziel.filter(i => bestand.get(i) > 0).length} uebrige=${ids.length - ziel.filter(i => bestand.get(i) > 0).length}\n`);
      let fehlerBeiZug = false;
      for (let k = 0; k < moves.length; k += 250) {
        const rr = (await q(`mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}`, { id: c.id, m: moves.slice(k, k + 250) })).collectionReorderProducts;
        if (rr.userErrors.length) { console.log(`   ✗ reorder: ${JSON.stringify(rr.userErrors)}`); fehlerBeiZug = true; break; }
        await schlaf(4000);
      }
      if (fehlerBeiZug) { stat.fehler++; continue; }
      // Nachlesen: der Auftrag läuft asynchron, daher mehrere Versuche. Ohne bestätigte Nachlese zählt es NICHT als geändert.
      let ok = false;
      for (let t = 0; t < 12 && !ok; t++) {
        await schlaf(5000);
        const nach = await lesen(q, c.id);
        ok = nach.ids.length === ids.length && istVerfuegbarVorn(nach.ids, nach.bestand);
      }
      if (ok) { stat.geaendert++; console.log('   ✓ nachgelesen, verfügbar steht vorn'); } else { stat.fehler++; console.log('   ✗ Nachlese: Reihenfolge noch nicht wie geplant'); }
    } catch (e) { stat.fehler++; console.log(`${h}: FEHLER ${e.message}`); }
  }
  console.log(`\n${LIVE ? 'GEÄNDERT' : 'ÄNDERN WÜRDE'}: ${LIVE ? stat.geaendert : handles.length - stat.unterSchwelle - stat.klein - stat.fehlt - stat.fehler} · unter Schwelle ${stat.unterSchwelle} · zu klein ${stat.klein} · fehlt ${stat.fehlt} · Fehler ${stat.fehler}`);
  if (stat.fehler) process.exitCode = 1;
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
