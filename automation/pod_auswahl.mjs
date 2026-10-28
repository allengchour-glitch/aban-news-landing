#!/usr/bin/env node
/* LuxeStyle — pod_auswahl.mjs
 * «Selbst gestalten»: MATERIAL (mit Preis) und HANDYMODELLE zur Auswahl (Besitzer 27.10.2026). Druckpartner PRINTFUL.
 *   • Poster:  Option «Material» (Poster matt · Foto-Glanzpapier · Leinwand · Gerahmt Schwarz/Weiss/Eiche) vor «Grösse»
 *   • Hoodie:  Baumwoll-Mix · Premium-Baumwolle · Bio-Baumwolle        • T-Shirt: Ringgarn · Klassisch · Bio · Heavyweight
 *   • iPhone-Hülle: Hartschale MagSafe · Hartschale · Klare Hülle      • NEU (DRAFT): «Samsung-Hülle selbst gestalten» (Hartschale matt/glänzend · Klar · Slim)
 *   • je Produkt ein Block «Materialien im Vergleich» (nur BELEGTE Printful-Angaben) zwischen <!-- lx-material-v1 --> … <!-- /lx-material-v1 -->
 * Vorhandene Varianten werden NIE geändert (SKU, Preis, ID). Neue Varianten: SKU «<Präfix>_<Printful-Variantennummer>», Preis nach lib/pod_preise.mjs
 * (Richtwert max(Einkauf×2.3, Einkauf+12) UND Netto ≥ 12 CHF nach Printful-Versand und Zahlungsgebühr).
 *
 * TROCKENLAUF ist die Vorgabe: liest (Shopify nur Abfrage, wenn Zugangsdaten da sind, sonst das Datenpaket), rechnet, schreibt NUR Dateien nach OUT.
 * LIVE=1 schreibt (productOptionsCreate, productOptionUpdate, productVariantsBulkCreate, productUpdate, productSet, metafieldsSet) und verlangt PLAN=<geprüfter Plan>.
 *
 * ENV (alle optional):
 *   ONLY=<handle,…>   nur diese Produkte                      OUT=/tmp/pod_auswahl   Ausgabeordner
 *   PLAN=<pfad>       Trockenlauf: Plan-JSON hierhin; LIVE: dieses geprüfte Plan-JSON muss dem frisch berechneten Plan gleichen (Hash)
 *   LIVE=1            schreibt (nur den vorher geprüften Plan)
 *   OFFLINE=1         Shopify nicht abfragen, Bestand aus dem Datenpaket (Stand 27.10.2026)
 *   DATEN=holen       Datenpaket auffrischen (NUR lesende Abfragen: Shopify, Printful), schreibt dropship/pod-auswahl/*.json bzw. DATEN_DIR
 *   DATEN=skuindex    nur den SKU-Index auffrischen (Shopify-Abfrage: gibt es die neuen Printful-Varianten schon in anderen Produkten?)
 *   OHNE=<handle:Material,…>  Material(ien) nicht in das Produkt aufnehmen (z. B. OHNE=unisex-t-shirt-selbst-gestalten:Klassische Baumwolle); ändert den Plan-Hash,
 *                     muss im Trockenlauf und bei LIVE=1 gleich gesetzt sein
 *   BEFUND_OK=<handle:code,…>  bestätigt EINEN Blocker-Befund (nach Entscheid des Besitzers), nie pauschal ein ganzes Produkt
 *   VERSAND_HOLEN=1   fehlende Printful-Versandraten holen (900 ms Pause), Zwischenspeicher /tmp/pod/versand_cache.json
 *   KATALOG/BESCHREIBUNGEN/VERSAND/BESTAND/SKU_PRUEFUNG=<pfad>   einzelne Dateien des Datenpakets ersetzen
 *   DATEN_MAX_ALTER_H=<Stunden>  Höchstalter von Katalog (EU-Lager, Einkaufspreise), Beschreibungen, Versandraten und SKU-Prüfung bei LIVE=1 (Vorgabe 72). Ältere Daten:
 *                     LIVE verweigert (Exit 1) → DATEN=holen, neuen Trockenlauf ansehen. Im Trockenlauf nur eine Warnung.
 *   PRINTFUL_PRUEFEN=0  schaltet die Gegenprüfung der neuen Varianten bei Printful vor dem Schreiben ab (Vorgabe: mit PRINTFUL_API_KEY an; GET /products/variant/<id>: Einkauf, EU-Lager)
 *   PF_PAUSE_FAKTOR=<Zahl>  Faktor für die Pausen zwischen Printful-Aufrufen bei DATEN=holen (Vorgabe 1; 0 nur für Tests)
 *   VARIANT_BUDGET=<n>  Rest des Shopify-Tageslimits für neue Varianten, wenn bekannt (Shopify nennt ihn nicht): ein Produkt, das nicht mehr hineinpasst, wird gar nicht begonnen (Exit 4)
 *   PRINTFUL_API_KEY, [PRINTFUL_STORE_ID], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN)
 * Exit: 0 alles Geplante ausgeführt · 1 Fehler (Produkt mit FEHLER, drei Fehler in Folge, Eingabefehler) · 3 Abweichung (Zustand ≠ Plan)
 *       4 Tageslimit für neue Varianten (später denselben Befehl wiederholen) · 5 mindestens ein Produkt im Lauf GESPERRT (Blocker-Befund nicht bestätigt)
 *       Die letzte Zeile der Ausgabe nennt den Grund («ENDE: Exit n – …»).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { gqlFuer, API_VERSION } from './lib/pod_auswahl_gql.mjs';
import { SPEC } from './lib/pod_auswahl_spec.mjs';
import { planeAlles, benoetigteVersandIds, tabelleMarkdown, tabelleCsv, pfIdAusSku } from './lib/pod_auswahl_plan.mjs';
import { ladePaket, schreibeJson, PAKET_DIR, DATEIEN, pfGet, kuerzeProdukt, holeFehlendeRaten, holeSkuIdentitaet, leseBestand, katalogIdsAusSpec, farbenAusSpec, belegIdsAusSpec, leseSkuIndex, kandidatenIds, SKU_INDEX_SUCHE, pruefeDatenAlter, pruefeNeueVarianten, DATEN_MAX_ALTER_H } from './lib/pod_auswahl_daten.mjs';
import { lauf, produktSetEingabe, zusammenfassung, EXIT_TEXT } from './lib/pod_auswahl_schreiben.mjs';

const E = process.env;
const LIVE = E.LIVE === '1', OFFLINE = E.OFFLINE === '1';
const ONLY = (E.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = E.OUT || '/tmp/pod_auswahl';
const PLAN = E.PLAN || join(OUT, 'plan.json');
const BEFUND_OK = (E.BEFUND_OK || '').split(',').map((s) => s.trim()).filter(Boolean);
/** Zahl aus der Umgebung: leer → `leer`; sonst eine Zahl ≥ `min` (sonst Fehler, nichts raten). */
export function parseZahl(name, text, { leer = null, min = 0 } = {}) {
  if (text === undefined || String(text).trim() === '') return leer;
  const n = Number(text);
  if (!Number.isFinite(n) || n < min) throw new Error(`${name}: «${text}» ist keine Zahl ≥ ${min}`);
  return n;
}
/** OHNE=«handle:Material,handle:Material» → [{handle, material}] (Material darf Leerzeichen und «·» enthalten, aber kein Komma). */
export function parseOhne(text) {
  return String(text || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf(':');
    if (i <= 0 || i === x.length - 1) throw new Error(`OHNE: «${x}» ist nicht von der Form handle:Material`);
    return { handle: x.slice(0, i).trim(), material: x.slice(i + 1).trim() };
  });
}
const API = API_VERSION;   // 2026-01 (eine Stelle: lib/pod_auswahl_gql.mjs)
const REPO = fileURLToPath(new URL('..', import.meta.url));
const LEDGER = E.LEDGER || join(REPO, 'dropship/pod_auswahl_ledger.txt');
const SICHERUNG = E.SICHERUNG || join(REPO, 'dropship/pod-sicherung');
const VERSAND_CACHE = E.VERSAND_CACHE || '/tmp/pod/versand_cache.json';
const PF_KEY = (E.PRINTFUL_API_KEY || '').trim(), PF_STORE = (E.PRINTFUL_STORE_ID || '').trim();
const ADMIN_TOKEN = (E.SHOPIFY_ADMIN_TOKEN || '').trim(), CID = (E.SHOPIFY_CLIENT_ID || '').trim(), CSEC = (shopifyClientSecret(E.SHOPIFY_CLIENT_SECRET) || '').trim();
let SHOP = (E.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const hatShopify = !!(ADMIN_TOKEN || (CID && CSEC));
const log = (...a) => console.log(...a);

async function shopifyToken() {
  const probe = async (t) => { try { const r = await shopifyGql(SHOP, API, t, '{ shop { name } }', {}); return !!r?.shop?.name; } catch { return false; } };
  if (ADMIN_TOKEN && await probe(ADMIN_TOKEN)) return ADMIN_TOKEN;
  if (CID && CSEC) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
    const j = await r.json().catch(() => ({}));
    if (j.access_token && await probe(j.access_token)) return j.access_token;
  }
  throw new Error('Keine funktionierende Shopify-Anmeldung');
}
// Schreibbibliothek und Datenmodul erwarten {data, errors} (damit das Tageslimit erkannt wird). Mutationen werden NIE still wiederholt: lib/pod_auswahl_gql.mjs
const gqlMit = (tok) => gqlFuer({ shop: SHOP, api: API, token: tok });

const pfade = () => ({ katalog: E.KATALOG, beschreibungen: E.BESCHREIBUNGEN, versand: E.VERSAND, bestand: E.BESTAND, skuPruefung: E.SKU_PRUEFUNG });
const ohneLeer = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));

// ───────────────────────────────────────────────────────────── DATEN=holen: Datenpaket auffrischen (nur lesend)
async function datenHolen() {
  if (!PF_KEY) throw new Error('PRINTFUL_API_KEY fehlt');
  const dir = E.DATEN_DIR || PAKET_DIR, heute = new Date().toISOString().slice(0, 10);
  const pf = { key: PF_KEY, store: PF_STORE };
  const faktor = parseZahl('PF_PAUSE_FAKTOR', E.PF_PAUSE_FAKTOR, { leer: 1, min: 0 });   // Pausen zwischen Printful-Aufrufen (700 ms / 900 ms) mal Faktor; nur für Tests auf 0
  const pause = (ms) => new Promise((r) => setTimeout(r, ms * faktor));
  // 1. Katalog + Beschreibungen (GET /products/{id}, öffentlich)
  const ids = [...new Set([...katalogIdsAusSpec(SPEC), ...belegIdsAusSpec(SPEC)])].sort((a, b) => a - b);
  const farben = farbenAusSpec(SPEC), produkte = {}, eintraege = {};
  for (const id of ids) {
    const { status, j } = await pfGet('/products/' + id, pf);
    if (status !== 200 || !j.result) throw new Error(`Printful-Produkt ${id}: HTTP ${status}`);
    if (katalogIdsAusSpec(SPEC).includes(id)) produkte[String(id)] = kuerzeProdukt(j.result, farben[id] ?? null);
    if (belegIdsAusSpec(SPEC).includes(id)) eintraege[String(id)] = { title: j.result.product.title, desc: j.result.product.description };
    log(`Printful ${id}: ${j.result.product.title} (${(produkte[String(id)] || {}).variants?.length ?? '–'} Varianten gespeichert)`);
    await pause(700);
  }
  schreibeJson(join(dir, DATEIEN.katalog), { quelle: 'Printful GET /products/{id} (öffentlich)', stand: heute, eu: 'availability_status der Region EU', farbe: 'Textilien nur in der Farbe der Spezifikation', produkte });
  schreibeJson(join(dir, DATEIEN.beschreibungen), { quelle: 'Printful GET /products/{id} → product.description (Englisch)', stand: heute, eintraege });
  // 2. Bestand (Shopify, nur Abfrage) + Identität der vorhandenen SKUs (Printful, nur GET)
  if (!hatShopify) throw new Error('Shopify-Zugangsdaten fehlen (DATEN=holen liest den Bestand)');
  const gql = gqlMit(await shopifyToken());
  const bestand = await leseBestand(gql, SPEC.filter((s) => s.art === 'erweitern').map((s) => s.handle));
  schreibeJson(join(dir, DATEIEN.bestand), { quelle: `Shopify Admin GraphQL productByIdentifier (nur Abfrage), API ${API}`, stand: heute, produkte: bestand });
  const varianten = {};
  for (const p of Object.values(bestand)) for (const v of p.variants) {
    const id = pfIdAusSku(v.sku); if (!id || varianten[id]) continue;
    varianten[id] = await holeSkuIdentitaet(id, pf); log(`SKU ${v.sku}:`, JSON.stringify(varianten[id]).slice(0, 120)); await pause(700);
  }
  schreibeJson(join(dir, DATEIEN.skuPruefung), { quelle: 'Printful GET /products/variant/{id} für jede vorhandene SKU', stand: heute, varianten });
  await skuIndexSchreiben(dir, gql, produkte, heute);
  // 3. Versandraten (POST /shipping/rates ist eine reine Berechnung)
  // ALLE Raten neu holen (keine alten übernehmen): der Stand «heute» gilt für die ganze Datei, und LIVE=1 verlässt sich auf ihn (DATEN_MAX_ALTER_H)
  const vp = join(dir, DATEIEN.versand);
  const ziel = existsSync(vp) ? JSON.parse(readFileSync(vp, 'utf8')).ziel : null;
  const datei = { stand: heute, ziel: ziel || 'CH 8001 (Printful /shipping/rates, STANDARD, 1 Stück, USD)', raten: {} };
  const bedarf = benoetigteVersandIds({ katalog: produkte, bestand });
  const n = await holeFehlendeRaten(bedarf, datei.raten, { ...pf, pause, log: (id, r) => log(`Versand ${id}:`, r.usd ?? r.fehler) });
  schreibeJson(vp, datei);
  log(`Datenpaket aufgefrischt in ${dir}: ${Object.keys(produkte).length} Produkte, ${Object.keys(bestand).length} Bestandsprodukte, ${n} neue Versandraten.`);
}

/** SKU-Index (nur Shopify-Abfrage): welche der NEUEN Printful-Varianten tragen andere Produkte des Shops schon als SKU? */
async function skuIndexSchreiben(dir, gql, katalog, heute) {
  const idx = await leseSkuIndex(gql, kandidatenIds(SPEC, katalog), SPEC.map((s) => s.handle));
  schreibeJson(join(dir, DATEIEN.skuIndex), { quelle: `Shopify Admin GraphQL products (nur Abfrage), Suche «${SKU_INDEX_SUCHE}», SKU «<Präfix>_<Printful-Variantennummer>» der neuen Varianten`, stand: heute,
    produkteGelesen: idx.produkteGelesen, abgeschnitten: idx.abgeschnitten, treffer: idx.treffer });
  log(`SKU-Index: ${idx.produkteGelesen} Produkte gelesen, ${Object.keys(idx.treffer).length} Printful-Nummern kommen auch in anderen Produkten vor${idx.abgeschnitten.length ? ' · UNVOLLSTÄNDIG gelesen (>100 Varianten): ' + idx.abgeschnitten.join(', ') : ''}.`);
}
async function skuIndexHolen() {
  if (!hatShopify) throw new Error('Shopify-Zugangsdaten fehlen (DATEN=skuindex liest den Shop)');
  const dir = E.DATEN_DIR || PAKET_DIR;
  const katalog = JSON.parse(readFileSync(join(PAKET_DIR, DATEIEN.katalog), 'utf8')).produkte;
  await skuIndexSchreiben(dir, gqlMit(await shopifyToken()), katalog, new Date().toISOString().slice(0, 10));
}

// ───────────────────────────────────────────────────────────── Plan
/**
 * Das LIVE-Tor als eigene Funktion, damit ein Test es AUSFÜHREN kann (mit Attrappen statt Shopify): erst die Plandatei, dann der Hash, dann (optional) die Gegenprüfung
 * der neuen Varianten bei Printful, erst danach kommt der Zugang zu Shopify und der Schreibweg. Gibt {exit} zurück; ein fehlender geprüfter Plan wirft.
 */
export async function liveAusfuehren({ plan, planPfad, gqlHolen, pruefeVarianten = null, laufFn = lauf, ledgerPfad, sicherungsDir, befundOk = [], nur = null, variantenBudget = null,
  log = (...a) => console.log(...a), err = (...a) => console.error(...a), existiert = existsSync, lies = (p) => readFileSync(p, 'utf8') }) {
  if (!existiert(planPfad)) throw new Error(`LIVE=1 braucht den geprüften Plan (${planPfad}): zuerst den Trockenlauf machen und ansehen`);
  const geprueft = JSON.parse(lies(planPfad));
  if (geprueft.hash !== plan.hash) { err(`ABWEICHUNG: der frisch berechnete Plan (${plan.hash.slice(0, 16)}) ist nicht der geprüfte (${String(geprueft.hash).slice(0, 16)}). Trockenlauf wiederholen und neu prüfen.`); err(`ENDE: Exit 3 – ${EXIT_TEXT[3]}`); return { exit: 3 }; }
  if (pruefeVarianten) {
    const abw = await pruefeVarianten(plan);
    if (abw.length) { err(`ABWEICHUNG: Printful meldet für die neuen Varianten andere Werte als der Plan (${abw.length}):\n  ${abw.slice(0, 20).join('\n  ')}\nDatenpaket auffrischen (DATEN=holen), Trockenlauf wiederholen und neu prüfen.`); err(`ENDE: Exit 3 – ${EXIT_TEXT[3]}`); return { exit: 3 }; }
  }
  const gql = await gqlHolen();
  const res = await laufFn({ plan, gql, ledgerPfad, sicherungsDir, befundOk, nur, variantenBudget, log });
  log('\n' + zusammenfassung(res));   // Ergebnis je Produkt, Zähler und «ENDE: Exit n – Grund» als LETZTE Zeilen
  return { exit: res.exit, res };
}

async function main() {
  const ohne = parseOhne(E.OHNE);
  const maxAlterH = parseZahl('DATEN_MAX_ALTER_H', E.DATEN_MAX_ALTER_H, { leer: DATEN_MAX_ALTER_H, min: 1 });
  const variantenBudget = parseZahl('VARIANT_BUDGET', E.VARIANT_BUDGET, { leer: null, min: 0 });
  if (LIVE && OFFLINE) throw new Error('LIVE=1 und OFFLINE=1 widersprechen sich: LIVE liest den Shop frisch');
  if (ONLY.length) { const unbekannt = ONLY.filter((h) => !SPEC.some((s) => s.handle === h)); if (unbekannt.length) throw new Error(`ONLY: unbekannte Handles ${unbekannt.join(', ')} (bekannt: ${SPEC.map((s) => s.handle).join(', ')})`); }
  if (E.DATEN === 'holen') return datenHolen();
  if (E.DATEN === 'skuindex') return skuIndexHolen();
  const p = ohneLeer(pfade());
  // Versandraten: ausdrücklich gesetzter Pfad, sonst bei VERSAND_HOLEN der Zwischenspeicher, sonst das Datenpaket
  if (!p.versand && E.VERSAND_HOLEN === '1') {
    if (!existsSync(VERSAND_CACHE)) { mkdirSync(join(VERSAND_CACHE, '..'), { recursive: true }); writeFileSync(VERSAND_CACHE, readFileSync(join(PAKET_DIR, DATEIEN.versand))); }
    p.versand = VERSAND_CACHE;
  }
  const paket = ladePaket({ pfade: p });
  // Alter der Printful-Daten: LIVE rechnet nur mit frischen Katalog-, Lager-, Preis- und Versanddaten (der Plan-Hash prüft das nicht: Trockenlauf und LIVE lesen dieselbe Datei).
  // VERSAND_HOLEN holt nur FEHLENDE Raten und macht die vorhandenen nicht jünger; aufgefrischt wird mit DATEN=holen (holt alles neu).
  const zuAlt = pruefeDatenAlter(paket.meta, { maxStunden: maxAlterH });
  if (zuAlt.length) {
    const text = zuAlt.map((x) => x.grund).join('; ');
    if (LIVE) throw new Error(`LIVE=1 verweigert: Printful-Daten zu alt (${text}). Zuerst DATEN=holen (Katalog, EU-Lager, Einkaufspreise, Versand, SKU-Prüfung), dann den Trockenlauf neu ansehen. Mit DATEN_MAX_ALTER_H=<Stunden> lässt sich die Grenze (Vorgabe ${DATEN_MAX_ALTER_H}) ausdrücklich ändern.`);
    log(`⚠️ Printful-Daten älter als ${maxAlterH} Stunden (${text}) – LIVE=1 würde so verweigert. Auffrischen: DATEN=holen`);
  }
  let bestand = paket.bestand, bestandQuelle = `Datenpaket (Stand ${paket.meta.bestand.stand})`;
  let skuIndex = paket.skuIndex, skuIndexAbgeschnitten = paket.skuIndexAbgeschnitten, skuIndexQuelle = `Datenpaket (Stand ${paket.meta.skuIndex.stand})`;
  if ((LIVE || !OFFLINE) && hatShopify && !E.BESTAND) {
    try {
      const gql = gqlMit(await shopifyToken());
      bestand = await leseBestand(gql, SPEC.filter((s) => s.art === 'erweitern' && (!ONLY.length || ONLY.includes(s.handle) || SPEC.some((x) => x.vorlage === s.handle))).map((s) => s.handle));
      bestandQuelle = 'Shopify (frisch gelesen, nur Abfrage)';
      const idx = await leseSkuIndex(gql, kandidatenIds(SPEC, paket.katalog), SPEC.map((s) => s.handle));
      skuIndex = idx.treffer; skuIndexAbgeschnitten = idx.abgeschnitten; skuIndexQuelle = `Shopify (frisch gelesen, ${idx.produkteGelesen} Produkte)`;
    } catch (e) { if (LIVE) throw e; log(`⚠️ Shopify nicht lesbar (${e.message}) → Bestand und SKU-Index aus dem Datenpaket`); bestand = paket.bestand; skuIndex = paket.skuIndex; skuIndexAbgeschnitten = paket.skuIndexAbgeschnitten; }
  } else if (LIVE) throw new Error('LIVE=1 braucht Shopify-Zugangsdaten und darf nicht OFFLINE sein');
  const raten = paket.versand;
  if (E.VERSAND_HOLEN === '1') {
    if (!PF_KEY) throw new Error('VERSAND_HOLEN=1 braucht PRINTFUL_API_KEY');
    const ids = benoetigteVersandIds({ katalog: paket.katalog, bestand, nur: ONLY.length ? ONLY : null });
    const n = await holeFehlendeRaten(ids, raten, { key: PF_KEY, store: PF_STORE, sichern: () => schreibeJson(p.versand, { stand: new Date().toISOString().slice(0, 10), ziel: paket.meta.versand.ziel, raten }), log: (id, r) => log(`Versand ${id}:`, r.usd ?? r.fehler) });
    log(`${n} Versandraten geholt.`);
  }
  const plan = planeAlles({ katalog: paket.katalog, beschreibungen: paket.beschreibungen, versand: raten, bestand, skuPruefung: paket.skuPruefung, skuIndex, skuIndexAbgeschnitten, ohne, nur: ONLY.length ? ONLY : null });
  plan.erzeugt = { am: new Date().toISOString(), bestand: bestandQuelle, skuIndex: skuIndexQuelle, katalogStand: paket.meta.katalog.stand, versandStand: paket.meta.versand.stand, modus: LIVE ? 'LIVE' : 'Trockenlauf' };
  ausgeben(plan);
  if (plan.verstoesse.length) { console.error('✗ VERSTÖSSE im Plan:\n  ' + plan.verstoesse.join('\n  ')); console.error(`ENDE: Exit 1 – ${EXIT_TEXT[1]}`); process.exit(1); }
  if (!LIVE) { schreibeJson(PLAN, plan); log(`\nTrockenlauf fertig – nichts geschrieben. Plan: ${PLAN} · Hash ${plan.hash.slice(0, 16)}`); return; }

  // ── LIVE: nur den vorher geprüften Plan ausführen (das Tor: liveAusfuehren)
  const pruefen = PF_KEY && E.PRINTFUL_PRUEFEN !== '0';
  if (!pruefen) log('Hinweis: keine Gegenprüfung der neuen Varianten bei Printful (PRINTFUL_API_KEY fehlt oder PRINTFUL_PRUEFEN=0); es schützt nur die Altersgrenze der Daten.');
  const res = await liveAusfuehren({ plan, planPfad: PLAN, gqlHolen: async () => gqlMit(await shopifyToken()), pruefeVarianten: pruefen ? (pl) => pruefeNeueVarianten(pl, { key: PF_KEY, store: PF_STORE, log }) : null,
    ledgerPfad: LEDGER, sicherungsDir: SICHERUNG, befundOk: BEFUND_OK, nur: ONLY.length ? ONLY : null, variantenBudget, log });
  process.exit(res.exit);
}

// ───────────────────────────────────────────────────────────── Ausgabe (Konsole + Dateien nach OUT)
function ausgeben(plan) {
  mkdirSync(OUT, { recursive: true });
  const kopf = (t) => log(`\n── ${t}`);
  log(`Plan «Selbst gestalten: Material + Modelle» · ${plan.erzeugt?.modus ?? ''} · Bestand: ${plan.erzeugt?.bestand} · SKU-Index: ${plan.erzeugt?.skuIndex}${plan.ohne?.length ? ' · OHNE: ' + plan.ohne.map((o) => o.handle + ':' + o.material).join(', ') : ''}`);
  log(`Regel: USD→CHF ${plan.regel.usdChf} · Richtwert max(Einkauf×${plan.regel.faktor}, Einkauf+${plan.regel.aufschlagFix}) · Netto ≥ ${plan.regel.nettoMin} nach Printful-Versand + ${(plan.regel.gebuehrProzent * 100).toFixed(1)} % + ${plan.regel.gebuehrFix.toFixed(2)} Gebühr · Kunde zahlt ${plan.regel.kundenVersand} Versand unter ${plan.regel.gratisAb} · max ${plan.regel.maxPreis.toFixed(2)}`);
  for (const p of plan.produkte) {
    kopf(`${p.handle} (${p.art}${p.status ? ', ' + p.status : ''})`);
    log(`   Optionen: ${p.optionen.nachher.map((o) => `${o.name} [${o.werte.length}]`).join(' → ')}  ·  Varianten: ${p.summe.bestehend} bestehend + ${p.summe.neu} neu = ${p.summe.gesamt} (max ${p.summe.max})`);
    if (p.neu.length) { const ps = p.neu.map((v) => v.preisChf); log(`   Preise neu: CHF ${Math.min(...ps).toFixed(2)} – ${Math.max(...ps).toFixed(2)}, Netto ${Math.min(...p.neu.map((v) => v.nettoChf)).toFixed(2)} – ${Math.max(...p.neu.map((v) => v.nettoChf)).toFixed(2)}`); }
    for (const b of p.befunde) log(`   ${b.schwere === 'blocker' ? '⛔ BEFUND' : 'ℹ️ Hinweis'} [${b.code}] ${b.text}`);
    const gruppen = {};
    for (const n of p.nichtAngelegt) (gruppen[n.code + ' · ' + n.material] ||= []).push(n.zweiter);
    for (const [k, v] of Object.entries(gruppen)) log(`   nicht angelegt (${k}): ${v.length}× ${v.slice(0, 6).join(', ')}${v.length > 6 ? ' …' : ''}`);
  }
  log(`\nGesamt: ${plan.summe.neueVarianten} neue Varianten, ${plan.summe.nichtAngelegt} Katalogvarianten nicht angelegt · Hash ${plan.hash.slice(0, 16)}`);
  writeFileSync(join(OUT, 'tabelle.md'), tabelleMarkdown(plan) + '\n');
  writeFileSync(join(OUT, 'tabelle.csv'), tabelleCsv(plan) + '\n');
  const na = ['# Nicht angelegt und Befunde', ''];
  for (const p of plan.produkte) {
    na.push(`## ${p.handle}`, '');
    for (const b of p.befunde) na.push(`- **${b.schwere === 'blocker' ? 'BEFUND (sperrt LIVE)' : 'Hinweis'}** [${b.code}]: ${b.text}${b.schwere === 'blocker' ? ` — Bestätigung erst nach Entscheid des Besitzers: \`BEFUND_OK=${p.handle}:${b.code}\`` : ''}`);
    for (const n of p.nichtAngelegt) na.push(`- nicht angelegt: ${n.material} / ${n.zweiter}${n.pf ? ' (Printful ' + n.pf + ')' : ''} – ${n.grund}`);
    na.push('');
  }
  writeFileSync(join(OUT, 'nicht_angelegt.md'), na.join('\n'));
  mkdirSync(join(OUT, 'beschreibungen'), { recursive: true });
  for (const p of plan.produkte) {
    const f = p.handle.replace(/[^A-Za-z0-9._-]/g, '_');
    writeFileSync(join(OUT, 'beschreibungen', f + '.html'), p.beschreibung.nachher + '\n');
    writeFileSync(join(OUT, 'beschreibungen', f + '.block.html'), p.beschreibung.block + '\n');
    if (p.art === 'neu') writeFileSync(join(OUT, 'samsung_payload.json'), JSON.stringify({ mutation: 'productSet(synchronous:true)', input: produktSetEingabe(p), danach: ['metafieldsSet', p.neuesProdukt.metafelder], editorBaustein: 'Platzhalter __ERSTE_VARIANTE__ wird nach dem Anlegen durch die erste Variantennummer ersetzt' }, null, 1) + '\n');
  }
  log(`Dateien: ${join(OUT, 'tabelle.md')} · tabelle.csv · nicht_angelegt.md · beschreibungen/ · samsung_payload.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {
  if (/VARIANT_THROTTLE|Daily variant creation limit/i.test(String(e.message))) { console.error('TAGESLIMIT: Shopify erlaubt heute keine neuen Varianten mehr'); console.error(`ENDE: Exit 4 – ${EXIT_TEXT[4]}`); process.exit(4); }
  console.error('FEHLER', e.message); console.error(`ENDE: Exit 1 – ${EXIT_TEXT[1]}`); process.exit(1);
});
