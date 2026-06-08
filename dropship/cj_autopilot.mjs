#!/usr/bin/env node
/**
 * CJ-Autopilot (VOLL-AUTO) — autonomer Sourcing- & Live-Lauf für GitHub Actions / Cron.
 * ----------------------------------------------------------------------------------
 * Läuft OHNE Claude-Session. Pro Lauf:
 *   1. CJ-Keyword-Suche (rotierend nach Tag) + Relevanzfilter + Hartfilter (§5)
 *   2. Dedupe gegen bestehende Shopify-Produkte (per SKU)
 *   3. Detail-Anreicherung (echte variantSku, Kost, Bilder, Varianten)
 *   4. Bild-URLs per HTTP-200 verifizieren (nur funktionierende übernehmen)
 *   5. Varianten bauen (Farbe×Grösse + Farbbild je Variante) → Shopify `productSet`
 *   6. **Gemini-Gate (optional):** deutsche Verkaufs-Copy + Qualitäts-Urteil.
 *        • Gemini PASS  → Produkt **ACTIVE** + publishablePublish in alle 6 Kanäle
 *        • Gemini FAIL / kein Key → **DRAFT** (Tag `autopilot-needs-copy`), nichts geht ungeprüft live
 *
 * Secrets (NUR aus der Umgebung — niemals im Repo):
 *   CJ_EMAIL, CJ_API_KEY                — CJ Developer API
 *   SHOPIFY_SHOP                        — z.B. au3j0y-hq.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN                 — Admin API Token (shpat_…/shpca_…), Scope: write_products, write_publications
 * Optional:
 *   GEMINI_API_KEY                      — generativelanguage-Key → DE-Copy + QA + ACTIVE-Schaltung
 *   AUTOPILOT_MAX (Default 6)           — wie viele Produkte pro Lauf
 *   AUTOPILOT_STATUS (ACTIVE|DRAFT)     — Ziel-Status bei Gemini-PASS (Default ACTIVE)
 *
 * Fehlt ein Pflicht-Secret → sauberer No-Op (exit 0). Keine Secrets im Log.
 */
import https from 'node:https';

const { CJ_EMAIL, CJ_API_KEY, SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, GEMINI_API_KEY } = process.env;
let SHOP_TOKEN = SHOPIFY_ADMIN_TOKEN || '';  // wird ggf. per Client-Credentials befüllt
const MAX = Number(process.env.AUTOPILOT_MAX || 6);
const TARGET_STATUS = (process.env.AUTOPILOT_STATUS || 'ACTIVE').toUpperCase() === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const API_VER = '2024-10';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 6 Publication-IDs (alle Verkaufskanäle von LuxeStyle, siehe AUTONOMER-MODUS.md §2)
const PUBLICATIONS = [
  '301970915713', '301971014017', '302032716161', '302566834561', '302872297857', '302994456961',
].map(id => ({ publicationId: `gid://shopify/Publication/${id}` }));

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', 'XXXL'];

if (!CJ_EMAIL || !CJ_API_KEY || !SHOPIFY_SHOP || !(SHOPIFY_ADMIN_TOKEN || (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET))) {
  console.log('No-Op: Secrets fehlen (CJ_EMAIL/CJ_API_KEY/SHOPIFY_SHOP + SHOPIFY_ADMIN_TOKEN ODER SHOPIFY_CLIENT_ID/SECRET).');
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
  for (let a = 0; a < 4; a++) {
    const r = await req('GET', `${CJ_BASE}${path}?${qs}`, tok ? { 'CJ-Access-Token': tok } : {});
    const j = JSON.parse(r.body);
    if (j.code === 1600200 || /Too Many|QPS/i.test(j.message || '')) { await sleep((a + 1) * 2500); continue; }
    return j;
  }
  throw new Error('CJ rate limit: ' + path);
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
    try { const t = JSON.parse(r.body).access_token; if (t) { SHOP_TOKEN = t; return SHOP_TOKEN; } } catch {}
  }
  return SHOP_TOKEN; // statischer Token als Fallback
}
async function shopify(query, variables) {
  const r = await req('POST', `https://${SHOPIFY_SHOP}/admin/api/${API_VER}/graphql.json`,
    { 'X-Shopify-Access-Token': SHOP_TOKEN, 'Content-Type': 'application/json' },
    { query, variables });
  const j = JSON.parse(r.body);
  if (j.errors) throw new Error('Shopify: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data;
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
  const ar = await req('POST', `${CJ_BASE}/authentication/getAccessToken`,
    { 'Content-Type': 'application/json' }, { email: CJ_EMAIL, apiKey: CJ_API_KEY });
  const aj = JSON.parse(ar.body);
  if (!aj.result) { console.log('CJ Auth fehlgeschlagen (Key prüfen/rotieren).'); process.exit(0); }
  const tok = aj.data.accessToken;
  console.log(`Autopilot VOLL-AUTO · Ziel-Status bei QA-PASS: ${TARGET_STATUS} · Gemini: ${GEMINI_API_KEY ? 'AN' : 'aus (→ DRAFT)'} · MAX ${MAX}`);
  await ensureShopToken();
  if (!SHOP_TOKEN) { console.log('Shopify-Auth fehlgeschlagen (SHOPIFY_ADMIN_TOKEN oder CLIENT_ID/SECRET prüfen).'); process.exit(0); }

  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
  const picks = []; for (let i = 0; i < 14; i++) picks.push(POOL[(doy * 3 + i) % POOL.length]);

  const done = [];
  for (const [kw, must] of picks) {
    if (done.length >= MAX) break;
    let r; try { r = await cjGet('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw }, tok); } catch { continue; }
    await sleep(1600);
    const list = (r.data?.list || []).filter(p => {
      const n = (p.productNameEn || '').toLowerCase();
      return must.every(w => n.includes(w)) && !BAD.test(n);
    }).sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0));

    for (const p of list) {
      if (done.length >= MAX) break;
      const baseSku = p.productSku;
      const dq = await shopify(`query($q:String!){products(first:1,query:$q){edges{node{id}}}}`, { q: `sku:${baseSku}` }).catch(() => null);
      if (dq?.products?.edges?.length) continue; // Dedupe

      let d; try { d = (await cjGet('/product/query', { pid: p.pid }, tok)).data; } catch { continue; }
      await sleep(1600);
      if (!d) continue;
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
      const status = (g && g.verdict === 'pass') ? TARGET_STATUS : 'DRAFT';
      const title = (g?.title_de || name).slice(0, 120);
      const sizeHint = hasSize ? 'Grössen-Hinweis: asiatische Grössen – bitte 1 Nr. grösser wählen. ' : '';
      const html = (g?.html_de
        || `<p><strong>${name.slice(0, 90)}</strong></p><ul><li>✨ Premium-Qualität</li><li>🎨 Mehrere Varianten</li><li>💝 Tolles Geschenk</li><li>🚚 Schneller CH-Versand</li></ul>`)
        + `<p><em>${sizeHint}Versand: ca. 7–14 Tage. 🇨🇭 Gratis-Versand ab CHF 65 · WELCOME10 –10%.</em></p>`;
      const tags = ['cj-real', 'neu', 'dropship', 'autopilot'].concat(status === 'DRAFT' ? ['autopilot-needs-copy'] : []);

      const variants = vars.map(v => {
        const o = { optionValues: mkOV(v), price: priceCHF(v.cost || d.sellPrice), inventoryItem: { sku: v.sku, tracked: false } };
        if (colorImg[v.color]) o.file = { originalSource: colorImg[v.color], contentType: 'IMAGE' };
        return o;
      });

      const input = { title, descriptionHtml: html, vendor: 'LuxeStyle', productType: d.categoryName || 'Mode',
        status, tags, productOptions, files, variants };
      const cm = await shopify(
        `mutation($in:ProductSetInput!){productSet(synchronous:true,input:$in){product{id media(first:30){nodes{status}}}userErrors{message}}}`,
        { in: input }).catch(e => ({ error: e.message }));
      const prod = cm?.productSet?.product;
      if (!prod?.id) { console.log(`  skip ${baseSku}: ${cm?.error || JSON.stringify(cm?.productSet?.userErrors)}`); continue; }

      // Media-Falle: FAILED → auf DRAFT zurückstufen (nichts Kaputtes live)
      let finalStatus = status;
      const failed = (prod.media?.nodes || []).some(m => m.status === 'FAILED');
      if (failed && finalStatus === 'ACTIVE') {
        await shopify(`mutation($id:ID!){productUpdate(input:{id:$id,status:DRAFT}){userErrors{message}}}`, { id: prod.id }).catch(() => {});
        finalStatus = 'DRAFT';
      }
      // Publizieren wenn ACTIVE
      if (finalStatus === 'ACTIVE') {
        await shopify(`mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in){userErrors{message}}}`,
          { id: prod.id, in: PUBLICATIONS }).catch(() => {});
      }
      done.push({ title: title.slice(0, 50), sku: baseSku, status: finalStatus, variants: variants.length, images: files.length });
      console.log(`  ✔ ${finalStatus}: ${title.slice(0, 48)} | ${variants.length} Var | ${files.length} Bilder | SKU ${baseSku}`);
    }
  }

  const active = done.filter(d => d.status === 'ACTIVE').length;
  console.log(`\nAutopilot fertig: ${done.length} Produkt(e) (${active} ACTIVE+publiziert, ${done.length - active} DRAFT).`);
  if (done.length) console.log(JSON.stringify(done, null, 2));
})().catch(e => { console.error('Autopilot-Fehler:', e.message); process.exit(0); });
