#!/usr/bin/env node
/* LuxeStyle — cj_tracking.mjs (Version 1, 09.11.2026)
 * Rückmeldung CJ → Shopify: meldet versendete CJ-Bestellungen mit Sendungsnummer in Shopify (fulfillmentCreate, bei bereits als
 * «versendet» markierten Bestellungen ohne Nummer fulfillmentTrackingInfoUpdate) und markiert sie mit dem Tag `cj-shipped`.
 *
 * Warum: die Engine legt die CJ-Aufträge `LX<Nr>` selbst an (CJs Shopify-Verbindung kennt sie nicht), CJ meldet nie zurück. Ergebnis am 09.11.2026: sechs
 * bezahlte Bestellungen (#1034 bis #1039) standen in Shopify auf «Nicht versendet», bei #1029 und #1031 war von Hand ohne Sendungsnummer «versendet»
 * gesetzt worden, obwohl CJ #1029 erst am 06.11. aus dem Lager gab. Bei Printful gibt es das schon (printful_tracking.mjs), bei CJ fehlte es.
 *
 * Ablauf je Bestellung (bezahlt, mit mindestens einer CJ-Position, jünger als FENSTER_TAGE, ohne Tag cj-shipped):
 *   1. CJ-Auftrag `LX<Nr>` in der CJ-Liste suchen und sein Detail lesen (Status, Sendungsnummer, Stückzahl).
 *   2. lib/cj_tracking.mjs entscheidet: melden (CJ führt SHIPPED/DELIVERED, Nummer da, Stückzahl passt) / nachtragen (Lieferung ohne Nummer) / warten / Befund.
 *   3. «Befund» (Mensch muss hinsehen: kein CJ-Auftrag nach 24 h, CJ-Auftrag unbezahlt, über 7 Tage im CJ-Lager, storniert, ohne Nummer, Stückzahl weicht ab,
 *      nicht meldbar, unbekannter Status): Telegram EINMAL je Befundart + Tags cj-problem und cj-problem-<art>; WECHSELT die Art, wird neu alarmiert;
 *      verschwindet der Befund, werden die Problem-Tags entfernt.
 *   4. Alles gemeldet → Tag cj-shipped (die Bestellung wird nicht mehr gelesen).
 * Kundenmails: NUR wenn DRY_RUN ausdrücklich aus ist UND KUNDIN_MAILEN nicht «0» ist. Eine bereits zugestellte Sendung (CJ: DELIVERED) wird still gemeldet.
 * Vorgabe ist der TROCKENLAUF: ohne DRY_RUN=0 (oder false/no/nein/off) wird nichts geschrieben, nichts gesendet, nur der Plan ausgegeben.
 * NUR=#1029,#1034 schränkt einen Lauf auf diese Bestellungen ein (kontrollierter erster Einsatz).
 * fulfillmentCreate und fulfillmentTrackingInfoUpdate werden NIE wiederholt (eine Zeitüberschreitung kann «gelang» heissen = doppelte Kundenmail).
 * Exit 1 bei technischem Fehler (CJ oder Shopify nicht lesbar, Schreiben abgelehnt oder Ausgang unbekannt, Alarm nicht zugestellt, Zugangsdaten fehlen,
 * Gesamtzeitlimit überschritten). Befunde sind KEIN Exit 1 (sie stehen in der Zusammenfassung und gehen einmal per Telegram raus).
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), CJ_EMAIL, CJ_API_KEY, [TELEGRAM_*], [DRY_RUN], [KUNDIN_MAILEN], [NUR],
 *      [MAX=50], [FENSTER_TAGE=45], [RUN_LIMIT_MS=480000], [CJ_PAUSE_MS=1200], [CJ_TOKEN_CACHE]
 * Logik (rein, getestet): automation/lib/cj_tracking.mjs; Verhalten: automation/cj_tracking_test.mjs.
 */
import { appendFileSync } from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { planCj, lxNummer, istCjSku } from './lib/cj_tracking.mjs';
import { nachOrtUndFulfillmentOrder } from './lib/printful_tracking.mjs';

const SHOPraw = process.env.SHOPIFY_SHOP || '';
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '').trim();
const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_KEY = (process.env.CJ_API_KEY || '').trim();
const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TG_CHAT = (process.env.TELEGRAM_CHAT_ID || '').trim();
const MAX = Math.max(1, parseInt(process.env.MAX || '50', 10) || 50);
const FENSTER_TAGE = Math.max(1, parseInt(process.env.FENSTER_TAGE || '45', 10) || 45);
// Bestellungen je Abfrage (Kosten der verschachtelten Abfrage: am 09.11.2026 mit 10 je Seite gegen den echten Shop gelesen; nicht erhöhen, ohne neu zu messen)
const SEITE = 10;
const PAUSE_MS = Math.max(0, parseInt(process.env.RETRY_PAUSE_MS || '1500', 10) || 0);
const CJ_PAUSE_MS = process.env.CJ_PAUSE_MS === undefined || process.env.CJ_PAUSE_MS === '' ? 1200 : Math.max(0, parseInt(process.env.CJ_PAUSE_MS, 10) || 0);
const AUS = ['0', 'false', 'no', 'nein', 'off'];
// Umgekehrt zu printful_tracking.mjs: hier schaltet NUR ein ausdrückliches «aus» das Schreiben frei (Kundenmails sind nicht rückholbar).
const LIVE = AUS.includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN).trim().toLowerCase());
const DRY = !LIVE;
const MAILEN = LIVE && !AUS.includes(String(process.env.KUNDIN_MAILEN == null ? '1' : process.env.KUNDIN_MAILEN).trim().toLowerCase());
const NUR = new Set(String(process.env.NUR || '').split(',').map((s) => s.trim().replace(/^#?/, '#')).filter((s) => s.length > 1));
// Shopify unterstützt 2026-01 bis ca. 16.01.2027 (QUELLE shopify.dev, wie printful_tracking.mjs; Wiedervorlage Dezember 2026)
const API = '2026-01';
const CJ_BASIS = 'https://developers.cjdropshipping.com/api2.0/v1';
const RUN_LIMIT_MS = Number.isFinite(Number(process.env.RUN_LIMIT_MS)) && process.env.RUN_LIMIT_MS !== undefined && process.env.RUN_LIMIT_MS !== '' ? Number(process.env.RUN_LIMIT_MS) : 480000;
const START = Date.now();

let SHOP = SHOPraw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Telegram: true = zugestellt, false = Zustellung gescheitert, null = nicht konfiguriert oder Trockenlauf ----------
async function tg(text) {
  if (DRY) { console.log('[DRY] Telegram: ' + String(text).replace(/<[^>]+>/g, '').slice(0, 200)); return null; }
  if (!TG_TOKEN || !TG_CHAT) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) });
    return !!r.ok;
  } catch { return false; }
}

// ---------- Shopify ----------
let apiVersionGesehen = null;
// wiederholbar=true nur für Lesen und idempotentes Schreiben (tagsAdd/-Remove); die Versandmeldungen NIE wiederholen
async function gql(tok, query, variables, wiederholbar = true) {
  let letzte = new Error('Shopify: kein Versuch');
  const versuche = wiederholbar ? 3 : 1;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
      const v = r.headers && r.headers.get && r.headers.get('x-shopify-api-version');
      if (v) apiVersionGesehen = v;
      const j = await r.json().catch(() => ({}));
      // «errors» kann eine Zeichenkette sein (402/403/423 …): immer zu einer Liste machen
      const errs = Array.isArray(j.errors) ? j.errors : (j.errors ? [{ message: typeof j.errors === 'string' ? j.errors : JSON.stringify(j.errors) }] : []);
      const gedrosselt = errs.some((e) => e && e.extensions && e.extensions.code === 'THROTTLED');
      if (r.status === 429 || r.status >= 500 || gedrosselt) { letzte = new Error(`Shopify ${r.status}${gedrosselt ? ' THROTTLED' : ''}`); }
      else if (!r.ok || errs.length) { throw Object.assign(new Error(`Shopify ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`), { endgueltig: true }); }
      else return j;
    } catch (e) { if (e && e.endgueltig) throw e; letzte = e; }
    if (i < versuche - 1) await pause(PAUSE_MS * (i + 1));
  }
  throw letzte;
}
async function works(tok) { try { const r = await gql(tok, '{ shop { name } }'); return !!(r && r.data && r.data.shop && r.data.shop.name); } catch { return false; } }
async function clientCredentials() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  return j.access_token || null;
}
async function resolveToken() {
  if (ADMIN_TOKEN && await works(ADMIN_TOKEN)) return ADMIN_TOKEN;
  if (CID && CSEC) { const t = await clientCredentials().catch(() => null); if (t && await works(t)) return t; }
  return null;
}

const ORDERS_Q = `query($q:String!,$n:Int!,$after:String){ orders(first:$n, after:$after, query:$q, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } edges{ node{
  id name createdAt cancelledAt tags
  lineItems(first:25){ pageInfo{ hasNextPage } nodes{ sku currentQuantity variant{ sku } } }
  fulfillments{ id status trackingInfo{ number } }
  fulfillmentOrders(first:20){ edges{ node{ id status supportedActions{ action } assignedLocation{ location{ id isFulfillmentService } }
    lineItems(first:50){ edges{ node{ id remainingQuantity lineItem{ sku variant{ sku } } } } } } } }
}}}}`;
const FULFILL_M = `mutation($f:FulfillmentInput!){ fulfillmentCreate(fulfillment:$f){ fulfillment{ id status } userErrors{ field message } } }`;
const TRACK_M = `mutation($id:ID!,$t:FulfillmentTrackingInput!,$n:Boolean){ fulfillmentTrackingInfoUpdate(fulfillmentId:$id, trackingInfoInput:$t, notifyCustomer:$n){ fulfillment{ id status } userErrors{ field message } } }`;
const TAG_ADD = `mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`;
const TAG_REMOVE = `mutation($id:ID!,$tags:[String!]!){ tagsRemove(id:$id,tags:$tags){ userErrors{ message } } }`;

const skuVon = (li) => (li && li.variant && li.variant.sku) || (li && li.sku) || '';
const ANDERE_ZUSTAENDE = new Set(['CANCELLED', 'ERROR', 'FAILURE']); // Lieferungen, deren Sendungsnummer NICHT als «Shopify kennt sie» zählt

const fehler = []; // technische Fehler → Exit 1
const zusammenfassung = [];
const zaehler = { offen: 0, gelesen: 0, gemeldet: 0, nachgetragen: 0, fertig: 0, wartet: 0, befunde: 0, uebersprungen: 0 };

// Rückgabe: {ok} bei Erfolg; {ok:false, unbekannt} bei Fehler. «unbekannt» = Zeitüberschreitung/5xx/Netz (die Änderung kann trotzdem angekommen sein).
async function schreibe(tok, was, query, variables, pruefe, wiederholbar = true) {
  if (DRY) { console.log(`[DRY] ${was}`); return { ok: true, dry: true }; }
  try {
    const r = await gql(tok, query, variables, wiederholbar);
    const fehl = pruefe(r);
    if (fehl) { fehler.push(`${was}: ${fehl}`); console.error(`✗ ${was}: ${fehl}`); return { ok: false, unbekannt: false }; }
    return { ok: true, data: r.data };
  } catch (e) { fehler.push(`${was}: ${e.message}`); console.error(`✗ ${was}: ${e.message}`); return { ok: false, unbekannt: !(e && e.endgueltig) }; }
}
// Erfolg nur, wenn userErrors als LEERE Liste vorhanden ist (fehlt das Feld, zählt es als Fehler: sonst würden Ablehnungen unsichtbar)
const tagPruefung = (key) => (r) => { const ue = r && r.data && r.data[key] && r.data[key].userErrors; return Array.isArray(ue) && ue.length === 0 ? null : (ue ? JSON.stringify(ue) : 'Antwort ohne userErrors'); };
const versandPruefung = (key) => (x) => {
  const f = x && x.data && x.data[key];
  if (!f || !f.fulfillment || !f.fulfillment.id) return 'Antwort ohne fulfillment.id';
  return Array.isArray(f.userErrors) && f.userErrors.length === 0 ? null : (f.userErrors ? JSON.stringify(f.userErrors) : 'Antwort ohne userErrors');
};
const tagsHinzu = (tok, o, tags) => schreibe(tok, `${o.name}: Tag ${tags.join(',')}`, TAG_ADD, { id: o.id, tags }, tagPruefung('tagsAdd'));
const tagsWeg = (tok, o, tags) => schreibe(tok, `${o.name}: Tag entfernen ${tags.join(',')}`, TAG_REMOVE, { id: o.id, tags }, tagPruefung('tagsRemove'));

async function alleBestellungen(tok, q) {
  const out = []; const gesehen = new Set();
  let after = null;
  for (let seite = 0; seite < 12 && out.length < MAX; seite++) {
    const j = await gql(tok, ORDERS_Q, { q, n: SEITE, after });
    const o = j.data && j.data.orders;
    let neu = 0;
    for (const e of (o && o.edges) || []) { if (e && e.node && !gesehen.has(e.node.id)) { gesehen.add(e.node.id); out.push(e.node); neu++; } }
    const next = o && o.pageInfo && o.pageInfo.hasNextPage ? o.pageInfo.endCursor : null;
    if (!next || next === after || neu === 0) break; // Schutz vor Endlosschleife bei hängendem Cursor
    after = next;
  }
  return out.slice(0, MAX);
}

// ---------- CJ ----------
let cjTok = '';
const cjPause = () => (CJ_PAUSE_MS ? pause(CJ_PAUSE_MS) : Promise.resolve());
const cjGet = (pfad, context) => cjFetch(`${CJ_BASIS}/${pfad}`, { context, headers: { 'CJ-Access-Token': cjTok } });
async function cjListe() {
  const alle = [];
  for (let n = 1; n <= 6; n++) {
    const r = await cjGet(`shopping/order/list?pageNum=${n}&pageSize=50`, 'CJ-Aufträge');
    const l = (r && r.data && r.data.list) || [];
    alle.push(...l);
    if (l.length < 50) break;
    await cjPause();
  }
  return alle;
}
async function cjDetail(orderId) {
  const r = await cjGet(`shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`, 'CJ-Auftrag');
  return (r && r.data) || {};
}
const cjEinheiten = (d) => (Array.isArray(d.productList) ? d.productList.reduce((s, p) => s + (Number(p && p.quantity) || 0), 0) : null);

// ---------- Bestellung → Eingabe der reinen Logik ----------
function baueShop(o) {
  const zeilen = []; let pausiert = 0;
  for (const { node: fo } of (o.fulfillmentOrders && o.fulfillmentOrders.edges) || []) {
    // CLOSED/CANCELLED werden ignoriert: ihre remainingQuantity ist veraltet (z. B. nach dem Verschieben/Aufteilen einer Fulfillment-Order, GEMESSEN an #1004)
    if (fo.status === 'CLOSED' || fo.status === 'CANCELLED') continue;
    const ort = fo.assignedLocation && fo.assignedLocation.location;
    if (ort && ort.isFulfillmentService) continue; // Positionen an einem Fulfillment-Service meldet dessen App selbst: nie anfassen
    const offen = fo.status === 'OPEN' || fo.status === 'IN_PROGRESS';
    const darfMelden = offen && (fo.supportedActions || []).some((a) => a && a.action === 'CREATE_FULFILLMENT');
    for (const { node: l } of (fo.lineItems && fo.lineItems.edges) || []) {
      if (!istCjSku(skuVon(l.lineItem))) continue;
      const rest = Number(l.remainingQuantity) || 0;
      if (rest <= 0) continue;
      if (!darfMelden) { pausiert += 1; continue; }
      zeilen.push({ foId: fo.id, lineId: l.id, ortId: (ort && ort.id) || null, remaining: rest });
    }
  }
  const li = o.lineItems || {};
  const cjLinien = (li.nodes || []).filter((l) => istCjSku(skuVon(l)));
  // mehr als 25 Positionen: die Stückzahl ist nicht sicher bekannt (null → die Logik meldet nichts)
  const cjEinheitenShop = li.pageInfo && li.pageInfo.hasNextPage ? null : cjLinien.reduce((s, l) => s + (Number(l.currentQuantity) || 0), 0);
  const lieferungen = (o.fulfillments || []).map((f) => ({ id: f.id, status: f.status, nummern: (f.trackingInfo || []).map((t) => t && t.number).filter(Boolean) }));
  const bekannteNummern = lieferungen.filter((l) => !ANDERE_ZUSTAENDE.has(l.status)).flatMap((l) => l.nummern);
  return { name: o.name, lx: lxNummer(o.name), createdAt: o.createdAt, zeilen, pausiert, cjEinheiten: cjEinheitenShop, cjLinien: cjLinien.length, lieferungen, bekannteNummern };
}

// Befund {art, text} melden oder aufheben. Die ART steckt im Tag (cj-problem-<art>): wechselt der Befund, wird neu alarmiert; derselbe Befund nur einmal.
// Telegram-Ausfall → kein Tag, damit der nächste Lauf den Alarm wiederholt. Rückgabe false = ein Schreiben ist gescheitert.
async function befundBehandeln(tok, o, befund) {
  const tags = o.tags || [];
  const vorhanden = tags.filter((t) => t === 'cj-problem' || t.startsWith('cj-problem-'));
  if (!befund) { if (vorhanden.length) return (await tagsWeg(tok, o, vorhanden)).ok; return true; }
  zaehler.befunde++;
  zusammenfassung.push(`${o.name}: ${befund.text}`);
  const artTag = 'cj-problem-' + befund.art;
  if (tags.includes(artTag)) return true; // diese Art schon gemeldet
  const ok = await tg(`🔴 LuxeStyle CJ: Bestellung <b>${esc(o.name)}</b>: ${esc(befund.text)}.`);
  if (ok === false) { fehler.push(`${o.name}: Telegram-Alarm nicht zugestellt (Befund: ${befund.text})`); return false; }
  const hinzu = await tagsHinzu(tok, o, ['cj-problem', artTag]);
  const alt = vorhanden.filter((t) => t !== 'cj-problem' && t !== artTag);
  if (alt.length) await tagsWeg(tok, o, alt); // Tags einer früheren Befundart aufräumen
  return hinzu.ok;
}

async function verarbeite(tok, listeMap, o) {
  const shop = baueShop(o);
  const eintrag = shop.lx ? listeMap.get(shop.lx) : null;
  let cj = null;
  if (eintrag) {
    await cjPause();
    let d;
    try { d = await cjDetail(eintrag.orderId); } catch (e) { fehler.push(`${o.name}: CJ-Auftrag ${shop.lx} nicht lesbar (${e.message})`); return; }
    zaehler.gelesen++;
    cj = { status: d.orderStatus || eintrag.orderStatus, trackNumber: d.trackNumber, logisticName: d.logisticName, trackingUrl: d.trackingUrl,
      createDate: d.createDate || eintrag.createDate || eintrag.createAt, paymentDate: d.paymentDate, outWarehouseTime: d.outWarehouseTime, einheiten: cjEinheiten(d) };
  }
  const plan = planCj({ shop, cj });
  if (plan.wartet) { zaehler.wartet++; zusammenfassung.push(`${o.name}: ${plan.wartet}`); }

  let meldungFehler = false;
  for (const a of plan.aktionen) {
    const notify = !!a.notify && MAILEN;
    const trackingInfo = { number: a.nummer, ...(a.url ? { url: a.url } : {}), company: a.firma };
    if (a.art === 'nachtragen') {
      const res = await schreibe(tok, `${o.name}: Sendungsnummer nachtragen (${a.nummer})`, TRACK_M, { id: a.lieferungId, t: trackingInfo, n: notify }, versandPruefung('fulfillmentTrackingInfoUpdate'), false);
      if (!res.ok) { meldungFehler = true; await tg(ausgangText(o, a, res)); break; }
      zaehler.nachgetragen++;
    } else {
      const gruppen = nachOrtUndFulfillmentOrder(a.positionen);
      for (const [i, lineItemsByFulfillmentOrder] of gruppen.entries()) {
        const input = { notifyCustomer: i === 0 && notify, trackingInfo, lineItemsByFulfillmentOrder };
        const res = await schreibe(tok, `${o.name}: als versendet melden (${a.nummer})`, FULFILL_M, { f: input }, versandPruefung('fulfillmentCreate'), false);
        if (!res.ok) { meldungFehler = true; await tg(ausgangText(o, a, res)); break; }
      }
      if (meldungFehler) break;
      zaehler.gemeldet++;
    }
    const was = a.art === 'nachtragen' ? 'Sendungsnummer nachgetragen' : 'versendet gemeldet';
    zusammenfassung.push(`${o.name}: ${DRY ? '[DRY] ' : ''}${was}, ${a.firma} ${a.nummer}, Kundenmail ${notify ? 'ja' : 'nein'}${DRY && a.notify ? ' (nach Freigabe)' : ''}`);
    console.log(`${o.name}: ${DRY ? '[DRY] ' : ''}${was} (${a.firma} ${a.nummer}, Kundenmail ${notify ? 'ja' : 'nein'}${a.positionen ? ', ' + a.positionen.length + ' Position(en)' : ''})`);
    if (!DRY) await tg(`📦 LuxeStyle CJ: <b>${esc(o.name)}</b> ${a.art === 'nachtragen' ? 'Sendungsnummer nachgetragen' : 'versendet'} (${esc(a.firma)} ${esc(a.nummer)}). ${notify ? 'Kundenmail ausgelöst.' : 'Ohne Kundenmail.'}`);
  }
  if (meldungFehler) return;

  const tagsOk = await befundBehandeln(tok, o, plan.befund);
  // «abgeschlossen» nur, wenn die Problem-Tags sauber entfernt werden konnten (sonst bliebe shipped + problem hängen); sonst beim nächsten Lauf nochmal
  if (plan.fertig && tagsOk !== false && !plan.befund) {
    zaehler.fertig++;
    await tagsHinzu(tok, o, ['cj-shipped']);
  }
}
const ausgangText = (o, a, res) => (res.unbekannt
  ? `🔴 LuxeStyle CJ: Versandmeldung für <b>${esc(o.name)}</b> (${esc(a.nummer)}): Ausgang unbekannt. ERST in Shopify nachsehen, ob die Bestellung schon als versendet steht; sonst meldet der nächste Lauf selbst. Nicht von Hand eintragen, bevor das geprüft ist.`
  : `🔴 LuxeStyle CJ: Versandmeldung für <b>${esc(o.name)}</b> (${esc(a.nummer)}) von Shopify abgelehnt, bitte von Hand eintragen.`);

async function ende(zeile) {
  console.log(zeile);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### CJ-Rückmeldung${DRY ? ' (Trockenlauf)' : ''}\n\n${zeile}\n\n${zusammenfassung.map((x) => '- ' + x).join('\n')}\n${fehler.length ? '\n**Fehler:**\n' + fehler.map((x) => '- ' + x).join('\n') + '\n' : ''}`); } catch { /* Zusammenfassung ist Zugabe */ }
  }
  if (fehler.length) { await tg(`🔴 LuxeStyle CJ-Rückmeldung Fehler:\n${fehler.slice(0, 8).map(esc).join('\n')}`); process.exit(1); }
}

(async function main() {
  if (!CJ_EMAIL || !CJ_KEY || (!ADMIN_TOKEN && !(CID && CSEC))) {
    const fehlt = [(!CJ_EMAIL || !CJ_KEY) && 'CJ_EMAIL/CJ_API_KEY', (!ADMIN_TOKEN && !(CID && CSEC)) && 'Shopify-Zugang'].filter(Boolean).join(' und ');
    console.error(`❌ Zugangsdaten fehlen (${fehlt}): die Rückmeldung läuft NICHT.`);
    await tg(`🔴 LuxeStyle CJ-Rückmeldung: ${esc(fehlt)} fehlt, die Rückmeldung läuft nicht.`);
    process.exit(1); return;
  }
  const tok = await resolveToken();
  if (!tok) { console.error('❌ Keine funktionierende Shopify-Auth.'); await tg('🔴 LuxeStyle CJ-Rückmeldung: keine funktionierende Shopify-Anmeldung, die Rückmeldung läuft nicht.'); process.exit(1); return; }
  try { cjTok = await cjToken({ email: CJ_EMAIL, key: CJ_KEY }); } catch (e) { fehler.push('CJ-Anmeldung: ' + e.message); }
  if (!cjTok) { if (!fehler.length) fehler.push('CJ-Anmeldung: keine Zugangsmarke erhalten'); await ende('CJ-Rückmeldung abgebrochen: keine CJ-Anmeldung.'); return; }

  let liste = [];
  try { liste = await cjListe(); } catch (e) { fehler.push('CJ-Aufträge lesen: ' + e.message); await ende('CJ-Rückmeldung abgebrochen: CJ-Aufträge nicht lesbar.'); return; }
  const listeMap = new Map();
  for (const x of liste) { if (x && /^LX\d+$/i.test(String(x.orderNum || ''))) listeMap.set(String(x.orderNum).toUpperCase(), x); }

  const seit = new Date(Date.now() - FENSTER_TAGE * 86400 * 1000).toISOString().slice(0, 10);
  const qOffen = `financial_status:paid (fulfillment_status:unfulfilled OR fulfillment_status:partial) -tag:cj-shipped created_at:>=${seit}`;
  const qFertig = `financial_status:paid fulfillment_status:shipped -tag:cj-shipped created_at:>=${seit}`; // von Hand als versendet markiert: Sendungsnummer fehlt?
  let bestellungen = [];
  try {
    const a = await alleBestellungen(tok, qOffen);
    const b = await alleBestellungen(tok, qFertig);
    const gesehen = new Set();
    for (const o of [...a, ...b]) { if (!gesehen.has(o.id)) { gesehen.add(o.id); bestellungen.push(o); } }
  } catch (e) { fehler.push('Bestellungen lesen: ' + e.message); }
  // nur bezahlte, nicht stornierte Bestellungen mit CJ-Position; bereits vollständig gemeldete (jede Lieferung mit Nummer, nichts offen) brauchen keinen Blick
  const relevant = bestellungen.filter((o) => {
    if (o.cancelledAt) return false;
    if (NUR.size && !NUR.has(o.name)) return false;
    const s = baueShop(o);
    if (s.cjLinien === 0) { zaehler.uebersprungen++; return false; }
    const offen = s.zeilen.length > 0 || s.pausiert > 0;
    const ohneNummer = s.lieferungen.some((l) => !ANDERE_ZUSTAENDE.has(l.status) && l.nummern.length === 0);
    if (!offen && !ohneNummer) { zaehler.uebersprungen++; return false; }
    return true;
  });
  zaehler.offen = relevant.length;
  for (const [i, o] of relevant.entries()) {
    if (Date.now() - START > RUN_LIMIT_MS) { fehler.push(`Zeitlimit (${Math.round(RUN_LIMIT_MS / 1000)} s) erreicht: ${relevant.length - i} Bestellung(en) nicht bearbeitet`); break; }
    try { await verarbeite(tok, listeMap, o); } catch (e) { fehler.push(`${o.name}: ${e.message}`); console.error(`✗ ${o.name}:`, e.message); }
  }
  if (apiVersionGesehen && apiVersionGesehen !== API) zusammenfassung.push(`Hinweis: Shopify antwortete mit API-Version ${apiVersionGesehen} statt ${API}`);
  await ende(`CJ-Rückmeldung fertig: ${zaehler.offen} Bestellung(en) zu prüfen, ${zaehler.gelesen} bei CJ gelesen, ${zaehler.gemeldet} gemeldet, ${zaehler.nachgetragen} Nummer(n) nachgetragen, ${zaehler.fertig} abgeschlossen, ${zaehler.wartet} warten, ${zaehler.befunde} Befund(e), ${zaehler.uebersprungen} übersprungen, ${fehler.length} Fehler${DRY ? ' (Trockenlauf)' : ''}.`);
})().catch(async (e) => { console.error('Fataler Fehler:', e); await tg(`🔴 LuxeStyle CJ-Rückmeldung: fataler Fehler ${esc(e && e.message)}`); process.exit(1); });
