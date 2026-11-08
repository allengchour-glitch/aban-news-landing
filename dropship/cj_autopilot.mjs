#!/usr/bin/env node
/**
 * CJ-Autopilot — autonomer Sourcing-Lauf für gesperrte Produktentwürfe.
 * ----------------------------------------------------------------------------------
 * Läuft OHNE Claude-Session. Pro Lauf:
 *   1. CJ-Keyword-Suche (rotierend nach Tag) + Relevanzfilter + Hartfilter (§5)
 *   2. Dedupe gegen bestehende Shopify-Produkte (per SKU)
 *   3. Detail-Anreicherung (echte variantSku, Kost, Bilder, Varianten)
 *   4. Bild-URLs per HTTP-200 verifizieren (nur funktionierende übernehmen)
 *   5. Varianten bauen (Farbe×Grösse + Farbbild je Variante) → Shopify `productSet`
 *   6. **Gemini-Gate:** deutsche Verkaufs-Copy + Qualitäts-Urteil.
 *        • nur sprachlich geprüfter Gemini-PASS → gesperrter **DRAFT** mit `compliance-pruefen`
 *        • Gemini FAIL / kein Key / englische Ausgabe → kein Produkt-Write
 *
 * Secrets (NUR aus der Umgebung — niemals im Repo):
 *   CJ_EMAIL, CJ_API_KEY                — CJ Developer API
 *   SHOPIFY_SHOP                        — z.B. au3j0y-hq.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN                 — Admin API Token (shpat_…/shpca_…), Scope: write_products
 * Für Produkt-Writes erforderlich:
 *   GEMINI_API_KEY                      — generativelanguage-Key → DE-Copy + QA
 * Optional:
 *   AUTOPILOT_MAX (Default 6)           — wie viele Produkte pro Lauf
 *
 * Fehlt ein Pflicht-Secret → sauberer No-Op (exit 0). Keine Secrets im Log.
 */
import https from 'node:https';
import { cjImportSicherheitsdaten, cjImportWriteFreigegeben, pruefeCjImportText, pruefeCjShopIdentitaet } from '../automation/lib/cj_import_guard.mjs';
import { cjFetch } from '../automation/lib/cj_fetch.mjs';
import { shopifyGql } from '../automation/lib/shopify_gql.mjs';
import { baueIndex, istDublette, kandidatAus, pidNorm, produktSkuOk, skuNorm } from '../automation/lib/grind_dubletten.mjs';
import { shopifyClientSecret } from '../automation/lib/shopify_secret.mjs';

const { CJ_EMAIL, CJ_API_KEY, SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLIENT_ID, GEMINI_API_KEY } = process.env;
// s. automation/lib/shopify_secret.mjs — vertauschte Env-Felder
const SHOPIFY_CLIENT_SECRET = shopifyClientSecret();
let SHOP_TOKEN = SHOPIFY_ADMIN_TOKEN || '';  // wird ggf. per Client-Credentials befüllt
const MAX = Math.min(6, Math.max(1, Number(process.env.AUTOPILOT_MAX || 6) || 6));
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const API_VER = '2024-10';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const WRITE = cjImportWriteFreigegeben(process.env);

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 'XXXL'];

if (!CJ_EMAIL || !CJ_API_KEY || !SHOPIFY_SHOP || !(SHOPIFY_ADMIN_TOKEN || (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET))) {
  console.log('No-Op: Secrets fehlen (CJ_EMAIL/CJ_API_KEY/SHOPIFY_SHOP + SHOPIFY_ADMIN_TOKEN ODER SHOPIFY_CLIENT_ID/SECRET).');
  process.exit(0);
}
if (!GEMINI_API_KEY) {
  console.log('No-Op: GEMINI_API_KEY fehlt; ohne geprüfte deutsche Copy kein CJ-Produkt-Write.');
  process.exit(0);
}
if (!WRITE) {
  console.log('No-Op: CJ-Schreibfreigabe fehlt; erforderlich sind DRY_RUN=0 und CJ_IMPORT_WRITE_APPROVED=1.');
  process.exit(0);
}

// ── Keyword-Pool (rotiert nach Tag-des-Jahres; Dedupe per SKU macht Wiederholungen harmlos) ──
const POOL = [
  ['summer dress women', ['dress']], ['linen pants women', ['pant']], ['knit cardigan women', ['cardigan']],
  ['blazer women', ['blazer']], ['two piece set women', ['set']], ['maxi dress floral', ['dress']],
  ['crossbody bag women', ['bag']], ['tote bag women', ['bag']], ['shoulder bag pu', ['bag']],
  ['beret hat women', ['beret']], ['bucket hat', ['hat']], ['silk scarf women', ['scarf']],
  ['pearl necklace women', ['necklace']], ['stud earrings silver', ['earring']], ['bracelet women', ['bracelet']],
  ['cat eye sunglasses', ['sunglasses']], ['polarized sunglasses', ['sunglasses']],
  ['ceramic vase decor', ['vase']], ['scented candle set', ['candle']], ['photo frame set', ['frame']],
  ['jewelry box organizer', ['box']], ['makeup bag cosmetic', ['bag']], ['passport holder travel', ['passport']],
  ['silk pillowcase', ['pillowcase']], ['jade roller gua sha', ['roller']], ['hair claw clip', ['clip']],
];

// ── HTTPS-JSON/Text-Helfer (kein npm nötig) ──
function req(method, url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = { method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = https.request(opts, (res) => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
async function cjGet(path, params = {}, tok) {
  const qs = new URLSearchParams(params).toString();
  return cjFetch(`${CJ_BASE}${path}?${qs}`, { context: `CJ ${path}`, headers: tok ? { 'CJ-Access-Token': tok } : {} });
}
async function imgOk(url) {
  try { let r = await req('HEAD', url); if (r.status >= 200 && r.status < 300) return true;
        r = await req('GET', url); return r.status >= 200 && r.status < 300; }
  catch { return false; }
}
async function ensureShopToken() {
  // Client-Credentials-Grant BEVORZUGT (2026): frischer Token pro Lauf, läuft nie ab.
  // Fallback: statischer SHOPIFY_ADMIN_TOKEN. So klappt es egal welches Secret gesetzt ist.
  if (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET) {
    const r = await req('POST', `https://${SHOPIFY_SHOP}/admin/oauth/access_token`,
      { 'Content-Type': 'application/json' },
      { client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' });
    if (r.status < 200 || r.status >= 300) throw new Error(`SHOPIFY_AUTH_UNKNOWN: HTTP ${r.status}`);
    const t = JSON.parse(r.body).access_token;
    if (!t) throw new Error('SHOPIFY_AUTH_UNKNOWN: access_token fehlt');
    SHOP_TOKEN = t; return SHOP_TOKEN;
  }
  return SHOP_TOKEN; // statischer Token als Fallback
}
async function shopify(query, variables) {
  return shopifyGql(SHOPIFY_SHOP, API_VER, SHOP_TOKEN, query, variables);
}

async function pruefeDublette(d) {
  const k = kandidatAus(d);
  const teile = [];
  if (k.pid) teile.push(`sku:CJ-${k.pid}`);
  if (k.productSku && produktSkuOk(k.productSku)) teile.push(`sku:${k.productSku}*`);
  for (const sku of k.variantSkus.slice(0, 4)) teile.push(`sku:${JSON.stringify(sku)}`);
  if (!teile.length) throw new Error('DUPLIKAT_STATUS_UNKNOWN: keine pruefbare pid/productSku/variantSku');
  const data = await shopify(`query($q:String!){products(first:25,query:$q){pageInfo{hasNextPage} nodes{id handle title status variants(first:100){pageInfo{hasNextPage} nodes{sku}}}}}`, { q: teile.join(' OR ') });
  const nodes = data?.products?.nodes;
  if (!Array.isArray(nodes)) throw new Error('DUPLIKAT_STATUS_UNKNOWN: Shopify-Antwort unvollstaendig');
  if (data.products.pageInfo?.hasNextPage || nodes.some(p => p.variants?.pageInfo?.hasNextPage)) {
    throw new Error('DUPLIKAT_STATUS_UNKNOWN: begrenzte Shopify-Gegenprobe unvollstaendig');
  }
  const ix = baueIndex({ produkte: nodes.map(p => ({ id:p.id, handle:p.handle, title:p.title, status:p.status, skus:(p.variants?.nodes||[]).map(v=>v.sku) })) });
  return istDublette({ ...d, pid: pidNorm(d.pid), productSku: skuNorm(d.productSku) }, ix);
}

// ── Hartfilter (siehe AUTONOMER-MODUS.md §5) ──
const BAD = /disney|marvel|frozen|spider|hello kitty|pokemon|nike|adidas|gucci|chanel|louis|baby float|swim ring|swimming ring|hookah|shisha|snuff|tobacco|bunk bed|wardrobe|cabinet|sofa|treadmill|grill cart|pet (apparel|clothing|backpack)|national flag|world cup|skeleton|gothic|microphone|before.?after/i;
function priceCHF(usd) {
  const v = Number(usd) || 5;
  let chf = v * 2.8 * 0.88;            // Marge ×2,8, USD→CHF
  chf = Math.max(chf, 14.9);
  return (Math.floor(chf) + 0.9).toFixed(2);
}

// ── Varianten parsen (Farbe / Grösse aus CJ variantKey) ──
function parseVariants(detail) {
  const out = [];
  for (const v of (detail.variants || [])) {
    const key = (v.variantKey || v.variantNameEn || '').trim();
    const parts = key.split('-').map(s => s.trim());
    let size = '', color = key;
    const last = (parts[parts.length - 1] || '').toUpperCase().replace(/\s/g, '');
    if (SIZES.includes(last)) { size = last; color = parts.slice(0, -1).join('-').trim(); }
    out.push({ color: color || 'Standard', size: size || 'Einheitsgrösse',
               sku: v.variantSku, cost: Number(v.variantSellPrice) || 0, img: (v.variantImage || '').trim() });
  }
  return out;
}

// ── Gemini: deutsche Copy + Qualitäts-Urteil (optional, text-basiert) ──
async function geminiEnrich(name, rawDesc) {
  if (!GEMINI_API_KEY) return null;
  const prompt = `Du bist Copywriter für den Schweizer Premium-Shop LuxeStyle. Produkt (Originalname, evtl. Englisch): "${name}".`
    + ` Roh-Beschreibung: "${(rawDesc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 800)}".`
    + ` Gib NUR JSON zurück: {"title_de": "<knackiger deutscher Produkttitel, max 70 Zeichen, keine Marke>",`
    + ` "html_de": "<descriptionHtml auf Deutsch: 1 fetter Einleitungssatz + <ul> mit 4-5 Nutzen-Bullets>",`
    + ` "verdict": "pass" oder "fail", "reason": "<kurz>"}.`
    + ` verdict=fail wenn: Markenfälschung, anstössig, Kinder-/Tier-Kleidung, Medizin-/Heilversprechen, oder unklar/Müll.`;
  try {
    const r = await req('POST',
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      { 'Content-Type': 'application/json' },
      { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.6 } });
    const j = JSON.parse(r.body);
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) return null;
    const o = JSON.parse(txt);
    if (!o.title_de || !o.html_de) return null;
    return o;
  } catch { return null; }
}

(async () => {
  const aj = await cjFetch(`${CJ_BASE}/authentication/getAccessToken`, { context: 'CJ Autopilot Auth', init: {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: CJ_EMAIL, apiKey: CJ_API_KEY }),
  } });
  const tok = aj.data.accessToken;
  console.log(`Autopilot · geprüfte Produkte bleiben DRAFT · Gemini: AN · MAX ${MAX}`);
  await ensureShopToken();
  if (!SHOP_TOKEN) { console.log('Shopify-Auth fehlgeschlagen (SHOPIFY_ADMIN_TOKEN oder CLIENT_ID/SECRET prüfen).'); process.exit(0); }
  const identity = pruefeCjShopIdentitaet((await shopify('{shop{name myshopifyDomain currencyCode primaryDomain{host}}}', {}))?.shop, SHOPIFY_SHOP);
  if (identity.status !== 'OK') throw new Error(`SHOP_IDENTITY_BLOCKED: ${identity.gruende.join(' | ')}`);

  // Eingebaute Themen-Pools (für gezieltes Sourcing via AUTOPILOT_POOL=men-tech | gadgets | …)
  const POOLS = {
    'men-tech': [
      ['mens watch steel', ['watch']], ['mens leather wallet rfid', ['wallet']], ['mens sunglasses polarized', ['sunglasses']],
      ['mens leather belt', ['belt']], ['mens backpack laptop', ['backpack']], ['mens bracelet steel', ['bracelet']],
      ['mens necklace steel', ['necklace']], ['beard grooming kit', ['beard']], ['mens beanie hat', ['beanie']],
      ['wireless earbuds bluetooth', ['earbud']], ['bluetooth speaker portable', ['speaker']], ['power bank fast charging', ['power']],
      ['wireless charger stand', ['charg']], ['gaming mouse rgb', ['mouse']], ['mechanical keyboard', ['keyboard']],
      ['led strip lights rgb', ['led']], ['car phone holder', ['holder']], ['smart watch fitness', ['watch']],
      ['laptop stand aluminum', ['stand']], ['cable organizer desk', ['cable']], ['tactical flashlight led', ['flashlight']],
      ['massage gun muscle', ['massage']], ['multitool pocket', ['tool']], ['desk organizer wood', ['organizer']],
    ],
    'gadgets': [
      ['wireless earbuds bluetooth', ['earbud']], ['bluetooth speaker', ['speaker']], ['power bank', ['power']],
      ['wireless charger', ['charg']], ['led strip lights', ['led']], ['smart watch', ['watch']], ['mini drone', ['drone']],
      ['phone holder car', ['holder']], ['ring light phone', ['light']], ['usb hub', ['usb']], ['portable fan mini', ['fan']],
      ['projector mini', ['projector']], ['action camera accessory', ['camera']], ['humidifier desk', ['humidifier']],
    ],
  };
  const ENV_KW = (process.env.AUTOPILOT_KEYWORDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const POOL_NAME = (process.env.AUTOPILOT_POOL || '').trim().toLowerCase();
  let picks;
  if (ENV_KW.length) {
    // "kw|mustword1|mustword2" — must-Wörter optional
    picks = ENV_KW.map(s => { const [kw, ...m] = s.split('|').map(x => x.trim()); return [kw, m.filter(Boolean)]; });
    console.log(`Keyword-Override: ${picks.length} eigene Suchbegriffe.`);
  } else if (POOLS[POOL_NAME]) {
    picks = POOLS[POOL_NAME].slice();
    console.log(`Themen-Pool: ${POOL_NAME} (${picks.length} Begriffe).`);
  } else {
    const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
    picks = []; for (let i = 0; i < 14; i++) picks.push(POOL[(doy * 3 + i) % POOL.length]);
  }
  // Zusätzliche Tags (z.B. gadgets,tech oder herren) → Produkte landen in den passenden Collections
  const EXTRA_TAGS = (process.env.AUTOPILOT_TAGS || '').split(',').map(s => s.trim()).filter(Boolean);

  const done = [];
  for (const [kw, must] of picks) {
    if (done.length >= MAX) break;
    const r = await cjGet('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw }, tok);
    await sleep(1600);
    const list = (r.data?.list || []).filter(p => {
      const n = (p.productNameEn || '').toLowerCase();
      return must.every(w => n.includes(w)) && !BAD.test(n);
    }).sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0));

    for (const p of list) {
      if (done.length >= MAX) break;
      const d = (await cjGet('/product/query', { pid: p.pid }, tok)).data;
      await sleep(1600);
      if (!d) continue;
      const duplikat = await pruefeDublette(d);
      if (duplikat.unbekannt) throw new Error(`DUPLIKAT_STATUS_UNKNOWN: ${duplikat.grund}`);
      if (duplikat.dublette) { console.log(`  skip(Dublette): ${duplikat.grund}`); continue; }
      const baseSku = d.productSku || p.productSku;
      const name = (d.productNameEn || kw);
      if (BAD.test(name.toLowerCase())) continue;

      // Varianten + Bilder
      let vars = parseVariants(d);
      // Dedupe Option-Kombis
      const seen = new Set(); vars = vars.filter(v => { const k = v.color + '|' + v.size; if (seen.has(k)) return false; seen.add(k); return true; });
      if (vars.length === 0 || vars.length > 100) continue; // 100-Varianten-Limit

      const galleryRaw = (d.productImageSet || []).slice(0, 10);
      const gallery = []; for (const u of galleryRaw) { if (await imgOk(u)) gallery.push(u); }
      if (gallery.length < 3) continue; // zu wenige valide Bilder

      // Farbbild je Farbe (verifiziert)
      const colorImg = {};
      for (const v of vars) { if (v.img && !(v.color in colorImg) && await imgOk(v.img)) colorImg[v.color] = v.img; }
      const fileSet = [...new Set([...gallery, ...Object.values(colorImg)])];
      const files = fileSet.map(u => ({ originalSource: u, contentType: 'IMAGE' }));

      // Optionen dynamisch
      const colors = [...new Set(vars.map(v => v.color))];
      const sizes = [...new Set(vars.map(v => v.size))];
      const hasColor = colors.length > 1 || (colors.length === 1 && colors[0] !== 'Standard');
      const hasSize = sizes.length > 1 || (sizes.length === 1 && sizes[0] !== 'Einheitsgrösse');
      let productOptions, mkOV;
      if (hasColor && hasSize) {
        productOptions = [{ name: 'Farbe', values: colors.map(n => ({ name: n })) }, { name: 'Grösse', values: sizes.map(n => ({ name: n })) }];
        mkOV = v => [{ optionName: 'Farbe', name: v.color }, { optionName: 'Grösse', name: v.size }];
      } else if (hasColor) {
        productOptions = [{ name: 'Farbe', values: colors.map(n => ({ name: n })) }];
        mkOV = v => [{ optionName: 'Farbe', name: v.color }];
      } else if (hasSize) {
        productOptions = [{ name: 'Grösse', values: sizes.map(n => ({ name: n })) }];
        mkOV = v => [{ optionName: 'Grösse', name: v.size }];
      } else {
        productOptions = [{ name: 'Variante', values: [{ name: 'Standard' }] }];
        mkOV = () => [{ optionName: 'Variante', name: 'Standard' }];
      }

      // Gemini-Gate
      const g = await geminiEnrich(name, d.description);
      if (g && g.verdict === 'fail') { console.log(`  ✗ Gemini-FAIL: ${name.slice(0, 50)} (${g.reason || ''})`); continue; }
      if (!g || g.verdict !== 'pass') { console.log(`  skip(Copy-Gate): ${name.slice(0, 50)}`); continue; }
      const textPruefung = pruefeCjImportText({ sourceTitle: name, title: g.title_de, html: g.html_de });
      if (textPruefung.status !== 'OK') {
        console.log(`  skip(Textpruefung): ${name.slice(0, 50)} (${textPruefung.gruende.join(' | ')})`);
        continue;
      }
      const title = g.title_de.slice(0, 120);
      const html = `${g.html_de}<p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe.</p>`;
      const sicherheit = cjImportSicherheitsdaten(['cj-real', 'neu', 'dropship', 'autopilot', ...EXTRA_TAGS]);

      const variants = vars.map(v => {
        const o = { optionValues: mkOV(v), price: priceCHF(v.cost || d.sellPrice), inventoryItem: { sku: v.sku, tracked: false } };
        if (colorImg[v.color]) o.file = { originalSource: colorImg[v.color], contentType: 'IMAGE' };
        return o;
      });

      const input = { title, descriptionHtml: html, vendor: 'LuxeStyle', productType: d.categoryName || 'Mode',
        status: sicherheit.status, tags: sicherheit.tags, productOptions, files, variants };
      const cm = await shopify(
        `mutation($in:ProductSetInput!){productSet(synchronous:true,input:$in){product{id media(first:30){nodes{status}}}userErrors{message}}}`,
        { in: input }).catch(e => ({ error: e.message }));
      const prod = cm?.productSet?.product;
      if (!prod?.id) { console.log(`  skip ${baseSku}: ${cm?.error || JSON.stringify(cm?.productSet?.userErrors)}`); continue; }

      // Media-Falle bleibt sichtbar; der Import bleibt unabhaengig davon DRAFT.
      const finalStatus = sicherheit.status;
      const failed = (prod.media?.nodes || []).some(m => m.status === 'FAILED');
      done.push({ title: title.slice(0, 50), sku: baseSku, status: finalStatus, mediaFailed: failed, variants: variants.length, images: files.length });
      console.log(`  DRAFT: ${title.slice(0, 48)} | ${variants.length} Var | ${files.length} Bilder | ${sicherheit.sperrTags.join(', ')} | SKU ${baseSku}`);
    }
  }

  console.log(`\nAutopilot fertig: ${done.length} gesperrte DRAFT-Produkte; keine Kanalpublikation.`);
  if (done.length) console.log(JSON.stringify(done, null, 2));
})().catch(e => { console.error('Autopilot UNKNOWN/abgebrochen:', e.message); process.exitCode = 2; });
