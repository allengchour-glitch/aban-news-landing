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
  // ⚠️ «TV Box» traf die Aufbewahrungsregel `\w*box\b` — «Box» heisst hier Gerät.
  // «Storage» heisst bei Google AUFBEWAHRUNG, nicht Datenspeicher; ein SSD-GEHÄUSE
  // gehört zu Electronics, eine Festplatten-HÜLLE bleibt Aufbewahrung. Deshalb die
  // Hüllen-Sperre in HUELLE weiter unten.
  [/\bwlan\b|wi-?fi|steckdose\w*|\bventilator\w*|\bkamera\b|powerbank|ladeger[äa]t|ladestation|bluetooth|kopfh[öo]rer|\busb\b|projektor|\blautsprecher\b|entfeuchter|\bhdmi\b|tv-?box|\btastatur\w*|keycaps?|\bssd\b|\bnvme\b|\bm\.2\b|router\b/i, 'Electronics'],
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
// Hülle, Tasche, Halter, Ständer: das Zubehör zum Gerät ist Aufbewahrung, nicht Elektronik.
// «EVA Tastatur-Aufbewahrungstasche» und «Festplatten-Hülle» müssen dort bleiben.
// ⚠️ `\w*tasche\w*` stand hier zuerst mit drin und schob die «Bluetooth Ohrhörer-Tasche»
// von Electronics nach «Luggage & Bags». Die «EVA Tastatur-Aufbewahrungstasche» wird schon
// über `aufbewahrung` gefangen — das genügt.
const HUELLE = /\w*h[üu]lle\b|\bhalter\b|\bhalterung\b|\w*st[äa]nder\b|\w*etui\b|erh[öo]hung|aufbewahrung\w*/i;
const AUFB_STORAGE = /aufbewahrungs?\w*|\baufbewahrung\b|organizer|organisator|kleiderb[üu]gel|schuhbox|schuhschrank|w[äa]schekorb|kleidersack|schmucktablett|\w*box(en)?\b|\w*k[öo]rb(e)?\b|\w*kist(e|en)\b|beh[äa]lter|\bschublade\w*|\w*etui\b|\w*haken\b|hakenleiste|\bhalter\b|\w*st[äa]nder\b|\bhalterung\b|\w*spender\b|\bf[äa]cher\b|\btray\b|\w*ablage\b|garderobe|b[üu]cherst[üu]tze|schl[üu]sselbrett|\w*kasten\b|k[äa]stchen|\w*dose\b|\w*tablett\b|\bsafe\b|\btresor\b|abfalleimer|m[üu]lleimer|kassette|\w*h[üu]lle\b/i;
// Zuletzt: irgendeine Tasche. «Luggage & Bags» ist der grobe RICHTIGE Vorfahr,
// «Handbags» wäre der genaue FALSCHE (Kühltasche, Instrumententasche, Reisetasche).
const AUFB_BAG = /\w*tasche\w*|\w*beutel\b|\w*koffer\b|hardcase|trolley/i;
const AUFB_TYP = 'Aufbewahrung & Organizer';

// ─────────────────────────────────────────────────────────────────────────────
// (4) DAS NOMEN BESTIMMT DIE PRODUKTART, NICHT DIE WARENGRUPPE (28.08.2026)
//
// Ein Katalog-Audit fand vier Warengruppen, die ihre Kategorie BLANKO vergeben — der Artikel
// selbst wird nicht gefragt. Live nachgewiesen und repariert:
//   «Spass-Elektronik»  → Electronics: 378 Holzpuzzle, Klemmbausteine und Modellbausätze
//                         standen als Elektronik im Feed. Ein Holzpuzzle hat kein Bauteil.
//   «Basteln & DIY»     → Arts & Crafts: 16 fertige Teppiche, Sofabezüge, Vorhänge,
//                         Duschvorhänge und Bettwäsche-Sets; dazu Cardigan und Pullover.
//   «Spielzeug & Spiele»→ Toys: 14 Kissenbezüge, Sofaüberwürfe und ein Zimmerteppich, alle
//                         nur deshalb, weil «Plüsch» im Titel steht. «Plüsch» ist hier das
//                         MATERIAL, nicht die Produktart — dieselbe Falle wie «creme» als
//                         Farbe und «led» in «Leder». Nur «Plüschtier»/«Kuscheltier» ist Spielzeug.
//   «Gaming-Zubehör»    → Video Game Console Accessories: ein Karton-Brettspiel.
// Dazu: das Adjektiv «leuchtend» in «Leuchtendes Hai-T-Shirt für Kinder» erzeugte über den
// Tag `beleuchtung` die Kategorie «Home & Garden > Lighting» — für ein Baumwoll-T-Shirt.
//
// ⚠️ DIE GEGENRICHTUNG IST GENAUSO TEUER. Bei folgenden Titeln ist die alte Kategorie RICHTIG
// und darf NICHT angefasst werden — alle live geprüft und deshalb hier als Ausnahme verankert:
//   «Twill-Baumwollstoff für Bettwäsche & Vorhänge», «Leinen-Baumwollstoff für Vorhänge und
//   Kissen», «Stoff für Schuhe, Taschen und Deko» → Meterware, Arts & Crafts stimmt.
//   «Dehnbare Yoga-Hose aus Ice Silk» → trotz des Titels Meterware (Varianten «100 X 165CM
//   -75D ice silk», Text: «ideal für die HERSTELLUNG von Kleidungsstücken»).
//   «Kissenbezug mit Innenkissen» → Rohling zum Besticken/Bemalen, Arts & Crafts stimmt.
//   «DIY Malen nach Zahlen – Mein Kleid» → «Kleid» ist das Bildmotiv.
//   «Hohle Druckknöpfe-Set für Jeans», «Microfaser Wildlederimitat für Schuhe» → Nähzubehör.
// Deshalb sperrt ROHSTOFF alle diese Regeln. ⚠️ `\bstoff\b` reicht dafür NICHT — deutsche
// Zusammensetzungen: «Baumwollstoff», «Leinenstoff». Es muss `\w*stoff\w*` sein.
// ─────────────────────────────────────────────────────────────────────────────
const ROHSTOFF = /\w*stoff\w*|meterware|\bfabric\b|malen nach zahlen|\bgarn\b|n[äa]hen|zum\s+(besticken|bemalen|selbstgestalten)|besticken|druckkn[öo]pfe|reissverschluss|imitat f[üu]r|\bdiy\b|kreuzstich\w*|stickset|strickset|h[äa]kelset|bastelset|makramee/i;
// «Schaumstoff», «Kunststoff» und «Polsterstoff» sind Materialangaben eines FERTIGEN Artikels
// und dürfen die Sperre nicht auslösen.
const ROHSTOFF_AUSNAHME = /schaumstoff|kunststoff|werkstoff|farbstoff|polsterstoff|klebstoff|treibstoff/i;
function istRohstoff(ti) {
  if (!ROHSTOFF.test(ti)) return false;
  const rest = ti.replace(ROHSTOFF_AUSNAHME, '');
  return ROHSTOFF.test(rest);
}

// Bau- und Puzzlespielzeug. RC/Elektronik-Wörter im selben Titel bleiben absichtlich
// unberührt: ein «RC Drift Sportwagen Bausatz» ist ein Grenzfall, den ich nicht rate.
const BAUSPIEL = /klemmbaustein\w*|bauklotz|baukl[öo]tz\w*|magnet-?bausteine|\bbaustein\w*|\bbaukasten\b|modellbausatz|\bbausatz\b|\bbausets?\b/i;
const PUZZLE   = /\bpuzzle\w*|3d-?holzpuzzle|holzpuzzle/i;
const RC_WORT  = /\brc\b|ferngesteuert\w*|\bdrohne\w*|hubschrauber|quadrocopter|\broboter\b|elektronisch\w*|programmierbar\w*|\bsolar\b/i;

// Fertige Heimtextilien. Das Nomen trägt die Produktart.
const HEIMTEXTIL = [
  [/duschvorhang\w*/i,                                   'Home & Garden > Bathroom Accessories > Shower Curtains'],
  [/badteppich\w*|badematte\w*|badevorleger/i,           'Home & Garden > Bathroom Accessories > Bath Mats & Rugs'],
  [/wandteppich\w*|wandbehang\w*/i,                    'Home & Garden > Decor > Artwork > Decorative Tapestries'],
  [/\w*teppich\w*/i,                                     'Home & Garden > Decor > Rugs'],
  [/sofa-?bezug|sofa-?[üu]berwurf|couch-?bezug|sesselbezug|sofahusse|\bhusse\w*/i, 'Home & Garden > Decor > Slipcovers'],
  [/kissenbezug\w*|kissenh[üu]lle\w*|zierkissen|dekokissen/i, 'Home & Garden > Decor > Throw Pillows'],
  [/\bvorhang\w*|\bvorh[äa]nge\b|gardine\w*/i,           'Home & Garden > Decor > Window Treatments'],
  [/bettw[äa]sche\w*|bettbezug|spannbettlaken|bettlaken|duvetbezug|tagesdecke/i, 'Home & Garden > Linens & Bedding > Bedding'],
  [/tischdecke\w*|tischl[äa]ufer/i,                      'Home & Garden > Linens & Bedding > Table Linens'],
];
// Kleidungsstücke. Bewusst nur eindeutige Nomen — «Set», «Anzug», «Top» sind zu mehrdeutig.
const KLEIDUNG = [
  [/\w*sneaker\w*|\w*halbschuh\w*|\blauflernschuhe\b|\bstiefel\w*|\bsandale\w*|\bpumps\b|winter-?schuhe/i, 'Apparel & Accessories > Shoes'],
  [/\bt-?shirt\w*|\bpolohemd\w*|\bhemd\b|\bbluse\w*|\bpullover\b|\bpulli\b|\bhoodie\w*|\bsweatshirt\w*|\bcardigan\w*|strickjacke\w*|\bmantel\b|\bdaunenjacke\w*/i, 'Apparel & Accessories > Clothing'],
];
// «Baby» ist nicht immer eine Altersgruppe: «Plüsch Bush Baby Galagos» ist eine Affenart,
// «Plüsch Adler Baby» das Jungtier des Motivs. Steht ein Spielzeugwort daneben, gilt Spielzeug.
// ⚠️ Der erste Entwurf hatte hier zusätzlich `^pl[üu]sch\s+\w+`. Der Regressionstest über
// 4'972 Produkte zeigte 194 Fehltreffer: «Plüsch Kostüm Einhorn», «Plüsch Maske Hase»,
// «Plüsch Angler Hut» — «Plüsch» ist auch dort nur der Stoff. Nur das zusammengesetzte
// Nomen taugt. Und ein «Plüschtier-Rucksack» ist ein Rucksack, kein Kuscheltier.
const PLUESCHTIER = /pl[üu]schtier\w*|kuscheltier\w*|pl[üu]schfigur\w*|stofftier\w*/i;
const PLUESCH_NICHT = /rucksack|kost[üu]m\w*|\bmaske\w*|\bhut\b|\bm[üu]tze\w*|hausschuh\w*|pantoffel\w*|\bdecke\b|kissen\w*|\btasche\w*|aufbewahrung\w*|beanbag|sitzsack/i;

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

  // (4) Das Nomen sticht die Warengruppe — aber nie bei Rohmaterial (siehe ROHSTOFF oben).
  const roh = istRohstoff(ti);
  const BLANKO = ['Spass-Elektronik', 'Basteln & DIY', 'Spielzeug & Spiele', 'Gaming-Zubehör'];
  if (BLANKO.includes(productType) && !roh && !istPet) {
    for (const [muster, pfad] of HEIMTEXTIL) if (muster.test(ti)) return pfad;
    for (const [muster, pfad] of KLEIDUNG)   if (muster.test(ti)) return pfad;
    if (/brettspiel\w*|kartenspiel\w*|w[üu]rfelspiel\w*|gesellschaftsspiel\w*/i.test(ti))
      return 'Toys & Games > Games > Board Games';
    if (!RC_WORT.test(ti)) {
      if (PUZZLE.test(ti))   return 'Toys & Games > Puzzles';
      if (BAUSPIEL.test(ti)) return 'Toys & Games > Toys > Building Toys';
    }
  }
  // Ein Plüschtier ist Spielzeug, kein Babyartikel — auch wenn «Baby» im Titel steht
  // («Plüsch Bush Baby Galagos» ist eine Affenart). Nach VORRANG, damit ein
  // «Plüschtier-Rucksack» ein Rucksack bleibt.
  if (PLUESCHTIER.test(ti) && !PLUESCH_NICHT.test(ti))
    return 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals';

  for (const [muster, pfad] of VORRANG) if (muster.test(ti)) return pfad;

  // (1) Sammelkorb «Aufbewahrung & Organizer»: der Titel entscheidet, nicht die Warengruppe.
  const istAufb = productType === AUFB_TYP || t.has('aufbewahrung') || t.has('organizer');
  if (istAufb) {
    for (const [muster, pfad] of AUFB_TITEL) {
      if (!muster.test(ti)) continue;
      if (pfad === 'Electronics' && HUELLE.test(ti)) continue;   // Zubehör bleibt Aufbewahrung
      return pfad;
    }
    if (AUFB_STORAGE.test(ti)) return 'Home & Garden > Household Supplies > Storage & Organization';
    if (AUFB_BAG.test(ti))     return 'Luggage & Bags';
  }

  if (SPEZIFISCHER_TYP.has(productType) && NACH_TYP[productType]) return NACH_TYP[productType];
  for (const [tag, pfad] of NACH_TAG) {
    if (!t.has(tag)) continue;
    // (2) Ein Regal ist keine Handtasche: bei Aufbewahrungs-Signal zählt der Taschen-Tag nicht.
    if (istAufb && (tag === 'kategorie-tasche' || tag === 'damen-taschen' || tag === 'aufbewahrung')) continue;
    // (4b) Das Adjektiv «leuchtend» erzeugte den Tag `beleuchtung` und machte aus dem
    // «Leuchtenden Hai-T-Shirt für Kinder» einen Beleuchtungsartikel. Steht im selben Titel
    // ein Kleidungs-NOMEN, gewinnt das Nomen. Bewusst nur für diesen einen Tag: eine
    // allgemeine Kleidungs-Rückfallregel machte im Regressionstest aus einem «Sneaker
    // Schaumreiniger» einen Schuh und schob 25 Kinderkleider aus «Baby & Toddler».
    if (tag === 'beleuchtung' && !roh) {
      const k = KLEIDUNG.find(([m]) => m.test(ti));
      if (k) return k[1];
    }
    return pfad;
  }
  if (SAMMELKORB.has(productType)) return null;
  if (productType === AUFB_TYP) return null;   // kein Auffangnetz mehr — leer schlägt falsch
  return NACH_TYP[productType] || null;
}
