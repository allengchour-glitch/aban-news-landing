// Silber-Feingehaltsangabe in Produkttexten erkennen (reine Funktion, kein Netz, kein Shopify-Zugriff).
// Anlass: Schweizer Edelmetallkontrolle (BAZG-FAQ «Edelmetallkontrolle», am 17.11.2026 gelesen): Silberwaren im Handel brauchen eine Feingehaltsangabe und eine
// registrierte Verantwortlichkeitsmarke. Der Besitzer hat am 17.11.2026 entschieden, alle Produkte, deren Text einen Silber-Feingehalt nennt
// («925», «S925», «Sterling», «999 Silber» …), bis zur Antwort der Behörde auf ENTWURF zu setzen (dropship/silber-bazg-1711/README.md).
// Diese Regel nutzen: das Werkzeug dropship/silber-bazg-1711, der tägliche Wächter automation/silber_waechter.mjs, das Tor in der Freigabe (grind_freigabe) und im CJ-Import.
//
// Grundsatz: lieber ein Treffer zu viel als einer zu wenig, ABER eine ausdrückliche Verneinung direkt vor der Angabe («kein Sterlingsilber», «ohne 925») zählt nicht.

/** Zahl als eigene Zahl: nicht Teil von «19250», «1,925», «1.925». Ein Komma oder Punkt DAVOR ohne Ziffer davor («Kupfer,925 Silber») ist keine Zahlenschreibweise. */
const NICHT_ZAHL = '(?<![0-9])(?<![0-9][.,])';
const ZAHL_ENDE = '(?![0-9])';
/** Einheiten, die aus «925» eine Menge machen («925 mAh», «925 mm»), keine Feingehaltsangabe. */
const EINHEIT_NACH = '(?!\\s?(?:(?:mah|mm|cm|ml|kg|gr|gramm|g|v|w|hz|lumen|lm|px|pcs|stk|stück|stueck|pieces|meter|m)(?![\\p{L}])|%))';
const SILBERWORT = '(?:silber|silver|sterling|\\bag\\b)';
const FEINGEHALTE = '(?:999|990|958|950|900|835|800)';

/** [Art, Muster]. Alle gegen den kleingeschriebenen, von HTML befreiten Text. */
const MUSTER = [
  ['925', new RegExp(`${NICHT_ZAHL}925${ZAHL_ENDE}${EINHEIT_NACH}`, 'gu')],
  ['sterling', /sterling/g],
  ['fein', /feinsilber|fine silver|pure silver|echtsilber|echtes silber|real silver|genuine silver|solid silver|massivsilber|massives silber/g],
  ['feingehalt-zahl', new RegExp(`${SILBERWORT}.{0,25}${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}|${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}.{0,25}${SILBERWORT}`, 'gu')],
  ['92,5', new RegExp(`${SILBERWORT}.{0,30}${NICHT_ZAHL}92[.,]5${ZAHL_ENDE}|${NICHT_ZAHL}92[.,]5${ZAHL_ENDE}.{0,30}${SILBERWORT}`, 'gu')],
];

/** Verneinung oder Vergleich unmittelbar vor der Fundstelle (höchstens drei Wörter dazwischen, im selben Satzteil): «nicht um Edelstahl- oder Sterlingsilber-Schmuck», «Anders als 925er Silber». */
const VERNEINUNG_DAVOR = /(?:^|[\s(])(?:kein(?:e[nrsm]?)?|nicht|ohne|statt|anstelle(?: von)?|anstatt|nie|weder|anders als|im gegensatz zu|im vergleich zu|im unterschied zu|gegenüber|versus|vs|compared to|no|not|without|instead of|unlike)\s+(?:[\p{L}\p{N}-]+\s+){0,3}$/u;

export function bereinige(text) {
  // Zeilen- und Blockgrenzen (Zeilenumbruch, <br>, </p>, </li> …) werden zu einem Satzende: «Ohne Nickel</li><li>925 Silber» ist KEINE Verneinung der 925.
  return String(text ?? '')
    .replace(/<\s*(?:br|\/p|\/li|\/div|\/h[1-6]|\/tr|\/td|\/ul|\/ol)\b[^>]*>/gi, ' . ')
    .replace(/\r?\n+/g, ' . ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const optionsText = (o) => (Array.isArray(o)
  ? o.map((x) => `${x?.name ?? ''}: ${(x?.values || []).join(' / ')}`).join(' ; ')
  : String(o ?? ''));

/** Fundstellen in EINEM Feld. Rückgabe {treffer:[{art,text}], verneint:[{art,text}]}; text = Umgebung der Stelle (höchstens 100 Zeichen: Treffer höchstens 40 + je 30 Zeichen Umgebung). */
export function fundstellen(text) {
  const t = bereinige(text);
  const treffer = [], verneint = [];
  for (const [art, re] of MUSTER) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t))) {
      const von = Math.max(0, m.index - 30), bis = Math.min(t.length, m.index + m[0].length + 30);
      const umgebung = t.slice(von, bis);
      const davor = t.slice(Math.max(0, m.index - 40), m.index);
      // Ein Satzzeichen beendet den Verneinungsbereich von selbst: die Wörter zwischen Verneinung und Fundstelle dürfen nur Buchstaben, Ziffern und Bindestrich tragen
      // («nicht rostend, aus 925» ist KEINE Verneinung der 925).
      (VERNEINUNG_DAVOR.test(davor) ? verneint : treffer).push({ art, text: umgebung });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return { treffer, verneint };
}

/**
 * Trifft eine Silber-Feingehaltsangabe zu? Felder: title, description (Text oder HTML), options (Text oder [{name, values}]).
 * Rückgabe {treffer: boolean, belege: [{feld, art, text}], verneint: [{feld, art, text}]}.
 */
export function silberFeingehalt(p) {
  const felder = [['titel', p?.title], ['beschreibung', p?.description ?? p?.descriptionHtml], ['option', optionsText(p?.options)]];
  const belege = [], verneint = [];
  for (const [feld, wert] of felder) {
    const f = fundstellen(wert);
    belege.push(...f.treffer.map((x) => ({ feld, ...x })));
    verneint.push(...f.verneint.map((x) => ({ feld, ...x })));
  }
  return { treffer: belege.length > 0, belege, verneint };
}

export const istSilberFeingehalt = (p) => silberFeingehalt(p).treffer;

/** Kurze Beschreibung der Funde für Protokolle (höchstens drei Belege). */
export const belegText = (r) => r.belege.slice(0, 3).map((b) => `${b.feld}/${b.art}: «${b.text}»`).join(' | ');
