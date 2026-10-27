/**
 * Fremdstecker erkennen am CJ-Variantenschlüssel («White-US», «Black-UK», «G42 British Standard», «Silver Gray-800W EU»).
 *
 * WARUM (26.10.2026): Die Schweizer Steckdose (Typ J) nimmt den flachen Euro-Stecker (Typ C), keinen US-, UK-, AU- oder JP-Stecker. Der Auswahl-Lauf legte
 * aus CJ-Varianten wie «White-US | Pink-US | Blue-US» Shop-Varianten an, bei denen die Steckerangabe fehlte («Weiss | Rosa | Blau») — im Shop sah das nach drei Farben
 * eines normalen Geräts aus, in Wahrheit waren es drei US-Stecker (120 V). Die Prüfung am Optionstext (stecker_bereinigen.mjs) sah das nicht. 34 aktive Produkte
 * mit 85 solchen Varianten lagen live.
 *
 * Darum prüft diese Datei den CJ-SCHLÜSSEL (nicht den Shop-Text) und ordnet Shop-Varianten über die SKU zu. Rein, ohne Netz.
 * «US Size 10-Main Ring» (Ringgrösse) ist KEIN Stecker.
 *
 * ERWEITERT 27.10.2026 (Gegenlesung «Geld und Tore»: von 27 plausiblen Fremdstecker-Schlüsseln blieben 19 unerkannt): «White-USA», «US-Plug», «US Plug-White», «Black-UK 3 Pin»,
 * «Black-UK Plug 13A», «Black-UK Standard 3-pin», «AU Plug 10A», «AU/NZ», «White-(US)», «White-British», «White-American», «White-Japan», «Black-NZ», «Black-US 15A», «Black-UK 13A»,
 * «Black-US 110-240V». Die Erkennung arbeitet jetzt mit WORTTEILEN statt mit einem Muster am Schlüsselende: ein Länderwort zählt, wenn dahinter nur noch Stecker-Beiwerk steht (Plug, Pin,
 * Standard, Version, Ampere, Spannung) oder unmittelbar ein Steckerwort folgt. Eine blosse Zahl hinter dem Land bleibt eine Grösse («Gold-US 7», «UK 6»); Ampere gelten nur als 10/13/15/16/20 A
 * (Büstenhalter-Grössen wie «34A» sind keine Stecker). BR/KR/CN/ZA/India zählen nur MIT Steckerwort («BR Plug»): allein sind es Kürzel für Braun, Indien … — UNBEKANNT, wie oft CJ sie als
 * Stecker meint. «Type A/B/G/I» (US/UK/AU-Steckertypen) gilt nur mit Steckerkontext (opt.steckerKontext: Optionsname oder Produktname nennt Plug/Stecker/Steckdose/Outlet): sonst sind
 * «Type A»/«Type B» die Ausführungen einer Bürste oder eines Hubs. EU-Stecker bleiben unberührt (sie haben Vorrang), ebenso Schuh- und Ringgrössen.
 */
const ENDE = '(?:\\s?(?:plug|wifi|wi-fi|version|standard|stecker))?';
const FREMD_ENDE = new RegExp(`(^|[-\\s])(US|UK|AU|JP)${ENDE}$`, 'i');
const FREMD_WORT = /(american|british|australian|japanese) standard|(^|[^0-9])(110|120|100) ?V\b/i;
const EURO_ENDE = new RegExp(`(^|[-\\s])(EU|EUR)${ENDE}$`, 'i');
const EURO_WORT = /european standard|euro plug|eu plug|(^|[^0-9])(220|230) ?V ?(eu|european)/i;

/** Länderwörter, die allein (am Ende oder mit Stecker-Beiwerk dahinter) einen Fremdstecker bedeuten. */
const LAENDER = new Set(['us', 'usa', 'uk', 'gb', 'au', 'nz', 'jp', 'japan', 'american', 'british', 'australian', 'japanese']);
/** Länderwörter, die nur MIT einem Steckerwort dahinter zählen (allein sind «BR», «CN» … zu mehrdeutig). */
const LAENDER_MIT_STECKERWORT = new Set(['br', 'brazil', 'brazilian', 'kr', 'korea', 'korean', 'cn', 'china', 'chinese', 'za', 'india', 'indian']);
const STECKERWORT = new Set(['plug', 'plugs', 'pin', 'pins', 'stecker', 'socket', 'outlet', 'steckdose']);
const BEIWERK = new Set(['standard', 'version', 'type', 'wifi', 'wi', 'fi']);
const TRENNER = /[\s\-_/,+()[\]]+/;
const AMPERE = /^(?:10|13|15|16|20)a$/;
const SPANNUNG = /^\d{2,3}v(?:ac)?$/;
const STECKERTYP_TEIL = /^(?:plug\s*)?type\s*[abgi](?:\s*[/,&+]\s*(?:type\s*)?[abgi])*(?:\s*plug)?$/i;

/** Nennt der Schlüssel ein Fremdland mit Stecker-Beiwerk dahinter? (Wortteile, nicht Muster am Ende.) */
function fremdLandImSchluessel(k) {
  const t = k.toLowerCase().split(TRENNER).filter(Boolean);
  if (t.some(w => w === 'eu' || w === 'eur' || w === 'european')) return false;     // «US/EU», «UK+EU adapter»: EU-Angabe → die alten Regeln entscheiden (Spannung)
  for (let i = 0; i < t.length; i++) {
    const nurMitWort = LAENDER_MIT_STECKERWORT.has(t[i]);
    if (!LAENDER.has(t[i]) && !nurMitWort) continue;
    let j = i + 1;
    while (j < t.length) {
      const w = t[j], nach = t[j + 1];
      if (BEIWERK.has(w) || AMPERE.test(w) || SPANNUNG.test(w)) { j++; continue; }
      if (/^\d{1,3}$/.test(w) && nach !== undefined && (/^(?:pins?|a|amps?)$/.test(nach) || SPANNUNG.test(nach) || /^\d{2,3}v/.test(nach))) { j++; continue; }     // «3 Pin», «110-240V»
      break;
    }
    if (j < t.length && STECKERWORT.has(t[j])) return true;               // «US Plug-White», «UK 3 Pin», «AU Plug 10A»
    if (j >= t.length && !nurMitWort) return true;     // nur Beiwerk (oder nichts) bis zum Schluss: «White-US Standard», «Black-US 15A», «White-(US)», «Black-NZ»
  }
  return false;
}

/** «Type A», «Plug Type B», «Type A/B/G» als GANZER Teil des Schlüssels (zwischen den Bindestrichen): US-/UK-/AU-Steckertypen. Nur mit Steckerkontext aufrufen. */
const steckerTypTeil = k => k.split(/\s+-\s+|-/).some(teil => STECKERTYP_TEIL.test(teil.trim()));

/**
 * true, wenn der CJ-Schlüssel einen Stecker nennt, der nicht in die Schweizer Steckdose passt.
 * @param {string} key
 * @param {{steckerKontext?:boolean}} [opt] steckerKontext: das Produkt hat eine Stecker-Option oder nennt Stecker im Namen → «Type A/B/G/I» sind Steckertypen
 */
export function fremdSteckerKey(key, opt = {}) {
  const k = String(key ?? '').trim();
  if (!k) return false;
  if (EURO_ENDE.test(k) || EURO_WORT.test(k)) return false;
  return FREMD_ENDE.test(k) || FREMD_WORT.test(k) || fremdLandImSchluessel(k) || (opt?.steckerKontext === true && steckerTypTeil(k));
}
// Stecker-Angabe am ANFANG des Schlüssels («US-3 Million»): allein nicht sicher (könnte eine Grösse sein), mit einem Geschwister «EU-…» am Anfang schon.
const START = new RegExp(`^(US|UK|AU|JP)${ENDE}-`, 'i'), START_EURO = new RegExp(`^(EU|EUR)${ENDE}-`, 'i');
/** true, wenn der Schlüssel ausdrücklich den Euro-Stecker nennt (Typ C passt in Typ J). */
export const euroSteckerKey = key => { const k = String(key ?? '').trim(); return !!k && (EURO_ENDE.test(k) || EURO_WORT.test(k) || START_EURO.test(k)); };

/** Die Zuordnung «Schlüssel → fremd» eines Produkts (mit dem Anfangs-Stecker-Fall). */
function fremdPruefer(schluessel, opt = {}) {
  const startPlug = schluessel.some(k => START_EURO.test(String(k).trim()));      // der Stecker steht in diesem Produkt vorn im Schlüssel
  return k => fremdSteckerKey(k, opt) || (startPlug && START.test(String(k).trim()) && !euroSteckerKey(k));
}

/**
 * Nennt JEDER Variantenschlüssel des Produkts seinen Stecker ausdrücklich (Euro oder fremd)? Dann ist die Zuordnung Variante → Stecker sicher lesbar, und ein Fremdstecker, der zusätzlich im
 * Beschreibungstext steht, ist schon über die Schlüssel erledigt. Fehlt die Angabe bei einer Variante, bleibt ein Text-Hinweis auf einen Fremdstecker unzuordenbar.
 * @param {string[]} schluessel  @param {{steckerKontext?:boolean}} [opt]
 */
export function alleSchluesselMitStecker(schluessel, opt = {}) {
  const ks = (schluessel || []).map(k => String(k ?? '').trim());
  if (!ks.length) return false;
  const fremd = fremdPruefer(ks, opt);
  return ks.every(k => !!k && (fremd(k) || euroSteckerKey(k)));
}

/**
 * Urteil je Produkt.
 * @param {{id:string, sku:string}[]} shopVarianten  Varianten des Shop-Produkts
 * @param {Record<string,string>} cjSchluessel       { variantSku: variantKey } aus dem CJ-Datenblatt
 * @param {{steckerKontext?:boolean}} [opt]          steckerKontext: «Type A/B/G/I» sind Steckertypen (siehe fremdSteckerKey)
 * @returns {{loeschen:string[], draft:boolean, fremd:number, euro:number, unbekannt:number, grund:string}}
 *   loeschen = Shop-Varianten-IDs mit Fremdstecker (nur wenn andere bleiben); draft = keine passende Variante übrig.
 */
export function steckerUrteil(shopVarianten, cjSchluessel, opt = {}) {
  const schluessel = Object.values(cjSchluessel || {});
  const fremdKey = fremdPruefer(schluessel, opt);
  const cjAlleFremd = schluessel.length > 0 && schluessel.every(fremdKey);
  const fremd = [], rest = [];
  let euro = 0, unbekannt = 0;
  for (const v of shopVarianten) {
    const k = cjSchluessel?.[v.sku];
    if (k === undefined) { unbekannt++; (cjAlleFremd ? fremd : rest).push(v); continue; }   // SKU nicht zuzuordnen: nur wenn CJ gar keinen Euro-Stecker führt, ist die Variante sicher fremd
    if (fremdKey(k)) fremd.push(v); else { rest.push(v); if (euroSteckerKey(k)) euro++; }
  }
  if (!fremd.length) return { loeschen: [], draft: false, fremd: 0, euro, unbekannt, grund: 'kein Fremdstecker' };
  if (!rest.length) return { loeschen: [], draft: true, fremd: fremd.length, euro, unbekannt, grund: 'alle Varianten mit Fremdstecker' };
  return { loeschen: fremd.map(v => v.id), draft: false, fremd: fremd.length, euro, unbekannt, grund: `${fremd.length} von ${shopVarianten.length} Varianten mit Fremdstecker` };
}

/**
 * Urteil aus den OPTIONSWERTEN der Shop-Varianten, wenn für ein Produkt kein CJ-Datenblatt im Zwischenspeicher liegt (Küchengeräte, Haushalt …:
 * die erste Stecker-Prüfung hat nur Elektronik gelesen). Ein Wert zählt als Fremdstecker, wenn er selbst auf US/UK/AU/JP endet (fremdSteckerKey je Wert,
 * nicht über die zusammengesetzte Variante: «US Size 7» bleibt unberührt, «Weiss-UK» und «Grösse = AU» treffen).
 * @param {{id:string, werte:string[]}[]} varianten
 */
export function steckerUrteilOptionen(varianten) {
  const keys = {};
  const vs = varianten.map(v => { keys[v.id] = v.werte.find(w => fremdSteckerKey(w)) ?? v.werte.join('-'); return { id: v.id, sku: v.id }; });
  return steckerUrteil(vs, keys);
}
