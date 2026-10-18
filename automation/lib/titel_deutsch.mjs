/**
 * Maschinenübersetzte Produkttitel in richtiges Deutsch bringen.
 *
 * WARUM (gemessen 2026-10-18 über den aktiven Katalog): 19 aktive Produkte heissen im Shop
 * „Mannlicher Leder-Rucksack", „Weibliche Bluse mit V-Ausschnitt" oder „Hoodie fuer Herbst".
 * Das ist die Überschrift, die Kundinnen und Kunden auf der Kachel, im Warenkorb, in der
 * Bestellbestätigung und bei Google lesen — und gleichzeitig die Grundlage des SEO-Titels
 * (`automation/lib/seo_titel.mjs` baut ihn aus dem Produkttitel).
 *
 * Im Deutschen beschreibt „männlich/weiblich" das Geschlecht einer Person oder eines
 * Steckverbinders, nicht die Zielgruppe einer Tasche. Richtig ist „Herren-" bzw. „Damen-".
 *
 * BEWUSST ENG: Nur das erste Wort eines Titels wird angefasst, und nur diese Wörter. Ein
 * Fachbegriff wie „weiblicher Stecker" (die Buchse) bleibt unberührt — dort wäre „Damen-"
 * grober Unsinn, und solche Fälle gehören von Hand entschieden, nicht in ein Muster.
 *
 * ZWEI FORMEN, weil eine nicht reicht — im Trockenlauf aufgefallen: Folgt ein Substantiv,
 * passt die Zusammensetzung („Mannlicher Lederrucksack" → „Herren-Lederrucksack"). Folgt ein
 * Adjektiv, ergäbe sie Unsinn („Herren-Wasserdichter Rucksack"); dann wandert die Zielgruppe
 * ans Ende („Wasserdichter Rucksack 20-35L für Herren"). Woran man es erkennt: im Deutschen
 * wird das Substantiv grossgeschrieben, das Adjektiv nicht — der Ausgangstitel sagt es also
 * selbst, es braucht keine Wortliste.
 */

/** Nach diesen Wörtern meint „weiblich/männlich" den Steckverbinder, nicht die Zielgruppe. */
export const TECHNISCH = /^(stecker|anschluss|buchse|kupplung|adapter|kontakt|gewinde|pin)\b/i;

const ERSATZ = [
  [/^(Männlich|Mannlich)(er|e|es)\s+/, 'Herren'],
  [/^(Weiblich|Weiblich)(er|e|es)\s+/, 'Damen'],
];

/** „fuer" ohne Umlaut ist immer falsch — als ganzes Wort, damit „Feuer" unberührt bleibt. */
function umlauteNachziehen(t) {
  return t.replace(/(?<![\p{L}])fuer(?![\p{L}])/giu, (m) => (m[0] === 'F' ? 'Für' : 'für'));
}

/**
 * @returns {string} der verbesserte Titel — unverändert, wenn nichts zutrifft (idempotent).
 */
export function titelDeutsch(roh) {
  let t = String(roh || '').trim();
  if (!t) return t;
  for (const [muster, ersatz] of ERSATZ) {
    const m = t.match(muster);
    if (!m) continue;
    const rest = t.slice(m[0].length);
    if (TECHNISCH.test(rest)) break;          // „Weiblicher Stecker" bleibt, siehe oben
    if (!rest) break;
    const substantiv = rest.charAt(0) === rest.charAt(0).toUpperCase()
      && rest.charAt(0) !== rest.charAt(0).toLowerCase();
    t = substantiv
      ? `${ersatz}-${rest}`                                                   // Herren-Lederrucksack
      : `${rest.charAt(0).toUpperCase()}${rest.slice(1)} für ${ersatz}`;      // Wasserdichter … für Herren
    break;
  }
  return umlauteNachziehen(t);
}

/** Nur melden, ob ein Titel überhaupt betroffen ist — für Berichte und Trockenläufe. */
export function brauchtKorrektur(roh) {
  return titelDeutsch(roh) !== String(roh || '').trim();
}
