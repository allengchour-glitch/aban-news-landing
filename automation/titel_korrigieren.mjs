#!/usr/bin/env node
/**
 * Korrigiert Produkttitel, die etwas anderes versprechen, als das Produkt laut Lieferantendaten ist
 * («Leinen-Set» aus Polyester, «Kinderleder-Schuhe» aus Kunstleder, «Hundekuscheldecke», die ein Pullover ist).
 *
 * WARUM (26.10.2026): Die Textagenten folgten dem Datenblatt und meldeten rund zwanzig Titel, die dem widersprechen. Ein falscher
 * Material- oder Produktname im Titel ist eine irreführende Angabe (UWG) — und der neue Fliesstext wäre zum Titel im Widerspruch.
 *
 * Eingabe: JSON-Datei { "<handle>": "<neuer Titel>", … }   (TITEL_DATEI=pfad)
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Der SEO-Titel und die SEO-Beschreibung werden aus dem neuen Titel neu erzeugt
 * (`ProductInput.seo` ist ein Ersetzen — beide Felder gehen darum immer zusammen mit). Das Handle (die Adresse) bleibt unverändert.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { seoTitel } from './lib/seo_titel.mjs';
import { VERBOTEN } from './lib/fakten_block.mjs';

const LIVE = process.env.LIVE === '1';
const map = JSON.parse(readFileSync(process.env.TITEL_DATEI || '/dev/stdin', 'utf8'));
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

let ok = 0, abgelehnt = 0;
for (const [handle, neu] of Object.entries(map)) {
  const titel = String(neu).trim();
  if (titel.length < 8 || titel.length > 120 || VERBOTEN.test(titel) || /ß|[一-鿿]/.test(titel)) { console.log(`✗ ${handle}: Titel nicht zulässig «${titel}»`); abgelehnt++; continue; }
  const p = (await q(`query($h:String!){productByHandle(handle:$h){id title status}}`, { h: handle })).productByHandle;
  if (!p) { console.log(`✗ ${handle}: nicht gefunden`); abgelehnt++; continue; }
  console.log(`${LIVE ? '' : '[Trockenlauf] '}${handle}\n   «${p.title}» → «${titel}»`);
  if (!LIVE) { ok++; continue; }
  const u = (await q(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`, { i: { id: p.id, title: titel, seo: seoTitel(titel) } })).productUpdate;
  if (u.userErrors.length) { console.log('   ✗', JSON.stringify(u.userErrors)); abgelehnt++; continue; }
  appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · titel ${handle}\n`);
  ok++;
}
console.log(`\n${LIVE ? 'GEÄNDERT' : 'WÜRDE ÄNDERN'}: ${ok} · abgelehnt ${abgelehnt}`);
