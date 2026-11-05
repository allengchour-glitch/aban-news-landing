/**
 * «Modell-Fabrik» (Selbst gestalten, 05.11.2026): aus EINER Printful-Katalogdatei den PLAN für ein Shopify-Produkt «Selbst gestalten» (DRAFT) erzeugen. Rein: kein Netz, keine
 * Schreibzugriffe, keine Uhr (die Zeit kommt hinein), kein Zufall. Gleiche Eingabe = derselbe Plan (und derselbe Hash).
 *
 * EINGABE (alles schon gelesen, nichts wird hier geholt):
 *   katalog      Inhalt von katalog/<id>.json (katalog_holen.mjs)
 *   versand      Eintrag aus versand_alle.json {variante, http, raten:[{id,rateUsd,tageMin,tageMax}], fehler}: Printful-Versandrate CH 8001, Standard, 1 Stück
 *   schaetzung   optional {printfulVariantId: Zwischensumme USD}: Printful-Kostenschätzung nach CH (POST /orders/estimate-costs, keine Aufträge)
 *   bilder       optional {url: {w, h}}: gemessene Bildgrössen (bilder_messen.mjs); ohne Messung bleibt das Tor «bilder» ungeprüft
 *   uebersetzung optional {u, fehler}: Übersetzungsdatei mit belegten Sätzen (beschreibung.mjs)
 *   opt          { schonHandles:Set, schonSkus:Set, schonTitel:Set, verwendeteModelle:Set, stufen:[1|2], uebersee:boolean, jetzt:string }
 *
 * AUSGABE: Plan {handle, titel, optionen, varianten (SKU, Preis, Bild), medien, beschreibungHtml, tags, metafelder, tore, anlegbar, hash …}. «anlegbar» ist nur wahr, wenn jedes
 * Blocker-Tor «bestanden» ist (ein ungeprüftes Tor zählt nicht).
 *
 * WICHTIGE SETZUNGEN (Besitzer-Entscheid oder Messung nötig, alle im README «Offene Annahmen»):
 *   - SKU «<9100000 + Printful-Nummer>_<Printful-Variantennummer>»: der Teil nach dem Unterstrich bestimmt printful_sync (variantFromSku); der Präfix ist neu und kollidiert mit keinem heutigen.
 *   - Versandrate: EINE Rate je Modell gilt für alle Varianten, und sie muss für eine Variante gemessen sein, die im Produkt steckt (Tor `rate_variante`, Messwerkzeug versand_messen.mjs). Ungemessen: ob grosse Grössen mehr kosten (Hinweis `versand_je_groesse`).
 *   - Lieferzeit: NICHT die Versandtage der Printful-Rate (sie «enthalten nicht die Zeit, ein Produkt herzustellen», QUELLE printful.com/shipping, gelesen 05.11.2026; Fertigung 2 bis 5 Werktage). Es gilt die Angabe der heutigen
 *     «Selbst gestalten»-Produkte (7 bis 14 Werktage, GEMESSEN 05.11.2026 an 26 Produkten: Metafeld `custom.lieferzeit` = {"ch":"7–14","tier":"pod"}); reichen Versandtage plus Fertigung darüber hinaus, steht die berechnete, längere Spanne.
 *   - Ohne Kostenschätzung rechnet der Kostenboden mit Katalogpreis × 1.26 (grösste gemessene Abweichung der Rechnung nach oben, preisformel.mjs); der Richtwert bleibt auf dem Katalogpreis.
 *   - Zusatzdrucke (Rückseite, Ärmel, Etiketten) sind NICHT bestellbar, solange kein Aufpreis-Mechanismus im Shop besteht: `inklusive:false` in der Editor-Karte. Ist die einzige zeichenbare Fläche
 *     kostenpflichtig (Kappe: Stickerei vorne gross +2.95 USD), ist ihr Aufpreis im Preis jeder Variante enthalten; dazu bei Stickerei die Digitalisierung (6.50 USD, gemessen an einer Schätzung).
 */
import { createHash } from 'node:crypto';
import { modellkarteBauen } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { endpreis, aufpreisChf, abrechnungsEk, REGEL } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';
import { kontextAusKatalog } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';
import { entscheide } from '../lib/printful_platzierung.mjs';
import { karteFuerEditor, BEKANNTE_HINWEIS_CODES } from '../../pod/v6/werkzeug/karte_fuer_editor.mjs';
import { titelDe, titelVoll, titelSchluessel, handleAus, farbeDe, farbRang, einheitenFamilie, GLOSSAR_VERSION } from './glossar.mjs';
import { beschreibungBauen, pruefeUebersetzung, technikDeVon, PLATZHALTER_SHOP } from './beschreibung.mjs';
import { pruefeTore } from './tore.mjs';
import { kategorieFuer, googleMetafelder } from './kategorien.mjs';

export const PLAN_SCHEMA = 'pod-modell-plan/1';
export const SKU_BASIS = 9100000;
export const FABRIK_REGEL = Object.freeze({
  maxVarianten: 100,          // Shopify: höchstens 100 Varianten je Produkt in dieser Fabrik (Auftrag), Plattform erlaubt mehr
  bilderMin: 3,               // mindestens so viele verschiedene lesbare Bilder
  bildMinPx: 600,             // «lesbar»: die kürzere Seite hat mindestens so viele Pixel (SETZUNG, nicht gemessen)
  ekAufschlagOhneSchaetzung: 1.26,   // GEMESSEN 05.11.2026: Rechnung für CH bis +26 % über dem Katalogpreis (preisformel.mjs)
  digitalisierungUsd: 6.5,    // GEMESSEN an einer Schätzung für die Dad-Cap (messung_0511.json): einmalig je Motiv
  kartenMaxBytes: 10240,      // Metafeld-Karte (kompakt, ohne Variantenliste) höchstens 10 KB (Vorgabe des Auftrags)
  editorKartenMaxBytes: 24576, // Karte im Editor-Baustein der Beschreibung samt Variantenabbildung höchstens 24 KB (Setzung; GEMESSEN an 577 Modellen: Median 3,2 KB, 90 % unter 6,7 KB, Poster 17 KB)
  medienMax: 20,
  medienOhneFarbe: 6,         // ohne Farben (Poster, Hüllen): Produktbild plus höchstens 5 Grössen-Bilder
  stufen: [1],                // 1 = FLACH und FLACH_MIT_HINWEIS; 2 = PANEL
  lieferStandard: { min: 7, max: 14 },   // Angabe der heutigen «Selbst gestalten»-Produkte (GEMESSEN 05.11.2026, 26 Produkte, Metafeld custom.lieferzeit)
  fertigungWerktage: { min: 2, max: 5 }, // QUELLE printful.com/shipping (gelesen 05.11.2026): «It takes 2–5 business days to create a product and fulfill an order»
});
const STUFE_VON_KLASSE = Object.freeze({ FLACH: 1, FLACH_MIT_HINWEIS: 1, PANEL: 2 });
const zahl = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const sortiere = (a, f) => [...a].sort(f);

/** Kanonische JSON-Schreibweise (Schlüssel sortiert) für Prüfsummen. */
export function kanon(o) {
  if (Array.isArray(o)) return `[${o.map(kanon).join(',')}]`;
  if (o && typeof o === 'object') return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${kanon(o[k])}`).join(',')}}`;
  return JSON.stringify(o === undefined ? null : o);
}
export const hashVon = (o) => createHash('sha256').update(kanon(o)).digest('hex');

// ─────────────────────────────────────────────────────────────── Gruppen, Tags, Produktart
const TASCHE_RE = /\b(tote|bag|backpack|pouch|sack)\b/i;
export function gruppeVon(karte) {
  const t = String(karte.typ || '').toUpperCase(), titel = String(karte.titelEn || '');
  if (TASCHE_RE.test(titel)) return { tag: 'sg-taschen', produktart: 'Taschen' };
  if (t === 'MUG' || t === 'DRINKWARE') return { tag: 'sg-trinken', produktart: 'Tassen & Becher' };
  if (t === 'PHONE-CASE') return { tag: 'sg-accessoires', produktart: 'Handy-Zubehör' };
  if (t === 'POSTER' || t === 'FRAMED-POSTER' || t === 'CANVAS') return { tag: 'sg-wohnen', produktart: 'Poster' };
  if (t === 'STICKER' || t === 'POSTCARD' || t === 'EMBROIDERY-PATCH') return { tag: 'sg-accessoires', produktart: 'Accessoires' };
  if (t === 'DECOR' || t === 'CANDLE' || t === 'PUZZLE' || /\b(pillow|blanket|towel|rug|mat)\b/i.test(titel)) return { tag: 'sg-wohnen', produktart: 'Wohnen' };
  return { tag: 'sg-bekleidung', produktart: 'Bekleidung' };
}

// ─────────────────────────────────────────────────────────────── Varianten
const gruppeIndex = (v) => v.druckdateiGruppe;
function herkunftVon(rohV) {
  const s = rohV && rohV.status && typeof rohV.status === 'object' ? rohV.status : {};
  if (s.EU === 'in_stock') return { herkunft: 'EU', regionen: ['EU'] };
  if (s.EU === 'stocked_on_demand') return { herkunft: 'EU-auf-Anfrage', regionen: ['EU'] };
  const andere = Object.entries(s).filter(([r, st]) => !/^EU/.test(r) && st === 'in_stock').map(([r]) => r).sort();
  return andere.length ? { herkunft: 'ausserhalb', regionen: andere } : { herkunft: null, regionen: [] };
}
/** Fläche in cm² aus einer Grössenangabe mit zwei Massen («29,7 × 42 cm», «A1 (59,4 × 84,1 cm)»); null, wenn keine zwei Zahlen mit «×» dastehen (Kleidergrössen, Millilitern). */
export function groesseFlaeche(text) {
  const t = String(text ?? '');
  const klammer = /\(([^)]*×[^)]*)\)/.exec(t);
  const m = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/.exec(klammer ? klammer[1] : t);
  if (!m) return null;
  const n = (x) => Number(x.replace(',', '.'));
  return Math.round(n(m[1]) * n(m[2]) * 100) / 100;
}
/** Option «Grösse» für Kunden: «One size» deutsch, Masse einheitlich «21 × 30 cm» mit Dezimalkomma (die cm-Modelle von Printful liefern «21×30 cm» und «59.4», die umgerechneten Zoll-Modelle «27,9 × 35,6 cm»). */
const groesseText = (g) => {
  if (g === null || g === undefined) return g;
  const t = String(g).trim();
  if (/^one size$/i.test(t)) return 'Einheitsgrösse';
  return t.replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/g, (_, a, b) => `${a.replace('.', ',')} × ${b.replace('.', ',')}`);
};

/** Wählt die Varianten, die das Produkt bekommt (alles deterministisch, jede Auslassung mit Grund). */
export function waehleVarianten(karte, katalog, { max = FABRIK_REGEL.maxVarianten, uebersee = true } = {}) {
  const roh = new Map((katalog.varianten ?? []).map((v) => [v.id, v]));
  const alle = karte.varianten.map((v) => ({ ...v, _roh: roh.get(v.printfulVariantId), ...herkunftVon(roh.get(v.printfulVariantId)) }));
  const ausgelassen = []; // [{grund, anzahl, beispiel}]
  const lasseAus = (liste, grund) => { if (liste.length) ausgelassen.push({ grund, anzahl: liste.length, beispiel: liste.slice(0, 3).map((v) => `${v.farbe ?? ''} ${v.groesse ?? ''}`.trim()) }); };

  const nichtBestellbar = alle.filter((v) => v.herkunft === null);
  lasseAus(nichtBestellbar, 'in keiner Region auf Lager (Printful)');
  let kand = alle.filter((v) => v.herkunft !== null);
  const eu = kand.filter((v) => v.herkunft !== 'ausserhalb');
  if (eu.length) { lasseAus(kand.filter((v) => v.herkunft === 'ausserhalb'), 'nur ausserhalb der EU lieferbar, das Modell hat EU-Varianten'); kand = eu; }
  else if (!uebersee) { lasseAus(kand, 'nur ausserhalb der EU lieferbar (uebersee=false)'); kand = []; }

  // Farben übersetzen; unbekannte Wörter → Farbe weglassen (nie raten)
  const farbenAus = [];
  const mitFarbe = [];
  for (const v of kand) {
    // «Custom» (Strickwaren) heisst: die Farbe legt der Kunde mit seinem Motiv selbst fest, es gibt keine Farbwahl (Gegenleser 2, K3: sonst fielen 11 Modelle komplett aus)
    if (v.farbe == null || String(v.farbe).trim() === '' || /^custom$/i.test(String(v.farbe).trim())) { mitFarbe.push({ ...v, farbe: null, farbeDe: null }); continue; }
    const f = farbeDe(v.farbe);
    if (f.de === null) { if (!farbenAus.some((x) => x.name === v.farbe)) farbenAus.push({ name: v.farbe, grund: `Farbname nicht übersetzt (Wörter: ${f.unbekannt.join(', ')})` }); continue; }
    mitFarbe.push({ ...v, farbeDe: f.de });
  }
  // Farben ordnen: gängigste zuerst; gleiche deutsche Namen (verschiedene Printful-Farben) nur einmal
  const jeFarbe = new Map();
  for (const v of mitFarbe) { const k = v.farbe ?? ''; if (!jeFarbe.has(k)) jeFarbe.set(k, []); jeFarbe.get(k).push(v); }
  let farben = sortiere([...jeFarbe.entries()].map(([name, vs]) => ({ name, vs, de: vs[0].farbeDe, rang: farbRang(name), n: vs.length })), (a, b) => (a.rang - b.rang) || (b.n - a.n) || a.name.localeCompare(b.name));
  const gesehen = new Set();
  farben = farben.filter((f) => { if (f.de === null) return true; if (gesehen.has(f.de)) { farbenAus.push({ name: f.name, grund: `gleicher deutscher Name «${f.de}» wie eine gängigere Farbe` }); return false; } gesehen.add(f.de); return true; });
  // Obergrenze: Farben in Rangfolge, nie eine Farbe teilweise
  let gewaehlt = []; let summe = 0; let abgeschnitten = [];
  for (const f of farben) { if (summe + f.vs.length <= max) { gewaehlt.push(f); summe += f.vs.length; } else { abgeschnitten = farben.slice(farben.indexOf(f)); break; } }
  for (const f of abgeschnitten) farbenAus.push({ name: f.name, grund: `Obergrenze ${max} Varianten (gängigere Farben zuerst)` });
  const sizeOrder = new Map(karte.optionen.groesse.map((g, i) => [String(g.wert), i]));
  const gewaehltVs = gewaehlt.flatMap((f) => f.vs);
  // Haben ALLE gewählten Grössen eine Fläche («29,7 × 42 cm», «A1 (59,4 × 84,1 cm)»), geht die Reihenfolge nach Fläche aufsteigend (Poster 1 stand ungeordnet: 29,7 × 42, 21 × 29,7, A1 … 12,7 × 17,8); sonst nach dem Katalog (S, M, L …)
  const flaeche = new Map(); for (const v of gewaehltVs) flaeche.set(String(v.groesse), groesseFlaeche(v.groesseAnzeige ?? v.groesse));
  const nachFlaeche = flaeche.size > 1 && [...flaeche.values()].every((x) => x !== null);
  const rang = (v) => (nachFlaeche ? flaeche.get(String(v.groesse)) : (sizeOrder.get(String(v.groesse)) ?? 999));
  const varianten = gewaehltVs.sort((a, b) => (gewaehlt.findIndex((f) => f.name === a.farbe) - gewaehlt.findIndex((f) => f.name === b.farbe)) || (rang(a) - rang(b)));
  return { varianten, farbenGewaehlt: gewaehlt.map((f) => ({ name: f.name, de: f.de, anzahl: f.vs.length, rang: f.rang })), farbenAusgelassen: farbenAus, ausgelassen, gesamtVorAuswahl: alle.length, bestellbar: kand.length };
}

/** Optionen: Name und Werte in Reihenfolge der Varianten. Eine Achse mit nur einem Wert entfällt, ausser es bliebe gar keine. */
export function optionenBauen(karte, varianten) {
  const phone = String(karte.typ).toUpperCase() === 'PHONE-CASE';
  const farben = [...new Set(varianten.map((v) => v.farbeDe).filter((x) => x != null))];
  const groessen = [...new Set(varianten.map((v) => groesseText(v.groesseAnzeige ?? v.groesse)).filter((x) => x != null && x !== ''))];
  const achsen = [];
  if (farben.length >= 2) achsen.push({ art: 'farbe', name: phone ? 'Oberfläche' : 'Farbe', werte: farben });
  if (groessen.length >= 2) achsen.push({ art: 'groesse', name: phone ? 'Modell' : 'Grösse', werte: groessen });
  if (!achsen.length) {
    if (groessen.length === 1) achsen.push({ art: 'groesse', name: phone ? 'Modell' : 'Grösse', werte: groessen });
    else if (farben.length === 1) achsen.push({ art: 'farbe', name: phone ? 'Oberfläche' : 'Farbe', werte: farben });
    else achsen.push({ art: 'standard', name: 'Ausführung', werte: ['Standard'] });
  }
  const wert = (v, a) => (a.art === 'farbe' ? v.farbeDe : a.art === 'groesse' ? groesseText(v.groesseAnzeige ?? v.groesse) : 'Standard');
  return { achsen, wert };
}

// ─────────────────────────────────────────────────────────────── Platzierungen und Editor-Karte
/** Die Fläche, die jede Bestellung bedruckt: die erste kostenlose; gibt es keine, die günstigste (ihr Aufpreis steckt dann im Preis). */
export function basisPlatzierung(karte) {
  const fl = karte.platzierungen.filter((p) => p.art === 'flaeche');
  if (!fl.length) return null;
  const frei = fl.filter((p) => !(p.aufpreisUsd > 0));
  if (frei.length) return { p: frei[0], pflichtAufpreisUsd: 0 };
  const billig = sortiere(fl, (a, b) => a.aufpreisUsd - b.aufpreisUsd)[0];
  return { p: billig, pflichtAufpreisUsd: billig.aufpreisUsd };
}

export function kompaktKarte(karte, { varianten, basisId, pflichtAufpreisUsd = 0 }) {
  const genutzteGruppen = [...new Set(varianten.map(gruppeIndex).filter((x) => x != null))].sort((a, b) => a - b);
  const gruppenDef = genutzteGruppen.map((gi) => ({ gi, pf: karte.druckdateiGruppen[gi]?.platzierungen ?? {}, varianten: varianten.filter((v) => gruppeIndex(v) === gi).map((v) => v.printfulVariantId) }));
  const kompaktP = karte.platzierungen.map((p) => {
    const frei = !(p.aufpreisUsd > 0) || p.id === basisId;
    const g = p.printfile.groesseCm;
    const genutzt = [...new Set(gruppenDef.map((d) => d.pf[p.id]).filter((x) => x !== undefined))];
    const geos = genutzt.length > 1 ? genutzt.map((pfId) => {
      const gs = p.geometrien.filter((x) => x.printfileId === pfId).sort((a, b) => b.anzahlVarianten - a.anzahlVarianten)[0];
      const pf = karte.druckdateien[pfId];
      return gs && pf ? { pf: pfId, px: [pf.breitePx, pf.hoehePx], dpi: pf.dpi, cm: pf.groesseCm ? [pf.groesseCm.breite, pf.groesseCm.hoehe] : null, flaeche: [gs.vorlage.flaecheLinks, gs.vorlage.flaecheOben, gs.vorlage.flaecheBreite, gs.vorlage.flaecheHoehe], vorlage: [gs.vorlage.vorlageBreite, gs.vorlage.vorlageHoehe], bild: gs.vorlage.bildUrl ?? null } : null;
    }).filter(Boolean) : undefined;
    return {
      id: p.id, dateiTyp: p.dateiTyp, titel: p.titelDe ?? `Fläche ${p.id}`, art: p.art, technik: p.technik, inklusive: frei, aufpreisChf: frei ? 0 : aufpreisChf(p.aufpreisUsd),
      druck: { px: [p.printfile.breitePx, p.printfile.hoehePx], dpi: p.printfile.dpi, cm: g ? [g.breite, g.hoehe] : null, fill: p.printfile.fillMode, drehen: p.printfile.kannDrehen },
      flaeche: { vorlage: [p.vorlage.vorlageBreite, p.vorlage.vorlageHoehe], links: p.vorlage.flaecheLinks, oben: p.vorlage.flaecheOben, breite: p.vorlage.flaecheBreite, hoehe: p.vorlage.flaecheHoehe, ausrichtung: p.vorlage.ausrichtung },
      vorlage: p.vorlage.bildUrl ?? null, hintergrund: p.vorlage.hintergrundUrl ?? null,
      ...(p.kollidiertMitImEditor?.length ? { kollidiertMit: p.kollidiertMitImEditor } : {}), ...(geos ? { geometrien: geos } : {}),
    };
  });
  const hinweise = (karte.hinweise ?? []).filter((h) => h.art === 'einschraenkung').map((h) => ({ code: h.code, quelle: h.quelle }));
  return {
    schema: 'lspod-karte/1', modell: karte.printfulProductId, klasse: karte.technischeKlasse, technik: karte.standardTechnik, basis: basisId,
    ...(pflichtAufpreisUsd > 0 ? { basisMitAufpreis: true } : {}), platzierungen: kompaktP,
    ...(gruppenDef.length > 1 ? { gruppen: gruppenDef.map((d) => ({ pf: d.pf, varianten: d.varianten })) } : {}), hinweise,
  };
}

/** Hinweis-Codes, zu denen der Editor v6 eigene Kundentexte hat: kommen aus der Quelle des Editors (pod/v6/werkzeug/karte_fuer_editor.mjs), keine eigene Kopie mehr. */
export const EDITOR_HINWEIS_CODES = BEKANNTE_HINWEIS_CODES;
/**
 * Die Karte, die der Editor v6 (pod/v6/lspod-designer-v6.js) aus <script id="lspod-karte"> liest. Sie wird von `karteFuerEditor` des Editor-Strom gebaut (EINE Quelle statt einer Kopie, die auseinanderlaufen
 * könnte; Gegenleser 2, K11) und nur angepasst: statt des englischen Katalogtitels mit Fremdmarke steht der deutsche Titel als `titelDe`; `varianten` und `farben` nur für die GEWÄHLTEN Varianten.
 * `shop.varianten` (Shopify-Variante → Printful-Variante) kommt erst beim Anlegen dazu (anlegen.mjs), weil die Nummern vorher nicht bekannt sind; im Plan steht dort der Platzhalter. Ohne `shopPlatzhalter` fehlt der Schlüssel `shop`
 * (so liegt die Karte zum Prüfen vor). PANEL-Modelle (Rundum-Druck) erlaubt die Fabrik erst in Stufe 2, das prüft das Tor `klasse`; hier wird nur gebaut.
 */
export function editorKarte(katalog, { varianten, titelDe = null, shopPlatzhalter = null }) {
  const q = karteFuerEditor(katalog, { panelErlauben: true });
  const k = {};
  for (const [key, wert] of Object.entries(q)) {
    if (key === 'titelEn') { if (titelDe) k.titelDe = titelDe; continue; }
    if (key === 'varianten' || key === 'farben' || key === 'shop') continue;
    k[key] = wert;
  }
  const farben = {};
  for (const v of varianten) if (/^#[0-9a-f]{6}$/i.test(v.farbeHex ?? '')) (farben[v.farbeHex.toLowerCase()] ??= []).push(v.printfulVariantId);
  if (Object.keys(farben).length > 1) k.farben = farben;
  if ((q.druckdateiGruppen ?? []).length > 1) k.varianten = varianten.map((v) => ({ printfulVariantId: v.printfulVariantId, druckdateiGruppe: v.druckdateiGruppe }));
  if (shopPlatzhalter) k.shop = { varianten: shopPlatzhalter };
  return k;
}

// ─────────────────────────────────────────────────────────────── Medien
/**
 * Galerie: Produktbild (falls lesbar) + je Farbe EIN Bild (ohne Farben: je Bild-Adresse, höchstens `medienOhneFarbe` Bilder). Gibt auch die Zuordnung Variante → Bild zurück.
 * Mit `bilder` (gemessene Grössen): zu kleine Bilder kommen nicht in die Galerie; eine Adresse OHNE Messung wird nicht aufgenommen und als `ungemessen` gemeldet (dann bleibt das Tor ungeprüft).
 * `kandidaten` = alle Adressen, die für die Galerie in Frage kommen (für bilder_messen.mjs).
 */
export function medienBauen({ karte, katalog, varianten, titel, bilder, regel = FABRIK_REGEL }) {
  const lesbar = (url) => { if (!bilder) return true; const m = bilder[url]; if (!m || !(m.w > 0)) return null; return Math.min(m.w, m.h) >= regel.bildMinPx; };
  const roh = new Map((katalog.varianten ?? []).map((v) => [v.id, v]));
  const hatFarben = new Set(varianten.map((v) => v.farbeDe).filter((x) => x != null)).size >= 2;   // eine Farbe allein trennt keine Bilder
  const gruppen = new Map(); // Schlüssel → {url, label, varianten[]}
  for (const v of varianten) {
    const url = roh.get(v.printfulVariantId)?.image ?? null;
    if (!url) continue;
    const key = hatFarben ? `f:${v.farbeDe}` : `u:${url}`;
    if (!gruppen.has(key)) gruppen.set(key, { url, label: hatFarben ? v.farbeDe : null, varianten: [] });
    gruppen.get(key).varianten.push(v.printfulVariantId);
  }
  const liste = [{ url: karte.bildUrl, label: 'Produktbild', varianten: null }, ...gruppen.values()].filter((g) => g.url);
  const grenze = hatFarben ? regel.medienMax : regel.medienOhneFarbe;
  const medien = [], jeVariante = new Map(), unlesbar = [], ungemessen = [];
  const kandidaten = [...new Set(liste.map((g) => g.url))].slice(0, hatFarben ? regel.medienMax + 5 : regel.medienOhneFarbe + 6);
  for (const g of liste) {
    const schon = medien.find((x) => x.url === g.url);
    if (schon) { for (const id of g.varianten ?? []) jeVariante.set(id, schon.alt); continue; }     // gleiche Adresse: nur die Varianten an das vorhandene Medium hängen
    if (medien.length >= grenze) { if (!kandidaten.includes(g.url)) continue; break; }
    const l = lesbar(g.url);
    if (l === null) { ungemessen.push(g.url); continue; }
    if (l === false) { unlesbar.push(g.url); continue; }
    const nr = medien.length + 1;
    const alt = `${titel} ${g.label ?? `Ansicht ${nr}`}`.replace(/[–—−‒―]/g, ' ').replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
    medien.push({ url: g.url, alt, rolle: g.varianten ? 'variante' : 'haupt', label: g.label });
    for (const id of g.varianten ?? []) jeVariante.set(id, alt);
  }
  return { medien, jeVariante, unlesbar, ungemessen: bilder ? ungemessen : null, bilderGemessen: Boolean(bilder), kandidaten };
}

// ─────────────────────────────────────────────────────────────── Preis
function rateAus(versand) {
  if (!versand || versand.http !== 200 || !Array.isArray(versand.raten) || !versand.raten.length) return null;
  const r = versand.raten.find((x) => x.id === 'STANDARD') ?? versand.raten[0];
  const usd = zahl(r.rateUsd);
  if (usd === null || usd <= 0) return null;
  return { id: r.id, rateUsd: usd, tageMin: zahl(r.tageMin), tageMax: zahl(r.tageMax), variante: versand.variante ?? null };
}

/**
 * Die Lieferzeit, die die Seite nennt: Versandtage der Rate PLUS Fertigung (Printful: 2 bis 5 Werktage). Liegt das innerhalb der Shop-Angabe «7 bis 14 Werktage», gilt diese (wie bei den heutigen Produkten);
 * sonst die berechnete Spanne (untere Grenze nie unter 7). Die Tage von Printful sind Werktage (Hypothese, nicht belegt).
 * @returns {{min:number,max:number,quelle:'shop-standard'|'berechnet',versandTage:[number,number],fertigung:[number,number]}|null}
 */
export function lieferzeitAus(lieferung, regel = FABRIK_REGEL) {
  const a = zahl(lieferung?.tageMin), b = zahl(lieferung?.tageMax);
  if (a === null || b === null || a < 1 || b < a) return null;
  const st = regel.lieferStandard, f = regel.fertigungWerktage;
  const roh = { min: a + f.min, max: b + f.max };
  const basis = { versandTage: [a, b], fertigung: [f.min, f.max] };
  if (roh.max <= st.max) return { min: st.min, max: st.max, quelle: 'shop-standard', ...basis };
  return { min: Math.max(st.min, roh.min), max: roh.max, quelle: 'berechnet', ...basis };
}

// ─────────────────────────────────────────────────────────────── Titel-Unterscheidung
const gewichtAusText = (t) => { const m = String(t ?? '').match(/weight[^\n•]*?(\d+(?:[.,]\d+)?)\s*g\/m²/i); return m ? Math.round(Number(m[1].replace(',', '.'))) : null; };

/** Meta-Beschreibung höchstens 160 Zeichen, nie mitten im Wort abgeschnitten. */
export function seoText(titelKomplett) {
  const voll = `${titelKomplett}: eigenes Motiv hochladen, Vorschau ansehen und dein Einzelstück bestellen. Druck auf Bestellung.`;
  if (voll.length <= 160) return voll;
  const kurz = `${titelKomplett}: eigenes Motiv hochladen, Vorschau ansehen, Einzelstück bestellen.`;
  if (kurz.length <= 160) return kurz;
  const k = kurz.slice(0, 160); return k.slice(0, Math.max(k.lastIndexOf(' '), 1)).replace(/[,:;]$/, '');
}

// ─────────────────────────────────────────────────────────────── Plan
export function planeModell(eingabe, opt = {}) {
  const regel = { ...FABRIK_REGEL, ...(opt.regel ?? {}) };
  const { katalog, versand = null, schaetzung = null, bilder = null, uebersetzung = null } = eingabe;
  const schonHandles = opt.schonHandles ?? new Set(), schonSkus = opt.schonSkus ?? new Set(), schonTitel = opt.schonTitel ?? new Set(), verwendet = opt.verwendeteModelle ?? new Set(), verwendeteFamilien = opt.verwendeteFamilien ?? new Set();
  const stufen = opt.stufen ?? regel.stufen;
  let karte;
  try { karte = modellkarteBauen(katalog); } catch (e) {
    return { schema: PLAN_SCHEMA, printfulProductId: katalog?.id ?? null, fehler: `Katalogdatei unbrauchbar: ${e.message}`, anlegbar: false, tore: [{ code: 'katalog', name: 'Katalogdatei lesbar', art: 'blocker', ergebnis: 'durchgefallen', grund: e.message }] };
  }
  const id = karte.printfulProductId;
  const klasse = karte.technischeKlasse;
  const stufe = STUFE_VON_KLASSE[klasse] ?? null;
  const rate = rateAus(versand);
  const lieferung = rate ? { versandart: rate.id, rateUsd: rate.rateUsd, tageMin: rate.tageMin, tageMax: rate.tageMax, ratenVariante: rate.variante } : null;
  const lieferzeit = lieferung ? lieferzeitAus(lieferung, regel) : null;       // was die Seite nennt (NICHT die Versandtage allein, siehe lieferzeitAus)
  const familie = einheitenFamilie(karte.titelEn);

  // Titel und Handle
  const t = titelDe(karte);
  let titel = t.titel, unterscheidung = null;
  const titelBelegt = (x) => [...schonTitel].some((y) => titelSchluessel(y) === titelSchluessel(titelVoll(x)));
  if (titel && titelBelegt(titel)) {
    const g = gewichtAusText(karte.beschreibung.metrisch);
    const mitG = g ? `${titel} ${g} g/m²` : null;
    if (mitG && !titelBelegt(mitG)) { titel = mitG; unterscheidung = 'stoffgewicht'; }
    else { titel = `${titel} Modell ${id}`; unterscheidung = 'modellnummer'; }
  }
  const h = titel ? handleAus(titel, { nummer: id, schonVergeben: schonHandles, slugFest: unterscheidung ? titel.replace(/g\/m²/g, 'gramm') : t.slugFest }) : { handle: null, kollision: true };
  const titelKomplett = titel ? titelVoll(titel) : null;

  // Varianten, Optionen, Preise
  const w = waehleVarianten(karte, katalog, { max: regel.maxVarianten, uebersee: opt.uebersee !== false });
  const { achsen, wert } = optionenBauen(karte, w.varianten);
  const basis = basisPlatzierung(karte);
  const aufUsd = (basis?.pflichtAufpreisUsd ?? 0) + (basis?.p?.technik === 'EMBROIDERY' ? regel.digitalisierungUsd : 0);
  const skuBasis = SKU_BASIS + id;
  const preisFehler = [];
  const varianten = w.varianten.map((v) => {
    const katalogUsd = v.kostenUsd;
    const schUsd = schaetzung && schaetzung[v.printfulVariantId] != null ? zahl(schaetzung[v.printfulVariantId]) : null;
    let preis = null, ek = null, quelle = null;
    const vers = opt.versandVarianten && opt.versandVarianten[v.printfulVariantId] != null ? Number(opt.versandVarianten[v.printfulVariantId]) : (rate?.rateUsd ?? null);
    try {
      if (!rate) throw new TypeError('keine CH-Versandrate');
      const a = abrechnungsEk({ katalogUsd, schaetzungUsd: schUsd });
      quelle = schUsd !== null ? 'schaetzung' : 'katalog+26%';
      ek = schUsd !== null ? a.ekUsd : katalogUsd * regel.ekAufschlagOhneSchaetzung;
      preis = endpreis({ ekUsd: ek, versandUsd: vers, aufpreisUsd: aufUsd, ekRichtwertUsd: katalogUsd });
    } catch (e) { preisFehler.push(`${v.farbe ?? ''} ${v.groesse ?? ''}`.trim() + ': ' + e.message); }
    const opts = {}; for (const a of achsen) opts[a.name] = wert(v, a);
    return {
      sku: `${skuBasis}_${v.printfulVariantId}`, printfulVariantId: v.printfulVariantId, optionen: opts, farbe: v.farbeDe, groesse: groesseText(v.groesseAnzeige ?? v.groesse),
      herkunft: v.herkunft, kostenUsd: katalogUsd, ekRechnungUsd: ek === null ? null : Math.round(ek * 100) / 100, ekQuelle: quelle, versandUsd: vers, aufpreisUsd: aufUsd,
      preisChf: preis?.preisChf ?? null, nettoChf: preis?.nettoChf ?? null, nettoBeiMesskursChf: preis?.nettoBeiMesskursChf ?? null, bindend: preis?.bindend ?? null,
    };
  });
  const md = medienBauen({ karte, katalog, varianten: w.varianten, titel: titelKomplett ?? '', bilder, regel });
  for (const v of varianten) v.bildAlt = md.jeVariante.get(v.printfulVariantId) ?? null;

  // Editor-Karte
  const kompakt = kompaktKarte(karte, { varianten: w.varianten, basisId: basis?.p?.id ?? null, pflichtAufpreisUsd: basis?.pflichtAufpreisUsd ?? 0 });
  const kompaktJson = JSON.stringify(kompakt);
  const edKarte = editorKarte(katalog, { varianten: w.varianten, titelDe: titel ?? null });                                   // ohne Variantenabbildung (zum Prüfen und Vergleichen)
  const edKarteMitShop = editorKarte(katalog, { varianten: w.varianten, titelDe: titel ?? null, shopPlatzhalter: PLATZHALTER_SHOP }); // Beschreibung: Platzhalter, anlegen.mjs trägt die Abbildung ein
  // Grösse der eingebetteten Karte im ungünstigsten Fall: die Abbildung nach dem Anlegen (14-stellige Shopify-Nummern, GEMESSEN an heutigen Varianten-IDs) ist mitgerechnet
  const abbildungWorst = Object.fromEntries(w.varianten.map((v, i) => [String(40000000000000 + i), v.printfulVariantId]));
  const karteBytes = Buffer.byteLength(JSON.stringify({ ...edKarte, shop: { varianten: abbildungWorst } }), 'utf8');

  // Übersetzung und Beschreibung
  const uPruef = pruefeUebersetzung(uebersetzung?.u ?? null, karte.beschreibung.original, { ozArt: kontextAusKatalog(katalog).ozArt });
  if (uebersetzung && uebersetzung.fehler) uPruef.fehler.unshift(uebersetzung.fehler);
  const technikDe = technikDeVon(karte.standardTechnik);
  const beschr = beschreibungBauen({ karte, lieferzeit, modell: id, klasse, kompakt, editorKarte: edKarteMitShop, technikDe, basis: basis ? { ...basis.p, titel: basis.p.titelDe ?? basis.p.id } : null, uebersetzung: uebersetzung?.u ?? null });

  // Bestellweg (printful_sync): ist die Platzierung der Vorderseite sicher?
  const dateien = (katalog.produkt?.files ?? []).filter((f) => f.type !== 'mockup').map((f) => f.id);
  const weg0 = entscheide({ produkt: { typ: karte.typ, dateien }, seite: 'front' });
  // printful_sync schickt EINE Datei mit der Platzierung «front» (Bekleidung) oder «default» (Einzelfläche). Das passt nur, wenn genau das die Basisfläche des Produkts ist
  // und keine zweite Fläche ohne Aufpreis eine eigene Datei bräuchte (Kissen vorne/hinten). Sonst bleibt der Auftrag bei Printful Entwurf (Tag pod-bestellweg-manuell).
  const freieFlaechen = karte.platzierungen.filter((p) => p.art === 'flaeche' && !(p.aufpreisUsd > 0));
  const weg = { ...weg0 };
  if (weg0.gesichert && basis && weg0.platzierung !== basis.p.id) { weg.gesichert = false; weg.grund = `printful_sync schickt «${weg0.platzierung}», die Basisfläche heisst «${basis.p.id}»`; }
  else if (weg0.gesichert && freieFlaechen.length > 1) { weg.gesichert = false; weg.grund = `${freieFlaechen.length} Flächen ohne Aufpreis (${freieFlaechen.map((x) => x.id).join(', ')}): printful_sync schickt nur eine Datei`; }
  const gruppe = gruppeVon(karte);
  const uebersee = varianten.some((v) => v.herkunft === 'ausserhalb');
  const tags = [...new Set(['wunschdesign', 'selbst-gestalten', 'printful_personalized_product', 'sg-fabrik', gruppe.tag, `sg-modell-${id}`, `sg-klasse-${String(klasse).toLowerCase().replace(/_/g, '-')}`, `sg-typ-${String(karte.typ).toLowerCase()}`,
    ...(uebersee ? ['pod-uebersee'] : []), ...(weg.gesichert ? [] : ['pod-bestellweg-manuell'])])].sort();

  const kurz = titel ?? '';
  const kat = kategorieFuer(karte.titelEn);
  const seo = titelKomplett ? { title: `${titelKomplett} | LuxeStyle CH`.length <= 70 ? `${titelKomplett} | LuxeStyle CH` : titelKomplett, description: seoText(titelKomplett) } : null;
  const metafelder = [
    { namespace: 'luxe_sg', key: 'karte', type: 'json', value: kompaktJson },
    { namespace: 'luxe_sg', key: 'modell', type: 'number_integer', value: String(id) },
    { namespace: 'luxe_sg', key: 'klasse', type: 'single_line_text_field', value: klasse },
    { namespace: 'luxe_sg', key: 'quelle', type: 'single_line_text_field', value: `Printful-Katalog, geholt ${karte.erzeugtAus?.katalogGeholt ?? 'unbekannt'}` },
    { namespace: 'mm-google-shopping', key: 'condition', type: 'single_line_text_field', value: 'new' },
    { namespace: 'mm-google-shopping', key: 'custom_product', type: 'boolean', value: 'true' },
    // Lieferzeit im Wortlaut der heutigen Produkte ({"ch":"7–14","tier":"pod","weg":"Druck auf Bestellung"}, GEMESSEN an 26 Produkten): das Theme liest diese Schlüssel, darum keine Zusatzfelder
    ...(lieferzeit ? [{ namespace: 'custom', key: 'lieferzeit', type: 'json', value: JSON.stringify({ ch: `${lieferzeit.min}–${lieferzeit.max}`, tier: 'pod', weg: 'Druck auf Bestellung' }) }] : []),
    ...googleMetafelder(kat, titel),
  ];

  const preise = varianten.map((v) => v.preisChf).filter((x) => x !== null);
  const netto = varianten.map((v) => v.nettoChf).filter((x) => x !== null);
  const plan = {
    schema: PLAN_SCHEMA,
    erzeugt: { am: opt.jetzt ?? null, katalogGeholt: karte.erzeugtAus?.katalogGeholt ?? null, glossar: GLOSSAR_VERSION, regel: { ...regel, preis: { kurs: REGEL.kurs, nettoMin: REGEL.nettoMin, mwst: REGEL.mwst } } },
    printfulProductId: id, stufe, klasse, klasseEndgueltig: karte.klasse, typ: karte.typ, standardTechnik: karte.standardTechnik,
    titelEn: karte.titelEn, titel: titelKomplett, titelKurz: kurz, titelQuelle: t.quelle, titelUnterscheidung: unterscheidung, titelUnbekannt: t.unbekannt, entfernteMarken: t.entferntMarken, handle: h.handle, handleKollision: h.kollision,
    status: 'DRAFT', vendor: 'LuxeStyle', produktart: gruppe.produktart, tags, seo,
    optionen: achsen.map((a) => ({ name: a.name, art: a.art, werte: a.werte })),
    varianten, medien: md.medien,
    beschreibungHtml: beschr.html, beschreibungWeggelassen: beschr.weggelassen, uebersetzung: { ok: uPruef.ok, fehler: uPruef.fehler, saetze: uPruef.saetze, nichtUebernommen: uPruef.nichtUebernommen },
    metafelder, kompakt, kompaktBytes: Buffer.byteLength(kompaktJson, 'utf8'), editorKarte: edKarte, karteBytes,
    lieferung, lieferzeit, familie, kategorie: kat, basisPlatzierung: basis ? { id: basis.p.id, dateiTyp: basis.p.dateiTyp, technik: basis.p.technik, pflichtAufpreisUsd: basis.pflichtAufpreisUsd } : null,
    bestellweg: { platzierung: weg.platzierung, gesichert: weg.gesichert, grund: weg.grund, dateien },
    auswahl: { vorAuswahl: w.gesamtVorAuswahl, bestellbar: w.bestellbar, gewaehlt: varianten.length, farbenGewaehlt: w.farbenGewaehlt, farbenAusgelassen: w.farbenAusgelassen, ausgelassen: w.ausgelassen },
    preis: { min: preise.length ? Math.min(...preise) : null, max: preise.length ? Math.max(...preise) : null, nettoMin: netto.length ? Math.min(...netto) : null, nettoMax: netto.length ? Math.max(...netto) : null, fehler: preisFehler },
    bilder: { gemessen: md.bilderGemessen, unlesbar: md.unlesbar, ungemessen: md.ungemessen, anzahl: md.medien.length, kandidaten: md.kandidaten },
  };
  plan.tore = pruefeTore(plan, { regel, stufen, schonHandles, schonSkus, verwendeteModelle: verwendet, verwendeteFamilien, bilder, versandJeVariante: Boolean(opt.versandVarianten), kartenMaxBytes: regel.kartenMaxBytes, editorKartenMaxBytes: regel.editorKartenMaxBytes, originalText: karte.beschreibung.original });
  plan.anlegbar = plan.tore.filter((x) => x.art === 'blocker').every((x) => x.ergebnis === 'bestanden');
  plan.hash = hashVon({ ...plan, erzeugt: { ...plan.erzeugt, am: null }, hash: undefined });
  return plan;
}

/** Kurzzeile je Plan für die Tabelle. */
export function tabellenZeile(p) {
  const tore = p.tore ?? [];
  const bl = tore.filter((x) => x.art === 'blocker');
  return {
    modell: p.printfulProductId, titel: p.titel, klasse: p.klasse, stufe: p.stufe, varianten: p.varianten?.length ?? 0, preisMin: p.preis?.min ?? null, preisMax: p.preis?.max ?? null, nettoMin: p.preis?.nettoMin ?? null,
    bestanden: bl.filter((x) => x.ergebnis === 'bestanden').length, durchgefallen: bl.filter((x) => x.ergebnis === 'durchgefallen').map((x) => `${x.code}: ${x.grund}`), ungeprueft: bl.filter((x) => x.ergebnis === 'ungeprueft').map((x) => x.code),
    anlegbar: p.anlegbar, handle: p.handle,
  };
}
