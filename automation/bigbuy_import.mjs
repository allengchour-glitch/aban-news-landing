#!/usr/bin/env node
/* LuxeStyle — bigbuy_import.mjs  (NEUE Lieferantenfirma BigBuy → nur TOP-Produkte importieren)
 *
 * Holt aus dem BigBuy-Katalog (EU-Lager, DDP-fähig) kuratierte TOP-Produkte für on-brand Kategorien
 * (Schmuck/Taschen/Uhren/Sonnenbrillen/Damenmode), prüft Bilder (HTTP-200), legt sie sauber als Shopify-
 * Produkte an (ACTIVE, DE-Titel via Gemini, gesunde CHF-Marge, Tags+SEO), publiziert in alle Kanäle und
 * sortiert sie in Smart-Collections. Idempotent (Ledger). No-op ohne Creds. DRY_RUN ist DEFAULT.
 *
 * ── Status: Shopify-Seite = bewährt (1:1 aus cj_gaps_import.mjs). BigBuy-Seite = nach offizieller REST-Doku
 *    (base api.bigbuy.eu / Sandbox api.sandbox.bigbuy.eu, Bearer-Auth). Feld-/Pfadnamen mit ⚠️BB-VERIFY
 *    markiert → beim ERSTEN Lauf mit Sandbox-Key (BIGBUY_ENV=sandbox, DRY_RUN=1) gegen echte Antwort prüfen.
 *
 * DRY_RUN=1 (Default) → nur suchen + Kandidaten listen (nichts in Shopify anlegen).
 * ENV: BIGBUY_API_KEY · [BIGBUY_ENV=sandbox|prod] (Default sandbox) ·
 *      SHOPIFY_CLIENT_ID/SECRET (o. SHOPIFY_ADMIN_TOKEN), SHOPIFY_SHOP · [GEMINI_API_KEY] ·
 *      [CATS=schmuck,taschen,uhren] · [PER=4] · [MARGIN=2.6] · [MIN_STOCK=5] · [MAX_COST_EUR=40] · [LIVE=1]
 */
import fs from 'node:fs';

const BB_KEY = (process.env.BIGBUY_API_KEY || '').trim();
const BB_BASE = (process.env.BIGBUY_ENV || 'sandbox').toLowerCase() === 'prod'
  ? 'https://api.bigbuy.eu' : 'https://api.sandbox.bigbuy.eu';
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const LEDGER = 'dropship/bigbuy_done.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PER = Math.max(1, parseInt(process.env.PER || '4', 10) || 4);
const MARGIN = parseFloat(process.env.MARGIN || '2.6') || 2.6;     // EU-Einkauf ist teurer als CJ → kleinere Marge reicht
const EUR_CHF = 0.96;
const MIN_STOCK = parseInt(process.env.MIN_STOCK || '5', 10) || 5;  // TOP = lieferbar
const MAX_COST_EUR = parseFloat(process.env.MAX_COST_EUR || '40') || 40;
// DRY ist DEFAULT (Sicherheit). Nur mit LIVE=1 wird wirklich in Shopify angelegt.
const DRY = process.env.LIVE !== '1';
const CATS = (process.env.CATS || 'schmuck,taschen,uhren,sonnenbrillen').split(',').map(s => s.trim()).filter(Boolean);

/* On-brand TOP-Kategorien. `cat` = BigBuy-Taxonomie/Such-Anker (Name-Match, DE/EN), wie bei CJ.
 * `bbCategoryIds` (optional) = exakte BigBuy-Kategorie-IDs, falls bekannt → präziser als Name-Match.
 * ⚠️BB-VERIFY: echte Kategorie-IDs via `GET /rest/catalog/categories.json?isoCode=de` einsetzen. */
const CONFIG = {
  schmuck: { coll: { handle: 'premium-schmuck', title: '💎 Premium Schmuck', tag: 'schmuck' },
    extraTags: ['damen', 'geschenk', 'premium'], type: 'Schmuck', maxCost: MAX_COST_EUR, bbCategoryIds: [],
    anchor: ['jewel', 'necklace', 'bracelet', 'earring', 'ring', 'schmuck', 'kette', 'armband', 'ohrring', 'pendant', 'collar', 'pulsera', 'anillo'],
    ban: ['toy', 'kids', 'child', 'sticker'],
    bullets: ['Edles Design für jeden Anlass', 'Hochwertige Verarbeitung', 'Schöne Geschenkidee', 'Hautfreundliche Materialien'] },
  taschen: { coll: { handle: 'sub-taschen', title: '👜 Taschen', tag: 'tasche' },
    extraTags: ['damen', 'accessoire', 'premium'], type: 'Taschen', maxCost: MAX_COST_EUR, bbCategoryIds: [],
    anchor: ['bag', 'handbag', 'tote', 'crossbody', 'shoulder bag', 'tasche', 'handtasche', 'bolso', 'clutch'],
    ban: ['trash', 'vacuum', 'tool bag', 'sleeping bag'],
    bullets: ['Vielseitig kombinierbar', 'Hochwertiges Material', 'Durchdachte Fächer', 'Eleganter Begleiter für jeden Tag'] },
  uhren: { coll: { handle: 'uhren', title: '⌚ Uhren', tag: 'uhren' },
    extraTags: ['accessoire', 'geschenk', 'premium'], type: 'Uhren', maxCost: MAX_COST_EUR, bbCategoryIds: [],
    anchor: ['watch', 'uhr', 'reloj', 'timepiece', 'wristwatch'],
    ban: ['smart band cheap', 'kids watch', 'toy'],
    bullets: ['Zeitloses Design', 'Präzises Uhrwerk', 'Edles Geschenk', 'Für Business & Freizeit'] },
  sonnenbrillen: { coll: { handle: 'sonnenbrillen-eyewear', title: '🕶️ Sonnenbrillen', tag: 'sonnenbrille' },
    extraTags: ['accessoire', 'sommer', 'damen'], type: 'Sonnenbrillen', maxCost: MAX_COST_EUR, bbCategoryIds: [],
    anchor: ['sunglass', 'sonnenbrille', 'gafas de sol', 'eyewear', 'shades'],
    ban: ['reading glasses', 'safety glasses', 'kids'],
    bullets: ['UV-Schutz', 'Trendiges Design', 'Leichter Tragekomfort', 'Inkl. Etui'] },
  damenmode: { coll: { handle: 'damen-mode', title: '👗 Damen-Mode', tag: 'damen' },
    extraTags: ['sommer-2026', 'kleid', 'premium'], type: 'Damenmode', maxCost: MAX_COST_EUR, bbCategoryIds: [],
    anchor: ['dress', 'blouse', 'skirt', 'kleid', 'bluse', 'rock', 'vestido', 'top women'],
    ban: ['men ', 'herren', 'kids', 'baby'],
    bullets: ['Femininer Schnitt', 'Angenehmer Stoff', 'Vielseitig kombinierbar', 'Premium-Look zum fairen Preis'] },
};

// ── Shopify (1:1 aus cj_gaps_import.mjs, bewährt) ──
async function sgql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── BigBuy REST (Bearer-Auth, JSON). ⚠️BB-VERIFY Pfade/Felder mit Sandbox abgleichen ──
async function bbGet(path, params) {
  const qs = params ? ('?' + new URLSearchParams(params).toString()) : '';
  for (let a = 0; a < 4; a++) {
    const r = await fetch(`${BB_BASE}${path}${qs}`, { headers: { 'Authorization': `Bearer ${BB_KEY}`, 'Accept': 'application/json' } });
    if (r.status === 429) { await sleep((a + 1) * 2500); continue; } // BigBuy Rate-Limit
    if (!r.ok) { console.log(`  ⚠️ BigBuy ${path} → HTTP ${r.status}`); return null; }
    return r.json().catch(() => null);
  }
  return null;
}
// Katalog-Liste (leichtgewichtig): id, sku, Preise, Kategorie. ⚠️BB-VERIFY Feldnamen
async function bbProducts(isoCode = 'de') { return (await bbGet('/rest/catalog/products.json', { isoCode })) || []; }
// Namen/Beschreibungen je Sprache. ⚠️BB-VERIFY: /rest/catalog/productsinformation.json
async function bbInfo(isoCode = 'de') { return (await bbGet('/rest/catalog/productsinformation.json', { isoCode })) || []; }
// Bilder je Produkt (einzeln, nur für die Picks → spart Last). ⚠️BB-VERIFY: /rest/catalog/productimages/{id}.json
async function bbImages(id) { const d = await bbGet(`/rest/catalog/productimages/${id}.json`); return d || null; }
async function img200(u) { try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) return true; const g = await fetch(u); return g.ok; } catch { return false; } }

// ── Gemini Batch-Übersetzung → knackiger DE-Titel (1:1 aus Vorlage) ──
async function titlesDE(names) {
  if (!GKEY || !names.length) return names;
  const prompt = `Mach aus diesen Produktnamen je einen knackigen, verkaufsstarken DEUTSCHEN Shop-Titel `
    + `(max 60 Zeichen, kein Marken-/Wholesale-Wort, mit kurzem Nutzen). Gib NUR ein JSON-Array gleicher Reihenfolge zurück.\n` + JSON.stringify(names);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GKEY)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const j = await r.json().catch(() => ({}));
    let t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(t);
    if (Array.isArray(arr) && arr.length === names.length) return arr.map((s, i) => (s && String(s).trim().slice(0, 70)) || names[i]);
  } catch (e) { console.error('  Titel-Übersetzung fehlgeschlagen:', e.message); }
  return names;
}

const chf = (eur) => { let p = Math.max(9.9, eur * EUR_CHF * MARGIN); return (Math.ceil(p) - 0.1).toFixed(2); };

// Felder defensiv lesen (BigBuy-Antworten variieren je Endpoint/Version) ⚠️BB-VERIFY
const f = (o, ...keys) => { for (const k of keys) { if (o && o[k] != null) return o[k]; } return undefined; };
const costOf = (p) => Number(f(p, 'wholesalePrice', 'price', 'cost')) || 0;
const stockOf = (p) => Number(f(p, 'stock', 'quantity')) || 0;
const idOf = (p) => f(p, 'id', 'productId', 'sku');

if (!BB_KEY) { console.log('Kein BIGBUY_API_KEY → No-op (Connector startklar, wartet auf Key).'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

const SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const PUBQ = `{ publications(first:20){ edges{ node{ id } } } }`;
const PUB = `mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ message } } }`;
const COLL_FIND = `query($q:String!){ collections(first:1, query:$q){ edges{ node{ id handle } } } }`;
const COLL_CREATE = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ message } } }`;

(async () => {
  console.log(`BigBuy-Import [${BB_BASE.includes('sandbox') ? 'SANDBOX' : 'PROD'}]${DRY ? ' [DRY — nichts wird angelegt; LIVE=1 zum Anlegen]' : ' [LIVE]'}`);
  const stok = await sToken(); if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op.'); process.exit(0); }

  // Katalog einmal laden (Liste + Infos), dann je Kategorie filtern + ranken.
  const products = await bbProducts('de');
  if (!Array.isArray(products) || !products.length) {
    console.log('⚠️ BigBuy lieferte keine Produktliste. Bei Sandbox-Key zuerst Endpoint/Feldnamen prüfen (⚠️BB-VERIFY).');
    process.exit(0);
  }
  const info = await bbInfo('de');
  const nameById = new Map();
  for (const it of (Array.isArray(info) ? info : [])) {
    const id = f(it, 'id', 'productId', 'sku');
    const nm = f(it, 'name', 'title');
    if (id != null && nm) nameById.set(String(id), { name: nm, desc: f(it, 'description', 'descriptionHtml') || '' });
  }
  console.log(`Katalog: ${products.length} Produkte, ${nameById.size} mit DE-Namen.`);

  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
  const pubs = DRY ? [] : ((await sgql(stok, PUBQ))?.data?.publications?.edges || []).map(e => ({ publicationId: e.node.id }));

  async function ensureColl(cfg) {
    if (DRY) return null;
    const ex = (await sgql(stok, COLL_FIND, { q: `handle:${cfg.coll.handle}` }))?.data?.collections?.edges?.[0]?.node;
    if (ex) return ex.id;
    const r = await sgql(stok, COLL_CREATE, { input: { handle: cfg.coll.handle, title: cfg.coll.title,
      descriptionHtml: `<p>${cfg.coll.title} – kuratierte Auswahl für die Schweiz. Gratis-Versand ab CHF 65.</p>`,
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: cfg.coll.tag }] } } });
    return r?.data?.collectionCreate?.collection?.id;
  }

  let created = 0, fails = [];
  for (const cat of CATS) {
    const cfg = CONFIG[cat]; if (!cfg) { console.log(`Unbekannte Kategorie ${cat}`); continue; }
    console.log(`\n=== ${cat.toUpperCase()} (${cfg.coll.title}) ===`);
    // 1) Kandidaten: on-brand Name-Match (oder exakte bbCategoryIds, falls gesetzt) + Ban-Filter
    const cand = products.filter(p => {
      const id = idOf(p); if (id == null) return false;
      if (cfg.bbCategoryIds?.length) { const c = f(p, 'category', 'categoryId'); if (!cfg.bbCategoryIds.includes(Number(c))) return false; }
      const nm = (nameById.get(String(id))?.name || f(p, 'name') || '').toLowerCase();
      if (!nm) return false;
      return cfg.anchor.some(a => nm.includes(a)) && !(cfg.ban || []).some(x => nm.includes(x));
    });
    // 2) TOP-Ranking: lieferbar (Stock) + Preis im Rahmen, sortiert nach Stock (Proxy für Gängigkeit)
    const ranked = cand
      .filter(p => stockOf(p) >= MIN_STOCK && costOf(p) > 0 && costOf(p) <= cfg.maxCost)
      .sort((a, b) => stockOf(b) - stockOf(a));
    console.log(`  ${cand.length} on-brand, ${ranked.length} TOP-fähig (Stock≥${MIN_STOCK}, ≤€${cfg.maxCost}).`);

    // 3) Bilder prüfen, Picks bilden
    const picks = [];
    for (const p of ranked) {
      if (picks.length >= PER) break;
      const id = String(idOf(p));
      if (done.has('bb:' + id)) continue;
      const imgD = await bbImages(id); await sleep(800);
      // ⚠️BB-VERIFY: Bild-URLs liegen je nach Antwort unter images[].url / .urls / direkt als Array
      let urls = [];
      if (Array.isArray(imgD)) urls = imgD.map(x => f(x, 'url', 'src')).filter(Boolean);
      else if (imgD && Array.isArray(imgD.images)) urls = imgD.images.map(x => f(x, 'url', 'src')).filter(Boolean);
      const good = [];
      for (const u of urls.slice(0, 8)) { if (await img200(u)) good.push(u); if (good.length >= 6) break; }
      if (good.length < 2) continue;
      picks.push({ id, sku: f(p, 'sku') || id, nameEn: nameById.get(id)?.name || f(p, 'name') || ('BigBuy ' + id), cost: costOf(p), imgs: good });
      console.log(`  Kandidat: €${costOf(p)} ${good.length}img · ${(nameById.get(id)?.name || '').slice(0, 55)}`);
    }
    if (!picks.length) { console.log('  (keine geeigneten TOP-Kandidaten)'); continue; }
    if (DRY) { picks.forEach(p => console.log(`  [DRY] würde anlegen: ${p.nameEn.slice(0, 55)} → CHF ${chf(p.cost)}`)); continue; }

    // 4) Anlegen (DE-Titel + SEO + Tags + Bilder, 6 Kanäle)
    const titles = await titlesDE(picks.map(p => p.nameEn));
    await ensureColl(cfg);
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const title = (titles[i] || p.nameEn).replace(/["<>]/g, '').trim();
      const price = chf(p.cost);
      const handle = (title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 60) || ('bigbuy-' + p.id);
      const tags = [cfg.coll.tag, ...cfg.extraTags, 'bigbuy', 'dropship'];
      const desc = `<p><strong>${title}</strong></p><ul>${cfg.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
        + `<p>📦 Lieferung aus EU-Lager, schnell · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>`;
      const input = { title, handle, productType: cfg.type, vendor: 'LuxeStyle', status: 'ACTIVE', tags,
        descriptionHtml: desc, seo: { title: `${title} | LuxeStyle`, description: `${title} – Premium-Qualität, schnelle EU-Lieferung, Gratis-Versand ab CHF 65.` },
        variants: [{ price, inventoryItem: { sku: `BB-${p.sku}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }],
        files: p.imgs.map(u => ({ originalSource: u, contentType: 'IMAGE' })) };
      const r = await sgql(stok, SET, { input }); const e = r?.data?.productSet?.userErrors || [];
      const pid = r?.data?.productSet?.product?.id;
      if (e.length || !pid) { fails.push(`${title.slice(0, 40)}: ${JSON.stringify(e.length ? e : r).slice(0, 160)}`); continue; }
      if (pubs.length) await sgql(stok, PUB, { id: pid, pubs });
      fs.appendFileSync(LEDGER, 'bb:' + p.id + '\n');
      created++; console.log(`  ✅ ${title.slice(0, 50)} → CHF ${price} (${handle})`);
      await sleep(400);
    }
  }
  if (fails.length) fails.slice(0, 15).forEach(x => console.error('✗', x));
  console.log(`\nFertig: ${created} Produkt(e) angelegt${DRY ? ' [DRY]' : ''}${fails.length ? `, ${fails.length} Fehler` : ''}.`);
  process.exit(0);
})();
