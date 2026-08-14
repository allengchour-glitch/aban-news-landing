/* marken_filter.mjs — entfernt Nachahmungs-Behauptungen fremder Luxusmarken aus
 * frisch erzeugten Produkttiteln und -beschreibungen, BEVOR das Produkt angelegt wird.
 *
 * WARUM ES DAS BRAUCHT (Regel: zu jedem Backfill gehört die Quelle)
 * ----------------------------------------------------------------
 * Am 14.08.2026 mussten 42 aktive Produkte von «im Chanel-Stil», «Dr.-Martens-Stil»,
 * «Birkenstock-inspiriert» befreit werden (automation/marken_nachahmung_bereinigen.py).
 * Die Aussage stammt NICHT von uns: CJ-Lieferantenlistings schreiben «Chanel style» in
 * Produktnamen und Feature-Text, die Übersetzung übernimmt es wörtlich. Der Prompt in
 * cj_category_fill.mjs sagt zwar «keine Marke erfinden» — das Modell erfindet auch nichts,
 * es übersetzt korrekt, was im Quelltext steht. Ein Prompt kann das also gar nicht
 * verhindern; nötig ist ein deterministischer Filter NACH der Erzeugung.
 * Ohne ihn entstünden mit jedem Importlauf neue Fälle, und die Bereinigung von heute wäre
 * in zwei Wochen wieder fällig — genau das Muster, das bei condition und
 * google_product_category schon zweimal Geld gekostet hat.
 *
 * WAS ER NICHT ANFASST
 * --------------------
 * · Kompatibilitätsangaben («für iPhone», «passend für Apple Watch», «Adapter für Dyson»,
 *   «für Mercedes-Benz») — diese Marken stehen bewusst NICHT in der Liste.
 * · Echte Markenware (BigBuy, SKU bb-…) — dieser Filter läuft nur in den CJ-Importern.
 * · Deutsche Wörter, die Marken enthalten: «KochtechNIKEn», «OcCASIOn», «Barbier»,
 *   «OMEGA-Fettsäuren», «Off-White» als Farbe. Dagegen schützen die Wortgrenzen unten;
 *   ein erster Entwurf ohne sie hatte bei 407 Treffern 369 Fehltreffer.
 */

const MARKEN = [
  'Chanel', 'Gucci', 'Prada', 'Dior', 'Louis\\s?Vuitton', 'Herm[eè]s', 'Hermes', 'Rolex',
  'Balenciaga', 'Versace', 'Burberry', 'Fendi', 'Givenchy', 'Valentino', 'Bottega\\s?Veneta',
  'Cartier', 'Dr\\.?\\s?Martens', 'Doc\\s?Martens', 'Birkenstock', 'Crocs', 'Converse',
  'Supreme', 'Swarovski', 'Bulgari', 'Bvlgari', 'Chopard', 'Louboutin', 'Jimmy\\s?Choo',
  'Michael\\s?Kors', 'Tommy\\s?Hilfiger', 'New\\s?Balance', 'Nike', 'Adidas', 'Puma',
  'Timberland', 'Lululemon', 'Ray-?Ban', 'Moncler', 'Barbie',
].join('|');
const M = `(?:${MARKEN})`;
const G = '(?<![\\wäöüßÄÖÜ])';        // linke Wortgrenze, umlautfest
const GR = '(?![\\wäöüßÄÖÜ])';        // rechte Wortgrenze — schützt «Barbier», «Nikeh…»

// Reihenfolge = Vorrang: Satzbauformen zuerst, sonst zerreisst die allgemeine Regel
// «Er ist inspiriert von Chanel und besteht aus Polyester» zu «Er ist besteht aus…».
const REGELN = [
  [`${G}pr[äa]sentieren sich im\\s+${M}[-\\s]?Stil und\\s+`, ''],
  [`,\\s*d(?:ie|as|er) an den ikonischen\\s+${M}[-\\s]?Stil erinnert`, ''],
  [`${G}ist inspiriert von\\s+${M}\\s+und\\s+`, ''],
  [`${G}ist von\\s+${M}\\s+inspiriert und\\s+`, ''],
  [`,\\s*inspiriert von\\s+${M}${GR}`, ''],
  [`${G}Inspiriert vom\\s+${M}[-\\s]?Stil,\\s*verleiht sie${GR}`, 'Sie verleiht'],
  [`${G}von den klassischen\\s+${M}-Designs inspiriert${GR}`, 'von klassischen Designs inspiriert'],
  [`${G}Klassisches\\s+${M}-inspiriertes Design${GR}`, 'Klassisches Design'],
  [`${G}${M}-inspirierte und minimalistische${GR}`, 'klassische und minimalistische'],
  [`${G}${M}-inspiriertes Design${GR}`, 'Elegantes Design'],
  [`${G}${M}-inspirierter Stil${GR}`, 'Zeitloser Stil'],
  [`${G}f[üu]r\\s+${M}-inspirierte Mode${GR}`, 'für elegante Mode'],
  [`,\\s*${M}-inspiriert(?=[<.\\s]|$)`, ''],
  [`,\\s*${M}-inspirierte[nmrs]${GR}`, ''],
  [`${G}${M}-inspirier\\w*\\s+`, ''],
  [`${G}${M}-[äa]hnliche[nmrs]?\\s+`, ''],
  [`\\s*${G}im\\s+(?:[\\wäöüß]+en\\s+)?${M}[-\\s]?Stil${GR}`, ''],
  [`\\s*${G}im\\s+(?:[\\wäöüß]+en\\s+)?${M}[-\\s]?Style${GR}`, ''],
  [`${G}${M}[-\\s]?Stil\\s+(?=[a-zäöü])`, ''],
  [`${G}${M}[-\\s]?Design,\\s*`, ''],
  [`,\\s*${M}(?=,)`, ''],
  [`${G}${M}\\s+(?=(?:Orange|Schwarz|Blau|Gr[üu]n|Rot|Weiss|Wei[sß]|Gelb|Rosa|Lila|Braun|`
   + `Grau|Silber|Gold|Beige|Night|Blossom))`, ''],
].map(([a, b]) => [new RegExp(a, 'gi'), b]);

const RX_MARKE = new RegExp(`${G}${M}${GR}`, 'i');

/** Entfernt Nachahmungs-Behauptungen. Fällt keine Regel, kommt der Text unverändert zurück. */
export function markenbezugEntfernen(text) {
  if (!text) return text;
  let n = text;
  for (const [rx, ers] of REGELN) n = n.replace(rx, ers);
  if (n === text) return text;
  n = n.replace(/[ \t]{2,}/g, ' ')
       .replace(/[ \t]+([,.;:!?])/g, '$1')
       .replace(/<(li|p)>[ \t]+/g, '<$1>')
       .replace(/[ \t]+<\/(li|p)>/g, '</$1>')
       .replace(/(<li>)([a-zäöü])/g, (m, a, b) => a + b.toUpperCase());
  return n.trim() === n ? n : n.trim();
}

/** true, wenn nach dem Filter noch ein Markenname steht — dann Produkt lieber überspringen. */
export function markeUebrig(text) {
  return !!text && RX_MARKE.test(text);
}

/**
 * Bequemer Aufruf für die Importer: säubert Titel + HTML und meldet, ob noch etwas übrig ist.
 * Ein Titel, der nach dem Schnitt auf einer Präposition endet («Lenkradblende für»), ist eine
 * Satzruine — genau die sechs standen am 14.08. kundensichtbar im Shop. Dann lieber den
 * ungefilterten Titel behalten und das Produkt melden, als eine Ruine zu veröffentlichen.
 */
export function produktSaeubern(title, html) {
  const t = markenbezugEntfernen(title);
  const h = markenbezugEntfernen(html);
  const ruine = /\b(f[üu]r|mit|von|im|in|aus|und|zu)\s*$/i.test(t.trim()) || t.trim().length < 6;
  return {
    title: ruine ? title : t,
    html: h,
    verdacht: ruine || markeUebrig(t) || markeUebrig(h),
  };
}
