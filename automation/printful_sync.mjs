#!/usr/bin/env node
/* LuxeStyle — printful_sync.mjs (Version 3, 10.11.2026: «Bestellweg härten» nach der Gegenprüfung P1, zweite Runde nach den drei Gegenlesern: Fulfillment-Order-Status als Whitelist, frisches Lesen vergleicht Adresse/Positionen/Stopp-Tag,
 * Anspruch mit Nachlesen statt blosser Markierung, Menge «unlesbar» ist hart, negativer Mindestgewinn ist ein Fehler; Version 2 vom 05.11.2026, Strom 3 von «Selbst gestalten 100 %»)
 * Verbindet den eigenen „Selbst gestalten"-Editor mit dem Druck-Anbieter PRINTFUL.
 * Für jede BEZAHLTE, noch nicht synchronisierte Shopify-Bestellung mit POD-Artikeln (Tag wunschdesign + Editor-Druckdatei-Eigenschaft) legt es einen Printful-Auftrag an.
 *
 * Ablauf je Bestellung (reine Logik und Prüfungen: lib/printful_bestellweg.mjs und lib/printful_platzierung.mjs; Verhalten: automation/printful_sync_test.mjs):
 *   0. Gibt es bei Printful schon einen Auftrag mit external_id «LX<Bestellnummer>»? (GET /orders/@<external_id>; GEMESSEN 05.11.: 404 wenn nicht, `GET /orders?external_id=` filtert NICHT)
 *      Ja → nichts anlegen, nur Tag `printful-synced` + Metafeld nachtragen (ein gescheitertes Markieren führt nie mehr zu einem zweiten Auftrag), ABER erst nach dem Vergleich von Empfänger (Name, PLZ, Land) und Stückzahl:
 *      weicht der vorhandene Auftrag ab (fremder «LX…»-Auftrag, wiederverwendete Bestellnummer), gilt die Bestellung NICHT als erledigt (harter Befund «vorhanden-fremd»). Nicht prüfbar → nichts anlegen, später wieder.
 *      Hat ein früherer Lauf vor weniger als einer Stunde den Auftrag angelegt (Anspruchs-Tag `printful-anlegen-<JJJJMMTT>t<HHMM>-<SS><mmm>-<Zufall>`, gesetzt VOR dem POST und danach neu gelesen: den kleinsten Anspruch der letzten Stunde behält der Lauf, der übrige tritt zurück) und Printful zeigt ihn noch nicht, wird nichts neu angelegt.
 *   1. Planen: Variante aus der SKU (die der Position zuerst), Druckdateien aus den Eigenschaften (v6 ALT «🖼️ Druckdatei (<Platzierung>)», v6 NEU «_Druckdatei (<Platzierung>)» (vorgesehen, heute schreibt sie kein Editor),
 *      v5: Vorne/Hinten; `_vorschau` ist KEINE Druckdatei) mit den ECHTEN Printful-Platzierungen, Optionen (Garnfarben …), Konflikte, Technik, Auflösung (PNG/JPEG-Kopfzeile gegen Druckdatei und
 *      Mindest-dpi des Katalogs; dazu als weiche Gegenprobe die Angabe `_pod_karte.qd`), KI-Kontrolle, Empfänger. `_pod_karte.m` und `.pv` müssen zur SKU der Position passen.
 *      «Harte» Befunde (SKU ohne Variante, keine/unzulässige Datei, gemischte Schlüssel, Karte widerspricht der SKU, Adresse unbrauchbar, mehr als 50 Positionen, Position am Fulfillment-Service-Standort «dienst-standort»,
 *      gedruckte Aufpreis-Platzierung ohne bezahltes Paket «aufpreis-unbezahlt», Fulfillment-Order nicht OPEN «fulfillment-gehalten» (auch IN_PROGRESS zählt als gehalten), Datei-Eigenschaft an Fertigware «datei-bei-fertigware», Menge nicht lesbar «menge-unlesbar»): KEIN Auftrag, Tag `printful-review`,
 *      eine Meldung. Eine bezahlte Bestellung OHNE Design (`keine-druckdatei`) bleibt so liegen: keine Mail an die Kundin und keine Rückerstattung durch dieses Skript (dropship/wp6-0611/OHNE-DESIGN.md).
 *      Stand der Befundnamen und der Messung: dropship/wp6-0611/SYNC.md.
 *   1b. Kurz vor dem Anlegen wird die Bestellung in Shopify FRISCH gelesen (bezahlt = PAID, nicht storniert, kein Test, noch nicht von einem anderen Lauf bearbeitet, UNVERÄNDERT seit dem Planen: Lieferadresse samt E-Mail, Positionen samt Mengen,
 *      Fulfillment-Order-Status der geplanten Positionen) und die Markierung `printful-anlegen-<Zeit>-<Sekunden/ms>-<Zufall>` gesetzt. Danach werden die Tags NOCHMAL gelesen: nur der Lauf mit der kleinsten aktiven Markierung legt an
 *      (zwei gleichzeitige scharfe Läufe, etwa lokal neben Actions, legen sonst beide an; in Actions schliesst die Concurrency-Gruppe das ohnehin aus). Scheitert eines davon, wird nichts angelegt.
 *   2. Auftrag als ENTWURF anlegen (mit external_id), sofort Metafeld printful.order_id und ZULETZT das Tag `printful-synced` setzen (Fehler dabei werden gemeldet, Exit 1; steht das Tag nicht,
 *      findet der nächste Lauf den Entwurf über external_id und holt beides nach).
 *   3. Entwurf nachlesen (bis zu ~2 Minuten, 7 Lesungen): Dateistatus (Printful prüft die Dateien selbst), Kosten gegen den Shop-Erlös samt bezahltem Versand (Verlust oder weniger als der Mindestgewinn → kein Bestätigen).
 *      Der Entwurf wird gegen das Gesendete gehalten (gleiche Zahl Artikel, dieselben Dateitypen, Variante und Menge): leer oder abweichend ist ein Befund, nie «ok».
 *   4. Nur ohne jeden Befund UND wenn das Bestätigen erlaubt ist (lib `bestaetigenPlan`: PRINTFUL_AUTO_CONFIRM an, Kostenobergrenze gesetzt, KI-Kontrolle an) UND nach einem FRISCHEN Lesen der Bestellung in Shopify (bezahlt, nicht storniert, nicht
 *      erstattet, kein Test; sonst bleibt der Entwurf mit Befund «zahlung-geaendert»; ausserdem unverändert seit dem Planen und ohne Stopp-Tag `printful-review`, sonst Befund «bestellung-geaendert»): POST /orders/<id>/confirm, danach den Status NACHLESEN. «BESTÄTIGT» steht nur, wenn Printful pending/inprocess/… meldet;
 *      failed (Zahlung der Karte), onhold, canceled, draft → Befund, nie «bestätigt».
 *   Befunde: Tags `printful-review` + `printful-review-<art>` (wie `printful-problem-<art>` in printful_tracking.mjs): dieselbe Befundart wird nur EINMAL per Telegram gemeldet.
 *   Eine Bestellung mit Tag `printful-review` wird nicht mehr gelesen. Bei HARTEN Befunden (kein Auftrag angelegt) entfernt man nach der Behebung das Tag: der nächste Lauf versucht es neu. Bei WEICHEN
 *   Befunden gibt es schon einen Entwurf bei Printful (Tag `printful-synced`): den prüft und bestätigt man im Printful-Dashboard, das Entfernen des Tags bewirkt dort nichts.
 *   Vorübergehende Fehler (Netz, 429, 5xx): kein Tag ausser `printful-versuch-<n>`; nach 3 Läufen wird daraus ein Befund.
 * Gelesen werden alle Seiten der offenen Bestellungen (nicht nur die ersten MAX): Nicht-POD-Bestellungen verdrängen POD-Bestellungen nicht mehr.
 * Exit 1 bei technischem Fehler (Zugangsdaten fehlen, Shopify/Printful nicht erreichbar, Markieren gescheitert, Telegram-Meldung nicht zugestellt, Zeitlimit). Befunde sind KEIN Exit 1.
 * ENV: PRINTFUL_API_KEY (zwingend), [PRINTFUL_STORE_ID], [PRINTFUL_AUTO_CONFIRM=1 schaltet das Bestätigen EIN (Vorgabe 0 = Aufträge bleiben Entwürfe, Besitzer-Entscheid 05.11.); es wirkt NUR zusammen mit einer Kostenobergrenze
 *      (PRINTFUL_MAX_KOSTEN_USD; fehlt sie bei AUTO_CONFIRM=1, endet der Lauf mit Exit 1 und legt nichts an) UND eingeschalteter KI-Kontrolle (PRINTFUL_KI_KONTROLLE=pflicht); bei KI «aus» bleibt jede Bestätigung aus], SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      [PRINTFUL_KI_KONTROLLE=aus|pflicht (Vorgabe aus, Besitzer-Entscheid 05.11.; pflicht: ohne GEMINI_API_KEY oder bei Fehler der KI bleibt der Auftrag Entwurf)], [GEMINI_API_KEY], [PRINTFUL_KI_MODELL],
 *      [PRINTFUL_PAKET_BEZAHLT=kommagetrennte Platzierungs-IDs, die für alle Positionen als bezahlt gelten (Übergang; Standard leer = nur Vorderseite bezahlt; der Workflow reicht sie nicht durch)],
 *      [PRINTFUL_MAX_KOSTEN_USD=absolute Obergrenze der Printful-Summe je Auftrag in USD; Vorgabe aus (leer/0/aus); ein Auftrag darüber bleibt Entwurf mit Befund «kosten-obergrenze»; ein unbrauchbarer Wert beendet den Lauf mit Exit 1],
 *      [TELEGRAM_BOT_TOKEN/CHAT_ID], [MAX=20 POD-Bestellungen je Lauf], [PRINTFUL_MIN_NETTO_CHF=4: Mindestgewinn je Auftrag in CHF, 0 = nur Verluste halten; eine NEGATIVE Zahl beendet den Lauf mit Exit 1], [PRINTFUL_STITCH_COLOR=white|black: Nahtfarbe-Vorgabe
 *      für Produkte mit Option stitch_color (Entscheid des Besitzers; ohne sie bleiben diese Aufträge Entwurf)], [PRINTFUL_DATEI_HOSTS=weitere erlaubte Hosts], [RUN_LIMIT_MS=600000],
 *      [PF_PAUSE_MS=2500: Grundpause; die Wartezeit auf Dateien und Kosten ist 48 × PF_PAUSE_MS = 120 s],
 *      [PRINTFUL_LOG_DETAIL=1: Befundtexte auch in Log und Zusammenfassung (nur für Läufe auf dem eigenen Rechner: das Repo ist öffentlich, Actions-Protokolle sind es auch; sonst steht dort nur die Befundart)],
 *      [DRY_RUN: GESCHRIEBEN wird NUR bei ausdrücklichem 0/false/no/nein/off; alles andere, auch leer und nicht gesetzt, ist Trockenlauf: es wird gelesen, nichts geschrieben, nichts gemeldet (Stand 10.11.2026; vorher war «leer» scharf)]
 */
import { appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { neuerPlatzierungsCache } from './lib/printful_platzierung.mjs';
import {
  planeBestellung, istPod, externalId, empfaengerAus, kostenPruefen, statusBewerten, dateienStatus, befundPlan, versuche, versuchTag, MAX_VERSUCHE, esc,
  kontrolleLesen, kleineKopieUrl, REVIEW_TAG, ERLAUBTE_HOSTS, paketStandard, adresseProblem,
  zahlungPruefen, anlegenTag, anlegenAlterMin, anlegenGesperrt, anspruchGewonnen, ANLEGEN_SPERRE_MIN, vorhandenVergleichen, entwurfVergleichen, scopesBewerten, bestaetigenPlan, bestellStand, bestellAbweichung,
  scharfErlaubt, anspruchWarteLesen, anspruchLangsam, alsEntwurfAngelegt, dezimalLesen,
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
// Eine NEGATIVE Zahl ist ein Konfigurationsfehler (10.11.2026, Gegenleser Linse 1: «-100» hob die Verlustsperre still auf und bestätigte Verlustaufträge); ein Tippfehler wie «abc» ist es seit der Schlussprüfung ebenfalls (siehe unten).
// STRENG gelesen (Schlussprüfung 10.11.2026, Fund G4): nur eine Dezimalzahl wie «4», «0» oder «2.50» (dieselbe Regel wie für Printfuls Kostenzahlen in lib `num`). «0x10» (Number() läse 16), «1e2» (100), «abc», «Infinity»
// und «aus» sind Konfigurationsfehler mit Exit 1: ein Tippfehler darf nicht still eine andere Grenze setzen (früher fiel «abc» auf 4 zurück und «0x10» galt als 16). Leer oder nicht gesetzt = Vorgabe 4.
const NETTO_MIN_ROH = String(process.env.PRINTFUL_MIN_NETTO_CHF == null ? '' : process.env.PRINTFUL_MIN_NETTO_CHF).trim();
const NETTO_MIN_ZAHL = NETTO_MIN_ROH === '' ? null : dezimalLesen(NETTO_MIN_ROH);
const NETTO_MIN_LESBAR = NETTO_MIN_ROH === '' || NETTO_MIN_ZAHL !== null;
const NETTO_MIN_FEHLER = NETTO_MIN_ZAHL !== null && NETTO_MIN_ZAHL < 0;
const NETTO_MIN = NETTO_MIN_ZAHL !== null ? NETTO_MIN_ZAHL : 4;
// Absolute Obergrenze der Printful-Summe je Auftrag in USD (PRINTFUL_MAX_KOSTEN_USD). Vorgabe AUS (leer, 0, «aus»). Eine Zahl über 0 schaltet sie ein; jede andere Angabe (Tippfehler, negativ) ist ein Konfigurationsfehler
// und beendet den Lauf mit Exit 1, bevor etwas angelegt wird (eine falsch geschriebene Sicherung darf nicht still ausfallen).
const MAX_KOSTEN_ROH = String(process.env.PRINTFUL_MAX_KOSTEN_USD == null ? '' : process.env.PRINTFUL_MAX_KOSTEN_USD).trim().toLowerCase();
const MAX_KOSTEN_AUS = MAX_KOSTEN_ROH === '' || MAX_KOSTEN_ROH === '0' || MAX_KOSTEN_ROH === 'aus';
// STRENG gelesen wie der Mindestgewinn (Fund G4): «0x10» und «1e2» galten früher als 16 und 100 USD; jetzt ist alles ausser einer Dezimalzahl über 0 ein Konfigurationsfehler.
const MAX_KOSTEN_USD = MAX_KOSTEN_AUS ? null : dezimalLesen(MAX_KOSTEN_ROH);
const MAX_KOSTEN_FEHLER = !MAX_KOSTEN_AUS && !(MAX_KOSTEN_USD !== null && MAX_KOSTEN_USD > 0);
// Bezahltes Paket der Positionen (ÜBERGANG bis Phase 5 das Modell festlegt, siehe lib/printful_bestellweg.mjs `paketStandard`): Standard «nur Vorderseite bezahlt». PRINTFUL_PAKET_BEZAHLT = kommagetrennte Platzierungs-IDs
// (z. B. «back,sleeve_left»), die für ALLE Positionen als bezahlt gelten; der Workflow reicht die Variable bewusst NICHT durch (nur für Läufe auf dem eigenen Rechner). Eine ungültige ID beendet den Lauf mit Exit 1.
const PAKET_BEZAHLT = String(process.env.PRINTFUL_PAKET_BEZAHLT || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const PAKET_FEHLER = PAKET_BEZAHLT.filter((s) => !/^[a-z0-9_]+$/.test(s));
const paketVon = () => (PAKET_BEZAHLT.length ? { bezahlt: PAKET_BEZAHLT, quelle: 'PRINTFUL_PAKET_BEZAHLT' } : paketStandard());
const STITCH = String(process.env.PRINTFUL_STITCH_COLOR || '').trim().toLowerCase();
const OPTION_VORGABEN = STITCH ? { stitch_color: STITCH } : {};
const DETAIL = ['1', 'true', 'ja', 'yes', 'on'].includes(String(process.env.PRINTFUL_LOG_DETAIL || '').trim().toLowerCase());
const HOSTS = [...ERLAUBTE_HOSTS, ...String(process.env.PRINTFUL_DATEI_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)];
const RUN_LIMIT_MS = Number.isFinite(Number(process.env.RUN_LIMIT_MS)) && process.env.RUN_LIMIT_MS !== undefined && process.env.RUN_LIMIT_MS !== '' ? Number(process.env.RUN_LIMIT_MS) : 600000;
// Geschrieben wird NUR bei einem ausdrücklichen Nein (0, false, no, nein, off). Nicht gesetzt, leer und jede andere Angabe (auch ein Tippfehler) ist Trockenlauf: ein Weg, der Geld bewegen kann, ist standardmässig zu.
// Der Workflow setzt für «scharf» ausdrücklich DRY_RUN=0 (.github/workflows/printful-sync.yml); früher war das leere DRY_RUN «scharf».
const DRY = !['0', 'false', 'no', 'nein', 'off'].includes(String(process.env.DRY_RUN == null ? '' : process.env.DRY_RUN).trim().toLowerCase());
// SCHARF NUR IN GITHUB ACTIONS (Schlussprüfung 10.11.2026, Fund G1): zwei überlappende scharfe Läufe ergaben zwei Printful-Aufträge und zwei Bestätigungen (gemessen 5 von 5 mit verzögertem Tag-Schreiben). Das Schloss dagegen ist die
// Concurrency-Gruppe des Workflows; ein scharfer Lauf auf dem eigenen Rechner hat es nicht und ist darum ein Konfigurationsfehler (Exit 1 vor jedem Lesen und Schreiben), ausser PRINTFUL_LOKAL_SCHARF=1 (laute Warnzeile).
const SCHARF = scharfErlaubt({ dry: DRY, githubActions: process.env.GITHUB_ACTIONS, lokalScharf: process.env.PRINTFUL_LOKAL_SCHARF });
// Wartezeit zwischen dem Setzen der eigenen Markierung und dem Nachlesen (zweite Sicherung, lib `anspruchGewonnen`): Vorgabe 3000 ms. PRINTFUL_ANSPRUCH_WARTE_MS ist NUR für Tests da (kein Workflow setzt sie, ein Test hält das fest);
// unter 2000 ms ist ein Konfigurationsfehler, ausser die Test-Kennung PRINTFUL_ANSPRUCH_TESTKENNUNG steht (sie gehört in keinen echten Lauf und in keine Workflow-Datei).
const WARTE = anspruchWarteLesen(process.env.PRINTFUL_ANSPRUCH_WARTE_MS, { testKennung: process.env.PRINTFUL_ANSPRUCH_TESTKENNUNG });
const ANSPRUCH_WARTE_MS = WARTE.ms;
// Shopify unterstützt 2026-01 bis ca. 16.01.2027 (QUELLE shopify.dev laut Prüfer 03.11.2026; Wiedervorlage Dezember 2026). Die alte Fassung lief auf dem abgelaufenen 2025-01.
const API = '2026-01';
// Bestellungen je Seite. GEMESSEN 05.11.2026 (extensions.cost): 10 Bestellungen × lineItems(first:50) = 158 angefragte Punkte, 25 × 25 = 206; verfügbar 2000. 20 × 50 bleibt weit darunter.
// Mit den Fulfillment-Orders (Dienst-Standort, 09.11.2026) GEMESSEN über die Admin-Abfrage des Connectors (API 2026-10, Treffer 0, nur die Kostenprüfung vor der Ausführung): 20 Bestellungen werden angenommen,
// 50 scheitern mit «Query cost is 1003» gegen die Grenze 1000 (also rund 20 Punkte je Bestellung). SEITE nicht über 49 anheben, sonst lehnt Shopify die Abfrage ab (dann bricht jeder Lauf mit einem Fehler ab).
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
let scopeHinweis = '';   // Zusatz für den harten Befund «dienst-standort-unklar», wenn dem Token ein Recht für Fulfillment-Orders fehlt
let abbruch = null;      // Grund, aus dem der Lauf für ALLE weiteren Bestellungen endet (Fund G2: Printful legte einen Auftrag nicht als Entwurf an). null = weiter

// Bestätigen nur mit Kostenobergrenze UND eingeschalteter KI-Kontrolle (lib `bestaetigenPlan`); AUTO_CONFIRM=1 ohne Obergrenze ist ein Konfigurationsfehler, auch im Trockenlauf.
const BEST = bestaetigenPlan({ autoConfirm: AUTO_CONFIRM, ki: KI, maxKostenAus: MAX_KOSTEN_AUS });
const BESTAETIGEN = BEST.bestaetigen;
if (!SCHARF.ok) { console.error(`❌ ${SCHARF.grund}.`); process.exit(1); }
if (WARTE.fehler) { console.error(`❌ ${WARTE.fehler}.`); process.exit(1); }
if (BEST.konfigFehler) { console.error(`❌ ${BEST.konfigFehler}.`); process.exit(1); }
if (!NETTO_MIN_LESBAR) { console.error(`❌ PRINTFUL_MIN_NETTO_CHF ist keine Dezimalzahl (steht: «${NETTO_MIN_ROH.slice(0, 30)}»; erlaubt sind Zahlen wie 4, 0 oder 2.50, leer gilt 4): es wird nichts angelegt.`); process.exit(1); }
if (NETTO_MIN_FEHLER) { console.error(`❌ PRINTFUL_MIN_NETTO_CHF ist negativ (steht: «${NETTO_MIN_ROH.slice(0, 30)}»): ein negativer Mindestgewinn würde die Verlustsperre aufheben. 0 hält nur Verluste an, leer gilt 4: es wird nichts angelegt.`); process.exit(1); }
if (MAX_KOSTEN_FEHLER) { console.error(`❌ PRINTFUL_MAX_KOSTEN_USD ist keine Zahl über 0 (steht: «${MAX_KOSTEN_ROH.slice(0, 30)}»; leer, 0 oder «aus» schaltet die Obergrenze ab): es wird nichts angelegt.`); process.exit(1); }
if (PAKET_FEHLER.length) { console.error(`❌ PRINTFUL_PAKET_BEZAHLT enthält ungültige Platzierungs-IDs (${PAKET_FEHLER.map((s) => s.slice(0, 20)).join(', ')}; erlaubt: a-z, 0-9, Unterstrich): es wird nichts angelegt.`); process.exit(1); }
if (!PF_KEY) { console.error('❌ Kein PRINTFUL_API_KEY: der Bestellweg kann nichts tun (früher stiller No-op mit Exit 0, jetzt sichtbar).'); process.exit(1); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.error('❌ Keine Shopify-Zugangsdaten (SHOPIFY_CLIENT_ID/SECRET oder SHOPIFY_ADMIN_TOKEN): der Bestellweg kann nichts tun.'); process.exit(1); }
if (SCHARF.lokal) console.warn('⚠️ SCHARFER LAUF AUSSERHALB VON GITHUB ACTIONS (PRINTFUL_LOKAL_SCHARF=1): die Concurrency-Gruppe des Workflows schützt diesen Lauf NICHT. Nie gleichzeitig mit dem Workflow «Printful-Sync» starten, sonst sind zwei Aufträge für eine Bestellung möglich.');
if (!DRY && WARTE.test) console.warn(`⚠️ TEST-KENNUNG gesetzt (PRINTFUL_ANSPRUCH_TESTKENNUNG): die Wartezeit vor dem Nachlesen der Markierung ist ${ANSPRUCH_WARTE_MS} ms. Das ist nur für Läufe gegen Attrappen gedacht, nie für einen echten Lauf.`);

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

// Fulfillment-Orders mit Status, Standort und Positionen: in der Liste UND im frischen Lesen (Status ON_HOLD, Dienst-Standort … können sich zwischen Plan und Bestätigen ändern)
const FO_Q = `fulfillmentOrders(first:20){ pageInfo{ hasNextPage } edges{ node{ id status assignedLocation{ location{ id name isFulfillmentService } }
    lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ lineItem{ id } } } } } } }`;
// Lieferadresse: in der Liste UND im frischen Lesen dieselben Felder (der Vergleich beim Bestätigen braucht sie gleich)
const ADRESSE_Q = `shippingAddress{ name firstName lastName address1 address2 city provinceCode countryCodeV2 zip phone }`;
const ORDERS_Q = `query($q:String!,$n:Int!,$c:String){ orders(first:$n, after:$c, query:$q, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } edges{ node{
  id name email tags cancelledAt test displayFinancialStatus
  currentShippingPriceSet{ shopMoney{ amount currencyCode } }
  ${ADRESSE_Q}
  lineItems(first:50){ pageInfo{ hasNextPage } edges{ node{ id quantity currentQuantity sku title
    discountedTotalSet{ shopMoney{ amount currencyCode } }
    product{ productType tags metafield(namespace:"custom", key:"print_file"){ value } }
    variant{ sku title selectedOptions{ name value } }
    customAttributes{ key value } } } }
  ${FO_Q}
}}}}`;
// FRISCHES Lesen einer einzelnen Bestellung (vor dem Anlegen und vor dem Bestätigen): Zahlung UND der Stand, auf dem der Plan beruht (Lieferadresse samt E-Mail, Positionen mit Menge, Fulfillment-Orders): ändert sich etwas davon, bevor der Entwurf bestätigt wird, bleibt er liegen.
const FRISCH_Q = `query($id:ID!){ node(id:$id){ ... on Order { id name tags cancelledAt test displayFinancialStatus email
  ${ADRESSE_Q}
  lineItems(first:50){ edges{ node{ currentQuantity quantity id } } }
  ${FO_Q}
} } }`;
// Nur die Tags (zweites Lesen nach dem Setzen der eigenen Markierung: wer hat zuerst markiert?)
const ANSPRUCH_Q = `query($id:ID!){ node(id:$id){ ... on Order { id tags } } }`;
// Zugriffsrechte des Tokens (für die Standort-Sperre: sieht das Token die Fulfillment-Orders beider Standortarten?)
const SCOPES_Q = `{ currentAppInstallation { accessScopes { handle } } }`;
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

// Die Bestellung kurz vor dem Anlegen und vor dem Bestätigen FRISCH aus Shopify lesen. Die Liste am Anfang des Laufs kann Minuten alt sein (Wartezeiten, bis zu 20 Bestellungen); storniert oder erstattet die Kundin in der Zeit,
// darf Printful nicht belasten. Seit dem 10.11.2026 (Gegenleser Linse 1) wird auch der Stand verglichen, auf dem der Plan beruht (`soll` = `bestellStand`): Lieferadresse samt E-Mail, Positionen samt Mengen und der
// Fulfillment-Order-Status der geplanten Positionen (ON_HOLD, Dienst-Standort …); vor dem Bestätigen zählt auch das Stopp-Tag `printful-review`.
// @param stufe 'anlegen' (prüft zusätzlich, ob ein anderer Lauf die Bestellung schon bearbeitet hat) | 'bestaetigen'
// @returns {Promise<{art:'ok'|'zahlung'|'schon-bearbeitet'|'geaendert'|'unlesbar', text:string, zahlung?:string}>}
async function frischLesen(tok, o, stufe, soll) {
  let n = null;
  try {
    const r = await gql(tok, FRISCH_Q, { id: o.id });
    n = r && r.data && r.data.node;
  } catch (e) { return { art: 'unlesbar', text: `Shopify liess sich nicht lesen (${String(e && e.message || e).slice(0, 120)})` }; }
  if (!n || typeof n !== 'object' || n.id !== o.id) return { art: 'unlesbar', text: 'Shopify liefert die Bestellung nicht (mehr)' };
  const z = zahlungPruefen(n);
  if (!z.ok) return z.art === 'unlesbar' ? { art: 'unlesbar', text: z.text } : { art: 'zahlung', text: z.text, zahlung: z.art };
  const tags = Array.isArray(n.tags) ? n.tags : null;
  if (!tags) return { art: 'unlesbar', text: 'Das Feld «tags» fehlt in der Antwort' };
  if (stufe === 'anlegen') {
    if (tags.includes('printful-synced') || tags.includes(REVIEW_TAG)) return { art: 'schon-bearbeitet', text: 'ein anderer Lauf hat die Bestellung inzwischen bearbeitet (Tag printful-synced oder printful-review)' };
    const alter = anlegenAlterMin(tags, Date.now());
    if (anlegenGesperrt(alter)) return { art: 'schon-bearbeitet', text: `ein anderer Lauf hat vor ${alter} Minuten angefangen, den Auftrag anzulegen` };
  } else if (tags.includes(REVIEW_TAG)) return { art: 'geaendert', text: 'die Bestellung trägt jetzt das Stopp-Tag printful-review (von Hand oder von einem anderen Lauf gesetzt)' };
  const ab = soll ? bestellAbweichung(n, soll) : null;
  if (ab) return { art: ab.art, text: ab.text };
  return { art: 'ok', text: 'bezahlt, nicht storniert, kein Test, unverändert seit dem Planen' };
}
// Nach dem Setzen der eigenen Markierung: gewinnt sie gegen gleichzeitige Läufe? Nur die Tags werden erneut gelesen.
async function anspruchPruefen(tok, o, meinTag, allein = false) {
  let n = null;
  try { const r = await gql(tok, ANSPRUCH_Q, { id: o.id }); n = r && r.data && r.data.node; } catch (e) { return { art: 'unlesbar', text: `Shopify liess sich nicht lesen (${String(e && e.message || e).slice(0, 120)})` }; }
  if (!n || typeof n !== 'object' || n.id !== o.id || !Array.isArray(n.tags)) return { art: 'unlesbar', text: 'die Tags der Bestellung sind nicht lesbar' };
  const g = anspruchGewonnen(n.tags, meinTag, Date.now(), { allein });
  if (g.art === 'eigene-fehlt') return { art: 'unlesbar', text: g.grund };      // die eigene Markierung ist nicht zu sehen: ein Lesefehler, kein Verlust gegen einen anderen Lauf (sichtbar machen, nicht still liegen lassen)
  if (g.art === 'nicht-allein') return { art: 'nicht-allein', text: g.grund };  // die eigene Markierung kam spät an und eine zweite steht da: nichts anlegen und SICHTBAR machen (ob der andere Lauf anlegt, ist offen)
  return g.ok ? { art: 'ok', text: '' } : { art: 'verloren', text: g.grund };
}
// Zugriffsrechte des Tokens: sieht es die Fulfillment-Orders des Händler- UND des Dienst-Standorts? (Diagnose; die Sperre pro Position gilt unabhängig davon.)
async function scopesLesen(tok) {
  try {
    const r = await gql(tok, SCOPES_Q, undefined, false);
    const l = r && r.data && r.data.currentAppInstallation && r.data.currentAppInstallation.accessScopes;
    return scopesBewerten(Array.isArray(l) ? l.map((x) => x && x.handle).filter(Boolean) : null);
  } catch { return scopesBewerten(null); }
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
// Weiterleitungen werden NICHT blind verfolgt (sonst könnte ein erlaubter Host auf einen fremden verweisen): jedes Ziel wird erneut gegen die Host-Liste geprüft, höchstens 3 Sprünge; ein unerlaubtes Ziel ergibt status 0 (nicht prüfbar).
async function holeKopf(url, sprung = 0) {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-65535' }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers && r.headers.get && r.headers.get('location');
      let ziel = null; try { ziel = new URL(String(loc || ''), url).href; } catch { /* kein brauchbares Ziel */ }
      if (!ziel || sprung >= 3 || adresseProblem(ziel, HOSTS)) return { status: 0, bytes: null };
      return holeKopf(ziel, sprung + 1);
    }
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
  // Im Trockenlauf wird NICHTS nach aussen gesendet, auch kein Kundenbild an Google (10.11.2026, Gegenleser Linse 1: der Trockenlauf mit KI «pflicht» sandte das Bild trotzdem an Gemini). Kein Befund, kein «ok» der KI.
  if (DRY) return { art: 'trocken', text: '(Trockenlauf: die KI-Kontrolle wurde nicht ausgeführt, es wurde kein Bild an Google gesendet)' };
  if (!GEMINI) return { art: 'fehlt', text: 'keine KI-Kontrolle eingerichtet (GEMINI_API_KEY fehlt; PRINTFUL_KI_KONTROLLE=aus verzichtet ausdrücklich darauf)' };
  try {
    const r = await fetch(kleineKopieUrl(url), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
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
  // 0b. Hat ein früherer Lauf vor kurzem angefangen, den Auftrag anzulegen (Markierung VOR dem POST), und Printful zeigt ihn noch nicht? Dann nichts neu anlegen: ein zweiter POST könnte ein Doppel werden (ob Printful eine doppelte external_id ablehnt, ist ungemessen).
  const frueher = anlegenAlterMin(o.tags, Date.now());
  if (anlegenGesperrt(frueher)) {
    zaehler.spaeter++;
    zeilen.push(`${o.name}: wartet (ein früherer Lauf hat vor ${frueher} Minuten angefangen, den Auftrag anzulegen; Printful zeigt ihn noch nicht)`);
    console.log(`${o.name}: ein früherer Lauf hat vor ${frueher} Minuten angefangen, den Auftrag anzulegen (Sperre ${ANLEGEN_SPERRE_MIN} Minuten): nichts neu angelegt`);
    return;
  }
  // 1. Planen
  const plan = await planeBestellung(o, io, { hosts: HOSTS, optionVorgaben: OPTION_VORGABEN, paket: paketVon, scopeHinweis });
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
    const wie = `${plan.items.length} Artikel, external_id ${ext}: würde als Entwurf angelegt und ${BESTAETIGEN && !befunde.length ? 'danach bestätigt (vorbehaltlich ' + (KI === 'pflicht' ? 'KI-Kontrolle der Druckdatei (im Trockenlauf nicht ausgeführt), ' : '') + 'Dateistatus, Kosten und frischem Lesen der Bestellung)' : 'NICHT bestätigt'}`;
    zeilen.push(`${o.name}: ${wie}${befunde.length ? ' [' + [...new Set(befunde.map((b) => b.art))].join(', ') + ']' : ''}`);
    console.log(`[DRY] ${o.name}: ${wie}${befunde.length ? ' (REVIEW: ' + [...new Set(befunde.map((b) => b.art))].join(', ') + ')' : ''}`);
    if (DETAIL) for (const b of befunde) console.log(`[DRY]   [${b.art}] ${b.text}`);
    return;
  }
  // 1b. Frisch lesen (bezahlt, nicht storniert, kein Test, nicht von einem anderen Lauf bearbeitet, unverändert seit dem Planen) und die Markierung VOR dem POST setzen. Scheitert eines von beiden, wird nichts angelegt.
  const soll = bestellStand(o, plan.positionIds);
  const fr = await frischLesen(tok, o, 'anlegen', soll);
  if (fr.art === 'schon-bearbeitet') { zaehler.vorhanden++; console.log(`${o.name}: ${fr.text}: nichts angelegt`); return; }
  if (fr.art === 'geaendert') { zaehler.spaeter++; zeilen.push(`${o.name}: wartet (die Bestellung hat sich seit dem Planen geändert; der nächste Lauf liest neu)`); console.log(`${o.name}: ${fr.text}: nichts angelegt (der Plan beruht auf einem veralteten Stand; der nächste Lauf liest neu)`); return; }
  if (fr.art === 'zahlung') { zaehler.ohneAuftrag++; await befundMelden(tok, o, [{ art: 'zahlung-geaendert', text: `Die Bestellung ist laut frischem Lesen aus Shopify nicht mehr druckbar: ${fr.text}`, hart: true }], 'wurde NICHT an Printful übergeben'); return; }
  if (fr.art !== 'ok') { await vorlaeufigerFehler(tok, o, `Shopify lässt sich vor dem Anlegen nicht frisch lesen: es wird nichts angelegt`, fr.text); return; }
  // Der Anspruch trägt Sekunden, Millisekunden und einen Zufallsteil: zwei Läufe, die gleichzeitig markieren, haben verschiedene Tags. Danach wird nachgelesen; nur der Lauf mit der kleinsten Markierung legt an.
  // Schlussprüfung 10.11.2026 (Fund G1): zwischen dem Setzen und dem Nachlesen wird GEWARTET (Vorgabe 3000 ms). Ohne die Wartezeit sah der spätere Lauf die noch nicht angekommene Markierung des früheren nicht und beide legten an
  // (Schreiben und Lesen verschränkt; gemessen 5 von 5 Doppelbestätigungen). Die Dauer des eigenen Schreibens wird gemessen: brauchte es länger als die halbe Wartezeit, legt dieser Lauf nur an, wenn er ALLEIN markiert hat.
  const t0Anspruch = performance.now();
  const meinTag = anlegenTag(Date.now(), randomBytes(4).toString('hex'));
  if (!(await tagsSetzen(tok, o, [meinTag]))) { fehlerAdd(`${o.name}: Markierung vor dem Anlegen nicht gesetzt: es wird nichts angelegt`); return; }
  const schreibMs = Math.round(performance.now() - t0Anspruch);
  const langsam = anspruchLangsam(schreibMs, ANSPRUCH_WARTE_MS);
  await pause(ANSPRUCH_WARTE_MS);
  const anspruch = await anspruchPruefen(tok, o, meinTag, langsam);
  if (anspruch.art === 'verloren') { zaehler.vorhanden++; console.log(`${o.name}: ${anspruch.text}: nichts angelegt`); return; }
  if (anspruch.art === 'nicht-allein') { zaehler.spaeter++; zeilen.push(`${o.name}: wartet (die eigene Markierung brauchte ${schreibMs} ms, eine zweite steht an der Bestellung)`); fehlerAdd(`${o.name}: die Markierung vor dem Anlegen brauchte ${schreibMs} ms (Grenze ${Math.floor(ANSPRUCH_WARTE_MS / 2)} ms) und ein zweiter Lauf hat ebenfalls markiert: es wird nichts angelegt. Legt der andere Lauf nicht an, versucht es der nächste Lauf nach Ablauf der Sperre (${ANLEGEN_SPERRE_MIN} Minuten)`); return; }
  if (anspruch.art !== 'ok') { fehlerAdd(`${o.name}: Markierung vor dem Anlegen gesetzt, aber nicht nachlesbar (${anspruch.text}): es wird nichts angelegt`); return; }
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
  // 2b. Ist der Auftrag wirklich ein ENTWURF? (Schlussprüfung 10.11.2026, Fund G2.) Meldet Printful etwas anderes als «draft» (Store-Einstellung «automatisch bestätigen», geänderter Vorgabewert, API-Änderung), ist er womöglich schon
  // bezahlt, bevor Dateistatus, Kosten, Obergrenze, KI und frisches Lesen liefen. Dann: sofort melden (🔴), die Bestellung markieren (printful-synced + Stopp-Tag, damit kein Lauf sie nochmal anfasst) und den LAUF BEENDEN:
  // keine weitere Bestellung wird angelegt, Exit 1. Nichts wird bestätigt, nichts storniert (das entscheidet der Mensch im Printful-Dashboard).
  const entwurf = alsEntwurfAngelegt(res.j.result);
  if (!entwurf.ok) {
    abbruch = `Printful hat den Auftrag #${pfId} für ${o.name} NICHT als Entwurf angelegt (Status «${entwurf.status}»)`;
    zaehler.entwuerfe++;
    console.error(`🔴 ${o.name} → Printful #${pfId}: NICHT als Entwurf angelegt (Status «${entwurf.status}»): der Lauf endet hier, keine weitere Bestellung wird angelegt`);
    fehlerAdd(`${o.name}: Printful hat den Auftrag #${pfId} nicht als Entwurf angelegt (Status «${entwurf.status}»): Lauf beendet, im Printful-Dashboard prüfen`);
    if (!(await tagsSetzen(tok, o, ['printful-synced'], pfId))) fehlerAdd(`${o.name}: Printful-Auftrag #${pfId} angelegt, aber Metafeld/Tag nicht gesetzt`);
    await befundMelden(tok, o, [{ art: 'nicht-als-entwurf-angelegt', text: `Printful hat den Auftrag #${pfId} beim Anlegen NICHT als Entwurf zurückgemeldet, sondern mit Status «${entwurf.status}»: er ist womöglich schon bestätigt und bezahlt, OHNE dass Dateien, Kosten, Obergrenze und KI geprüft wurden. Sofort im Printful-Dashboard ansehen (stornieren, falls nötig) und die Store-Einstellung zum automatischen Bestätigen prüfen. Der Lauf wurde beendet, keine weitere Bestellung angelegt`, hart: true }], `→ Printful #${pfId}: NICHT als Entwurf angelegt`);
    return;
  }
  // 3. Sofort markieren: Metafeld, dann Tag. Gelingt das nicht, wird NICHT bestätigt; der nächste Lauf findet den Entwurf über external_id und holt es nach.
  if (!(await tagsSetzen(tok, o, ['printful-synced'], pfId))) { fehlerAdd(`${o.name}: Printful-Entwurf #${pfId} angelegt, aber Metafeld/Tag nicht gesetzt (nicht bestätigt; der nächste Lauf findet ihn über external_id ${ext} und markiert ihn nach)`); zaehler.entwuerfe++; return; }
  // 4. Entwurf nachlesen: Dateien und Kosten
  const weich = befunde.slice();
  const urteilEntwurf = (ord) => ({ d: dateienStatus(ord), v: entwurfVergleichen(ord, plan.items), k: kostenPruefen({ costs: ord.costs, erloesChf: plan.erloesChf, nettoMin: NETTO_MIN, maxUsd: MAX_KOSTEN_USD }) });
  // fertig = Printful hat die Dateien geprüft (nicht «waiting») UND die Kosten gerechnet (total vorhanden, nicht «calculating»); sonst nach kurzer Pause nochmal lesen
  const lese = await auftragLesen(pfId, (ord) => { const u = urteilEntwurf(ord), c = ord.costs; const gerechnet = !!c && c.total !== null && c.total !== undefined && c.total !== '' && String(c.calculation_status || 'done').toLowerCase() === 'done'; return u.d.art === 'wartet' || !gerechnet ? null : u; });
  console.log(`${o.name}: Printful-Entwurf #${pfId}: Dateien und Kosten ${lese.urteil ? 'fertig' : 'NICHT fertig'} nach ${lese.sek} s Wartezeit`);   // misst, wie lange Printful wirklich braucht (bisher ungemessen)
  if (!lese.order) weich.push({ art: 'entwurf-nicht-lesbar', text: `Entwurf #${pfId} lässt sich nach ${lese.sek} s nicht nachlesen (HTTP ${lese.status || 0}): Dateien und Kosten ungeprüft`, hart: false });
  else {
    const { d, v, k } = lese.urteil || urteilEntwurf(lese.order);
    if (d.art === 'problem') for (const t of d.texte) weich.push({ art: 'datei-abgelehnt', text: t, hart: false });
    else if (d.art === 'wartet') weich.push({ art: 'datei-wartet', text: d.leer ? `Der Entwurf nennt nach ${lese.sek} Sekunden Wartezeit keine einzige Datei: Entwurf im Printful-Dashboard ansehen und von Hand bestätigen` : d.teilweise ? `Mindestens ein Artikel des Entwurfs führt nach ${lese.sek} Sekunden Wartezeit noch keine Datei: Entwurf im Printful-Dashboard ansehen und von Hand bestätigen` : `Printful hat die Dateien nach ${lese.sek} Sekunden Wartezeit noch nicht fertig geprüft: Entwurf im Printful-Dashboard ansehen und von Hand bestätigen`, hart: false });
    if (!v.ok) for (const t of v.texte) weich.push({ art: 'entwurf-abweichend', text: `Der Printful-Entwurf weicht vom Gesendeten ab: ${t}`, hart: false });
    if (!k.ok) weich.push({ art: k.art, text: k.art === 'kosten-unbekannt' ? `${k.text} (nach ${lese.sek} Sekunden Wartezeit)` : k.text, hart: false });
  }
  if (!BESTAETIGEN) weich.push({ art: 'manuell', text: `${BEST.grund}: Entwurf im Printful-Dashboard prüfen und bestätigen`, hart: false });
  if (weich.length) {
    zaehler.entwuerfe++;
    console.log(`${o.name} → Printful #${pfId} ENTWURF (Review)`);
    await befundMelden(tok, o, weich, `→ Printful-Entwurf #${pfId} (nicht bestätigt)`);
    return;
  }
  // 4b. KURZ vor dem Bestätigen die Bestellung noch einmal frisch aus Shopify lesen: zwischen der Liste am Anfang und hier liegen Wartezeiten von Sekunden bis Minuten; storniert oder erstattet die Kundin in der Zeit, bleibt der Entwurf.
  const fr2 = await frischLesen(tok, o, 'bestaetigen', soll);
  if (fr2.art !== 'ok') {
    zaehler.entwuerfe++;
    console.log(`${o.name} → Printful #${pfId} ENTWURF (Review)`);
    const befundArt = fr2.art === 'zahlung' ? 'zahlung-geaendert' : fr2.art === 'geaendert' ? 'bestellung-geaendert' : 'zahlung-unlesbar';
    const befundText = fr2.art === 'zahlung' ? `Die Bestellung ist laut frischem Lesen vor dem Bestätigen nicht mehr druckbar: ${fr2.text}. Entwurf #${pfId} im Printful-Dashboard löschen`
      : fr2.art === 'geaendert' ? `Die Bestellung hat sich seit dem Anlegen des Entwurfs geändert: ${fr2.text}. Entwurf #${pfId} nicht bestätigt; im Printful-Dashboard mit der Bestellung vergleichen und bei Abweichung löschen`
      : `Shopify liess sich vor dem Bestätigen nicht frisch lesen (${fr2.text}): Entwurf #${pfId} nicht bestätigt, im Printful-Dashboard prüfen`;
    await befundMelden(tok, o, [{ art: befundArt, text: befundText, hart: false }], `→ Printful-Entwurf #${pfId} (nicht bestätigt)`);
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
  // Passt der vorhandene Auftrag zu DIESER Bestellung (Empfänger, Stückzahl)? Sonst ist die Kennung fremd belegt (wiederverwendete Bestellnummer, von Hand angelegter «LX…»-Auftrag): die Bestellung gilt NICHT als erledigt.
  const passt = vorhandenVergleichen(ord, o);
  if (!passt.ok) {
    console.log(`${o.name}: Printful-Auftrag #${ord.id} trägt die external_id ${ext}, passt aber nicht zur Bestellung (${passt.texte.length} Abweichung(en)): nichts angelegt, nicht als erledigt markiert`);
    await befundMelden(tok, o, [{ art: 'vorhanden-fremd', text: `Printful-Auftrag #${ord.id} trägt die external_id ${ext}, passt aber nicht zu dieser Bestellung (${passt.texte.join('; ')}). Nichts angelegt und nicht als erledigt markiert; selbst klären`, hart: true }], 'hat einen fremden Printful-Auftrag mit gleicher Kennung');
    return;
  }
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
  // Zugriffsrechte des Tokens für Fulfillment-Orders: fehlt eines, sind die Orders dieser Standortart unsichtbar (die Standort-Sperre käme nur noch über «unklar»). Im scharfen Lauf wird dann nichts bearbeitet; im Trockenlauf wird weiter gelesen (Exit 1 macht den Mangel sichtbar).
  const scopes = await scopesLesen(tok);
  console.log(`Zugriffsrechte des Tokens für Fulfillment-Orders: ${scopes.art === 'ok' ? 'beide Standortarten lesbar' : scopes.art === 'fehlt' ? 'FEHLT: ' + scopes.fehlt.join(', ') : 'nicht abfragbar (die Sperre pro Position gilt trotzdem)'}`);
  if (scopes.art === 'fehlt') { scopeHinweis = `dem Token fehlt das Recht ${scopes.fehlt.join(', ')}`; fehlerAdd(`Dem Shopify-Token fehlt ${scopes.fehlt.join(', ')}: die Fulfillment-Orders sind nicht lesbar${DRY ? '' : ', es wird nichts bearbeitet'}`); }
  // Bezahlt, unversendet, noch nicht synchronisiert, nicht in der Prüfung. ALLE Seiten lesen, bis MAX POD-Bestellungen da sind (Nicht-POD-Bestellungen verdrängen sie nicht mehr).
  // «-test:true» und «financial_status:paid» sind nur die Vorauswahl der Suche; ob eine Bestellung wirklich bezahlt, nicht storniert und kein Test ist, urteilt `zahlungPruefen` am Knoten (und noch einmal frisch vor dem Anlegen und Bestätigen).
  const q = 'status:open financial_status:paid fulfillment_status:unfulfilled -test:true -tag:printful-synced -tag:printful-review';
  const kandidaten = []; let cursor = null, seiten = 0, mehr = false;
  while (kandidaten.length < MAX && !(scopes.art === 'fehlt' && !DRY)) {
    const d = await gql(tok, ORDERS_Q, { q, n: SEITE, c: cursor });
    const conn = d && d.data && d.data.orders;
    if (!conn) throw new Error('Shopify: keine Bestellliste in der Antwort');
    seiten++;
    for (const e of conn.edges || []) {
      const n = e && e.node; if (!n) continue;
      zaehler.gelesen++;
      const lis = ((n.lineItems && n.lineItems.edges) || []).map((x) => x && x.node).filter(Boolean).filter((li) => li.currentQuantity !== 0);   // nachträglich entfernte/erstattete Positionen zählen nicht
      // Prüfen, wenn eine Position Editor-Ware ist, eine Druckdatei-Eigenschaft trägt (auch ohne POD-Tag: Befund) oder die Positionsliste länger ist als eine Abfrage (die 51. könnte Editor-Ware sein)
      if (!(lis.some((li) => istPod(li) || hatDruckdatei(li)) || (n.lineItems && n.lineItems.pageInfo && n.lineItems.pageInfo.hasNextPage))) continue;
      // Bezahlt, nicht storniert, kein Test: am Knoten geprüft, nicht nur über den Suchstring. Eine stornierte, noch nicht erstattete Bestellung und eine Testbestellung dürfen nie gedruckt werden; ein fehlendes Feld ist «unlesbar» (nie bezahlt).
      const z = zahlungPruefen(n);
      if (!z.ok) { if (z.art === 'unlesbar') fehlerAdd(`${n.name}: Zahlungsstatus nicht lesbar (${z.text}): wird nicht an Printful übergeben`); else console.log(`${n.name}: ${z.text}, wird nicht an Printful übergeben`); continue; }
      kandidaten.push(n);
    }
    mehr = !!(conn.pageInfo && conn.pageInfo.hasNextPage);
    if (!mehr) break;
    cursor = conn.pageInfo.endCursor;
    if (seiten >= MAX_SEITEN) { fehlerAdd(`Seitenlimit (${MAX_SEITEN} Seiten) erreicht: weitere offene Bestellungen blieben ungelesen`); break; }
  }
  if (scopes.art === 'fehlt' && !DRY) console.log('Es wurde keine Bestellung gelesen und nichts bearbeitet: dem Token fehlt ein Recht für Fulfillment-Orders (siehe Fehler).');
  else if (!kandidaten.length) console.log(`Keine offenen POD-Bestellungen zum Synchronisieren (${zaehler.gelesen} offene Bestellung(en) in ${seiten} Seite(n) gelesen).`);
  for (const o of kandidaten.slice(0, MAX)) {
    if (Date.now() - START > RUN_LIMIT_MS) { fehlerAdd(`Zeitlimit (${Math.round(RUN_LIMIT_MS / 1000)} s) erreicht: ${o.name} und die folgenden Bestellungen bleiben für den nächsten Lauf`); break; }
    try { await bearbeite(tok, o); } catch (e) { fehlerAdd(`${o.name}: unerwarteter Fehler`, String(e && e.message || e).slice(0, 200)); }
    if (abbruch) { const rest = kandidaten.slice(0, MAX).length - kandidaten.slice(0, MAX).indexOf(o) - 1; fehlerAdd(`LAUF BEENDET: ${abbruch}. ${rest} weitere Bestellung(en) dieses Laufs wurden NICHT bearbeitet`); break; }
  }
  const summary = `Printful-Sync fertig: ${zaehler.bestaetigt} bestätigt, ${zaehler.entwuerfe} Entwurf/Review, ${zaehler.ohneAuftrag} ohne Auftrag (harter Befund), ${zaehler.vorhanden} schon vorhanden, ${zaehler.spaeter} später wieder, ${fehler.length} Fehler${DRY ? ` (DRY_RUN: ${zaehler.anstehend} Bestellung(en) würden angelegt)` : ''}.`;
  if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Printful-Sync\n\n${summary}\n\n${zeilen.length ? zeilen.map((z) => '- ' + z).join('\n') + '\n' : ''}${fehler.length ? '\n**Fehler:**\n' + fehler.map((f) => '- ' + fehlerLog(f)).join('\n') + '\n' : ''}`); } catch { /* Zusammenfassung ist Zugabe */ } }
  if (fehler.length) { fehler.forEach((f) => console.error('✗', fehlerLog(f))); await tg(`🔴 LuxeStyle POD-Sync Fehler:\n${fehler.slice(0, 8).map((f) => esc(fehlerTg(f))).join('\n')}`); process.exitCode = 1; }
  if ((zaehler.bestaetigt || zaehler.entwuerfe) && !DRY) await tg(`✅ LuxeStyle POD: ${esc(summary)}`);
  console.log(summary);
})().catch(async (e) => { console.error('Fataler Fehler:', e); await tg(`🔴 LuxeStyle POD-Sync: fataler Fehler ${esc(e && e.message)}`); process.exit(1); });
