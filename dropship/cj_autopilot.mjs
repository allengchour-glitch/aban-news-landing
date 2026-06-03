#!/usr/bin/env node
/**
 * CJ-Autopilot — täglicher autonomer Sourcing-Lauf (für GitHub Actions / Cron)
 * ---------------------------------------------------------------------------
 * Läuft OHNE Claude-Session. Macht die schwere, fehleranfällige Arbeit autonom:
 *   1. CJ-Keyword-Suche (rotierend nach Tag) + Relevanzfilter
 *   2. Detail-Anreicherung (echte variantSku, Kost, Bilder)
 *   3. Bild-URLs per HTTP-200 verifizieren (nur funktionierende übernehmen)
 *   4. Hartfilter (off-theme, Möbel, Kleidung, Risiko — siehe AUTONOMER-MODUS.md §5)
 *   5. Dedupe gegen bestehende Shopify-Produkte (per SKU)
 *   6. Anlegen als **DRAFT** (Shopify Admin GraphQL) mit echter SKU, Preis, verifizierten Bildern,
 *      Tags ['cj-real','autopilot','autopilot-needs-copy']
 *
 * Bewusst NICHT automatisch: finale deutsche Verkaufs-Copy + ACTIVE-Schaltung + Publizieren.
 * Das macht eine Claude-Session (liest dropship/AUTONOMER-MODUS.md): Draft veredeln → ACTIVE →
 * publishablePublish in 6 Kanäle. So füllt sich die Pipeline täglich von selbst, ohne dass je
 * ein schlecht getextetes oder kaputtes Produkt live geht.
 *
 * Secrets (NUR aus der Umgebung — niemals im Repo):
 *   CJ_EMAIL, CJ_API_KEY                — CJ Developer API
 *   SHOPIFY_SHOP                        — z.B. luxestyle.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN                 — Admin API Access Token (shpat_…), Scope: write_products
 * Optional: AUTOPILOT_MAX (Default 2)   — wie viele Drafts pro Lauf
 *
 * Fehlt ein Secret → sauberer No-Op (exit 0), nichts passiert. Keine Secrets im Log.
 */
import https from 'node:https';

const { CJ_EMAIL, CJ_API_KEY, SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN } = process.env;
const MAX = Number(process.env.AUTOPILOT_MAX || 2);
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const API_VER = '2024-10';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!CJ_EMAIL || !CJ_API_KEY || !SHOPIFY_SHOP || !SHOPIFY_ADMIN_TOKEN) {
  console.log('No-Op: Secrets fehlen (CJ_EMAIL/CJ_API_KEY/SHOPIFY_SHOP/SHOPIFY_ADMIN_TOKEN). Nichts zu tun.');
  process.exit(0);
}

// ── Keyword-Pool (rotiert nach Tag-des-Jahres; Dedupe per SKU macht Wiederholungen harmlos) ──
const POOL = [
  ['vegetable chopper', ['chopper']], ['knife sharpener', ['sharpener']], ['milk frother', ['frother']],
  ['silicone baking', ['baking']], ['kitchen scale', ['scale']], ['dish drying mat', ['mat']],
  ['cutting board', ['cutting']], ['measuring cup', ['measuring']], ['garlic press', ['garlic']],
  ['portable blender', ['blender']], ['water bottle insulated', ['bottle']], ['thermos cup', ['cup']],
  ['neck fan', ['fan']], ['cooling towel', ['towel']], ['humidifier', ['humidifier']],
  ['led night light', ['light']], ['wall lamp rechargeable', ['lamp']], ['reading magnifier', ['magnif']],
  ['dog cooling mat', ['cooling']], ['pet grooming', ['grooming']], ['dog toy', ['toy']],
  ['cat fountain', ['fountain']], ['travel organizer', ['organizer']], ['toiletry bag', ['bag']],
  ['packing cubes', ['packing']], ['phone holder car', ['holder']], ['bike light', ['light']],
  ['posture corrector', ['posture']], ['eye massager', ['massager']], ['foot file', ['file']],
  ['makeup mirror led', ['mirror']], ['hair clip', ['clip']], ['jade roller', ['roller']],
  ['picnic blanket', ['picnic']], ['beach towel', ['towel']], ['solar light garden', ['solar']],
  ['camping lantern', ['lantern']], ['hammock', ['hammock']], ['cooler bag', ['cooler']],
];

// ── kleiner HTTPS-JSON/Text-Helfer (kein npm nötig) ──
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
  try { const r = await req('HEAD', url); return r.status >= 200 && r.status < 300; }
  catch { return false; }
}
async function shopify(query, variables) {
  const r = await req('POST', `https://${SHOPIFY_SHOP}/admin/api/${API_VER}/graphql.json`,
    { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' },
    { query, variables });
  const j = JSON.parse(r.body);
  if (j.errors) throw new Error('Shopify: ' + JSON.stringify(j.errors).slice(0, 200));
  return j.data;
}

// ── Hartfilter (siehe AUTONOMER-MODUS.md §5) ──
const BAD = /disney|marvel|frozen|spider|hello kitty|pokemon|baby float|swim ring|swimming ring|hookah|shisha|snuff|tobacco|bunk bed|wardrobe|cabinet|sofa|treadmill|grill cart|grill table/i;
function priceCHF(usd) {
  const v = Number(usd) || 5;
  let chf = v * 2.8 * 0.88;            // Marge ×2,8, USD→CHF
  chf = Math.max(chf, 14.9);
  return (Math.floor(chf) + 0.9).toFixed(2);
}

(async () => {
  // getAccessToken ist POST:
  const ar = await req('POST', `${CJ_BASE}/authentication/getAccessToken`,
    { 'Content-Type': 'application/json' }, { email: CJ_EMAIL, apiKey: CJ_API_KEY });
  const aj = JSON.parse(ar.body);
  if (!aj.result) { console.log('CJ Auth fehlgeschlagen (Key prüfen/rotieren).'); process.exit(0); }
  const tok = aj.data.accessToken;

  // Keyword-Auswahl rotierend nach Tag
  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
  const picks = []; for (let i = 0; i < 12; i++) picks.push(POOL[(doy * 3 + i) % POOL.length]);

  const created = [];
  for (const [kw, must] of picks) {
    if (created.length >= MAX) break;
    let r; try { r = await cjGet('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw }, tok); }
    catch { continue; }
    await sleep(1600);
    const list = (r.data?.list || []).filter(p => {
      const n = (p.productNameEn || '').toLowerCase();
      return must.every(w => n.includes(w)) && !BAD.test(n);
    }).sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0));

    for (const p of list) {
      if (created.length >= MAX) break;
      // Dedupe: SKU schon im Shop?
      const sku = p.productSku;
      const dq = await shopify(`query($q:String!){products(first:1,query:$q){edges{node{id}}}}`,
        { q: `sku:${sku}` }).catch(() => null);
      if (dq?.products?.edges?.length) continue;

      // Detail für echte variantSku + Bilder
      let d; try { d = (await cjGet('/product/query', { pid: p.pid }, tok)).data; } catch { continue; }
      await sleep(1600);
      if (!d) continue;
      const variant = (d.variants || [])[0] || {};
      const realSku = variant.variantSku || d.productSku;
      const cost = Number(variant.variantSellPrice) || Number(d.sellPrice) || 5;
      const rawImgs = (d.productImageSet || []).slice(0, 8);
      const imgs = [];
      for (const u of rawImgs) { if (imgs.length >= 6) break; if (await imgOk(u)) imgs.push(u); }
      if (imgs.length < 3) continue;  // zu wenige valide Bilder → skip

      // Als DRAFT anlegen (Copy + ACTIVE macht die Claude-Session)
      const title = (d.productNameEn || kw).slice(0, 120);
      const desc = `<p><em>[Autopilot-Entwurf — deutsche Copy &amp; Preis prüfen, dann ACTIVE schalten + publizieren.]</em></p>`
        + `<p>${(d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)}</p>`;
      const cm = await shopify(
        `mutation($in:ProductInput!,$media:[CreateMediaInput!]){productCreate(input:$in,media:$media){product{id}userErrors{message}}}`,
        { in: {
            title, descriptionHtml: desc, vendor: 'LuxeStyle', status: 'DRAFT',
            productType: 'Autopilot', tags: ['cj-real', 'autopilot', 'autopilot-needs-copy'],
            productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
          },
          media: imgs.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })),
        }).catch(e => ({ error: e.message }));
      const pid = cm?.productCreate?.product?.id;
      if (!pid) { console.log(`  skip ${realSku}: ${cm?.error || JSON.stringify(cm?.productCreate?.userErrors)}`); continue; }

      // Variante: SKU + Preis setzen
      const vid = (await shopify(`query($id:ID!){product(id:$id){variants(first:1){edges{node{id}}}}}`,
        { id: pid })).product?.variants?.edges?.[0]?.node?.id;
      if (vid) {
        await shopify(
          `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}`,
          { pid, v: [{ id: vid, price: priceCHF(cost), inventoryItem: { tracked: false },
                       optionValues: [{ optionName: 'Title', name: 'Default Title' }] }] }).catch(() => {});
        // SKU getrennt setzen (manche Shops verlangen inventoryItem.sku)
        await shopify(
          `mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}`,
          { pid, v: [{ id: vid, inventoryItem: { sku: realSku, tracked: false } }] }).catch(() => {});
      }
      created.push({ title: title.slice(0, 50), sku: realSku, costUsd: cost, vkCHF: priceCHF(cost), pid });
      console.log(`  ✔ DRAFT angelegt: ${title.slice(0, 48)} | SKU ${realSku} | ~CHF ${priceCHF(cost)} | ${imgs.length} Bilder`);
    }
  }

  console.log(`\nAutopilot fertig: ${created.length} Draft(s) angelegt (Tag 'autopilot-needs-copy').`);
  console.log('Nächster Schritt (Claude-Session): Copy veredeln → ACTIVE → in 6 Kanäle publizieren.');
  if (created.length) console.log(JSON.stringify(created, null, 2));
})().catch(e => { console.error('Autopilot-Fehler:', e.message); process.exit(0); });
