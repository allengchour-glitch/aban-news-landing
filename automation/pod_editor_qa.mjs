#!/usr/bin/env node
/* pod_editor_qa.mjs — QA-Wächter für den «Selbst gestalten»-Editor.
 * Prüft die aktiven, mit printful_personalized_product markierten Editor-Produkte:
 *   1. Canvas-URLs müssen HTTP 200 liefern (404/403 = Editor zeigt KEIN Produkt → Conversion-Killer).
 *   2. Alte Canvas-Bildlinks auf abannews.com melden. V6-Karten haben eigene Datenquellen.
 *   3. V6-Karten und konfigurierte Vorschaudaten als JSON laden und prüfen; JS ohne ?v=-Ketten.
 * Ohne Argumente werden die aktiven getaggten Produkte geprüft. Für einzelne aktive Produkte,
 * auch ohne Tag: --produkt-id 15422857642369 (wiederholbar, auch als Shopify-Produkt-GID).
 * Exit 1 bei Befunden (für CI/Session-Checks). ENV: SHOPIFY_CLIENT_ID/SECRET
 * REGEL (2026-07-06, teuer gelernt): Editor-Canvas-Bilder IMMER zuerst auf die Shopify-CDN
 * hochladen (upload_to_shopify_cdn.mjs) und die URL aus der Antwort nehmen — nie URLs raten!
 */
import { parseArgs } from 'node:util';
import { pruefeEditor } from './lib/pod_editor_daten.mjs';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  // 22.09.2026: Client-Secret erreicht laufende Sessions nicht (Env leer) → Token-Datei wie alle Waechter
  try { const t = (await import('node:fs')).readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim(); if (t) return t; } catch {}
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  if (!r.ok) throw new Error(`Shopify-Anmeldung fehlgeschlagen (HTTP ${r.status}).`);
  const token = (await r.json()).access_token;
  if (!token) throw new Error('Shopify-Anmeldung lieferte keinen Zugriffstoken.');
  return token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }) });
    if (!r.ok) throw new Error(`Shopify-Abfrage fehlgeschlagen (HTTP ${r.status}). Editor-QA unvollständig.`);
    const j = await r.json();
    if (j.errors?.length) {
      if (j.errors.every(e => e.extensions?.code === 'THROTTLED')) { await sleep(3000); continue; }
      throw new Error('Shopify-GraphQL meldet Fehler. Editor-QA unvollständig.');
    }
    return j.data;
  }
  throw new Error('Shopify-Abfrage blieb gedrosselt. Editor-QA unvollständig.');
}

const { values } = parseArgs({ options: { 'produkt-id': { type: 'string', multiple: true, default: [] } } });
const ids = new Set();
for (const eingabe of values['produkt-id']) {
  const treffer = /^(?:gid:\/\/shopify\/Product\/)?([1-9]\d{0,19})$/.exec(eingabe);
  if (!treffer || BigInt(treffer[1]) > 18446744073709551615n) throw new Error('Ungültige Shopify-Produkt-ID: ' + eingabe);
  ids.add('gid://shopify/Product/' + treffer[1]);
}

async function* produkte(t) {
  if (ids.size) {
    for (const id of ids) {
      const d = await gql(t, `query($id:ID!){product(id:$id){id status handle descriptionHtml}}`, { id });
      const produkt = d?.product;
      if (produkt?.id !== id || !produkt.handle || typeof produkt.descriptionHtml !== 'string') {
        throw new Error('Angefordertes Produkt fehlt oder ist unvollständig: ' + id);
      }
      if (produkt.status !== 'ACTIVE') throw new Error('Angefordertes Produkt ist nicht aktiv: ' + id);
      yield produkt;
    }
    return;
  }
  let cursor = null;
  const cursors = new Set();
  while (true) {
    const d = await gql(t, `query($c:String){ products(first:50,after:$c,query:"tag:printful_personalized_product status:active"){
      pageInfo{hasNextPage endCursor} edges{node{ handle descriptionHtml }} }}`, { c: cursor });
    const page = d?.products;
    if (!Array.isArray(page?.edges) || typeof page.pageInfo?.hasNextPage !== 'boolean') {
      throw new Error('Unvollständige Shopify-Produktseite. Editor-QA abgebrochen.');
    }
    for (const e of page.edges) yield e.node;
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new Error('Kein neuer Shopify-Cursor. Editor-QA unvollständig.');
    cursors.add(cursor);
  }
}

const t = await tok();
let checked = 0, v6 = 0;
const findings = [];
for await (const produkt of produkte(t)) {
  const qa = await pruefeEditor(produkt.descriptionHtml || '');
  if (qa.erkannt) checked++;
  else if (ids.size) findings.push(produkt.handle + ': Kein Editor erkannt.');
  if (qa.v6) v6++;
  findings.push(...qa.befunde.map(meldung => produkt.handle + ': ' + meldung));
}
if (!checked && !ids.size) findings.push('Keine Editor-Produkte erkannt. Tagfilter und Produkt-Markup prüfen.');
console.log(`Editor-QA: ${checked} Editor-Produkte geprüft (davon ${v6} mit V6), ${findings.length} Befunde.`);
findings.forEach(f => console.log(' ✗', f));
process.exit(findings.length ? 1 : 0);
