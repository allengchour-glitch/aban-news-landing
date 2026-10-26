#!/usr/bin/env node
/**
 * Auswahl-Prüfung: je Produkt ein Kontaktbogen (PNG) mit einem Bild je Farbe/Motiv samt Beschriftung, dazu automatische Befunde (JSON).
 * Zweck: ein Mensch oder Agent sieht in einem Blick, ob das Bild zur Beschriftung passt (das kann kein Skript) — und die Automatik meldet den Rest
 * (englische Werte, fehlende Bilder, Preisspanne, zu viele Varianten, doppelte Bilder bei verschiedenen Farben).
 * NUR LESEN. Aufruf: HANDLES=a,b | LISTE=ledger-datei (Zeilen «handle · …»)  [OUT=/tmp/auswahl_qa] [LIMIT=40] [AB=0]
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
const require = createRequire(import.meta.url);
const OUT = process.env.OUT || '/tmp/auswahl_qa'; mkdirSync(OUT, { recursive: true });
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
if (!handles.length && process.env.LISTE) {
  const gesehen = new Set();
  for (const z of readFileSync(process.env.LISTE, 'utf8').split('\n')) { const h = z.split(' · ')[0].trim(); if (h && /GESCHRIEBEN/.test(z) && !gesehen.has(h)) { gesehen.add(h); handles.push(h); } }
}
handles = handles.slice(Number(process.env.AB || 0), Number(process.env.AB || 0) + Number(process.env.LIMIT || 40));
const ENG = /\b(black|white|red|blue|green|gray|grey|pink|purple|yellow|orange|brown|large|small|medium|size|color|colour|style|set|plug|free)\b/i;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const { chromium } = require('playwright'); const b = await chromium.launch(); const seite = await b.newPage({ viewport: { width: 1400, height: 120 } });
const bericht = [];
for (const h of handles) {
  const p = (await q(`query($h:String!){productByHandle(handle:$h){title status options{name values} variantsCount{count}
    variants(first:100){nodes{title price availableForSale selectedOptions{name value} image{url}}}}}`, { h })).productByHandle;
  if (!p) { bericht.push({ handle: h, befund: ['Produkt fehlt'] }); continue; }
  const v = p.variants.nodes, befund = [];
  for (const o of p.options) { if (/^(title|variante)$/i.test(o.name)) befund.push('Option heisst noch «' + o.name + '»'); for (const w of o.values) if (ENG.test(w)) befund.push(`englisch? ${o.name}=${w.slice(0, 30)}`); }
  const preise = v.map(x => Number(x.price)); if (preise.length && Math.max(...preise) / Math.min(...preise) > 3) befund.push(`Preisspanne ${Math.min(...preise)}–${Math.max(...preise)}`);
  const ohneBild = v.filter(x => !x.image).length; if (ohneBild && ohneBild < v.length) befund.push(`${ohneBild} von ${v.length} Varianten ohne eigenes Bild`);
  if (p.variantsCount.count > 100) befund.push(`${p.variantsCount.count} Varianten (nur 100 gelesen)`);
  const nichtVerf = v.filter(x => !x.availableForSale).length; if (nichtVerf) befund.push(`${nichtVerf} nicht verfügbar`);
  // erstes Bild je Wert der ersten Option (meist Farbe)
  const erste = p.options[0]?.name, kacheln = new Map();
  for (const x of v) { const w = x.selectedOptions.find(o => o.name === erste)?.value || x.title; if (!kacheln.has(w)) kacheln.set(w, { w, url: x.image?.url, preis: x.price, n: 0 }); kacheln.get(w).n++; }
  const bilderZaehler = new Map(); for (const k of kacheln.values()) if (k.url) bilderZaehler.set(k.url.split('?')[0], [...(bilderZaehler.get(k.url.split('?')[0]) || []), k.w]);
  for (const [, ws] of bilderZaehler) if (ws.length > 1) befund.push(`gleiches Bild bei: ${ws.slice(0, 4).join(' / ')}`);
  const html = `<body style="margin:0;font:14px system-ui;background:#fff;padding:14px;width:1372px"><div style="font-weight:700;margin-bottom:4px">${esc(p.title)}</div><div style="color:#666;margin-bottom:10px">${esc(h)} · Optionen: ${esc(p.options.map(o => o.name + ' (' + o.values.length + ')').join(' × '))} · ${p.variantsCount.count} Varianten</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px">${[...kacheln.values()].slice(0, 24).map(k => `<div style="width:160px"><div style="width:160px;height:160px;background:#f3f0ea;display:flex;align-items:center;justify-content:center">${k.url ? `<img src="${esc(k.url)}&width=320" style="max-width:160px;max-height:160px">` : '<span style="color:#b00">kein Bild</span>'}</div><div style="font-weight:600;margin-top:3px">${esc(k.w)}</div><div style="color:#666">CHF ${esc(k.preis)} · ${k.n}×</div></div>`).join('')}</div></body>`;
  await seite.setContent(html, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}); await seite.waitForTimeout(400);
  await seite.screenshot({ path: `${OUT}/${h}.png`, fullPage: true });
  bericht.push({ handle: h, optionen: p.options.map(o => `${o.name}: ${o.values.slice(0, 8).join(', ')}${o.values.length > 8 ? ' …' : ''}`), varianten: p.variantsCount.count, befund });
}
await b.close();
writeFileSync(`${OUT}/_befunde.json`, JSON.stringify(bericht, null, 1));
const mit = bericht.filter(x => x.befund?.length); console.log(`Bögen: ${bericht.length} · mit automatischem Befund: ${mit.length}`);
for (const x of mit.slice(0, 25)) console.log('  ', x.handle.slice(0, 44).padEnd(44), x.befund.join(' | ').slice(0, 130));
