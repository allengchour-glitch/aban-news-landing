#!/usr/bin/env node
/* LuxeStyle — bigbuy_import.mjs  (NEUE Lieferantenfirma BigBuy → nur TOP-Produkte importieren)
 *
 * Holt aus dem BigBuy-Katalog (EU-Lager, DDP-fähig) kuratierte TOP-Produkte für on-brand Kategorien
 * (Schmuck/Taschen/Uhren/Sonnenbrillen/Damenmode), prüft Bilder (HTTP-200), legt sie sauber als Shopify-
 * Produkte an (ACTIVE, DE-Titel via Gemini, gesunde CHF-Marge, Tags+SEO), publiziert in alle Kanäle und
 * sortiert sie in Smart-Collections. Idempotent (Ledger). No-op ohne Creds. DRY_RUN ist DEFAULT.
 *
 * ── API VERIFIZIERT 2026-06-15 (Prod-Key, live geprüft):
 *    base = https://api.bigbuy.eu (PROD; Sandbox-Key liefert dieser Account NICHT) · Auth: Bearer <BIGBUY_API_KEY>
 *    Kandidatenquelle: GET /rest/catalog/productsinformation.json?isoCode=de → [{id, sku, name, description}]
 *    Preis/aktiv:      GET /rest/catalog/product/{id}.json?isoCode=de → {wholesalePrice, retailPrice, active, taxonomy, categories[]}
 *    Bilder:           GET /rest/catalog/productimages/{id}.json → {id, images:[{url, isCover, ...}]}
 *    ⚠️ Rate-Limit ist STRENG (Body „You exceeded the rate limit") → Backoff + Pausen zwischen Calls (eingebaut).
 *    Hinweis: productsinformation.json ist der Voll-Katalog (gross) → einmal laden + im Speicher filtern.
 *
 * DRY_RUN ist Default → nur suchen + Kandidaten listen (nichts in Shopify anlegen). LIVE=1 zum Anlegen.
 * ENV: BIGBUY_API_KEY · [BIGBUY_ENV=prod|sandbox] (Default prod) ·
 *      SHOPIFY_CLIENT_ID/SECRET (o. SHOPIFY_ADMIN_TOKEN), SHOPIFY_SHOP · [GEMINI_API_KEY] ·
 *      [CATS=schmuck,taschen,uhren,sonnenbrillen] · [PER=4] · [MARGIN=2.6] · [MAX_COST_EUR=60] · [LIVE=1]
 */
import fs from 'node:fs';

const BB_KEY = (process.env.BIGBUY_API_KEY || '').trim();
const BB_BASE = (process.env.BIGBUY_ENV || 'prod').toLowerCase() === 'sandbox'
  ? 'https://api.sandbox.bigbuy.eu' : 'https://api.bigbuy.eu';
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';
const LEDGER = 'dropship/bigbuy_done.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PER = Math.max(1, parseInt(process.env.PER || '4', 10) || 4);
const MARGIN = parseFloat(process.env.MARGIN || '2.6') || 2.6;     // auf wholesalePrice (EU-Einkauf)
const EUR_CHF = 0.96;
const MAX_COST_EUR = parseFloat(process.env.MAX_COST_EUR || '60') || 60; // Einkaufs-Deckel je Stück
const MIN_COST_EUR = parseFloat(process.env.MIN_COST_EUR || '0') || 0;   // Einkaufs-Untergrenze (für High-End-Wellen)
const GAP = parseInt(process.env.GAP || '1500', 10) || 1500;       // Pause zwischen BigBuy-Calls (Rate-Limit)
const DRY = process.env.LIVE !== '1';                              // DRY ist Default
const CATS = (process.env.CATS || 'schmuck,taschen,uhren,sonnenbrillen').split(',').map(s => s.trim()).filter(Boolean);
// Global: Wholesale-Grosspackungen / Mehrstück-Sets (für Einzelhandel unpassend) kategorieübergreifend ausschliessen
const GLOBAL_BAN = ['pcs)', ' pcs', '(18', '(24', '(36', '(48', '(12 ', '(6 pcs', '12 pcs', '18 pcs', '24 pcs', '36 pcs', '48 pcs', '50 pcs', '100 pcs', ' uds)', ' uds.', 'großpack', 'grosspack', 'bulk', 'wholesale', 'display 12', 'display 24'];

/* On-brand TOP-Kategorien. `anchor` = Namens-Anker (DE/EN/ES) gegen den DE-Produktnamen aus productsinformation. */
const CONFIG = {
  schmuck: { coll: { handle: 'premium-schmuck', title: '💎 Premium Schmuck', tag: 'schmuck' },
    extraTags: ['damen', 'geschenk', 'premium'], type: 'Schmuck', maxCost: MAX_COST_EUR,
    anchor: ['halskette', 'kette', 'armband', 'ohrring', 'ohrstecker', 'ring ', 'anhänger', 'armreif', 'collier',
             'jewel', 'necklace', 'bracelet', 'earring', 'pendant', 'collar', 'pulsera', 'anillo', 'pendiente'],
    ban: ['spielzeug', 'kinder', 'aufkleber', 'toy', 'kids', 'child', 'sticker', 'handyhülle', 'case', 'usb', 'pendrive', 'stick', 'schlüsselbund', 'datenträger', 'speicher', 'hundehalsband'],
    bullets: ['Edles Design für jeden Anlass', 'Hochwertige Verarbeitung', 'Schöne Geschenkidee', 'Hautfreundliche Materialien'] },
  taschen: { coll: { handle: 'sub-taschen', title: '👜 Taschen', tag: 'tasche' },
    extraTags: ['damen', 'accessoire', 'premium'], type: 'Taschen', maxCost: MAX_COST_EUR,
    anchor: ['handtasche', 'tasche', 'umhängetasche', 'schultertasche', 'clutch', 'shopper', 'rucksack',
             'handbag', 'bag', 'tote', 'crossbody', 'bolso'],
    ban: ['müll', 'staubsauger', 'werkzeug', 'schlafsack', 'trash', 'vacuum', 'tool bag', 'sleeping bag', 'kosmetiktasche klein', 'laptop', 'notebook', 'tablet', 'ngs', 'leinwand', 'beamer', 'stativ', 'projektor', 'computer', 'pc-', 'kamera', 'innovagoods', 'ärmeldecke', 'decke', 'matte', 'regal', 'gabel', 'löffel', 'besteck', 'lkw', 'bagger', 'spielzeug', 'amefa', 'organisationsregal', 'gymbag', 'sleekbag', 'papiertüte', 'papiertasche', 'papier', 'geschenktüte', 'geschenkbeutel', 'taschenuhr'],
    bullets: ['Vielseitig kombinierbar', 'Hochwertiges Material', 'Durchdachte Fächer', 'Eleganter Begleiter für jeden Tag'] },
  uhren: { coll: { handle: 'uhren', title: '⌚ Uhren', tag: 'uhren' },
    extraTags: ['accessoire', 'geschenk', 'premium'], type: 'Uhren', maxCost: MAX_COST_EUR,
    anchor: ['armbanduhr', 'uhr', 'watch', 'reloj', 'timepiece'],
    ban: ['wanduhr', 'wecker', 'küchen', 'kinder', 'spielzeug', 'wall clock', 'kids watch', 'toy'],
    bullets: ['Zeitloses Design', 'Präzises Uhrwerk', 'Edles Geschenk', 'Für Business & Freizeit'] },
  sonnenbrillen: { coll: { handle: 'sonnenbrillen-eyewear', title: '🕶️ Sonnenbrillen', tag: 'sonnenbrille' },
    extraTags: ['accessoire', 'sommer', 'damen'], type: 'Sonnenbrillen', maxCost: MAX_COST_EUR,
    anchor: ['sonnenbrille', 'sunglass', 'gafas de sol', 'eyewear'],
    ban: ['lesebrille', 'schutzbrille', 'kinder', 'reading glasses', 'safety glasses', 'kids'],
    bullets: ['UV-Schutz', 'Trendiges Design', 'Leichter Tragekomfort', 'Inkl. Etui'] },
  damenmode: { coll: { handle: 'damen-mode', title: '👗 Damen-Mode', tag: 'damen' },
    extraTags: ['sommer-2026', 'kleid', 'premium'], type: 'Damenmode', maxCost: MAX_COST_EUR,
    anchor: ['damenkleid', 'sommerkleid', 'maxikleid', 'midikleid', 'kleid ', 'bluse', 'damenrock', 'rock ', 'jumpsuit', 'tunika', 'damen-shirt', 'damenshirt', 'dress ', 'blouse', 'skirt', 'vestido', 'falda'],
    ban: ['herren', 'kinder', 'baby', 'men ', 'kids', 'uhr', 'sonnenbrille', 'brille', 'ring ', 'kette', 'armband', 'ohrring', 'tasche', 'rucksack', 'schuh', 'parfum', 'geldbörse', 'portemonnaie', 'kostüm', 'karneval', 'disney', 'minnie', 'mickey', 'mouse', 'wonder woman', 'superman', 'spiderman', 'batman', 'marvel', 'princess', 'prinzessin', 'cosplay', 'seven til midnight', 'dessous', 'lingerie', 'negligee', 'body ', 'hund', 'halsband', 'halfter', 'kopfhalfter', 'dressur', 'leine', 'haustier', 'tier'],
    bullets: ['Femininer Schnitt', 'Angenehmer Stoff', 'Vielseitig kombinierbar', 'Premium-Look zum fairen Preis'] },
  parfum: { coll: { handle: 'parfum-duefte', title: '🌸 Parfum & Düfte', tag: 'parfum' },
    extraTags: ['beauty', 'geschenk', 'premium'], type: 'Parfum', maxCost: MAX_COST_EUR,
    anchor: ['eau de parfum', 'eau de toilette', 'parfum', 'cologne', 'fragrance', 'perfume', 'duftset'],
    ban: ['kinder', 'spielzeug', 'raumduft', 'diffuser', 'auto', 'lufterfrischer', 'nachfüll', 'kerze', 'duftkerze', 'waschmittel', 'deo ', 'deodorant', 'déodorant', 'roll-on', 'handschuh', 'gloves', 'seife', 'lotion', 'creme', 'slime', 'spielschleim', 'toys', 'dr. tree', 'empfindliche haut', 'moroccanoil', 'haar-duft', 'hair mist', 'fragrance mist', 'tamagotchi', 'maskottchen'],
    bullets: ['Original-Markenduft', 'Lang anhaltende Sillage', 'Edles Geschenk', '100% Original, schnelle EU-Lieferung'] },
  lederwaren: { coll: { handle: 'lederwaren', title: '👝 Leder & Accessoires', tag: 'leder' },
    extraTags: ['accessoire', 'geschenk', 'premium'], type: 'Lederwaren', maxCost: MAX_COST_EUR,
    anchor: ['geldbörse', 'geldbeutel', 'portemonnaie', 'brieftasche', 'kartenetui', 'ledergürtel', 'gürtel leder', 'wallet', 'leather belt'],
    ban: ['kinder', 'spielzeug', 'auto', 'hund', 'werkzeug', 'koffer', 'laptop', 'notebook', 'dkd', 'blackfit8', 'safta', 'handyhülle', 'home decor', 'aluminium', 'glow up', 'mariposa', 'disney', 'minnie', 'marvel'],
    bullets: ['Hochwertiges Leder-Feeling', 'Kompakt & alltagstauglich', 'Edles Geschenk', 'Schnelle EU-Lieferung'] },
  sets: { coll: { handle: 'trainingsanzuege-sets', title: '🏃 Trainingsanzüge & Sets', tag: 'set' },
    extraTags: ['sport', 'set', 'marke', 'premium'], type: 'Set', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['trainingsanzug', 'chándal', 'chandal', 'jogginganzug', 'tracksuit', 'jogging-set', 'sportanzug', 'sweatsuit'],
    ban: ['baby', 'babys', 'kinder', 'mädchen', 'junge', 'jungen', 'paw patrol', 'minnie', 'mickey', 'frozen', 'spiderman', 'disney', 'marvel', 'lol surprise', 'niñ', 'enfant'],
    bullets: ['2-teilig: Oberteil + Hose abgestimmt', 'Marken-Sportswear, EU-Lager', 'Bequem & atmungsaktiv', '100% Original, schnelle EU-Lieferung'] },
  gaming: { coll: { handle: 'gaming', title: '🎮 Gaming', tag: 'gaming' },
    extraTags: ['gaming', 'tech', 'hype-2026', 'geschenk'], type: 'Gaming', maxCost: MAX_COST_EUR,
    anchor: ['gaming controller', 'gamepad', 'gaming headset', 'joy-con', 'playstation', 'xbox', 'nintendo switch', 'gaming-maus', 'gaming maus', 'mechanische tastatur', 'gaming-tastatur', 'mauspad', 'joystick', 'lenkrad gaming', 'racing wheel'],
    ban: ['kinder', 'spielzeug', 'baby', 'toy', 'aufkleber', 'sticker', 'mandoline', 'reibe', 'gemüseschneider', 'reibeisen', 'choppie', 'kostüm', 'tasche', 'rucksack', 'hülle', 'funda', 'sweatshirt', 't-shirt'],
    bullets: ['Für Gamer gemacht', 'Präzise & reaktionsschnell', 'Modernes RGB-Design', 'Top Preis-Leistung'] },
  anime: { coll: { handle: 'anime', title: '🎌 Anime & Manga', tag: 'anime' },
    extraTags: ['anime', 'geschenk', 'hype-2026', 'sammler'], type: 'Anime', maxCost: MAX_COST_EUR,
    anchor: ['anime', 'manga', 'funko', 'cosplay', 'otaku', 'dragon ball', 'naruto', 'one piece', 'sammelfigur'],
    ban: ['karneval', 'erwachsenenkostüm', 'baby'],
    bullets: ['Für Anime- & Manga-Fans', 'Detailgetreu', 'Tolles Sammler- & Geschenkstück', 'Beliebte Motive'] },
  fishing: { coll: { handle: 'angeln', title: '🎣 Angeln', tag: 'angeln' },
    extraTags: ['angeln', 'outdoor', 'hobby'], type: 'Angelsport', maxCost: MAX_COST_EUR,
    anchor: ['angeln', 'angelrute', 'angelrolle', 'köder', 'wobbler', 'fishing', 'angelschnur', 'angelkoffer'],
    ban: ['kinder', 'spielzeug', 'toy'],
    bullets: ['Für Angler', 'Robust & langlebig', 'Praktisch am Wasser', 'Gutes Preis-Leistungs-Verhältnis'] },
  tauchen: { coll: { handle: 'tauchen', title: '🤿 Tauchen & Schnorcheln', tag: 'tauchen' },
    extraTags: ['tauchen', 'wassersport', 'sommer'], type: 'Wassersport', maxCost: MAX_COST_EUR,
    anchor: ['tauchen', 'taucher', 'schnorchel', 'tauchmaske', 'neopren', 'diving', 'schwimmbrille', 'tauchflossen'],
    ban: ['kinder', 'aufblasbar', 'schwimmflügel', 'spielzeug', 'hund', 'dog', 'halsband', 'katze', 'haustier', 'pet ', 'leine', 'verkleidung', 'my other me', 'naruto', 'baby', 'kostüm'],
    bullets: ['Klare Sicht unter Wasser', 'Bequemer, dichter Sitz', 'Robustes Material', 'Für Pool, See & Meer'] },
  metalldetektor: { coll: { handle: 'metalldetektoren-schatzsuche', title: '🔍 Metalldetektoren & Schatzsuche', tag: 'metalldetektor' },
    extraTags: ['metalldetektor', 'outdoor', 'hobby', 'schatzsuche'], type: 'Metalldetektor', maxCost: 130,
    anchor: ['metalldetektor', 'metal detector', 'schatzsuche', 'detektor de metales'],
    ban: ['leitungssucher', 'kabeldetektor', 'wand', 'kinder', 'spielzeug'],
    bullets: ['Für die Schatzsuche', 'Einfache Bedienung', 'Outdoor-tauglich', 'Spannendes Hobby'] },
  velo: { coll: { handle: 'velo', title: '🚲 Velo & Radsport', tag: 'velo' },
    extraTags: ['velo', 'fahrrad', 'sport', 'outdoor'], type: 'Radsport', maxCost: MAX_COST_EUR,
    anchor: ['e-bike', 'ebike', 'pedelec', 'fahrradhelm', 'fahrradlicht', 'fahrrad-licht', 'fahrradpumpe', 'fahrradschloss', 'fahrradtasche', 'fahrradkorb', 'fahrradcomputer', 'fahrradsattel', 'fahrradklingel', 'fahrradspiegel', 'fahrradständer', 'fahrradstander', 'fahrrad-handyhalter', 'handyhalterung fahrrad', 'rennrad', 'radtrikot', 'radhose', 'velohelm', 'luftpumpe fahrrad', 'multiwerkzeug fahrrad', 'fahrradschlauch', 'satteltasche', 'rahmentasche', 'lenkertasche'],
    ban: ['dkd', 'deko', 'wanduhr', 'wanddekoration', 'deko-figur', 'figur', 'playmobil', 'fußstütze', 'fussstütze', 'laufschuhe', 'spielzeug', 'kinder', 'dreirad', 'laufrad', 'heimtrainer', 'hometrainer', 'ergometer'],
    bullets: ['Für Velofahrer & Pendler', 'Leicht & funktional', 'Mehr Sicherheit & Komfort', 'Top für Strasse & Trail'] },
  etrotti: { coll: { handle: 'e-scooter-trottinett', title: '🛴 E-Scooter & Trottinett', tag: 'e-scooter' },
    extraTags: ['e-scooter', 'trottinett', 'mobilität', 'pendler', 'premium'], type: 'E-Scooter', maxCost: MAX_COST_EUR,
    anchor: ['e-scooter', 'escooter', 'elektroroller', 'elektro-roller', 'elektro-scooter', 'elektroscooter', 'tretroller', 'cityroller', 'trottinett', 'trottinette', 'kickscooter', 'roller elektro', 'scooter elektro'],
    ban: ['kinder', 'baby', 'spielzeug', 'toy', 'niño', 'infantil', 'laufrad', 'dreirad', 'rollschuh', 'inline', 'rollerblade', 'skateboard', 'waveboard', 'playmobil', 'lego', 'mini-roller', 'pizzaroller', 'teigroller', 'farbroller', 'malerroller', 'lockenroller', 'massageroller', 'fusselroller'],
    bullets: ['Wendig & alltagstauglich', 'Ideal für die letzte Meile', 'Faltbar & leicht zu verstauen', 'Umweltfreundlich pendeln'] },
  fitness: { coll: { handle: 'fitness', title: '💪 Fitness & Training', tag: 'fitness' },
    extraTags: ['fitness', 'sport', 'training', 'wellness'], type: 'Fitness', maxCost: MAX_COST_EUR,
    anchor: ['báscula inteligente', 'báscula de grasa corporal', 'körperfettwaage bluetooth', 'smarte personenwaage', 'fitness', 'hantel', 'kurzhantel', 'widerstandsband', 'springseil', 'bauchtrainer', 'faszienrolle', 'klimmzugstange', 'gewichtsmanschette'],
    ban: ['kinder', 'spielzeug'],
    bullets: ['Effektives Training für daheim', 'Robust & rutschfest', 'Platzsparend', 'Für jedes Level'] },
  // ── Frische Nischen 2026-06-23 (User: Drohnen/Beamer/Smartwatch/Kaffee/Grill/Spielzeug/Yoga/Haustier-Tech) ──
  drohnen: { coll: { handle: 'drohnen-kameras', title: '🚁 Drohnen & Kameras', tag: 'drohne' },
    extraTags: ['drohne', 'tech', 'hype-2026', 'geschenk'], type: 'Drohnen', maxCost: MAX_COST_EUR,
    anchor: ['drohne', 'drone', 'quadrocopter', 'quadcopter', 'quadrokopter', 'fpv-drohne', 'kameradrohne', 'mini-drohne', 'faltdrohne'],
    ban: ['ersatzpropeller', 'propellerschutz', 'ersatzakku', 'ladekabel einzeln', 'tasche für drohne', 'aufkleber'],
    bullets: ['Stabile Flugkontrolle', 'HD-Kamera für Luftaufnahmen', 'Faltbar & reisefreundlich', 'Auch für Einsteiger'] },
  beamer: { coll: { handle: 'beamer-projektoren', title: '📽️ Beamer & Projektoren', tag: 'beamer' },
    extraTags: ['beamer', 'heimkino', 'tech', 'geschenk'], type: 'Beamer', maxCost: MAX_COST_EUR,
    anchor: ['beamer', 'projektor', 'projector', 'proyector', 'heimkino-projektor', 'led-projektor', 'mini-beamer'],
    ban: ['halterung', 'ersatzlampe', 'lampe für', 'leinwand', 'tasche', 'kinder', 'spielzeug', 'sternenprojektor', 'nachtlicht'],
    bullets: ['Großes Bild fürs Heimkino', 'Einfacher Anschluss (HDMI/USB)', 'Kompakt & leise', 'Kino-Feeling zuhause'] },
  smartwatch: { coll: { handle: 'smartwatches-wearables', title: '⌚ Smartwatches & Wearables', tag: 'smartwatch' },
    extraTags: ['smartwatch', 'tech', 'fitness', 'geschenk', 'premium'], type: 'Smartwatch', maxCost: MAX_COST_EUR,
    anchor: ['smartwatch', 'smart watch', 'fitness-tracker', 'fitnesstracker', 'fitness tracker', 'smartband', 'smart band', 'fitness-armband', 'activity tracker', 'aktivitätstracker'],
    ban: ['kinder', 'spielzeug', 'armbanduhr', 'analoguhr', 'ersatzarmband', 'ladekabel', 'schutzfolie', 'hülle'],
    bullets: ['Schritte, Puls & Schlaf im Blick', 'Benachrichtigungen am Handgelenk', 'Lange Akkulaufzeit', 'Wasserabweisend'] },
  kaffee: { coll: { handle: 'kaffee-maschinen', title: '☕ Kaffee & Espresso', tag: 'kaffee' },
    extraTags: ['kaffee', 'küche', 'geschenk', 'premium'], type: 'Kaffee', maxCost: MAX_COST_EUR,
    anchor: ['taza calentadora', 'beheizte tasse', 'tassenwärmer usb', 'espumador de leche eléctrico', 'milchaufschäumer automatisch', 'kaffeemaschine', 'kaffeevollautomat', 'espressomaschine', 'siebträger', 'siebtrager', 'kapselmaschine', 'padmaschine', 'milchaufschäumer', 'milchaufschaumer', 'mokkakanne', 'kaffeemühle', 'kaffeemuhle', 'french press', 'cafetera'],
    ban: ['kinder', 'spielzeug', 'tasse', 'becher', 'kaffeefilter papier', 'entkalker', 'reinigungstabletten'],
    bullets: ['Café-Genuss für zuhause', 'Einfache Bedienung', 'Schnell startklar', 'Für jeden Kaffee-Moment'] },
  whisky: { coll: { handle: 'bar-wein-accessoires', title: '🥃 Bar & Whisky', tag: 'bar' },
    extraTags: ['geschenk', 'premium', 'herren'], type: 'Bar-Accessoire', maxCost: 55,
    anchor: ['piedras de whisky', 'vasos de whisky', 'set de whisky', 'whisky', 'whiskey', 'whiskygläser', 'whiskysteine', 'whisky-set', 'decanter', 'dekanter', 'karaffe whisky'],
    ban: ['flasche', 'alkohol', 'spirituose', 'parfum', 'likör', 'wein '],
    bullets: ['Edles Geschenk für Geniesser', 'Hochwertige Materialien', 'Perfekt für den Whisky-Abend', 'Stilvolle Bar-Ausstattung'] },
  touchlampen: { coll: { handle: 'beleuchtung-lampen', title: '💡 Beleuchtung & Lampen', tag: 'beleuchtung' },
    extraTags: ['geschenk', 'gadget', 'deko'], type: 'Stimmungslicht', maxCost: 70,
    anchor: ['lámparas de amistad', 'lámpara a distancia', 'lámpara táctil', 'friendship lamp', 'touch lamp', 'freundschaftslampe', 'stimmungslampe', 'nachttischlampe touch', 'tischlampe touch'],
    ban: ['deckenlampe', 'kronleuchter', 'arbeitslampe', 'baustrahler', 'taschenlampe', 'strassenlaterne', 'wandlampe aussen'],
    bullets: ['Stimmungsvolles Licht', 'Emotionales Geschenk', 'Touch-Steuerung', 'Perfekt fürs Schlafzimmer'] },
  ultraschall: { coll: { handle: 'trend-gadgets', title: '🔥 Trend-Gadgets', tag: 'viral' },
    extraTags: ['gadget', 'geschenk', 'reinigung'], type: 'Ultraschallreiniger', maxCost: 70,
    anchor: ['limpiador ultrasónico', 'limpiador de joyas', 'ultraschallreiniger', 'ultraschallreinigungsgerät', 'ultrasonic cleaner', 'schmuckreiniger', 'brillenreiniger ultraschall'],
    ban: ['kinder', 'spielzeug', 'zahnbürste', 'reinigungstabletten', 'reinigungsmittel', 'tabs'],
    bullets: ['Reinigt Schmuck & Brillen mühelos', 'Schonend per Ultraschall', 'Im Handumdrehen wieder glänzend', 'Vielseitig einsetzbar'] },
  grill: { coll: { handle: 'grill-bbq', title: '🔥 Grill & BBQ', tag: 'grill' },
    extraTags: ['grill', 'garten', 'outdoor', 'sommer'], type: 'Grill', maxCost: MAX_COST_EUR,
    anchor: ['grill', 'bbq', 'barbecue', 'gasgrill', 'holzkohlegrill', 'elektrogrill', 'smoker', 'kontaktgrill', 'tischgrill', 'feuerschale', 'feuerstelle', 'pizzaofen', 'barbacoa'],
    ban: ['kinder', 'spielzeug', 'grillanzünder', 'grillkohle', 'einweggrill', 'grillpapier', 'sandwichmaker', 'waffeleisen'],
    bullets: ['Perfekt für Grillabende', 'Gleichmäßige Hitze', 'Robust & langlebig', 'Garten, Balkon & Terrasse'] },
  // ── Sommer-Cooling 2026 (User: Klimagerät/Lüfter für heissen Sommer) ──
  klima: { coll: { handle: 'klima-ventilatoren', title: '❄️ Klima & Ventilatoren', tag: 'klima' },
    extraTags: ['klima', 'ventilator', 'sommer', 'cooling', 'haushalt'], type: 'Ventilator & Klima', maxCost: 140,
    anchor: ['ventilator', 'standventilator', 'tischventilator', 'turmventilator', 'usb-ventilator', 'usb ventilator', 'mini-ventilator', 'mini ventilator', 'handventilator', 'taschenventilator', 'deckenventilator', 'bodenventilator', 'klimagerät', 'klimaanlage', 'mobile klimaanlage', 'luftkühler', 'luftkuehler', 'verdunstungskühler', 'verdunstungskuehler', 'air cooler', 'nebelventilator', 'sprühventilator', 'ventilador', 'climatizador', 'aire acondicionado', 'enfriador de aire'],
    ban: ['heizung', 'heizlüfter', 'heizluefter', 'heater', 'heizstrahler', 'ofen', 'föhn', 'foehn', 'haartrockner', 'auspuff', 'pc-lüfter', 'pc lüfter', 'gehäuselüfter', 'gehäuse', 'cpu-lüfter', 'cpu lüfter', 'grafikkarte', 'lüftungsgitter', 'staubsauger', 'ersatz', 'motorlüfter', 'abluft', 'dunstabzug', 'kinder', 'spielzeug', 'thermostat', 'termostato', 'rgb', 'gaming', '80mm', '92mm', '120mm', '140mm', 'mm ', 'disipador', 'ventilador de pc', 'ventilador caja', 'caja pc', 'pc gaming', 'placa base', 'cpu', 'torre pc', 'ordenador', 'portátil', 'laptop'],
    bullets: ['Kühle Erfrischung für heisse Tage', 'Leise &amp; energiesparend', 'Ideal für Schlafzimmer, Büro &amp; Wohnung', 'Schnell startklar'] },
  // ── Luftreiniger 2026 (User: Luftreiniger fürs Raumklima — Beurer/Taurus, in die Klima-Collection) ──
  luftreiniger: { coll: { handle: 'klima-ventilatoren', title: '❄️ Klima & Ventilatoren', tag: 'klima' },
    extraTags: ['klima', 'luftreiniger', 'raumklima', 'haushalt', 'wellness'], type: 'Luftreiniger', maxCost: 220,
    anchor: ['luftreiniger', 'raumluftreiniger', 'air purifier', 'purificador de aire', 'purificador', 'luftwäscher', 'luftwaescher', 'ionisator luft', 'hepa luftreiniger'],
    ban: ['deko', 'figur', 'dkd', 'home decor', 'filter einzeln', 'ersatzfilter', 'ersatz-filter', 'auto', 'kfz', 'staubsauger', 'wasserfilter', 'kühlschrank', 'klimaanlage', 'split', 'mitsubishi', 'panasonic', 'samsung far', 'reiniger spray', 'reinigungsmittel'],
    bullets: ['Saubere, frische Raumluft', 'Filtert Pollen, Staub &amp; Gerüche', 'Leise — auch nachts', 'Ideal für Allergiker'] },
  // ── Mobile/Tragbare Klimaanlagen (User: Galaxus-Monoblock-Geräte — Olimpia/Ecoflow/BEKO/UFESA) ──
  mobilklima: { coll: { handle: 'klima-ventilatoren', title: '❄️ Klima & Ventilatoren', tag: 'klima' },
    extraTags: ['klima', 'klimaanlage', 'mobil', 'monoblock', 'sommer', 'cooling', 'premium'], type: 'Mobile Klimaanlage', maxCost: 500,
    anchor: ['tragbare klimaanlage', 'mobile klimaanlage', 'mobiles klimagerät', 'monoblock klimaanlage', 'klimaanlage portabel', 'portable klimaanlage'],
    ban: ['fernbedienung', 'ersatzteil', 'ersatz', 'halterung', 'abflussrinne', 'abflu', 'schlauch einzeln', 'filter einzeln', 'wandhalter', 'split', 'kit', 'zubehör'],
    bullets: ['Mobile Kühlung — kein Einbau nötig', 'Einfach aufstellen &amp; loslegen', 'Für Schlafzimmer, Büro &amp; Wohnung', 'Markenqualität'] },
  // ── Beliebte Produkte 2026 (Research: geliebt + nützlich + gute Marge — "was Menschen brauchen") ──
  massage: { coll: { handle: 'wellness-massage', title: '💆 Wellness & Massage', tag: 'wellness' },
    extraTags: ['wellness', 'massage', 'erholung', 'geschenk'], type: 'Massagegerät', maxCost: 120,
    anchor: ['massagepistole', 'massagegerät', 'faszienpistole', 'massage gun', 'nackenmassagegerät', 'shiatsu', 'fussmassagegerät', 'fußmassagegerät', 'rückenmassage', 'massagekissen', 'akupressurmatte', 'akupressur', 'nagelmatte'],
    ban: ['kinder', 'spielzeug', 'ersatz', 'aufsatz einzeln', 'massageöl', 'massagekerze', 'gel', 'creme'],
    bullets: ['Löst Verspannungen sofort', 'Erholung wie im Spa — zuhause', 'Ideal für Büro &amp; Sport', 'Tolles Geschenk'] },
  kuechenhelfer: { coll: { handle: 'kuechenhelfer', title: '🍳 Küchenhelfer & Gadgets', tag: 'kueche' },
    extraTags: ['kueche', 'haushalt', 'gadget', 'geschenk'], type: 'Küchenhelfer', maxCost: 90,
    anchor: ['gemüseschneider', 'zwiebelschneider', 'multischneider', 'gemüsehobel', 'milchaufschäumer', 'milchaufschaumer', 'vakuumierer', 'vakuumiergerät', 'folienschweiss', 'wasserkocher temperatur', 'glas-wasserkocher', 'glaswasserkocher', 'küchenmaschine', 'zerkleinerer', 'spiralschneider'],
    ban: ['kinder', 'spielzeug', 'ersatzmesser', 'ersatz', 'beutel einzeln', 'reiniger'],
    bullets: ['Spart Zeit in der Küche', 'Einfach &amp; schnell', 'Top bewertet', 'Praktisches Geschenk'] },
  beautydevice: { coll: { handle: 'beauty-geraete', title: '✨ Beauty-Geräte', tag: 'beauty' },
    extraTags: ['beauty', 'pflege', 'device', 'premium', 'wellness'], type: 'Beauty-Gerät', maxCost: 180,
    anchor: ['led maske gesicht', 'lichttherapie maske', 'rotlicht gesichtsmaske', 'led beauty', 'gesichtsreinigungsbürste', 'sonische reinigungsbürste', 'gesichtsbürste elektrisch', 'ipl haarentfernung', 'ipl gerät', 'haarentfernungsgerät', 'mikrodermabrasion', 'gesichtsmassage gerät'],
    ban: ['kinder', 'spielzeug', 'ersatz', 'creme', 'serum', 'maske tuch', 'gesichtsmaske tuch'],
    bullets: ['Beauty-Salon für zuhause', 'Sichtbare Ergebnisse', 'Premium-Pflege-Tech', 'Tolles Geschenk'] },
  waerme: { coll: { handle: 'waerme-komfort', title: '🔥 Wärme & Komfort', tag: 'wellness' },
    extraTags: ['wellness', 'wärme', 'komfort', 'haushalt'], type: 'Wärme & Komfort', maxCost: 100,
    anchor: ['heizkissen', 'heizdecke', 'wärmekissen', 'waermekissen', 'heizkissen nacken', 'wärmeunterbett', 'nackenwärmer', 'fusswärmer', 'fußwärmer', 'wärmflasche elektrisch'],
    ban: ['kinder', 'spielzeug', 'ersatz', 'heizlüfter', 'heizstrahler', 'auto', 'kfz'],
    bullets: ['Wohlige Wärme auf Knopfdruck', 'Lindert Verspannungen', 'Gemütlich an kalten Tagen', 'Energiesparend'] },
  // ── Strand & Wasserspass 2026 (User: Gummiboot/Badesachen — Sommer) ──
  wasserstrand: { coll: { handle: 'strand-wasserspass', title: '🏖️ Strand & Wasserspass', tag: 'strand' },
    extraTags: ['strand', 'sommer', 'pool', 'wasser', 'outdoor'], type: 'Strand & Wasser', maxCost: 110,
    anchor: ['aufblasbarer boot', 'schlauchboot', 'gummiboot', 'paddelboot', 'schwimmring', 'schwimmreifen', 'strandmatte', 'strandtuch', 'badetuch', 'sonnenliege', 'schwimmbrille', 'taucherbrille', 'schnorchel', 'luftmatratze', 'strandmuschel', 'strandzelt', 'wasserball', 'planschbecken', 'schwimmflügel', 'schwimmweste kinder', 'luftpumpe', 'elektrische luftpumpe', 'elektropumpe', 'elektrische pumpe', 'fusspumpe', 'fußpumpe', 'handpumpe', 'akku-pumpe', 'aufblaspumpe'],
    ban: ['ersatzventil', 'ventil einzeln', 'reparaturset', 'flicken', 'auto', 'kfz', 'ersatz', 'rettungsweste profi', 'düse für', 'filterpumpe', 'sandfilter', 'poolpumpe'],
    bullets: ['Sommer-Spass am Wasser', 'Perfekt für Pool, See &amp; Strand', 'Schnell aufgepumpt', 'Für die ganze Familie'] },
  // ── Akku-/Mobile Ventilatoren 2026 (User: mobile venti akku — Nacken/Hand/USB, für unterwegs) ──
  akkuventi: { coll: { handle: 'klima-ventilatoren', title: '❄️ Klima & Ventilatoren', tag: 'klima' },
    extraTags: ['klima', 'ventilator', 'akku', 'mobil', 'sommer', 'reise'], type: 'Akku-Ventilator', maxCost: 90,
    anchor: ['nackenventilator', 'halsventilator', 'akku-ventilator', 'akkuventilator', 'tragbarer ventilator', 'faltbarer ventilator', 'handventilator', 'taschenventilator', 'mini-ventilator', 'usb-ventilator', 'ventilator aufladbar', 'aufladbarer ventilator', 'ventilator akku'],
    ban: ['standventilator', 'deckenventilator', 'turmventilator', 'bodenventilator', 'kastenventilator', 'heizung', 'pc-lüfter', 'pc lüfter', 'gehäuse', 'rgb', 'gaming', '80mm', '92mm', '120mm', '140mm', 'mm ', 'cpu', 'disipador', 'ersatz', 'ventilador de pc', 'caja pc'],
    bullets: ['Überall dabei — komplett kabellos', 'Per Akku/USB aufladbar', 'Perfekt für unterwegs, Reise &amp; Büro', 'Leise &amp; ultraleicht'] },
  // ── Dyson Premium (User: korrekt einsortieren — Hair-Tools vs. Haushalt getrennt) ──
  dysonhair: { coll: { handle: 'haarstyling-tools', title: '💇 Haarstyling & Tools', tag: 'haarstyling' },
    extraTags: ['haarstyling', 'beauty', 'premium', 'highend', 'dyson', 'marken'], type: 'Haarstyling-Tool', maxCost: 800,
    anchor: ['dyson airwrap', 'airwrap', 'dyson supersonic', 'supersonic', 'föhn dyson', 'haartrockner dyson', 'lockenstab dyson', 'glättbürste dyson', 'dyson hs0', 'dyson corrale', 'dyson nural'],
    ban: ['staubsauger', 'besenstaubsauger', 'handstaubsauger', 'akkusauger', 'mop', 'v15', 'v12', 'v11', 'v10', 'v8', 'washg', 'ersatz', 'filter', 'aufsatz einzeln'],
    bullets: ['Original Dyson-Technik', 'Salon-Ergebnis für zuhause', 'Schonend zum Haar', 'Premium-Marken-Tool'] },
  dysonhome: { coll: { handle: 'staubsauger-haushalt', title: '🏠 Staubsauger & Haushalt', tag: 'staubsauger' },
    extraTags: ['staubsauger', 'haushalt', 'premium', 'highend', 'dyson', 'marken'], type: 'Staubsauger', maxCost: 900,
    anchor: ['dyson v15', 'dyson v12', 'dyson v11', 'dyson v10', 'dyson v8', 'besenstaubsauger dyson', 'handstaubsauger dyson', 'akku-staubsauger dyson', 'staubsauger dyson', 'elektrischer mop dyson', 'dyson washg', 'dyson detect'],
    ban: ['airwrap', 'supersonic', 'föhn', 'foehn', 'haartrockner', 'lockenstab', 'glättbürste', 'beutel', 'filter einzeln', 'ersatz', 'akku einzeln', 'düse einzeln'],
    bullets: ['Original Dyson-Saugkraft', 'Kabellos &amp; beutellos', 'Stark gegen Staub &amp; Tierhaare', 'Premium-Marken-Gerät'] },
  spielzeug: { coll: { handle: 'kinderspielzeug', title: '🧸 Kinderspielzeug', tag: 'spielzeug' },
    extraTags: ['spielzeug', 'kinder', 'geschenk', 'familie'], type: 'Spielzeug', maxCost: MAX_COST_EUR,
    anchor: ['spielzeug', 'spielset', 'plüschtier', 'plüsch', 'kuscheltier', 'stofftier', 'bauklötze', 'bausteine', 'lernspielzeug', 'holzspielzeug', 'puppe', 'spielfigur', 'brettspiel', 'kinderpuzzle', 'steckspiel', 'motorikspielzeug'],
    ban: ['erwachsene', 'sex', 'erotik', 'dessous', 'waffe echt', 'munition'],
    bullets: ['Fördert Spiel & Fantasie', 'Sicher & kindgerecht', 'Tolles Geschenk', 'Stundenlanger Spielspaß'] },
  yoga: { coll: { handle: 'yoga-pilates', title: '🧘 Yoga & Pilates', tag: 'yoga' },
    extraTags: ['yoga', 'pilates', 'fitness', 'wellness'], type: 'Yoga & Pilates', maxCost: MAX_COST_EUR,
    anchor: ['yoga', 'pilates', 'yogamatte', 'yoga-matte', 'gymnastikmatte', 'yogablock', 'yoga-block', 'pilatesball', 'gymnastikball', 'faszienrolle', 'balance-board', 'balancekissen', 'meditationskissen', 'yogagurt'],
    ban: ['kinder', 'spielzeug', 'hantel schwer'],
    bullets: ['Für Yoga, Pilates & Stretching', 'Rutschfest & gelenkschonend', 'Leicht & gut verstaubar', 'Mehr Balance & Beweglichkeit'] },
  haustiertech: { coll: { handle: 'haustier-tech', title: '🐾 Haustier-Tech', tag: 'haustier-tech' },
    extraTags: ['haustier', 'tech', 'tier', 'geschenk'], type: 'Haustier-Tech', maxCost: MAX_COST_EUR,
    anchor: ['futterautomat', 'futterspender', 'trinkbrunnen', 'katzenbrunnen', 'haustierkamera', 'pet-kamera', 'gps-tracker hund', 'gps tracker katze', 'haustier-tracker', 'pfotenreiniger', 'fellpflege', 'haustier-haartrockner', 'automatischer ball', 'katzentoilette selbstreinigend'],
    ban: ['spielzeug', 'napf einfach', 'leine', 'halsband einfach', 'kissen', 'decke'],
    bullets: ['Smarte Versorgung deines Lieblings', 'Auch wenn du unterwegs bist', 'Einfach zu reinigen', 'Mehr Komfort für Tier & Halter'] },
  // ── Viral/Trending 2026 (TikTok-Hype: Galaxy/Sunset/Mond-Lampen, LED, Massagepistole, Haltungskorrektor) ──
  viral: { coll: { handle: 'trend-gadgets', title: '🔥 Trend-Gadgets', tag: 'viral' },
    extraTags: ['viral', 'trend', 'tiktok', 'hype-2026', 'geschenk'], type: 'Trend-Gadget', maxCost: MAX_COST_EUR,
    anchor: ['lámpara luna levitante', 'schwebende mondlampe', 'levitations-lampe', 'lámpara flotante magnética', 'altavoz levitante', 'altavoz flotante magnético', 'schwebender lautsprecher', 'levitations-lautsprecher', 'lámpara atardecer', 'sonnenuntergang lampe', 'sternenprojektor', 'galaxy projektor', 'galaxie projektor', 'sternenhimmel projektor', 'led projektor sterne', 'sunset lampe', 'sonnenuntergang lampe', 'sunset projektor', 'mondlampe', 'mond lampe', 'levitation', 'schwebende', 'led strip', 'led-streifen', 'led streifen', 'rgb streifen', 'lichterkette led', 'massagepistole', 'massage pistole', 'massagegerät tiefen', 'faszien-pistole', 'haltungskorrektor', 'haltungstrainer', 'rückenstütze haltung', 'aurora projektor', 'nordlicht projektor', 'flammen lampe', 'schwerelos', 'tischlampe touch', 'astronaut projektor'],
    ban: ['kinder', 'spielzeug', 'ersatz', 'fernbedienung einzeln', 'netzteil einzeln', 'glühbirne', 'auto', 'kfz', 'reifen'],
    bullets: ['Viraler TikTok-Hit', 'Sofort Stimmung im Raum', 'Tolles Geschenk', 'Einfach Plug & Play'] },
  // ── Tier-A Trendprodukte 2026 (Research 06-24: Wellness/Schlaf/Spa-zuhause, DE+ES-Keywords für BigBuy) ──
  trenda: { coll: { handle: 'trend-gadgets', title: '🔥 Trend-Gadgets', tag: 'viral' },
    extraTags: ['viral', 'trend', 'hype-2026', 'geschenk', 'wellness'], type: 'Trend-Gadget', maxCost: MAX_COST_EUR,
    anchor: ['lichtwecker', 'sonnenaufgang wecker', 'wake-up light', 'wake up light', 'despertador de luz', 'despertador amanecer',
      'ultraschallreiniger', 'ultraschall reiniger', 'schmuckreiniger', 'brillenreiniger', 'limpiador ultrasonico', 'limpiador por ultrasonidos',
      'rotlicht maske', 'led gesichtsmaske', 'lichttherapie maske', 'mascarilla led', 'mascarilla de fotones', 'fototerapia facial',
      'aroma diffuser', 'kaltluft diffusor', 'nebulizer diffusor', 'difusor de aire frio', 'difusor nebulizador', 'difusor de aromas',
      'freundschaftslampe', 'touch lampe', 'fernbeziehung lampe', 'lampara de amistad', 'lamparas a distancia',
      'duft halskette', 'aromatherapie anhanger', 'collar difusor', 'collar aromaterapia',
      'whisky steine', 'whisky glaser set', 'whiskey stones', 'piedras de whisky', 'set de vasos de whisky',
      'duschkopf filter', 'ionischer duschkopf', 'alcachofa de ducha con filtro', 'cabezal de ducha',
      'pflanzensensor', 'bodenfeuchte sensor', 'sensor de plantas', 'sensor de humedad',
      'beheizte tasse', 'temperatur tasse', 'taza calentadora', 'taza con control de temperatura'],
    ban: ['kinder', 'spielzeug', 'ersatz', 'fernbedienung einzeln', 'netzteil einzeln', 'glühbirne', 'auto', 'kfz', 'reifen', 'filter einzeln', 'ersatzfilter'],
    bullets: ['Viraler Wellness-Trend 2026', 'Premium-Geschenkidee', 'Spürbarer Mehrwert im Alltag', 'Einfach in der Anwendung'] },
  // ── Nachfrage-Kategorien 2026 (datenbasiert: Pet/Beauty/Home/Phone/Gürtel sind Top-Trends) ──
  beauty: { coll: { handle: 'premium-beauty', title: 'Beauty · Premium', tag: 'beauty' },
    extraTags: ['beauty', 'pflege', 'premium'], type: 'Beauty', maxCost: MAX_COST_EUR,
    anchor: ['masajeador de rodilla', 'masajeador de ojos', 'terapia luz roja', 'kniemassagegerät rotlicht', 'augenmassagegerät beheizt', 'antifaz masajeador', 'make-up', 'makeup', 'lippenstift', 'lipstick', 'foundation', 'mascara', 'lidschatten', 'eyeshadow', 'concealer', 'rouge', 'nagellack', 'gesichtscreme', 'gesichtsserum', 'serum', 'gesichtsmaske', 'hautpflege', 'bb cream', 'primer', 'highlighter', 'eyeliner', 'maquillaje', 'crema facial'],
    ban: ['kinder', 'spielzeug', 'parfum', 'eau de', 'cologne', 'haarfärbe', 'deodorant', 'rasier', 'epilier', 'set ffp', 'maske ffp', 'toy'],
    bullets: ['Hochwertige Pflege & Make-up', 'Marken-Beauty, EU-Lager', 'Für sichtbar schöne Haut', '100% Original, schnelle EU-Lieferung'] },
  home: { coll: { handle: 'wohnen-dekoration', title: '🏠 Wohnen & Dekoration', tag: 'dekoration' },
    extraTags: ['wohnen', 'dekoration', 'geschenk', 'premium'], type: 'Wohnen & Deko', maxCost: MAX_COST_EUR,
    anchor: ['vase', 'kerzenhalter', 'dekofigur', 'deko-figur', 'wandbild', 'bilderrahmen', 'kissenbezug', 'dekokissen', 'übertopf', 'windlicht', 'aufbewahrungsbox', 'laterne', 'dekoration', 'figura decorativa', 'jarrón', 'portafoto', 'wanduhr'],
    ban: ['kinder', 'spielzeug', 'auto', 'fahrrad', 'möbel', 'sofa', 'schrank', 'bett ', 'matratze', 'regal', 'kommode', 'gartenhaus', 'pavillon', 'pavillon', 'zelt'],
    bullets: ['Stilvolle Deko für dein Zuhause', 'Hochwertig verarbeitet', 'Schöne Geschenkidee', 'Schnelle EU-Lieferung'] },
  phone: { coll: { handle: 'handy-zubehoer', title: '📱 Handy-Zubehör', tag: 'handy' },
    extraTags: ['handy', 'tech', 'geschenk', 'premium'], type: 'Handy-Zubehör', maxCost: MAX_COST_EUR,
    anchor: ['batería externa magnética', 'power bank magnético', 'magsafe powerbank', 'magnetische powerbank', 'impresora térmica', 'mini impresora térmica', 'mini thermodrucker', 'fotodrucker tragbar', 'handyhülle', 'smartphone-hülle', 'handytasche', 'powerbank', 'ladekabel', 'ladegerät', 'handyhalterung', 'kfz-halterung', 'wireless charger', 'kabellos laden', 'displayschutz', 'panzerglas', 'phone case', 'funda móvil', 'cargador móvil', 'soporte móvil'],
    ban: ['kinder', 'spielzeug', 'laptop', 'notebook', 'tablet', 'staubsauger', 'drucker', 'toner', 'tinte', 'monitor', 'tastatur'],
    bullets: ['Schützt & lädt dein Smartphone', 'Passgenau & praktisch', 'Modernes Design', 'Top Preis-Leistung'] },
  guertel: { coll: { handle: 'guertel', title: '👖 Gürtel', tag: 'Gürtel' },
    extraTags: ['accessoire', 'herren', 'geschenk', 'premium'], type: 'Gürtel', maxCost: MAX_COST_EUR,
    anchor: ['gürtel', 'ledergürtel', 'cinturón', 'cinturon', 'belt '],
    ban: ['kinder', 'spielzeug', 'gürteltasche', 'bauchtasche', 'tasche', 'werkzeug', 'tool belt', 'sicherheitsgurt', 'hund', 'auto', 'getriebe', 'zahnriemen', 'keilriemen', 'lüfter', 'schlauch', 'rückenstütze', 'haltung', 'massage', 'sauna', 'schwitz', 'abnehm', 'po-trainer', 'trainer', 'bauch', 'rücken', 'stütze', 'elektro', 'ems'],
    bullets: ['Echtes Leder-Feeling', 'Verstellbar & langlebig', 'Edler Begleiter zu jedem Outfit', 'Schnelle EU-Lieferung'] },
  haustier: { coll: { handle: 'sub-haustier', title: '🐾 Haustier', tag: 'haustier' },
    extraTags: ['haustier', 'tier', 'geschenk', 'premium'], type: 'Haustier', maxCost: MAX_COST_EUR,
    anchor: ['hundehalsband', 'hundeleine', 'hundebett', 'hundebürste', 'hundespielzeug', 'hundefutter', 'katzenbaum', 'kratzbaum', 'katzenspielzeug', 'katzenstreu', 'futternapf', 'fressnapf', 'trinknapf', 'transportbox', 'haustier', 'comedero', 'rascador', 'collar perro', 'correa perro'],
    ban: ['kinder', 'aufkleber', 'sticker', 'auto', 'toy car', 'verkleidung mensch', 'saugnapf', 'wimpel', 'spiegel', 'handyhalterung', 'sit-up', 'analplug', 'plug', 'vibrator', 'dildo', 'erotik', 'intim', 'sex', 'clementoni', 'interaktives haustier', 'plüschtier'],
    bullets: ['Für glückliche Vierbeiner', 'Robust & pflegeleicht', 'Durchdachtes Design', 'Schnelle EU-Lieferung'] },
  // ── SAISONAL WM 2026 (Tag `wm-2026` → nach der WM mit `tag:wm-2026` komplett archivierbar) ──
  fussball: { coll: { handle: 'wm-fussball-2026', title: '⚽ WM & Fussball 2026', tag: 'wm-2026' },
    extraTags: ['fussball', 'fan', 'sport', 'wm'], type: 'Fussball & Fan', maxCost: MAX_COST_EUR,
    anchor: ['fußball', 'fussball', 'football', 'soccer', 'trikot', 'fan-schal', 'fanschal', 'fan schal', 'torwart', 'fußballtor', 'fußballschuh', 'fanartikel', 'nationalmannschaft', 'weltmeister', 'fútbol', 'balón de fútbol', 'camiseta fútbol', 'bufanda fútbol', 'fc barcelona', 'real madrid', 'atlético', 'atletico'],
    ban: ['aufkleber', 'sticker', 'malbuch', 'puzzle', 'tattoo', 'luftballon', 'tischdecke', 'servietten', 'kostüm', 'verkleidung', 'pyjama', 'tischfußball klein', 'kicker tisch', 'window color', 'baby '],
    bullets: ['Zeig deine Fan-Liebe', 'Offizielles Fan-Feeling', 'Top für Stadion, Party & Public Viewing', 'Schnelle EU-Lieferung'] },
  trikot: { coll: { handle: 'wm-fussball-2026', title: '⚽ WM & Fussball 2026', tag: 'wm-2026' },
    extraTags: ['fussball', 'fan', 'sport', 'wm', 'trikot'], type: 'Trikot', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['fußballtrikot', 'fussballtrikot', 'football trikot', 'soccer jersey', 'fußball-trikot', 'camiseta de fútbol', 'camiseta fútbol'],
    ban: ['radtrikot', 'rad-trikot', 'cycling', 'velo', 'fahrrad', 'maillot ciclismo', 'kinder', 'jr.', 'jr ', 'baby', '11-12 jahre', '7-8 jahre', '9-10 jahre', '3-4 jahre', '5-6 jahre'],
    bullets: ['Trikot im Team-Look', 'Atmungsaktiv & sportlich', 'Top für Stadion & Public Viewing', '100% Original, schnelle EU-Lieferung'] },
  // ── COOLE MARKEN-WELT (BigBuy-Markenkatalog: New Era, Puma, Adidas, lizenzierte Merch) ──
  caps: { coll: { handle: 'caps-huete', title: '🧢 Caps & Hüte', tag: 'Hut' },
    extraTags: ['accessoire', 'hype-2026', 'streetwear', 'premium'], type: 'Cap', maxCost: MAX_COST_EUR,
    anchor: ['basecap', 'baseballkappe', 'baseball cap', 'snapback', 'sport cap', 'sports cap', 'trucker cap', 'new era', 'schirmmütze', 'strickmütze', 'wintermütze', 'pudelmütze', 'beanie'],
    ban: ['helm', 'fahrradhelm', 'schutzhelm', 'bauhelm', 'reithelm', 'radkappe', 'nabenkappe', 'ventilkappe', 'bademütze', 'badekappe', 'schwimmkappe', 'duschhaube', 'perücke', 'speedo', ' omp ', 'kinder', 'baby', 'kids', 'paw patrol'],
    bullets: ['Original-Marken-Cap', 'Trendiger Streetwear-Look', 'Bequemer Sitz, verstellbar', '100% Original, schnelle EU-Lieferung'] },
  hoodies: { coll: { handle: 'loungewear', title: '🛋️ Loungewear & Hoodies', tag: 'loungewear' },
    extraTags: ['herren', 'sport', 'streetwear', 'premium'], type: 'Hoodie', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['hoodie', 'kapuzenpullover', 'kapuzensweat', 'kapuzenshirt', 'kapuzenjacke', 'sweatshirt', 'sudadera'],
    ban: ['kinder', 'baby', 'kids', 'jr.', 'jr ', 'mädchen', 'junge', '11-12 jahre', '7-8 jahre', '9-10 jahre', 'paw patrol', 'minnie', 'disney', 'verkleidung', 'kostüm', 'halloween', 'karneval'],
    bullets: ['Weicher, warmer Tragekomfort', 'Marken-Streetwear, EU-Lager', 'Vielseitig kombinierbar', '100% Original, schnelle EU-Lieferung'] },
  socken: { coll: { handle: 'socken-strumpfe', title: '🧦 Socken & Strümpfe', tag: 'socken' },
    extraTags: ['accessoire', 'streetwear', 'geschenk', 'premium'], type: 'Socken', maxCost: MAX_COST_EUR,
    anchor: ['socken', 'sportsocken', 'sneakersocken', 'strümpfe', 'kniestrümpfe', 'tennissocken', 'calcetines'],
    ban: ['kinder', 'baby', 'kids', 'mädchen', 'junge', 'schuhanzieher', 'sockenauszieher', 'stützstrümpfe medizin', 'kompressionsstrümpfe medizin', 'minnie', 'mickey', 'paw patrol', 'disney', 'seven til midnight', 'marvel'],
    bullets: ['Bequem & atmungsaktiv', 'Cooles Design', 'Tolles kleines Geschenk', '100% Original, schnelle EU-Lieferung'] },
  // ── GROSSE ABTEILUNGEN (volle BigBuy-Breite) ──
  schuhe: { coll: { handle: 'schuhe', title: '👟 Schuhe', tag: 'schuhe' },
    extraTags: ['accessoire', 'streetwear', 'premium'], type: 'Schuhe', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['sneaker', 'turnschuhe', 'laufschuhe', 'sportschuhe', 'stiefel', 'boots', 'sandalen', 'halbschuhe', 'espadrilles', 'zapatillas', 'botas'],
    ban: ['kinder', 'baby', 'schuhcreme', 'schuhregal', 'einlegesohle', 'insole', 'sohle', 'schuhspanner', 'hausschuhe', 'spielzeug', 'niño', 'niña', 'mikrowellen', 'fußwärmer', 'wärmestiefel', 'überzieh', 'avengers', 'jungen', 'mädchen', 'marvel', 'disney', 'paw patrol', 'mickey', 'minnie', 'pawz', 'hund', 'frozen'],
    bullets: ['Bequemer Tragekomfort', 'Marken-Qualität, EU-Lager', 'Stylischer Look', '100% Original, schnelle EU-Lieferung'] },
  herrenmode: { coll: { handle: 'fur-ihn', title: '👨 Für Ihn', tag: 'herren' },
    extraTags: ['herren', 'mode', 'streetwear', 'premium'], type: 'Herrenmode', maxCost: MAX_COST_EUR, sized: true,
    anchor: ['herrenhemd', 'herren-hemd', 'poloshirt', 'herren t-shirt', 'herren-t-shirt', 'herrenhose', 'herren-hose', 'herren-pullover', 'herrenpullover', 'herren-shorts', 'camiseta hombre', 'sudadera hombre'],
    ban: ['damen', 'kinder', 'baby', 'mujer', 'niño', 'niña', 'mädchen', 'jungen', 'kids'],
    bullets: ['Maskuliner Schnitt', 'Marken-Mode, EU-Lager', 'Vielseitig kombinierbar', '100% Original, schnelle EU-Lieferung'] },
  kueche: { coll: { handle: 'sub-kueche', title: '🍳 Küche', tag: 'kueche' },
    extraTags: ['wohnen', 'kueche', 'geschenk', 'premium'], type: 'Küche', maxCost: MAX_COST_EUR,
    anchor: ['molinillo de sal y pimienta eléctrico', 'molinillo eléctrico especias', 'elektrische salz- und pfeffermühle', 'elektrische gewürzmühle', 'espumador de leche', 'milchaufschäumer', 'envasadora al vacío', 'vakuumierer', 'selladora al vacío', 'dispensador de jabón automático', 'seifenspender sensor', 'automatischer seifenspender', 'küche', 'küchen', 'schneidebrett', 'küchenmesser', 'messerset', 'kochtopf', 'bratpfanne', 'pfannen-set', 'küchenhelfer', 'geschirr', 'besteck-set'],
    ban: ['kinder', 'spielzeug', 'playmobil', 'spiel-küche'],
    bullets: ['Praktisch in der Küche', 'Hochwertige Materialien', 'Schöne Geschenkidee', '100% Original, schnelle EU-Lieferung'] },
  reise: { coll: { handle: 'sub-reise', title: '🧳 Reise & Camping', tag: 'reise' },
    extraTags: ['reise', 'outdoor', 'geschenk', 'premium'], type: 'Reise', maxCost: MAX_COST_EUR,
    anchor: ['koffer', 'reisetasche', 'reise-trolley', 'reise-organizer', 'camping', 'picknick', 'kulturbeutel', 'reiseadapter', 'packwürfel'],
    ban: ['kinder', 'spielzeug'],
    bullets: ['Idealer Reisebegleiter', 'Robust & praktisch', 'Mehr Ordnung unterwegs', '100% Original, schnelle EU-Lieferung'] },
  werkzeug: { coll: { handle: 'elektriker-werkzeug', title: '🔧 Werkzeug', tag: 'elektriker' },
    extraTags: ['werkzeug', 'heimwerker', 'premium'], type: 'Werkzeug', maxCost: MAX_COST_EUR,
    anchor: ['werkzeug', 'schraubendreher', 'schraubenzieher', 'bohrer-set', 'kombizange', 'hammer', 'werkzeugset', 'akkuschrauber', 'wasserwaage', 'maßband', 'steckschlüssel'],
    ban: ['kinder', 'spielzeug', 'kostüm', 'aufblasbar', 'thor', 'avengers', 'nagelzange', 'eiszange', 'lockenzange', 'grillzange', 'salatzange', 'kühlzange', 'haarschneider', 'lockenstab'],
    bullets: ['Für Heimwerker & Profis', 'Robust & langlebig', 'Praktischer Helfer', '100% Original, schnelle EU-Lieferung'] },
  survival: { coll: { handle: 'camping-outdoor', title: '🏕️ Survival & Outdoor', tag: 'camping' },
    extraTags: ['survival', 'outdoor', 'herren', 'geschenk', 'gadget'], type: 'Survival-Ausrüstung', maxCost: 90,
    anchor: ['navaja multiusos', 'multiherramienta', 'linterna táctica', 'kit de supervivencia', 'cuerda paracord', 'pedernal', 'multitool', 'multifunktionswerkzeug', 'taktische taschenlampe', 'überlebensset', 'paracord', 'feuerstarter', 'klappmesser', 'machete', 'brújula', 'kompass', 'wasserfilter outdoor'],
    ban: ['kinder', 'spielzeug', 'kostüm', 'nerf', 'softair'],
    bullets: ['Für Abenteuer & Notfall', 'Robust & kompakt', 'Vielseitiges Werkzeug', '100% Original, schnelle EU-Lieferung'] },
  buero: { coll: { handle: 'buero-schreibwaren', title: '🖊️ Büro & Schreibwaren', tag: 'buero' },
    extraTags: ['buero', 'schule', 'geschenk', 'premium'], type: 'Büro', maxCost: MAX_COST_EUR,
    anchor: ['kugelschreiber', 'füller', 'notizbuch', 'ordner', 'locher', 'tacker', 'schreibwaren', 'taschenrechner', 'stiftehalter', 'schreibset'],
    ban: ['kinder', 'spielzeug', 'malbuch'],
    bullets: ['Ordnung im Büro', 'Hochwertig & funktional', 'Schönes Geschenk', '100% Original, schnelle EU-Lieferung'] },
  audio: { coll: { handle: 'audio-sub', title: '🎧 Audio', tag: 'Audio' },
    extraTags: ['tech', 'audio', 'hype-2026', 'premium'], type: 'Audio', maxCost: MAX_COST_EUR,
    anchor: ['kopfhörer', 'ohrhörer', 'earbuds', 'in-ear', 'bluetooth-lautsprecher', 'lautsprecher', 'soundbar', 'headset'],
    ban: ['kinder', 'spielzeug', 'gehörschutz'],
    bullets: ['Satter Sound', 'Modernes Design', 'Top Preis-Leistung', '100% Original, schnelle EU-Lieferung'] },
  ladegeraet: { coll: { handle: 'ladegeraete', title: '🔌 Ladegeräte', tag: 'Ladegerät' },
    extraTags: ['tech', 'handy', 'premium'], type: 'Ladegerät', maxCost: MAX_COST_EUR,
    anchor: ['ladegerät', 'ladekabel', 'powerbank', 'usb-ladegerät', 'wireless charger', 'kabellos laden', 'schnellladegerät', 'usb-c-kabel'],
    ban: ['kinder', 'spielzeug', 'autobatterie', 'auto-batterie'],
    bullets: ['Schnell & zuverlässig laden', 'Kompakt & praktisch', 'Für unterwegs & daheim', '100% Original, schnelle EU-Lieferung'] },
  // ── Neue High-Demand-Bereiche 2026 (datenbasiert ergänzt) ──
  garten: { coll: { handle: 'garten-balkon', title: '🌿 Garten & Balkon', tag: 'garten' },
    extraTags: ['garten', 'outdoor', 'premium'], type: 'Garten', maxCost: MAX_COST_EUR,
    anchor: ['jardín interior hidropónico', 'maceta inteligente autorriego', 'huerto interior led', 'smart pflanztopf selbstbewässernd', 'kräutergarten hydroponik', 'indoor garten led', 'blumentopf', 'übertopf', 'pflanzkübel', 'gartenleuchte', 'solarleuchte', 'gie(ss|ß)kanne', 'gartenschere', 'pflanzgefäß', 'rankgitter', 'gartenfigur', 'vogelhaus', 'gartenwerkzeug'],
    ban: ['kinder', 'spielzeug', 'kunstblume gross', 'künstlicher baum', 'rasenmäher', 'auto'],
    bullets: ['Für Garten, Balkon & Terrasse', 'Wetterfest & robust', 'Schöne Akzente im Grünen', '100% Original, schnelle EU-Lieferung'] },
  auto: { coll: { handle: 'auto-zubehoer', title: '🚗 Auto-Zubehör', tag: 'auto-zubehoer' },
    extraTags: ['auto', 'tech', 'premium'], type: 'Auto-Zubehör', maxCost: MAX_COST_EUR,
    anchor: ['escáner obd', 'diagnóstico obd', 'lector obd', 'obd2', 'arrancador de baterías', 'arrancador coche', 'inflador', 'compresor de aire', 'aspirador de coche', 'aspirador coche', 'manómetro', 'medidor de presión', 'cargador de batería coche', 'kfz-halterung', 'auto-halterung', 'sitzbezug', 'kofferraum-organizer', 'auto-organizer', 'lenkradbezug', 'auto-staubsauger', 'starthilfe', 'reifendruck', 'luftkompressor', 'obd-diagnose', 'arbeitsleuchte', 'rücksitz-organizer'],
    ban: ['kinder', 'spielzeug', 'modellauto', 'spielzeugauto', 'rc-auto', 'autobatterie', 'reifen komplett', 'ersatzteil', 'bremsbelag', 'zündkerze', 'ölfilter', 'scheibenwischer', 'stoßstange', 'kotflügel'],
    bullets: ['Mehr Ordnung & Komfort im Auto', 'Einfache Montage', 'Robuste Qualität', '100% Original, schnelle EU-Lieferung'] },
  camping: { coll: { handle: 'camping-outdoor', title: '⛺ Camping, Festival & Outdoor', tag: 'camping' },
    extraTags: ['camping', 'outdoor', 'festival', 'reise', 'sommer'], type: 'Camping & Festival', maxCost: 130,
    anchor: ['zelt', 'wurfzelt', 'festivalzelt', 'pop-up zelt', 'igluzelt', 'schlafsack', 'campingstuhl', 'klappstuhl', 'faltstuhl', 'campingsessel', 'campinghocker', 'klapphocker', 'anglerstuhl', 'isomatte', 'luftbett', 'stirnlampe', 'kühlbox', 'kühltasche', 'campinggeschirr', 'campinglampe', 'feldbett', 'campingtisch', 'klapptisch', 'picknickkorb', 'picknickdecke', 'thermoskanne'],
    ban: ['kinder', 'spielzeug', 'spielzelt', 'kinderzelt', 'pop-up spielzelt', 'gaming', 'bürostuhl', 'gartenstuhl set', 'esszimmerstuhl'],
    bullets: ['Für jedes Outdoor-Abenteuer', 'Leicht & wetterfest', 'Kompakt verstaubar', '100% Original, schnelle EU-Lieferung'] },
  beleuchtung: { coll: { handle: 'sub-beleuchtung', title: '💡 Beleuchtung & Lampen', tag: 'beleuchtung' },
    extraTags: ['wohnen', 'beleuchtung', 'premium'], type: 'Beleuchtung', maxCost: MAX_COST_EUR,
    anchor: ['tischlampe', 'stehlampe', 'nachttischlampe', 'led-streifen', 'led-stripe', 'wandleuchte', 'deckenleuchte', 'stimmungslicht', 'led-projektor', 'lichterkette', 'schreibtischlampe', 'leselampe', 'nachtlicht', 'rgb-leuchte', 'rgb leuchte', 'mood light', 'salzlampe', 'lavalampe', 'projektionslampe', 'ambiente-licht', 'sternenlicht'],
    ban: ['kinder', 'spielzeug', 'taschenlampe billig', 'auto', 'fahrradlicht'],
    bullets: ['Stimmungsvolles Licht für jeden Raum', 'Energiesparende LED-Technik', 'Modernes Design', '100% Original, schnelle EU-Lieferung'] },
  rucksaecke: { coll: { handle: 'rucksaecke', title: '🎒 Rucksäcke & Schulranzen', tag: 'rucksack' },
    extraTags: ['accessoire', 'reise', 'premium'], type: 'Rucksäcke', maxCost: MAX_COST_EUR,
    anchor: ['rucksack', 'backpack', 'schulrucksack', 'schulranzen', 'laptop-rucksack', 'daypack', 'wanderrucksack', 'sportrucksack'],
    ban: ['spielzeug', 'gürteltasche', 'bauchtasche', 'kosmetiktasche'],
    bullets: ['Viel Stauraum & Komfort', 'Robuste Materialien', 'Für Schule, Uni, Reise & Sport', '100% Original, schnelle EU-Lieferung'] },
  pool: { coll: { handle: 'pool-schwimmen', title: '🏊 Pool & Schwimmen', tag: 'pool' },
    extraTags: ['sommer-2026', 'outdoor', 'premium'], type: 'Pool & Schwimmen', maxCost: MAX_COST_EUR,
    anchor: ['schwimmbrille', 'schwimmflügel', 'luftmatratze', 'schwimmring', 'badeschuhe', 'taucherbrille', 'schwimmnudel', 'aufblasbar pool', 'planschbecken', 'badetuch mikrofaser'],
    ban: ['kinder', 'spielzeug', 'wasserpistole', 'badeanzug', 'bikini'],
    bullets: ['Sommer-Spass im & am Wasser', 'Schnell aufgeblasen & verstaut', 'Für Pool, See & Meer', '100% Original, schnelle EU-Lieferung'] },
  haarstyling: { coll: { handle: 'haarstyling-tools', title: '💇 Haarstyling & Tools', tag: 'haarstyling' },
    extraTags: ['beauty', 'pflege', 'premium'], type: 'Haarstyling', maxCost: MAX_COST_EUR,
    anchor: ['haartrockner', 'föhn', 'glätteisen', 'lockenstab', 'warmluftbürste', 'haarschneider', 'haarglätter', 'multistyler', 'diffusor föhn'],
    ban: ['kinder', 'spielzeug', 'puppe', 'perücke'],
    bullets: ['Salon-Styling für zuhause', 'Schonend & schnell', 'Marken-Qualität', '100% Original, schnelle EU-Lieferung'] },
  bar: { coll: { handle: 'bar-wein', title: '🍸 Bar & Wein', tag: 'bar' },
    extraTags: ['wohnen', 'geschenk', 'premium'], type: 'Bar & Wein', maxCost: MAX_COST_EUR,
    anchor: ['ahumador de cócteles', 'ahumador de whisky', 'cocktail smoker', 'whisky smoker', 'getränke-smoker', 'molde bolas de hielo', 'eiskugelform', 'eiskugel-presse', 'prensa de hielo', 'abridor de vino eléctrico', 'sacacorchos automático', 'sacacorchos eléctrico', 'elektrischer korkenzieher', 'elektrischer flaschenöffner wein', 'weinglas', 'cocktailshaker', 'cocktail-set', 'barzubehör', 'bar-set', 'flaschenöffner', 'dekanter', 'weinkühler', 'weinbelüfter', 'whiskygläser', 'sektgläser', 'korkenzieher'],
    ban: ['kinder', 'spielzeug', 'plastikbecher', 'einweg'],
    bullets: ['Stilvoll geniessen & servieren', 'Edles Geschenk für Geniesser', 'Premium-Materialien', '100% Original, schnelle EU-Lieferung'] },
};

// ── Shopify (1:1 aus cj_gaps_import.mjs, bewährt) ──
async function sgql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── BigBuy REST (Bearer-Auth, JSON, verifiziert). Robustes Rate-Limit-Handling ──
async function bbGet(path, timeoutMs = 30000) {
  for (let a = 0; a < 6; a++) {
    let r, txt;
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs); // Hard-Timeout gegen hängende Verbindungen
    try {
      r = await fetch(`${BB_BASE}${path}`, { headers: { 'Authorization': `Bearer ${BB_KEY}`, 'Accept': 'application/json' }, signal: ac.signal });
      txt = await r.text();
    }
    catch { clearTimeout(to); await sleep((a + 1) * 4000); continue; }
    clearTimeout(to);
    if (r.status === 429 || /exceeded the rate limit|too many/i.test(txt)) { await sleep((a + 1) * 5000); continue; }
    if (!r.ok) { console.log(`  ⚠️ BigBuy ${path.split('?')[0]} → HTTP ${r.status} ${txt.slice(0, 80)}`); return null; }
    try { return JSON.parse(txt); } catch { return null; }
  }
  console.log(`  ⚠️ BigBuy ${path.split('?')[0]} → Rate-Limit, aufgegeben.`);
  return null;
}
const bbInfoAll = () => bbGet('/rest/catalog/productsinformation.json?isoCode=de', 180000); // [{id,sku,name,description}] — grosser Download, 180s Timeout
const bbProduct = (id) => bbGet(`/rest/catalog/product/${id}.json?isoCode=de`);     // {wholesalePrice,retailPrice,active,...}
const bbImages = (id) => bbGet(`/rest/catalog/productimages/${id}.json`);           // {id, images:[{url,...}]}
async function img200(u) { try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) return true; const g = await fetch(u); return g.ok; } catch { return false; } }

// ── Gemini Batch-Übersetzung → knackiger DE-Titel (1:1 aus Vorlage) ──
async function titlesDE(names) {
  if (!GKEY || !names.length) return names;
  const prompt = `Mach aus diesen Produktnamen je einen knackigen, verkaufsstarken DEUTSCHEN Shop-Titel `
    + `(max 60 Zeichen, kein Marken-/Wholesale-Wort, mit kurzem Nutzen). Gib NUR ein JSON-Array gleicher Reihenfolge zurück.\n` + JSON.stringify(names);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GKEY)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }) });
    const j = await r.json().catch(() => ({}));
    let t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(t);
    if (Array.isArray(arr) && arr.length === names.length) return arr.map((s, i) => (s && String(s).trim().slice(0, 70)) || names[i]);
  } catch (e) { console.error('  Titel-Übersetzung fehlgeschlagen:', e.message); }
  return names;
}

// Gestaffelte Marge: teure Einkaufspreise bekommen kleineren Multiplikator (sonst absurde Preise, z.B. €200×2.6=CHF494).
const chf = (eur) => {
  let m = MARGIN;
  if (eur > 150) m = Math.min(MARGIN, 1.5);
  else if (eur > 80) m = Math.min(MARGIN, 1.8);
  else if (eur > 40) m = Math.min(MARGIN, 2.2);
  let p = Math.max(9.9, eur * EUR_CHF * m);
  return (Math.ceil(p) - 0.1).toFixed(2);
};

if (!BB_KEY) { console.log('Kein BIGBUY_API_KEY → No-op (Connector startklar, wartet auf Key).'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

const SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const PUBQ = `{ publications(first:20){ edges{ node{ id } } } }`;
const PUB = `mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ message } } }`;
const COLL_FIND = `query($q:String!){ collections(first:1, query:$q){ edges{ node{ id handle } } } }`;
const COLL_CREATE = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ message } } }`;

(async () => {
  console.log(`BigBuy-Import [${BB_BASE.includes('sandbox') ? 'SANDBOX' : 'PROD'}]${DRY ? ' [DRY — nichts wird angelegt; LIVE=1 zum Anlegen]' : ' [LIVE]'}`);
  const stok = await sToken(); if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op.'); process.exit(0); }

  console.log('Lade BigBuy-Katalog (productsinformation, kann gross sein) …');
  const info = await bbInfoAll();
  if (!Array.isArray(info) || !info.length) { console.log('⚠️ Keine productsinformation erhalten (Rate-Limit?) → Abbruch.'); process.exit(0); }
  console.log(`Katalog: ${info.length} Produkte mit DE-Namen.`);

  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);
  const pubs = DRY ? [] : ((await sgql(stok, PUBQ))?.data?.publications?.edges || []).map(e => ({ publicationId: e.node.id }));

  async function ensureColl(cfg) {
    if (DRY) return null;
    const ex = (await sgql(stok, COLL_FIND, { q: `handle:${cfg.coll.handle}` }))?.data?.collections?.edges?.[0]?.node;
    if (ex) return ex.id;
    const r = await sgql(stok, COLL_CREATE, { input: { handle: cfg.coll.handle, title: cfg.coll.title,
      descriptionHtml: `<p>${cfg.coll.title} – kuratierte Auswahl für die Schweiz. Gratis-Versand ab CHF 65.</p>`,
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: cfg.coll.tag }] } } });
    return r?.data?.collectionCreate?.collection?.id;
  }

  let created = 0, fails = [];
  for (const cat of CATS) {
    const cfg = CONFIG[cat]; if (!cfg) { console.log(`Unbekannte Kategorie ${cat}`); continue; }
    console.log(`\n=== ${cat.toUpperCase()} (${cfg.coll.title}) ===`);
    // 1) Kandidaten: on-brand Name-Match aus productsinformation + Ban-Filter
    const cand = info.filter(p => {
      const nm = (p.name || '').toLowerCase(); if (!nm) return false;
      if (GLOBAL_BAN.some(x => nm.includes(x))) return false; // Wholesale-Multipacks etc. global ausschliessen
      return cfg.anchor.some(a => nm.includes(a)) && !(cfg.ban || []).some(x => nm.includes(x));
    });
    console.log(`  ${cand.length} on-brand Kandidaten im Katalog.`);
    // 2) Pro Kandidat: Detail (Preis/aktiv) + Bilder prüfen, bis PER Picks
    const picks = [];
    for (const c of cand) {
      if (picks.length >= PER) break;
      if (done.has('bb:' + c.id)) continue;
      const d = await bbProduct(c.id); await sleep(GAP);
      if (!d || d.active !== 1) continue;
      const cost = Number(d.wholesalePrice) || 0;
      if (!cost || cost > cfg.maxCost) continue;
      if (cost < MIN_COST_EUR) continue;   // High-End-Untergrenze: günstige Basics überspringen
      const imgD = await bbImages(c.id); await sleep(GAP);
      const urls = (imgD?.images || []).map(x => x.url).filter(Boolean);
      const good = [];
      for (const u of urls.slice(0, 8)) { if (await img200(u)) good.push(u); if (good.length >= 6) break; }
      if (good.length < 2) continue;
      picks.push({ id: c.id, sku: c.sku || String(c.id), nameEn: c.name, cost, imgs: good });
      console.log(`  Kandidat: €${cost} ${good.length}img · ${(c.name || '').slice(0, 55)}`);
    }
    if (!picks.length) { console.log('  (keine geeigneten TOP-Kandidaten)'); continue; }
    if (DRY) { picks.forEach(p => console.log(`  [DRY] würde anlegen: ${p.nameEn.slice(0, 55)} → CHF ${chf(p.cost)}`)); continue; }

    // 3) Anlegen (DE-Titel + SEO + Tags + Bilder, 6 Kanäle)
    const titles = await titlesDE(picks.map(p => p.nameEn));
    await ensureColl(cfg);
    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      const title = (titles[i] || p.nameEn).replace(/["<>]/g, '').trim();
      const price = chf(p.cost);
      const handle = ((title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 50) || 'bigbuy') + '-' + p.id;
      const tags = [cfg.coll.tag, ...cfg.extraTags, 'bigbuy', 'dropship'];
      const desc = `<p><strong>${title}</strong></p><ul>${cfg.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
        + `<p>📦 Lieferung aus EU-Lager, schnell · Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · 🇨🇭 LuxeStyle</p>`;
      const input = { title, handle, productType: cfg.type, vendor: 'LuxeStyle', status: 'ACTIVE', tags,
        descriptionHtml: desc, seo: { title: `${title} | LuxeStyle`, description: `${title} – Premium-Qualität, schnelle EU-Lieferung, Gratis-Versand ab CHF 65.` },
        files: p.imgs.map(u => ({ originalSource: u, contentType: 'IMAGE' })) };
      if (cfg.sized) {
        const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
        input.productOptions = [{ name: 'Grösse', values: SIZES.map(s => ({ name: s })) }];
        input.variants = SIZES.map(s => ({ optionValues: [{ optionName: 'Grösse', name: s }], price,
          inventoryItem: { sku: `BB-${p.sku}-${s}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }));
      } else {
        input.productOptions = [{ name: 'Titel', values: [{ name: 'Standard' }] }];
        input.variants = [{ optionValues: [{ optionName: 'Titel', name: 'Standard' }], price,
          inventoryItem: { sku: `BB-${p.sku}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }];
      }
      const r = await sgql(stok, SET, { input }); const e = r?.data?.productSet?.userErrors || [];
      const pid = r?.data?.productSet?.product?.id;
      if (e.length || !pid) { fails.push(`${title.slice(0, 40)}: ${JSON.stringify(e.length ? e : r).slice(0, 160)}`); continue; }
      if (pubs.length) await sgql(stok, PUB, { id: pid, pubs });
      fs.appendFileSync(LEDGER, 'bb:' + p.id + '\n');
      created++; console.log(`  ✅ ${title.slice(0, 50)} → CHF ${price} (${handle})`);
      await sleep(400);
    }
  }
  if (fails.length) fails.slice(0, 15).forEach(x => console.error('✗', x));
  console.log(`\nFertig: ${created} Produkt(e) angelegt${DRY ? ' [DRY]' : ''}${fails.length ? `, ${fails.length} Fehler` : ''}.`);
  process.exit(0);
})();
