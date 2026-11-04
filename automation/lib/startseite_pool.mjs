/**
 * Startseite wechselt: Pools und Fenster-Rechnung.
 *
 * WARUM (Besitzer 04.11.2026: «mache nicht immer die gleiche produkt rein, wechsle oft»): die Produktreihen der
 * Startseite (Trends, Schmuck, Wohnen, «Noch mehr entdecken») standen fest im Theme (zwölf Handles im Liquid,
 * drei plus zwei Einträge, acht in index.json). Jetzt liest das Theme je Reihe eine versteckte Pool-Sammlung und zeigt
 * davon alle `ROTATION.stunden` Stunden ein anderes Fenster (Rechnung: `fensterStart`, im Liquid identisch gerechnet).
 *
 * Diese Datei ist rein (kein Netz, kein Shopify): sie entscheidet, WELCHE Produkte in einen Pool dürfen und in welcher
 * Reihenfolge (Warengruppen abwechselnd, damit jedes Fenster gemischt ist). Das Schreiben macht automation/startseite_pools.mjs.
 *
 * WAS «GUT» HIER HEISST: kein Verkaufsurteil (die meiste Ware wurde nie gekauft), sondern: verkaufbar, Bild >= 700 px,
 * Preis im Rahmen, nicht gesperrt (Theme-Liste UND Feed-Prüfung), nicht Jahreszeit-fremd, und belegt gut:
 * Bewertung (Judge.me, mind. 3 Stimmen und 4,5 Sterne) oder eine Trend-Markierung früherer Sitzungen.
 */
import { pruefeProdukt } from './gmc_feed_item.mjs';
import { jahreszeitSperre, LIEFER_SPERRE, typSchluessel, trendScore } from './trend_auswahl.mjs';
import { bewertungAus } from './bewertung_rang.mjs';

/** Rotation: Länge eines Zeitfensters in Stunden und die möglichen Schrittweiten (Primzahlen) in Positionen; muss zu sections/luxe-edit-home.liquid passen. */
export const ROTATION = Object.freeze({ stunden: 4, schritte: [7, 5, 3], zusaetze: [11, 13, 17, 19, 23, 29, 31], primzahlen: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47] });

/** Reihen: Pool-Handle, Poolgrösse, Fenster (so viele Kandidaten liest das Theme), so viele Karten zeigt die Reihe. */
export const REIHEN = Object.freeze({
  schmuck: { handle: 'startseite-pool-schmuck', titel: 'Startseite Pool Schmuck', ziel: 18, fenster: 8, zeigt: 3, maxJeTyp: 6 },
  wohnen:  { handle: 'startseite-pool-wohnen',  titel: 'Startseite Pool Wohnen',  ziel: 14, fenster: 6,  zeigt: 2, maxJeTyp: 5 },
  trends:  { handle: 'startseite-pool-trends',  titel: 'Startseite Pool Trends',  ziel: 48, fenster: 18, zeigt: 12, maxJeTyp: 3 },
  mehr:    { handle: 'startseite-pool-mehr',    titel: 'Startseite Pool Mehr',    ziel: 32, fenster: 12, zeigt: 8,  maxJeTyp: 2 },
});

/** Dieselbe Liste wie `lx_trend_stops` in sections/luxe-edit-home.liquid (das Theme prüft jede Karte noch einmal). */
export const THEME_STOPS = Object.freeze(['google-policy-flag', 'nicht-live', '18plus', 'adult', 'gmc-adult', 'compliance-pruefen',
  'verdeckte-ueberwachung', 'medizinprodukt', 'social-pause', 'rueckhol', '-raus-', 'geprueft-gesperrt', 'marge-verlust', 'verlust-auto',
  'us-netzteil', 'nicht-versendbar']);

/** Zusätzlich für die Startseite: Lizenz-, Sperr- und Waffenmarkierungen sowie Waren, die auf einer Startseite nichts zu suchen haben. */
const ZUSATZ_SPERRE = /lizenz|gesperrt|waffe|stecker-nicht-ch|raucher/i;
const TYP_AUSSCHLUSS = /raucher|erwachsen|dessous|intim|medizin|waffe|bügeltransfer|selbst gestalten/i;
const TITEL_AUSSCHLUSS = /intim|\bsex(y|shop|ual\w*)?\b|erotik|vibrator|dildo|waffe|pistole|pfefferspray|schlagring|potenz|abnehm|schlankheit|vape|shisha|desinfektionsbox.*unterw/i;
/** Warenarten, die als «Trends» und «Noch mehr entdecken» in Frage kommen (Werkzeug, Instrumente, Büro, Basteln und Autoteile sind Nischen und gehören nicht auf die Startseite). */
const TYP_ERLAUBT = /gadget|elektronik|haushalt|wohnen|küche|beauty|haustier|sport|outdoor|mode|taschen|beleuchtung|garten|spielzeug|baby|kinder|make-up|nagel|accessoires|reise|fitness|hautpflege|geschenk/i;
const POSITIV = /(^|\|)(hype-jetzt|kunden-liebling|nachfrage-liebling|such-boost)(\||$)/;

/** Warengruppe der Startseiten-Reihe: Schmuck, Wohnen oder alles andere. */
export function gruppe(p) {
  const t = (p.tags || []).map((x) => String(x).toLowerCase());
  if (t.includes('sort-schmuck')) return 'schmuck';
  if (t.includes('wohnen') && !t.includes('aufbewahrung')) return 'wohnen';
  return 'rest';
}

/** Rohzeile (Bulk-Abfrage) in ein flaches Produkt. */
export function flach(o) {
  const im = o.featuredMedia?.preview?.image || {};
  return {
    id: o.id, handle: o.handle, title: o.title || '', productType: o.productType || '', tags: o.tags || [],
    tracks: !!o.tracksInventory, bestand: Number(o.totalInventory) || 0,
    preis: Number(o.priceRangeV2?.minVariantPrice?.amount), bild: im.url || '', bildB: im.width || 0, bildH: im.height || 0,
    bewertung: bewertungAus(o.j?.value || o.judgeme),
  };
}

/** Darf das Produkt überhaupt in einen Pool? Immer mit Grund, damit der Bericht zählen kann. */
export function gate(p, { monat, minPreis = 14.9 } = {}) {
  const t = (p.tags || []).join('|').toLowerCase();
  if (!(p.tags || []).length) return { ok: false, grund: 'keine Tags' };
  if (THEME_STOPS.some((s) => t.includes(s)) || /nicht-[^|]*bewerben/.test(t)) return { ok: false, grund: 'Sperre (Theme-Liste)' };
  if (ZUSATZ_SPERRE.test(t)) return { ok: false, grund: 'Sperre (Lizenz/Waffe/Stecker)' };
  if (LIEFER_SPERRE.test(t)) return { ok: false, grund: 'Lieferung gesperrt' };
  if (p.tracks && !(p.bestand > 0)) return { ok: false, grund: 'ausverkauft' };
  if (Math.min(p.bildB, p.bildH) < 700) return { ok: false, grund: 'Bild unter 700 px' };
  if (!(p.preis >= minPreis && p.preis <= 100)) return { ok: false, grund: `Preis ausserhalb ${minPreis.toFixed(2)} bis 100` };
  const titel = p.title || '';
  if (titel.length < 12 || titel.length > 75) return { ok: false, grund: 'Titellänge' };
  if (/[　-鿿]/.test(titel) || titel.replace(/[^A-ZÄÖÜ]/g, '').length / titel.length > 0.4) return { ok: false, grund: 'Titel ungeeignet' };
  if (TITEL_AUSSCHLUSS.test(titel) || TYP_AUSSCHLUSS.test(p.productType || '')) return { ok: false, grund: 'Warenart nicht für die Startseite' };
  const saison = jahreszeitSperre({ title: titel, tags: p.tags }, monat);
  if (saison) return { ok: false, grund: `Jahreszeit (${saison})` };
  const f = pruefeProdukt({ id: p.id, handle: p.handle, titel, tags: p.tags, preis: p.preis, bild: p.bild, link: `/products/${p.handle}` });
  if (!f.ok) return { ok: false, grund: f.grund };
  return { ok: true, grund: 'Kandidat' };
}

/** Belegt gut: genug Bewertungen (je Reihe unterschiedlich streng) oder eine Trend-Markierung. */
export function belegt(p, { minStimmen = 3, minSterne = 4.5 } = {}) {
  const b = p.bewertung;
  if (b && b.c >= minStimmen && b.a >= minSterne) return true;
  const t = (p.tags || []).join('|');
  // Letzte Stufe: Marge-Klasse A/B (Tags `mengenrabatt-a`/`-b`). Wegen der niedrigen Punkte rückt diese Ware nur nach, wenn die Pools sonst nicht voll werden.
  return POSITIV.test(t) || /(^|\|)mengenrabatt-[ab](\||$)/i.test(t);
}

/** Reihenfolge-Wert: Markierungen + Bewertung + Marge-Klasse + Preis im mittleren Bereich. */
export function punkte(p) {
  const t = (p.tags || []).map((x) => String(x).toLowerCase());
  let s = trendScore(t, 0);
  const b = p.bewertung;
  if (b && b.c >= 3 && b.a >= 4.5) s += 2 + Math.min(Math.log10(b.c + 1), 1.2);
  if (t.includes('mengenrabatt-a')) s += 1.5; else if (t.includes('mengenrabatt-b')) s += 1;
  if (p.preis >= 20 && p.preis <= 60) s += 0.5;
  return Math.round(s * 100) / 100;
}

/** Warengruppen abwechselnd (die Gruppe mit dem besten Produkt zuerst), damit jedes Fenster gemischt ist. */
export function verschraenke(liste) {
  const gruppen = new Map();
  for (const p of liste) { const k = typSchluessel(p); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(p); }
  const reihen = [...gruppen.values()];
  const aus = [];
  for (let i = 0; aus.length < liste.length; i++) for (const r of reihen) if (r[i]) aus.push(r[i]);
  return aus;
}

/**
 * Baut alle vier Pools. Reihenfolge der Vergabe: Schmuck, Wohnen, Trends, Mehr; kein Produkt steht in zwei Pools.
 * @param {Array} rohzeilen  Bulk-Zeilen (id handle title productType tags totalInventory tracksInventory priceRangeV2 featuredMedia j)
 * @param {{monat?:number, ausschluss?:Set<string>}} opt  `ausschluss`: Handles, die ein Mensch per Sichtprüfung ablehnt
 */
export function baueAllePools(rohzeilen, opt = {}) {
  const { monat, ausschluss = new Set() } = opt;
  const gruende = {};
  const zaehle = (g) => { gruende[g] = (gruende[g] || 0) + 1; };
  const kandidaten = [];
  for (const o of rohzeilen) {
    const p = flach(o);
    if (ausschluss.has(p.handle)) { zaehle('Sichtprüfung abgelehnt'); continue; }
    const g = gate(p, { monat, minPreis: gruppe(p) === 'schmuck' ? 9.9 : 14.9 });
    if (!g.ok) { zaehle(g.grund.replace(/:.*$/, '')); continue; }
    kandidaten.push({ ...p, gruppe: gruppe(p), punkte: punkte(p) });
  }
  const vergeben = new Set();
  const pools = {};
  const waehle = (name, filter, belegtOpt) => {
    const r = REIHEN[name];
    const sortiert = kandidaten.filter((p) => !vergeben.has(p.handle) && filter(p) && belegt(p, belegtOpt))
      .sort((a, b) => b.punkte - a.punkte || (a.handle < b.handle ? -1 : 1));
    const je = new Map(); const gewaehlt = [];
    for (const p of sortiert) {
      if (gewaehlt.length >= r.ziel) break;
      const k = typSchluessel(p);
      if ((je.get(k) || 0) >= r.maxJeTyp) continue;
      je.set(k, (je.get(k) || 0) + 1); gewaehlt.push(p);
    }
    const geordnet = verschraenke(gewaehlt);
    geordnet.forEach((p) => vergeben.add(p.handle));
    pools[name] = geordnet;
  };
  waehle('schmuck', (p) => p.gruppe === 'schmuck', { minStimmen: 1 });
  waehle('wohnen', (p) => p.gruppe === 'wohnen', { minStimmen: 1 });
  const alltag = (p) => p.gruppe === 'rest' && TYP_ERLAUBT.test(p.productType) && !/uhren/i.test(p.productType);
  waehle('trends', alltag);
  waehle('mehr', alltag);
  return { pools, gruende, kandidaten: kandidaten.length };
}

/**
 * Start des Fensters im Pool für das Zeitfenster `slot`. Muss mit snippets/lx-rot-start.liquid übereinstimmen:
 *   slot = ('now' | date: '%s') / (stunden * 3600);  n = Poolgrösse (höchstens 50)
 *   schritt = erste Zahl aus [7, 5, 3], durch die n NICHT teilbar ist (sonst 1)
 *   zusatz  = erste Zahl aus [11, 13, 17, 19, 23, 29, 31], für die (6 * schritt + zusatz) mit n teilerfremd ist UND (schritt + zusatz) nicht durch n teilbar (sonst bliebe das Fenster am Tageswechsel stehen) (sonst 1)
 *   start   = (slot * schritt + floor(slot / 6) * zusatz) mod n          (6 Zeitfenster = 1 Tag)
 * Der Start läuft über den GANZEN Pool (das Fenster liest am Poolende am Anfang weiter): kein Produkt bleibt unsichtbar.
 * Teilerfremder Schritt: alle n Startwerte kommen vor. Der Tageszusatz sorgt dafür, dass auch ein Besucher, der täglich zur selben
 * Uhrzeit kommt, jeden Tag ein anderes Fenster sieht (ohne ihn hätte «Mehr» mit n = 23 und Schritt 7 nur zwei Fenster im Wechsel gezeigt).
 */
export function fensterStart(slot, n) {
  const schritt = ROTATION.schritte.find((p) => n % p !== 0) || 1;
  const sechs = 6 * schritt;
  const zusatz = ROTATION.zusaetze.find((c) => (schritt + c) % n !== 0 && !ROTATION.primzahlen.some((p) => n % p === 0 && (sechs + c) % p === 0)) || 1;
  return (slot * schritt + Math.floor(slot / 6) * zusatz) % n;
}

/** Zeitfenster-Nummer aus Unix-Sekunden (ganzzahlige Division wie `divided_by` in Liquid). */
export function slotAus(sekunden, stunden = ROTATION.stunden) {
  return Math.floor(sekunden / (stunden * 3600));
}

/**
 * Pools aus der von Hand gesichteten Freigabe (`dropship/startseite-wechsel-0411/freigabe.json`).
 * Nur Freigegebene und Gepinnte (= bisher fest im Theme, live bewährt) kommen hinein; die Gates prüfen bei jedem Lauf nur noch
 * Verkaufbarkeit, Sperren und Bild neu. Kein Produkt steht in zwei Pools (Vorrang: Schmuck, Wohnen, Trends, Mehr).
 * @returns {{pools:Object<string,Array>, verworfen:Array<{reihe:string,handle:string,grund:string}>}}
 */
export function baueAusFreigabe(rohzeilen, freigabe, { monat } = {}) {
  const nachHandle = new Map(rohzeilen.map((o) => [o.handle, o]));
  const ausschluss = new Set(Object.keys(freigabe.ausschluss || {}));
  const vergeben = new Set();
  const verworfen = [];
  const pools = {};
  for (const name of ['schmuck', 'wohnen', 'trends', 'mehr']) {
    const handles = [...new Set([...(freigabe.gepinnt?.[name] || []), ...(freigabe.freigabe?.[name] || [])])];
    const kandidaten = [];
    for (const h of handles) {
      if (ausschluss.has(h)) { verworfen.push({ reihe: name, handle: h, grund: 'Sichtprüfung abgelehnt' }); continue; }
      if (vergeben.has(h)) { verworfen.push({ reihe: name, handle: h, grund: 'steht schon in einem anderen Pool' }); continue; }
      const o = nachHandle.get(h);
      if (!o) { verworfen.push({ reihe: name, handle: h, grund: 'nicht aktiv oder nicht gefunden' }); continue; }
      const p = flach(o);
      const g = gate(p, { monat, minPreis: name === 'schmuck' ? 9.9 : 14.9 });
      if (!g.ok) { verworfen.push({ reihe: name, handle: h, grund: g.grund }); continue; }
      kandidaten.push({ ...p, gruppe: gruppe(p), punkte: punkte(p) });
    }
    kandidaten.sort((a, b) => b.punkte - a.punkte || (a.handle < b.handle ? -1 : 1));
    const geordnet = verschraenke(kandidaten).slice(0, REIHEN[name].ziel);
    geordnet.forEach((p) => vergeben.add(p.handle));
    pools[name] = geordnet;
  }
  return { pools, verworfen };
}
