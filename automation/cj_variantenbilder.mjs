#!/usr/bin/env node
/**
 * Variantenbilder nachziehen: gibt Varianten OHNE eigenes Bild das Bild, das CJ für genau diese Variante führt.
 *
 * WARUM (25.10.2026): Bei den neuesten 2010 CJ-Produkten haben 1537 eine Auswahl — und bei 890 davon (58 %) hat die Mehrzahl
 * der Varianten kein eigenes Bild. Wer «Hellgrün» wählt, sieht dann weiter das erste Galeriebild; Farben lassen sich
 * verwechseln. Die Bilder sind meist schon in der Galerie, nur nicht mit der Variante verknüpft.
 *
 * Vorgehen je Produkt (Trockenlauf ist Vorgabe, LIVE=1 schreibt):
 *   1. Shop: Varianten (SKU, Variantenbild) und Galerie lesen.
 *   2. CJ: product/query?variantSku=<erste SKU> → je Variante das CJ-Bild (variantImage).
 *   3. Bild-Signatur (Hash + Farbbild, wie cj_varianten_nachziehen.mjs): ein CJ-Bild, das mit GENAU einem Galeriebild fast
 *      identisch ist, wird verknüpft; sonst als neues Bild hochgeladen (höchstens MAX_NEU je Produkt).
 *   4. Nur Lücken füllen: eine Variante, die schon ein Bild hat, wird NICHT angefasst.
 *
 * Aufruf:  node automation/cj_variantenbilder.mjs <handle> ...   |   HANDLES_DATEI=pfad.csv LIMIT=20 …
 * Schalter: LIVE=1 · LIMIT=n (Vorgabe 10) · MAX_NEU=6 · PLAN_DIR=/tmp/cj_variantenbilder_plan
 */
import { mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { bildSig, gleichesBild } from './cj_varianten_nachziehen.mjs';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const LIVE = process.env.LIVE === '1';
const LIMIT = Number(process.env.LIMIT || 10);
const MAX_NEU = Number(process.env.MAX_NEU || 6);
const PLAN_DIR = process.env.PLAN_DIR || '/tmp/cj_variantenbilder_plan';
const LEDGER = process.env.LEDGER || 'dropship/cj_variantenbilder_ledger.txt';
const schlaf = ms => new Promise(r => setTimeout(r, ms));

const PRODUKT = `query($h:String!){productByHandle(handle:$h){
  id title status handle variantsCount{count} mediaCount{count}
  variants(first:100){nodes{id sku image{url} selectedOptions{name value}}}
  media(first:60){nodes{id status ... on MediaImage{image{url}}}}}}`;

/** Shop-SKU → CJ-Varianten-SKU. Im Shop steht oft «CJ-» davor («CJ-CJWY289988501AZ»); bei CJ heisst die Variante «CJWY289988501AZ». */
export function cjSku(sku) { return String(sku || '').replace(/^CJ-(?=CJ)/, ''); }

/** Reine Entscheidung: welche Varianten bekommen welches Bild? sigs: Map url → Signatur. */
export function bildZuordnung({ shopVarianten, cjProSku, mediaSigs, cjSigs, maxNeu = 6 }) {
  const aktionen = []; let neu = 0; const neuGeplant = new Map();
  for (const v of shopVarianten) {
    if (v.hatBild) continue;
    const url = cjProSku[v.sku];
    if (!url) { aktionen.push({ variante: v.id, sku: v.sku, art: 'ohne_cj_bild' }); continue; }
    const sig = cjSigs.get(url);
    if (!sig) { aktionen.push({ variante: v.id, sku: v.sku, art: 'cj_bild_unlesbar' }); continue; }
    const treffer = [...mediaSigs].map(([id, s]) => ({ id, d: s && gleichesBild(sig, s) })).filter(x => x.d)
      .sort((a, b) => (a.d.dh * 4 + a.d.farbe) - (b.d.dh * 4 + b.d.farbe));
    const mehrdeutig = treffer.length > 1 && (treffer[1].d.dh * 4 + treffer[1].d.farbe) - (treffer[0].d.dh * 4 + treffer[0].d.farbe) < 2;
    if (treffer.length && !mehrdeutig) { aktionen.push({ variante: v.id, sku: v.sku, art: 'vorhanden', mediaId: treffer[0].id }); continue; }
    if (neuGeplant.has(url)) { aktionen.push({ variante: v.id, sku: v.sku, art: 'neu', url, wieder: true }); continue; }
    if (neu >= maxNeu) { aktionen.push({ variante: v.id, sku: v.sku, art: 'zu_viele_neue' }); continue; }
    neu++; neuGeplant.set(url, true);
    aktionen.push({ variante: v.id, sku: v.sku, art: 'neu', url, grund: mehrdeutig ? 'mehrdeutig' : 'kein identisches Medium' });
  }
  return aktionen;
}

export async function plane({ q, cj, handle, tmp }) {
  const p = (await q(PRODUKT, { h: handle })).productByHandle;
  if (!p) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'Produkt nicht gefunden' };
  if (p.variantsCount.count <= 1) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'Einzelvariante' };
  if (p.variantsCount.count > 100) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'mehr als 100 Varianten' };
  if (p.mediaCount.count > 60) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'mehr als 60 Medien' };
  const shopVarianten = p.variants.nodes.map(v => ({ id: v.id, sku: cjSku(v.sku), hatBild: !!v.image }));
  const ohne = shopVarianten.filter(v => !v.hatBild);
  if (!ohne.length) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'alle Varianten haben ein Bild' };
  const sku0 = ohne.find(v => /^CJ[A-Z]{2}\d+/.test(v.sku || ''))?.sku;
  if (!sku0) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `keine CJ-Varianten-SKU (z. B. «${ohne[0].sku}»)` };

  const res = await cjFetch(`${BASE}/product/query?variantSku=${encodeURIComponent(sku0)}`, { context: 'Variantenbilder', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
  await schlaf(1100);
  const c = res.data;
  if (!c) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: `CJ ohne Daten (code ${res.code})` };
  const cjProSku = {};
  for (const v of c.variants || []) if (v.variantSku && v.variantImage) cjProSku[v.variantSku] = v.variantImage;
  if (!Object.keys(cjProSku).length) return { handle, ergebnis: 'UEBERSPRUNGEN', grund: 'CJ führt keine Variantenbilder' };

  const mediaSigs = new Map();
  for (const m of p.media.nodes.filter(m => m.status === 'READY' && m.image?.url)) mediaSigs.set(m.id, bildSig(m.image.url + '?width=256', tmp));
  const cjSigs = new Map();
  for (const url of new Set(ohne.map(v => cjProSku[v.sku]).filter(Boolean))) cjSigs.set(url, bildSig(url, tmp));

  const aktionen = bildZuordnung({ shopVarianten, cjProSku, mediaSigs, cjSigs, maxNeu: MAX_NEU });
  const zaehl = {}; for (const a of aktionen) zaehl[a.art] = (zaehl[a.art] || 0) + 1;
  return { handle, ergebnis: 'PLAN', produktId: p.id, titel: p.title, variantenGesamt: shopVarianten.length, ohneBild: ohne.length, zaehl, aktionen };
}

const UPDATE = `mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){productVariants{id image{url}} userErrors{field message code}}}`;
export function updateEingabe(plan) {
  const v = [];
  for (const a of plan.aktionen) {
    if (a.art === 'vorhanden') v.push({ id: a.variante, mediaId: a.mediaId });
    else if (a.art === 'neu') v.push({ id: a.variante, mediaSrc: [a.url] });
  }
  return v;
}

async function main() {
  const handles = process.argv.slice(2);
  if (process.env.HANDLES_DATEI) for (const z of readFileSync(process.env.HANDLES_DATEI, 'utf8').split('\n').slice(1)) { const h = z.split(';')[0].trim(); if (h) handles.push(h); }
  if (!handles.length) { console.error('Kein Handle angegeben'); process.exit(1); }
  const erledigt = new Set();
  if (existsSync(LEDGER)) for (const z of readFileSync(LEDGER, 'utf8').split('\n')) { const [h, , e] = z.split('·').map(s => s.trim()); if (h && e === 'GESCHRIEBEN') erledigt.add(h); }
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);
  const cj = await cjToken();
  if (!tok || !cj) { console.error('Kein Zugang (Shopify/CJ)'); process.exit(1); }
  mkdirSync(PLAN_DIR, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'vbilder-')); const zaehl = {}; let n = 0;
  try {
    for (const h of handles) {
      if (n >= LIMIT) { console.log(`LIMIT ${LIMIT} erreicht`); break; }
      if (erledigt.has(h)) { console.log(h, '→ schon geschrieben (Ledger)'); continue; }
      n++;
      const planPfad = join(PLAN_DIR, h + '.json'); let plan;
      if (LIVE && existsSync(planPfad) && Date.now() - statSync(planPfad).mtimeMs < 3 * 3600 * 1000) { try { const a = JSON.parse(readFileSync(planPfad, 'utf8')); if (a.ergebnis === 'PLAN') plan = a; } catch { /* neu */ } }
      if (!plan) {
        try { plan = await plane({ q, cj, handle: h, tmp }); }
        catch (e) { if (/CJ_QUOTA|CJ_THROTTLED/.test(String(e.message))) { console.log('ABBRUCH:', e.message); break; } plan = { handle: h, ergebnis: 'FEHLER', grund: String(e.message).slice(0, 200) }; }
        writeFileSync(planPfad, JSON.stringify(plan, null, 1));
      }
      if (plan.ergebnis !== 'PLAN') { zaehl[plan.ergebnis] = (zaehl[plan.ergebnis] || 0) + 1; console.log(h, '→', plan.ergebnis, '|', plan.grund); continue; }
      const eingabe = updateEingabe(plan);
      console.log(`${h} → PLAN: ${plan.ohneBild}/${plan.variantenGesamt} ohne Bild | ${JSON.stringify(plan.zaehl)} | schreibbar: ${eingabe.length}`);
      if (!LIVE) { zaehl.PLAN = (zaehl.PLAN || 0) + 1; continue; }
      if (!eingabe.length) { zaehl.UEBERSPRUNGEN = (zaehl.UEBERSPRUNGEN || 0) + 1; continue; }
      const m = await q(UPDATE, { p: plan.produktId, v: eingabe });
      const e = m.productVariantsBulkUpdate.userErrors;
      if (e.length) { zaehl.FEHLER = (zaehl.FEHLER || 0) + 1; console.log('   FEHLER:', JSON.stringify(e).slice(0, 300)); appendFileSync(LEDGER, `${h} · ${new Date().toISOString()} · FEHLER · ${JSON.stringify(e).slice(0, 100)}\n`); continue; }
      const mitBild = m.productVariantsBulkUpdate.productVariants.filter(x => x.image).length;
      zaehl.GESCHRIEBEN = (zaehl.GESCHRIEBEN || 0) + 1;
      console.log(`   GESCHRIEBEN: ${mitBild}/${eingabe.length} Varianten haben jetzt ein Bild`);
      appendFileSync(LEDGER, `${h} · ${new Date().toISOString()} · GESCHRIEBEN · ${mitBild}/${eingabe.length}\n`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  console.log('\nZusammenfassung:', JSON.stringify(zaehl), LIVE ? '(LIVE)' : '(Trockenlauf — nichts geschrieben)');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
