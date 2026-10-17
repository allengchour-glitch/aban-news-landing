#!/usr/bin/env node
/* LuxeStyle — cj_reviews_import.mjs  (ECHTE Käufer-Reviews von CJ → Judge.me)
 *
 * Importiert ECHTE Kundenbewertungen des EXAKT selben Produkts von der CJ-Quelle (CJ `productComments`)
 * nach Judge.me. KEINE erfundenen Reviews — der Inhalt kommt 1:1 von echten CJ-Käufern.
 *
 * Pipeline pro Produkt:
 *   Shopify-Produkt (tag:cj-real) → erste Varianten-SKU (`CJ-<sku>`) → CJ `product/query`
 *   (pid= bei reiner Ziffern-SKU, sonst variantSku= / productSku=) → pid
 *   → CJ `product/productComments?pid&score>=MIN` → (optional Gemini-DE-Übersetzung) → POST Judge.me /reviews
 *
 * No-op-safe: ohne CJ-/Judge.me-/Shopify-Creds passiert nichts (Exit 0). Idempotent über Ledger.
 * ENV: CJ_EMAIL, CJ_API_KEY · JUDGEME_PRIVATE_TOKEN [, JUDGEME_SHOP_DOMAIN] · SHOPIFY_CLIENT_ID/SECRET (o. ADMIN_TOKEN), SHOPIFY_SHOP
 *      [GEMINI_API_KEY | GROQ_API_KEY → DE-Übersetzung] · [QUERY="tag:cj-real"] · [ONLY=handle,handle] · [LIMIT=25] · [PER=6]
 *      [MIN_SCORE=4] · [DRY_RUN=1] · [LEER_TAGE=60] · [SORT=CREATED_AT REVERSE=1]
 */
import fs from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { nachDeutsch } from './lib/uebersetzen.mjs';
import { readCjResponse } from './lib/cj_response.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';

const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const JM_TOKEN = (process.env.JUDGEME_PRIVATE_TOKEN || '').trim();
const JM_DOMAIN = (process.env.JUDGEME_SHOP_DOMAIN || 'au3j0y-hq.myshopify.com').trim();
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const GROQKEY = (process.env.GROQ_API_KEY || '').trim();   // Rückfall, s. lib/uebersetzen.mjs
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = shopifyClientSecret();  // s. automation/lib/shopify_secret.mjs (vertauschte Env-Felder)
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

const QUERY = process.env.QUERY || 'tag:cj-real';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '250', 10) || 250);
const SCAN = Math.min(5000, Math.max(1, parseInt(process.env.SCAN || String(LIMIT * 5), 10) || LIMIT * 5));
const PER = Math.max(1, parseInt(process.env.PER || '8', 10) || 8);
const MIN_SCORE = Math.max(1, Math.min(5, parseInt(process.env.MIN_SCORE || '4', 10) || 4));
const DRY = process.env.DRY_RUN === '1';
const LEER_TAGE = Math.max(1, parseInt(process.env.LEER_TAGE || '60', 10) || 60);  // so lange gilt „CJ hat nichts"
const SORT = (process.env.SORT || '').toUpperCase();        // z. B. UPDATED_AT, CREATED_AT, TITLE
const REVERSE = process.env.REVERSE === '1';                // mit SORT: andere Katalogregion abgrasen

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const SHOP_API = '2025-01';
const JM_API = 'https://judge.me/api/v1/reviews';
const TOKEN_FILE = process.env.CJ_TOKEN_CACHE || '/tmp/cj_token.json';
const LEDGER = 'dropship/cj_reviews_done.txt';
// Zweites Ledger: Produkte, bei denen CJ NICHTS hatte. Ohne das kostet jeder Lauf erneut
// Punkte fuer dieselben leeren Produkte — und gemessen am 2026-10-17 sind das 90-98 % aller
// geprueften (siehe dropship/CJ-REVIEWS-QUOTE-1710.md). 20 Punkte je Produkt, Tagesvorrat
// ~69 000: ohne Gedaechtnis fuer Leerlaeufe kommt man nie tief in den Katalog.
const LEER = 'dropship/cj_reviews_leer.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Guards (No-op statt Fehler) ──
if (!CJ_EMAIL || !CJ_API_KEY) { console.log('Keine CJ-Creds (CJ_EMAIL/CJ_API_KEY) → No-op.'); process.exit(0); }
if (!JM_TOKEN) { console.log('Kein JUDGEME_PRIVATE_TOKEN → No-op.'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// ── Shopify ──
async function sgql(tok, q, v) {
  return { data: await shopifyGql(SHOP, SHOP_API, tok, q, v) };
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  const roh = await r.text();
  let j = {}; try { j = JSON.parse(roh); } catch {}
  // Den Grund NENNEN. Ein stiller Fehlschlag sieht aus wie „keine Creds" und kostet
  // die naechste Sitzung Stunden (gemessen 2026-10-17: HTTP 400, weil der Secret-Wert
  // 60 statt 38 Zeichen lang war).
  if (!r.ok) console.error(`  Shopify-Grant HTTP ${r.status}: ${String(j.error_description || j.error || roh).slice(0, 160)}  (client_secret ${CSEC.length} Zeichen)`);
  return j.access_token || null;
}
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── CJ ──
async function cjToken() {
  try { if (fs.existsSync(TOKEN_FILE)) { const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); if (t.exp > Date.now() + 60000) return t.accessToken; } } catch {}
  // CJ erwartet das Feld 'password' fuer den API-Key (2026 verifiziert). 'apiKey' als Fallback.
  let j = {};
  for (const field of ['password', 'apiKey']) {
    const r = await fetch(`${CJ_BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: CJ_EMAIL, [field]: CJ_API_KEY }) });
    j = await r.json().catch(() => ({}));
    if (j?.result && j?.data?.accessToken) break;
  }
  if (!j.result || !j?.data?.accessToken) {
    console.log('⚠️  CJ-Auth fehlgeschlagen → No-op. Meldung: ' + (j.message || JSON.stringify(j).slice(0, 160)));
    console.log('    → CJ_API_KEY im CJ-Dashboard (My CJ → Authorization → API) neu generieren & GitHub-Secret aktualisieren.');
    return null;
  }
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 })); } catch {}
  return j.data.accessToken;
}
async function cjGet(tok, path, params) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${CJ_BASE}${path}?${qs}`, { headers: { 'CJ-Access-Token': tok } });
  return readCjResponse(r, path);
}

// ── DE-Übersetzung: Gemini zuerst, Groq als Rückfall ──
// Begründung + Tests in automation/lib/uebersetzen.mjs. Kurz: die Gemini-Credits sind
// aufgebraucht (HTTP 402), GROQ_API_KEY ist gesetzt und funktioniert. Scheitert beides,
// kommen die ORIGINALTEXTE zurück — eine Bewertung in der Originalsprache ist ehrlich,
// eine erfundene Übersetzung wäre es nicht.
let uebersetzWeg = '';
async function translateDE(texts) {
  const r = await nachDeutsch(texts, { geminiKey: GKEY, groqKey: GROQKEY });
  if (r.weg !== uebersetzWeg) {
    uebersetzWeg = r.weg;
    if (r.weg === 'original') console.error(`  Übersetzung nicht möglich, nutze Originalsprache: ${r.grund}`);
    else console.log(`  Übersetzung über ${r.weg}.`);
  }
  return r.texte;
}

// ── Judge.me POST ──
async function jmPost(pid, r) {
  const body = { shop_domain: JM_DOMAIN, platform: 'shopify', id: pid,
    name: r.name || 'CJ-Kundenbewertung',
    email: r.email || `cj-import+${Math.random().toString(36).slice(2, 9)}@luxestyle.ch`,
    rating: Math.max(1, Math.min(5, Number(r.rating) || 5)), title: r.title || '', body: r.body || '', api_token: JM_TOKEN };
  if (r.created_at) body.created_at = r.created_at;
  if (Array.isArray(r.picture_urls) && r.picture_urls.length) body.picture_urls = r.picture_urls.slice(0, 3);
  const res = await fetch(JM_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, text: (await res.text()).slice(0, 160) };
}

const numId = (gid) => String(gid).split('/').pop();
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);

// Leer-Ledger: pid<TAB>JJJJ-MM-TT. Eintraege, die aelter als LEER_TAGE sind, zaehlen nicht mehr —
// CJ bekommt mit der Zeit neue Kommentare, ein „leer" ist kein Urteil fuer immer.
const heute = new Date().toISOString().slice(0, 10);
const leerMap = new Map();
if (fs.existsSync(LEER)) {
  for (const z of fs.readFileSync(LEER, 'utf8').split('\n')) {
    const [id, datum] = z.trim().split(/\s+/);
    if (id) leerMap.set(id, datum || '1970-01-01');
  }
}
const leerFrisch = (id) => {
  const d = leerMap.get(id);
  if (!d) return false;
  const alter = (Date.parse(heute) - Date.parse(d)) / 864e5;
  return Number.isFinite(alter) && alter < LEER_TAGE;
};
let leerUebersprungen = 0, leerNeu = 0;
const merkeLeer = (id, grund) => {
  if (DRY || leerFrisch(id)) return;
  leerMap.set(id, heute); leerNeu++;
  try { fs.appendFileSync(LEER, `${id}\t${heute}\t${grund}\n`); }
  catch (e) { console.error(`  ⚠️  LEER-LEDGER nicht geschrieben (${id}): ${e.message}`); }
};

(async () => {
  const stok = await sToken();
  if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op. (Grund steht in der Zeile darueber.)'); process.exit(0); }

  // Produkte holen
  const q = ONLY.length ? ONLY.map(h => `handle:${h}`).join(' OR ') : QUERY;
  // Cursor-Pagination: sammelt bis LIMIT Produkte ueber mehrere Seiten (Shopify max 250/Seite)
  const prods = [];
  let cursor = null;
  let scanned = 0, hasMore = false;
  while (prods.length < LIMIT && scanned < SCAN) {
    const page = Math.min(250, LIMIT - prods.length, SCAN - scanned);
    const sortTeil = SORT ? `, sortKey:${SORT}, reverse:${REVERSE}` : '';
    const pr = await sgql(stok, `query($q:String!,$n:Int!,$c:String){ products(first:$n, query:$q, after:$c${sortTeil}){ pageInfo{ hasNextPage endCursor } edges{ node{ id title handle variants(first:1){ edges{ node{ sku } } } } } } }`, { q, n: page, c: cursor });
    const conn = pr?.data?.products;
    if (!conn || !Array.isArray(conn.edges)) throw new Error('Shopify: Produktliste fehlt, Scan nicht als leer werten');
    scanned += conn.edges.length;
    hasMore = !!conn.pageInfo?.hasNextPage;
    console.log(`SCAN: ${scanned}/${SCAN}, ${prods.length}/${LIMIT} Kandidaten vor dieser Seite`);
    const roh = (conn?.edges || []).map(e => e.node).filter(x => !done.has(numId(x.id)));
    const batch = roh.filter(x => { if (leerFrisch(numId(x.id))) { leerUebersprungen++; return false; } return true; });
    prods.push(...batch);
    if (!hasMore) break;
    cursor = conn.pageInfo.endCursor;
    await sleep(250);
  }
  console.log(`Teilmessung: ${scanned} Produkte geprüft; weitere Seiten: ${hasMore ? 'ja' : 'nein'}.`);
  console.log(`${prods.length} Produkt(e) zu prüfen (QUERY="${q}", LIMIT=${LIMIT}${SORT ? `, SORT=${SORT}${REVERSE ? ' umgekehrt' : ''}` : ''})${DRY ? ' [DRY]' : ''}`
    + (leerUebersprungen ? ` · ${leerUebersprungen} übersprungen, weil CJ dort vor < ${LEER_TAGE} Tagen nichts hatte` : ''));
  if (!prods.length) { console.log('Nichts zu tun.'); process.exit(0); }

  const ctok = await cjToken();
  if (!ctok) process.exit(0);
  console.log('CJ-Token ok.');

  const DEBUG = process.env.DEBUG === '1';
  // CJ-pid robust auflösen: mehrere Strategien (manche SKUs sind Varianten-, andere Produkt-SKUs).
  async function resolvePid(sku) {
    // Reihenfolge nach Messung 2026-10-04: der aktuelle Katalog nutzt VARIANTEN-SKUs
    // (z. B. CJYD291530101AZ) → variantSku zuerst = 1 Abfrage statt 2. Die beiden
    // /product/list-Strategien sind entfernt: sie kosten CJ-API-Punkte und trafen nie.
    //
    // ⚠️ 2026-10-04 nachgemessen: 4466 von 12 000 aktiven cj-real-Produkten (37,2 %) tragen
    // als SKU eine reine Ziffernfolge — das IST die CJ-pid, keine SKU. Für die trafen weder
    // variantSku noch productSku, sie wurden alle still als „keine CJ-pid → skip" verworfen
    // (dieselbe Fehlerklasse wie der apiKey/password-Auth-Bug: ein stummer Skip sieht aus
    // wie „keine Daten"). Belegt an 2502070858141620900 → pid-Abfrage trifft sofort und
    // lieferte 8 echte Reviews auf einer Seite, die vorher als leer galt.
    const istPid = /^\d{15,}$/.test(sku);
    const strategies = istPid ? [
      ['query/pid', '/product/query', { pid: sku }],
      ['query/variantSku', '/product/query', { variantSku: sku }],
    ] : [
      ['query/variantSku', '/product/query', { variantSku: sku }],
      ['query/productSku', '/product/query', { productSku: sku }],
    ];
    for (const [label, path, params] of strategies) {
      const r = await cjGet(ctok, path, params);
      await sleep(1100);
      // CJ-Tagespunkte erschoepft? Dann NICHT als "keine pid" verschleiern — sonst entsteht
      // wieder der Fehlschluss "CJ hat keine Kommentare" (teuer gelernt 2026-09/10).
      if (/insufficient api points/i.test(String(r?.message || ''))) {
        throw new Error('CJ_QUOTA: ' + r.message);
      }
      const d = r?.data;
      const listed = d?.list || d?.content || (Array.isArray(d) ? d : null);
      const pid = d?.pid || d?.productId || (Array.isArray(listed) ? (listed[0]?.pid || listed[0]?.productId) : null);
      if (DEBUG) console.log(`    [DEBUG] ${label}(${sku}) → ${r?.result === false ? 'result:false ' + (r?.message || '') : (pid || 'kein pid')}`);
      if (pid) return { pid, via: label };
    }
    return null;
  }

  let totalReviews = 0, prodWith = 0, fails = 0;
  for (const p of prods) {
    const pidNum = numId(p.id);
    const rawSku = p.variants?.edges?.[0]?.node?.sku || '';
    const cjSku = rawSku.replace(/^CJ-/i, '').trim();
    if (!cjSku) { console.log(`· ${p.handle}: keine SKU → skip`); continue; }
    // Nicht-CJ-Quellen (BigBuy/Printful/POD) gar nicht bei CJ anfragen — spart Quota + Zeit
    if (/^(bb-|pf-|printful|pod-)/i.test(cjSku)) { console.log(`· ${p.handle}: SKU ${cjSku} ist keine CJ-Quelle → skip`); continue; }
    try {
      const resolved = await resolvePid(cjSku);
      const cjpid = resolved?.pid;
      if (!cjpid) { console.log(`· ${p.handle}: keine CJ-pid für ${cjSku} → skip`); merkeLeer(pidNum, 'keine-pid'); continue; }
      if (DEBUG) console.log(`    [DEBUG] ${p.handle}: pid ${cjpid} via ${resolved.via}`);
      const cr = await cjGet(ctok, '/product/productComments', { pid: cjpid, pageNum: 1, pageSize: 30 });
      await sleep(1100);
      const list = cr?.data?.list || cr?.data?.comments || cr?.data?.content || cr?.data?.commentList || (Array.isArray(cr?.data) ? cr.data : []);
      if (DEBUG) console.log(`    [DEBUG] comments(${cjpid}): result=${cr?.result} dataKeys=${cr?.data && typeof cr.data === 'object' ? Object.keys(cr.data).join(',') : typeof cr?.data} listLen=${Array.isArray(list) ? list.length : 'n/a'}${cr?.message ? ' msg=' + cr.message : ''}`);
      const picked = (list || [])
        .filter(c => Number(c.score) >= MIN_SCORE && (c.comment || '').trim().length >= 8)
        .slice(0, PER);
      if (!picked.length) { console.log(`· ${p.handle}: 0 echte ≥${MIN_SCORE}★-Kommentare bei CJ → skip`); merkeLeer(pidNum, 'keine-kommentare'); continue; }

      const bodiesDE = await translateDE(picked.map(c => c.comment.trim()));
      let sent = 0;
      for (let i = 0; i < picked.length; i++) {
        const c = picked[i];
        const rev = {
          name: (c.commentUser || '').trim() || 'CJ-Kundenbewertung',
          rating: Number(c.score) || 5,
          body: bodiesDE[i] || c.comment.trim(),
          created_at: (c.commentDate || '').slice(0, 10) || undefined,
          picture_urls: (Array.isArray(c.commentUrls) ? c.commentUrls : []).filter(u => /^https?:\/\//.test(u)),
        };
        if (DRY) { console.log(`  [DRY] ${p.handle} ★${rev.rating} ${rev.body.slice(0, 50)}`); sent++; continue; }
        const out = await jmPost(pidNum, rev);
        if (out.ok) { sent++; } else { fails++; console.error(`  ✗ ${p.handle} HTTP ${out.status}: ${out.text}`); }
        await sleep(700);
      }
      if (sent) { prodWith++; totalReviews += sent; console.log(`✓ ${p.handle}: ${sent} echte Reviews (CJ-pid ${cjpid})`); }
      // Ledger laut melden, wenn er nicht geschrieben werden kann: ohne Eintrag importiert
      // der naechste Lauf dieselben Reviews ein zweites Mal. Der stumme catch hat das
      // verdeckt (2026-10-04 aufgefallen, nachdem ein versehentliches `git checkout -- .`
      // den frischen Eintrag zurueckgesetzt hatte und niemand es gemerkt haette).
      if (!DRY) {
        try { fs.appendFileSync(LEDGER, pidNum + '\n'); }
        catch (e) { console.error(`  ⚠️  LEDGER NICHT GESCHRIEBEN fuer ${p.handle} (${pidNum}): ${e.message}`); console.error('     Ohne Eintrag importiert der naechste Lauf diese Reviews doppelt.'); }
      }
    } catch (e) {
      if (String(e.message).startsWith('CJ_QUOTA')) {
        fails++;
        console.error(`\n⛔ CJ-TAGESPUNKTE ERSCHOEPFT — Lauf hier beendet (${e.message}).`);
        console.error('   Das ist KEIN Hinweis darauf, dass die Produkte keine Reviews haben!');
        console.error('   Morgen erneut laufen lassen (Punkte setzen taeglich zurueck) oder LIMIT kleiner setzen.');
        break;
      }
      fails++; console.error(`✗ ${p.handle}: ${e.message}`);
    }
  }
  console.log(`\nFertig: ${totalReviews} echte Reviews auf ${prodWith} Produkt(e)${DRY ? ' [DRY]' : ''}${fails ? `, ${fails} Fehler` : ''}.`);
  process.exit(fails ? 1 : 0);
})();
