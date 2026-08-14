// Materialwert für den Google-Feed (mm-google-shopping.material) — die JS-Fassung der
// Erkennung aus `automation/material_metafeld_korrigieren.py`, damit der Importer den
// Fehler nicht bei jedem neuen Produkt neu anlegt.
//
// WARUM ES DIESE DATEI GIBT (14.08.2026): Am 11.08. wurde in cj_category_fill.mjs der
// Ausdruck gekürzt auf «nur das Materialwort», weil er zuvor «Polyester Style» und
// «Plastic Packing list» in den Feed schrieb. Das behob die eine Hälfte des Fehlers und
// legte die andere frei: aus «PU leather» nahm die MATWORDS-Liste das erste passende
// Wort — «leather» — und schrieb «Leather». Aus «Stainless steel» wurde «Stainless»,
// aus «18k Gold plattiert» wurde «Gold». Am 14.08. standen deshalb live:
//   · 176 Produkte mit material="Leather", deren Beschreibung PU-/Kunstleder nennt
//     (Merchant-Center-Misrepresentation, in der Schweiz zusätzlich UWG-relevant —
//     «Leder» ist ein geschützter Begriff für tierisches Leder),
//   · 446 Produkte mit dem Wert "Stainless" (kein Materialname, Google kann ihn
//     keinem Material-Filter zuordnen),
//   · 16 Schmuckstücke mit "Gold"/"Silver" für vergoldetes Kupfer oder Messing
//     (Edelmetallkontrollgesetz).
// Ein Aufräumlauf allein hätte nur den Bestand geputzt; der Importer hätte den Fehler ab
// dem nächsten Produkt weitergeschrieben. Regel: Zu jedem Backfill gehört die Frage, wer
// das Feld beim NÄCHSTEN Produkt schreibt.
//
// GRUNDSÄTZE:
//  · Spezifisch vor allgemein — «PU leather» muss VOR «leather» geprüft werden, sonst
//    gewinnt der Oberbegriff und aus Kunstleder wird Leder.
//  · Alle Muster mit Wortgrenzen. Ohne sie steckt «eiche» in «weichem», «leinen» in
//    «kleinen» und «pc» in «für PC und Laptop» — im Probelauf des Aufräumers hätte das
//    drei Hoodies auf «Holz» und «Leinen» gesetzt.
//  · Ist ein Edelmetall nur aufgetragen (vergoldet/plattiert/galvanisiert), wird NICHT
//    «Gold» geschrieben. Ohne Beleg für die Basis lieber gar nichts.
//  · Deutsche Namen — Beschreibung, Storefront und Feed-Sprache sind Deutsch.
//  · Kein Treffer heisst: kein Metafeld. Ein leerer Wert ist im Feed besser als ein falscher.

const MUSTER = [
  ['Mikrofaserleder', /\bmikrofaser[-\s]?leder\w*|\bmicrofib(?:er|re)\s?leather\b/i],
  ['PU-Leder',        /\bpu[-\s]?leder\w*|\bpu[-\s]?leather\b|\bpolyurethan[-\s]?leder\w*/i],
  ['Kunstleder',      /\bkunstleder\w*|\bleder-?imitat\w*|\bimitation\s?leather\b|\bsynthetic\s?leather\b|\bartificial\s?leather\b|\bfaux[-\s]?leather\b|\bfaux[-\s]?leder\w*|\bveganes?\s?leder\b|\bvegan\s?leather\b/i],
  ['Wildleder',       /\bwildleder\w*|\bveloursleder\w*/i],
  ['Echtleder',       /\bechtleder\w*|\bechtes\s?leder\b|\brinds?leder\w*|\blammleder\w*|\bziegenleder\w*|\bkalbsleder\w*|\bb[üu]ffelleder\w*|\bgenuine\s?leather\b|\bcowhide\b|\breal\s?leather\b|\bvollleder\w*|\bnappa\w*/i],
  ['Leder',           /\bleder\b|\bleather\b/i],
  ['Baumwolle',       /\bbaumwoll\w*|\bcotton\b/i],
  ['Leinen',          /\bleinen\w*|\blinen\b/i],
  ['Polyester',       /\bpolyesterfaser\w*|\bpolyester\w*/i],
  ['Elastan',         /\belastan\w*|\bspandex\b|\blycra\b/i],
  ['Viskose',         /\bviskose\b|\bviscose\b|\brayon\b/i],
  ['Nylon',           /\bnylon\w*|\bpolyamid\w*/i],
  ['Eisseide',        /\bice\s?silk\b|\beisseide\b/i],
  ['Seide',           /\bseide\w*|\bsilk\b/i],
  ['Wolle',           /(?<!baum)\bwolle\b|\bwool\b|\bmerino\w*/i],
  ['Kaschmir',        /\bkaschmir\w*|\bcashmere\b/i],
  ['Flanell',         /\bflanell\w*|\bflannel\b/i],
  ['Fleece',          /\bfleece\w*|\bvlies\w*/i],
  ['Acryl',           /\bacryl\w*|\bacrylic\b/i],
  ['Denim',           /\bdenim\b|\bjeansstoff\w*/i],
  ['Canvas',          /\bcanvas\b|\bsegeltuch\w*/i],
  ['Frottee',         /\bfrottee\w*|\bterry\b/i],
  ['Chiffon',         /\bchiffon\b/i],
  ['Satin',           /\bsatin\b/i],
  ['Jersey',          /\bjersey\b/i],
  ['Modal',           /\bmodal\b/i],
  ['Tencel',          /\btencel\b|\blyocell\b/i],
  ['Netzstoff',       /\bnetzstoff\w*|\bmesh\b|\bt[üu]ll\b|\btulle\b/i],
  ['Oxford-Gewebe',   /\boxford\b/i],
  ['Neopren',         /\bneopren\w*|\bneoprene\b/i],
  ['Edelstahl',       /\bedelstahl\w*|\bstainless\s?steel\b|\bstainless\b|\brostfreie[rmn]?\s?stahl\b/i],
  ['Titanstahl',      /\btitanstahl\w*|\btitanium\s?steel\b/i],
  ['Stahl',           /\bstahl\b|\bsteel\b/i],
  ['Titan',           /\btitan\b|\btitanium\b/i],
  ['Aluminium',       /\baluminium\w*|\baluminum\b|\bal-alloy\b/i],
  ['Messing',         /\bmessing\b|\bbrass\b/i],
  ['Kupfer',          /\bkupfer\w*|\bcopper\b/i],
  ['Zinklegierung',   /\bzinklegierung\w*|\bzinc\s?alloy\b/i],
  ['Sterlingsilber',  /\bs?925\w*|\bsterling\s?silver\b|\bsterlingsilber\b/i],
  ['Legierung',       /\blegierung\w*|\balloy\b/i],
  ['Gold',            /\bgold\b|\bgolden\b/i],
  ['Silber',          /\bsilber\b|\bsilver\b/i],
  ['Platin',          /\bplatin\b|\bplatinum\b/i],
  ['Metall',          /\bmetall\b|\bmetal\b/i],
  ['Silikon',         /\bsilikon\w*|\bsilicone\b/i],
  ['Gummi',           /\bgummi\w*|\brubber\b|\bkautschuk\b/i],
  ['ABS-Kunststoff',  /\babs\b/i],
  ['Kunststoff',      /\bkunststoff\w*|\bplastik\w*|\bplastic\b|\bpvc\b|\bpolypropylen\w*|\bpolycarbonat\w*|\bresin\b/i],
  ['Bambus',          /\bbambus\w*|\bbamboo\b/i],
  ['Holz',            /\bholz\w*|\bwood\w*/i],
  ['Glas',            /\bglas\b|\bglass\b/i],
  ['Keramik',         /\bkeramik\w*|\bceramic\b|\bporzellan\w*/i],
  ['Papier',          /\bpapier\w*|\bpaper\b|\bkarton\w*/i],
  ['Filz',            /\bfilz\w*|\bfelt\b/i],
  ['Kork',            /\bkork\b|\bcork\b/i],
  ['Marmor',          /\bmarmor\w*|\bmarble\b/i],
];

// Edelmetall nur aufgetragen? Dann ist der Artikel keine Gold-/Silberware.
const PLATTIERT = /\bvergolde\w*|\bversilber\w*|\bplattier\w*|\bplated\b|\bgalvanis\w*|\belectroplat\w*|\b[üu]berzug\w*|\bbeschicht\w*/i;
const EDELBASIS = /\bs?925\w*|\bs?999\w*|\bsterling\b|\b585\b|\b750\b|\bmassive[smr]?\s+(?:silber|gold)\b/i;
// Feldlabel, die im CJ-Rohtext direkt hinter dem Material stehen — kein Materialname.
const NUR_LABEL = /^(?:name|type|typ|color|colour|farbe|size|art|composition|material)\b/i;

/**
 * Liefert den kanonischen deutschen Materialnamen zu einem CJ-Rohtext (Attributblock,
 * Beschreibung), oder null wenn sich nichts Belegbares finden lässt.
 */
export function materialKanonisch(text) {
  if (!text) return null;
  const roh = String(text).replace(/\s+/g, ' ').trim();
  if (!roh || NUR_LABEL.test(roh)) return null;

  // Frühester Treffer im Text gewinnt; bei gleicher Position der spezifischere (frühere
  // Listeneintrag), damit «PU leather» nicht als «Leder» durchgeht.
  let besterPos = Infinity, bestesMat = null;
  for (const [name, rx] of MUSTER) {
    const m = rx.exec(roh);
    if (m && m.index < besterPos) { besterPos = m.index; bestesMat = name; }
  }
  if (!bestesMat) return null;

  if ((bestesMat === 'Gold' || bestesMat === 'Silber' || bestesMat === 'Platin')
      && PLATTIERT.test(roh) && !EDELBASIS.test(roh)) {
    // Aufgetragenes Edelmetall: das Basismetall ist die Wahrheit, sonst gar nichts.
    for (const name of ['Nickelsilber', 'Messing', 'Kupfer', 'Zinklegierung', 'Edelstahl', 'Legierung']) {
      const rx = (MUSTER.find(x => x[0] === name) || [])[1]
              || (name === 'Nickelsilber' ? /\bnickelsilber\b|\bneusilber\b/i : null);
      if (rx && rx.test(roh)) return `${name}, ${bestesMat === 'Silber' ? 'versilbert' : 'vergoldet'}`;
    }
    return null;
  }
  return bestesMat;
}

export default materialKanonisch;
