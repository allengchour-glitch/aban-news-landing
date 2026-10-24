#!/usr/bin/env node
/**
 * Hat CJ mehr Bilder und Videos, als im Shop liegen? — gemessen, nicht geschätzt.
 *
 * WARUM: CJ führt je Produkt `productImage` (Liste), `productImageSet` und `productVideo`.
 * Beim Import landet oft nur ein Teil davon im Shop. Mehr echte Produktfotos und ein Video
 * sind einer der wenigen Hebel, die ohne neue Ware und ohne Werbegeld wirken.
 *
 * DER LAUF SCHREIBT NICHTS. Er zählt und berichtet. Nachladen ist ein eigener Schritt: ein
 * Bild, das CJ führt, ist nicht automatisch ein gutes Hauptbild (siehe das Bild-Audit vom
 * 18.10., wo ein Verpackungsfoto nach vorn gerutscht wäre), und eine URL, die CJ nennt, ist
 * nicht automatisch erreichbar — `quick/product/…` gibt teils 404.
 *
 * Schalter:
 *   BESUCHT=1 Stichprobe aus den meistbesuchten Produktseiten (Vorgabe)
 *   PQUERY    Shopify-Suche statt Besuchsdaten
 *   MAX       wie viele Produkte geprüft werden (Vorgabe 30)
 *   TAGE      Zeitraum der Besuchsdaten (Vorgabe 90)
 *   URLCHECK=1 prüft jede zusätzliche Bild-URL per HTTP (langsam, aber ehrlich)
 *   BERICHT   Zieldatei (Vorgabe dropship/cj-medien-audit.csv)
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { writeFile } from 'node:fs/promises';

const SHOP = process.env.SHOPIFY_SHOP || '', API = '2025-01',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  BASE = 'https://developers.cjdropshipping.com/api2.0/v1',
  BESUCHT = process.env.PQUERY ? false : true,
  PQUERY = process.env.PQUERY || 'status:active AND tag:cj-real',
  MAX = Math.min(parseInt(process.env.MAX || '30', 10), 200),
  TAGE = parseInt(process.env.TAGE || '90', 10),
  URLCHECK = process.env.URLCHECK === '1',
  BERICHT = process.env.BERICHT || 'dropship/cj-medien-audit.csv',
  WEICH = [1602001, 1602002, 1602003];

const schlaf = ms => new Promise(r => setTimeout(r, ms));
const gql = (t, q, v) => shopifyGql(SHOP, API, t, q, v);

async function shopToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }),
  });
  if (!r.ok) { console.error(`Shopify-Token: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`); return ''; }
  return (await r.json()).access_token || '';
}

const FELDER = `handle title status
  media(first:50){nodes{ mediaContentType }}
  variants(first:1){nodes{sku}}`;

async function besuchte(tok) {
  const q = `FROM sessions SHOW sessions GROUP BY landing_page_path SINCE -${TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 250`;
  const d = await gql(tok, `query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}`, { q });
  if ((d?.shopifyqlQuery?.parseErrors || []).length) return [];
  const out = [];
  for (const z of d?.shopifyqlQuery?.tableData?.rows || []) {
    const t = String(z?.landing_page_path || '').match(/^\/products\/([^?#]+)/);
    if (t) out.push({ handle: decodeURIComponent(t[1]), sitzungen: Number(z.sessions) || 0 });
  }
  return out;
}

/** Die CJ-Medien eines Produkts. Nicht lesbar heisst `null` — nicht „keine". */
async function cjMedien(tok, sku) {
  const istPid = /^\d{15,}$/.test(sku);
  const wege = istPid ? [{ pid: sku }, { variantSku: sku }] : [{ variantSku: sku }, { productSku: sku }];
  for (const p of wege) {
    const u = new URL(`${BASE}/product/query`);
    for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
    let r;
    try { r = await cjFetch(u.toString(), { headers: { 'CJ-Access-Token': tok }, context: 'CJ-Produkt', weicheCodes: WEICH }); }
    catch { return null; }
    const d = r?.data;
    if (!d?.pid) { await schlaf(300); continue; }
    // `productImage` ist ein JSON-Text, `productImageSet` schon eine Liste. Beide vereinen,
    // doppelte URLs zählen nur einmal.
    let liste = [];
    try { liste = JSON.parse(d.productImage || '[]'); } catch { liste = d.productImage ? [d.productImage] : []; }
    const alle = new Set([...(Array.isArray(liste) ? liste : []), ...(d.productImageSet || [])].filter(Boolean));
    return { pid: d.pid, bilder: [...alle], video: d.productVideo || null };
  }
  return null;
}

(async () => {
  const stok = await shopToken();
  if (!stok) { console.error('Kein Shopify-Token. Abbruch.'); process.exit(1); }
  const ctok = await cjToken();
  if (!ctok) { console.error('Kein CJ-Token. Abbruch.'); process.exit(1); }

  let ziele = [];
  if (BESUCHT) {
    ziele = await besuchte(stok);
    console.log(`Besuchs-Vorrat: ${ziele.length} Produktseiten aus ${TAGE} Tagen.`);
  }
  if (!ziele.length) {
    const d = await gql(stok, `query($q:String!,$n:Int!){products(first:$n,query:$q,sortKey:UPDATED_AT,reverse:true){nodes{handle}}}`, { q: PQUERY, n: Math.min(MAX, 50) });
    ziele = (d?.products?.nodes || []).map(n => ({ handle: n.handle, sitzungen: null }));
    console.log(`Vorrat aus der Suche: ${ziele.length}.`);
  }

  const zeilen = [['handle', 'sitzungen', 'shop_bilder', 'shop_videos', 'cj_bilder', 'cj_video', 'mehr_bilder', 'befund'].join(',')];
  let geprueft = 0, mehrBilder = 0, mitVideo = 0, unbekannt = 0, ohneCj = 0, bilderSumme = 0;
  for (const z of ziele) {
    if (geprueft >= MAX) break;
    const d = await gql(stok, `query($h:String!){products(first:1,query:$h){nodes{${FELDER}}}}`, { h: `handle:${z.handle}` });
    const p = d?.products?.nodes?.[0];
    if (!p) continue;
    const sku = p.variants?.nodes?.[0]?.sku || '';
    if (!sku) { ohneCj++; continue; }
    geprueft++;
    const shopBilder = (p.media?.nodes || []).filter(m => m.mediaContentType === 'IMAGE').length;
    const shopVideos = (p.media?.nodes || []).filter(m => /VIDEO/.test(m.mediaContentType)).length;
    const cj = await cjMedien(ctok, sku);
    await schlaf(300);
    if (!cj) { unbekannt++; zeilen.push([z.handle, z.sitzungen ?? '', shopBilder, shopVideos, '', '', '', 'cj-unbekannt'].join(',')); continue; }
    let mehr = Math.max(0, cj.bilder.length - shopBilder);
    // Eine URL, die CJ nennt, ist nicht automatisch erreichbar: `quick/product/…` gibt teils
    // 404 (Bild-Falle, CLAUDE.md). Mit URLCHECK=1 zählt nur, was wirklich antwortet.
    if (URLCHECK && mehr > 0) {
      let ok = 0;
      for (const u of cj.bilder) {
        try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) ok++; } catch { /* nicht erreichbar */ }
      }
      mehr = Math.max(0, ok - shopBilder);
    }
    if (mehr > 0) { mehrBilder++; bilderSumme += mehr; }
    if (cj.video && !shopVideos) mitVideo++;
    const befund = mehr > 0 && cj.video ? 'bilder+video' : mehr > 0 ? 'mehr-bilder' : cj.video && !shopVideos ? 'nur-video' : 'nichts-neues';
    zeilen.push([z.handle, z.sitzungen ?? '', shopBilder, shopVideos, cj.bilder.length, cj.video ? 1 : 0, mehr, befund].join(','));
    console.log(`  ${befund.padEnd(13)} Shop ${String(shopBilder).padStart(2)} Bilder / CJ ${String(cj.bilder.length).padStart(2)}${cj.video ? ' + Video' : ''}  ${z.handle.slice(0, 48)}`);
  }

  await writeFile(BERICHT, zeilen.join('\n') + '\n');
  console.log(`\nGeprüft ${geprueft} Produkte. ${mehrBilder} hätten mehr Bilder bei CJ (${bilderSumme} zusätzliche insgesamt), ${mitVideo} hätten ein Video, das der Shop nicht zeigt.`);
  console.log(`${unbekannt} bei CJ nicht lesbar (unbekannt, NICHT „keine Medien"), ${ohneCj} ohne SKU übersprungen.`);
  console.log(`Bericht: ${BERICHT}. Der Lauf schreibt nichts in den Shop.`);
})();
