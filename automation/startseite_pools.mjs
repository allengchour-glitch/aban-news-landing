#!/usr/bin/env node
/**
 * Startseite wechselt: schreibt die vier Pool-Sammlungen, aus denen sections/luxe-edit-home.liquid alle paar Stunden ein anderes
 * Fenster zeigt (Besitzer 04.11.2026: «mache nicht immer die gleiche produkt rein, wechsle oft»). Rechnung: lib/startseite_pool.mjs.
 *
 * Die Pools bestehen NUR aus von Hand gesichteten Produkten (`dropship/startseite-wechsel-0411/freigabe.json`: `freigabe` und `gepinnt`).
 * Das Skript prüft bei jedem Lauf nur noch neu, ob sie verkaufbar, nicht gesperrt und bildstark genug sind, und wirft sonst heraus.
 * Neue Produkte kommen nie von selbst hinein: `VORSCHLAG=1` listet Kandidaten für die nächste Sichtungsrunde (Bilder ansehen!), die
 * Aufnahme ist ein Eintrag in freigabe.json.
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Schreibt nur die vier Sammlungen `startseite-pool-*` (handgeordnet, im Onlineshop
 * veröffentlicht, für Suchmaschinen versteckt `seo.hidden=1`); nie Produkte, nie das Theme.
 *
 * Aufruf:  node automation/startseite_pools.mjs                      (Trockenlauf: Bericht der vier Pools)
 *          LIVE=1 node automation/startseite_pools.mjs               (Sammlungen anlegen/abgleichen/ordnen, danach frisch nachlesen)
 *          VORSCHLAG=1 node automation/startseite_pools.mjs          (Kandidaten für neue Sichtung, schreibt nichts)
 * Schalter: NEU=1 (Katalog-Zwischenspeicher < 6 h ignorieren) · MONAT=1..12 (Jahreszeit überschreiben) · FREIGABE=Pfad
 * Exit: 0 gut · 1 Fehler · 3 Nachlesen weicht ab
 */
import { readFileSync, writeFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { baueAusFreigabe, baueAllePools, REIHEN, ROTATION } from './lib/startseite_pool.mjs';

const LIVE = process.env.LIVE === '1';
const FREIGABE = process.env.FREIGABE || 'dropship/startseite-wechsel-0411/freigabe.json';
const CACHE = '/tmp/startseite_bulk.json';
const LEDGER = 'dropship/startseite_pools_ledger.txt';
const MONAT = process.env.MONAT ? parseInt(process.env.MONAT, 10) : new Date().getMonth() + 1;
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const ledger = (z) => { if (LIVE) appendFileSync(LEDGER, `${new Date().toISOString()} · ${z}\n`); };

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token;
if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

async function katalog() {
  if (process.env.NEU !== '1' && existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < 6 * 3600 * 1000) {
    console.log('Katalog aus dem Zwischenspeicher (< 6 h)'); return JSON.parse(readFileSync(CACHE, 'utf8'));
  }
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) throw new Error('Es läuft schon eine Bulk-Abfrage — abwarten');
  const inner = `{ products(query:"status:active") { edges { node { id handle title productType tags totalInventory tracksInventory priceRangeV2{minVariantPrice{amount}} featuredMedia{preview{image{url width height}}} j:metafield(namespace:"judgeme",key:"review_widget_data"){value} } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) throw new Error(JSON.stringify(m.userErrors));
  for (let i = 0; i < 240; i++) {
    await schlaf(10000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
    if (s.status === 'COMPLETED') {
      const zeilen = (await (await fetch(s.url)).text()).split('\n').filter(Boolean).map((z) => JSON.parse(z));
      if (zeilen.length !== Number(s.objectCount)) throw new Error(`Bulk unvollständig: ${zeilen.length} von ${s.objectCount}`);
      writeFileSync(CACHE, JSON.stringify(zeilen)); return zeilen;
    }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error(`Bulk ${s.status} ${s.errorCode}`);
  }
  throw new Error('Bulk-Abfrage dauert zu lange');
}

async function mitglieder(id) {
  const ids = []; let cur = null;
  for (;;) {
    const d = (await q(`query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle}}}}`, { id, c: cur })).collection.products;
    ids.push(...d.nodes.map((n) => ({ id: n.id, handle: n.handle })));
    if (!d.pageInfo.hasNextPage) return ids;
    cur = d.pageInfo.endCursor;
  }
}

async function sammlungSchreiben(name, pool, pubs) {
  const k = REIHEN[name];
  let c = (await q(`query($h:String!){collectionByHandle(handle:$h){id handle sortOrder}}`, { h: k.handle })).collectionByHandle;
  if (!c) {
    const d = (await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle sortOrder} userErrors{field message}}}`, { i: {
      title: k.titel, handle: k.handle, sortOrder: 'MANUAL', descriptionHtml: '<p>Interne Auswahl für die Startseite. Nicht zum Stöbern gedacht.</p>',
      metafields: [{ namespace: 'seo', key: 'hidden', type: 'number_integer', value: '1' }] } })).collectionCreate;
    if (d.userErrors.length) throw new Error(`collectionCreate ${k.handle} ${JSON.stringify(d.userErrors)}`);
    c = d.collection;
    const p = (await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: c.id, i: pubs })).publishablePublish;
    if (p.userErrors.length) throw new Error(`publishablePublish ${k.handle} ${JSON.stringify(p.userErrors)}`);
    console.log(`  angelegt: ${k.handle} (veröffentlicht in ${pubs.length} Kanälen)`); ledger(`angelegt ${k.handle}`);
  } else if (c.sortOrder !== 'MANUAL') {
    const u = (await q(`mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}`, { i: { id: c.id, sortOrder: 'MANUAL' } })).collectionUpdate;
    if (u.userErrors.length) throw new Error(`sortOrder ${k.handle} ${JSON.stringify(u.userErrors)}`);
  }
  const jetzt = await mitglieder(c.id);
  const soll = new Set(pool.map((p) => p.id));
  const haben = new Set(jetzt.map((m) => m.id));
  const neu = pool.filter((p) => !haben.has(p.id)).map((p) => p.id);
  const weg = jetzt.filter((m) => !soll.has(m.id)).map((m) => m.id);
  if (neu.length) {
    const a = (await q(`mutation($id:ID!,$p:[ID!]!){collectionAddProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: c.id, p: neu })).collectionAddProducts;
    if (a.userErrors.length) throw new Error(`collectionAddProducts ${k.handle} ${JSON.stringify(a.userErrors)}`);
  }
  if (weg.length) {
    const a = (await q(`mutation($id:ID!,$p:[ID!]!){collectionRemoveProducts(id:$id,productIds:$p){userErrors{field message}}}`, { id: c.id, p: weg })).collectionRemoveProducts;
    if (a.userErrors.length) throw new Error(`collectionRemoveProducts ${k.handle} ${JSON.stringify(a.userErrors)}`);
    await schlaf(4000);
  }
  const moves = pool.map((p, i) => ({ id: p.id, newPosition: String(i) }));
  const m = (await q(`mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}`, { id: c.id, m: moves })).collectionReorderProducts;
  if (m.userErrors.length) throw new Error(`collectionReorderProducts ${k.handle} ${JSON.stringify(m.userErrors)}`);
  console.log(`  ${k.handle}: +${neu.length} −${weg.length}, Reihenfolge gesetzt`); ledger(`abgeglichen ${k.handle} +${neu.length} -${weg.length} n=${pool.length}`);
  return c.id;
}

async function nachlesen(name, id, pool) {
  for (let i = 0; i < 8; i++) {
    await schlaf(i === 0 ? 8000 : 6000);
    const jetzt = (await mitglieder(id)).map((m) => m.handle);
    if (jetzt.length === pool.length && jetzt.every((h, k) => h === pool[k].handle)) return true;
  }
  return false;
}

async function main() {
  const freigabe = JSON.parse(readFileSync(FREIGABE, 'utf8'));
  const zeilen = await katalog();
  console.log(`Katalog: ${zeilen.length} aktive Produkte · Monat ${MONAT} · Fenster alle ${ROTATION.stunden} h, Schritte ${ROTATION.schritte.join("/")}${LIVE ? '' : ' [Trockenlauf]'}\n`);

  if (process.env.VORSCHLAG === '1') {
    const schon = new Set([...Object.keys(freigabe.ausschluss || {}), ...Object.values(freigabe.freigabe || {}).flat(), ...Object.values(freigabe.gepinnt || {}).flat()]);
    const v = baueAllePools(zeilen, { monat: MONAT, ausschluss: schon });
    for (const [n, l] of Object.entries(v.pools)) {
      console.log(`== Vorschlag ${n}: ${l.length}`);
      l.forEach((p, i) => console.log(`${String(i + 1).padStart(2)} ${p.handle} · ${p.productType} · CHF ${p.preis} · ${p.bewertung ? `${p.bewertung.a}/${p.bewertung.c}` : '-'} · ${p.title.slice(0, 60)}`));
    }
    return 0;
  }

  const { pools, verworfen } = baueAusFreigabe(zeilen, freigabe, { monat: MONAT });
  for (const [n, l] of Object.entries(pools)) {
    const k = REIHEN[n];
    console.log(`${n}: ${l.length} Produkte (Fenster ${k.fenster}, zeigt ${k.zeigt}${l.length < k.zeigt ? ' — ZU WENIG, das Theme fällt auf die feste Liste zurück' : ''})`);
    l.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)} ${p.handle.slice(0, 48).padEnd(48)} CHF ${String(p.preis).padStart(5)} ${p.productType.slice(0, 20)}`));
  }
  if (verworfen.length) console.log(`\nverworfen (${verworfen.length}):\n` + verworfen.map((v) => `  ${v.reihe} ${v.handle} — ${v.grund}`).join('\n'));
  if (!LIVE) { console.log('\nTrockenlauf, nichts geschrieben'); return 0; }
  if (Object.values(pools).some((l, i) => l.length < Object.values(REIHEN)[i].zeigt)) { console.error('ABBRUCH: ein Pool hat weniger Produkte als die Reihe zeigt'); return 1; }

  const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id}}}}}`)).collectionByHandle;
  const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter((n) => n.isPublished).map((n) => ({ publicationId: n.publication.id }));
  if (!pubs.length) { console.error('Keine Veröffentlichungskanäle gefunden'); return 1; }
  console.log('\nSchreibe:');
  const ids = {};
  for (const [n, l] of Object.entries(pools)) ids[n] = await sammlungSchreiben(n, l, pubs);
  console.log('\nNachlesen:');
  let ok = true;
  for (const [n, l] of Object.entries(pools)) { const g = await nachlesen(n, ids[n], l); console.log(`  ${REIHEN[n].handle}: ${g ? 'GLEICH' : 'ABWEICHUNG'}`); ok = ok && g; }
  return ok ? 0 : 3;
}
main().then((c) => process.exit(c), (e) => { console.error(e.message || e); process.exit(1); });
