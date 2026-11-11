// wirkung.mjs: entfernt Wirkungsversprechen aus Titel, SEO-Beschreibung und Beschreibung einzelner Produkte.
// Auftrag des Besitzers 11.11.2026: «ja die mit burn fat weg, wirkungsversprechen fix oder weg».
// Trockenlauf Vorgabe, LIVE=1 schreibt (mit Sicherung und frischem Rücklesen), ZURUECK=1 LIVE=1 stellt den gesicherten Stand her.
// Aufruf: NODE_USE_ENV_PROXY=1 [LIVE=1] [ZURUECK=1] node dropship/bildfix-1111/wirkung.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const SICH = join(HIER, 'sicherung');
const PLAN = [
  {
    handle: 'handliches-massagegerat-vibrations-massage-mit-mehreren-stufen',
    ersetzen: [['<li>1 Set Fettverlust-Tester</li>', '<li>1 Massagegerät</li>']],
    seo_alt: 'Handliches Vibrations-Massagegerät mit mehreren Stufen – löst Verspannungen an Nacken, Rücken & Beinen. Schweizer Shop · -10% WELCOME10.',
    seo_neu: 'Handliches Vibrations-Massagegerät mit mehreren Stufen für zuhause, ca. 353 g. Schweizer Shop · -10% WELCOME10.',
  },
  {
    handle: 'augenmassagegerat-mit-warme-musik-bluetooth-faltbar-gegen-mude-augen',
    titel_alt: 'Augenmassagegerät mit Wärme & Musik – Bluetooth, faltbar, gegen müde Augen',
    titel_neu: 'Augenmassagegerät mit Wärme & Musik – Bluetooth, faltbar',
    seo_alt: 'Faltbares Augenmassagegerät mit Wärme, Akupressur & Bluetooth-Musik – entspannt müde Augen. Schweizer Shop · -10% mit WELCOME10.',
    seo_neu: 'Faltbares Augenmassagegerät mit Wärme, Luftdruck, Vibration und Bluetooth-Musik, mit Akku. Schweizer Shop · -10% mit WELCOME10.',
  },
];

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
});
const tok = (await tr.json().catch(() => null))?.access_token;
if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status); process.exit(2); }
async function gql(q, v) {
  const j = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query: q, variables: v }),
  })).json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}
const Q = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title descriptionHtml seo{ title description } } }`;
const M = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
mkdirSync(SICH, { recursive: true });

let fehler = 0;
for (const e of PLAN) {
  const datei = join(SICH, `wirkung_${e.handle}.json`);
  const p = (await gql(Q, { h: e.handle })).productByIdentifier;
  if (!p) { console.log('FEHLT', e.handle); fehler++; continue; }
  if (ZURUECK) {
    if (!existsSync(datei)) { console.log('KEINE SICHERUNG', e.handle); continue; }
    const s = JSON.parse(readFileSync(datei, 'utf8'));
    console.log(`${LIVE ? 'ZURÜCK' : '[TROCKEN] zurück'} ${e.handle}`);
    if (LIVE) {
      const r = (await gql(M, { p: { id: p.id, title: s.title, descriptionHtml: s.descriptionHtml, seo: { title: s.seo.title, description: s.seo.description } } })).productUpdate;
      if (r.userErrors.length) { console.log('FEHLER', JSON.stringify(r.userErrors)); fehler++; }
    }
    continue;
  }
  let titel = p.title, html = p.descriptionHtml, seo = p.seo.description;
  const probleme = [];
  if (e.titel_alt) { if (titel === e.titel_alt) titel = e.titel_neu; else if (titel !== e.titel_neu) probleme.push('Titel anders als erwartet'); }
  if (e.seo_alt) { if (seo === e.seo_alt) seo = e.seo_neu; else if (seo !== e.seo_neu) probleme.push('SEO-Beschreibung anders als erwartet'); }
  for (const [a, n] of e.ersetzen || []) {
    if (html.includes(a)) html = html.split(a).join(n); else if (!html.includes(n)) probleme.push('Textstelle fehlt: ' + a);
  }
  if (probleme.length) { console.log('ABBRUCH', e.handle, probleme.join('; ')); fehler++; continue; }
  const aenderung = [titel !== p.title && 'Titel', seo !== p.seo.description && 'SEO-Beschreibung', html !== p.descriptionHtml && 'Beschreibung'].filter(Boolean);
  if (!aenderung.length) { console.log('SCHON IM SOLL', e.handle); continue; }
  if (!LIVE) { console.log(`[TROCKEN] ${e.handle}: ${aenderung.join(', ')}`); continue; }
  if (!existsSync(datei)) writeFileSync(datei, JSON.stringify({ zeit: new Date().toISOString(), ...p }, null, 1));
  const r = (await gql(M, { p: { id: p.id, title: titel, descriptionHtml: html, seo: { title: p.seo.title, description: seo } } })).productUpdate;
  if (r.userErrors.length) { console.log('FEHLER', e.handle, JSON.stringify(r.userErrors)); fehler++; continue; }
  const n = (await gql(Q, { h: e.handle })).productByIdentifier;
  const ok = n.title === titel && n.seo.description === seo && n.descriptionHtml === html;
  console.log(`${ok ? 'GLEICH' : 'WEICHT AB'} ${e.handle}: ${aenderung.join(', ')}`);
  if (!ok) fehler++;
}
console.log(fehler ? `ENDE mit ${fehler} Fehler(n)` : 'ENDE ohne Fehler');
process.exit(fehler ? 1 : 0);
