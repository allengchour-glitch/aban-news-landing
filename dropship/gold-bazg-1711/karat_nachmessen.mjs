#!/usr/bin/env node
/**
 * Unabhängige Nachmessung zu karat_texte.mjs (nur lesend): liest die Produkte der Liste frisch aus Shopify und prüft je Produkt
 *   - Status unverändert ACTIVE, die Felder der Liste gleich `neu` (oder `alt`, falls ZURUECK=1), keine Behauptung mehr in Titel, Beschreibung und SEO-Feldern
 * und optional (STOREFRONT=n) n zufällige Produktseiten im Onlineshop: HTTP 200, Titel/Meta/sichtbarer Text ohne Behauptung (mit Browser-Kopf, 6 s Pause, Drosselung 429 zählt als «nicht messbar»).
 *   node dropship/gold-bazg-1711/karat_nachmessen.mjs        (Umgebung wie karat_texte.mjs; EINGABE=…; ONLY=h1,h2; STOREFRONT=8)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LESEN, flach, felderVon, belege, gleichFeld, FELDER } from './karat_texte.mjs';
const [{ shopifyGql }, { shopifyClientSecret }] = await Promise.all([import('../../automation/lib/shopify_gql.mjs'), import('../../automation/lib/shopify_secret.mjs')]);
const HIER = dirname(fileURLToPath(import.meta.url));
const EIN = process.env.EINGABE || join(HIER, 'karat-liste.json');
const nur = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const zurueck = process.env.ZURUECK === '1';
const SHOP = process.env.SHOPIFY_SHOP;
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const eintraege = JSON.parse(readFileSync(EIN, 'utf8')).eintraege.filter((e) => !nur.length || nur.includes(e.handle));
let gleich = 0, anders = [], aktiv = 0, nichtAktiv = [], rest = [];
for (const e of eintraege) {
  const j = await q(LESEN, { h: e.handle }); const n = j.productByHandle;
  if (!n) { anders.push(e.handle + ': nicht gefunden'); continue; }
  const ist = flach(n), z = zurueck ? e.alt : e.neu;
  if (n.status === 'ACTIVE') aktiv++; else nichtAktiv.push(e.handle + ' ' + n.status);
  const fel = felderVon(e).filter((f) => !gleichFeld(f, ist, z));
  if (fel.length) anders.push(e.handle + ': ' + fel.join(',')); else gleich++;
  if (!zurueck) { const b = FELDER.flatMap((f) => belege(ist[f])); if (b.length) rest.push(e.handle + ': ' + b.slice(0, 3).join(' | ')); }
}
console.log(JSON.stringify({ geprueft: eintraege.length, gleichSoll: gleich, abweichend: anders, aktiv, nichtAktiv, restBehauptungen: rest }, null, 1));
const n = Number(process.env.STOREFRONT || 0);
if (n > 0) {
  const pool = eintraege.slice().sort(() => 0.5 - Math.random()).slice(0, n);
  const kopf = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-CH,de;q=0.9' };
  const shopHost = process.env.SHOP_HOST || 'luxestyle.ch';
  let ok = 0; const probleme = [];
  for (const e of pool) {
    await new Promise((s) => setTimeout(s, 6000));
    const res = await fetch(`https://${shopHost}/products/${e.handle}`, { headers: kopf, redirect: 'manual' });
    if (res.status === 429) { probleme.push(e.handle + ': 429 (nicht messbar)'); continue; }
    if (res.status !== 200) { probleme.push(e.handle + ': HTTP ' + res.status); continue; }
    const h = await res.text();
    const sichtbar = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
    const b = belege(sichtbar);
    if (b.length) probleme.push(e.handle + ': sichtbare Behauptung ' + b.slice(0, 3).join(' | ')); else ok++;
  }
  console.log(JSON.stringify({ storefrontGeprueft: pool.length, ohneBehauptung: ok, probleme }, null, 1));
}
