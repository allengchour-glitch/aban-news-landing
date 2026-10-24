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
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { bewerteAntwort } from './lib/judgeme_antwort.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { reviewKey, loadReviewStates, recordReviewState } from './lib/cj_review_ledger.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';

const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const JM_TOKEN = (process.env.JUDGEME_PRIVATE_TOKEN || '').trim();
const JM_DOMAIN = (process.env.JUDGEME_SHOP_DOMAIN || 'au3j0y-hq.myshopify.com').trim();
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const GROQKEY = (process.env.GROQ_API_KEY || '').trim();   // Rückfall, s. lib/uebersetzen.mjs
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = shopifyClientSecret();  // s. automation/lib/shopify_secret.mjs (vertauschte Env-Felder)
const SHOP = normalizeShopifyHost(process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com');

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
const JM_WIDGET = 'https://judge.me/reviews/reviews_for_widget';
const TOKEN_FILE = process.env.CJ_TOKEN_CACHE || '/tmp/cj_token.json';
const LEDGER = 'dropship/cj_reviews_done.txt';
const ITEM_LEDGER = 'dropship/cj_review_items.jsonl';
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

// Vor dem Lesen des Review-Ledgers exklusiv sperren. Auch zwei lokale Aufrufe
// dürfen nicht denselben sending-Checkpoint unabhängig voneinander anlegen.
if (!DRY) {
  const lock = `${ITEM_LEDGER}.lock`;
  let fd;
  try { fd = fs.openSync(lock,'wx',0o600); }
  catch (error) {
    console.error(error.code === 'EEXIST'
      ? 'CJ_REVIEW_LOCK: Import gesperrt; aktiven Lauf und unklare Ergebnisse vor Entfernen der Sperre abgleichen'
      : 'CJ_REVIEW_LOCK: Sperre konnte nicht angelegt werden');
    process.exit(1);
  }
  process.on('exit',() => { try { fs.closeSync(fd); fs.unlinkSync(lock); } catch {} });
}

// ── Shopify ──
async function sgql(tok, q, v) {
  return { data: await shopifyGql(SHOP, SHOP_API, tok, q, v) };
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', redirect:'error', signal:AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
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
async function cjGet(tok, path, params, weicheCodes) {
  const qs = new URLSearchParams(params).toString();
  // Mit Geduld: CJ erlaubt ~1 Abfrage/Sekunde und antwortet sonst mit HTTP 429. Ohne
  // Wiederholung verbrennt jeder 429 ein Produkt, das nie geprueft wurde (gemessen
  // 2026-10-17: 36 von 45 Fehlern in einem Lauf). Siehe automation/lib/cj_fetch.mjs.
  return cjFetch(`${CJ_BASE}${path}?${qs}`, { headers: { 'CJ-Access-Token': tok }, context: path, weicheCodes });
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
  const text = await res.text();
  let result;
  try { result = JSON.parse(text); } catch {}
  // Lesart der Antwort samt Gegenproben: automation/lib/judgeme_antwort.mjs
  return { ...bewerteAntwort(res.status, result), status: res.status };
}

// Gegenprobe zum Abgleich: der Produktfilter der Judge.me-Liste wird STILL IGNORIERT
// (gemessen 2026-10-17: `external_id=99999999` liefert dieselben 5 neuesten Bewertungen wie
// ohne Filter — dieselbe Falle wie der Metafeld-Filter in der Shopify-Produktsuche). Darum
// die neuesten Bewertungen OHNE Filter lesen und selbst auf Produkt + Text pruefen.
/**
 * Bewertungstexte EINES Produkts aus Judge.me lesen.
 *
 * Nachgemessen 2026-10-18: die Admin-Liste `/api/v1/reviews` ignoriert jeden Produktfilter
 * still (external_id, product_external_id, product_id und sogar ein erfundenes handle
 * liefern dieselben 20 Bewertungen aus 8 Produkten). Die oeffentliche Widget-Antwort
 * filtert dagegen wirklich: sie nennt Produktname, Anzahl und genau die Bewertungen dieses
 * Produkts. Darum wird hier sie gelesen — ohne Zugangsdaten, nur lesend, 1 Abfrage je Produkt.
 */
const textCache = new Map();
function nurText(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
async function jmProduktTexte(pid, frisch = false) {
  const schluessel = String(pid);
  if (!frisch && textCache.has(schluessel)) return textCache.get(schluessel);
  const texte = new Set();
  const qs = new URLSearchParams({ url: JM_DOMAIN, shop_domain: JM_DOMAIN, platform: 'shopify',
    product_id: schluessel, per_page: '100' });
  try {
    const res = await fetch(`${JM_WIDGET}?${qs}`);
    if (!res.ok) { console.error(`  Shop-Abgleich nicht moeglich: Judge.me HTTP ${res.status} (Produkt ${schluessel})`); return texte; }
    const j = await res.json();
    for (const r of (Array.isArray(j?.reviews) ? j.reviews : [])) {
      const t = nurText(r?.body_html ?? r?.body);
      if (t) texte.add(t);
    }
  } catch (e) { console.error(`  Shop-Abgleich nicht moeglich: ${e.message} (Produkt ${schluessel})`); return texte; }
  textCache.set(schluessel, texte);
  return texte;
}

// Nach einem POST mit HTTP 201 OHNE Review-ID: frisch nachlesen und auf den Text pruefen.
async function jmAbgleich(pid, bodies) {
  const vorhanden = await jmProduktTexte(pid, true);
  const treffer = new Set();
  for (const b of bodies) {
    const t = nurText(b) || String(b).trim();
    if (vorhanden.has(t)) treffer.add(String(b).trim());
  }
  return treffer;
}

const numId = (gid) => String(gid).split('/').pop();
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
const reviewStates = loadReviewStates(ITEM_LEDGER);

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
      // Weiche Codes mitgeben (siehe automation/lib/cj_fetch.mjs): „nicht gefunden" und
      // „ausgelistet" sind Antworten. Ohne das brach die Strategie-Kette beim ersten
      // Versuch ab — gemessen 2026-10-18: ein DRY-Lauf ueber tag:elektronik meldete
      // 10 Fehler mit code 1602002/1602003, obwohl CJ fuer dieselben pids weiter
      // Kommentare liefert.
      const r = await cjGet(ctok, path, params, WEICHE_CODES);
      await sleep(1100);
      // CJ-Tagespunkte erschoepft? Dann NICHT als "keine pid" verschleiern — sonst entsteht
      // wieder der Fehlschluss "CJ hat keine Kommentare" (teuer gelernt 2026-09/10).
      if (/insufficient api points/i.test(String(r?.message || ''))) {
        throw new Error('CJ_QUOTA: ' + r.message);
      }
      if (r?.result !== true) {
        const code = Number(r?.code);
        // Ausgelistet heisst NICHT unlesbar: `product/productComments` antwortet fuer genau
        // diese pid weiter mit code 200 (nachgeprueft an 2038889763034939394). Die Bewertungen
        // echter Kaeufer:innen bleiben abrufbar — CJ kann das Produkt nur nicht mehr
        // nachliefern. Das ist eine Lieferfrage, keine Bewertungsfrage.
        if (params.pid && (code === 1602002 || code === 1602003)) {
          ausgelistet++;
          if (DEBUG) console.log(`    [DEBUG] ${label}(${sku}) → ausgelistet (code ${code}), pid trotzdem nutzbar`);
          return { pid: params.pid, via: label + '/ausgelistet' };
        }
        if (DEBUG) console.log(`    [DEBUG] ${label}(${sku}) → code ${code}: ${r?.message || ''}`);
        continue;
      }
      const d = r?.data;
      const listed = d?.list || d?.content || (Array.isArray(d) ? d : null);
      const pid = d?.pid || d?.productId || (Array.isArray(listed) ? (listed[0]?.pid || listed[0]?.productId) : null);
      if (DEBUG) console.log(`    [DEBUG] ${label}(${sku}) → ${r?.result === false ? 'result:false ' + (r?.message || '') : (pid || 'kein pid')}`);
      if (pid) return { pid, via: label };
    }
    return null;
  }

  let totalReviews = 0, prodWith = 0, fails = 0, ausgelistet = 0;
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
      const list = cr?.data?.list ?? cr?.data?.comments ?? cr?.data?.content ?? cr?.data?.commentList ?? (Array.isArray(cr?.data) ? cr.data : null);
      if (!Array.isArray(list)) throw new Error('CJ_DATA: Kommentar-Liste fehlt; nicht als leeres Produkt speichern');
      if (DEBUG) console.log(`    [DEBUG] comments(${cjpid}): result=${cr?.result} dataKeys=${cr?.data && typeof cr.data === 'object' ? Object.keys(cr.data).join(',') : typeof cr?.data} listLen=${Array.isArray(list) ? list.length : 'n/a'}${cr?.message ? ' msg=' + cr.message : ''}`);
      const picked = (list || [])
        .filter(c => Number(c.score) >= MIN_SCORE && (c.comment || '').trim().length >= 8)
        .slice(0, PER);
      if (!picked.length) { console.log(`· ${p.handle}: 0 echte ≥${MIN_SCORE}★-Kommentare bei CJ → skip`); merkeLeer(pidNum, 'keine-kommentare'); continue; }

      const bodiesDE = await translateDE(picked.map(c => c.comment.trim()));
      let sent = 0, schonDa = 0, complete = true;
      const offen = [];   // gesendet, Antwort ohne ID → wird gleich nachgelesen
      for (let i = 0; i < picked.length; i++) {
        const c = picked[i];
        const key = reviewKey(pidNum,cjpid,c);
        const previous = reviewStates.get(key);
        if (previous === 'sent') { console.log(`  Bereits importierte Bewertung übersprungen (${key.slice(0,12)})`); continue; }
        if (previous === 'sending' || previous === 'uncertain') {
          complete = false; fails++;
          console.error(`  CJ_REVIEW_UNCERTAIN: ${key.slice(0,12)} vor erneutem Import in Judge.me abgleichen`);
          continue;
        }
        const rev = {
          name: (c.commentUser || '').trim() || 'CJ-Kundenbewertung',
          rating: Number(c.score) || 5,
          body: bodiesDE[i] || c.comment.trim(),
          created_at: (c.commentDate || '').slice(0, 10) || undefined,
          picture_urls: (Array.isArray(c.commentUrls) ? c.commentUrls : []).filter(u => /^https?:\/\//.test(u)),
        };
        if (DRY) { console.log(`  [DRY] ${p.handle} ★${rev.rating} ${rev.body.slice(0, 50)}`); sent++; continue; }
        // Liegt genau dieser Text beim Produkt schon im Shop, ist er importiert — egal unter
        // welchem Schluessel. Dann nur den Zustand nachfuehren, nicht erneut senden.
        const bekannt = await jmProduktTexte(pidNum);
        if (bekannt.has(nurText(rev.body) || rev.body.trim())) {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'sent'); schonDa++;
          console.log(`  Im Shop schon vorhanden, nicht erneut gesendet (${key.slice(0,12)})`);
          continue;
        }
        // Intent vor dem externen POST dauerhaft festhalten. Ein abgebrochener Lauf
        // mit unbekanntem Ergebnis darf denselben Kommentar nicht blind wiederholen.
        recordReviewState(ITEM_LEDGER,reviewStates,key,'sending');
        let out;
        try { out = await jmPost(pidNum, rev); }
        catch {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'uncertain');
          complete = false; fails++;
          console.error(`  CJ_REVIEW_UNCERTAIN: Netzwerkfehler bei ${key.slice(0,12)}; erst abgleichen`);
          continue;
        }
        if (out.ok) {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'sent'); sent++;
        } else if (out.abgleichen) {
          // Zustand bleibt 'sending': bricht der Lauf hier ab, gilt die Bewertung beim
          // naechsten Mal als unklar und wird NICHT blind ein zweites Mal gesendet.
          offen.push({ key, body: rev.body });
        } else {
          recordReviewState(ITEM_LEDGER,reviewStates,key,out.uncertain?'uncertain':'failed');
          complete = false; fails++; console.error(`  Import nicht bestätigt: ${p.handle}, HTTP ${out.status}${out.uncertain ? '; vor Wiederholung abgleichen' : '; Anfrage abgelehnt'}`);
        }
        await sleep(700);
      }
      if (offen.length) {
        const gefunden = await jmAbgleich(pidNum, offen.map(o => o.body));
        for (const o of offen) {
          if (gefunden.has(String(o.body).trim())) {
            recordReviewState(ITEM_LEDGER,reviewStates,o.key,'sent'); sent++;
          } else {
            recordReviewState(ITEM_LEDGER,reviewStates,o.key,'uncertain');
            complete = false; fails++;
            console.error(`  CJ_REVIEW_UNCERTAIN: ${o.key.slice(0,12)} im Shop nicht gefunden; vor Wiederholung abgleichen`);
          }
        }
      }
      if (sent) { prodWith++; totalReviews += sent; console.log(`✓ ${p.handle}: ${sent} echte Reviews (CJ-pid ${cjpid})`); }
      else if (schonDa) console.log(`· ${p.handle}: ${schonDa} Bewertung(en) lagen schon im Shop`);
      // Ledger laut melden, wenn er nicht geschrieben werden kann: ohne Eintrag importiert
      // der naechste Lauf dieselben Reviews ein zweites Mal. Der stumme catch hat das
      // verdeckt (2026-10-04 aufgefallen, nachdem ein versehentliches `git checkout -- .`
      // den frischen Eintrag zurueckgesetzt hatte und niemand es gemerkt haette).
      if (!DRY && complete) {
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
      // Haelt die Drosselung auch nach allen Wiederholungen an, ist weiterlaufen sinnlos:
      // jedes weitere Produkt wuerde als „Fehler" gezaehlt, OBWOHL es nie geprueft wurde.
      if (String(e.message).startsWith('CJ_THROTTLED')) {
        fails++;
        console.error(`\n⏳ CJ DROSSELT DAUERHAFT — Lauf hier beendet (${e.message}).`);
        console.error('   Die uebrigen Produkte sind NICHT geprueft und NICHT als leer vermerkt.');
        console.error('   Spaeter erneut laufen lassen, LIMIT kleiner setzen.');
        break;
      }
      fails++; console.error(`✗ ${p.handle}: ${e.message}`);
    }
  }
  console.log(`\nFertig: ${totalReviews} echte Reviews auf ${prodWith} Produkt(e)${DRY ? ' [DRY]' : ''}${fails ? `, ${fails} Fehler` : ''}${ausgelistet ? `, ${ausgelistet} bei CJ ausgelistet (Bewertungen trotzdem lesbar)` : ''}.`);
  process.exit(fails ? 1 : 0);
})();
