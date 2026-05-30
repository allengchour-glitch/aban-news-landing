#!/usr/bin/env node
/**
 * CJ → Shopify autonomer Produkt-Import für LuxeStyle CH
 * -----------------------------------------------------
 * Liest Credentials AUS DER UMGEBUNG (niemals hardcoden!):
 *   CJ_EMAIL    = CJ-Login-E-Mail
 *   CJ_API_KEY  = CJ API-Key (CJ-Dashboard → Authentication / API)
 *
 * Ablauf:
 *   1. getAccessToken (gecached in /tmp/cj_token.json, gültig ~14 Tage)
 *   2. Produktsuche je Keyword (validierte Kandidaten unten)
 *   3. Produktdetails (Variants, echte SKUs, Bilder, Kost)
 *   4. Ausgabe als JSON-Brief → danach via Shopify-MCP create-product anlegen
 *
 * ⭐ EU-VERSAND-STRATEGIE (CJ-Frankfurt-Lager statt China):
 *   Setze CJ_COUNTRY=DE (oder via 2. CLI-Wort nach Keyword) → die Suche liefert nur
 *   Produkte mit EU/DE-Lagerbestand → 5-10 Tage CH-Versand statt 7-14 aus China.
 *   API-Param: /product/list?countryCode=DE  ·  Detail-Variants haben .inventories[]
 *   mit {countryCode, totalInventory} → beim Anlegen nur EU-bevorratete Varianten nehmen.
 *
 * CJ-Limits beachten: getAccessToken 1×/5min · Gesamt 1000 requests/Tag (Gratis-Tier).
 *
 * Start:  CJ_EMAIL=... CJ_API_KEY=... CJ_COUNTRY=DE node dropship/cj_import.mjs "water gun"
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const EMAIL  = process.env.CJ_EMAIL;
const APIKEY = process.env.CJ_API_KEY;
const BASE   = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_FILE = '/tmp/cj_token.json';

if (!EMAIL || !APIKEY) {
  console.error('FEHLER: CJ_EMAIL und CJ_API_KEY müssen als Environment-Variablen gesetzt sein.');
  process.exit(1);
}

// Validierte Import-Kandidaten (siehe PRODUKT-PIPELINE.md). Override via CLI-Args.
const DEFAULT_KEYWORDS = [
  'electric water gun',      // A — Summer-viral
  'sand free beach mat',     // E — Summer
  'portable air pump',       // F — Pool/Camping
  'led face mask beauty',    // H — Beauty-Device, ganzjährig
];

let _b, _ctx;
async function ctx() {
  if (_ctx) return _ctx;
  _b = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors', '--no-sandbox'] });
  _ctx = await _b.newContext({ ignoreHTTPSErrors: true });
  return _ctx;
}

async function getToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    const t = JSON.parse(fs.readFileSync(TOKEN_FILE));
    if (t.exp > Date.now() + 60000) return t.accessToken;
  }
  const c = await ctx();
  const r = await c.request.post(`${BASE}/authentication/getAccessToken`,
    { data: { email: EMAIL, apiKey: APIKEY }, headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
  const j = await r.json();
  if (!j.result) throw new Error('AUTH FAIL: ' + JSON.stringify(j));
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 }));
  return j.data.accessToken;
}

async function apiGet(path, params = {}) {
  const c = await ctx();
  const tok = await getToken();
  const qs = new URLSearchParams(params).toString();
  const r = await c.request.get(`${BASE}${path}${qs ? '?' + qs : ''}`,
    { headers: { 'CJ-Access-Token': tok }, timeout: 30000 });
  return await r.json();
}

const COUNTRY = process.env.CJ_COUNTRY || ''; // z.B. "DE" → nur EU/Frankfurt-Lager-Bestand

async function searchProducts(keyword, pageSize = 5) {
  const params = { pageNum: 1, pageSize, productNameEn: keyword };
  if (COUNTRY) params.countryCode = COUNTRY; // EU-Lager-Filter (schneller CH-Versand)
  const r = await apiGet('/product/list', params);
  if (r.code === 1600200) throw new Error('RATE LIMIT: ' + r.message.slice(0, 80));
  if (!r.result) { console.error('  Suche fehlgeschlagen:', r.message?.slice(0, 100)); return []; }
  return (r.data?.list || []);
}

async function productDetail(pid) {
  const params = { pid };
  if (COUNTRY) params.countryCode = COUNTRY; // nur Varianten mit EU-Bestand zurück
  const r = await apiGet('/product/query', params);
  return r.result ? r.data : null;
}

(async () => {
  const keywords = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_KEYWORDS;
  const out = [];
  try {
    for (const kw of keywords) {
      console.error(`🔎 Suche: ${kw}`);
      const list = await searchProducts(kw, 5);
      console.error(`   ${list.length} Treffer`);
      for (const p of list.slice(0, 3)) {
        out.push({
          keyword: kw,
          pid: p.pid,
          name: p.productNameEn,
          sku: p.productSku,
          sellPrice: p.sellPrice,
          image: p.productImage,
          categoryName: p.categoryName,
        });
      }
    }
    console.log(JSON.stringify(out, null, 2));
    fs.writeFileSync('/tmp/cj_candidates.json', JSON.stringify(out, null, 2));
    console.error(`\n✅ ${out.length} Kandidaten → /tmp/cj_candidates.json`);
  } catch (e) {
    console.error('❌', e.message);
  } finally {
    if (_b) await _b.close();
  }
})();
