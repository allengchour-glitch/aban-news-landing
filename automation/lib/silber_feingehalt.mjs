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
const EINHEIT_NACH = '(?!\\s?(?:(?:mah|mm|cm|ml|kg|gr|gramm|g|v|w|kw|watt|hz|khz|mhz|ghz|pa|hpa|kpa|lumen|lm|px|pixel|pcs|stk|stück|stueck|pieces|teile|perlen|blatt|steine|euro|eur|chf|usd|grad|ohm|stunden|std|min|minuten|tage|jahre|bewertungen|bewertung|kunden|sterne|mal|tvl|rpm|series|serie|millimeter|zentimeter|l(?:/h)?|meter|m)(?![\\p{L}])|%|[.,][0-9]|[x×*]\\s?[0-9]|-[0-9]|\\s[0-9]{2}\\s[0-9]{2}))';
const SILBERWORT = '(?:silber|silver|sterling)';
const FEINGEHALTE = '(?:9999|999|990|958|950|935|900|875|835|800)';

/** [Art, Muster]. Alle gegen den kleingeschriebenen, von HTML befreiten Text. */
const MUSTER = [
  // «925» nicht nach einem Buchstaben ausser s/ag («GT925», «CJ925» sind Modell- und Artikelnummern, «S925»/«Ag925» sind Feingehalt), nicht nach #, CHF, EUR, €, $, Nr., Tel., SKU, Seite
  ['925', new RegExp(`(?:(?<![\\p{L}#/])|(?<=(?<![\\p{L}])(?:s|ag)))${NICHT_ZAHL}(?<!(?:chf|eur|usd|€|\\$|nr\\.?|tel\\.?|sku|seite|preis:?|price:?)\\s?)925${ZAHL_ENDE}${EINHEIT_NACH}`, 'gu')],
  ['sterling', /sterling/g],
  // «aus echtem/reinem/massivem Silber», «Reinsilber», «Silber massiv», «pure/real/genuine/solid/fine/true silver», «Argentium»
  ['fein', /(?<![\p{L}])(?:(?:echt|rein|massiv)(?:e|er|em|en|es)[ -]?silber|(?:echt|rein|massiv)silber|feinsilber|silber massiv(?![\p{L}])|(?:fine|pure|real|genuine|solid|true)[ -]silver|argentium|plata de ley|argent massif|argent sterling)/gu],
  ['feingehalt-zahl', new RegExp(`${SILBERWORT}.{0,25}${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}|${NICHT_ZAHL}${FEINGEHALTE}${ZAHL_ENDE}${EINHEIT_NACH}.{0,25}${SILBERWORT}`, 'gu')],
  // Schmuck-Schreibweise ohne Silberwort: «S999», «S990», «Ag999», «Ag9999» (wie «S925», das oben schon allein genügt)
  // «Ag» allein ist das Silberzeichen, aber auch «Müller AG»: darum «Ag» nur mit Zahl ohne Trenner («Ag950») oder mit 999/990/9999 («Ag 999»)
  ['s-feingehalt', new RegExp(`(?<![\\p{L}\\p{N}])(?:(?:s|ag)[ -]?(?:9999|999|990)|ag(?:958|950|935|900|875|835|800))${ZAHL_ENDE}${EINHEIT_NACH}`, 'gu')],
  ['92,5', new RegExp(`${SILBERWORT}.{0,30}${NICHT_ZAHL}(?:92[.,]50?|99[.,]9|0[.,]925|0[.,]999)${ZAHL_ENDE}${EINHEIT_NACH}|${NICHT_ZAHL}(?:92[.,]50?|99[.,]9|0[.,]925|0[.,]999)${ZAHL_ENDE}${EINHEIT_NACH}.{0,30}${SILBERWORT}`, 'gu')],
  ['prozent', new RegExp(`${NICHT_ZAHL}(?:100|99[.,]9|99|95|92[.,]50?|90|80)\\s?%\\s?(?:aus |von |echtem |reinem )?silber(?![\\p{L}])|silber(?:anteil|gehalt|feingehalt)?[: ]{1,3}${NICHT_ZAHL}(?:100|99[.,]9|99|95|92[.,]50?|90|80)\\s?%`, 'gu')],
];

/**
 * Wörter, die zwischen einer Verneinung und der Fundstelle stehen dürfen, ohne dass die Verneinung aufhört: Artikel, Präpositionen, «echt/rein/massiv …», «oder/und»,
 * Bindestrich-Köpfe («Edelstahl-»). Jedes andere Wort beendet den Bereich: in «Ohne Nickel 925 Sterling Silber» oder «No Allergy 925 Silver» verneint «ohne Nickel»
 * NICHT die 925 (Titel tragen keine Satzzeichen; das war der Fund eines unabhängigen Prüfers am 17.11.2026).
 */
const FUELLWORT = '(?:aus|um|von|vom|mit|für|fuer|ein|eine|einen|einem|einer|eines|der|die|das|dem|den|des|echt\\p{L}*|rein\\p{L}*|massiv\\p{L}*|pur\\p{L}*|solid|real|genuine|any|a|an|the|to|als|zu|oder|und|or|and|of|from|silber|silver|sterling|[\\p{L}\\p{N}]+-|[\\p{L}\\p{N}]+\\s+(?:oder|or))';
/** Verneinung oder Vergleich unmittelbar vor der Fundstelle (höchstens vier Füllwörter dazwischen, im selben Satzteil): «nicht um Edelstahl- oder Sterlingsilber-Schmuck», «Anders als 925er Silber». */
const VERNEINUNG_DAVOR = new RegExp(`(?:^|[\\s(])(?:kein(?:e[nrsm]?)?|nicht|ohne|statt|anstelle(?: von)?|anstatt|nie|weder|anders als|im gegensatz zu|im vergleich zu|im unterschied zu|gegenüber|versus|vs|compared to|no|not|without|instead of|unlike)\\s+(?:${FUELLWORT}\\s+){0,4}$`, 'u');

export function bereinige(text) {
  // Zeilen- und Blockgrenzen (Zeilenumbruch, <br>, </p>, </li> …) werden zu einem Satzende: «Ohne Nickel</li><li>925 Silber» ist KEINE Verneinung der 925.
  // Nur echte Tags gelten als Tags (`<` vor Buchstabe, `/` oder `!`, höchstens 500 Zeichen bis `>`): «<5 g» frisst keinen Text, und viele `<` ohne `>` laufen nicht quadratisch.
  return String(text ?? '')
    .replace(/<\s*(?:br|\/p|\/li|\/div|\/h[1-6]|\/tr|\/td|\/ul|\/ol)\b[^<>]{0,300}>/gi, ' . ')
    .replace(/[\r\n\u2028\u2029]+/g, ' . ')
    .replace(/<\/?[a-z!][^<>]{0,500}>/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&shy;|&#173;|&#xad;/gi, '')
    .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Optionen in jeder üblichen Form: Text, [{name, values:[…]}] (Wächter), [{name, optionValues:[{name}]}] (Freigabe-Tor), Liste von Zeichenketten, einzelnes Objekt. */
export function optionsText(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  return (Array.isArray(o) ? o : [o]).map((x) => {
    if (x == null) return '';
    if (typeof x === 'string') return x;
    const werte = [].concat(x.values ?? [], (x.optionValues ?? []).map((v) => (typeof v === 'string' ? v : v?.name ?? '')), x.value ?? []).map(String);
    return `${x.name ?? ''}: ${werte.join(' / ')}`;
  }).join(' ; ');
}

/** Fundstellen in EINEM Feld. Rückgabe {treffer:[{art,text}], verneint:[{art,text}]}; text = Umgebung der Stelle (höchstens 100 Zeichen: Treffer höchstens 40 + je 30 Zeichen Umgebung). */
export function fundstellen(text, { ohneFein = false } = {}) {
  const t = bereinige(text);
  const treffer = [], verneint = [];
  for (const [art, re] of MUSTER) {
    if (ohneFein && art === 'fein') continue;      // «Pure Silver», «Reines Silber» in Optionen sind fast immer Farbnamen
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
 * Trifft eine Silber-Feingehaltsangabe zu? Felder: title, description und descriptionHtml (Text oder HTML), options (Text, [{name, values}] oder [{name, optionValues:[{name}]}]).
 * Rückgabe {treffer: boolean, belege: [{feld, art, text}], verneint: [{feld, art, text}]}.
 */
export function silberFeingehalt(p) {
  const felder = [['titel', p?.title], ['beschreibung', [p?.description, p?.descriptionHtml].filter(Boolean).join('\n')], ['option', optionsText(p?.options)]];
  const belege = [], verneint = [];
  for (const [feld, wert] of felder) {
    const f = fundstellen(wert, { ohneFein: feld === 'option' });
    for (const x of f.treffer) belege.push({ feld, ...x });
    for (const x of f.verneint) verneint.push({ feld, ...x });
  }
  return { treffer: belege.length > 0, belege, verneint };
}

export const istSilberFeingehalt = (p) => silberFeingehalt(p).treffer;

/** Kurze Beschreibung der Funde für Protokolle (höchstens drei Belege). */
export const belegText = (r) => r.belege.slice(0, 3).map((b) => `${b.feld}/${b.art}: «${b.text}»`).join(' | ');
