#!/usr/bin/env node
/**
 * Grind 2.0: der breite CJ-Produktimport, diesmal «in die passende Kategorie und mit Auswahl (Farbe/Grösse)».
 * Sieben Stufen, jede einzeln prüfbar, jede schreibt eine Ledger-Zeile für JEDEN Ausgang, an dem CJ-Punkte oder Shop-Schreibzugriffe hingen:
 *
 *   1 Bedarf       Zielblätter aus der Lückenanalyse (luecken.json), Rangfolge, Zielgrösse = Lücke minus schon Geschriebenes (Ledger).        0 Punkte
 *   2 Kandidaten   CJ product/list je Zielblatt (Kategorie oder Suchwort, orderBy=listedNum, 200 je Seite, Zwischenspeicher).                 50 Punkte je Aufruf
 *   3 Vorfilter    Produktart, Lager CN, Preis, listedNum, Marke/Klinge/Waffe/Erwachsene/Tabak, Dublette (Shop-SKU-Index + Ledger).         0 Punkte
 *   4 Prüfung      product/query (10), Titel DE (KI + mechanische Titel-Wahrheit), Google-Pfad + sort-Tags, Bilder HTTP 200,                 10 + 10 je Fracht
 *                  Stecker/Auswahl-Tore (planeNeu ohne Preis), Lager (getInventoryByPid, 10), Fracht CN→CH je Gewichtsklasse und Lieferzeit, Preis, Fakten-Block.
 *   5 Plan         planeNeu() mit ALLEN 23 Toren: nur wenn jedes besteht, gibt es eine productSet-Eingabe (DRAFT, volle Auswahl).
 *   6 Anlegen      productSet als DRAFT, idempotent (SKU- und Handle-Abfrage vorher, Übernahme statt Dublette), Variantenbudget.             nur LIVE
 *   7 Tore         frisch am Shop lesen (Medien, Varianten, SKUs, Google-Pfad, Tags, Preise, Text); Veröffentlichen NUR mit PUBLISH=1.        nur LIVE
 *
 * SCHALTER UND SCHUTZ (alles Vorgabe = nichts schreiben):
 *   (nichts)         Trockenlauf: liest CJ (kostet Punkte), schreibt Pläne nach /tmp, KEIN Shop-Zugriff, KEINE Ledger-Zeile.
 *   MODUS=probe      Probe: 10 Kandidaten aus 2 Zielblättern (ZIELE=a,b), höchstens PUNKTE_MAX (600) eigene CJ-Punkte, Kontaktbogen als Markdown (OUT=…).
 *   LIVE=1           schreibt — NUR wenn die Datei dropship/GRIND2-FREI.txt existiert (Datei löschen = Stopp, wird vor JEDEM Produkt UND vor jedem sichtbaren Schritt neu geprüft: Tore lesen, Aktivieren,
 *                    Kanäle, Freigabe-Zeile; nach dem Aktivieren geht das Produkt dann sofort zurück auf DRAFT). Jeder LIVE-Lauf beginnt damit, ACTIVE-Produkte mit Marke grind2 ohne Kanal (Absturz) zurückzunehmen.
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
 * dropship/grind2_freigabe_ledger.txt:  <handle> · <ISO> · FREI | FEHLER | ZURUECK | ZURUECK_FEHLGESCHLAGEN · <Detail>      (ZURUECK steht nur, wenn der Shop DRAFT zurückliest)
 *
 * ANNAHMEN UND SETZUNGEN (keine Messungen — der Besitzer bestätigt sie; Zahlen aus der Probe vom 27.10.2026 stehen in /tmp/grind2/bau/probe.md):
 *   · Die Fracht wird je GEWICHTSKLASSE gemessen (leichteste, schwerste und bis zu zwei Zwischenstufen, höchstens FRACHT_KLASSEN = 4 Aufrufe à 10 Punkte; spannt das Gewicht weniger als Faktor 2, genügt die
 *     schwerste). Jede Variante bekommt die Fracht der nächst schwereren gemessenen Klasse (nie zu billig). Ist nur die leichteste Variante lieferbar, wird das Produkt zurückgestellt.
 *   · LIEFERZEIT: gepreist wird mit der günstigsten normalen Linie, deren längste Laufzeit höchstens MAX_LIEFERTAGE (20) beträgt — die Produktseite verspricht «ca. 10–20 Tage». SETZUNG; GEMESSEN
 *     sind Eub/Postal 12–50, PostNL 15–45, Sensitive Pro 15–35 Tage, Ordinary VIP 7–10, EQ 5–9. Klassen ohne solche Linie verkaufen nicht (Variante fällt weg), ohne jede Klasse wird zurückgestellt.
 *   · LAGER: getInventoryByPid (GEMESSEN 10 Punkte): Varianten mit 0 im CN-Lager (CJ und Lieferant) werden weggelassen, unbekannt bleibt im Rennen.
 *   · MARGE: unter 25 % Bruttomarge (MARGE_HART) wird nie angelegt, unter 30 % warnt die Flagge; Kurs ausserhalb 0,6–1,2 sperrt. Beides gilt auch, wenn jemand AUFSCHLAG/USD_CHF falsch setzt.
 *   · HANDPRÜFUNG (Welle R): Kinder-/Babyware (Wickelunterlagen, 3D-Stifte, Kinderuhren, Motorradhelm-Headsets) wird nie automatisch ausgewählt oder veröffentlicht (HANDPRUEFUNG_ZIELE).
 *   · SPERRE: höchstens ein LIVE-Lauf je Ledger (Sperrdatei mit Herzschlag: 15 Minuten ohne Lebenszeichen = Überrest); Laser/Medizin/Pyro/Selbstverteidigung sind gesperrt (SICHERER STANDARD, der Besitzer entscheidet).
 *   · KINDER- UND BABYWARE wird auf PRODUKTEBENE gesperrt (Titel, englischer CJ-Name, CJ-Kategorie, Datenblatt-Text), nicht nur über das Zielblatt; Freigabe nach Einzelprüfung ist Sache des Besitzers.
 *   · PLAN-ZWISCHENSPEICHER: LIVE verwendet nie einen gespeicherten PLAN (nur gespeicherte Ablehnungen); der Plan-Schlüssel hängt am Abschluss ALLER importierten Dateien (planDateien) samt Sperrlisten und Einstellungen.
 *   · PFLICHTGRENZEN per Umgebung nie in die unsichere Richtung: PREIS_MIN ≥ 14.90, PREIS_MIN_MODE ≥ 16.90, MIN_EINSTAND_CHF ≥ 2, USD_CHF ±12 % um den festen Kurs, MAX_PREIS nur senkbar (≤ 80). GRIND2_TEST=1 ist ein Testschalter und steht in keinem Workflow (Test).
 *   · Aufschlag 1,45 / Untergrenze 14.90 (Bekleidung 16.90) kommen aus lib/grind_preis.mjs; Obergrenze MAX_PREIS 80 und Mindest-Einstand 2 CHF sind SETZUNGEN.
 *   · Saison-Fenster (Halloween Aug–Sep, Weihnachten Sep–Nov, Ostern Feb–Mär, Valentinstag Dez–Jan) folgen aus 10–20 Werktagen Lieferzeit.
 *   · Nur ORDINARY_PRODUCT mit Lager CN (Hypothese: beide Fälle ohne CH-Fracht waren SUPPLIER_SHIPPED_PRODUCT, n = 2; PRODUKTARTEN erweitert).
 *   · Der Text ist der Fakten-Block aus dem Datenblatt; der Fliesstext folgt später (Tag `text-offen`). Veröffentlicht wird nur mit Fakten-Block oder Fliesstext v2.
 *   · Das Marktpreis-Tor fehlt (UNBEKANNT); es gibt nur die beiden harten Preisgrenzen. Die Fracht-Anteils-Flagge (fracht_dominiert) erscheint im Kontaktbogen, sperrt aber nicht.
 *
 * Dieses Modul exportiert seine reinen Funktionen (getestet in grind2_test.mjs); der Lauf `lauf(cfg, io)` nimmt fetch/warte/jetzt von aussen (simuliertes Netz).
 */
import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync, statSync, readdirSync, openSync, writeSync, closeSync, unlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { shopifyGql } from './lib/shopify_gql.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { ledgerGedaechtnis, VORLAEUFIG, ZURUECKGESTELLT } from './lib/varianten_sicherheit.mjs';
import { frachtProdukt, frachtJeVariante, frachtKeineZahlGrund, messPlan, ledgerGrund, punkteMerken, USD_CHF, CJ_BASE, PAUSE_MS, FRACHT_PUNKTE } from './lib/cj_fracht.mjs';
import { preiseFuerVarianten, ueberObergrenzeWeg, AUFSCHLAG, PREIS_MIN, MARGE_HART } from './lib/grind_preis.mjs';
import { ladeIndex, istDublette, fuegeHinzu, istFrisch, pidNorm } from './lib/grind_dubletten.mjs';
import { googlePfad, taxTags, bereichKategorien, kernPhrase, TAXONOMIE } from './lib/grind_google.mjs';
import { heikelWort, fremdsteckerImNamen, kinderWort, zusatzSperrwort } from './lib/grind_plan.mjs';
import { planeNeu, PRODUCT_SET_MUTATION, API_VERSION, handleAus, galerieAus, normalisiereCj, ERWACHSENE_RE, TABAK_RE, STECKDOSE_EN_RE, ANZUENDER_RE, MAX_VARIANTEN, MIN_BILDER, VAR_MARKER } from './lib/grind_plan.mjs';
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
/** Vorgaben, die zugleich die Pflichtgrenzen sind (siehe konfigAus). SETZUNGEN nach der Probe vom 27.10.2026; der Besitzer ändert sie im Code, nicht per Umgebung. */
export const MAX_PREIS_STANDARD = 80, MIN_EINSTAND_STANDARD = 2, PREIS_MIN_MODE = 16.90;
/** CJ-Punkte je Aufruf (GEMESSEN 26.10.2026, /tmp/grind2/cj_api.md §5.1: Liste 50 unabhängig von der Seitengrösse, Abfrage und Fracht je 10). `kategorien` (product/getCategory) GEMESSEN 27.10.2026: 0 Punkte (usedToday blieb über drei Aufrufe gleich). `bestand` (product/stock/getInventoryByPid) GEMESSEN 27.10.2026 mit EINEM Aufruf zwischen zwei kostenlosen setting/get: 54 463 → 54 453, also genau 10 Punkte (die Messung in cj_api.md war gestört). */
/** Unter dieser gemessenen Übereinstimmung mit dem Shop (googlePfad → vertrauen) soll ein Mensch den Google-Pfad im Kontaktbogen ansehen. */
export const VERTRAUEN_HAND = 0.7;
export const KOSTEN = Object.freeze({ liste: 50, query: 10, fracht: FRACHT_PUNKTE, kategorien: 0, bestand: 10 });
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

/**
 * Weitere Stände des Auswahl-Ledgers: VARIANTEN_LEDGER_ALT (Komma-Liste) und, solange VARIANTEN_LEDGER nicht ausdrücklich gesetzt ist, das Ledger im HAUPT-Arbeitsbaum des Repos
 * (bei einem Worktree: das Verzeichnis über `git rev-parse --git-common-dir`). Dort hängt der Auswahl-Lauf an; der Worktree trägt nur den eingecheckten, oft Tage alten Stand.
 */
export function auswahlLedgerAndere(env, wurzel) {
  const liste = listeAus(env.VARIANTEN_LEDGER_ALT);
  if (!env.VARIANTEN_LEDGER && env.GRIND2_TEST !== '1') {
    try {
      const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: wurzel, encoding: 'utf8', timeout: 5000 });
      const gd = r.status === 0 ? resolve(wurzel, String(r.stdout).trim()) : '';
      if (gd && gd.endsWith('.git')) liste.push(join(dirname(gd), 'dropship/cj_varianten_ledger.txt'));
    } catch { /* kein git: nur der eigene Stand */ }
  }
  const eigen = resolve(env.VARIANTEN_LEDGER || join(wurzel, 'dropship/cj_varianten_ledger.txt'));
  return [...new Set(liste.map(p => resolve(p)))].filter(p => p !== eigen);
}

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
    reserve: z('GRIND_RESERVE', 15000, { min: 5000, max: 1e6 }),
    punkteMax: z('PUNKTE_MAX', probe ? 600 : 6000, { min: 10, max: 1e6 }),
    // PFLICHTGRENZEN: per Umgebung dürfen sie nie in die unsichere Richtung verschoben werden (Gegenlesung 27.10.2026: PREIS_MIN=1, MIN_EINSTAND_CHF=0, USD_CHF=0.65 und MAX_PREIS=100000 wurden angenommen).
    // Der Kurs darf um ±12 % um den fest verwendeten schwanken (ein Tippfehler liegt weit ausserhalb); Untergrenzen sind die Vorgaben selbst, die Obergrenze des Preises auch.
    kurs: z('USD_CHF', USD_CHF, { min: USD_CHF * 0.88, max: USD_CHF * 1.13 }),
    aufschlag: z('AUFSCHLAG', AUFSCHLAG, { min: 1.34, max: 10 }),     // 1 / (1 − MARGE_HART): darunter wäre jede Marge unter 25 %
    preisMin: z('PREIS_MIN', PREIS_MIN, { min: PREIS_MIN, max: 1000 }),
    preisMinMode: z('PREIS_MIN_MODE', PREIS_MIN_MODE, { min: PREIS_MIN_MODE, max: 1000 }),
    // SETZUNG nach der Probe vom 27.10.2026: eine Weihnachts-Lichterkette mit Fracht 49 USD kam auf 61.90–102.90 CHF. Das Sortiment des Shops liegt weit darunter; die Obergrenze gegen den
    // MARKTPREIS (Galaxus) fehlt weiterhin (UNBEKANNT). Der Besitzer legt den Wert fest.
    // Nur senkbar: MAX_PREIS über 80 ist eine Änderung im Code (Besitzerentscheid, PR), keine Umgebungsvariable. GRIND2_TEST=1 (Tests mit schweren Fixtures) hebt die Obergrenze auf.
    maxPreis: z('MAX_PREIS', MAX_PREIS_STANDARD, { min: 5, max: env.GRIND2_TEST === '1' ? 100000 : MAX_PREIS_STANDARD }),
    minEinstand: z('MIN_EINSTAND_CHF', MIN_EINSTAND_STANDARD, { min: MIN_EINSTAND_STANDARD, max: 1000 }),
    sensitivAusweg: env.SENSITIV_AUSWEG === '1',
    maxTage: z('MAX_LIEFERTAGE', 20, { min: 5, max: 90, ganz: true }),
    frachtKlassen: z('FRACHT_KLASSEN', 4, { min: 1, max: 6, ganz: true }),     // SETZUNG: höchstens 4 Messungen (40 Punkte) je Produkt mit breiter Gewichtsspanne
    bestandPruefen: env.BESTAND_PRUEFEN !== '0',                                // getInventoryByPid je Kandidat (+10 Punkte); 0 nur zum Sparen im Trockenlauf     // SETZUNG: wie das Lieferversprechen «ca. 10–20 Tage» der Produktseite
    maxVarianten: z('MAX_VARIANTEN', 40, { min: 1, max: MAX_VARIANTEN, ganz: true }),
    minBilder: z('MIN_BILDER', MIN_BILDER, { min: 1, max: 20, ganz: true }),
    tageslimit: z('TAGESLIMIT', 10000, { min: 1, max: 10000, ganz: true }),
    anteil: z('GRIND_ANTEIL', 0.05, { min: 0, max: 0.5 }),
    gesamtMax: z('GESAMT_MAX', 9000, { min: 1, max: 9500, ganz: true }),
    publishMax: z('PUBLISH_MAX', 5, { min: 0, max: 100, ganz: true }),
    medienWarteS: z('MEDIEN_WARTE_S', 120, { min: 0, max: 900 }),
    maxKiFolge: z('MAX_KI_FOLGE', 5, { min: 1, max: 100, ganz: true }),
    maxFehlerFolge: z('MAX_FEHLER_FOLGE', 8, { min: 1, max: 100, ganz: true }),
    planTtlH: z('PLAN_TTL_H', 3, { min: 0, max: 72 }),
    datenblattTtlH: z('DATENBLATT_TTL_H', 6, { min: 0, max: 72 }),
    indexMaxH: z('INDEX_MAX_H', 24, { min: 1, max: 240 }),
    indexMin: z('INDEX_MIN_PRODUKTE', 50000, { min: 0, max: 1e7, ganz: true }),     // der Shop hat 87 765 Produkte (27.10.2026); ein kleinerer Index ist abgeschnitten
    auswahlLedgerMaxH: z('AUSWAHL_LEDGER_MAX_H', 14, { min: 0, max: 720 }),     // 0 = nicht prüfen (nur Tests): ohne frischen Stand des Auswahl-Ledgers ist die Gesamtgrenze blind
    bildHash: env.BILDHASH !== '0',
    duennOk: env.DUENN_OK === '1',
    pfade: {
      ledger: env.LEDGER || frei('dropship/grind2_ledger.txt'),
      freigabeLedger: env.FREIGABE_LEDGER || frei('dropship/grind2_freigabe_ledger.txt'),
      auswahlLedger: env.VARIANTEN_LEDGER || frei('dropship/cj_varianten_ledger.txt'),
      auswahlLedgerAlt: auswahlLedgerAndere(env, wurzel),     // weitere Stände desselben Ledgers (Hauptrepo eines Worktrees, VARIANTEN_LEDGER_ALT): der jüngste zählt
      liveSort: env.LIVE_SORT_DATEI || '/tmp/grind2/live_sort_tags.json',     // Trockenlauf/Probe: JSON-Liste der live filternden sort-Tags (kein Shop-Zugriff dort)
      freigabeDatei: (env.GRIND2_TEST === '1' && env.FREIGABE_DATEI) || frei(FREIGABE_DATEI),
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
/**
 * Handprüfung = Welle R: Zielblätter mit Kinder-, Baby- und Sicherheitsware werden NIE automatisch ausgewählt und NIE automatisch veröffentlicht (CLAUDE.md «Kinderware … nie automatisch»;
 * die Lückenanalyse nennt für sie Auflagen wie «Material/Schadstoffangaben belegen», «Alterskennzeichnung», «Knopfzelle»). Wer sie ausdrücklich wählt (ZIELE=…), bekommt DRAFTs zur Handprüfung,
 * aber kein PUBLISH. SICHERER STANDARD (SETZUNG, der Besitzer entscheidet): Wickelunterlagen (Babyprodukt), 3D-Stifte (Kinder, heisse Düse, Netzteil), Kinderuhren (Knopfzelle),
 * Motorradhelm-Headsets (Funk-Konformität). Dazu jedes Zielblatt, dessen Spalte «risiko» oder «auflage» Baby, Kind oder Knopfzelle nennt — gleichgültig, was die Welle in der Datei sagt.
 */
export const HANDPRUEFUNG_ZIELE = Object.freeze({ wickelunterlagen: 'Babyprodukt', '3dstifte': 'Kinderprodukt-Sicherheit (heisse Düse, Netzteil)', kinderuhren: 'Knopfzelle (Kinder-Sicherheit)', motorradheadset: 'Funk-Konformität' });
export const HANDPRUEFUNG_RISIKO_RE = /baby|kinder|knopfzelle/i;
export const istHandpruefung = z => !!HANDPRUEFUNG_ZIELE[z?.id] || HANDPRUEFUNG_RISIKO_RE.test(`${z?.risiko ?? ''} ${z?.auflage ?? ''}`);
const welleCode = z => (istHandpruefung(z) ? 'R' : text(z?.welle).charAt(0).toUpperCase());

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
/** Erstes Sperrwort im englischen CJ-Namen (Waffe, Erwachsene, Tabak, Lizenzfigur, Steckdosen-Ware, Fremdstecker, heikle Ware, Kinderware) oder null. */
export function sperrwort(name) {
  const n = String(name ?? '');
  const treffer = (s, re, art, gruppe = 0) => { const x = s.match(re); return x ? `${art} «${text(x[gruppe]).slice(0, 30)}»` : null; };
  // Auto-Zigarettenanzünder ist ein Steckplatz, kein Tabak (wie in planeNeu)
  const ohneAnzuender = n.replace(new RegExp(ANZUENDER_RE.source, 'gi'), ' ');
  return treffer(n, WAFFEN, 'Waffe') || treffer(n, ERWACHSENE_RE, 'Erwachsene', 2) || treffer(ohneAnzuender, TABAK_RE, 'Tabak', 2)
    || treffer(n, LIZENZ, 'Lizenz') || treffer(n, STECKDOSE_EN_RE, 'Steckdose')
    || (fremdsteckerImNamen(n) ? 'Fremdstecker/110 V' : null) || (heikelWort(n) ? `heikel «${heikelWort(n)}»` : null)
    || (zusatzSperrwort(n) ? `heikel «${zusatzSperrwort(n)}»` : null) || (kinderWort(n) ? `Kinderware «${kinderWort(n)}»` : null);
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
 * Regel: nennt die WARE des deutschen Titels (die Kernphrase vor «mit/für/aus …») oder das Kopfwort des englischen CJ-Namens ein Zubehörwort, der Google-Pfad aber kein Zubehör, ist die
 * Einordnung unsicher → nicht anlegen. Falsch-Positive kosten einen Kandidaten (zurückgestellt), Falsch-Negative eine falsch einsortierte Kategorieseite: die Regel ist streng, aber nicht blind.
 * GEMESSEN 27.10.2026 an 2 223 Shop-Produkten mit Datenblatt: die erste Fassung (ganzer Titel, jedes englische Wort) löste bei 36 aus, darunter Fehlalarme für Kissenbezug («Pillow Cover»),
 * «Kondensator-Mikrofon mit Stativ» (Beigabe), «Beamer mit PTZ-Halterung»; die jetzige bei 11, und die Fälle der Probe fallen weiter durch.
 *  · Deutsch: Zubehörwort nur am Wortende (Zusammensetzungen wie «Kameraabdeckung» zählen, «Ständerlampe» nicht) und nur in der Kernphrase, nicht in einer Beigabe nach «mit».
 *  · Englisch: nur das LETZTE Wort des Kopfglieds vor «for/with/of/and» («Pillow Cover» ja, «Microphone with Stand» nein), und nicht, wenn der deutsche Titel sagt, dass die Ware selbst
 *    ein Bezug/Deckel/Notizbuch ist («Kissenbezug», «Bettbezug», «Sammelkarten», «Notizbuch», «Deckel»).
 * «Zubehör» selbst steht NICHT in der Liste (Küchenzubehör ist ein Hauptprodukt mit allgemeinem Pfad).
 */
export const ZUBEHOER_DE_RE = /(abdeckung|abdeckkappe|schutzfolie|halterung|ständer|stativ|aufkleber|sticker|schieber|adapter|ersatz(?:teil)?|wischtuch|wischtücher|etui|objektivdeckel)(?![a-zäöüß])/i;
export const ZUBEHOER_EN_KOPF_RE = /^(covers?|cases?|holders?|stands?|mounts?|brackets?|stickers?|protectors?|sleeves?|replacements?|tripods?|adapters?)$/;
export const KEIN_ZUBEHOER_DE_RE = /kissen(?:bezug|bezüge|hülle|hüllen)|bettbezug|bezug|sammelkarten|notizbuch|deckel/i;
export const ZUBEHOER_PFAD_RE = /Accessor|Parts|Cases|Covers|Holders|Stands|Mounts|Bags|Straps|Adapters|Replacement|Stickers|Cleaning|Tripods|Brackets|Protectors/i;
const kopfEn = name => { const w = String(name ?? '').split(/\s+(?:for|with|of|and)\s+/i)[0].trim().split(/\s+/); return (w[w.length - 1] || '').toLowerCase(); };
export function zubehoerKonflikt({ titel = '', cjName = '', pfad = '' } = {}) {
  if (!pfad || ZUBEHOER_PFAD_RE.test(pfad)) return null;
  const de = kernPhrase(titel).match(ZUBEHOER_DE_RE);
  const enWort = kopfEn(cjName), en = ZUBEHOER_EN_KOPF_RE.test(enWort) && !KEIN_ZUBEHOER_DE_RE.test(titel) ? enWort : null;
  const wort = de ? de[1] : en;
  return wort ? { wort: wort.toLowerCase(), quelle: de ? 'Titel' : 'CJ-Name' } : null;
}

/** Die Waise eines abgestürzten Grind-Laufs: DRAFT mit der Rücknahme-Marke `grind2` (der Index trägt die Marken grind2…, siehe bulkSammler). */
export const istWaise = p => p?.status === 'DRAFT' && Array.isArray(p.tags) && p.tags.includes('grind2');
/**
 * istDublette, mit einer Ausnahme: sind ALLE harten Treffer Waisen eines früheren Grind-Laufs (Shop-Treffer, jedes getroffene Produkt DRAFT mit Tag grind2, kein Ledger-Treffer), ist der Kandidat keine
 * Dublette, sondern ein halb erledigter Vorgang (productSet kam an, die Ledger-Zeile nicht): anlegen() übernimmt die Waise statt sie zu verdoppeln. GEMESSEN 27.10.2026 (Gegenlesung): vor jedem LIVE-Lauf läuft
 * grind_skus_lesen, die Waise steht also IMMER im frischen Index — ohne diese Ausnahme sperrte der Vorfilter sie als «Dublette», ohne Ledger-Zeile und ohne Hinweis, und das DRAFT-Produkt blieb für immer ungeprüft.
 * Ein Ledger-Treffer (GESCHRIEBEN, UEBERSPRUNGEN …) bleibt eine Dublette: dann kennt der Lauf das Produkt schon.
 */
export function dublettenUrteil(kandidat, ix, opt = {}) {
  const d = istDublette(kandidat, ix, opt);
  if (!d.dublette) return { ...d, waise: false };
  const harte = d.treffer.filter(t => t.staerke === 'hart');
  const nurWaisen = harte.length > 0 && harte.every(t => t.quelle === 'shop' && Array.isArray(t.produkte) && t.produkte.length > 0 && t.n === t.produkte.length && t.produkte.every(istWaise));
  if (!nurWaisen) return { ...d, waise: false };
  const w = harte[0].produkte[0];
  return { ...d, dublette: false, waise: true, waisen: eindeutig(harte.flatMap(t => t.produkte.map(p => p.handle))), grund: `Waise eines früheren Laufs im Shop (${w.handle}, DRAFT, Tag grind2): wird übernommen statt verdoppelt` };
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
    const d = dublettenUrteil({ pid, productSku: t.productSku, titel: name }, index);
    if (d.dublette) return { nehmen: false, grund: 'dublette', detail: d.grund, treffer: d.treffer };
    if (d.waise) return { nehmen: true, grund: 'kandidat', pid, name, u, waise: d.waisen };
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
    if (r.nehmen) { durch.push({ t, pid: r.pid, name: r.name, u: r.u, ...(r.waise ? { waise: r.waise } : {}) }); continue; }
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
  if (FREMDLINK_RE.test(t)) probleme.push('Link oder E-Mail im Titel');
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
  const kosten = preise.varianten.filter(v => v.ok).map(v => v.kosten);      // weggelassene Varianten (ok:false) zählen nicht
  if (!kosten.length) return { ok: false, grund: 'keine Variante mit gültigem Preis', frist: 'zurueckgestellt' };
  const einstand = Math.min(...kosten);
  if (einstand < cfg.minEinstand) return { ok: false, grund: `Einstand ${einstand.toFixed(2)} CHF unter ${cfg.minEinstand.toFixed(2)} CHF: die Preisuntergrenze wäre ein Vielfaches des Einstands, am Markt nicht haltbar`, frist: 'zurueckgestellt' };
  // Hartes Margen-Tor: unter MARGE_HART (25 %) wird nie angelegt; eine nicht lesbare Marge zählt als zu klein (nie raten). Die Flagge marge_unter_30 warnt weiter im Kontaktbogen.
  if (!(preise.margeMin >= MARGE_HART - 1e-9)) return { ok: false, grund: `Bruttomarge ${Number.isFinite(preise.margeMin) ? (preise.margeMin * 100).toFixed(1) + ' %' : 'unbekannt'} unter ${MARGE_HART * 100} %`, frist: 'zurueckgestellt' };
  if ((preise.flaggen || []).includes('kurs_ungewoehnlich')) return { ok: false, grund: 'Kurs ausserhalb 0,6–1,2: Preise und unitCost wären falsch', frist: 'zurueckgestellt' };
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

/** Jüngster Zeitstempel (2. Feld, ISO) eines Ledger-Textes in Millisekunden; 0 = keine lesbare Zeile. */
export function ledgerNeuesterStand(text) {
  let m = 0;
  for (const z of String(text ?? '').split('\n')) { const t = Date.parse(z.split(' · ')[1]); if (Number.isFinite(t) && t > m) m = t; }
  return m;
}

/**
 * Welcher Stand des Auswahl-Ledgers zählt? Der Verbrauch des Auswahl-Laufs steht NUR in dessen Ledger (dropship/cj_varianten_ledger.txt); es wird nachts angehängt und nur gelegentlich
 * eingecheckt. Ein veralteter Arbeitsbaum zählt ihn zu niedrig (GEMESSEN 27.10.2026: Arbeitsbaum 88, Hauptrepo 4 508 Varianten in 24 h) und macht die Gesamtgrenze blind.
 * Gewählt wird der Kandidat mit dem JÜNGSTEN Eintrag (das Ledger wird nur angehängt: der jüngste ist der vollständigste); bei Gleichstand der längere Text.
 * @param {{quelle:string, text:string}[]} kandidaten  @returns {{quelle:string, text:string, stand:number, alleQuellen:{quelle:string, stand:number}[]}}
 */
export function auswahlLedgerWaehlen(kandidaten) {
  const liste = (kandidaten || []).map(k => ({ ...k, stand: ledgerNeuesterStand(k.text) }));
  const beste = [...liste].sort((a, b) => b.stand - a.stand || String(b.text).length - String(a.text).length)[0] || { quelle: '', text: '', stand: 0 };
  return { quelle: beste.quelle, text: beste.text, stand: beste.stand, alleQuellen: liste.map(k => ({ quelle: k.quelle, stand: k.stand })) };
}

/** `sort-…`-Tags, auf die im Shop wirklich eine Smart-Collection filtert (ruleSet.rules: Spalte TAG, Beziehung EQUALS). Ein Tag ohne Collection führt auf keine Kategorieseite. */
export function liveSortTags(collections) {
  const s = new Set();
  for (const c of collections || []) for (const r of c?.ruleSet?.rules || []) if (r.column === 'TAG' && r.relation === 'EQUALS' && /^sort-/.test(r.condition)) s.add(r.condition);
  return s;
}
/** Trägt mindestens eines der Tags eine live Collection? */
export const hatLiveCollection = (sortTags, live) => (sortTags || []).some(t => live.has(t));

/**
 * Version des Plan-Zwischenspeichers = Hash der Dateien, die einen Plan bestimmen, und der Einstellungen, die in ihn eingehen. Ein Plan mit anderer Version wird nie wiederverwendet:
 * GEMESSEN 27.10.2026 lagen noch Pläne vor einer Korrektur im Speicher (englischer Fakten-Block, Titel mit «mit Mikrofon», das im Datenblatt fehlt) und hätten sie bis zu 3 Stunden überlebt.
 */
export function planVersion(inhalte) { return createHash('sha1').update(inhalte.map(x => String(x)).join('\u0000')).digest('hex').slice(0, 12); }
export const planGueltig = (plan, version) => !!plan && plan.v === version;
/**
 * Alle Dateien, die einen Plan bestimmen: grind2.mjs und der Abschluss ALLER relativen Importe (Sperrlisten wie kategorien/gmc_feed_item/top_kandidaten/stecker_cj, Preisregel, Fracht, Dubletten, Übersetzung, Titel …)
 * samt den JSON-Dateien, die sie neben sich lesen (`new URL('./x.json', import.meta.url)`). GEMESSEN 27.10.2026 (Gegenlesung): die handgepflegte Liste kannte 10 von 22 Dateien — eine verschärfte Sperrliste
 * (WAFFEN, SPERR_TAGS, RISIKO, LIZENZ, Stecker, Preisrundung) änderte die Planversion NICHT, und ein Plan aus der Probe galt noch 3 Stunden mit der alten Regel.
 * @returns {string[]} absolute Pfade, sortiert
 */
export function planDateien(start = fileURLToPath(import.meta.url), lies = p => readFileSync(p, 'utf8')) {
  const importRe = /\b(?:import|export)\b[^'";]*?\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]|\bimport\s+['"](\.{1,2}\/[^'"]+)['"]/g, jsonRe = /new URL\(\s*['"](\.{1,2}\/[^'"]+\.json)['"]\s*,\s*import\.meta\.url/g;
  // Datendateien, die über eine Vorlage-URL gelesen werden (`new URL(`../../dropship/x/${n}`, import.meta.url)` mit `lies('ALLES.json')`): jede im selben Text genannte *.json-Datei hinter dem festen Vorlagenanfang
  const vorlageRe = /new URL\(\s*`([^`$]*)\$\{[^}`]*\}[^`]*`\s*,\s*import\.meta\.url/g, jsonNameRe = /['"]([\w.-]+\.json)['"]/g;
  const gesehen = new Set(), offen = [resolve(start)];
  while (offen.length) {
    const f = offen.pop();
    if (gesehen.has(f)) continue;
    let t; try { t = lies(f); } catch { continue; }          // unlesbar/fehlend: nicht aufnehmen (ein fehlender Import fällt beim Laden ohnehin auf)
    gesehen.add(f);
    if (!f.endsWith('.mjs')) continue;
    for (const re of [importRe, jsonRe]) { re.lastIndex = 0; let m; while ((m = re.exec(t))) offen.push(resolve(dirname(f), m[1] || m[2])); }
    vorlageRe.lastIndex = 0; let v;
    while ((v = vorlageRe.exec(t))) { jsonNameRe.lastIndex = 0; let n; while ((n = jsonNameRe.exec(t))) offen.push(resolve(dirname(f), v[1] + n[1])); }
  }
  return [...gesehen].sort();
}
function codeStand() {
  try { const wo = dirname(fileURLToPath(import.meta.url)); return planDateien().map(f => `${relative(wo, f)}\u0001${readFileSync(f, 'utf8')}`); }     // relativ: derselbe Stand in einem anderen Verzeichnis ergibt dieselbe Version
  catch { return [`unlesbar-${Date.now()}-${Math.random()}`]; }       // Code nicht lesbar: eine Version, die nie wieder vorkommt (kein Plan wird wiederverwendet)
}
const CODE_STAND = codeStand();
/** Einstellungen, die in einen Plan eingehen (Kurs, Aufschlag, Preisgrenzen, Fracht und Lieferzeit, Variantenzahl …): ändert sich eine, ist der alte Plan ungültig. */
export function planSchluessel(cfg) {
  const e = { kurs: cfg.kurs, aufschlag: cfg.aufschlag, preisMin: cfg.preisMin, preisMinMode: cfg.preisMinMode, maxPreis: cfg.maxPreis, minEinstand: cfg.minEinstand, maxTage: cfg.maxTage,
    frachtKlassen: cfg.frachtKlassen, bestandPruefen: cfg.bestandPruefen, sensitivAusweg: cfg.sensitivAusweg, maxVarianten: cfg.maxVarianten, minBilder: cfg.minBilder, duennOk: cfg.duennOk, bildHash: cfg.bildHash };
  return planVersion([...CODE_STAND, JSON.stringify(e)]);
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
export function toreNachAnlage(eingabe, p, { minBilder = MIN_BILDER, nachFreigabe = false, streng = false } = {}) {
  const tore = [];
  const tor = (name, ok, grund = '') => tore.push({ name, ok, grund: ok === true ? '' : grund });
  if (!p) return { ok: false, offen: false, tore: [{ name: 'produkt', ok: false, grund: 'Produkt nicht mehr da' }] };
  tor('status', nachFreigabe ? p.status === 'ACTIVE' : p.status === 'DRAFT', `Status ${p.status}`);
  tor('handle', p.handle === eingabe.handle, `Handle «${p.handle}» statt «${eingabe.handle}» (Shopify hängt bei Kollision eine Zahl an)`);
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
  if (streng) {
    // Ein übernommener Entwurf (Waise eines abgestürzten Laufs) ist kein Beweis, dass er dem heutigen Plan entspricht: eine ältere Codefassung kann ihn mit englischem Rest und E-Mail-Adresse im Text, mit weniger Bildern
    // oder anderer Produktart angelegt haben (Gegenlesung 27.10.2026: so wäre er mit altem Text veröffentlicht worden, weil die Tore oben nur Marker und 150 Zeichen prüfen). Beschreibung, Medien und Produktart müssen dem Plan gleichen.
    const klar = h => htmlZuText(String(h ?? ''));
    const sollBeschr = String(eingabe.descriptionHtml ?? '');
    const markerGleich = [...TEXT_MARKER, VAR_MARKER].every(m => beschr.includes(m) === sollBeschr.includes(m));
    tor('beschreibung-wie-geplant', markerGleich && klar(beschr) === klar(sollBeschr), 'Beschreibung weicht vom Plan ab (andere Codefassung des früheren Laufs?)');
    tor('medien-wie-geplant', medien.length === (eingabe.files || []).length, `${medien.length} Medien im Shop, ${(eingabe.files || []).length} im Plan`);
    tor('produktart-wie-geplant', String(p.productType ?? '') === String(eingabe.productType ?? ''), `Produktart «${p.productType ?? ''}» statt «${eingabe.productType ?? ''}»`);
  }
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
    l.push(`| ${i + 1} | ${bild} | ${zelle(r.titel || r.titelEn)} | ${zelle(r.zielName)} / ${zelle(r.blatt)} | ${spanne(r.einstandMin, r.einstandMax)} | ${r.frachtMin != null && r.frachtMin !== r.frachtUsd ? `${chf(r.frachtMin)}–${chf(r.frachtUsd)}` : chf(r.frachtUsd)}${r.frachtLinie ? ` (${zelle(r.frachtLinie)})` : ''} | ${spanne(r.preisMin, r.preisMax)}${(r.preisFlaggen || []).filter(f => f !== 'spanne').length ? ` ⚑ ${zelle(r.preisFlaggen.filter(f => f !== 'spanne').join(', '))}` : ''} | ${marge} | ${r.varianten ?? '–'}${r.optionen ? ` (${zelle(r.optionen)})` : ''} | ${zelle(r.google) || '–'}${r.googleSicherheit ? ` [${r.googleSicherheit}${r.vertrauen != null ? ` ${Math.round(r.vertrauen * 100)} %` : ''}]` : ''}${r.productType ? ` · Typ ${zelle(r.productType)}` : ''} | ${zelle((r.sortTags || []).join(', ')) || '–'} | ${tore} | ${zelle(r.entscheid)}${r.hinweis ? ` — ${zelle(r.hinweis)}` : ''} |`);
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
 * Bestand je Variante aus getInventoryByPid: Summe von `totalInventory` (= CJ-Lager + Lieferant) über die Zeilen des CN-LAGERS — die Fracht wird ab CN gerechnet und der Vorfilter verlangt ein
 * CN-Lager, Bestand in DE hilft einer Bestellung ab CN nicht. Die Antwort nennt auch vids, die product/query nicht kennt (GEMESSEN 26.10.2026: 9 statt 6) — darum je vid, nie die Summe über das Produkt.
 * UNBEKANNT ist nie 0: eine vid ohne CN-Zeile oder mit nicht lesbarer Zahl fehlt in der Tabelle (der Aufrufer behält die Variante), und eine unlesbare Form ergibt null (kein Urteil).
 * Bestand beweist keine Lieferbarkeit (die entscheidet die Fracht), aber 0 bei CJ UND beim Lieferant im CN-Lager ist ein klares Nein.
 * @returns {Map<string, number>|null}
 */
export function bestandJeVid(antwort) {
  const liste = antwort?.data?.variantInventories;
  if (!Array.isArray(liste)) return null;
  const m = new Map();
  for (const v of liste) {
    if (!v || typeof v.vid !== 'string' || !Array.isArray(v.inventory)) continue;
    const cn = v.inventory.filter(l => l && l.countryCode === 'CN');
    if (!cn.length) continue;
    const zahlen = cn.map(l => (l.totalInventory === null || l.totalInventory === undefined || l.totalInventory === '' ? NaN : Number(l.totalInventory)));
    if (zahlen.some(z => !Number.isFinite(z))) continue;
    m.set(v.vid, zahlen.reduce((x, z) => x + Math.max(0, z), 0));
  }
  return m;
}

/**
 * CJ-Zugriff mit Punkte-Buchführung. Jeder Aufruf: eigene Obergrenze (punkteMax) und Reserve (GRIND_RESERVE) VOR dem Aufruf prüfen, `pointsInfo` NACH dem Aufruf lesen, 1,2 s Pause.
 * Die Kosten sind die gemessenen Listenpreise (KOSTEN); der tatsächliche Verbrauch steht in stand.remaining (enthält fremden Verbrauch auf demselben Konto).
 */
export function cjClient({ token, fetch: fetchFn, warte, stand = {}, reserve = 0, punkteMax = Infinity, pauseMs = PAUSE_MS, basisMs, klassenMax = 1 } = {}) {
  const z = { punkte: 0, aufrufe: {} };
  const wartet = warte || schlafen;
  const pruefe = (art, kosten) => {
    if (z.punkte + kosten > punkteMax) throw new Error(`CJ_BUDGET: eigene Punktegrenze ${punkteMax} erreicht (${art}, bisher ${z.punkte})`);
    if (reserve > 0 && Number.isFinite(stand.remaining) && stand.remaining - kosten < reserve) throw new Error(`CJ_RESERVE: nur noch ${stand.remaining} Punkte, Reserve ${reserve} bleibt unangetastet (${art})`);
  };
  const buche = (art, kosten) => { z.punkte += kosten; z.aufrufe[art] = (z.aufrufe[art] || 0) + 1; };
  async function rufe(art, url, kosten, extra = {}) {
    pruefe(art, kosten);
    // CJ meldet die Sekunden-Drosselung (1600200) und leere Punkte (16900500) teils als HTTP 200 mit result:false → cjFetch wirft «CJ_API … code=…».
    // Das ist KEIN Fehler des Produkts: zweimal kurz warten, dann den ganzen Lauf beenden (Exit 3) statt jedes Produkt als FEHLER abzuhaken (Altwerkzeuge prüfen j.code === 1600200).
    let a;
    for (let versuch = 0; ; versuch++) {
      try { a = await cjFetch(url, { context: art, headers: { 'CJ-Access-Token': token }, fetch: fetchFn, warte: wartet, basisMs, ...extra }); break; }
      catch (e) {
        const m = String(e.message);
        if (/^CJ_API.*code=16900500\b/.test(m)) throw new Error(`CJ_QUOTA: code=16900500 (${art})`);
        if (/^CJ_API.*code=1600200\b/.test(m)) {
          if (versuch >= 2) throw new Error(`CJ_THROTTLED: code=1600200 bleibt bestehen (${art})`);
          await wartet(2500 * (versuch + 1)); continue;
        }
        throw e;
      }
    }
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
    /** Lager je Variante (getInventoryByPid, 10 Punkte; die Antwort hat KEIN `result`-Feld, nur `success`/`code` → lib/cj_response.mjs lässt das zu). Liefert auch fremde vids: je vid auswerten (bestandJeVid). */
    bestand: pid => rufe('bestand', `${CJ_BASE}/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`, KOSTEN.bestand, { weicheCodes: WEICHE_CODES, erfolgOhneResult: true }),
    einstellungen: () => rufe('einstellungen', `${CJ_BASE}/setting/get`, 0),
    /**
     * Fracht CN→CH für EIN Produkt: die schwerste Variante, bei 0 Linien zusätzlich die leichteste, bei breiter Gewichtsspanne bis zu `klassenMax` Gewichtsklassen (lib/cj_fracht.mjs).
     * Die Punktegrenze und die Reserve werden VOR dem ersten Aufruf für die ganze Messung geprüft (n × 10 Punkte, mindestens 2 × 10 wie bisher).
     */
    async fracht(varianten) {
      pruefe('fracht', Math.max(2, messPlan(varianten, { klassenMax }).length) * FRACHT_PUNKTE);
      const r = await frachtProdukt({ varianten, token, fetch: fetchFn, warte: wartet, stand, reserve, pauseMs, basisMs, klassenMax });
      const n = Array.isArray(r.gemessen) ? r.gemessen.length : 0;
      z.punkte += n * FRACHT_PUNKTE; z.aufrufe.fracht = (z.aufrufe.fracht || 0) + n;
      return r;
    },
  };
}

/**
 * Die Groq-Schlüssel: bis zu drei (GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3 — wie nachDeutsch in lib/uebersetzen.mjs der Hauptlinie); jeder hat sein eigenes Tageslimit (GEMESSEN 27.10.2026: 1000 Anfragen
 * je Modell und Tag). Ein ausdrücklich übergebener Schlüssel (`groqKey`, auch '') ersetzt die Umgebung.
 */
export function groqSchluessel({ groqKey, env = process.env } = {}) {
  const roh = groqKey !== undefined ? [groqKey] : [env.GROQ_API_KEY, env.GROQ_API_KEY2, env.GROQ_API_KEY3];
  return [...new Set(roh.map(k => String(k ?? '').trim()).filter(Boolean))];
}
/** Ein Aufruf, der JSON liefern muss: Gemini, sonst Groq (alle Schlüssel nacheinander, wie cj_fakten_block.mjs, dort nicht exportiert). {o:null} = alle ohne brauchbare Antwort. */
export async function modellJson(prompt, { fetch: fetchFn, geminiKey, groqKey, env = process.env } = {}) {
  const gk = String(geminiKey ?? env.GEMINI_API_KEY ?? '').trim(), qks = groqSchluessel({ groqKey, env });
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
  for (const [nr, qk] of qks.entries()) {
    for (const modell of GROQ_MODELLE) {
      try {
        const r = await fetchFn('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${qk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modell, temperature: 0, messages: [{ role: 'user', content: prompt }] }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { const o = lies(j?.choices?.[0]?.message?.content); if (o) return { o, weg: 'groq' }; gruende.push(`Groq ${nr + 1} ${modell}: Antwort nicht lesbar`); }
        else gruende.push(`Groq ${nr + 1} ${modell} HTTP ${r.status}`);
      } catch (e) { gruende.push(`Groq ${nr + 1} ${modell}: ${e.message}`); }
    }
  }
  return { o: null, weg: 'keins', gruende };
}

/**
 * Gesamtgrösse einer Bild-Antwort in Byte oder null (= unbekannt). `Content-Range: bytes 0-0/202913` nennt die Gesamtgrösse einer Bereichsanfrage; `content-length` gilt nur bei einer ganzen
 * Antwort (HEAD oder 200). `Number(null)` wäre 0: «keine Angabe» ist nie «0 Byte» (so hätte die 20-MB-Grenze am CJ-Bild-CDN nie gegriffen).
 */
export function bildGroesse(headers, { ganz = true } = {}) {
  const cr = /\/(\d+)\s*$/.exec(headers?.get?.('content-range') || '');
  if (cr) return Number(cr[1]);
  const cl = headers?.get?.('content-length');
  if (!ganz || cl === null || cl === undefined || String(cl).trim() === '') return null;
  const n = Number(cl);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Bild-URLs auf HTTP 200 prüfen (Bild-Falle: `quick/product/…` liefert teils 404; ein Zeitfehler ist KEIN 404). HEAD, bei 400/403/405/501 ein GET mit Range.
 * Shopify nimmt Bilder nur bis 20 MB. GEMESSEN 27.10.2026: das CJ-Bild-CDN (cf./oss-cf.cjdropshipping.com) sendet bei HEAD KEIN content-length (13 von 13 Bildern); die Gesamtgrösse steht nur im Content-Range
 * einer Bereichsanfrage. Darum folgt auf ein HEAD ohne Grösse eine Anfrage `Range: bytes=0-0` (ein Byte). Bleibt die Grösse auch dann unbekannt, fängt das Tor «medien-fehlerfrei» ein zu grosses Bild nach dem Anlegen.
 * @returns {{ok:Set<string>, schlecht:Map<string,string>}}
 */
export async function bilderPruefen(urls, { fetch: fetchFn, parallel = 6, timeoutMs = 15000 } = {}) {
  const ok = new Set(), schlecht = new Map();
  const liste = eindeutig(urls.map(text).filter(Boolean));
  const mitZeit = init => { if (typeof AbortSignal?.timeout === 'function') init.signal = AbortSignal.timeout(timeoutMs); return init; };
  const eins = async u => {
    for (const methode of ['HEAD', 'GET']) {
      try {
        const init = mitZeit({ method: methode, redirect: 'follow', headers: methode === 'GET' ? { Range: 'bytes=0-1023' } : {} });
        const r = await fetchFn(u, init);
        try { await r.body?.cancel?.(); } catch { /* egal */ }
        if (r.status === 200 || r.status === 206) {
          const ct = r.headers?.get?.('content-type') || '';
          // Shopify nimmt als Bild nur PNG, GIF, JPEG, WEBP, HEIC bis 20 MB (Doku «Manage media», 4472 × 4472 px nicht prüfbar ohne Download): alles andere würde als FAILED-Medium enden.
          if (ct && !/^image\/(jpe?g|png|gif|webp|heic)\b/i.test(ct)) { schlecht.set(u, `kein Bild (${ct.slice(0, 30)})`); return; }
          let laenge = bildGroesse(r.headers, { ganz: methode === 'HEAD' || r.status === 200 });
          if (laenge === null && methode === 'HEAD') {
            try {
              const g = await fetchFn(u, mitZeit({ method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-0' } }));
              try { await g.body?.cancel?.(); } catch { /* egal */ }
              laenge = bildGroesse(g.headers, { ganz: g.status === 200 });
            } catch { /* nicht prüfbar: das Tor «medien-fehlerfrei» fängt es nach dem Anlegen (Produkt bleibt DRAFT) */ }
          }
          if (laenge !== null && laenge > 20 * 1024 * 1024) { schlecht.set(u, `zu gross (${Math.round(laenge / 1048576)} MB, Shopify: höchstens 20 MB)`); return; }
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
export const EN_STOFF_RE = /(^|[^a-zäöüß])(metal|wood|glass|rubber|iron|copper|ceramic|paper|alloy|aluminum|brass|zinc|resin|silicone|foam|fabric|canvas|acrylic|crystal|velvet|cloth|felt|linen|bamboo|stone|titanium|fiber)(?![a-zäöüß])/i;
export const FREMDLINK_RE = /(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[a-z]{2,}|(?:^|[^a-z0-9-])[a-z0-9-]{2,}\.(?:com|net|org|ch|de|cn|shop|store|info|biz|ru|xyz)(?:[^a-z]|$))/i;
export const istEnglisch = t => EN_AUSGABE_RE.test(String(t)) || EN_FUNKTION_RE.test(String(t)) || EN_STOFF_RE.test(String(t));
export function faktenSprachfilter(s) {
  const verworfen = [...(s?.verworfen || [])];
  const behalte = (liste, f) => (liste || []).filter(x => { const t = f(x); if (FREMDLINK_RE.test(String(t))) { verworfen.push(`Link/E-Mail: ${String(t).slice(0, 50)}`); return false; } if (istEnglisch(t)) { verworfen.push(`englischer Rest: ${String(t).slice(0, 50)}`); return false; } return true; });
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
  // Der Host wird geprüft, BEVOR client_id und client_secret irgendwohin gehen (normalizeShopifyHost: nur reine *.myshopify.com-Domains, sonst wirft es).
  const shop = normalizeShopifyHost(io.shop || env.SHOPIFY_SHOP);
  let tok = io.shopToken;
  if (!tok) {
    if (!shop || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw new Error('Kein Shopify-Zugang (SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET)');
    const r = await fetchFn(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
    tok = (await r.json().catch(() => ({})))?.access_token;
    if (!tok) throw new Error('Kein Shopify-Token (Client-Credentials-Grant lieferte keinen access_token)');
  }
  return (q, v, opt = {}) => shopifyGql(shop, API_VERSION, tok, q, v, { fetch: fetchFn, warte: io.warte, basisMs: io.basisMs, ...opt });
}

// ───────────────────────── GraphQL-Texte (alle gegen den Shop gelesen bzw. gegen das Schema geprüft, 27.10.2026)
const SKU_ABFRAGE = `query($q:String!){ products(first:3, query:$q){ nodes{ id handle status tags variantsCount{count} } } }`;
const HANDLE_ABFRAGE = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle status tags variantsCount{count} } }`;
const KANAL_REFERENZ = `query{ products(first:8, query:"status:active tag:cj-real", sortKey:CREATED_AT, reverse:true){ nodes{ id resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished publication{ id } } } } } }`;
const TAGS_ADD = `mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{ field message } } }`;
const STATUS_SETZEN = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id status } userErrors{ field message } } }`;
const VEROEFFENTLICHEN = `mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id, input:$p){ userErrors{ field message } } }`;
/** Status frisch lesen: eine Rücknahme auf DRAFT gilt nur, wenn der Shop DRAFT zurückliest (keine userErrors ist kein Beweis). */
export const STATUS_LESEN = `query($id:ID!){ product(id:$id){ id status } }`;
/**
 * Aufräumen nach einem Absturz zwischen ACTIVE und publishablePublish: aktive Produkte mit der Rücknahme-Marke grind2 und ohne veröffentlichten Kanal.
 * Das Tag grind2 bleibt auf veröffentlichten Produkten dauerhaft stehen (kein tagsRemove). Darum NEUESTE ZUERST (UPDATED_AT, absteigend: ein frischer Absturz-Rest steht vorn) UND mit Seitenwechsel:
 * die Standardsortierung ist ID aufsteigend, ab 50 aktiven Grind-Produkten läge ein Rest sonst hinter der Grenze und würde nie zurückgenommen (Endprüfung 27.10.2026).
 */
export const AKTIV_OHNE_KANAL = `query($after:String){ products(first:50, after:$after, query:"tag:grind2 status:active", sortKey:UPDATED_AT, reverse:true){ nodes{ id handle status tags resourcePublicationsV2(first:20, onlyPublished:true){ nodes{ isPublished } } } pageInfo{ hasNextPage endCursor } } }`;
/** Höchstens so viele Seiten (je 50 Produkte) liest das Aufräumen; liegt danach noch eine weitere vor, meldet der Lauf es als Hinweis (nie still). */
export const AKTIV_OHNE_KANAL_SEITEN = 20;
/** Shopify-Antworten, die sicher NICHT bearbeitet wurden (Drossel): eine Wiederholung ist gefahrlos. */
export const SHOPIFY_DROSSEL_RE = /GraphQL: HTTP 429|throttled|exceeded.*cost|rate limit/i;
/** Fehler, bei denen die Anfrage angekommen sein KANN (Netz, 5xx, unlesbare Antwort): vor jeder Wiederholung erst nachsehen. */
export const SHOPIFY_UNKLAR_RE = /^GraphQL: (?:fetch:|HTTP 5\d\d|Antwort nicht lesbar)/;
/** Zeitlimit für productSet: synchron mit bis zu 40 Varianten und 13 Dateien (noch nie real gelaufen: UNBEKANNT, wie lange das dauert; die 30 s der Abfragen wären knapp). */
export const PRODUCT_SET_ZEIT_MS = 120000;
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
/** Smart-Collections mit ihren Regeln (nur lesen): welche `sort-…`-Tags filtert im Shop wirklich eine Collection? 921 Collections = 4 Seiten. */
export const LIVE_SORT_ABFRAGE = `query($after:String){ collections(first:250, after:$after, query:"collection_type:smart"){ nodes{ ruleSet{ rules{ column relation condition } } } pageInfo{ hasNextPage endCursor } } }`;

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
/**
 * Sperrdatei (O_EXCL): höchstens ein LIVE-Lauf je Ledger. Der Besitzer meldet sich mit einem HERZSCHLAG (`herz`, alle SPERRE_HERZ_INTERVALL_MS neu geschrieben, solange sein Prozess lebt): eine Sperre,
 * deren letzter Herzschlag länger als `maxAlterMs` zurückliegt, gilt als Überrest eines abgestürzten Laufs. GEMESSEN 26.10.2026: die Umgebung wird etwa alle 25 Minuten neu gestartet (Prozesse sterben,
 * /tmp bleibt) — eine reine Altersgrenze von 3 Stunden hätte den Folgelauf dann stundenlang ausgesperrt, und umgekehrt einen langen, lebenden Lauf (LIMIT bis 500) nach 3 Stunden freigegeben.
 * Ohne Feld `herz` (Sperre aus der Zeit davor) zählt `seit`.
 */
export const SPERRE_HERZ_MAX_MS = 15 * 60 * 1000, SPERRE_HERZ_INTERVALL_MS = 60 * 1000;
/** Synchrone Pause (die Sperre wird synchron geholt): Atomics.wait auf einem eigenen Puffer, ohne Last und ohne Zeitgeber. */
const kurzPause = ms => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* ohne Pause weiter: schlimmstenfalls ein Versuch weniger */ } };
export const SPERRE_NACHLESEN_MS = 50;
/**
 * `pause` ist austauschbar, damit der Test den Zeitpunkt des zweiten Lesens bestimmt. Eine UNLESBARE Sperrdatei (leer, halb geschrieben) zählt erst nach einem zweiten Lesen
 * nach SPERRE_NACHLESEN_MS als Überrest: wer gerade schreibt, hat sie für einen Augenblick leer gesehen (gemessen 27.10.2026: 214 618 unlesbare von 417 180 Lesungen bei nicht atomarem Schreiben).
 */
export function sperreHolen(pfad, jetzt = Date.now(), maxAlterMs = SPERRE_HERZ_MAX_MS, pause = kurzPause) {
  const lesen = () => { try { return JSON.parse(readFileSync(pfad, 'utf8')); } catch { return null; } };
  for (let versuch = 0; versuch < 2; versuch++) {
    try { const fd = openSync(pfad, 'wx'); writeSync(fd, JSON.stringify({ pid: process.pid, seit: jetzt, herz: jetzt })); closeSync(fd); return true; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let alt = lesen();
      if (!alt) { pause(SPERRE_NACHLESEN_MS); alt = lesen(); }    // unlesbar: erst nach einem zweiten Versuch ein Überrest
      const letzter = alt ? Math.max(Number(alt.herz) || 0, Number(alt.seit) || 0) : 0;
      if (alt && jetzt - letzter <= maxAlterMs) return false;
      try { unlinkSync(pfad); } catch { /* ein anderer war schneller */ }
    }
  }
  return false;
}
/**
 * Herzschlag: der Besitzer (dieser Prozess) schreibt `herz` neu. false, wenn die Sperre ihm nicht (mehr) gehört.
 * ATOMAR: in eine Temp-Datei neben der Sperre schreiben und darüber umbenennen (rename ersetzt in einem Schritt), nie die Sperre selbst abschneiden — ein Leser sähe sonst eine leere Datei und löschte die lebende Sperre.
 */
export function sperreHerz(pfad, jetzt = Date.now()) {
  const tmp = `${pfad}.${process.pid}.tmp`;
  try {
    const alt = JSON.parse(readFileSync(pfad, 'utf8'));
    if (!alt || alt.pid !== process.pid) return false;
    writeFileSync(tmp, JSON.stringify({ ...alt, herz: jetzt }));
    renameSync(tmp, pfad);
    return true;
  } catch { try { unlinkSync(tmp); } catch { /* war nie da */ } return false; }
}
export async function lauf(cfg, io = {}) {
  schutzPruefen(cfg, { freigabe: existsSync(cfg.pfade.freigabeDatei) });
  if (!cfg.live) return laufOhneSperre(cfg, io);
  const sperre = join(tmpdir(), `grind2-${createHash('sha1').update(resolve(cfg.pfade.ledger)).digest('hex').slice(0, 12)}.lock`);
  if (!sperreHolen(sperre, (io.jetzt || Date.now)())) throw new Error(`SPERRE: ein anderer LIVE-Lauf schreibt gerade (${sperre}); zwei Läufe gleichzeitig legen dasselbe Produkt doppelt an`);
  const jetztFn = io.jetzt || Date.now;
  const herz = setInterval(() => sperreHerz(sperre, jetztFn()), SPERRE_HERZ_INTERVALL_MS);
  herz.unref?.();     // der Herzschlag hält den Prozess nie am Leben
  try { return await laufOhneSperre(cfg, io); } finally { clearInterval(herz); try { unlinkSync(sperre); } catch { /* egal */ } }
}
async function laufOhneSperre(cfg, io = {}) {
  const log = io.log || (() => {});
  const jetzt = io.jetzt || (() => Date.now());
  const fetchFn = io.fetch || globalThis.fetch;
  const warte = io.warte || schlafen;
  const env = io.env || process.env;
  const live = cfg.live;
  const monat = new Date(jetzt()).getUTCMonth() + 1;     // für die Saison-Sperre
  const betriebsart = schutzPruefen(cfg, { freigabe: existsSync(cfg.pfade.freigabeDatei) });
  // LIVE: ein ungültiger Shop-Host ist ein Fehler der ganzen Einrichtung, kein Fehler eines Produkts — Abbruch VOR jedem Zugriff (und vor jedem Versand von Zugangsdaten)
  if (live && !normalizeShopifyHost(io.shop || env.SHOPIFY_SHOP || '')) throw new Error('Kein Shopify-Zugang (SHOPIFY_SHOP fehlt)');
  const bericht = { betriebsart, start: new Date(jetzt()).toISOString(), zaehl: {}, zeilen: [], vorfilter: [], hinweise: [], exit: EXIT.OK, punkte: null, budget: null, veroeffentlicht: [] };
  const zaehl = n => { bericht.zaehl[n] = (bericht.zaehl[n] || 0) + 1; };
  const hinweis = t => { if (!bericht.hinweise.includes(t)) bericht.hinweise.push(t); log('  Hinweis:', t); };
  const lies = p => (existsSync(p) ? readFileSync(p, 'utf8') : '');
  const kiOpt = { fetch: fetchFn, geminiKey: io.geminiKey, groqKey: io.groqKey };

  // ── Eingänge
  const luecken = jsonLesen(cfg.pfade.bedarf);
  if (!luecken) throw new Error(`Bedarfsdatei fehlt oder ist kein JSON: ${cfg.pfade.bedarf}`);
  let ledgerText = lies(cfg.pfade.ledger);
  const awStand = auswahlLedgerWaehlen([{ quelle: cfg.pfade.auswahlLedger, text: lies(cfg.pfade.auswahlLedger) }, ...(cfg.pfade.auswahlLedgerAlt || []).map(p => ({ quelle: p, text: lies(p) }))]);
  const auswahlText = awStand.text;
  const erledigt = ledgerGedaechtnis(ledgerText, { jetzt: jetzt(), force: cfg.force });
  const ziele = bedarfAus(luecken, { geschrieben: schreibZaehlerAusLedger(ledgerText), wellen: cfg.wellen, ziele: cfg.ziele });
  log(`Stufe 1 Bedarf: ${ziele.length} Zielblätter mit Restbedarf${cfg.ziele.length ? ` (gewählt: ${cfg.ziele.join(', ')})` : ` (Wellen ${cfg.wellen.join('/')})`}`);

  let index = io.index;
  if (!index) {
    const r = ladeIndex({ skusDatei: cfg.pfade.skus, ledgerDir: dirname(cfg.pfade.ledger), mindestProdukte: cfg.indexMin });
    index = r.index; bericht.indexBericht = r.bericht;
    for (const f of r.bericht.fehlend) hinweis(`Index: ${f} fehlt`);
  }
  if (!istFrisch(index, cfg.indexMaxH, jetzt())) {
    const t = `Shop-SKU-Index ist nicht frisch (Stand ${index.stand || 'unbekannt'}, erlaubt ${cfg.indexMaxH} h${bericht.indexBericht?.unvollstaendig ? '; UNVOLLSTÄNDIG: ' + bericht.indexBericht.unvollstaendig.join(' / ') : ''}): erst node automation/grind_skus_lesen.mjs`;
    if (live) throw new Error(t);
    hinweis(t);
  }
  const extra = io.kategorienExtra || await ladeKategorienExtra(cfg.pfade.bereiche);
  // Ohne die Bereichsdateien kennt der Lauf nur die 303 Basis-Kategorien und stellte die meisten Kandidaten still als «keine passende Kategorie» zurück: LIVE bricht lieber ab (Trockenlauf: Hinweis).
  if (live && (extra.fehler.length || !extra.kategorien.length)) throw new Error(`BEREICHE: Bereichsdateien unter ${cfg.pfade.bereiche} fehlen oder sind fehlerhaft (${extra.fehler.join('; ').slice(0, 200) || 'keine Kategorie geladen'}): dropship/taxonomie-2610-b muss im Checkout liegen`);
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
  const cj = cjClient({ token, fetch: fetchFn, warte, stand, reserve: cfg.reserve, punkteMax: cfg.punkteMax, basisMs: io.basisMs, klassenMax: cfg.frachtKlassen });
  let shopQ = null;
  const shop = async (q, v, opt) => { if (!shopQ) shopQ = await shopZugang(io, fetchFn, env); return shopQ(q, v, opt); };
  const freigabeDa = () => existsSync(cfg.pfade.freigabeDatei);      // Notbremse: «Datei löschen = Stopp», an jedem Schritt vor einer sichtbaren Änderung geprüft
  const budgetPruefen = betriebsart !== 'probe';
  const budget = variantenBudget({ grind2Text: ledgerText, auswahlText, jetzt: jetzt(), cfg });
  // Der Verbrauch des Auswahl-Laufs steht NUR in dessen Ledger. Ein veralteter Arbeitsbaum zählt ihn zu niedrig (GEMESSEN 27.10.2026: 88 statt 4 508 Varianten in 24 h) und macht die Gesamtgrenze blind.
  // Es zählt der JÜNGSTE Stand (eigener Arbeitsbaum oder Hauptrepo); ist auch der älter als AUSWAHL_LEDGER_MAX_H, ist der Verbrauch unbekannt → LIVE bricht ab.
  const aAlterH = awStand.stand ? (jetzt() - awStand.stand) / 3600e3 : Infinity;
  bericht.auswahlLedgerAlterH = aAlterH; bericht.auswahlLedger = { quelle: awStand.quelle, staende: awStand.alleQuellen };
  if (cfg.auswahlLedgerMaxH > 0 && aAlterH > cfg.auswahlLedgerMaxH) {
    const t = `Auswahl-Ledger ${Number.isFinite(aAlterH) ? 'ist ' + aAlterH.toFixed(0) + ' h alt' : 'ist leer'} (erlaubt ${cfg.auswahlLedgerMaxH} h; geprüft: ${awStand.alleQuellen.map(q => q.quelle).join(', ')}): sein Verbrauch ist unbekannt — erst frischen Stand holen (git pull / frischer Checkout nach dem Nachtlauf, VARIANTEN_LEDGER_ALT)`;
    if (live) throw new Error(t);
    hinweis(t);
  }
  bericht.budget = { ...budget, genutzt: 0 };
  let verbraucht = 0, budgetStopp = false;
  let kanaeleCache, liveSortCache;      // vor dem try-Block: die Funktionen unten laufen aus ihm heraus

  const ledgerAnhaengen = (datei, zeile) => {
    if (!live) return;
    mkdirSync(dirname(datei), { recursive: true });
    const alt = existsSync(datei) ? readFileSync(datei, 'utf8') : '';
    if (alt && !alt.endsWith('\n')) zeile = '\n' + zeile;      // eine Datei ohne Zeilenende würde die neue Zeile ankleben und deren pid fürs Gedächtnis verlieren
    appendFileSync(datei, zeile);
  };
  const ledger = (zeile) => { ledgerAnhaengen(cfg.pfade.ledger, zeile); if (live) ledgerText += zeile; };
  const freigabeLedger = zeile => ledgerAnhaengen(cfg.pfade.freigabeLedger, zeile);

  const stoppe = (code, text_) => { bericht.exit = bericht.exit || code; hinweis(`ABBRUCH: ${text_}`); };
  try {
    await cj.einstellungen();     // kostenlos, liefert pointsInfo (gemessen 27.10.2026)
    bericht.punkte = { start: stand.remaining ?? null, total: stand.total ?? null };
    log(`CJ-Punkte vor dem Lauf: ${stand.remaining ?? 'unbekannt'} (Reserve ${cfg.reserve}, eigene Grenze ${cfg.punkteMax})`);
    // Ohne pointsInfo.remaining ist die Reserve blind (pruefe() überspringt sie still). Live läuft dann nichts: unbekannt ist kein Freibrief.
    if (!Number.isFinite(stand.remaining)) {
      if (live) { stoppe(EXIT.CJ, 'CJ liefert kein pointsInfo.remaining: die Punkte-Reserve wäre wirkungslos'); return abschluss(); }
      hinweis('CJ liefert kein pointsInfo.remaining: die Punkte-Reserve greift nicht (nur der Trockenlauf läuft weiter)');
    }
    if (Number.isFinite(stand.remaining) && stand.remaining < cfg.reserve + KOSTEN.liste) {
      stoppe(EXIT.CJ, `nur noch ${stand.remaining} CJ-Punkte, Reserve ${cfg.reserve}`);
      return abschluss();
    }

    // LIVE: die live filternden sort-Tags VOR dem ersten Kandidaten lesen — scheitert das, bricht der Lauf ab (kein FEHLER je Produkt, kein Raten)
    if (live) await liveSortHolen();
    // LIVE: liegen vom letzten Lauf ACTIVE-Produkte ohne Kanal herum (Absturz zwischen ACTIVE und Veröffentlichen)? Zurück auf DRAFT, bevor etwas Neues entsteht
    if (live) { await aktivOhneKanalZurueck(); if (bericht.exit) return abschluss(); }

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
        // Eine Quelle liefert ihre besten `listeGroesse` Treffer; sind die durch Ledger, Dubletten und Filter verbraucht und die Seite war voll, kommt die nächste Seite (50 Punkte je Aufruf).
        // `seiten` zählt Listenaufrufe je Zielblatt (SEITEN_MAX), nicht Quellen.
        for (let seite = 1; seiten < cfg.seitenMax && kand.length < cfg.proZiel; seite++) {
          const { items, aus, total } = await listeHolen(q, seite); seiten++;
          // CJ antwortet auf eine unbekannte oder veraltete categoryId mit Erfolg und leerer Liste (GEMESSEN 27.10.2026: code 200, total 0, list [], 50 Punkte) — das darf nicht wie «kein Bedarf» aussehen.
          if (!items.length) hinweis(`Zielblatt ${ziel.id}: ${q.art === 'kategorie' ? `Kategorie «${q.name}» (${q.id})` : `Suche «${q.wort}»`} lieferte ${seite > 1 ? 'auf Seite ' + seite + ' ' : ''}0 Treffer${q.art === 'kategorie' ? ' — ID veraltet oder Blatt leer?' : ''}`);
          const vf = vorfilterListe(items, { cfg, index, erledigt, monat });
          bericht.vorfilter.push({ ziel: ziel.name, quelle: `${q.art === 'kategorie' ? `Kategorie ${q.name}` : `Suche «${q.wort}»`} Seite ${seite} (${aus}${total ? `, ${total} insgesamt` : ''})`, treffer: items.length, durch: vf.durch.length, abgelehnt: vf.abgelehnt });
          log(`Stufe 2/3 ${ziel.id} · ${q.art === 'kategorie' ? q.name : `«${q.wort}»`} S.${seite}: ${items.length} Treffer (${aus}) → ${vf.durch.length} durch den Vorfilter`);
          for (const d of vf.durch) if (!kand.some(x => x.pid === d.pid)) kand.push(d);
          if (items.length < cfg.listeGroesse) break;          // die Seite war nicht voll: es gibt keine nächste
        }
      }
      jeZiel.push({ ziel, kandidaten: rangiere(kand) });
      aussicht += Math.min(cfg.proZiel, ziel.rest, kand.length);
    }
    const auswahl = verteile(jeZiel, { limit: cfg.limit, proZiel: cfg.proZiel });
    log(`Stufe 4: ${auswahl.length} Kandidaten kommen in die Prüfung`);

    // ── Stufe 4/5: Prüfung und Plan
    let kiFolge = 0, fehlerFolge = 0, schreibFolge = 0, drosselFolge = 0, veroeffentlicht = 0, toreFolge = 0;
    const gesehenPid = new Set();
    for (const { ziel, k } of auswahl) {
      // dieselbe CJ-pid kann in zwei Zielblättern auftauchen: sie darf nur EINMAL geplant und angelegt werden (sonst zweimal GESCHRIEBEN, zweite «Übernahme» → Tag grind2-tor-fehler auf einem veröffentlichten Produkt)
      if (gesehenPid.has(k.pid)) { hinweis(`${k.pid}: steht auch im Zielblatt ${ziel.id} — in diesem Lauf nur einmal bearbeitet`); zaehl('DOPPELT'); continue; }
      gesehenPid.add(k.pid);
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
      // Der Handle kommt aus der Antwort des Shops (bei einer Waise mit abweichendem Titel ist er ein anderer als der geplante): Ledger, Textspeicher und Freigabe-Ledger nennen den echten.
      const handleLive = a.handle || r.plan.handle;
      ledger(ledgerZeileGeschrieben({ pid: k.pid, n: a.varianten, handle: handleLive, gid: a.gid, zielId: ziel.id }, jetzt()));
      verbraucht += Math.max(0, a.varianten - n);     // zählt die Übernahme eines Produkts mit anderer Variantenzahl nach
      datenblattFuerTexte(k.pid, handleLive);
      // Eine übernommene Waise trägt das Datums-Tag ihres Anlege-Tages (grind2-20261027); der Plan von heute nennt ein anderes. Die Tore sollen die Waise prüfen, nicht das Datum (Gegenlesung: sonst scheiterte
      // jede Übernahme am «nächsten Tag» an «Tags fehlen: grind2-<neues Datum>»).
      if (a.uebernommen && Array.isArray(a.tags)) {
        const altTags = a.tags.filter(t => /^grind2-\d{8}$/.test(t));
        if (altTags.length) r.plan.eingabe.tags = eindeutig([...r.plan.eingabe.tags.filter(t => !/^grind2-\d{8}$/.test(t)), ...altTags]);
      }
      // Notbremse auch HIER (zwischen Anlegen und Toren): das Produkt steht als DRAFT im Shop; wer die Freigabedatei löscht, will keinen weiteren Schritt
      if (!freigabeDa()) {
        hinweis(`Freigabedatei ${cfg.pfade.freigabeDatei} ist verschwunden: Stopp vor den Toren (${handleLive} bleibt DRAFT)`);
        freigabeLedger(ledgerZeile(handleLive, 'FEHLER', 'Stopp: Freigabedatei verschwunden, Tore nicht gelesen', jetzt()));
        break;
      }

      // ── Stufe 7 und 7b. Das Produkt EXISTIERT jetzt und steht im Ledger: ein Lesefehler hier (HTTP 500, Netz) darf weder den ganzen Lauf beenden noch das Produkt ohne Urteil lassen —
      //    er wird festgehalten (Freigabe-Ledger + Tag), dann geht es mit dem nächsten weiter. Nur das Tageslimit und CJ-Lauffehler beenden den Lauf (sie werfen weiter).
      try {
        const t = await toreAbwarten(a.gid, r.plan.eingabe, { streng: !!a.uebernommen });
        r.row.tore = { ok: t.tore.filter(x => x.ok === true).length, gesamt: t.tore.length, falsch: t.tore.filter(x => x.ok !== true).map(x => x.name) };
        if (!t.ok) {
          zaehl('TOR_FEHLER');
          r.row.entscheid += ` · Tore: ${r.row.tore.falsch.join(', ')}`;
          freigabeLedger(ledgerZeile(handleLive, 'FEHLER', t.tore.filter(x => x.ok !== true).map(x => `${x.name}: ${x.grund}`).join('; '), jetzt()));
          try { await shop(TAGS_ADD, { id: a.gid, t: ['grind2-tor-fehler'] }); } catch (e) { hinweis(`Tag grind2-tor-fehler nicht gesetzt: ${saniere(e.message, 80)}`); }
          continue;
        }
        toreFolge = 0;
        freigabeLedger(ledgerZeile(handleLive, 'FREI', 'alle Tore bestanden (DRAFT)', jetzt()));

        // ── Stufe 7b: veröffentlichen, nur mit PUBLISH=1 (Handprüfung-Zielblätter der Welle R nie)
        if (cfg.publish && ziel.welle !== 'R' && veroeffentlicht < cfg.publishMax) {
          const v = await veroeffentlichen(a.gid, r.plan, handleLive);
          r.row.entscheid += ` · ${v.art}${v.grund ? `: ${v.grund}` : ''}`;
          if (v.art === 'VEROEFFENTLICHT') { veroeffentlicht++; zaehl('VEROEFFENTLICHT'); bericht.veroeffentlicht.push(handleLive); }
          if (v.art === 'ZURUECK_FEHLGESCHLAGEN') break;     // ein Produkt könnte live sein: nichts weiter anfassen
        } else if (cfg.publish && ziel.welle === 'R') {
          r.row.entscheid += ' · nicht veröffentlicht: Zielblatt der Welle R (Handprüfung)';
        }
      } catch (e) {
        const m = String(e.message);
        if (VARIANTEN_LIMIT_RE.test(m) || CJ_LAUF_RE.test(m)) throw e;
        zaehl('TOR_AUSFALL'); r.row.entscheid += ` · Tore/Veröffentlichen nicht möglich: ${saniere(m, 80)}`;
        freigabeLedger(ledgerZeile(handleLive, 'FEHLER', `Tore/Veröffentlichen: ${saniere(m, 140)}`, jetzt()));
        try { await shop(TAGS_ADD, { id: a.gid, t: ['grind2-tor-fehler'] }); } catch { /* der Shop ist gerade nicht erreichbar */ }
        if (++toreFolge >= cfg.maxFehlerFolge) { stoppe(EXIT.FEHLER, `${toreFolge} Ausfälle nach dem Anlegen in Folge: ein Dienst scheint auszufallen`); break; }
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
    const PLAN_V = planSchluessel(cfg);
    const row = zeileFuer(k, ziel);
    const merke = t => { row.hinweis = [row.hinweis, t].filter(Boolean).join('; '); };      // mehrere Hinweise je Kandidat sammeln, nie überschreiben
    const ausgang = (status, grund, frist, extra = {}) => {
      const lt = extra.ledgerText ?? (fristKopf(frist) + saniere(grund, 200));
      const r = { status, grund, frist, ledgerText: lt, row: { ...row, entscheid: status === 'PLAN' ? 'PLAN: alle Tore bestanden' : `übersprungen (${frist || 'endgueltig'}): ${saniere(grund, 160)}` }, ...extra };
      return r;
    };
    const planPfad = join(cfg.pfade.planDir, `${k.pid}.json`);
    if (cfg.planTtlH > 0 && frischGenug(planPfad, cfg.planTtlH, jetzt())) {
      const alt = jsonLesen(planPfad);
      // nur ein Plan derselben Version (Code samt allen Sperrlisten-Dateien + Einstellungen): ein Plan vor einer Korrektur oder mit anderem Kurs/Aufschlag/Lieferzeit wird neu gebaut.
      // LIVE verwendet NIE einen gespeicherten PLAN (nur eine gespeicherte Ablehnung, die immer auf der sicheren Seite liegt): ein Plan aus Probe oder Trockenlauf wurde ohne die Live-Sammlungen des Shops gebaut
      // (das Tor «sort-Tag mit Collection» war dort nur ein Hinweis) und hätte in LIVE+PUBLISH ein Produkt ohne Kategorieseite angelegt und veröffentlicht (Gegenlesung 27.10.2026, S1/S1c). Ein Plan kostet
      // höchstens 60 CJ-Punkte (Abfrage 10 + Lager 10 + Fracht bis 40): das ist der Preis dafür, dass in LIVE jedes Tor frisch gegen den echten Shop geprüft wird.
      if (alt && planGueltig(alt, PLAN_V) && ((alt.status === 'PLAN' && !live) || alt.status === 'UEBERSPRUNGEN') && alt.row) {
        // ein gespeicherter Plan hat die Dublettenprüfung dieses Index NICHT durchlaufen (Shop, Index und Ledger können sich seit dem Plan geändert haben)
        if (alt.status === 'PLAN' && alt.plan?.eingabe) {
          const dc = dublettenUrteil({ pid: k.pid, variantSkus: alt.plan.eingabe.variants.map(v => v.inventoryItem.sku), titel: alt.plan.titel, handle: alt.plan.handle }, index);
          if (!dc.waise && dc.treffer.some(t => t.staerke === 'hart' && (!(t.produkte || []).length || t.produkte.some(p => p.status !== 'GEPLANT')))) return ausgang('UEBERSPRUNGEN', `Dublette: ${dc.grund}`, 'endgueltig');
        }
        log(`  ${k.pid}: Plan aus dem Zwischenspeicher (kostet keine Punkte)`);
        return { ...alt, row: { ...alt.row, entscheid: alt.status === 'PLAN' ? 'PLAN: alle Tore bestanden (Zwischenspeicher)' : alt.row.entscheid } };
      }
    }
    const fertig = r => { jsonSchreiben(planPfad, { v: PLAN_V, status: r.status, grund: r.grund, frist: r.frist, ledgerText: r.ledgerText, row: r.row, plan: r.plan, kiAusfall: r.kiAusfall }); return r; };

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
    const d1 = dublettenUrteil({ pid: c.pid, productSku: c.productSku, variantSkus: vSkus, titel: c.productNameEn }, index);
    if (d1.dublette) return fertig(ausgang('UEBERSPRUNGEN', `Dublette: ${d1.grund}`, 'endgueltig'));
    if (d1.unbekannt) hinweis(`${k.pid}: Dublettenprüfung nicht möglich (kein harter Schlüssel)`);
    // Waise eines abgestürzten Laufs: nicht unsichtbar bleiben lassen (Hinweis, Zählung, Zeile) — anlegen() übernimmt sie (LIVE), die strengen Tore entscheiden, ob sie dem Plan gleicht
    if (d1.waise) { merke(`Waise im Shop: ${d1.waisen.join(', ')}`); hinweis(`${k.pid}: ${d1.grund}`); zaehl('WAISE'); row.waise = d1.waisen; }

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
    // Ein sort-Tag ohne Collection im Shop führt auf KEINE Kategorieseite (GEMESSEN 27.10.2026: bei 600 Shop-Produkten hatten 20,9 % Tags, aber keine einzige live Collection): zurückstellen, bis sie live ist.
    const liveSort = await liveSortHolen();
    if (liveSort && !hatLiveCollection(sortTags, liveSort)) return fertig(ausgang('UEBERSPRUNGEN', `kein sort-Tag mit Collection im Shop (${sortTags.join(', ')})`, 'zurueckgestellt', { kiOk: true }));
    row.vertrauen = gp.vertrauen;
    // Die gemessene Übereinstimmung des Titelurteils mit dem Shop (GEMESSEN 27.10.2026: unter 0,7 nur 58 % exakt, ab 0,7 89,9 %): schwache Pfade stehen im Kontaktbogen zur Handsicht (keine Sperre).
    if (gp.sicherheit === 'titel' && (gp.vertrauen == null || gp.vertrauen < VERTRAUEN_HAND)) merke(`Google-Pfad von Hand ansehen (${gp.vertrauen == null ? 'Regel ohne Shop-Beleg' : `Vertrauen ${Math.round(gp.vertrauen * 100)} %`})`);
    const tags = tagsFuer({ sortTags, jetzt: jetzt() });
    const d2 = dublettenUrteil({ pid: c.pid, productSku: c.productSku, variantSkus: vSkus, titel, handle }, index);
    if (d2.dublette) return fertig(ausgang('UEBERSPRUNGEN', `Dublette: ${d2.grund}`, 'endgueltig', { kiOk: true }));
    if (d2.warnung) merke(`Titelähnlichkeit: ${d2.grund.slice(0, 120)}`);

    // 5. Vorplan: alle Tore AUSSER Preis (Platzhalterpreis), samt Übersetzung unsicherer Optionswerte (höchstens zwei Runden)
    const basisCtx = extraCtx => ({ titel, googlePfad: gp.pfad, googleVokabular: TAXONOMIE, productType: pt, tags, maxVarianten: cfg.maxVarianten, minBilder: cfg.minBilder, ...extraCtx });
    let uebersetzung, kiAusfall = false;
    let vor = planeNeu(c, basisCtx({ preis: () => ({ preis: 99, kosten: 50 }) }));
    for (let runde = 0; runde < 2 && vor.unsicher.length && vor.tore.filter(t => t.ok === false).every(t => ['optionswerte-sicher', 'optionswerte-deutsch'].includes(t.name)); runde++) {
      const roh = eindeutig(vor.unsicher.map(u => u.wert));
      const t = await nachDeutsch(roh, { ...kiOpt, auftrag: LABEL_AUFTRAG });
      kiAusfall = t.weg === 'original';
      if (!uebersetzungBrauchbar(t, roh)) {
        // Fiel die KI aus, gilt «nicht sicher übersetzt» nur 20 Stunden (vorläufig), nicht 7 Tage: den Plan MIT dem Ausfall-Merker neu bewerten, bevor das Ledger den Grund bekommt.
        // GEMESSEN 27.10.2026: bei 960 von 2 235 echten Datenblättern (43 %) steht der erste Plan an «optionswerte-sicher» und braucht die KI; ein Ausfall hätte sie eine Woche gesperrt.
        if (kiAusfall) vor = planeNeu(c, basisCtx({ preis: () => ({ preis: 99, kosten: 50 }), uebersetzung, kiAusfall }));
        break;
      }
      uebersetzung = { ...(uebersetzung || {}), ...Object.fromEntries(roh.map((w, i) => [w, t.texte[i].replace(/ß/g, 'ss')])) };      // Schweizer Rechtschreibung auch in der Auswahl
      vor = planeNeu(c, basisCtx({ preis: () => ({ preis: 99, kosten: 50 }), uebersetzung, kiAusfall }));
    }
    if (!vor.ok) return fertig(ausgang('UEBERSPRUNGEN', vor.grund, vor.frist, { ledgerText: vor.ledgerGrund, kiAusfall, kiOk: !kiAusfall }));
    const bleibt = new Set(vor.eingabe.variants.map(v => v.inventoryItem.sku));
    let vs = (c.variants || []).filter(v => bleibt.has(text(v.variantSku)));

    // 6. Bilder: HTTP 200 (Bild-Falle) und Hash-Alias gegen doppelte Uploads
    const varUrls = eindeutig(vs.map(v => text(v.variantImage)).filter(Boolean));
    const bp = await bilderPruefen([...gal0, ...varUrls].slice(0, 200), { fetch: fetchFn });
    let alias = {};
    if (cfg.bildHash && io.bildSig && io.bildGleich) {
      const ar = await bildAliasBauen(gal0.filter(u => bp.ok.has(u)), varUrls.filter(u => bp.ok.has(u)), { sig: io.bildSig, gleich: io.bildGleich });
      alias = ar.alias; if (ar.grund) hinweis(`${k.pid}: Bildvergleich ${ar.grund}`);
    }

    // 6b. Lager: product/query hat keinen Bestand (inventoryNum null bei 16 902 von 16 902 Varianten). Eine Variante mit 0 im CN-Lager (CJ UND Lieferant) wird nicht verkauft (inventoryPolicy CONTINUE
    //     würde sie sonst anbieten); ohne jede lagernde Variante kein Produkt. Unbekannt (Form nicht lesbar, vid oder CN-Zeile fehlt) bleibt im Rennen: Bestand ist kein Lieferbarkeitsbeweis.
    const vsAlle = vs;
    if (cfg.bestandPruefen) {
      const bst = bestandJeVid(await cj.bestand(k.pid));
      vs = vs.filter(v => !bst || !bst.has(text(v.vid)) || bst.get(text(v.vid)) > 0);
      if (!vs.length) return fertig(ausgang('UEBERSPRUNGEN', `kein Bestand bei CJ und Lieferant (${vsAlle.length} Variante(n) mit 0)`, 'zurueckgestellt', { kiOk: true }));
      if (vs.length < vsAlle.length) merke(`${vsAlle.length - vs.length} Variante(n) ohne Bestand weggelassen`);
    }

    // 7. Fracht CN→CH (Lieferbarkeit entscheidet allein diese Messung) und Preis. Die Fracht wird je GEWICHTSKLASSE gemessen (höchstens cfg.frachtKlassen Aufrufe) und jeder Variante die
    //    Fracht der nächst schwereren Klasse zugeteilt: die Fracht der schwersten Variante für alle machte eine 170-g-Variante von 14.90 auf 61.90 CHF (GEMESSEN 27.10.2026).
    const fr = await cj.fracht(vs.map(v => ({ vid: v.vid, gewichtG: Number(v.variantWeight) || 0 })));
    row.frachtLinie = fr.guenstigsteLinie;
    if (fr.urteil === 'nicht_lieferbar') return fertig(ausgang('UEBERSPRUNGEN', ledgerGrund(fr), 'endgueltig', { kiOk: true }));
    if (fr.unbekannt || fr.urteil === 'unbekannt') return fertig(ausgang('UEBERSPRUNGEN', ledgerGrund(fr), 'vorlaeufig', { ledgerText: ledgerGrund(fr), kiOk: true }));
    if (fr.teilweise) return fertig(ausgang('UEBERSPRUNGEN', 'nur die leichteste Variante lieferbar, die schwerste nicht (Gewichtsklassen dazwischen nicht einzeln gemessen)', 'zurueckgestellt', { kiOk: true }));
    if (fr.gewichtUnbekannt || fr.ohneGewicht > 0) return fertig(ausgang('UEBERSPRUNGEN', `Gewicht bei ${fr.ohneGewicht || vs.length} von ${vs.length} Varianten unbekannt: Fracht nicht belastbar`, 'zurueckgestellt', { kiOk: true }));
    // Lieferzeit: die Produktseite verspricht «ca. 10–20 Tage». Die günstigste Linie ist oft die langsamste (gemessen: CJPacket Eub und Postal 12–50, PostNL 15–45, Sensitive Pro 15–35 Tage):
    // gerechnet wird je Klasse mit der günstigsten NORMALEN Linie, die höchstens cfg.maxTage braucht. Eine Klasse ohne solche Linie verkauft nicht (die Variante fällt weg), ohne jede: zurückgestellt.
    const frachtOpt = { sensitivAlsAusweg: cfg.sensitivAusweg, maxTage: cfg.maxTage };
    const je = frachtJeVariante(vs.map(v => ({ vid: v.vid, gewichtG: Number(v.variantWeight) || 0 })), fr.klassen, frachtOpt);
    if (!je) return fertig(ausgang('UEBERSPRUNGEN', 'Fracht: keine Gewichtsklasse gemessen', 'vorlaeufig', { kiOk: true }));
    const frachtVon = new Map(je.map(x => [x.vid, x]));
    const mitFracht = vs.filter(v => frachtVon.get(v.vid)?.frachtUsd != null);
    if (!mitFracht.length) return fertig(ausgang('UEBERSPRUNGEN', je[0]?.grund || frachtKeineZahlGrund(fr, frachtOpt), 'zurueckgestellt', { kiOk: true }));
    if (mitFracht.length < vs.length) merke(`${vs.length - mitFracht.length} Variante(n) ohne Versandlinie mit höchstens ${cfg.maxTage} Tagen weggelassen`);
    const frachtZahlen = mitFracht.map(v => frachtVon.get(v.vid).frachtUsd);
    row.frachtUsd = Math.max(...frachtZahlen); row.frachtMin = Math.min(...frachtZahlen);
    const kurs = { kurs: cfg.kurs, aufschlag: cfg.aufschlag, preisMin: preisMinFuer(gp.pfad, cfg) };
    let preise = preiseFuerVarianten(mitFracht.map(v => ({ vid: v.vid, ekUsd: v.variantSellPrice, frachtUsd: frachtVon.get(v.vid).frachtUsd })), kurs);
    // Varianten über der Preis-Obergrenze fallen weg, wenn mindestens zwei bleiben (sonst entscheidet preisUrteil über das ganze Produkt)
    const ob = ueberObergrenzeWeg(preise, cfg.maxPreis, 2);
    if (ob.entfernt.length) { preise = ob.preise; merke(`${ob.entfernt.length} Variante(n) über der Preisobergrenze ${cfg.maxPreis} weggelassen`); }
    const kosten = preise.varianten.filter(v => v.ok).map(v => v.kosten);
    if (kosten.length) { row.einstandMin = Math.min(...kosten); row.einstandMax = Math.max(...kosten); row.preisMin = preise.minPreis; row.preisMax = preise.maxPreis; row.margeMin = preise.margeMin; row.preisFlaggen = preise.flaggen; }
    const pu = preisUrteil(preise, cfg);
    if (!pu.ok) return fertig(ausgang('UEBERSPRUNGEN', pu.grund, pu.frist, { kiOk: true }));

    // 8. Text: Fakten-Block aus dem Datenblatt (nur belegte Angaben); der Fliesstext folgt später («Text offen»)
    const fb = await faktenBlock(c, titel, { ...kiOpt, warte });
    if (!fb.ok && fb.kiAusfall) return fertig(ausgang('UEBERSPRUNGEN', `KI-Dienst nicht erreichbar (Text): ${saniere(fb.grund, 80)}`, 'vorlaeufig', { kiAusfall: true }));
    if (!fb.ok && !cfg.duennOk) return fertig(ausgang('UEBERSPRUNGEN', `Text offen: ${fb.grund}`, 'zurueckgestellt', { kiOk: true }));

    // 9. Endplan mit allen 23 Toren
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

  /**
   * Stufe 6: als DRAFT anlegen. Vorher SKU- und Handle-Abfrage am Shop: ein Produkt, das ein früherer Lauf vor der Ledger-Zeile angelegt hat, wird übernommen statt verdoppelt.
   * productSet wird NIE blind wiederholt: nach einem Netzfehler, 5xx oder unlesbarer Antwort KANN die Anfrage angekommen sein (Gegenlesung 27.10.2026: bei einer stillen Umnummerierung des Handles durch Shopify
   * entstünden zwei DRAFT-Produkte mit denselben SKUs) — dann wird erst nachgesehen (SKU- und Handle-Abfrage), erst danach gegebenenfalls wiederholt. Nur eine Drossel (429, «Throttled»), bei der Shopify die
   * Anfrage sicher nicht bearbeitet hat, wird ohne Nachsehen wiederholt. Die Suche nach SKU hinkt dem Index teils hinterher; die Handle-Abfrage ist sofort genau.
   */
  async function anlegen(plan, ziel) {
    const e = plan.eingabe, sku1 = e.variants[0].inventoryItem.sku;
    const meins = p => (p.tags || []).includes('grind2');
    const suche = async () => {
      const sk = await shop(SKU_ABFRAGE, { q: `sku:"${esc(sku1)}"` });
      const hd = (await shop(HANDLE_ABFRAGE, { h: e.handle }))?.productByIdentifier;
      return { treffer: sk?.products?.nodes || [], hd };
    };
    const halb = (v, n) => ({ art: 'FEHLER', grund: `halbes Produkt ${v.handle} (${v.id}): ${n} von ${e.variants.length} Varianten — von Hand prüfen oder löschen` });
    // Was ist schon da? null = nichts, sonst das Ergebnis (übernehmen, halbes Produkt, fremde Dublette).
    const bewerte = ({ treffer, hd }) => {
      // Ein Produkt mit unserem Rücknahme-Tag, das DIESELBE erste CJ-SKU trägt, ist die Waise eines abgestürzten Laufs (Absturz zwischen productSet und Ledger-Zeile) — auch wenn die KI den Titel
      // beim zweiten Mal anders formuliert hat und der Handle deshalb abweicht. Übernehmen statt als «Dublette» 14 Tage lang zu sperren (das Produkt bliebe sonst für immer ohne Tore).
      const vorhanden = treffer.find(p => p.handle === e.handle) || hd || treffer.find(meins) || null;
      if (vorhanden && meins(vorhanden)) {
        const n = vorhanden.variantsCount?.count ?? 0;
        // Halbes Produkt (ein früherer Lauf brach mitten im Produkt ab, z. B. am Tageslimit): NICHT als GESCHRIEBEN verbuchen — es wäre unvollständig, und das Ledger vergässe es.
        // MEHR Varianten als geplant (der frühere Plan hatte eine grössere Auswahl) werden übernommen: das Budget zählt die echte Zahl nach, und das Tor «varianten-zahl» hält das Produkt als DRAFT zur Handprüfung fest.
        if (n < e.variants.length) return halb(vorhanden, n);
        return { art: 'GESCHRIEBEN', uebernommen: true, gid: vorhanden.id, handle: vorhanden.handle, varianten: n, tags: vorhanden.tags };
      }
      if (treffer.length) return { art: 'UEBERSPRUNGEN', grund: `Dublette (live): SKU ${sku1} gehört schon ${treffer[0].handle} (${treffer[0].status})`, ledgerText: `Dublette (live): SKU ${sku1} gehört ${treffer[0].handle}` };
      if (hd) return { art: 'UEBERSPRUNGEN', grund: `Handle ${e.handle} gehört schon einem fremden Produkt (${hd.status})`, ledgerText: `Handle ${e.handle} belegt (${hd.status})` };
      return null;
    };
    const schon = bewerte(await suche());
    if (schon) return schon;
    let res;
    for (let versuch = 0; ; versuch++) {
      try { res = await shop(PRODUCT_SET_MUTATION, { input: e }, { versuche: 1, timeoutMs: PRODUCT_SET_ZEIT_MS }); break; }     // OHNE identifier: legt NUR an, überschreibt nie; die Wiederholung steuert diese Schleife
      catch (err) {
        const m = String(err.message);
        if (VARIANTEN_LIMIT_RE.test(m)) throw err;
        if (SHOPIFY_DROSSEL_RE.test(m)) {
          // Die Doku beschreibt die Tagesdrossel für neue Varianten als «429 Too Many Requests» (productSet hat keinen Fehlercode dafür: ProductSetUserErrorCode kennt kein THROTTLE). 429 und «Throttled» sind
          // abgelehnte Anfragen: bis zu sechsmal mit wachsender Wartezeit wiederholen; ein bleibendes 429 ist die Tagesgrenze, die Kostendrossel (HTTP 200 + «Throttled») wird so überwunden.
          if (versuch + 1 < 6) { await warte((io.basisMs ?? 1500) * 2 ** versuch); continue; }
          if (/GraphQL: HTTP 429/.test(m)) throw new Error(`VARIANT_THROTTLE: HTTP 429 bleibt bestehen (${m.slice(0, 80)})`);
          throw err;
        }
        if (SHOPIFY_UNKLAR_RE.test(m) && versuch + 1 < 4) {
          await warte((io.basisMs ?? 1500) * 2 ** versuch);
          const nach = bewerte(await suche());          // nie blind wiederholen: kam die erste Anfrage an, ist das Produkt jetzt da (auch unter einem anderen Handle: die SKU verrät es)
          if (nach) return nach;
          continue;
        }
        throw err;
      }
    }
    const ue = res?.productSet?.userErrors || [];
    if (ue.length) {
      const t = JSON.stringify(ue).slice(0, 300);
      if (VARIANTEN_LIMIT_RE.test(t)) throw new Error(t);
      // «Handle already in use» (HANDLE_NOT_UNIQUE): der Handle gehört jetzt jemandem — wiederholte Anfrage nach einem Zeitfehler (das erste productSet kam an) oder fremdes Produkt.
      // Beides entscheidet die Handle-Abfrage mit denselben Regeln wie oben, statt es als Fehler zu verbuchen.
      if (ue.some(x => x?.code === 'HANDLE_NOT_UNIQUE')) {
        const nach = (await shop(HANDLE_ABFRAGE, { h: e.handle }))?.productByIdentifier;
        if (nach && meins(nach)) {
          const n2 = nach.variantsCount?.count ?? 0;
          if (n2 < e.variants.length) return halb(nach, n2);
          return { art: 'GESCHRIEBEN', uebernommen: true, gid: nach.id, handle: nach.handle, varianten: n2, tags: nach.tags };
        }
        if (nach) return { art: 'UEBERSPRUNGEN', grund: `Handle ${e.handle} gehört schon einem fremden Produkt (${nach.status})`, ledgerText: `Handle ${e.handle} belegt (${nach.status})` };
      }
      return { art: 'FEHLER', grund: `productSet: ${t}` };
    }
    const p = res?.productSet?.product;
    if (!p?.id) return { art: 'FEHLER', grund: 'productSet ohne Produkt in der Antwort' };
    // Der Handle der Antwort zählt, nicht der geplante: legt Shopify bei einer Kollision eine Zahl an (UNBEKANNT, ob productSet das still tut), muss das Ledger den echten nennen; das Tor «handle» hält das Produkt dann als DRAFT fest.
    return { art: 'GESCHRIEBEN', gid: p.id, handle: p.handle || e.handle, varianten: p.variantsCount?.count ?? e.variants.length };
  }

  /** Stufe 7: frisch lesen, bis die Medien verarbeitet sind (höchstens medienWarteS Sekunden). */
  async function toreAbwarten(id, eingabe, { nachFreigabe = false, streng = false } = {}) {
    const polls = Math.max(1, Math.ceil(cfg.medienWarteS / 5));
    let t;
    for (let i = 0; i < polls; i++) {
      const d = await shop(TORE_ABFRAGE, { id });
      t = toreNachAnlage(eingabe, d?.product, { minBilder: cfg.minBilder, nachFreigabe, streng });
      if (!t.offen) return t;
      await warte(5000);
    }
    // Zeit abgelaufen, Medien noch nicht fertig: «noch offen» ist kein Bestehen
    return { ...t, ok: false, tore: t.tore.map(x => (x.ok === null ? { ...x, ok: false, grund: `${x.grund} (nach ${cfg.medienWarteS} s noch nicht fertig)` } : x)) };
  }

  /**
   * Die `sort-…`-Tags, auf die im Shop wirklich eine Collection filtert. LIVE: aus dem Shop gelesen (nur lesen, einmal je Lauf; nicht lesbar → der Lauf bricht ab, nie raten).
   * Trockenlauf/Probe lesen den Shop nicht: dort zählt eine Datei (LIVE_SORT_DATEI) oder io.liveSortTags; fehlt beides, wird das Tor übersprungen (Hinweis) und im Bericht vermerkt.
   * @returns {Promise<Set<string>|null>} null = nicht prüfbar (nur Trockenlauf/Probe)
   */
  async function liveSortHolen() {
    if (liveSortCache !== undefined) return liveSortCache;
    if (io.liveSortTags) return (liveSortCache = new Set(io.liveSortTags));
    if (live) {
      const alle = []; let nach = null;
      for (let seite = 0; seite < 12; seite++) {
        const d = (await shop(LIVE_SORT_ABFRAGE, { after: nach }))?.collections;
        if (!d) throw new Error('SAMMLUNGEN: Antwort ohne collections');
        alle.push(...(d.nodes || []));
        if (!d.pageInfo?.hasNextPage) break;
        nach = d.pageInfo.endCursor;
      }
      const set = liveSortTags(alle);
      if (!set.size) throw new Error('SAMMLUNGEN: im Shop filtert keine einzige Collection auf ein sort-Tag — gelesen wurde offenbar nichts Brauchbares');
      return (liveSortCache = set);
    }
    const d = jsonLesen(cfg.pfade.liveSort);
    if (Array.isArray(d) && d.length) return (liveSortCache = new Set(d));
    hinweis(`Live-Sammlungen nicht bekannt (Trockenlauf liest den Shop nicht, ${cfg.pfade.liveSort} fehlt): das Tor «sort-Tag mit Collection» ist NICHT geprüft`);
    return (liveSortCache = null);
  }

  async function kanalListe() {
    if (kanaeleCache !== undefined) return kanaeleCache;
    const d = await shop(KANAL_REFERENZ, {});
    const refs = (d?.products?.nodes || []).map(p => ({ pubs: (p.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => n.publication.id) }));
    return (kanaeleCache = kanaeleAusReferenz(refs));
  }

  /**
   * Zurück auf DRAFT, und das Ledger sagt die Wahrheit: «ZURUECK» steht NUR, wenn der Shop den Status DRAFT frisch zurückliest. «Keine userErrors» ist kein Beweis (Gegenlesung 27.10.2026: eine leere Antwort
   * {productUpdate:null} liess das Ledger «ZURUECK» sagen, während das Produkt weiter ACTIVE war). Bis zu zwei Versuche (setzen, zurücklesen); sonst «ZURUECK_FEHLGESCHLAGEN», Exit 1, und der Lauf
   * fasst nichts mehr an, denn das Produkt kann LIVE sein.
   */
  async function aufDraft(gid, handle, grund) {
    let ok = false;
    for (let versuch = 0; versuch < 2 && !ok; versuch++) {
      try {
        const r = await shop(STATUS_SETZEN, { p: { id: gid, status: 'DRAFT' } });
        if (r?.productUpdate?.userErrors?.length) hinweis(`Rücknahme von ${handle}: ${saniere(JSON.stringify(r.productUpdate.userErrors), 100)}`);
        const l = await shop(STATUS_LESEN, { id: gid });
        ok = l?.product?.status === 'DRAFT';
        if (!ok) hinweis(`Rücknahme von ${handle} nicht bestätigt: der Shop meldet ${l?.product?.status ?? 'kein Produkt'}`);
      } catch (x) { hinweis(`Rücknahme auf DRAFT fehlgeschlagen: ${saniere(x.message, 80)}`); }
    }
    freigabeLedger(ledgerZeile(handle, ok ? 'ZURUECK' : 'ZURUECK_FEHLGESCHLAGEN', grund, jetzt()));
    if (!ok) stoppe(EXIT.FEHLER, `Rücknahme von ${handle} auf DRAFT fehlgeschlagen — das Produkt kann LIVE sein (${saniere(grund, 80)})`);
    return ok;
  }

  /**
   * Aufräumen nach einem Absturz ZWISCHEN «ACTIVE» und «publishablePublish» (Gegenlesung 27.10.2026, SIGKILL nach dem ACTIVE-Commit): das Produkt ist vollständig, aber ACTIVE ohne Kanal und bliebe still
   * liegen — bis publish_guard.mjs (Shop Guards, montags, LIVE=1 APPROVE_PUBLISH=1) es ohne Nachprüfung in alle Kanäle zöge. Darum: jedes aktive Produkt mit der Marke grind2 und ohne veröffentlichten Kanal
   * geht beim nächsten LIVE-Lauf zurück auf DRAFT (bestätigt durch Zurücklesen). Nur lesen schlägt nie fehl: scheitert die Abfrage, bricht der Lauf ab (kein Schreiben ohne dieses Netz).
   * ACHTUNG Besitzer: ein von Hand auf ACTIVE gesetztes grind2-Produkt OHNE Kanal wird ebenfalls zurückgenommen — erst Kanäle setzen, dann aktivieren.
   * Gelesen wird NEUESTE ZUERST und seitenweise (bis AKTIV_OHNE_KANAL_SEITEN × 50 Produkte); erst danach wird gefiltert und geschrieben, damit die Rücknahmen die Seitenfolge nicht verschieben.
   * Fehlt `pageInfo` in der Antwort, endet die Schleife nach der ersten Seite. Liegt nach der letzten erlaubten Seite noch eine weitere vor, steht das als Hinweis im Bericht (nie still).
   */
  async function aktivOhneKanalZurueck() {
    const alle = [];
    let after = null, seiten = 0, offen = '';
    for (;;) {
      const d = await shop(AKTIV_OHNE_KANAL, after ? { after } : {});
      if (!Array.isArray(d?.products?.nodes)) throw new Error('WIEDERAUFNAHME: Antwort ohne products');
      alle.push(...d.products.nodes);
      seiten++;
      const pi = d.products.pageInfo;
      if (!pi?.hasNextPage) break;
      if (!pi.endCursor || pi.endCursor === after) { offen = 'der Seitenwechsel liefert keinen neuen Cursor'; break; }
      if (seiten >= AKTIV_OHNE_KANAL_SEITEN) { offen = `nach ${seiten} Seiten (${alle.length} Produkte) liegen noch weitere aktive Produkte mit der Marke grind2 vor`; break; }
      after = pi.endCursor;
    }
    if (offen) hinweis(`Aufräumen unvollständig: ${offen}; die ältesten wurden nicht auf einen fehlenden Kanal geprüft (neueste zuerst gelesen)`);
    const liste = alle.filter(p => p.status === 'ACTIVE' && (p.tags || []).includes('grind2') && !(p.resourcePublicationsV2?.nodes || []).some(n => n.isPublished));
    for (const p of liste) {
      hinweis(`${p.handle}: ACTIVE ohne Kanal mit Marke grind2 (Absturz zwischen ACTIVE und Veröffentlichen?) — wird auf DRAFT zurückgenommen`);
      zaehl('AUFGERAEUMT');
      if (!await aufDraft(p.id, p.handle, 'Wiederaufnahme: ACTIVE ohne Kanal (Marke grind2), nie ungeprüft liegen lassen')) break;
    }
    return liste.length;
  }

  /**
   * Aktiv setzen und in die Kanäle der übrigen CJ-Produkte veröffentlichen; danach frisch lesen und die Seite abrufen, sonst zurück auf DRAFT.
   * Das Ledger lügt nie: «ZURUECK» steht nur, wenn der Shop DRAFT zurückliest (aufDraft); sonst «ZURUECK_FEHLGESCHLAGEN», der Lauf endet mit Exit 1 und fasst nichts mehr an,
   * denn das Produkt kann LIVE sein. Jeder Fehler NACH dem Setzen auf ACTIVE (auch ein Netzfehler, auch beim Setzen selbst) nimmt das Produkt zurück: nie ein ungeprüftes Produkt live lassen.
   * Die Notbremse (Freigabedatei) gilt vor dem Aktivieren und nach jedem Schritt danach: wer die Datei löscht, bekommt das Produkt zurück auf DRAFT.
   */
  async function veroeffentlichen(gid, plan, handle = plan.handle) {
    const e = plan.eingabe;
    let aktiv = false;
    const zurueck = async grund => ({ art: await aufDraft(gid, handle, grund) ? 'ZURUECKGENOMMEN' : 'ZURUECK_FEHLGESCHLAGEN', grund });
    try {
      const kanaele = await kanalListe();
      if (!kanaele) return { art: 'NICHT_VEROEFFENTLICHT', grund: 'Kanalliste aus den Referenzprodukten nicht ableitbar' };
      const ek = erlaubteKanaele(e.tags, kanaele.map(id => ({ id, name: id })));
      if (ek.sperrTags.length) return { art: 'NICHT_VEROEFFENTLICHT', grund: `Sperr-Tags ${ek.sperrTags.join(', ')}` };
      // jede SKU muss im ganzen Shop einmalig sein (zwei gleichzeitige Läufe oder ein Altprodukt) — vor dem Aktivieren, nicht danach
      const dup = await shop(SKU_ABFRAGE, { q: `sku:"${esc(e.variants[0].inventoryItem.sku)}"` });
      const fremd = (dup?.products?.nodes || []).filter(p => p.id !== gid);
      if (fremd.length) return { art: 'NICHT_VEROEFFENTLICHT', grund: `SKU ${e.variants[0].inventoryItem.sku} gehört auch ${fremd[0].handle} (${fremd[0].status}): Dublette` };
      if (!freigabeDa()) return { art: 'NICHT_VEROEFFENTLICHT', grund: 'Freigabedatei ist verschwunden: Stopp vor dem Aktivieren' };
      aktiv = true;     // ab hier kann das Produkt live sein, auch wenn der Aufruf selbst scheitert
      const s = await shop(STATUS_SETZEN, { p: { id: gid, status: 'ACTIVE' } });
      if (s?.productUpdate?.userErrors?.length) return { art: 'FEHLER', grund: `ACTIVE: ${JSON.stringify(s.productUpdate.userErrors).slice(0, 160)}` };
      if (!freigabeDa()) return await zurueck('Freigabedatei verschwunden: Stopp nach dem Aktivieren');
      const pv = await shop(VEROEFFENTLICHEN, { id: gid, p: ek.erlaubt.map(k => ({ publicationId: k.id })) });
      if (pv?.publishablePublish?.userErrors?.length) return await zurueck(`publishablePublish: ${JSON.stringify(pv.publishablePublish.userErrors).slice(0, 160)}`);
      if (!freigabeDa()) return await zurueck('Freigabedatei verschwunden: Stopp nach dem Veröffentlichen');
      const t = await toreAbwarten(gid, e, { nachFreigabe: true });
      if (!t.ok) return await zurueck(`Tore nach dem Veröffentlichen: ${t.tore.filter(x => x.ok !== true).map(x => x.name).join(', ')}`);
      const url = `https://${env.SHOP_DOMAIN || 'luxestyle.ch'}/products/${e.handle}?cb=${jetzt()}`;
      let status = 0;
      for (let i = 0; i < 3 && status !== 200; i++) {
        try { const r = await fetchFn(url, { method: 'GET', redirect: 'follow' }); status = r.status; try { await r.body?.cancel?.(); } catch { /* egal */ } } catch { status = 0; }
        if (status !== 200) await warte(5000);
      }
      if (status !== 200) return await zurueck(`Produktseite nicht erreichbar (HTTP ${status})`);
      if (!freigabeDa()) return await zurueck('Freigabedatei verschwunden: Stopp vor der Freigabe-Zeile');
      freigabeLedger(ledgerZeile(handle, 'FREI', `veröffentlicht in ${ek.erlaubt.length} Kanälen, Seite HTTP 200`, jetzt()));
      return { art: 'VEROEFFENTLICHT', grund: `${ek.erlaubt.length} Kanäle, Seite HTTP 200` };
    } catch (x) {
      if (!aktiv) return { art: 'FEHLER', grund: `Veröffentlichen vor dem Aktivieren: ${saniere(x.message, 100)}` };
      return await zurueck(`Fehler nach dem Aktivieren: ${saniere(x.message, 100)}`);
    }
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
