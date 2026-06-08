#!/usr/bin/env node
/**
 * CJ → angereicherte Kandidatenliste für LuxeStyle CH (autonom)
 * -------------------------------------------------------------
 * Verbessert ggü. cj_import.mjs: größeres pageSize + Relevanzfilter (must-Tokens)
 * + Detail-Anreicherung pro Treffer (echte SKU, Kost, Bilder, Video, Lagerbestand).
 *
 * Credentials AUS DER UMGEBUNG (niemals hardcoden):  CJ_EMAIL, CJ_API_KEY
 * Start:  CJ_EMAIL=... CJ_API_KEY=... node dropship/cj_enrich.mjs
 * Ausgabe: /tmp/cj_enriched.json  (→ danach via Shopify-MCP create-product)
 *
 * CJ-Limits: getAccessToken 1×/5min · QPS 1 req/sek · 1000 req/Tag (Gratis-Tier).
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const EMAIL = process.env.CJ_EMAIL, APIKEY = process.env.CJ_API_KEY;
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_FILE = '/tmp/cj_token.json';
if (!EMAIL || !APIKEY) { console.error('FEHLER: CJ_EMAIL und CJ_API_KEY müssen gesetzt sein.'); process.exit(1); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Kuratierte Sommer/CH-2026-Kandidaten. must = alle Tokens müssen im Namen vorkommen.
const KEYWORDS = [
  { kw: 'men chino pants',      must:['men'],          take: 1 },
  { kw: 'men cuban shirt',      must:['men','shirt'],  take: 1 },
  { kw: 'men beach shorts',     must:['men','short'],  take: 1 },
  { kw: 'men leather sandals',  must:['men','sandal'], take: 1 },
  { kw: 'men knit polo shirt',  must:['men','polo'],   take: 1 },
  { kw: 'men sweatshirt',       must:['men','sweat'],  take: 1 },
  { kw: 'men canvas shoes',     must:['men','shoe'],   take: 1 },
  { kw: 'men crossbody bag',    must:['men','bag'],    take: 1 },
];

let _b, _ctx;
async function ctx() { if (_ctx) return _ctx;
  _b = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors', '--no-sandbox'] });
  _ctx = await _b.newContext({ ignoreHTTPSErrors: true }); return _ctx; }

async function getToken() {
  if (fs.existsSync(TOKEN_FILE)) { const t = JSON.parse(fs.readFileSync(TOKEN_FILE));
    if (t.exp > Date.now() + 60000) return t.accessToken; }
  const c = await ctx();
  const r = await c.request.post(`${BASE}/authentication/getAccessToken`,
    { data: { email: EMAIL, apiKey: APIKEY }, headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
  const j = await r.json(); if (!j.result) throw new Error('AUTH FAIL: ' + JSON.stringify(j));
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 }));
  return j.data.accessToken;
}
async function apiGet(path, params = {}) {
  const c = await ctx(); const tok = await getToken();
  const qs = new URLSearchParams(params).toString();
  for (let a = 0; a < 4; a++) {
    const r = await c.request.get(`${BASE}${path}?${qs}`, { headers: { 'CJ-Access-Token': tok }, timeout: 30000 });
    const j = await r.json();
    if (j.code === 1600200 || /Too Many|QPS/i.test(j.message || '')) { await sleep((a + 1) * 2500); continue; }
    return j;
  }
  throw new Error('RATE LIMIT erschöpft für ' + path);
}

function stockByCountry(variants) {
  const m = {};
  for (const v of variants || []) for (const inv of v.inventories || []) {
    const cc = inv.countryCode || inv.area || '??';
    m[cc] = (m[cc] || 0) + (Number(inv.storageNum ?? inv.totalInventory ?? inv.cjInventory ?? 0) || 0);
  }
  return m;
}

(async () => {
  const out = [];
  try {
    for (const { kw, must, take } of KEYWORDS) {
      console.error(`🔎 ${kw}`);
      const r = await apiGet('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw });
      const list = (r.data?.list || []).filter(p => {
        const n = (p.productNameEn || '').toLowerCase(); return must.every(w => n.includes(w));
      });
      list.sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0)); // Popularität
      console.error(`   ${list.length} relevante Treffer`);
      await sleep(2400);
      for (const p of list.slice(0, take)) {
        const d = (await apiGet('/product/query', { pid: p.pid })).data;
        await sleep(2400);
        if (!d) continue;
        const variants = d.variants || [];
        const costs = variants.map(v => Number(v.variantSellPrice)).filter(Boolean);
        out.push({
          keyword: kw,
          pid: d.pid,
          nameEn: d.productNameEn,
          sku: variants[0]?.variantSku || d.productSku,
          costUsdFrom: costs.length ? Math.min(...costs) : Number(d.sellPrice),
          costUsdTo: costs.length ? Math.max(...costs) : Number(d.sellPrice),
          variantCount: variants.length,
          weightG: variants[0]?.variantWeight || d.productWeight,
          category: d.categoryName,
          listedNum: d.listedNum,
          hasVideo: !!d.productVideo,
          video: d.productVideo || null,
          images: (d.productImageSet || []).slice(0, 10),
          stock: stockByCountry(variants),
          description: (d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
        });
        console.error(`   ✔ ${d.productNameEn.slice(0, 55)} | $${costs.length ? Math.min(...costs) : d.sellPrice} | ${variants.length} Var.`);
      }
    }
    fs.writeFileSync('/tmp/cj_enriched.json', JSON.stringify(out, null, 2));
    console.error(`\n✅ ${out.length} angereicherte Kandidaten → /tmp/cj_enriched.json`);
    // Kompakte Übersicht auf stdout
    console.log(JSON.stringify(out.map(o => ({
      name: o.nameEn.slice(0, 60), sku: o.sku, cost$: `${o.costUsdFrom}-${o.costUsdTo}`,
      vars: o.variantCount, imgs: o.images.length, video: o.hasVideo, stock: o.stock, listed: o.listedNum,
    })), null, 2));
  } catch (e) { console.error('❌', e.message); }
  finally { if (_b) await _b.close(); }
})();
