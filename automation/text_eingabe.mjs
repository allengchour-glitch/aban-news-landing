#!/usr/bin/env node
/**
 * Eingabedateien für die Text-Agenten: je Produkt eine JSON-Datei mit allem, was der Agent wissen darf — und nichts sonst.
 * Quelle: CJ-Datenblatt aus dem Zwischenspeicher der Fakten-Läufe (/tmp/cj_fakten_cache), der aktuelle Seitentext, der Fakten-Block, die Optionen.
 * NUR LESEN (Shopify) — schreibt nach /tmp/text_eingabe/<handle>.json und eine Stapel-Liste je 20 Produkte.
 *
 * Aufruf: node automation/text_eingabe.mjs [LISTE=datei.csv | HANDLES=a,b] [LIMIT=120] [START=0] [OUT=/tmp/text_eingabe]
 * Nur Produkte mit CJ-Zwischenspeicher UND schlichter Prosa UND ohne Textblock (v2) kommen in Frage.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { quelleAus, htmlZuText } from './lib/fakten_block.mjs';
import { zerlege, schlichtesProsa } from './lib/text_prosa.mjs';

const OUT = process.env.OUT || '/tmp/text_eingabe', CACHE = '/tmp/cj_fakten_cache';
mkdirSync(OUT, { recursive: true });
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
if (!handles.length && process.env.LISTE) handles = readFileSync(process.env.LISTE, 'utf8').split('\n').slice(1).map(z => z.split(';')[0].trim()).filter(Boolean);
if (!handles.length) handles = readdirSync(CACHE).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
handles = handles.slice(Number(process.env.START || 0), Number(process.env.START || 0) + Number(process.env.LIMIT || 120) * 3);
const gut = [], grund = {};
const weg = g => { grund[g] = (grund[g] || 0) + 1; };
for (const h of handles) {
  if (gut.length >= Number(process.env.LIMIT || 120)) break;
  if (!existsSync(`${CACHE}/${h}.json`)) { weg('kein CJ-Datenblatt'); continue; }
  const p = (await q(`query($h:String!){productByHandle(handle:$h){id title status descriptionHtml priceRangeV2{minVariantPrice{amount}} options{name values}}}`, { h })).productByHandle;
  if (!p || p.status !== 'ACTIVE') { weg('nicht aktiv'); continue; }
  const z = zerlege(p.descriptionHtml);
  if (z.markiert) { weg('hat schon Text v2'); continue; }
  if (!schlichtesProsa(z.prosa)) { weg('Prosa nicht schlicht/leer'); continue; }
  const cj = JSON.parse(readFileSync(`${CACHE}/${h}.json`, 'utf8'));
  const fakt = /<!-- ls-fakten-v1 -->([\s\S]*?)<!-- \/ls-fakten-v1 -->/.exec(p.descriptionHtml);
  writeFileSync(`${OUT}/${h}.json`, JSON.stringify({
    handle: h, titel: p.title, preisCHF: Number(p.priceRangeV2.minVariantPrice.amount), cjKategorie: cj.categoryName || '',
    optionen: p.options.filter(o => !/^(title|variante)$/i.test(o.name)).map(o => ({ name: o.name, werte: o.values.slice(0, 30) })),
    alterText: htmlZuText(z.prosa), faktenBlock: fakt ? htmlZuText(fakt[1]) : '', cjQuelle: quelleAus(cj).text,
  }, null, 1));
  gut.push(h);
}
const stapel = []; for (let i = 0; i < gut.length; i += 20) stapel.push(gut.slice(i, i + 20));
writeFileSync(`${OUT}/_stapel.json`, JSON.stringify(stapel, null, 1));
console.log(`Eingaben: ${gut.length} · Stapel: ${stapel.length} · übersprungen: ${JSON.stringify(grund)}`);
