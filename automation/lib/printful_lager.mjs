/**
 * Printful-Lager-Wächter: reine Logik (ohne Netz, ohne Dateien). Verhalten des Laufs: automation/printful_lager.mjs. Tests: printful_lager_test.mjs.
 *
 * Aufgabe: Die Momentaufnahme `assets/luxe-clothing-ausblenden.json` (Katalogfenster «Selbst gestalten») bleibt frisch, und ausverkaufte
 * Printful-Varianten im Shop werden nicht mehr als kaufbar behandelt. Alle Urteile hier sind Funktionen von GEMESSENEN Eingaben (Printful GET /products/<id>,
 * POST /shipping/rates mit CH). Unbekannt ist nie ein Befund: eine nicht gelesene oder halb gelesene Antwort ändert nichts am bisherigen Zustand.
 *
 * Begriffe
 *   ausverkauft (Variante)  keine Region mit Status in_stock oder stocked_on_demand (gleiche Regel wie dropship/selbst-gestalten-fertig-0511/werkzeuge/ausblenden_bauen.py), ODER nur in Regionen lieferbar,
 *                           in die Printful nicht in die Schweiz liefert (AU, BR, JP, UK: GEMESSEN 06.11.2026, siehe REGIONEN_NICHT_CH). Ein Statuswort, das wir nicht kennen, ist NICHT ausverkauft, sondern unbekannt.
 *   Modell «aus» im Fenster technisch ungeeignet | eingestellt | nicht mehr im Katalog | überall ausverkauft | keine Schweizer Versandrate
 *   Modell «aus» im Shop    wie oben, aber OHNE «technisch ungeeignet» (das betrifft den Editor, nicht die Lieferbarkeit)
 */
import { createHash } from 'node:crypto';

export const STATUS_LIEFERBAR = new Set(['in_stock', 'stocked_on_demand']);
/** Nur GEMESSENE Wörter: in der Inventur vom 05.11.2026 (13 220 Varianten, 29 775 Einträge) kommen genau in_stock 29 064, supplier_out_of_stock 670 und stocked_on_demand 41 vor. Jedes andere Wort gilt als unbekannt (kein Befund, nur Meldung). */
export const STATUS_AUS = new Set(['supplier_out_of_stock']);
/** Regionen, in denen eine Variante nur lieferbar ist, ohne dass Printful in die Schweiz liefert. GEMESSEN 06.11.2026 mit POST /shipping/rates (CH): Variante nur in AU, BR, JP oder UK = HTTP 400 «ships to … only»; nur US, nur CN und alle EU-Regionen = Rate. */
export const REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'JP', 'UK']);
export const POD_TAGS = ['printful_personalized_product', 'wunschdesign'];
/** Printful-Produkte ohne POD-Tag, aber mit der Shop-SKU-Form 9000001_<Printful-Variante> (GEMESSEN 06.11.2026: 5 Produkte, Sticker, Tasse, Shirt). Nur wenn ALLE SKUs dieses Produkts so aussehen. */
export const POD_SKU = /^9000001_\d+$/;
export const FREMD_TAG = /^(fortura|ch-lager|cj-|cj$|cjdropshipping|zendrop|gelato|spocket)/i;   // Ware anderer Lieferanten: nie anfassen
export const FREMD_SKU = /^(fortura-|cj)/i;
export const TAG_AUS = 'printful-lager-aus';                    // trägt jedes Produkt, das DIESES Werkzeug auf ENTWURF gesetzt hat (und nur das wird wieder aktiviert)
export const MF_NAMESPACE = 'luxe';
export const MF_SPERRE = 'printful_lager_sperre';               // Variantenfeld: ursprüngliche inventoryPolicy, solange Strategie A die Variante sperrt
export const MF_KANAELE = 'printful_lager_kanaele';             // Produktfeld: Verkaufskanäle (Publication-Nummern, Komma getrennt) VOR dem ENTWURF; Shopify nimmt einen Entwurf aus allen Kanälen (GEMESSEN 06.11.2026)
export const KANAELE_KEINE = '-';
export const SCHEMA_AUSBLENDEN = 1;
export const REAKTIV_MIN_ANTEIL = 0.5;                          // ein von uns entworfenes Produkt kommt zurück, wenn mindestens dieser Anteil der Varianten wieder lieferbar ist
export const REGELN = Object.freeze({
  maxUnbekanntAnteil: 0.10,       // mehr als 10 % der Modelle nicht lesbar: Lauf bricht ab (halb geladene Antworten)
  maxNeuAusMin: 20,               // mehr als max(20, 5 %) Modelle würden NEU verschwinden: Abbruch ohne Schreiben
  maxNeuAusAnteil: 0.05,
  maxEntwuerfeMin: 5,             // mehr als max(5, 3 %) aktive POD-Produkte würden auf ENTWURF gehen: Abbruch ohne Schreiben
  maxEntwuerfeAnteil: 0.03,
  varianteSchwund: 0.5,           // liefert Printful weniger als die Hälfte der bekannten Varianten, gilt die Antwort als halb
  rateMaxTage: 14,                // spätestens nach 14 Tagen wird die Versandrate jedes Modells neu gemessen
  shopRateMaxTage: 3,             // bei Modellen mit Shopprodukt nach 3 Tagen
  scheiben: 7,                    // jeden Tag ein Siebtel der Modelle (nach Modellnummer), auch ohne erkennbare Änderung
  standErneuernTage: 7,           // Stand-Datum der Datei wird spätestens alle 7 Tage erneuert (der Wächter des Katalogfensters warnt ab 14)
});

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x)) ? Number(x) : null));
const ganz = (x) => { const n = num(x); return n !== null && Number.isInteger(n) ? n : null; };

// ───────────────────────────────────────────────── SKU und Zuordnung
/** `<Nummer>_<Printful-Variante>`; alles andere (fortura-…, CJ…, WM-TRIKOT-…, Sonderformen) liefert null: nie raten. */
export function parseSku(sku) {
  const m = /^(\d+)_(\d+)$/.exec(String(sku == null ? '' : sku).trim());
  return m ? { shopNr: m[1], variantId: parseInt(m[2], 10) } : null;
}
export const istFremdeWare = (p) => (p.tags || []).some((t) => FREMD_TAG.test(String(t))) || (p.variants || []).some((v) => FREMD_SKU.test(String(v.sku || '')));
export const hatPodSku = (p) => { const l = (p.variants || []).map((v) => String(v.sku == null ? '' : v.sku).trim()).filter(Boolean); return l.length > 0 && l.every((x) => POD_SKU.test(x)); };
export const istPodProdukt = (p) => ((p.tags || []).some((t) => POD_TAGS.includes(String(t).toLowerCase())) || hatPodSku(p)) && !istFremdeWare(p);

/** Printful wird nur gelesen: GET /products/<Nummer> und die Preisauskunft POST /shipping/rates (kein Auftrag, kein Entwurf). Alles andere ist verboten. */
export const pfErlaubt = (methode, pfad) => (methode === 'GET' && /^\/products\/\d+$/.test(String(pfad))) || (methode === 'POST' && pfad === '/shipping/rates');

// ───────────────────────────────────────────────── Printful: Modell lesen
export function variantenStatus(v) {
  if (!v || ganz(v.id) === null) return { art: 'ungueltig', regionen: [] };
  if (!Array.isArray(v.availability_status)) return { art: 'unbekannt', regionen: [] };
  const eintraege = v.availability_status.filter((s) => s && typeof s.region === 'string' && typeof s.status === 'string');
  const lieferbar = [...new Set(eintraege.filter((s) => STATUS_LIEFERBAR.has(s.status)).map((s) => s.region))].sort();
  const regionen = lieferbar.filter((r) => !REGIONEN_NICHT_CH.has(r));                    // nur Regionen, die in die Schweiz liefern, zählen
  if (regionen.length) return { art: 'ok', regionen };
  const woerter = [...new Set(eintraege.map((s) => s.status).filter((w) => !STATUS_LIEFERBAR.has(w) && !STATUS_AUS.has(w)))].sort();
  if (woerter.length) return { art: 'unbekannt', regionen: [], woerter };                  // ein neues Statuswort ist kein Beweis für «ausverkauft»
  if (lieferbar.length) return { art: 'aus', regionen: [], grund: 'nur-ausserhalb-ch' };  // lieferbar, aber nur in AU, BR, JP oder UK
  return { art: 'aus', regionen: [] };                                                     // auch die leere Liste (69 Varianten der Inventur) gilt wie dort als nicht lieferbar
}
export function signatur(varianten) {
  const s = [...varianten].sort((a, b) => a.id - b.id).map((v) => `${v.id}:${v.art}:${v.regionen.join('+')}`).join('|');
  return createHash('sha1').update(s).digest('hex').slice(0, 16);
}
/**
 * Antwort von GET /products/<id> prüfen und auswerten.
 * art: 'ok' | 'weg' (404) | 'eingestellt' | 'unbekannt' (nicht lesbar, halb, falsche Nummer, zu wenige Varianten: ändert nichts)
 */
export function modellLesen(antwort, erwarteteId, opt = {}) {
  const st = antwort && antwort.status;
  if (st === 404) return { art: 'weg', id: erwarteteId };
  const j = antwort && antwort.json;
  if (st !== 200 || !j || typeof j !== 'object') return { art: 'unbekannt', id: erwarteteId, grund: `HTTP ${st == null ? '?' : st}` };
  if (j.code !== undefined && j.code !== 200) return { art: 'unbekannt', id: erwarteteId, grund: `code ${j.code}` };
  const r = j.result;
  if (!r || typeof r !== 'object' || !r.product || typeof r.product !== 'object') return { art: 'unbekannt', id: erwarteteId, grund: 'ohne product' };
  if (ganz(r.product.id) !== erwarteteId) return { art: 'unbekannt', id: erwarteteId, grund: 'falsche Modellnummer' };
  if (!Array.isArray(r.variants) || !r.variants.length) return { art: 'unbekannt', id: erwarteteId, grund: 'ohne Varianten' };
  if (r.product.is_discontinued === true) return { art: 'eingestellt', id: erwarteteId };
  const varianten = r.variants.map((v) => ({ id: ganz(v && v.id), ...variantenStatus(v) })).filter((v) => v.art !== 'ungueltig');
  if (!varianten.length) return { art: 'unbekannt', id: erwarteteId, grund: 'keine gültige Variante' };
  const fremdeWoerter = [...new Set(varianten.flatMap((v) => v.woerter || []))].sort();
  if (varianten.every((v) => v.art === 'unbekannt')) return { art: 'unbekannt', id: erwarteteId, grund: fremdeWoerter.length ? `nur unbekannte Statuswörter (${fremdeWoerter.join(', ')})` : 'ohne Bestandsstatus', fremdeWoerter };
  const basis = num(opt.bekannteVarianten);
  if (basis && varianten.length < basis * REGELN.varianteSchwund) return { art: 'unbekannt', id: erwarteteId, grund: `nur ${varianten.length} von ${basis} bekannten Varianten` };
  const nUnbekannt = varianten.filter((v) => v.art === 'unbekannt').length;
  const ausIds = varianten.filter((v) => v.art === 'aus').map((v) => v.id).sort((a, b) => a - b);
  return {
    art: 'ok', id: erwarteteId, titel: String(r.product.title || ''), varianten, nVarianten: varianten.length, nUnbekannt,
    ausIds, alleAus: nUnbekannt === 0 && ausIds.length === varianten.length, signatur: signatur(varianten),
    fremdeWoerter, nurAusserhalb: varianten.filter((v) => v.grund === 'nur-ausserhalb-ch').length,
  };
}
/** Bis zu `max` Testvarianten für die Versandrate: nur lieferbare, verschiedene Regionsmengen zuerst, viele Regionen zuerst. */
export function testKandidaten(lesung, max = 3) {
  if (!lesung || lesung.art !== 'ok') return [];
  const gruppen = new Map();
  for (const v of lesung.varianten) {
    if (v.art !== 'ok') continue;
    const k = v.regionen.join('+');
    if (!gruppen.has(k)) gruppen.set(k, { n: v.regionen.length, k, id: v.id });
    else if (v.id > gruppen.get(k).id) gruppen.get(k).id = v.id;
  }
  const g = [...gruppen.values()].sort((a, b) => b.n - a.n || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return g.slice(0, max).map((x) => x.id);
}

// ───────────────────────────────────────────────── Printful: Schweizer Versandrate
const KEINE_RATE = /ships? to .{1,120}? only|outside of this region|not (?:available|possible|supported) (?:for|in|to) .{0,40}(?:switzerland|your (?:country|region))|cannot be shipped|does not ship|doesn'?t ship/i;
/** Antwort von POST /shipping/rates auswerten. art: rate | keine-rate | ausverkauft | variante-ungueltig | gedrosselt | fatal | unbekannt */
export function rateAuswerten(antwort) {
  const st = antwort && antwort.status, j = (antwort && antwort.json) || {};
  if (st === 401 || st === 403) return { art: 'fatal', grund: `HTTP ${st}` };
  if (st === 429) return { art: 'gedrosselt' };
  if (st === 200 && Array.isArray(j.result)) {
    const raten = j.result.map((x) => ({ usd: num(x && x.rate), min: num(x && x.minDeliveryDays), max: num(x && x.maxDeliveryDays) })).filter((x) => x.usd !== null && x.usd >= 0);
    if (!raten.length) return { art: 'unbekannt', grund: 'HTTP 200 ohne verwertbare Rate' };   // eindeutig ist nur der gemessene 400-Wortlaut «ships to … only»
    raten.sort((a, b) => a.usd - b.usd);
    return { art: 'rate', rateUsd: raten[0].usd, tageMin: raten[0].min, tageMax: raten[0].max };
  }
  if (st === 400) {
    const text = typeof j.result === 'string' ? j.result : (j.error && j.error.message) || '';
    if (/out of stock/i.test(text)) return { art: 'ausverkauft', grund: text.slice(0, 120) };
    if (/invalid variant/i.test(text)) return { art: 'variante-ungueltig', grund: text.slice(0, 120) };
    if (KEINE_RATE.test(text)) return { art: 'keine-rate', grund: text.slice(0, 160) };
    return { art: 'unbekannt', grund: text.slice(0, 160) || 'HTTP 400' };
  }
  return { art: 'unbekannt', grund: `HTTP ${st == null ? '?' : st}` };
}
/** Urteil über mehrere Testvarianten: ch true (mindestens eine Rate), false (nur eindeutige «keine Rate»), sonst null (unbekannt, bisheriger Stand bleibt). */
export function rateUrteil(ergebnisse) {
  const e = ergebnisse || [];
  const r = e.find((x) => x.art === 'rate');
  if (r) return { ch: true, rateUsd: r.rateUsd, tageMin: r.tageMin, tageMax: r.tageMax };
  const keine = e.filter((x) => x.art === 'keine-rate');
  const offen = e.filter((x) => !['keine-rate', 'ausverkauft', 'variante-ungueltig'].includes(x.art));
  if (keine.length && !offen.length) return { ch: false, grund: keine[0].grund || 'keine Rate' };
  return { ch: null, grund: e.length ? 'nicht eindeutig' : 'nicht gemessen' };
}

// ───────────────────────────────────────────────── Wann wird die Versandrate neu gemessen? («nur bei Änderung»)
const TAG_MS = 86400000;
/**
 * @param lesung    modellLesen-Ergebnis (art 'ok')
 * @param kontext   { zustand: Eintrag|undefined (Zustandsdatei), basis: Eintrag (Inventur 05.11.), vorherAus: Set<variantenId> (bisher ausgeblendete Varianten dieses Modells),
 *                    shopModell: boolean, jetzt: Date, voll: boolean }
 */
export function brauchtRate(lesung, kontext) {
  const k = kontext || {};
  if (!lesung || lesung.art !== 'ok') return { mess: false, grund: 'nicht-lesbar' };
  if (lesung.alleAus) return { mess: false, grund: 'ueberall-ausverkauft' };
  if (!testKandidaten(lesung, 1).length) return { mess: false, grund: 'ohne-testvariante' };
  if (k.voll) return { mess: true, grund: 'voll' };
  const z = k.zustand || null, b = k.basis || {};
  const chVorher = z && z.ch !== undefined && z.ch !== null ? z.ch : (b.ch === undefined ? null : b.ch);
  if (chVorher !== true) return { mess: true, grund: chVorher === false ? 'ch-nein' : 'ch-unbekannt' };
  if (z && z.sig) { if (z.sig !== lesung.signatur) return { mess: true, grund: 'signatur-geaendert' }; }
  else {
    if (b.nVarianten != null && b.nVarianten !== lesung.nVarianten) return { mess: true, grund: 'varianten-geaendert' };
    const jetztAus = lesung.ausIds.join(','), vorher = [...(k.vorherAus || [])].sort((x, y) => x - y).join(',');
    if (jetztAus !== vorher) return { mess: true, grund: 'ausverkauft-geaendert' };
  }
  const jetzt = k.jetzt instanceof Date ? k.jetzt : new Date();
  const alter = z && z.gemessen ? (jetzt.getTime() - Date.parse(z.gemessen)) / TAG_MS : null;
  if (k.shopModell && (alter === null || alter > REGELN.shopRateMaxTage)) return { mess: true, grund: 'shop-modell' };
  if (alter !== null && alter > REGELN.rateMaxTage) return { mess: true, grund: 'veraltet' };
  const tagIndex = Math.floor(jetzt.getTime() / TAG_MS);
  if (lesung.id % REGELN.scheiben === tagIndex % REGELN.scheiben) return { mess: true, grund: 'scheibe' };
  return { mess: false, grund: 'unveraendert' };
}

// ───────────────────────────────────────────────── Urteil je Modell
/**
 * @param lesung  modellLesen-Ergebnis
 * @param rate    rateUrteil-Ergebnis oder null (nicht gemessen)
 * @param vorher  { ch: bool|null (letzter bekannter Stand), aus: boolean (bisher im Fenster ausgeblendet), ausVarianten: number[] (bisher ausgeblendete Varianten) }
 * @param basis   { klasse } der Inventur
 * @returns { fensterAus, shopAus, shopUnsicher, gruende[], shopGruende[], ausVarianten[], ch, unbekannt }
 *   Fenster: ein früherer Stand «keine Schweizer Rate» darf das Modell weiter ausblenden (vorsichtige Richtung).
 *   Shop: nur eine in diesem Lauf FRISCH gemessene Antwort darf ein Produkt auf ENTWURF bringen (shopAus); ein alter Stand macht die Varianten «unsicher» (keine Aktion, auch keine Rückkehr).
 */
export function modellUrteil(lesung, rate, vorher, basis) {
  const v = vorher || {}, b = basis || {};
  const technisch = b.klasse === 'UNGEEIGNET';
  const chVorher = v.ch === undefined ? null : v.ch;
  const gruende = [];
  const mit = (g) => { if (!gruende.includes(g)) gruende.push(g); };
  if (technisch) mit('technisch');
  if (!lesung || lesung.art === 'unbekannt') {
    // nicht lesbar: bisheriger Stand bleibt, nichts wird erraten
    if (v.aus && !technisch) mit('bisher-aus');
    return { fensterAus: technisch || !!v.aus, shopAus: false, shopUnsicher: false, gruende, shopGruende: [], ausVarianten: technisch || v.aus ? [] : [...(v.ausVarianten || [])], ch: chVorher, unbekannt: true };
  }
  if (lesung.art === 'weg' || lesung.art === 'eingestellt') {
    const g = lesung.art === 'weg' ? 'nicht-im-katalog' : 'eingestellt';
    mit(g);
    return { fensterAus: true, shopAus: true, shopUnsicher: false, gruende, shopGruende: [g], ausVarianten: [], ch: chVorher, unbekannt: false };
  }
  const frisch = !!rate && rate.ch !== null && rate.ch !== undefined;
  const ch = frisch ? rate.ch : chVorher;
  const shopGruende = [];
  if (lesung.alleAus) { mit('ueberall-ausverkauft'); shopGruende.push('ueberall-ausverkauft'); }
  if (ch === false) mit('keine-ch-rate');
  if (frisch && rate.ch === false) shopGruende.push('keine-ch-rate');
  const shopAus = shopGruende.length > 0;
  const shopUnsicher = !shopAus && ch === false;      // nur ein alter Stand sagt «keine Rate»
  const fensterAus = technisch || lesung.alleAus || ch === false;
  return { fensterAus, shopAus, shopUnsicher, gruende, shopGruende, ausVarianten: fensterAus ? [] : [...lesung.ausIds], ch, unbekannt: false };
}
/** Printful-Variante -> { modell, art } aus allen gelesenen Modellen (nur art 'ok'; nicht lesbare Modelle haben keine Einträge). */
export function katalogIndex(lesungen) {
  const idx = new Map();
  for (const l of lesungen.values()) if (l && l.art === 'ok') for (const v of l.varianten) idx.set(v.id, { modell: l.id, art: v.art });
  return idx;
}

// ───────────────────────────────────────────────── Ausblenden-Datei
export const ausblendenQuelle = (stand, n) => `Printful-API (GEMESSEN ${stand}, automatisch vom Printful-Lager-Wächter): Schweizer Versandrate je Modell und availability_status je Variante, ${n} Modelle gelesen. modelle = nicht in die Schweiz lieferbar, technisch ungeeignet, eingestellt oder überall ausverkauft; varianten = überall ausverkaufte Varianten sonst lieferbarer Modelle.`;
export function ausblendenBauen(urteile, stand, nGelesen) {
  const modelle = [], varianten = {};
  for (const [id, u] of [...urteile.entries()].sort((a, b) => a[0] - b[0])) {
    if (u.fensterAus) modelle.push(id);
    else if (u.ausVarianten.length) varianten[String(id)] = [...u.ausVarianten].sort((a, b) => a - b);
  }
  return { schemaVersion: SCHEMA_AUSBLENDEN, stand, quelle: ausblendenQuelle(stand, nGelesen), modelle, varianten };
}
/** Gleiches Zeilenformat wie die Datei im Paket dropship/katalog-fenster-0611/ziel. */
export function ausblendenText(o) {
  const ids = Object.keys(o.varianten).sort((a, b) => Number(a) - Number(b));
  const zeilen = ids.map((k) => `"${k}":${JSON.stringify(o.varianten[k])}`).join(',\n');
  return `{"schemaVersion":${o.schemaVersion},"stand":${JSON.stringify(o.stand)},"quelle":${JSON.stringify(o.quelle)},"modelle":${JSON.stringify(o.modelle)},"varianten":{\n${zeilen}${zeilen ? '\n' : ''}}}\n`;
}
/** Text -> geprüftes Objekt oder null (Schema 1, Listen aus ganzen Zahlen). */
export function ausblendenPruefen(text) {
  let o; try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o !== 'object' || o.schemaVersion !== SCHEMA_AUSBLENDEN) return null;
  if (!Array.isArray(o.modelle) || !o.modelle.every((x) => Number.isInteger(x))) return null;
  if (!o.varianten || typeof o.varianten !== 'object' || Array.isArray(o.varianten)) return null;
  for (const [k, rows] of Object.entries(o.varianten)) if (!/^\d+$/.test(k) || !Array.isArray(rows) || !rows.every((x) => Number.isInteger(x))) return null;
  return o;
}
/** Inhaltsgleich, ohne Stand und Quelle. */
export function ausblendenGleich(a, b) {
  if (!a || !b) return false;
  const norm = (o) => JSON.stringify({ m: [...o.modelle].sort((x, y) => x - y), v: Object.keys(o.varianten).sort((x, y) => Number(x) - Number(y)).map((k) => [k, [...o.varianten[k]].sort((x, y) => x - y)]) });
  return norm(a) === norm(b);
}
export const tageSeit = (stand, jetzt) => { const t = Date.parse(`${stand}T00:00:00Z`); return Number.isFinite(t) ? Math.floor((jetzt.getTime() - t) / TAG_MS) : null; };
/** Bisheriger Stand aus der Live-Datei (schemaVersion/modelle/varianten) ODER aus der Inventur-Datei (modelle_ausblenden/varianten_ausblenden). */
export function vorzustandLesen(o) {
  if (!o || typeof o !== 'object') return { modelle: new Set(), varianten: new Map() };
  const modelle = o.modelle_ausblenden || o.modelle || [];
  const vr = o.varianten_ausblenden || o.varianten || {};
  const varianten = new Map(Object.entries(vr).map(([k, rows]) => [Number(k), new Set((rows || []).map(Number))]));
  return { modelle: new Set((modelle || []).map(Number)), varianten };
}

// ───────────────────────────────────────────────── Shop: Plan
/** Modelle, zu denen es Shopprodukte mit Printful-SKU gibt (für die Entscheidung, welche Versandraten häufiger gemessen werden). */
export function shopModelle(produkte, katalog) {
  const out = new Set();
  for (const p of produkte) {
    if (!istPodProdukt(p)) continue;
    for (const v of p.variants || []) { const s = parseSku(v.sku); const k = s && katalog.get(s.variantId); if (k) out.add(k.modell); }
  }
  return out;
}
/** Verkaufskanäle als Feldwert: «123,456» oder «-» (keine). */
export const kanaeleText = (ids) => { const l = [...new Set((ids || []).map(String).filter((x) => /^\d+$/.test(x)))].sort(); return l.length ? l.join(',') : KANAELE_KEINE; };
export const kanaeleLesen = (text) => (text == null || text === '' || text === KANAELE_KEINE ? [] : String(text).split(',').filter((x) => /^\d+$/.test(x)));
/** Kanäle, die vor dem ENTWURF bestanden und jetzt fehlen. */
export const kanaeleFehlend = (vorher, jetzt) => { const j = new Set((jetzt || []).map(String)); return (vorher || []).map(String).filter((x) => !j.has(x)); };
/** Kann Strategie A die Variante sperren? Nur ohnehin verfolgte Bestände an einem Shop-Standort (nie am Dienst-Standort «Printful»). */
export function sperreMoeglich(v) {
  const it = v.inventoryItem || {}, lv = (it.inventoryLevels && it.inventoryLevels.nodes) || [];
  if (!it.tracked) return { ok: false, grund: 'ungetrackt' };
  if (!lv.length) return { ok: false, grund: 'ohne-standort' };
  if (lv.some((l) => l.location && l.location.isFulfillmentService)) return { ok: false, grund: 'dienststandort' };
  const menge = lv.reduce((s, l) => s + (num(((l.quantities || []).find((q) => q.name === 'available') || {}).quantity) || 0), 0);
  if (menge > 0) return { ok: false, grund: 'menge-positiv' };
  return { ok: true };
}
/**
 * @param produkte  [{ id, handle, status, tags, variantenVollstaendig, variants:[{ id, sku, inventoryPolicy, sperre (Wert des Markierungsfeldes oder null), inventoryItem }] }]
 * @param katalog   Map Printful-Variante -> { modell, art: 'ok'|'aus'|'unbekannt' }, modelle: Map Modell -> urteil
 * @param strategie 'B' | 'A' | 'auto'
 */
export function shopPlan(produkte, katalog, modelle, strategie = 'B') {
  const aktionen = [], befunde = [], katalogLuecken = [];
  const zaehl = { pod: 0, aktiv: 0, fremdOderOhnePod: 0, ohneZuordnung: 0, unvollstaendig: 0, varianten: { ok: 0, aus: 0, unbekannt: 0, sku: 0, 'variante-nicht-im-katalog': 0, 'modell-unbekannt': 0, 'rate-unsicher': 0 } };
  const alsA = strategie === 'A' || strategie === 'auto';
  for (const p of produkte) {
    if (!istPodProdukt(p)) { zaehl.fremdOderOhnePod++; continue; }
    zaehl.pod++;
    if (p.status === 'ACTIVE') zaehl.aktiv++;
    if (p.variantenVollstaendig === false) { zaehl.unvollstaendig++; befunde.push({ art: 'zu-viele-varianten', handle: p.handle, text: 'Variantenliste unvollständig gelesen, keine Entscheidung' }); continue; }
    const zeilen = [];
    for (const v of p.variants) {
      const s = parseSku(v.sku);
      if (!s || FREMD_SKU.test(String(v.sku || ''))) { zeilen.push({ v, art: 'unbekannt', grund: 'sku' }); continue; }
      const k = katalog.get(s.variantId);
      if (!k) { zeilen.push({ v, art: 'unbekannt', grund: 'variante-nicht-im-katalog', variantId: s.variantId }); if (p.status === 'ACTIVE') katalogLuecken.push({ handle: p.handle, sku: v.sku }); continue; }
      const m = modelle.get(k.modell);
      if (!m || m.unbekannt || m.shopUnsicher) { zeilen.push({ v, art: 'unbekannt', grund: m && m.shopUnsicher ? 'rate-unsicher' : 'modell-unbekannt', variantId: s.variantId, modell: k.modell }); continue; }
      const aus = m.shopAus || k.art === 'aus';
      zeilen.push({ v, art: k.art === 'unbekannt' && !m.shopAus ? 'unbekannt' : (aus ? 'aus' : 'ok'), variantId: s.variantId, modell: k.modell, grund: m.shopAus ? m.shopGruende.join('+') : (aus ? 'variante-ausverkauft' : null) });
    }
    if (!zeilen.length || zeilen.every((z) => z.grund === 'sku')) { zaehl.ohneZuordnung++; continue; }
    for (const z of zeilen) { if (z.art === 'unbekannt') { zaehl.varianten.unbekannt++; if (zaehl.varianten[z.grund] !== undefined) zaehl.varianten[z.grund]++; } else zaehl.varianten[z.art]++; }
    const nAus = zeilen.filter((z) => z.art === 'aus').length, nOk = zeilen.filter((z) => z.art === 'ok').length, nUnb = zeilen.filter((z) => z.art === 'unbekannt').length;
    const hatTag = (p.tags || []).includes(TAG_AUS);

    // Ein AKTIVES Produkt mit unserem Tag ist ein halb fertiger oder von Hand beendeter ENTWURF (Veröffentlichen schlug fehl, Statuswechsel schlug nach dem Tag fehl, jemand hat aktiviert):
    // zu Ende führen (gemerkte Kanäle nachziehen, Tag und Merkfeld entfernen). So bleibt kein Tag stehen, das später eine fremde Entwurfs-Entscheidung rückgängig machen würde.
    if (p.status === 'ACTIVE' && hatTag) {
      aktionen.push({ typ: 'nachziehen', produktId: p.id, handle: p.handle, vorher: 'ACTIVE', kanaele: p.kanaele == null ? null : kanaeleLesen(p.kanaele) });
      continue;
    }
    if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0 && nUnb === 0) {
      const gr = [...new Set(zeilen.map((z) => z.grund))].join(', ');
      const jeModell = {};
      for (const z of zeilen) (jeModell[z.modell] ||= []).push(z.variantId);
      aktionen.push({ typ: 'entwurf', produktId: p.id, handle: p.handle, vorher: 'ACTIVE', grund: gr, modelle: Object.keys(jeModell).map(Number), variantenJeModell: jeModell, varianten: zeilen.length });
      continue;
    }
    if (p.status === 'DRAFT' && hatTag) {
      if (nOk > 0 && nOk / zeilen.length >= REAKTIV_MIN_ANTEIL) aktionen.push({ typ: 'reaktivieren', produktId: p.id, handle: p.handle, vorher: 'DRAFT', ok: nOk, varianten: zeilen.length, kanaele: p.kanaele == null ? null : kanaeleLesen(p.kanaele) });
      continue;                                   // Entwurf ohne unser Tag oder noch nicht genug lieferbar: unberührt
    }
    if (p.status !== 'ACTIVE') continue;
    // aktiv: Teilausfall und Rückkehr einzelner Varianten
    for (const z of zeilen) {
      const gesperrt = z.v.sperre != null && z.v.sperre !== '';
      if (z.art === 'aus') {
        if (gesperrt) continue;
        const sm = alsA ? sperreMoeglich(z.v) : { ok: false, grund: 'strategie-b' };
        if (sm.ok && z.v.inventoryPolicy === 'CONTINUE') aktionen.push({ typ: 'sperre', produktId: p.id, handle: p.handle, varianteId: z.v.id, sku: z.v.sku, vorherPolicy: z.v.inventoryPolicy, grund: z.grund });
        else befunde.push({ art: 'variante-ausverkauft', handle: p.handle, sku: z.v.sku, text: `Variante ${z.v.sku} ist bei Printful ausverkauft (${z.grund}), im Shop weiter kaufbar (${sm.grund})` });
      } else if (z.art === 'ok' && gesperrt) {
        aktionen.push({ typ: 'freigabe', produktId: p.id, handle: p.handle, varianteId: z.v.id, sku: z.v.sku, policyZurueck: z.v.sperre, vorherPolicy: z.v.inventoryPolicy });
      }
    }
  }
  return { aktionen, befunde, zaehl, katalogLuecken };
}

// ───────────────────────────────────────────────── Befunde, die Telegram erreichen (einmal je Befund)
/** Befundarten, die nichts ändern, aber jemanden angehen: ein ausverkaufter Artikel bleibt im Shop kaufbar (Strategie B), ein Artikel fehlt im Katalog, ein Statuswort ist neu. */
export const MELDE_ARTEN = new Set(['variante-ausverkauft', 'variante-nicht-im-katalog', 'status-wort-unbekannt']);
export const befundSchluessel = (b) => `${b.art}:${b.sku || b.wort || b.handle || ''}`;
/**
 * @param befunde  [{ art, sku?, wort?, handle?, text }]
 * @param gemeldet bereits gemeldete Schlüssel { schluessel: ISO } (aus der Zustandsdatei)
 * @returns { neu: Befund[] (noch nie gemeldet), aktuell: Set<Schlüssel> aller heutigen meldepflichtigen Befunde }
 */
export function befundeNeu(befunde, gemeldet) {
  const g = gemeldet && typeof gemeldet === 'object' ? gemeldet : {};
  const aktuell = new Set(), neu = [];
  for (const b of befunde || []) {
    if (!b || !MELDE_ARTEN.has(b.art)) continue;
    const k = befundSchluessel(b);
    if (aktuell.has(k)) continue;
    aktuell.add(k);
    if (!Object.prototype.hasOwnProperty.call(g, k)) neu.push(b);
  }
  return { neu, aktuell };
}
/** Neuer Stand der gemeldeten Befunde: nur was heute noch gilt (verschwindet ein Befund und kehrt zurück, wird er wieder gemeldet); `jetztIso` für neu gemeldete. */
export function gemeldetFortschreiben(gemeldet, aktuell, neuGemeldet, jetztIso) {
  const out = {};
  for (const k of aktuell) { if (gemeldet && Object.prototype.hasOwnProperty.call(gemeldet, k)) out[k] = gemeldet[k]; }
  for (const b of neuGemeldet || []) out[befundSchluessel(b)] = jetztIso;
  return out;
}

// ───────────────────────────────────────────────── Bremsen
/**
 * Prüft, ob der Lauf schreiben darf. Rückgabe: Liste von Verstössen (leer = darf).
 * @param z  { modelleGesamt, unbekannt, neuAus, entwuerfe, aktivePod }
 */
export function bremsen(z, grenzen = {}) {
  const r = { ...REGELN, ...grenzen }, v = [];
  const gesamt = Math.max(1, z.modelleGesamt || 0);
  if (z.unbekannt / gesamt > r.maxUnbekanntAnteil) v.push({ art: 'zu-viele-unbekannt', text: `${z.unbekannt} von ${z.modelleGesamt} Modellen nicht lesbar (Grenze ${Math.round(r.maxUnbekanntAnteil * 100)} %)` });
  const maxNeu = r.maxNeuAus !== undefined ? r.maxNeuAus : Math.max(r.maxNeuAusMin, Math.round(gesamt * r.maxNeuAusAnteil));
  if (z.neuAus > maxNeu) v.push({ art: 'zu-viele-neu-aus', text: `${z.neuAus} Modelle würden neu verschwinden (Grenze ${maxNeu})` });
  const maxEnt = r.maxEntwuerfe !== undefined ? r.maxEntwuerfe : Math.max(r.maxEntwuerfeMin, Math.round((z.aktivePod || 0) * r.maxEntwuerfeAnteil));
  if (z.entwuerfe > maxEnt) v.push({ art: 'zu-viele-entwuerfe', text: `${z.entwuerfe} aktive Produkte würden auf ENTWURF gehen (Grenze ${maxEnt})` });
  return v;
}

// ───────────────────────────────────────────────── Ledger
/** Eine Zeile `printful-lager <ISO> <typ> <ziel> vorher=<JSON>`; rückwärts lesbar. */
export const ledgerZeile = (iso, typ, ziel, vorher) => `printful-lager ${iso} ${typ} ${ziel} vorher=${JSON.stringify(vorher)}`;
export function ledgerLesen(text) {
  const out = [];
  for (const z of String(text || '').split('\n')) {
    const m = /^printful-lager (\S+) (\S+) (\S+) vorher=(.*)$/.exec(z);
    if (!m) continue;
    try { out.push({ iso: m[1], typ: m[2], ziel: m[3], vorher: JSON.parse(m[4]) }); } catch { /* beschädigte Zeile: überspringen */ }
  }
  return out;
}
