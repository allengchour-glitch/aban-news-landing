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
import fs from 'fs';
import { readCjResponse } from '../automation/lib/cj_response.mjs';

const EMAIL = process.env.CJ_EMAIL, APIKEY = process.env.CJ_API_KEY;
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_FILE = process.env.CJ_TOKEN_CACHE || '/tmp/cj_token.json';
if (!EMAIL || !APIKEY) { console.error('FEHLER: CJ_EMAIL und CJ_API_KEY müssen gesetzt sein.'); process.exit(1); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Charge 2026-07-05: Lücken-Kategorien Reise/Strand/Handy + freie §6-Ideen (2-Token-must-Regel).
// Charge 2026-07-05c: gezielte Lücken (Thermometer=1 im Shop, Grill=52 stark).
const KEYWORDS = [
  { kw: 'meat thermometer digital',    must:['meat','thermometer'],  take: 2 },
  { kw: 'grill thermometer wireless',  must:['thermometer'],         take: 1 },
  { kw: 'bbq grill mat non stick',     must:['grill','mat'],         take: 1 },
];

async function getToken() {
  try { if (fs.existsSync(TOKEN_FILE)) { const t = JSON.parse(fs.readFileSync(TOKEN_FILE));
    if (typeof t.accessToken === 'string' && t.accessToken && t.exp > Date.now() + 60000) return t.accessToken; } } catch {}
  const r = await fetch(`${BASE}/authentication/getAccessToken`,
    { method:'POST', redirect:'error', signal:AbortSignal.timeout(30000), body:JSON.stringify({ email: EMAIL, password: APIKEY }), headers: { 'Content-Type': 'application/json' } });
  const j = await readCjResponse(r,'authentication/getAccessToken');
  if (typeof j.data?.accessToken !== 'string' || !j.data.accessToken) throw new Error('CJ_AUTH: Token fehlt');
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 }),{mode:0o600});
  return j.data.accessToken;
}
async function apiGet(path, params = {}) {
  const tok = await getToken();
  const qs = new URLSearchParams(params).toString();
  for (let a = 0; a < 4; a++) {
    const r = await fetch(`${BASE}${path}?${qs}`, { redirect:'error', signal:AbortSignal.timeout(30000), headers: { 'CJ-Access-Token': tok } });
    const j = await r.json();
    if (r.status === 429 || j.code === 1600200 || /Too Many|QPS/i.test(j.message || '')) { await sleep((a + 1) * 2500); continue; }
    return readCjResponse({status:r.status,json:async()=>j},path);
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
  const seen = new Set();
  try {
    for (const { kw, must, take } of KEYWORDS) {
      console.error(`🔎 ${kw}`);
      const r = await apiGet('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw });
      if (!Array.isArray(r.data?.list)) throw new Error('CJ_DATA: Produktliste fehlt');
      const list = r.data.list.filter(p => {
        const n = (p.productNameEn || '').toLowerCase();
        // Herren-Suche: „women/woman" ausschliessen (sonst matcht das Teilwort „men").
        if (must.includes('men') && /wom[ae]n/.test(n)) return false;
        return must.every(w => n.includes(w));
      });
      list.sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0)); // Popularität
      console.error(`   ${list.length} relevante Treffer`);
      await sleep(2400);
      for (const p of list.slice(0, take)) {
        if (!p.pid || seen.has(String(p.pid))) continue;
        const d = (await apiGet('/product/query', { pid: p.pid })).data;
        await sleep(2400);
        if (!d?.pid || !Array.isArray(d.variants)) throw new Error('CJ_DATA: Produktdetails oder Varianten fehlen');
        seen.add(String(d.pid));
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
          variants: variants.map(v=>({vid:v.vid,sku:v.variantSku,key:v.variantKey,costUsd:v.variantSellPrice,weightG:v.variantWeight,inventories:v.inventories ?? null})),
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
    const output=process.env.CJ_ENRICH_OUTPUT || '/tmp/cj_enriched.json';
    fs.writeFileSync(output, JSON.stringify(out, null, 2));
    console.error(`\n${out.length} angereicherte Kandidaten → ${output}`);
    // Kompakte Übersicht auf stdout
    console.log(JSON.stringify(out.map(o => ({
      name: o.nameEn.slice(0, 60), sku: o.sku, cost$: `${o.costUsdFrom}-${o.costUsdTo}`,
      vars: o.variantCount, imgs: o.images.length, video: o.hasVideo, stock: o.stock, listed: o.listedNum,
    })), null, 2));
  } catch (e) { console.error('CJ-Anreicherung fehlgeschlagen:', e.message); process.exitCode = 1; }
})();
