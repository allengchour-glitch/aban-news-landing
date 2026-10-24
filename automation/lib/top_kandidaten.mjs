/**
 * Urteil über einen CJ-Katalogtreffer: taugt er als neues Produkt für LuxeStyle?
 *
 * WARUM: CJ Prime verspricht eine „kuratierte Liste von VIP-Produkten". Gemessen am
 * 24.10.2026 hat die API davon **nichts**: `setting/get` listet 69 Endpunkte, keiner heisst
 * VIP, keiner Coupon. Beides liegt allein in CJs Weboberfläche. Was die API dafür hergibt,
 * ist besser als eine Liste: `/product/list` liefert je Treffer `listedNum` — wie viele
 * Läden das Produkt bereits führen. Das ist ein GEMESSENER Beliebtheitswert statt eines
 * Marketing-Etiketts.
 *
 * DIE ZAHL IST ABER NICHT DAS URTEIL, und das ist der Kern dieses Moduls. Elf von elf
 * Erstattungen des Shops hatten den Grund „nicht in die Schweiz lieferbar"
 * (`automation/lib/lieferbarkeit.mjs`). Ein beliebtes Produkt, das nicht hierher kommt,
 * wiederholt genau diesen Schaden. Darum ist `shippingCountryCodes` nur eine Vorauswahl, und
 * die Fracht wird am Ende gemessen — die Behauptung des Katalogs zählt nicht.
 *
 * WAS HIER BEWUSST DURCHFÄLLT, obwohl es sich verkaufen liesse: Markenware und Lizenzware
 * (Kontosperr-Risiko, siehe Merchant-Feed-Befund vom 17.10.) und Klingen (Waffenrecht, siehe
 * `sourcing_kandidaten.mjs`). Dazu Testprodukte und Ware ohne Bild.
 */
import { MARKE_MUSTER, KLINGE_MUSTER } from './sourcing_kandidaten.mjs';

/**
 * ENGLISCHE MUSTER — und das ist kein Beiwerk, sondern der Fehler, der hier beinahe passiert
 * wäre: die Muster in `sourcing_kandidaten.mjs` prüfen Shopify-Titel und sind DEUTSCH. CJs
 * Katalog heisst `productNameEn`. „Folding Pocket Knife" trifft `messer` nie — die
 * Klingensperre wäre still wirkungslos gewesen und hätte ausgesehen wie „keine Klingen im
 * Treffer". Beide Sprachen werden geprüft, und ein Test in beide Richtungen hält das fest.
 */
const KLINGE_EN = /(^|[^a-z])(knife|knives|blade|blades|sword|machete|dagger|axe|hatchet|cleaver|razor(?: ?blade)?|crossbow|shuriken|knuckle)([^a-z]|$)/i;
const MARKE_EN = /(^|[^a-z])(xiaomi|denver|intex|ksix|nibosi|apple|iphone|samsung|sony|bosch|philips|dyson|nintendo|nintendo switch|playstation|ps4|ps5|xbox|lego|disney|pokemon|marvel|barbie|hello kitty|stitch)([^a-z]|$)/i;

/**
 * Mindestzahl Läden, ab der ein Produkt als erprobt gilt.
 *
 * GEMESSEN, NICHT GERATEN (24.10.2026, 240 Katalogtreffer aus sechs Suchwörtern): der höchste
 * Wert war **18**, der Median **0**. Eine erste Fassung stand auf 20 — damit wäre NIE ein
 * Produkt durchgekommen, und der Lauf hätte „keine Kandidaten" gemeldet, als wäre der Katalog
 * leer. 5 lässt 13 von 240 durch, also die besten fünf Prozent.
 */
export const LISTED_MIN = 5;

/**
 * Der Einkaufspreis als Zahl. CJ schreibt bei Varianten eine Spanne: `"1.83 -- 3.69"`.
 * `Number()` macht daraus NaN, und 32 von 240 Treffern fielen so als „Preis unbekannt" durch,
 * obwohl der Preis dasteht. Genommen wird der UNTERE Wert und nur er — die Spanne gehört zu
 * Varianten, die der Shop erst beim Anlegen auswählt.
 */
export function ekPreis(roh) {
  if (roh === null || roh === undefined) return NaN;
  const txt = String(roh).trim();
  if (!txt) return NaN;
  const zahlen = txt.match(/\d+(?:[.,]\d+)?/g);
  if (!zahlen) return NaN;
  return Number(zahlen[0].replace(',', '.'));
}

/**
 * @param {object} t ein Treffer aus /product/list
 * @param {object} opt { listedMin, maxEk } maxEk in USD: der Shop verkauft in CHF und rechnet
 *   mit Aufschlag; über diesem Einkauf wird der Endpreis für diesen Shop unrealistisch.
 */
export function topUrteil(t = {}, opt = {}) {
  const listedMin = Number.isFinite(Number(opt.listedMin)) ? Number(opt.listedMin) : LISTED_MIN;
  const maxEk = Number.isFinite(Number(opt.maxEk)) ? Number(opt.maxEk) : 40;
  const name = String(t.productNameEn || t.productName || '');
  const nein = grund => ({ nehmen: false, grund });

  if (!name.trim()) return nein('kein-name');
  if (t.isTestProduct === true || t.isTestProduct === 'true') return nein('testprodukt');
  if (!t.productImage) return nein('kein-bild');
  if (KLINGE_MUSTER.test(name) || KLINGE_EN.test(name)) return nein('klinge-waffenrecht');
  if (MARKE_MUSTER.test(name) || MARKE_EN.test(name)) return nein('markenware');

  // Number(null) ist 0 — ein fehlender Preis sähe damit wie „geschenkt" aus statt wie
  // unbekannt. Spannen und leere Werte gehen darum durch `ekPreis`.
  const preis = ekPreis(t.sellPrice);
  // Ein unlesbarer Preis ist unbekannt, nicht teuer — und wird nicht geraten.
  if (!Number.isFinite(preis)) return nein('preis-unbekannt');
  if (preis > maxEk) return nein('zu-teuer');

  const laeden = Number(t.listedNum);
  if (!Number.isFinite(laeden) || laeden < listedMin) return nein('zu-wenig-erprobt');

  // HIER STAND EINE REGEL, DIE EIN FELD FALSCH GELESEN HAT, und sie ist lehrreich genug, um
  // stehen zu bleiben: `shippingCountryCodes` wurde als Liste der BELIEFERTEN Länder gelesen
  // und alles ohne „CH" verworfen. Gemessen (240 Treffer) enthält das Feld ausschliesslich
  // `CN`, `CN_US`, `US`, `GB`, `AU` — es nennt das **Lager**, nicht das Ziel. „CH" kann dort
  // nie stehen; die Regel hätte jeden einzelnen Treffer verworfen und wie ein leerer Katalog
  // ausgesehen. Aufgefallen ist sie nur, weil die Zahl der Durchkommenden null war.
  // Die Lieferbarkeit beantwortet allein `logistic/freightCalculate` im Lauf.
  const lager = Array.isArray(t.shippingCountryCodes) ? t.shippingCountryCodes : [];

  return { nehmen: true, grund: 'kandidat', laeden, preis, lager, frachtPruefen: true };
}

/** Beste zuerst: mehr Läden schlägt weniger, bei Gleichstand der tiefere Einkauf. */
export function topAuswahl(treffer, max, opt = {}) {
  const offen = (treffer || []).map(t => ({ t, u: topUrteil(t, opt) })).filter(x => x.u.nehmen)
    .sort((a, b) => b.u.laeden - a.u.laeden || a.u.preis - b.u.preis ||
      String(a.t.productNameEn).localeCompare(String(b.t.productNameEn)));
  const deckel = Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : offen.length;
  return offen.slice(0, deckel);
}
