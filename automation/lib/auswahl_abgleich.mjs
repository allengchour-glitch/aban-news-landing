/**
 * Abgleich der nachgezogenen Varianten mit CJ (NUR LESEN, reine Funktionen, kein Netz).
 *
 * WARUM (26.10.2026): Der Besitzer fragte, ob jede Grösse und Farbe mit Preis und Lagerbestand «genau zu CJ passt». Bis dahin war das nur an einzelnen Produkten
 * von Hand angesehen. Dieser Abgleich vergleicht je Produkt die Shopify-Varianten (SKU, Preis, Kosten, Optionswerte, Variantenbild) mit der CJ-Antwort
 * (variantSku, variantKey, variantSellPrice, variantImage) und optional dem CJ-Lagerbestand je Variante.
 *
 * ERSTE FASSUNG WAR ZU GUTGLÄUBIG (unabhängige Prüfung am selben Tag, an 197 echten Zeilen): alle 9 Befunde ≥ mittel waren Fehlalarme (Konstanten aus dem Schlüssel,
 * Bindestrich-Werte «35-36», absichtlich weggelassene Fremdstecker), echte Preis-, Kosten- und Zuordnungsfehler blieben unsichtbar (Kosten UNTER dem CJ-Preis hat sie nicht
 * gesehen, weil nur die Schwankung geprüft wurde; vertauschte Farben nicht, weil Farben nie verglichen wurden). Darum jetzt:
 *   - nur VARIIERENDE Schlüsselteile werden verglichen (ein Teil, das in jeder CJ-Variante steht, ist eine Konstante und im Shop zum Hinweis geworden)
 *   - Fremdstecker (US/UK/AU/JP) zählen nie als «fehlt im Shop» — sie werden absichtlich nicht angelegt
 *   - Preise werden gegen die SCHREIBREGEL nachgerechnet (kleinster Preis = Untergrenze, Aufschlag im Verhältnis Preis/Kosten, auf .90 gerundet)
 *   - Farben: einfache Grundfarben (black, red …) müssen im Shop-Wert derselben Variante stehen (Schwarz, Rot …) — das findet vertauschte SKUs
 *
 * Befunde (Schwere in Klammern):
 *   SKU_NICHT_BEI_CJ (hoch)   eine Shop-Variante hat keine SKU, die CJ für dieses Produkt führt
 *   SKU_DOPPELT / WERTE_DOPPELT (hoch)
 *   FREMDSTECKER_IM_SHOP (hoch) eine Shop-Variante gehört laut CJ-Schlüssel zu einem US/UK/AU/JP-Stecker (passt nicht in die Schweizer Steckdose)
 *   PREIS_UNTER_KOSTEN (hoch) Verkaufspreis ≤ Einkaufskosten im Shop
 *   PREIS_UNTER_EK (hoch)     Verkaufspreis ≤ CJ-Einkaufspreis × Kurs (Verlust schon vor der Fracht)
 *   FARBE_ABWEICHUNG (hoch)   CJ-Grundfarbe steht nicht im Shop-Wert derselben Variante (vertauscht oder falsch übersetzt)
 *   LAGER_NULL_ALLE (hoch)    alle Varianten ohne CJ-Bestand (nur wenn ALLE gemessen wurden)
 *   KOSTEN_UNTER_CJ (mittel)  Kosten im Shop liegen unter CJ-Preis × Kurs (die Marge im Shop wäre zu hoch ausgewiesen)
 *   KOSTEN_ABWEICHUNG (mittel) der Abstand Kosten − CJ-Preis × Kurs schwankt über die Varianten
 *   KOSTEN_FEHLT (mittel)     keine einzige Variante hat Kosten im Shop → Preis nur gegen den CJ-Preis prüfbar
 *   PREIS_FOLGT_KOSTEN_NICHT (mittel) Preis weicht von der Schreibregel ab (zu billig oder zu teuer)
 *   PREIS_NICHT_MONOTON (mittel) eine teurere CJ-Variante ist im Shop billiger
 *   CODE_FARBE_UNBELEGT (mittel) CJ nennt nur einen Code («NMSRB5131», «Style 1»), der Shop einen Farbnamen: nicht aus dem Schlüssel belegt, von Hand am Bild zu prüfen
 *   GROESSE_FEHLT (mittel)    Grösse/Zahl eines variierenden Schlüsselteils (XL, 42, 7, 140x183cm) steht nicht im Shop-Wert derselben Variante
 *   FARBE_UNEINDEUTIG (mittel) derselbe CJ-Schlüsselteil führt zu verschiedenen Shop-Werten
 *   CJ_VARIANTE_FEHLT (mittel) eine CJ-Variante (kein Fremdstecker) gibt es im Shop nicht
 *   BILD_FEHLT (mittel)       mindestens die Hälfte der Shop-Varianten ohne Bild, obwohl CJ für sie Bilder führt
 *   LAGER_NULL (mittel)       einzelne Varianten ohne CJ-Bestand
 *   CJ_NICHT_ABRUFBAR (mittel bei «CJ ohne Daten», sonst info)
 *   BILD_DOPPELT (info)       ein Shop-Bild bedient mehrere CJ-Bilder
 *   PREIS_FLACH (info)        ein Preis für deutlich verschiedene CJ-Preise (gewollt, wenn die Basisvariante die teuerste war)
 * Die Übersetzung eines Farbnamens («01HYPNOTIC» → «01 Hypnose») lässt sich NICHT automatisch beweisen; geprüft wird die Eindeutigkeit und die Grundfarbe.
 */
import { groesseNormal, aufrunden90 } from './cj_varianten.mjs';
import { fremdSteckerKey } from './stecker_cj.mjs';

export const USD_CHF = 0.82435; // derselbe Kurs wie lib/cj_varianten.mjs preisFuer()
const SCHWERE = { hoch: 3, mittel: 2, info: 1 };
export const schwereRang = (s) => SCHWERE[s] || 0;

// Zahlenartige Grösse: «7», «EU 42», «US No 7», «35», «140x183cm», «100ml». Modellcodes («NMSRB5131») und «Style 1» sind KEINE Grössen.
const ZAHL_TEIL = /^(?:(?:us|eu|uk|no\.?|size|nr\.?)\s*)*\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?){0,2}\s*(?:cm|mm|m|ml|l|kg|g|pcs|pc|w|v|mah)?$/i;
const CODE_TEIL = /^(?:[A-Za-z]{2,}\d{2,}[A-Za-z0-9]*|style\s*\d+|\d+\s*style)$/i;
const BUCHSTABEN_GROESSE = /^(?:[2-6]?XL|XXS|XS|S|M|L|XXL|XXXL)$/i;
const norm = (s) => groesseNormal(s).toLowerCase().replace(/\s+/g, '').replace(/^([2-6])xl$/, (_, n) => 'x'.repeat(Number(n)) + 'l'); // 3XL = XXXL
const zahl = (x) => (x === null || x === undefined || x === '' ? NaN : Number(x));
const teileVon = (key) => String(key || '').split(/[-/]/).map((t) => t.trim()).filter(Boolean);
const istFremdstecker = (key) => fremdSteckerKey(key) || teileVon(key).some((t) => fremdSteckerKey(t));
const zahlenIn = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).map((z) => Number(z.replace(',', '.')));

// Grundfarben, bei denen die deutsche Übersetzung sicher ist (Teilstrings reichen: «Hellblau», «Dunkelblau» enthalten «blau»).
const GRUNDFARBE = { black: ['schwarz'], white: ['weiss', 'weiß'], red: ['rot'], blue: ['blau'], green: ['grün', 'gruen', 'grun'], yellow: ['gelb'],
  pink: ['rosa', 'pink'], gray: ['grau'], grey: ['grau'], brown: ['braun'], purple: ['violett', 'lila', 'purpur'], orange: ['orange'], beige: ['beige'],
  silver: ['silber'], gold: ['gold'], navy: ['marine', 'blau'] };

/** CJ-Schlüsselteile, die in JEDER CJ-Variante vorkommen (Konstanten: im Shop zum Hinweis geworden, keine Auswahl). */
function konstanteTeile(cjVarianten) {
  const mengen = cjVarianten.map((v) => new Set(teileVon(v.key).map((t) => t.toLowerCase())));
  if (mengen.length < 2) return mengen[0] || new Set(); // eine Variante: nichts variiert, alles gilt als konstant
  return new Set([...mengen[0]].filter((t) => mengen.every((m) => m.has(t))));
}

/** @returns {{code:string, schwere:'hoch'|'mittel'|'info', text:string}[]} */
export function pruefeAbgleich({ shop, cj, stock = null }) {
  const f = [];
  const add = (code, schwere, text) => f.push({ code, schwere, text });
  if (!shop || !Array.isArray(shop.variants)) return [{ code: 'KEINE_SHOPDATEN', schwere: 'hoch', text: 'keine Shopify-Daten' }];
  if (!cj || cj.fehler || !Array.isArray(cj.variants) || !cj.variants.length) {
    const text = String(cj?.fehler || 'CJ ohne Varianten') + (cj?.code ? ` (CJ-Code ${cj.code})` : '');
    return [{ code: 'CJ_NICHT_ABRUFBAR', schwere: /ohne Daten|ohne Varianten/.test(text) ? 'mittel' : 'info', text }];
  }
  const vs = shop.variants;
  if (shop.variantsCount > vs.length) add('ABGESCHNITTEN', 'info', `${shop.variantsCount} Varianten, nur ${vs.length} gelesen`);

  const cjSku = new Map(cj.variants.map((v) => [v.sku, v]));
  const shopSkus = vs.map((v) => v.sku);
  const unbekannt = vs.filter((v) => !cjSku.has(v.sku));
  if (unbekannt.length) add('SKU_NICHT_BEI_CJ', 'hoch', `${unbekannt.length} von ${vs.length} Varianten: ${unbekannt.slice(0, 3).map((v) => v.sku).join(', ')}`);

  // Fremdstecker werden absichtlich nicht angelegt: kein Befund. Alles andere, was im Shop fehlt, ist ein Mangel (mittel).
  // Bei abgeschnittener Shopliste (mehr als gelesen) wäre «fehlt» geraten.
  const fehltImShop = shop.variantsCount > vs.length ? [] : cj.variants.filter((v) => !shopSkus.includes(v.sku) && !istFremdstecker(v.key));
  if (fehltImShop.length) add('CJ_VARIANTE_FEHLT', 'mittel', `${fehltImShop.length} von ${cj.variants.length} CJ-Varianten nicht im Shop: ${fehltImShop.slice(0, 3).map((v) => v.key || v.sku).join(', ')}`);

  const fremdImShop = vs.filter((v) => cjSku.has(v.sku) && istFremdstecker(cjSku.get(v.sku).key));
  if (fremdImShop.length) add('FREMDSTECKER_IM_SHOP', 'hoch', `${fremdImShop.length} Variante(n) mit US/UK/AU/JP-Stecker, die in die Schweizer Steckdose nicht passen: ${fremdImShop.slice(0, 2).map((v) => cjSku.get(v.sku).key).join(', ')}`);

  if (new Set(shopSkus).size !== shopSkus.length) add('SKU_DOPPELT', 'hoch', 'eine SKU kommt zweimal vor');
  const tupel = vs.map((v) => JSON.stringify(Object.entries(v.werte || {}).sort()));
  if (new Set(tupel).size !== tupel.length) add('WERTE_DOPPELT', 'hoch', 'zwei Varianten mit gleicher Optionskombination');

  // ---- Preise und Kosten ----
  const paare = vs.map((v) => ({ v, c: cjSku.get(v.sku) })).filter((p) => p.c && Number.isFinite(zahl(p.c.ek)));
  const mitKosten = paare.filter((p) => Number.isFinite(zahl(p.v.kosten)));
  if (mitKosten.length > 1) {
    const abstand = mitKosten.map((p) => zahl(p.v.kosten) - zahl(p.c.ek) * USD_CHF);
    const spanne = Math.max(...abstand) - Math.min(...abstand);
    if (spanne > 0.05) add('KOSTEN_ABWEICHUNG', 'mittel', `Abstand Kosten − CJ-Preis×Kurs schwankt um ${spanne.toFixed(2)} CHF`);
  }
  const unterCj = mitKosten.filter((p) => zahl(p.v.kosten) < zahl(p.c.ek) * USD_CHF - 0.05);
  if (unterCj.length) {
    const p = unterCj.reduce((a, b) => (zahl(a.v.kosten) - zahl(a.c.ek) * USD_CHF < zahl(b.v.kosten) - zahl(b.c.ek) * USD_CHF ? a : b));
    add('KOSTEN_UNTER_CJ', 'mittel', `${unterCj.length} Variante(n): Kosten ${zahl(p.v.kosten).toFixed(2)} CHF, CJ ${zahl(p.c.ek).toFixed(2)} USD = ${(zahl(p.c.ek) * USD_CHF).toFixed(2)} CHF`);
  }
  if (paare.length && !paare.some((p) => Number.isFinite(zahl(p.v.kosten)))) add('KOSTEN_FEHLT', 'mittel', 'keine Einkaufskosten im Shop hinterlegt');
  const verlust = mitKosten.filter((p) => zahl(p.v.price) <= zahl(p.v.kosten));
  if (verlust.length) add('PREIS_UNTER_KOSTEN', 'hoch', `${verlust.length} Variante(n): Preis ${verlust[0].v.price} ≤ Kosten ${verlust[0].v.kosten}`);
  const unterEk = paare.filter((p) => zahl(p.v.price) <= zahl(p.c.ek) * USD_CHF);
  if (unterEk.length) add('PREIS_UNTER_EK', 'hoch', `${unterEk.length} Variante(n): Preis ${unterEk[0].v.price} ≤ CJ ${zahl(unterEk[0].c.ek).toFixed(2)} USD × Kurs = ${(zahl(unterEk[0].c.ek) * USD_CHF).toFixed(2)} CHF`);
  let nichtMonoton = 0;
  for (const a of paare) for (const b of paare) {
    if (zahl(a.c.ek) > zahl(b.c.ek) + 0.05 && zahl(a.v.price) < zahl(b.v.price) - 0.001) nichtMonoton++;
  }
  if (nichtMonoton) add('PREIS_NICHT_MONOTON', 'mittel', `${nichtMonoton} Paar(e): teurere CJ-Variante im Shop billiger`);

  // Schreibregel nachrechnen (lib/cj_varianten.mjs preisFuer): der kleinste Preis ist die Untergrenze, jede teurere Variante bekommt
  // den Kosten-Aufschlag im Verhältnis Preis/Kosten, auf .90 aufgerundet. An 194 von 194 echten Produkten mit Kosten ohne Abweichung.
  if (mitKosten.length > 1) {
    const preise = mitKosten.map((p) => zahl(p.v.price));
    const pmin = Math.min(...preise);
    const k0 = Math.max(...mitKosten.filter((p) => zahl(p.v.price) === pmin).map((p) => zahl(p.v.kosten)));
    if (k0 > 0) {
      const abw = [];
      for (const p of mitKosten) {
        const aufschlag = zahl(p.v.kosten) - k0;
        if (aufschlag <= 0.05) continue;
        const erwartet = aufrunden90(pmin + aufschlag * (pmin / k0));
        if (Math.abs(erwartet - zahl(p.v.price)) > 0.011) abw.push(`${p.c.key || p.v.sku}: Preis ${p.v.price}, erwartet ${erwartet.toFixed(2)}`);
      }
      if (abw.length) add('PREIS_FOLGT_KOSTEN_NICHT', 'mittel', `${abw.length}× (z. B. ${abw[0]})`);
    }
  }

  // Flachpreis: gleicher Preis bei deutlich verschiedenen CJ-Preisen. Kann richtig sein (die Basisvariante war die teuerste), kann ein Fehler sein → nur Hinweis.
  if (paare.length > 1 && new Set(paare.map((p) => zahl(p.v.price))).size === 1) {
    const eks = paare.map((p) => zahl(p.c.ek) * USD_CHF), spanne = Math.max(...eks) - Math.min(...eks);
    if (spanne > 0.03 * zahl(paare[0].v.price)) add('PREIS_FLACH', 'info', `ein Preis (${paare[0].v.price}) für CJ-Preise von ${Math.min(...eks).toFixed(2)} bis ${Math.max(...eks).toFixed(2)} CHF`);
  }

  // ---- Schlüsselteile: nur die, die variieren ----
  const konstant = konstanteTeile(cj.variants);
  const varTeile = (key) => teileVon(key).filter((t) => !konstant.has(t.toLowerCase()));

  // Grösse/Zahl: ganze Wörter für Buchstabengrössen, Zahlenfolgen für alles mit Ziffern («US No 7», «EU 42», «35-36», «140x183cm», «100ml»).
  let groesseFehlt = 0, beispiel = '';
  const meld = (p, t) => { groesseFehlt++; beispiel ||= `${p.c.key} → ${Object.values(p.v.werte || {}).join(' / ')} (fehlt: ${t})`; };
  for (const p of paare) {
    const werteListe = Object.values(p.v.werte || {});
    const wortStuecke = werteListe.flatMap((w) => [norm(w), ...String(w).split(/[\s,;/()\-·]+/).filter(Boolean).map(norm)]);
    const zahlenImShop = new Set(werteListe.flatMap(zahlenIn));
    for (const t of varTeile(p.c.key)) {
      if (BUCHSTABEN_GROESSE.test(t)) { if (!wortStuecke.includes(norm(t))) meld(p, t); continue; }
      if (!ZAHL_TEIL.test(t)) continue;
      const nums = zahlenIn(t);
      if (nums.length && !nums.every((n) => zahlenImShop.has(n))) meld(p, t);
    }
  }
  if (groesseFehlt) add('GROESSE_FEHLT', 'mittel', `${groesseFehlt}× (z. B. ${beispiel})`);

  // Grundfarben: das englische Wort muss als deutsche Entsprechung im Shop-Wert derselben Variante stehen.
  const farbAbw = [];
  for (const p of paare) {
    const text = Object.values(p.v.werte || {}).join(' ').toLowerCase();
    for (const t of varTeile(p.c.key)) {
      const moegl = GRUNDFARBE[t.toLowerCase()];
      if (moegl && !moegl.some((m) => text.includes(m)) && !text.includes(t.toLowerCase())) farbAbw.push(`${p.c.key} → ${Object.values(p.v.werte || {}).join(' / ')}`);
    }
  }
  if (farbAbw.length) add('FARBE_ABWEICHUNG', 'hoch', `${farbAbw.length}× (z. B. ${farbAbw[0]})`);

  // Modellcode oder «Style 1» bei CJ, im Shop aber ein Farbname: die Farbe steht NICHT im CJ-Schlüssel (aus Bild/Titel erschlossen?) — nie automatisch beweisbar.
  const codeFarbe = [];
  for (const p of paare) {
    const text = Object.values(p.v.werte || {}).join(' ').toLowerCase();
    for (const t of varTeile(p.c.key)) {
      if (CODE_TEIL.test(t) && Object.values(GRUNDFARBE).some((arr) => arr.some((c) => text.includes(c)))) codeFarbe.push(`${p.c.key} → ${Object.values(p.v.werte || {}).join(' / ')}`);
    }
  }
  if (codeFarbe.length) add('CODE_FARBE_UNBELEGT', 'mittel', `${codeFarbe.length}× Farbe nicht aus dem CJ-Schlüssel belegt (z. B. ${codeFarbe[0]})`);

  // Eindeutigkeit: gleiches CJ-Schlüsselstück ↔ gleicher Shop-Wert (nur wo die variierenden Teile eins zu eins zu den Optionen passen)
  const zuordnung = new Map();
  for (const p of paare) {
    const teile = varTeile(p.c.key);
    const wertTeile = Object.entries(p.v.werte || {});
    if (teile.length !== wertTeile.length) continue;
    teile.forEach((t, i) => { const k = `${i}|${t.toLowerCase()}`; (zuordnung.get(k) || zuordnung.set(k, new Set()).get(k)).add(wertTeile[i][1]); });
  }
  const mehrdeutig = [...zuordnung.entries()].filter(([, set]) => set.size > 1);
  if (mehrdeutig.length) add('FARBE_UNEINDEUTIG', 'mittel', `${mehrdeutig.length} CJ-Schlüsselteil(e) mit mehreren Shop-Werten, z. B. ${mehrdeutig[0][0].split('|')[1]} → ${[...mehrdeutig[0][1]].join(' | ')}`);

  // ---- Bilder ----
  const mitCjBild = paare.filter((p) => p.c.bild);
  if (mitCjBild.length && mitCjBild.filter((p) => !p.v.bildId).length / mitCjBild.length >= 0.5) add('BILD_FEHLT', 'mittel', `${mitCjBild.filter((p) => !p.v.bildId).length} von ${mitCjBild.length} Varianten ohne Bild, obwohl CJ eines führt`);
  const jeBild = new Map();
  for (const p of mitCjBild.filter((x) => x.v.bildId)) (jeBild.get(p.v.bildId) || jeBild.set(p.v.bildId, new Set()).get(p.v.bildId)).add(p.c.bild);
  const geteilt = [...jeBild.values()].filter((s) => s.size > 1).length;
  if (geteilt) add('BILD_DOPPELT', 'info', `${geteilt} Shop-Bild(er) bedienen mehrere verschiedene CJ-Bilder`);

  // ---- Lager (nur mit Daten; «alle ohne Bestand» erst, wenn jede Variante gemessen wurde) ----
  if (stock && typeof stock === 'object') {
    const gemessen = paare.filter((p) => p.c.vid in stock);
    const null0 = gemessen.filter((p) => !(zahl(stock[p.c.vid]) > 0));
    if (gemessen.length && null0.length === gemessen.length && gemessen.length === paare.length) add('LAGER_NULL_ALLE', 'hoch', `alle ${gemessen.length} Varianten ohne CJ-Bestand`);
    else if (null0.length) add('LAGER_NULL', 'mittel', `${null0.length} von ${gemessen.length} gemessenen Varianten ohne CJ-Bestand: ${null0.slice(0, 3).map((p) => p.c.key || p.c.sku).join(', ')}`);
  }
  return f;
}

/** Zusammenfassung über viele Produkte: { produkte, mitBefund, je: {code: {n, schwere}} } — schwere = die HÖCHSTE, die bei diesem Code vorkam. */
export function fasseZusammen(ergebnisse) {
  const je = {};
  let mitBefund = 0;
  for (const e of ergebnisse) {
    const echte = e.flags.filter((x) => x.schwere !== 'info');
    if (echte.length) mitBefund++;
    for (const x of e.flags) {
      const eintrag = (je[x.code] ||= { n: 0, schwere: x.schwere });
      eintrag.n++;
      if (schwereRang(x.schwere) > schwereRang(eintrag.schwere)) eintrag.schwere = x.schwere;
    }
  }
  return { produkte: ergebnisse.length, mitBefund, je };
}
