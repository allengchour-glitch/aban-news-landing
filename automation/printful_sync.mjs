#!/usr/bin/env node
/* LuxeStyle — printful_sync.mjs (Version 2, 05.11.2026: «Bestellweg härten», Strom 3 von «Selbst gestalten 100 %»)
 * Verbindet den eigenen „Selbst gestalten"-Editor mit dem Druck-Anbieter PRINTFUL.
 * Für jede BEZAHLTE, noch nicht synchronisierte Shopify-Bestellung mit POD-Artikeln (Tag wunschdesign + Editor-Druckdatei-Eigenschaft) legt es einen Printful-Auftrag an.
 *
 * Ablauf je Bestellung (reine Logik und Prüfungen: lib/printful_bestellweg.mjs und lib/printful_platzierung.mjs; Verhalten: automation/printful_sync_test.mjs):
 *   0. Gibt es bei Printful schon einen Auftrag mit external_id «LX<Bestellnummer>»? (GET /orders/@<external_id>; GEMESSEN 05.11.: 404 wenn nicht, `GET /orders?external_id=` filtert NICHT)
 *      Ja → nichts anlegen, nur Tag `printful-synced` + Metafeld nachtragen (ein gescheitertes Markieren führt nie mehr zu einem zweiten Auftrag). Nicht prüfbar → nichts anlegen, später wieder.
 *   1. Planen: Variante aus der SKU (die der Position zuerst), Druckdateien aus den Eigenschaften (v6 ALT «🖼️ Druckdatei (<Platzierung>)», v6 NEU «_Druckdatei (<Platzierung>)» ab Editor 6.2.1,
 *      v5: Vorne/Hinten; `_vorschau` ist KEINE Druckdatei) mit den ECHTEN Printful-Platzierungen, Optionen (Garnfarben …), Konflikte, Technik, Auflösung (PNG/JPEG-Kopfzeile gegen Druckdatei und
 *      Mindest-dpi des Katalogs; dazu als weiche Gegenprobe die Angabe `_pod_karte.qd`), KI-Kontrolle, Empfänger. `_pod_karte.m` und `.pv` müssen zur SKU der Position passen.
 *      «Harte» Befunde (SKU ohne Variante, keine/unzulässige Datei, gemischte Schlüssel, Karte widerspricht der SKU, Adresse unbrauchbar, mehr als 50 Positionen, Position am Fulfillment-Service-Standort «dienst-standort»,
 *      gedruckte Aufpreis-Platzierung ohne bezahltes Paket «aufpreis-unbezahlt»): KEIN Auftrag, Tag `printful-review`,
 *      eine Meldung. Eine bezahlte Bestellung OHNE Design (`keine-druckdatei`) bleibt so liegen: keine Mail an die Kundin und keine Rückerstattung durch dieses Skript (dropship/wp6-0611/OHNE-DESIGN.md).
 *      Stand der Befundnamen und der Messung: dropship/wp6-0611/SYNC.md.
 *   2. Auftrag als ENTWURF anlegen (mit external_id), sofort Metafeld printful.order_id und ZULETZT das Tag `printful-synced` setzen (Fehler dabei werden gemeldet, Exit 1; steht das Tag nicht,
 *      findet der nächste Lauf den Entwurf über external_id und holt beides nach).
 *   3. Entwurf nachlesen (bis zu ~2 Minuten, 7 Lesungen): Dateistatus (Printful prüft die Dateien selbst), Kosten gegen den Shop-Erlös samt bezahltem Versand (Verlust oder weniger als der Mindestgewinn → kein Bestätigen).
 *   4. Nur ohne jeden Befund UND mit PRINTFUL_AUTO_CONFIRM an: POST /orders/<id>/confirm, danach den Status NACHLESEN. «BESTÄTIGT» steht nur, wenn Printful pending/inprocess/… meldet;
 *      failed (Zahlung der Karte), onhold, canceled, draft → Befund, nie «bestätigt».
 *   Befunde: Tags `printful-review` + `printful-review-<art>` (wie `printful-problem-<art>` in printful_tracking.mjs): dieselbe Befundart wird nur EINMAL per Telegram gemeldet.
 *   Eine Bestellung mit Tag `printful-review` wird nicht mehr gelesen. Bei HARTEN Befunden (kein Auftrag angelegt) entfernt man nach der Behebung das Tag: der nächste Lauf versucht es neu. Bei WEICHEN
 *   Befunden gibt es schon einen Entwurf bei Printful (Tag `printful-synced`): den prüft und bestätigt man im Printful-Dashboard, das Entfernen des Tags bewirkt dort nichts.
 *   Vorübergehende Fehler (Netz, 429, 5xx): kein Tag ausser `printful-versuch-<n>`; nach 3 Läufen wird daraus ein Befund.
 * Gelesen werden alle Seiten der offenen Bestellungen (nicht nur die ersten MAX): Nicht-POD-Bestellungen verdrängen POD-Bestellungen nicht mehr.
 * Exit 1 bei technischem Fehler (Zugangsdaten fehlen, Shopify/Printful nicht erreichbar, Markieren gescheitert, Telegram-Meldung nicht zugestellt, Zeitlimit). Befunde sind KEIN Exit 1.
 * ENV: PRINTFUL_API_KEY (zwingend), [PRINTFUL_STORE_ID], [PRINTFUL_AUTO_CONFIRM=1 schaltet das Bestätigen EIN (Vorgabe 0 = Aufträge bleiben Entwürfe, Besitzer-Entscheid 05.11.)], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      [PRINTFUL_KI_KONTROLLE=aus|pflicht (Vorgabe aus, Besitzer-Entscheid 05.11.; pflicht: ohne GEMINI_API_KEY oder bei Fehler der KI bleibt der Auftrag Entwurf)], [GEMINI_API_KEY], [PRINTFUL_KI_MODELL],
 *      [PRINTFUL_MAX_KOSTEN_USD=absolute Obergrenze der Printful-Summe je Auftrag in USD; Vorgabe aus (leer/0/aus); ein Auftrag darüber bleibt Entwurf mit Befund «kosten-obergrenze»; ein unbrauchbarer Wert beendet den Lauf mit Exit 1],
 *      [TELEGRAM_BOT_TOKEN/CHAT_ID], [MAX=20 POD-Bestellungen je Lauf], [PRINTFUL_MIN_NETTO_CHF=4: Mindestgewinn je Auftrag in CHF, 0 = nur Verluste halten], [PRINTFUL_STITCH_COLOR=white|black: Nahtfarbe-Vorgabe
 *      für Produkte mit Option stitch_color (Entscheid des Besitzers; ohne sie bleiben diese Aufträge Entwurf)], [PRINTFUL_DATEI_HOSTS=weitere erlaubte Hosts], [RUN_LIMIT_MS=600000],
 *      [PF_PAUSE_MS=2500: Grundpause; die Wartezeit auf Dateien und Kosten ist 48 × PF_PAUSE_MS = 120 s],
 *      [PRINTFUL_LOG_DETAIL=1: Befundtexte auch in Log und Zusammenfassung (nur für Läufe auf dem eigenen Rechner: das Repo ist öffentlich, Actions-Protokolle sind es auch; sonst steht dort nur die Befundart)],
 *      [DRY_RUN: alles ausser ''/0/false/no/nein/off ist Trockenlauf: es wird gelesen, nichts geschrieben, nichts gemeldet]
 */
import { appendFileSync } from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { neuerPlatzierungsCache } from './lib/printful_platzierung.mjs';
import {
  planeBestellung, istPod, externalId, empfaengerAus, kostenPruefen, statusBewerten, dateienStatus, befundPlan, versuche, versuchTag, MAX_VERSUCHE, esc,
  kontrolleLesen, kleineKopieUrl, REVIEW_TAG, ERLAUBTE_HOSTS,
} from './lib/printful_bestellweg.mjs';

const SHOPraw = process.env.SHOPIFY_SHOP || '';
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '').trim();
const PF_KEY = (process.env.PRINTFUL_API_KEY || '').trim();
const PF_STORE = (process.env.PRINTFUL_STORE_ID || '').trim();
// STANDARDWERTE = die des Workflows (.github/workflows/printful-sync.yml: PRINTFUL_AUTO_CONFIRM '0', PRINTFUL_KI_KONTROLLE 'aus') und die Entscheide des Besitzers vom 05.11.2026: Printful-Aufträge bleiben ENTWÜRFE, bis er das
// Bestätigen ausdrücklich einschaltet, und die KI-Kontrolle ist aus (die ersten Aufträge sichtet er von Hand). Früher galt hier das Gegenteil (bestätigen, KI Pflicht): wer das Skript ohne den Workflow startete, bekam andere Werte.
// Bestätigt wird nur bei einem ausdrücklichen Ja (1, true, ja, yes, on, an); jede andere Angabe, auch ein Tippfehler, lässt es aus. Die KI-Kontrolle ist aus bei leer/«aus»; jede andere Angabe («pflicht», auch ein Tippfehler) schaltet sie ein.
const EIN = ['1', 'true', 'ja', 'yes', 'on', 'an'];
const AUTO_CONFIRM = EIN.includes(String(process.env.PRINTFUL_AUTO_CONFIRM == null ? '' : process.env.PRINTFUL_AUTO_CONFIRM).trim().toLowerCase());
const KI_ROH = String(process.env.PRINTFUL_KI_KONTROLLE == null ? '' : process.env.PRINTFUL_KI_KONTROLLE).trim().toLowerCase();
const KI = KI_ROH === '' || KI_ROH === 'aus' ? 'aus' : 'pflicht';
const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
const KI_MODELL = (process.env.PRINTFUL_KI_MODELL || 'gemini-2.5-flash').trim();   // Name aus der alten Fassung; ob Google ihn noch anbietet, ist nicht geprüft (bei Fehler bleibt der Auftrag Entwurf)
const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TG_CHAT = (process.env.TELEGRAM_CHAT_ID || '').trim();
const MAX = Math.max(1, parseInt(process.env.MAX || '20', 10) || 20);
// Mindestgewinn je Auftrag (CHF, nach MWST, Gebühr und Printful-Kosten): Vorgabe 4 = das Ziel der Preisformel (werkzeuge/preisformel.mjs); 0 hält nur Verluste an.
const NETTO_MIN = Number.isFinite(Number(process.env.PRINTFUL_MIN_NETTO_CHF)) && process.env.PRINTFUL_MIN_NETTO_CHF !== undefined && process.env.PRINTFUL_MIN_NETTO_CHF !== '' ? Number(process.env.PRINTFUL_MIN_NETTO_CHF) : 4;
// Absolute Obergrenze der Printful-Summe je Auftrag in USD (PRINTFUL_MAX_KOSTEN_USD). Vorgabe AUS (leer, 0, «aus»). Eine Zahl über 0 schaltet sie ein; jede andere Angabe (Tippfehler, negativ) ist ein Konfigurationsfehler
// und beendet den Lauf mit Exit 1, bevor etwas angelegt wird (eine falsch geschriebene Sicherung darf nicht still ausfallen).
const MAX_KOSTEN_ROH = String(process.env.PRINTFUL_MAX_KOSTEN_USD == null ? '' : process.env.PRINTFUL_MAX_KOSTEN_USD).trim().toLowerCase();
const MAX_KOSTEN_AUS = MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === '0' || MAX_KOSTEN_ROH === 'aus';
const MAX_KOSTEN_USD = MAX_KOSTEN_AUS ? null : Number(MAX_KOSTEN_ROH);
const MAX_KOSTEN_FEHLER = !MAX_KOSTEN_AUS && !(Number.isFinite(MAX_KOSTEN_USD) && MAX_KOSTEN_USD > 0);
const STITCH = String(process.env.PRINTFUL_STITCH_COLOR || '').trim().toLowerCase();
const OPTION_VORGABEN = STITCH ? { stitch_color: STITCH } : {};
const DETAIL = ['1', 'true', 'ja', 'yes', 'on'].includes(String(process.env.PRINTFUL_LOG_DETAIL || '').trim().toLowerCase());
const HOSTS = [...ERLAUBTE_HOSTS, ...String(process.env.PRINTFUL_DATEI_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)];
const RUN_LIMIT_MS = Number.isFinite(Number(process.env.RUN_LIMIT_MS)) && process.env.RUN_LIMIT_MS !== undefined && process.env.RUN_LIMIT_MS !== '' ? Number(process.env.RUN_LIMIT_MS) : 600000;
const DRY = !['', '0', 'false', 'no', 'nein', 'off'].includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN).trim().toLowerCase());
// Shopify unterstützt 2026-01 bis ca. 16.01.2027 (QUELLE shopify.dev laut Prüfer 03.11.2026; Wiedervorlage Dezember 2026). Die alte Fassung lief auf dem abgelaufenen 2025-01.
const API = '2026-01';
// Bestellungen je Seite. GEMESSEN 05.11.2026 (extensions.cost): 10 Bestellungen × lineItems(first:50) = 158 angefragte Punkte, 25 × 25 = 206; verfügbar 2000. 20 × 50 bleibt weit darunter.
// Mit den Fulfillment-Orders (Dienst-Standort, 09.11.2026) GEMESSEN über die Admin-Abfrage des Connectors (API 2026-10, Treffer 0, nur die Kostenprüfung vor der Ausführung): 20 Bestellungen werden angenommen,
// 50 scheitern mit «Query cost is 1003» gegen die Grenze 1000 (also rund 20 Punkte je Bestellung). SEITE nicht über 40 anheben, sonst lehnt Shopify die Abfrage ab.
const SEITE = 20, MAX_SEITEN = 30;
const PLATZ_PAUSE_MS = Math.max(0, parseInt(process.env.PF_PLATZIERUNG_PAUSE_MS || '2000', 10) || 0);
const PAUSE_MS = Math.max(0, parseInt(process.env.PF_PAUSE_MS || '2500', 10) || 0);
const START = Date.now();

let SHOP = SHOPraw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Das Repo und seine Actions-Protokolle sind ÖFFENTLICH. Log und Step-Summary tragen darum nur Bestellnummer und Befundart; Texte von Printful, der KI (sie beschreibt Kundenbilder) und Kundenangaben
// gehen nur an Telegram (privater Chat). Mit PRINTFUL_LOG_DETAIL=1 (eigener Rechner) steht alles auch im Log.
const fehler = [];          // technische Fehler (Exit 1): {kurz (öffentlich), detail (nur Telegram bzw. DETAIL)}
const zeilen = [];          // Zusammenfassung je Bestellung (öffentlich: Nummer + Art)
const fehlerAdd = (kurz, detail = '') => { fehler.push({ kurz, detail: String(detail || '') }); };
const fehlerLog = (f) => f.kurz + (DETAIL && f.detail ? ' | ' + f.detail : '');
const fehlerTg = (f) => f.kurz + (f.detail ? ' | ' + f.detail : '');
const zaehler = { gelesen: 0, bestaetigt: 0, entwuerfe: 0, ohneAuftrag: 0, vorhanden: 0, spaeter: 0, anstehend: 0 };

if (MAX_KOSTEN_FEHLER) { console.error(`❌ PRINTFUL_MAX_KOSTEN_USD ist keine Zahl über 0 (steht: «${MAX_KOSTEN_ROH.slice(0, 30)}»; leer, 0 oder «aus» schaltet die Obergrenze ab): es wird nichts angelegt.`); process.exit(1); }
if (!PF_KEY) { console.error('❌ Kein PRINTFUL_API_KEY: der Bestellweg kann nichts tun (früher stiller No-op mit Exit 0, jetzt sichtbar).'); process.exit(1); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.error('❌ Keine Shopify-Zugangsdaten (SHOPIFY_CLIENT_ID/SECRET oder SHOPIFY_ADMIN_TOKEN): der Bestellweg kann nichts tun.'); process.exit(1); }

// ───────────────────────────────────────────── Telegram: true = zugestellt, false = Zustellung gescheitert, null = nicht konfiguriert oder Trockenlauf
async function tg(text) {
  if (DRY) { console.log('[DRY] Telegram würde senden' + (DETAIL ? ': ' + String(text).replace(/<[^>]+>/g, '').slice(0, 300) : ` (${String(text).length} Zeichen; der Text steht nur im privaten Chat, das Protokoll ist öffentlich)`)); return null; }
  if (!TG_TOKEN || !TG_CHAT) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) });
    return !!r.ok;
  } catch { return false; }
}

// ───────────────────────────────────────────── Shopify
async function gql(tok, query, variables, wiederholbar = true) {
  let letzte = new Error('Shopify: kein Versuch');
  const n = wiederholbar ? 3 : 1;
  for (let i = 0; i < n; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) { letzte = new Error('Shopify HTTP ' + r.status); if (i < n - 1) await pause(PAUSE_MS * (i + 1)); continue; }
      const j = await r.json().catch(() => null);
      if (!j || typeof j !== 'object') { letzte = new Error('Shopify: keine lesbare Antwort (HTTP ' + r.status + ')'); if (i < n - 1) await pause(PAUSE_MS * (i + 1)); continue; }
      if (j.errors) { const t = JSON.stringify(j.errors).slice(0, 240); letzte = new Error('Shopify: ' + t); if (/throttled/i.test(t) && i < n - 1) { await pause(PAUSE_MS * (i + 1)); continue; } throw letzte; }
      return j;
    } catch (e) { letzte = e; if (e && /^Shopify: \{|^Shopify: \[/.test(String(e.message))) throw e; if (i < n - 1) await pause(PAUSE_MS * (i + 1)); }
  }
  throw letzte;
}
async function works(tok) { try { const r = await gql(tok, '{ shop { name } }', undefined, false); return r && r.data && r.data.shop && r.data.shop.name ? r.data.shop : null; } catch { return null; } }
async function clientCredentials() {
  try {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({})); return j.access_token || null;
  } catch { return null; }
}
async function resolveToken() {
  if (ADMIN_TOKEN) { const s = await works(ADMIN_TOKEN); if (s) return ADMIN_TOKEN; }
  if (CID && CSEC) { const t = await clientCredentials(); if (t && await works(t)) return t; }
  return null;
}

const ORDERS_Q = `query($q:String!,$n:Int!,$c:String){ orders(first:$n, after:$c, query:$q, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } edges{ node{
  id name email tags cancelledAt
  currentShippingPriceSet{ shopMoney{ amount currencyCode } }
  shippingAddress{ name firstName lastName address1 address2 city provinceCode countryCodeV2 zip phone }
  lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ id quantity currentQuantity sku title
    discountedTotalSet{ shopMoney{ amount currencyCode } }
    product{ productType tags metafield(namespace:"custom", key:"print_file"){ value } }
    variant{ sku title selectedOptions{ name value } }
    customAttributes{ key value } } } }
  fulfillmentOrders(first:20){ edges{ node{ id status assignedLocation{ location{ id name isFulfillmentService } }
    lineItems(first:50){ edges{ node{ lineItem{ id } } } } } } }
}}}}`;
const TAG_ADD = `mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`;
const MF_SET = `mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`;

// Metafeld (beim ersten Setzen) und Tags schreiben; das Ergebnis wird GEPRÜFT (früher wurde es verworfen: ein Fehler hier führte beim nächsten Lauf zu einem zweiten Auftrag).
// REIHENFOLGE: erst das Metafeld, die Tags ZULETZT. Das Tag `printful-synced` schliesst die Bestellung aus der Abfrage aus; stünde es vor dem Metafeld und das Metafeld scheiterte,
// bliebe ein unbestätigter Entwurf ohne Prüfer liegen (Gegenleser-Fund 05.11.: «der nächste Lauf findet ihn» stimmte dann nicht). So findet der nächste Lauf ihn über external_id und holt beides nach.
async function tagsSetzen(tok, o, tags, pfId) {
  if (DRY) return true;
  try {
    if (pfId) {
      const m = await gql(tok, MF_SET, { mf: [{ ownerId: o.id, namespace: 'printful', key: 'order_id', type: 'single_line_text_field', value: String(pfId) }] });
      const ue2 = m && m.data && m.data.metafieldsSet && m.data.metafieldsSet.userErrors;
      if (!Array.isArray(ue2) || ue2.length) return false;
    }
    const a = await gql(tok, TAG_ADD, { id: o.id, tags });
    const ue = a && a.data && a.data.tagsAdd && a.data.tagsAdd.userErrors;
    if (!Array.isArray(ue) || ue.length) return false;
    o.tags = [...new Set([...(o.tags || []), ...tags])];
    return true;
  } catch { return false; }
}

// ───────────────────────────────────────────── Printful
// retryAfter: Sekunden aus dem Kopf «Retry-After» (bei 429). Netzfehler und Zeitüberschreitung ergeben status 0 (wirft nie).
async function pf(path, method, body, timeoutMs) {
  const headers = { Authorization: 'Bearer ' + PF_KEY, 'Content-Type': 'application/json' };
  if (PF_STORE) headers['X-PF-Store-Id'] = PF_STORE;
  try {
    const r = await fetch('https://api.printful.com' + path, { method: method || 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j, retryAfter: parseInt((r.headers && r.headers.get && r.headers.get('retry-after')) || '0', 10) || 0 };
  } catch (e) { return { ok: false, status: 0, j: {}, retryAfter: 0, fehler: String(e && e.message || e) }; }
}
// Lesen mit Wiederholung (Netz, 408, 429, 5xx); 404 und andere Antworten sind endgültig.
async function pfLesen(path, versuche = 3) {
  let r;
  for (let i = 0; i < versuche; i++) {
    r = await pf(path, 'GET', null, 30000);
    const vorlaeufig = r.status === 0 || r.status === 408 || r.status === 429 || r.status >= 500;
    if (!vorlaeufig || i === versuche - 1) break;
    await pause(Math.min(70000, Math.max(PAUSE_MS * (i + 1), r.retryAfter * 1000)));
  }
  return r;
}
const pfText = (r) => { const e = r && r.j && r.j.error; return `HTTP ${r && r.status}${e && e.message ? ' ' + String(e.message).slice(0, 160) : r && r.j && typeof r.j.result === 'string' ? ' ' + r.j.result.slice(0, 120) : ''}`; };

// Variante → Produkt (Platzierung, Optionen); Logik und Zwischenspeicher: lib/printful_platzierung.mjs
const variantProdukt = neuerPlatzierungsCache(async (vid) => { const r = await pf('/products/variant/' + vid, 'GET', null, 20000); return { status: r.status, result: r.ok ? (r.j && r.j.result) : null, retryAfter: r.retryAfter }; }, { pauseMs: PLATZ_PAUSE_MS });

// Druckdateien und Vorlagen des Produkts (Mindest-dpi, Konflikte), gemerkt je Produkt; Fehler werden nicht gemerkt
const druckCache = new Map();
async function holeDruckdaten(pid) {
  if (druckCache.has(pid)) return druckCache.get(pid);
  const a = await pfLesen(`/mockup-generator/printfiles/${pid}`);
  const b = a.ok ? await pfLesen(`/mockup-generator/templates/${pid}`) : null;
  const erg = a.ok && b && b.ok && a.j && a.j.result && b.j && b.j.result ? { art: 'ok', printfiles: a.j.result, templates: b.j.result } : { art: 'fehler', text: !a.ok ? 'printfiles ' + pfText(a) : 'templates ' + pfText(b) };
  if (erg.art === 'ok') druckCache.set(pid, erg);
  return erg;
}

// ───────────────────────────────────────────── Datei: Kopfzeile (Pixelgrösse) und KI-Kontrolle
async function holeKopf(url) {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-65535' }, signal: AbortSignal.timeout(30000) });
    if (!(r.status >= 200 && r.status < 300)) return { status: r.status, bytes: null };
    let bytes;
    if (r.body && typeof r.body.getReader === 'function') {            // ein Server, der den Bereich ignoriert, schickt die ganze Datei: nur den Anfang lesen
      const rd = r.body.getReader(), teile = []; let n = 0;
      while (n < 65536) { const { done, value } = await rd.read(); if (done) break; teile.push(value); n += value.length; }
      try { await rd.cancel(); } catch { /* egal */ }
      bytes = Buffer.concat(teile.map((x) => Buffer.from(x))).subarray(0, 65536);
    } else bytes = Buffer.from(await r.arrayBuffer()).subarray(0, 65536);
    return { status: r.status, bytes };
  } catch { return { status: 0, bytes: null }; }
}
const KI_PROMPT = 'You are a print-shop QA checker. Look at this customer print file (design to be printed on a product). Answer with a single word PASS or FAIL, then a short reason. FAIL only if: the image is essentially empty/blank, extremely low quality/blurry, or contains hateful/illegal/explicit content. Otherwise PASS. Format exactly: PASS - reason  OR  FAIL - reason';
/** @returns {Promise<{art:'ok'|'fail'|'technisch'|'fehlt', text:string}>} Ein Fehler der Kontrolle gibt NIE frei (Codex-Fund 28.10.: früher PASS bei «Prüfung übersprungen»). */
async function kontrolle(url) {
  if (KI === 'aus') return { art: 'ok', text: '(KI-Kontrolle ausdrücklich abgeschaltet)' };
  if (!GEMINI) return { art: 'fehlt', text: 'keine KI-Kontrolle eingerichtet (GEMINI_API_KEY fehlt; PRINTFUL_KI_KONTROLLE=aus verzichtet ausdrücklich darauf)' };
  try {
    const r = await fetch(kleineKopieUrl(url), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return { art: 'technisch', text: 'Bild für die Kontrolle nicht ladbar (HTTP ' + r.status + ')' };
    const ab = await r.arrayBuffer();
    if (ab.byteLength > 15 * 1024 * 1024) return { art: 'technisch', text: 'Bild für die Kontrolle zu gross (' + Math.round(ab.byteLength / 1048576) + ' MB)' };
    const mime = String((r.headers && r.headers.get && r.headers.get('content-type')) || 'image/png').split(';')[0].trim();
    if (!/^image\//i.test(mime)) return { art: 'technisch', text: 'Datei ist kein Bild (' + mime + ')' };
    const body = { contents: [{ parts: [{ text: KI_PROMPT }, { inline_data: { mime_type: mime, data: Buffer.from(ab).toString('base64') } }] }] };
    const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(KI_MODELL)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const j = await g.json().catch(() => ({}));
    if (!g.ok) return { art: 'technisch', text: 'KI antwortet HTTP ' + g.status + (j && j.error && j.error.message ? ' ' + String(j.error.message).slice(0, 120) : '') };
    const t = (((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((p) => p.text || '').join(' ')).trim();
    const l = kontrolleLesen(t);
    if (l === 'pass') return { art: 'ok', text: t.slice(0, 180) };
    if (l === 'fail') return { art: 'fail', text: t.slice(0, 180) };
    return { art: 'technisch', text: 'KI-Antwort ohne PASS/FAIL: ' + (t.slice(0, 120) || '(leer)') };
  } catch (e) { return { art: 'technisch', text: 'KI-Kontrolle gescheitert (' + String(e && e.message || e).slice(0, 100) + ')' }; }
}
const io = { produkt: variantProdukt, druckdaten: holeDruckdaten, kopf: holeKopf, kontrolle };

// ───────────────────────────────────────────── Befunde melden: Tags + EINE Telegram-Meldung je neuer Befundart
async function befundMelden(tok, o, befunde, kopf) {
  const plan = befundPlan({ tags: o.tags || [], befunde });
  for (const b of befunde) zeilen.push(`${o.name}: [${b.art}]${DETAIL ? ' ' + b.text : ''}`);
  if (plan.alarm) {
    // Telegram nimmt höchstens 4096 Zeichen: je Zeile 300 Zeichen (VOR dem Maskieren gekürzt, sonst entstünde ein halbes «&amp;»), höchstens 10 Zeilen
    const texte = plan.neu.slice(0, 10).map((b) => '• ' + esc(String(b.text).slice(0, 300))).join('\n') + (plan.neu.length > 10 ? `\n… und ${plan.neu.length - 10} weitere` : '');
    const ok = await tg(`${befunde.some((b) => b.hart) ? '🔴' : '🟡'} LuxeStyle POD: Bestellung <b>${esc(o.name)}</b> ${esc(kopf)}:\n${texte}`);
    if (ok === false) { fehlerAdd(`${o.name}: Telegram-Meldung nicht zugestellt (${plan.neu.map((b) => b.art).join(', ')})`); return false; }   // ohne Tag: der nächste Lauf meldet erneut
  }
  if (plan.hinzu.length && !(await tagsSetzen(tok, o, plan.hinzu))) { fehlerAdd(`${o.name}: Tags ${plan.hinzu.join(', ')} nicht gesetzt (Befund: ${befunde.map((b) => b.art).join(', ')})`); return false; }
  return true;
}
// Vorübergehender Fehler (Netz, 429, 5xx): nichts angelegt; der Zähler im Tag macht nach MAX_VERSUCHE einen Befund daraus
async function vorlaeufigerFehler(tok, o, text, detail = '') {
  const n = versuche(o.tags || []) + 1;
  fehlerAdd(`${o.name}: ${text} (Versuch ${n} von ${MAX_VERSUCHE})`, detail); zaehler.spaeter++;
  if (DRY) return;
  if (!(await tagsSetzen(tok, o, [versuchTag(n)]))) fehlerAdd(`${o.name}: Versuchszähler nicht gesetzt`);
  if (n >= MAX_VERSUCHE) await befundMelden(tok, o, [{ art: 'wiederholt-gescheitert', text: `${n} Läufe in Folge ohne Erfolg (${text}${detail ? ': ' + detail : ''})`, hart: true }], 'wurde nicht an Printful übergeben');
}

// ───────────────────────────────────────────── Printful-Auftrag lesen (mit Wartezeit, bis Printful die Dateien und Kosten gerechnet hat)
// Wartefolge in Vielfachen von PF_PAUSE_MS (2500 ms): 5, 10, 15, 20, 30, 40 s zwischen 7 Lesungen = 120 s. Wie lange Printful wirklich braucht, ist UNGEMESSEN (kein Entwurf wurde je angelegt);
// früher waren es 15 s bei 4 Lesungen, und ein Entwurf ohne fertige Dateien/Kosten blieb dann für immer ungeprüft (er trägt printful-synced und wird nicht mehr gelesen). Messen beim ersten echten Auftrag.
const WARTE_FOLGE = [2, 4, 6, 8, 12, 16];
async function auftragLesen(pfId, fertig) {
  let r = null;
  const t0 = Date.now();
  for (let i = 0; i <= WARTE_FOLGE.length; i++) {
    r = await pfLesen('/orders/' + pfId, 2);
    if (r.ok && r.j && r.j.result) { const urteil = fertig(r.j.result); if (urteil) return { order: r.j.result, urteil, sek: Math.round((Date.now() - t0) / 1000) }; }
    else if (!r.ok && r.status !== 0 && r.status < 500 && r.status !== 429) break;
    if (i < WARTE_FOLGE.length) {
      if (Date.now() - START > RUN_LIMIT_MS) break;          // das Zeitlimit des Laufs gilt auch beim Warten
      await pause(PAUSE_MS * WARTE_FOLGE[i]);
    }
  }
  return { order: r && r.ok && r.j ? r.j.result || null : null, urteil: null, status: r && r.status, sek: Math.round((Date.now() - t0) / 1000) };
}

async function bearbeite(tok, o) {
  const ext = externalId(o.name, o.id);
  if (!ext) { fehlerAdd(`${o.name}: aus der Bestellnummer lässt sich keine external_id bilden`); return; }
  // 0. Gibt es den Auftrag schon? (external_id; das Markieren in Shopify kann gescheitert sein)
  const vorh = await pfLesen('/orders/@' + encodeURIComponent(ext));
  if (vorh.status === 200 && vorh.j && vorh.j.result) { await vorhandenBehandeln(tok, o, ext, vorh.j.result); return; }
  if (vorh.status !== 404) { await vorlaeufigerFehler(tok, o, `Printful lässt sich nach einem bestehenden Auftrag nicht fragen (HTTP ${vorh.status}): es wird nichts angelegt`, pfText(vorh)); return; }
  // 1. Planen
  const plan = await planeBestellung(o, io, { hosts: HOSTS, optionVorgaben: OPTION_VORGABEN });
  const emp = empfaengerAus(o);
  const befunde = [...plan.befunde, ...emp.befunde];
  if (!plan.items.length && !befunde.length) befunde.push({ art: 'ohne-artikel', text: 'aus der Bestellung ist kein Printful-Artikel entstanden', hart: true });
  if (befunde.some((b) => b.hart) || !plan.items.length) {
    zaehler.ohneAuftrag++;
    console.warn(`⚠️ ${o.name}: kein Printful-Auftrag (${befunde.filter((b) => b.hart).map((b) => b.art).join(', ')})`);
    await befundMelden(tok, o, befunde, 'wurde NICHT an Printful übergeben');
    return;
  }
  if (DRY) {
    zaehler.anstehend++;
    const wie = `${plan.items.length} Artikel, external_id ${ext}: würde als Entwurf angelegt und ${AUTO_CONFIRM && !befunde.length ? 'danach bestätigt (vorbehaltlich Dateistatus und Kosten)' : 'NICHT bestätigt'}`;
    zeilen.push(`${o.name}: ${wie}${befunde.length ? ' [' + [...new Set(befunde.map((b) => b.art))].join(', ') + ']' : ''}`);
    console.log(`[DRY] ${o.name}: ${wie}${befunde.length ? ' (REVIEW: ' + [...new Set(befunde.map((b) => b.art))].join(', ') + ')' : ''}`);
    if (DETAIL) for (const b of befunde) console.log(`[DRY]   [${b.art}] ${b.text}`);
    return;
  }
  // 2. Entwurf anlegen (nie wiederholen: ein Zeitüberschreitung-POST kann «gelang» heissen; darum danach über external_id nachfragen)
  const res = await pf('/orders', 'POST', { external_id: ext, recipient: emp.recipient, items: plan.items }, 60000);
  const pfId = res.ok && res.j && res.j.result && res.j.result.id;
  if (!pfId) {
    if (res.status === 0 || res.status === 408 || res.status === 429 || res.status >= 500 || res.ok) {
      await pause(PAUSE_MS);
      const nach = await pfLesen('/orders/@' + encodeURIComponent(ext), 2);
      if (nach.status === 200 && nach.j && nach.j.result) { await vorhandenBehandeln(tok, o, ext, nach.j.result, 'Anlegen wurde nicht quittiert, der Auftrag existiert aber'); return; }
      const wo = nach.status === 404 ? 'ein Auftrag mit dieser external_id ist nicht zu finden' : `die Nachfrage nach der external_id blieb ohne Antwort (HTTP ${nach.status})`;
      await vorlaeufigerFehler(tok, o, `Anlegen des Printful-Auftrags nicht quittiert (HTTP ${res.status}), ${wo}`, pfText(res)); return;
    }
    if (res.status === 401 || res.status === 403) { fehlerAdd(`${o.name}: Printful verweigert den Zugriff (HTTP ${res.status}): Schlüssel oder Store-ID prüfen`, pfText(res)); return; }
    // Ein 4xx ist nicht immer «Auftrag ungültig»: lehnt Printful eine doppelte external_id so ab (ungemessen), oder legte ein anderer Lauf den Auftrag gerade an, existiert er. Erst nachfragen, dann den harten Befund buchen.
    const nach4 = await pfLesen('/orders/@' + encodeURIComponent(ext), 2);
    if (nach4.status === 200 && nach4.j && nach4.j.result) { await vorhandenBehandeln(tok, o, ext, nach4.j.result, `Printful lehnte das Anlegen ab (HTTP ${res.status}), der Auftrag existiert aber`); return; }
    if (nach4.status !== 404) { await vorlaeufigerFehler(tok, o, `Printful lehnte das Anlegen ab (HTTP ${res.status}); die Nachfrage nach der external_id blieb ohne Antwort (HTTP ${nach4.status})`, pfText(res)); return; }
    zaehler.ohneAuftrag++;
    await befundMelden(tok, o, [{ art: 'printful-abgelehnt', text: `Printful lehnt den Auftrag ab (${pfText(res)})`, hart: true }], 'wurde von Printful abgelehnt');
    return;
  }
  // 3. Sofort markieren: Metafeld, dann Tag. Gelingt das nicht, wird NICHT bestätigt; der nächste Lauf findet den Entwurf über external_id und holt es nach.
  if (!(await tagsSetzen(tok, o, ['printful-synced'], pfId))) { fehlerAdd(`${o.name}: Printful-Entwurf #${pfId} angelegt, aber Metafeld/Tag nicht gesetzt (nicht bestätigt; der nächste Lauf findet ihn über external_id ${ext} und markiert ihn nach)`); zaehler.entwuerfe++; return; }
  // 4. Entwurf nachlesen: Dateien und Kosten
  const weich = befunde.slice();
  const urteilEntwurf = (ord) => ({ d: dateienStatus(ord), k: kostenPruefen({ costs: ord.costs, erloesChf: plan.erloesChf, nettoMin: NETTO_MIN, maxUsd: MAX_KOSTEN_USD }) });
  // fertig = Printful hat die Dateien geprüft (nicht «waiting») UND die Kosten gerechnet (total vorhanden, nicht «calculating»); sonst nach kurzer Pause nochmal lesen
  const lese = await auftragLesen(pfId, (ord) => { const u = urteilEntwurf(ord), c = ord.costs; const gerechnet = !!c && c.total !== null && c.total !== undefined && c.total !== '' && String(c.calculation_status || 'done').toLowerCase() === 'done'; return u.d.art === 'wartet' || !gerechnet ? null : u; });
  console.log(`${o.name}: Printful-Entwurf #${pfId}: Dateien und Kosten ${lese.urteil ? 'fertig' : 'NICHT fertig'} nach ${lese.sek} s Wartezeit`);   // misst, wie lange Printful wirklich braucht (bisher ungemessen)
  if (!lese.order) weich.push({ art: 'entwurf-nicht-lesbar', text: `Entwurf #${pfId} lässt sich nach ${lese.sek} s nicht nachlesen (HTTP ${lese.status || 0}): Dateien und Kosten ungeprüft`, hart: false });
  else {
    const { d, k } = lese.urteil || urteilEntwurf(lese.order);
    if (d.art === 'problem') for (const t of d.texte) weich.push({ art: 'datei-abgelehnt', text: t, hart: false });
    else if (d.art === 'wartet') weich.push({ art: 'datei-wartet', text: `Printful hat die Dateien nach ${lese.sek} Sekunden Wartezeit noch nicht fertig geprüft: Entwurf im Printful-Dashboard ansehen und von Hand bestätigen`, hart: false });
    if (!k.ok) weich.push({ art: k.art, text: k.art === 'kosten-unbekannt' ? `${k.text} (nach ${lese.sek} Sekunden Wartezeit)` : k.text, hart: false });
  }
  if (!AUTO_CONFIRM) weich.push({ art: 'manuell', text: 'automatisches Bestätigen ist aus (PRINTFUL_AUTO_CONFIRM=0): Entwurf im Printful-Dashboard prüfen und bestätigen', hart: false });
  if (weich.length) {
    zaehler.entwuerfe++;
    console.log(`${o.name} → Printful #${pfId} ENTWURF (Review)`);
    await befundMelden(tok, o, weich, `→ Printful-Entwurf #${pfId} (nicht bestätigt)`);
    return;
  }
  // 5. Bestätigen und den Status NACHLESEN. Bei 429 (Drosselung: der Aufruf wurde nicht ausgeführt) einmal nach der Pause wiederholen.
  let c = await pf(`/orders/${pfId}/confirm`, 'POST', null, 60000);
  if (c.status === 429) { await pause(Math.min(60000, Math.max(PAUSE_MS * 2, c.retryAfter * 1000))); c = await pf(`/orders/${pfId}/confirm`, 'POST', null, 60000); }
  const unklar = !c.ok && (c.status === 0 || c.status === 408 || c.status === 429 || c.status >= 500);
  if (!c.ok && !unklar) {
    zaehler.entwuerfe++;
    console.log(`${o.name} → Printful #${pfId} ENTWURF (Review)`);
    await befundMelden(tok, o, [{ art: 'bestaetigen-abgelehnt', text: `Printful lehnt das Bestätigen ab (${pfText(c)})`, hart: false }], `→ Printful-Entwurf #${pfId} (nicht bestätigt)`);
    return;
  }
  const nach = await auftragLesen(pfId, (ord) => { const s = statusBewerten(ord); return s.art === 'wartet' ? null : s; });
  const st = nach.urteil || (nach.order ? statusBewerten(nach.order) : null);
  if (st && st.art === 'bestaetigt') {
    zaehler.bestaetigt++;
    await tagsSetzen(tok, o, ['printful-confirmed']) || fehlerAdd(`${o.name}: Tag printful-confirmed nicht gesetzt`);
    console.log(`${o.name} → Printful #${pfId} BESTÄTIGT (Status ${st.text})`);
    return;
  }
  zaehler.entwuerfe++;
  console.log(`${o.name} → Printful #${pfId} ENTWURF (Review)`);
  const art = st ? st.befund : 'status-unbekannt';
  await befundMelden(tok, o, [{ art, text: st ? st.text : `Status von Auftrag #${pfId} nach dem Bestätigen nicht lesbar${unklar ? ' (Bestätigen unklar: ' + pfText(c) + ')' : ''}`, hart: false }], `→ Printful #${pfId}: NICHT als bestätigt gemeldet`);
}

// Der Auftrag existiert schon (external_id): Tag und Metafeld nachtragen, nie ein zweiter Auftrag
async function vorhandenBehandeln(tok, o, ext, ord, grund) {
  zaehler.vorhanden++;
  const s = statusBewerten(ord);
  console.log(`${o.name}: Printful-Auftrag #${ord.id} existiert schon (external_id ${ext}, Status ${ord.status})${grund ? ': ' + grund : ''}: nichts angelegt`);
  if (!DRY && !(await tagsSetzen(tok, o, ['printful-synced'], ord.id))) fehlerAdd(`${o.name}: Printful-Auftrag #${ord.id} existiert, Metafeld/Tag konnten nicht nachgetragen werden`);
  if (s.art === 'problem') await befundMelden(tok, o, [{ art: 'vorhanden-' + s.befund, text: `Printful-Auftrag #${ord.id} existiert schon (${ext}): ${s.text}`, hart: false }], 'hat schon einen Printful-Auftrag');
  else if (s.art === 'wartet') await befundMelden(tok, o, [{ art: 'vorhanden-entwurf', text: `Printful-Auftrag #${ord.id} existiert schon (${ext}) und ist noch ein Entwurf: im Printful-Dashboard prüfen und bestätigen`, hart: false }], 'hat schon einen Printful-Entwurf');
}

const hatDruckdatei = (li) => (li.customAttributes || []).some((a) => /Druckdatei|Print file|^_pod_karte$/i.test((a && a.key) || ''));

(async function main() {
  const tok = await resolveToken();
  if (!tok) { console.error('❌ Keine funktionierende Shopify-Auth.'); await tg('🔴 LuxeStyle POD-Sync: keine funktionierende Shopify-Anmeldung, der Bestellweg läuft nicht.'); process.exit(1); return; }
  // Bezahlt, unversendet, noch nicht synchronisiert, nicht in der Prüfung. ALLE Seiten lesen, bis MAX POD-Bestellungen da sind (Nicht-POD-Bestellungen verdrängen sie nicht mehr).
  const q = 'status:open financial_status:paid fulfillment_status:unfulfilled -tag:printful-synced -tag:printful-review';
  const kandidaten = []; let cursor = null, seiten = 0, mehr = false;
  while (kandidaten.length < MAX) {
    const d = await gql(tok, ORDERS_Q, { q, n: SEITE, c: cursor });
    const conn = d && d.data && d.data.orders;
    if (!conn) throw new Error('Shopify: keine Bestellliste in der Antwort');
    seiten++;
    for (const e of conn.edges || []) {
      const n = e && e.node; if (!n) continue;
      zaehler.gelesen++;
      if (n.cancelledAt) { console.log(`${n.name}: in Shopify storniert (${n.cancelledAt}), wird nicht an Printful übergeben`); continue; }   // eine stornierte, noch nicht erstattete Bestellung darf nie gedruckt werden
      const lis = ((n.lineItems && n.lineItems.edges) || []).map((x) => x && x.node).filter(Boolean).filter((li) => li.currentQuantity !== 0);   // nachträglich entfernte/erstattete Positionen zählen nicht
      // Prüfen, wenn eine Position Editor-Ware ist, eine Druckdatei-Eigenschaft trägt (auch ohne POD-Tag: Befund) oder die Positionsliste länger ist als eine Abfrage (die 51. könnte Editor-Ware sein)
      if (lis.some((li) => istPod(li) || hatDruckdatei(li)) || (n.lineItems && n.lineItems.pageInfo && n.lineItems.pageInfo.hasNextPage)) kandidaten.push(n);
    }
    mehr = !!(conn.pageInfo && conn.pageInfo.hasNextPage);
    if (!mehr) break;
    cursor = conn.pageInfo.endCursor;
    if (seiten >= MAX_SEITEN) { fehlerAdd(`Seitenlimit (${MAX_SEITEN} Seiten) erreicht: weitere offene Bestellungen blieben ungelesen`); break; }
  }
  if (!kandidaten.length) console.log(`Keine offenen POD-Bestellungen zum Synchronisieren (${zaehler.gelesen} offene Bestellung(en) in ${seiten} Seite(n) gelesen).`);
  for (const o of kandidaten.slice(0, MAX)) {
    if (Date.now() - START > RUN_LIMIT_MS) { fehlerAdd(`Zeitlimit (${Math.round(RUN_LIMIT_MS / 1000)} s) erreicht: ${o.name} und die folgenden Bestellungen bleiben für den nächsten Lauf`); break; }
    try { await bearbeite(tok, o); } catch (e) { fehlerAdd(`${o.name}: unerwarteter Fehler`, String(e && e.message || e).slice(0, 200)); }
  }
  const summary = `Printful-Sync fertig: ${zaehler.bestaetigt} bestätigt, ${zaehler.entwuerfe} Entwurf/Review, ${zaehler.ohneAuftrag} ohne Auftrag (harter Befund), ${zaehler.vorhanden} schon vorhanden, ${zaehler.spaeter} später wieder, ${fehler.length} Fehler${DRY ? ` (DRY_RUN: ${zaehler.anstehend} Bestellung(en) würden angelegt)` : ''}.`;
  if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Printful-Sync\n\n${summary}\n\n${zeilen.length ? zeilen.map((z) => '- ' + z).join('\n') + '\n' : ''}${fehler.length ? '\n**Fehler:**\n' + fehler.map((f) => '- ' + fehlerLog(f)).join('\n') + '\n' : ''}`); } catch { /* Zusammenfassung ist Zugabe */ } }
  if (fehler.length) { fehler.forEach((f) => console.error('✗', fehlerLog(f))); await tg(`🔴 LuxeStyle POD-Sync Fehler:\n${fehler.slice(0, 8).map((f) => esc(fehlerTg(f))).join('\n')}`); process.exitCode = 1; }
  if ((zaehler.bestaetigt || zaehler.entwuerfe) && !DRY) await tg(`✅ LuxeStyle POD: ${esc(summary)}`);
  console.log(summary);
})().catch(async (e) => { console.error('Fataler Fehler:', e); await tg(`🔴 LuxeStyle POD-Sync: fataler Fehler ${esc(e && e.message)}`); process.exit(1); });
