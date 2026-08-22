#!/usr/bin/env node
/* LuxeStyle — cj_gaps_import.mjs  (Marktlücken füllen: Grill/BBQ + Auto/Handy aus CJ)
 *
 * Sucht bei CJ passende Produkte zu den Katalog-Lücken, prüft Bilder (HTTP-200), legt sie sauber als
 * Shopify-Produkte an (ACTIVE, DE-Titel via Gemini, gesunde CHF-Marge, Tags+SEO), publiziert in alle
 * Kanäle und sortiert sie in Smart-Collections. Idempotent (Ledger). No-op ohne Creds.
 *
 * DRY_RUN=1 → nur suchen + Kandidaten listen (nichts anlegen).
 * ENV: CJ_EMAIL, CJ_API_KEY · SHOPIFY_CLIENT_ID/SECRET (o. ADMIN_TOKEN), SHOPIFY_SHOP · [GEMINI_API_KEY]
 *      [CATS=grill,auto] · [PER=4] (pro Kategorie) · [MARGIN=3.2] · [DRY_RUN=1]
 */
import fs from 'node:fs';
import { chf as preisBasis, kosten, gewicht } from './cj_preis.mjs';

const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_FILE = '/tmp/cj_token.json';
const LEDGER = 'dropship/cj_gaps_done.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PER = Math.max(1, parseInt(process.env.PER || '4', 10) || 4);
const MARGIN = parseFloat(process.env.MARGIN || '3.2') || 3.2;
const USD_CHF = 0.90;
const DRY = process.env.DRY_RUN === '1';
const CATS = (process.env.CATS || 'grill,auto').split(',').map(s => s.trim()).filter(Boolean);

// Kategorie-Konfig: Suchbegriffe (EN, für CJ), Pflichtwort, Collection, Tags, DE-Beschreibungsbausteine.
const CONFIG = {
  grill: {
    coll: { handle: 'grill-bbq', title: '☀️ Grill & BBQ', tag: 'grill-bbq' },
    extraTags: ['sommer', 'kueche', 'outdoor'], type: 'Grill-Zubehör', maxCost: 16,
    anchor: ['bbq', 'grill', 'barbecue'],   // Produktname MUSS eins davon enthalten
    terms: [
      { kw: 'bbq tool set stainless steel' },
      { kw: 'grill thermometer digital instant read' },
      { kw: 'bbq grill mat non stick reusable' },
      { kw: 'silicone bbq basting brush' },
      { kw: 'stainless steel bbq skewers reusable' },
      { kw: 'bbq grill cleaning brush' },
      { kw: 'bbq grill gloves heat resistant' },
      { kw: 'grill basket stainless steel bbq' },
      { kw: 'bbq meat claws shredder' },
      { kw: 'bbq grilling apron tool' },
    ],
    bullets: ['Robuster Edelstahl, hitzebeständig', 'Perfekt für Grillabende & Garten', 'Leicht zu reinigen', 'Tolles Geschenk für Grillfans'],
  },
  auto: {
    coll: { handle: 'auto-handy', title: '🚗 Auto & Handy', tag: 'auto-handy' },
    extraTags: ['tech', 'gadget', 'auto'], type: 'Auto-Zubehör', maxCost: 11,
    anchor: ['car ', 'car-', 'auto', 'vehicle', 'dashboard', 'trunk', 'headrest', 'windshield'],
    terms: [
      { kw: 'car phone holder mount magnetic' },
      { kw: 'car trunk organizer foldable' },
      { kw: 'car seat gap filler organizer' },
      { kw: 'car dashboard phone mount' },
      { kw: 'car headrest hook backseat' },
      { kw: 'car windshield sun shade' },
      { kw: 'car cup holder expander' },
      { kw: 'car wireless charger mount' },
      { kw: 'car backseat organizer storage' },
      { kw: 'car interior cleaning gel' },
    ],
    bullets: ['Einfache Montage, sicherer Halt', 'Praktisch für jede Autofahrt', 'Hochwertige Verarbeitung', 'Ideal als Geschenk'],
  },
  reise: {
    coll: { handle: 'reise-accessoires', title: '🧳 Reise-Accessoires', tag: 'reise-acc' },
    extraTags: ['reise', 'accessoire', 'sommer'], type: 'Reise-Zubehör', maxCost: 12,
    anchor: ['travel', 'luggage', 'suitcase', 'passport', 'packing'],
    terms: [
      { kw: 'packing cubes travel set organizer' },
      { kw: 'travel toiletry bottles silicone set' },
      { kw: 'travel neck pillow memory foam' },
      { kw: 'passport holder cover travel' },
      { kw: 'luggage tag silicone travel' },
      { kw: 'travel cable organizer case' },
    ],
    bullets: ['Leicht &amp; platzsparend', 'Perfekt für jede Reise', 'Hochwertige Verarbeitung', 'Tolles Geschenk für Reisende'],
  },
  strand: {
    coll: { handle: 'strand-pool', title: '🏖️ Strand & Pool', tag: 'strand-pool' },
    extraTags: ['sommer', 'accessoire', 'outdoor'], type: 'Strand-Zubehör', maxCost: 13,
    anchor: ['beach', 'pool', 'swimming', 'waterproof', 'swim'],
    terms: [
      { kw: 'waterproof phone pouch beach' },
      { kw: 'beach bag large foldable' },
      { kw: 'microfiber beach towel quick dry' },
      { kw: 'swimming goggles anti fog' },
      { kw: 'beach blanket sand free waterproof' },
      { kw: 'waterproof dry bag swim' },
    ],
    bullets: ['Perfekt für Strand &amp; Pool', 'Wasserfest &amp; langlebig', 'Leicht &amp; faltbar', 'Sommer-Must-have'],
  },
  handy: {
    coll: { handle: 'handy-zubehoer', title: '📱 Handy-Zubehör', tag: 'handy-acc' },
    extraTags: ['tech', 'gadget', 'accessoire'], type: 'Handy-Zubehör', maxCost: 12,
    anchor: ['phone', 'charging', 'charger', 'cable', 'power bank', 'powerbank'],
    terms: [
      { kw: 'power bank 10000mah slim portable' },
      { kw: 'magnetic phone holder desk stand' },
      { kw: 'phone ring holder grip stand' },
      { kw: 'cable organizer clips management' },
      { kw: 'usb cable fast charging braided' },
      { kw: 'foldable phone stand holder desk' },
    ],
    bullets: ['Praktisch für jeden Tag', 'Hochwertige Verarbeitung', 'Kompakt &amp; leicht', 'Tolles Geschenk'],
  },
};
const BAD = ['wholesale', 'lot ', 'wig', 'nail', 'tattoo', 'sticker', 'sample', 'replacement part',
  'for iphone 6', 'sex', 'bracelet', 'ring', 'necklace', 'copper', 'massage', 'beauty', 'jewelry',
  'jewellery', 'earring', 'pendant', 'wallet', 'cowhide', 'leather bag', 'makeup', 'cosmetic',
  'watch', 'bikini', 'dress', 'shirt', 'shoe', 'sock',
  'ornament', 'freshener', 'perfume', 'puppy', 'plush', 'doll', 'figure', ' pet ', ' dog ', 'stairs', 'rug', 'cushion',
  'toy', 'kids', 'children', 'baby', 'kid '];
const MAX_COST = 9;   // USD-Deckel → CHF ~26 (Impulskauf), filtert teure Fehlgriffe
const MIN_LISTED = parseInt(process.env.MIN_LISTED || '0', 10) || 0; // Popularität (CJ liefert Feld oft nicht → Default 0)

// ── Shopify ──
async function sgql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── CJ ──
async function cjToken() {
  try { if (fs.existsSync(TOKEN_FILE)) { const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); if (t.exp > Date.now() + 60000) return t.accessToken; } } catch {}
  const r = await fetch(`${CJ_BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: CJ_EMAIL, apiKey: CJ_API_KEY }) });
  const j = await r.json().catch(() => ({}));
  if (!j.result || !j?.data?.accessToken) { console.log('⚠️ CJ-Auth fehlgeschlagen → No-op: ' + (j.message || '')); return null; }
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 })); } catch {}
  return j.data.accessToken;
}
async function cjGet(tok, path, params) {
  for (let a = 0; a < 4; a++) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${CJ_BASE}${path}?${qs}`, { headers: { 'CJ-Access-Token': tok } });
    const j = await r.json().catch(() => ({}));
    if (j.code === 1600200 || /Too Many|QPS/i.test(j.message || '')) { await sleep((a + 1) * 2500); continue; }
    return j;
  }
  return {};
}
async function img200(u) { try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) return true; const g = await fetch(u); return g.ok; } catch { return false; } }

// ── Gemini Batch-Übersetzung EN-Produktname → knackiger DE-Titel ──
async function titlesDE(names) {
  if (!GKEY || !names.length) return names;
  const prompt = `Mach aus diesen englischen Produktnamen je einen knackigen, verkaufsstarken DEUTSCHEN Shop-Titel `
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

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
// ⚠️ 22.08.2026 — DIESER IMPORTER RECHNETE GAR KEINE FRACHT EIN und hatte einen Boden von
// CHF 9.90. Bei gemessenen $6.34–$19.35 Fracht je Artikel (Orders #1011, LX1013, LX1015)
// ist ein Multiplikator auf den Warenwert allein keine Kalkulation: bei $3 Einkauf ergab
// MARGIN=3.2 einen Preis von CHF 9.80 gegen Kosten von CHF 17.70.
// Er laeuft derzeit in keinem Runner — genau deshalb faellt so etwas nie auf, bis ihn
// jemand wieder startet. Die Rechnung kommt jetzt aus cj_preis.mjs wie bei allen anderen.
// MARGIN wird nur noch als OBERgrenzen-Aufschlag beruecksichtigt, wenn er hoeher liegt.
const chf = (usd, grams) => {
  const basis = parseFloat(preisBasis(usd, grams));
  const alt = Math.max(9.9, (parseFloat(usd) || 0) * USD_CHF * MARGIN);
  return Math.max(basis, alt).toFixed(2);
};
const numId = (gid) => String(gid).split('/').pop();

if (!CJ_EMAIL || !CJ_API_KEY) { console.log('Keine CJ-Creds → No-op.'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

const SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const PUBQ = `{ publications(first:20){ edges{ node{ id } } } }`;
const PUB = `mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ message } } }`;
const COLL_FIND = `query($q:String!){ collections(first:1, query:$q){ edges{ node{ id handle } } } }`;
const COLL_CREATE = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ message } } }`;

(async () => {
  const stok = await sToken(); if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op.'); process.exit(0); }
  const ctok = await cjToken(); if (!ctok) process.exit(0);
  console.log('CJ + Shopify ok.' + (DRY ? ' [DRY]' : ''));
  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
  const pubs = DRY ? [] : ((await sgql(stok, PUBQ))?.data?.publications?.edges || []).map(e => ({ publicationId: e.node.id }));

  // Smart-Collection je Kategorie sicherstellen (per Tag)
  async function ensureColl(cfg) {
    if (DRY) return null;
    const f = await sgql(stok, COLL_FIND, { q: `handle:${cfg.coll.handle}` });
    const ex = f?.data?.collections?.edges?.[0]?.node;
    if (ex) return ex.id;
    const r = await sgql(stok, COLL_CREATE, { input: { handle: cfg.coll.handle, title: cfg.coll.title,
      descriptionHtml: `<p>${cfg.coll.title} – kuratierte Auswahl für die Schweiz. Gratis-Versand ab CHF 50.</p>`,
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: cfg.coll.tag }] } } });
    const id = r?.data?.collectionCreate?.collection?.id;
    console.log(`  Collection ${cfg.coll.title}: ${id ? 'angelegt' : 'FEHLER ' + JSON.stringify(r?.data?.collectionCreate?.userErrors)}`);
    return id;
  }

  let created = 0, fails = [];
  for (const cat of CATS) {
    const cfg = CONFIG[cat]; if (!cfg) { console.log(`Unbekannte Kategorie ${cat}`); continue; }
    console.log(`\n=== ${cat.toUpperCase()} (${cfg.coll.title}) ===`);
    // 1) Suchen → Kandidaten sammeln
    const cand = new Map();
    for (const { kw } of cfg.terms) {
      const r = await cjGet(ctok, '/product/list', { pageNum: 1, pageSize: 30, productNameEn: kw });
      await sleep(1200);
      const list = (r?.data?.list || []).filter(p => {
        const n = (p.productNameEn || '').toLowerCase();
        return cfg.anchor.some(a => n.includes(a)) && !BAD.some(x => n.includes(x));
      });
      for (const p of list) if (!cand.has(p.pid)) cand.set(p.pid, p);
    }
    const ranked = [...cand.values()]
      .filter(p => (Number(p.listedNum) || 0) >= MIN_LISTED)
      .sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0));
    // 2) Details holen, Bild-200, Preis
    const picks = [];
    for (const p of ranked) {
      if (picks.length >= PER) break;
      if (done.has('pid:' + p.pid)) continue;
      const d = (await cjGet(ctok, '/product/query', { pid: p.pid }))?.data; await sleep(1200);
      if (!d) continue;
      const vs = d.variants || [];
      const costs = vs.map(v => Number(v.variantSellPrice)).filter(Boolean);
      const cost = costs.length ? Math.min(...costs) : Number(d.sellPrice);
      if (!cost || cost > (cfg.maxCost || MAX_COST)) continue; // zu teuer = kein Impulskauf
      const imgsAll = (d.productImageSet || []).slice(0, 8);
      const good = [];
      for (const u of imgsAll) { if (await img200(u)) good.push(u); if (good.length >= 6) break; }
      if (good.length < 2) continue;                           // zu wenig gute Bilder
      picks.push({ pid: d.pid, nameEn: d.productNameEn, sku: vs[0]?.variantSku || d.productSku, cost, vs, imgs: good });
      console.log(`  Kandidat: $${cost} ${good.length}img ${vs.length}v · ${d.productNameEn.slice(0, 55)}`);
    }
    if (!picks.length) { console.log('  (keine geeigneten Kandidaten)'); continue; }
    if (DRY) { picks.forEach(p => console.log(`  [DRY] würde anlegen: ${p.nameEn.slice(0,55)} → CHF ${chf(p.cost)}`)); continue; }

    // 3) Titel übersetzen + anlegen
    const titles = await titlesDE(picks.map(p => p.nameEn));
    const collId = await ensureColl(cfg);
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const title = (titles[i] || p.nameEn).replace(/["<>]/g, '').trim();
      const price = chf(p.cost);
      const handle = (title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 60) || ('cj-' + p.pid);
      // Varianten: Farbe/Grösse aus CJ ableiten (sonst Einheit)
      const rows = p.vs.map(v => { const key = (v.variantKey || v.variantNameEn || '').trim(); const parts = key.split('-').map(s => s.trim()); let size = '', color = key; const last = (parts[parts.length - 1] || '').toUpperCase().replace(/\s/g, ''); if (SIZES.includes(last)) { size = last; color = parts.slice(0, -1).join('-').trim(); } return { color: color || 'Standard', size: size || 'Einheit', sku: v.variantSku }; });
      let colors = [...new Set(rows.map(r => r.color))].slice(0, 12);
      if (!colors.length) colors = ['Standard'];
      const tags = [cfg.coll.tag, ...cfg.extraTags, 'cj-real'];
      const desc = `<p><strong>${title}</strong></p><ul>${cfg.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
        + `<p>📦 Lieferung Schweiz 10–20 Werktage · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>`;
      const input = { title, handle, productType: cfg.type, vendor: 'LuxeStyle', status: 'ACTIVE', tags,
        descriptionHtml: desc, seo: { title: `${title} | LuxeStyle`, description: `${title} – Premium-Qualität, Gratis-Versand ab CHF 50.` },
        productOptions: [{ name: 'Farbe', values: colors.map(c => ({ name: c })) }],
        variants: colors.map(c => ({ optionValues: [{ optionName: 'Farbe', name: c }], price, inventoryItem: { sku: `CJ-${p.sku}-${c}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' })),
        files: p.imgs.map(u => ({ originalSource: u, contentType: 'IMAGE' })) };
      const r = await sgql(stok, SET, { input }); const e = r?.data?.productSet?.userErrors || [];
      const pid = r?.data?.productSet?.product?.id;
      if (e.length || !pid) { fails.push(`${title.slice(0,40)}: ${JSON.stringify(e.length ? e : r).slice(0, 160)}`); continue; }
      if (pubs.length) await sgql(stok, PUB, { id: pid, pubs });
      fs.appendFileSync(LEDGER, 'pid:' + p.pid + '\n');
      created++; console.log(`  ✅ ${title.slice(0, 50)} → CHF ${price} (${handle})`);
      await sleep(400);
    }
  }
  if (fails.length) fails.slice(0, 15).forEach(f => console.error('✗', f));
  console.log(`\nFertig: ${created} Produkt(e) angelegt${DRY ? ' [DRY]' : ''}${fails.length ? `, ${fails.length} Fehler` : ''}.`);
  process.exit(0);
})();
