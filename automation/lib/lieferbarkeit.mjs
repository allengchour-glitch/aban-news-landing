/**
 * Urteil: kann CJ dieses Produkt in die Schweiz liefern?
 *
 * WARUM (gemessen 2026-10-23 an allen 12 Bestellungen des Shops): ELF von elf Erstattungen
 * hatten denselben Grund — nicht lieferbar. `ausverkauft-lieferant`, `nicht-lieferbar-ch`,
 * `cj-nicht-versendbar-ch`, „lager leer", Storno mit Grund INVENTORY. Jedes Mal wurde das
 * Produkt ERST NACH dem Kauf auf DRAFT gesetzt; 1998 Produkte tragen inzwischen den Sperr-Tag,
 * und keiner der rund 70 Wächter im Repo prüft das — die Tags wurden immer von Hand gesetzt.
 * Eine Erstattung kostet die Zahlgebühr, die Arbeit und die Kundin.
 *
 * DAS MESSGERÄT, in beide Richtungen gegengeprüft (16 von 16 richtig):
 * `logistic/freightCalculate` CN→CH gibt für acht bekannt gesperrte Produkte **null** Linien
 * und für acht gesunde aktive 7 bis 16. Produkt-Status und Lagerbestand taugen NICHT: das
 * Taschenmesser, das CJ als verbotenen Artikel zurückschickte (Bestellungen #1016 und #1017),
 * trägt denselben `status: "3"` wie ein gesundes Kleid, hatte 5628 Stück an Lager — und bekam
 * sogar eine Frachtlinie. Darum verspricht dieses Modul NICHT, dass eine Lieferung klappt. Es
 * findet nur den sicheren Negativfall: keine Linie heisst, es geht nicht.
 *
 * DIE WICHTIGSTE REGEL IST DIE ZURÜCKHALTUNG: wer CJ nicht lesen kann, weiss NICHTS. Zwei der
 * 30 besuchten Produkte antworten `1602001 Product not found`, weil ihre SKU eine interne UUID
 * statt einer CJ-SKU ist. Als „nicht lieferbar" gewertet, hätte das zwei gesunde Produkte aus
 * dem Verkauf genommen. Dieselbe Fehlerklasse wie der stumme Skip im Review-Import und wie das
 * zu breite `rueckhol`-Muster im Merchant-Feed: eine Antwort, die nichts aussagt, als Befund zu
 * lesen. `unbekannt` ist darum ein eigener Ausgang und führt nie zu einer Änderung am Shop.
 */

/** Weiche CJ-Codes: eine Antwort, kein Fehler — und erst recht kein Befund. */
export const CJ_UNBEKANNT = [1602001];
/** Ausgelistet: CJ führt das Produkt nicht mehr. Bestellbar ist es damit nicht. */
export const CJ_AUSGELISTET = [1602002, 1602003];

/**
 * @param {object} e Erhebung zu EINEM Produkt
 *   e.cjCode    Code der letzten product/query-Antwort (200 = gelesen)
 *   e.vid       gefundene Varianten-Kennung (null = keine)
 *   e.linien    Anzahl Frachtlinien CN→CH, oder null wenn nicht gemessen
 * @returns {{urteil:'lieferbar'|'nicht_lieferbar'|'unbekannt', grund:string, tag:string|null}}
 */
export function lieferurteil(e = {}) {
  const code = Number(e.cjCode);
  if (CJ_AUSGELISTET.includes(code)) {
    return { urteil: 'nicht_lieferbar', grund: `CJ hat das Produkt ausgelistet (${code})`, tag: 'cj-ausgelistet' };
  }
  if (CJ_UNBEKANNT.includes(code)) {
    return { urteil: 'unbekannt', grund: 'CJ findet die SKU nicht — sagt nichts über die Lieferbarkeit', tag: null };
  }
  if (code !== 200) {
    return { urteil: 'unbekannt', grund: `CJ-Antwort ${e.cjCode ?? 'fehlt'} — nicht auswertbar`, tag: null };
  }
  if (!e.vid) {
    return { urteil: 'unbekannt', grund: 'keine Variante zur SKU gefunden', tag: null };
  }
  if (e.linien === null || e.linien === undefined) {
    return { urteil: 'unbekannt', grund: 'Fracht nicht gemessen', tag: null };
  }
  if (Number(e.linien) === 0) {
    return { urteil: 'nicht_lieferbar', grund: 'keine Versandlinie CN→CH', tag: 'cj-nicht-versendbar-ch' };
  }
  return { urteil: 'lieferbar', grund: `${e.linien} Versandlinien CN→CH`, tag: null };
}

/** Nur ein nicht_lieferbar-Urteil darf den Shop ändern — nie ein unbekannt. */
export function darfSperren(urteil) {
  return urteil?.urteil === 'nicht_lieferbar';
}
