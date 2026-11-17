// Gold-/Platin-Feingehalt als MATERIAL einer Ware erkennen (reine Funktion, kein Netz, kein Shopify-Zugriff).
// Anlass: Schweizer Edelmetallkontrolle (EMKG Art. 7, 9; BAZG R-243, gelesen 17.11.2026): echtes Gold, Platin und Palladium brauchen gesetzlichen Feingehalt UND eine registrierte
// Verantwortlichkeitsmarke; auf Ersatzware («vergoldet») sind Karat und Feingehalt verboten (Beschreibung: dropship/gold-bazg-1711/README.md). Der Besitzer hat am 17.11.2026
// die 8 Produkte mit einer Gold-Feingehaltsangabe auf ENTWURF gesetzt und den täglichen Wächter für neue Fälle bejaht. Diese Regel nutzt der Wächter (dropship/gold-bazg-1711/gold_liste.mjs).
//
// Zwei Befunde:
//   «massiv»             Titel oder Beschreibung behaupten Gold (Platin, Palladium) mit Karat, Feingehalt oder «echt/rein/massiv» und der Text nennt NIRGENDS eine Plattierung
//                        (vergoldet, plattiert, PVD, galvanisiert, gold plated, gefüllt …). Das ist die Behauptung echter Edelmetallware: Entwurf.
//   «plattiert-mit-zahl» dieselbe Zahl, aber der Text nennt eine Plattierung (Ersatzware mit Karat). Nur Hinweis: der Text braucht die Karat-Bereinigung (karat_texte.mjs), das Produkt bleibt aktiv.
// Grundsatz: eine Behauptung zählt nur, wenn sie im Titel oder in der Beschreibung steht (Optionswerte wie «18K Gold» sind meist Farbnamen; sie zählen nur für den Plattierungsbefund),
// nicht nach einer Verneinung steht («kein echtes Gold») und nicht in einer Farbliste («erhältlich in Platin, Roségold und 18K Gold»). Gesichtspflege («24K Gold Serum») ist keine Edelmetallware.
// Bei Zweifel zwischen «massiv» und «plattiert» entscheidet der Text: steht auch nur ein Plattierungswort darin, wird NICHT automatisch entworfen (ein falscher Entwurf nimmt ein gutes Produkt vom Markt).
import { bereinige, optionsText } from './silber_feingehalt.mjs';

const S = String.raw;
const KARAT_ZAHL = S`(?:8|9|10|14|18|21|22|24)`;
/** «18K», «18 K», «18-K», «18kt», «18 Karat», «14 carat», «18-karätig»; nicht «18Kg», «24K-Hz» (Buchstabe/Ziffer direkt dahinter) und nicht als Teil einer längeren Zahl («118K», «1,18K»). */
const KARAT = new RegExp(S`(?<![\p{L}\p{N}])(?<![\p{N}][.,])${KARAT_ZAHL}\s?-?\s?(?:k|kt|karat|carat|karät\p{L}*)(?![\p{L}\p{N}])(?!\s?(?:hz|ohm|mah|bild|video|drohne|kamera|uhd|auflösung))`, 'gu');
/** Feingehalt in Tausendsteln («750er», «585», «999 Gold»), nicht als Teil einer längeren Zahl und nicht vor einer Einheit («750 ml», «585 mm»). */
const FEIN = new RegExp(S`(?<![\p{L}\p{N}.,])(?:333|375|417|585|750|916|999)(?:er)?(?![\p{L}\p{N}.,])(?!\s?(?:mm|cm|ml|mah|g\b|gr\b|kg|v\b|w\b|hz|ohm|stk|stück|pcs|teile|perlen|euro|eur|chf|usd|%|pa\b|lumen|lm\b))`, 'gu');
/** Au-/Pt-/Pd-Schreibweise des Feingehalts («Au750», «Pt950», «Pd500»). */
const AUPT = /(?<![\p{L}\p{N}])(?:au\s?-?\s?(?:333|375|417|585|750|916|999)|pt\s?-?\s?(?:850|900|950|999)|pd\s?-?\s?(?:500|950))(?![\p{L}\p{N}])/gu;
/** Ein Wort mit «gold» darin (Gold, Feingold, Roségold, Goldkette, Kaltgold …). */
const GOLDTOKEN = /[\p{L}\p{N}]*gold[\p{L}\p{N}]*(?:-(?:farb|ton|töne|optik|look|finish|glanz|schimmer)[\p{L}]*)?/gu;
/** Wörter mit «gold», die kein Material und keine Farbe der Ware sind (Tiere, Orte, Marken …) oder reine Farb-/Optik-Wörter. */
const GOLD_KEIN_MATERIAL = /^(?:[\p{L}\p{N}]*(?:goldfisch|goldfish|goldfinch|goldburg|goldmine|goldstandard|goldmedaille|golddetektor|goldschmied|goldkröte|goldzertifikat|goldbarren|goldwasser|goldbohne|goldrad|goldlöckchen|goldig|marigold|goldkapsel|goldbart|goldhamster|goldsieb|goldfaden|goldpalme|goldmünze|goldstern|goldkopf|goldpartikel|goldschuppen|goldkleber|goldhaut|goldobsidian)[\p{L}\p{N}]*|golden[\p{L}]*|gold-?(?:farb|ton|töne|optik|look|finish|glanz|schimmer)[\p{L}]*)$/u;
/** Zusammensetzungen, die «echtes/massives Gold» behaupten. «Hartgold» und «Kaltgold» sind Marketingwörter der Lieferanten für Echtgold-Qualität. «Vollgold» fehlt absichtlich (Uhrenfarbe). */
const ECHT = new RegExp(S`(?<![\p{L}\p{N}])(?:echt-?\s?gold|echtes?\s+gold|echtem\s+gold|echter\s+gold|real\s+gold|solid\s+gold|massive[rsnm]?\s+gold|massiv-?gold|reine[mrsn]?\s+gold|pure\s+gold|feingold|reingold|k-gold|hartgold|kaltgold)(?![\p{L}\p{N}])`, 'gu');
/** «aus reinem/echtem/massivem/feinem Gold»; ohne Eigenschaftswort («aus Gold», «Material: Gold») ist es meist eine Farbangabe und zählt nicht. */
const AUS_ECHT = /(?:besteht|bestehen|gefertigt|hergestellt|ist|sind|in)\s+(?:aus\s+)?(?:reinem|echtem|massivem|feinem)\s+gold/gu;
/** Platin und Palladium als Metall der Ware (nicht «Platin» als Farbe oder Marke). */
const PLATIN_METALL = /(?:(?:echtes|reines|echtem|reinem|massives|massivem|massiver)\s+(?:platin|palladium)(?![\p{L}])|massiv-?(?:platin|palladium)|(?:platin|platinum|palladium)\s?-?\s?(?:850|900|950|999|500)(?![\p{L}\p{N}]))/gu;
/**
 * Plattierung, Beschichtung, Veredelung: der Text sagt selbst, dass das Gold eine Schicht ist. «Gefüllt», «Auflage» und «Schicht» nur mit Gold davor (sonst «mit Wasser gefüllt»).
 * Rhodinieren und Platinieren fehlen absichtlich: auch echtes Weissgold wird rhodiniert, das ist kein Hinweis auf Ersatzware.
 */
const PLATTIERUNG = new RegExp([
  S`vergold`, S`plattier`, S`platier`, S`plated`, S`plating`, S`verplatt`, S`galvan`, S`beschicht`, S`überzog`, S`überzug`, S`pvd`, S`vermeil`,
  S`plaqu[eé](?![\p{L}])`, S`doubl[eé](?![\p{L}])`, S`coat(?:ed|ing)`, S`gold[\s-]?(?:auflage|schicht|füllung|gefüllt|filled)`, S`filled\s+gold`, S`veredel`,
].join('|'), 'u');
/** Gesichts- und Körperpflege mit Gold-Zusatz («24K Gold Serum»): keine Edelmetallware. */
const KOSMETIK = /(?:anti-?aging|serum|peeling|reinigungsgel|hauttyp|hyaluron|gesichts|lidschatten|make-?up|augenserum|tonikum|schmink|nagellack|kosmetik|gesichtsmaske|creme|lotion|elixir)/u;
const SCHMUCKWORT = /(?:^|[\s,;(-])(?:ring|ringe|kette|ketten|halskette|armband|armbänder|armreif|ohrring|ohrringe|ohrstecker|ohrhänger|ohrclip|ohrclips|anhänger|schmuck|collier|brosche|uhr|uhren|armbanduhr|taschenuhr|manschettenknöpfe|piercing|charm|fusskette|fußkette|kettchen|bracelet|bangle|necklace|earring|earrings|pendant)(?![\p{L}])/u;
/** Eine Farbliste unmittelbar vor der Fundstelle («erhältlich in Platin, Roségold und …», «Farben: …», «zur Wahl»). */
const FARB_VOR = /(?:farb\p{L}*|erhältlich in|verfügbar in|erhältlich als|erhältlich|wahlweise|zur wahl|ausführung|varianten?|in den tönen|töne|colors?|colours?|available in)[^.;|]{0,24}$/u;
/** Verneinung oder Vergleich unmittelbar vor der Fundstelle (höchstens drei Wörter dazwischen). */
const VERNEINUNG = /(?:^|[\s(])(?:kein(?:e[nrsm]?)?|nicht|ohne|statt|anstelle(?: von)?|anstatt|nie|weder|anders als|no|not|without|instead of|unlike)\s+(?:[\p{L}\p{N}-]+\s+){0,3}$/u;

/** Die Stelle des Treffers mit etwas Umgebung (höchstens 100 Zeichen), für Meldung und Belegsatz. */
const stelle = (t, i, n) => t.slice(Math.max(0, i - 28), Math.min(t.length, i + n + 36)).trim();

function alle(re, t) {
  re.lastIndex = 0;
  const aus = [];
  let m;
  while ((m = re.exec(t))) { aus.push({ i: m.index, t: m[0] }); if (m[0].length === 0) re.lastIndex++; }
  return aus;
}

/** Steinwörter: «10 Karat Moissanit», «Moissanit 10 Karat» ist das Gewicht des Steins, kein Feingehalt. */
const STEIN = S`(?:moissanit|diamant|zirkon\p{L}*|edelstein\p{L}*|stein\p{L}*|saphir|rubin|smaragd|opal|amethyst|topas|turmalin|granat|jade|achat|quarz|kristall)`;
const STEIN_DANACH = new RegExp(S`^\s*${STEIN}`, 'u'), STEIN_DAVOR = new RegExp(S`${STEIN}[\s:]*$`, 'u');
/** Ein Treffer zählt nicht nach einer Verneinung, in einer Farbliste und (bei Karat) nicht als Steingewicht. */
const gilt = (t, h) => {
  const davor = t.slice(Math.max(0, h.i - 60), h.i);
  if (VERNEINUNG.test(davor) || FARB_VOR.test(davor.slice(-45))) return false;
  if (h.art === 'karat' && (STEIN_DANACH.test(t.slice(h.i + h.t.length)) || STEIN_DAVOR.test(davor))) return false;
  return true;
};

/**
 * Befund für EIN Produkt: {art: 'massiv' | 'plattiert-mit-zahl' | null, grund, treffer: [{art, text, kern}]}.
 * `p` = {title, description, options?, productType?}; Titel und Beschreibung tragen die Behauptung, Optionen zählen nur für die Plattierung.
 */
export function goldBefund(p) {
  const titel = bereinige(p?.title), text = bereinige(p?.description);
  const ganz = `${titel} . ${text}`;
  const kosm = KOSMETIK.test(ganz) && !SCHMUCKWORT.test(`${titel} ${bereinige(p?.productType)}`);
  // 1. Behauptungen (nur Titel und Beschreibung)
  const treffer = [];
  const golds = alle(GOLDTOKEN, ganz).filter((g) => !GOLD_KEIN_MATERIAL.test(g.t));
  const zahlen = [['karat', KARAT], ['fein', FEIN], ['aupt', AUPT]].flatMap(([art, re]) => alle(re, ganz).map((h) => ({ ...h, art }))).sort((x, y) => x.i - y.i);
  // Zwei Zeiger statt Paarvergleich: eine Zahl zählt, wenn ein Goldwort höchstens 28 Zeichen entfernt steht (die Schleifengrenzen sind genau dieser Abstand), ohne Satzende (. ; |) dazwischen. Auch bei sehr langen Texten linear.
  let lo = 0;
  for (const z of zahlen) {
    if (!gilt(ganz, z)) continue;
    let nah = z.art === 'aupt';
    if (!nah) {
      while (lo < golds.length && golds[lo].i + golds[lo].t.length < z.i - 28) lo++;
      for (let j = lo; j < golds.length && golds[j].i <= z.i + z.t.length + 28 && !nah; j++) {
        const g = golds[j];
        const luecke = g.i >= z.i + z.t.length ? ganz.slice(z.i + z.t.length, g.i) : ganz.slice(g.i + g.t.length, z.i);
        if (!/[.;|]/.test(luecke)) nah = true;
      }
    }
    if (nah) treffer.push({ art: `zahl-${z.art}`, kern: z.t, i: z.i, text: stelle(ganz, z.i, z.t.length) });
  }
  for (const [art, re] of [['echt', ECHT], ['aus-echt', AUS_ECHT], ['platin', PLATIN_METALL]]) {
    for (const h of alle(re, ganz)) { if (gilt(ganz, h)) treffer.push({ art, kern: h.t, i: h.i, text: stelle(ganz, h.i, h.t.length) }); }
  }
  // «aus 18 Kaltgold» (Lieferantendeutsch) fängt ECHT über das Wort «Kaltgold»; die Zahl davor braucht kein K.
  if (!treffer.length) return { art: null, grund: kosm ? 'kosmetik' : 'keine Behauptung', treffer: [] };
  if (kosm) return { art: null, grund: 'kosmetik', treffer: [] };
  // 2. Plattierung irgendwo im Produkt (Titel, Beschreibung, Optionen)?
  const plattText = `${ganz} . ${bereinige(optionsText(p?.options))}`;
  const platt = PLATTIERUNG.exec(plattText);
  const kopf = treffer.sort((a, b) => a.i - b.i).slice(0, 3).map(({ art, kern, text }) => ({ art, kern, text }));
  if (platt) {
    const mitZahl = treffer.some((x) => x.art.startsWith('zahl-'));
    return mitZahl ? { art: 'plattiert-mit-zahl', grund: `Plattierung im Text («${platt[0]}»)`, treffer: kopf } : { art: null, grund: `Plattierung im Text («${platt[0]}»), keine Zahl`, treffer: kopf };
  }
  return { art: 'massiv', grund: 'Gold-Feingehalt ohne Plattierung im Text', treffer: kopf };
}

/** Der Arbeits-Tag des Gold-Wächters (wie dropship/gold-bazg-1711/gold_entwurf.mjs, MARKER_GOLD). */
export const GOLD_MARKER = 'bazg-gold-1711';

/**
 * Wählt aus dem gelesenen Katalog (aktive Produkte, Form {id, handle, title, description, productType, tags, options}) die Produkte für den Wächter.
 * Rückgabe {eintraege: [{handle, id, art, treffer}], hinweise: [{handle, id, art, treffer}]}; `ausnahmen` = Menge von Handles, die nie angefasst werden (nach Einzelprüfung keine Angabe).
 */
export function waehleGold(produkte, { ausnahmen = new Set() } = {}) {
  const eintraege = [], hinweise = [];
  for (const p of produkte || []) {
    if (!p?.handle || !p?.id) continue;
    if (ausnahmen.has(p.handle)) continue;
    if ((p.tags || []).includes(GOLD_MARKER)) continue;
    const b = goldBefund(p);
    if (b.art === 'massiv') eintraege.push({ handle: p.handle, id: p.id, art: b.art, treffer: b.treffer });
    else if (b.art === 'plattiert-mit-zahl') hinweise.push({ handle: p.handle, id: p.id, art: b.art, treffer: b.treffer });
  }
  return { eintraege, hinweise };
}
