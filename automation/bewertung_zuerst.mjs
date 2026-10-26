#!/usr/bin/env node
/**
 * «Gut bewertete zuerst» auf den Kategorieseiten: setzt je Collection die manuelle Reihenfolge — bewertete Produkte (≥ 4 Sterne) vorn,
 * danach die Bestseller, der Rest bleibt in seiner Reihenfolge. Rechnung: lib/bewertung_rang.mjs (getestet).
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Rückgängig: je Collection sortOrder wieder auf BEST_SELLING setzen (BEST_SELLING=1 + LIVE=1 macht das für alle Ziele).
 *
 * Ablauf: 1) Bulk-Abfrage aller aktiven Produkte (Judge.me-Feld, Tags, Titel, Typ) — einmal, 6 Stunden zwischengespeichert;
 *         2) Mitglieder je Collection LOKAL aus den Regeln bestimmen (wie kategorie_pruefer.mjs; nicht auswertbare Regeln werden übersprungen);
 *         3) Rangliste → Bestseller davor lesen → sortOrder MANUAL → collectionReorderProducts.
 *
 * Aufruf:  MENUE=1 node automation/bewertung_zuerst.mjs                     (alle Collections im Hauptmenü, Trockenlauf)
 *          HANDLES=haustier-hunde,solar-energie LIVE=1 node automation/bewertung_zuerst.mjs
 * Schalter: MIN_MITGLIEDER=10 · MAX_OBEN=120 · NEU=1 (Bulk-Zwischenspeicher ignorieren)
 */
import { readFileSync, writeFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { mitglieder } from './kategorie_pruefer.mjs';
import { rangliste, bewegungen, bewertungAus } from './lib/bewertung_rang.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.BEST_SELLING === '1';
const MIN = Number(process.env.MIN_MITGLIEDER || 10), MAX_OBEN = Number(process.env.MAX_OBEN || 120);
const CACHE = '/tmp/bewertung_bulk.jsonl';
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function bulkProdukte(q) {
  if (process.env.NEU !== '1' && existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < 6 * 3600 * 1000) { console.log('Bulk-Datei aus dem Zwischenspeicher (< 6 h)'); return readFileSync(CACHE, 'utf8'); }
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) throw new Error('Es läuft schon eine Bulk-Abfrage — abwarten');
  const inner = `{ products(query:"status:active") { edges { node { id handle title productType tags metafield(namespace:"judgeme", key:"review_widget_data"){ value } } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error(JSON.stringify(m.userErrors));
  for (let i = 0; i < 240; i++) {
    await schlaf(15000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
    if (i % 4 === 0) console.log(`  Bulk: ${s.status} ${s.objectCount}`);
    if (s.status === 'COMPLETED') { const t = await (await fetch(s.url)).text(); writeFileSync(CACHE, t); return t; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode || ''}`);
  }
  throw new Error('Bulk-Abfrage dauert zu lange');
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  const jsonl = await bulkProdukte(q);
  const produkte = [], bewertet = new Map();
  for (const z of jsonl.split('\n')) {
    if (!z) continue; const o = JSON.parse(z);
    produkte.push({ id: o.id, handle: o.handle, title: o.title, productType: o.productType || '', tags: o.tags || [] });
    const b = bewertungAus(o.metafield?.value); if (b) bewertet.set(o.id, b);
  }
  console.log(`Aktive Produkte ${produkte.length} · mit Bewertung ${bewertet.size} · ≥ 4 Sterne ${[...bewertet.values()].filter(b => b.a >= 4).length}`);

  // Ziele
  let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!handles.length && process.env.MENUE === '1') {
    const set = new Set();
    const m = (await q(`query{menus(first:1,query:"handle:main-menu"){nodes{items{url items{url items{url}}}}}}`)).menus.nodes[0];
    (function lauf(l) { for (const i of l || []) { const mm = (i.url || '').match(/\/collections\/([a-z0-9%\-]+)/i); if (mm) set.add(decodeURIComponent(mm[1])); lauf(i.items); } })(m.items);
    handles = [...set];
  }
  if (!handles.length) { console.error('HANDLES=a,b oder MENUE=1 angeben'); process.exit(1); }
  console.log(`Ziele: ${handles.length} Collections${LIVE ? '' : ' [Trockenlauf]'}${ZURUECK ? ' [ZURÜCK auf BEST_SELLING]' : ''}\n`);

  const stat = { geaendert: 0, ohneBewertete: 0, nichtAuswertbar: 0, klein: 0, fehlt: 0, fehler: 0 };
  for (const h of handles) {
    try {
      const c = (await q(`query($h:String!){collectionByHandle(handle:$h){id title sortOrder productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}`, { h })).collectionByHandle;
      if (!c) { stat.fehlt++; console.log(`${h}: Collection fehlt`); continue; }
      if (ZURUECK) {
        if (c.sortOrder !== 'MANUAL') continue;
        if (LIVE) { const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, sortOrder: 'BEST_SELLING' } })).collectionUpdate; console.log(`${h}: zurück auf BEST_SELLING ${JSON.stringify(u.userErrors)}`); stat.geaendert++; } else console.log(`${h}: würde zurück auf BEST_SELLING`);
        continue;
      }
      if (!c.ruleSet) { stat.nichtAuswertbar++; console.log(`${h}: manuelle Collection (keine Regeln) — übersprungen`); continue; }
      const mit = mitglieder(c.ruleSet, produkte);
      if (!mit) { stat.nichtAuswertbar++; console.log(`${h}: Regel nicht lokal auswertbar — übersprungen`); continue; }
      if (mit.length < MIN) { stat.klein++; continue; }
      const oben = rangliste(bewertet, mit, { max: MAX_OBEN });
      if (!oben.length) { stat.ohneBewertete++; console.log(`${h}: ${mit.length} Mitglieder, keins mit ≥ 4 Sternen`); continue; }
      const kopf = oben.slice(0, 3).map(id => { const p = produkte.find(x => x.id === id), b = bewertet.get(id); return `${b.a}★×${b.c} ${p.handle.slice(0, 26)}`; }).join(' | ');
      console.log(`${h}: ${mit.length} Mitglieder · ${oben.length} bewertet nach vorn · ${kopf}`);
      if (!LIVE) continue;
      const bs = (await q(`query($id:ID!){collection(id:$id){products(first:100,sortKey:BEST_SELLING){nodes{id}}}}`, { id: c.id })).collection.products.nodes.map(n => n.id);
      if (c.sortOrder !== 'MANUAL') {
        const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, sortOrder: 'MANUAL' } })).collectionUpdate;
        if (u.userErrors.length) { console.log(`   ✗ sortOrder: ${JSON.stringify(u.userErrors)}`); stat.fehler++; continue; }
      }
      const moves = bewegungen(oben, bs);
      const rr = (await q(`mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}`, { id: c.id, m: moves })).collectionReorderProducts;
      if (rr.userErrors.length) { console.log(`   ✗ reorder: ${JSON.stringify(rr.userErrors)}`); stat.fehler++; continue; }
      appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · bewertung-zuerst ${h} ${oben.length}\n`);
      stat.geaendert++;
    } catch (e) { stat.fehler++; console.log(`${h}: FEHLER ${e.message}`); }
  }
  console.log(`\n${LIVE ? 'GEÄNDERT' : 'WÜRDE ÄNDERN'}: ${LIVE ? stat.geaendert : handles.length - stat.ohneBewertete - stat.nichtAuswertbar - stat.klein - stat.fehlt} · ohne bewertete Produkte ${stat.ohneBewertete} · nicht auswertbar ${stat.nichtAuswertbar} · zu klein ${stat.klein} · fehlt ${stat.fehlt} · Fehler ${stat.fehler}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
