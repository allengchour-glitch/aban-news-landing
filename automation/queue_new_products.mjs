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
import { balanceByCategory } from './lib/reel-category.mjs';

const { SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } = process.env;
const QUEUE_MAX = Number(process.env.QUEUE_MAX || 3);
const API_VER = '2026-01';
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
  // 25.09.2026: Seit die Captions «Link in Bio» statt /products/-Link tragen (23.09.), stand der Handle NUR noch in der
  // id-Spalte — die Sperre sah ihn nicht, und derselbe Hoodie wurde zweimal eingereiht. Jetzt auch die erste Spalte.
  const idRe = /^([a-z0-9-]+),\d{4}-\d{2}-\d{2},/gim;
  while ((m = idRe.exec(csvText))) set.add(m[1].toLowerCase());
  return set;
}

// Caption + Hashtags je Produkttyp.
// REACH-Tags vorne (#schweiz/#ootdschweiz zogen lt. TikTok-Analyse die meiste Reichweite),
// dann produktspezifische Nischen-Tags.
function hashtags(pt = '') {
  pt = pt.toLowerCase();
  const reach = '#schweiz #ootdschweiz #schweizmode';
  if (/(kleid|dress|rock|skirt)/.test(pt)) return reach + ' #kleid #luxestyle';
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
// 23.09.2026: ehrliche Caption statt Rabatt-Push. Die vier alten Varianten («Spar dir den Designer-Preis»,
// «Schreib LINK 👇», «–10% WELCOME10», «Neu bei LuxeStyle ✨») sind genau die Klasse hinter dem Kundenfeedback
// vom 05.09. («zu fest KI, wie Scam»); WELCOME10 ist zudem ein offener Betreiber-Entscheid. Gleiche Bausteine
// wie tiktok_karussell.py (Laden-Zeile aus Belp, Lieferzeit nur wenn belegt, Kommentar-Frage, Link in Bio).
function ladenZeile(tags) {
  const t = new Set((tags || []).map(x => String(x).toLowerCase()));
  const liefer = t.has('ch-lager') ? 'Versand ab Schweizer Lager in 1–2 Werktagen' : 'Lieferung 10–20 Werktage, dafür ehrlich angeschrieben';
  return `Kleiner Schweizer Shop aus Belp, kein Konzern. ${liefer} · 30 Tage Rückgabe · TWINT oder Rechnung.\nFragen? Schreib sie in die Kommentare 👇`;
}
function caption(title, handle, pt, price, tags) {
  const chf = price ? `CHF ${Number(price).toFixed(2).replace(/\.00$/, '.–')}` : '';
  const t = String(title).replace(/\s+[–—]\s+.*$/, '').replace(/\s+-\s+.*$/, '').replace(/\s*[·|].*$/, '').trim();
  const saison = process.env.VORRANG_TAG ? (process.env.SAISON_ZEILE || '🍂 Herbst-Favorit') + '\n' : '';   // 25.09. Saison-Nachschub
  return `${saison}${t}${chf ? ` · ${chf}` : ''}\n${ladenZeile(tags)}\nJetzt im Shop 🇨🇭 luxestyle.ch – Link in Bio\n\n${hashtags(pt)}`;
}

(async () => {
  await ensureToken();
  if (!SHOP_TOKEN) { console.log('Shopify-Auth fehlgeschlagen.'); process.exit(0); }

  let csv = fs.readFileSync(CSV, 'utf8');
  const have = existingHandles(csv);

  // zuletzt angelegte ACTIVE cj-real Produkte
  // 25.09.2026: VORRANG_TAG=herbst-2026 → Saison-Ware statt der neuesten CJ-Produkte (Herbst stand in 0 von 56 wartenden Bild-Posts).
  const VT = (process.env.VORRANG_TAG || '').replace(/[^a-z0-9-]/gi, '');
  const d = await shopify(`query{ products(first:${VT ? 250 : 50}, query:"status:active AND tag:${VT || 'cj-real'}", sortKey:CREATED_AT, reverse:true){
      nodes{ title handle productType tags featuredImage{ url } priceRangeV2{ minVariantPrice{ amount } } } } }`);
  const prods = balanceByCategory(d.products?.nodes || [], p => `${p.title} ${p.productType||''} ${p.handle||''}`);

  const rows = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of prods) {
    if (rows.length >= QUEUE_MAX) break;
    const handle = (p.handle || '').toLowerCase();
    const img = p.featuredImage?.url || '';
    if (!handle || have.has(handle)) continue;       // schon in Queue
    if (!isJpg(img)) continue;                        // Meta-JPG-Pflicht
    const price = p.priceRangeV2?.minVariantPrice?.amount || '';
    const cap = caption(p.title, handle, p.productType || '', price, p.tags || []);
    rows.push([handle, today, img, q(cap), q('instagram,facebook'), 'ready', '', ''].join(','));
    have.add(handle);
  }

  if (rows.length === 0) { console.log('Keine neuen Produkte für die Queue (alles schon drin oder keine .jpg-Titelbilder).'); process.exit(0); }

  if (!csv.endsWith('\n')) csv += '\n';
  fs.writeFileSync(CSV, csv + rows.join('\n') + '\n');
  console.log(`✅ ${rows.length} neue Produkt(e) in die Post-Queue eingereiht:`);
  rows.forEach(r => console.log('  + ' + r.split(',')[0]));
})().catch(e => { console.error('Auto-Queue-Fehler:', e.message); process.exit(0); });
