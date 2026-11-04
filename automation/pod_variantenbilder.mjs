#!/usr/bin/env node
/**
 * «Selbst gestalten»: Variantenbilder aus dem Printful-Katalog (Farbe, Material) an die Shop-Varianten hängen.
 * Rechenkern: lib/pod_variantenbilder.mjs (rein, getestet). Dieses Skript holt Daten und schreibt.
 *
 *   node automation/pod_variantenbilder.mjs                         # Trockenlauf aller Handles aus dropship/pod-variantenbilder-0411/handles.json
 *   HANDLES=shirt-zum-selbstgestalten node automation/pod_variantenbilder.mjs
 *   LIVE=1 HANDLES=… node automation/pod_variantenbilder.mjs        # schreibt: Medien anlegen, Rückansichten lösen, Bilder binden, zurücklesen
 *   ZURUECK=1 LIVE=1 HANDLES=… node automation/pod_variantenbilder.mjs   # nimmt die im Ledger gebundenen Bilder wieder von den Varianten
 *
 * Sicherheit: Trockenlauf ist Vorgabe. Vor dem ersten Schreiben je Produkt wird der Zustand der Varianten (Bild- und
 * Medien-IDs) in `vorher.json` festgehalten. Ein Produkt, dessen Bild-Ledger-Eintrag schon fertig ist, wird nicht noch
 * einmal angefasst. Nach dem Schreiben wird frisch gelesen und gegen den Plan verglichen (Exit 3 bei Abweichung).
 * Printful-Bilder: laut Besitzer-Antwort vom 02.11.2026 (AGB) zulässig.
 *
 * Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (Client-Credentials). Der Printful-Katalog braucht keinen Schlüssel.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { pfVarianteId, plane } from './lib/pod_variantenbilder.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.DATEN_DIR || path.join(HIER, '..', 'dropship', 'pod-variantenbilder-0411');
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const API = '2025-01';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lies = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const schreibe = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); };

const handles = process.env.HANDLES ? process.env.HANDLES.split(',').map((s) => s.trim()).filter(Boolean) : lies(path.join(DIR, 'handles.json'), []);
if (!handles.length) { console.error('Keine Handles (HANDLES=… oder handles.json).'); process.exit(2); }
const LEDGER_F = path.join(DIR, 'ledger.json');
const VORHER_F = path.join(DIR, 'vorher.json');
const ledger = lies(LEDGER_F, {});
const vorher = lies(VORHER_F, {});

const shop = process.env.SHOPIFY_SHOP;
if (!shop || !process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) { console.error('SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET fehlen.'); process.exit(2); }
const tr = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
const token = (await tr.json()).access_token;
if (!token) { console.error('Kein Zugriffstoken.'); process.exit(2); }
const g = (q, v) => shopifyGql(shop, API, token, q, v);

async function pfVariante(id, cache) {
  if (cache[id]) return cache[id];
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`https://api.printful.com/products/variant/${id}`, { headers: { 'User-Agent': 'luxestyle-pod-variantenbilder' } });
    if (r.status === 429) { await sleep(10000); continue; }
    if (r.status >= 500) { await sleep(3000); continue; }
    const j = await r.json().catch(() => null);
    const x = j?.result?.variant;
    cache[id] = x ? { product_id: x.product_id, color: x.color, size: x.size, image: x.image, name: x.name } : { fehler: r.status };
    await sleep(550);
    return cache[id];
  }
  return { fehler: 429 };
}

async function bild(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'luxestyle-pod-variantenbilder' } });
  const ct = r.headers.get('content-type') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  return { ok: r.status === 200 && /^image\//.test(ct) && buf.length >= 15000, status: r.status, ct, bytes: buf.length, hash: crypto.createHash('sha256').update(buf).digest('hex') };
}

const Q_PRODUKT = `query($h:String!,$a:String){productByHandle(handle:$h){id title status
  media(first:250){nodes{id alt status ... on MediaImage{image{url}}}}
  variants(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{id sku title image{url} selectedOptions{name value} media(first:5){nodes{id}}}}}}`;
async function liesProdukt(h) {
  let p = null; const vs = []; let after = null;
  for (;;) {
    const r = (await g(Q_PRODUKT, { h, a: after })).productByHandle;
    if (!r) return null;
    p = p || r;
    vs.push(...r.variants.nodes);
    if (!r.variants.pageInfo.hasNextPage) break;
    after = r.variants.pageInfo.endCursor;
  }
  return { id: p.id, titel: p.title, status: p.status, media: p.media.nodes, varianten: vs };
}

const pfCache = lies(path.join(DIR, 'printful-cache.json'), {});
const zusammen = { plan: 0, geschrieben: 0, skip: 0, fehler: 0 };
let abweichung = false;

for (const h of handles) {
  const pr = await liesProdukt(h);
  if (!pr) { console.log('FEHLT'.padEnd(8), h); zusammen.fehler++; continue; }

  if (ZURUECK) {
    const l = ledger[h];
    if (!l?.gebunden?.length) { console.log('ZURÜCK-'.padEnd(8), h, 'nichts im Ledger'); continue; }
    if (!LIVE) { console.log('ZURÜCK'.padEnd(8), h, 'Trockenlauf:', l.gebunden.length, 'Bindungen'); continue; }
    for (const b of l.gebunden) {
      const r = (await g(`mutation($p:ID!,$m:[ProductVariantDetachMediaInput!]!){productVariantDetachMedia(productId:$p,variantMedia:$m){userErrors{field message}}}`, { p: pr.id, m: [{ variantId: b.variantId, mediaIds: [b.mediaId] }] })).productVariantDetachMedia;
      if (r.userErrors.length) console.log('  FEHLER', JSON.stringify(r.userErrors).slice(0, 200));
    }
    ledger[h] = { ...l, zurueckgenommen: true };
    schreibe(LEDGER_F, ledger);
    console.log('ZURÜCK'.padEnd(8), h, 'ok');
    continue;
  }

  // Printful-Daten je Variante
  const pf = {};
  for (const v of pr.varianten) {
    const id = pfVarianteId(v.sku);
    if (id) pf[id] = await pfVariante(id, pfCache);
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'printful-cache.json'), JSON.stringify(pfCache));
  for (const id of Object.keys(pf)) if (pf[id].fehler) delete pf[id];

  // Ein Vertreter-Bild je Aussehen (Printful-Produkt + Farbe): das erste Mitglied mit einem erreichbaren, grossen Bild.
  // Grössen derselben Farbe haben bei Printful eigene Dateinamen, sehen aber gleich aus; ein defektes Einzelbild darf
  // die anderen nicht aus der Auswahl werfen. Gleicher Inhalt (Prüfsumme) wird später zu EINEM Medium zusammengelegt.
  const hashes = {};
  const defekt = new Set();
  const nachAussehen = new Map();
  for (const id of Object.keys(pf)) {
    const k = `${pf[id].product_id}|${pf[id].color || ''}`;
    if (!nachAussehen.has(k)) nachAussehen.set(k, []);
    nachAussehen.get(k).push(id);
  }
  for (const ids of nachAussehen.values()) {
    let vertreter = null;
    for (const id of ids) {
      const url = pf[id].image;
      if (!url || defekt.has(url)) continue;
      if (hashes[url]) { vertreter = url; break; }
      const b = await bild(url);
      if (b.ok) { hashes[url] = b.hash; vertreter = url; break; }
      defekt.add(url);
    }
    for (const id of ids) { if (vertreter) pf[id].image = vertreter; else delete pf[id]; }
  }

  const plan = plane({ handle: h, titel: pr.titel, varianten: pr.varianten.map((v) => ({ id: v.id, sku: v.sku, bildUrl: v.image?.url || null, optionen: v.selectedOptions })), pf, hashes });
  if (plan.status === 'skip') { console.log('SKIP'.padEnd(8), h.slice(0, 46).padEnd(46), plan.grund, defekt.size ? `(defekte Bilder: ${defekt.size})` : ''); zusammen.skip++; continue; }
  zusammen.plan++;
  console.log('PLAN'.padEnd(8), h.slice(0, 46).padEnd(46), plan.gruppen.length, 'Bilder für', plan.gruppen.reduce((s, x) => s + x.varianten.length, 0), 'Varianten' + (plan.ersetzen ? ', ersetzt Rückansichten' : ''));
  for (const x of plan.gruppen) console.log('         ', x.label.slice(0, 50).padEnd(50), x.varianten.length, x.image);
  if (!LIVE) continue;
  if (ledger[h]?.fertig && !ledger[h].zurueckgenommen) { console.log('  schon erledigt (Ledger), übersprungen'); continue; }

  // Zustand sichern, bevor etwas verändert wird (nur das erste Mal)
  if (!vorher[h]) {
    vorher[h] = { produkt: pr.id, zeit: new Date().toISOString(), varianten: pr.varianten.map((v) => ({ id: v.id, sku: v.sku, bild: v.image?.url || null, medien: v.media.nodes.map((m) => m.id) })), medien: pr.media.map((m) => ({ id: m.id, alt: m.alt })) };
    schreibe(VORHER_F, vorher);
  }

  // 1) Medien anlegen (nur die, die es noch nicht gibt: Erkennung am Alt-Text)
  const vorhandenAlt = new Map(pr.media.map((m) => [m.alt, m.id]));
  const neu = plan.gruppen.filter((x) => !vorhandenAlt.has(x.alt));
  if (neu.length) {
    const r = (await g(`mutation($p:ProductUpdateInput!,$m:[CreateMediaInput!]){productUpdate(product:$p,media:$m){product{id} userErrors{field message}}}`,
      { p: { id: pr.id }, m: neu.map((x) => ({ originalSource: x.image, mediaContentType: 'IMAGE', alt: x.alt })) })).productUpdate;
    if (r.userErrors.length) { console.log('  FEHLER Medien', JSON.stringify(r.userErrors).slice(0, 300)); zusammen.fehler++; continue; }
  }
  // 2) auf READY warten und die Medien-IDs über den Alt-Text finden
  const ids = new Map();
  let bereit = false;
  for (let i = 0; i < 40 && !bereit; i++) {
    await sleep(3000);
    const p2 = await liesProdukt(h);
    for (const x of plan.gruppen) {
      const m = p2.media.find((mm) => mm.alt === x.alt && mm.status === 'READY');
      if (m) ids.set(x.alt, m.id);
    }
    bereit = plan.gruppen.every((x) => ids.has(x.alt));
    if (p2.media.some((m) => plan.gruppen.some((x) => x.alt === m.alt) && m.status === 'FAILED')) { console.log('  FEHLER: Medium fehlgeschlagen'); break; }
  }
  if (!bereit) { console.log('  FEHLER: Medien nicht bereit, nichts gebunden'); zusammen.fehler++; continue; }

  // 3) Rückansichten von den Varianten lösen, 4) Bilder binden
  const gebunden = [];
  const ersetzen = plan.gruppen.flatMap((x) => x.ersetzen.map((vid) => ({ vid, medien: pr.varianten.find((v) => v.id === vid).media.nodes.map((m) => m.id) }))).filter((e) => e.medien.length);
  if (ersetzen.length) {
    const r = (await g(`mutation($p:ID!,$m:[ProductVariantDetachMediaInput!]!){productVariantDetachMedia(productId:$p,variantMedia:$m){userErrors{field message}}}`,
      { p: pr.id, m: ersetzen.map((e) => ({ variantId: e.vid, mediaIds: e.medien })) })).productVariantDetachMedia;
    if (r.userErrors.length) { console.log('  FEHLER Lösen', JSON.stringify(r.userErrors).slice(0, 300)); zusammen.fehler++; continue; }
  }
  for (const x of plan.gruppen) {
    const r = (await g(`mutation($p:ID!,$m:[ProductVariantAppendMediaInput!]!){productVariantAppendMedia(productId:$p,variantMedia:$m){userErrors{field message}}}`,
      { p: pr.id, m: x.varianten.map((vid) => ({ variantId: vid, mediaIds: [ids.get(x.alt)] })) })).productVariantAppendMedia;
    if (r.userErrors.length) { console.log('  FEHLER Binden', x.label, JSON.stringify(r.userErrors).slice(0, 300)); zusammen.fehler++; continue; }
    for (const vid of x.varianten) gebunden.push({ variantId: vid, mediaId: ids.get(x.alt), label: x.label });
    await sleep(800);
  }

  // 5) frisch lesen und mit dem Plan vergleichen
  await sleep(4000);
  const nach = await liesProdukt(h);
  const fehl = [];
  for (const b of gebunden) {
    const v = nach.varianten.find((vv) => vv.id === b.variantId);
    if (!v || !v.media.nodes.some((m) => m.id === b.mediaId)) fehl.push(b.variantId);
  }
  if (fehl.length) { abweichung = true; console.log('  ABWEICHUNG nach dem Zurücklesen:', fehl.length, 'Varianten ohne das geplante Bild'); }
  else console.log('  gebunden und zurückgelesen:', gebunden.length, 'Varianten');
  ledger[h] = { zeit: new Date().toISOString(), fertig: fehl.length === 0, gebunden };
  schreibe(LEDGER_F, ledger);
  zusammen.geschrieben++;
}
console.log(JSON.stringify(zusammen));
if (abweichung) process.exit(3);
if (zusammen.fehler) process.exit(1);
