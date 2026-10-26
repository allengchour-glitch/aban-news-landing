#!/usr/bin/env node
/**
 * Kategorie «Tassen & Becher»: setzt ein Tag an die geprüften Trinkgefässe und legt die Collection daran an.
 *
 * WARUM (25.10.2026): 100 aktive Tassen und Becher, aber keine Tassen-Kategorie (die einzige verwandte Kollektion hatte 3 Produkte).
 * Eine Titelregel im Shop wäre falsch: «Tasse» steckt in «Tassel» (Fransen) — siehe lib/tassen_regel.mjs.
 *
 * TROCKENLAUF IST VORGABE: ohne LIVE=1 wird nur gezählt und gelistet.
 * Aufruf:  node automation/tassen_kategorie.mjs        (Trockenlauf)
 *          LIVE=1 node automation/tassen_kategorie.mjs  (Tags setzen/entfernen, Collection anlegen + publizieren)
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { istTasseOderBecher, TASSEN_TAG } from './lib/tassen_regel.mjs';

const LIVE = process.env.LIVE === '1';
const COLL_HANDLE = 'tassen-becher';
const TITEL = 'Tassen & Becher';
const BESCHREIBUNG = '<p>Tassen und Becher für Kaffee, Tee und unterwegs: Keramiktassen, isolierte Edelstahl-Becher, Tassen-Sets für Paare und Tassen mit Schweizer Motiven. '
  + 'Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt, 30 Tage Rückgabe.</p>';
const SEO_TITEL = 'Tassen & Becher online kaufen | LuxeStyle CH';
const SEO_BESCHR = 'Tassen & Becher für Kaffee und Tee: Keramik, Edelstahl-Thermobecher, Tassen-Sets und Schweizer Motive. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.';
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);

  // 1) Kandidaten (breit gesucht, dann mit der Regel geprüft) und bisherige Tag-Träger
  const lesen = async suche => {
    const out = []; let c = null;
    do {
      const d = await q(`query($c:String,$q:String){products(first:100,after:$c,query:$q){nodes{id title tags} pageInfo{hasNextPage endCursor}}}`, { c, q: suche });
      out.push(...d.products.nodes); c = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
    } while (c);
    return out;
  };
  const kandidaten = await lesen('status:active AND (title:*Tasse* OR title:*Becher* OR title:*Mug* OR title:*Teeservice* OR title:*Teeset* OR title:*Tee-Set*)');
  const gewaehlt = kandidaten.filter(p => istTasseOderBecher(p.title));
  const bisher = await lesen(`tag:${TASSEN_TAG}`);
  const gewaehltIds = new Set(gewaehlt.map(p => p.id));
  const dazu = gewaehlt.filter(p => !p.tags.includes(TASSEN_TAG));
  const weg = bisher.filter(p => !gewaehltIds.has(p.id));
  console.log(JSON.stringify({ kandidaten: kandidaten.length, gewaehlt: gewaehlt.length, bereitsMitTag: bisher.length, tagSetzen: dazu.length, tagEntfernen: weg.length }));
  if (!LIVE) { console.log('Trockenlauf — nichts geschrieben. Beispiele:', gewaehlt.slice(0, 5).map(p => p.title)); return; }

  const stapel = async (fn, ids) => {
    for (let i = 0; i < ids.length; i += 20) {
      const teil = ids.slice(i, i + 20);
      const m = `mutation{${teil.map((id, k) => `a${k}:${fn}(id:${JSON.stringify(id)},tags:${JSON.stringify([TASSEN_TAG])}){userErrors{field message}}`).join(' ')}}`;
      const d = await q(m, {});
      for (let k = 0; k < teil.length; k++) if (d[`a${k}`].userErrors.length) throw new Error(fn + ' ' + JSON.stringify(d[`a${k}`].userErrors));
    }
  };
  await stapel('tagsRemove', weg.map(p => p.id)); await stapel('tagsAdd', dazu.map(p => p.id));
  console.log('Tags: entfernt', weg.length, '· gesetzt', dazu.length);

  // 2) Collection (Publish-Falle: per API angelegt ist sie NICHT im Onlineshop → in dieselben Kanäle wie ein Vorbild publizieren)
  let c = (await q(`query($h:String!){collectionByHandle(handle:$h){id handle title}}`, { h: COLL_HANDLE })).collectionByHandle;
  if (!c) {
    const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`)).collectionByHandle;
    const d = await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle title} userErrors{field message}}}`, { i: {
      title: TITEL, handle: COLL_HANDLE, sortOrder: 'BEST_SELLING', descriptionHtml: BESCHREIBUNG, seo: { title: SEO_TITEL, description: SEO_BESCHR },
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: TASSEN_TAG }] } } });
    if (d.collectionCreate.userErrors.length) throw new Error('collectionCreate ' + JSON.stringify(d.collectionCreate.userErrors));
    c = d.collectionCreate.collection;
    const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
    const p = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: c.id, i: pubs });
    if (p.publishablePublish.userErrors.length) throw new Error('publishablePublish ' + JSON.stringify(p.publishablePublish.userErrors));
    console.log('Collection angelegt:', c.handle, '· publiziert in', pubs.length, 'Kanälen');
  } else console.log('Collection existiert schon:', c.handle);

  // 3) Mitgliedschaft entsteht verzögert
  let n = 0;
  for (let i = 0; i < 10; i++) {
    n = (await q(`query($id:ID!){collection(id:$id){productsCount{count}}}`, { id: c.id })).collection.productsCount.count;
    if (n >= gewaehlt.length) break; await schlaf(5000);
  }
  console.log('Mitglieder:', n, 'von', gewaehlt.length);
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
