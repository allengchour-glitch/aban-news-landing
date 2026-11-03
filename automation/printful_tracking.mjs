#!/usr/bin/env node
/* LuxeStyle — printful_tracking.mjs
 * Rückmeldung Printful → Shopify: meldet versendete POD-Bestellungen mit Sendungsnummer in Shopify
 * (fulfillmentCreate + notifyCustomer = die normale Shopify-Versandmail) und markiert sie mit Tag `printful-shipped`.
 *
 * Warum: printful_sync.mjs legt den Druckauftrag an und merkt sich die Nummer im Metafeld printful.order_id, meldet aber nie zurück.
 * Printful schreibt «versendet» nur per Mail an den Besitzer; die Bestellung blieb in Shopify «Nicht versendet» (Fall #1033, 03.11.2026).
 *
 * Ablauf je Bestellung (Tag printful-synced, noch ohne printful-shipped, jünger als 45 Tage):
 *   1. Printful-Auftrag lesen (GET /orders/<id>).
 *   2. failed / canceled / onhold  → Telegram-Hinweis + Tag printful-problem (einmal); geht der Zustand weg, wird das Tag wieder entfernt.
 *   3. Jede Sendung MIT Sendungsnummer, die Shopify noch nicht kennt, wird den offenen POD-Positionen zugeordnet (Variante aus der SKU).
 *      Lässt sich eine Sendung nicht eindeutig zuordnen, wird sie NICHT gemeldet (Tag printful-problem + Telegram).
 *   4. Alle POD-Positionen gemeldet und Printful «fulfilled» → Tag printful-shipped (die Bestellung wird nicht mehr gelesen).
 * Wächter: bezahlte, unversendete POD-Bestellungen ohne printful-synced/-review, älter als 12 Stunden → einmal Telegram + Tag printful-wartet
 *   (der Druckauftrag wurde nie angelegt: der Zeitplan von printful-sync ist pausiert).
 * Idempotent: bekannte Sendungsnummern und die verbleibende Menge der fulfillmentOrders verhindern doppelte Meldungen.
 * Nicht-POD-Positionen einer gemischten Bestellung bleiben unberührt (offen).
 * Exit 1, wenn ein Schreibzugriff oder Lesezugriff scheiterte (damit «grün» wirklich «gearbeitet» heisst). Ohne Zugangsdaten: Exit 0 (No-op).
 * ENV: PRINTFUL_API_KEY, [PRINTFUL_STORE_ID], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), [TELEGRAM_*], [MAX=50], [FENSTER_TAGE=45], [DRY_RUN=1]
 * Logik (rein, getestet): automation/lib/printful_tracking.mjs; Verhalten: automation/printful_tracking_test.mjs.
 */
import { appendFileSync } from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { planVersand, nachFulfillmentOrder, variantIdVonSku } from './lib/printful_tracking.mjs';

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
const WAECHTER_STUNDEN = 12;
const DRY = process.env.DRY_RUN === '1';
const API = '2025-01';

let SHOP = SHOPraw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

if (!PF_KEY) { console.log('Kein PRINTFUL_API_KEY → No-op.'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// ---------- Shopify ----------
async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Shopify ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j;
}
async function works(tok) { try { const r = await gql(tok, '{ shop { name } }'); return !!(r && r.data && r.data.shop && r.data.shop.name); } catch { return false; } }
async function clientCredentials() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  return j.access_token || null;
}
async function resolveToken() {
  if (ADMIN_TOKEN && await works(ADMIN_TOKEN)) return ADMIN_TOKEN;
  if (CID && CSEC) { const t = await clientCredentials(); if (t && await works(t)) return t; }
  return null;
}

// ---------- Printful ----------
async function pf(path) {
  const headers = { Authorization: 'Bearer ' + PF_KEY, 'Content-Type': 'application/json' };
  if (PF_STORE) headers['X-PF-Store-Id'] = PF_STORE;
  const r = await fetch('https://api.printful.com' + path, { headers, signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

// ---------- Telegram ----------
async function tg(text) {
  if (DRY) { console.log('[DRY] Telegram: ' + text.replace(/<[^>]+>/g, '').slice(0, 200)); return; }
  if (!TG_TOKEN || !TG_CHAT) return;
  try { await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) }); } catch { /* Hinweis ist Zugabe */ }
}

const ORDERS_Q = `query($q:String!,$n:Int!,$after:String){ orders(first:$n, after:$after, query:$q, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } edges{ node{
  id name createdAt tags displayFulfillmentStatus
  mf: metafield(namespace:"printful", key:"order_id"){ value }
  fulfillments{ trackingInfo{ number } }
  fulfillmentOrders(first:20){ edges{ node{ id status
    lineItems(first:50){ edges{ node{ id remainingQuantity lineItem{ sku product{ tags } } } } } } } }
}}}}`;

const FULFILL_M = `mutation($f:FulfillmentInput!){ fulfillmentCreate(fulfillment:$f){ fulfillment{ id status } userErrors{ field message } } }`;
const TAG_ADD = `mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`;
const TAG_REMOVE = `mutation($id:ID!,$tags:[String!]!){ tagsRemove(id:$id,tags:$tags){ userErrors{ message } } }`;

const istPod = (li) => { const t = ((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase()); return t.includes('wunschdesign') || t.includes('printful_personalized_product'); };

const fehler = []; // Lese-/Schreibfehler → Exit 1
const zusammenfassung = [];
const zaehler = { gelesen: 0, gemeldet: 0, fertig: 0, wartet: 0, problem: 0, wartetAufSync: 0 };

async function schreibe(tok, was, query, variables, pruefe) {
  if (DRY) { console.log(`[DRY] ${was}`); return { ok: true, dry: true }; }
  try {
    const r = await gql(tok, query, variables);
    const fehl = pruefe(r);
    if (fehl) { fehler.push(`${was}: ${fehl}`); console.error(`✗ ${was}: ${fehl}`); return { ok: false }; }
    return { ok: true, data: r.data };
  } catch (e) { fehler.push(`${was}: ${e.message}`); console.error(`✗ ${was}: ${e.message}`); return { ok: false }; }
}
const tagUserErr = (key) => (r) => { const ue = r && r.data && r.data[key] && r.data[key].userErrors; return ue && ue.length ? JSON.stringify(ue) : null; };
const tagsHinzu = (tok, o, tags) => schreibe(tok, `${o.name}: Tag ${tags.join(',')}`, TAG_ADD, { id: o.id, tags }, tagUserErr('tagsAdd'));
const tagsWeg = (tok, o, tags) => schreibe(tok, `${o.name}: Tag entfernen ${tags.join(',')}`, TAG_REMOVE, { id: o.id, tags }, tagUserErr('tagsRemove'));

async function alleBestellungen(tok, q) {
  const out = [];
  let after = null;
  for (let seite = 0; seite < 5 && out.length < MAX; seite++) {
    const j = await gql(tok, ORDERS_Q, { q, n: Math.min(50, MAX), after });
    const o = j.data && j.data.orders;
    for (const e of (o && o.edges) || []) out.push(e.node);
    if (!(o && o.pageInfo && o.pageInfo.hasNextPage)) break;
    after = o.pageInfo.endCursor;
  }
  return out.slice(0, MAX);
}

function offenePodZeilen(o) {
  const z = [];
  for (const { node: fo } of (o.fulfillmentOrders && o.fulfillmentOrders.edges) || []) {
    if (fo.status !== 'OPEN' && fo.status !== 'IN_PROGRESS') continue;
    for (const { node: l } of (fo.lineItems && fo.lineItems.edges) || []) {
      if (!istPod(l.lineItem)) continue;
      z.push({ foId: fo.id, lineId: l.id, remaining: Number(l.remainingQuantity) || 0, variantId: variantIdVonSku(l.lineItem && l.lineItem.sku) });
    }
  }
  return z;
}
const bekannteNummern = (o) => (o.fulfillments || []).flatMap((f) => (f.trackingInfo || []).map((t) => t.number)).filter(Boolean);

async function verarbeite(tok, o) {
  const pfId = o.mf && o.mf.value;
  if (!pfId) { fehler.push(`${o.name}: Tag printful-synced, aber kein Metafeld printful.order_id`); return; }
  const r = await pf('/orders/' + encodeURIComponent(pfId)).catch((e) => ({ ok: false, status: 0, j: { error: { message: e.message } } }));
  if (!r.ok || !r.j || !r.j.result) { fehler.push(`${o.name}: Printful-Auftrag ${pfId} nicht lesbar (HTTP ${r.status})`); return; }
  zaehler.gelesen++;
  const pfOrder = r.j.result;
  const plan = planVersand({ pfOrder, foZeilen: offenePodZeilen(o), bekannteNummern: bekannteNummern(o) });
  const hatProblemTag = (o.tags || []).includes('printful-problem');

  if (plan.problem) {
    zaehler.problem++;
    zusammenfassung.push(`${o.name}: Printful ${pfId} Status «${plan.problem}» (Mensch nötig)`);
    if (!hatProblemTag) {
      await tg(`🔴 LuxeStyle POD: Bestellung <b>${o.name}</b> – Printful-Auftrag #${pfId} steht auf «${plan.problem}». Bitte im Printful-Dashboard prüfen (Zahlung/Druckdatei): https://www.printful.com/dashboard?order_id=${pfId}`);
      await tagsHinzu(tok, o, ['printful-problem']);
    }
    return;
  }

  let meldungFehler = false;
  for (const a of plan.aktionen) {
    const input = {
      notifyCustomer: true,
      trackingInfo: { number: a.nummer, ...(a.url ? { url: a.url } : {}), company: a.firma },
      lineItemsByFulfillmentOrder: nachFulfillmentOrder(a.positionen),
    };
    const res = await schreibe(tok, `${o.name}: als versendet melden (${a.nummer})`, FULFILL_M, { f: input }, (x) => {
      const ue = x && x.data && x.data.fulfillmentCreate && x.data.fulfillmentCreate.userErrors;
      return ue && ue.length ? JSON.stringify(ue) : null;
    });
    if (!res.ok) { meldungFehler = true; await tg(`🔴 LuxeStyle POD: Versandmeldung für <b>${o.name}</b> (${a.nummer}) gescheitert – bitte von Hand eintragen.`); continue; }
    zaehler.gemeldet++;
    zusammenfassung.push(`${o.name}: ${DRY ? '[DRY] ' : ''}versendet gemeldet, ${a.firma} ${a.nummer}`);
    console.log(`${o.name}: ${DRY ? '[DRY] ' : ''}versendet gemeldet (${a.firma} ${a.nummer}, ${a.positionen.length} Position(en))`);
    if (!DRY) await tg(`📦 LuxeStyle POD: <b>${o.name}</b> versendet (${a.firma} ${a.nummer}). Kundenmail ausgelöst.`);
  }

  if (plan.unklar.length) {
    zaehler.problem++;
    for (const u of plan.unklar) zusammenfassung.push(`${o.name}: Sendung ${u.nummer} nicht zuordenbar – ${u.grund}`);
    if (!hatProblemTag) {
      await tg(`🟠 LuxeStyle POD: <b>${o.name}</b> – Printful-Sendung nicht eindeutig zuordenbar (${plan.unklar.map((u) => u.nummer + ': ' + u.grund).join('; ')}). Nichts gemeldet; bitte von Hand eintragen.`);
      await tagsHinzu(tok, o, ['printful-problem']);
    }
    return;
  }
  if (plan.wartet.length) { zaehler.wartet++; zusammenfassung.push(`${o.name}: Sendung ohne Sendungsnummer, warte`); }
  if (meldungFehler) return;

  if (hatProblemTag && !plan.problem) await tagsWeg(tok, o, ['printful-problem']);
  if (plan.fertig) {
    zaehler.fertig++;
    await tagsHinzu(tok, o, ['printful-shipped']);
  }
}

async function waechter(tok, seit) {
  const grenze = Date.now() - WAECHTER_STUNDEN * 3600 * 1000;
  const q = `financial_status:paid fulfillment_status:unfulfilled -tag:printful-synced -tag:printful-review -tag:printful-wartet created_at:>=${seit}`;
  const liste = await alleBestellungen(tok, q);
  for (const o of liste) {
    if (new Date(o.createdAt).getTime() > grenze) continue;
    const pod = offenePodZeilen(o).filter((z) => z.remaining > 0);
    if (!pod.length) continue;
    zaehler.wartetAufSync++;
    zusammenfassung.push(`${o.name}: bezahlte POD-Bestellung ohne Printful-Auftrag (älter als ${WAECHTER_STUNDEN} h)`);
    await tg(`🟠 LuxeStyle POD: Bestellung <b>${o.name}</b> ist bezahlt, aber es gibt keinen Printful-Auftrag. Der Sync-Zeitplan ist pausiert: Actions → «Printful-Sync» von Hand starten.`);
    await tagsHinzu(tok, o, ['printful-wartet']);
  }
}

(async function main() {
  const tok = await resolveToken();
  if (!tok) { console.error('❌ Keine funktionierende Shopify-Auth.'); process.exit(1); }
  const seit = new Date(Date.now() - FENSTER_TAGE * 86400 * 1000).toISOString().slice(0, 10);
  const q = `tag:printful-synced -tag:printful-shipped created_at:>=${seit}`;
  let liste = [];
  try { liste = await alleBestellungen(tok, q); } catch (e) { fehler.push('Bestellungen lesen: ' + e.message); }
  for (const o of liste) { try { await verarbeite(tok, o); } catch (e) { fehler.push(`${o.name}: ${e.message}`); console.error(`✗ ${o.name}:`, e.message); } }
  try { await waechter(tok, seit); } catch (e) { fehler.push('Wächter: ' + e.message); }

  const zeile = `Printful-Rückmeldung fertig: ${liste.length} offene Bestellung(en), ${zaehler.gelesen} bei Printful gelesen, ${zaehler.gemeldet} Sendung(en) gemeldet, ${zaehler.fertig} abgeschlossen, ${zaehler.wartet} warten auf Sendungsnummer, ${zaehler.problem} Problem(e), ${zaehler.wartetAufSync} ohne Printful-Auftrag, ${fehler.length} Fehler${DRY ? ' (DRY_RUN)' : ''}.`;
  console.log(zeile);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Printful-Rückmeldung\n\n${zeile}\n\n${zusammenfassung.map((x) => '- ' + x).join('\n')}\n${fehler.length ? '\n**Fehler:**\n' + fehler.map((x) => '- ' + x).join('\n') + '\n' : ''}`); } catch { /* Zusammenfassung ist Zugabe */ }
  }
  if (fehler.length) { await tg(`🔴 LuxeStyle POD-Rückmeldung Fehler:\n${fehler.slice(0, 8).join('\n')}`); process.exit(1); }
})().catch((e) => { console.error('Fataler Fehler:', e); process.exit(1); });
