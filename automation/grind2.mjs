#!/usr/bin/env node
/**
 * Grind 2.0: der breite CJ-Produktimport, diesmal «in die passende Kategorie und mit Auswahl (Farbe/Grösse)».
 * Sieben Stufen, jede einzeln prüfbar, jede schreibt eine Ledger-Zeile für JEDEN Ausgang, an dem CJ-Punkte oder Shop-Schreibzugriffe hingen:
 *
 *   1 Bedarf       Zielblätter aus der Lückenanalyse (luecken.json), Rangfolge, Zielgrösse = Lücke minus schon Geschriebenes (Ledger).        0 Punkte
 *   2 Kandidaten   CJ product/list je Zielblatt (Kategorie oder Suchwort, orderBy=listedNum, 200 je Seite, Zwischenspeicher).                 50 Punkte je Aufruf
 *   3 Vorfilter    Produktart, Lager CN, Preis, listedNum, Marke/Klinge/Waffe/Erwachsene/Tabak, Dublette (Shop-SKU-Index + Ledger).         0 Punkte
 *   4 Prüfung      product/query (10), Titel DE (KI + mechanische Titel-Wahrheit), Google-Pfad + sort-Tags, Bilder HTTP 200,                 10 + 10 je Fracht
 *                  Stecker/Auswahl-Tore (planeNeu ohne Preis), Fracht CN→CH (schwerste Variante), Preis, Fakten-Block.
 *   5 Plan         planeNeu() mit ALLEN 22 Toren: nur wenn jedes besteht, gibt es eine productSet-Eingabe (DRAFT, volle Auswahl).
 *   6 Anlegen      productSet als DRAFT, idempotent (SKU- und Handle-Abfrage vorher, Übernahme statt Dublette), Variantenbudget.             nur LIVE
 *   7 Tore         frisch am Shop lesen (Medien, Varianten, SKUs, Google-Pfad, Tags, Preise, Text); Veröffentlichen NUR mit PUBLISH=1.        nur LIVE
 *
 * SCHALTER UND SCHUTZ (alles Vorgabe = nichts schreiben):
 *   (nichts)         Trockenlauf: liest CJ (kostet Punkte), schreibt Pläne nach /tmp, KEIN Shop-Zugriff, KEINE Ledger-Zeile.
 *   MODUS=probe      Probe: 10 Kandidaten aus 2 Zielblättern (ZIELE=a,b), höchstens PUNKTE_MAX (600) eigene CJ-Punkte, Kontaktbogen als Markdown (OUT=…).
 *   LIVE=1           schreibt — NUR wenn die Datei dropship/GRIND2-FREI.txt existiert (Datei löschen = Stopp, wird vor JEDEM Produkt neu geprüft).
 *   PUBLISH=1        zusätzlich veröffentlichen (ACTIVE + Kanäle), höchstens PUBLISH_MAX (5) je Lauf, nur Produkte, deren Tore alle bestehen. Braucht LIVE=1.
 *
 * BUDGETS: Shopify begrenzt neue Varianten (≈ 10 000 je gleitende 24 h, geteilt mit dem Auswahl-Lauf). Grind darf höchstens GRIND_ANTEIL (5 %) davon,
 * und beide Ledger zusammen höchstens GESAMT_MAX (9 000). CJ-Punkte: pointsInfo.remaining wird nach jedem Aufruf gelesen; unter GRIND_RESERVE (15 000) endet der Lauf mit Exit 3.
 *
 * EXIT-CODES (wie auswahl_durchlauf.sh): 0 ok · 1 Fehler · 3 CJ drosselt / Punkte unter Reserve · 4 Variantenlimit (Shopify oder eigener Anteil) · 5 KI-Dienst fällt aus.
 *
 * LEDGER dropship/grind2_ledger.txt (Format des Varianten-Ledgers, Schlüssel ist die CJ-pid):
 *   <pid> · <ISO> · GESCHRIEBEN · <n> Varianten · <handle> · <gid> · <zielId>
 *   <pid> · <ISO> · UEBERSPRUNGEN · [zurückgestellt: | vorläufig: ]<Grund>      (Fristen von lib/varianten_sicherheit.mjs: 14 Tage / 7 Tage / 20 Stunden)
 *   <pid> · <ISO> · FEHLER · <Grund>
 * dropship/grind2_freigabe_ledger.txt:  <handle> · <ISO> · FREI | FEHLER | ZURUECK · <Detail>
 *
 * ANNAHMEN UND SETZUNGEN (keine Messungen — der Besitzer bestätigt sie; Zahlen aus der Probe vom 27.10.2026 stehen in /tmp/grind2/bau/probe.md):
 *   · Die Fracht der SCHWERSTEN Variante gilt für alle Varianten des Produkts (konstant je Produkt, wie `unitCost` im Shop; leichtere Varianten sind dadurch eher zu teuer als zu billig).
 *     Ist nur die leichteste Variante lieferbar, wird das Produkt zurückgestellt (Gewichtsklassen dazwischen werden nicht einzeln gemessen).
 *   · Aufschlag 1,45 / Untergrenze 14.90 (Bekleidung 16.90) kommen aus lib/grind_preis.mjs; Obergrenze MAX_PREIS 80 und Mindest-Einstand 2 CHF sind SETZUNGEN.
 *   · Saison-Fenster (Halloween Aug–Sep, Weihnachten Sep–Nov, Ostern Feb–Mär, Valentinstag Dez–Jan) folgen aus 10–20 Werktagen Lieferzeit.
 *   · Nur ORDINARY_PRODUCT mit Lager CN (Hypothese: beide Fälle ohne CH-Fracht waren SUPPLIER_SHIPPED_PRODUCT, n = 2; PRODUKTARTEN erweitert).
 *   · Der Text ist der Fakten-Block aus dem Datenblatt; der Fliesstext folgt später (Tag `text-offen`). Veröffentlicht wird nur mit Fakten-Block oder Fliesstext v2.
 *   · Das Marktpreis-Tor fehlt (UNBEKANNT); es gibt nur die beiden harten Preisgrenzen. Die Fracht-Anteils-Flagge (fracht_dominiert) erscheint im Kontaktbogen, sperrt aber nicht.
 *
 * Dieses Modul exportiert seine reinen Funktionen (getestet in grind2_test.mjs); der Lauf `lauf(cfg, io)` nimmt fetch/warte/jetzt von aussen (simuliertes Netz).
 */
import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { ledgerGedaechtnis, VORLAEUFIG, ZURUECKGESTELLT } from './lib/varianten_sicherheit.mjs';
import { frachtProdukt, frachtFuerKosten, ledgerGrund, punkteMerken, USD_CHF, CJ_BASE, PAUSE_MS, FRACHT_PUNKTE } from './lib/cj_fracht.mjs';
import { preiseFuerVarianten, AUFSCHLAG, PREIS_MIN } from './lib/grind_preis.mjs';
import { ladeIndex, istDublette, fuegeHinzu, istFrisch, pidNorm } from './lib/grind_dubletten.mjs';
import { googlePfad, taxTags, bereichKategorien, TAXONOMIE } from './lib/grind_google.mjs';
import { planeNeu, PRODUCT_SET_MUTATION, API_VERSION, handleAus, galerieAus, normalisiereCj, ERWACHSENE_RE, TABAK_RE, STECKDOSE_EN_RE, ANZUENDER_RE, MAX_VARIANTEN, MIN_BILDER } from './lib/grind_plan.mjs';
import { topUrteil, LISTED_MIN } from './lib/top_kandidaten.mjs';
import { KATEGORIEN, WAFFEN, SPERR_TAGS } from './lib/kategorien.mjs';
import { pruefeProdukt, LIZENZ } from './lib/gmc_feed_item.mjs';
import { nachDeutsch, GROQ_MODELLE } from './lib/uebersetzen.mjs';
import { quelleAus, saeubern, genug, renderBlock, wissenFuer, auftrag as faktenAuftrag, zahlen, zahlenBelegt, VERBOTEN, htmlZuText } from './lib/fakten_block.mjs';
import { erlaubteKanaele, sperrTags } from './lib/kanal_sperren.mjs';
import { titelDeutsch } from './lib/titel_deutsch.mjs';
import { ENGLISCH_RE } from './farbwahl_scan.mjs';
import { EN_AUSGABE_RE } from './optionen_uebersetzen.mjs';

// ════════════════════════════════════════════════════════════════════════════
// Konstanten
// ════════════════════════════════════════════════════════════════════════════
const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const EXIT = Object.freeze({ OK: 0, FEHLER: 1, CJ: 3, VARIANTEN: 4, KI: 5 });
export const FREIGABE_DATEI = 'dropship/GRIND2-FREI.txt';
/** CJ-Punkte je Aufruf (GEMESSEN 26.10.2026, /tmp/grind2/cj_api.md §5.1: Liste 50 unabhängig von der Seitengrösse, Abfrage und Fracht je 10). `kategorien` (product/getCategory) GEMESSEN 27.10.2026: 0 Punkte (usedToday blieb über drei Aufrufe gleich). */
export const KOSTEN = Object.freeze({ liste: 50, query: 10, fracht: FRACHT_PUNKTE, kategorien: 0 });
const TAG_MS = 24 * 3600 * 1000;
/** Marker, die eine fertige Beschreibung tragen muss, damit veröffentlicht werden darf (Fakten-Block oder Fliesstext v2). */
const TEXT_MARKER = ['<!-- ls-fakten-v1 -->', '<!-- ls-text-v2 -->'];

const text = x => String(x ?? '').replace(/\s+/g, ' ').trim();
const eindeutig = l => [...new Set(l)];
const rund2 = x => Math.round((Number(x) + 1e-9) * 100) / 100;
const schlafen = ms => new Promise(r => setTimeout(r, ms));
const jjjjmmtt = ms => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
const saniere = (s, max = 140) => String(s ?? '').replace(/[·\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// ════════════════════════════════════════════════════════════════════════════
// Konfiguration (jeder unsinnige Wert wirft: ein Tippfehler darf nie still zur Vorgabe werden)
// ════════════════════════════════════════════════════════════════════════════
function zahlAus(env, name, vorgabe, { min = -Infinity, max = Infinity, ganz = false } = {}) {
  const roh = env[name];
  if (roh === undefined || roh === '') return vorgabe;
  const n = Number(roh);
  if (!Number.isFinite(n) || n < min || n > max || (ganz && !Number.isInteger(n))) {
    throw new RangeError(`${name}=«${roh}» ungültig (erwartet ${ganz ? 'ganze ' : ''}Zahl von ${min} bis ${max})`);
  }
  return n;
}
const listeAus = (roh, vorgabe = []) => (roh === undefined || roh === '' ? vorgabe : String(roh).split(',').map(s => s.trim()).filter(Boolean));

/** Umgebung → Konfiguration. `wurzel` ist die Repo-Wurzel (Tests setzen ein Temp-Verzeichnis). */
export function konfigAus(env = process.env, wurzel = WURZEL) {
  if (env.MODUS && !['probe', 'lauf'].includes(env.MODUS)) throw new RangeError(`MODUS=«${env.MODUS}» unbekannt (probe | lauf)`);
  const probe = env.MODUS === 'probe';
  const z = (n, d, o) => zahlAus(env, n, d, o);
  const frei = p => join(wurzel, p);
  const katalog = env.GRIND2_KATALOG || ['/tmp/katalog_taxo.json', '/tmp/katalog_voll.json'].find(p => existsSync(p)) || '';
  const bedarf = env.GRIND2_BEDARF || (existsSync('/tmp/grind2/luecken.json') ? '/tmp/grind2/luecken.json' : frei('dropship/grind2_bedarf.json'));
  return {
    modus: probe ? 'probe' : 'lauf',
    live: env.LIVE === '1', publish: env.PUBLISH === '1', force: env.FORCE === '1',
    ziele: listeAus(env.ZIELE, probe ? ['webcams', 'lichterketten'] : []),
    wellen: listeAus(env.WELLEN, ['S', '1']).map(w => w.toUpperCase()),
    limit: z('LIMIT', 10, { min: 1, max: 500, ganz: true }),
    proZiel: z('PRO_ZIEL', 5, { min: 1, max: 100, ganz: true }),
    listeGroesse: z('LISTE_GROESSE', 200, { min: 20, max: 200, ganz: true }),    // 200 gemessen, darüber unbekannt
    seitenMax: z('SEITEN_MAX', 2, { min: 1, max: 10, ganz: true }),              // Listenaufrufe je Zielblatt und Lauf
    listeTtlH: z('LISTE_TTL_H', 48, { min: 0, max: 720 }),
    listedMin: z('LISTED_MIN', LISTED_MIN, { min: 0, max: 1e6 }),
    maxEk: z('MAX_EK', 40, { min: 1, max: 1000 }),
    produktarten: listeAus(env.PRODUKTARTEN, ['ORDINARY_PRODUCT']),
    reserve: z('GRIND_RESERVE', 15000, { min: 0, max: 1e6 }),
    punkteMax: z('PUNKTE_MAX', probe ? 600 : 6000, { min: 10, max: 1e6 }),
    kurs: z('USD_CHF', USD_CHF, { min: 0.3, max: 3 }),
    aufschlag: z('AUFSCHLAG', AUFSCHLAG, { min: 1, max: 10 }),
    preisMin: z('PREIS_MIN', PREIS_MIN, { min: 1, max: 1000 }),
    preisMinMode: z('PREIS_MIN_MODE', 16.90, { min: 1, max: 1000 }),
    // SETZUNG nach der Probe vom 27.10.2026: eine Weihnachts-Lichterkette mit Fracht 49 USD kam auf 61.90–102.90 CHF. Das Sortiment des Shops liegt weit darunter; die Obergrenze gegen den
    // MARKTPREIS (Galaxus) fehlt weiterhin (UNBEKANNT). Der Besitzer legt den Wert fest.
    maxPreis: z('MAX_PREIS', 80, { min: 5, max: 100000 }),
    minEinstand: z('MIN_EINSTAND_CHF', 2, { min: 0, max: 1000 }),
    sensitivAusweg: env.SENSITIV_AUSWEG === '1',
    maxVarianten: z('MAX_VARIANTEN', 40, { min: 1, max: MAX_VARIANTEN, ganz: true }),
    minBilder: z('MIN_BILDER', MIN_BILDER, { min: 1, max: 20, ganz: true }),
    tageslimit: z('TAGESLIMIT', 10000, { min: 1, max: 1e6, ganz: true }),
    anteil: z('GRIND_ANTEIL', 0.05, { min: 0, max: 0.5 }),
    gesamtMax: z('GESAMT_MAX', 9000, { min: 1, max: 1e6, ganz: true }),
    publishMax: z('PUBLISH_MAX', 5, { min: 0, max: 100, ganz: true }),
    medienWarteS: z('MEDIEN_WARTE_S', 120, { min: 0, max: 900 }),
    maxKiFolge: z('MAX_KI_FOLGE', 5, { min: 1, max: 100, ganz: true }),
    maxFehlerFolge: z('MAX_FEHLER_FOLGE', 8, { min: 1, max: 100, ganz: true }),
    planTtlH: z('PLAN_TTL_H', 3, { min: 0, max: 72 }),
    datenblattTtlH: z('DATENBLATT_TTL_H', 6, { min: 0, max: 72 }),
    indexMaxH: z('INDEX_MAX_H', 24, { min: 1, max: 240 }),
    bildHash: env.BILDHASH !== '0',
    duennOk: env.DUENN_OK === '1',
    pfade: {
      ledger: env.LEDGER || frei('dropship/grind2_ledger.txt'),
      freigabeLedger: env.FREIGABE_LEDGER || frei('dropship/grind2_freigabe_ledger.txt'),
      auswahlLedger: env.VARIANTEN_LEDGER || frei('dropship/cj_varianten_ledger.txt'),
      freigabeDatei: env.FREIGABE_DATEI || frei(FREIGABE_DATEI),
      bedarf, skus: env.GRIND_SKUS_DATEI || '/tmp/grind2/bau/skus.jsonl',
      bereiche: env.GRIND2_BEREICHE || frei('dropship/taxonomie-2610-b'),
      katalog,
      planDir: env.PLAN_DIR || '/tmp/grind2_plan',
      cacheDir: env.GRIND2_CACHE || '/tmp/grind2/cache',
      faktenCache: env.CJ_FAKTEN_CACHE || '/tmp/cj_fakten_cache',
      out: env.OUT || (probe ? '/tmp/grind2/bau/probe.md' : '/tmp/grind2/bericht.md'),
    },
  };
}

/**
 * Die drei Sperren vor dem ersten Schreibzugriff. Wirft bei jedem Verstoss, gibt die Betriebsart zurück.
 * @param {object} cfg  @param {{freigabe:boolean}} o  freigabe = die Datei dropship/GRIND2-FREI.txt existiert
 */
export function schutzPruefen(cfg, { freigabe } = {}) {
  if (cfg.modus === 'probe' && (cfg.live || cfg.publish)) throw new Error('SCHUTZ: der Probe-Modus schreibt nie (LIVE/PUBLISH sind dort nicht erlaubt)');
  if (cfg.publish && !cfg.live) throw new Error('SCHUTZ: PUBLISH=1 braucht LIVE=1');
  if (cfg.live && !freigabe) throw new Error(`SCHUTZ: LIVE=1 braucht die Freigabedatei ${cfg.pfade.freigabeDatei} (Datei löschen = Stopp)`);
  if (cfg.modus === 'probe') return 'probe';
  return cfg.live ? (cfg.publish ? 'live+publish' : 'live') : 'trocken';
}

// ════════════════════════════════════════════════════════════════════════════
// Stufe 1: Bedarf
// ════════════════════════════════════════════════════════════════════════════
const WELLE_RANG = { S: 0, 1: 1, Z: 2, R: 3 };
const welleCode = z => text(z?.welle).charAt(0).toUpperCase();

/** Ledger-Text → Anzahl GESCHRIEBENER Produkte je Zielblatt (7. Feld der GESCHRIEBEN-Zeile). */
export function schreibZaehlerAusLedger(ledgerText) {
  const m = new Map();
  for (const z of String(ledgerText ?? '').split('\n')) {
    const f = z.split(' · ').map(s => s.trim());
    if (f[2] !== 'GESCHRIEBEN' || !f[6]) continue;
    m.set(f[6], (m.get(f[6]) || 0) + 1);
  }
  return m;
}

/**
 * luecken.json → Zielblätter mit Restbedarf. Saison-Welle S zuerst, dann Welle 1 (jeweils in Rangfolge der Lückenanalyse).
 * Ausdrücklich genannte Ziele (opt.ziele) gelten unabhängig von der Welle und bleiben in der genannten Reihenfolge.
 * @param {{ziele:object[]}} luecken
 * @param {{geschrieben?:Map<string,number>, wellen?:string[], ziele?:string[]}} opt
 */
export function bedarfAus(luecken, { geschrieben = new Map(), wellen = ['S', '1'], ziele = [] } = {}) {
  if (!luecken || !Array.isArray(luecken.ziele) || !luecken.ziele.length) throw new Error('Bedarf: luecken.json hat keine Liste «ziele»');
  const bekannt = new Set(luecken.ziele.map(z => z.id));
  const unbekannt = ziele.filter(id => !bekannt.has(id));
  if (unbekannt.length) throw new Error(`Bedarf: unbekannte Zielblätter ${unbekannt.join(', ')}`);
  const roh = luecken.ziele.map(z => {
    const luecke = Number(z.luecke);
    if (!Number.isFinite(luecke) || luecke < 0) throw new Error(`Bedarf: Ziel ${z.id} ohne gültige Lücke (${z.luecke})`);
    const schon = geschrieben.get(z.id) || 0;
    return {
      id: z.id, name: z.name, rang: Number(z.rang) || 999, welle: welleCode(z), ziel: Number(z.ziel) || 0, luecke, schon, rest: Math.max(0, luecke - schon),
      cj: text(z.cj), cjSuche: String(z.cjSuche ?? '').split('·').map(text).filter(Boolean), auflage: text(z.auflage), risiko: text(z.risiko), auswahl: text(z.auswahl),
    };
  });
  if (ziele.length) return ziele.map(id => roh.find(z => z.id === id)).filter(z => z.rest > 0);
  const erlaubt = new Set(wellen.map(w => w.toUpperCase()));
  return roh.filter(z => z.rest > 0 && erlaubt.has(z.welle))
    .sort((a, b) => (WELLE_RANG[a.welle] ?? 9) - (WELLE_RANG[b.welle] ?? 9) || a.rang - b.rang);
}

// ════════════════════════════════════════════════════════════════════════════
// Stufe 2: Kandidaten (Quellen, Adressen, Zwischenspeicher)
// ════════════════════════════════════════════════════════════════════════════
const NAME_KEYS = ['categoryName', 'categoryThirdName', 'categorySecondName', 'categoryFirstName', 'name'];
const KIND_KEYS = ['categoryFirstList', 'categorySecondList', 'categoryThirdList', 'children', 'list'];
const ID_KEYS = ['categoryId', 'categoryThirdId', 'categorySecondId', 'categoryFirstId', 'id'];

/** Antwort von product/getCategory → flache Liste [{id, name, ebene, pfad}] (jede Ebene, die eine ID trägt). Unbekannte Form → leere Liste (dann zählen nur Suchwörter). */
export function baumAbflachen(data) {
  const aus = [];
  const gehe = (o, pfad) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { for (const x of o) gehe(x, pfad); return; }
    const name = text(NAME_KEYS.map(k => o[k]).find(v => typeof v === 'string' && v.trim()));
    const idKey = ID_KEYS.find(k => typeof o[k] === 'string' && o[k].trim());
    const neu = name ? [...pfad, name] : pfad;
    if (name && idKey) aus.push({ id: o[idKey].trim(), name, ebene: neu.length, pfad: neu });
    for (const k of KIND_KEYS) if (Array.isArray(o[k])) gehe(o[k], neu);
  };
  gehe(data, []);
  return aus;
}

const UNSICHER_RE = /zuordnung|nicht belegt|kein blatt|offen/i;
/** Belegt die Lückenanalyse die CJ-Kategorie des Zielblatts? («(Zuordnung bei CJ nicht belegt)», «(Zuordnung offen)», «kein Blatt» = nein.) */
export function cjPfadVertraut(ziel) {
  const cj = text(ziel?.cj);
  if (!cj) return false;
  return !UNSICHER_RE.test((cj.match(/\(([^)]*)\)/g) || []).join(' ')) && !/kein blatt/i.test(cj);
}
const norm = s => text(s).toLowerCase().replace(/\s*&\s*/g, ' & ');

/**
 * Wo sucht man ein Zielblatt bei CJ? Reihenfolge: zuerst CJ-Kategorien (nur wenn die Lückenanalyse die Zuordnung belegt und der Name im Baum eindeutig ist),
 * danach die Suchwörter. «(Zuordnung bei CJ nicht belegt)» / «(Zuordnung offen)» heisst: die Kategorie ist NICHT geprüft → nur Suchwörter (Webcams stünden sonst unter «Computer Tablet Accessories»).
 * @returns {{art:'kategorie', id:string, name:string}|{art:'suche', wort:string}}[]
 */
export function cjQuellenFuer(ziel, knoten = []) {
  const quellen = [];
  const cj = text(ziel?.cj);
  if (cjPfadVertraut(ziel)) {
    for (const teil of cj.replace(/\([^)]*\)/g, ' ').split(' + ').map(text).filter(Boolean)) {
      const segs = teil.split(' > ').map(text).filter(Boolean);
      const letzte = segs[segs.length - 1] || '';
      for (const alt of letzte.split(' / ').map(text).filter(Boolean)) {
        const gleich = knoten.filter(k => norm(k.name) === norm(alt));
        let wahl = gleich;
        if (gleich.length > 1 && segs.length > 1) {
          const vor = norm(segs[segs.length - 2]);
          const enger = gleich.filter(k => k.pfad.slice(0, -1).some(p => norm(p) === vor));     // irgendein Vorfahre trägt den genannten Elternnamen
          if (enger.length) wahl = enger;
        }
        if (wahl.length === 1) quellen.push({ art: 'kategorie', id: wahl[0].id, name: wahl[0].name });
      }
    }
  }
  for (const wort of Array.isArray(ziel?.cjSuche) ? ziel.cjSuche : String(ziel?.cjSuche ?? '').split('·')) {
    const w = text(wort); if (w) quellen.push({ art: 'suche', wort: w });
  }
  const gesehen = new Set();
  return quellen.filter(q => { const k = q.art + ':' + (q.id || q.wort).toLowerCase(); if (gesehen.has(k)) return false; gesehen.add(k); return true; });
}

/** Adresse eines Listenaufrufs: zuerst die Beliebtesten (orderBy=listedNum, absteigend). 50 Punkte, egal wie gross die Seite ist. */
export function listeUrl({ kategorieId, suche, seite = 1, groesse = 200 } = {}) {
  if (!kategorieId && !suche) throw new Error('listeUrl: weder Kategorie noch Suchwort');
  const p = [`pageNum=${seite}`, `pageSize=${groesse}`, 'orderBy=listedNum', 'sort=desc'];
  if (kategorieId) p.push(`categoryId=${encodeURIComponent(kategorieId)}`);
  if (suche) p.push(`productNameEn=${encodeURIComponent(suche)}`);
  return `${CJ_BASE}/product/list?${p.join('&')}`;
}
export const quellenSchluessel = (q, seite = 1) => `${q.art}-${String(q.id || q.wort).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)}-p${seite}`;

// ════════════════════════════════════════════════════════════════════════════
// Stufe 3: Vorfilter (ohne CJ-Punkte)
// ════════════════════════════════════════════════════════════════════════════
/** Erstes Sperrwort im englischen CJ-Namen (Waffe, Erwachsene, Tabak, Lizenzfigur, Steckdosen-Ware) oder null. */
export function sperrwort(name) {
  const n = String(name ?? '');
  const treffer = (s, re, art, gruppe = 0) => { const x = s.match(re); return x ? `${art} «${text(x[gruppe]).slice(0, 30)}»` : null; };
  // Auto-Zigarettenanzünder ist ein Steckplatz, kein Tabak (wie in planeNeu)
  const ohneAnzuender = n.replace(new RegExp(ANZUENDER_RE.source, 'gi'), ' ');
  return treffer(n, WAFFEN, 'Waffe') || treffer(n, ERWACHSENE_RE, 'Erwachsene', 2) || treffer(ohneAnzuender, TABAK_RE, 'Tabak', 2)
    || treffer(n, LIZENZ, 'Lizenz') || treffer(n, STECKDOSE_EN_RE, 'Steckdose');
}

/**
 * Saisonware außerhalb ihres Fensters. CJ liefert in 10–20 Werktagen: Ware zu einem Anlass muss WOCHEN vorher live sein, nicht in der Woche davor
 * (die Lückenanalyse nennt «live bis ca. 15.11.» für Weihnachten). Fenster in Monaten (SETZUNG): Halloween Aug–Sep, Weihnachten Sep–Nov, Ostern Feb–Mär, Valentinstag Dez–Jan.
 * @param {string} name  englischer CJ-Name oder deutscher Titel  @param {number} monat  1–12  @returns {{anlass:string, fenster:number[]}|null}
 */
export const SAISON = Object.freeze([
  { anlass: 'Halloween', re: /halloween|pumpkin|kürbis|kuerbis|jack-o|trick or treat|spooky/i, fenster: [8, 9] },
  { anlass: 'Weihnachten', re: /christmas|xmas|santa|snowman|reindeer|advent|weihnacht|nikolaus/i, fenster: [9, 10, 11] },
  { anlass: 'Ostern', re: /easter|ostern|osterhase/i, fenster: [2, 3] },
  { anlass: 'Valentinstag', re: /valentine|valentin/i, fenster: [12, 1] },
]);
export function saisonSperre(name, monat) {
  if (!Number.isInteger(monat) || monat < 1 || monat > 12) return null;
  const n = String(name ?? '');
  for (const s of SAISON) if (s.re.test(n) && !s.fenster.includes(monat)) return { anlass: s.anlass, fenster: s.fenster };
  return null;
}

/**
 * Zubehör im Gerätepfad: «Webcam Laptop Linse Tablet Privatsphäre Kamera Abdeckung» trägt das Kopfwort «Webcam» und landete im Probelauf (27.10.2026) in
 * Cameras & Optics > Cameras > Webcams — es ist eine Linsenabdeckung. Das Kopfwort-Lexikon versteht Nachstellungen nicht (bekannte Grenze von grind_google).
 * Regel: nennt der deutsche Titel oder der englische CJ-Name ein Zubehörwort, der Google-Pfad aber kein Zubehör, ist die Einordnung unsicher → nicht anlegen.
 * Falsch-Positive kosten einen Kandidaten (zurückgestellt), Falsch-Negative eine falsch einsortierte Kategorieseite: die Regel ist bewusst streng. «Zubehör» selbst steht NICHT
 * in der Liste (Küchenzubehör ist ein Hauptprodukt mit allgemeinem Pfad).
 */
export const ZUBEHOER_DE_RE = /(abdeckung|abdeckkappe|schutzfolie|halterung|ständer|stativ|aufkleber|adapter|ersatz(?:teil)?|wischtuch|wischtücher|etui|objektivdeckel)(?![a-zäöüß])/i;
export const ZUBEHOER_EN_RE = /(^|[^a-z])(covers?|cases?|holders?|stands?|mounts?|brackets?|stickers?|protectors?|sleeves?|replacement|spare parts?|lens cap|dust cap|tripods?|adapters?)([^a-z]|$)/i;
export const ZUBEHOER_PFAD_RE = /Accessor|Parts|Cases|Covers|Holders|Stands|Mounts|Bags|Straps|Adapters|Replacement|Stickers|Cleaning|Tripods|Brackets|Protectors/i;
export function zubehoerKonflikt({ titel = '', cjName = '', pfad = '' } = {}) {
  if (!pfad || ZUBEHOER_PFAD_RE.test(pfad)) return null;
  const de = String(titel).match(ZUBEHOER_DE_RE), en = String(cjName).match(ZUBEHOER_EN_RE);
  const wort = de ? de[1] : en ? en[2] : null;
  return wort ? { wort: wort.toLowerCase(), quelle: de ? 'Titel' : 'CJ-Name' } : null;
}

/**
 * Darf ein Listentreffer in die teure Prüfung? Billig vor teuer: jede Ablehnung hier kostet nichts.
 * @param {object} t  Treffer aus product/list (v1)
 * @param {{cfg:object, index?:object, erledigt?:Set<string>}} ctx
 * @returns {{nehmen:boolean, grund:string, pid?:string, name?:string, u?:object}}
 */
export function vorfilter(t, { cfg, index, erledigt, monat } = {}) {
  const nein = grund => ({ nehmen: false, grund });
  const pid = pidNorm(t?.pid);
  if (!pid) return nein('pid-ungueltig');
  if (erledigt?.has(pid)) return nein('ledger');
  const art = String(t.productType ?? '');
  if (cfg.produktarten.length && !cfg.produktarten.includes(art)) return nein(`produktart:${art || 'leer'}`);
  if (Number(t.customizationVersion) > 0) return nein('personalisiert');
  const lager = Array.isArray(t.shippingCountryCodes) ? t.shippingCountryCodes : null;
  // Die Fracht wird ab CN gemessen: ein Lager nur in ES/US/DE hätte eine andere Fracht (gemessen: shippingCountryCodes nennt das LAGER, nie das Zielland).
  if (lager && lager.length && !lager.includes('CN')) return nein(`lager:${lager.join(',')}`);
  const u = topUrteil(t, { listedMin: cfg.listedMin, maxEk: cfg.maxEk });
  if (!u.nehmen) return nein(u.grund);
  const name = text(t.productNameEn);
  const sw = sperrwort(name);
  if (sw) return nein(`sperrwort:${sw}`);
  const sa = saisonSperre(name, monat);
  if (sa) return nein(`saison:${sa.anlass}`);
  const m = pruefeProdukt({ titel: name, tags: [], bild: 'https://x', preis: 1, id: pid, link: 'x' });
  if (!m.ok) return nein(`merchant:${m.grund}`);
  if (index) {
    const d = istDublette({ pid, productSku: t.productSku, titel: name }, index);
    if (d.dublette) return { nehmen: false, grund: 'dublette', detail: d.grund, treffer: d.treffer };
  }
  return { nehmen: true, grund: 'kandidat', pid, name, u };
}

/** Beste zuerst: mehr Läden, dann tieferer Einkauf, dann pid (stabil). */
export function rangiere(liste) {
  return [...liste].sort((a, b) => b.u.laeden - a.u.laeden || a.u.preis - b.u.preis || (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0));
}

/** Eine Treffermenge durch den Vorfilter: {durch:[{t, pid, name, u}], abgelehnt:{grund→n}, beispiele:{grund→name}}. Dubletten innerhalb der Liste (gleiche pid) zählen einmal. */
export function vorfilterListe(items, ctx) {
  const durch = [], abgelehnt = {}, beispiele = {}, gesehen = new Set();
  for (const t of Array.isArray(items) ? items : []) {
    const pid = pidNorm(t?.pid);
    if (pid && gesehen.has(pid)) continue;
    if (pid) gesehen.add(pid);
    const r = vorfilter(t, ctx);
    if (r.nehmen) { durch.push({ t, pid: r.pid, name: r.name, u: r.u }); continue; }
    const g = r.grund.split(':')[0];
    abgelehnt[g] = (abgelehnt[g] || 0) + 1;
    if (!beispiele[g]) beispiele[g] = text(t?.productNameEn).slice(0, 60);
  }
  return { durch: rangiere(durch), abgelehnt, beispiele };
}

/**
 * Reihum über die Zielblätter (jedes kommt abwechselnd dran), höchstens `proZiel` je Zielblatt und `limit` insgesamt.
 * @param {{ziel:object, kandidaten:object[]}[]} jeZiel  in der Reihenfolge der Bedarfsliste
 * @returns {{ziel:object, k:object}[]}
 */
export function verteile(jeZiel, { limit = 10, proZiel = 5 } = {}) {
  const aus = [];
  const deckel = jeZiel.map(z => Math.min(proZiel, z.ziel.rest ?? proZiel, z.kandidaten.length));
  for (let runde = 0; aus.length < limit; runde++) {
    let neu = 0;
    for (let i = 0; i < jeZiel.length && aus.length < limit; i++) {
      if (runde < deckel[i]) { aus.push({ ziel: jeZiel[i].ziel, k: jeZiel[i].kandidaten[runde] }); neu++; }
    }
    if (!neu) break;
  }
  return aus;
}

// ════════════════════════════════════════════════════════════════════════════
// Stufe 4: Titel (KI übersetzt, die Titel-Wahrheit prüft mechanisch)
// ════════════════════════════════════════════════════════════════════════════
export const TITEL_AUFTRAG = 'Du schreibst Produkttitel für einen Schweizer Onlineshop. Übersetze und kürze jeden englischen Lieferantennamen zu EINEM deutschen Produkttitel. '
  + 'REGELN: Schweizer Rechtschreibung (ss, nie ß). Höchstens 70 Zeichen. Zuerst die Produktart («Webcam mit Mikrofon»), danach nur Eigenschaften, die im englischen Namen stehen. '
  + 'Nichts hinzufügen, nichts schätzen, keine Zahl erfinden, keine Marke und keinen Lizenznamen nennen. Entferne Werbewörter (Hot Sale, New Arrival, 2024, Cross-border, Factory, Wholesale). '
  + 'Material oder Eigenschaft (Leder, Edelstahl, Baumwolle, Seide, Leinen) nur, wenn das englische Wort wörtlich im Namen steht; «wasserdicht» nie verwenden. '
  + 'Keine englischen Wörter ausser im Deutschen üblichen Fachwörtern (USB, LED, HDMI, Bluetooth, WiFi, Full HD, 4K). Zielgruppe (Damen, Herren, Kinder) nur, wenn sie im Namen steht. '
  + 'Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge zurück, nichts anderes.\n';
/** Unverändert aus cj_varianten_nachziehen.mjs (dort nicht exportiert). */
export const LABEL_AUFTRAG = 'Übersetze diese Variantenbezeichnungen eines Online-Shops (Farben, Muster, Modelle) ins Deutsche. Kurz, wie auf einem Etikett, Substantive gross, '
  + 'ohne Erklärung. Eigennamen und Zahlen unverändert lassen. Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge zurück.\n';

/** Erste Reinigung: ß → ss, Anführungszeichen und Steuerzeichen weg, Leerraum, Schlusszeichen. */
export function titelBereinigen(t) {
  return String(t ?? '').replace(/ß/g, 'ss').replace(/[\u0000-\u001f]/g, ' ').replace(/^[\s"'„“”«»‘’]+|[\s"'„“”«»‘’.,;:!]+$/g, '').replace(/\s+/g, ' ').trim();
}

/** Material-/Eigenschaftsbehauptungen des Titels und ihr Beleg im Datenblatt (Skill titel-wahrheit, Vorfilter; getestet am Muster der 101 Korrekturen). */
export const TITEL_REGELN = Object.freeze([
  ['Leder', /(^|[^a-zäöüß])(echt)?leder|kinderleder/i, /\bleather\b/i],
  ['Leinen', /leinen/i, /\blinen\b|\bflax\b/i],
  ['Edelstahl', /edelstahl/i, /stainless/i],
  ['wasserdicht', /wasserdicht|wasserfest/i, /water.?proof|water.?resist|\b\d+\s?atm\b|\bipx?\d/i],
  ['Baumwolle', /baumwoll/i, /cotton/i],
  ['Seide', /(^|[^a-zäöüß])seide(?!nmatt|nglanz|npapier)/i, /\bsilk\b/i],      // «seidenmatt» ist eine Oberfläche, keine Seide
]);
const EHRLICH_RE = /imitat|kunst|faux|vegan|synthet|\bpu\b/i;
const KUNST_RE = /(pu|faux|artificial|synthetic|imitation|vegan)\s*leather|kunstleder|lederimitat/i;
const ECHT_RE = /\b(genuine|real|cow|cowhide|sheep|goat)\s*leather\b/i;
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯]/;

/**
 * Titel-Wahrheit, mechanisch: der Titel darf nicht mehr versprechen als das Datenblatt (`quelle` = quelleAus(c).text, erste Zeile ist der Lieferantenname).
 * Das ist ein Netz, kein Urteil über Güte: ein Titel, der durchfällt, wird NICHT repariert (zurückgestellt), einer, der besteht, ist nicht damit schon schön.
 * @returns {{ok:boolean, probleme:string[]}}
 */
export function titelPruefen(titel, { cjName = '', quelle = '' } = {}) {
  const probleme = [], t = String(titel ?? '');
  if (t.length < 6) probleme.push('Titel zu kurz');
  if (t.length > 90) probleme.push(`Titel zu lang (${t.length} Zeichen)`);
  if (CJK_RE.test(t)) probleme.push('chinesische/japanische/koreanische Zeichen im Titel');
  const en = t.match(ENGLISCH_RE); if (en) probleme.push(`englischer Rest «${en[0]}»`);
  const vb = VERBOTEN.exec(t); if (vb) probleme.push(`verbotenes Wort «${vb[0]}»`);
  const erlaubt = new Set([...zahlen(quelle), ...zahlen(cjName)]); for (const z of [...erlaubt]) erlaubt.add(String(Number(z)));
  if (!zahlenBelegt(t, erlaubt)) probleme.push('Zahl im Titel steht nicht im Datenblatt');
  for (const [name, tm, bel] of TITEL_REGELN) {
    if (!tm.test(t)) continue;
    if (name === 'Leder' && EHRLICH_RE.test(t)) continue;
    if (!bel.test(quelle)) { probleme.push(`«${name}» im Titel, aber kein Beleg im Datenblatt`); continue; }
    if (name === 'wasserdicht') {
      if (!bel.test(quelle.replace(/^Product name:.*$/m, ''))) probleme.push('«wasserdicht» steht nur im Lieferantennamen (Werbetext), nicht im Datenblatt');
      if (/water\s?-?proof\W{0,4}(no|nein|not)\b/i.test(quelle)) probleme.push('Datenblatt: Waterproof nein');
    }
    if (name === 'Leder' && KUNST_RE.test(quelle) && !ECHT_RE.test(quelle)) probleme.push('Datenblatt nennt Kunst-/PU-Leder');
  }
  return { ok: !probleme.length, probleme };
}

/** Prüfregel für KI-Übersetzungen von Variantenwerten (unverändert aus cj_varianten_nachziehen.mjs plane(), dort inline): «Oil Painting Blue» unverändert zurück = nicht übersetzt. */
export function uebersetzungBrauchbar(t, roh) {
  return !!t && t.weg !== 'original' && Array.isArray(t.texte) && t.texte.length === roh.length
    && t.texte.every((x, i) => x && x.length <= 40 && (x.toLowerCase() !== roh[i].toLowerCase() || (!/\s/.test(roh[i]) && !ENGLISCH_RE.test(roh[i]))));
}

// ════════════════════════════════════════════════════════════════════════════
// Produktart, Tags, Preis
// ════════════════════════════════════════════════════════════════════════════
/**
 * Tabelle «Google-Pfad → productType» aus dem Katalog des Shops: so ordnet der Shop heute selbst ein. Für einen Pfad zählt die tiefste Ebene mit
 * mindestens `minN` Produkten, deren häufigster Typ mindestens `minAnteil` hat; ohne Treffer gibt es KEINEN Typ (nie raten).
 * @param {{productType?:string, g?:string}[]} produkte
 */
export function productTypeTabelle(produkte, { minN = 5, minAnteil = 0.6 } = {}) {
  const proPfad = new Map();
  for (const p of produkte) {
    const typ = text(p.productType), g = text(p.g ?? p.pfad); if (!typ || !g) continue;
    const ebenen = g.split(' > ');
    for (let i = 1; i <= ebenen.length; i++) {
      const k = ebenen.slice(0, i).join(' > ');
      let m = proPfad.get(k); if (!m) proPfad.set(k, m = new Map());
      m.set(typ, (m.get(typ) || 0) + 1);
    }
  }
  const tab = new Map();
  for (const [pfad, m] of proPfad) {
    const n = [...m.values()].reduce((a, b) => a + b, 0); if (n < minN) continue;
    const [typ, c] = [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    if (c / n >= minAnteil) tab.set(pfad, { typ, n, anteil: c / n });
  }
  return tab;
}
/** Tiefster Treffer der Tabelle für einen Google-Pfad, sonst null. */
export function productTypeFuer(g, tab) {
  if (!tab || !g) return null;
  const e = text(g).split(' > ');
  for (let i = e.length; i >= 1; i--) { const t = tab.get(e.slice(0, i).join(' > ')); if (t) return { ...t, ebene: i }; }
  return null;
}

/** Tags eines neuen Produkts: Rücknahme-Marken (grind2, grind2-<Datum>), «Text offen» und die berechneten sort-Tags. `cj-real`/`dropship` fügt planeNeu hinzu. */
export function tagsFuer({ sortTags = [], jetzt, textOffen = true } = {}) {
  return eindeutig(['grind2', `grind2-${jjjjmmtt(jetzt)}`, ...(textOffen ? ['text-offen'] : []), ...sortTags]).sort();
}

/** Untergrenze des Preises: Bekleidung/Schuhe 16.90 (so steht es im Shop, Audit M16), sonst 14.90. SETZUNG. */
export function preisMinFuer(g, cfg) {
  return /^Apparel & Accessories > (Clothing|Shoes)\b/.test(text(g)) ? cfg.preisMinMode : cfg.preisMin;
}

/**
 * Plausibilität des Preises, bevor ein Produkt angelegt wird. Die Marktpreis-Obergrenze kennt dieser Lauf NICHT (UNBEKANNT: Galaxus-Preise liegen nur für 6 Zielblätter vor),
 * darum nur zwei harte Grenzen: der Einstand darf nicht so klein sein, dass die Untergrenze 14.90 ein Vielfaches davon wäre, und der Preis nicht so hoch, dass er für diesen Shop unrealistisch ist.
 */
export function preisUrteil(preise, cfg) {
  if (!preise || !Array.isArray(preise.varianten) || !preise.varianten.length) return { ok: false, grund: 'keine Preise berechnet', frist: 'vorlaeufig' };
  if (!preise.ok) return { ok: false, grund: `Preis unbekannt bei ${preise.ungueltig.length} von ${preise.varianten.length} Varianten (${preise.grund || ''})`, frist: 'zurueckgestellt' };
  const kosten = preise.varianten.map(v => v.kosten);
  const einstand = Math.min(...kosten);
  if (einstand < cfg.minEinstand) return { ok: false, grund: `Einstand ${einstand.toFixed(2)} CHF unter ${cfg.minEinstand.toFixed(2)} CHF: die Preisuntergrenze wäre ein Vielfaches des Einstands, am Markt nicht haltbar`, frist: 'zurueckgestellt' };
  if (preise.maxPreis > cfg.maxPreis) return { ok: false, grund: `Preis bis ${preise.maxPreis.toFixed(2)} CHF über der Obergrenze ${cfg.maxPreis.toFixed(2)} CHF`, frist: 'zurueckgestellt' };
  return { ok: true, einstandMin: einstand };
}

// ════════════════════════════════════════════════════════════════════════════
// Ledger und Budget
// ════════════════════════════════════════════════════════════════════════════
export const fristKopf = frist => (frist === 'zurueckgestellt' ? `${ZURUECKGESTELLT}: ` : frist === 'vorlaeufig' ? `${VORLAEUFIG}: ` : '');
/** Eine Ledger-Zeile (mit Zeilenende). `detail` darf kein «·» enthalten (Trenner) und wird gekürzt. */
export function ledgerZeile(schluessel, ergebnis, detail, jetzt) {
  return `${schluessel} · ${new Date(jetzt).toISOString()} · ${ergebnis} · ${saniere(detail)}\n`;
}
export function ledgerZeileGeschrieben({ pid, n, handle, gid, zielId }, jetzt) {
  return `${pid} · ${new Date(jetzt).toISOString()} · GESCHRIEBEN · ${n} Varianten · ${saniere(handle, 255)} · ${saniere(gid, 80)} · ${saniere(zielId, 60)}\n`;
}

/** Neue Varianten der GESCHRIEBEN-Zeilen im gleitenden Fenster (beide Ledger-Formate: «… · GESCHRIEBEN · 12 Varianten …»). */
export function variantenVerbrauch(ledgerTexte, jetzt, fensterMs = TAG_MS) {
  let summe = 0, zeilen = 0, ungueltig = 0;
  for (const t of ledgerTexte) for (const z of String(t ?? '').split('\n')) {
    const f = z.split(' · ').map(s => s.trim());
    if (f[2] !== 'GESCHRIEBEN') continue;
    const ts = Date.parse(f[1]), m = /(\d+)\s*Varianten/.exec(f[3] || '');
    if (!Number.isFinite(ts) || !m) { ungueltig++; continue; }
    if (ts > jetzt + 3600 * 1000) { ungueltig++; continue; }     // Uhrfehler: nie ein Freibrief, aber auch kein dauerhafter Stopp
    if (ts > jetzt - fensterMs) { summe += Number(m[1]); zeilen++; }
  }
  return { summe, zeilen, ungueltig };
}

/**
 * Wie viele neue Varianten darf dieser Lauf noch anlegen? Zwei Grenzen gelten zugleich:
 *  (a) Grinds EIGENER Anteil im 24-h-Fenster (GRIND_ANTEIL × TAGESLIMIT, Vorgabe 5 % von 10 000 = 500),
 *  (b) beide Ledger zusammen unter GESAMT_MAX (Vorgabe 9 000, unter dem beobachteten Höchstwert ~9 500), damit Grind den Auswahl-Lauf nie verdrängt.
 */
export function variantenBudget({ grind2Text = '', auswahlText = '', jetzt, cfg }) {
  const g = variantenVerbrauch([grind2Text], jetzt).summe, a = variantenVerbrauch([auswahlText], jetzt).summe;
  const anteilMax = Math.floor(cfg.tageslimit * cfg.anteil);
  return { grind2: g, auswahl: a, gesamt: g + a, anteilMax, gesamtMax: cfg.gesamtMax, frei: Math.max(0, Math.min(anteilMax - g, cfg.gesamtMax - (g + a))) };
}

// ════════════════════════════════════════════════════════════════════════════
// Stufe 7: Tore nach dem Anlegen (frisch am Shop gelesen) und Kanäle
// ════════════════════════════════════════════════════════════════════════════
/** Die Abfrage für die Tore (gegen den Shop geprüft: productByIdentifier, resourcePublicationsV2, variant.media — `variant.image` ist ab 2026-10 veraltet). */
export const TORE_ABFRAGE = `query($id:ID!){ product(id:$id){ id handle status title tags productType descriptionHtml onlineStoreUrl
  variantsCount{count} options{name values}
  variants(first:100){nodes{ id sku price selectedOptions{name value} media(first:1){nodes{ id }} inventoryItem{ unitCost{amount} } }}
  media(first:250){nodes{ id status }}
  mf: metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value }
  resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished publication{ id } } } } }`;

/**
 * Tore nach dem Anlegen. `eingabe` ist die productSet-Eingabe des Plans, `p` das frisch gelesene Produkt (TORE_ABFRAGE).
 * ok: true/false, null = noch nicht entscheidbar (Medien werden noch verarbeitet → der Aufrufer wartet und liest neu).
 * @returns {{ok:boolean, offen:boolean, tore:{name:string, ok:boolean|null, grund:string}[]}}
 */
export function toreNachAnlage(eingabe, p, { minBilder = MIN_BILDER, nachFreigabe = false } = {}) {
  const tore = [];
  const tor = (name, ok, grund = '') => tore.push({ name, ok, grund: ok === true ? '' : grund });
  if (!p) return { ok: false, offen: false, tore: [{ name: 'produkt', ok: false, grund: 'Produkt nicht mehr da' }] };
  tor('status', nachFreigabe ? p.status === 'ACTIVE' : p.status === 'DRAFT', `Status ${p.status}`);
  tor('titel', p.title === eingabe.title, `Titel «${p.title}» statt «${eingabe.title}»`);
  const vs = p.variants?.nodes || [], soll = eingabe.variants || [];
  tor('varianten-zahl', p.variantsCount?.count === soll.length && vs.length === soll.length, `${p.variantsCount?.count} Varianten im Shop, ${soll.length} im Plan`);
  const skuIst = new Set(vs.map(v => v.sku)), skuSoll = new Set(soll.map(v => v.inventoryItem.sku));
  const fehlt = [...skuSoll].filter(s => !skuIst.has(s)), fremd = [...skuIst].filter(s => !skuSoll.has(s));
  tor('skus', !fehlt.length && !fremd.length && skuIst.size === vs.length, `fehlen: ${fehlt.slice(0, 3).join(', ')}; fremd: ${fremd.slice(0, 3).join(', ')}`);
  const optIst = JSON.stringify((p.options || []).map(o => [o.name, [...o.values].sort()])), optSoll = JSON.stringify((eingabe.productOptions || []).map(o => [o.name, o.values.map(v => v.name).sort()]));
  tor('optionen', optIst === optSoll, `Optionen im Shop ${optIst.slice(0, 120)} statt ${optSoll.slice(0, 120)}`);
  const medien = p.media?.nodes || [];
  const failed = medien.filter(m => m.status === 'FAILED').length, bereit = medien.filter(m => m.status === 'READY').length, laeuft = medien.filter(m => !['READY', 'FAILED'].includes(m.status)).length;
  // Solange Medien noch verarbeitet werden, ist eine Zahl «noch nicht entscheidbar» (null), nicht «falsch»: der Aufrufer wartet und liest neu.
  const reif = (genug_, offen_) => (genug_ ? true : offen_ ? null : false);
  tor('medien-fehlerfrei', failed === 0, `${failed} Medium/Medien FAILED`);
  tor('medien-fertig', laeuft === 0 ? true : null, `${laeuft} Medium/Medien noch in Verarbeitung`);
  tor('medien-zahl', reif(bereit >= minBilder, laeuft > 0), `nur ${bereit} fertige Bilder (mindestens ${minBilder})`);
  const mitBild = soll.filter(v => v.file).length, hatBild = vs.filter(v => v.media?.nodes?.length).length;
  tor('variantenbilder', reif(hatBild >= mitBild, laeuft > 0), `${hatBild} von ${mitBild} geplanten Variantenbildern verknüpft`);
  const gSoll = (eingabe.metafields || []).find(m => m.key === 'google_product_category')?.value;
  tor('google-pfad', !!gSoll && p.mf?.value === gSoll, `Metafeld «${p.mf?.value ?? 'fehlt'}» statt «${gSoll}»`);
  const tIst = new Set(p.tags || []), tFehlt = (eingabe.tags || []).filter(t => !tIst.has(t));
  tor('tags', !tFehlt.length, `Tags fehlen: ${tFehlt.slice(0, 4).join(', ')}`);
  const sperr = [...tIst].filter(t => SPERR_TAGS.includes(t)).concat(sperrTags([...tIst]));
  tor('keine-sperr-tags', !sperr.length, `Sperr-Tags: ${eindeutig(sperr).join(', ')}`);
  const schlecht = vs.filter(v => {
    const pr = Number(v.price), k = Number(v.inventoryItem?.unitCost?.amount);
    return !(pr > 0 && k > 0 && pr >= k * 1.2);
  });
  tor('preise', !schlecht.length, `${schlecht.length} Variante(n) mit Preis unter Kosten × 1,2 oder ohne Kosten (z. B. ${schlecht[0]?.sku})`);
  const preisAbw = soll.filter(s => { const v = vs.find(x => x.sku === s.inventoryItem.sku); return !v || Number(v.price).toFixed(2) !== Number(s.price).toFixed(2); });
  tor('preise-wie-geplant', !preisAbw.length, `${preisAbw.length} Preis(e) weichen vom Plan ab`);
  const beschr = String(p.descriptionHtml || '');
  tor('text', TEXT_MARKER.some(m => beschr.includes(m)) && htmlZuText(beschr).length >= 150, 'Beschreibung ohne Fakten-Block/Fliesstext oder zu kurz');
  if (nachFreigabe) tor('kanaele', (p.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).length >= 1, 'in keinem Kanal veröffentlicht');
  const offen = tore.some(t => t.ok === null);
  return { ok: tore.every(t => t.ok === true), offen, tore };
}

/**
 * Kanalliste für neue Produkte: die Veröffentlichungen, die die Mehrheit der Referenzprodukte (zuletzt angelegte aktive CJ-Produkte) tragen.
 * Weniger als 3 Referenzen = nicht ableitbar (null): dann wird NICHT veröffentlicht.
 * @param {{pubs:string[]}[]} refs  @returns {string[]|null}
 */
export function kanaeleAusReferenz(refs, { anteil = 0.75, mindestens = 3 } = {}) {
  if (!Array.isArray(refs) || refs.length < mindestens) return null;
  const zaehl = new Map();
  for (const r of refs) for (const id of eindeutig(r.pubs || [])) zaehl.set(id, (zaehl.get(id) || 0) + 1);
  const ids = [...zaehl.entries()].filter(([, n]) => n / refs.length >= anteil - 1e-9).map(([id]) => id).sort();
  return ids.length ? ids : null;
}

// ════════════════════════════════════════════════════════════════════════════
// Bericht: Kontaktbogen als Markdown
// ════════════════════════════════════════════════════════════════════════════
const zelle = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const chf = x => (Number.isFinite(Number(x)) && x !== null ? Number(x).toFixed(2) : '–');

/** Kontaktbogen: eine Zeile je geprüftem Kandidaten (Bild, Titel, Blatt, Einstand, Fracht, Preis, Marge, Varianten, Google-Pfad, Tags, Tore, Entscheid). */
export function kontaktbogen(zeilen, { titel = 'Kontaktbogen', kopf = '', vorfilter: vf = [] } = {}) {
  const l = [`# ${titel}`, '', kopf, ''];
  l.push('| # | Bild | Titel (DE) | Zielblatt / CJ-Blatt | Einstand CHF | Fracht USD | Preis CHF | Marge | Varianten (Auswahl) | Google-Pfad | sort-Tags | Tore | Entscheid |');
  l.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  zeilen.forEach((r, i) => {
    const bild = r.bild ? `<img src="${zelle(r.bild)}" width="80">` : '–';
    const spanne = (a, b) => (a == null ? '–' : a === b ? chf(a) : `${chf(a)}–${chf(b)}`);
    const tore = r.tore ? `${r.tore.ok}/${r.tore.gesamt}${r.tore.falsch?.length ? ' ✗ ' + r.tore.falsch.join(', ') : ''}` : '–';
    const marge = r.margeMin == null ? '–' : `${(r.margeMin * 100).toFixed(1)} %`;
    l.push(`| ${i + 1} | ${bild} | ${zelle(r.titel || r.titelEn)} | ${zelle(r.zielName)} / ${zelle(r.blatt)} | ${spanne(r.einstandMin, r.einstandMax)} | ${chf(r.frachtUsd)}${r.frachtLinie ? ` (${zelle(r.frachtLinie)})` : ''} | ${spanne(r.preisMin, r.preisMax)}${(r.preisFlaggen || []).filter(f => f !== 'spanne').length ? ` ⚑ ${zelle(r.preisFlaggen.filter(f => f !== 'spanne').join(', '))}` : ''} | ${marge} | ${r.varianten ?? '–'}${r.optionen ? ` (${zelle(r.optionen)})` : ''} | ${zelle(r.google) || '–'}${r.googleSicherheit ? ` [${r.googleSicherheit}]` : ''}${r.productType ? ` · Typ ${zelle(r.productType)}` : ''} | ${zelle((r.sortTags || []).join(', ')) || '–'} | ${tore} | ${zelle(r.entscheid)} |`);
  });
  if (vf.length) {
    l.push('', '## Vorfilter (Stufe 3, ohne Punkte)', '', '| Zielblatt | Quelle | Treffer | durch | abgelehnt nach Grund |', '|---|---|---|---|---|');
    for (const v of vf) l.push(`| ${zelle(v.ziel)} | ${zelle(v.quelle)} | ${v.treffer} | ${v.durch} | ${zelle(Object.entries(v.abgelehnt).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')) || '–'} |`);
  }
  return l.join('\n') + '\n';
}

// ════════════════════════════════════════════════════════════════════════════
// Netz: alles über eine übergebene fetch-Funktion (Tests: simuliertes Netz)
// ════════════════════════════════════════════════════════════════════════════
export const CJ_LAUF_RE = /^CJ_(?:QUOTA|THROTTLED|RESERVE|BUDGET)\b/;
export const VARIANTEN_LIMIT_RE = /VARIANT_THROTTLE|Daily variant creation limit/i;

/**
 * CJ-Zugriff mit Punkte-Buchführung. Jeder Aufruf: eigene Obergrenze (punkteMax) und Reserve (GRIND_RESERVE) VOR dem Aufruf prüfen, `pointsInfo` NACH dem Aufruf lesen, 1,2 s Pause.
 * Die Kosten sind die gemessenen Listenpreise (KOSTEN); der tatsächliche Verbrauch steht in stand.remaining (enthält fremden Verbrauch auf demselben Konto).
 */
export function cjClient({ token, fetch: fetchFn, warte, stand = {}, reserve = 0, punkteMax = Infinity, pauseMs = PAUSE_MS, basisMs } = {}) {
  const z = { punkte: 0, aufrufe: {} };
  const wartet = warte || schlafen;
  const pruefe = (art, kosten) => {
    if (z.punkte + kosten > punkteMax) throw new Error(`CJ_BUDGET: eigene Punktegrenze ${punkteMax} erreicht (${art}, bisher ${z.punkte})`);
    if (reserve > 0 && Number.isFinite(stand.remaining) && stand.remaining - kosten < reserve) throw new Error(`CJ_RESERVE: nur noch ${stand.remaining} Punkte, Reserve ${reserve} bleibt unangetastet (${art})`);
  };
  const buche = (art, kosten) => { z.punkte += kosten; z.aufrufe[art] = (z.aufrufe[art] || 0) + 1; };
  async function rufe(art, url, kosten, extra = {}) {
    pruefe(art, kosten);
    const a = await cjFetch(url, { context: art, headers: { 'CJ-Access-Token': token }, fetch: fetchFn, warte: wartet, basisMs, ...extra });
    punkteMerken(stand, a);
    buche(art, kosten);
    await wartet(pauseMs);
    return a;
  }
  return {
    z, stand,
    liste: p => rufe('liste', listeUrl(p), KOSTEN.liste),
    query: pid => rufe('query', `${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`, KOSTEN.query, { weicheCodes: WEICHE_CODES }),
    kategorien: () => rufe('kategorien', `${CJ_BASE}/product/getCategory`, KOSTEN.kategorien),
    einstellungen: () => rufe('einstellungen', `${CJ_BASE}/setting/get`, 0),
    /** Fracht CN→CH für EIN Produkt (schwerste Variante, bei 0 Linien zusätzlich die leichteste): höchstens zwei Aufrufe à 10 Punkte. */
    async fracht(varianten) {
      pruefe('fracht', 2 * FRACHT_PUNKTE);
      const r = await frachtProdukt({ varianten, token, fetch: fetchFn, warte: wartet, stand, reserve, pauseMs, basisMs });
      const n = Array.isArray(r.gemessen) ? r.gemessen.length : 0;
      z.punkte += n * FRACHT_PUNKTE; z.aufrufe.fracht = (z.aufrufe.fracht || 0) + n;
      return r;
    },
  };
}

/** Ein Aufruf, der JSON liefern muss: Gemini, sonst Groq (wie cj_fakten_block.mjs, dort nicht exportiert). {o:null} = beide ohne brauchbare Antwort. */
export async function modellJson(prompt, { fetch: fetchFn, geminiKey, groqKey } = {}) {
  const gk = String(geminiKey ?? process.env.GEMINI_API_KEY ?? '').trim(), qk = String(groqKey ?? process.env.GROQ_API_KEY ?? '').trim();
  const lies = t => { try { const s = String(t || '').replace(/^```(json)?/i, '').replace(/```$/, '').trim(); const a = s.indexOf('{'), b = s.lastIndexOf('}'); return JSON.parse(s.slice(a, b + 1)); } catch { return null; } };
  const gruende = [];
  if (gk) {
    try {
      const r = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(gk)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { const o = lies((j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')); if (o) return { o, weg: 'gemini' }; gruende.push('Gemini: Antwort nicht lesbar'); }
      else gruende.push(`Gemini HTTP ${r.status}`);
    } catch (e) { gruende.push('Gemini: ' + e.message); }
  }
  if (qk) {
    for (const modell of GROQ_MODELLE) {
      try {
        const r = await fetchFn('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${qk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modell, temperature: 0, messages: [{ role: 'user', content: prompt }] }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { const o = lies(j?.choices?.[0]?.message?.content); if (o) return { o, weg: 'groq' }; gruende.push(`Groq ${modell}: Antwort nicht lesbar`); }
        else gruende.push(`Groq ${modell} HTTP ${r.status}`);
      } catch (e) { gruende.push(`Groq ${modell}: ${e.message}`); }
    }
  }
  return { o: null, weg: 'keins', gruende };
}

/**
 * Bild-URLs auf HTTP 200 prüfen (Bild-Falle: `quick/product/…` liefert teils 404; ein Zeitfehler ist KEIN 404). HEAD, bei 400/403/405/501 ein GET mit Range.
 * @returns {{ok:Set<string>, schlecht:Map<string,string>}}
 */
export async function bilderPruefen(urls, { fetch: fetchFn, parallel = 6, timeoutMs = 15000 } = {}) {
  const ok = new Set(), schlecht = new Map();
  const liste = eindeutig(urls.map(text).filter(Boolean));
  const eins = async u => {
    for (const methode of ['HEAD', 'GET']) {
      try {
        const init = { method: methode, redirect: 'follow', headers: methode === 'GET' ? { Range: 'bytes=0-1023' } : {} };
        if (typeof AbortSignal?.timeout === 'function') init.signal = AbortSignal.timeout(timeoutMs);
        const r = await fetchFn(u, init);
        try { await r.body?.cancel?.(); } catch { /* egal */ }
        if (r.status === 200 || r.status === 206) {
          const ct = r.headers?.get?.('content-type') || '';
          if (ct && !/^image\//i.test(ct)) { schlecht.set(u, `kein Bild (${ct.slice(0, 30)})`); return; }
          ok.add(u); return;
        }
        if (methode === 'HEAD' && [400, 403, 405, 501].includes(r.status)) continue;
        schlecht.set(u, `HTTP ${r.status}`); return;
      } catch (e) { if (methode === 'GET') { schlecht.set(u, `Netz: ${String(e.message).slice(0, 40)}`); return; } }
    }
  };
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(parallel, liste.length) }, async () => { while (i < liste.length) await eins(liste[i++]); }));
  return { ok, schlecht };
}

/**
 * Welches Variantenbild ist visuell dasselbe wie ein Galeriebild unter anderer URL? (Wahrnehmungs-Hash wie im Nachzieher: maxDh 3 / maxFarbe 8, nie lockern.)
 * Zwei fast gleich gute Treffer = mehrdeutig = KEIN Alias. Mehr als `max` verschiedene Bilder: keine Prüfung (kostet Downloads).
 * @param {{sig:(url:string)=>Promise<any>|any, gleich:(a:any,b:any)=>({dh:number,farbe:number}|null)}} f
 */
export async function bildAliasBauen(galerie, variantenUrls, { sig, gleich, max = 60 } = {}) {
  const alias = {}; if (typeof sig !== 'function' || typeof gleich !== 'function') return { alias, geprueft: 0, grund: 'keine Bildprüfung verfügbar' };
  const galSet = new Set(galerie), neu = eindeutig(variantenUrls.filter(u => u && !galSet.has(u)));
  if (!neu.length) return { alias, geprueft: 0 };
  if (galerie.length + neu.length > max) return { alias, geprueft: 0, grund: `mehr als ${max} verschiedene Bilder: nicht geprüft` };
  const galSig = []; for (const g of galerie) galSig.push({ g, s: await sig(g) });
  let geprueft = 0;
  for (const u of neu) {
    const s = await sig(u); geprueft++;
    if (!s) continue;
    const t = galSig.filter(x => x.s).map(x => ({ g: x.g, d: gleich(s, x.s) })).filter(x => x.d).sort((a, b) => (a.d.dh * 4 + a.d.farbe) - (b.d.dh * 4 + b.d.farbe));
    const mehrdeutig = t.length > 1 && (t[1].d.dh * 4 + t[1].d.farbe) - (t[0].d.dh * 4 + t[0].d.farbe) < 2;
    if (t.length && !mehrdeutig) alias[u] = t[0].g;
  }
  return { alias, geprueft };
}

/**
 * Englischer Rest in Werten des Fakten-Blocks. Der Probelauf (27.10.2026, Groq statt Gemini) lieferte «Material Plastic · Farbe white» und «can be used indoor and outdoor» in einer
 * deutschen Seite: saeubern() prüft Zahlen und Marken, aber keine Sprache. Ein Eintrag mit englischem Rest fällt weg (nicht der ganze Block).
 */
export const EN_FUNKTION_RE = /(^|[^a-zäöüß])(the|are|is|can|be|used|this|that|from|your|you|for|of|to|or|it|on|at)(?![a-zäöüß])/i;
/** Stoffe und Werkstoffe, die im Datenblatt englisch stehen und in EN_AUSGABE_RE fehlen («Material Metal» stand im Probelauf in einer deutschen Seite). */
export const EN_STOFF_RE = /(^|[^a-zäöüß])(metal|wood|glass|rubber|iron|copper|ceramic|paper|alloy|aluminum|brass|zinc|resin|silicone|foam|fabric|canvas|acrylic|crystal)(?![a-zäöüß])/i;
export const istEnglisch = t => EN_AUSGABE_RE.test(String(t)) || EN_FUNKTION_RE.test(String(t)) || EN_STOFF_RE.test(String(t));
export function faktenSprachfilter(s) {
  const verworfen = [...(s?.verworfen || [])];
  const behalte = (liste, f) => (liste || []).filter(x => { const t = f(x); if (istEnglisch(t)) { verworfen.push(`englischer Rest: ${String(t).slice(0, 50)}`); return false; } return true; });
  const aus = { daten: behalte(s.daten, d => `${d.label} ${d.wert}`), lieferumfang: behalte(s.lieferumfang, x => x), anleitung: behalte(s.anleitung, x => x), hinweise: behalte(s.hinweise, x => x) };
  aus.belegt = aus.daten.length + aus.lieferumfang.length + aus.anleitung.length + aus.hinweise.length;
  aus.verworfen = verworfen;
  return aus;
}

/** Fakten-Block aus dem CJ-Datenblatt (nur belegte Angaben: Zahlen-Gegenprobe, Markensperre, Sprachfilter, Mindestsubstanz — lib/fakten_block.mjs). Ein Aussetzer des Modells wird einmal wiederholt. */
export async function faktenBlock(c, titel, io = {}) {
  const q = quelleAus(c);
  let m = await modellJson(faktenAuftrag(q.text, titel), io);
  if (!m.o) { await (io.warte || schlafen)(2000); m = await modellJson(faktenAuftrag(q.text, titel), io); }
  if (!m.o) return { ok: false, kiAusfall: true, grund: `Modell ohne Antwort (${(m.gruende || []).join(' · ') || 'kein Schlüssel'})` };
  // Sprachfilter VOR saeubern(): sonst verdrängt ein englisches «Material: Plastic» das deutsche zweite «Material» (saeubern behält je Beschriftung nur das erste)
  const roh = faktenSprachfilter(m.o);
  const s = saeubern(roh, q.text, '');
  s.verworfen = [...roh.verworfen, ...s.verworfen];
  const wissen = wissenFuer(titel, q.kategorie);
  if (!genug(s) && !wissen) return { ok: false, grund: `zu wenig belegte Angaben (${s.belegt}${s.verworfen.length ? `, ${s.verworfen.length} verworfen` : ''})`, belegt: s.belegt };
  return { ok: true, html: renderBlock(s, { wissen }), belegt: s.belegt, weg: m.weg, verworfen: s.verworfen.length };
}

/** Bereichsdateien der Rest-Taxonomie (dropship/taxonomie-2610-b: kern.mjs + bereiche/*.json) → Kategorie-Objekte für taxTags. Fehlt der Ordner, zählen nur die live bekannten Kategorien. */
export async function ladeKategorienExtra(dir) {
  const aus = { kategorien: [], geladen: [], fehler: [] };
  const kern = join(dir, 'kern.mjs'), bdir = join(dir, 'bereiche');
  if (!existsSync(kern) || !existsSync(bdir)) { aus.fehler.push(`keine Bereichsdateien unter ${dir}`); return aus; }
  let K; try { K = await import(pathToFileURL(kern).href); } catch (e) { aus.fehler.push(`kern.mjs: ${e.message}`); return aus; }
  for (const f of readdirSync(bdir).filter(x => x.endsWith('.json')).sort()) {
    try {
      const b = JSON.parse(readFileSync(join(bdir, f), 'utf8'));
      aus.kategorien.push(...bereichKategorien(b, { passt: K.passt, imUnterfilter: K.imUnterfilter, normiere: K.normiere }));
      aus.geladen.push(f.replace(/\.json$/, ''));
    } catch (e) { aus.fehler.push(`${f}: ${e.message}`); }
  }
  return aus;
}

/** Shopify-Zugang: Client-Credentials-Grant (CLAUDE.md), Admin-API-Version aus planeNeu. */
export async function shopZugang(io, fetchFn, env = process.env) {
  const shop = io.shop || env.SHOPIFY_SHOP;
  let tok = io.shopToken;
  if (!tok) {
    if (!shop || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw new Error('Kein Shopify-Zugang (SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET)');
    const r = await fetchFn(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
    tok = (await r.json().catch(() => ({})))?.access_token;
    if (!tok) throw new Error('Kein Shopify-Token (Client-Credentials-Grant lieferte keinen access_token)');
  }
  return (q, v) => shopifyGql(shop, API_VERSION, tok, q, v, { fetch: fetchFn, warte: io.warte, basisMs: io.basisMs });
}

// ───────────────────────── GraphQL-Texte (alle gegen den Shop gelesen bzw. gegen das Schema geprüft, 27.10.2026)
const SKU_ABFRAGE = `query($q:String!){ products(first:3, query:$q){ nodes{ id handle status tags variantsCount{count} } } }`;
const HANDLE_ABFRAGE = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle status tags variantsCount{count} } }`;
const KANAL_REFERENZ = `query{ products(first:8, query:"status:active tag:cj-real", sortKey:CREATED_AT, reverse:true){ nodes{ id resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished publication{ id } } } } } }`;
const TAGS_ADD = `mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }`;
const STATUS_SETZEN = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id status } userErrors{ field message } } }`;
const VEROEFFENTLICHEN = `mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id, input:$p){ userErrors{ field message } } }`;
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// ════════════════════════════════════════════════════════════════════════════
// Der Lauf
// ════════════════════════════════════════════════════════════════════════════
const jsonLesen = p => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const jsonSchreiben = (p, o) => { try { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o)); } catch { /* ein Zwischenspeicher ist nur eine Abkürzung */ } };
const frischGenug = (p, stunden, jetzt) => { try { return jetzt - statSync(p).mtimeMs < stunden * 3600 * 1000; } catch { return false; } };

/**
 * @param {ReturnType<typeof konfigAus>} cfg
 * @param {{fetch?:Function, warte?:Function, jetzt?:()=>number, log?:Function, cjToken?:string, shopToken?:string, shop?:string, geminiKey?:string, groqKey?:string,
 *   basisMs?:number, index?:object, kategorienExtra?:object, productTypeTab?:Map, bildSig?:Function, bildGleich?:Function, env?:object}} [io]
 * @returns {Promise<{exit:number, bericht:object}>}
 */
export async function lauf(cfg, io = {}) {
  const log = io.log || (() => {});
  const jetzt = io.jetzt || (() => Date.now());
  const fetchFn = io.fetch || globalThis.fetch;
  const warte = io.warte || schlafen;
  const env = io.env || process.env;
  const live = cfg.live;
  const monat = new Date(jetzt()).getUTCMonth() + 1;     // für die Saison-Sperre
  const betriebsart = schutzPruefen(cfg, { freigabe: existsSync(cfg.pfade.freigabeDatei) });
  const bericht = { betriebsart, start: new Date(jetzt()).toISOString(), zaehl: {}, zeilen: [], vorfilter: [], hinweise: [], exit: EXIT.OK, punkte: null, budget: null, veroeffentlicht: [] };
  const zaehl = n => { bericht.zaehl[n] = (bericht.zaehl[n] || 0) + 1; };
  const hinweis = t => { if (!bericht.hinweise.includes(t)) bericht.hinweise.push(t); log('  Hinweis:', t); };
  const lies = p => (existsSync(p) ? readFileSync(p, 'utf8') : '');
  const kiOpt = { fetch: fetchFn, geminiKey: io.geminiKey, groqKey: io.groqKey };

  // ── Eingänge
  const luecken = jsonLesen(cfg.pfade.bedarf);
  if (!luecken) throw new Error(`Bedarfsdatei fehlt oder ist kein JSON: ${cfg.pfade.bedarf}`);
  let ledgerText = lies(cfg.pfade.ledger);
  const auswahlText = lies(cfg.pfade.auswahlLedger);
  const erledigt = ledgerGedaechtnis(ledgerText, { jetzt: jetzt(), force: cfg.force });
  const ziele = bedarfAus(luecken, { geschrieben: schreibZaehlerAusLedger(ledgerText), wellen: cfg.wellen, ziele: cfg.ziele });
  log(`Stufe 1 Bedarf: ${ziele.length} Zielblätter mit Restbedarf${cfg.ziele.length ? ` (gewählt: ${cfg.ziele.join(', ')})` : ` (Wellen ${cfg.wellen.join('/')})`}`);

  let index = io.index;
  if (!index) {
    const r = ladeIndex({ skusDatei: cfg.pfade.skus, ledgerDir: dirname(cfg.pfade.ledger) });
    index = r.index; bericht.indexBericht = r.bericht;
    for (const f of r.bericht.fehlend) hinweis(`Index: ${f} fehlt`);
  }
  if (!istFrisch(index, cfg.indexMaxH, jetzt())) {
    const t = `Shop-SKU-Index ist nicht frisch (Stand ${index.stand || 'unbekannt'}, erlaubt ${cfg.indexMaxH} h): erst node automation/grind_skus_lesen.mjs`;
    if (live) throw new Error(t);
    hinweis(t);
  }
  const extra = io.kategorienExtra || await ladeKategorienExtra(cfg.pfade.bereiche);
  const kategorien = [...KATEGORIEN, ...extra.kategorien];
  hinweis(`Kategorien für sort-Tags: ${KATEGORIEN.length} live bekannt + ${extra.kategorien.length} aus Bereichsdateien (${extra.geladen.join(', ') || 'keine'})${extra.fehler.length ? `; Probleme: ${extra.fehler.join('; ').slice(0, 160)}` : ''}`);
  let ptTab = io.productTypeTab ?? null;
  if (!ptTab && cfg.pfade.katalog && existsSync(cfg.pfade.katalog)) {
    const k = jsonLesen(cfg.pfade.katalog); ptTab = productTypeTabelle(Array.isArray(k) ? k : (k?.produkte || []));
  }
  if (!ptTab) hinweis('Kein Katalog für productType gefunden: neue Produkte bekommen KEINEN productType (GRIND2_KATALOG setzen)');

  // ── CJ und Shop
  const token = io.cjToken ?? await cjToken();
  if (!token) throw new Error('Kein CJ-Token (CJ_EMAIL/CJ_API_KEY)');
  const stand = {};
  const cj = cjClient({ token, fetch: fetchFn, warte, stand, reserve: cfg.reserve, punkteMax: cfg.punkteMax, basisMs: io.basisMs });
  let shopQ = null;
  const shop = async (q, v) => { if (!shopQ) shopQ = await shopZugang(io, fetchFn, env); return shopQ(q, v); };
  const budgetPruefen = betriebsart !== 'probe';
  const budget = variantenBudget({ grind2Text: ledgerText, auswahlText, jetzt: jetzt(), cfg });
  bericht.budget = { ...budget, genutzt: 0 };
  let verbraucht = 0, budgetStopp = false;
  let kanaeleCache;      // vor dem try-Block: die Funktionen unten laufen aus ihm heraus

  const ledgerAnhaengen = (datei, zeile) => { if (!live) return; mkdirSync(dirname(datei), { recursive: true }); appendFileSync(datei, zeile); };
  const ledger = (zeile) => { ledgerAnhaengen(cfg.pfade.ledger, zeile); if (live) ledgerText += zeile; };
  const freigabeLedger = zeile => ledgerAnhaengen(cfg.pfade.freigabeLedger, zeile);

  const stoppe = (code, text_) => { bericht.exit = bericht.exit || code; hinweis(`ABBRUCH: ${text_}`); };
  try {
    await cj.einstellungen();     // kostenlos, liefert pointsInfo (gemessen 27.10.2026)
    bericht.punkte = { start: stand.remaining ?? null, total: stand.total ?? null };
    log(`CJ-Punkte vor dem Lauf: ${stand.remaining ?? 'unbekannt'} (Reserve ${cfg.reserve}, eigene Grenze ${cfg.punkteMax})`);
    if (Number.isFinite(stand.remaining) && stand.remaining < cfg.reserve + KOSTEN.liste) {
      stoppe(EXIT.CJ, `nur noch ${stand.remaining} CJ-Punkte, Reserve ${cfg.reserve}`);
      return abschluss();
    }

    // ── Stufe 2 und 3: Kandidaten holen, Vorfilter
    let knotenCache = null;
    const knoten = async () => {
      if (knotenCache) return knotenCache;
      const p = join(cfg.pfade.cacheDir, 'kategorien.json');
      let d = frischGenug(p, 24 * 7, jetzt()) ? jsonLesen(p) : null;
      if (!d) { const a = await cj.kategorien(); d = baumAbflachen(a?.data); if (d.length) jsonSchreiben(p, d); else hinweis('product/getCategory: Antwort nicht lesbar, es zählen nur Suchwörter'); }
      return (knotenCache = d);
    };
    const listeHolen = async (q, seite) => {
      const p = join(cfg.pfade.cacheDir, 'listen', `${quellenSchluessel(q, seite)}.json`);
      if (frischGenug(p, cfg.listeTtlH, jetzt())) { const d = jsonLesen(p); if (Array.isArray(d)) return { items: d, aus: 'Zwischenspeicher' }; }
      const a = await cj.liste({ kategorieId: q.id, suche: q.wort, seite, groesse: cfg.listeGroesse });
      const items = a?.data?.list;
      if (!Array.isArray(items)) throw new Error('CJ_DATA: Listenantwort ohne data.list');
      jsonSchreiben(p, items);
      return { items, aus: 'CJ', total: a.data.total };
    };

    const jeZiel = [];
    let aussicht = 0;
    for (const ziel of ziele) {
      if (aussicht >= cfg.limit) break;
      const quellen = cjQuellenFuer(ziel, cjPfadVertraut(ziel) ? await knoten() : []);
      if (!quellen.length) hinweis(`Zielblatt ${ziel.id}: keine CJ-Quelle (weder Kategorie noch Suchwort)`);
      const kand = []; let seiten = 0;
      for (const q of quellen) {
        if (seiten >= cfg.seitenMax || kand.length >= cfg.proZiel) break;
        const { items, aus, total } = await listeHolen(q, 1); seiten++;
        const vf = vorfilterListe(items, { cfg, index, erledigt, monat });
        bericht.vorfilter.push({ ziel: ziel.name, quelle: `${q.art === 'kategorie' ? `Kategorie ${q.name}` : `Suche «${q.wort}»`} (${aus}${total ? `, ${total} insgesamt` : ''})`, treffer: items.length, durch: vf.durch.length, abgelehnt: vf.abgelehnt });
        log(`Stufe 2/3 ${ziel.id} · ${q.art === 'kategorie' ? q.name : `«${q.wort}»`}: ${items.length} Treffer (${aus}) → ${vf.durch.length} durch den Vorfilter`);
        for (const d of vf.durch) if (!kand.some(x => x.pid === d.pid)) kand.push(d);
      }
      jeZiel.push({ ziel, kandidaten: rangiere(kand) });
      aussicht += Math.min(cfg.proZiel, ziel.rest, kand.length);
    }
    const auswahl = verteile(jeZiel, { limit: cfg.limit, proZiel: cfg.proZiel });
    log(`Stufe 4: ${auswahl.length} Kandidaten kommen in die Prüfung`);

    // ── Stufe 4/5: Prüfung und Plan
    let kiFolge = 0, fehlerFolge = 0, schreibFolge = 0, drosselFolge = 0, veroeffentlicht = 0;
    for (const { ziel, k } of auswahl) {
      if (live && !existsSync(cfg.pfade.freigabeDatei)) { hinweis(`Freigabedatei ${cfg.pfade.freigabeDatei} ist verschwunden: Stopp`); break; }
      if (budgetPruefen && budget.frei - verbraucht <= 0) { budgetStopp = true; break; }
      let r;
      try {
        r = await pruefeKandidat(k, ziel);
        drosselFolge = 0;
      } catch (e) {
        const m = String(e.message);
        if (/^CJ_THROTTLED/.test(m) && ++drosselFolge < 2) r = { status: 'FEHLER', grund: `Plan: ${m.slice(0, 120)}`, ledgerText: `Plan: ${saniere(m, 100)}`, row: zeileFuer(k, ziel, { entscheid: `FEHLER: ${saniere(m, 80)}` }) };
        else if (CJ_LAUF_RE.test(m)) { stoppe(EXIT.CJ, m); break; }
        else r = { status: 'FEHLER', grund: `Plan: ${m.slice(0, 160)}`, ledgerText: `Plan: ${saniere(m, 100)}`, row: zeileFuer(k, ziel, { entscheid: `FEHLER: ${saniere(m, 80)}` }) };
      }
      bericht.zeilen.push(r.row);
      zaehl(r.status);
      log(`  ${k.pid} ${text(r.row.titel || k.name).slice(0, 50)} → ${r.row.entscheid}`);
      if (r.kiAusfall) kiFolge++; else if (r.kiOk) kiFolge = 0;
      if (r.status === 'FEHLER') fehlerFolge++; else fehlerFolge = 0;
      if (r.status !== 'PLAN') {
        if (r.status === 'FEHLER' || r.ledgerText) ledger(ledgerZeile(k.pid, r.status, r.ledgerText || r.grund, jetzt()));
      }
      if (kiFolge >= cfg.maxKiFolge) { stoppe(EXIT.KI, `KI-Dienst ${kiFolge} Mal hintereinander nicht erreichbar`); break; }
      if (fehlerFolge >= cfg.maxFehlerFolge) { stoppe(EXIT.FEHLER, `${fehlerFolge} Fehler in Folge: ein Dienst scheint auszufallen`); break; }
      if (r.status !== 'PLAN') continue;

      // Variantenbudget: gilt für Planung UND Anlage (ein Plan, der nicht mehr hineinpasst, wird nicht angelegt; er bleibt 3 h im Zwischenspeicher)
      const n = r.plan.eingabe.variants.length;
      if (budgetPruefen && n > budget.frei - verbraucht) {
        budgetStopp = true; r.row.entscheid = `PLAN, aber ${n} Varianten passen nicht mehr ins Budget (frei ${budget.frei - verbraucht})`; zaehl('BUDGET'); continue;
      }
      verbraucht += n; bericht.budget.genutzt = verbraucht;
      if (!live) continue;
      // Die Planung dauert Sekunden bis Minuten: «Datei löschen = Stopp» gilt auch unmittelbar vor dem Schreiben
      if (!existsSync(cfg.pfade.freigabeDatei)) { hinweis(`Freigabedatei ${cfg.pfade.freigabeDatei} ist verschwunden: Stopp vor dem Anlegen`); break; }

      // ── Stufe 6: anlegen (DRAFT)
      let a;
      try { a = await anlegen(r.plan, ziel); }
      catch (e) {
        const m = String(e.message);
        if (VARIANTEN_LIMIT_RE.test(m)) { stoppe(EXIT.VARIANTEN, 'Shopify-Tageslimit für neue Varianten erreicht'); break; }
        a = { art: 'FEHLER', grund: `Schreiben: ${saniere(m, 120)}` };
      }
      r.row.entscheid = a.art === 'GESCHRIEBEN' ? `GESCHRIEBEN (DRAFT${a.uebernommen ? ', übernommen' : ''}) ${a.gid}` : `${a.art}: ${a.grund}`;
      if (a.art === 'FEHLER') { zaehl('FEHLER'); ledger(ledgerZeile(k.pid, 'FEHLER', a.grund, jetzt())); if (++schreibFolge >= cfg.maxFehlerFolge) { stoppe(EXIT.FEHLER, `${schreibFolge} Schreibfehler in Folge: ein Dienst scheint auszufallen`); break; } continue; }
      if (a.art === 'UEBERSPRUNGEN') { zaehl('UEBERSPRUNGEN'); ledger(ledgerZeile(k.pid, 'UEBERSPRUNGEN', a.ledgerText || a.grund, jetzt())); continue; }
      zaehl('GESCHRIEBEN'); schreibFolge = 0;
      ziel.rest = Math.max(0, ziel.rest - 1);
      ledger(ledgerZeileGeschrieben({ pid: k.pid, n: a.varianten, handle: r.plan.handle, gid: a.gid, zielId: ziel.id }, jetzt()));
      verbraucht += Math.max(0, a.varianten - n);     // zählt die Übernahme eines Produkts mit anderer Variantenzahl nach
      datenblattFuerTexte(k.pid, r.plan.handle);

      // ── Stufe 7: Tore
      const t = await toreAbwarten(a.gid, r.plan.eingabe);
      r.row.tore = { ok: t.tore.filter(x => x.ok === true).length, gesamt: t.tore.length, falsch: t.tore.filter(x => x.ok !== true).map(x => x.name) };
      if (!t.ok) {
        zaehl('TOR_FEHLER');
        r.row.entscheid += ` · Tore: ${r.row.tore.falsch.join(', ')}`;
        freigabeLedger(ledgerZeile(r.plan.handle, 'FEHLER', t.tore.filter(x => x.ok !== true).map(x => `${x.name}: ${x.grund}`).join('; '), jetzt()));
        try { await shop(TAGS_ADD, { id: a.gid, t: ['grind2-tor-fehler'] }); } catch (e) { hinweis(`Tag grind2-tor-fehler nicht gesetzt: ${saniere(e.message, 80)}`); }
        continue;
      }
      freigabeLedger(ledgerZeile(r.plan.handle, 'FREI', 'alle Tore bestanden (DRAFT)', jetzt()));

      // ── Stufe 7b: veröffentlichen, nur mit PUBLISH=1
      if (cfg.publish && veroeffentlicht < cfg.publishMax) {
        const v = await veroeffentlichen(a.gid, r.plan);
        r.row.entscheid += ` · ${v.art}${v.grund ? `: ${v.grund}` : ''}`;
        if (v.art === 'VEROEFFENTLICHT') { veroeffentlicht++; zaehl('VEROEFFENTLICHT'); bericht.veroeffentlicht.push(r.plan.handle); }
      }
    }
    if (budgetStopp && !bericht.exit) stoppe(EXIT.VARIANTEN, `Variantenbudget für das 24-h-Fenster aufgebraucht (Anteil ${budget.anteilMax}, bisher ${budget.grind2} + ${verbraucht} in diesem Lauf)`);
  } catch (e) {
    const m = String(e.message);
    if (CJ_LAUF_RE.test(m)) stoppe(EXIT.CJ, m);
    else if (VARIANTEN_LIMIT_RE.test(m)) stoppe(EXIT.VARIANTEN, m);
    else throw e;
  }
  return abschluss();

  // ───────────────────────── Hilfen im Lauf (sehen cfg, io, cj, shop, index …)
  function abschluss() {
    bericht.punkte = { ...(bericht.punkte || {}), ende: stand.remaining ?? null, eigene: cj.z.punkte, aufrufe: cj.z.aufrufe };
    bericht.ende = new Date(jetzt()).toISOString();
    try {
      mkdirSync(dirname(cfg.pfade.out), { recursive: true });
      writeFileSync(cfg.pfade.out, kontaktbogen(bericht.zeilen, {
        titel: `Grind 2.0 — ${betriebsart} vom ${bericht.start.slice(0, 10)}`,
        kopf: [`Betriebsart **${betriebsart}**${live ? '' : ' (nichts im Shop geschrieben, kein Ledger)'} · Zählung ${JSON.stringify(bericht.zaehl)} · Exit ${bericht.exit}`,
          `CJ-Punkte: Start ${bericht.punkte.start ?? '?'}, Ende ${bericht.punkte.ende ?? '?'}, eigene Aufrufe ${JSON.stringify(bericht.punkte.aufrufe)} ≈ ${bericht.punkte.eigene} Punkte nach Preisliste (Differenz enthält fremden Verbrauch)`,
          `Variantenbudget: frei ${bericht.budget.frei} (Anteil ${bericht.budget.anteilMax}, Grind 24 h ${bericht.budget.grind2}, Auswahl-Lauf 24 h ${bericht.budget.auswahl}, Gesamtgrenze ${bericht.budget.gesamtMax}); geplant in diesem Lauf ${bericht.budget.genutzt}`,
          ...bericht.hinweise.map(h => `- ${h}`)].join('\n'),
        vorfilter: bericht.vorfilter,
      }));
    } catch (e) { log('Bericht nicht geschrieben:', e.message); }
    return { exit: bericht.exit, bericht };
  }

  function zeileFuer(k, ziel, extra = {}) {
    return { pid: k.pid, zielId: ziel.id, zielName: ziel.name, titelEn: k.name, blatt: k.t?.categoryName, bild: k.t?.productImage, listedNum: k.t?.listedNum, ...extra };
  }

  async function titelErzeugen(c, quelleText) {
    const cjName = text(c.productNameEn);
    if (!cjName) return { titel: null, probleme: ['CJ-Datenblatt ohne Namen'] };
    let probleme = [];
    for (let versuch = 0; versuch < 2; versuch++) {
      const korrektur = versuch ? `ACHTUNG: der letzte Versuch hatte diese Fehler: ${probleme.join('; ')}. Mach es besser.\n` : '';
      let t = await nachDeutsch([cjName], { ...kiOpt, auftrag: TITEL_AUFTRAG + korrektur });
      if (t.weg === 'original') { await warte(2000); t = await nachDeutsch([cjName], { ...kiOpt, auftrag: TITEL_AUFTRAG + korrektur }); }      // ein einzelner Aussetzer (Groq 429) ist noch kein Ausfall
      if (t.weg === 'original') return { titel: null, kiAusfall: true, grund: t.grund };
      const titel = titelDeutsch(titelBereinigen(t.texte[0]));
      const p = titelPruefen(titel, { cjName, quelle: quelleText });
      if (p.ok) return { titel, weg: t.weg, versuche: versuch + 1 };
      probleme = p.probleme;
    }
    return { titel: null, probleme };
  }

  /** Stufen 4 und 5 für EINEN Kandidaten. Wirft nur Lauf-Fehler (CJ_*) und unerwartete Fehler; jedes andere Ergebnis ist ein Rückgabewert. */
  async function pruefeKandidat(k, ziel) {
    const row = zeileFuer(k, ziel);
    const ausgang = (status, grund, frist, extra = {}) => {
      const lt = extra.ledgerText ?? (fristKopf(frist) + saniere(grund, 200));
      const r = { status, grund, frist, ledgerText: lt, row: { ...row, entscheid: status === 'PLAN' ? 'PLAN: alle Tore bestanden' : `übersprungen (${frist || 'endgueltig'}): ${saniere(grund, 160)}` }, ...extra };
      return r;
    };
    const planPfad = join(cfg.pfade.planDir, `${k.pid}.json`);
    if (cfg.planTtlH > 0 && frischGenug(planPfad, cfg.planTtlH, jetzt())) {
      const alt = jsonLesen(planPfad);
      if (alt && (alt.status === 'PLAN' || alt.status === 'UEBERSPRUNGEN') && alt.row) {
        log(`  ${k.pid}: Plan aus dem Zwischenspeicher (kostet keine Punkte)`);
        return { ...alt, row: { ...alt.row, entscheid: alt.status === 'PLAN' ? 'PLAN: alle Tore bestanden (Zwischenspeicher)' : alt.row.entscheid } };
      }
    }
    const fertig = r => { jsonSchreiben(planPfad, { status: r.status, grund: r.grund, frist: r.frist, ledgerText: r.ledgerText, row: r.row, plan: r.plan, kiAusfall: r.kiAusfall }); return r; };

    // 1. Datenblatt
    const dbPfad = join(cfg.pfade.cacheDir, 'datenblatt', `${k.pid}.json`);
    const cacheC = frischGenug(dbPfad, cfg.datenblattTtlH, jetzt()) ? jsonLesen(dbPfad) : null;
    const res = cacheC ? { data: cacheC, code: 200 } : await cj.query(k.pid);
    const c = res?.data;
    if (!c || typeof c !== 'object') return fertig(ausgang('UEBERSPRUNGEN', `CJ ohne Daten (code ${res?.code})`, 'endgueltig'));
    if (!cacheC) jsonSchreiben(dbPfad, c);
    const gal0 = galerieAus(normalisiereCj(c));
    row.blatt = c.categoryName || row.blatt; row.bild = gal0[0] || row.bild;

    // 2. Dublette mit allen Schlüsseln (productSku, variantSkus)
    const vSkus = (c.variants || []).map(v => text(v?.variantSku)).filter(Boolean);
    const d1 = istDublette({ pid: c.pid, productSku: c.productSku, variantSkus: vSkus, titel: c.productNameEn }, index);
    if (d1.dublette) return fertig(ausgang('UEBERSPRUNGEN', `Dublette: ${d1.grund}`, 'endgueltig'));
    if (d1.unbekannt) hinweis(`${k.pid}: Dublettenprüfung nicht möglich (kein harter Schlüssel)`);

    // 3. Titel
    const q = quelleAus(c);
    const tr = await titelErzeugen(c, q.text);
    if (tr.kiAusfall) return fertig(ausgang('UEBERSPRUNGEN', `KI-Dienst nicht erreichbar (Titel): ${saniere(tr.grund, 80)}`, 'vorlaeufig', { kiAusfall: true }));
    if (!tr.titel) return fertig(ausgang('UEBERSPRUNGEN', `Titel nicht sicher: ${(tr.probleme || []).join('; ')}`, 'zurueckgestellt', { kiOk: true }));
    const titel = tr.titel; row.titel = titel;
    const sa2 = saisonSperre(titel, monat);
    if (sa2) return fertig(ausgang('UEBERSPRUNGEN', `Saisonware ${sa2.anlass} ausserhalb ihres Fensters (Monate ${sa2.fenster.join('/')})`, 'zurueckgestellt', { kiOk: true }));

    // 4. Google-Pfad, productType, Handle, sort-Tags («in die passende Kategorie»)
    const gp = googlePfad({ categoryId: c.categoryId, categoryName: c.categoryName, titel }, {});
    row.google = gp.pfad; row.googleSicherheit = gp.sicherheit;
    if (!gp.pfad || gp.sicherheit === 'unklar') return fertig(ausgang('UEBERSPRUNGEN', `keine sichere Google-Kategorie: ${gp.grund}`, 'zurueckgestellt', { kiOk: true }));
    const zk = zubehoerKonflikt({ titel, cjName: c.productNameEn, pfad: gp.pfad });
    if (zk) return fertig(ausgang('UEBERSPRUNGEN', `Zubehör-Konflikt: «${zk.wort}» im ${zk.quelle}, aber der Google-Pfad nennt das Gerät selbst (${gp.pfad})`, 'zurueckgestellt', { kiOk: true }));
    const pt = productTypeFuer(gp.pfad, ptTab)?.typ;
    row.productType = pt;
    const handle = handleAus(c.pid, titel);
    if (!handle) return fertig(ausgang('UEBERSPRUNGEN', 'kein Handle bildbar (pid oder Titel unbrauchbar)', 'vorlaeufig', { kiOk: true }));
    const sortTags = taxTags({ title: titel, g: gp.pfad, tags: [], productType: pt, handle }, { kategorien });
    row.sortTags = sortTags;
    if (!sortTags.length) return fertig(ausgang('UEBERSPRUNGEN', `keine passende Kategorie (kein sort-Tag) für ${gp.pfad}`, 'zurueckgestellt', { kiOk: true }));
    const tags = tagsFuer({ sortTags, jetzt: jetzt() });
    const d2 = istDublette({ pid: c.pid, productSku: c.productSku, variantSkus: vSkus, titel, handle }, index);
    if (d2.dublette) return fertig(ausgang('UEBERSPRUNGEN', `Dublette: ${d2.grund}`, 'endgueltig', { kiOk: true }));
    if (d2.warnung) row.hinweis = `Titelähnlichkeit: ${d2.grund.slice(0, 120)}`;

    // 5. Vorplan: alle Tore AUSSER Preis (Platzhalterpreis), samt Übersetzung unsicherer Optionswerte (höchstens zwei Runden)
    const basisCtx = extraCtx => ({ titel, googlePfad: gp.pfad, googleVokabular: TAXONOMIE, productType: pt, tags, maxVarianten: cfg.maxVarianten, minBilder: cfg.minBilder, ...extraCtx });
    let uebersetzung, kiAusfall = false;
    let vor = planeNeu(c, basisCtx({ preis: () => ({ preis: 99, kosten: 50 }) }));
    for (let runde = 0; runde < 2 && vor.unsicher.length && vor.tore.filter(t => t.ok === false).every(t => ['optionswerte-sicher', 'optionswerte-deutsch'].includes(t.name)); runde++) {
      const roh = eindeutig(vor.unsicher.map(u => u.wert));
      const t = await nachDeutsch(roh, { ...kiOpt, auftrag: LABEL_AUFTRAG });
      kiAusfall = t.weg === 'original';
      if (!uebersetzungBrauchbar(t, roh)) break;
      uebersetzung = { ...(uebersetzung || {}), ...Object.fromEntries(roh.map((w, i) => [w, t.texte[i].replace(/ß/g, 'ss')])) };      // Schweizer Rechtschreibung auch in der Auswahl
      vor = planeNeu(c, basisCtx({ preis: () => ({ preis: 99, kosten: 50 }), uebersetzung, kiAusfall }));
    }
    if (!vor.ok) return fertig(ausgang('UEBERSPRUNGEN', vor.grund, vor.frist, { ledgerText: vor.ledgerGrund, kiAusfall, kiOk: !kiAusfall }));
    const bleibt = new Set(vor.eingabe.variants.map(v => v.inventoryItem.sku));
    const vs = (c.variants || []).filter(v => bleibt.has(text(v.variantSku)));

    // 6. Bilder: HTTP 200 (Bild-Falle) und Hash-Alias gegen doppelte Uploads
    const varUrls = eindeutig(vs.map(v => text(v.variantImage)).filter(Boolean));
    const bp = await bilderPruefen([...gal0, ...varUrls].slice(0, 200), { fetch: fetchFn });
    let alias = {};
    if (cfg.bildHash && io.bildSig && io.bildGleich) {
      const ar = await bildAliasBauen(gal0.filter(u => bp.ok.has(u)), varUrls.filter(u => bp.ok.has(u)), { sig: io.bildSig, gleich: io.bildGleich });
      alias = ar.alias; if (ar.grund) hinweis(`${k.pid}: Bildvergleich ${ar.grund}`);
    }

    // 7. Fracht CN→CH (Lieferbarkeit entscheidet allein diese Messung) und Preis
    const fr = await cj.fracht(vs.map(v => ({ vid: v.vid, gewichtG: Number(v.variantWeight) || 0 })));
    row.frachtLinie = fr.guenstigsteLinie;
    if (fr.urteil === 'nicht_lieferbar') return fertig(ausgang('UEBERSPRUNGEN', ledgerGrund(fr), 'endgueltig', { kiOk: true }));
    if (fr.unbekannt || fr.urteil === 'unbekannt') return fertig(ausgang('UEBERSPRUNGEN', ledgerGrund(fr), 'vorlaeufig', { ledgerText: ledgerGrund(fr), kiOk: true }));
    if (fr.teilweise) return fertig(ausgang('UEBERSPRUNGEN', 'nur die leichteste Variante lieferbar, die schwerste nicht (Gewichtsklassen dazwischen nicht einzeln gemessen)', 'zurueckgestellt', { kiOk: true }));
    const frachtUsd = frachtFuerKosten(fr, { sensitivAlsAusweg: cfg.sensitivAusweg });
    if (frachtUsd == null) return fertig(ausgang('UEBERSPRUNGEN', 'nur Sonderlinien (Sensitive/Liquid) nach CH, keine normale Linie', 'zurueckgestellt', { kiOk: true }));
    row.frachtUsd = frachtUsd;
    const preise = preiseFuerVarianten(vs.map(v => ({ vid: v.vid, ekUsd: v.variantSellPrice })),
      { kurs: cfg.kurs, frachtUsd, aufschlag: cfg.aufschlag, preisMin: preisMinFuer(gp.pfad, cfg) });
    const kosten = preise.varianten.filter(v => v.ok).map(v => v.kosten);
    if (kosten.length) { row.einstandMin = Math.min(...kosten); row.einstandMax = Math.max(...kosten); row.preisMin = preise.minPreis; row.preisMax = preise.maxPreis; row.margeMin = preise.margeMin; row.preisFlaggen = preise.flaggen; }
    const pu = preisUrteil(preise, cfg);
    if (!pu.ok) return fertig(ausgang('UEBERSPRUNGEN', pu.grund, pu.frist, { kiOk: true }));

    // 8. Text: Fakten-Block aus dem Datenblatt (nur belegte Angaben); der Fliesstext folgt später («Text offen»)
    const fb = await faktenBlock(c, titel, { ...kiOpt, warte });
    if (!fb.ok && fb.kiAusfall) return fertig(ausgang('UEBERSPRUNGEN', `KI-Dienst nicht erreichbar (Text): ${saniere(fb.grund, 80)}`, 'vorlaeufig', { kiAusfall: true }));
    if (!fb.ok && !cfg.duennOk) return fertig(ausgang('UEBERSPRUNGEN', `Text offen: ${fb.grund}`, 'zurueckgestellt', { kiOk: true }));

    // 9. Endplan mit allen 22 Toren
    const plan = planeNeu(c, basisCtx({ preis: preise, beschreibungHtml: fb.ok ? fb.html : '', uebersetzung, kiAusfall, bildOk: bp.ok, bildAlias: alias }));
    if (!plan.ok) return fertig(ausgang('UEBERSPRUNGEN', plan.grund, plan.frist, { ledgerText: plan.ledgerGrund, kiOk: true }));
    if (plan.handle !== handle) return fertig(ausgang('UEBERSPRUNGEN', `Handle weicht ab (${plan.handle} statt ${handle})`, 'vorlaeufig', { kiOk: true }));
    row.varianten = plan.varianten; row.optionen = plan.optionen.map(o => `${o.name} ${o.werte.length}`).join(' × ') || 'Einzelprodukt';
    row.tore = { ok: plan.tore.filter(t => t.ok === true).length, gesamt: plan.tore.length, falsch: plan.tore.filter(t => t.ok !== true).map(t => t.name) };
    for (const w of plan.warnungen.slice(0, 3)) hinweis(`${k.pid}: ${w}`);
    fuegeHinzu(index, { handle, title: titel, status: 'GEPLANT', pid: c.pid, productSku: c.productSku, skus: vSkus });
    return fertig(ausgang('PLAN', '', null, { plan: { pid: k.pid, handle, titel, eingabe: plan.eingabe, ziel: ziel.id }, kiOk: true }));
  }

  /** Dasselbe CJ-Datenblatt braucht die Text-Kette (text_eingabe, cj_fakten_block) unter /tmp/cj_fakten_cache/<handle>.json: einmal zahlen, zweimal nutzen (wie der Nachzieher). Nur live. */
  function datenblattFuerTexte(pid, handle) {
    try {
      const d = jsonLesen(join(cfg.pfade.cacheDir, 'datenblatt', `${pid}.json`)); if (!d) return;
      const f = join(cfg.pfade.faktenCache, `${handle}.json`);
      if (!existsSync(f)) { mkdirSync(cfg.pfade.faktenCache, { recursive: true }); writeFileSync(f, JSON.stringify(d)); }
    } catch { /* der Zwischenspeicher ist nur eine Abkürzung */ }
  }

  /** Stufe 6: als DRAFT anlegen. Vorher SKU- und Handle-Abfrage am Shop: ein Produkt, das ein früherer Lauf vor der Ledger-Zeile angelegt hat, wird übernommen statt verdoppelt. */
  async function anlegen(plan, ziel) {
    const e = plan.eingabe, sku1 = e.variants[0].inventoryItem.sku;
    const sk = await shop(SKU_ABFRAGE, { q: `sku:"${esc(sku1)}"` });
    const treffer = sk?.products?.nodes || [];
    const hd = (await shop(HANDLE_ABFRAGE, { h: e.handle }))?.productByIdentifier;
    const vorhanden = treffer.find(p => p.handle === e.handle) || hd || null;
    if (vorhanden && (vorhanden.tags || []).includes('grind2') && vorhanden.handle === e.handle) {
      return { art: 'GESCHRIEBEN', uebernommen: true, gid: vorhanden.id, varianten: vorhanden.variantsCount?.count ?? e.variants.length };
    }
    if (treffer.length) return { art: 'UEBERSPRUNGEN', grund: `Dublette (live): SKU ${sku1} gehört schon ${treffer[0].handle} (${treffer[0].status})`, ledgerText: `Dublette (live): SKU ${sku1} gehört ${treffer[0].handle}` };
    if (hd) return { art: 'UEBERSPRUNGEN', grund: `Handle ${e.handle} gehört schon einem fremden Produkt (${hd.status})`, ledgerText: `Handle ${e.handle} belegt (${hd.status})` };
    const res = await shop(PRODUCT_SET_MUTATION, { input: e });     // OHNE identifier: legt NUR an, überschreibt nie
    const ue = res?.productSet?.userErrors || [];
    if (ue.length) {
      const t = JSON.stringify(ue).slice(0, 300);
      if (VARIANTEN_LIMIT_RE.test(t)) throw new Error(t);
      return { art: 'FEHLER', grund: `productSet: ${t}` };
    }
    const p = res?.productSet?.product;
    if (!p?.id) return { art: 'FEHLER', grund: 'productSet ohne Produkt in der Antwort' };
    return { art: 'GESCHRIEBEN', gid: p.id, varianten: p.variantsCount?.count ?? e.variants.length };
  }

  /** Stufe 7: frisch lesen, bis die Medien verarbeitet sind (höchstens medienWarteS Sekunden). */
  async function toreAbwarten(id, eingabe, { nachFreigabe = false } = {}) {
    const polls = Math.max(1, Math.ceil(cfg.medienWarteS / 5));
    let t;
    for (let i = 0; i < polls; i++) {
      const d = await shop(TORE_ABFRAGE, { id });
      t = toreNachAnlage(eingabe, d?.product, { minBilder: cfg.minBilder, nachFreigabe });
      if (!t.offen) return t;
      await warte(5000);
    }
    // Zeit abgelaufen, Medien noch nicht fertig: «noch offen» ist kein Bestehen
    return { ...t, ok: false, tore: t.tore.map(x => (x.ok === null ? { ...x, ok: false, grund: `${x.grund} (nach ${cfg.medienWarteS} s noch nicht fertig)` } : x)) };
  }

  async function kanalListe() {
    if (kanaeleCache !== undefined) return kanaeleCache;
    const d = await shop(KANAL_REFERENZ, {});
    const refs = (d?.products?.nodes || []).map(p => ({ pubs: (p.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => n.publication.id) }));
    return (kanaeleCache = kanaeleAusReferenz(refs));
  }

  /** Aktiv setzen und in die Kanäle der übrigen CJ-Produkte veröffentlichen; danach frisch lesen und die Seite abrufen, sonst zurück auf DRAFT. */
  async function veroeffentlichen(gid, plan) {
    const e = plan.eingabe;
    const kanaele = await kanalListe();
    if (!kanaele) return { art: 'NICHT_VEROEFFENTLICHT', grund: 'Kanalliste aus den Referenzprodukten nicht ableitbar' };
    const ek = erlaubteKanaele(e.tags, kanaele.map(id => ({ id, name: id })));
    if (ek.sperrTags.length) return { art: 'NICHT_VEROEFFENTLICHT', grund: `Sperr-Tags ${ek.sperrTags.join(', ')}` };
    const zurueck = async grund => {
      try { await shop(STATUS_SETZEN, { p: { id: gid, status: 'DRAFT' } }); } catch (x) { hinweis(`Rücknahme auf DRAFT fehlgeschlagen: ${saniere(x.message, 80)}`); }
      freigabeLedger(ledgerZeile(plan.handle, 'ZURUECK', grund, jetzt()));
      return { art: 'ZURUECKGENOMMEN', grund };
    };
    const s = await shop(STATUS_SETZEN, { p: { id: gid, status: 'ACTIVE' } });
    if (s?.productUpdate?.userErrors?.length) return { art: 'FEHLER', grund: `ACTIVE: ${JSON.stringify(s.productUpdate.userErrors).slice(0, 160)}` };
    const pv = await shop(VEROEFFENTLICHEN, { id: gid, p: ek.erlaubt.map(k => ({ publicationId: k.id })) });
    if (pv?.publishablePublish?.userErrors?.length) return zurueck(`publishablePublish: ${JSON.stringify(pv.publishablePublish.userErrors).slice(0, 160)}`);
    const t = await toreAbwarten(gid, e, { nachFreigabe: true });
    if (!t.ok) return zurueck(`Tore nach dem Veröffentlichen: ${t.tore.filter(x => x.ok !== true).map(x => x.name).join(', ')}`);
    const url = `https://${env.SHOP_DOMAIN || 'luxestyle.ch'}/products/${e.handle}?cb=${jetzt()}`;
    let status = 0;
    for (let i = 0; i < 3 && status !== 200; i++) {
      try { const r = await fetchFn(url, { method: 'GET', redirect: 'follow' }); status = r.status; try { await r.body?.cancel?.(); } catch { /* egal */ } } catch { status = 0; }
      if (status !== 200) await warte(5000);
    }
    if (status !== 200) return zurueck(`Produktseite nicht erreichbar (HTTP ${status})`);
    freigabeLedger(ledgerZeile(plan.handle, 'FREI', `veröffentlicht in ${ek.erlaubt.length} Kanälen, Seite HTTP 200`, jetzt()));
    return { art: 'VEROEFFENTLICHT', grund: `${ek.erlaubt.length} Kanäle, Seite HTTP 200` };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Aufruf von der Kommandozeile
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  const cfg = konfigAus();
  let bildSig = null, bildGleich = null;
  if (cfg.bildHash) {
    const ff = spawnSync('ffmpeg', ['-version']);
    if (!ff.error && ff.status === 0) {
      const m = await import('./cj_varianten_nachziehen.mjs');
      const tmp = join(process.env.TMPDIR || '/tmp', 'grind2-bilder'); mkdirSync(tmp, { recursive: true });
      bildSig = u => m.bildSig(u, tmp); bildGleich = m.gleichesBild;
    } else console.log('Hinweis: ffmpeg fehlt, kein Bildvergleich (BILDHASH=0 setzt das bewusst)');
  }
  const { exit, bericht } = await lauf(cfg, { log: console.log, fetch: globalThis.fetch, bildSig, bildGleich });
  console.log(`\nZusammenfassung: ${JSON.stringify(bericht.zaehl)} (${bericht.betriebsart}) · CJ-Punkte eigene ≈ ${bericht.punkte?.eigene ?? '?'} · Bericht ${cfg.pfade.out} · Exit ${exit}`);
  process.exit(exit);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => {
  const m = String(e.message);
  if (VARIANTEN_LIMIT_RE.test(m)) { console.error('TAGESLIMIT: Shopify erlaubt heute keine neuen Varianten mehr'); process.exit(EXIT.VARIANTEN); }
  if (CJ_LAUF_RE.test(m)) { console.error('CJ:', m); process.exit(EXIT.CJ); }
  console.error('FEHLER', m); process.exit(EXIT.FEHLER);
});
