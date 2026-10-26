#!/usr/bin/env node
/**
 * Liest den Ist-Stand des Shops (NUR LESEN): alle Collections (Handle, Titel, Regeln, Produktzahl, Kanäle) und den Menübaum des Hauptmenüs.
 * Ausgabe: /tmp/taxo_b/collections.json, /tmp/taxo_b/menue.json, /tmp/taxo_b/menue.txt (eingerückt, mit Handle).
 * Aufruf: node dropship/taxonomie-2610-b/bestand_lesen.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
mkdirSync('/tmp/taxo_b', { recursive: true });
const koll = []; let after = null;
for (;;) {
  const d = (await q(`query($a:String){collections(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{id handle title productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}}`, { a: after })).collections;
  for (const c of d.nodes) koll.push({ id: c.id, handle: c.handle, titel: c.title, produkte: c.productsCount?.count ?? null,
    regeln: c.ruleSet ? c.ruleSet.rules.map(x => `${x.column} ${x.relation} ${x.condition}`).join(c.ruleSet.appliedDisjunctively ? ' ODER ' : ' UND ') : 'manuell' });
  if (!d.pageInfo.hasNextPage) break; after = d.pageInfo.endCursor;
}
writeFileSync('/tmp/taxo_b/collections.json', JSON.stringify(koll));
const m = (await q(`query{menus(first:1,query:"handle:main-menu"){nodes{items{title url items{title url items{title url}}}}}}`)).menus.nodes[0];
writeFileSync('/tmp/taxo_b/menue.json', JSON.stringify(m.items));
const zeilen = [];
(function lauf(l, d) { for (const i of l || []) { const mm = (i.url || '').match(/\/collections\/([^/?#]+)/); zeilen.push('  '.repeat(d) + i.title + (mm ? '  [' + decodeURIComponent(mm[1]) + ']' : i.url ? '  (' + i.url.slice(0, 40) + ')' : '')); lauf(i.items, d + 1); } })(m.items, 0);
writeFileSync('/tmp/taxo_b/menue.txt', zeilen.join('\n') + '\n');
console.log(JSON.stringify({ collections: koll.length, menueZeilen: zeilen.length }));
