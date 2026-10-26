#!/usr/bin/env node
/**
 * Erfasst für Alt-Collections mit Fremdkörpern (dropship/kategorie-fremdkoerper.json, von kategorie_pruefer.mjs) die Arbeitsgrundlage:
 * /tmp/verengen/<handle>.json = { handle, titel, ruleSet, mitglieder:[{handle,title,g}], kernBereiche, fremd:[…] }.
 * NUR LESEN. Eingabe: KATALOG (Standard /tmp/katalog_frisch.json), HANDLES=a,b (sonst alle aus der Fremdkörper-Datei im Menü), MIN_FREMD=3.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { mitglieder } from './lib/regel_auswerten.mjs';
import { fremdkoerper } from './kategorie_pruefer.mjs';

const KATALOG = process.env.KATALOG || '/tmp/katalog_frisch.json', OUT = '/tmp/verengen';
mkdirSync(OUT, { recursive: true });
const ps = JSON.parse(readFileSync(KATALOG, 'utf8')).produkte;
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
if (!handles.length) handles = JSON.parse(readFileSync('dropship/kategorie-fremdkoerper.json', 'utf8')).filter(x => x.menue && x.n >= Number(process.env.MIN_FREMD || 3)).map(x => x.handle);
const zeile = [];
for (const h of handles) {
  const c = (await q(`query($h:String!){collectionByHandle(handle:$h){title ruleSet{appliedDisjunctively rules{column relation condition}}}}`, { h })).collectionByHandle;
  if (!c?.ruleSet) { zeile.push(`${h}: keine Regel`); continue; }
  const mit = mitglieder(c.ruleSet, ps);
  if (!mit) { zeile.push(`${h}: Regel nicht lokal auswertbar`); continue; }
  const x = fremdkoerper(mit);
  writeFileSync(`${OUT}/${h}.json`, JSON.stringify({ handle: h, titel: c.title, ruleSet: c.ruleSet, kernBereiche: x.kern,
    mitglieder: mit.map(p => ({ handle: p.handle, title: p.title, g: p.g || '' })), fremdAnzahl: x.fremd.length }));
  zeile.push(`${h}: ${mit.length} Mitglieder, ${x.fremd.length} fremd`);
}
console.log(zeile.join('\n'));
