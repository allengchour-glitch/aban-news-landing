#!/usr/bin/env node
/* linkinbio_sync.mjs — Link-in-Bio-Seite: jeder Instagram-Post (letzte N, Default 60) wird eine Kachel,
 * die DIREKT zu seinem Produkt führt.
 *
 * Warum: Betreiber 23.09.2026 «Posts mit Direktlink». Links in IG-Captions sind nicht klickbar, der einzige
 * klickbare Link ist der Bio-Link (gemessen 23.09.: website = http://luxestyle.ch → Startseite, nicht Produkt).
 * Wer einen Post sieht, landet heute auf der Startseite und muss das Produkt suchen.
 *
 * Gemessen 23.09.2026 (nur lesend):
 *   · Metricool: 0 SmartLinks (GET /v2/smart-links/links/lite — prüft den Schlüssel: falscher Token → 401),
 *     0 Einträge im alten IG-Linkin-Bio-Katalog (/linkinbio/instagram/getbiocatalog, getbioButtons; 401/403-geprüft),
 *     Slug «luxestyle» frei (/slugs?value= → 200 «luxestyle»; belegte Slugs → 400 SlugAlreadyExists).
 *     Öffentliche Adresse eines SmartLinks: https://mtr.bio/<slug> (mtr.bio/metricool gemessen; unbekannte Slugs
 *     leiten auf die Metricool-Werbeseite um).
 *   · FALLE: GET /v2/smart-links/links (ohne /lite) antwortet {"data":[]} auch OHNE Token — blind, nie zum Messen nehmen.
 *   · IG-Bild-URLs (scontent…cdninstagram.com) sind signiert und laufen nach ~4–5 Tagen ab (oe=…) → im SCHARF-Lauf
 *     werden sie über Metricool /actions/normalize/image/url kopiert (Ziel metricool) bzw. durch das Shopify-
 *     Produktbild ersetzt (Ziel shopify). Nie eine IG-URL dauerhaft als Bildquelle speichern.
 *   · Alte Linkin-Bio-Endpunkte addcatalogButton, editcatalogbutton, editcatalogitem, updateButtonPosition sind GET-MUTATIONEN — nie aufrufen.
 *
 * Produktzuordnung (wie fb_link_kommentar.mjs, ergänzt um IG-Ledger):
 *   1. «luxestyle.ch/products/<handle>» im Caption-Text (Reels tragen ihn)
 *   2. Bild-Queue social/posts_image.csv: post_url = IG-Media-ID (oder «… | ig:<id>») → Produkt-ID am Zeilen-ID-Ende
 *   3. IG-Karussell-Queue social/ig_karussell.csv: post_url «ig:<id> …» → Handle (nur EIN Produkt; Sammelposts nicht)
 *   4. Reel-Queue automation/reels_seed.csv: post_url instagram.com/reel/<code> → cjreel-<pid> (Shopify-ID oder SKU CJ-<pid>)
 *   5. Erste Caption-Zeile «<Titel> · CHF …» → exakte Titelsuche (Kanarienvogel prüft vorher, dass die Suche filtert)
 *   6. MIT_TIKTOK (Default an): auf TikTok/YouTube veröffentlichte Reels aus automation/reels_seed.csv (posted-tiktok/
 *      posted-youtube, cjreel-<pid>). Grund: TikTok bekommt wegen der plattformübergreifenden Sperre EIGENE Reels — eine
 *      reine IG-Spiegelseite zeigte TikTok-Besuchern keines ihrer Videos. Gleiches Produkt wie eine IG-Kachel → keine 2. Kachel.
 *   Sammelposts (≥3 nummerierte Zeilen) bekommen KEINE Kachel — es gibt nicht «das» Produkt.
 *   Kachel nur, wenn das Produkt ACTIVE und im Onlineshop ist (onlineStoreUrl) — nie auf eine 404 verlinken.
 *   Link: ZIEL=metricool (fremde Domain mtr.bio) → onlineStoreUrl?utm_source=<netz>&utm_medium=social&utm_campaign=linkinbio
 *   &utm_content=<Kurzcode>; ZIEL=shopify → onlineStoreUrl OHNE utm (interne Links mit utm überschreiben die Sitzungs-
 *   Quelle; die utm trägt dort der Bio-Link: /pages/direkt?utm_source=instagram|tiktok&utm_medium=social&utm_campaign=bio).
 *
 * Modi:
 *   (Default)  DRY — liest IG + Shopify + Metricool, gibt den Plan aus (Kachel → Link), schreibt ihn nach PLAN_OUT
 *              (Default /tmp/linkinbio_plan.json) und für ZIEL=shopify eine HTML-Vorschau nach HTML_OUT. Schreibt NICHTS.
 *   SCHARF=1   schreibt: ZIEL=shopify (Default) → Seite luxestyle.ch/pages/<SEITE_HANDLE> anlegen/aktualisieren
 *              (Produktbilder vom Shopify-CDN, laufen nicht ab), danach zurücklesen;
 *              ZIEL=metricool → SmartLink «SLUG» (https://mtr.bio/<SLUG>) anlegen/aktualisieren, danach zurücklesen.
 *              ⚠️ Der SCHARF-Pfad ist am 23.09. NICHT ausgeführt worden (Auftrag: nur vorbereiten). Erstlauf nur mit
 *              Betreiber-Ja, danach die Seite von Hand ansehen. Er überschreibt nur die Kacheln (images bzw. den
 *              Seiteninhalt); Kopf/Knöpfe einer bestehenden Metricool-Seite bleiben, wie der Betreiber sie gestaltet hat.
 * ENV: N (60) · ZIEL (shopify|metricool) · SLUG (luxestyle) · SEITE_HANDLE (direkt) · MIT_TIKTOK (1) · PLAN_OUT · HTML_OUT ·
 *      METRICOOL_USER_TOKEN oder /tmp/metricool.env · METRICOOL_USER_ID (4801419) · METRICOOL_BLOG_ID (6227837)
 */
import fs from 'node:fs';
import { nachlauf } from './eimer_etikette.mjs';

const SCHARF = process.env.SCHARF === '1' && process.env.DRY !== '1';
const ZIEL = (process.env.ZIEL || 'shopify').toLowerCase();   // Empfehlung 23.09.: eigene Domain (dropship/DIREKTLINK.md)
if (!['metricool', 'shopify'].includes(ZIEL)) { console.error(`ZIEL=${ZIEL} unbekannt (metricool|shopify)`); process.exit(1); }
const N = Math.max(1, Math.min(parseInt(process.env.N || '60', 10), 100));
const SLUG = process.env.SLUG || 'luxestyle';
const SEITE_HANDLE = process.env.SEITE_HANDLE || 'direkt';   // luxestyle.ch/pages/direkt — neutral, dient IG- UND TikTok-Bio
const MIT_TIKTOK = process.env.MIT_TIKTOK !== '0';
const PLAN_OUT = process.env.PLAN_OUT || '/tmp/linkinbio_plan.json';
const HTML_OUT = process.env.HTML_OUT || '/tmp/linkinbio_vorschau.html';
const UTM = 'utm_source=instagram&utm_medium=social&utm_campaign=linkinbio';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const LOGO = 'https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/social/brand/profil-monogramm.jpg';
const G = 'https://graph.facebook.com/v21.0';
const MC = 'https://app.metricool.com/api';
const MC_USER = process.env.METRICOOL_USER_ID || '4801419', MC_BLOG = process.env.METRICOOL_BLOG_ID || '6227837';

const lies = p => { try { return fs.readFileSync(p, 'utf8').trim(); } catch { return ''; } };
const META = lies('/tmp/meta_page_token');
const IG = lies('/tmp/meta_ig_id') || '17841480560863361';
const SHOPTOK = (process.env.SHOPIFY_ADMIN_TOKEN || lies('/tmp/cj_shop_token.txt')).trim();
const MCTOKEN = (() => { if (process.env.METRICOOL_USER_TOKEN) return process.env.METRICOOL_USER_TOKEN.trim();
  const m = /METRICOOL_USER_TOKEN=([^\s'"]+)/.exec(lies('/tmp/metricool.env')); return m ? m[1] : ''; })();
if (!META || !SHOPTOK) { console.log('Kein Meta- oder Shop-Token → No-op.'); process.exit(0); }
const warte = ms => new Promise(r => setTimeout(r, ms));

// ── Zugriffe ────────────────────────────────────────────────────────────────────────────────────────────────
async function graph(pfad) {
  const url = pfad.startsWith('http') ? pfad : `${G}/${pfad}${pfad.includes('?') ? '&' : '?'}access_token=${META}`;
  for (let a = 0; a < 3; a++) {
    try {
      const j = await (await fetch(url)).json();
      if (j.error) { if (a < 2 && /temporar|unexpected|try again|unknown error/i.test(j.error.message || '')) { await warte(3000); continue; } throw new Error(j.error.message); }
      return j;
    } catch (e) { if (a === 2) throw e; await warte(3000); }
  }
}
async function gql(query, variables = {}) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2026-01/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': SHOPTOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
      const j = await r.json();
      await nachlauf(j);
      if (j.errors && /throttl/i.test(JSON.stringify(j.errors))) { await warte(4000 * (a + 1)); continue; }
      if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
      return j.data;
    } catch (e) { if (a === 3) throw e; await warte(2000 * (a + 1)); }
  }
}
async function mc(pfad, { method = 'GET', body, query = '' } = {}) {
  const r = await fetch(`${MC}${pfad}?userId=${MC_USER}&blogId=${MC_BLOG}${query}`, { method,
    headers: { 'X-Mc-Auth': MCTOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, ok: r.ok, j, t };
}

// ── CSV (gleicher Parser wie metricool_tiktok_post.mjs) ────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function csvZeilen(pfad) {
  try { const rows = parseCsv(fs.readFileSync(pfad, 'utf8')); const h = rows[0].map(s => s.trim());
    return rows.slice(1).filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()]))); } catch { return []; }
}

// ── Ledger-Karten: IG-Post → Produkt-Schlüssel ────────────────────────────────────────────────────────────
const ausBild = new Map(), ausKarussell = new Map(), ausReel = new Map();
for (const z of csvZeilen('social/posts_image.csv')) {
  const pid = /-(\d{12,15})$/.exec(z.id || ''); if (!pid) continue;
  for (const m of (z.post_url || '').matchAll(/(?:^|ig:|\s)(1[78]\d{14,17})\b/g)) ausBild.set(m[1], pid[1]);
}
for (const z of csvZeilen('social/ig_karussell.csv')) {
  const m = /ig:(\d+)/.exec(z.post_url || ''); if (!m) continue;
  const hs = (z.produkte || '').split(/[\s,;|]+/).filter(Boolean);
  ausKarussell.set(m[1], hs.length === 1 ? hs[0] : null);   // null = Sammelpost
}
for (const z of csvZeilen('automation/reels_seed.csv')) {
  const m = /instagram\.com\/reels?\/([\w-]+)/.exec(z.post_url || ''); if (m) ausReel.set(m[1], z.id);
}

// ── 1. Instagram lesen ────────────────────────────────────────────────────────────────────────────────────
const posts = [];
let url = `${IG}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url&limit=${Math.min(N, 50)}`;
for (let s = 0; s < 5 && url && posts.length < N; s++) { const j = await graph(url); posts.push(...(j.data || [])); url = j.paging?.next || null; }
posts.splice(N);
const prof = await graph(`${IG}?fields=username,website`).catch(() => ({}));
console.log(`Instagram @${prof.username || '?'}: ${posts.length} Posts gelesen (${posts.at(-1)?.timestamp?.slice(0, 10)} … ${posts[0]?.timestamp?.slice(0, 10)}), Bio-Link heute: ${prof.website || '?'}`);

// ── 2. Zuordnung ──────────────────────────────────────────────────────────────────────────────────────────
// Kanarienvogel für die Titelsuche: ein Titel, den es nicht gibt, muss 0 Treffer liefern (sonst filtert die Suche nicht).
const kan = await gql('query($q:String!){ products(first:1, query:$q){ nodes{ id } } }', { q: 'title:"zzqx kanarienvogel gibt es nicht 4711"' });
const TITELSUCHE = (kan?.products?.nodes || []).length === 0;
if (!TITELSUCHE) console.log('⚠️ Kanarienvogel: Titelsuche filtert nicht — Titel-Zuordnung abgeschaltet.');
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const kurzcode = p => (/\/(?:reel|p|tv)\/([\w-]+)/.exec(p.permalink || '') || [])[1] || p.id;

for (const p of posts) {
  const cap = p.caption || '';
  p.kurz = kurzcode(p);
  const h = /luxestyle\.ch\/products\/([\w%-]+)/i.exec(cap);
  if (h) { p.schl = { art: 'handle', wert: decodeURIComponent(h[1]).toLowerCase() }; p.quelle = 'Caption-Link'; continue; }
  if (ausBild.has(p.id)) { p.schl = { art: 'id', wert: ausBild.get(p.id) }; p.quelle = 'Bild-Queue'; continue; }
  if (ausKarussell.has(p.id)) {
    const hk = ausKarussell.get(p.id);
    if (hk) { p.schl = { art: 'handle', wert: hk }; p.quelle = 'Karussell-Queue'; } else { p.grund = 'Sammelpost (mehrere Produkte)'; }
    continue;
  }
  if (ausReel.has(p.kurz)) {
    const m = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(ausReel.get(p.kurz));
    if (m) { p.schl = /^\d{12,15}$/.test(m[1]) ? { art: 'id', wert: m[1] } : { art: 'sku', wert: `CJ-${m[1]}` }; p.quelle = 'Reel-Queue'; continue; }
  }
  if ((cap.match(/^\s*\d+\.\s/gm) || []).length >= 3) { p.grund = 'Sammelpost (mehrere Produkte)'; continue; }
  const erste = (cap.split('\n').find(z => z.trim()) || '').split(/\s[·–—-]\s*CHF\b/)[0].trim();
  if (TITELSUCHE && /\bCHF\s*\d/.test(cap) && erste.length >= 6 && erste.length <= 120 && !/[#@]/.test(erste)) {
    p.schl = { art: 'titel', wert: erste }; p.quelle = 'Titel aus Caption'; continue;
  }
  p.grund = 'keine Zuordnung (kein Link, in keiner Queue, kein «Titel · CHF»)';
}
if (MIT_TIKTOK) for (const z of csvZeilen('automation/reels_seed.csv')) {
  const n = /^posted-(tiktok|youtube)$/.exec(z.status || ''); if (!n) continue;
  const m = /^cjreel-([0-9A-Za-z-]{6,})$/.exec(z.id || ''); if (!m) continue;
  const pub = /(?:tiktok|youtube):(https?:\S+)/.exec(z.post_url || '');
  posts.push({ id: z.id, netz: n[1], permalink: pub ? pub[1] : '', timestamp: z.posted_at, media_type: 'VIDEO', kurz: `${n[1]}-${m[1].slice(-8)}`,
    schl: /^\d{12,15}$/.test(m[1]) ? { art: 'id', wert: m[1] } : { art: 'sku', wert: `CJ-${m[1]}` }, quelle: n[1] === 'tiktok' ? 'TikTok-Queue' : 'YouTube-Queue' });
}
posts.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));

// Produkte in Paketen zu 20 Aliasen nachschlagen (schont den Eimer: ~3 Anfragen statt 60)
const F = 'id title handle status onlineStoreUrl featuredMedia{ preview{ image{ url } } }';
const schluessel = [...new Map(posts.filter(p => p.schl).map(p => [`${p.schl.art}:${p.schl.wert}`, p.schl])).values()];
const gefunden = new Map();
for (let i = 0; i < schluessel.length; i += 20) {
  const teil = schluessel.slice(i, i + 20), defs = [], felder = [], vars = {};
  teil.forEach((s, k) => {
    if (s.art === 'handle') { defs.push(`$v${k}:String!`); felder.push(`a${k}: productByHandle(handle:$v${k}){ ${F} }`); vars[`v${k}`] = s.wert; }
    else if (s.art === 'id') { defs.push(`$v${k}:ID!`); felder.push(`a${k}: product(id:$v${k}){ ${F} }`); vars[`v${k}`] = `gid://shopify/Product/${s.wert}`; }
    else if (s.art === 'sku') { defs.push(`$v${k}:String!`); felder.push(`a${k}: products(first:3, query:$v${k}){ nodes{ ${F} } }`); vars[`v${k}`] = `sku:${s.wert}`; }
    else { defs.push(`$v${k}:String!`); felder.push(`a${k}: products(first:5, query:$v${k}){ nodes{ ${F} } }`); vars[`v${k}`] = `title:"${s.wert.replace(/["\\]/g, ' ')}"`; }
  });
  const d = await gql(`query(${defs.join(',')}){ ${felder.join('\n')} }`, vars);
  teil.forEach((s, k) => {
    let r = d?.[`a${k}`];
    if (r && r.nodes) {
      const kandidaten = s.art === 'titel' ? r.nodes.filter(n => norm(n.title) === norm(s.wert)) : r.nodes;
      r = kandidaten.find(n => n.status === 'ACTIVE' && n.onlineStoreUrl) || kandidaten[0] || null;
    }
    gefunden.set(`${s.art}:${s.wert}`, r || null);
  });
}

// ── 3. Plan ───────────────────────────────────────────────────────────────────────────────────────────────
const kacheln = [], ohne = [], schonProdukt = new Set();
for (const p of posts) {
  const zeit = p.timestamp?.slice(0, 16).replace('T', ' ');
  const typ = p.netz === 'tiktok' ? 'TikTok' : p.netz === 'youtube' ? 'YouTube' : p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Karussell' : 'Bild';
  const basis = { igId: p.id, kurz: p.kurz, permalink: p.permalink, zeit, typ, igBild: p.thumbnail_url || p.media_url || '' };
  if (!p.schl) { ohne.push({ ...basis, grund: p.grund, caption: (p.caption || '').slice(0, 70).replace(/\s+/g, ' ') }); continue; }
  const prod = gefunden.get(`${p.schl.art}:${p.schl.wert}`);
  if (!prod) { ohne.push({ ...basis, grund: `Produkt nicht gefunden (${p.quelle}: ${p.schl.wert.slice(0, 50)})` }); continue; }
  if (prod.status !== 'ACTIVE' || !prod.onlineStoreUrl) { ohne.push({ ...basis, grund: `Produkt nicht kaufbar (${prod.status}${prod.onlineStoreUrl ? '' : ', nicht im Onlineshop'}): ${prod.title.slice(0, 50)}` }); continue; }
  if (p.netz && schonProdukt.has(prod.id)) { ohne.push({ ...basis, grund: `Produkt hat schon eine Kachel: ${prod.title.slice(0, 50)}` }); continue; }
  schonProdukt.add(prod.id);
  kacheln.push({ ...basis, quelle: p.quelle, produkt: prod.title, produktId: prod.id.split('/').pop(), handle: prod.handle,
    produktBild: prod.featuredMedia?.preview?.image?.url || '',
    link: ZIEL === 'metricool' ? `${prod.onlineStoreUrl}?utm_source=${p.netz || 'instagram'}&utm_medium=social&utm_campaign=linkinbio&utm_content=${p.kurz}` : prod.onlineStoreUrl });
}
console.log(`\nPLAN (${SCHARF ? 'SCHARF' : 'DRY'}, Ziel ${ZIEL}): ${kacheln.length} Kacheln aus ${posts.length} Posts (${posts.filter(p => !p.netz).length} Instagram, ${posts.filter(p => p.netz).length} TikTok/YouTube), ${ohne.length} ohne Kachel`);
kacheln.forEach((k, i) => console.log(`  ${String(i + 1).padStart(2)}. ${k.zeit} ${k.typ.padEnd(9)} ${k.kurz.padEnd(12)} [${k.quelle}] ${k.produkt.slice(0, 44)}\n      → ${k.link}`));
if (ohne.length) { console.log('  Ohne Kachel:'); for (const o of ohne) console.log(`   – ${o.zeit} ${o.typ.padEnd(9)} ${o.kurz.padEnd(12)} ${o.grund}${o.caption ? ` «${o.caption}»` : ''}`); }
const zaehl = {}; for (const k of kacheln) zaehl[k.quelle] = (zaehl[k.quelle] || 0) + 1;
console.log(`  Quellen: ${Object.entries(zaehl).map(([q, n]) => `${q} ${n}`).join(' · ')}`);
const verfall = kacheln.map(k => /[?&]oe=([0-9A-F]+)/i.exec(k.igBild)).filter(Boolean).map(m => parseInt(m[1], 16) * 1000);
if (verfall.length) console.log(`  IG-Bild-URLs laufen ab ab ${new Date(Math.min(...verfall)).toISOString().slice(0, 16)} UTC → im SCHARF-Lauf nie direkt speichern`);

// ── 4. Zielzustand lesen + Soll bauen ─────────────────────────────────────────────────────────────────────
const knUtm = k => ZIEL === 'metricool' ? `?${UTM}&utm_content=knopf-${k}` : '';   // eigene Domain: interne Links ohne utm
const KNOEPFE = [
  { text: '🛍️ Zum Shop', destination: `https://luxestyle.ch/${knUtm('shop')}` },
  { text: '✨ Neu eingetroffen', destination: `https://luxestyle.ch/collections/neu-eingetroffen${knUtm('neu')}` },
  { text: '🔥 Gerade im Trend', destination: `https://luxestyle.ch/collections/hype-jetzt${knUtm('trend')}` },
];
const KOPF = { title: 'LuxeStyle 🇨🇭', subtitle: 'Tipp auf einen Post – direkt zum Produkt. Versand gratis ab CHF 50 · 30 Tage Rückgabe · TWINT, Klarna, Karte' };
const plan = { erstellt: new Date().toISOString(), ziel: ZIEL, scharf: SCHARF, kacheln, ohne };

if (ZIEL === 'metricool') {
  if (!MCTOKEN) { console.log('Metricool: kein Token → Zielzustand nicht lesbar.'); if (SCHARF) process.exit(1); }
  else {
    const lite = await mc('/v2/smart-links/links/lite');   // prüft den Schlüssel (die Liste ohne /lite ist blind)
    if (!lite.ok) { console.error(`Metricool /lite antwortet ${lite.status} — Zustand unklar, Abbruch.`); process.exit(1); }
    const vorhanden = (lite.j?.data || []).find(l => l.slug === SLUG) || null;
    let slugFrei = null;
    if (!vorhanden) { const s = await mc('/v2/smart-links/links/slugs', { query: `&value=${encodeURIComponent(SLUG)}` }); slugFrei = s.ok && s.j?.data === SLUG; }
    console.log(`\nMetricool-Seite https://mtr.bio/${SLUG}: ${vorhanden ? `vorhanden (id ${vorhanden.id})` : 'existiert nicht'}${vorhanden ? '' : ` · Slug ${slugFrei ? 'frei' : 'NICHT frei'}`} · SmartLinks im Konto: ${(lite.j?.data || []).length}`);
    plan.metricool = { vorhanden: vorhanden?.id || null, slugFrei, oeffentlich: `https://mtr.bio/${SLUG}`,
      body: { slug: SLUG, name: 'LuxeStyle Instagram', content: { header: { ...KOPF, imageUrl: '(LOGO → normalize)' }, buttons: KNOEPFE,
        images: kacheln.map(k => ({ src: '(IG-Bild → normalize)', destination: k.link })), icons: [] } } };
    if (SCHARF) await metricoolSchreiben(vorhanden, slugFrei);
  }
} else {
  const html = seitenHtml(kacheln);
  fs.writeFileSync(HTML_OUT, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vorschau luxestyle.ch/pages/${SEITE_HANDLE}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#fff">${html}</body></html>`);
  const kan2 = await gql('query($q:String!){ pages(first:1, query:$q){ nodes{ id } } }', { q: 'handle:zzqx-gibt-es-nicht-4711' });
  const d = await gql('query($q:String!){ pages(first:2, query:$q){ nodes{ id handle title isPublished updatedAt } } }', { q: `handle:${SEITE_HANDLE}` });
  const filtert = (kan2?.pages?.nodes || []).length === 0;
  const seite = filtert ? (d?.pages?.nodes || []).find(x => x.handle === SEITE_HANDLE) || null : null;
  console.log(`\nShopify-Seite luxestyle.ch/pages/${SEITE_HANDLE}: ${!filtert ? 'UNKLAR (Handle-Suche filtert nicht)' : seite ? `vorhanden (${seite.id}, «${seite.title}»)` : 'existiert nicht'} · Vorschau: ${HTML_OUT} (${html.length} Zeichen)`);
  plan.shopify = { handle: SEITE_HANDLE, vorhanden: seite?.id || null, html_zeichen: html.length, vorschau: HTML_OUT };
  if (SCHARF) { if (!filtert) { console.error('Abbruch: Seitensuche filtert nicht.'); process.exit(1); } await shopifySchreiben(seite, html); }
}
fs.writeFileSync(PLAN_OUT, JSON.stringify(plan, null, 1));
console.log(`\nPlan: ${PLAN_OUT}${SCHARF ? '' : '\n[DRY] Nichts geschrieben. Scharf erst mit Betreiber-Ja: SCHARF=1 ZIEL=' + ZIEL + ' node automation/linkinbio_sync.mjs'}`);

// ── Schreiber (nur SCHARF=1) ──────────────────────────────────────────────────────────────────────────────
async function normalisiert(u) {
  if (!u) return '';
  const r = await mc('/actions/normalize/image/url', { query: `&url=${encodeURIComponent(u)}` });
  if (!r.ok) return '';
  const j = r.j;   // nur eine echte http(s)-Adresse gilt — nie den JSON-Text einer unerwarteten Antwort als Bildquelle speichern
  const v = j === null ? r.t.trim().replace(/^"|"$/g, '') : (typeof j === 'string' ? j : (j.data?.url || j.url || (typeof j.data === 'string' ? j.data : '')));
  return /^https?:\/\/\S+$/.test(v || '') ? v : '';
}
async function metricoolSchreiben(vorhanden, slugFrei) {
  if (kacheln.length < 5) { console.error(`Abbruch: nur ${kacheln.length} Kacheln — Zuordnung prüfen, bevor eine Seite damit überschrieben wird.`); process.exit(1); }
  const bilder = [];
  for (const k of kacheln) {   // IG-URLs laufen ab → nach Metricool kopieren; scheitert das, das Shopify-Produktbild
    const src = (await normalisiert(k.igBild)) || (await normalisiert(k.produktBild));
    if (!src) { console.log(`   Bild nicht kopierbar, Kachel ausgelassen: ${k.kurz}`); continue; }
    bilder.push({ src, destination: k.link }); await warte(300);
  }
  let res, id;
  if (vorhanden) {
    const alt = await mc(`/v2/smart-links/links/${vorhanden.id}`);
    if (!alt.ok || !alt.j?.data) { console.error(`Lesen der Seite ${vorhanden.id} scheitert (${alt.status}) — Abbruch.`); process.exit(1); }
    const sl = alt.j.data, altBilder = (sl.content?.images || []).filter(b => !b.deleted);
    if (altBilder.length === bilder.length && altBilder.every((b, i) => b.destination === bilder[i].destination)) { console.log('Metricool: Kacheln unverändert → nichts zu tun.'); return; }
    const perZiel = new Map(altBilder.map(b => [b.destination, b]));
    const neu = bilder.map(b => perZiel.has(b.destination) ? { ...perZiel.get(b.destination), src: b.src } : b);   // ids behalten = Klickzahlen bleiben
    res = await mc(`/v2/smart-links/links/${vorhanden.id}`, { method: 'PUT', body: { ...sl, content: { ...(sl.content || {}), images: neu } } });
    id = vorhanden.id;
  } else {
    if (!slugFrei) { console.error(`Abbruch: Slug «${SLUG}» ist nicht frei und gehört nicht zu diesem Konto.`); process.exit(1); }
    const logo = await normalisiert(LOGO);
    res = await mc('/v2/smart-links/links', { method: 'POST', body: { slug: SLUG, name: 'LuxeStyle Instagram',
      content: { header: { ...KOPF, imageUrl: logo || undefined }, buttons: KNOEPFE, images: bilder, icons: [] } } });
    id = res.j?.data?.id;
  }
  if (!res.ok || !id) { console.error(`Metricool schreibt nicht (${res.status}): ${res.t.slice(0, 300)}`); process.exit(1); }
  const zurueck = await mc(`/v2/smart-links/links/${id}`);   // Rücklesen: stimmen die Ziele?
  const ist = (zurueck.j?.data?.content?.images || []).filter(b => !b.deleted).map(b => b.destination);
  const fehlt = bilder.filter(b => !ist.includes(b.destination));
  console.log(`Metricool-Seite ${id} (https://mtr.bio/${SLUG}): ${ist.length} Kacheln zurückgelesen, ${fehlt.length} fehlen`);
  if (fehlt.length) process.exit(2);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function seitenHtml(liste) {
  const bild = u => u ? `${u}${u.includes('?') ? '&' : '?'}width=360` : '';
  const kn = KNOEPFE.map(b => `<a class="lib-k" href="${esc(b.destination)}">${esc(b.text)}</a>`).join('');
  const kach = liste.filter(k => k.produktBild).map(k => `<a class="lib-t" href="${esc(k.link)}" aria-label="${esc(k.produkt)}"><img src="${esc(bild(k.produktBild))}" alt="${esc(k.produkt)}" loading="lazy" width="360" height="360">${/Reel|TikTok|YouTube/.test(k.typ) ? '<span class="lib-r">▶</span>' : ''}</a>`).join('');
  return `<div class="lib"><style>.lib{max-width:640px;margin:0 auto;padding:16px}.lib p{margin:0 0 12px;text-align:center;font-size:15px;line-height:1.4}.lib-kn{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 16px}.lib-k{display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:999px;color:#111;text-decoration:none;font-size:14px}.lib-g{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.lib-t{position:relative;display:block;aspect-ratio:1/1;overflow:hidden;background:#f3f3f3}.lib-t img{width:100%;height:100%;object-fit:cover;display:block}.lib-r{position:absolute;top:6px;right:8px;color:#fff;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.6)}</style>`
    + `<p><strong>Gesehen auf Instagram oder TikTok? Tipp aufs Bild – du landest direkt beim Produkt.</strong><br>Versand gratis ab CHF 50 · 30 Tage Rückgabe · TWINT, Klarna, Karte</p>`
    + `<div class="lib-kn">${kn}</div><div class="lib-g">${kach}</div></div>`;
}
async function shopifySchreiben(seite, html) {
  if (kacheln.length < 5) { console.error(`Abbruch: nur ${kacheln.length} Kacheln.`); process.exit(1); }
  const felder = 'page{ id handle body } userErrors{ field message }';
  const d = seite
    ? await gql(`mutation($id:ID!,$p:PageUpdateInput!){ pageUpdate(id:$id, page:$p){ ${felder} } }`, { id: seite.id, p: { body: html } })
    : await gql(`mutation($p:PageCreateInput!){ pageCreate(page:$p){ ${felder} } }`, { p: { title: 'Direkt zum Produkt', handle: SEITE_HANDLE, body: html, isPublished: true } });
  const out = d?.pageUpdate || d?.pageCreate;
  if (!out?.page || out.userErrors?.length) { console.error('Shopify schreibt nicht:', JSON.stringify(out?.userErrors || d).slice(0, 300)); process.exit(1); }
  const z = await gql('query($id:ID!){ page(id:$id){ body } }', { id: out.page.id });   // Rücklesen
  const fehlt = kacheln.filter(k => !(z?.page?.body || '').includes(esc(k.link)));
  console.log(`Shopify-Seite ${out.page.id} (luxestyle.ch/pages/${out.page.handle}): ${kacheln.length - fehlt.length} von ${kacheln.length} Links zurückgelesen`);
  if (fehlt.length) process.exit(2);
}
