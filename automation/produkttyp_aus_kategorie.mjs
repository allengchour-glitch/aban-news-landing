// produkttyp_aus_kategorie.mjs — Produkttyp aus der Google-Kategorie ableiten, statt den Sammeltyp
// «Trend-Produkt»/«Trend-Gadget» anzulegen (05.10.2026, FIX-12H-PLAN Punkt 16).
//
// ANLASS: cj_sku_import schrieb JEDES Produkt als «Trend-Produkt», cj_trending_import als «Trend-Gadget»
// (Weihnachtskalender 04.10. 23:10, Adventskalender 05.10. 00:11). produkttyp_vereinheitlichen.py räumte das
// täglich nachträglich auf (Tabelle TAX, Taxonomie-Präfix → deutscher Typ) — der Importer legte es am nächsten
// Morgen wieder an. Ein Typ, der im Filter «Trend-Produkt» heisst, sagt der Kundin nichts.
//
// EINE REGEL: dieselbe Zuordnung wie produkttyp_vereinheitlichen.TAX, nur über den Google-Pfad statt der
// Taxonomie-ID (der Importer kennt zum Anlegezeitpunkt nur googleKategorie(); die Shopify-Kategorie setzt
// später kategorie_wache/kategorie_ki). Längster Pfad-Präfix gewinnt. VORRANG-Titelwörter (Kopfhörer, Handyhülle,
// Aroma-Diffuser, Haustier) stechen eine falsche Kategorie — wie im Python-Werkzeug.
// Kleidung/Schuhe: Geschlecht nur aus dem Titel (Damen/Herren/Kinder-Wort oder eindeutiges Warenwort);
// sonst der ehrliche Oberbegriff «Mode»/«Schuhe». Wortfallen (Kanarienvögel 04.10.): «Winterkleidung» ≠ Kleid,
// «Kleiderbügel» ≠ Kleid, «Barock» ≠ Rock, «Schnürsenkel» ist kein Schuh.
//
// Rückgabe: deutscher Produkttyp oder null (dann behält der Aufrufer seinen Fallback — nie raten).
//   node automation/produkttyp_aus_kategorie.mjs --test   # Kanarienvögel

const DAMEN_KLEID = /\b(?!kleider(?:bügel|sack|schrank|stange|haken|ständer))\w*kleid(?!ung)\w*|\b(?!barock\b)\w*rock\b|rockedress|\bbluse|bikini|\bbh\b|shapewear|\w*shaper\b|formschneider|caprihose|neckholder|rückenfrei|volant|spaghetti|\bdress\b|\blace\b|strumpfhose|leggings mit taillenformer|po-push-up/i;
const HERREN_KLEID = /\bhemd(?:en)?\b|\w*oberteile\b|maenner|männer/i;
const DAMEN_SCHUH = /pumps|high heels|stiletto|sandalette\w*|peep-toe|\bmules\b|absatz|plattform-?sandale|keil-?sandale/i;

function kleid(t) {
  if (/\b(baby|kinder|kids|mädchen|jungen|kleinkind)/i.test(t)) return 'Baby & Kinder';
  if (/\b(damen|frauen|women)/i.test(t)) return 'Damenmode';
  if (/\b(herren|männer|maenner|men)\b/i.test(t)) return 'Herrenmode';
  if (DAMEN_KLEID.test(t)) return 'Damenmode';
  if (HERREN_KLEID.test(t)) return 'Herrenmode';
  return 'Mode';
}
function schuh(t) {
  if (/schnürsenkel|schuhspanner|einlegesohle/i.test(t)) return null;      // Schuhzubehör ist kein Schuh
  if (/\b(kinder|kids|baby|mädchen|jungen)/i.test(t)) return 'Kinderschuhe';
  if (/\b(damen|frauen|women)/i.test(t)) return 'Damenschuhe';
  if (/\b(herren|männer|men)\b/i.test(t)) return 'Herrenschuhe';
  if (DAMEN_SCHUH.test(t)) return 'Damenschuhe';
  return 'Schuhe';
}

// Google-Pfad-Präfix → Typ (Wert = String oder Funktion(titel)). Längster passender Präfix gewinnt.
const PFAD = {
  'Apparel & Accessories > Clothing': kleid,
  'Apparel & Accessories > Clothing > Dresses': 'Damenmode',
  'Apparel & Accessories > Clothing > Baby & Toddler Clothing': 'Baby & Kinder',
  'Apparel & Accessories > Shoes': schuh,
  'Apparel & Accessories > Shoe Accessories': null,
  'Apparel & Accessories > Jewelry': 'Schmuck',
  'Apparel & Accessories > Jewelry > Watches': 'Uhren',
  'Apparel & Accessories > Handbags, Wallets & Cases': 'Taschen',
  'Apparel & Accessories > Clothing Accessories': 'Accessoires',
  'Apparel & Accessories > Clothing Accessories > Sunglasses': 'Sonnenbrillen',
  'Apparel & Accessories > Costumes & Accessories': 'Kostüme & Verkleidung',
  'Animals & Pet Supplies': 'Haustierbedarf',
  'Arts & Entertainment > Party & Celebration': 'Partydeko & Ballone',
  'Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments': 'Musikinstrumente',
  'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts': 'Basteln & DIY',
  'Baby & Toddler': 'Baby & Kinder',
  'Electronics': 'Elektronik',
  'Electronics > Video Game Console Accessories': 'Gaming-Zubehör',
  'Electronics > Communications > Telephony > Mobile Phone Accessories': 'Handy-Zubehör',
  'Electronics > Print, Copy, Scan & Fax > 3D Printers': '3D-Druck',
  'Furniture': 'Wohnen & Deko',
  'Hardware': 'Werkzeug & Heimwerken',
  'Health & Beauty > Personal Care': 'Beauty & Pflege',
  'Health & Beauty > Personal Care > Cosmetics': 'Make-up',
  'Health & Beauty > Personal Care > Cosmetics > Nail Care': 'Nageldesign',
  'Health & Beauty > Personal Care > Cosmetics > Skin Care': 'Hautpflege',
  'Health & Beauty > Personal Care > Hair Care': 'Haarpflege',
  'Health & Beauty > Health Care': null,
  'Home & Garden > Lawn & Garden': 'Garten & Pflanzen',
  'Home & Garden > Lighting': 'Beleuchtung',
  'Home & Garden > Kitchen & Dining': 'Küche & Bar',
  'Home & Garden > Decor': 'Wohnen & Deko',
  'Home & Garden > Linens & Bedding': 'Heimtextilien',
  'Home & Garden > Household Supplies': 'Haushalt & Wohnen',
  'Home & Garden > Bathroom Accessories': 'Haushalt & Wohnen',
  'Home & Garden > Smoking Accessories': 'Raucherzubehör',
  'Home & Garden': 'Haushalt & Wohnen',
  'Luggage & Bags': 'Taschen',
  'Office Supplies': 'Büro & Home Office',
  'Sporting Goods': 'Sport & Outdoor',
  'Toys & Games': 'Spielzeug & Spiele',
  'Vehicles & Parts': 'Auto-Zubehör',
};
const PFADE = Object.keys(PFAD).sort((a, b) => b.length - a.length);

// Eindeutiges Titelwort schlägt eine falsche Kategorie (identisch mit produkttyp_vereinheitlichen.VORRANG).
const VORRANG = [
  [/headset|kopfhörer|ohrhörer|earbuds|lautsprecher/i, 'Elektronik'],
  [/handyhülle|handy-hülle|hülle für (iphone|samsung)|phone case/i, 'Handy-Zubehör'],
  [/aroma-?diffus|duftdiffus|diffusor|luftbefeuchter|duftzerstäuber|aromatherapie-(gerät|luftbefeuchter|diffuser)/i, 'Wellness & Aromatherapie'],
  [/für (deinen |deine |den |die )?(hunde?|katzen?|haustiere?|welpen?)\b|\bhunde-?(leine|geschirr|halsband|bett|napf|mantel|pullover|schuhe|jacke|kostüm|spielzeug|bürste|outdoorschuhe)|\bkatzen-?(bett|klo|streu|kratz|spielzeug|halsband|tunnel|haus)|kratzbaum|futternapf/i, 'Haustierbedarf'],
];

export function typAusKategorie(gkat, titel) {
  const t = titel || '';
  for (const [rx, z] of VORRANG) if (rx.search ? rx.search(t) : rx.test(t)) return z;
  const p = gkat || '';
  if (!p) return null;
  for (const pre of PFADE) {
    if (p === pre || p.startsWith(pre + ' > ')) {
      const z = PFAD[pre];
      return typeof z === 'function' ? z(t) : z;
    }
  }
  return null;
}

if (process.argv.includes('--test')) {
  const faelle = [
    ['Home & Garden > Decor > Seasonal & Holiday Decorations', 'Adventskalender «Hochlandrind» aus PVC', 'Wohnen & Deko'],
    ['Apparel & Accessories > Clothing', 'Winterkleidung für Herren', 'Herrenmode'],
    ['Apparel & Accessories > Clothing', 'Kleiderbügel aus Holz', 'Mode'],
    ['Apparel & Accessories > Clothing', 'Barock Bluse mit Volant', 'Damenmode'],
    ['Apparel & Accessories > Shoes', 'Press Lock Schnürsenkel – Elastisch', null],
    ['Apparel & Accessories > Shoes', 'Sandalen mit Keilabsatz', 'Damenschuhe'],
    ['Apparel & Accessories > Jewelry > Watches', 'Herren-Quarzuhr mit Holzarmband', 'Uhren'],
    ['Electronics', 'Kabelloser Kopfhörer', 'Elektronik'],
    ['Toys & Games > Toys', 'Hundeleine mit Blumenmuster', 'Haustierbedarf'],
    ['Health & Beauty > Health Care', 'Atemschutzmaske', null],
    ['', 'Irgendwas ohne Kategorie', null],
    ['Hardware > Tools', 'Kurbelabzieher für Fahrrad', 'Werkzeug & Heimwerken'],
  ];
  let fehler = 0;
  for (const [g, t, soll] of faelle) {
    const ist = typAusKategorie(g, t);
    if (ist !== soll) { fehler++; console.log(`❌ ${t} (${g}) → ${ist}, soll ${soll}`); }
  }
  console.log(fehler ? `${fehler} Fehler` : `✅ ${faelle.length}/${faelle.length} Kanarienvögel richtig`);
  process.exit(fehler ? 1 : 0);
}
