/**
 * Platzierung (files[].type) einer Druckdatei im Printful-Auftrag. Rein: kein Netz, keine Dateien (das Holen der Variante wird hineingereicht).
 *
 * FEHLER, DER HIER BEHOBEN WIRD (gemessen 27.10.2026): printful_sync.placementFor() entschied über die Zeichenkette `productType` des
 * SHOPIFY-Produkts, verglich sie aber mit PRINTFUL-Typen ('MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'CANVAS', 'MAGNET'). Die Shop-Produktarten
 * heissen «Handy-Zubehör», «Tassen & Becher», «Poster», «Accessoires» … → nur wo der Shop zufällig dasselbe Wort trägt ('STICKER', 'POSTER'),
 * kam 'default' heraus. Handyhüllen, Tassen und Flaschen wurden mit 'front' bestellt, einer Platzierung, die es bei diesen Produkten nicht gibt
 * (Printful-Katalog: Hülle/Tasse/Poster haben nur «default» und «preview»).
 *
 * LÖSUNG: den ECHTEN Printful-Produkttyp der Variante nehmen. GET https://api.printful.com/products/variant/<id> liefert
 * result.product = {id, type, files:[{id,type,title}]}. Reihenfolge der Entscheidung:
 *   1. Das Produkt hat genau EINE druckbare Platzierung (alles ausser «preview»/Mockup) → diese (bei allen Einzel-Produkten «default»).
 *   2. Der Printful-Typ gehört zu den Einzel-Typen (MUG, PHONE-CASE, STICKER, POSTER, FRAMED-POSTER, CANVAS, MAGNET) → 'default'.
 *   3. Mehrere Platzierungen oder Bekleidungstyp → Rückseite 'back', sonst 'front'
 *      (Printful-Doku Orders API, Beispiel «T-Shirt» variant_id 4011: "type": "front"; der Katalog nennt dieselbe Vorderseite «default» — beides gilt).
 *   4. Variante/Produkt nicht ermittelbar (Netzfehler, 404) → die alte Zuordnung über die Shop-Produktart (Rückfall, Verhalten wie bisher).
 */

/** Printful-Produkttypen mit genau einer Druckplatzierung. 'default' ist dort die einzige gültige Angabe. */
export const EINZEL_TYPEN = Object.freeze(['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'FRAMED-POSTER', 'CANVAS', 'MAGNET']);
/** Printful-Typen mit Vorder- und Rückseite (Bekleidung). Nur relevant, wenn die Dateiliste des Produkts fehlt. */
export const MEHRLAGEN_TYPEN = Object.freeze(['T-SHIRT', 'CUT-SEW', 'DIRECT-TO-FABRIC']);
const VORLAGEN = new Set(['preview', 'mockup']);

/** Die bisherige Zuordnung von printful_sync.placementFor (Rückfall), Zeichen für Zeichen. */
export function alteZuordnung(shopTyp, seite) {
  const t = String(shopTyp || '').toUpperCase();
  if (['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'CANVAS', 'MAGNET'].includes(t)) return 'default';
  return seite === 'back' ? 'back' : 'front';
}

/** Aus der Antwort von GET /products/variant/<id> (das Feld `result`) die nötigen Angaben ziehen; null, wenn unbrauchbar. */
export function produktInfoAusAntwort(result) {
  const p = result && result.product;
  if (!p || typeof p !== 'object') return null;
  const typ = typeof p.type === 'string' ? p.type.trim().toUpperCase() : '';
  const dateien = Array.isArray(p.files)
    ? p.files.filter(f => f && f.type !== 'mockup').map(f => f.id ?? f.type).filter(x => typeof x === 'string' && x)   // Platzierungs-ID wie im Katalog («default», «back» …); Mockup-Dateien zählen nicht
    : null;
  if (!typ && !(dateien && dateien.length)) return null;
  return { id: Number.isInteger(p.id) ? p.id : null, typ, dateien };
}

/** Druckbare Platzierungen = alle Dateien ausser Vorschau/Mockup. */
export function druckbare(dateien) {
  return (dateien || []).filter(id => !VORLAGEN.has(String(id).toLowerCase()));
}

/**
 * @param {{produkt?:{typ?:string, dateien?:string[]|null}|null, seite?:'front'|'back', shopTyp?:string}} p
 *   produkt = Ergebnis von produktInfoAusAntwort (oder null), seite = Seite der Druckdatei (Vorgabe 'front'), shopTyp = Shopify-productType (nur Rückfall)
 */
export function platzierungFuer({ produkt = null, seite = 'front', shopTyp = '' } = {}) {
  const s = seite === 'back' ? 'back' : 'front';
  if (produkt && (produkt.typ || (produkt.dateien && produkt.dateien.length))) {
    const typ = String(produkt.typ || '').toUpperCase();
    const dr = druckbare(produkt.dateien);
    if (dr.length === 1) return dr[0];                             // 1. genau eine Platzierung
    if (EINZEL_TYPEN.includes(typ)) return 'default';              // 2. bekannter Einzel-Typ (Dateiliste fehlt)
    if (dr.length > 1 || MEHRLAGEN_TYPEN.includes(typ)) return s === 'back' ? 'back' : 'front';   // 3. Bekleidung / mehrere Platzierungen
  }
  return alteZuordnung(shopTyp, s);                                // 4. Rückfall
}

/**
 * Zwischenspeicher für Variante → Produktangaben. `holeVariante(vid)` liefert das Feld `result` der Printful-Antwort (oder null/wirft).
 * Ein Fehler wird NICHT geworfen (der Auftrag soll nicht an der Platzierung scheitern), sondern als null gemerkt → Rückfall.
 */
export function neuerPlatzierungsCache(holeVariante) {
  const m = new Map();
  return async function produktZuVariante(vid) {
    const k = String(vid);
    if (m.has(k)) return m.get(k);
    let info = null;
    try { info = produktInfoAusAntwort(await holeVariante(vid)); } catch { info = null; }
    m.set(k, info);
    return info;
  };
}
