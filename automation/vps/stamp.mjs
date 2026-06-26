#!/usr/bin/env node
/* stamp.mjs — generischer Metafeld-Stempler. Schreibt luxe.<STAMP_KEY> = <STAMP_VALUE>. So kann der VPS
 * (ohne Git-Push-Rechte) Ergebnisse zurueckmelden, die JEDE Session (auch die Cloud) per Shopify lesen kann.
 * ENV: SHOPIFY_CLIENT_ID/SECRET/SHOP, STAMP_KEY, STAMP_VALUE. No-op-sicher.
 */
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const KEY = process.env.STAMP_KEY, VALUE = (process.env.STAMP_VALUE || '').slice(0, 250);
if (!ID || !SEC || !KEY) { console.log('stamp: fehlende ENV (CLIENT_ID/SECRET/STAMP_KEY) -> skip'); process.exit(0); }
try {
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
  const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
  const m = 'mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){userErrors{message}}}';
  await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: m, variables: { mf: [{ ownerId: sid, namespace: 'luxe', key: KEY, type: 'single_line_text_field', value: VALUE }] } }) });
  console.log(`stamp: luxe.${KEY} = ${VALUE}`);
} catch (e) { console.log('stamp Fehler:', String(e).slice(0, 80)); }
