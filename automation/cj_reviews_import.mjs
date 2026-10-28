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
 *      [GEMINI_API_KEY | GROQ_API_KEY (auch _2 bis _4) → DE-Übersetzung] · [QUERY="tag:cj-real"] · [ONLY=handle,handle] · [LIMIT=25] · [PER=6]
 *      [MIN_SCORE=4] · [LEER_TAGE=60] · [SORT=CREATED_AT REVERSE=1]
 *      DRY_RUN: **live NUR bei DRY_RUN=0**. Fehlt die Variable oder hat sie einen anderen Wert ('1', 'true', leer ...), ist es ein Trockenlauf.
 *      ALLOW_ORIGINAL=1: erlaubt ausdrücklich, Kommentare UNübersetzt zu senden (sonst wartet das Produkt, bis die Übersetzung geht).
 *
 * SICHERHEITSREGELN (Funde der Prüfung 28.10.2026):
 *  - Shop-Abgleich nicht lesbar (HTTP-Fehler/Netz) → NICHT senden. „Unbekannt" ist nicht „nicht im Shop".
 *  - Übersetzung fällt aus (und der Text ist nicht schon deutsch) → Produkt in dieser Runde NICHT senden, Fehler zählen, Exit 1.
 *  - Judge.me drosselt: HTTP 429 beim POST → einmal warten (Retry-After, sonst 5 s) und wiederholen, bei erneutem 429 Lauf beenden.
 *    HTTP 503 beim POST → Ergebnis unbekannt: „uncertain", NICHT wiederholt, Lauf beenden. Widget 429/503 → Lauf beenden. Nie umgehen.
 *  - „sending"/„uncertain" im Ledger → zuerst im Shop abgleichen: Text da → „sent"; sonst bleibt es unklar. Nie blind wiederholen.
 *  - Fällt etwas anderes als 429/503 aus, wird nicht je Bewertung neu gefragt: ein unlesbares Widget gilt für das Produkt bis Laufende als
 *    „unbekannt", nach 3 unlesbaren Produkten in Folge endet der Lauf. Dasselbe gilt für die Übersetzung (3 Produkte in Folge zurückgehalten).
 *  - Sternewerte: nur ganze Zahlen 1 bis 5 zählen. Fehlt der Wert (leer/null), zählt der Kommentar als „unter MIN_SCORE" (leer erlaubt). Ist er
 *    vorhanden, aber unbrauchbar (6, 4.5, 'abc', [5]), wird er gemeldet; sind ALLE Werte eines Produkts so, ist das ein Fehler (Exit 1, kein „leer").
 *
 * DUBLETTENSCHUTZ — was geschützt ist und was nicht (die Übersetzung ist NICHT deterministisch, temperature 0.3):
 *  1. Ledger-Schlüssel (reviewKey) + Zustand je Bewertung in dropship/cj_review_items.jsonl. Schützt, solange das Ledger da ist.
 *  2. Die GESENDETE (übersetzte) Fassung steht im Ledger-Eintrag (Feld body) und wird beim Wiederaufnehmen wiederverwendet, statt neu
 *     zu übersetzen. Nur so kann der Shop-Abgleich einen unklaren Eintrag später auflösen.
 *  3. Textabgleich gegen das öffentliche Judge.me-Widget: verglichen werden die gesendete Fassung UND der CJ-Originaltext. Das Widget
 *     liefert nur, was im Shop steht — der Originaltext trifft also nur Bewertungen, die früher UNübersetzt gesendet wurden.
 *  NICHT geschützt: Ist das Ledger ganz verloren (oder der Schlüssel geändert) UND wurde übersetzt gesendet, trifft der Textabgleich
 *  nicht (eine neue Übersetzung formuliert anders) → Doppelte möglich. Dann vor dem Lauf den Shop prüfen.
 *  Nicht gelöst (bewusst, kleine Funde): gleicher Text eines anderen Käufers gilt als vorhanden; nur Kommentarseite 1; nur die erste
 *  Variante bestimmt die CJ-SKU; ein Kommentar, den der Übersetzer dauerhaft leer zurückgibt, hält sein ganzes Produkt zurück (Entscheid offen:
 *  die übrigen senden oder alles zurückhalten). Kein Zeitlimit am CJ-Token-Abruf.
 */
import fs from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { nachDeutsch, wirktDeutsch } from './lib/uebersetzen.mjs';
import { maskiereName } from './lib/kundenstimmen.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { bewerteAntwort } from './lib/judgeme_antwort.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { reviewKey, loadReviewStates, recordReviewState, reviewBody } from './lib/cj_review_ledger.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';

const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const JM_TOKEN = (process.env.JUDGEME_PRIVATE_TOKEN || '').trim();
const JM_DOMAIN = (process.env.JUDGEME_SHOP_DOMAIN || 'au3j0y-hq.myshopify.com').trim();
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
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
// Live NUR bei ausdrücklich DRY_RUN=0 (Vorgabe = Trockenlauf). Ein Tippfehler ('true', 'TRUE', leer) kostet sonst echte, nicht zurückholbare Bewertungen.
const DRY = process.env.DRY_RUN !== '0';
const ALLOW_ORIGINAL = process.env.ALLOW_ORIGINAL === '1';   // bewusstes Original (ohne Übersetzung) nur mit ausdrücklichem Schalter
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
// aufgebraucht (HTTP 402); Groq springt ein, mit bis zu vier Schlüsseln (GROQ_API_KEY, _2 bis _4,
// jeder mit eigenem Tageslimit). Die Bibliothek liest sie selbst aus der Umgebung: hier KEIN groqKey
// übergeben, sonst bliebe es bei Schlüssel 1 und ein erschöpfter Schlüssel legte den Import lahm.
// Scheitert alles, kommen die Originaltexte zurück, aber der Aufrufer SENDET sie nicht
// (nur mit ALLOW_ORIGINAL=1 oder wenn sie schon deutsch wirken).
//
// Liefert {texte, weg, grund, fehlt}: `fehlt` nennt die Stellen, an denen NICHT übersetzt wurde (alle bei weg 'original').
let uebersetzWeg = '';
async function translateDE(texts) {
  const r = await nachDeutsch(texts, { geminiKey: GKEY });
  if (r.weg !== uebersetzWeg) {
    uebersetzWeg = r.weg;
    if (r.weg === 'original') console.error(`  Übersetzung nicht möglich: ${r.grund}${ALLOW_ORIGINAL ? ' → sende Originalsprache (ALLOW_ORIGINAL=1)' : ' → Texte ohne deutsche Fassung bleiben liegen'}`);
    else console.log(`  Übersetzung über ${r.weg}.`);
  }
  return r;
}

// ── Anzeigename: nur die von CJ schon maskierte Form („C***t") darf durch; sonst wird maskiert ──
// Ein Klarname oder eine E-Mail-Adresse stünde sonst öffentlich im Schweizer Shop (nDSG).
const MASKIERT = /^\p{L}\*{3}\p{L}$/u;
function anzeigeName(roh) {
  const n = String(roh ?? '').trim();
  if (MASKIERT.test(n)) return n;
  return maskiereName(n) || 'CJ-Kundenbewertung';
}

// ── Sterne: nur ganze Zahlen 1 bis 5. Alles andere ist eine kaputte Quelle und wird verworfen, nicht geklemmt ──
function sterneAus(wert) {
  if (typeof wert !== 'number' && !(typeof wert === 'string' && wert.trim() !== '')) return null;
  const n = Number(wert);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
// „Keine Angabe" (fehlt, null, leer) ist etwas anderes als ein kaputter Wert (6, 4.5, 'abc', [5]): nur der kaputte wird gemeldet.
const sterneOhneAngabe = (wert) => wert === undefined || wert === null || (typeof wert === 'string' && wert.trim() === '');

// ── Judge.me POST ──
// Zeitlimit auf jedem Judge.me-Aufruf: ein hängender Aufruf darf den Lauf nicht bis zum Workflow-Limit blockieren.
// Beim POST heisst Abbruch „Ergebnis unbekannt" (Aufrufer: uncertain), nie „nicht gesendet".
const JM_ZEITLIMIT_MS = 30000;
const JM_PAUSE_MS = 5000;     // Wartezeit nach HTTP 429, wenn Judge.me keinen Retry-After nennt
async function jmPost(pid, r) {
  const body = { shop_domain: JM_DOMAIN, platform: 'shopify', id: pid,
    name: r.name || 'CJ-Kundenbewertung',
    email: r.email || `cj-import+${Math.random().toString(36).slice(2, 9)}@luxestyle.ch`,
    rating: Math.max(1, Math.min(5, Number(r.rating) || 5)), title: r.title || '', body: r.body || '', api_token: JM_TOKEN };
  if (r.created_at) body.created_at = r.created_at;
  if (Array.isArray(r.picture_urls) && r.picture_urls.length) body.picture_urls = r.picture_urls.slice(0, 3);
  const res = await fetch(JM_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(JM_ZEITLIMIT_MS) });
  const text = await res.text();
  let result;
  try { result = JSON.parse(text); } catch {}
  // Retry-After in Sekunden, begrenzt auf 1–30 s; ein Datum oder Unsinn gilt als „nicht genannt".
  const ra = Number(res.headers?.get?.('retry-after'));
  const warteMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : JM_PAUSE_MS;
  // Lesart der Antwort samt Gegenproben: automation/lib/judgeme_antwort.mjs
  return { ...bewerteAntwort(res.status, result), status: res.status, warteMs };
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
// Liefert das Set der Texte — oder NULL, wenn der Shop nicht lesbar war (HTTP-Fehler, Netz, kein JSON-Objekt).
// NULL heisst „unbekannt", NICHT „nichts im Shop": ein leeres Set als Ersatz liess den Importer bei HTTP 429 live posten (Dubletten).
// 429/503 setzt zusätzlich jmGedrosselt: Drosselung wird nie umgangen, der Lauf endet.
// Jeder andere Ausfall (HTTP 500, Netz, Zeitlimit, Antwort ohne Daten) gilt für dieses Produkt bis Laufende als „unbekannt" (null im Zwischenspeicher):
// sonst fragt jede Bewertung neu, mit 30 s Zeitlimit je Frage. Nach WIDGET_FEHLER_MAX unlesbaren Produkten in Folge endet der Lauf wie bei Drosselung.
let jmGedrosselt = '';
let widgetFehlerFolge = 0;
const WIDGET_FEHLER_MAX = 3;
function widgetUnlesbar(schluessel, grund, frisch) {
  console.error(`  Shop-Abgleich nicht moeglich: ${grund} (Produkt ${schluessel})`);
  if (!frisch) textCache.set(schluessel, null);
  if (++widgetFehlerFolge >= WIDGET_FEHLER_MAX && !jmGedrosselt) jmGedrosselt = `Widget bei ${WIDGET_FEHLER_MAX} Produkten in Folge unlesbar`;
  return null;
}
async function jmProduktTexte(pid, frisch = false) {
  const schluessel = String(pid);
  if (!frisch && textCache.has(schluessel)) return textCache.get(schluessel);
  const texte = new Set();
  const qs = new URLSearchParams({ url: JM_DOMAIN, shop_domain: JM_DOMAIN, platform: 'shopify',
    product_id: schluessel, per_page: '100' });
  try {
    const res = await fetch(`${JM_WIDGET}?${qs}`, { signal: AbortSignal.timeout(JM_ZEITLIMIT_MS) });
    if (!res.ok) {
      if (res.status === 429 || res.status === 503) jmGedrosselt = `Widget HTTP ${res.status}`;
      return widgetUnlesbar(schluessel, `Judge.me HTTP ${res.status}`, frisch);
    }
    const j = await res.json();
    if (!j || typeof j !== 'object') return widgetUnlesbar(schluessel, 'Antwort ohne Daten', frisch);
    for (const r of (Array.isArray(j?.reviews) ? j.reviews : [])) {
      const t = nurText(r?.body_html ?? r?.body);
      if (t) texte.add(t);
    }
  } catch (e) { return widgetUnlesbar(schluessel, e.message, frisch); }
  widgetFehlerFolge = 0;
  textCache.set(schluessel, texte);
  return texte;
}

// Liegt einer der Texte (gesendete Fassung, CJ-Original) beim Produkt im Shop?
const imShop = (bekannt, ...texte) => texte.some(t => { const x = nurText(t) || String(t ?? '').trim(); return !!x && bekannt.has(x); });

// Nach einem POST mit HTTP 201 OHNE Review-ID: frisch nachlesen und auf den Text pruefen.
// Ist der Shop dabei nicht lesbar, gilt NICHTS als gefunden (→ uncertain, nie „gesendet" raten).
async function jmAbgleich(pid, bodies) {
  const vorhanden = await jmProduktTexte(pid, true);
  const treffer = new Set();
  if (!vorhanden) return treffer;
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
  if (DRY) console.log('TROCKENLAUF: nichts wird gesendet oder gespeichert (live nur mit DRY_RUN=0).');
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
  let uebersetzAusfaelleFolge = 0;
  const UEBERSETZ_AUSFALL_MAX = 3;
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
      // Sterne: nur ganze Zahlen 1 bis 5. Ein vorhandener, aber unbrauchbarer Wert wird verworfen und gemeldet (nicht auf 5 klemmen, nicht als „4,5" senden).
      // Fehlt der Wert ganz (leer/null), zählt der Kommentar wie bisher als „unter MIN_SCORE".
      let ungueltig = 0, gueltig = 0, beispielScore;
      const picked = (list || [])
        .filter(c => {
          const stern = sterneAus(c.score);
          if (stern === null) {
            if (!sterneOhneAngabe(c.score)) { ungueltig++; beispielScore ??= c.score; }
            return false;
          }
          gueltig++;
          return stern >= MIN_SCORE && (c.comment || '').trim().length >= 8;
        })
        .slice(0, PER);
      if (ungueltig) console.log(`· ${p.handle}: ${ungueltig} Kommentar(e) mit unplausibler Sternezahl verworfen (z. B. ${JSON.stringify(beispielScore)})`);
      if (!picked.length) {
        console.log(`· ${p.handle}: 0 echte ≥${MIN_SCORE}★-Kommentare bei CJ → skip`);
        if (ungueltig && !gueltig) {
          // NUR kaputte Sternewerte, kein einziger brauchbarer: vermutlich hat CJ sein Format geändert. „Unbekannt" ist nicht „leer" (kein 60-Tage-Vermerk)
          // und darf nicht als grüner Lauf enden.
          fails++;
          console.error(`✗ ${p.handle}: alle ${ungueltig} Sternewerte unbrauchbar (z. B. ${JSON.stringify(beispielScore)}) → nicht als leer vermerkt; CJ-Format prüfen`);
        } else merkeLeer(pidNum, 'keine-kommentare');
        continue;
      }

      // Übersetzt wird nur, was es noch braucht: nicht gesendet, nicht unklar und noch keine gespeicherte Fassung.
      // Die Übersetzung ist nicht deterministisch — eine einmal gesendete Fassung wird wiederverwendet, nie neu gewürfelt.
      const keys = picked.map(c => reviewKey(pidNum,cjpid,c));
      const braucht = picked.map((c, i) => {
        const st = reviewStates.get(keys[i]);
        return st !== 'sent' && st !== 'sending' && st !== 'uncertain' && !reviewBody(reviewStates, keys[i]);
      });
      const bodiesDE = new Map();
      if (braucht.some(Boolean)) {
        const stellen = picked.map((_, i) => i).filter(i => braucht[i]);
        const tr = await translateDE(stellen.map(i => picked[i].comment.trim()));
        // Fehlt die Übersetzung (Ausfall, Limit, leerer Eintrag) und ist der Text nicht schon deutsch → dieses Produkt NICHT senden.
        // Kein „sent", kein „done": ein späterer Lauf holt es nach. Ein bewusstes Original gibt es nur mit ALLOW_ORIGINAL=1.
        const ohne = stellen.filter((i, j) => tr.fehlt.includes(j) && !wirktDeutsch(picked[i].comment));
        if (tr.weg !== 'original') uebersetzAusfaelleFolge = 0;
        if (ohne.length && !ALLOW_ORIGINAL) {
          fails++;
          console.error(`✗ ${p.handle}: Übersetzung fehlt für ${ohne.length} von ${stellen.length} Kommentar(en) (${tr.grund || 'Antwort unvollständig'}) → nichts gesendet; ein späterer Lauf holt es nach (bewusstes Original nur mit ALLOW_ORIGINAL=1)`);
          // Fällt der Dienst ganz aus, kostet jedes weitere Produkt CJ-Abfragen und wird doch zurückgehalten: nach UEBERSETZ_AUSFALL_MAX Produkten in Folge Schluss.
          if (tr.weg === 'original' && ++uebersetzAusfaelleFolge >= UEBERSETZ_AUSFALL_MAX) {
            console.error(`\n⏳ ÜBERSETZUNG FÄLLT AUS (${UEBERSETZ_AUSFALL_MAX} Produkte in Folge ohne Übersetzung; ${tr.grund || 'kein Grund genannt'}) — Lauf hier beendet.`);
            console.error('   Die uebrigen Produkte sind NICHT geprueft und NICHT als leer vermerkt. Spaeter erneut laufen lassen (Schluessel/Limit pruefen).');
            break;
          }
          continue;
        }
        stellen.forEach((i, j) => bodiesDE.set(i, tr.texte[j]));
      }
      let sent = 0, schonDa = 0, complete = true, gedrosselt = false;
      const offen = [];   // gesendet, Antwort ohne ID → wird gleich nachgelesen
      for (let i = 0; i < picked.length; i++) {
        const c = picked[i];
        const key = keys[i];
        const previous = reviewStates.get(key);
        const gespeichert = reviewBody(reviewStates, key);
        if (previous === 'sent') { console.log(`  Bereits importierte Bewertung übersprungen (${key.slice(0,12)})`); continue; }
        if (previous === 'sending' || previous === 'uncertain') {
          // „Unklar" heilt nicht von selbst: zuerst im Shop nachsehen. Text da → sent; sonst bleibt es unklar (nie blind wiederholen).
          // Trockenlauf: kein Zugriff, nur melden.
          const bekannt = DRY ? null : await jmProduktTexte(pidNum);
          if (bekannt && imShop(bekannt, gespeichert, c.comment)) {
            recordReviewState(ITEM_LEDGER,reviewStates,key,'sent',gespeichert); schonDa++;
            console.log(`  Unklarer Zustand aufgelöst: Bewertung liegt im Shop (${key.slice(0,12)})`);
            continue;
          }
          complete = false; fails++;
          console.error(`  CJ_REVIEW_UNCERTAIN: ${key.slice(0,12)} ${bekannt ? 'im Shop nicht gefunden' : DRY ? 'Trockenlauf, kein Shop-Abgleich' : 'Shop-Abgleich nicht möglich'}; vor erneutem Import in Judge.me abgleichen`);
          if (jmGedrosselt) { gedrosselt = true; break; }
          continue;
        }
        const rev = {
          name: anzeigeName(c.commentUser),
          rating: sterneAus(c.score),
          body: gespeichert || bodiesDE.get(i) || c.comment.trim(),
          created_at: (c.commentDate || '').slice(0, 10) || undefined,
          picture_urls: (Array.isArray(c.commentUrls) ? c.commentUrls : []).filter(u => /^https?:\/\//.test(u)),
        };
        if (DRY) { console.log(`  [DRY] ${p.handle} ★${rev.rating} ${rev.body.slice(0, 50)}`); sent++; continue; }
        // Liegt genau dieser Text beim Produkt schon im Shop, ist er importiert — egal unter
        // welchem Schluessel. Dann nur den Zustand nachfuehren, nicht erneut senden.
        // Verglichen werden die gesendete Fassung UND der CJ-Originaltext (früher unübersetzt gesendete Bewertungen).
        // Ist der Shop NICHT lesbar (null), ist das „unbekannt" — dann wird nichts gesendet.
        // Kein Ledger-Eintrag dafür: es wurde ja nichts gesendet, und „uncertain" würde die Bewertung dauerhaft sperren.
        const bekannt = await jmProduktTexte(pidNum);
        if (!bekannt) {
          complete = false; fails++;
          console.error(`  CJ_ABGLEICH_FEHLT: ${key.slice(0,12)} Shop nicht lesbar → NICHT gesendet; ein späterer Lauf wiederholt (nichts im Ledger vermerkt)`);
          if (jmGedrosselt) { gedrosselt = true; break; }
          continue;
        }
        if (imShop(bekannt, rev.body, c.comment)) {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'sent',rev.body); schonDa++;
          console.log(`  Im Shop schon vorhanden, nicht erneut gesendet (${key.slice(0,12)})`);
          continue;
        }
        // Intent vor dem externen POST dauerhaft festhalten, samt der Fassung, die gesendet wird.
        // Ein abgebrochener Lauf mit unbekanntem Ergebnis darf denselben Kommentar nicht blind wiederholen
        // und kann ihn später mit genau diesem Text im Shop wiederfinden.
        recordReviewState(ITEM_LEDGER,reviewStates,key,'sending',rev.body);
        let out;
        try {
          out = await jmPost(pidNum, rev);
          // HTTP 429 heisst „abgelehnt, nicht verarbeitet": einmal warten (Retry-After, sonst kurz) und wiederholen. Nie umgehen.
          if (out.status === 429) {
            console.error(`  Judge.me drosselt (HTTP 429) → warte ${Math.round(out.warteMs / 1000)} s, dann ein zweiter Versuch`);
            await sleep(out.warteMs);
            out = await jmPost(pidNum, rev);
          }
        }
        catch {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'uncertain',rev.body);
          complete = false; fails++;
          console.error(`  CJ_REVIEW_UNCERTAIN: Netzwerkfehler bei ${key.slice(0,12)}; erst abgleichen`);
          continue;
        }
        if (out.ok) {
          recordReviewState(ITEM_LEDGER,reviewStates,key,'sent',rev.body); sent++;
        } else if (out.abgleichen) {
          // Zustand bleibt 'sending': bricht der Lauf hier ab, gilt die Bewertung beim
          // naechsten Mal als unklar und wird NICHT blind ein zweites Mal gesendet.
          offen.push({ key, body: rev.body });
        } else {
          recordReviewState(ITEM_LEDGER,reviewStates,key,out.uncertain?'uncertain':'failed',rev.body);
          complete = false; fails++; console.error(`  Import nicht bestätigt: ${p.handle}, HTTP ${out.status}${out.uncertain ? '; vor Wiederholung abgleichen' : '; Anfrage abgelehnt'}`);
          // Drosselung (429 auch nach der Wartezeit, 503): weitermachen hiesse hämmern. Lauf beenden wie bei CJ_THROTTLED.
          if (out.status === 429 || out.status === 503) { jmGedrosselt = `POST HTTP ${out.status}`; gedrosselt = true; break; }
        }
        await sleep(700);
      }
      if (offen.length) {
        // Drosselt Judge.me schon, wird nicht noch einmal gefragt: die Einträge bleiben dann „uncertain" und werden beim nächsten Lauf aufgelöst.
        const gefunden = jmGedrosselt ? new Set() : await jmAbgleich(pidNum, offen.map(o => o.body));
        for (const o of offen) {
          if (gefunden.has(String(o.body).trim())) {
            recordReviewState(ITEM_LEDGER,reviewStates,o.key,'sent',o.body); sent++;
          } else {
            recordReviewState(ITEM_LEDGER,reviewStates,o.key,'uncertain',o.body);
            complete = false; fails++;
            console.error(`  CJ_REVIEW_UNCERTAIN: ${o.key.slice(0,12)} im Shop nicht gefunden; vor Wiederholung abgleichen`);
          }
        }
        if (jmGedrosselt) gedrosselt = true;   // der Abgleich selbst kann in die Drosselung laufen
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
      // Judge.me drosselt: weiterlaufen hiesse hämmern. Die übrigen Produkte sind NICHT geprüft und NICHT als leer vermerkt.
      if (gedrosselt) {
        console.error(`\n⏳ JUDGE.ME DROSSELT ODER FÄLLT AUS (${jmGedrosselt}) — Lauf hier beendet.`);
        console.error('   Spaeter erneut laufen lassen; unklare Eintraege werden dann zuerst im Shop abgeglichen.');
        break;
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
