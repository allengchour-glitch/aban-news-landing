#!/usr/bin/env node
/* LuxeStyle — shop_audit.mjs  (READ-ONLY Shop-Gesundheitscheck)
 *
 * NUR LESEN — führt KEINE Mutationen aus. Sicher in jeder Session.
 * Distilliert aus dem Live-Audit 2026-06-27 (siehe CLAUDE.md + dropship/BIGBUY-IMPORT-BEFUND.md),
 * damit eine Folge-Session den Stand in EINEM Befehl prüfen kann.
 *
 * TOKEN-QUELLE (eine davon):
 *   - SHOPIFY_ADMIN_TOKEN  (fertiger shpat_-Token), ODER
 *   - SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (+ SHOPIFY_SHOP) → holt Token per
 *     Client-Credentials-Grant (POST /admin/oauth/access_token, ~24h gültig). Das ist der
 *     2026er-Weg (kein „shpat_ anzeigen"-Knopf mehr). reel-analytics.mjs macht es genauso.
 *   SHOPIFY_SHOP default: au3j0y-hq.myshopify.com
 *
 * AUSGABE:
 *   - Bestandszahlen (gesamt/active/draft), cj-real-Gesundheit (FAILED-Media/SEO/Alt-Texte),
 *   - Nicht-cj-real-Aufschlüsselung (SKU-Typ, Quell-Tags, Marke/Safety/Dubletten),
 *   - schreibt dropship/bigbuy-risiko-kandidaten.csv (Risiko-Produkte + Admin-Links).
 *
 * Nutzung:  SHOPIFY_CLIENT_ID=.. SHOPIFY_CLIENT_SECRET=.. /opt/node22/bin/node dropship/shop_audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;
const ROOT = path.dirname(new URL(import.meta.url).pathname);

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !sec) { console.error('❌ Kein Token: setze SHOPIFY_ADMIN_TOKEN ODER SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET.'); process.exit(1); }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }),
  });
  const j = await r.json();
  if (!j.access_token) { console.error('❌ Token-Grant fehlgeschlagen:', JSON.stringify(j).slice(0, 200)); process.exit(1); }
  return j.access_token;
}

let TOKEN;
async function gql(query, variables) {
  for (let t = 0; t < 6; t++) {
    const r = await fetch(API, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes('Throttled')) { await new Promise(r => setTimeout(r, 2000)); continue; }
    return j;
  }
}
const count = async (q) => (await gql(`{c:productsCount(query:${JSON.stringify(q)}){count}}`)).data.c.count;

async function main() {
  TOKEN = await getToken();
  const shop = (await gql('{shop{name myshopifyDomain currencyCode}}')).data.shop;
  console.log(`\n🏬 ${shop.name} (${shop.myshopifyDomain}, ${shop.currencyCode})`);

  const [all, active, draft, cjreal, noncj] = await Promise.all([
    count(''), count('status:active'), count('status:draft'),
    count('status:active tag:cj-real'), count('status:active -tag:cj-real'),
  ]);
  console.log(`Bestand: ${all} gesamt · ${active} ACTIVE · ${draft} DRAFT`);
  console.log(`  cj-real ACTIVE: ${cjreal}   |   Nicht-cj-real ACTIVE: ${noncj}`);

  // --- cj-real Gesundheit ---
  console.log('\n— QA cj-real ACTIVE (Media/SEO/Alt) —');
  let c = null, n = 0, failed = 0, noseo = 0, emptyalt = 0;
  const QA = `query($c:String){products(first:40,query:"status:active tag:cj-real",after:$c){pageInfo{hasNextPage endCursor}edges{node{seo{title}media(first:15){edges{node{...on MediaImage{status image{altText}}}}}}}}}`;
  while (true) {
    const p = (await gql(QA, { c })).data.products;
    for (const e of p.edges) { n++; const x = e.node; let f = 0, a = 0; for (const m of x.media.edges) { const md = m.node; if (!md || !('status' in md)) continue; if (md.status && md.status !== 'READY') f++; if (!md.image?.altText?.trim()) a++; } if (f) failed++; if (!x.seo?.title?.trim()) noseo++; if (a) emptyalt++; }
    if (!p.pageInfo.hasNextPage) break; c = p.pageInfo.endCursor; await new Promise(r => setTimeout(r, 320));
  }
  console.log(`  ${n} geprüft → FAILED-Media: ${failed} · ohne SEO: ${noseo} · leere Alt-Texte: ${emptyalt}`);

  // --- Nicht-cj-real Aufschlüsselung + Risiko-CSV ---
  console.log('\n— Nicht-cj-real ACTIVE: Aufschlüsselung —');
  const BRANDV = /^(nike|adidas|puma|reebok|converse|champion|new era|vans|head|hunter|levi|lacoste|disney|marvel)$/i;
  const IP = /frozen|disney|marvel|spider|stitch|nike|adidas|puma|reebok|converse|vans|new era/i;
  const SAFETY = /baby|kinder|lern-tablet|schwimm|pool.?float|pool-?trinkhalter|floating cooler|badeschuhe|schwimmring|schwimmbrille|aufblasbar/i;
  const Q = `query($c:String){products(first:60,query:"status:active -tag:cj-real",after:$c){pageInfo{hasNextPage endCursor}edges{node{id title vendor tags variants(first:1){edges{node{sku}}}}}}}`;
  const sku = { cj: 0, fake: 0, none: 0 }, tagc = {}; const all2 = []; const seen = {};
  c = null;
  while (true) {
    const p = (await gql(Q, { c })).data.products;
    for (const e of p.edges) {
      const x = e.node; const id = x.id.split('/').pop(); const s = (x.variants.edges[0]?.node?.sku || '').trim();
      if (!s) sku.none++; else if (/^CJ/i.test(s)) sku.cj++; else sku.fake++;
      for (const tg of (x.tags || [])) tagc[tg] = (tagc[tg] || 0) + 1;
      const tl = x.title.trim().toLowerCase(); seen[tl] = (seen[tl] || 0) + 1;
      all2.push({ id, t: x.title.trim(), vendor: x.vendor || '', sku: s, tl, marke: x.tags?.includes('marke') || BRANDV.test(x.vendor || '') || IP.test(x.title), safety: SAFETY.test(x.title) });
    }
    if (!p.pageInfo.hasNextPage) break; c = p.pageInfo.endCursor; await new Promise(r => setTimeout(r, 300));
  }
  console.log(`  SKU: CJ=${sku.cj} · Fake=${sku.fake} · keine=${sku.none}`);
  const topTags = Object.entries(tagc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}(${v})`).join(', ');
  console.log(`  Top-Tags: ${topTags}`);
  const esc = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const out = ['gruppe,product_id,admin_url,title,vendor,sku']; let m = 0, sf = 0, d = 0;
  for (const r of all2) {
    const g = []; if (r.marke) { g.push('marke'); m++; } if (r.safety) { g.push('safety'); sf++; } if (seen[r.tl] > 1) { g.push('dublette'); d++; }
    if (!g.length) continue;
    out.push([g.join('+'), r.id, `https://admin.shopify.com/store/${SHOP.split('.')[0]}/products/${r.id}`, r.t, r.vendor, r.sku].map(esc).join(','));
  }
  fs.writeFileSync(path.join(ROOT, 'bigbuy-risiko-kandidaten.csv'), out.join('\n') + '\n');
  console.log(`  Risiko: Marke/IP=${m} · Safety=${sf} · Dubletten=${d} → ${out.length - 1} Zeilen in dropship/bigbuy-risiko-kandidaten.csv`);
  console.log('\n✅ Audit fertig (read-only, Shop unverändert).');
}
main().catch(e => { console.error(e); process.exit(1); });
