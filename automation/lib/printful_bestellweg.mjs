/**
 * Bestellweg «bezahlte Shopify-Bestellung mit Editor-Design → Printful-Auftrag»: die reine Logik (kein Netz, keine Dateien, keine Uhr), Stand 05.11.2026.
 * Der Kleber mit dem Netz ist automation/printful_sync.mjs; die Platzierung selbst bestimmt lib/printful_platzierung.mjs.
 *
 * Grundsatz (wie bei lib/printful_tracking.mjs): Unbekanntes bleibt UNBEKANNT, ein Fehler gibt nie frei. Jede Prüfung liefert «Befunde» {art, text, hart}:
 *   hart  = die Position lässt sich nicht sicher an Printful schicken (SKU ohne Variante, keine/unzulässige Druckdatei, Adresse unbrauchbar): es wird KEIN Auftrag angelegt.
 *   weich = der Auftrag darf als ENTWURF angelegt werden, wird aber nie automatisch bestätigt (Platzierung nicht gesichert, Auflösung, Optionen, Konflikt, Kontrolle, Kosten).
 * `art` ist ein kurzer Schlüssel ([a-z0-9-]); er steckt im Shopify-Tag `printful-review-<art>`: dieselbe Befundart wird nur EINMAL gemeldet.
 *
 * VERTRAG MIT DEM EDITOR (Warenkorb-Eigenschaften einer Position):
 *   «🖼️ Druckdatei (<Platzierungs-ID>)»   v6 (ALTE Schreibweise, so schreiben sie ALLE Editor-Dateien 6.2.0 bis 6.4.1; GEMESSEN 10.11.2026 am Quelltext, Zeile «druckUrls[p.id]» in pod/v6/lspod-designer-v6-6.4.0.js): https-Adresse (Cloudinary) der Druckdatei je Platzierung  (front, back, sleeve_left, label_outside, embroidery_chest_left …)
 *   «_Druckdatei (<Platzierungs-ID>)»     v6 (NEUE Schreibweise, VORGESEHEN: KEIN Editor im Repo schreibt sie heute, GEMESSEN 0 Treffer in allen fünf Dateien pod/v6/*.js): dasselbe; der führende Unterstrich blendet die Zeile in Kasse und Bestätigungsmail aus (QUELLE community.shopify.dev, ungemessen).
 *                                         Beide werden zu 100 % gelesen; beide Schreibweisen (oder v5) in EINER Position sind ein harter Befund «schluessel-gemischt». Ein Schlüssel, der nach Druckdatei klingt
 *                                         und keine der bekannten Schreibweisen ist (z. B. «🖼️ Druckdatei (FRONT)» ganz in Grossbuchstaben, «_Druckdatei (Front)» mit führendem Unterstrich und Grossbuchstaben oder «Rückseite Druckdatei»), ist ein harter Befund «datei-schluessel» (nie als v5 und damit als Vorderseite gedeutet). «🖼️ Druckdatei (Front)» dagegen ist eine GÜLTIGE v5-Schreibweise (Vorderseite).
 *   «_vorschau»                           v6 (ab 6.2.0): Cloudinary-JPEG der Vorschau für die Warenkorb-Miniatur. KEINE Druckdatei: der Parser ignoriert sie (der Schlüssel enthält weder «Druckdatei» noch «Print file»).
 *   «_pod_karte»                          v6: JSON {v:6, m:<Printful-Produkt>, pv:<Printful-Variante>, sv:<Shopify-Variante als Text>, pl:[Platzierungen], dt:{<ID>:<Dateityp>}, px:["BxH"], ap:<angezeigter Aufpreis in CHF>, qd:<kleinste Foto-dpi>, o:{<Optionsid>:<Wert>}} (o = Printful-Optionen, siehe unten; sv und ap sind Browserwerte und gelten nie als Beleg: der Aufpreis kommt aus dem Katalog, siehe aufpreisUsd).
 *                                         m und pv werden gegen die SKU der Position gehalten (Widerspruch = harter Befund «karte-widerspruch»), qd nur als WEICHER Hinweis (qd-weicht-ab gegen Katalog und Messung der Datei, aufloesung-angabe bei unbrauchbarem Wert): der Kunde kann es schreiben.
 *   «⚙️ Option (<Optionsid>)»              v6: eine Printful-Option, z. B. «⚙️ Option (thread_colors_chest_left)» = «#FFFFFF,#CC3333» (Garnfarben), «⚙️ Option (stitch_color)» = «black»
 *   «🖼️ Druckdatei», «Vorne · 🖼️ Druckdatei», «Hinten · 🖼️ Druckdatei», «🖼️ Druckdatei (Vorne|Hinten)» (und englisch «Print file», «Front|Back · 🖼️ Print file»)   v5: nur Vorderseite/Rückseite.
 *                                         Nur diese BEKANNTEN Schreibweisen gelten als v5 (Stand 10.11.2026, Gegenprüfung P1: früher deutete jeder Schlüssel mit «Druckdatei» still als Vorderseite, auch «🖼️ Druckdatei (Sleeve_left)»
 *                                         oder «Rückseite Druckdatei»). Jeder andere Schlüssel, der nach Druckdatei klingt, ist ein harter Befund «datei-schluessel»: nichts wird geraten.
 * Der Editor v6 schreibt die Optionen heute NICHT (Stand 05.11.: kein «thread» im Code); bis er es tut, bleibt jeder Stickerei-Auftrag ein Entwurf mit Meldung.
 */
import { platzierungsName, platzierungenFuerDateien } from './printful_platzierung.mjs';

// ───────────────────────────────────────────────────────────── Eigenschaften der Position
/** Hosts, von denen Druckdateien kommen dürfen. Die Warenkorb-Eigenschaften sind für Kunden frei schreibbar (/cart/add.js): ohne Liste würde dieser Lauf (und Printful) jede Adresse abrufen. Der Editor lädt zu Cloudinary hoch. */
export const ERLAUBTE_HOSTS = Object.freeze(['res.cloudinary.com', 'cdn.shopify.com']);
/** Die eigene Cloudinary-Cloud des Editors (pod/v6/lspod-designer-v6-*.js: CLOUD_NAME). Auf res.cloudinary.com gelten NUR Pfade dieser Cloud unter /image/upload/ (kein /image/fetch/, keine fremde Cloud). */
export const EIGENE_CLOUDINARY_CLOUD = 'dwyi6kkrl';
/** Die eigenen Dateien des Shops im Shopify-CDN (GEMESSEN: Editor-Dateien unter https://cdn.shopify.com/s/files/1/0943/6856/3585/files/…). Auf cdn.shopify.com gilt NUR dieser Pfad: das CDN liefert auch die Dateien fremder Shops. */
export const EIGENER_SHOPIFY_CDN_PFAD = '/s/files/1/0943/6856/3585/';
// Cloudinary-Transformationen (Abschnitte vor der Versionsnummer, z. B. «c_limit,w_1400»): erlaubt nur Grösse, Qualität, Format. Überlagerungen und fremde Quellen (l_fetch:<base64 einer Adresse>, u_, e_, t_ …) sind es nie:
// sie holen beliebigen Fremdinhalt in die Druckdatei, ohne den Editor zu benutzen. Die Parameterkürzel sind die der Cloudinary-Doku; ein Ordnername wie «pod_uploads» ist KEIN Kürzel.
const CLD_TRANSFORM_ERLAUBT = /^(?:c_(?:limit|fit|scale|fill|pad)|w_\d{1,5}|h_\d{1,5}|q_(?:auto|\d{1,3})|f_(?:auto|png|jpg|jpeg|webp)|dpr_\d(?:\.\d)?)$/;
const CLD_TRANSFORM_KUERZEL = /^(?:a|ac|af|ar|b|bl|bo|br|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|w|x|y|z|zo)_/;
const CLD_NAME = /^[A-Za-z0-9._~-]+$/;
/** Pfad hinter /<cloud>/image/upload/ prüfen. @returns {string|null} null = in Ordnung, sonst der Grund */
function cloudinaryPfadProblem(rest) {
  const teile = String(rest).split('/');
  const datei = teile.pop();
  if (!datei || !CLD_NAME.test(datei)) return 'Cloudinary-Adresse ohne gültigen Dateinamen';
  for (const s of teile) {
    if (/^v\d{1,12}$/.test(s)) continue;                                                   // Versionsnummer
    if (s.includes(',') || CLD_TRANSFORM_KUERZEL.test(s)) {                                // Transformation: jede Angabe muss auf der Liste stehen
      const unerlaubt = s.split(',').find((x) => !CLD_TRANSFORM_ERLAUBT.test(x));
      if (unerlaubt !== undefined) return `Cloudinary-Adresse enthält die Transformation «${unerlaubt.slice(0, 24)}», erlaubt sind nur Grösse, Qualität und Format`;
      continue;
    }
    if (!CLD_NAME.test(s)) return 'Cloudinary-Adresse enthält ein unzulässiges Pfadstück';  // Ordnername
  }
  return null;
}
const SCHL_V6 = /^\u{1F5BC}️? ?Druckdatei \(([a-z0-9_]+)\)$/u;       // ALT (so schreibt sie jeder Editor 6.2.0 bis 6.4.1): «🖼️ Druckdatei (front)»
const SCHL_V6_NEU = /^_Druckdatei \(([a-z0-9_]+)\)$/;                // NEU (vorgesehen, heute schreibt sie kein Editor): «_Druckdatei (front)»
// v5, NUR die bekannten Schreibweisen: «🖼️ Druckdatei», «🖼️ Druckdatei (Vorne)» (dokumentiert, kein Editor im Repo schreibt sie), «Vorne · 🖼️ Druckdatei» (Editor 5, GEMESSEN an pod/live/lspod-designer-v5-safe.js: pSide + « · » + pPrintFile), englisch «Print file».
const SEITE_V5 = '(Vorne|Hinten|Front|Back)';
const SCHL_V5_EINZELN = new RegExp(`^(?:\\u{1F5BC}\\uFE0F? ?)?(?:Druckdatei|Print file)(?: \\(${SEITE_V5}\\))?$`, 'u');
const SCHL_V5_MIT_SEITE = new RegExp(`^${SEITE_V5} \u00B7 (?:\\u{1F5BC}\\uFE0F? ?)?(?:Druckdatei|Print file)$`, 'u');
/** Klingt der Schlüssel nach einer Druckdatei? (Mehr als die bekannten Schreibweisen: das Wort genügt, Gross-/Kleinschreibung egal.) */
const SCHL_DATEI_VERDACHT = /druckdatei|print\s*file/i;
const SCHL_OPTION = /^⚙️? ?Option \(([a-z0-9_]+)\)$/u;
const ID = /^[a-z0-9_]+$/;
/** @returns {'front'|'back'|null} Seite eines BEKANNTEN v5-Schlüssels; null = kein v5-Schlüssel */
function seiteV5(k) {
  const m = SCHL_V5_EINZELN.exec(k) || SCHL_V5_MIT_SEITE.exec(k);
  if (!m) return null;
  return /^(Hinten|Back)$/.test(m[1] || '') ? 'back' : 'front';
}

/** Grenzen von _pod_karte.qd (kleinste wirkliche Foto-Auflösung in dpi, ganze Zahl). */
export const QD_MIN = 1, QD_MAX = 1000;

/**
 * Adresse einer Druckdatei prüfen. @returns {string|null} null = in Ordnung, sonst der Grund
 * Streng (Stand 10.11.2026, Gegenprüfung P1): nur https, kein Port, keine Zugangsdaten, kein Rückstrich (WHATWG liest «https://res.cloudinary.com\\@evil.example/…» als Host res.cloudinary.com, ein anderer Abrufer vielleicht nicht),
 * der Host steht auf der Liste, und auf res.cloudinary.com nur Pfade der EIGENEN Cloud unter /image/upload/ (kein /image/fetch/ auf Fremdadressen, keine fremde Cloud; 10.11.2026 Gegenleser: ausserdem nur Transformationen für Grösse, Qualität
 * und Format, nie Überlagerungen wie l_fetch:<Adresse>), auf cdn.shopify.com nur die eigenen Dateien des Shops (EIGENER_SHOPIFY_CDN_PFAD). `eigeneCloud: false` hebt nur die
 * Pfadbindung auf (Produkt-Metafeld des Besitzers: dort darf jeder https-Host stehen).
 */
export function adresseProblem(wert, hosts = ERLAUBTE_HOSTS, { eigeneCloud = true } = {}) {
  const w = String(wert == null ? '' : wert).trim();
  let u;
  try { u = new URL(w); } catch { return 'keine gültige Adresse'; }
  if (/\s/.test(w)) return 'Adresse enthält Leerzeichen';
  if (w.includes('\\')) return 'Adresse enthält einen Rückstrich';
  if (u.protocol !== 'https:') return 'keine https-Adresse';
  if (u.username || u.password) return 'Adresse enthält Zugangsdaten';
  if (u.port) return 'Adresse enthält einen Port';
  if (!hosts.map((h) => h.toLowerCase()).includes(u.hostname.toLowerCase())) return `Host «${u.hostname}» ist nicht erlaubt`;
  if (eigeneCloud && u.hostname.toLowerCase() === 'res.cloudinary.com') {
    const vor = `/${EIGENE_CLOUDINARY_CLOUD}/image/upload/`;
    if (!u.pathname.startsWith(vor)) return 'Cloudinary-Adresse nicht aus der eigenen Cloud unter /image/upload/';
    const g = cloudinaryPfadProblem(u.pathname.slice(vor.length));
    if (g) return g;
  }
  if (eigeneCloud && u.hostname.toLowerCase() === 'cdn.shopify.com' && !u.pathname.startsWith(EIGENER_SHOPIFY_CDN_PFAD)) return 'Shopify-CDN-Adresse nicht aus den eigenen Dateien des Shops';
  return null;
}
/** Die geprüfte Adresse in der Schreibweise, in der sie weitergegeben und abgerufen wird (normalisiert; nur nach `adresseProblem === null` aufrufen). */
export const adresseNormal = (wert) => new URL(String(wert).trim()).href;

function optionWert(w) {
  if (typeof w === 'string') return w.trim() === '' ? null : w.trim();
  if (typeof w === 'number' || typeof w === 'boolean') return w;
  if (Array.isArray(w) && w.length && w.every((x) => typeof x === 'string' && x.trim())) return w.map((x) => x.trim());
  return null;
}

/**
 * Warenkorb-Eigenschaften (Shopify customAttributes oder Objekt) → Druckdateien, Karte, Optionen.
 * `dateien[].schluessel` sagt, in welcher Schreibweise die Datei stand: 'alt' («🖼️ Druckdatei (front)»), 'neu' («_Druckdatei (front)») oder 'v5'. `qd` = die gültige Angabe _pod_karte.qd (ganze Zahl 1 bis 1000) oder null.
 * @returns {{dateien:{seite:'front'|'back'|null, platzierung:string|null, dateiTyp:string|null, url:string, quelle:'v5'|'v6', schluessel:'alt'|'neu'|'v5'}[], qd:number|null, karte:object|null, optionen:Record<string,any>, probleme:{art:string,text:string,hart:boolean}[]}}
 */
export function dateienAusEigenschaften(eigenschaften, { hosts = ERLAUBTE_HOSTS } = {}) {
  const paare = Array.isArray(eigenschaften)
    ? eigenschaften.map((a) => [String(a && a.key != null ? a.key : ''), String(a && a.value != null ? a.value : '')])
    : Object.entries(eigenschaften || {}).map(([k, v]) => [String(k), String(v == null ? '' : v)]);
  const probleme = [], dateien = [], optionen = {};
  const p = (art, text, hart) => probleme.push({ art, text, hart });
  let karte = null;
  const roh = paare.find(([k]) => k === '_pod_karte');
  if (roh) {
    try {
      const o = JSON.parse(roh[1]);
      if (o && typeof o === 'object' && o.v === 6 && Array.isArray(o.pl)) {
        karte = o;
        if (o.o && typeof o.o === 'object' && !Array.isArray(o.o)) for (const [id, w] of Object.entries(o.o)) { const v = optionWert(w); if (ID.test(id) && v !== null) optionen[id] = v; else p('karte-unlesbar', `_pod_karte: Option «${id}» hat keinen brauchbaren Wert`, false); }
      } else p('karte-unlesbar', '_pod_karte: Version oder Platzierungsliste unbekannt', false);
    } catch { p('karte-unlesbar', '_pod_karte: kein gültiges JSON', false); }
  }
  // qd = kleinste wirkliche Auflösung aller Fotos in dpi (Editor 6.2: ganzzahlig, abgerundet, höchstens die Dichte der Druckdatei). Fehlt es, ist das kein Befund (Text ohne Foto, ältere Editoren).
  // Vorhanden, aber keine ganze Zahl von 1 bis 1000, ist ein WEICHER Befund; nie ein harter, nie eine Freigabe: der Kunde kann den Wert schreiben, massgebend bleibt die Messung an der Datei.
  let qd = null;
  if (karte && karte.qd !== undefined && karte.qd !== null) {
    if (typeof karte.qd === 'number' && Number.isInteger(karte.qd) && karte.qd >= QD_MIN && karte.qd <= QD_MAX) qd = karte.qd;
    else p('aufloesung-angabe', `_pod_karte.qd ist keine ganze Zahl von ${QD_MIN} bis ${QD_MAX} (steht: ${String(JSON.stringify(karte.qd)).slice(0, 40)}): die Foto-Auflösung laut Editor ist unbekannt`, false);
  }
  const gesehen = new Map();                    // 'v6:<ID>' bzw. 'v5:<Seite>' → Schreibweise
  const stile = new Set();                      // gelesene Schreibweisen der Druckdatei-Schlüssel: 'alt', 'neu', 'v5'
  for (const [k, w] of paare) {
    const m = k.match(SCHL_V6), mn = k.match(SCHL_V6_NEU), mo = k.match(SCHL_OPTION);
    if (mo) { const v = optionWert(w); if (v !== null) optionen[mo[1]] = v; continue; }     // eine ⚙️-Eigenschaft gewinnt gegen _pod_karte.o (die Eigenschaft ist die ausdrückliche Wahl des Kunden)
    const seite5 = m || mn ? null : seiteV5(k);                                              // nur BEKANNTE v5-Schreibweisen
    const unlesbar = !m && !mn && seite5 === null && SCHL_DATEI_VERDACHT.test(k);           // klingt nach Druckdatei, ist aber keine bekannte Schreibweise («_Druckdatei (Front)», «🖼️ Druckdatei (Sleeve_left)», «Rückseite Druckdatei»): nie als Vorderseite geraten
    const istDatei = m || mn || seite5 !== null || unlesbar;
    if (!istDatei) continue;
    if (w.trim() === '') continue;                                                          // leere Eigenschaft = keine Datei (Editor schreibt sie für unbenutzte Seiten nicht, ein Leerwert ist kein Fehler)
    if (unlesbar) { p('datei-schluessel', `Eigenschaft «${k.slice(0, 60)}» klingt nach einer Druckdatei, ist aber keine bekannte Schreibweise (erwartet z. B. «_Druckdatei (front)» mit Kleinbuchstaben oder «Vorne · 🖼️ Druckdatei»): es wird nichts geraten`, true); continue; }
    const proble = adresseProblem(w, hosts);
    if (proble) { p('datei-adresse', `Druckdatei «${k}»: ${proble}`, true); continue; }
    stile.add(m ? 'alt' : mn ? 'neu' : 'v5');
    if (m || mn) {
      const id = (m || mn)[1], stil = m ? 'alt' : 'neu';
      if (gesehen.has('v6:' + id)) {
        if (gesehen.get('v6:' + id) === stil) p('datei-doppelt', `Druckdatei für «${id}» steht mehrfach in der Position`, true);   // zwei Schreibweisen für dieselbe Platzierung meldet unten «schluessel-gemischt»
        continue;
      }
      gesehen.set('v6:' + id, stil);
      if (karte && !karte.pl.includes(id)) p('datei-ohne-karte', `Druckdatei für «${id}», aber die Platzierung fehlt in _pod_karte`, false);
      const dt = karte && karte.dt && typeof karte.dt === 'object' && typeof karte.dt[id] === 'string' && karte.dt[id] ? karte.dt[id] : id;
      dateien.push({ seite: id === 'back' ? 'back' : id === 'front' || id === 'default' ? 'front' : null, platzierung: id, dateiTyp: dt, url: adresseNormal(w), quelle: 'v6', schluessel: stil });
    } else {
      const seite = seite5;
      if (gesehen.has('v5:' + seite)) { p('datei-doppelt', `zwei Druckdateien für die ${seite === 'back' ? 'Rückseite' : 'Vorderseite'} in der Position`, true); continue; }
      gesehen.set('v5:' + seite, 'v5');
      dateien.push({ seite, platzierung: null, dateiTyp: null, url: adresseNormal(w), quelle: 'v5', schluessel: 'v5' });
    }
  }
  // Kein Editor schreibt zwei Schreibweisen in EINE Position (jede Fassung bleibt bei ihrer): das sind gemischte Quellen, vom Kunden manipuliert oder zusammengeführt. Es wird keine Datei geraten.
  if (stile.size > 1) p('schluessel-gemischt', `Eigenschaften in gemischter Schreibweise (${[...stile].map((x) => ({ alt: '«🖼️ Druckdatei (…)»', neu: '«_Druckdatei (…)»', v5: 'Editor 5' }[x])).join(' und ')}): welche Datei gilt, ist unklar`, true);
  if (karte) for (const id of karte.pl) if (typeof id === 'string' && !gesehen.has('v6:' + id)) p('karte-ohne-datei', `_pod_karte nennt «${id}», es gibt aber keine Druckdatei dafür`, false);
  return { dateien, karte, qd, optionen, probleme };
}

/** Printful-Variantennummer aus einer SKU «<sync>_<printfulVariantId>»; null, wenn keine. */
export function variantAusSku(sku) {
  const m = String(sku == null ? '' : sku).match(/_(\d+)\s*$/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > 0 ? n : null;
}

/**
 * SKU der Position gewählt: die SKU der Bestellposition (was die Kundin gekauft hat) hat Vorrang, die der Variante ist der Rückfall (Codex-Fund 28.10.: es war umgekehrt;
 * eine später geänderte Varianten-SKU hätte den Auftrag auf die falsche Printful-Variante gelenkt). Weichen beide ab, ist das ein weicher Befund.
 * @returns {{vid:number|null, sku:string, probleme:{art:string,text:string,hart:boolean}[]}}
 */
export function skuWaehlen({ positionSku, variantenSku } = {}) {
  const a = variantAusSku(positionSku), b = variantAusSku(variantenSku), probleme = [];
  if (a && b && a !== b) probleme.push({ art: 'sku-widerspruch', text: `SKU der Position (${a}) und der Variante (${b}) nennen verschiedene Printful-Varianten, es gilt die der Position`, hart: false });
  return { vid: a || b || null, sku: String((a ? positionSku : variantenSku) || positionSku || variantenSku || ''), probleme };
}

/**
 * SKU-Schema der Modell-Fabrik: «<9100000 + Printful-Modellnummer>_<Printful-Variante>» (automation/pod_modell/plan.mjs: SKU_BASIS). Liefert die Modellnummer, wenn die SKU diesem Schema folgt, sonst null
 * (ältere Produkte tragen «<Sync-Nummer>_<Variante>»: GEMESSEN 06.11.2026 an dropship/pod-auswahl/sku_index.json liegen deren Vorsilben bei 8481330 und 9448929, also ausserhalb 9100001 bis 9199999;
 * neue Sync-Nummern zählt Printful aufwärts, sie können nicht mehr in diesen Bereich fallen: Annahme, ungemessen). Die Modellnummern gehen bis 99 999 (Printful-Produkte heute unter 2 000).
 */
export const SKU_BASIS = 9100000;
export function modellAusSku(sku) {
  const m = String(sku == null ? '' : sku).match(/^(\d+)_\d+\s*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10) - SKU_BASIS;
  return Number.isInteger(n) && n >= 1 && n <= 99999 ? n : null;
}

/** Ist das Produkt der Position ein EDITOR-Produkt (Tag wunschdesign)? Fertigware trägt nur `printful_personalized_product` und hat ihr Motiv im Metafeld custom.print_file. */
export function editorProdukt(li) {
  return ((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase()).includes('wunschdesign');
}

/** Ist die Position ein Editor-Produkt? Nur das Tag am Produkt entscheidet (eine Eigenschaft allein ist für Kunden schreibbar). */
export function istPod(li) {
  const tags = ((li && li.product && li.product.tags) || []).map((x) => String(x).toLowerCase());
  return tags.includes('wunschdesign') || tags.includes('printful_personalized_product');
}

// ───────────────────────────────────────────────────────────── Technik, Optionen, Konflikte
/** Technik-Familie einer Platzierung (Mischung in einem Auftrag ist bei Printful nicht belegt). */
export function technikFamilie(typ) {
  const t = String(typ || '');
  if (/^(addon_)?embroidery_/.test(t)) return 'EMBROIDERY';
  if (/_dtfabric$/.test(t)) return 'DIRECT-TO-FABRIC';
  if (/_dtf(_|$)/.test(t)) return 'DTFILM';
  return 'STANDARD';
}

/** Die Garnfarben-Option, die zu einer Stickerei-Platzierung gehört. `platzierung` ist der Platzierungs-TYP («embroidery_front»), nicht die Datei-ID im Auftrag («default»):
 *  die Zuordnung ID → Typ steht in der Dateiliste des Produkts (lib/printful_platzierung.mjs: `aliase`). Katalog (GEMESSEN 05.11., 577 Produkte, nach TYP gezählt): 637 Stickerei-Platzierungen
 *  (504 mit Stickerei-ID, 133 mit ID «default»/«back»/«left»/«right»); für 634 heisst die Option thread_colors_<Rest>, thread_colors_apparel («embroidery_apparel_front») oder allgemein thread_colors.
 *  Für drei Kappen (99, 206, 252: «embroidery_front») führt der Katalog KEINE passende Option: dort bleibt der Auftrag Entwurf. Zusatzstickerei «addon_embroidery_<Rest>» → addon_thread_colors_<Rest>.
 *  @returns {string|null} */
export function garnOption(platzierung, optionsIds) {
  const t = String(platzierung || '');
  const zusatz = /^addon_embroidery_/.test(t);
  if (!zusatz && !/^embroidery_/.test(t)) return null;
  const rest = t.slice(zusatz ? 'addon_embroidery_'.length : 'embroidery_'.length), ids = new Set(optionsIds || []);
  const kandidaten = zusatz ? [`addon_thread_colors_${rest}`] : [`thread_colors_${rest}`, `thread_colors_${rest.replace(/_front$/, '')}`, 'thread_colors'];
  for (const c of kandidaten) if (ids.has(c)) return c;
  return null;
}

const hexNorm = (s) => String(s).trim().toUpperCase();
/**
 * Eine Wertliste als Zeichenkette aufteilen. Trenner sind Komma und Semikolon («#FFFFFF, #CC3333»). Ein Wert MIT Leerzeichen («1801 White», «Light Blue») bleibt heil, solange er so erlaubt ist
 * (Codex-/Gegenleser-Fund 05.11.: ein Aufteilen an jedem Leerzeichen machte aus einem erlaubten Namen zwei ungültige Werte). Nur wenn kein Trenner da ist und der ganze Text KEIN erlaubter Wert ist,
 * gilt das Leerzeichen als Trenner («#FFFFFF #CC3333»).
 */
function werteListe(text, finde) {
  const t = text.trim();
  if (!t) return [];
  if (/[,;]/.test(t)) return t.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  if (finde(t) !== undefined || !/\s/.test(t)) return [t];
  return t.split(/\s+/).filter(Boolean);
}
function wertePruefen(opt, roh) {
  const vals = opt.values && typeof opt.values === 'object' && !Array.isArray(opt.values) ? opt.values : null;
  const schluessel = vals ? Object.keys(vals) : [];
  const finde = (x) => schluessel.find((k) => hexNorm(k) === hexNorm(x)) ?? schluessel.find((k) => String(vals[k]).trim().toLowerCase() === String(x).trim().toLowerCase());
  const liste = Array.isArray(roh) ? roh : typeof roh === 'string' ? werteListe(roh, finde) : [roh];
  switch (opt.type) {
    case 'multi_select': {
      if (!liste.length) return { fehler: 'leer' };
      if (!schluessel.length) return { wert: liste.map(String) };
      const aus = [];
      for (const x of liste) { const k = finde(x); if (k === undefined) return { fehler: `«${x}» ist kein erlaubter Wert` }; if (!aus.includes(k)) aus.push(k); }
      return { wert: aus };
    }
    case 'radio': { const k = finde(Array.isArray(roh) ? roh[0] : roh); return k === undefined ? { fehler: `«${roh}» ist kein erlaubter Wert (${schluessel.join(', ')})` } : { wert: k }; }
    case 'bool': { const s = String(Array.isArray(roh) ? roh[0] : roh).trim().toLowerCase(); if (['true', '1', 'ja', 'yes', 'on'].includes(s)) return { wert: true }; if (['false', '0', 'nein', 'no', 'off'].includes(s)) return { wert: false }; return { fehler: `«${roh}» ist weder ja noch nein` }; }
    case 'text': case 'single_line_text': { const s = String(Array.isArray(roh) ? roh.join(', ') : roh).trim(); return s && s.length <= 255 ? { wert: s } : { fehler: 'leer oder länger als 255 Zeichen' }; }
    default: return { fehler: `Optionstyp «${opt.type}» ist nicht bekannt` };
  }
}

/**
 * Printful-Optionen des Auftragsartikels aus den Angaben der Position, geprüft gegen die Optionen des Produkts (GET /products/variant/<id> → product.options).
 * `typen` sind die Platzierungs-TYPEN («embroidery_front»), nicht die Datei-IDs des Auftrags («default»): planeBestellung übersetzt sie über die Dateiliste des Produkts (`aliase`).
 * Pflicht (sonst weicher Befund «optionen»): Garnfarben je Stickerei-Platzierung (thread_colors…; führt der Katalog dafür KEINE Option, ist das ebenfalls ein Befund: nicht prüfbar),
 * stitch_color wo das Produkt es führt (das Schätzwerkzeug musste sie wiederholt nachtragen: kosten_schaetzung_alle.mjs; gilt `vorgaben.stitch_color`, vom Besitzer festgelegt, wird sie damit gefüllt),
 * yarn_colors bei Strick (Annahme). Unbekannte Optionen und ungültige Werte sind Befunde, nie stille Auslassungen.
 * @param {{produkt:{options?:object[], techniques?:{key:string}[]}|null, typen:string[], angegeben:Record<string,any>, vorgaben?:{stitch_color?:string}}} p
 * @returns {{optionen:{id:string,value:any}[], befunde:{art:string,text:string,hart:boolean}[]}}
 */
export function optionenPruefen({ produkt, typen = [], angegeben = {}, vorgaben = {} } = {}) {
  const befunde = [], optionen = [];
  const merke = (text) => befunde.push({ art: 'optionen', text, hart: false });
  const defs = produkt && Array.isArray(produkt.options) ? produkt.options : null;
  const ids = (defs || []).map((o) => o.id);
  const stickerei = typen.filter((t) => technikFamilie(t) === 'EMBROIDERY');
  const wahl = { ...angegeben };
  if (defs && vorgaben && vorgaben.stitch_color && ids.includes('stitch_color') && typen.length && !('stitch_color' in wahl)) wahl.stitch_color = vorgaben.stitch_color;   // Vorgabe des Besitzers (PRINTFUL_STITCH_COLOR), gegen die Werte des Produkts geprüft
  const nenne = Object.keys(wahl);
  if (!defs) { if (nenne.length || stickerei.length) merke('Optionen des Printful-Produkts nicht lesbar: Angaben und Pflichtoptionen lassen sich nicht prüfen'); return { optionen, befunde }; }
  for (const id of nenne) {
    const def = defs.find((o) => o.id === id);
    if (!def) { merke(`Option «${id}» gibt es bei diesem Printful-Produkt nicht`); continue; }
    const r = wertePruefen(def, wahl[id]);
    if (r.fehler) merke(`Option «${id}»: ${r.fehler}`); else optionen.push({ id, value: r.wert });
  }
  const fehlt = (id, wofuer) => { if (!(id in wahl)) merke(`Pflichtoption «${id}» fehlt (${wofuer})`); };
  for (const t of stickerei) {
    const g = garnOption(t, ids);
    if (g) fehlt(g, `Garnfarben für die Stickerei «${t}»`);
    else merke(`Für die Stickerei «${t}» führt der Printful-Katalog keine Garnfarben-Option: die Pflichtangaben lassen sich nicht prüfen`);
  }
  if (ids.includes('stitch_color') && typen.length) fehlt('stitch_color', 'Nahtfarbe dieses Produkts');
  const strick = produkt && Array.isArray(produkt.techniques) && produkt.techniques.some((x) => x && x.key === 'KNITWEAR');
  if (strick && ids.includes('yarn_colors')) fehlt('yarn_colors', 'Garnfarben dieses Strickprodukts');
  return { optionen, befunde };
}

/** Mischung von Techniken im selben Artikel (Stickerei + Direktdruck, DTF + Direktdruck …): bei Printful nicht belegt → weicher Befund. */
export function technikPruefen(typen) {
  const fam = [...new Set((typen || []).map(technikFamilie))];
  return fam.length > 1 ? [{ art: 'technik-gemischt', text: `mehrere Techniken in einem Artikel (${fam.join(' und ')}): ob Printful das in einem Auftrag zulässt, ist nicht belegt`, hart: false }] : [];
}

/**
 * Kollidierende Platzierungen (Katalog: GET /mockup-generator/templates/<id> → conflicting_placements [{placement, conflicts:[…]}]; die Angabe gilt in beide Richtungen).
 * Verglichen wird auf Ebene der Platzierungsnamen (Datei «default» = Platzierung «front»).
 */
export function konfliktePruefen({ typen = [], produkt = null, konflikte = null } = {}) {
  if (!Array.isArray(konflikte)) return typen.length > 1 ? [{ art: 'konflikt', text: 'Konfliktliste der Platzierungen nicht lesbar: mehrere Platzierungen lassen sich nicht auf Verträglichkeit prüfen', hart: false }] : [];
  const sperr = new Map();
  const zu = (a, b) => { if (!sperr.has(a)) sperr.set(a, new Set()); sperr.get(a).add(b); };
  for (const k of konflikte) if (k && typeof k.placement === 'string' && Array.isArray(k.conflicts)) for (const c of k.conflicts) { zu(k.placement, c); zu(c, k.placement); }
  const namen = typen.map((t) => platzierungsName(t, produkt));
  const aus = [];
  for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
    if (namen[i] !== namen[j] && sperr.has(namen[i]) && sperr.get(namen[i]).has(namen[j])) aus.push({ art: 'konflikt', text: `Platzierungen «${namen[i]}» und «${namen[j]}» schliessen sich laut Printful-Katalog aus`, hart: false });
  }
  return aus;
}

// ───────────────────────────────────────────────────────────── Auflösung (Kopfzeile der Datei, Druckdatei des Katalogs)
/** Pixelgrösse aus den ersten Bytes einer PNG- oder JPEG-Datei (keine Bildbibliothek nötig). @returns {{format:'png'|'jpeg', breite:number, hoehe:number}|null} */
export function dateiMasse(bytes) {
  const b = bytes;
  if (!b || !b.length) return null;
  const u32 = (o) => ((b[o] * 16777216) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]);
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    if (!(b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52)) return null;       // erster Block muss IHDR sein
    const breite = u32(16), hoehe = u32(20);
    return breite > 0 && hoehe > 0 ? { format: 'png', breite, hoehe } : null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) return null;
      const m = b[o + 1];
      if (m === 0xff) { o++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
      const len = (b[o + 2] << 8) + b[o + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        const hoehe = (b[o + 5] << 8) + b[o + 6], breite = (b[o + 7] << 8) + b[o + 8];
        return breite > 0 && hoehe > 0 ? { format: 'jpeg', breite, hoehe } : null;
      }
      if (len < 2) return null;
      o += 2 + len;
    }
  }
  return null;
}

/**
 * Die Druckdatei (Pixelgrösse, dpi) einer Variante und Platzierung aus GET /mockup-generator/printfiles/<Produkt> (`variant_printfiles`, im Katalog verdichtet als
 * `variant_printfiles_gruppen`). Die Schlüssel der Platzierungen sind Platzierungsnamen («front»), nicht Datei-IDs («default»): erst der Name, dann die Angabe selbst.
 * @returns {{breite:number, hoehe:number, dpi:number, fillMode:string}|null}
 */
export function druckdateiFuer({ printfiles, vid, typ, produkt = null } = {}) {
  const pf = printfiles && typeof printfiles === 'object' ? printfiles : null;
  if (!pf || !Array.isArray(pf.printfiles)) return null;
  let platz = null;
  if (Array.isArray(pf.variant_printfiles)) platz = (pf.variant_printfiles.find((v) => v && Number(v.variant_id) === Number(vid)) || {}).placements || null;
  if (!platz && Array.isArray(pf.variant_printfiles_gruppen)) platz = (pf.variant_printfiles_gruppen.find((g) => g && Array.isArray(g.varianten) && g.varianten.map(Number).includes(Number(vid))) || {}).placements || null;
  if (!platz) return null;
  const name = platzierungsName(typ, produkt);
  const id = platz[name] ?? platz[typ];
  const d = pf.printfiles.find((x) => x && Number(x.printfile_id) === Number(id));
  if (!d || !(d.width > 0) || !(d.height > 0) || !(d.dpi > 0)) return null;
  return { breite: Number(d.width), hoehe: Number(d.height), dpi: Number(d.dpi), fillMode: String(d.fill_mode || 'fit') };
}

/**
 * Wirkliche Auflösung der Datei auf dem Produkt. «fit» (Vorgabe): die Datei wird so eingepasst, dass sie ganz in die Druckfläche passt → dpi = Druckdatei-dpi × max(B/Bp, H/Hp).
 * Andere Füllarten («fill»): die Fläche wird gefüllt → min(…). @returns {number}
 */
export function wirklicheDpi(masse, druckdatei) {
  const rb = masse.breite / druckdatei.breite, rh = masse.hoehe / druckdatei.hoehe;
  return druckdatei.dpi * (druckdatei.fillMode === 'fit' ? Math.max(rb, rh) : Math.min(rb, rh));
}

/** Mindest-dpi des Katalogs (templates.min_dpi); fehlt sie, gilt 72 (die kleinste Auflösung in den echten Aufträgen). */
export const MIN_DPI_VORGABE = 72;

/** @returns {{ok:boolean, dpi:number, text:string}} */
export function aufloesungPruefen({ masse, druckdatei, minDpi }) {
  const min = Number.isFinite(Number(minDpi)) && Number(minDpi) > 0 ? Number(minDpi) : MIN_DPI_VORGABE;
  const dpi = wirklicheDpi(masse, druckdatei);
  const ok = dpi + 1e-9 >= min;
  return { ok, dpi, text: `${masse.breite}×${masse.hoehe} px ergeben auf dem Produkt etwa ${Math.round(dpi)} dpi (Mindestens ${min} dpi, Druckdatei ${druckdatei.breite}×${druckdatei.hoehe} px bei ${druckdatei.dpi} dpi)` };
}

// ───────────────────────────────────────────────────────────── Kosten-Wächter
/** Setzungen wie dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs (REGEL): Kurs für die KOSTEN 0.90 (Puffer über dem Messkurs 0.82435), MWST 8.1 %, Gebühr 3.4 % + 0.30. */
export const KOSTEN_REGEL = Object.freeze({ kurs: 0.90, mwst: 0.081, gebuehrProzent: 0.034, gebuehrFix: 0.30 });

/** Zahl aus einer Zahl oder einer Dezimalzeichenkette («12.70», «-5»); alles andere ist null (kein Hex «0x10», kein «1e1», kein Array, kein true: Number() hätte sie als Zahl gelesen). */
const DEZIMAL = /^-?\d+(\.\d+)?$/;
const num = (x) => {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (!DEZIMAL.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
/** Kleinste plausible Summe eines Printful-Auftrags in USD (der billigste Artikel samt Versand liegt weit darüber): darunter ist die Zahl keine gerechnete Summe. */
export const KOSTEN_MIN_USD = 0.5;

/**
 * Auftragskosten von Printful (order.costs, USD) gegen den Erlös halten. Erlös = Summe der POD-Positionen (CHF, inkl. MWST, nach Rabatt, Menge ohne entfernte/erstattete Einheiten)
 * PLUS ihr Anteil am vom Kunden bezahlten Versand (planeBestellung: `erloesChf`): Printfuls Kosten enthalten den Versand (GEMESSEN #1033: 18.24 von 19.71 USD), also gehört der bezahlte Versand auf die Erlösseite
 * (ohne ihn wäre #1033 ein «Verlust» von -1.72 CHF gewesen, mit ihm +4.51). Verglichen wird ohne Printfuls Steuer (`tax`, `vat`: bei einem MWST-pflichtigen Shop Vorsteuer, wie in der Preisformel).
 * Netto = Erlös/(1+MWST) − Gebühr − Kosten. Kein Netto unter `nettoMin` → Befund «kosten». Unbekanntes ist KEIN grünes Licht, sondern «kosten-unbekannt»: Kosten noch in Berechnung, andere Währung,
 * Erlös unbekannt, und Kosten von null oder darunter (ein frischer Entwurf ohne gerechnete Positionen kann 0.00 melden; negative Werte entstehen, wenn die Steuer die Summe übersteigt).
 * `maxUsd` = optionale absolute Obergrenze der Printful-Summe (USD) je Auftrag; null/0 = aus. Darüber: Befund «kosten-obergrenze» (weich), noch vor der Erlösrechnung.
 * @returns {{ok:boolean, art:string|null, text:string, nettoChf:number|null, kostenChf:number|null}}
 */
export function kostenPruefen({ costs, erloesChf, nettoMin = 0, regel = KOSTEN_REGEL, maxUsd = null } = {}) {
  const unbek = (text) => ({ ok: false, art: 'kosten-unbekannt', text, nettoChf: null, kostenChf: null });
  if (!costs || typeof costs !== 'object') return unbek('Printful nennt noch keine Kosten für den Auftrag');
  if (costs.calculation_status && String(costs.calculation_status).toLowerCase() !== 'done') return unbek(`Printful rechnet die Kosten noch (${costs.calculation_status})`);
  if (!costs.currency || String(costs.currency).trim().toUpperCase() !== 'USD') return unbek(costs.currency ? `Kosten in ${costs.currency}, erwartet USD` : 'Printful nennt die Währung der Kosten nicht (erwartet USD): ohne Währung wird nichts gerechnet');
  const total = num(costs.total);
  if (total === null) return unbek('Printful nennt noch keine Kosten für den Auftrag');
  if (total <= 0) return unbek(`Printful meldet Kosten von ${total.toFixed(2)} USD: das ist keine gerechnete Summe`);
  if (total < KOSTEN_MIN_USD) return unbek(`Printful meldet Kosten von ${total.toFixed(2)} USD: unter ${KOSTEN_MIN_USD.toFixed(2)} USD ist das keine plausible Summe`);
  // Absolute Obergrenze je Auftrag (PRINTFUL_MAX_KOSTEN_USD, Vorgabe aus): gilt für die Summe, die Printful der hinterlegten Karte belastet (Ware, Versand, Steuer), unabhängig vom Erlös. Nie ein Freispruch: darunter gelten die übrigen Prüfungen weiter.
  const grenze = num(maxUsd);
  if (grenze !== null && grenze > 0 && total > grenze) return { ok: false, art: 'kosten-obergrenze', text: `Printful berechnet ${total.toFixed(2)} USD für den Auftrag, die Obergrenze ist ${grenze.toFixed(2)} USD (PRINTFUL_MAX_KOSTEN_USD): Entwurf im Printful-Dashboard prüfen`, nettoChf: null, kostenChf: null };
  const erloes = num(erloesChf);
  if (erloes === null || erloes <= 0) return unbek('Erlös der Positionen unbekannt');
  const ohneSteuer = total - (num(costs.tax) || 0) - (num(costs.vat) || 0);
  if (ohneSteuer <= 0) return unbek(`Printful-Kosten ohne Steuer ergeben ${ohneSteuer.toFixed(2)} USD (Summe ${total.toFixed(2)}, Steuer ${(num(costs.tax) || 0) + (num(costs.vat) || 0)}): nicht plausibel`);
  const kostenChf = Math.round(ohneSteuer * regel.kurs * 100) / 100;
  const nettoChf = Math.round((erloes / (1 + regel.mwst) - (erloes * regel.gebuehrProzent + regel.gebuehrFix) - kostenChf) * 100) / 100;
  if (nettoChf < nettoMin) return { ok: false, art: 'kosten', text: `${nettoChf < 0 ? 'Verlust' : 'Gewinn unter dem Mindestgewinn'}: Printful kostet ${kostenChf.toFixed(2)} CHF (${ohneSteuer.toFixed(2)} USD ohne Steuer), der Erlös (Positionen samt Versandanteil) ist ${erloes.toFixed(2)} CHF, netto bleiben ${nettoChf.toFixed(2)} CHF (Mindest ${nettoMin.toFixed(2)})`, nettoChf, kostenChf };
  return { ok: true, art: null, text: `netto ${nettoChf.toFixed(2)} CHF`, nettoChf, kostenChf };
}

// ───────────────────────────────────────────────────────────── Printful-Auftrag lesen
export const BESTAETIGT = new Set(['pending', 'inprocess', 'partial', 'fulfilled', 'inreview']);

/**
 * Status eines Printful-Auftrags NACH dem Bestätigen bewerten. «bestätigt» heisst nur: Printful hat ihn angenommen UND die Zahlung der hinterlegten Karte ist nicht gescheitert.
 * @returns {{art:'bestaetigt'|'wartet'|'problem', befund:string|null, text:string}}
 */
export function statusBewerten(order) {
  const s = String(order && order.status || '').toLowerCase();
  const grund = (order && (order.error || order.errorCode)) ? ` (${String(order.error || order.errorCode).slice(0, 160)})` : '';
  if (BESTAETIGT.has(s)) return { art: 'bestaetigt', befund: null, text: s };
  if (s === 'draft') return { art: 'wartet', befund: 'nicht-bestaetigt', text: 'Auftrag steht nach dem Bestätigen noch als Entwurf' };
  if (s === 'failed') return { art: 'problem', befund: 'zahlung-fehlgeschlagen', text: `Printful meldet «failed»${grund}: Zahlung der Karte, Adresse oder fehlende Dateien kommen in Frage (die Ursache steht im Printful-Dashboard)` };
  if (s === 'onhold') return { art: 'problem', befund: 'angehalten', text: `Printful hat den Auftrag angehalten («onhold»)${grund}` };
  if (s === 'canceled') return { art: 'problem', befund: 'storniert', text: 'Printful meldet den Auftrag als storniert' };
  return { art: 'problem', befund: 'status-unbekannt', text: `Printful meldet den unbekannten Status «${s || '(leer)'}»` };
}

/**
 * Dateien des Auftrags laut Printful (items[].files[].status/warning; GEMESSEN 05.11.: {"type":"default","status":"ok","width":1024,"height":1024,"dpi":72}).
 * Ein Auftrag ist nur dann «ok», wenn JEDER Artikel mindestens eine echte Datei führt (10.11.2026, Gegenleser Linse 2: bei zwei Artikeln mit Dateien nur am ersten gab die Prüfung «ok», weil nur die Gesamtzahl der
 * Dateien zählte; ein Warenkorb mit mehreren selbst gestalteten Artikeln ist der Normalfall).
 * @returns {{art:'ok'|'wartet'|'problem', texte:string[], leer?:boolean, teilweise?:boolean}}
 */
export function dateienStatus(order) {
  const texte = []; let wartet = false, echte = 0, artikelOhne = 0;
  for (const it of (order && Array.isArray(order.items) ? order.items : [])) {
    let proArtikel = 0;
    for (const f of (it && Array.isArray(it.files) ? it.files : [])) {
      if (!f || f.type === 'preview' || f.type === 'mockup') continue;
      echte++; proArtikel++;
      const st = String(f.status || '').toLowerCase();
      if (st === 'waiting' || st === 'processing' || st === 'uploading') { wartet = true; continue; }
      if (st !== 'ok') texte.push(`Datei «${f.type}»: Status «${f.status || '(leer)'}»${f.warning ? ': ' + String(f.warning).slice(0, 140) : ''}`);
      else if (f.warning) texte.push(`Datei «${f.type}»: Printful warnt: ${String(f.warning).slice(0, 140)}`);
    }
    if (!proArtikel) artikelOhne++;
  }
  // Ein Auftrag ohne eine einzige Datei (Printful hat sie noch nicht angehängt, die Antwort ist leer oder fehlt) ist NIE «ok»: er wartet (und wird nach der Wartezeit zum Befund «datei-wartet»).
  // Dasselbe gilt, wenn nur EIN Artikel noch keine Datei führt (`teilweise`).
  return texte.length ? { art: 'problem', texte } : wartet || echte === 0 || artikelOhne > 0 ? { art: 'wartet', texte, leer: echte === 0, teilweise: echte > 0 && artikelOhne > 0 } : { art: 'ok', texte };
}

/**
 * Der von Printful zurückgegebene Entwurf gegen das, was gesendet wurde: gleiche Zahl Artikel, je Artikel dieselben Dateitypen (Vorschau/Mockup zählen nicht), Variante und Menge, wo Printful sie nennt.
 * Fehlt im Entwurf noch jede Datei, ist das «wartet» (dateienStatus kümmert sich); weicht er ab (weniger Artikel, andere Variante, fehlende Datei), ist es ein Befund «entwurf-abweichend».
 * @param {object} order  Antwort von GET /orders/<id>   @param {{variant_id:number, quantity:number, files:{type:string}[]}[]} planItems  was gesendet wurde
 * @returns {{ok:boolean, texte:string[]}}
 */
export function entwurfVergleichen(order, planItems) {
  const texte = [];
  const soll = Array.isArray(planItems) ? planItems : [];
  const items = order && Array.isArray(order.items) ? order.items : [];
  if (items.length !== soll.length) { texte.push(`Printful nennt ${items.length} Artikel im Entwurf, gesendet wurden ${soll.length}`); return { ok: false, texte }; }
  const ohneDatei = [];
  for (let i = 0; i < soll.length; i++) {
    const p = soll[i], it = items[i] || {};
    if (it.variant_id !== undefined && it.variant_id !== null && Number(it.variant_id) !== Number(p.variant_id)) texte.push(`Artikel ${i + 1}: Printful nennt die Variante ${it.variant_id}, gesendet wurde ${p.variant_id}`);
    if (it.quantity !== undefined && it.quantity !== null && Number(it.quantity) !== Number(p.quantity)) texte.push(`Artikel ${i + 1}: Printful nennt die Menge ${it.quantity}, gesendet wurde ${p.quantity}`);
    const echte = (Array.isArray(it.files) ? it.files : []).filter((f) => f && f.type !== 'preview' && f.type !== 'mockup').map((f) => String(f.type));
    const gesendet = (p.files || []).map((f) => String(f.type)).sort();
    if (!echte.length) { if (gesendet.length) ohneDatei.push(i + 1); continue; }   // noch keine Datei angehängt: das ist «wartet» (dateienStatus)
    if (JSON.stringify(echte.slice().sort()) !== JSON.stringify(gesendet)) texte.push(`Artikel ${i + 1}: Printful führt die Dateien «${echte.join(', ')}», gesendet wurden «${gesendet.join(', ')}»`);
  }
  // Führt nur ein Teil der Artikel schon Dateien, die übrigen nicht, ist der Entwurf NICHT «gleich dem Gesendeten» (sonst gäbe der Vergleich einen Auftrag frei, dessen zweiter Artikel nie eine Datei bekam).
  // Sind ALLE Artikel noch ohne Datei, ist es «wartet» und kein Abweichen.
  if (ohneDatei.length && ohneDatei.length < soll.filter((p) => (p.files || []).length).length) texte.push(`Artikel ${ohneDatei.join(', ')}: Printful führt noch keine Datei, bei den übrigen Artikeln schon`);
  return { ok: texte.length === 0, texte };
}

// ───────────────────────────────────────────────────────────── Kennung, Empfänger, Tags
/**
 * Printful-external_id der Shopify-Bestellung. Der Normalfall «#1034» → «LX1034» (nur Ziffern; so steht sie im Printful-Dashboard lesbar neben der Bestellnummer).
 * Muss beim Bilden ein Zeichen weggelassen werden (Suffix wie «#1034-1»), wird die Shopify-Bestell-ID angehängt: «#1034-1» und «#10341» würden sonst beide zu «LX10341», und die zweite
 * Bestellung gälte als «existiert schon» und würde nie gedruckt (Gegenleser-Fund 05.11.). Das «N» kommt in der reinen Ziffernform nie vor, beide Formen kollidieren also nie.
 * Höchstens 32 Zeichen (Printful); die ID hat Vorrang vor dem Namensanteil. null, wenn nichts übrig bleibt.
 * @param {string} name Bestellnummer («#1034»)   @param {string} [id] Shopify-ID («gid://shopify/Order/19118298694023»)
 */
export function externalId(name, id) {
  const roh = String(name == null ? '' : name).replace(/[^A-Za-z0-9]/g, '');
  if (!roh) return null;
  if (/^#?[A-Za-z0-9]+$/.test(String(name).trim())) return ('LX' + roh).slice(0, 32);   // nichts weggelassen: der Name ist eindeutig
  const num = String(id == null ? '' : id).split('/').pop().replace(/\D/g, '');
  const rest = 32 - 2 - 1 - num.length;
  if (!num || rest < 1) return ('LX' + roh).slice(0, 32);   // ohne brauchbare ID wie bisher
  return 'LX' + roh.slice(0, rest) + 'N' + num;
}

/** Empfänger aus der Shopify-Lieferadresse; fehlen Pflichtfelder, ist das ein harter Befund. @returns {{recipient:object|null, befunde:object[]}} */
export function empfaengerAus(o) {
  const a = (o && o.shippingAddress) || null;
  if (!a) return { recipient: null, befunde: [{ art: 'adresse', text: 'Die Bestellung hat keine Lieferadresse', hart: true }] };
  const name = a.name || [a.firstName, a.lastName].filter(Boolean).join(' ');
  const recipient = { name: name || '', address1: a.address1 || '', address2: a.address2 || '', city: a.city || '', state_code: a.provinceCode || '', country_code: a.countryCodeV2 || '', zip: a.zip || '', email: (o && o.email) || '', phone: a.phone || '' };
  const fehlt = [['name', 'Name'], ['address1', 'Strasse'], ['city', 'Ort'], ['zip', 'PLZ'], ['country_code', 'Land']].filter(([k]) => !String(recipient[k]).trim()).map(([, t]) => t);
  return { recipient, befunde: fehlt.length ? [{ art: 'adresse', text: `Lieferadresse unvollständig: ${fehlt.join(', ')} fehlt`, hart: true }] : [] };
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const REVIEW_TAG = 'printful-review';
/** Tag einer Befundart; mit `printful-review` zusammen gesetzt (wie `printful-problem-<art>` in printful_tracking.mjs). */
export const befundTag = (art) => `${REVIEW_TAG}-${slug(art)}`;

/**
 * Welche Tags setzt eine Befundliste, und muss gemeldet werden? Eine Befundart wird nur EINMAL gemeldet: steht ihr Tag schon an der Bestellung, ist sie nicht neu.
 * `neu` = alle Befunde (mit Text) der noch nicht gemeldeten Arten, `hinzu` = die Tags, die gesetzt werden müssen.
 * @returns {{hinzu:string[], neu:{art:string,text:string,hart:boolean}[], alarm:boolean}}
 */
export function befundPlan({ tags = [], befunde = [] } = {}) {
  const hat = new Set(tags);
  const arten = [...new Set(befunde.map((b) => slug(b.art)))];
  const neu = befunde.filter((b) => !hat.has(befundTag(b.art)));   // ALLE Texte einer neuen Art (eine Art kann mehrere Positionen/Seiten betreffen); die Art selbst wird nur einmal getaggt
  const hinzu = befunde.length ? [REVIEW_TAG, ...arten.map(befundTag)].filter((t, i, l) => !hat.has(t) && l.indexOf(t) === i) : [];
  return { hinzu, neu, alarm: neu.length > 0 };
}

export const MAX_VERSUCHE = 3;
/** Zähler vorübergehender Fehler an der Bestellung (Tag `printful-versuch-<n>`). */
export function versuche(tags = []) {
  let n = 0;
  for (const t of tags) { const m = /^printful-versuch-(\d+)$/.exec(t); if (m) n = Math.max(n, parseInt(m[1], 10)); }
  return n;
}
export const versuchTag = (n) => `printful-versuch-${n}`;

/** Telegram-HTML maskieren (Texte aus Gemini, Printful und Kundenangaben sind Fremdtext). */
export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ───────────────────────────────────────────────────────────── Zahlung, Markierung vor dem Anlegen, vorhandener Auftrag, Scopes, Bestätigungsplan (Härtung 10.11.2026)
/**
 * Ist die Bestellung (Shopify-Knoten: test, cancelledAt, displayFinancialStatus) wirklich eine BEZAHLTE, nicht stornierte, nicht erstattete Kundenbestellung? Der Suchstring der Liste («financial_status:paid») ist nur eine
 * Vorauswahl; diese Funktion urteilt am Knoten selbst, bei der Liste UND beim frischen Lesen kurz vor dem Bestätigen. Fehlt ein Feld (die Abfrage wurde geändert, die Antwort ist unvollständig), ist das «unlesbar»: nie bezahlt.
 * @returns {{ok:boolean, art:'ok'|'test'|'storniert'|'nicht-bezahlt'|'unlesbar', text:string}}
 */
export function zahlungPruefen(n) {
  if (!n || typeof n !== 'object') return { ok: false, art: 'unlesbar', text: 'Bestellung nicht lesbar' };
  if (n.test === true) return { ok: false, art: 'test', text: 'Testbestellung (Bogus-Gateway oder Zahlungsanbieter im Testmodus)' };
  if (n.test !== false) return { ok: false, art: 'unlesbar', text: 'Das Feld «test» fehlt in der Antwort' };
  if (n.cancelledAt === undefined) return { ok: false, art: 'unlesbar', text: 'Das Feld «cancelledAt» fehlt in der Antwort' };
  if (n.cancelledAt) return { ok: false, art: 'storniert', text: `in Shopify storniert (${n.cancelledAt})` };
  if (typeof n.displayFinancialStatus !== 'string' || !n.displayFinancialStatus) return { ok: false, art: 'unlesbar', text: 'Das Feld «displayFinancialStatus» fehlt in der Antwort' };
  if (n.displayFinancialStatus.toUpperCase() !== 'PAID') return { ok: false, art: 'nicht-bezahlt', text: `Zahlungsstatus ${n.displayFinancialStatus} (nur PAID wird gedruckt; erstattete Bestellungen sind es nicht mehr)` };
  return { ok: true, art: 'ok', text: 'bezahlt' };
}

/** Markierung VOR dem Anlegen eines Printful-Auftrags (Tag `printful-anlegen-<JJJJMMTT>t<HHMM>` in UTC): ein späterer Lauf legt innerhalb von ANLEGEN_SPERRE_MIN Minuten nichts neu an, auch wenn Printful den Auftrag noch nicht zeigt. */
export const ANLEGEN_SPERRE_MIN = 60;
const zwei = (n) => String(n).padStart(2, '0');
/**
 * Markierung (Anspruch) vor dem Anlegen. Ohne `zufall`: die alte Form «printful-anlegen-JJJJMMTTtHHMM». Mit `zufall` (4 bis 12 Zeichen a-z0-9): «printful-anlegen-JJJJMMTTtHHMM-SSmmm-<zufall>». Die Zeichenkette ist nach der Zeit
 * des Schreibens geordnet (Minute, dann Sekunden und Millisekunden); bei zwei Läufen, die gleichzeitig anlegen wollen, gewinnt der Anspruch mit der KLEINSTEN Zeichenkette (`anspruchGewonnen`).
 */
export function anlegenTag(jetztMs, zufall = null) {
  const d = new Date(jetztMs);
  const basis = `printful-anlegen-${d.getUTCFullYear()}${zwei(d.getUTCMonth() + 1)}${zwei(d.getUTCDate())}t${zwei(d.getUTCHours())}${zwei(d.getUTCMinutes())}`;
  if (zufall === null || zufall === undefined) return basis;
  const z = String(zufall).toLowerCase();
  if (!/^[a-z0-9]{4,12}$/.test(z)) throw new Error('anlegenTag: der Zufallsteil muss aus 4 bis 12 Zeichen a-z0-9 bestehen');
  return `${basis}-${zwei(d.getUTCSeconds())}${String(d.getUTCMilliseconds()).padStart(3, '0')}-${z}`;
}
const ANSPRUCH_TAG = /^printful-anlegen-(\d{4})(\d{2})(\d{2})t(\d{2})(\d{2})(?:-\d{5}-[a-z0-9]{4,12})?$/;
const anspruchMs = (t) => { const m = ANSPRUCH_TAG.exec(String(t)); if (!m) return null; const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]); return Number.isFinite(ms) ? ms : null; };
/** Alter der JÜNGSTEN Markierung in Minuten (nie negativ); null, wenn keine da ist. */
export function anlegenAlterMin(tags, jetztMs) {
  let jung = null;
  for (const t of tags || []) {
    const ms = anspruchMs(t);
    if (ms !== null && (jung === null || ms > jung)) jung = ms;
  }
  return jung === null ? null : Math.max(0, Math.floor((jetztMs - jung) / 60000));
}
/** Sperrt eine Markierung dieses Alters (Minuten, aus `anlegenAlterMin`; null = keine) das Anlegen? Genau ANLEGEN_SPERRE_MIN Minuten alt sperrt NICHT mehr (Grenze: «jünger als»). */
export const anlegenGesperrt = (alterMin) => alterMin !== null && alterMin < ANLEGEN_SPERRE_MIN;
/**
 * Hat der Anspruch `meinTag` gegen gleichzeitige Läufe gewonnen? (Gegenleser Linse 1: das Lesen der Markierung und das Setzen der eigenen sind kein atomarer Schritt; zwei scharfe Läufe, etwa lokal neben Actions,
 * könnten beide «frei» lesen und beide anlegen.) Nach dem Setzen der eigenen Markierung wird die Bestellung erneut gelesen: nur wer unter den AKTIVEN Ansprüchen (jünger als ANLEGEN_SPERRE_MIN) die kleinste
 * Zeichenkette hat, darf anlegen. Der frühere Schreiber hat die kleinere Zeichenkette und sieht den späteren nie (der spätere liest nach seinem Schreiben); darum legt in der Regel genau einer an. Rest: Uhren
 * der beiden Rechner weichen um mehr als die Schreibdauer ab (ungemessen). Kein Ersatz für die Concurrency-Gruppe des Workflows, nur die zweite Sicherung für lokale Läufe.
 * `art` trennt die zwei Arten des Nichtgewinnens (10.11.2026): «verloren» = ein anderer Lauf war früher (still richtig, es legt der andere an); «eigene-fehlt» = die eigene Markierung ist beim Nachlesen nicht zu sehen
 * (Shopify liest verzögert, das Tag wurde entfernt, die Antwort ist unvollständig): das ist kein Verlust, sondern ein Lesefehler und muss SICHTBAR werden (Fehler, Exit 1), sonst bliebe die Bestellung bei jedem Lauf still liegen.
 * @returns {{ok:boolean, grund:string|null, art:'gewonnen'|'verloren'|'eigene-fehlt'}}
 */
export function anspruchGewonnen(tags, meinTag, jetztMs) {
  const aktiv = (tags || []).filter((t) => { const ms = anspruchMs(t); return ms !== null && Math.max(0, Math.floor((jetztMs - ms) / 60000)) < ANLEGEN_SPERRE_MIN; });
  if (!aktiv.includes(meinTag)) return { ok: false, grund: 'die eigene Markierung steht nicht (mehr) an der Bestellung', art: 'eigene-fehlt' };
  const frueher = aktiv.filter((t) => t < meinTag);
  return frueher.length ? { ok: false, grund: `ein anderer Lauf hat früher markiert (${frueher.length} ältere Markierung(en) der letzten ${ANLEGEN_SPERRE_MIN} Minuten)`, art: 'verloren' } : { ok: true, grund: null, art: 'gewonnen' };
}

/**
 * Passt ein SCHON vorhandener Printful-Auftrag mit unserer external_id zu dieser Bestellung? (Empfänger: Name, PLZ, Land; Menge: Summe der Editor-Positionen.) Bei einer Wiederverwendung von Bestellnummern oder einem von Hand
 * angelegten «LX…»-Auftrag stimmt er nicht, und die echte Bestellung bliebe still ungedruckt. Texte ohne Kundendaten (sie landen im Protokoll der Befundart).
 * @returns {{ok:boolean, texte:string[]}}
 */
export function vorhandenVergleichen(order, o) {
  const texte = [];
  const roh = (x) => String(x == null ? '' : x).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const woerter = (x) => roh(x).split(' ').filter(Boolean).sort().join(' ');
  const emp = empfaengerAus(o).recipient;
  const r = order && order.recipient && typeof order.recipient === 'object' ? order.recipient : null;
  if (!emp) texte.push('die Shopify-Bestellung hat keine Lieferadresse zum Vergleichen');
  else if (!r) texte.push('der Empfänger des vorhandenen Printful-Auftrags ist nicht lesbar');
  else {
    if (woerter(r.name) !== woerter(emp.name)) texte.push('der Name des Empfängers weicht ab');
    if (roh(r.zip).replace(/ /g, '') !== roh(emp.zip).replace(/ /g, '')) texte.push('die PLZ weicht ab');
    if (String(r.country_code || '').toUpperCase() !== String(emp.country_code || '').toUpperCase()) texte.push('das Land weicht ab');
  }
  const podZeilen = ((o && o.lineItems && o.lineItems.edges) || []).map((e) => e && e.node).filter(Boolean).filter((z) => istPod(z));
  const soll = podZeilen.reduce((a, z) => a + (mengeVon(z) > 0 ? mengeVon(z) : 0), 0);   // entfernte Positionen (0) und unlesbare (-1) zählen nicht zur Soll-Menge; die unlesbaren meldet die Zeile darunter
  if (podZeilen.some((z) => mengeVon(z) < 0)) texte.push('die Menge einer Position der Bestellung ist nicht lesbar');
  const items = order && Array.isArray(order.items) ? order.items : null;
  if (!items) texte.push('die Artikel des vorhandenen Printful-Auftrags sind nicht lesbar');
  else {
    const ist = items.reduce((a, it) => a + (num(it && it.quantity) || 0), 0);
    if (ist !== soll) texte.push(`die Stückzahl weicht ab (Printful ${ist}, Bestellung ${soll})`);
  }
  return { ok: texte.length === 0, texte };
}

/**
 * Zugriffsrechte (Scopes) des Tokens, die der Sync braucht, um die Fulfillment-Orders BEIDER Standortarten zu sehen: Händler-Standorte («Shop location») und Dienst-Standorte («Printful»). Fehlt eines, sind die Orders
 * dieser Art unsichtbar, und die Standort-Sperre käme nur über «unklar». `write_` schliesst `read_` ein. @param {string[]|null} handles @returns {{art:'ok'|'fehlt'|'unbekannt', fehlt:string[]}}
 */
export const SCOPES_PFLICHT = Object.freeze([['read_merchant_managed_fulfillment_orders', 'write_merchant_managed_fulfillment_orders'], ['read_third_party_fulfillment_orders', 'write_third_party_fulfillment_orders']]);
export function scopesBewerten(handles) {
  if (!Array.isArray(handles)) return { art: 'unbekannt', fehlt: [] };
  const h = new Set(handles.map(String));
  const fehlt = SCOPES_PFLICHT.filter((alt) => !alt.some((x) => h.has(x))).map((alt) => alt[0]);
  return { art: fehlt.length ? 'fehlt' : 'ok', fehlt };
}

/**
 * Wann bestätigt der Sync einen Printful-Auftrag selbst? REGEL (10.11.2026): nur wenn alle drei Bedingungen gelten:
 *   1. PRINTFUL_AUTO_CONFIRM ist ausdrücklich an,
 *   2. eine Kostenobergrenze steht (PRINTFUL_MAX_KOSTEN_USD > 0); fehlt sie bei AUTO_CONFIRM=1, ist das ein Konfigurationsfehler (`konfigFehler`: der Lauf bricht vor allem anderen ab),
 *   3. die KI-Kontrolle der Druckdatei ist an (PRINTFUL_KI_KONTROLLE=pflicht). Ist sie aus, bleibt jede Bestätigung aus (der Auftrag bleibt ein Entwurf mit Befund «manuell», Grund im Text).
 * @returns {{bestaetigen:boolean, grund:string|null, konfigFehler:string|null}}
 */
export function bestaetigenPlan({ autoConfirm = false, ki = 'aus', maxKostenAus = true } = {}) {
  if (!autoConfirm) return { bestaetigen: false, grund: 'automatisches Bestätigen ist aus (PRINTFUL_AUTO_CONFIRM=0)', konfigFehler: null };
  if (maxKostenAus) return { bestaetigen: false, grund: 'PRINTFUL_AUTO_CONFIRM=1 verlangt eine Kostenobergrenze (PRINTFUL_MAX_KOSTEN_USD)', konfigFehler: 'PRINTFUL_AUTO_CONFIRM=1 verlangt eine Kostenobergrenze: PRINTFUL_MAX_KOSTEN_USD auf eine Zahl über 0 setzen (z. B. 60 für 60 USD je Auftrag); ohne sie wird nichts angelegt' };
  if (ki !== 'pflicht') return { bestaetigen: false, grund: 'automatisches Bestätigen verlangt die eingeschaltete KI-Kontrolle der Druckdatei (PRINTFUL_KI_KONTROLLE=pflicht plus GEMINI_API_KEY), sie ist aus', konfigFehler: null };
  return { bestaetigen: true, grund: null, konfigFehler: null };
}

// ───────────────────────────────────────────────────────────── Gemini-Kontrolle
/** Antwort der Kontrolle lesen: muss mit PASS oder FAIL beginnen («**PASS** – …» zählt), alles andere ist KEINE Freigabe. @returns {'pass'|'fail'|null} */
export function kontrolleLesen(text) {
  const m = /^[\s*_`>#"'-]*(pass|fail)\b/i.exec(String(text == null ? '' : text));
  return m ? m[1].toLowerCase() : null;
}

/** Kleinere Kopie einer Cloudinary-Datei für die Kontrolle (grosse Poster-PNG sprengen sonst das Anfrage-Limit der KI). Andere Adressen bleiben unverändert. */
export function kleineKopieUrl(url, breite = 1400) {
  const s = String(url || '');
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i.exec(s);
  return m ? `${m[1]}c_limit,w_${breite}/${m[2]}` : s;
}

// ───────────────────────────────────────────────────────────── Standort der Position (Fulfillment-Service)
/** Status einer Fulfillment-Order, in dem sie zum Drucken bereit ist (QUELLE shopify.dev FulfillmentOrderStatus: OPEN = bereit, IN_PROGRESS = in Arbeit). Jeder andere offene Status heisst «nicht jetzt». */
export const FO_DRUCKBAR = Object.freeze(['OPEN', 'IN_PROGRESS']);
/**
 * Liegt die Position an einem Fulfillment-SERVICE-Standort (Location.isFulfillmentService, z. B. «Printful», wo die App die Produkte «Unisex-T-Shirt», «klassisches T-Shirt», «Hoodie», «Jutebeutel» führt;
 * GEMESSEN 09.11.2026 mit der Admin-Abfrage), meldet und druckt die App des Dienstes selbst. Ein zweiter Auftrag von diesem Sync wäre ein Doppeldruck (und die App druckt eventuell mit dem Muster-Design,
 * ungemessen). Die Prüfung liest `o.fulfillmentOrders` (Abfrage des Klebers: fulfillmentOrders{ status assignedLocation{ location{ id name isFulfillmentService } } lineItems{ lineItem{ id } } }, wie
 * automation/cj_tracking.mjs und printful_tracking.mjs); stornierte Fulfillment-Orders zählen nicht (ihre Angaben sind veraltet), geschlossene auch nicht, AUSSER eine geschlossene Order eines Dienst-Standorts steht neben einer offenen derselben Position (dann «unklar»).
 * Druckbar sind NUR die Status OPEN und IN_PROGRESS (Whitelist, 10.11.2026 Gegenleser Linse 1): ON_HOLD, SCHEDULED, INCOMPLETE und jeder unbekannte Status ergeben «gehalten» (Shopifys Mittel für Betrugsverdacht, falsche Adresse, Rückfrage der Kundin).
 * @returns {{art:'dienst'|'frei'|'unklar'|'gehalten', name?:string, grund?:string, status?:string}}
 *   dienst  mindestens eine nicht geschlossene Fulfillment-Order der Position liegt an einem Dienst-Standort
 *   gehalten  eine Fulfillment-Order der Position hat einen Status ausser OPEN/IN_PROGRESS (und liegt nicht an einem Dienst-Standort): planeBestellung → HART «fulfillment-gehalten»
 *   frei    die Position steht in mindestens einer offenen Fulfillment-Order und ALLE ihre Standorte sind Händler-Standorte (isFulfillmentService === false)
 *   unklar  Daten fehlen (keine Fulfillment-Orders in den Bestelldaten, Position in keiner offenen Fulfillment-Order, Standort oder Flag fehlt, Liste abgeschnitten): nie als «frei» gelesen.
 *           planeBestellung behandelt «unklar» wie «dienst»: HART, kein Auftrag (10.11.2026: sieht das Token die Fulfillment-Order des Dienst-Standorts nicht, wäre «weich + Entwurf» ein Doppelentwurf neben dem Auftrag der Printful-App).
 */
export function standortVon(o, positionId) {
  const fos = o && o.fulfillmentOrders;
  if (!fos || !Array.isArray(fos.edges)) return { art: 'unklar', grund: 'die Bestelldaten enthalten keine Fulfillment-Orders' };
  let gefunden = 0, dienst = null, offen = false, gehalten = null, geschlossenDienst = null, unvollstaendig = fos.pageInfo && fos.pageInfo.hasNextPage ? 'die Bestellung hat mehr Fulfillment-Orders, als eine Abfrage liefert' : null;
  for (const e of fos.edges) {
    const fo = e && e.node; if (!fo) continue;
    const st = String(fo.status || '').toUpperCase();
    if (st === 'CANCELLED') continue;                                                  // storniert: es wird nicht mehr erfüllt, die Angaben sind veraltet
    const ort = fo.assignedLocation && fo.assignedLocation.location;
    const drinIn = (x) => ((x.lineItems && x.lineItems.edges) || []).some((y) => y && y.node && y.node.lineItem && positionId && y.node.lineItem.id === positionId);
    if (st === 'CLOSED') {                                                             // erfüllt oder abgeschlossen: zählt nicht als offen. Eine geschlossene Order eines Dienst-Standorts (oder mit unlesbarem Standort) NEBEN einer offenen derselben Position ist aber ein Warnzeichen (hat der Dienst schon gedruckt?)
      if (drinIn(fo) && !(ort && ort.isFulfillmentService === false)) geschlossenDienst = geschlossenDienst || ort || { id: 'unbekannt' };
      continue;
    }
    if (fo.lineItems && fo.lineItems.pageInfo && fo.lineItems.pageInfo.hasNextPage) unvollstaendig = unvollstaendig || 'eine Fulfillment-Order hat mehr Positionen, als eine Abfrage liefert';
    if (!drinIn(fo)) continue;
    if (ort && ort.isFulfillmentService === true) dienst = dienst || ort;               // an einem Dienst-Standort gilt jeder nicht geschlossene Status
    if (!FO_DRUCKBAR.includes(st)) { gehalten = gehalten || (st || '(leer)'); continue; }   // ON_HOLD, SCHEDULED, INCOMPLETE und alles Unbekannte: nicht jetzt druckbar (Whitelist, nicht Blacklist)
    gefunden++;
    if (!(ort && ort.isFulfillmentService === true) && (!ort || ort.isFulfillmentService !== false)) offen = true;
  }
  if (dienst) return { art: 'dienst', name: String(dienst.name || dienst.id || 'Dienst-Standort') };
  if (unvollstaendig) return { art: 'unklar', grund: unvollstaendig };                 // die Liste ist abgeschnitten: die Position könnte in einer Dienst-Order jenseits der Grenze stehen
  if (gehalten) return { art: 'gehalten', status: gehalten };                          // Händler hält sie (Betrugsverdacht, falsche Adresse, Rückfrage der Kundin): nichts anlegen, nichts bestätigen
  if (!gefunden) return { art: 'unklar', grund: 'die Position steht in keiner offenen Fulfillment-Order' };
  if (offen) return { art: 'unklar', grund: 'der Standort der Fulfillment-Order ist nicht lesbar' };
  if (geschlossenDienst) return { art: 'unklar', grund: `die Position steht auch in einer GESCHLOSSENEN Fulfillment-Order von «${String(geschlossenDienst.name || geschlossenDienst.id || 'unbekannt').slice(0, 40)}» (Dienst-Standort oder Standort nicht lesbar): ob dort schon gedruckt wurde, ist unklar` };
  return { art: 'frei' };
}

// ───────────────────────────────────────────────────────────── Stand der Bestellung beim Planen gegen das frische Lesen (Gegenleser Linse 1, 10.11.2026)
const positionenListe = (n) => ((n && n.lineItems && n.lineItems.edges) || []).map((e) => e && e.node).filter(Boolean).map((z) => [String(z.id), mengeVon(z)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
/**
 * Der Stand der Bestellung, auf dem der Plan beruht: Empfänger (samt E-Mail und Telefon) und ALLE Positionen mit Menge, dazu die Positionen, aus denen ein Auftrag entstand. Das frische Lesen kurz vor dem Anlegen und vor dem Bestätigen
 * vergleicht dagegen (`bestellAbweichung`): ändert die Kundin die Adresse oder entfällt eine Position, während der Entwurf bei Printful wartet, wird der Entwurf nicht bestätigt.
 * @param {object} o Shopify-Knoten aus der Liste   @param {string[]} positionIds `plan.positionIds`
 */
export function bestellStand(o, positionIds = []) {
  return { empfaenger: JSON.stringify(empfaengerAus(o).recipient), positionen: JSON.stringify(positionenListe(o)), positionIds: Array.isArray(positionIds) ? positionIds.map(String) : [] };
}
/**
 * Hat sich die Bestellung seit dem Planen geändert? (Knoten aus dem FRISCHEN Lesen gegen `bestellStand`.) Geprüft werden Lieferadresse samt E-Mail, Positionen samt Mengen und der Fulfillment-Order-Status der geplanten
 * Positionen (ON_HOLD, Dienst-Standort, geschlossen …: alles ausser «frei» zählt). Fehlt ein Feld in der Antwort, ist das «unlesbar» (nie «unverändert»).
 * @returns {null|{art:'geaendert'|'unlesbar', text:string}} null = unverändert
 */
export function bestellAbweichung(n, soll) {
  const un = (text) => ({ art: 'unlesbar', text });
  const ge = (text) => ({ art: 'geaendert', text });
  if (!n || typeof n !== 'object' || !soll || typeof soll !== 'object') return un('Bestellung oder Stand nicht lesbar');
  if (n.shippingAddress === undefined) return un('Das Feld «shippingAddress» fehlt in der Antwort');
  if (n.email === undefined) return un('Das Feld «email» fehlt in der Antwort');
  if (!n.lineItems || !Array.isArray(n.lineItems.edges)) return un('Das Feld «lineItems» fehlt in der Antwort');
  if (soll.positionIds.length && (!n.fulfillmentOrders || !Array.isArray(n.fulfillmentOrders.edges))) return un('Das Feld «fulfillmentOrders» fehlt in der Antwort');
  if (JSON.stringify(empfaengerAus(n).recipient) !== soll.empfaenger) return ge('die Lieferadresse oder E-Mail der Bestellung hat sich seit dem Planen geändert');
  if (JSON.stringify(positionenListe(n)) !== soll.positionen) return ge('die Positionen oder Mengen der Bestellung haben sich seit dem Planen geändert');
  for (const id of soll.positionIds) {
    const s = standortVon(n, id);
    if (s.art !== 'frei') return ge(s.art === 'gehalten' ? `eine Fulfillment-Order der Position ist jetzt «${s.status}» (nicht OPEN oder IN_PROGRESS)` : s.art === 'dienst' ? `die Position liegt jetzt an einem Dienst-Standort («${s.name}»)` : `der Standort der Position ist nicht mehr eindeutig (${s.grund})`);
  }
  return null;
}

// ───────────────────────────────────────────────────────────── Aufpreis-Platzierungen gegen das bezahlte Paket
/**
 * Das BEZAHLTE Paket einer Position: welche Aufpreis-Platzierungen (Rückseite, Ärmel, Etiketten …) die Kundin im Shop-Preis mitbezahlt hat. AUSTAUSCHBAR: `cfg.paket(position, kontext)` ersetzt diese
 * Funktion (Phase 5 des Plans «Editor-Parität» wählt das Modell: Option «Druck» der Variante, SKU-Präfix oder Metafeld). Rückgabe `{bezahlt, quelle}`:
 *   bezahlt  Liste der bezahlten Platzierungen (IDs oder Namen wie «back», «sleeve_left»); [] = nur die im Grundpreis enthaltene Platzierung; null = das Paket ist NICHT bestimmbar (jeder Aufpreis bleibt dann ungedeckt)
 *   quelle   kurzer Text für die Meldung
 * STANDARD: «nur Vorderseite bezahlt». Heute berechnet kein Shop-Preis einen Aufpreis (Phase 1 ohne Aufpreis-Platzierungen, Karten mit --ohne-aufpreis); die angezeigte Summe `_pod_karte.ap` des Editors
 * ist ein reiner Browserwert und deckt nie etwas.
 */
export function paketStandard() { return { bezahlt: [], quelle: 'Standard: nur Vorderseite bezahlt' }; }

/**
 * Fabrik für ein Paket aus einer Option der Shopify-Variante (Bestellabfrage: variant{ selectedOptions{ name value } }). Beispiel für Phase 5:
 *   paketAusOption({ option: 'Druck', pakete: { 'Nur Vorderseite': [], 'Vorder- und Rückseite': ['back'] } })
 * Fehlt die Option an der Variante, gilt `vorgabe` (Standard: nur Vorderseite); kennt `pakete` den Wert nicht, ist das Paket nicht bestimmbar (bezahlt null).
 */
export function paketAusOption({ option = 'Druck', pakete = {}, vorgabe = [] } = {}) {
  return (position) => {
    const opts = (position && position.variant && Array.isArray(position.variant.selectedOptions) ? position.variant.selectedOptions : []).filter((x) => x && String(x.name || '').trim().toLowerCase() === String(option).toLowerCase());
    if (!opts.length) return { bezahlt: Array.isArray(vorgabe) ? vorgabe.slice() : [], quelle: `Option «${option}» fehlt an der Variante: Vorgabe` };
    const wert = String(opts[0].value == null ? '' : opts[0].value).trim();
    const liste = Object.prototype.hasOwnProperty.call(pakete, wert) ? pakete[wert] : null;
    return Array.isArray(liste) ? { bezahlt: liste.slice(), quelle: `Option «${option}» = «${wert}»` } : { bezahlt: null, quelle: `Option «${option}» = «${wert}» ist kein bekanntes Paket` };
  };
}

/** Aufpreis (USD, Katalog) einer gedruckten Platzierung laut product.files[].additional_price. @returns {number|null} 0 = im Grundpreis enthalten, null = unbekannt (kein Eintrag oder unlesbarer Preis) */
export function aufpreisUsd(roh, typ) {
  const dateien = roh && Array.isArray(roh.files) ? roh.files : null;
  if (!dateien) return null;
  const treffer = dateien.filter((f) => f && f.type !== 'mockup' && (f.id === typ || f.type === typ));
  if (!treffer.length) return null;
  let max = 0;
  for (const f of treffer) {
    if (f.additional_price === undefined) return null;                                                              // Feld fehlt: unbekannt (nie «gratis»)
    if (f.additional_price === null || f.additional_price === '') continue;                                           // ausdrücklich null = im Grundpreis enthalten
    const n = Number(f.additional_price);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n > max) max = n;
  }
  return max;
}

/**
 * Die gedruckten Platzierungen gegen das bezahlte Paket halten. Aufpreise NUR aus dem Printful-Katalog (product.files[].additional_price der Variante, USD), nie aus `costs` (die gibt es erst nach dem
 * Anlegen des Entwurfs) und nie aus `_pod_karte.ap` (Browserwert, kundenseitig änderbar).
 *   aufpreis-unbezahlt   HART: eine gedruckte Platzierung kostet Aufpreis bei Printful und ist nicht im bezahlten Paket (oder das Paket ist nicht bestimmbar): kein Auftrag, der Besitzer entscheidet im Einzelfall
 *   aufpreis-unbekannt   weich: der Preis einer gedruckten Platzierung ist nicht lesbar (Katalog der Variante fehlt oder Eintrag ohne lesbaren Preis), und sie ist nicht die Vorderseite
 * @param {{roh:object|null, typen:string[], bezahlt:string[]|null, quelle?:string}} p   roh = prod.roh.product; typen = files[].type des Auftrags
 * @returns {{art:string, text:string, hart:boolean}[]}
 */
export function aufpreisPruefen({ roh, typen = [], bezahlt = [], quelle = '' } = {}) {
  const aus = [];
  const gedeckt = (typ) => {
    if (!Array.isArray(bezahlt)) return false;
    const namen = new Set(bezahlt.map(String));
    if (namen.has(typ)) return true;
    for (const f of (roh && Array.isArray(roh.files) ? roh.files : [])) if (f && (f.id === typ || f.type === typ) && (namen.has(String(f.id)) || namen.has(String(f.type)))) return true;
    return false;
  };
  const wie = Array.isArray(bezahlt) ? (bezahlt.length ? `bezahlt: ${bezahlt.join(', ')}` : 'bezahlt ist nur die Vorderseite') : 'das bezahlte Paket ist nicht bestimmbar';
  for (const typ of typen) {
    const usd = aufpreisUsd(roh, typ);
    if (usd === null) {
      if (typ !== 'default' && typ !== 'front') aus.push({ art: 'aufpreis-unbekannt', text: `Aufpreis der Platzierung «${typ}» laut Printful-Katalog nicht lesbar: ob sie bezahlt ist, lässt sich nicht prüfen`, hart: false });
      continue;
    }
    if (usd > 0 && !gedeckt(typ)) aus.push({ art: 'aufpreis-unbezahlt', text: `Gedruckt würde «${typ}» (Aufpreis ${usd.toFixed(2)} USD bei Printful), ${wie}${quelle ? ' (' + quelle + ')' : ''}. KEIN Printful-Auftrag; Nachzahlung oder nur die bezahlte Fläche drucken entscheidest du`, hart: true });
  }
  return aus;
}

// ───────────────────────────────────────────────────────────── Eine Bestellung planen
const geld = (m) => (m && String(m.currencyCode || '').toUpperCase() === 'CHF' ? num(m.amount) : null);

/**
 * Menge der Position, die noch gedruckt werden soll: `currentQuantity` (ohne entfernte und erstattete Einheiten; QUELLE shopify.dev: `quantity` zählt sie mit, GEMESSEN 05.11. in API 2026-01
 * an #1033: beide Felder vorhanden). Fehlt das Feld, gilt `quantity`. @returns {number} 0 = nichts mehr zu drucken, -1 = Menge unbrauchbar (10.11.2026, Gegenleser Linse 1: früher «→ 1 wie bisher», also ein gedrucktes Stück bei unbekannter Menge;
 * jetzt harter Befund «menge-unlesbar» bei einer Editor-Position, nie ein geratenes Stück)
 */
function mengeVon(z) {
  const cur = z && z.currentQuantity;
  if (Number.isInteger(cur) && cur >= 0) return cur;
  return Number.isInteger(z && z.quantity) && z.quantity > 0 ? z.quantity : -1;
}

/**
 * Alle Prüfungen für EINE Bestellung. Der Kleber reicht die Zugriffe ins Netz herein (und fälscht sie im Test):
 *   io.produkt(vid)        → {info, art, status, roh}   Printful-Variante/Produkt (Cache aus neuerPlatzierungsCache; roh = result der Antwort)
 *   io.druckdaten(pid)     → {art:'ok', printfiles, templates} | {art:'fehler', text}   GET /mockup-generator/printfiles + /templates (gemerkt je Produkt)
 *   io.kopf(url)           → {status, bytes}            erste Bytes der Datei (Kopfzeile)
 *   io.kontrolle(url)      → {art:'ok'|'fail'|'technisch'|'fehlt'|'trocken', text}   KI-Kontrolle ('trocken' = im Trockenlauf nicht ausgeführt: nichts an Google gesendet, kein Befund)
 * cfg: {hosts, optionVorgaben:{stitch_color}, paket:(position, kontext) => {bezahlt:string[]|null, quelle}} (paket: bezahltes Paket je Position, Vorgabe `paketStandard` = nur Vorderseite).
 * Erlös (`erloesChf`) = Positionen der Editor-Artikel (nach Rabatt, auf die gedruckte Menge gekürzt) + deren Anteil am bezahlten Versand (Order.currentShippingPriceSet, verteilt nach dem Umsatz
 * aller Positionen; ist ein Posten nicht in CHF, entfällt der Anteil, das ist die vorsichtige Richtung). Positionen mit currentQuantity 0 (entfernt/erstattet) werden übergangen: `entfernt` zählt sie.
 * `positionIds` = die Shopify-IDs der Positionen, aus denen ein Artikel entstand (für den Abgleich beim frischen Lesen: Fulfillment-Order-Status).
 * @returns {Promise<{items:object[], befunde:{art,text,hart}[], erloesChf:number|null, positionenChf:number|null, versandChf:number, pod:number, entfernt:number, positionIds:string[]}>}
 */
export async function planeBestellung(o, io, cfg = {}) {
  const hosts = cfg.hosts || ERLAUBTE_HOSTS;
  const befunde = [], items = [], positionIds = [];
  const hart = (art, text) => befunde.push({ art, text, hart: true });
  const weich = (art, text) => befunde.push({ art, text, hart: false });
  const li = o && o.lineItems;
  const zeilen = ((li && li.edges) || []).map((e) => e && e.node).filter(Boolean);
  if (li && li.pageInfo && li.pageInfo.hasNextPage) hart('positionen-viele', 'Die Bestellung hat mehr Positionen, als in einer Abfrage lesbar sind: weitere Editor-Positionen könnten fehlen');
  let erloes = 0, erloesBekannt = true, pod = 0, entfernt = 0, alleSumme = 0, alleBekannt = true;
  for (const z of zeilen) {
    const menge = mengeVon(z);
    if (menge === 0) { entfernt++; continue; }                                  // nachträglich entfernt oder erstattet: wird weder gedruckt noch geprüft
    const betrag0 = geld(z.discountedTotalSet && z.discountedTotalSet.shopMoney);
    const anteil = Number.isInteger(z.quantity) && z.quantity > 0 && Number.isInteger(z.currentQuantity) && z.currentQuantity >= 0 && z.currentQuantity < z.quantity ? z.currentQuantity / z.quantity : 1;   // teilweise entfernt: Umsatz anteilig
    const betrag = betrag0 === null ? null : betrag0 * anteil;
    if (betrag === null) alleBekannt = false; else alleSumme += betrag;
    const eig = dateienAusEigenschaften(z.customAttributes, { hosts });
    const titel = z.title || 'Position';
    const vor = (t) => `${titel}: ${t}`;
    if (!istPod(z)) {
      if (eig.dateien.length || eig.karte) hart('druckdatei-ohne-pod', vor('hat Druckdatei-Eigenschaften, das Produkt trägt aber kein POD-Tag (wunschdesign): wird nicht gedruckt'));
      continue;
    }
    pod++;
    const bf0 = befunde.length;
    if (menge < 0) { hart('menge-unlesbar', vor('Die Menge der Position ist nicht lesbar (weder currentQuantity noch quantity): es wird nichts gedruckt, kein Stück geraten')); continue; }
    for (const p of eig.probleme) befunde.push({ art: p.art, text: vor(p.text), hart: p.hart });
    const sku = skuWaehlen({ positionSku: z.sku, variantenSku: z.variant && z.variant.sku });
    for (const p of sku.probleme) befunde.push({ art: p.art, text: vor(p.text), hart: p.hart });
    if (betrag === null) erloesBekannt = false; else erloes += betrag;
    // Dienst-Standort: die App des Dienstes (Printful) druckt selbst, ein zweiter Auftrag wäre ein Doppeldruck. Hart und noch vor jeder Netzabfrage.
    const stdo = standortVon(o, z.id);
    if (stdo.art === 'dienst') { hart('dienst-standort', vor(`liegt am Fulfillment-Service-Standort «${stdo.name}»: dessen App legt den Auftrag selbst an. KEIN zweiter Auftrag von diesem Sync (sonst Doppeldruck); im Printful-Dashboard prüfen`)); continue; }
    // «unklar» (Order unsichtbar, Standort unlesbar, Liste abgeschnitten) ist HART wie «dienst»: ob die Printful-App die Position selbst druckt, ist dann unbekannt, und ein Entwurf des Syncs wäre ein Doppelentwurf neben ihrem Auftrag.
    if (stdo.art === 'gehalten') { hart('fulfillment-gehalten', vor(`Die Fulfillment-Order der Position hat den Status «${stdo.status}» (nicht OPEN oder IN_PROGRESS): Shopify hält sie, zum Beispiel bei Betrugsverdacht, falscher Adresse oder Rückfrage der Kundin. KEIN Auftrag von diesem Sync; nach der Freigabe in Shopify das Tag printful-review entfernen, dann versucht der nächste Lauf es neu`)); continue; }
    if (stdo.art === 'unklar') { hart('dienst-standort-unklar', vor(`Standort der Position nicht prüfbar (${stdo.grund}${cfg.scopeHinweis ? '; ' + cfg.scopeHinweis : ''}): ob die Printful-App sie selbst druckt, ist unklar. KEIN Auftrag von diesem Sync; Fulfillment-Orders der Bestellung im Shopify-Admin ansehen, im Printful-Dashboard prüfen`)); continue; }
    if (!sku.vid) { hart('ohne-variante', vor('SKU ohne Printful-Variante')); continue; }
    let dateien = eig.dateien;
    if (!dateien.length && !editorProdukt(z)) {              // FERTIG-Produkte ohne Editor-Upload: festes Motiv aus dem Produkt-Metafeld custom.print_file. Ein Editor-Produkt (Tag wunschdesign) druckt NIE das Muster des Besitzers: ohne Design der Kundin gilt «keine-druckdatei»
      const mf = z.product && z.product.metafield && z.product.metafield.value;
      let mfHost = null; try { mfHost = new URL(String(mf || '').trim()).hostname; } catch { /* kein Metafeld oder keine Adresse */ }
      if (mfHost && !adresseProblem(mf, [mfHost], { eigeneCloud: false })) dateien = [{ seite: 'front', platzierung: null, dateiTyp: null, url: adresseNormal(mf), quelle: 'metafeld' }];   // Metafeld gehört dem Besitzer: jeder https-Host ist erlaubt (kein Port, keine Zugangsdaten)
    }
    if (!dateien.length) {
      // Bestellung ohne Design (direkte Adresse, Shop-App, Google-Link oder ein Upload, der nie ankam): KEIN Printful-Auftrag, KEINE Mail an die Kundin und KEINE Rückerstattung durch Code;
      // das entscheidet der Besitzer (Ablauf und Textentwurf: dropship/wp6-0611/OHNE-DESIGN.md). Die weichen Hinweise «Karte ohne Datei» sind dieselbe Ursache und stehen nicht zusätzlich in der Meldung.
      for (let i = befunde.length - 1; i >= bf0; i--) if (befunde[i].art === 'karte-ohne-datei') befunde.splice(i, 1);
      const wo = eig.karte ? 'Editor-Eintrag da, Druckdatei fehlt (Upload gescheitert?)' : 'kein Editor-Eintrag (direkte Adresse, Shop-App oder Google-Link?)';
      // Der Text bleibt unter 300 Zeichen (der Kleber kürzt die Telegram-Zeilen dort): Titel gekürzt, damit der Verweis auf den Ablauf nie abgeschnitten wird.
      hart('keine-druckdatei', `Ohne Design bezahlt («${titel.slice(0, 60)}»): ${wo}. KEIN Printful-Auftrag, KEINE Nachricht an die Kundin; selbst klären, Ablauf: dropship/wp6-0611/OHNE-DESIGN.md`);
      continue;
    }
    if (eig.karte) {                                           // Editor v6 schreibt Printful-Variante (pv) und -Produkt (m) in die Karte: sie müssen zur gekauften SKU passen. Ein Widerspruch ist HART: gedruckt würde, was die SKU nennt, nicht was die Kundin gestaltet hat (falsche Farbe, falsches Produkt)
      const kpv = num(eig.karte.pv), km = num(eig.karte.m), skuModell = modellAusSku(sku.sku);
      if (kpv !== null && kpv !== sku.vid) hart('karte-widerspruch', vor(`Der Editor nennt die Printful-Variante ${kpv}, gekauft wurde ${sku.vid} (SKU): Farbe oder Grösse passen nicht zum Design, es wird kein Auftrag angelegt`));
      if (km !== null && skuModell !== null && km !== skuModell) hart('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die SKU ${sku.sku} gehört zum Modell ${skuModell}: es wird kein Auftrag angelegt`));
    }
    if (befunde.slice(bf0).some((b) => b.hart)) continue;      // schon hart gescheitert: keine Netzabfragen mehr für diese Position
    const prod = await io.produkt(sku.vid);
    const plz = await platzierungenFuerDateien({ vid: sku.vid, dateien: dateien.map((d) => d.platzierung ? { platzierung: d.platzierung, dateiTyp: d.dateiTyp, url: d.url } : { side: d.seite === 'back' ? 'back' : 'front', url: d.url }), shopTyp: (z.product && z.product.productType) || '', holeProdukt: async () => prod });
    for (const h of plz.hinweise) weich('platzierung', vor(h));
    const typen = plz.files.map((f) => f.type);                  // Datei-IDs des Auftrags («default», «back», «embroidery_chest_left»)
    const arten = typen.map((t) => platzierungsName(t, prod && prod.info));   // Platzierungs-TYPEN laut Dateiliste («default» einer Kappe → «embroidery_front»): nach ihnen richten sich Technik und Garnfarben
    const roh = prod && prod.roh && prod.roh.product ? prod.roh.product : null;
    const pid = prod && prod.info && prod.info.id;
    if (eig.karte) {                                           // Das Produkt der gekauften Variante laut Printful gegen m der Karte (die SKU-Prüfung oben ist offline; diese braucht die Variantenabfrage)
      const km = num(eig.karte.m);
      if (km !== null && pid && km !== pid) { hart('karte-widerspruch', vor(`Der Editor nennt das Printful-Produkt ${km}, die Variante ${sku.vid} gehört aber zu Produkt ${pid}: es wird kein Auftrag angelegt`)); continue; }
    }
    // Aufpreis-Platzierungen gegen das bezahlte Paket (austauschbar: cfg.paket). Hart = kein Auftrag; dann keine weiteren Netzabfragen (Katalog, Dateien, KI) für diese Position.
    const paket = (typeof cfg.paket === 'function' ? cfg.paket : paketStandard)(z, { vid: sku.vid, produktId: pid || null });
    for (const b of aufpreisPruefen({ roh, typen, bezahlt: paket && Array.isArray(paket.bezahlt) ? paket.bezahlt : null, quelle: paket && paket.quelle })) befunde.push({ ...b, text: vor(b.text) });
    if (befunde.slice(bf0).some((b) => b.hart)) continue;
    let dd = null;
    if (pid) dd = await io.druckdaten(pid);
    if (!dd || dd.art !== 'ok') weich('druckdaten', vor(`Druckdaten des Printful-Produkts nicht lesbar${dd && dd.text ? ' (' + dd.text + ')' : ''}: Konflikte und Mindest-dpi lassen sich nicht prüfen`));
    const konfl = dd && dd.art === 'ok' && dd.templates ? dd.templates.conflicting_placements : null;
    for (const b of konfliktePruefen({ typen, produkt: prod && prod.info, konflikte: dd && dd.art === 'ok' ? (Array.isArray(konfl) ? konfl : []) : null })) befunde.push({ ...b, text: vor(b.text) });
    for (const b of technikPruefen(arten)) befunde.push({ ...b, text: vor(b.text) });
    const op = optionenPruefen({ produkt: roh, typen: arten, angegeben: eig.optionen, vorgaben: cfg.optionVorgaben });
    for (const b of op.befunde) befunde.push({ ...b, text: vor(b.text) });
    const minDpi = dd && dd.art === 'ok' && dd.templates ? dd.templates.min_dpi : null;
    const qd = eig.qd;                                         // schon vom Parser auf eine ganze Zahl von 1 bis 1000 geprüft (sonst null und der weiche Befund «aufloesung-angabe»)
    const gemesseneDpi = [];
    for (let i = 0; i < plz.files.length; i++) {
      const f = plz.files[i];
      const kopf = await io.kopf(f.url);
      let masse = null;
      if (kopf && kopf.status >= 200 && kopf.status < 300) masse = dateiMasse(kopf.bytes);
      if (kopf && (kopf.status === 404 || kopf.status === 410)) { hart('datei-nicht-erreichbar', vor(`Druckdatei «${f.type}» nicht erreichbar (HTTP ${kopf.status})`)); continue; }
      if (!masse) weich('aufloesung', vor(`Pixelgrösse der Druckdatei «${f.type}» nicht lesbar${kopf && kopf.status ? ' (HTTP ' + kopf.status + ')' : ''}: Auflösung nicht prüfbar`));
      else {
        const df = dd && dd.art === 'ok' ? druckdateiFuer({ printfiles: dd.printfiles, vid: sku.vid, typ: f.type, produkt: prod && prod.info }) : null;
        if (!df) {
          // Stickerei: der Katalog führt für die Stickerei-Platzierungen vieler Produkte keine Druckdatei-Grösse (GEMESSEN 05.11. am T-Shirt 71: nur front, back, Ärmel, Etiketten). Printful digitalisiert
          // das Motiv, eine Pixelgrösse gibt es dort nicht: die Auflösung entfällt; geprüft werden Garnfarben (Optionen) und der Dateistatus nach dem Anlegen.
          if (technikFamilie(arten[i]) !== 'EMBROIDERY') weich('aufloesung', vor(`keine Druckdatei-Grösse des Katalogs für «${f.type}»: Auflösung nicht prüfbar`));
        }
        else {
          const r = aufloesungPruefen({ masse, druckdatei: df, minDpi });
          gemesseneDpi.push(r.dpi);
          if (!r.ok) weich('aufloesung', vor(`Druckdatei «${f.type}» zu klein: ${r.text}`));
        }
      }
      const k = await io.kontrolle(f.url);
      if (k && k.art !== 'ok' && k.art !== 'trocken') weich(k.art === 'fail' ? 'kontrolle-fail' : k.art === 'fehlt' ? 'kontrolle-fehlt' : 'kontrolle-technisch', vor(`Kontrolle der Druckdatei «${f.type}»: ${k.text || k.art}`));
    }
    if (qd !== null) {
      // qd ist das Minimum über alle Fotos/Platzierungen. Ein Teilvergleich wäre ein Fehlalarm: der kleinere Wert kann aus einer gerade nicht messbaren Datei stammen.
      const gemessen = gemesseneDpi.length > 0 && gemesseneDpi.length === plz.files.length ? Math.min(...gemesseneDpi) : null;
      const gemessenGanz = gemessen === null ? null : Math.floor(gemessen + 1e-9);   // qd wird vom Editor ebenfalls abgerundet
      const min = Number.isFinite(Number(minDpi)) && Number(minDpi) > 0 ? Number(minDpi) : null;
      if ((min !== null && qd < min) || (gemessenGanz !== null && qd !== gemessenGanz)) {
        const teile = [`_pod_karte.qd nennt ${qd} dpi`];
        if (min !== null && qd < min) teile.push(`unter dem Mindestwert ${min} dpi`);
        if (gemessenGanz !== null && qd !== gemessenGanz) teile.push(`an der echten Druckdatei gemessen sind mindestens ${gemessenGanz} dpi`);
        weich('qd-weicht-ab', vor(`${teile.join('; ')}. Die Warenkorb-Angabe ist kundenseitig änderbar; massgebend bleibt die Messung der Druckdatei`));
      }
    }
    const quantity = menge;                                    // > 0: 0 und unlesbar sind oben ausgeschieden
    const item = { variant_id: sku.vid, quantity, files: plz.files };
    if (op.optionen.length) item.options = op.optionen;
    const lid = String(z.id || '').split('/').pop();
    if (/^\d+$/.test(lid)) item.external_id = lid;
    items.push(item); positionIds.push(String(z.id || ''));
  }
  // Anteil am bezahlten Versand: nach Umsatz auf ALLE Positionen verteilt (Mischbestellung: CJ-/Fortura-Ware trägt ihren Teil). Unbekanntes (Währung, Summe 0) ergibt 0: vorsichtig, nie zu hoch.
  const versandGanz = geld(o && o.currentShippingPriceSet && o.currentShippingPriceSet.shopMoney);
  const versandChf = pod && erloesBekannt && alleBekannt && versandGanz !== null && versandGanz > 0 && alleSumme > 0 ? Math.round(Math.min(versandGanz, versandGanz * erloes / alleSumme) * 100) / 100 : 0;
  const positionenChf = pod && erloesBekannt ? Math.round(erloes * 100) / 100 : null;
  return { items, befunde, erloesChf: positionenChf === null ? null : Math.round((positionenChf + versandChf) * 100) / 100, positionenChf, versandChf, pod, entfernt, positionIds };
}
