#!/usr/bin/env node
/* fb_link_kommentar.mjs — setzt unter jeden Facebook-Post der Seite einen Kommentar mit dem DIREKTEN Produktlink.
 *
 * Betreiber 23.09.2026: «kannst du direktlinks kommentieren bei jedere sozialmedia post?»
 * Gemessen/geprüft, wo ein Link im Kommentar überhaupt KLICKBAR ist:
 *   · Facebook: ja (Seiten-Token hat pages_manage_engagement) → dieses Skript.
 *   · Instagram, TikTok: Links in Kommentaren sind nicht klickbar (Plattformregel) → dort nichts, sähe nach Spam aus.
 *   · YouTube Shorts: Links in Shorts-Kommentaren/-Beschreibungen seit 31.08.2023 nicht klickbar (YouTube-Spamschutz).
 *   · Pinterest: der Pin selbst IST der Direktlink (pinLink) → kein Kommentar nötig.
 *
 * Ablauf je Lauf: Seiten-Posts + Seiten-Reels der letzten TAGE (Default 3) lesen → Produkt bestimmen
 * (1. «luxestyle.ch/products/<handle>» im Text, 2. Bild-Queue social/posts_image.csv: FB-Post-ID → Produkt-ID am
 * Zeilenende) → Produkt muss ACTIVE + im Onlineshop sein (nie auf eine 404 verlinken) → gibt es schon einen
 * Seiten-Kommentar mit luxestyle.ch/products? dann überspringen → sonst kommentieren, Ledger schreiben.
 * Höchstens MAX (Default 10) Kommentare je Lauf, 4 s Abstand. DRY=1 zeigt nur.
 */
import fs from 'node:fs';

const DRY = process.env.DRY === '1';
const TAGE = parseFloat(process.env.TAGE || '3');
const MAX = parseInt(process.env.MAX || '10', 10);
const SEITE = '1049840534888592';
const G = 'https://graph.facebook.com/v21.0';
const TOKEN = (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token', 'utf8') : '').trim();
const SHOP = 'au3j0y-hq.myshopify.com';
const SHOPTOK = (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '').trim();
const LEDGER = 'dropship/_fb_link_kommentare.txt';
if (!TOKEN || !SHOPTOK) { console.log('Kein Meta- oder Shop-Token → No-op.'); process.exit(0); }

const warte = ms => new Promise(r => setTimeout(r, ms));
async function fb(pfad, opt = {}) {
  for (let a = 0; a < 3; a++) {
    try {
      const url = pfad.startsWith('http') ? pfad : `${G}/${pfad}${pfad.includes('?') ? '&' : '?'}access_token=${TOKEN}`;
      const r = await fetch(url, opt); const j = await r.json();
      if (j.error) { if (a < 2 && /temporar|unexpected|try again/i.test(j.error.message || '')) { await warte(3000); continue; } throw new Error(j.error.message); }
      return j;
    } catch (e) { if (a === 2) throw e; await warte(3000); }
  }
}
async function gql(query, variables = {}) {
  const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST',
    headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  return r.json();
}
async function produktVonHandle(h) {
  const d = await gql('query($h:String!){ productByHandle(handle:$h){ status onlineStoreUrl title } }', { h });
  return d?.data?.productByHandle || null;
}
async function produktVonId(id) {
  const d = await gql(`{ product(id:"gid://shopify/Product/${id}"){ status onlineStoreUrl title } }`);
  return d?.data?.product || null;
}

// Bild-Queue: FB-Post-ID → Shopify-Produkt-ID (Zeilen-ID endet auf die 14-stellige Produkt-ID)
const bildMap = new Map();
try {
  const t = fs.readFileSync('social/posts_image.csv', 'utf8');
  for (const m of t.matchAll(/^([^,\n]*?-(\d{12,15})),[^\n]*?(\d{10,20}_\d{10,25})/gm)) bildMap.set(m[3], m[2]);
} catch {}
// Fallback: Bild-Post ohne Link → erste Textzeile mit der Caption der Queue-Zeile vergleichen (Zeilen-ID endet auf die Produkt-ID).
const captionMap = [];
try {
  const t = fs.readFileSync('social/posts_image.csv', 'utf8');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  for (const r of rows.slice(1)) { const m = /-(\d{12,15})$/.exec(r[0] || ''); if (m && r[3]) captionMap.push([norm(r[3]).slice(0, 60), m[1]]); }
} catch {}
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9äöü]+/g, ' ').trim(); }
function ausCaption(text) { const k = norm(text).slice(0, 60); if (k.length < 20) return null; const f = captionMap.find(([c]) => c.startsWith(k.slice(0, 40)) || k.startsWith(c.slice(0, 40))); return f ? f[1] : null; }
const gesehen = [];   // [handle, zeit] — ein FB-Reel erscheint als Post UND als Reel: nur einmal kommentieren
const erledigt = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(z => z.split('\t')[1]).filter(Boolean) : []);

const seit = Math.floor(Date.now() / 1000 - TAGE * 86400);
const posts = [];
for (const [kante, felder] of [['published_posts', 'id,message,created_time,permalink_url'], ['video_reels', 'id,description,created_time,permalink_url']]) {
  let url = `${SEITE}/${kante}?fields=${felder}&since=${seit}&limit=50`;
  for (let s = 0; s < 5 && url; s++) {
    const j = await fb(url).catch(e => { console.log(`   ${kante}: ${e.message}`); return null; });
    if (!j) break;
    for (const p of j.data || []) posts.push({ id: p.id, text: p.message || p.description || '', zeit: p.created_time, link: p.permalink_url, art: kante });
    url = j.paging?.next || null;
  }
}
console.log(`${posts.length} Facebook-Posts/Reels der letzten ${TAGE} Tage`);

let n = 0, ohne = 0, schon = 0, inaktiv = 0;
for (const p of posts) {
  if (n >= MAX) break;
  if (erledigt.has(p.id)) { schon++; continue; }
  let prod = null, quelle = '';
  const h = /luxestyle\.ch\/products\/([\w%-]+)/.exec(p.text);
  if (h) { prod = await produktVonHandle(decodeURIComponent(h[1])); quelle = 'Text'; }
  if (!prod) { const pid = bildMap.get(p.id) || bildMap.get(p.id.split('_').pop()); if (pid) { prod = await produktVonId(pid); quelle = 'Bild-Queue'; } }
  if (!prod) { const pid = ausCaption(p.text); if (pid) { prod = await produktVonId(pid); quelle = 'Caption-Abgleich'; } }
  if (!prod) { ohne++; console.log(`   ? kein Produkt zuordenbar: ${p.id} «${p.text.slice(0, 50).replace(/\n/g, ' ')}»`); continue; }
  const t0 = Date.parse(p.zeit);
  if (gesehen.some(([u, t]) => u === prod.onlineStoreUrl && Math.abs(t - t0) < 20 * 60000)) { schon++; console.log(`   = Doppel (Reel als Post und als Reel): ${p.id}`); continue; }
  gesehen.push([prod.onlineStoreUrl, t0]);
  if (prod.status !== 'ACTIVE' || !prod.onlineStoreUrl) { inaktiv++; console.log(`   ⛔ Produkt nicht kaufbar (${prod.status}): ${prod.title}`); continue; }
  const k = await fb(`${p.id}/comments?fields=from{id},message&limit=50`).catch(() => ({ data: [] }));
  if ((k.data || []).some(c => c.from?.id === SEITE && /luxestyle\.ch\/products/.test(c.message || ''))) { schon++; fs.appendFileSync(LEDGER, `${new Date().toISOString()}\t${p.id}\tschon-vorhanden\t\n`); continue; }
  const url = `${prod.onlineStoreUrl}?utm_source=facebook&utm_medium=social&utm_campaign=link_kommentar`;
  const text = `👉 Direkt zum Produkt: ${url}`;
  console.log(`   ${DRY ? '[DRY] ' : ''}${p.art === 'video_reels' ? 'Reel' : 'Post'} ${p.id} (${quelle}) → ${prod.title.slice(0, 50)}`);
  if (DRY) { n++; continue; }
  try {
    const r = await fb(`${p.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message: text, access_token: TOKEN }) });
    fs.appendFileSync(LEDGER, `${new Date().toISOString()}\t${p.id}\t${r.id || ''}\t${url}\n`);
    n++; await warte(4000);
  } catch (e) { console.log(`   ✗ Kommentar fehlgeschlagen: ${e.message}`); }
}
console.log(`FERTIG: ${n} Link-Kommentare${DRY ? ' (DRY)' : ''}, ${schon} hatten schon einen, ${ohne} ohne Produkt, ${inaktiv} Produkt nicht kaufbar`);
