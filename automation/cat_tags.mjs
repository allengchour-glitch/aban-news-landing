// Gemeinsamer Kategorie-Tag-Mapper (2026-07-10) — löst «sauber sortieren»: mappt Produkt-Text
// (DE-Titel + EN-Name + Suchbegriff) auf die Tags, die die Smart-Collections wirklich matchen.
// Wortgrenzen beachten (GEHIRN 9b: kurze Wörter wie hut/ring/fan verankert, sonst Schutz/Reinigung/Elefant-Falle).
// Nur EXISTIERENDE Collection-Tags verwenden (siehe /tmp/colls.json Taxonomie).
// ⚠️ ZWEI KOMPOSITUM-FALLEN, die 20 Spielzeugfahrzeuge falsch einsortiert haben (11.08.2026):
//   «Anhänger»  → Schmuck-Anhänger UND Traktor-Anhänger. 11 BRUDER-/John-Deere-/Fendt-Modelle
//                 landeten so in der Halsketten-Kollektion.
//   «Cat»       → Katze UND Caterpillar. 9 Bagger und Kettendozer galten als Haustierbedarf.
// Beides sind keine Regex-Fehler im engeren Sinn — die Wörter sind wirklich mehrdeutig. Nur
// der Zusammenhang entscheidet, und der steht im Titel. Trifft eines dieser Muster, wird das
// betroffene Schlagwort übersprungen (Regel 9b: deutsche Wortformen mitdenken).
const FAHRZEUG = /traktor|bagger|lkw|kipper|dozer|lader|schlepper|maehdrescher|bruder|john deere|fendt|claas|case ih|new holland|caterpillar|bworld|roadmax|beregnung|frontlader|teleskoplader/;

// ── BELEUCHTUNG (23.09.2026, Audit-Befund 2) ─────────────────────────────────────────────────
// Die alte Regel `/\blampe\b|leuchte|beleuchtung|projektor|nachtlicht|led.?strip|lichterkette/`
// war in BEIDE Richtungen falsch (gemessen: Kollektion sub-beleuchtung 31 aktiv, 6 fachfremd,
// 163 aktive Produkte mit Tag `lampe` fehlten):
//   zu eng:  `\blampe\b` findet «Tischlampe», «Wandlampe», «Nachttischlampe» NICHT — im Kompositum
//            steht vor «lampe» kein Wortanfang (Regel 16d, dieselbe Falle wie «Damenuhr»).
//   zu weit: nacktes `leuchte` traf «LEUCHTEndes Hai-T-Shirt», «leuchtende LED-Mütze», das Gamepad
//            «mit Leuchteffekten» und die BRUDER-«Rundumleuchte» (Spielzeug); nacktes `projektor`
//            trifft Video-Beamer, nacktes `beleuchtung` den «Schminkspiegel mit LED-Beleuchtung».
// Neu: (1) positiv nur Lampen-Komposita (…lampe), benannte Leuchten-Komposita, Lichterketten,
//      Nachtlichter, Leuchtmittel und Sternenhimmel-/Stimmungsprojektoren;
//      (2) entschieden wird am KOPF des Titels (Text vor « mit »/« with »): «Ladegerät mit
//      Tischlampe» ist ein Ladegerät, «Tischlampe mit Wireless-Charger» eine Lampe;
//      (3) Ausschluss für Lampen, die keine Wohn-/Gartenbeleuchtung sind (Taschen-, Stirn-,
//      Velo-, Nagel-, Mücken-, Wärme-, Pflanzenlampe, Spielzeug, Diffuser, Auto, Foto).
// Kanarienvögel: `node automation/cat_tags.mjs --test` (muss «OK» melden).
export const BELEUCHTUNG_JA = new RegExp([
  'lampen?\\b', '\\blamps?\\b', 'lampenschirm',
  '\\bleuchte\\b',
  '(?:wand|decken|tisch|steh|pendel|hange|garten|solar|nachttisch|schreibtisch|lese|aussen|wege|boden|spiegel|bett|nacht|kristall|sensor|akku|klemm|schrank|design|einbau|stimmungs|garagen|scharnier|strassen|unterbau)-?leuchten?\\b',
  // Beleuchtung nur als Kompositum mit Ort/Art — nacktes «Beleuchtung» steht an Spiegeln, Headsets, Puzzles
  '(?:wand|decken|garten|aussen|innen|weihnachts|streifen|schrank|unterbau|stimmungs|ambiente|solar|terrassen|balkon)-?beleuchtung',
  'kronleuchter', 'nachtlicht', 'lichterkette', 'led[\\s-]?kette', 'led.?strip', 'led[\\s-]?streifen', 'led[\\s-]?band\\b',
  'led[\\s-]?leisten?\\b', 'lichtleiste', 'stimmungslicht', 'neonlicht', 'neon-?schild', 'leuchtschild',
  'led[\\s-]?kerzen?\\b', 'led[\\s-]?laterne', '(?:solar|garten)-?fackel', 'gluhbirne', 'leuchtmittel', 'led[\\s-]?rohre',
  'einbaustrahler', 'deckenstrahler', 'led[\\s-]?strahler',
  'projektionsl(?:ampe|icht)', 'planetarium',
  '(?:sternen|sternenhimmel|galaxy|galaxie|sunset|sonnenuntergang|ocean|nordlicht|aurora)[\\s-]*(?:licht-?)?projektor',
  'projektor.{0,40}(?:sternenhimmel|nachtlicht|stimmungslicht)',
  'night.?light', 'string.?lights?', 'fairy.?lights?', 'star.?projector', 'galaxy.?projector',
].join('|'));
export const BELEUCHTUNG_NEIN = new RegExp([
  'taschenlampe', 'stirnlampe', 'kopflampe', 'helmlampe', 'fahrrad', '\\bvelo(?!urs)', '\\bbike\\b',
  'mountainbike', 'nachtfahr', '\\brad\\b', 'nagel(?:lampe|trockner|lack|design|studio|gel|pflege)',
  'fur nagel', '\\bnail', 'lichthartung', 'gel-?lack', 'mucken', 'moskito', 'mosquito', 'insekt',
  'warmelampe', 'warme-?lampe', 'heizlampe', 'hitzelampe', '\\bheat\\b', 'infrarot', 'rotlicht',
  'phototherap', 'desinfektion', 'sterilis', '\\buv\\b', 'pflanzenlampe', 'pflanzenlicht', '\\bgrow\\b',
  'anzucht', 'wunderlampe', 'aladd?in', 'bausatz', 'bausteine', 'lernspielzeug', 'spielzeug',
  '\\btoys?\\b', 't-?shirt', 'mutze', 'gamepad', 'controller', 'rundumleuchte', 'blaulicht',
  'diffuser', 'luftbefeuchter', 'befeuchtung', 'humidifier', '\\baroma', 'duftlampe', 'ollampe',
  'kerosin', 'petroleum', 'brillenlampe', 'rollleine', 'powerbank', 'smartwatch', 'kamera',
  '\\bradio\\b', 'laderegler', 'kostum', 'angeln', '\\bangel\\b', 'fischer\\b', 'flashlight',
  'head.?lamp', 'headlight', 'torch', 'curing', '\\bauto\\b', '\\bkfz\\b', '\\bcar\\b', 'foto',
  'video', 'ringlicht', 'selfie', 'braunungs', 'aquarium', 'terrarium', 'bundle', '\\bbox\\b',
  'pullover', 'hoodie', 'sweatshirt', 'jacke', 'kleid\\b', 'socken', 'schuhe?\\b', 'sneaker',
  'haarreif', 'haarband', 'stirnband', 'halsband', 'ohrring', 'handschuh',
  // Nachtrag nach dem ersten Trockenlauf über 51'000 aktive Titel (23.09.): Nagel-, Velo-, Stirn-,
  // Reptilien- und Bastelware, die ein Lampen-Wort trägt
  '\\bnagel\\b', 'nageldesign', 'trockn', '\\bmtb\\b', 'kopfmontiert', '\\bzoom\\b', 'basking', 'reptil',
  'schildkrot', 'turtle', 'dimmer fur', 'diamond painting', '\\bdiy\\b', '\\brc\\b', 'deko-?set', 'partydeko',
  'camping', '\\bjagd', 'selbstverteidigung', 'taktisch',
].join('|'));

/** Normalisiert wie catTags (klein, Umlaute ohne Punkte: ä→a, ü→u). */
export function normTitel(text) {
  return ' ' + (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
}

// Produkttypen, die eine «Lampe» sicher als Nicht-Beleuchtung ausweisen («Schnelltrocknende
// LED-Lampe» = Nageldesign). Bewusst eng: «Basteln & DIY» steht auch an echten LED-Streifen.
export const BELEUCHTUNG_TYP_NEIN = /nagel|partydeko|kostum|spielzeug|camping|\bauto/;

/** true = Wohn-/Gartenbeleuchtung. Entscheidet am Titel-Kopf (vor « mit »), Ausschluss am ganzen Text.
 *  `typ` (productType, optional) zählt nur über BELEUCHTUNG_TYP_NEIN. */
export function istBeleuchtung(text, typ = '') {
  const s = normTitel(text);
  const kopf = s.split(/\s(?:mit|with)\s/)[0];
  return BELEUCHTUNG_JA.test(kopf) && !BELEUCHTUNG_NEIN.test(s) && !BELEUCHTUNG_TYP_NEIN.test(normTitel(typ));
}

// ── PARFUM (23.09.2026, Audit-Befund 13) ────────────────────────────────────────────────────
// Nacktes `duft` machte aus «Boden-Reinigungstücher mit Frischeduft» und «Nagellack mit
// Aprikosenduft» Parfum (Kollektion parfum-duefte, Regel TAG=parfum). Jetzt nur echte
// Duft-Bezeichnungen; Raum-, Auto- und Kerzendüfte bleiben draussen.
export const PARFUM_JA = /parfum|eau de (?:parfum|toilette|cologne)|\bcologne\b|\bedt\b|\bedp\b|body.?mist|\bperfume\b|(?:herren|damen|unisex)duft|duftwasser/;
export const PARFUM_NEIN = /\bauto\b|\bcar\b|lufterfrischer|diffuser|duftstab|kerze|raumduft|reinig|nagel|waschmittel|weichspul|parfumflasche|parfum-?flasche|zerstaub|atomizer|probenflasche|\bleer|geschenkset|uhr\b|portemonnaie|brieftasche|duftol|atherisch|aetherisch/;

export function catTags(text) {
  const s = ' ' + (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  const istFahrzeug = FAHRZEUG.test(s);
  const out = new Set();
  const R = [
    // Schmuck
    [/ohrring|ohrhanger|creol|creyol|ohrstecker|earring/,        ['ohrringe', 'schmuck', 'damen']],
    [/armband(?!uhr)|armreif|bracelet|\banklet\b|fusskett/,      ['kategorie-armband', 'schmuck']],
    [/armbanduhr|damenuhr|herrenuhr|kinderuhr|unisex.?uhr|\buhr\b|\bwatch\b|smartwatch|wanduhr|tischuhr|wecker/, ['uhr', 'schmuck']],
    [istFahrzeug ? /halskette|necklace|collier|choker/ : /halskette|\bkette\b|necklace|anhanger|collier|choker|\btassel\b/, ['kategorie-halskette', 'schmuck']],
    [/\bring\b|siegelring|damenring|herrenring|verlobungsring|ehering/, ['schmuck', 'damen']],
    [/perlen|pearl/,                                             ['schmuck', 'perlen']],
    // Eyewear
    [/sonnenbrill|sunglass/,                                     ['sonnenbrille']],
    // Schuhe
    [/sandal|espadril|flip.?flop|zehentrenner/,                 ['sandalen', 'schuhe', 'damen']],
    [/(?<!hand)schuh|sneaker|stiefel|\bboots\b|loafer|laufschuh|wanderschuh|turnschuh/, ['schuhe']],
    // Taschen & Lederwaren
    [/\btote\b|handtasche|umhangetasche|crossbody|shopper|clutch|schultertasche|\btasche\b|rucksack|backpack/, ['damen-taschen']],
    [/geldborse|\bwallet\b|portemonnaie|kartenetui/,            ['Wallet']],
    [/\bgurtel\b|\bbelt\b/,                                     ['Gurtel']],
    [/\bcap\b|\bmutze\b|\bhut\b|beanie/,                        ['Hut']],
    // Beauty & Wellness
    [/gesichtsreiniger|reinigungsburste|\bserum\b|hautpflege|gesichtscreme|anti.?aging|cleanser|\btoner\b|gesichtsmaske/, ['beauty', 'hautpflege']],
    [/massage|massager|gua.?sha|jade.?roll|akupress|augen.?massag/, ['beauty', 'wellness']],
    [/wimper|lippenstift|nagel|makeup|make.?up|lidschatten|foundation/, ['beauty']],
    // Parfum + Beleuchtung: nicht mehr hier, sondern unten nach der Schleife (PARFUM_JA/-NEIN,
    // istBeleuchtung) — beide brauchen einen Ausschluss bzw. den Titel-Kopf.
    // Home / Küche / Deko
    [/diffuser|\baroma\b|duftkerze/,                            ['home', 'deko', 'wellness']],
    [/\bkuche\b|kitchen|kuchengerat|gemuseschneider|zwiebelschneider|\bschaler\b|obstschneider/, ['home', 'küche']],
    [/\bdeko\b|\bvase\b|\bkerze\b|bilderrahmen|wandbild/,       ['home', 'deko']],
    [/trinkflasche|water.?bottle|thermobecher|thermosflasche/, ['home']],
    [/\bbesen\b|schaber|wischer|\bmop\b|reinigungstuch|putztuch|fussel/, ['home']],
    // Fitness / Outdoor
    [/\byoga\b|widerstandsband|resistance.?band|\bhantel\b|fitness/, ['fitness']],
    [/camping|\bzelt\b|wandern/,                                ['outdoor', 'camping']],
    [/sonnenschirm|gartenmoebel|liegestuhl|hangematte|\bgrill\b|\bgarten\b|\bbalkon\b|blumentopf|blumenkasten|ubertopf|pflanzentopf|pflanzkubel|\bpflanze\b(?!nmuster)|pflanzen(?!muster)|rankgitter|blumenampel|hangepflanz|bewasserung|giesskanne|giess|vogelhaus|vogelfutter|vogeltrank|windspiel|windlicht|solarleuchte|solarlampe|solar.?licht|gartenzwerg|gartendeko|krautergarten|krauterbeet|krautertopf|blumenkasten/, ['outdoor', 'garten']],
    [/luftmatratze|schwimmreif|pool\b|planschbecken|strandtuch/, ['strand', 'sommer']],
    [/haarmaske|shampoo|haaroel|haarspulung|conditioner|haarkur/, ['beauty']],
    // Sommer / Ventilator
    [/ventilator|\blufter\b|halsventilator|stehventilator/,     ['gadget', 'sommer']],
    // Auto / Handy / Gadget
    [/\bauto\b|\bkfz\b|autozubehor/,                            ['auto']],
    [/\bhandy\b|\bphone\b|telefon|airpod|kopfhorer|earbud|ladegerat|ladekabel|smartwatch/, ['gadget']],
    // Haustier / Baby
    [istFahrzeug ? /\bhund\b|\bkatze\b|haustier/ : /\bhund\b|\bkatze\b|haustier|\bdog\b|\bcat\b|\bpet\b/,     ['haustier']],
    [/\bbaby\b|kleinkind|sabbertuch|schnuller/,                 ['baby', 'kinder']],
    // Herren-Grooming
    [/bartschneider|haarschneider|rasierer|bartpflege|trimmer/, ['herren']],
    // Geschlecht (breit, für „Für Ihn/Für Sie")
    [/\bherren\b|\bmanner\b|\bmens\b|\bmann\b/,                 ['herren']],
    [/\bdamen\b|\bfrauen\b|\bwomen\b|\bwomens\b/,               ['damen']],
  ];
  for (const [re, tags] of R) if (re.test(s)) tags.forEach(t => out.add(t));
  if (PARFUM_JA.test(s) && !PARFUM_NEIN.test(s)) { out.add('beauty'); out.add('parfum'); }
  if (istBeleuchtung(text)) out.add('beleuchtung');
  return [...out];
}

// ── Kanarienvögel (23.09.2026): `node automation/cat_tags.mjs --test` ────────────────────────
// Jede Änderung an BELEUCHTUNG_*/PARFUM_* zuerst hier gegenprüfen (Regel 9b). Beide Richtungen:
// was hinein MUSS und was draussen bleiben MUSS — echte Titel aus dem Shop.
const KANARIEN_BELEUCHTUNG = {
  ja: ['LED-Tischlampe', 'Wandlampe', 'Nordische Nachttischlampe aus massivem Holz mit Ambientebeleuchtung',
       'Stille Deckenlampe mit Holzfurnier für Esszimmer und Schlafzimmer', 'Memphis Glas-Hängelampe',
       'Minimalistische Nachttisch-Pendelleuchte', 'Silberfarbene Metall Tischleuchte',
       'Sternenhimmel-Projektor «Galaxy» · LED-Nachtlicht', 'LED Solar-Lichterkette XL – 8 Leuchtmodi',
       'Phantom Tischlampe mit Wireless Charger', 'Solar-Gartenleuchte «Lumio» · Aluminium, automatisch ☀️',
       'UFO Kristall-Salzlampe', 'Monitor-Lichtleiste mit Bewegungssensor', 'Minimal-Kronleuchter',
       'Galaxy Aurora LED-Projektor 360° · Sternenhimmel & Nordlicht', 'Kerzenwärmer-Lampe «Fiore»', 'LED Röhre Philips 30 W',
       'Wanduhr-Lampe', 'Deckenventilator-Lampe «Light Luxury»', 'Solar-Gartenlichterkette',
       'Deformierbare LED-Garagenleuchte, 60W', 'Solar Wandbeleuchtung', 'LED-Scharnierleuchte für Schränke'],
  nein: ['Leuchtendes Hai-T-Shirt für Kinder', 'BRUDER Zubehör Rundumleuchte', 'NS21 RGB-Gamepad mit Leuchteffekten',
         'Wintermütze für Kinder leuchtende LED Weihnachten', 'Mini USB-Taschenlampe – Edelstahl',
         'UV/LED Nagellampe für Gel-Nägel', 'USB-LED-Stirnlampe mit 4 Modi', 'Wärmelampe für Nutz- und Haustiere',
         'Kabellose Qi-Ladestation mit Tischlampe', 'Aroma Diffuser Holzoptik 400ml – Ultraschall Luftbefeuchter mit 7 LED-Farben',
         'Premium Home Wellness Bundle · Diffuser + 6 ätherische Öle + Salzlampe', 'Mini Beamer Projektor 4K Heimkino',
         'Schminkspiegel mit LED-Beleuchtung', 'Aladins Wunderlampe', 'Smart-Anzuchtset mit LED-Pflanzenlampe',
         'Eulen-Tischlampe Bausatz für Kinder', 'USB Sternenhimmel Projektionslampe fürs Auto',
         'Tragbare elektrische Mückenlampe', 'Wasserdichte LED-Fahrradlampe mit Griffmontage', 'Velo-Stirnlampe mit 600 Lumen',
         'Fairy Light Luxury Crystal Wear Nägel', 'LED Nagel Lampe für Gel Nägel', 'Turtle-Basking-Lampe', 'Wasserdichte MTB-Lampe',
         'Kopfmontierte LED-Lampe mit Aufladefunktion', 'Dimmer für zweifarbige LED Lichtleisten', 'RC Pterosaurus Nachtlicht',
         'DIY Diamond Painting Nachtlicht «Jahreszeitenbaum»', 'Deko-Set Glitzer-Kronleuchter · 17-teilig',
         'Creative Gaming-Headset mit Beleuchtung', 'Herren Quarzuhr, wasserdicht, leuchtend', 'Hundehalsband leuchtend',
         'Mini HD LED Heimkino-Projektor', 'Leuchtende Kinderschuhe mit Klettverschluss', '3D Acryl Notiztafel mit LED-Beleuchtung'],
};
const KANARIEN_PARFUM = {
  ja: ['Blumig-fruchtiges Eau de Parfum (50ml)', 'Amber Wood Eau de Cologne für Herren', 'Desert Rose Parfüm Spray für Damen',
       'Holzduft-Parfum', 'Langanhaltender Parfum Balsam für Damen', 'Parfüm-Öl Middle East Dubai'],
  nein: ['Boden-Reinigungstücher mit Frischeduft (12 Stk.)', 'Abziehbarer Nagellack mit Aprikosenduft (10ml)',
         'Auto-Duft-Clip «Woody» · edler Holz-Lufterfrischer', 'Reed-Diffuser «Aroma» – Duftstäbchen ohne Flamme',
         'Rosen-Duftkerzen «Rosé» · Deko-Kerzen Set', 'Luxus Auto Parfüm Spray', 'Geschenkset: Quarzuhr, Portemonnaie & Parfum'],
};
if (process.argv[1] && process.argv[1].endsWith('cat_tags.mjs') && process.argv.includes('--test')) {
  let fehler = 0;
  const pruefe = (name, liste, soll, fn) => liste.forEach(t => {
    if (fn(t) !== soll) { fehler++; console.log(`FALSCH ${name} soll=${soll}: ${t}`); }
  });
  pruefe('beleuchtung', KANARIEN_BELEUCHTUNG.ja, true, istBeleuchtung);
  pruefe('beleuchtung', KANARIEN_BELEUCHTUNG.nein, false, istBeleuchtung);
  const hatParfum = t => catTags(t).includes('parfum');
  pruefe('parfum', KANARIEN_PARFUM.ja, true, hatParfum);
  pruefe('parfum', KANARIEN_PARFUM.nein, false, hatParfum);
  // Nebenwirkungsprobe: die übrigen Regeln bleiben unverändert (Stichprobe)
  const ring = catTags('Silberner Damenring mit Zirkonia');
  if (!ring.includes('schmuck')) { fehler++; console.log('FALSCH Nebenwirkung: Ring ohne schmuck', ring); }
  console.log(fehler ? `${fehler} FEHLER` : 'OK — alle Kanarienvögel richtig');
  process.exit(fehler ? 1 : 0);
}
