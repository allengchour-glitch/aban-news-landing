/**
 * Plan für NEUE Produkte («Grind 2.0»): aus einem CJ-Datenblatt (`product/query`) wird die `productSet`-Eingabe mit voller Auswahl.
 * Rein: kein Netz, kein Shop, keine CJ-Punkte, keine Dateien. Der Aufrufer liefert Titel, Beschreibung, Preise, Google-Pfad und Tags.
 *
 * WARUM (27.10.2026): Die alten Anlege-Werkzeuge haben die Auswahl beim Anlegen vernichtet (52 % «Default Title» im Katalog), keines prüfte
 * Stecker, keines setzte die Google-Kategorie, vier legten sofort ACTIVE an (import_audit.md, Befunde 1–3). Hier wird zuerst geprüft und erst dann
 * eine Eingabe gebaut; fällt EIN Tor, gibt es KEINE Eingabe (`eingabe: null`), also nichts, was versehentlich geschrieben werden könnte.
 *
 * Wiederverwendet (Importe statt Kopien): zerlegeOptionen/baueAuswahl/hinweisText (cj_varianten) · steckerUrteil (stecker_cj) · istSteckdosenWare
 * (stecker_bereinigen) · WAFFEN/SPERR_TAGS (kategorien) · pruefeProdukt/LIZENZ (gmc_feed_item: Sperr-Tags, Marken-/Safety-Risiko, Lizenznamen) ·
 * topUrteil (top_kandidaten: Testprodukt, Klinge DE/EN, Marke DE/EN) · EN_AUSGABE_RE (optionen_uebersetzen) · ENGLISCH_RE (farbwahl_scan) · seoTitel.
 *
 * NICHT Sache dieser Datei (bleibt beim Aufrufer): Dublettenprüfung gegen den Katalog · Fracht/Lieferbarkeit CN→CH (die Preisquelle liefert nur für lieferbare Varianten einen Preis) · Titel und
 * Beschreibung schreiben · Google-Pfad bestimmen · HTTP-200-Prüfung und Hash-Vergleich der Bilder · Übersetzung per KI · Variantenbudget (Shopify-Tageslimit) · Anlegen, Tore NACH dem Anlegen,
 * Veröffentlichen und Kanäle (das Produkt entsteht als DRAFT ohne Kanal).
 *
 * ── Aufruf ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 *   const r = planeNeu(cjProdukt, ctx);
 *   r.ok ? r.eingabe : r.ledgerGrund   // eingabe → productSet(PRODUCT_SET_MUTATION, { input: r.eingabe }), sonst Ledger-Zeile UEBERSPRUNGEN · <ledgerGrund>
 *
 *   cjProdukt  die `data` von GET product/query (oder die ganze Antwort {code, data}); Form geprüft an 2 235 echten Datenblättern.
 *   ctx (Pflicht ist: titel, googlePfad, preis):
 *     titel            deutscher Titel (vom Aufrufer; Titel-Wahrheit ist SEINE Sache). Englischer Rest (ENGLISCH_RE) lehnt ab, ausser titelEnglischOk.
 *     beschreibungHtml deutsche Beschreibung (vom Aufrufer). Davor kommen Marker `<!-- ls-var-v1 -->` und «Ausführung»-Hinweise (Kopf wie beim Auswahl-Lauf).
 *     googlePfad       Google-Produktkategorie als Pfad «A > B > C» (vom Aufrufer bestimmt, siehe grind_google). Optional googleVokabular (Set) → exakter Vergleich.
 *     preis            Preise je Variante, drei Formen: (a) Funktion v => {preis, kosten} | null  (v = {vid, sku, key, ekUsd, gewichtG, bild}),
 *                      (b) das Ergebnis von preiseFuerVarianten() ({varianten:[{vid, ok, preis, kosten}]}), (c) Objekt {[vid|sku]: {preis, kosten}}.
 *                      null / {ok:false} = «diese Variante nicht verkaufen» (z. B. Fracht nicht lieferbar/unbekannt): sie wird WEGGELASSEN, nicht geraten.
 *                      Eine Zahl, die nicht lesbar ist, oder Preis ≤ Kosten lehnt das ganze Produkt ab.
 *     handle           schon festgelegter Handle (aus dem Ledger); sonst wird er aus Titel und pid gebildet (handleAus).
 *     productType, tags, seo {title, description}, metafelder [{namespace,key,type,value}], vendor ('LuxeStyle')
 *     uebersetzung     { Wert: deutscherWert }: für Optionswerte, die farbeDeutsch nicht sicher kennt, UND für fertige Endwerte, die das Tor «optionswerte-deutsch» ablehnt.
 *                      Ablauf: planeNeu → r.unsicher (beide Arten) übersetzen (lib/uebersetzen.nachDeutsch) → planeNeu mit ctx.uebersetzung; höchstens zwei Runden (zusammengefasste
 *                      Auswahlen «A · B» brauchen die zweite, weil ihr Endwert erst nach der ersten Übersetzung feststeht).
 *     kiAusfall        true → «nicht sicher übersetzt» gilt nur 20 Stunden (vorläufig), nicht 7 Tage
 *     bildOk           Set der Bild-URLs, die der Aufrufer per HTTP 200 geprüft hat (Bild-Falle). Fehlt es → Warnung «nicht geprüft».
 *     bildAlias        { variantenbildUrl: galerieUrl }: visuell gleiches Bild (Hash-Vergleich des Aufrufers) → kein zweiter Upload
 *     maxVarianten (100) · minBilder (3) · minVarianten · googleMinTiefe (2) · diyErlaubt · titelEnglischOk
 *
 * ── Ergebnis ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
 *   { ok, eingabe|null, varianten: n, bilder: n, tore: [{name, ok, grund}], warnungen: [], grund, frist, ledgerGrund, pid, handle,
 *     optionen: [{name, werte}], unsicher: [{option, wert}], hinweise: [{name, wert, text}], ausgelassen: {stecker, ohnePreis, bilder} }
 *   tore[].ok ist true | false | null (null = nicht geprüft, weil eine Vorbedingung fehlt). ok === alle Tore true.
 *   frist = 'endgueltig' | 'zurueckgestellt' | 'vorlaeufig' → Vokabular von ledgerGedaechtnis (14 Tage / 7 Tage / 20 Stunden); der LÄNGSTE Grund gewinnt.
 *   unsicher ≠ [] → Aufrufer übersetzt die Werte (nachDeutsch) und ruft mit ctx.uebersetzung erneut auf.
 */
import { zerlegeOptionen, baueAuswahl, hinweisText } from './cj_varianten.mjs';
import { steckerUrteil } from './stecker_cj.mjs';
import { WAFFEN, SPERR_TAGS } from './kategorien.mjs';
import { pruefeProdukt, LIZENZ } from './gmc_feed_item.mjs';
import { topUrteil } from './top_kandidaten.mjs';
import { seoTitel } from './seo_titel.mjs';
import { htmlZuText } from './fakten_block.mjs';
import { VORLAEUFIG, ZURUECKGESTELLT } from './varianten_sicherheit.mjs';
import { istSteckdosenWare } from '../stecker_bereinigen.mjs';
import { EN_AUSGABE_RE } from '../optionen_uebersetzen.mjs';
import { ENGLISCH_RE } from '../farbwahl_scan.mjs';

// ───────────────────────── Konstanten ─────────────────────────

/** Admin-API-Version für productSet. GEMESSEN 26.10.2026 (`publicApiVersions`): unterstützt sind 2026-01, 2026-04, 2026-07, 2026-10; die alten Skripte pinnen 2025-01/2024-10. */
export const API_VERSION = '2026-01';      // = SCHEMA_API_VERSION weiter unten (ein Test hält beide gleich)
/** Wie im Nachzieher (MAX_VARIANTEN=100): grössere Produkte kosten zu viel vom Tageslimit für neue Varianten. */
export const MAX_VARIANTEN = 100;
/** Mindestzahl Galeriebilder (Hero-Regel des Audits, SETZUNG). GEMESSEN an 2 235 Datenblättern: 39 (1,7 %) haben weniger als 3. */
export const MIN_BILDER = 3;
/** Shopify erlaubt höchstens 250 Medien je Produkt (Doku, nicht neu gemessen). */
export const MAX_MEDIEN = 250;
/** Kopf der Seite, den der Auswahl-Lauf setzt und die Text-Kette (text_prosa.zerlege) als Kopf erkennt. Steht im Nachzieher als nicht exportierte Konstante. */
export const VAR_MARKER = '<!-- ls-var-v1 -->';
export const BASIS_TAGS = ['cj-real', 'dropship'];
export const VENDOR = 'LuxeStyle';
export const GOOGLE_NAMESPACE = 'mm-google-shopping';
/** Typ des Metafelds, wie ihn die Produkte im Shop tragen (GEMESSEN 27.10.2026 an 2 Produkten; für google_product_category gibt es keine Definition → der Typ muss mit). */
export const GOOGLE_TYP = 'single_line_text_field';
export const FRISTEN = ['endgueltig', 'zurueckgestellt', 'vorlaeufig'];
/** Namen der Tore in der Reihenfolge, in der sie im Ergebnis stehen. */
export const TORE = ['titel', 'produktart', 'sperrwoerter', 'steckdosen-ware', 'google-pfad', 'tags', 'handle', 'metafelder', 'bilder', 'cj-varianten', 'stecker', 'preis',
  'preis>kosten', 'variantenzahl', 'auswahl', 'tote-optionen', 'optionswerte-sicher', 'optionswerte-deutsch', 'zahl-als-modell', 'farbwerte-unterscheidbar', 'varianten-bilder', 'eingabe-schema', 'eingabe-konsistent'];

/**
 * Das Admin-GraphQL für die Anlage. Felder und Argumente gegen das Schema gelesen (mcp__Shopify__graphql_schema, 27.10.2026): productSet(identifier, input, synchronous) →
 * ProductSetPayload {product, productSetOperation, userErrors}; die Produktfelder sind dieselben wie in der Abfrage des Nachziehers (live auf 2025-01).
 * OHNE `identifier` legt productSet an. Mit identifier {handle} aktualisiert es ein vorhandenes Produkt und ERSETZT dabei die Listenfelder (Varianten, Dateien, Metafelder).
 */
export const PRODUCT_SET_MUTATION = `mutation grindProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product { id handle status variantsCount { count } options { name values } media(first: 100) { nodes { id status } } }
    userErrors { field message code }
  }
}`;

// ───────────────────────── Sperr-Wörter ─────────────────────────

/**
 * Erwachsenen-Ware und Tabak/Nikotin (DE + EN): nie automatisch (CLAUDE.md «Kinderware, Erwachsenen-, Waffen-, Medizin-, Tabak-Artikel nie automatisch»).
 * Quelle der Wörter: BAN in cj_trending_import.mjs und ADULT_BAN in bigbuy_import.mjs (beide nicht exportiert; ein gemeinsames Muster in einer Lib fehlt) — hier
 * mit Wortgrenzen, damit «unisex», «Essex», «analog», «Unkraut» (weed) nicht treffen. SETZUNG, nicht erschöpfend.
 */
export const ERWACHSENE_RE = /(^|[^a-zäöüß])(sex|sexspielzeug|sexual|adult toys?|dildos?|vibrators?|vibrating (egg|ring|massager)|masturbat\w*|erotic|erotik|fetisch|fetish|bdsm|penis|vagina|anal (plug|beads?)|analplug|butt plug|prostate?|prostata|cock ring|penisring|condoms?|kondome?|lubricants?|gleitgel|love dolls?|sex dolls?|liebespuppe)([^a-zäöüß]|$)/i;
export const TABAK_RE = /(^|[^a-zäöüß])(cigarettes?|zigaretten?|e-?cigs?|e-?zigaretten?|vapes?|vaping|hookah|shisha|wasserpfeife|nicotine|nikotin|tobacco|tabak|cannabis|marijuana|cbd|thc|kratom|rolling papers?|zigarettenpapier|drehpapier)([^a-zäöüß]|$)/i;
/**
 * Deutsche Titel: «Durchmesser», «Höhenmesser», «Winkelmesser» enthalten «messer», sind aber keine Klingen (KLINGE_MUSTER hat keine Wortgrenze davor und hielt sie für Messer:
 * ohne die Ausnahme 17 statt 15 Klingen-Treffer im Lauf über 2 225 Datenblätter mit Shop-Titel, GEMESSEN 27.10.2026). Nur im DEUTSCHEN Titel entschärft; der englische CJ-Name («knife») prüft getrennt, ein echtes
 * Messer fällt dort trotzdem durch.
 */
export const MESSGERAET_RE = /(höhen|winkel|durch|zeit|druck|strom|spannungs|abstands|entfernungs|temperatur|feuchtigkeits|füllstand|pegel|schicht)messer/i;
/** Auto-Zigarettenanzünder ist ein Steckplatz, kein Tabak (ein Auto-Ladegerät «für Cigarette Lighter» fiel sonst als Tabakware durch). */
export const ANZUENDER_RE = /(cigarette|zigaretten) ?(lighter|anz[üu]nder|buchse|socket)|(car|auto)[- ]cigarette/i;
// Zum Ersetzen brauchen die beiden das Flag g; als eigene Kopien, damit die exportierten Muster mit .test() ohne lastIndex-Falle benutzbar bleiben.
const MESSGERAET_G = new RegExp(MESSGERAET_RE.source, 'gi'), ANZUENDER_G = new RegExp(ANZUENDER_RE.source, 'gi');

/** Fremdstecker oder 110-V-Gerät im NAMEN (die Varianten-Prüfung steckerUrteil sieht nur variantKey): «Hair Dryer 1800W AU Plug», «Electric Heater 110V US Plug». Nennt der Name auch EU, entscheidet die Varianten-Prüfung. */
export const FREMDSTECKER_NAME_RE = /(^|[^a-z])(us|usa|uk|gb|au|jp|american|british|australian|japanese|amerikanische[rn]?|britische[rn]?|australische[rn]?|japanische[rn]?)[ -]?(standard[ -]?)?(plug|socket|outlet|stecker|steckdose)s?([^a-z]|$)|(^|[^0-9.])(100|110|115|120)\s?v(?:ac)?(?!\s*(?:-|~|–|to|bis)\s*2\d\d)([^a-z0-9]|$)/i;
export const fremdsteckerImNamen = s => FREMDSTECKER_NAME_RE.test(String(s ?? '')) && !/(^|[^a-z])eu([^a-z]|$)/i.test(String(s ?? ''));
/** Waren, die nicht automatisch ins Sortiment gehören (Auflagen der Lückenanalyse, Schweizer Recht — BEHAUPTUNG, der Besitzer bestätigt): Laser-Zeiger/-Lampen, Medizinprodukte, Pyrotechnik, Selbstverteidigung, Spielzeugwaffen. Bewusst streng: ein Fehlalarm kostet einen Kandidaten. */
export const MEDIZIN_RE = /(blood pressure (?:monitor|meter|machine|cuff|gauge)(?!ing)|blutdruck(?:messger(?:ä|ae)t|-?messer|manschette)|blood glucose (?:meter|monitor|test)(?!ing)|glucose meter|blutzucker(?:messger(?:ä|ae)t|-?teststreifen)|hearing aid|h(?:ö|oe)rger(?:ä|ae)t|pulse oximeter|pulsoximeter|\btens\b|muscle stimulator|muskelstimulator|insulin|pregnancy test|schwangerschaftstest|(?:medical|surgical) (?:face |disposable )?(?:mask|device|grade)|mundschutz|op-maske|medizinprodukt|medizinische[rsmn]? (?:maske|ger(?:ä|ae)t|produkt)|contact lens|kontaktlinse|\bcpap\b|nebuli[sz]er|inhalator|catheter|katheter|syringe|einwegspritze|slimming (?:pill|capsule|patch)|weight loss (?:pill|capsule)|abnehm(?:kapsel|tablette|pille|tee|mittel)\w*|fat burner|fatburner|teeth whitening|zahnaufhell\w*|(?:fieber|stirn|ohr|forehead|infrared|infrarot)[- ]*thermometer|thermometer[- ]*(?:fieber|stirn))/i;
export const PYRO_WAFFENAEHNLICH_RE = /(firework|feuerwerk|firecracker|knallk(?:ö|oe)rper|smoke bomb|rauchbombe|sparkler|wunderkerze|tear gas|reizgas|pepper spray|stun gun|slingshot|steinschleuder|handcuff|handschelle|lock ?pick|dietrich|nunchaku|toy gun|spielzeugpistole|blaster)/i;
const LASER_GERAET_RE = /(pointer|zeiger|flashlight|taschenlampe|torch|\bmw\b|tactical|taktisch|\bpen\b|stift|lampe|licht)/i, LASER_HARMLOS_RE = /(entfernungsmesser|distance meter|measur|level|nivellier|gravur|engrav|cutting|schneid|haarentfern|hair removal|epilat|printer|drucker)/i;
export function heikelWort(s) {
  const t = String(s ?? '');
  const m = t.match(MEDIZIN_RE) || t.match(PYRO_WAFFENAEHNLICH_RE);
  if (m) return m[0].trim();
  return /laser/i.test(t) && LASER_GERAET_RE.test(t) && !LASER_HARMLOS_RE.test(t) ? 'Laser-Zeiger/-Lampe' : null;
}

/** Englische Steckdosen-Ware (stecker_bereinigen.STECKDOSE_RE ist deutsch und prüft Shop-Titel; der CJ-Name ist englisch). */
export const STECKDOSE_EN_RE = /power strips?|socket strips?|extension sockets?|extension lead|surge protector|smart (plug|socket|outlet)s?|wifi (plug|socket|outlet)|wall (socket|outlet)s?|timer socket|multi-?socket/i;

/**
 * Kleingeschriebenes Wort mit mindestens 4 Buchstaben in einem deutschen Optionswert = englischer Rest. Deutsche Werte sind GROSSGESCHRIEBEN oder Kurzwörter («Schwarz», «Weiss», «L», «XXL»),
 * ausser den kleinen Funktionswörtern «mit/ohne/und/oder/inkl». GEMESSEN 27.10.2026 an 623 baubaren Mehrvarianten-Plänen: 13 (2,1 %) trugen solche Reste («4 sections 1.6m», «15 pieces», «Pink gold»,
 * «Schwarz / gold», «12 inch»), die EN_AUSGABE_RE nicht kennt; 0 Fehlalarme («Roségold», «Schwarz / Weiss», «mit Fernbedienung», «150 × 200 cm»). Wörter mit Ziffer davor («1.6m») zählen nicht,
 * Einheiten («cm», «mm») sind kürzer als 4 Buchstaben.
 */
export const KLEIN_WORT_RE = /(?:^|[\s\/,(])(?!(?:mit|ohne|und|oder|inkl)(?![a-zäöüß]))[a-zäöüß]{4,}(?![a-zäöüß])/;
export const kleinWortImWert = w => KLEIN_WORT_RE.test(String(w ?? ''));

/**
 * Farbwerte, die sich nur durch eine angehängte Ziffer unterscheiden («Schwarz» + «Schwarz1»; CJ: «Black» + «Black1»), sind für die Kundin zwei gleich benannte Farben mit verschiedenem Preis
 * und KEINE Auswahl. Nicht reparierbar (welche Ziffer meint was?) → nie raten, zurückstellen. GEMESSEN 27.10.2026: 19 von 1 678 Mehrvarianten-Datenblättern (1,1 %); im Shop steht derselbe Fehler schon live
 * (3d-teddy-lampe-a92a5f: «Weiss, Riss, Schwarz1, Riss1, Weiss1, Schwarz»). Nur ein Wert OHNE Ziffer neben einem MIT Ziffer gilt als Kollision: «Black Zone2»/«Black Zone4» und «Black1»/«White1» sind
 * echte Unterschiede.
 * @returns {string[][]} Gruppen kollidierender Werte, z. B. [['Schwarz1', 'Schwarz']]
 */
export function ziffernKollision(werte) {
  const stamm = w => String(w ?? '').trim().toLowerCase().replace(/[\s_-]*0?\d{1,2}$/, '');
  const m = new Map();
  for (const w of werte || []) { const st = stamm(w); if (!m.has(st)) m.set(st, []); m.get(st).push(String(w ?? '').trim()); }
  return [...m.values()].filter(l => l.length > 1 && l.some(w => w.toLowerCase() === stamm(w)) && l.some(w => /\d$/.test(w)));
}

/**
 * Widerspruch zwischen Datenblatt und Produktart: der Google-Pfad sagt «Webcam», das Datenblatt beschreibt eine Netzwerk-/Gun-/Bullet-Kamera (CCTV). Beispiel (27.10.2026, pid 5C86453E):
 * «Webcam with microphone» mit «Type: Network Camera, Style: Gun Camera, Lens: 3.6 (mm), Power supply voltage: 3.7 (V)» — kein Wort zu Mikrofon oder USB. Der Titel stützt sich dann nur auf den
 * Lieferantennamen; ob es eine USB-Webcam ist, kann nur CJ oder eine Probebestellung klären → zurückgestellt, nie anlegen. Je Eintrag: Pfad-Muster, Datenblatt-Muster, Klartext.
 */
export const PRODUKTART_WIDERSPRUCH = Object.freeze([
  { pfad: /Cameras & Optics > Cameras > Webcams/, text: /network camera|gun camera|bullet camera|\bcctv\b|\bip camera/i, was: 'Netzwerk-/Überwachungskamera' },
]);
/** Masse ohne Achsenwort in einer «Modell»-Option: Breite? Länge? Leistung? Der Optionsname liesse sich nur raten. */
const MASS_WERT_RE = /^\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m|zoll|inch|in|"|w|v|a|ah|mah|kg|g)\b[^a-zäöüß]*$/i;

// ───────────────────────── Kleine Helfer ─────────────────────────

const text = x => String(x ?? '').replace(/\s+/g, ' ').trim();
/** «A > B > C»: jede Ebene nicht leer, ohne «>» und ohne Leerzeichen an den Rändern. */
const GOOGLE_PFAD_RE = /^[^>\s](?:[^>]*[^>\s])?(?: > [^>\s](?:[^>]*[^>\s])?)*$/;
const HTTPS_RE = /^https:\/\/[^\s"'<>\\]+$/;
const ZAHL_RE = /^\d+(?:[.,]\d+)?$/;
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯]/;
const runde2 = x => Math.round((Number(x) + 1e-9) * 100) / 100;
const cent = x => Math.round(Number(x) * 100);
const geld = x => runde2(x).toFixed(2);
const eindeutig = l => [...new Set(l)];

/** Die Antwort kann die ganze CJ-Antwort {code, result, data} oder schon `data` sein. */
export function normalisiereCj(roh) {
  if (roh && typeof roh === 'object' && roh.data && typeof roh.data === 'object' && !Array.isArray(roh.data) && ('variants' in roh.data || 'pid' in roh.data)) return roh.data;
  return roh && typeof roh === 'object' ? roh : {};
}

/** «Reinigungsbürste» → «reinigungburste»: wie die vorhandenen Handles (NFD ohne Akzente; cj_category_fill.mjs), dazu ß → ss. */
export function slug(titel, max = 46) {
  const s = String(titel ?? '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s.slice(0, max).replace(/-+$/g, '');
}
/** Letzte 6 Zeichen der pid (Ziffern oder UUID-Hex) in Kleinschrift: genau das Muster der vorhandenen Handles («…-601400», «…-1f3d7c»). */
export function pidKurz(pid) {
  const p = String(pid ?? '').trim();
  return /^(?:\d{6,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(p) ? p.slice(-6).toLowerCase() : '';
}
/** Deterministischer Handle aus Titel und pid. Leere Ausgabe = pid unlesbar oder Titel ohne Buchstaben (kein Handle ohne Quelle). */
export function handleAus(pid, titel) {
  const k = pidKurz(pid), s = slug(titel);
  return k && s ? `${s}-${k}` : '';
}

/** Galerie in CJ-Reihenfolge: `productImage` (JSON-Text, geordnet; das erste ist `bigImage`), sonst `productImageSet`; `bigImage` zuerst, falls es fehlt (4 von 2 235). */
export function galerieAus(cj) {
  let l = [];
  try { const a = JSON.parse(cj?.productImage); if (Array.isArray(a)) l = a; } catch { /* kein JSON → Rückfall */ }
  if (!l.length && Array.isArray(cj?.productImageSet)) l = cj.productImageSet;
  if (!l.length && Array.isArray(cj?.productImage)) l = cj.productImage;
  l = l.map(text).filter(Boolean);
  const hero = text(cj?.bigImage);
  if (hero && !l.includes(hero)) l.unshift(hero);
  return eindeutig(l);
}

const GROESSEN_REIHE = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
const GROESSEN_ALIAS = { XXXS: '3XS', XXS: '2XS', XXL: '2XL', XXXL: '3XL', XXXXL: '4XL', XXXXXL: '5XL' };
/** Konfektionsgrössen der Reihe nach (S, M, L, XL) und Zahlen aufsteigend; ist EIN Wert unbekannt, bleibt die CJ-Reihenfolge (nie halb sortieren). */
export function sortiereGroessen(werte) {
  const w = [...werte];
  const rang = v => { const u = GROESSEN_ALIAS[String(v).trim().toUpperCase()] || String(v).trim().toUpperCase(); return GROESSEN_REIHE.indexOf(u); };
  if (w.length > 1 && w.every(v => rang(v) >= 0)) return w.sort((a, b) => rang(a) - rang(b));
  if (w.length > 1 && w.every(v => ZAHL_RE.test(String(v).trim()))) return w.sort((a, b) => Number(String(a).replace(',', '.')) - Number(String(b).replace(',', '.')));
  return w;
}

/**
 * Optionen ohne Werte oder mit EINEM Wert sind keine Auswahl (tote Auswahl: die Kundin klickt auf etwas, das nichts ändert) und werden gestrichen.
 * Massgebend sind die Werte, die die Varianten wirklich tragen. Ein leerer Wert bei einigen Varianten (andere haben einen) ist nicht reparierbar → ok:false.
 * @param {{name:string, art?:string}[]} optionen
 * @param {{vid:string, werte:Record<string,string>}[]} varianten
 */
export function streicheToteOptionen(optionen, varianten) {
  const gestrichen = [], behalten = [];
  for (const o of optionen) {
    const roh = varianten.map(v => text(v.werte?.[o.name]));
    const leer = roh.filter(x => !x).length;
    const werte = eindeutig(roh.filter(Boolean));
    if (leer && werte.length) return { ok: false, grund: `Option «${o.name}» hat bei ${leer} von ${varianten.length} Varianten keinen Wert` };
    if (werte.length <= 1) { gestrichen.push({ name: o.name, grund: werte.length ? '1 Wert' : '0 Werte', wert: werte[0] ?? null }); continue; }
    behalten.push({ ...o, werte });
  }
  const namen = new Set(behalten.map(o => o.name));
  const neu = varianten.map(v => ({ ...v, werte: Object.fromEntries(Object.entries(v.werte || {}).filter(([k]) => namen.has(k)).map(([k, x]) => [k, text(x)])) }));
  if (varianten.length > 1) {
    if (!behalten.length) return { ok: false, grund: 'nach dem Streichen toter Optionen bleibt keine Auswahl' };
    const k = neu.map(v => behalten.map(o => v.werte[o.name].toLowerCase()).join('\u0001'));
    if (new Set(k).size !== k.length) return { ok: false, grund: 'nach dem Streichen toter Optionen sind Varianten nicht mehr unterscheidbar' };
  }
  return { ok: true, optionen: behalten, varianten: neu, gestrichen };
}

/** Preisquelle (drei Formen, siehe Kopf) → Funktion v => {preis, kosten} | {weglassen, grund} | {fehler}. */
export function preisLeser(preis) {
  const norm = x => {
    if (x === null || x === undefined) return { weglassen: true, grund: 'kein Preis' };
    if (typeof x !== 'object') return { preis: NaN, kosten: NaN };
    if (x.ok === false) return { weglassen: true, grund: x.grund || 'kein Preis' };
    const p = Number(x.preis), k = Number(x.kosten ?? x.kostenChf);
    if (x.preis === null || x.preis === undefined) return { weglassen: true, grund: 'kein Preis' };
    return { preis: p, kosten: k };
  };
  if (typeof preis === 'function') return v => norm(preis(v));
  if (preis && Array.isArray(preis.varianten)) {
    const m = new Map(preis.varianten.filter(r => r && r.vid != null).map(r => [String(r.vid), r]));
    return v => norm(m.get(String(v.vid)));
  }
  if (preis && typeof preis === 'object') return v => norm(preis[v.vid] ?? preis[v.sku]);
  return null;
}

// ───────────────────────── Schema-Prüfung (gegen die echten Eingabetypen) ─────────────────────────

/**
 * Die Admin-API-Version, gegen die SCHEMA per Introspektion der ECHTEN API gelesen wurde (27.10.2026). Sie MUSS `API_VERSION` sein: die Mutation läuft in genau dieser Version, ein anderes
 * Schema wäre eine Täuschung (ein Test hält beide gleich). Wer API_VERSION ändert, liest SCHEMA neu: `node automation/grind_schema_pruefen.mjs` (nur lesen, Exit 1 bei Abweichung).
 */
export const SCHEMA_API_VERSION = '2026-01';

/**
 * Teilmenge des Admin-Schemas: GENAU die Eingabetypen, die `planeNeu` benutzt, mit ALLEN ihren Feldern. Gelesen am 27.10.2026 per Introspektion der echten Admin-API `SCHEMA_API_VERSION`
 * (ProductSetInput, ProductVariantSetInput, OptionSetInput, OptionValueSetInput, FileSetInput, VariantOptionValueInput, InventoryItemInput, InventoryItemMeasurementInput, WeightInput,
 * MetafieldInput, SEOInput + Enums). Der MCP-Schemaleser (mcp__Shopify__graphql_schema) ist auf Admin 2026-10 gepinnt und weicht in EINEM Typ ab: ProductVariantSetInput kennt dort
 * `barcodes` und `published` statt `barcode` (18 statt 17 Felder) — das war die erste Fassung dieser Tabelle, und sie hätte ein Feld durchgewinkt, das 2026-01 ablehnt.
 * Notation: GraphQL-Typ als Text; `!` = Pflicht; 'offen' = Typ nicht eingebettet (jede Benutzung ist ein Fehler, damit nichts ungeprüft durchrutscht).
 */
export const SCHEMA = {
  ProductSetInput: { category: 'ID', claimOwnership: 'offen', collections: '[ID!]', combinedListingRole: 'offen', descriptionHtml: 'String', files: '[FileSetInput!]', giftCard: 'Boolean',
    giftCardTemplateSuffix: 'String', handle: 'String', metafields: '[MetafieldInput!]', productOptions: '[OptionSetInput!]', productType: 'String', redirectNewHandle: 'Boolean',
    requiresSellingPlan: 'Boolean', seo: 'SEOInput', status: 'ProductStatus', tags: '[String!]', templateSuffix: 'String', title: 'String', variants: '[ProductVariantSetInput!]', vendor: 'String' },
  ProductVariantSetInput: { barcode: 'String', compareAtPrice: 'Money', file: 'FileSetInput', id: 'ID', inventoryItem: 'InventoryItemInput', inventoryPolicy: 'ProductVariantInventoryPolicy',
    inventoryQuantities: 'offen', metafields: '[MetafieldInput!]', optionValues: '[VariantOptionValueInput!]!', position: 'Int', price: 'Money', requiresComponents: 'Boolean',
    showUnitPrice: 'Boolean', sku: 'String', taxCode: 'String', taxable: 'Boolean', unitPriceMeasurement: 'offen' },
  OptionSetInput: { id: 'ID', linkedMetafield: 'offen', name: 'String', position: 'Int', values: '[OptionValueSetInput!]' },
  OptionValueSetInput: { id: 'ID', name: 'String' },
  FileSetInput: { alt: 'String', contentType: 'FileContentType', duplicateResolutionMode: 'offen', filename: 'String', id: 'ID', originalSource: 'String' },
  VariantOptionValueInput: { id: 'ID', linkedMetafieldValue: 'String', name: 'String', optionId: 'ID', optionName: 'String' },
  InventoryItemInput: { cost: 'Decimal', countryCodeOfOrigin: 'offen', countryHarmonizedSystemCodes: 'offen', harmonizedSystemCode: 'String', measurement: 'InventoryItemMeasurementInput',
    provinceCodeOfOrigin: 'String', requiresShipping: 'Boolean', sku: 'String', tracked: 'Boolean' },
  InventoryItemMeasurementInput: { shippingPackageId: 'ID', weight: 'WeightInput' },
  WeightInput: { unit: 'WeightUnit!', value: 'Float!' },
  MetafieldInput: { id: 'ID', key: 'String', namespace: 'String', type: 'String', value: 'String' },
  SEOInput: { description: 'String', title: 'String' },
};
export const SCHEMA_ENUMS = {
  ProductStatus: ['ACTIVE', 'ARCHIVED', 'DRAFT', 'UNLISTED'],
  FileContentType: ['EXTERNAL_VIDEO', 'FILE', 'IMAGE', 'MODEL_3D', 'VIDEO'],
  ProductVariantInventoryPolicy: ['CONTINUE', 'DENY'],
  WeightUnit: ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'],
};
const GELD_RE = /^-?\d+(?:\.\d+)?$/;

/** Prüft ein Wertepaar gegen den Typ; liefert Fehlertexte (leer = gültig). */
function wertPruefen(typ, wert, pfad) {
  const pflicht = typ.endsWith('!');
  let t = pflicht ? typ.slice(0, -1) : typ;
  if (wert === undefined) return pflicht ? [`${pfad}: Pflichtfeld fehlt`] : [];
  if (wert === null) return pflicht ? [`${pfad}: null bei Pflichtfeld`] : [];
  if (t === 'offen') return [`${pfad}: Typ nicht in SCHEMA eingebettet (erst prüfen und eintragen)`];
  if (t.startsWith('[')) {
    if (!Array.isArray(wert)) return [`${pfad}: Liste erwartet`];
    const inner = t.slice(1, -1);
    return wert.flatMap((x, i) => wertPruefen(inner, x, `${pfad}[${i}]`));
  }
  if (SCHEMA[t]) return objektPruefen(t, wert, pfad);
  if (SCHEMA_ENUMS[t]) return SCHEMA_ENUMS[t].includes(wert) ? [] : [`${pfad}: «${wert}» ist kein ${t} (${SCHEMA_ENUMS[t].join('|')})`];
  switch (t) {
    case 'String': return typeof wert === 'string' ? [] : [`${pfad}: Text erwartet`];
    case 'ID': return typeof wert === 'string' && /^gid:\/\/shopify\//.test(wert) ? [] : [`${pfad}: gid:// erwartet`];
    case 'Boolean': return typeof wert === 'boolean' ? [] : [`${pfad}: true/false erwartet`];
    case 'Int': return Number.isInteger(wert) ? [] : [`${pfad}: ganze Zahl erwartet`];
    case 'Float': return typeof wert === 'number' && Number.isFinite(wert) ? [] : [`${pfad}: Zahl erwartet`];
    case 'Money': case 'Decimal': return typeof wert === 'string' && GELD_RE.test(wert) ? [] : [`${pfad}: Betrag als Text erwartet (z. B. "12.90"), nicht ${typeof wert}`];
    default: return [`${pfad}: unbekannter Typ ${t}`];
  }
}
function objektPruefen(typName, obj, pfad) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [`${pfad}: Objekt ${typName} erwartet`];
  const def = SCHEMA[typName], f = [];
  for (const k of Object.keys(obj)) if (!(k in def)) f.push(`${pfad}.${k}: Feld gibt es in ${typName} nicht`);
  for (const [k, typ] of Object.entries(def)) f.push(...wertPruefen(typ, obj[k], `${pfad}.${k}`));
  return f.filter((x, i) => f.indexOf(x) === i);
}
/** Eingabe gegen die eingebetteten Schema-Typen. @returns {string[]} Fehler (leer = gültig) */
export const schemaPruefen = eingabe => objektPruefen('ProductSetInput', eingabe, 'input');

/**
 * Regeln, die das Schema nicht ausdrückt: Optionswerte der Varianten gibt es in productOptions, jede Variantendatei steht auch in `files` (Doku von
 * ProductVariantSetInput.file: «Any file specified here must also be specified in the files input»), SKU und Kombination einmalig, Längen.
 * @returns {string[]}
 */
export function konsistenzPruefen(e) {
  const f = [];
  const opts = e.productOptions || [], vars = e.variants || [], files = e.files || [];
  const optNamen = opts.map(o => o.name);
  if (new Set(optNamen).size !== optNamen.length) f.push('Optionsnamen nicht einmalig');
  if (opts.length > 3) f.push(`mehr als 3 Optionen (${opts.length})`);
  for (const o of opts) {
    const w = (o.values || []).map(x => x.name);
    if (!w.length) f.push(`Option «${o.name}» ohne Werte`);
    if (new Set(w.map(x => text(x).toLowerCase())).size !== w.length) f.push(`Option «${o.name}»: Werte doppelt (Shopify ignoriert Gross-/Kleinschreibung)`);
    if (String(o.name).length > 255 || w.some(x => String(x).length > 255)) f.push(`Option «${o.name}»: Name oder Wert länger als 255 Zeichen`);
  }
  const quellen = new Set(files.map(x => x.originalSource));
  if (quellen.size !== files.length) f.push('Dateien doppelt');
  if (files.length > MAX_MEDIEN) f.push(`mehr als ${MAX_MEDIEN} Medien (${files.length})`);
  const kombi = new Set(), skus = new Set();
  for (const [i, v] of vars.entries()) {
    const ov = v.optionValues || [];
    if (ov.length !== opts.length || !opts.every(o => ov.some(x => x.optionName === o.name))) f.push(`Variante ${i}: Optionswerte passen nicht zu den Optionen`);
    for (const x of ov) { const o = opts.find(p => p.name === x.optionName); if (o && !(o.values || []).some(w => w.name === x.name)) f.push(`Variante ${i}: Wert «${x.name}» fehlt in Option «${x.optionName}»`); }
    const k = ov.map(x => `${x.optionName}=${text(x.name).toLowerCase()}`).sort().join('|');
    if (kombi.has(k)) f.push(`Variante ${i}: Kombination doppelt`); kombi.add(k);
    const sku = v.inventoryItem?.sku;
    if (!sku) f.push(`Variante ${i}: keine SKU`); else if (skus.has(sku)) f.push(`Variante ${i}: SKU «${sku}» doppelt`); else skus.add(sku);
    if (v.file && !quellen.has(v.file.originalSource)) f.push(`Variante ${i}: Variantenbild steht nicht in files`);
    if (!(cent(v.price) > cent(v.inventoryItem?.cost))) f.push(`Variante ${i}: Preis ${v.price} nicht über Kosten ${v.inventoryItem?.cost}`);
  }
  if (vars.length > 1 && !opts.length) f.push('mehrere Varianten ohne Optionen');
  if (!vars.length) f.push('keine Varianten');
  if (e.status !== 'DRAFT') f.push(`Status ${e.status}: neue Produkte werden als DRAFT angelegt`);
  if (e.handle !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.handle)) f.push(`Handle «${e.handle}» nicht a-z0-9-`);
  return f;
}

// ───────────────────────── Der Plan ─────────────────────────

/**
 * @param {object} cjRoh  CJ-Datenblatt (product/query)
 * @param {object} ctx    siehe Kopf
 */
export function planeNeu(cjRoh, ctx) {
  ctx = ctx && typeof ctx === 'object' ? ctx : {};
  const cj = normalisiereCj(cjRoh);
  const tore = [], fehler = [], warnungen = [];
  const ausgelassen = { stecker: [], ohnePreis: [], bilder: [] };
  const tor = (name, ok, grund = '', frist = 'zurueckgestellt') => {
    tore.push({ name, ok, grund: ok === true ? '' : grund });
    if (ok === false) fehler.push({ name, grund, frist });
  };
  const nichtGeprueft = (name, weil) => tore.push({ name, ok: null, grund: `nicht geprüft (${weil})` });
  const warn = w => { if (!warnungen.includes(w)) warnungen.push(w); };

  const pid = text(cj.pid);
  const titel = text(ctx.titel);
  const maxV = Number.isFinite(Number(ctx.maxVarianten)) && Number(ctx.maxVarianten) > 0 ? Number(ctx.maxVarianten) : MAX_VARIANTEN;
  const minBilder = Number.isFinite(Number(ctx.minBilder)) ? Number(ctx.minBilder) : MIN_BILDER;
  const cjName = text(cj.productNameEn);
  const beschreibung = String(ctx.beschreibungHtml ?? '');
  const googlePfad = text(ctx.googlePfad);

  // ── 1. Titel
  {
    const g = [];
    if (!titel) g.push('Titel leer');
    else {
      if (titel.length > 255) g.push(`Titel zu lang (${titel.length} > 255)`);
      if (CJK_RE.test(titel)) g.push('Titel enthält chinesische/japanische/koreanische Zeichen');
      if (!ctx.titelEnglischOk && ENGLISCH_RE.test(titel)) g.push(`englischer Rest im Titel: «${(titel.match(ENGLISCH_RE) || [])[0]}»`);
      if (titel.length > 70) warn(`Titel länger als 70 Zeichen (${titel.length})`);
    }
    tor('titel', !g.length, g.join('; '), !titel ? 'vorlaeufig' : 'zurueckgestellt');
  }

  // ── 2. Produktart (Daten und Art des CJ-Produkts)
  {
    const g = []; let frist = null;       // der längste Grund gewinnt: endgültig > zurückgestellt > vorläufig
    const mehr = (f) => { if (frist === null || FRISTEN.indexOf(f) < FRISTEN.indexOf(frist)) frist = f; };
    if (!pid) { g.push('CJ-Datenblatt ohne pid'); mehr('vorlaeufig'); }
    else if (!pidKurz(pid)) { g.push(`pid «${pid}» hat kein bekanntes Format`); mehr('vorlaeufig'); }
    if (cj.isTestProduct === true || cj.isTestProduct === 'true') { g.push('CJ-Testprodukt'); mehr('endgueltig'); }
    if (!ctx.diyErlaubt && (cj.productType === 'DIY_PRODUCT' || cj.customizationVersion)) { g.push('Personalisierungsprodukt (DIY): ob CJ Kundenangaben (Aufdruck, Gravur) braucht, ist UNBEKANNT, der Shop erfasst keine'); mehr('endgueltig'); }
    // ANNAHME: Status «3» = im Verkauf. Alle 2 235 Datenblätter und alle 160 Listentreffer (saleStatus) tragen 3; was die anderen Werte bedeuten, ist UNBEKANNT → nicht anlegen, später wieder prüfen.
    if (cj.status != null && String(cj.status) !== '3') { g.push(`CJ-Status ${cj.status} (3 = im Verkauf)`); mehr('zurueckgestellt'); }
    for (const w of PRODUKTART_WIDERSPRUCH) {
      if (w.pfad.test(googlePfad) && w.text.test(`${cjName}\n${htmlZuText(cj.description)}`)) { g.push(`Datenblatt widerspricht der Produktart: ${w.was} beschrieben, Google-Pfad «${googlePfad}»`); mehr('zurueckgestellt'); }
    }
    tor('produktart', !g.length, g.join('; '), frist ?? 'endgueltig');
  }

  // ── 3. Sperr-Wörter: Waffen, Klingen, Marken, Lizenz, Erwachsene, Tabak, Merchant-Risiko, Sperr-Tags
  const tagsRoh = [...BASIS_TAGS, ...(Array.isArray(ctx.tags) ? ctx.tags : [])].map(text).filter(Boolean);
  const tags = tagsRoh.filter((t, i) => tagsRoh.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i);
  const galerie0 = galerieAus(cj);
  {
    const g = [];
    const titelRein = titel.replace(MESSGERAET_G, ' ');
    const beide = `${titel} ${cjName}`;
    const w = `${titelRein} ${cjName}`.match(WAFFEN); if (w) g.push(`Waffen-Wort «${w[0].trim()}»`);
    for (const name of [cjName, titelRein]) {
      if (!name) continue;
      const u = topUrteil({ productNameEn: name, productImage: 'x', sellPrice: '1', listedNum: 999, isTestProduct: false }, { listedMin: 0, maxEk: 1e9 });
      if (!u.nehmen && ['klinge-waffenrecht', 'markenware'].includes(u.grund)) g.push(`${u.grund} («${name.slice(0, 40)}»)`);
    }
    const lz = [titel, beschreibung, cjName].map(s => (String(s).match(LIZENZ) || [])[0]).find(Boolean);
    if (lz) g.push(`Lizenzname «${lz}»`);
    const er = beide.match(ERWACHSENE_RE); if (er) g.push(`Erwachsenen-Ware («${er[2]}»)`);
    const tb = beide.replace(ANZUENDER_G, ' ').match(TABAK_RE); if (tb) g.push(`Tabak/Nikotin («${tb[2]}»)`);
    const hk = heikelWort(beide); if (hk) g.push(`heikle Ware («${hk}») nie automatisch`);
    const spt = tags.filter(t => SPERR_TAGS.includes(t)); if (spt.length) g.push(`Sperr-Tag ${spt.join(', ')}`);
    // Merchant-Prüfung des Repos (Sperr-Tags per Muster, Marken-/Safety-Risiko wie «kinder», «baby», Lizenznamen in Titel UND Beschreibung)
    const m = pruefeProdukt({ titel: titel || 'x', beschreibung, tags, bild: galerie0[0] || 'https://x', preis: 1, id: pid || 'x', link: 'x' });
    if (!m.ok) g.push(`Merchant: ${m.grund}`);
    if (LIZENZ.test(htmlZuText(cj.description))) warn('Lizenzname im CJ-Beschreibungstext: den Text nicht übernehmen');
    tor('sperrwoerter', !g.length, eindeutig(g).join('; '), 'endgueltig');
  }

  // ── 4. Steckdosen-Ware (Schuko passt nicht in die Schweizer Steckdose)
  {
    const ist = istSteckdosenWare({ title: titel, g: googlePfad }) || STECKDOSE_EN_RE.test(cjName) || istSteckdosenWare({ title: cjName, g: '' });
    const fremd = fremdsteckerImNamen(cjName) || fremdsteckerImNamen(titel);
    tor('steckdosen-ware', !ist && !fremd, fremd && !ist ? 'Fremdstecker (US/UK/AU/JP) oder 110-V-Gerät im Namen: passt nicht in die Schweizer Steckdose' : 'Steckdosen-Ware (Leiste, Smart-Steckdose …): Schuko/Euro-Aufbau passt nicht', 'endgueltig');
  }

  // ── 5. Google-Pfad
  {
    const g = []; const tiefe = googlePfad ? googlePfad.split(' > ').length : 0;
    const minT = Number.isFinite(Number(ctx.googleMinTiefe)) ? Number(ctx.googleMinTiefe) : 2;
    if (!googlePfad) g.push('keine Google-Kategorie');
    else {
      if (!GOOGLE_PFAD_RE.test(googlePfad)) g.push(`Pfad «${googlePfad}» hat leere Ebenen oder ein stehengebliebenes «>»`);
      if (googlePfad.length > 255 || /[\u0000-\u001f]/.test(googlePfad)) g.push('Pfad zu lang oder mit Steuerzeichen');
      if (tiefe < minT) g.push(`Pfad zu flach (${tiefe} < ${minT} Ebenen): «${googlePfad}»`);
      if (ctx.googleVokabular) { const v = ctx.googleVokabular; if (!(v instanceof Set ? v.has(googlePfad) : v.includes(googlePfad))) g.push(`«${googlePfad}» steht nicht im Google-Vokabular`); }
      else warn('Google-Pfad nicht gegen das Vokabular geprüft (ctx.googleVokabular fehlt)');
      if (tiefe === minT && minT < 3) warn(`Google-Pfad nur ${tiefe} Ebenen tief`);
    }
    tor('google-pfad', !g.length, g.join('; '));
  }

  // ── 6. Tags
  {
    const g = [];
    if (tags.length > 250) g.push(`mehr als 250 Tags (${tags.length})`);
    for (const t of tags) {
      if (t.length > 255) g.push(`Tag zu lang: «${t.slice(0, 30)}…»`);
      if (/,/.test(t)) g.push(`Tag mit Komma: «${t}»`);
      // Shopify-Tags sind diakritik-unempfindlich: ein Umlaut-Handle hat 19 Produkte kurz ohne Tag gelassen (CLAUDE.md 26.10.)
      if (/^sort-/.test(t) && !/^sort-[a-z0-9-]+$/.test(t)) g.push(`sort-Tag nicht a-z0-9-: «${t}»`);
    }
    tor('tags', !g.length, g.join('; '), 'vorlaeufig');
  }

  // ── 7. Handle
  const handle = ctx.handle !== undefined && ctx.handle !== null && ctx.handle !== '' ? text(ctx.handle) : handleAus(pid, titel);
  tor('handle', /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle) && handle.length <= 255, !handle ? 'kein Handle bildbar (pid oder Titel unbrauchbar)' : `Handle «${handle}» nicht a-z0-9-`, 'vorlaeufig');

  // ── 8. Metafelder: Google-Kategorie + Zusätze des Aufrufers
  const metafelder = [];
  {
    const g = [];
    if (googlePfad) metafelder.push({ namespace: GOOGLE_NAMESPACE, key: 'google_product_category', type: GOOGLE_TYP, value: googlePfad });
    for (const m of Array.isArray(ctx.metafelder) ? ctx.metafelder : []) {
      if (![m?.namespace, m?.key, m?.type, m?.value].every(x => typeof x === 'string' && x.trim())) { g.push(`Metafeld unvollständig: ${JSON.stringify(m)}`); continue; }
      if (metafelder.some(x => x.namespace === m.namespace && x.key === m.key)) { g.push(`Metafeld ${m.namespace}.${m.key} doppelt`); continue; }
      metafelder.push({ namespace: m.namespace, key: m.key, type: m.type, value: m.value });
    }
    tor('metafelder', !g.length, g.join('; '), 'vorlaeufig');
  }

  // ── 9. Galerie (Variantenbilder folgen weiter unten)
  const bildOk = ctx.bildOk instanceof Set ? ctx.bildOk : Array.isArray(ctx.bildOk) ? new Set(ctx.bildOk) : null;
  const galerie = []; let verworfenGeprueft = 0;
  {
    const nichtHttps = galerie0.filter(u => !HTTPS_RE.test(u));
    for (const u of galerie0) {
      if (!HTTPS_RE.test(u)) { ausgelassen.bilder.push({ url: u, grund: 'kein https' }); continue; }
      if (bildOk && !bildOk.has(u)) { ausgelassen.bilder.push({ url: u, grund: 'nicht HTTP 200' }); verworfenGeprueft++; continue; }
      galerie.push(u);
    }
    if (nichtHttps.length) warn(`${nichtHttps.length} Galeriebild(er) ohne https weggelassen`);
    if (!bildOk) {
      warn('Bilder nicht auf HTTP 200 geprüft (ctx.bildOk fehlt)');
      const qp = galerie0.filter(u => /\/quick\/product\//.test(u)).length;
      if (qp) warn(`${qp} Bild-URL(s) im Muster quick/product (teils 404, CLAUDE.md Bild-Falle): vor dem Anlegen prüfen`);
    }
    tor('bilder', galerie.length >= minBilder, `nur ${galerie.length} brauchbare Galeriebilder (mindestens ${minBilder}; ${galerie0.length} bei CJ, ${galerie0.length - galerie.length} verworfen)`, verworfenGeprueft ? 'vorlaeufig' : 'zurueckgestellt');
  }

  // ── 10. CJ-Varianten lesen
  const rows = []; let rowsOk = false;
  {
    const g = [];
    const vs = Array.isArray(cj.variants) ? cj.variants : [];
    if (!vs.length) g.push('CJ führt keine Varianten');
    const vids = new Set(), skus = new Set();
    for (const [i, v] of vs.entries()) {
      const vid = text(v?.vid), sku = text(v?.variantSku);
      if (!vid || !sku) { g.push(`Variante ${i} ohne vid oder variantSku`); continue; }
      if (vids.has(vid)) g.push(`vid doppelt: ${vid}`);
      if (skus.has(sku)) g.push(`variantSku doppelt: ${sku}`);
      vids.add(vid); skus.add(sku);
      if (sku.length > 255) g.push(`SKU länger als 255 Zeichen: ${sku.slice(0, 30)}…`);
      rows.push({ vid, sku, key: text(v.variantKey), ekUsd: Number(v.variantSellPrice), gewichtG: Number(v.variantWeight) || 0, bild: text(v.variantImage) });
    }
    rowsOk = !g.length;
    tor('cj-varianten', rowsOk, g.join('; '), vs.length ? 'zurueckgestellt' : 'endgueltig');
  }

  // Ab hier hängt alles an den Varianten.
  const ergebnisBauen = extra => {
    const ok = fehler.length === 0 && tore.every(t => t.ok === true);
    const rang = f => FRISTEN.indexOf(f);
    const erst = fehler[0];
    const frist = fehler.length ? fehler.reduce((a, f) => (rang(f.frist) < rang(a) ? f.frist : a), 'vorlaeufig') : null;
    const grund = erst ? `${erst.name}: ${erst.grund}` : '';
    const kopf = frist === 'zurueckgestellt' ? `${ZURUECKGESTELLT}: ` : frist === 'vorlaeufig' ? `${VORLAEUFIG}: ` : '';
    return {
      ok, eingabe: ok ? extra.eingabe : null, varianten: extra.varianten ?? 0, bilder: extra.bilder ?? 0, tore, warnungen, grund, frist,
      ledgerGrund: ok ? '' : (kopf + fehler.map(f => `${f.name}: ${f.grund}`).join('; ')).replace(/[·\r\n]+/g, ' ').slice(0, 300),
      pid, handle, optionen: extra.optionen ?? [], unsicher: extra.unsicher ?? [], hinweise: extra.hinweise ?? [], ausgelassen,
    };
  };
  const abbruch = (weil, ab_, extra = {}) => { for (const n of TORE.slice(TORE.indexOf(ab_))) if (!tore.some(t => t.name === n)) nichtGeprueft(n, weil); return ergebnisBauen(extra); };
  if (!rowsOk) return abbruch('CJ-Varianten unbrauchbar', 'stecker');

  // ── 11. Stecker: Fremdstecker-Varianten (US/UK/AU/JP) nie anlegen
  let nachStecker = rows;
  {
    const st = steckerUrteil(rows.map(v => ({ id: v.vid, sku: v.sku })), Object.fromEntries(rows.map(v => [v.sku, v.key])));
    if (st.draft) {
      tor('stecker', false, `nur Fremdstecker (US/UK/AU/JP) bei CJ — nicht für die Schweiz (${rows.length} Varianten)`, 'endgueltig');
    } else {
      const weg = new Set(st.loeschen);
      nachStecker = rows.filter(v => !weg.has(v.vid));
      ausgelassen.stecker = rows.filter(v => weg.has(v.vid)).map(v => v.sku);
      if (weg.size) warn(`${weg.size} Fremdstecker-Variante(n) weggelassen`);
      tor('stecker', true);
    }
  }
  if (!nachStecker.length || tore.some(t => t.name === 'stecker' && t.ok === false)) return abbruch('Stecker', 'preis');

  // ── 12. Preis je Variante (Variante ohne Preis = nicht verkaufen)
  const leser = preisLeser(ctx.preis);
  const verkauf = [];     // {…row, preis, kosten}
  let preisFehlerText = '';
  if (!leser) {
    tor('preis', false, 'keine Preisquelle (ctx.preis fehlt)', 'vorlaeufig');
  } else {
    const fehlerliste = [];
    for (const v of nachStecker) {
      let p;
      try { p = leser({ vid: v.vid, sku: v.sku, key: v.key, ekUsd: v.ekUsd, gewichtG: v.gewichtG, bild: v.bild }); } catch (e) { p = { preis: NaN, kosten: NaN, fehlerText: String(e.message).slice(0, 80) }; }
      if (p.weglassen) { ausgelassen.ohnePreis.push(v.sku); continue; }
      if (!Number.isFinite(p.preis) || !Number.isFinite(p.kosten) || p.preis <= 0 || p.kosten <= 0 || p.preis > 100000) { fehlerliste.push(`${v.sku}: Preis/Kosten unlesbar (${p.fehlerText || `${p.preis}/${p.kosten}`})`); continue; }
      verkauf.push({ ...v, preis: runde2(p.preis), kosten: runde2(p.kosten) });
    }
    preisFehlerText = fehlerliste.slice(0, 3).join('; ');
    if (ausgelassen.ohnePreis.length) warn(`${ausgelassen.ohnePreis.length} von ${nachStecker.length} Variante(n) ohne Preis weggelassen (nicht lieferbar oder Fracht unbekannt)`);
    tor('preis', !fehlerliste.length && verkauf.length > 0, fehlerliste.length ? preisFehlerText : 'keine Variante mit Preis', 'vorlaeufig');
  }
  if (!verkauf.length || tore.some(t => t.name === 'preis' && t.ok === false)) return abbruch('Preis', 'preis>kosten', { varianten: verkauf.length });
  {
    const schlecht = verkauf.filter(v => !(cent(v.preis) > cent(v.kosten) * (Number(ctx.minFaktor) > 1 ? Number(ctx.minFaktor) : 1)));
    tor('preis>kosten', !schlecht.length, `${schlecht.length} Variante(n) mit Preis ≤ Kosten: ${schlecht.slice(0, 3).map(v => `${v.sku} ${v.preis}/${v.kosten}`).join('; ')}`, 'vorlaeufig');
  }

  // ── 13. Variantenzahl: Limit und Mindestzahl
  {
    const g = [];
    if (verkauf.length > maxV) g.push(`viele Varianten (${verkauf.length} > ${maxV}) — später, wenn das Tageskontingent reicht`);
    const minV = Number.isFinite(Number(ctx.minVarianten)) ? Number(ctx.minVarianten) : (nachStecker.length >= 2 ? 2 : 1);
    if (verkauf.length < minV) g.push(`nur ${verkauf.length} verkäufliche Variante(n) von ${nachStecker.length} (mindestens ${minV})`);
    tor('variantenzahl', !g.length, g.join('; '));
  }

  // ── 14. Auswahl (Optionen und Werte)
  const einzel = verkauf.length === 1;
  let optionen = [], vwerte = new Map(), hinweise = [], unsicher = [], zusammengefasst = false;
  const fremd = [];     // fertige Endwerte mit englischem Rest: der Aufrufer übersetzt sie wie `unsicher`
  let auswahlOk = true;
  if (einzel) {
    tor('auswahl', true);
    if (rows.length > 1) warn(`nur 1 von ${rows.length} CJ-Varianten bleibt: Titel und Text dürfen keine Auswahl versprechen`);
  } else {
    const zer = zerlegeOptionen(cj.productKeyEn, nachStecker.map(v => ({ vid: v.vid, key: v.key })));
    if (!zer.ok) { tor('auswahl', false, `Auswahl nicht baubar: ${zer.grund}`); auswahlOk = false; }
    else {
      const bleibt = new Set(verkauf.map(v => v.vid));
      const aw = baueAuswahl({ ...zer, zeilen: zer.zeilen.filter(z => bleibt.has(z.vid)) }, { wert: ctx.uebersetzung && typeof ctx.uebersetzung === 'object' ? ctx.uebersetzung : undefined });
      if (!aw.ok) { tor('auswahl', false, `Auswahl nicht baubar: ${aw.grund}`); auswahlOk = false; }
      else {
        // Die Übersetzung gilt zweimal: für unsichere Originalwerte (in baueAuswahl) und für fertige Endwerte, die das Tor «optionswerte-deutsch» ablehnt
        // («Apricot / Weiss» hält farbeDeutsch für sicher deutsch, EN_AUSGABE_RE nicht): sonst gäbe es für den Aufrufer keinen Weg, sie zu beheben.
        const ue = ctx.uebersetzung && typeof ctx.uebersetzung === 'object' ? ctx.uebersetzung : {};
        const neuWert = w => (Object.hasOwn(ue, w) && typeof ue[w] === 'string' && text(ue[w]) ? text(ue[w]) : w);
        optionen = aw.optionen.map(o => ({ name: o.name, art: o.art, werte: eindeutig(o.werte.map(neuWert)) }));
        for (const v of aw.varianten) vwerte.set(v.vid, Object.fromEntries(Object.entries(v.werte).map(([k, w]) => [k, neuWert(w)])));
        const gleich = optionen.find(o => o.werte.length !== aw.optionen.find(p => p.name === o.name).werte.length || new Set(o.werte.map(w => w.toLowerCase())).size !== o.werte.length);
        if (gleich) { tor('auswahl', false, `Auswahl nicht baubar: Übersetzung macht Werte von «${gleich.name}» gleich`); auswahlOk = false; }
        else tor('auswahl', true);
        hinweise = aw.hinweise.map(h => ({ ...h, text: hinweisText(h) }));
        unsicher = aw.unsicher; zusammengefasst = !!aw.zusammengefasst;
        if (zusammengefasst) warn('dünnes Raster: die Optionen sind zu einer Auswahl «Ausführung» zusammengefasst (« · »)');
        for (const h of hinweise) if (!h.text) warn(`konstante CJ-Option «${h.name}: ${h.wert}» nicht sicher übersetzbar — nicht angezeigt`);
      }
    }
  }

  // ── 15. Tote Optionen streichen
  let finalOpt = [], finalVar = verkauf.map(v => ({ vid: v.vid, werte: {} }));
  if (einzel) {
    tor('tote-optionen', true);
    finalOpt = [{ name: 'Title', art: 'ausfuehrung', werte: ['Default Title'] }];
    finalVar = verkauf.map(v => ({ vid: v.vid, werte: { Title: 'Default Title' } }));
  } else if (!auswahlOk) {
    nichtGeprueft('tote-optionen', 'Auswahl');
  } else {
    const r = streicheToteOptionen(optionen, verkauf.map(v => ({ vid: v.vid, werte: vwerte.get(v.vid) || {} })));
    if (!r.ok) tor('tote-optionen', false, r.grund);
    else {
      tor('tote-optionen', true);
      for (const gst of r.gestrichen) warn(`Option «${gst.name}» gestrichen (${gst.grund}${gst.wert ? `: ${gst.wert}` : ''})`);
      finalOpt = r.optionen.map(o => ({ ...o, werte: o.art === 'groesse' ? sortiereGroessen(o.werte) : o.werte }));
      finalVar = r.varianten;
    }
  }
  const optReif = tore.find(t => t.name === 'tote-optionen')?.ok === true;

  // ── 16–18. Werte: sicher übersetzt, deutsch, keine Zahlen als Modell/Farbe
  if (!optReif) {
    for (const n of ['optionswerte-sicher', 'optionswerte-deutsch', 'zahl-als-modell', 'farbwerte-unterscheidbar']) nichtGeprueft(n, 'Auswahl');
  } else {
    // Fiel der Übersetzungsdienst aus, ist auch der englische Rest nur eine Folge davon → beide Tore gelten nur vorläufig.
    const uFrist = ctx.kiAusfall ? 'vorlaeufig' : 'zurueckgestellt';
    tor('optionswerte-sicher', !unsicher.length, `nicht sicher übersetzt: ${JSON.stringify(unsicher).slice(0, 200)}`, uFrist);
    const alle = einzel ? [] : [...finalOpt.map(o => o.name), ...finalOpt.flatMap(o => o.werte)];
    const en = alle.filter(x => EN_AUSGABE_RE.test(x) || CJK_RE.test(x) || KLEIN_WORT_RE.test(x));
    for (const o of einzel ? [] : finalOpt) for (const w of o.werte) if (en.includes(w) && !unsicher.some(u => u.wert === w)) fremd.push({ option: o.name, wert: w, grund: 'englischer Rest' });
    tor('optionswerte-deutsch', !en.length, `englische/fremdsprachige Optionswerte: ${eindeutig(en).slice(0, 5).map(x => `«${x}»`).join(', ')}`, uFrist);
    const zahl = finalOpt.filter(o => (/^Modell/.test(o.name) || o.art === 'farbe') && o.werte.some(w => ZAHL_RE.test(text(w))));
    const massModell = finalOpt.filter(o => /^Modell/.test(o.name) && o.werte.length && o.werte.every(w => MASS_WERT_RE.test(text(w))));
    tor('zahl-als-modell', !zahl.length && !massModell.length, zahl.length
      ? `Zahlen unter «${zahl.map(o => o.name).join(', ')}» (Ringgrössen und Stil-Nummern sind weder Modell noch Farbe): ${zahl.map(o => o.werte.filter(w => ZAHL_RE.test(text(w))).slice(0, 4).join('/')).join(' ; ')}`
      : `«Modell» enthält nur Masse (${massModell.map(o => o.werte.slice(0, 4).join('/')).join(' ; ')}): ob Breite, Länge oder Leistung, lässt sich nicht erraten`);
    {
      const g = [];
      for (const o of finalOpt.filter(o => o.art === 'farbe')) for (const l of ziffernKollision(o.werte)) g.push(`«${o.name}»: ${l.join(' / ')}`);
      tor('farbwerte-unterscheidbar', !g.length, `Werte unterscheiden sich nur durch eine Ziffer: ${g.slice(0, 3).join('; ')}`);
    }
  }
  if (tore.some(t => t.ok === false) || !optReif) return abbruch('vorheriges Tor', 'varianten-bilder', { varianten: verkauf.length, optionen: finalOpt.map(o => ({ name: o.name, werte: o.werte })), unsicher: [...unsicher, ...fremd], hinweise });

  // ── 19. Bilder: Variantenbild je Variante, jedes in `files`
  const files = galerie.map(u => ({ originalSource: u, contentType: 'IMAGE', alt: titel }));
  const dateiVon = new Map(files.map(f => [f.originalSource, f]));
  const varBild = new Map();
  {
    const alias = ctx.bildAlias && typeof ctx.bildAlias === 'object' ? ctx.bildAlias : {};
    const g = [];
    if (!einzel) {
      for (const v of verkauf) {
        let u = v.bild;
        if (!u) { warn(`Variante ${v.sku} ohne Variantenbild`); continue; }
        if (alias[u] && dateiVon.has(alias[u])) u = alias[u];
        if (!HTTPS_RE.test(u)) { ausgelassen.bilder.push({ url: u, grund: 'Variantenbild ohne https', sku: v.sku }); warn(`Variantenbild von ${v.sku} ohne https weggelassen`); continue; }
        if (bildOk && !bildOk.has(u) && !dateiVon.has(u)) { ausgelassen.bilder.push({ url: u, grund: 'Variantenbild nicht HTTP 200', sku: v.sku }); warn(`Variantenbild von ${v.sku} nicht HTTP 200 — weggelassen`); continue; }
        if (!dateiVon.has(u)) {
          const w = vwerteText(finalVar.find(x => x.vid === v.vid));
          const f = { originalSource: u, contentType: 'IMAGE', alt: w ? `${titel} – ${w}`.slice(0, 500) : titel };
          files.push(f); dateiVon.set(u, f);
        }
        varBild.set(v.vid, u);
      }
      const ohneBild = verkauf.filter(v => !varBild.has(v.vid)).length;
      if (ohneBild > verkauf.length / 2) g.push(`mehr als die Hälfte der Varianten ohne Variantenbild (${ohneBild} von ${verkauf.length}) — die Kundin sähe bei der Wahl nichts`);
    }
    if (files.length > MAX_MEDIEN) g.push(`zu viele Medien (${files.length} > ${MAX_MEDIEN})`);
    tor('varianten-bilder', !g.length, g.join('; '));
  }

  // ── Eingabe bauen
  const beschreibungKopf = ((!einzel || hinweise.some(h => h.text)) && !beschreibung.includes(VAR_MARKER))
    ? VAR_MARKER + hinweise.filter(h => h.text).map(h => `<p><strong>Ausführung:</strong> ${h.text}</p>`).join('') : '';
  const seo = ctx.seo && typeof ctx.seo === 'object' ? { title: text(ctx.seo.title), description: text(ctx.seo.description) } : seoTitel(titel);
  const eingabe = {
    title: titel, handle, status: 'DRAFT', vendor: text(ctx.vendor) || VENDOR,
    ...(text(ctx.productType) ? { productType: text(ctx.productType) } : {}),
    tags, seo, descriptionHtml: beschreibungKopf + beschreibung,
    productOptions: finalOpt.map(o => ({ name: o.name, values: o.werte.map(w => ({ name: w })) })),
    variants: verkauf.map(v => {
      const w = finalVar.find(x => x.vid === v.vid).werte;
      const x = {
        optionValues: finalOpt.map(o => ({ optionName: o.name, name: w[o.name] })),
        price: geld(v.preis), inventoryPolicy: 'CONTINUE',
        inventoryItem: { sku: v.sku, tracked: false, cost: geld(v.kosten), ...(v.gewichtG > 0 ? { measurement: { weight: { value: v.gewichtG, unit: 'GRAMS' } } } : {}) },
      };
      if (varBild.has(v.vid)) x.file = { originalSource: varBild.get(v.vid), contentType: 'IMAGE' };
      return x;
    }),
    files, metafields: metafelder,
  };
  if (!ctx.seo && (!eingabe.seo.title || !eingabe.seo.description)) delete eingabe.seo;
  if (!text(ctx.beschreibungHtml)) warn('keine Beschreibung übergeben (descriptionHtml enthält nur den Kopf)');
  if (!eingabe.productType) warn('kein productType übergeben');

  const sf = schemaPruefen(eingabe);
  tor('eingabe-schema', !sf.length, sf.slice(0, 4).join('; '), 'vorlaeufig');
  const kf = konsistenzPruefen(eingabe);
  tor('eingabe-konsistent', !kf.length, kf.slice(0, 4).join('; '), 'vorlaeufig');

  return ergebnisBauen({ eingabe, varianten: eingabe.variants.length, bilder: eingabe.files.length, optionen: finalOpt.map(o => ({ name: o.name, werte: o.werte })), unsicher: [...unsicher, ...fremd], hinweise });
}

/** «Rot / L» aus den Optionswerten einer Variante (für den Alt-Text). Bei «Title/Default Title» leer. */
function vwerteText(v) {
  const l = Object.values(v?.werte || {}).filter(x => x && x !== 'Default Title');
  return l.join(' / ');
}
