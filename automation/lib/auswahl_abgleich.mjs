/**
 * Abgleich der nachgezogenen Varianten mit CJ (NUR LESEN, reine Funktionen, kein Netz).
 *
 * WARUM (26.10.2026): Der Besitzer fragte, ob jede Grösse und Farbe mit Preis und Lagerbestand «genau zu CJ passt». Bis dahin war das nur an einzelnen Produkten
 * von Hand angesehen. Dieser Abgleich vergleicht je Produkt die Shopify-Varianten (SKU, Preis, Kosten, Optionswerte, Variantenbild) mit der CJ-Antwort
 * (variantSku, variantKey, variantSellPrice, variantImage) und optional dem CJ-Lagerbestand je Variante.
 *
 * Er prüft bewusst NICHT mit denselben Funktionen, die geschrieben haben (cj_varianten.mjs), ausser dort, wo eine Normalisierung gebraucht wird (groesseNormal):
 *   SKU_NICHT_BEI_CJ        eine Shop-Variante hat keine SKU, die CJ für dieses Produkt führt  → falsche Zuordnung oder CJ hat das Produkt umgebaut
 *   CJ_VARIANTE_FEHLT       eine CJ-Variante gibt es im Shop nicht (Fremdstecker werden absichtlich nicht angelegt)
 *   SKU_DOPPELT / WERTE_DOPPELT   zwei Shop-Varianten mit gleicher SKU oder gleicher Optionskombination
 *   KOSTEN_ABWEICHUNG       Kosten − CJ-Preis × Kurs ist über die Varianten nicht konstant (die Schreiblogik hält diesen Abstand)
 *   PREIS_UNTER_KOSTEN      Verkaufspreis ≤ Einkaufskosten (Verlust)
 *   PREIS_NICHT_MONOTON     eine teurere CJ-Variante ist im Shop billiger als eine günstigere
 *   GROESSE_FEHLT           ein grössenähnliches Stück des CJ-Schlüssels (XL, 42, 140x183cm) steht in keinem Optionswert der Variante
 *   FARBE_UNEINDEUTIG       derselbe CJ-Schlüsselteil führt zu verschiedenen Shop-Werten (oder umgekehrt): die Zuordnung wäre nicht eindeutig
 *   BILD_FEHLT              mindestens die Hälfte der Shop-Varianten ohne Bild, obwohl CJ für sie Bilder führt
 *   LAGER_NULL / LAGER_NULL_ALLE   CJ meldet für die Variante keinen Bestand (nur wenn Lagerdaten vorliegen)
 * Die Übersetzung eines Farbnamens («01HYPNOTIC» → «01 Hypnose») lässt sich NICHT automatisch beweisen; geprüft wird nur, dass die Zuordnung eindeutig ist.
 */
import { groesseNormal } from './cj_varianten.mjs';

export const USD_CHF = 0.82435; // derselbe Kurs wie lib/cj_varianten.mjs preisFuer()
const SCHWERE = { hoch: 3, mittel: 2, info: 1 };
export const schwereRang = (s) => SCHWERE[s] || 0;

const GROESSE_TEIL = /^(?:[2-6]?XL|XXS|XS|S|M|L|XXL|XXXL|\d{2,3}|\d{1,3}(?:[.,]\d)?x\d{1,3}(?:[.,]\d)?(?:x\d{1,3}(?:[.,]\d)?)?(?:cm|mm|m)?|\d{1,3}(?:[.,]\d)?(?:cm|mm))$/i;
const norm = (s) => groesseNormal(s).toLowerCase().replace(/\s+/g, '');
const zahl = (x) => (x === null || x === undefined || x === '' ? NaN : Number(x));

/** @returns {{code:string, schwere:'hoch'|'mittel'|'info', text:string}[]} */
export function pruefeAbgleich({ shop, cj, stock = null }) {
  const f = [];
  const add = (code, schwere, text) => f.push({ code, schwere, text });
  if (!shop || !Array.isArray(shop.variants)) return [{ code: 'KEINE_SHOPDATEN', schwere: 'hoch', text: 'keine Shopify-Daten' }];
  if (!cj || cj.fehler || !Array.isArray(cj.variants) || !cj.variants.length) return [{ code: 'CJ_NICHT_ABRUFBAR', schwere: 'info', text: String(cj?.fehler || 'CJ ohne Varianten') }];
  const vs = shop.variants;
  if (shop.variantsCount > vs.length) add('ABGESCHNITTEN', 'info', `${shop.variantsCount} Varianten, nur ${vs.length} gelesen`);

  const cjSku = new Map(cj.variants.map((v) => [v.sku, v]));
  const shopSkus = vs.map((v) => v.sku);
  const unbekannt = vs.filter((v) => !cjSku.has(v.sku));
  if (unbekannt.length) add('SKU_NICHT_BEI_CJ', 'hoch', `${unbekannt.length} von ${vs.length} Varianten: ${unbekannt.slice(0, 3).map((v) => v.sku).join(', ')}`);

  const fehltImShop = cj.variants.filter((v) => !shopSkus.includes(v.sku));
  if (fehltImShop.length) add('CJ_VARIANTE_FEHLT', fehltImShop.length / cj.variants.length > 0.5 ? 'mittel' : 'info', `${fehltImShop.length} von ${cj.variants.length} CJ-Varianten nicht im Shop: ${fehltImShop.slice(0, 3).map((v) => v.key || v.sku).join(', ')}`);

  if (new Set(shopSkus).size !== shopSkus.length) add('SKU_DOPPELT', 'hoch', 'eine SKU kommt zweimal vor');
  const tupel = vs.map((v) => JSON.stringify(Object.entries(v.werte || {}).sort()));
  if (new Set(tupel).size !== tupel.length) add('WERTE_DOPPELT', 'hoch', 'zwei Varianten mit gleicher Optionskombination');

  // Preise und Kosten
  const paare = vs.map((v) => ({ v, c: cjSku.get(v.sku) })).filter((p) => p.c && Number.isFinite(zahl(p.c.ek)));
  const mitKosten = paare.filter((p) => Number.isFinite(zahl(p.v.kosten)));
  if (mitKosten.length > 1) {
    const abstand = mitKosten.map((p) => zahl(p.v.kosten) - zahl(p.c.ek) * USD_CHF);
    const spanne = Math.max(...abstand) - Math.min(...abstand);
    if (spanne > 0.05) add('KOSTEN_ABWEICHUNG', 'mittel', `Abstand Kosten − CJ-Preis×Kurs schwankt um ${spanne.toFixed(2)} CHF`);
  }
  const verlust = mitKosten.filter((p) => zahl(p.v.price) <= zahl(p.v.kosten));
  if (verlust.length) add('PREIS_UNTER_KOSTEN', 'hoch', `${verlust.length} Variante(n): Preis ${verlust[0].v.price} ≤ Kosten ${verlust[0].v.kosten}`);
  let nichtMonoton = 0;
  for (const a of paare) for (const b of paare) {
    if (zahl(a.c.ek) > zahl(b.c.ek) + 0.05 && zahl(a.v.price) < zahl(b.v.price) - 0.001) nichtMonoton++;
  }
  if (nichtMonoton) add('PREIS_NICHT_MONOTON', 'mittel', `${nichtMonoton} Paar(e): teurere CJ-Variante im Shop billiger`);

  // Grössen: jedes grössenähnliche Stück des CJ-Schlüssels muss in einem Optionswert derselben Variante stehen
  let groesseFehlt = 0, beispiel = '';
  for (const p of paare) {
    const teile = String(p.c.key || '').split(/[-/]/).map((t) => t.trim()).filter(Boolean);
    // Ganze Wörter vergleichen, nie Teilstrings: «L» steckt in «XL» und «S» in «schwarz» — ein Teilstring-Vergleich würde jede falsche Grösse durchwinken.
    const werte = Object.values(p.v.werte || {}).map((w) => [norm(w), ...String(w).split(/[\s,;/()]+/).filter(Boolean).map(norm)]);
    for (const t of teile) {
      if (!GROESSE_TEIL.test(t)) continue;
      const n = norm(t);
      if (!werte.some((stuecke) => stuecke.includes(n))) { groesseFehlt++; beispiel ||= `${p.c.key} → ${Object.values(p.v.werte || {}).join(' / ')}`; }
    }
  }
  if (groesseFehlt) add('GROESSE_FEHLT', 'mittel', `${groesseFehlt}× (z. B. ${beispiel})`);

  // Eindeutigkeit der Zuordnung: gleiches CJ-Schlüsselstück ↔ gleicher Shop-Wert
  const zuordnung = new Map();
  for (const p of paare) {
    const teile = String(p.c.key || '').split(/[-/]/).map((t) => t.trim()).filter(Boolean);
    const wertTeile = Object.entries(p.v.werte || {});
    if (teile.length !== wertTeile.length) continue; // nicht eins zu eins zerlegbar → nicht bewerten
    teile.forEach((t, i) => { const k = `${i}|${t.toLowerCase()}`; (zuordnung.get(k) || zuordnung.set(k, new Set()).get(k)).add(wertTeile[i][1]); });
  }
  const mehrdeutig = [...zuordnung.entries()].filter(([, set]) => set.size > 1);
  if (mehrdeutig.length) add('FARBE_UNEINDEUTIG', 'mittel', `${mehrdeutig.length} CJ-Schlüsselteil(e) mit mehreren Shop-Werten, z. B. ${mehrdeutig[0][0].split('|')[1]} → ${[...mehrdeutig[0][1]].join(' | ')}`);

  // Bilder
  const mitCjBild = paare.filter((p) => p.c.bild);
  if (mitCjBild.length && mitCjBild.filter((p) => !p.v.bildId).length / mitCjBild.length >= 0.5) add('BILD_FEHLT', 'mittel', `${mitCjBild.filter((p) => !p.v.bildId).length} von ${mitCjBild.length} Varianten ohne Bild, obwohl CJ eines führt`);

  // Lager (nur mit Daten)
  if (stock && typeof stock === 'object') {
    const gemessen = paare.filter((p) => p.c.vid in stock);
    const null0 = gemessen.filter((p) => !(zahl(stock[p.c.vid]) > 0));
    if (gemessen.length && null0.length === gemessen.length) add('LAGER_NULL_ALLE', 'hoch', `alle ${gemessen.length} gemessenen Varianten ohne CJ-Bestand`);
    else if (null0.length) add('LAGER_NULL', 'mittel', `${null0.length} von ${gemessen.length} Varianten ohne CJ-Bestand: ${null0.slice(0, 3).map((p) => p.c.key || p.c.sku).join(', ')}`);
  }
  return f;
}

/** Zusammenfassung über viele Produkte: { produkte, mitBefund, je: {code: {n, schwere}} } */
export function fasseZusammen(ergebnisse) {
  const je = {};
  let mitBefund = 0;
  for (const e of ergebnisse) {
    const echte = e.flags.filter((x) => x.schwere !== 'info');
    if (echte.length) mitBefund++;
    for (const x of e.flags) { (je[x.code] ||= { n: 0, schwere: x.schwere }).n++; }
  }
  return { produkte: ergebnisse.length, mitBefund, je };
}
