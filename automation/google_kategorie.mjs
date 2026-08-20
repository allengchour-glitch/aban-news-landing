// Google-Produktkategorie für neu importierte Ware — die JS-Fassung von
// `automation/google_kategorie.py`, damit der Importer das Feld MITSCHREIBT.
//
// WARUM ES DIESE DATEI GIBT (12.08.2026): Am 11.08. hob ein Einmal-Lauf die Abdeckung von 6 %
// auf 87 %. Einen Tag später trugen von 1'912 neu importierten Produkten genau 6 eine
// Kategorie — 0 %. Der Importer schrieb das Feld nicht mit, also wäre die Abdeckung täglich
// um rund zwei Prozentpunkte zurückgefallen, und irgendwann hätte wieder jemand einen
// Einmal-Lauf gestartet. Exakt derselbe Fehler war Stunden zuvor bei `condition` behoben
// worden — eine Feldebene weiter steckte er unverändert drin.
//
// Regel daraus: Ein Nachfüll-Skript ist die Reparatur, nie die Lösung. Zu jedem Feld, das ein
// Backfill füllt, gehört die Frage, wer es beim NÄCHSTEN Produkt schreibt.
//
// ⚠️ Alle Pfade sind gegen Googles Quelldatei geprüft
// (google.com/basepages/producttype/taxonomy-with-ids.en-US.txt). Insbesondere gibt es KEINEN
// Zweig «Wearable Technology» — der stammt aus Shopifys Taxonomie und wird von Google
// verworfen. Smartwatches gehören zu «Apparel & Accessories > Jewelry > Watches».

// Titelmuster stechen die Tags: der Tag `uhren` klebt auch auf Smartwatches.
const VORRANG = [
  // Schulrucksäcke (15.08.2026, Schulstart-Serie): «rucksack» hat sonst keine Regel und die
  // Tags sagen «taschen» — Handtaschen wären falsch. Gegen die Quelldatei geprüft:
  // Zeile 4089 «100 - Luggage & Bags > Backpacks».
  [/rucksack|backpack|schulranzen/i, 'Luggage & Bags > Backpacks'],
  [/smart\s*-?\s*watch|smartuhr/i, 'Apparel & Accessories > Jewelry > Watches'],
  [/fitness\s*-?\s*(tracker|armband)|activity\s*tracker/i,
   'Apparel & Accessories > Jewelry > Watches'],
];

// Reihenfolge ist Bedeutung: das Genauere zuerst, das Grobe zuletzt.
const NACH_TAG = [
  ['kategorie-halskette', 'Apparel & Accessories > Jewelry > Necklaces'],
  ['halskette',           'Apparel & Accessories > Jewelry > Necklaces'],
  ['kategorie-ohrring',   'Apparel & Accessories > Jewelry > Earrings'],
  ['ohrringe',            'Apparel & Accessories > Jewelry > Earrings'],
  ['kategorie-armband',   'Apparel & Accessories > Jewelry > Bracelets'],
  ['kategorie-ring',      'Apparel & Accessories > Jewelry > Rings'],
  ['kategorie-uhr',       'Apparel & Accessories > Jewelry > Watches'],
  ['uhren',               'Apparel & Accessories > Jewelry > Watches'],
  ['sonnenbrille',        'Apparel & Accessories > Clothing Accessories > Sunglasses'],
  ['kategorie-tasche',    'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'],
  ['damen-taschen',       'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'],
  ['damenschuhe',         'Apparel & Accessories > Shoes'],
  ['herrenschuhe',        'Apparel & Accessories > Shoes'],
  ['schuhe',              'Apparel & Accessories > Shoes'],
  ['kategorie-kleid',     'Apparel & Accessories > Clothing > Dresses'],
  ['schmuck',             'Apparel & Accessories > Jewelry'],
  ['haarstyling',         'Health & Beauty > Personal Care > Hair Care'],
  ['beauty',              'Health & Beauty > Personal Care > Cosmetics'],
  ['pflege',              'Health & Beauty > Personal Care'],
  ['haustier',            'Animals & Pet Supplies > Pet Supplies'],
  ['pet',                 'Animals & Pet Supplies > Pet Supplies'],
  ['beleuchtung',         'Home & Garden > Lighting'],
  ['kueche',              'Home & Garden > Kitchen & Dining'],
  ['dekoration',          'Home & Garden > Decor'],
  ['aufbewahrung',        'Home & Garden > Household Supplies > Storage & Organization'],
  ['fitness',             'Sporting Goods > Exercise & Fitness'],
  ['garten',              'Home & Garden > Lawn & Garden'],
  ['auto',                'Vehicles & Parts > Vehicle Parts & Accessories'],
  ['gaming',              'Electronics > Video Game Console Accessories'],
  ['elektronik',          'Electronics'],
  ['tech',                'Electronics'],
  ['kinder',              'Baby & Toddler'],
  ['mode',                'Apparel & Accessories > Clothing'],   // zuletzt: trägt fast jedes Teil
];

const NACH_TYP = {
  'Auto-Zubehör':             'Vehicles & Parts > Vehicle Parts & Accessories',
  'Basteln & DIY':            'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts',
  'Taschen':                  'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
  'Spielzeug & Spiele':       'Toys & Games > Toys',
  'Gaming-Zubehör':           'Electronics > Video Game Console Accessories',
  'Werkzeug & Heimwerken':    'Hardware > Tools',
  'Werkzeug':                 'Hardware > Tools',
  'Gartenwerkzeug':           'Home & Garden > Lawn & Garden',
  'Garten & Pflanzen':        'Home & Garden > Lawn & Garden',
  'Musikinstrumente':         'Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments',
  'Sport & Outdoor':          'Sporting Goods',
  // Party Supplies hängt bei Google unter «Arts & Entertainment», nicht unter Home & Garden.
  'Partydeko & Ballone':      'Arts & Entertainment > Party & Celebration > Party Supplies',
  'Audio':                    'Electronics > Audio',
  'Beauty Tools':             'Health & Beauty > Personal Care > Cosmetics',
  'Beauty & Pflege':          'Health & Beauty > Personal Care',
  'Wellness & Spa':           'Health & Beauty > Health Care',
  'Haushalt & Wohnen':        'Home & Garden > Household Supplies',
  'Deko & Wohnaccessoires':   'Home & Garden > Decor',
  'Damenmode':                'Apparel & Accessories > Clothing',
  'Herrenmode':               'Apparel & Accessories > Clothing',
  'Haustierbedarf':           'Animals & Pet Supplies > Pet Supplies',
  'Aufbewahrung & Organizer': 'Home & Garden > Household Supplies > Storage & Organization',
  'Elektronik':               'Electronics',
  'Schmuck':                  'Apparel & Accessories > Jewelry',
  'Küche & Bar':              'Home & Garden > Kitchen & Dining',
};

// Sammelkörbe ohne gemeinsame Warengruppe bekommen bewusst KEINE Kategorie: ein falscher Wert
// ist im Feed schlechter als ein leerer.
const SAMMELKORB = new Set(['Trend-Gadget', 'Trend-Produkt']);

// Diese Warengruppen sagen mehr als jeder Tag und werden deshalb ZUERST gefragt. Anlass war
// die Ballongirlande: sie trägt den Tag `dekoration` und die Warengruppe «Partydeko &
// Ballone». Der Tag gewann und schrieb «Home & Garden > Decor» — gültig, aber nichtssagend,
// obwohl die genaue Antwort danebenstand. Umgekehrt bleiben breite Warengruppen wie
// «Elektronik» hinter den Tags: ein IPL-Gerät ist als «Health & Beauty» besser aufgehoben
// denn als «Electronics», und genau das leistet der Tag.
const SPEZIFISCHER_TYP = new Set([
  'Partydeko & Ballone', 'Gaming-Zubehör', 'Musikinstrumente', 'Auto-Zubehör',
  'Haustierbedarf', 'Taschen', 'Spielzeug & Spiele', 'Werkzeug & Heimwerken', 'Werkzeug',
  'Basteln & DIY', 'Gartenwerkzeug', 'Garten & Pflanzen',
]);


// ─────────────────────────────────────────────────────────────────────────────
// ZWEI VORRANG-UMKEHRUNGEN, live nachgewiesen am 20.08.2026
//
// (1) «Aufbewahrung & Organizer» ist beim CJ-Import ein SAMMELKORB, kein Zweck. 2'333 aktive
//     Produkte trugen die Warengruppe; in einer Stichprobe hatten 56 % nicht ein einziges
//     Aufbewahrungswort im Titel — Bratpfannen, Rasentrimmer, Lichterketten, Duschköpfe standen
//     als Aufbewahrungsware im Feed. Der Pfad war gültig, deshalb schlug keine Syntaxprüfung an.
//     Neu: in dieser Gruppe entscheidet ZUERST der Titel; Storage bleibt nur, wenn der Titel
//     wirklich Box/Korb/Regal/Organizer sagt. Sagt er nichts Erkennbares, gibt es KEINEN Wert —
//     dieselbe Regel wie bei «Trend-Gadget»: ein falscher Wert ist im Feed schlechter als keiner.
//
// (2) `kategorie-tasche` stach die Warengruppe. Weil der Importer den Tag aus dem CJ-Kategorie-
//     namen «Storage Bags & Cases & Boxes» ableitete, landeten 642 Regale und Organizer unter
//     «Handbags». Neu: liegt ein Aufbewahrungs-Signal vor, wird der Taschen-Tag ignoriert.
//
// (3) `Spielzeug & Spiele` stach den Tag `haustier`: 17 Hundespielzeuge standen als KINDER-
//     spielzeug im Feed (Alters-/Sicherheitserwartungen nach EN 71, die ein beissfestes
//     Hundespielzeug nicht erfüllt). Neu: Haustier sticht Spielzeug.
// ─────────────────────────────────────────────────────────────────────────────
const PET_TAGS = ['haustier', 'hund', 'katze', 'pet'];
const PET_TITEL = /f[üu]r\s+(hunde|katzen|haustiere)\b|hundespielzeug|katzenspielzeug|\bhunde\w*|\bkatzen\w*|\bhaustier\w*/i;
const HUND_T = /\bhund\w*|welpen/i;
const KATZE_T = /\bkatze\w*|kitten/i;

// Titel-Tabelle für die Sammelkorb-Warengruppe. Reihenfolge ist Bedeutung.
const AUFB_TITEL = [
  [/\bhunde\w*|\bkatzen\w*|\bhaustier\w*|futternapf|tier-?toilette|tierasche/i, 'Animals & Pet Supplies > Pet Supplies'],
  [/kinderwagen|\bbaby\w*|windel|kinderzimmer/i, 'Baby & Toddler'],
  [/\bauto-|kofferraum|armaturenbrett|lenkrad|autositz|\bkfz\b|r[üu]cksitz/i, 'Vehicles & Parts > Vehicle Parts & Accessories'],
  [/wandregal|h[äa]ngeregal|ablageregal|wandboard/i, 'Furniture > Shelving > Wall Shelves & Ledges'],
  [/\w*regal\b|\bregal\w*|\bshelf\b/i, 'Furniture > Shelving'],
  [/rasentrimmer|rasenm[äa]her|gartenschere|gie[sß]{1,2}kanne|blumentopf|pflanzk[üu]bel|pflanztopf|gartenschlauch|heckenschere|gartenrechen|bonsai\w*/i, 'Home & Garden > Lawn & Garden'],
  [/\w*pfanne\w*|\bwok\b|kochtopf|\btopf\b|br[äa]ter\b|auflaufform|backform|backblech|schnellkochtopf|tarteform/i, 'Home & Garden > Kitchen & Dining > Cookware & Bakeware'],
  [/nudelmaschine|sandwichmaker|wasserkocher|\bmixer\b|toaster|kaffeemaschine|frittee?use|k[üu]chenmaschine|entsafter|zerkleinerer|reiskocher|kaffeem[üu]hle|lunchbox/i, 'Home & Garden > Kitchen & Dining > Kitchen Appliances'],
  [/schneid(e)?brett|zitruspresse|knoblauchpresse|teigroller|dosen[öo]ffner|gew[üu]rzm[üu]hle|pfefferm[üu]hle|messbecher|pfannenwender|\bsieb\b|salatschleuder|abtropfgestell|herdabdeck\w*/i, 'Home & Garden > Kitchen & Dining > Kitchen Tools & Utensils'],
  [/vorratsdose|butterdose|frischhalte\w*|teedose|brotdose|brotkasten/i, 'Home & Garden > Kitchen & Dining > Food Storage'],
  [/servierplatte|obstschale|\bteller\b|\btasse\b|teekanne|besteck|\bsch[üu]ssel\w*|karaffe|etagere/i, 'Home & Garden > Kitchen & Dining > Tableware'],
  [/\w*lampe\b|\w*leuchte\b|lichterkette|nachtlicht|\blaterne\w*|strahler|scheinwerfer|led-?streifen|\bbeleuchtung\w*/i, 'Home & Garden > Lighting'],
  [/badematte|badevorleger|badteppich/i, 'Home & Garden > Bathroom Accessories > Bath Mats & Rugs'],
  [/duschkopf|duschschlauch|handtuchhalter|wc-?sitz|toiletten\w*|seifenspender|zahnb[üu]rstenhalter|duschvorhang|wasserhahn|lotionspender/i, 'Home & Garden > Bathroom Accessories'],
  [/bodenwischer|wischmopp|\bmopp\w*|kehrschaufel|m[üu]llbeutel|\bschwamm\w*|fusselentferner|reinigungsb[üu]rste|\bputz\w*|fleckenentferner/i, 'Home & Garden > Household Supplies > Household Cleaning Supplies'],
  [/\brasierer\b|epilierer|haartrimmer|haarschneider|massageger[äa]t|gua\s?sha|nagelknipser|zahnb[üu]rste\b|fussmassage|zahncreme|mundsp[üu]lung/i, 'Health & Beauty > Personal Care'],
  [/\bwlan\b|\bwifi\b|steckdose\w*|\bventilator\w*|\bkamera\b|powerbank|ladeger[äa]t|ladestation|bluetooth|kopfh[öo]rer|\busb\b|projektor|\blautsprecher\b|entfeuchter/i, 'Electronics'],
  [/werkzeugtasche|werkzeugbox|werkzeugbeutel|werkzeugkoffer/i, 'Hardware > Hardware Accessories > Tool Storage & Organization'],
  [/\bbohrer\b|schraubendreher|\bzange\b|\bhammer\b|werkzeug\w*|\bs[äa]ge\b|cuttermesser|akkuschrauber/i, 'Hardware > Tools'],
  [/tischdecke|bettw[äa]sche|kissenbezug|\bvorhang\w*|picknickdecke|tischl[äa]ufer|duvet/i, 'Home & Garden > Linens & Bedding'],
  [/\bvase\b|wanddeko|wandverkleidung|bilderrahmen|kunstblume|kerzenhalter|\bteppich\w*|skulptur/i, 'Home & Garden > Decor'],
  [/weihnachts\w*|adventskalender|christbaum\w*|oster\w*/i, 'Home & Garden > Decor > Seasonal & Holiday Decorations'],
  [/kulturbeutel|toilettentasche|make-?up-?tasche|kosmetiktasche|schminktasche/i, 'Luggage & Bags > Cosmetic & Toiletry Bags'],
  [/handtasche|umh[äa]ngetasche|crossbody|schultertasche|\bclutch\b|g[üu]rteltasche|bauchtasche/i, 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'],
  [/rucksack|backpack|schulranzen/i, 'Luggage & Bags > Backpacks'],
];
// Erst wenn nichts davon greift, darf «Aufbewahrung» die Antwort sein — und nur, wenn der
// Titel das auch sagt.
const AUFB_STORAGE = /aufbewahrungs?\w*|\baufbewahrung\b|organizer|organisator|kleiderb[üu]gel|schuhbox|schuhschrank|w[äa]schekorb|kleidersack|schmucktablett|\w*box(en)?\b|\w*k[öo]rb(e)?\b|\w*kist(e|en)\b|beh[äa]lter|\bschublade\w*|\w*etui\b|\w*haken\b|hakenleiste|\bhalter\b|\w*st[äa]nder\b|\bhalterung\b|\w*spender\b|\bf[äa]cher\b|\btray\b|\w*ablage\b|garderobe|b[üu]cherst[üu]tze|schl[üu]sselbrett|\w*kasten\b|k[äa]stchen|\w*dose\b|\w*tablett\b|\bsafe\b|\btresor\b|abfalleimer|m[üu]lleimer|kassette|\w*h[üu]lle\b/i;
// Zuletzt: irgendeine Tasche. «Luggage & Bags» ist der grobe RICHTIGE Vorfahr,
// «Handbags» wäre der genaue FALSCHE (Kühltasche, Instrumententasche, Reisetasche).
const AUFB_BAG = /\w*tasche\w*|\w*beutel\b|\w*koffer\b|hardcase|trolley/i;
const AUFB_TYP = 'Aufbewahrung & Organizer';

export function googleKategorie(title, tags, productType) {
  const ti = title || '';
  const t = new Set((tags || []).map(x => String(x).toLowerCase()));

  // (3) Haustier sticht Spielzeug — ein Hundespielzeug ist kein Kinderspielzeug.
  const istPet = PET_TAGS.some(x => t.has(x)) || PET_TITEL.test(ti);
  if (productType === 'Spielzeug & Spiele' && istPet) {
    if (HUND_T.test(ti))  return 'Animals & Pet Supplies > Pet Supplies > Dog Supplies > Dog Toys';
    if (KATZE_T.test(ti)) return 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Toys';
    return 'Animals & Pet Supplies > Pet Supplies';
  }

  for (const [muster, pfad] of VORRANG) if (muster.test(ti)) return pfad;

  // (1) Sammelkorb «Aufbewahrung & Organizer»: der Titel entscheidet, nicht die Warengruppe.
  const istAufb = productType === AUFB_TYP || t.has('aufbewahrung') || t.has('organizer');
  if (istAufb) {
    for (const [muster, pfad] of AUFB_TITEL) if (muster.test(ti)) return pfad;
    if (AUFB_STORAGE.test(ti)) return 'Home & Garden > Household Supplies > Storage & Organization';
    if (AUFB_BAG.test(ti))     return 'Luggage & Bags';
  }

  if (SPEZIFISCHER_TYP.has(productType) && NACH_TYP[productType]) return NACH_TYP[productType];
  for (const [tag, pfad] of NACH_TAG) {
    if (!t.has(tag)) continue;
    // (2) Ein Regal ist keine Handtasche: bei Aufbewahrungs-Signal zählt der Taschen-Tag nicht.
    if (istAufb && (tag === 'kategorie-tasche' || tag === 'damen-taschen' || tag === 'aufbewahrung')) continue;
    return pfad;
  }
  if (SAMMELKORB.has(productType)) return null;
  if (productType === AUFB_TYP) return null;   // kein Auffangnetz mehr — leer schlägt falsch
  return NACH_TYP[productType] || null;
}
