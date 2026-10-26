/**
 * Fremdstecker erkennen am CJ-Variantenschlüssel («White-US», «Black-UK», «G42 British Standard», «Silver Gray-800W EU»).
 *
 * WARUM (26.10.2026): Die Schweizer Steckdose (Typ J) nimmt den flachen Euro-Stecker (Typ C), keinen US-, UK-, AU- oder JP-Stecker. Der Auswahl-Lauf legte
 * aus CJ-Varianten wie «White-US | Pink-US | Blue-US» Shop-Varianten an, bei denen die Steckerangabe fehlte («Weiss | Rosa | Blau») — im Shop sah das nach drei Farben
 * eines normalen Geräts aus, in Wahrheit waren es drei US-Stecker (120 V). Die Prüfung am Optionstext (stecker_bereinigen.mjs) sah das nicht. 34 aktive Produkte
 * mit 85 solchen Varianten lagen live.
 *
 * Darum prüft diese Datei den CJ-SCHLÜSSEL (nicht den Shop-Text) und ordnet Shop-Varianten über die SKU zu. Rein, ohne Netz.
 * Streng am Schlüsselende verankert: «US Size 10-Main Ring» (Ringgrösse) ist KEIN Stecker.
 */
const ENDE = '(?:\\s?(?:plug|wifi|wi-fi|version|standard|stecker))?';
const FREMD_ENDE = new RegExp(`(^|[-\\s])(US|UK|AU|JP)${ENDE}$`, 'i');
const FREMD_WORT = /(american|british|australian|japanese) standard|(^|[^0-9])(110|120|100) ?V\b/i;
const EURO_ENDE = new RegExp(`(^|[-\\s])(EU|EUR)${ENDE}$`, 'i');
const EURO_WORT = /european standard|euro plug|eu plug|(^|[^0-9])(220|230) ?V ?(eu|european)/i;

/** true, wenn der CJ-Schlüssel einen Stecker nennt, der nicht in die Schweizer Steckdose passt. */
export function fremdSteckerKey(key) {
  const k = String(key ?? '').trim();
  if (!k) return false;
  if (EURO_ENDE.test(k) || EURO_WORT.test(k)) return false;
  return FREMD_ENDE.test(k) || FREMD_WORT.test(k);
}
// Stecker-Angabe am ANFANG des Schlüssels («US-3 Million»): allein nicht sicher (könnte eine Grösse sein), mit einem Geschwister «EU-…» am Anfang schon.
const START = new RegExp(`^(US|UK|AU|JP)${ENDE}-`, 'i'), START_EURO = new RegExp(`^(EU|EUR)${ENDE}-`, 'i');
/** true, wenn der Schlüssel ausdrücklich den Euro-Stecker nennt (Typ C passt in Typ J). */
export const euroSteckerKey = key => { const k = String(key ?? '').trim(); return !!k && (EURO_ENDE.test(k) || EURO_WORT.test(k) || START_EURO.test(k)); };

/**
 * Urteil je Produkt.
 * @param {{id:string, sku:string}[]} shopVarianten  Varianten des Shop-Produkts
 * @param {Record<string,string>} cjSchluessel       { variantSku: variantKey } aus dem CJ-Datenblatt
 * @returns {{loeschen:string[], draft:boolean, fremd:number, euro:number, unbekannt:number, grund:string}}
 *   loeschen = Shop-Varianten-IDs mit Fremdstecker (nur wenn andere bleiben); draft = keine passende Variante übrig.
 */
export function steckerUrteil(shopVarianten, cjSchluessel) {
  const schluessel = Object.values(cjSchluessel || {});
  const startPlug = schluessel.some(k => START_EURO.test(String(k).trim()));      // der Stecker steht in diesem Produkt vorn im Schlüssel
  const fremdKey = k => fremdSteckerKey(k) || (startPlug && START.test(String(k).trim()) && !euroSteckerKey(k));
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
