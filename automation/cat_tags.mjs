// Gemeinsamer Kategorie-Tag-Mapper (2026-07-10) — löst «sauber sortieren»: mappt Produkt-Text
// (DE-Titel + EN-Name + Suchbegriff) auf die Tags, die die Smart-Collections wirklich matchen.
// Wortgrenzen beachten (GEHIRN 9b: kurze Wörter wie hut/ring/fan verankert, sonst Schutz/Reinigung/Elefant-Falle).
// Nur EXISTIERENDE Collection-Tags verwenden (siehe /tmp/colls.json Taxonomie).
export function catTags(text) {
  const s = ' ' + (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  const out = new Set();
  const R = [
    // Schmuck
    [/ohrring|ohrhanger|creol|creyol|ohrstecker|earring/,        ['ohrringe', 'schmuck', 'damen']],
    [/armband(?!uhr)|armreif|bracelet|\banklet\b|fusskett/,      ['kategorie-armband', 'schmuck']],
    [/armbanduhr|\buhr\b|\bwatch\b|smartwatch|wanduhr|tischuhr|wecker/, ['uhr', 'schmuck']],
    [/halskette|\bkette\b|necklace|anhanger|collier|choker|\btassel\b/, ['kategorie-halskette', 'schmuck']],
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
    // Home / Licht / Küche / Deko
    [/\blampe\b|leuchte|beleuchtung|projektor|nachtlicht|led.?strip|lichterkette/, ['beleuchtung']],
    [/diffuser|\baroma\b|duftkerze/,                            ['home', 'deko', 'wellness']],
    [/\bkuche\b|kitchen|kuchengerat|gemuseschneider|zwiebelschneider|\bschaler\b|obstschneider/, ['home', 'küche']],
    [/\bdeko\b|\bvase\b|\bkerze\b|bilderrahmen|wandbild/,       ['home', 'deko']],
    [/trinkflasche|water.?bottle|thermobecher|thermosflasche/, ['home']],
    [/\bbesen\b|schaber|wischer|\bmop\b|reinigungstuch|putztuch|fussel/, ['home']],
    // Fitness / Outdoor
    [/\byoga\b|widerstandsband|resistance.?band|\bhantel\b|fitness/, ['fitness']],
    [/camping|\bzelt\b|wandern/,                                ['outdoor', 'camping']],
    [/sonnenschirm|gartenmoebel|liegestuhl|hangematte|\bgrill\b/, ['outdoor', 'garten']],
    [/luftmatratze|schwimmreif|pool\b|planschbecken|strandtuch/, ['strand', 'sommer']],
    [/haarmaske|shampoo|haaroel|haarspulung|conditioner|haarkur/, ['beauty']],
    // Sommer / Ventilator
    [/ventilator|\blufter\b|halsventilator|stehventilator/,     ['gadget', 'sommer']],
    // Auto / Handy / Gadget
    [/\bauto\b|\bkfz\b|autozubehor/,                            ['auto']],
    [/\bhandy\b|\bphone\b|telefon|airpod|kopfhorer|earbud|ladegerat|ladekabel|smartwatch/, ['gadget']],
    // Haustier / Baby
    [/\bhund\b|\bkatze\b|haustier|\bdog\b|\bcat\b|\bpet\b/,     ['haustier']],
    [/\bbaby\b|kleinkind|sabbertuch|schnuller/,                 ['baby', 'kinder']],
    // Herren-Grooming
    [/bartschneider|haarschneider|rasierer|bartpflege|trimmer/, ['herren']],
    // Geschlecht (breit, für „Für Ihn/Für Sie")
    [/\bherren\b|\bmanner\b|\bmens\b|\bmann\b/,                 ['herren']],
    [/\bdamen\b|\bfrauen\b|\bwomen\b|\bwomens\b/,               ['damen']],
  ];
  for (const [re, tags] of R) if (re.test(s)) tags.forEach(t => out.add(t));
  return [...out];
}
