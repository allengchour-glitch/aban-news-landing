#!/usr/bin/env node
/* LuxeStyle — printful_lager.mjs (Printful-Lager-Wächter, WP2 des Bauplans «Selbst gestalten», 06.11.2026)
 *
 * Hält zwei Dinge frisch, täglich:
 *   (1) die Datei `assets/luxe-clothing-ausblenden.json` im MAIN-Theme (Katalogfenster «Selbst gestalten»: welche Modelle und Varianten nicht erscheinen),
 *   (2) im Shop die Produkte mit Printful-Zuordnung (SKU `<Nummer>_<Printful-Variante>`): fällt jede Variante eines Produkts aus, geht es auf ENTWURF
 *       (mit Tag `printful-lager-aus`; nur solche Produkte werden später wieder aktiviert); einzelne ausverkaufte Varianten melden wir als Befund
 *       oder sperren sie (Strategie A, siehe unten).
 * Gelesen wird Printful (GET /products/<id> für jedes Modell; POST /shipping/rates mit CH nur bei Änderung, sonst nicht) und Shopify (nur lesend, solange nicht freigegeben).
 *
 * TROCKENLAUF IST VORGABE. Geschrieben wird nur, wenn LIVE=1 gesetzt ist UND die Freigabedatei dropship/PRINTFUL-LAGER-FREI.txt im Repo liegt
 * (FREIGABE_DATEI ändert den Pfad). Rücknahme: Datei löschen (der nächste Lauf liest nur) und ZURUECK=1 LIVE=1 mit dem Ledger (Zeilen «vorher=»).
 * Printful wird nie beschrieben: erlaubt sind GET /products/<Nummer> und POST /shipping/rates (Preisauskunft, kein Auftrag). Jede andere Anfrage wirft vor dem Senden.
 *
 * STRATEGIE (Parameter STRATEGIE=B|A|auto, Vorgabe B)
 *   B  Fenster-Datei + ganzes Produkt auf ENTWURF, wenn ALLE Varianten ausfallen. Einzelne ausverkaufte Varianten: nur Befund.
 *   A  zusätzlich: eine ausverkaufte Variante wird gesperrt (inventoryPolicy DENY, ursprünglicher Wert im Variantenfeld luxe.printful_lager_sperre), aber NUR wenn ihr
 *      Bestand ohnehin verfolgt wird, an einem normalen Shop-Standort liegt und 0 ist. Das Einschalten der Bestandsführung bei bisher ungetrackten Varianten (Fabrik-Produkte)
 *      ist ABSICHTLICH nicht eingebaut: das Produkt hätte dann teils getrackte Varianten mit Bestand 0, und der Lager-Wächter (verfuegbar_zuerst.mjs, liest totalInventory)
 *      würde das ganze Produkt als ausverkauft ans Ende sortieren.
 *   auto  = A, wo es erlaubt ist, sonst B.
 *   Produkte am Dienst-Standort «Printful» (Fulfillment-Service mit callbackUrl https://api.printful.com/hook und inventoryManagement=true) bleiben immer bei B:
 *   Shopify fragt dort den Bestand beim Dienst ab (QUELLE shopify.dev, fulfillmentServiceCreate/-Update: callbackUrl/fetch_stock), unsere Menge würde überschrieben (Hypothese).
 *
 * SICHERHEIT: Bremsen (Abbruch ohne Schreiben, Exit 2): zu viele nicht lesbare Modelle, zu viele neu verschwindende Modelle, zu viele Produkte auf ENTWURF.
 * Was nicht gelesen werden konnte, ändert nichts (unbekannt ist kein Befund). Vor jedem ENTWURF wird das Modell frisch nachgemessen.
 * Fremde Ware (Fortura, CJ, Dienst-Produkte anderer Anbieter) und Produkte ohne SKU-Muster werden nie angefasst. Nichts wird gelöscht.
 *
 * ENV  PRINTFUL_API_KEY, [PRINTFUL_STORE_ID], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), [TELEGRAM_BOT_TOKEN/CHAT_ID: nur bei LIVE],
 *      [LIVE=1] [ZURUECK=1] [STRATEGIE] [FORCE=1: hebt die Bremsen «neu verschwindende Modelle» und «Entwürfe» auf, nur Handstart] [MODELLE=1,19 (Teilmenge, schreibt nie die Datei)]
 *      [VOLL=1: alle Versandraten neu] [MAX_RATEN=250] [PF_ABSTAND_MS=650] [RUN_LIMIT_MS=780000] [ZUSTAND_DATEI] [LEDGER] [FREIGABE_DATEI] [THEME_DATEI]
 *      [BASIS_MODELLE=dropship/codex-katalog/modelle.json] [BASIS_AUSBLENDEN=dropship/codex-katalog/ausblenden.json] [WARTE_THEME_MS=150000] [GITHUB_STEP_SUMMARY]
 * Exit  0 ok (auch: nichts zu tun, Datei im Theme noch nicht eingespielt) · 1 technischer Fehler (Zugang, Schreiben, Rücklesen, ungültige Datei) · 2 Bremse oder unvollständig, nichts geschrieben
 * Logik (rein, getestet): automation/lib/printful_lager.mjs · Tests: printful_lager_test.mjs · Mutationsprobe: printful_lager_mutation.mjs · Doku: dropship/selbst-gestalten-fertig-0511/lager/README.md
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
import {
  REGELN, TAG_AUS, MF_NAMESPACE, MF_SPERRE, MF_KANAELE, kanaeleText, kanaeleLesen, kanaeleFehlend, parseSku, modellLesen, testKandidaten, rateAuswerten, rateUrteil, brauchtRate, modellUrteil, katalogIndex,
  ausblendenBauen, ausblendenText, ausblendenPruefen, ausblendenGleich, tageSeit, vorzustandLesen, shopPlan, shopModelle as shopModelleBestimmen, bremsen, ledgerZeile, ledgerLesen, pfErlaubt,
} from './lib/printful_lager.mjs';

const API = '2026-01';
const THEME_DATEI_VORGABE = 'assets/luxe-clothing-ausblenden.json';
const num = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) ? n : d; };
const md5 = (t) => createHash('md5').update(t).digest('hex');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class PfFehler extends Error { constructor(m, art) { super(m); this.art = art; this.fatal = art === 'fatal'; } }

function konfig(env) {
  const fehler = [];
  const strategie = String(env.STRATEGIE || 'B').trim().toUpperCase();
  if (!['A', 'B', 'AUTO'].includes(strategie)) fehler.push(`STRATEGIE «${env.STRATEGIE}» ungültig (B, A oder auto)`);
  const shop = (() => { try { return normalizeShopifyHost(env.SHOPIFY_SHOP || '') || 'au3j0y-hq.myshopify.com'; } catch { fehler.push('SHOPIFY_SHOP ungültig'); return ''; } })();
  const modelle = env.MODELLE ? [...new Set(String(env.MODELLE).split(',').map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x) && x > 0))] : null;
  const c = {
    pfKey: (env.PRINTFUL_API_KEY || '').trim(), pfStore: (env.PRINTFUL_STORE_ID || '').trim(),
    shop, adminToken: (env.SHOPIFY_ADMIN_TOKEN || '').trim(), cid: (env.SHOPIFY_CLIENT_ID || '').trim(), csec: (shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET) || '').trim(),
    tgToken: (env.TELEGRAM_BOT_TOKEN || '').trim(), tgChat: (env.TELEGRAM_CHAT_ID || '').trim(),
    live: env.LIVE === '1', zurueck: env.ZURUECK === '1', force: env.FORCE === '1', voll: env.VOLL === '1',
    strategie: strategie === 'AUTO' ? 'auto' : strategie, modelleTeil: modelle && modelle.length ? modelle : null,
    maxRaten: Math.max(0, num(env.MAX_RATEN, 250)), abstandMs: Math.max(0, num(env.PF_ABSTAND_MS, 650)), parallel: Math.max(1, num(env.PF_PARALLEL, 2)),
    runLimitMs: num(env.RUN_LIMIT_MS, 780000), warteThemeMs: num(env.WARTE_THEME_MS, 150000),
    zustandDatei: env.ZUSTAND_DATEI || '', ledger: env.LEDGER || 'printful-lager-ledger.txt', freigabe: env.FREIGABE_DATEI || 'dropship/PRINTFUL-LAGER-FREI.txt',
    themeDatei: env.THEME_DATEI || THEME_DATEI_VORGABE, basisModelle: env.BASIS_MODELLE || 'dropship/codex-katalog/modelle.json', basisAusblenden: env.BASIS_AUSBLENDEN || 'dropship/codex-katalog/ausblenden.json',
    summary: env.GITHUB_STEP_SUMMARY || '', fremdUeberschreiben: env.FREMD_UEBERSCHREIBEN === '1',
    grenzen: {}, fehler,
  };
  if (env.MAX_NEU_AUS !== undefined && env.MAX_NEU_AUS !== '') c.grenzen.maxNeuAus = num(env.MAX_NEU_AUS, undefined);
  if (env.MAX_ENTWUERFE !== undefined && env.MAX_ENTWUERFE !== '') c.grenzen.maxEntwuerfe = num(env.MAX_ENTWUERFE, undefined);
  if (env.MAX_UNBEKANNT_ANTEIL !== undefined && env.MAX_UNBEKANNT_ANTEIL !== '') c.grenzen.maxUnbekanntAnteil = num(env.MAX_UNBEKANNT_ANTEIL, undefined);
  return c;
}

const PRODUKTE_Q = `query($c:String,$q:String!){ products(first:25, after:$c, query:$q){ pageInfo{ hasNextPage endCursor } nodes{ id handle status tags kanaele: metafield(namespace:"${MF_NAMESPACE}", key:"${MF_KANAELE}"){ value }
  variants(first:100){ pageInfo{ hasNextPage } nodes{ id sku inventoryPolicy sperre: metafield(namespace:"${MF_NAMESPACE}", key:"${MF_SPERRE}"){ value }
    inventoryItem{ id tracked inventoryLevels(first:5){ nodes{ quantities(names:["available"]){ name quantity } location{ id isFulfillmentService } } } } } } } } }`;
const PRODUKT_Q = `query($id:ID!){ product(id:$id){ id handle status tags kanaele: metafield(namespace:"${MF_NAMESPACE}", key:"${MF_KANAELE}"){ value } resourcePublications(first:30){ nodes{ isPublished publication{ id } } } variants(first:100){ nodes{ id sku inventoryPolicy sperre: metafield(namespace:"${MF_NAMESPACE}", key:"${MF_SPERRE}"){ value } } } } }`;
const THEME_Q = `{ themes(first:5, roles:[MAIN]){ nodes{ id name } } }`;
const DATEI_Q = `query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f, first:5){ nodes{ filename checksumMd5 body{ __typename ... on OnlineStoreThemeFileBodyText{ content } ... on OnlineStoreThemeFileBodyUrl{ url } } } userErrors{ code filename } } } }`;
const M_STATUS = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id status } userErrors{ field message } } }`;
const M_TAGS_ADD = `mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`;
const M_TAGS_WEG = `mutation($id:ID!,$tags:[String!]!){ tagsRemove(id:$id,tags:$tags){ userErrors{ message } } }`;
const M_VARIANTE = `mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$p, variants:$v){ productVariants{ id inventoryPolicy } userErrors{ field message } } }`;
const M_MF_WEG = `mutation($m:[MetafieldIdentifierInput!]!){ metafieldsDelete(metafields:$m){ deletedMetafields{ key } userErrors{ field message } } }`;
const M_MF_SET = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ key } userErrors{ field message } } }`;
const M_PUBLISH = `mutation($id:ID!,$in:[PublicationInput!]!){ publishablePublish(id:$id, input:$in){ userErrors{ field message } } }`;
const M_DATEI = `mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ upsertedThemeFiles{ filename } userErrors{ filename message } } }`;

export async function main(env = process.env, deps = {}) {
  const fetchFn = deps.fetch || fetch;
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const jetztMs = deps.now || (() => Date.now());
  const log = deps.log || ((...a) => console.log(...a));
  const err = deps.err || ((...a) => console.error(...a));
  const C = konfig(env);
  const START = jetztMs();
  const z = { pfGet: 0, pfPost: 0, shopLesen: 0, geschrieben: 0, uebersprungen: 0, gemessen: 0, vertagt: 0 };
  const fehler = [], befunde = [], zeilen = [];
  const sagen = (t) => { zeilen.push(t); log(t); };
  if (C.fehler.length) { for (const f of C.fehler) err('Konfiguration: ' + f); return 1; }
  if (!C.pfKey) { err('PRINTFUL_API_KEY fehlt'); return 1; }
  if (!C.adminToken && !(C.cid && C.csec)) { err('Shopify-Zugang fehlt (SHOPIFY_ADMIN_TOKEN oder SHOPIFY_CLIENT_ID/SECRET)'); return 1; }

  // ── Modus: geschrieben wird nur mit LIVE=1 UND Freigabedatei (Rücknahme: LIVE=1 ZURUECK=1 genügt, damit der Rückweg nach «Datei löschen» noch geht)
  let schreiben = false;
  if (C.live && C.zurueck) schreiben = true;
  else if (C.live && existsSync(C.freigabe)) schreiben = true;
  else if (C.live) sagen(`Freigabedatei ${C.freigabe} fehlt: Lauf bleibt ein Trockenlauf (nichts wird geschrieben).`);
  const modusText = C.zurueck ? (schreiben ? 'RÜCKNAHME (live)' : 'Rücknahme im Trockenlauf') : (schreiben ? 'LIVE (Freigabe liegt im Repo)' : 'Trockenlauf (nur lesen)');
  sagen(`Printful-Lager-Wächter · ${modusText} · Strategie ${C.strategie}${C.modelleTeil ? ` · Teilmenge ${C.modelleTeil.length} Modelle` : ''}`);

  // ── Telegram (nur LIVE)
  async function tg(text) {
    if (!schreiben) { log('[Trockenlauf] Telegram: ' + String(text).replace(/<[^>]+>/g, '').slice(0, 200)); return null; }
    if (!C.tgToken || !C.tgChat) return null;
    try {
      const r = await fetchFn(`https://api.telegram.org/bot${C.tgToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: C.tgChat, text, parse_mode: 'HTML', disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) });
      z.geschrieben++;
      return !!r.ok;
    } catch { return false; }
  }

  // ── Shopify
  let tok = C.adminToken;
  async function shopToken() {
    if (tok) return tok;
    const r = await fetchFn(`https://${C.shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: C.cid, client_secret: C.csec, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) throw new Error(`Shopify-Anmeldung fehlgeschlagen (HTTP ${r.status})`);
    tok = j.access_token; return tok;
  }
  const gOpt = { fetch: fetchFn, warte: sleep, basisMs: 1500 };
  async function lesenGql(query, vars) { z.shopLesen++; return shopifyGql(C.shop, API, await shopToken(), query, vars, gOpt); }
  async function schreibenGql(query, vars) {
    if (!schreiben) { z.uebersprungen++; throw new Error('Schreibzugriff im Trockenlauf (Programmfehler)'); }
    z.geschrieben++;
    return shopifyGql(C.shop, API, await shopToken(), query, vars, gOpt);
  }
  const userFehler = (d, schluessel) => { const ue = d && d[schluessel] && d[schluessel].userErrors; return Array.isArray(ue) && ue.length === 0 ? null : (ue ? JSON.stringify(ue).slice(0, 300) : 'Antwort ohne userErrors'); };

  // ── Printful (nur lesen: GET /products/<n> und die Preisauskunft POST /shipping/rates)
  let nextStart = 0, gesperrtBis = 0;
  async function pf(methode, pfad, body) {
    if (!pfErlaubt(methode, pfad)) throw new PfFehler(`Anfrage ${methode} ${pfad} ist nicht erlaubt`, 'verboten');
    let letzte = new PfFehler('Printful: kein Versuch', 'transient');
    for (let i = 0; i < 4; i++) {
      const t = jetztMs(); const start = Math.max(t, nextStart, gesperrtBis); nextStart = start + C.abstandMs;
      if (start > t) await sleep(start - t);
      const headers = { Authorization: 'Bearer ' + C.pfKey, 'Content-Type': 'application/json' };
      if (C.pfStore) headers['X-PF-Store-Id'] = C.pfStore;
      let r;
      try { r = await fetchFn('https://api.printful.com' + pfad, { method: methode, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) }); }
      catch (e) { letzte = new PfFehler(`Printful ${pfad}: ${e.message}`, 'transient'); await sleep(2000 * (i + 1)); continue; }
      if (methode === 'GET') z.pfGet++; else z.pfPost++;
      const kopf = (k) => (r.headers && r.headers.get ? r.headers.get(k) : null);
      const rest = parseInt(kopf('x-ratelimit-remaining') || '', 10), reset = parseInt(kopf('x-ratelimit-reset') || '', 10);
      if (Number.isFinite(rest) && rest <= 4 && Number.isFinite(reset)) gesperrtBis = Math.max(gesperrtBis, jetztMs() + Math.min(reset, 65) * 1000 + 250);
      if (r.status === 429) {
        const ra = parseInt(kopf('retry-after') || '', 10);
        const warte = Math.min(65, Number.isFinite(ra) ? ra : (Number.isFinite(reset) ? reset : 15));
        gesperrtBis = Math.max(gesperrtBis, jetztMs() + warte * 1000 + 250);
        letzte = new PfFehler(`Printful ${pfad}: HTTP 429`, 'gedrosselt'); continue;
      }
      if (r.status === 401 || r.status === 403) throw new PfFehler(`Printful-Zugang abgelehnt (HTTP ${r.status})`, 'fatal');
      if (r.status >= 500) { letzte = new PfFehler(`Printful ${pfad}: HTTP ${r.status}`, 'transient'); await sleep(2000 * (i + 1)); continue; }
      let j = null, ganz = true;
      try { j = JSON.parse(await r.text()); } catch { ganz = false; }
      if (!ganz && r.status === 200) { letzte = new PfFehler(`Printful ${pfad}: Antwort abgeschnitten`, 'halb'); await sleep(1500 * (i + 1)); continue; }
      return { status: r.status, json: j || {} };
    }
    throw letzte;
  }
  async function parallel(items, arbeiter, k) {
    const q = [...items]; let fatal = null;
    await Promise.all(Array.from({ length: Math.min(k, q.length) }, async () => { while (q.length && !fatal) { const x = q.shift(); try { await arbeiter(x); } catch (e) { if (e && e.fatal) { fatal = e; } else throw e; } } }));
    if (fatal) throw fatal;
  }
  const zeitAbgelaufen = () => jetztMs() - START > C.runLimitMs;

  // ───────────── Hilfsfunktionen (nutzen Zustand und Clients oben)
  async function rateMessen(lesung) {
    const kand = testKandidaten(lesung, 3), erg = [];
    for (const vid of kand) {
      let r;
      try { r = rateAuswerten(await pf('POST', '/shipping/rates', { recipient: { country_code: 'CH', zip: '8001' }, items: [{ variant_id: vid, quantity: 1 }] })); }
      catch (e) { if (e.fatal) throw e; r = { art: 'unbekannt', grund: e.message }; }
      if (r.art === 'fatal') throw new PfFehler(`Printful-Zugang abgelehnt (${r.grund})`, 'fatal');
      erg.push(r);
      if (r.art === 'rate' || erg.filter((x) => x.art === 'keine-rate').length >= 2) break;
    }
    return { urteil: rateUrteil(erg), kandidaten: kand };
  }
  async function themeDateiLesen(themeId) {
    const d = await lesenGql(DATEI_Q, { id: themeId, f: [C.themeDatei] });
    const f = d.theme && d.theme.files;
    const n = f && f.nodes && f.nodes[0];
    if (!n) return { zustand: 'fehlt', themeId };
    let text = n.body && n.body.__typename === 'OnlineStoreThemeFileBodyText' ? n.body.content : null;
    if (text == null && n.body && n.body.url) { const r = await fetchFn(n.body.url); if (r.ok) text = await r.text(); }
    if (text == null) return { zustand: 'ungueltig', themeId, md5: n.checksumMd5 };
    const obj = ausblendenPruefen(text);
    return obj ? { zustand: 'ok', themeId, text, md5: n.checksumMd5, obj } : { zustand: 'ungueltig', themeId, text, md5: n.checksumMd5 };
  }
  // Ein ENTWURF nimmt das Produkt aus allen Verkaufskanälen (GEMESSEN 06.11.2026: 6 von 6 gelesenen Entwürfen haben 0 Kanäle, aktive Produkte 7 bis 8). Darum merkt sich der ENTWURF die
  // Kanäle im Produktfeld luxe.printful_lager_kanaele, und die Rückkehr veröffentlicht GENAU diese wieder (nie mehr: «Google & YouTube» bleibt, wo es war).
  const pubNr = (gid) => String(gid).split('/').pop();
  const kanaeleVon = (p) => ((p.resourcePublications && p.resourcePublications.nodes) || []).filter((x) => x.isPublished).map((x) => pubNr(x.publication.id));
  async function produktEntwerfen(produktId, ledgerFn) {
    const p = (await lesenGql(PRODUKT_Q, { id: produktId })).product;
    if (!p) throw new Error('Produkt nicht gefunden');
    const kan = kanaeleVon(p);
    ledgerFn({ status: p.status, handle: p.handle, kanaele: kan });
    let d = await schreibenGql(M_MF_SET, { m: [{ ownerId: produktId, namespace: MF_NAMESPACE, key: MF_KANAELE, type: 'single_line_text_field', value: kanaeleText(kan) }] }); let f = userFehler(d, 'metafieldsSet'); if (f) throw new Error('metafieldsSet: ' + f);
    d = await schreibenGql(M_TAGS_ADD, { id: produktId, tags: [TAG_AUS] }); f = userFehler(d, 'tagsAdd'); if (f) throw new Error('tagsAdd: ' + f);
    d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'DRAFT' } }); f = userFehler(d, 'productUpdate'); if (f) throw new Error('productUpdate: ' + f);
  }
  async function produktReaktivieren(produktId, kanaeleSoll, ledgerFn) {
    ledgerFn({ status: 'DRAFT', kanaele: kanaeleSoll });
    let d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'ACTIVE' } }); let f = userFehler(d, 'productUpdate'); if (f) throw new Error('productUpdate: ' + f);
    if (kanaeleSoll) {
      let fehlt = kanaeleFehlend(kanaeleSoll, kanaeleVon((await lesenGql(PRODUKT_Q, { id: produktId })).product));
      if (fehlt.length) {
        d = await schreibenGql(M_PUBLISH, { id: produktId, in: fehlt.map((n) => ({ publicationId: `gid://shopify/Publication/${n}` })) }); f = userFehler(d, 'publishablePublish'); if (f) throw new Error('publishablePublish: ' + f);
        fehlt = kanaeleFehlend(kanaeleSoll, kanaeleVon((await lesenGql(PRODUKT_Q, { id: produktId })).product));
        if (fehlt.length) throw new Error(`Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt (fehlen: ${fehlt.join(',')})`);
      }
    }
    d = await schreibenGql(M_TAGS_WEG, { id: produktId, tags: [TAG_AUS] }); f = userFehler(d, 'tagsRemove'); if (f) throw new Error('tagsRemove: ' + f);
    d = await schreibenGql(M_MF_WEG, { m: [{ ownerId: produktId, namespace: MF_NAMESPACE, key: MF_KANAELE }] }); f = userFehler(d, 'metafieldsDelete'); if (f) throw new Error('metafieldsDelete: ' + f);
  }
  async function produkteLesen() {
    const out = []; const gesehen = new Set(); let cur = null;
    for (let seite = 0; seite < 60; seite++) {
      const d = (await lesenGql(PRODUKTE_Q, { c: cur, q: 'tag:printful_personalized_product OR tag:wunschdesign' })).products;
      for (const p of d.nodes) if (!gesehen.has(p.id)) { gesehen.add(p.id); out.push({ id: p.id, handle: p.handle, status: p.status, tags: p.tags || [], kanaele: p.kanaele ? p.kanaele.value : null, variantenVollstaendig: !(p.variants.pageInfo && p.variants.pageInfo.hasNextPage), variants: p.variants.nodes.map((v) => ({ id: v.id, sku: v.sku, inventoryPolicy: v.inventoryPolicy, sperre: v.sperre ? v.sperre.value : null, inventoryItem: v.inventoryItem })) }); }
      if (!d.pageInfo.hasNextPage) return out;
      if (!d.pageInfo.endCursor || d.pageInfo.endCursor === cur) throw new Error('Shopify-Seitenwechsel hängt (Cursor wiederholt sich oder fehlt)');
      cur = d.pageInfo.endCursor;
    }
    throw new Error('Shopify-Seitenwechsel: mehr als 60 Seiten');
  }
  // Zustandsdatei (lokal, kein Netz): merkt je Modell Signatur, letzte Versandrate und Messzeit, damit die Rate nur bei Änderung neu gemessen wird.
  function zustandSchreiben(zustand, lesungen, raten, urteile) {
    if (!C.zustandDatei) return;
    const jetztIso = new Date(jetztMs()).toISOString();
    const neuZ = { schema: 1, stand: jetztIso, modelle: { ...zustand.modelle } };
    for (const [id, l] of lesungen) {
      if (!l || l.art !== 'ok') continue;
      const alt = neuZ.modelle[id] || {};
      const r = raten.get(id);
      if (r && r.urteil.ch !== null) neuZ.modelle[id] = { ...alt, sig: l.signatur, ch: r.urteil.ch, rateUsd: r.urteil.rateUsd ?? null, tageMin: r.urteil.tageMin ?? null, tageMax: r.urteil.tageMax ?? null, gemessen: jetztIso };
      else if (!alt.sig) neuZ.modelle[id] = { ...alt, sig: l.signatur, ch: alt.ch ?? (urteile.get(id) || {}).ch ?? null, gemessen: alt.gemessen ?? null };
    }
    try { writeFileSync(C.zustandDatei, JSON.stringify(neuZ)); } catch { /* Zugabe */ }
  }
  async function ende(code, kurz) {
    const kopf = `Printful-Lager-Wächter: ${kurz}. Printful: ${z.pfGet} GET, ${z.pfPost} POST (Preisauskunft); Shopify gelesen: ${z.shopLesen}; Schreibzugriffe: ${z.geschrieben}${schreiben ? '' : ` (Trockenlauf, ${z.uebersprungen} übersprungen)`}; Dauer ${Math.round((jetztMs() - START) / 1000)} s; Fehler ${fehler.length}.`;
    log(kopf);
    for (const f of fehler) err('Fehler: ' + f);
    if (C.summary) { try { appendFileSync(C.summary, `### Printful-Lager-Wächter\n\n${kopf}\n\n\`\`\`\n${zeilen.slice(-60).join('\n')}\n\`\`\`\n${befunde.length ? '\n**Befunde:**\n' + befunde.slice(0, 30).map((b) => '- ' + b.text).join('\n') + '\n' : ''}${fehler.length ? '\n**Fehler:**\n' + fehler.map((x) => '- ' + x).join('\n') + '\n' : ''}`); } catch { /* Zugabe */ } }
    if (fehler.length && code === 0) code = 1;
    return code;
  }


  // ───────────── Rücknahme aus dem Ledger (ZURUECK=1 LIVE=1)
  async function zurueckNehmen() {
    if (!existsSync(C.ledger)) { err(`Ledger ${C.ledger} fehlt: nichts zurückzunehmen`); return 1; }
    const eintraege = ledgerLesen(readFileSync(C.ledger, 'utf8')).reverse();
    sagen(`Rücknahme: ${eintraege.length} Ledger-Zeilen (von hinten nach vorn)${schreiben ? '' : ' [Trockenlauf]'}`);
    const th = (await lesenGql(THEME_Q)).themes.nodes[0];
    let zurueck = 0, uebersprungen = 0;
    for (const e of eintraege) {
      try {
        if (e.typ === 'entwurf' || e.typ === 'reaktivieren') {
          const p = (await lesenGql(PRODUKT_Q, { id: e.ziel })).product;
          const ok = p && (e.typ === 'entwurf' ? (p.status === 'DRAFT' && p.tags.includes(TAG_AUS)) : p.status === 'ACTIVE');
          if (!ok) { sagen(`  übersprungen ${e.typ} ${e.vorher.handle || e.ziel}: Stand ist nicht mehr der von uns gesetzte`); uebersprungen++; continue; }
          if (!schreiben) { sagen(`  [würde] ${e.typ} zurück auf ${e.vorher.status}: ${e.vorher.handle || e.ziel}`); continue; }
          if (e.typ === 'entwurf') await produktReaktivieren(e.ziel, Array.isArray(e.vorher.kanaele) ? e.vorher.kanaele : null, () => {});
          else await produktEntwerfen(e.ziel, () => {});
          zurueck++;
        } else if (e.typ === 'sperre' || e.typ === 'freigabe') {
          const p = (await lesenGql(PRODUKT_Q, { id: e.vorher.produktId })).product;
          const v = p && p.variants.nodes.find((x) => x.id === e.ziel);
          const ok = v && (e.typ === 'sperre' ? v.inventoryPolicy === 'DENY' && v.sperre : v.inventoryPolicy === e.vorher.marker && !v.sperre);
          if (!ok) { sagen(`  übersprungen ${e.typ} ${e.vorher.sku || e.ziel}: Stand ist nicht mehr der von uns gesetzte`); uebersprungen++; continue; }
          if (!schreiben) { sagen(`  [würde] ${e.typ} zurück: ${e.vorher.sku || e.ziel}`); continue; }
          if (e.typ === 'sperre') {
            let d = await schreibenGql(M_VARIANTE, { p: e.vorher.produktId, v: [{ id: e.ziel, inventoryPolicy: e.vorher.policy }] }); let f = userFehler(d, 'productVariantsBulkUpdate'); if (f) throw new Error(f);
            d = await schreibenGql(M_MF_WEG, { m: [{ ownerId: e.ziel, namespace: MF_NAMESPACE, key: MF_SPERRE }] }); f = userFehler(d, 'metafieldsDelete'); if (f) throw new Error(f);
          } else {
            const d = await schreibenGql(M_VARIANTE, { p: e.vorher.produktId, v: [{ id: e.ziel, inventoryPolicy: e.vorher.policy, metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: e.vorher.marker }] }] }); const f = userFehler(d, 'productVariantsBulkUpdate'); if (f) throw new Error(f);
          }
          zurueck++;
        } else if (e.typ === 'theme') {
          const aktuell = await themeDateiLesen(th.id);
          if (aktuell.zustand === 'fehlt') { sagen('  übersprungen theme: Datei fehlt'); uebersprungen++; continue; }
          if (aktuell.md5 !== e.vorher.md5Nachher && !C.fremdUeberschreiben) { fehler.push(`${C.themeDatei} wurde nach uns verändert (Prüfsumme ${aktuell.md5}): nicht zurückgeschrieben (FREMD_UEBERSCHREIBEN=1 übersteuert)`); continue; }
          if (!schreiben) { sagen(`  [würde] ${C.themeDatei} zurückschreiben`); continue; }
          const d = await schreibenGql(M_DATEI, { id: th.id, files: [{ filename: C.themeDatei, body: { type: 'TEXT', value: e.vorher.inhalt } }] }); const f = userFehler(d, 'themeFilesUpsert'); if (f) throw new Error(f);
          zurueck++;
        }
      } catch (ex) { fehler.push(`Rücknahme ${e.typ} ${e.ziel}: ${ex.message}`); }
    }
    return await ende(fehler.length ? 1 : 0, `Rücknahme: ${zurueck} zurückgesetzt, ${uebersprungen} übersprungen`);
  }
  // ── Hauptablauf
  try {
    if (deps.sonde) await deps.sonde({ pf, schreibenGql, lesenGql, tg, schreiben });          // nur für Tests: prüft die Schutzschalter von aussen
    // Eingaben aus dem Repo (Inventur 05.11.)
    let basisDatei, basisAus;
    try { basisDatei = JSON.parse(readFileSync(C.basisModelle, 'utf8')); basisAus = JSON.parse(readFileSync(C.basisAusblenden, 'utf8')); }
    catch (e) { err(`Basisdateien nicht lesbar (${C.basisModelle}, ${C.basisAusblenden}): ${e.message}`); return 1; }
    const basis = new Map();
    for (const m of basisDatei.modelle || []) basis.set(m.id, { klasse: m.klasse, nVarianten: m.nVarianten, ch: m.versandCH ? true : (m.bestellbarCH === false && m.grund === 'keine Schweizer Versandrate' ? false : null), bestellbarCH: m.bestellbarCH });
    const universum = C.modelleTeil || [...basis.keys()].sort((a, b) => a - b);

    if (C.zurueck) return await zurueckNehmen();

    // Datei im Theme (nur lesen)
    const th = (await lesenGql(THEME_Q)).themes.nodes[0];
    if (!th) throw new Error('Kein MAIN-Theme gefunden');
    const live = await themeDateiLesen(th.id);
    sagen(`Theme-Datei ${C.themeDatei}: ${live.zustand === 'ok' ? `vorhanden (Stand ${live.obj.stand}, ${live.obj.modelle.length} Modelle, ${Object.keys(live.obj.varianten).length} Modelle mit Varianten)` : live.zustand === 'fehlt' ? 'noch nicht eingespielt (nichts wird angelegt)' : 'UNGÜLTIG (Schema unbekannt)'}`);
    if (live.zustand === 'ungueltig') fehler.push(`${C.themeDatei} im Theme ist nicht lesbar oder hat ein unbekanntes Schema: keine Änderung an der Datei`);
    const vorzustand = vorzustandLesen(live.zustand === 'ok' ? live.obj : basisAus);

    // Zustandsdatei («nur bei Änderung»)
    let zustand = { modelle: {} };
    if (C.zustandDatei && existsSync(C.zustandDatei)) { try { const zz = JSON.parse(readFileSync(C.zustandDatei, 'utf8')); if (zz && zz.schema === 1 && zz.modelle && typeof zz.modelle === 'object') zustand = zz; } catch { sagen('Zustandsdatei nicht lesbar: alles wird gegen die Inventur verglichen.'); } }

    // Phase 1: Modelle lesen
    const lesungen = new Map();
    const t1 = jetztMs();
    await parallel(universum, async (id) => {
      if (zeitAbgelaufen()) { lesungen.set(id, { art: 'unbekannt', id, grund: 'Zeitlimit' }); return; }
      try {
        const a = await pf('GET', `/products/${id}`);
        lesungen.set(id, modellLesen(a, id, { bekannteVarianten: (basis.get(id) || {}).nVarianten }));
      } catch (e) { if (e.fatal) throw e; lesungen.set(id, { art: 'unbekannt', id, grund: e.message }); }
    }, C.parallel);
    sagen(`Printful: ${z.pfGet} Modelle abgefragt in ${Math.round((jetztMs() - t1) / 1000)} s`);

    // Shop: Produkte mit Printful-Zuordnung (lesend); daraus die Modelle mit Shopprodukt
    const produkte = await produkteLesen();
    const idx = katalogIndex(lesungen);
    const shopMod = shopModelleBestimmen(produkte, idx);

    // Phase 2: Versandrate nach CH, nur bei Änderung
    const jetztD = new Date(jetztMs());
    const plan2 = [];
    for (const id of universum) {
      const l = lesungen.get(id);
      const b = basis.get(id) || {};
      const e = zustand.modelle[id];
      const bd = brauchtRate(l, { zustand: e, basis: { ch: b.ch, nVarianten: b.nVarianten }, vorherAus: vorzustand.varianten.get(id) || new Set(), shopModell: shopMod.has(id), jetzt: jetztD, voll: C.voll });
      if (bd.mess) plan2.push({ id, grund: bd.grund });
    }
    const rang = { 'ch-nein': 0, 'ch-unbekannt': 0, 'shop-modell': 1, 'signatur-geaendert': 2, 'varianten-geaendert': 2, 'ausverkauft-geaendert': 2, veraltet: 3, scheibe: 4, voll: 5 };
    plan2.sort((a, b) => (rang[a.grund] ?? 9) - (rang[b.grund] ?? 9) || a.id - b.id);
    const dran = plan2.slice(0, C.maxRaten), vertagt = plan2.slice(C.maxRaten);
    z.vertagt = vertagt.length;
    const raten = new Map();
    await parallel(dran, async ({ id, grund }) => {
      if (zeitAbgelaufen()) return;
      raten.set(id, { ...(await rateMessen(lesungen.get(id))), grund });
    }, C.parallel);
    z.gemessen = raten.size;
    const grundZaehler = {}; for (const { grund } of plan2) grundZaehler[grund] = (grundZaehler[grund] || 0) + 1;
    sagen(`Versandrate CH: ${raten.size} Modelle gemessen (${z.pfPost} Anfragen)${vertagt.length ? `, ${vertagt.length} vertagt (MAX_RATEN)` : ''}; Gründe: ${Object.entries(grundZaehler).map(([k, v]) => `${k} ${v}`).join(', ') || 'keine'}`);

    // Urteile
    const urteile = new Map();
    for (const id of universum) {
      const b = basis.get(id) || {};
      const e = zustand.modelle[id];
      const vorher = { aus: vorzustand.modelle.has(id), ausVarianten: [...(vorzustand.varianten.get(id) || [])], ch: e && e.ch !== undefined && e.ch !== null ? e.ch : (b.ch === undefined ? null : b.ch) };
      const r = raten.get(id) || null;
      urteile.set(id, modellUrteil(lesungen.get(id), r ? r.urteil : null, vorher, b));
    }
    for (const id of vorzustand.modelle) if (!urteile.has(id) && !C.modelleTeil) urteile.set(id, { fensterAus: true, shopAus: false, shopUnsicher: false, gruende: ['uebernommen'], shopGruende: [], ausVarianten: [], ch: null, unbekannt: true });
    for (const [id, vs] of vorzustand.varianten) if (!urteile.has(id) && !C.modelleTeil) urteile.set(id, { fensterAus: false, shopAus: false, shopUnsicher: false, gruende: ['uebernommen'], shopGruende: [], ausVarianten: [...vs], ch: null, unbekannt: true });
    const unbekannt = universum.filter((id) => urteile.get(id).unbekannt);
    const heute = jetztD.toISOString().slice(0, 10);
    const gelesen = universum.length - unbekannt.length;
    const neu = ausblendenBauen(urteile, heute, gelesen);
    const neuAusModelle = [...urteile.entries()].filter(([id, u]) => u.fensterAus && !vorzustand.modelle.has(id) && !u.gruende.includes('technisch') && !u.unbekannt).map(([id]) => id);
    const zurueckModelle = [...vorzustand.modelle].filter((id) => urteile.has(id) && !urteile.get(id).fensterAus && !urteile.get(id).unbekannt);
    const nVarNeu = Object.values(neu.varianten).reduce((s, v) => s + v.length, 0);
    sagen(`Ergebnis Fenster: ${neu.modelle.length} Modelle ausgeblendet (neu: ${neuAusModelle.length}, zurück: ${zurueckModelle.length}), ${nVarNeu} Varianten in ${Object.keys(neu.varianten).length} Modellen; nicht lesbar: ${unbekannt.length}`);
    if (neuAusModelle.length) sagen(`  neu aus: ${neuAusModelle.map((id) => `${id} (${urteile.get(id).gruende.join('+')})`).join(', ')}`);
    if (zurueckModelle.length) sagen(`  wieder da: ${zurueckModelle.join(', ')}`);
    for (const id of unbekannt.slice(0, 10)) sagen(`  unbekannt ${id}: ${(lesungen.get(id) || {}).grund || '?'}`);

    const plan = shopPlan(produkte, idx, urteile, C.strategie);
    const aktive = plan.zaehl.aktiv;
    const nEntwuerfe = plan.aktionen.filter((a) => a.typ === 'entwurf').length;
    sagen(`Shop: ${plan.zaehl.pod} Produkte mit POD-Tag (${aktive} aktiv), ${plan.zaehl.fremdOderOhnePod} Fremdware oder ohne POD-Tag nicht angefasst, ${plan.zaehl.ohneZuordnung} ohne passende SKU; Aktionen: ENTWURF ${nEntwuerfe}, reaktivieren ${plan.aktionen.filter((a) => a.typ === 'reaktivieren').length}, sperren ${plan.aktionen.filter((a) => a.typ === 'sperre').length}, freigeben ${plan.aktionen.filter((a) => a.typ === 'freigabe').length}; Befunde ${plan.befunde.length}`);
    const zv = plan.zaehl.varianten;
    sagen(`  Varianten der Produkte mit SKU-Muster: lieferbar ${zv.ok}, ausverkauft ${zv.aus}, nicht zuordenbar ${zv.unbekannt} (SKU ${zv.sku}, nicht im Katalog ${zv['variante-nicht-im-katalog']}, Modell unbekannt ${zv['modell-unbekannt']}, Rate unsicher ${zv['rate-unsicher']})`);
    for (const b of plan.befunde.slice(0, 25)) sagen(`  Befund ${b.art}: ${b.text}`);
    befunde.push(...plan.befunde);
    for (const a of plan.aktionen.slice(0, 40)) sagen(`  ${schreiben ? '' : '[würde] '}${a.typ} ${a.handle}${a.grund ? ' (' + a.grund + ')' : ''}${a.sku ? ' ' + a.sku : ''}`);

    // Bremsen
    const ver = bremsen({ modelleGesamt: universum.length, unbekannt: unbekannt.length, neuAus: neuAusModelle.length, entwuerfe: nEntwuerfe, aktivePod: aktive }, C.grenzen);
    const hart = ver.filter((v) => v.art === 'zu-viele-unbekannt' || !C.force);
    for (const v of ver) sagen(`BREMSE ${v.art}: ${v.text}${hart.includes(v) ? '' : ' (FORCE=1: aufgehoben)'}`);
    // Datei: gleich? Stand erneuern?
    const standAlter = live.zustand === 'ok' ? tageSeit(live.obj.stand, jetztD) : null;
    const dateiGleich = live.zustand === 'ok' && ausblendenGleich(live.obj, neu);
    const dateiNeu = live.zustand === 'ok' && !C.modelleTeil && (!dateiGleich || standAlter === null || standAlter >= REGELN.standErneuernTage);
    sagen(`Datei: ${live.zustand !== 'ok' ? 'wird nicht geschrieben (' + (live.zustand === 'fehlt' ? 'noch nicht eingespielt' : 'ungültig') + ')' : C.modelleTeil ? 'bei Teilmenge nie geschrieben' : dateiGleich ? (dateiNeu ? `Inhalt gleich, Stand ${standAlter} Tage alt: nur Stand erneuern` : 'unverändert') : 'ÄNDERT sich'}`);

    const geaendert = plan.aktionen.length > 0 || dateiNeu;
    const abbruch = hart.length > 0;
    if (z.vertagt) befunde.push({ art: 'raten-vertagt', text: `${z.vertagt} Versandraten wegen MAX_RATEN vertagt` });
    // Zustand fortschreiben (auch im Trockenlauf: lokale Datei, kein Shopify/Printful)
    zustandSchreiben(zustand, lesungen, raten, urteile);

    if (abbruch) {
      const text = `ABBRUCH ohne Schreiben (Bremse): ${hart.map((v) => v.text).join('; ')}`;
      sagen(text);
      if (schreiben) await tg(`[Warnung] LuxeStyle Printful-Lager-Wächter: ${esc(text)}. Per Handstart mit FORCE=1 nur nach Prüfung der Zahlen im Protokoll.`);
      return await ende(2, `Bremse: ${hart.map((v) => v.art).join(', ')}`);
    }
    if (!schreiben) {
      sagen(geaendert ? `Trockenlauf: ÄNDERN WÜRDE: ${plan.aktionen.length} Shop-Aktion(en), Datei ${dateiNeu ? (dateiGleich ? 'nur Stand' : 'neu') : 'nein'}. Schreibzugriffe: ${z.geschrieben}.` : `Trockenlauf: nichts zu ändern. Schreibzugriffe: ${z.geschrieben}.`);
      return await ende(fehler.length ? 1 : 0, 'Trockenlauf');
    }

    // ── LIVE: schreiben, jeweils mit Ledger-Zeile VOR dem Schreiben und frischem Rücklesen danach
    const iso = () => new Date(jetztMs()).toISOString();
    const led = (typ, ziel, vorher) => appendFileSync(C.ledger, ledgerZeile(iso(), typ, ziel, vorher) + '\n');
    const gemacht = [];
    const entw = plan.aktionen.filter((a) => a.typ === 'entwurf');
    // Nachprüfung: jedes Modell hinter einem ENTWURF wird frisch gelesen (und bei «keine Schweizer Rate» frisch gemessen), bevor ein Produkt aus dem Verkauf geht
    const nach = new Map();
    for (const id of new Set(entw.flatMap((a) => a.modelle))) {
      let a2; try { a2 = await pf('GET', `/products/${id}`); } catch (e) { if (e.fatal) throw e; a2 = { status: 0, json: {} }; }
      const l2 = modellLesen(a2, id, { bekannteVarianten: (basis.get(id) || {}).nVarianten });
      const brauchtRate2 = l2.art === 'ok' && !l2.alleAus && testKandidaten(l2, 1).length && (urteile.get(id) || { shopGruende: [] }).shopGruende.includes('keine-ch-rate');
      const r2 = brauchtRate2 ? await rateMessen(l2) : null;
      nach.set(id, { l2, u2: modellUrteil(l2, r2 ? r2.urteil : null, { aus: false, ausVarianten: [], ch: (urteile.get(id) || {}).ch }, basis.get(id) || {}) });
    }
    const bestaetigt = (a) => a.modelle.every((m) => {
      const n = nach.get(m);
      if (!n) return false;
      if (n.u2.shopAus) return true;
      if (n.l2.art !== 'ok') return false;
      const vs = new Set(a.variantenJeModell[m] || []);
      return n.l2.varianten.every((v) => !vs.has(v.id) || v.art === 'aus');
    });
    for (const a of plan.aktionen) {
      if (a.typ === 'entwurf' && !bestaetigt(a)) { befunde.push({ art: 'unbestaendig', handle: a.handle, text: `${a.handle}: Ausfall bei der Nachprüfung nicht bestätigt, keine Änderung` }); sagen(`  Nachprüfung ${a.handle}: Ausfall nicht bestätigt, ENTWURF unterbleibt`); continue; }
      try {
        if (a.typ === 'entwurf') {
          await produktEntwerfen(a.produktId, (v) => led('entwurf', a.produktId, v));
        } else if (a.typ === 'reaktivieren') {
          if (a.kanaele === null) { befunde.push({ art: 'kanaele-unbekannt', handle: a.handle, text: `${a.handle}: keine gemerkte Kanalliste (Feld ${MF_KANAELE} fehlt): Verkaufskanäle nach der Reaktivierung von Hand prüfen` }); sagen(`  Befund ${a.handle}: keine gemerkte Kanalliste`); }
          await produktReaktivieren(a.produktId, a.kanaele, (v) => led('reaktivieren', a.produktId, { ...v, handle: a.handle }));
        } else if (a.typ === 'sperre') {
          led('sperre', a.varianteId, { produktId: a.produktId, policy: a.vorherPolicy, sku: a.sku });
          const d = await schreibenGql(M_VARIANTE, { p: a.produktId, v: [{ id: a.varianteId, inventoryPolicy: 'DENY', metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: a.vorherPolicy }] }] });
          const f = userFehler(d, 'productVariantsBulkUpdate'); if (f) throw new Error('productVariantsBulkUpdate: ' + f);
        } else if (a.typ === 'freigabe') {
          led('freigabe', a.varianteId, { produktId: a.produktId, policy: a.vorherPolicy, marker: a.policyZurueck, sku: a.sku });
          let d = await schreibenGql(M_VARIANTE, { p: a.produktId, v: [{ id: a.varianteId, inventoryPolicy: a.policyZurueck }] }); let f = userFehler(d, 'productVariantsBulkUpdate'); if (f) throw new Error('productVariantsBulkUpdate: ' + f);
          d = await schreibenGql(M_MF_WEG, { m: [{ ownerId: a.varianteId, namespace: MF_NAMESPACE, key: MF_SPERRE }] }); f = userFehler(d, 'metafieldsDelete'); if (f) throw new Error('metafieldsDelete: ' + f);
        }
        gemacht.push(a);
      } catch (e) { fehler.push(`${a.typ} ${a.handle}: ${e.message}`); err(`Fehler ${a.typ} ${a.handle}: ${e.message}`); }
    }
    // Rücklesen der Shop-Änderungen (frisch)
    for (const a of gemacht) {
      const p = (await lesenGql(PRODUKT_Q, { id: a.produktId })).product;
      let ok = false;
      if (p) {
        if (a.typ === 'entwurf') ok = p.status === 'DRAFT' && p.tags.includes(TAG_AUS) && !!p.kanaele;
        else if (a.typ === 'reaktivieren') ok = p.status === 'ACTIVE' && !p.tags.includes(TAG_AUS) && !p.kanaele && kanaeleFehlend(a.kanaele || [], kanaeleVon(p)).length === 0;
        else { const v = p.variants.nodes.find((x) => x.id === a.varianteId); ok = !!v && (a.typ === 'sperre' ? v.inventoryPolicy === 'DENY' && v.sperre && v.sperre.value === a.vorherPolicy : v.inventoryPolicy === a.policyZurueck && !v.sperre); }
      }
      if (!ok) fehler.push(`Rücklesen ${a.typ} ${a.handle}: Stand weicht vom Soll ab`);
    }
    // Datei
    if (dateiNeu) {
      const frisch = await themeDateiLesen(th.id);
      if (frisch.zustand !== 'ok' || frisch.md5 !== live.md5) fehler.push(`${C.themeDatei} hat sich seit dem Lesen verändert: nicht überschrieben`);
      else {
        const text = ausblendenText(neu);
        led('theme', C.themeDatei, { inhalt: live.text, md5Vorher: live.md5, md5Nachher: md5(text) });
        try {
          const d = await schreibenGql(M_DATEI, { id: th.id, files: [{ filename: C.themeDatei, body: { type: 'TEXT', value: text } }] });
          const f = userFehler(d, 'themeFilesUpsert'); if (f) throw new Error(f);
          let ok = false; const t0 = jetztMs();
          for (let n = 0; n < 40 && jetztMs() - t0 <= C.warteThemeMs; n++) { const r = await themeDateiLesen(th.id); if (r.zustand === 'ok' && r.md5 === md5(text)) { ok = true; break; } if (C.warteThemeMs === 0) break; await sleep(Math.min(10000, C.warteThemeMs)); }
          if (!ok) fehler.push(`Rücklesen ${C.themeDatei}: Prüfsumme nach ${Math.round(C.warteThemeMs / 1000)} s nicht gleich dem Soll`);
          else sagen(`Datei geschrieben und zurückgelesen (${neu.modelle.length} Modelle, ${nVarNeu} Varianten)`);
        } catch (e) { fehler.push(`${C.themeDatei} schreiben: ${e.message}`); }
      }
    }
    const kurz = `${gemacht.filter((a) => a.typ === 'entwurf').length} auf ENTWURF, ${gemacht.filter((a) => a.typ === 'reaktivieren').length} reaktiviert, ${gemacht.filter((a) => a.typ === 'sperre').length} gesperrt, ${gemacht.filter((a) => a.typ === 'freigabe').length} freigegeben, Datei ${dateiNeu ? (dateiGleich ? 'Stand erneuert' : 'neu') : 'unverändert'}`;
    if (plan.aktionen.length || (dateiNeu && !dateiGleich) || fehler.length) await tg(`${fehler.length ? '[Fehler]' : '[Lager]'} LuxeStyle Printful-Lager: ${esc(kurz)}${neuAusModelle.length ? `; neu ausgeblendet: ${esc(neuAusModelle.join(', '))}` : ''}${fehler.length ? `\nFehler: ${esc(fehler.slice(0, 5).join(' | '))}` : ''}`);
    return await ende(fehler.length ? 1 : 0, kurz);
  } catch (e) {
    fehler.push(e.message);
    err('Fataler Fehler: ' + e.message);
    return await ende(1, 'Abbruch: ' + e.message);
  }


}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c)).catch((e) => { console.error('Fataler Fehler:', e && e.message); process.exit(1); });
}
