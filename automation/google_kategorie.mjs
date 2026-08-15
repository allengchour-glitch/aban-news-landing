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

export function googleKategorie(title, tags, productType) {
  for (const [muster, pfad] of VORRANG) if (muster.test(title || '')) return pfad;
  if (SPEZIFISCHER_TYP.has(productType) && NACH_TYP[productType]) return NACH_TYP[productType];
  const t = new Set((tags || []).map(x => String(x).toLowerCase()));
  for (const [tag, pfad] of NACH_TAG) if (t.has(tag)) return pfad;
  if (SAMMELKORB.has(productType)) return null;
  return NACH_TYP[productType] || null;
}
