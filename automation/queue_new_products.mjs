#!/usr/bin/env node
/**
 * Auto-Queue — füllt social/posts_image.csv automatisch mit NEUEN Shop-Produkten.
 * ---------------------------------------------------------------------------------
 * Läuft als GitHub Action (vor den Post-Crons). Holt die zuletzt angelegten ACTIVE-Produkte
 * aus Shopify, baut je Produkt eine Post-Zeile (Bild + deutsche Caption + Produktlink +
 * WELCOME10 + Hashtags) und hängt sie als status=ready an die Queue. Der social-meta-autopost-
 * Cron postet sie dann an FB + Threads (+ IG).
 *
 * Dedupe: ein Produkt wird übersprungen, wenn sein Handle bereits in der Queue vorkommt
 * (im Produktlink jeder Caption). Nur .jpg/.jpeg-Titelbilder (Meta-Pflicht).
 *
 * Secrets (Umgebung): SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN ODER SHOPIFY_CLIENT_ID/SECRET).
 * Optional: QUEUE_MAX (Default 3) — wie viele neue Produkte pro Lauf einreihen.
 * Fehlt ein Secret → No-Op (exit 0). Keine Secrets im Log.
 */
import fs from 'node:fs';
import https from 'node:https';

const { SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
const QUEUE_MAX = Number(process.env.QUEUE_MAX || 3);
const API_VER = '2024-10';
const CSV = 'social/posts_image.csv';
let SHOP_TOKEN = SHOPIFY_ADMIN_TOKEN || '';

if (!SHOPIFY_SHOP || !(SHOPIFY_ADMIN_TOKEN || (SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET))) {
  console.log('No-Op: Secrets fehlen (SHOPIFY_SHOP + ADMIN_TOKEN oder CLIENT_ID/SECRET).');
  process.exit(0);
}

function req(method, url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = { method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { ...headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = https.request(opts, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
async function ensureToken() {
  if (SHOP_TOKEN) return SHOP_TOKEN;
  const r = await req('POST', `https://${SHOPIFY_SHOP}/admin/oauth/access_token`,
    { 'Content-Type': 'application/json' },
    { client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' });
  try { SHOP_TOKEN = JSON.parse(r.body).access_token || ''; } catch { SHOP_TOKEN = ''; }
  return SHOP_TOKEN;
}
async function shopify(query, variables) {
  const r = await req('POST', `https://${SHOPIFY_SHOP}/admin/api/${API_VER}/graphql.json`,
    { 'X-Shopify-Access-Token': SHOP_TOKEN, 'Content-Type': 'application/json' }, { query, variables });
  const j = JSON.parse(r.body);
  if (j.errors) throw new Error('Shopify: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}
const isJpg = (u) => /\.jpe?g($|\?)/i.test(u || '');
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

// einfache CSV-Zeilen-Erkennung des Produkt-Handles (im Produktlink der Caption)
function existingHandles(csvText) {
  const set = new Set();
  const re = /\/products\/([a-z0-9-]+)/gi; let m;
  while ((m = re.exec(csvText))) set.add(m[1].toLowerCase());
  return set;
}

// Caption + Hashtags je Produkttyp.
// REACH-Tags vorne (#schweiz/#ootdschweiz zogen lt. TikTok-Analyse die meiste Reichweite),
// dann produktspezifische Nischen-Tags.
function hashtags(pt = '') {
  pt = pt.toLowerCase();
  const reach = '#schweiz #ootdschweiz #schweizmode';
  if (/(kleid|dress|rock|skirt)/.test(pt)) return reach + ' #sommerkleid #luxestyle';
  if (/(tasche|bag|handtasche|crossbody)/.test(pt)) return reach + ' #handtasche #luxestyle';
  if (/(ohrring|halskette|armband|ring|schmuck|earring|necklace|bracelet)/.test(pt)) return reach + ' #schmuck #luxestyle';
  if (/(hut|cap|hat|mütze|beret)/.test(pt)) return reach + ' #accessoires #luxestyle';
  if (/(blazer|jacke|cardigan|hoodie|set|mode|shirt|hemd)/.test(pt)) return reach + ' #fashionschweiz #luxestyle';
  if (/(beauty|wellness|pflege|serum|roller)/.test(pt)) return reach + ' #selfcare #luxestyle';
  if (/(vase|deko|wohnen|home|lampe|kerze)/.test(pt)) return reach + ' #homedecor #luxestyle';
  return reach + ' #neu #luxestyle';
}
// Gewinner-Formel (TikTok-Analyse 2026-06-11): Hook → Produkt + PREIS → FRAGE-CTA (Kommentare!)
// → WELCOME10 → Link → Reach-/Nischen-Tags. Variantenreich (rotiert deterministisch per Handle).
function caption(title, handle, pt, price) {
  const chf = price ? `CHF ${Number(price).toFixed(2).replace(/\.00$/,'.–')}` : '';
  const link = `luxestyle.ch/products/${handle}`;
  const t = String(title).replace(/\s+[–—]\s+.*$/,'').replace(/\s+-\s+.*$/,'').trim();   // Kurztitel: nur bei " – "/" - " mit Leerzeichen trennen (nicht bei Wort-Bindestrichen)
  const V = [
    `Neu bei LuxeStyle ✨ ${t}${chf?` – nur ${chf}`:''} 🇨🇭 Welche Farbe wäre deins? Kommentier 👇 –10% mit Code WELCOME10 → ${link}`,
    `${t}${chf?` für ${chf}`:''} 👀 Spar dir den Designer-Preis. 1, 2 oder 3 – welches nimmst du? 👇 –10% WELCOME10 → ${link}`,
    `Dein nächster Liebling? ${t}${chf?` ab ${chf}`:''} 🤍 Den Link willst du? Schreib LINK 👇 –10% WELCOME10 → ${link}`,
    `${t} 🌸${chf?` Nur ${chf}.`:''} Würdest du’s tragen? Ja/Nein 👇 Schweizer Shop · –10% Code WELCOME10 → ${link}`,
  ];
  const idx = [...handle].reduce((a,c)=>a+c.charCodeAt(0),0) % V.length;
  return `${V[idx]}\n${hashtags(pt)}`;
}

(async () => {
  await ensureToken();
  if (!SHOP_TOKEN) { console.log('Shopify-Auth fehlgeschlagen.'); process.exit(0); }

  let csv = fs.readFileSync(CSV, 'utf8');
  const have = existingHandles(csv);

  // zuletzt angelegte ACTIVE cj-real Produkte
  const d = await shopify(`query{ products(first:50, query:"status:active AND tag:cj-real", sortKey:CREATED_AT, reverse:true){
      nodes{ title handle productType featuredImage{ url } priceRangeV2{ minVariantPrice{ amount } } } } }`);
  const prods = (d.products?.nodes || []);

  const rows = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of prods) {
    if (rows.length >= QUEUE_MAX) break;
    const handle = (p.handle || '').toLowerCase();
    const img = p.featuredImage?.url || '';
    if (!handle || have.has(handle)) continue;       // schon in Queue
    if (!isJpg(img)) continue;                        // Meta-JPG-Pflicht
    const price = p.priceRangeV2?.minVariantPrice?.amount || '';
    const cap = caption(p.title, handle, p.productType || '', price);
    rows.push([handle, today, img, q(cap), q('instagram,facebook,threads'), 'ready', '', ''].join(','));
    have.add(handle);
  }

  if (rows.length === 0) { console.log('Keine neuen Produkte für die Queue (alles schon drin oder keine .jpg-Titelbilder).'); process.exit(0); }

  if (!csv.endsWith('\n')) csv += '\n';
  fs.writeFileSync(CSV, csv + rows.join('\n') + '\n');
  console.log(`✅ ${rows.length} neue Produkt(e) in die Post-Queue eingereiht:`);
  rows.forEach(r => console.log('  + ' + r.split(',')[0]));
})().catch(e => { console.error('Auto-Queue-Fehler:', e.message); process.exit(0); });
