#!/usr/bin/env node
/* LuxeStyle — printful_tracking.mjs (Version 2, 03.11.2026 nach unabhängiger Prüfung)
 * Rückmeldung Printful → Shopify: meldet versendete POD-Bestellungen mit Sendungsnummer in Shopify
 * (fulfillmentCreate + notifyCustomer = die normale Shopify-Versandmail) und markiert sie mit Tag `printful-shipped`.
 *
 * Warum: printful_sync.mjs legt den Druckauftrag an und merkt sich die Nummer im Metafeld printful.order_id, meldet aber nie zurück.
 * Printful schreibt «versendet» nur per Mail an den Besitzer; die Bestellung blieb in Shopify «Nicht versendet» (Fall #1033, 03.11.2026).
 *
 * Ablauf je Bestellung (Tag printful-synced, noch ohne printful-shipped, jünger als FENSTER_TAGE, nicht storniert):
 *   0. Positionen an einem Fulfillment-SERVICE-Standort (z. B. die 25 «Selbst gestalten»-Produkte am Standort «Printful», dort meldet die
 *      Printful-App selbst) werden nie angefasst: die Bestellung wird übersprungen.
 *   1. Printful-Auftrag lesen (GET /orders/<id>); Empfänger gegen die Shop-Adresse prüfen.
 *   2. Jede Sendung MIT Sendungsnummer, die Shopify noch nicht kennt, wird den offenen POD-Positionen zugeordnet (Variante aus der SKU)
 *      und gemeldet. Lässt sich eine Sendung nicht eindeutig zuordnen, wird sie NICHT gemeldet.
 *   3. «Befund» (Mensch muss hinsehen: failed/canceled/onhold, nicht zuordenbar, Position ohne Variante, fulfilled aber Shop offen, Entwurf nie
 *      bestätigt, ohne Fortschritt, unbekannter Status, Auftrag fehlt): Telegram EINMAL + Tag printful-problem; verschwindet der Befund, wird das Tag entfernt.
 *   4. Alles gemeldet und Printful «fulfilled» → Tag printful-shipped (die Bestellung wird nicht mehr gelesen).
 * Wächter: bezahlte, unversendete POD-Bestellung ohne Tag printful-synced, älter als 12 Stunden → einmal Telegram + Tag printful-wartet.
 * Idempotent: bekannte Sendungsnummern (auch Gross-/Kleinschreibung) und die verbleibende Menge der Fulfillment-Orders verhindern doppelte Meldungen.
 * Exit 1 bei technischem Fehler (nicht lesbar, Schreiben abgelehnt, Alarm nicht zugestellt, Zugangsdaten fehlen). Befunde sind KEIN Exit 1 (sie stehen
 * in der Zusammenfassung und gehen einmal per Telegram raus). DRY_RUN: alles ausser '', '0', 'false', 'no', 'nein', 'off' gilt als Trockenlauf.
 * ENV: PRINTFUL_API_KEY, [PRINTFUL_STORE_ID], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), [TELEGRAM_*], [MAX=50], [FENSTER_TAGE=45], [DRY_RUN]
 * Logik (rein, getestet): automation/lib/printful_tracking.mjs; Verhalten: automation/printful_tracking_test.mjs.
 */
import { appendFileSync } from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { planVersand, empfaengerPasst, nachOrtUndFulfillmentOrder, variantIdVonSku } from './lib/printful_tracking.mjs';

const SHOPraw = process.env.SHOPIFY_SHOP || '';
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '').trim();
const PF_KEY = (process.env.PRINTFUL_API_KEY || '').trim();
const PF_STORE = (process.env.PRINTFUL_STORE_ID || '').trim();
const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TG_CHAT = (process.env.TELEGRAM_CHAT_ID || '').trim();
const MAX = Math.max(1, parseInt(process.env.MAX || '50', 10) || 50);
const FENSTER_TAGE = Math.max(1, parseInt(process.env.FENSTER_TAGE || '45', 10) || 45);
const SEITE = 10; // Bestellungen je Abfrage (Kosten der verschachtelten Abfrage: 50 je Seite kostete 884 von 1000 Punkten)
const WAECHTER_STUNDEN = 12;
const PAUSE_MS = Math.max(0, parseInt(process.env.RETRY_PAUSE_MS || '1500', 10) || 0);
const DRY = !['', '0', 'false', 'no', 'nein', 'off'].includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN).trim().toLowerCase());
const API = '2026-01';

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
// wiederholbar=true nur für Lesen und idempotentes Schreiben (tagsAdd/-Remove); fulfillmentCreate NIE wiederholen (Zeitüberschreitung kann «gelang» heissen = doppelte Mail)
async function gql(tok, query, variables, wiederholbar = true) {
  let letzte = new Error('Shopify: kein Versuch');
  const versuche = wiederholbar ? 3 : 1;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
      const v = r.headers && r.headers.get && r.headers.get('x-shopify-api-version');
      if (v) apiVersionGesehen = v;
      const j = await r.json().catch(() => ({}));
      const gedrosselt = (j.errors || []).some((e) => e && e.extensions && e.extensions.code === 'THROTTLED');
      if (r.status === 429 || r.status >= 500 || gedrosselt) { letzte = new Error(`Shopify ${r.status}${gedrosselt ? ' THROTTLED' : ''}`); }
      else if (!r.ok || j.errors) { throw Object.assign(new Error(`Shopify ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`), { endgueltig: true }); }
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

// ---------- Printful ----------
async function pf(path) {
  const headers = { Authorization: 'Bearer ' + PF_KEY, 'Content-Type': 'application/json' };
  if (PF_STORE) headers['X-PF-Store-Id'] = PF_STORE;
  let letzte = new Error('Printful: kein Versuch');
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://api.printful.com' + path, { headers, signal: AbortSignal.timeout(30000) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429 || r.status >= 500) { letzte = new Error(`Printful ${r.status}`); const ra = parseInt((r.headers && r.headers.get && r.headers.get('retry-after')) || '0', 10) || 0; if (i < 2) await pause(Math.max(PAUSE_MS * (i + 1), Math.min(ra, 30) * (PAUSE_MS ? 1000 : 0))); continue; }
      return { ok: r.ok, status: r.status, j };
    } catch (e) { letzte = e; if (i < 2) await pause(PAUSE_MS * (i + 1)); }
  }
  throw letzte;
}

const ORDERS_Q = `query($q:String!,$n:Int!,$after:String){ orders(first:$n, after:$after, query:$q, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } edges{ node{
  id name createdAt cancelledAt tags
  shippingAddress{ name zip countryCodeV2 }
  mf: metafield(namespace:"printful", key:"order_id"){ value }
  fulfillments{ status trackingInfo{ number } }
  fulfillmentOrders(first:20){ edges{ node{ id status supportedActions{ action } assignedLocation{ location{ id } }
    lineItems(first:50){ edges{ node{ id remainingQuantity lineItem{ sku variant{ sku } product{ tags } } } } } } } }
}}}}`;

const FULFILL_M = `mutation($f:FulfillmentInput!){ fulfillmentCreate(fulfillment:$f){ fulfillment{ id status } userErrors{ field message } } }`;
const TAG_ADD = `mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`;
const TAG_REMOVE = `mutation($id:ID!,$tags:[String!]!){ tagsRemove(id:$id,tags:$tags){ userErrors{ message } } }`;

const istPod = (li) => { const t = ((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase()); return t.includes('wunschdesign') || t.includes('printful_personalized_product'); };
const skuVon = (li) => (li && li.variant && li.variant.sku) || (li && li.sku) || ''; // gleiche Rangfolge wie printful_sync.mjs
const ANDERE_ZUSTAENDE_ERLEDIGT = new Set(['CANCELLED', 'ERROR', 'FAILURE']); // Lieferungen, deren Sendungsnummer NICHT als «Shopify kennt sie» zählt

const fehler = []; // technische Fehler → Exit 1
const zusammenfassung = [];
const zaehler = { offen: 0, gelesen: 0, gemeldet: 0, fertig: 0, wartet: 0, befunde: 0, dienst: 0, wartetAufSync: 0 };

async function schreibe(tok, was, query, variables, pruefe, wiederholbar = true) {
  if (DRY) { console.log(`[DRY] ${was}`); return { ok: true, dry: true }; }
  try {
    const r = await gql(tok, query, variables, wiederholbar);
    const fehl = pruefe(r);
    if (fehl) { fehler.push(`${was}: ${fehl}`); console.error(`✗ ${was}: ${fehl}`); return { ok: false }; }
    return { ok: true, data: r.data };
  } catch (e) { fehler.push(`${was}: ${e.message}`); console.error(`✗ ${was}: ${e.message}`); return { ok: false }; }
}
// Erfolg nur, wenn userErrors als LEERE Liste vorhanden ist (fehlt das Feld, zählt es als Fehler: sonst würden Ablehnungen unsichtbar)
const tagPruefung = (key) => (r) => { const ue = r && r.data && r.data[key] && r.data[key].userErrors; return Array.isArray(ue) && ue.length === 0 ? null : (ue ? JSON.stringify(ue) : 'Antwort ohne userErrors'); };
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

// POD-Positionen einer Bestellung nach Meldbarkeit sortieren
function podZeilen(o) {
  const zeilen = []; let dienst = 0; let pausiert = 0;
  for (const { node: fo } of (o.fulfillmentOrders && o.fulfillmentOrders.edges) || []) {
    const offen = fo.status === 'OPEN' || fo.status === 'IN_PROGRESS';
    const darfMelden = offen && (fo.supportedActions || []).some((a) => a && a.action === 'CREATE_FULFILLMENT');
    const ortId = (fo.assignedLocation && fo.assignedLocation.location && fo.assignedLocation.location.id) || null;
    for (const { node: l } of (fo.lineItems && fo.lineItems.edges) || []) {
      if (!istPod(l.lineItem)) continue;
      const rest = Number(l.remainingQuantity) || 0;
      if (rest <= 0) continue;
      if (offen && !darfMelden) { dienst += 1; continue; } // Service-Standort: meldet die Fremd-App selbst
      if (!offen) { pausiert += 1; continue; }              // pausiert/geplant/unvollständig: jetzt nicht meldbar
      zeilen.push({ foId: fo.id, lineId: l.id, ortId, remaining: rest, variantId: variantIdVonSku(skuVon(l.lineItem)) });
    }
  }
  return { zeilen, dienst, pausiert };
}
const bekannteNummern = (o) => (o.fulfillments || []).filter((f) => !ANDERE_ZUSTAENDE_ERLEDIGT.has(f && f.status)).flatMap((f) => (f.trackingInfo || []).map((t) => t && t.number)).filter(Boolean);

// Befund melden (einmal) oder aufheben; Telegram-Ausfall → kein Tag, damit der nächste Lauf den Alarm wiederholt
async function befundBehandeln(tok, o, text) {
  const hat = (o.tags || []).includes('printful-problem');
  if (!text) { if (hat) await tagsWeg(tok, o, ['printful-problem']); return; }
  zaehler.befunde++;
  zusammenfassung.push(`${o.name}: ${text}`);
  if (hat) return; // schon gemeldet
  const ok = await tg(`🔴 LuxeStyle POD: Bestellung <b>${esc(o.name)}</b>: ${esc(text)}.`);
  if (ok === false) { fehler.push(`${o.name}: Telegram-Alarm nicht zugestellt (Befund: ${text})`); return; }
  await tagsHinzu(tok, o, ['printful-problem']);
}

async function verarbeite(tok, o) {
  if (o.cancelledAt) { zusammenfassung.push(`${o.name}: in Shopify storniert, übersprungen`); return; }
  const pz = podZeilen(o);
  if (pz.dienst > 0) { zaehler.dienst++; zusammenfassung.push(`${o.name}: POD-Position am Service-Standort (Printful-App meldet selbst), übersprungen`); return; }
  const pfId = o.mf && o.mf.value;
  if (!pfId) { await befundBehandeln(tok, o, 'Tag printful-synced ohne Metafeld printful.order_id (Auftragsnummer fehlt)'); return; }
  let r;
  try { r = await pf('/orders/' + encodeURIComponent(pfId)); } catch (e) { fehler.push(`${o.name}: Printful-Auftrag ${pfId} nicht lesbar (${e.message})`); return; }
  if (r.status === 404) { await befundBehandeln(tok, o, `Printful-Auftrag ${pfId} nicht gefunden (404, gelöscht?)`); return; }
  if (!r.ok || !r.j || !r.j.result) { fehler.push(`${o.name}: Printful-Auftrag ${pfId} nicht lesbar (HTTP ${r.status})`); return; }
  zaehler.gelesen++;
  const pfOrder = r.j.result;

  const em = empfaengerPasst(o.shippingAddress, pfOrder.recipient);
  if (!em.ok) { await befundBehandeln(tok, o, `${em.grund}: Printful-Auftragsnummer ${pfId} gehört vermutlich zu einer anderen Bestellung`); return; }

  const alter = (Date.now() - Date.parse(o.createdAt)) / 3600000;
  const plan = planVersand({ pfOrder, foZeilen: pz.zeilen, bekannteNummern: bekannteNummern(o), alterStunden: Number.isFinite(alter) ? alter : 0 });
  if (pz.pausiert > 0) { plan.fertig = false; if (!plan.befund) plan.befund = `${pz.pausiert} POD-Position(en) liegen in einer pausierten oder geplanten Fulfillment-Order: Sendung kann nicht gemeldet werden`; }
  for (const u of plan.uebersprungen) zusammenfassung.push(`${o.name}: Sendung ${u.nummer || u.shipmentId} übersprungen (${u.grund})`);

  let meldungFehler = false;
  for (const a of plan.aktionen) {
    const gruppen = nachOrtUndFulfillmentOrder(a.positionen);
    for (const [i, lineItemsByFulfillmentOrder] of gruppen.entries()) {
      const input = { notifyCustomer: i === 0, trackingInfo: { number: a.nummer, ...(a.url ? { url: a.url } : {}), company: a.firma }, lineItemsByFulfillmentOrder };
      const res = await schreibe(tok, `${o.name}: als versendet melden (${a.nummer})`, FULFILL_M, { f: input }, (x) => {
        const f = x && x.data && x.data.fulfillmentCreate;
        if (!f || !f.fulfillment || !f.fulfillment.id) return 'Antwort ohne fulfillment.id';
        return Array.isArray(f.userErrors) && f.userErrors.length === 0 ? null : (f.userErrors ? JSON.stringify(f.userErrors) : 'Antwort ohne userErrors');
      }, false);
      if (!res.ok) { meldungFehler = true; await tg(`🔴 LuxeStyle POD: Versandmeldung für <b>${esc(o.name)}</b> (${esc(a.nummer)}) gescheitert, bitte von Hand eintragen.`); break; }
    }
    if (meldungFehler) break;
    zaehler.gemeldet++;
    zusammenfassung.push(`${o.name}: ${DRY ? '[DRY] ' : ''}versendet gemeldet, ${a.firma} ${a.nummer}`);
    console.log(`${o.name}: ${DRY ? '[DRY] ' : ''}versendet gemeldet (${a.firma} ${a.nummer}, ${a.positionen.length} Position(en))`);
    if (!DRY) await tg(`📦 LuxeStyle POD: <b>${esc(o.name)}</b> versendet (${esc(a.firma)} ${esc(a.nummer)}). Kundenmail ausgelöst.`);
  }
  if (meldungFehler) return;
  if (plan.wartet.length) { zaehler.wartet++; zusammenfassung.push(`${o.name}: Sendung ohne Sendungsnummer, warte`); }

  await befundBehandeln(tok, o, plan.befund);
  if (plan.fertig) { zaehler.fertig++; await tagsHinzu(tok, o, ['printful-shipped']); }
}

async function waechter(tok, seit) {
  const grenze = Date.now() - WAECHTER_STUNDEN * 3600 * 1000;
  // ohne «-tag:printful-review»: ein fehlgeschlagener Druckauftrag trägt nur dieses Tag und gehört ebenfalls gemeldet
  const q = `financial_status:paid fulfillment_status:unfulfilled -tag:printful-synced -tag:printful-wartet created_at:>=${seit}`;
  const liste = await alleBestellungen(tok, q);
  for (const o of liste) {
    if (o.cancelledAt || new Date(o.createdAt).getTime() > grenze) continue;
    const pz = podZeilen(o);
    if (pz.dienst > 0 || !pz.zeilen.length) continue;
    zaehler.wartetAufSync++;
    zusammenfassung.push(`${o.name}: bezahlte POD-Bestellung ohne Printful-Auftrag (älter als ${WAECHTER_STUNDEN} h)`);
    const ok = await tg(`🟠 LuxeStyle POD: Bestellung <b>${esc(o.name)}</b> ist bezahlt, trägt aber kein Tag printful-synced (Druckauftrag unbekannt). Erst im Printful-Dashboard nachsehen, ob es schon einen Auftrag gibt, dann erst «Printful-Sync» starten (sonst doppelter Auftrag).`);
    if (ok === false) { fehler.push(`${o.name}: Telegram-Alarm nicht zugestellt (Wächter)`); continue; }
    await tagsHinzu(tok, o, ['printful-wartet']);
  }
}

async function ende(zeile) {
  console.log(zeile);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Printful-Rückmeldung\n\n${zeile}\n\n${zusammenfassung.map((x) => '- ' + x).join('\n')}\n${fehler.length ? '\n**Fehler:**\n' + fehler.map((x) => '- ' + x).join('\n') + '\n' : ''}`); } catch { /* Zusammenfassung ist Zugabe */ }
  }
  if (fehler.length) { await tg(`🔴 LuxeStyle POD-Rückmeldung Fehler:\n${fehler.slice(0, 8).map(esc).join('\n')}`); process.exit(1); }
}

(async function main() {
  if (!PF_KEY || (!ADMIN_TOKEN && !(CID && CSEC))) {
    const fehlt = [!PF_KEY && 'PRINTFUL_API_KEY', (!ADMIN_TOKEN && !(CID && CSEC)) && 'Shopify-Zugang'].filter(Boolean).join(' und ');
    console.error(`❌ Zugangsdaten fehlen (${fehlt}): die Rückmeldung läuft NICHT.`);
    await tg(`🔴 LuxeStyle POD-Rückmeldung: ${esc(fehlt)} fehlt, die Rückmeldung läuft nicht.`);
    process.exit(1); return;
  }
  const tok = await resolveToken();
  if (!tok) { console.error('❌ Keine funktionierende Shopify-Auth.'); await tg('🔴 LuxeStyle POD-Rückmeldung: keine funktionierende Shopify-Anmeldung, die Rückmeldung läuft nicht.'); process.exit(1); return; }
  const seit = new Date(Date.now() - FENSTER_TAGE * 86400 * 1000).toISOString().slice(0, 10);
  const q = `tag:printful-synced -tag:printful-shipped created_at:>=${seit}`;
  let liste = [];
  try { liste = await alleBestellungen(tok, q); } catch (e) { fehler.push('Bestellungen lesen: ' + e.message); }
  zaehler.offen = liste.length;
  for (const o of liste) { try { await verarbeite(tok, o); } catch (e) { fehler.push(`${o.name}: ${e.message}`); console.error(`✗ ${o.name}:`, e.message); } }
  try { await waechter(tok, seit); } catch (e) { fehler.push('Wächter: ' + e.message); }
  if (apiVersionGesehen && apiVersionGesehen !== API) zusammenfassung.push(`Hinweis: Shopify antwortete mit API-Version ${apiVersionGesehen} statt ${API}`);
  await ende(`Printful-Rückmeldung fertig: ${zaehler.offen} offene Bestellung(en), ${zaehler.gelesen} bei Printful gelesen, ${zaehler.gemeldet} Sendung(en) gemeldet, ${zaehler.fertig} abgeschlossen, ${zaehler.wartet} warten auf Sendungsnummer, ${zaehler.befunde} Befund(e), ${zaehler.dienst} am Service-Standort übersprungen, ${zaehler.wartetAufSync} ohne Printful-Auftrag, ${fehler.length} Fehler${DRY ? ' (DRY_RUN)' : ''}.`);
})().catch(async (e) => { console.error('Fataler Fehler:', e); await tg(`🔴 LuxeStyle POD-Rückmeldung: fataler Fehler ${esc(e && e.message)}`); process.exit(1); });
