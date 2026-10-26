#!/usr/bin/env node
/**
 * Entfernt die Kategorie-Tags `sort-…` von Produkten mit Sperr-Tag (Erwachsene, Tabak, Waffen, kein CH-Stecker …):
 * solche Produkte gehören in keine Themenkategorie (lib/kategorien.mjs → SPERR_TAGS). Trockenlauf ist Vorgabe (LIVE=1 schreibt).
 * Aufruf: KATALOG=/tmp/katalog_frisch.json [LIVE=1] node automation/sperr_sort_tags_entfernen.mjs
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { istGesperrt } from './lib/kategorien.mjs';
const LIVE = process.env.LIVE === '1', KATALOG = process.env.KATALOG || '/tmp/katalog_frisch.json';
const produkte = JSON.parse(readFileSync(KATALOG, 'utf8')).produkte;
const ziele = produkte.filter(p => istGesperrt(p) && p.tags.some(t => t.startsWith('sort-')));
console.log(`Produkte mit Sperr-Tag UND sort-Tag: ${ziele.length}`);
for (const p of ziele.slice(0, 12)) console.log('  ', p.handle.slice(0, 44).padEnd(44), p.tags.filter(t => t.startsWith('sort-')).join(','));
if (!LIVE || !ziele.length) process.exit(0);
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
let n = 0;
for (let i = 0; i < ziele.length; i += 10) {
  const teil = ziele.slice(i, i + 10);
  const m = `mutation{${teil.map((p, k) => `t${k}:tagsRemove(id:${JSON.stringify(p.id)},tags:${JSON.stringify(p.tags.filter(t => t.startsWith('sort-')))}){userErrors{message}}`).join(' ')}}`;
  const d = await q(m, {}); for (let k = 0; k < teil.length; k++) { if (d[`t${k}`].userErrors.length) console.log('  ✗', teil[k].handle, JSON.stringify(d[`t${k}`].userErrors)); else n++; }
}
appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · sperr-sort-tags entfernt ${n}\n`);
console.log('Entfernt bei', n, 'Produkten');
