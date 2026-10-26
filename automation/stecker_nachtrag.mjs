#!/usr/bin/env node
/**
 * Stecker-Nachtrag: die erste Stecker-Prüfung (stecker_bereinigen.mjs) las nur die Elektronik-Produkte. Die Auswahl-Prüfung (26.10.) fand weitere Geräte mit
 * Fremdstecker-Werten (Haarstyler, Wecker, Luftbefeuchter, Lunchbox mit Heizung …). Dieser Lauf prüft die HANDLES-Liste mit denselben Regeln
 * (variantenUrteil/produktUrteil): Fremdstecker-Variante löschen, bleibt keine, Produkt DRAFT + Tag stecker-nicht-ch. Trockenlauf Vorgabe (LIVE=1 schreibt).
 * Aufruf: HANDLES=a,b [LIVE=1] node automation/stecker_nachtrag.mjs     (Präfixe genügen, Treffer müssen eindeutig sein)
 */
import { appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { variantenUrteil, produktUrteil } from './stecker_bereinigen.mjs';
const LIVE = process.env.LIVE === '1';
const praefixe = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const retry = async (m, v) => { for (let n = 0; ; n++) { try { return await q(m, v); } catch (e) { if (n >= 5 || !/Throttled|THROTTLED|429/.test(e.message)) throw e; await schlaf(15000 * (n + 1)); } } };
let gelöscht = 0, draft = 0;
for (const pre of praefixe) {
  const f = (await q(`query($q:String!){products(first:5,query:$q){nodes{id handle status}}}`, { q: `handle:${pre}*` })).products.nodes;
  if (f.length !== 1) { console.log(`${pre}: ${f.length} Treffer — übersprungen`); continue; }
  const p = (await q(`query($id:ID!){product(id:$id){id handle variants(first:250){nodes{id selectedOptions{name value}}}}}`, { id: f[0].id })).product;
  const vs = p.variants.nodes.map(v => ({ id: v.id, werte: v.selectedOptions.map(o => o.value) }));
  const u = produktUrteil(vs); const weg = vs.filter(v => variantenUrteil(v.werte) === 'weg').length;
  console.log(`${p.handle.slice(0, 50).padEnd(50)} ${weg}/${vs.length} Fremdstecker → ${u.draft ? 'DRAFT' : u.loeschen.length ? 'Varianten löschen' : 'nichts'}`);
  if (!LIVE) continue;
  if (u.draft) { await retry(`mutation($i:ProductInput!,$id:ID!){a:productUpdate(input:$i){userErrors{message}} b:tagsAdd(id:$id,tags:["stecker-nicht-ch"]){userErrors{message}}}`, { i: { id: p.id, status: 'DRAFT' }, id: p.id }); draft++; }
  else if (u.loeschen.length) {
    for (let i = 0; i < u.loeschen.length; i += 100) { const d = await retry(`mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){userErrors{message}}}`, { p: p.id, v: u.loeschen.slice(i, i + 100) }); if (d.productVariantsBulkDelete.userErrors.length) console.log('  ✗', JSON.stringify(d.productVariantsBulkDelete.userErrors)); }
    await retry(`mutation($id:ID!){tagsAdd(id:$id,tags:["stecker-bereinigt-2510"]){userErrors{message}}}`, { id: p.id }); gelöscht += u.loeschen.length;
  }
  appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · stecker-nachtrag ${p.handle} ${u.draft ? 'draft' : u.loeschen.length}\n`);
}
console.log(LIVE ? `Gelöscht ${gelöscht} Varianten, ${draft} Produkte auf DRAFT` : 'Trockenlauf — nichts geschrieben');
