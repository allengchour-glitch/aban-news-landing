/**
 * Belegpflicht für Kategorie-Texte (SPEC-Regel 6 «Kein Fachwort ohne Beleg», Auftrag-Regel 4 «keine erfundenen Fakten»):
 * Titel, Beschreibung und Suchmaschinen-Text einer Kategorie dürfen nur Stoffe, Steine, Motive, Stile und Formen nennen, die in den Titeln ihrer Mitglieder wirklich vorkommen.
 * Die Gegenlesung vom 27.10.2026 fand sieben Beschreibungen mit Wörtern ohne Beleg («Naturstein» bei Herrenarmbändern: 0 von 46 Titeln, «Hamsa» bei Glücksschmuck: 0 von 52,
 * «Panzerketten» bei Gliederketten: 0 von 18, «Süsswasserperlen» bei Perlen-Ohrringen: 0 von 28 …). Diese Beschreibungen stehen als Collection-Text im Shop.
 *
 * WORTSCHATZ = [Anzeigename, Regex-Quelle]; dieselbe Regex gilt für den Text und für die Titel (Gross/Klein egal). Reine Produktarten («Ringe», «Ketten») stehen NICHT darin:
 * die Art bestimmt die Google-Kategorie, nicht der Titel. Neue Wörter hier ergänzen, wenn eine Beschreibung ein neues Material oder Motiv nennt.
 * Wortgrenze links: `(^|[^a-zäöüß])`, JavaScript-`\b` kennt keine Umlaute.
 */
const L = '[^a-zäöüß]';
export const WORTSCHATZ = [
  // Metalle und Werkstoffe
  ['Leder', `(^|${L})leder|kunstleder`], ['Stahl', 'stahl'], ['Titan', 'titan'], ['Wolfram', 'wolfram|tungsten'], ['Kupfer', 'kupfer'], ['Messing', 'messing'], ['Silber', 'silber|925|sterling'],
  ['Gold', `(^|${L})gold|vergold`], ['Bronze', 'bronze'], ['Holz', 'holz'], ['Glas', `(^|${L})glas`], ['Keramik', 'keramik'], ['Harz', `(^|${L})harz`], ['Emaille', 'emaille|email'], ['Acryl', 'acryl'],
  ['Kautschuk', 'kautschuk|silikon'], ['Baumwolle', 'baumwoll'], ['Seide', `(^|${L})seide`],
  // Perlen und Steine
  ['Perlen', 'perle|perlen'], ['Süsswasserperlen', 'süsswasser'], ['Perlmutt', 'perlmutt'], ['Naturstein', 'naturstein|natürliche[nrms]? (edel)?stein'], ['Edelstein', 'edelstein'], ['Halbedelstein', 'halbedelstein'],
  ['Geburtsstein', 'geburtsstein'], ['Achat', 'achat|agat'], ['Amethyst', 'amethyst'], ['Tigerauge', 'tiger-?auge'], ['Opal', `(^|${L})opal`], ['Jade', 'jade|jadeit'], ['Onyx', 'onyx'], ['Türkis', 'türkis'],
  ['Quarz', 'quarz'], ['Lapislazuli', 'lapis'], ['Obsidian', 'obsidian'], ['Bernstein', 'bernstein'], ['Koralle', 'koralle'], ['Mondstein', 'mondstein'],
  ['Zirkonia', 'zirkon|zircon'], ['Strass', 'strass|rhinestone'], ['Kristall', 'kristall|crystal'], ['Moissanit', 'moissan'], ['Diamant', 'diamant'], ['Solitär', 'solit'],
  // Verarbeitung
  ['Gravur', 'gravur|gravier'], ['Namen', `(^|${L})namen?(?![a-zäöüß])`], ['Buchstaben', 'buchstab|initial'], ['Magnet', 'magnet'], ['verstellbar', 'verstellbar|anpassbar|einstellbar'], ['geflochten', 'geflecht|geflochten'],
  ['gewebt', 'gewebt|gewoben'], ['Kordel', `kordel|(^|${L})seil`], ['Wickel', 'wickel'], ['Knoten', 'knoten'],
  ['Halo', `(^|${L})halo`], ['Verschluss', 'verschluss|verschlüsse'], ['Werkzeug', 'werkzeug'], ['Set', `set(s)?(?![a-zäöüß])`], ['elastisch', 'elastisch|stretch|dehnbar'],
  // Motive
  ['Herz', `(^|${L})(herz|herzen|herzförmig)`], ['Kreuz', `(^|${L})kreuz(?!stich)`], ['Stern', `(^|${L})stern(?!zeichen)|sternen`], ['Sternzeichen', 'sternzeichen'], ['Mond', `(^|${L})mond|halbmond`], ['Sonne', `(^|${L})sonne(?!nbrill)`],
  ['Blumen', 'blume|blüte|floral|rose|lotus'], ['Schmetterling', 'schmetterling'], ['Katze', 'katze'], ['Pferd', 'pferd'], ['Schlange', 'schlange'], ['Drache', 'drache'], ['Löwe', 'löwe'], ['Fuchs', 'fuchs'], ['Eule', `(^|${L})eule`],
  ['Kleeblatt', 'kleeblatt|glücksklee'], ['Teufelsauge', 'teufelsauge|dämonenauge|evil ?eye|böse'], ['Hamsa', 'hamsa|hamsah|fatima'], ['Amulett', 'amulett'], ['Hufeisen', 'hufeisen'], ['Talisman', 'talisman'], ['Buddha', 'buddha'],
  ['Totenkopf', 'totenkopf|schädel|skull'],
  // Stile und Formen
  ['Punk', 'punk(?!t)'], ['Gothic', 'gothic'], ['Hip-Hop', 'hip-?hop'], ['Boho', 'boho'], ['Ethno', 'ethno'], ['nordisch', 'nordisch'], ['keltisch', 'keltisch'], ['tibetisch', 'tibet'],
  ['chinesisch', 'chinesisch'], ['koreanisch', 'korea'], ['französisch', 'französ|frankreich|french|france'], ['japanisch', 'japanisch'], ['Old Money', 'old money|old-money'], ['Vintage', 'vintage'], ['Retro', 'retro'], ['Antik', 'antik'],
  ['geometrisch', 'geometr'], ['Kreis', `(^|${L})(kreis|kreisförmig)`], ['Dreieck', 'dreieck'], ['Quadrat', 'quadrat'], ['Rhombus', 'rhombus|raute'], ['minimalistisch', 'minimalist'],
  // Kettenarten und Ohrschmuck-Bauformen
  ['Panzer', 'panzer'], ['Cuban', 'cuban|kubanisch'], ['Rolo', 'rolo'], ['Tennis', 'tennis'], ['Choker', 'choker'], ['Creolen', 'creole'], ['Huggies', 'huggie'], ['Ohrclips', 'ohrclip|ohrklemme|ear ?cuff'],
];
const cache = new Map();
const rx = q => { let r = cache.get(q); if (!r) { r = new RegExp(q, 'i'); cache.set(q, r); } return r; };

/**
 * Welche Wörter des WORTSCHATZES stehen im `text`, kommen aber in weniger als `min` der `titel` vor?
 * @returns {{wort:string, treffer:number}[]}  leer = alles belegt
 */
export function unbelegt(text, titel, min = 2) {
  const aus = [];
  for (const [wort, q] of WORTSCHATZ) {
    const r = rx(q);
    if (!r.test(text)) continue;
    const treffer = titel.filter(t => r.test(t)).length;
    if (treffer < min) aus.push({ wort, treffer });
  }
  return aus;
}
