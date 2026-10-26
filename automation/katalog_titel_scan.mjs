#!/usr/bin/env node
/**
 * Liest ALLE aktiven Produkte (id, handle, Titel, Produkttyp, Tags, Google-Kategorie) in eine lokale Datei. NUR LESEN.
 *
 * WARUM (25.10.2026): Die Shopify-Produktsuche mit Wildcard findet Wortteile in Zusammensetzungen unzuverlässig —
 * `title:*Armatur*` fand «LED Digital Armatur», aber NICHT «Küchenarmatur 3-in-1» (Kontrollabfrage). Eine Kategorie, die auf einer
 * Wildcard-Suche beruht, lässt unbemerkt Produkte weg. Mit der lokalen Titelliste lässt sich jedes Muster (mit Wortgrenzen und
 * Ausschlüssen) auf den ganzen Katalog anwenden und vorher zählen.
 *
 * Aufruf: node automation/katalog_titel_scan.mjs   → /tmp/katalog_titel.json (Vorgabe) · AUS=pfad
 *   MAX=n  Obergrenze (Vorgabe: alles)
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { writeFileSync } from 'node:fs';

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);
  const AUS = process.env.AUS || '/tmp/katalog_titel.json', MAX = Number(process.env.MAX || 1e9);
  const alle = []; let c = null, seite = 0;
  do {
    const d = await q(`query($c:String){products(first:250,after:$c,query:"status:active",sortKey:ID){nodes{id handle title productType tags g:metafield(namespace:\"mm-google-shopping\",key:\"google_product_category\"){value}} pageInfo{hasNextPage endCursor}}}`, { c });
    alle.push(...d.products.nodes.map(n => ({ id: n.id, handle: n.handle, title: n.title, productType: n.productType, tags: n.tags, g: n.g?.value || '' }))); c = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
    if (++seite % 20 === 0) console.log(`  … ${alle.length} gelesen`);
  } while (c && alle.length < MAX);
  writeFileSync(AUS, JSON.stringify({ gelesen: alle.length, vollstaendig: !c, produkte: alle }));
  console.log(JSON.stringify({ gelesen: alle.length, vollstaendig: !c, datei: AUS }));
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
