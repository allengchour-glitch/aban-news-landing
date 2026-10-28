/**
 * Platzierung (files[].type) einer Druckdatei im Printful-Auftrag. Rein: kein Netz, keine Dateien (das Holen der Variante wird hineingereicht).
 *
 * FEHLER, DER HIER BEHOBEN WIRD (gemessen 27.10.2026): printful_sync.placementFor() entschied über die Zeichenkette `productType` des
 * SHOPIFY-Produkts, verglich sie aber mit PRINTFUL-Typen ('MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'CANVAS', 'MAGNET'). Die Shop-Produktarten
 * heissen «Handy-Zubehör», «Tassen & Becher», «Poster», «Accessoires» … → nur wo der Shop zufällig dasselbe Wort trägt ('STICKER', 'POSTER'),
 * kam 'default' heraus. Bei allen anderen Hüllen, Tassen und Flaschen ging 'front' an Printful. BELEGT ist nur, dass der Printful-Katalog für diese Produkte
 * ausschliesslich 'default' (und 'preview') führt; eine Ablehnung der Bestellung durch Printful ist im Repo nicht belegt und wird hier nicht behauptet.
 *
 * LÖSUNG: den ECHTEN Printful-Produkttyp der Variante nehmen. GET https://api.printful.com/products/variant/<id> liefert
 * result.product = {id, type, files:[{id,type,title}]}. Reihenfolge der Entscheidung (`entscheide`):
 *   1. Das Produkt hat genau EINE druckbare Platzierung (alles ausser «preview»/Mockup) → diese (bei allen Einzel-Produkten «default»).
 *   2. Der Printful-Typ gehört zu den Einzel-Typen (MUG, PHONE-CASE, STICKER, POSTER, FRAMED-POSTER, CANVAS) → 'default'.
 *   3. Mehrere Platzierungen oder Bekleidungstyp → Rückseite 'back', sonst 'front'
 *      (Printful-Doku Orders API, Beispiel «T-Shirt» variant_id 4011: "type": "front"; der Katalog nennt dieselbe Vorderseite «default» — beides gilt).
 *      GESICHERT ist das nur, wenn die Dateiliste die Seite kennt (vorne: «default» oder «front»; hinten: «back»). Sonst wird dieselbe Antwort wie bisher gegeben,
 *      aber als NICHT GESICHERT markiert (Hosen mit right_leg/left_leg, Rucksack ohne «back», Taschen mit embroidery_apparel_front): der Auftrag braucht eine Prüfung.
 *   4. Variante/Produkt nicht ermittelbar (Netzfehler, 404) → die alte Zuordnung über die Shop-Produktart (Rückfall). Gesichert ist sie nur, wenn die Shop-Art in der
 *      alten Liste steht (ergibt 'default'); sonst ist 'front'/'back' aus Unwissen geraten → nicht gesichert.
 * Nicht gesichert heisst für den Auftrag: bleibt ENTWURF (kein confirm), Tag printful-review, Meldung an Telegram (printful_sync.mjs).
 */

/** Printful-Produkttypen mit genau einer Druckplatzierung (im Katalog belegt: MUG 19, PHONE-CASE 181/267/601/684/686/798, STICKER 656 (Magnete), POSTER 171/268, FRAMED-POSTER 304, CANVAS 3). 'default' ist dort die einzige gültige Angabe. */
export const EINZEL_TYPEN = Object.freeze(['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'FRAMED-POSTER', 'CANVAS']);
/** Printful-Typen mit Vorder- und Rückseite (Bekleidung; im Katalog belegt: T-SHIRT 71/146/380/438/456/586/821, CUT-SEW 83). Nur relevant, wenn die Dateiliste des Produkts fehlt. */
export const MEHRLAGEN_TYPEN = Object.freeze(['T-SHIRT', 'CUT-SEW']);
const VORLAGEN = new Set(['preview', 'mockup']);
/** Shop-Produktarten (Grossbuchstaben), für die die ALTE Zuordnung 'default' ergab. Nur der Rückfall nutzt sie; 'Magnet' ist eine echte Shop-Produktart (Printful 656 ist technisch ein STICKER). */
const ALTE_LISTE = Object.freeze(['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'CANVAS', 'MAGNET']);

/** Die bisherige Zuordnung von printful_sync.placementFor (Rückfall), Zeichen für Zeichen. */
export function alteZuordnung(shopTyp, seite) {
  const t = String(shopTyp || '').toUpperCase();
  if (ALTE_LISTE.includes(t)) return 'default';
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
 * Wie `platzierungFuer`, aber mit der Herkunft der Antwort.
 * @returns {{platzierung:string, gesichert:boolean, quelle:'printful-datei'|'printful-typ'|'rueckfall', grund:string|null}}
 *   gesichert=false: die Platzierung ist geraten (Rückfall ohne bekannte Shop-Art, oder die Dateiliste des Produkts kennt die gewünschte Seite nicht).
 */
export function entscheide({ produkt = null, seite = 'front', shopTyp = '' } = {}) {
  const s = seite === 'back' ? 'back' : 'front';
  if (produkt && (produkt.typ || (produkt.dateien && produkt.dateien.length))) {
    const typ = String(produkt.typ || '').toUpperCase();
    const dr = druckbare(produkt.dateien);
    if (dr.length === 1) return { platzierung: dr[0], gesichert: true, quelle: 'printful-datei', grund: null };            // 1. genau eine Platzierung
    if (EINZEL_TYPEN.includes(typ)) return { platzierung: 'default', gesichert: true, quelle: 'printful-typ', grund: null };   // 2. bekannter Einzel-Typ (Dateiliste fehlt)
    if (dr.length > 1 || MEHRLAGEN_TYPEN.includes(typ)) {                                                                  // 3. Bekleidung / mehrere Platzierungen
      const kennt = s === 'back' ? dr.includes('back') : (dr.includes('default') || dr.includes('front'));
      const gesichert = dr.length ? kennt : true;                                                                           // ohne Dateiliste entscheidet der Typ (T-SHIRT, CUT-SEW)
      return { platzierung: s, gesichert, quelle: 'printful-typ', grund: gesichert ? null : `«${s}» steht nicht in der Dateiliste des Printful-Produkts (${dr.join(', ')})` };
    }
  }
  const bekannt = ALTE_LISTE.includes(String(shopTyp || '').toUpperCase());
  const platzierung = alteZuordnung(shopTyp, s);                                                                            // 4. Rückfall
  return { platzierung, gesichert: bekannt, quelle: 'rueckfall', grund: bekannt ? null : `ohne Printful-Produkt nach der Shop-Produktart «${shopTyp || '(leer)'}» geraten («${platzierung}»)` };
}

/**
 * @param {{produkt?:{typ?:string, dateien?:string[]|null}|null, seite?:'front'|'back', shopTyp?:string}} p
 *   produkt = Ergebnis von produktInfoAusAntwort (oder null), seite = Seite der Druckdatei (Vorgabe 'front'), shopTyp = Shopify-productType (nur Rückfall)
 */
export function platzierungFuer(p = {}) {
  return entscheide(p).platzierung;
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const vorlaeufig = (status) => status === 0 || status === 408 || status === 429 || status >= 500;   // Netzfehler, Zeitüberschreitung, Drosselung, Serverfehler: nochmal versuchen, nie dauerhaft merken

/**
 * Zwischenspeicher für Variante → Produktangaben. `holeVariante(vid)` liefert {status, result, retryAfter?}: HTTP-Status (0 = Netzfehler; wirft sie, zählt das als 0) und das Feld `result` der Printful-Antwort.
 * Antwort der zurückgegebenen Funktion: {info, art, status} mit
 *   art 'ok'          Produktangaben vorhanden (gemerkt)
 *   art 'unbekannt'   404 oder Antwort ohne Produktangaben: endgültig (gemerkt) → Rückfall
 *   art 'nicht-lesbar' Netzfehler, 408, 429, 5xx (nach `versuche` Versuchen mit wachsender Pause) oder ein anderer HTTP-Fehler: NICHT gemerkt (der nächste Auftrag fragt neu) → Rückfall, aber ungesichert
 * Es wird nie geworfen (der Auftrag soll nicht an der Platzierung scheitern).
 */
export function neuerPlatzierungsCache(holeVariante, { versuche = 3, pauseMs = 2000, pause = warte } = {}) {
  const m = new Map();
  return async function produktZuVariante(vid) {
    const k = String(vid);
    if (m.has(k)) return m.get(k);
    let status = 0, info = null;
    for (let i = 0; i < versuche; i++) {
      let r = null;
      try { r = await holeVariante(vid); status = Number(r && r.status) || 0; } catch { status = 0; }
      info = status >= 200 && status < 300 ? produktInfoAusAntwort(r && r.result) : null;
      if (!vorlaeufig(status) || i === versuche - 1) break;
      await pause(Math.min(30000, Math.max(pauseMs * (i + 1), ((r && Number(r.retryAfter)) || 0) * 1000)));
    }
    const erg = status >= 200 && status < 300 ? { info, art: info ? 'ok' : 'unbekannt', status }
      : status === 404 ? { info: null, art: 'unbekannt', status }
      : { info: null, art: 'nicht-lesbar', status };
    if (erg.art !== 'nicht-lesbar') m.set(k, erg);
    return erg;
  };
}

/**
 * Der Kleber des Bestellwegs als reine Funktion (printful_sync.mjs ruft nur diese): für EINE Variante und ihre Druckdateien die Platzierungen bestimmen.
 * @param {{vid:number, dateien:{side:'front'|'back', url:string}[], shopTyp?:string, holeProdukt:(vid:number)=>Promise<{info:object|null, art:string, status:number}>}} p
 * @returns {Promise<{files:{type:string,url:string}[], needReview:boolean, hinweise:string[], art:string}>}
 *   needReview=true, sobald EINE Platzierung nicht gesichert ist (Rückfall ohne bekannte Shop-Art, Variante vorübergehend nicht lesbar, Seite nicht in der Dateiliste).
 */
export async function platzierungenFuerDateien({ vid, dateien, shopTyp = '', holeProdukt }) {
  const r = await holeProdukt(vid);
  const files = [], hinweise = [];
  const woher = r.art === 'nicht-lesbar' ? `Printful-Variante ${vid} derzeit nicht lesbar (${r.status ? 'HTTP ' + r.status : 'Netzfehler'})` : r.art === 'unbekannt' ? `Printful-Variante ${vid} ohne Produktangaben (HTTP ${r.status})` : `Printful-Variante ${vid}`;
  for (const d of dateien) {
    const e = entscheide({ produkt: r.info, seite: d.side, shopTyp });
    files.push({ type: e.platzierung, url: d.url });
    if (!e.gesichert) { const h = `Platzierung der ${d.side === 'back' ? 'Rückseite' : 'Vorderseite'} nicht gesichert: ${woher}; ${e.grund}`; if (!hinweise.includes(h)) hinweise.push(h); }
  }
  return { files, needReview: hinweise.length > 0, hinweise, art: r.art };
}
