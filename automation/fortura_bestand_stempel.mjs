#!/usr/bin/env node
/**
 * fortura_bestand_stempel.mjs — setzt den Frische-Stempel des Fortura-Bestands.
 *
 * WAS ES TUT: schreibt ins Shop-Metafeld  luxe.fortura_bestand_stand  (single_line_text_field) den Zeitpunkt des letzten
 * ERFOLGREICHEN Bestandsabgleichs, ISO-8601 UTC «YYYY-MM-DDTHH:MM:SSZ». Das Theme zeigt eine Bestandszahl nur, solange der
 * Stempel frisch ist; fehlt er oder ist er alt, fällt es auf «keine Angabe» zurück (nie auf «wenige»). Darum darf der Stempel
 * nur nach einem Lauf stehen, der den Shop wirklich dem Feed angeglichen hat. Ein alter Stempel ist die sichere Richtung:
 * er altert von selbst, auch wenn die Pipeline still steht.
 *
 * DAS GATE (alles muss stimmen, sonst KEIN Stempel und Exit 1 mit allen Gründen):
 *   (a) LIVE_EXIT      Exit-Code des Live-Laufs von fortura_bestand_sync.mjs ist genau 0
 *   (b) NACH_DATEI     Text der Nachprüfung (ein zweiter Lauf des Abgleichs mit DRY=1) enthält die Zeile
 *                      «Abgleich: X unverändert · Y zu ändern …» mit Y <= max(40, 1 % von X+Y), der Lauf ist zu Ende gekommen
 *                      («[DRY] nichts geschrieben.»), keine Bremse hat abgebrochen, und es waren überhaupt Varianten da
 *   (c) FEED_DATEI     Alter der Feeddatei (mtime) <= 36 Stunden (fortura_feed_holen.sh setzt die mtime auf den Serverstand)
 *   (d) STAND_DATEI    dropship/_fortura_bestand_stand.json (schreibt der Live-Lauf) trägt  offen == 0
 *   Zusätzlich, weil billig und sicher: die Stand-Datei stammt aus diesem Lauf (höchstens 180 Minuten alt), ihr Feed-
 *   Fingerabdruck passt zu dem der Nachprüfung, und ein Exit-Code der Nachprüfung (NACH_EXIT), falls übergeben, ist 0.
 *
 * SCHREIBEN NUR MIT ALLEN DREI: LIVE=1, kein DRY=1, und die Freigabedatei dropship/FORTURA-BESTAND-FREI.txt liegt im Repo.
 * Sonst Trockenlauf (Vorgabe): das Gate wird gerechnet und angezeigt, der Stempel nur angezeigt.
 * Nach dem Schreiben wird das Metafeld frisch zurückgelesen; weicht es ab, ist der Lauf rot.
 *
 * Aufruf (Eingaben als Umgebungsvariablen):
 *   LIVE=1 LIVE_EXIT=0 NACH_DATEI=lauf-nach.txt NACH_EXIT=0 FEED_DATEI=/tmp/fortura_feed.csv \
 *   SHOPIFY_CLIENT_ID=… SHOPIFY_CLIENT_SECRET=… node automation/fortura_bestand_stempel.mjs
 * Weitere Schalter: STAND_DATEI, FREIGABE_DATEI, SHOPIFY_SHOP (Vorgabe wie fortura_bestand_sync.mjs), SHOPIFY_TOKEN_FILE
 *   (Ersatz, wenn keine Client-Zugangsdaten da sind), FEED_MAX_STUNDEN (36), STAND_MAX_MIN (180), MIN_VARIANTEN (1000).
 * Exit: 0 = Stempel gesetzt (im Trockenlauf: Gate bestanden) · 1 = KEIN Stempel (Gate nicht bestanden oder Schreiben/Zurücklesen
 *       fehlgeschlagen) · 2 = Eingabe oder Zugang fehlt (nichts versucht).
 *
 * Tests: dropship/lagerbestand-0511/stempel_test.mjs (reine Entscheidfunktion, Zeilen-Parser, Attrappe der Shopify-API).
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';

export const NAMESPACE = 'luxe';
export const KEY = 'fortura_bestand_stand';
export const TYP = 'single_line_text_field';
export const API = '2025-01';
export const STANDARD_SHOP = 'au3j0y-hq.myshopify.com';   // derselbe Shop, den fortura_bestand_sync.mjs fest anspricht
export const FEED_MAX_STUNDEN = 36;
export const ABWEICHUNG_MIN = 40;        // erlaubte Restabweichung nach dem Lauf: höchstens max(40, 1 % der Varianten)
export const ABWEICHUNG_ANTEIL = 0.01;
export const STAND_MAX_MIN = 180;
export const MIN_VARIANTEN = 1000;       // weniger Fortura-Varianten in der Nachprüfung = der Shop wurde nicht gelesen
const ZUKUNFT_TOLERANZ_MS = 10 * 60 * 1000;   // Uhrenabweichung zwischen Server und Runner

/* ---------- Zeitstempel ---------- */
/** «YYYY-MM-DDTHH:MM:SSZ» (UTC, ohne Millisekunden). */
export function stempelWert(datum = new Date()) {
  const d = datum instanceof Date ? datum : new Date(datum);
  if (Number.isNaN(d.getTime())) throw new Error('stempelWert: ungültiges Datum');
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/* ---------- Text der Nachprüfung lesen ---------- */
/** Liest die Zeile «Abgleich: X unverändert · Y zu ändern (davon N auf 0) · …». Mehrere Zeilen: die letzte zählt. */
export function parseAbgleichZeile(text) {
  const zeilen = String(text ?? '').split(/\r?\n/).filter(z => z.includes('Abgleich:'));
  for (let i = zeilen.length - 1; i >= 0; i--) {
    const z = zeilen[i];
    const m = z.match(/Abgleich:\s*(\d+)\s+unver\S*ndert\s+\S+\s+(\d+)\s+zu\s+\S*ndern/);
    if (!m) continue;
    const zahl = re => { const x = z.match(re); return x ? Number(x[1]) : null; };
    const anteil = z.match(/SKU nicht mehr im Feed\s*\(([\d.,]+)\s*%\)/);
    return {
      unveraendert: Number(m[1]),
      zuAendern: Number(m[2]),
      davonAufNull: zahl(/\(davon\s+(\d+)\s+auf\s+0\)/),
      nichtImFeed: zahl(/(\d+)\s+SKU nicht mehr im Feed/),
      nichtImFeedProzent: anteil ? Number(anteil[1].replace(',', '.')) : null,
      ohneBestandsfuehrung: zahl(/(\d+)\s+ohne Bestandsf\S*hrung/),
      ohneCHLagerzeile: zahl(/(\d+)\s+ohne CH-Lagerzeile/),
    };
  }
  return null;
}

/** Feed-Fingerabdruck aus «Feed …: N Zeilen → M Artikelnummern (Fingerabdruck abc123def456)». */
export function parseFingerabdruck(text) {
  const m = String(text ?? '').match(/Fingerabdruck\s+([0-9a-f]{6,40})\)/);
  return m ? m[1] : null;
}

/** Ist die Nachprüfung zu Ende gelaufen? Ein DRY-Lauf endet mit «[DRY] nichts geschrieben.»; Bremsen brechen vorher ab. */
export function nachpruefungZuEnde(text) {
  const t = String(text ?? '');
  return { zuEnde: /\[DRY\] nichts geschrieben\./.test(t), abbruch: /ABBRUCH|OFFEN:/.test(t) };
}

/* ---------- Das Gate (rein, ohne Ein-/Ausgabe) ---------- */
/**
 * @param {object} e
 * @param {number} e.liveExit      Exit-Code des Live-Laufs (muss die Zahl 0 sein)
 * @param {string} e.nachText      Text der Nachprüfung (DRY-Lauf)
 * @param {number} [e.nachExit]    Exit-Code der Nachprüfung; wenn angegeben, muss er 0 sein
 * @param {number} e.feedMtimeMs   mtime der Feeddatei in ms (NaN/fehlt = unbekannt)
 * @param {number} e.jetztMs       aktuelle Zeit in ms
 * @param {object} e.stand         Inhalt von dropship/_fortura_bestand_stand.json (null = fehlt/unlesbar)
 * @param {object} [e.opt]         feedMaxStunden, standMaxMin, minVarianten
 * @returns {{ok:boolean, gruende:string[], mess:object}}
 */
export function stempelEntscheid({ liveExit, nachText, nachExit, feedMtimeMs, jetztMs, stand, opt = {} } = {}) {
  const feedMax = opt.feedMaxStunden ?? FEED_MAX_STUNDEN;
  const standMax = opt.standMaxMin ?? STAND_MAX_MIN;
  const minVar = opt.minVarianten ?? MIN_VARIANTEN;
  const gruende = [], mess = {};

  // (a) Live-Lauf
  if (!Number.isInteger(liveExit)) gruende.push('(a) Exit-Code des Live-Laufs unbekannt');
  else if (liveExit !== 0) gruende.push(`(a) Live-Lauf endete mit Exit ${liveExit} (verlangt 0)`);
  mess.liveExit = Number.isInteger(liveExit) ? liveExit : null;

  // (b) Nachprüfung
  const z = parseAbgleichZeile(nachText);
  const ende = nachpruefungZuEnde(nachText);
  if (!z) gruende.push('(b) Nachprüfung: Zeile «Abgleich: X unverändert · Y zu ändern» fehlt');
  else {
    const summe = z.unveraendert + z.zuAendern;
    const grenze = Math.max(ABWEICHUNG_MIN, Math.floor(summe * ABWEICHUNG_ANTEIL));
    Object.assign(mess, { unveraendert: z.unveraendert, zuAendern: z.zuAendern, summe, grenze });
    if (summe < minVar) gruende.push(`(b) Nachprüfung sah nur ${summe} Fortura-Varianten (weniger als ${minVar}): Shop nicht gelesen?`);
    if (z.zuAendern > grenze) gruende.push(`(b) Nachprüfung: ${z.zuAendern} Varianten weichen noch vom Feed ab (erlaubt höchstens ${grenze} = max(${ABWEICHUNG_MIN}, 1 % von ${summe}))`);
  }
  if (ende.abbruch) gruende.push('(b) Nachprüfung meldet ABBRUCH/OFFEN (eine Bremse hat angehalten)');
  if (!ende.zuEnde) gruende.push('(b) Nachprüfung ist nicht zu Ende gelaufen (Schlusszeile «[DRY] nichts geschrieben.» fehlt)');
  if (nachExit !== undefined && nachExit !== null) {
    mess.nachExit = nachExit;
    if (nachExit !== 0) gruende.push(`(b) Nachprüfung endete mit Exit ${nachExit} (verlangt 0)`);
  }

  // (c) Feed-Alter
  if (!Number.isFinite(feedMtimeMs) || !Number.isFinite(jetztMs)) gruende.push('(c) Zeit der Feeddatei unbekannt (Datei fehlt?)');
  else {
    const alterH = (jetztMs - feedMtimeMs) / 3600000;
    mess.feedAlterH = Math.round(alterH * 100) / 100;
    if (jetztMs - feedMtimeMs < -ZUKUNFT_TOLERANZ_MS) gruende.push('(c) Zeit der Feeddatei liegt in der Zukunft');
    else if (alterH > feedMax) gruende.push(`(c) Feed ist ${alterH.toFixed(1)} Stunden alt (höchstens ${feedMax})`);
  }

  // (d) Stand-Datei
  if (!stand || typeof stand !== 'object') gruende.push('(d) Stand-Datei fehlt oder ist unlesbar');
  else {
    mess.offen = stand.offen ?? null;
    if (stand.offen !== 0) gruende.push(`(d) Stand-Datei trägt offen=${JSON.stringify(stand.offen)} (verlangt 0)`);
    // Die Stand-Datei muss aus DIESEM Lauf stammen, nicht von gestern.
    const t = typeof stand.stand === 'string' ? Date.parse(stand.stand) : NaN;
    if (!Number.isFinite(t) || !Number.isFinite(jetztMs)) gruende.push('(d) Stand-Datei ohne lesbaren Zeitstempel «stand»');
    else {
      const min = (jetztMs - t) / 60000;
      mess.standAlterMin = Math.round(min * 10) / 10;
      if (jetztMs - t < -ZUKUNFT_TOLERANZ_MS) gruende.push('(d) Zeitstempel der Stand-Datei liegt in der Zukunft');
      else if (min > standMax) gruende.push(`(d) Stand-Datei ist ${min.toFixed(0)} Minuten alt (höchstens ${standMax}): stammt nicht aus diesem Lauf`);
    }
    const fpNach = parseFingerabdruck(nachText);
    if (stand.feed_hash && fpNach && stand.feed_hash !== fpNach) gruende.push(`(d) Feed-Fingerabdruck der Stand-Datei (${stand.feed_hash}) passt nicht zur Nachprüfung (${fpNach})`);
  }
  return { ok: gruende.length === 0, gruende, mess };
}

/* ---------- Dateien lesen ---------- */
export function leseStand(pfad) { try { return JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch { return null; } }
export function leseText(pfad) { try { return fs.readFileSync(pfad, 'utf8'); } catch { return ''; } }
export function feedMtime(pfad) { try { return fs.statSync(pfad).mtimeMs; } catch { return NaN; } }

/* ---------- Shopify ---------- */
export async function tokenHolen({ shop, id, secret, fetchFn = globalThis.fetch }) {
  const r = await fetchFn(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
  });
  if (!r.ok) throw new Error(`Token: HTTP ${r.status}`);
  const j = await r.json();
  if (!j || !j.access_token) throw new Error('Token: Antwort ohne access_token');
  return j.access_token;
}

const Q_SHOP = '{ shop { id } }';
const M_SET = 'mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id namespace key } userErrors{ field message code } } }';
const Q_LESEN = 'query($ns:String!,$k:String!){ shop { metafield(namespace:$ns, key:$k){ value } } }';

/**
 * Schreibt den Stempel und liest ihn frisch zurück. `q(query, variables)` liefert `data` (wirft bei Fehlern).
 * @returns {{ok:true, shopId:string} | {ok:false, grund:string}}
 */
export async function stempelSchreiben(q, wert) {
  const shopId = (await q(Q_SHOP)).shop?.id;
  if (!/^gid:\/\/shopify\/Shop\/\d+$/.test(String(shopId || ''))) return { ok: false, grund: 'Shop-ID nicht lesbar' };
  const w = (await q(M_SET, { m: [{ ownerId: shopId, namespace: NAMESPACE, key: KEY, type: TYP, value: wert }] })).metafieldsSet;
  if (!w) return { ok: false, grund: 'metafieldsSet: Antwort ohne Ergebnis' };
  if (w.userErrors && w.userErrors.length) return { ok: false, grund: 'metafieldsSet: ' + JSON.stringify(w.userErrors).slice(0, 300) };
  const zurueck = (await q(Q_LESEN, { ns: NAMESPACE, k: KEY })).shop?.metafield?.value;
  if (zurueck !== wert) return { ok: false, grund: `Zurücklesen weicht ab (gelesen: ${zurueck ?? 'nichts'}, geschrieben: ${wert})` };
  return { ok: true, shopId };
}

/* ---------- Ablauf ---------- */
const ganzzahl = s => (/^\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : undefined);
const zahlOderStandard = (s, standard) => { if (s === undefined || s === '') return standard; const n = Number(s); return Number.isFinite(n) && n > 0 ? n : NaN; };

/**
 * Ganzer Lauf. Rückgabe = Exit-Code (0/1/2). Alle Ausgaben gehen über `log` / `fehlerLog`.
 * `gqlOpt` ist für Tests (kein Warten, eigenes fetch).
 */
export async function lauf({ env = process.env, jetzt = Date.now(), fetchFn = globalThis.fetch, log = console.log, fehlerLog = console.error, gqlOpt = {} } = {}) {
  const liveExit = ganzzahl(env.LIVE_EXIT);
  const nachExit = env.NACH_EXIT === undefined || env.NACH_EXIT === '' ? undefined : (ganzzahl(env.NACH_EXIT) ?? -1);
  const opt = {
    feedMaxStunden: zahlOderStandard(env.FEED_MAX_STUNDEN, FEED_MAX_STUNDEN),
    standMaxMin: zahlOderStandard(env.STAND_MAX_MIN, STAND_MAX_MIN),
    minVarianten: zahlOderStandard(env.MIN_VARIANTEN, MIN_VARIANTEN),
  };
  if (Object.values(opt).some(Number.isNaN)) { fehlerLog('OFFEN: FEED_MAX_STUNDEN / STAND_MAX_MIN / MIN_VARIANTEN müssen positive Zahlen sein.'); return 2; }

  const nachDatei = env.NACH_DATEI || '';
  if (!nachDatei) { fehlerLog('OFFEN: NACH_DATEI (Text der Nachprüfung) fehlt. Ohne sie wird KEIN Stempel gesetzt.'); return 2; }
  const feedDatei = env.FEED_DATEI || env.FORTURA_CSV || '/tmp/fortura_feed.csv';
  const standDatei = env.STAND_DATEI || 'dropship/_fortura_bestand_stand.json';
  const freigabe = env.FREIGABE_DATEI || 'dropship/FORTURA-BESTAND-FREI.txt';

  const e = stempelEntscheid({
    liveExit, nachText: leseText(nachDatei), nachExit,
    feedMtimeMs: feedMtime(feedDatei), jetztMs: jetzt, stand: leseStand(standDatei), opt,
  });
  const m = e.mess;
  log(`Gate: Live-Exit ${m.liveExit ?? '?'} · Nachprüfung ${m.unveraendert ?? '?'} unverändert, ${m.zuAendern ?? '?'} zu ändern (erlaubt ${m.grenze ?? '?'})` +
    ` · Feed ${m.feedAlterH ?? '?'} h alt (höchstens ${opt.feedMaxStunden}) · offen ${m.offen ?? '?'} · Stand ${m.standAlterMin ?? '?'} min alt`);
  if (!e.ok) {
    fehlerLog('KEIN STEMPEL gesetzt. Gründe:');
    for (const g of e.gruende) fehlerLog('  - ' + g);
    return 1;
  }

  const wert = stempelWert(new Date(jetzt));
  const schreiben = env.LIVE === '1' && env.DRY !== '1' && fs.existsSync(freigabe);
  if (!schreiben) {
    const warum = env.DRY === '1' ? 'DRY=1' : env.LIVE !== '1' ? 'LIVE ist nicht 1' : `Freigabedatei ${freigabe} fehlt`;
    log(`[Trockenlauf: ${warum}] Gate bestanden. Stempel würde gesetzt: ${NAMESPACE}.${KEY} = ${wert}`);
    return 0;
  }

  let shop;
  try { shop = normalizeShopifyHost(env.SHOPIFY_SHOP) || STANDARD_SHOP; }
  catch (err) { fehlerLog('OFFEN: ' + err.message); return 2; }
  let tok = '';
  try {
    const id = env.SHOPIFY_CLIENT_ID, secret = shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET);
    if (id && secret) tok = await tokenHolen({ shop, id, secret, fetchFn });
    else if (env.SHOPIFY_TOKEN_FILE && fs.existsSync(env.SHOPIFY_TOKEN_FILE)) tok = fs.readFileSync(env.SHOPIFY_TOKEN_FILE, 'utf8').trim();
  } catch (err) { fehlerLog('KEIN STEMPEL: Shopify-Token nicht erhältlich (' + err.message + ')'); return 1; }
  if (!tok) { fehlerLog('OFFEN: kein Shopify-Zugang (SHOPIFY_CLIENT_ID/SECRET oder SHOPIFY_TOKEN_FILE). Es wird nichts geschrieben.'); return 2; }

  const q = (a, b) => shopifyGql(shop, API, tok, a, b, { fetch: fetchFn, ...gqlOpt });
  let r;
  try { r = await stempelSchreiben(q, wert); }
  catch (err) { fehlerLog('KEIN STEMPEL: ' + err.message); return 1; }
  if (!r.ok) { fehlerLog('KEIN STEMPEL: ' + r.grund); return 1; }
  log(`STEMPEL gesetzt: shop.metafields.${NAMESPACE}.${KEY} = ${wert} (frisch zurückgelesen)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  lauf().then(code => { process.exitCode = code; }, err => { console.error('FEHLER', err && err.message || err); process.exitCode = 1; });
}
