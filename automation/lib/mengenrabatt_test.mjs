// Tests der Mengenrabatt-Regeln. Gegenproben in BEIDE Richtungen; Fälle aus dem Katalog vom 26.10.2026; Zusammenfassung am ENDE.
import { STUFEN, MARGE_ZIEL_MIN, RABATT_TAGS, margeNachRabatt, produktMarge, tiefsterRabatt, sicherheitspruefung, stufeFuer, tagDiff, rabattEingaben, planen, AUSSCHLUSS_TAGS,
  parseBulk, pruefeStarts, freiesVersandAb, versandProblem, eigeneRabatte, fremdeMengenrabatte, stufenText, RABATT_TITEL_PREFIX, FAMILIEN } from './mengenrabatt.mjs';
let ok = 0, fehl = 0;
const ser = x => JSON.stringify(x, (k, v) => (typeof v === 'number' && !Number.isFinite(v)) ? `<${v}>` : v === undefined ? '<undefined>' : v);
const ist = (name, wert, soll) => { const a = ser(wert), b = ser(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const nah = (name, wert, soll, eps = 1e-9) => { if (Math.abs(wert - soll) <= eps) ok++; else { fehl++; console.log('FEHLER', name, wert, '≠', soll); } };
const wirft = (name, f, teil) => { try { f(); fehl++; console.log('FEHLER', name, 'wirft nicht'); } catch (e) { if (!teil || String(e.message).includes(teil)) ok++; else { fehl++; console.log('FEHLER', name, 'falsche Meldung:', e.message); } } };
const V = (preis, kosten) => ({ price: String(preis), cost: kosten == null ? null : String(kosten) });
const P = (title, g, varianten, tags = []) => ({ handle: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, g, tags, variants: varianten });
const SCHMUCK = 'Apparel & Accessories > Jewelry > Earrings';

// ── Marge: die Formel ──
nah('marge nach 10 % bei 45 %', margeNachRabatt(0.45, 10), 1 - 0.55 / 0.9);
nah('marge nach 5 % bei 37 %', margeNachRabatt(0.37, 5), 1 - 0.63 / 0.95);
nah('kein Rabatt ändert nichts', margeNachRabatt(0.4, 0), 0.4);
ist('Stufe A hält 30 % nach 10 %', margeNachRabatt(STUFEN.a.margeMin, 10) >= MARGE_ZIEL_MIN, true);
ist('Stufe B hält 30 % nach 5 %', margeNachRabatt(STUFEN.b.margeMin, 5) >= MARGE_ZIEL_MIN, true);
ist('Gegenprobe: 20 % Marge (Regel Kosten×1,25) kippt schon bei 5 % unter 17 %', margeNachRabatt(0.2, 5) < 0.17, true);
nah('Regel Kosten×1,25 ergibt 20 % Marge', produktMarge([V(25, 20)]), 0.2);

// ── Marge je Produkt: die SCHLECHTESTE Variante zählt, unbekannt = nicht geeignet ──
nah('kleinste Variante zählt', produktMarge([V(20, 8), V(20, 12), V(20, 10)]), 0.4);
ist('eine Variante ohne Kosten → unbekannt', produktMarge([V(20, 8), V(20, null)]), null);
ist('Kosten 0 → unbekannt', produktMarge([V(20, 0)]), null);
ist('Kosten leer → unbekannt', produktMarge([{ price: '20', cost: '' }]), null);
ist('Preis 0 → unbekannt', produktMarge([V(0, 5)]), null);
ist('keine Varianten → unbekannt', produktMarge([]), null);
ist('kein Array → unbekannt', produktMarge(undefined), null);

// ── Sicherheitsnetz ──
ist('Stufen halten das Sicherheitsnetz', sicherheitspruefung(), true);
wirft('15 % Rabatt reisst die Versandschwelle (50 → 42,5 < 45)', () => sicherheitspruefung({ x: { margeMin: 0.6, schritte: [{ ab: 2, prozent: 15 }] } }), 'Versandschwelle');
wirft('zu wenig Marge für 10 %', () => sicherheitspruefung({ x: { margeMin: 0.3, schritte: [{ ab: 2, prozent: 10 }] } }), 'Marge');
wirft('Schritte müssen steigen', () => sicherheitspruefung({ x: { margeMin: 0.6, schritte: [{ ab: 3, prozent: 5 }, { ab: 2, prozent: 10 }] } }), 'steigen');
ist('tiefster Rabatt A = 10', tiefsterRabatt('a'), 10);
ist('tiefster Rabatt B = 5', tiefsterRabatt('b'), 5);
ist('50 × 0,9 = 45: das Versprechen bleibt auch bei 10 %', 50 * (1 - tiefsterRabatt('a') / 100), 45);

// ── Gleitkomma an den Grenzen ──
ist('Grenze mit Gleitkomma-Rest: (10−6,3)/10 gilt als 37 %', stufeFuer(P('Haarspange Grenze', 'Apparel & Accessories > Clothing Accessories', [V(10, 6.3)])).stufe, 'b');
ist('Grenze mit Gleitkomma-Rest: (30−16,5)/30 = 45 % → A', stufeFuer(P('Perlenset Grenze', 'Apparel & Accessories > Jewelry > Necklaces', [V(30, 16.5)])).stufe, 'a');
ist('knapp darunter bleibt darunter: 44,9 % → B', stufeFuer(P('Perlenset knapp', 'Apparel & Accessories > Jewelry > Necklaces', [V(50, 27.55)])).stufe, 'b');
ist('knapp darunter bleibt darunter: 36,9 % → keine', stufeFuer(P('Spange knapp', 'Apparel & Accessories > Clothing Accessories', [V(50, 31.55)])).stufe, null);

// ── Stufe eines Produkts ──
ist('Ohrringe, Marge 50 % → A', stufeFuer(P('Perlen-Ohrringe mit Zirkonia', SCHMUCK, [V(20, 10)])).stufe, 'a');
ist('Ohrringe, Marge 40 % → B', stufeFuer(P('Boho-Ohrringe mit Quasten', SCHMUCK, [V(20, 12)])).stufe, 'b');
ist('Ohrringe, Marge 36 % → keine Stufe, Grund marge', stufeFuer(P('Ohrstecker klein', SCHMUCK, [V(20, 12.8)])).grund, 'marge');
ist('Grenze: genau 45 % → A', stufeFuer(P('Haarspange Perle', 'Apparel & Accessories > Clothing Accessories > Hair Accessories', [V(20, 11)])).stufe, 'a');
ist('Grenze: genau 37 % → B', stufeFuer(P('Haarspange Gold', 'Apparel & Accessories > Clothing Accessories > Hair Accessories', [V(100 / 10, 6.3)])).stufe, 'b');
ist('Regel Kosten×1,25 → keine Stufe', stufeFuer(P('Lockenstab für Haare', 'Health & Beauty > Personal Care > Hair Care', [V(25, 20)])).stufe, null);
ist('eine schlechte Variante verhindert die Stufe', stufeFuer(P('Ring mit Stein', 'Apparel & Accessories > Jewelry > Rings', [V(20, 8), V(20, 15)])).stufe, null);
ist('Kosten fehlen → Grund kosten', stufeFuer(P('Ring ohne Kosten', 'Apparel & Accessories > Jewelry > Rings', [V(20, null)])).grund, 'kosten');
ist('Preis über 60 → Grund preis', stufeFuer(P('Halskette Silber gross', 'Apparel & Accessories > Jewelry > Necklaces', [V(80, 20)])).grund, 'preis');
ist('Preis unter 3 → Grund preis', stufeFuer(P('Sticker klein', 'Arts & Entertainment > Hobbies & Creative Arts > Stickers', [V(2.9, 0.5)])).grund, 'preis');
ist('Preisgrenze 60 gilt noch', stufeFuer(P('Perlenkette Set', 'Apparel & Accessories > Jewelry > Necklaces', [V(60, 20)])).stufe, 'a');
ist('Preis richtet sich nach der billigsten Variante', stufeFuer(P('Ring Set', 'Apparel & Accessories > Jewelry > Rings', [V(30, 10), V(70, 20)])).stufe, 'a');

// ── Familien und Ausschlüsse ──
ist('Gegenprobe Kleid: Familie fehlt', stufeFuer(P('Midi-Kleid', 'Apparel & Accessories > Clothing > Dresses', [V(20, 8)])).grund, 'familie');
ist('Gegenprobe Sneaker: Familie fehlt', stufeFuer(P('Sneaker', 'Apparel & Accessories > Shoes', [V(40, 15)])).grund, 'familie');
ist('Gegenprobe Möbel: Familie fehlt', stufeFuer(P('Couchtisch', 'Furniture > Tables', [V(50, 20)])).grund, 'familie');
ist('Gegenprobe Google-Kategorie leer: Familie fehlt', stufeFuer(P('Kostüm', '', [V(20, 8)])).grund, 'familie');
ist('Gegenprobe Armbanduhr (Google «Watches»)', stufeFuer(P('Quarzuhr', 'Apparel & Accessories > Jewelry > Watches', [V(30, 10)])).grund, 'familie');
ist('Gegenprobe Armbanduhr im Titel', stufeFuer(P('Herren Armbanduhr', SCHMUCK, [V(30, 10)])).grund, 'titel');
ist('Gegenprobe Smartwatch im Titel', stufeFuer(P('Smartwatch Armband', 'Electronics > Electronics Accessories', [V(30, 10)])).grund, 'titel');
ist('Gegenprobe Kratzbaum', stufeFuer(P('Kratzbaum Turm für Katzen', 'Animals & Pet Supplies > Pet Supplies > Cat Furniture', [V(50, 15)])).grund, 'titel');
ist('Gegenprobe Aquarium', stufeFuer(P('Mini-Aquarium Set', 'Animals & Pet Supplies > Pet Supplies > Fish Supplies', [V(40, 12)])).grund, 'titel');
ist('Gegenprobe Haartrockner', stufeFuer(P('Haartrockner 2000 W', 'Health & Beauty > Personal Care', [V(40, 12)])).grund, 'titel');
ist('Gegenprobe «elektrisch»', stufeFuer(P('Elektrische Zahnbürste', 'Health & Beauty > Personal Care', [V(30, 9)])).grund, 'titel');
ist('Gegenprobe Kamera (Zusammensetzung)', stufeFuer(P('Kameraschutz-Set', 'Electronics > Electronics Accessories', [V(20, 5)])).grund, 'titel');
ist('Gegenprobe Ladegerät', stufeFuer(P('USB-C Ladegerät 65 W', 'Electronics > Electronics Accessories > Power', [V(25, 8)])).grund, 'titel');
ist('«uhr» als eigenes Wort ausgeschlossen', stufeFuer(P('Schöne Uhr', SCHMUCK, [V(30, 10)])).grund, 'titel');
ist('Wortgrenze: «Uhrenarmband» (Zubehör, ein Stück pro Uhr, aber kein Gerät) bleibt erlaubt', stufeFuer(P('Silikon Uhrenarmband', 'Apparel & Accessories > Jewelry > Watch Accessories', [V(15, 5)])).stufe, 'a');
ist('Wortgrenze: «Tischset» ist nicht «Tisch»', stufeFuer(P('Tischset aus Baumwolle', 'Home & Garden > Linens & Bedding', [V(15, 5)])).stufe, 'a');
ist('Wortgrenze: «Tisch» allein ist ausgeschlossen', stufeFuer(P('Kleiner Tisch', 'Home & Garden > Decor', [V(25, 8)])).grund, 'titel');
ist('Wortgrenze: «Mixer» allein ausgeschlossen, «Mixerzubehör»? bleibt erlaubt', stufeFuer(P('Mixerzubehör Set', 'Home & Garden > Kitchen & Dining', [V(15, 5)])).stufe, 'a');
ist('Tag fortura sperrt', stufeFuer(P('Haarreif Hexe', 'Apparel & Accessories > Clothing Accessories', [V(20, 5)], ['fortura'])).grund, 'gesperrt');
ist('Tag 18plus sperrt', stufeFuer(P('Ring', SCHMUCK, [V(20, 5)], ['18plus'])).grund, 'gesperrt');
ist('Tag kostuem sperrt', stufeFuer(P('Perücke', 'Apparel & Accessories > Clothing Accessories', [V(20, 5)], ['kostuem'])).grund, 'gesperrt');
ist('Tag stecker-nicht-ch sperrt', stufeFuer(P('Adapter', 'Electronics > Electronics Accessories', [V(20, 5)], ['stecker-nicht-ch'])).grund, 'gesperrt');
ist('der eigene Rabatt-Tag sperrt NICHT (Wiederholung des Laufs)', stufeFuer(P('Ring 2', 'Apparel & Accessories > Jewelry > Rings', [V(20, 8)], ['mengenrabatt-a'])).stufe, 'a');
ist('Sperr-Tags enthalten fortura und die Basis-Sperren', ['fortura', '18plus', 'adult-nicht-bewerben', 'stecker-nicht-ch'].every(t => AUSSCHLUSS_TAGS.includes(t)), true);
ist('Produkt ohne Tags und ohne Varianten → kosten', stufeFuer({ title: 'Ring', g: SCHMUCK }).grund, 'kosten');

// ── Tags: Soll gegen Ist ──
ist('neu in A', tagDiff(['sort-ringe'], 'a'), { add: ['mengenrabatt-a'], remove: [] });
ist('schon in A: nichts', tagDiff(['mengenrabatt-a', 'x'], 'a'), { add: [], remove: [] });
ist('von A nach B: tauschen', tagDiff(['mengenrabatt-a'], 'b'), { add: ['mengenrabatt-b'], remove: ['mengenrabatt-a'] });
ist('nicht mehr geeignet: Tag weg', tagDiff(['mengenrabatt-b', 'x'], null), { add: [], remove: ['mengenrabatt-b'] });
ist('nie geeignet, kein Tag: nichts', tagDiff(['x'], null), { add: [], remove: [] });
ist('fremde Tags bleiben unberührt', tagDiff(['sort-a', 'mengenrabatt-a', 'f:xyz'], 'a').remove, []);
ist('beide Tags gesetzt → eines geht', tagDiff(['mengenrabatt-a', 'mengenrabatt-b'], 'a'), { add: [], remove: ['mengenrabatt-b'] });
ist('RABATT_TAGS', RABATT_TAGS, ['mengenrabatt-a', 'mengenrabatt-b']);

// ── Eingaben für die automatischen Rabatte ──
const E = rabattEingaben({ a: 'gid://shopify/Collection/1', b: 'gid://shopify/Collection/2' }, '2026-10-27T08:00:00Z');
ist('drei Rabatte (A: 2 Schritte, B: 1)', E.map(x => [x.stufe, x.ab, x.prozent]), [['a', 2, 5], ['a', 3, 10], ['b', 3, 5]]);
ist('A ab 2: Menge 2, 5 %, Sammlung A', [E[0].eingabe.minimumRequirement.quantity.greaterThanOrEqualToQuantity, E[0].eingabe.customerGets.value.percentage, E[0].eingabe.customerGets.items.collections.add], ['2', 0.05, ['gid://shopify/Collection/1']]);
ist('A ab 3: Menge 3, 10 %', [E[1].eingabe.minimumRequirement.quantity.greaterThanOrEqualToQuantity, E[1].eingabe.customerGets.value.percentage], ['3', 0.1]);
ist('B ab 3: 5 %, Sammlung B', [E[2].eingabe.customerGets.value.percentage, E[2].eingabe.customerGets.items.collections.add], [0.05, ['gid://shopify/Collection/2']]);
ist('nie stapeln mit Produkt- oder Bestellrabatten, Versand erlaubt', E.every(x => JSON.stringify(x.eingabe.combinesWith) === JSON.stringify({ orderDiscounts: false, productDiscounts: false, shippingDiscounts: true })), true);
ist('Titel nennt Menge und Prozent', E[0].eingabe.title, 'Mengenrabatt: ab 2 Stück 5 % Rabatt');
ist('Startzeit durchgereicht', E.every(x => x.eingabe.startsAt === '2026-10-27T08:00:00Z'), true);
ist('fehlt die Sammlung einer Stufe, entfällt ihr Rabatt', rabattEingaben({ a: 'gid://shopify/Collection/1' }, 'x').length, 2);
ist('Prozentwert als Anteil, nie als ganze Zahl', E.every(x => x.eingabe.customerGets.value.percentage < 1), true);

// ── Plan ──
const plan = planen([
  P('Ring A', 'Apparel & Accessories > Jewelry > Rings', [V(20, 8)]),
  P('Ring B', 'Apparel & Accessories > Jewelry > Rings', [V(20, 12)]),
  P('Ring C', 'Apparel & Accessories > Jewelry > Rings', [V(20, 16)]),
  P('Kleid', 'Apparel & Accessories > Clothing > Dresses', [V(20, 8)]),
  P('Ring D', 'Apparel & Accessories > Jewelry > Rings', [V(20, null)]),
  P('Ring E', 'Apparel & Accessories > Jewelry > Rings', [V(20, 8)], ['fortura']),
]);
ist('Plan A', plan.a, ['ring-a']);
ist('Plan B', plan.b, ['ring-b']);
ist('Plan Gründe', plan.gruende, { marge: 1, familie: 1, kosten: 1, gesperrt: 1 });
ist('Plan Summe', plan.summe, 6);


// ── Produktauswahl 26.10.2026: Geräte, offene Prüf-Tags, Markenware (Fälle aus dem Katalog, beide Richtungen) ──
const HC = 'Health & Beauty > Personal Care > Hair Care > Hair Styling Tools';
const pick = (title, g, tags = []) => stufeFuer(P(title, g, [V(20, 8)], tags));
ist('Lockenstab (Curling Irons) → Gerät', pick('Kabelloser Lockenstab', HC + ' > Curling Irons').grund, 'geraet');
ist('gleiche Kategorie ohne Gerätewort bleibt Gerät (Kategorie genügt)', pick('Rosen Styler mit Anzeige', HC + ' > Hair Straighteners').grund, 'geraet');
ist('Gegenprobe Lockenwickler ohne Hitze bleibt passend', pick('Satin Lockenwickler ohne Hitze', HC + ' > Hair Curlers').stufe, 'a');
ist('Gegenprobe Haaröl bleibt passend', pick('Argan-Haaröl 60 ml', HC.replace(' > Hair Styling Tools', ' > Hair Styling Products')).stufe, 'a');
ist('exakt «Hair Styling Tools» ohne Unterebene = Gerät', pick('Mini-Drehschleuder', HC).grund, 'geraet');
ist('Powerbank (Power) → Gerät', pick('Magnetische Powerbank', 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers').grund, 'geraet');
ist('Power-Kategorie genügt ohne Gerätewort im Titel', pick('Mini Capsule 5000 mAh', 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers').grund, 'geraet');
ist('Gamepad (Input Devices) → Gerät', pick('Bluetooth Gamepad', 'Electronics > Electronics Accessories > Computer Components > Input Devices > Game Controllers').grund, 'geraet');
ist('Gegenprobe Ladekabel bleibt passend (zwei Stück sind üblich)', pick('Magnetisches 3-in-1 Ladekabel', 'Electronics > Electronics Accessories > Cables > System & Power Cables').stufe, 'a');
ist('Gegenprobe USB-Stick bleibt passend', pick('USB-Stick Holz', 'Electronics > Electronics Accessories > Computer Components > Storage Devices > USB Flash Drives').stufe, 'a');
ist('Beauty-Gerät (Skin Care Tools) → Gerät', pick('Mikrostrom Gesichtsformer', 'Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Skin Care Tools').grund, 'geraet');
ist('Gegenprobe Gua-Sha-Roller bleibt passend', pick('Gua Sha Stein & Roller Set', 'Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools > Skin Care Tools > Skin Care Rollers').stufe, 'a');
ist('Gegenprobe Presse-Nägel bleiben passend', pick('Press-on-Nägel Cat Eye', 'Health & Beauty > Personal Care > Cosmetics > Nail Care > False Nails').stufe, 'a');
ist('Küchengerät (Entsafter) → Gerät', pick('Tragbarer Entsafter', 'Home & Garden > Kitchen & Dining > Kitchen Appliances > Juicers').grund, 'geraet');
ist('Tier-Halskrause (Pet Medical) → Gerät/Medizin', pick('Halskrause für Hunde', 'Animals & Pet Supplies > Pet Supplies > Pet Medical Collars').grund, 'geraet');
ist('Anti-Lutsch-Halsband (Tier-Medizin) → Gerät/Medizin', pick('Lutschhemmende Hundehalsband', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses').grund, 'geraet');
ist('10er-Pack ist schon die Menge', pick('10er-Pack verstellbare PU-Hundehalsbänder', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses').grund, 'geraet');
ist('Gegenprobe 6er-Pack bleibt passend', pick('6er-Pack Katzenminze-Spielzeug', 'Animals & Pet Supplies > Pet Supplies > Cat Supplies > Cat Toys').stufe, 'a');
ist('Gegenprobe Hundehalsband bleibt passend', pick('Nylon-Halsband', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses').stufe, 'a');
ist('Haustier-GPS im Titel → Gerät', pick('GPS-Halsband für Katzen', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses').grund, 'geraet');
ist('Haustier-Technik per Katalog-Tag → Gerät', pick('Leuchthalsband', 'Animals & Pet Supplies > Pet Supplies > Pet Collars & Harnesses', ['sort-tier-technik']).grund, 'geraet');
ist('Bausatz/Klemmbausteine → Gerät/Lizenzrisiko', pick('MOC Rennwagen-Modell Bausatz', 'Toys & Games > Toys > Building Toys > Interlocking Blocks').grund, 'geraet');
ist('Offene Prüf-Tags sperren', ['stecker-unklar', 'marken-pruefen', 'waffe-pruefen', 'versand-pruefen', 'nicht-google-bewerben'].map(tg => pick('Haarglätter Test', SCHMUCK, [tg]).grund), ['gesperrt', 'gesperrt', 'gesperrt', 'gesperrt', 'gesperrt']);
ist('Gegenprobe gewöhnliche Tags sperren nicht', pick('Ring', 'Apparel & Accessories > Jewelry > Rings', ['bild-ok', 'cj-real', 'rueckhol-0907']).stufe, 'a');
ist('Markenware nur im Titel', pick('Thick Mascara Better Than Sex', 'Health & Beauty > Personal Care > Cosmetics > Makeup').grund, 'marke');
ist('Gegenprobe «Apple Watch»-Armband (Zubehör) bleibt', pick('Silikonarmband für Apple Watch', 'Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands').stufe, 'a');
ist('Sticker «Game Controller» ist kein Gamepad', pick('Sticker «Game Controller» · 1 Stück', 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials').stufe, 'a');
ist('Duftöl «für Luftbefeuchter» ist Verbrauchsware', pick('Aromatherapie-Öl für Luftbefeuchter, 5 ml', 'Home & Garden > Decor > Home Fragrances > Fragrance Oil').stufe, 'a');
ist('Gegenprobe Luftbefeuchter selbst → Gerät', pick('Ultraschall Luftbefeuchter 300 ml', 'Home & Garden > Decor > Home Fragrance Accessories').grund, 'geraet');
ist('Sofa-Kissenbezug bleibt passend (Kissen, nicht Sofa)', pick('Sofa-Kissenbezug aus Baumwoll-Leinen', 'Home & Garden > Decor > Throw Pillows').stufe, 'a');
ist('Gegenprobe Sofa-Schoner bleibt ausgeschlossen', pick('Sofa-Schoner 3er-Set', 'Home & Garden > Decor > Slipcovers').grund, 'titel');
ist('Armband für Smartwatch (Watch Bands) bleibt passend', pick('Silikon-Armband für Smartwatch', 'Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands').stufe, 'a');
ist('Gegenprobe Smartwatch-Ladestation bleibt ausgeschlossen', pick('Smartwatch-Ladestation', 'Apparel & Accessories > Jewelry > Watch Accessories').grund, 'titel');
ist('Kühlschrankmagnet (Souvenir) bleibt passend', pick('Barcelona Kühlschrankmagnet', 'Home & Garden > Decor > Refrigerator Magnets').stufe, 'a');
ist('Gegenprobe Kühlschrank-Gerät bleibt ausgeschlossen', pick('Mini-Kühlschrank 4 L', 'Home & Garden > Kitchen & Dining').grund, 'titel');

// ═════════ Ergänzungen der Code-Prüfung (26.10.2026): Mutationsproben zeigten 51 von 136 Mutationen grün; jeder Block unten tötet eine davon ═════════
const CA = 'Apparel & Accessories > Clothing Accessories';
// Messgerät ist(): null ist nicht Infinity/NaN/undefined
ist('ist() unterscheidet null von -Infinity', ser(null) !== ser(-Infinity) && ser(null) !== ser(NaN) && ser(null) !== ser(undefined), true);
ist('Preis 0 mit Kosten: unbekannt (null), nicht -Infinity', produktMarge([V(0, 5)]), null);
ist('Preis mit Komma «19,90» → unbekannt', produktMarge([{ price: '19,90', cost: '5' }]), null);
ist('Kosten mit Komma «8,50» → unbekannt', produktMarge([{ price: '20', cost: '8,50' }]), null);
ist('Kosten als Text «abc» → unbekannt', produktMarge([{ price: '20', cost: 'abc' }]), null);
ist('Kosten mit Währung «8.50 CHF» → unbekannt', produktMarge([{ price: '20', cost: '8.50 CHF' }]), null);
ist('Preis negativ → unbekannt', produktMarge([V(-5, 1)]), null);

// Gleitkomma: gerade 2-Dezimal-Paare, deren EXAKTE Marge 45 % / 37 % ist, die Rechnung aber knapp darunter liefert (gemessen: 88 für A, 8 für B)
ist('Gleitkomma: 4,00 / 2,20 ist exakt 45 % (Rechnung 0,44999…) → A', stufeFuer(P('Haargummi Set', CA, [V('4', '2.2')])).stufe, 'a');
ist('Gleitkomma: 17,00 / 10,71 ist exakt 37 % (Rechnung 0,36999…) → B', stufeFuer(P('Haarnadel Set', CA, [V('17', '10.71')])).stufe, 'b');
{ let fa = 0, fb = 0, na = 0, nb = 0;
  for (let pc = 300; pc <= 6000; pc++) {
    if (pc % 20 === 0) { na++; if (stufeFuer(P('Grenzfall', CA, [V((pc / 100).toFixed(2), ((pc / 20 * 11) / 100).toFixed(2))])).stufe !== 'a') fa++; }
    if (pc % 100 === 0) { nb++; if (stufeFuer(P('Grenzfall', CA, [V((pc / 100).toFixed(2), ((pc / 100 * 63) / 100).toFixed(2))])).stufe !== 'b') fb++; }
  }
  ist('alle ' + na + ' Paare mit exakt 45 % (3,00–60,00) → A', fa, 0); ist('alle ' + nb + ' Paare mit exakt 37 % (3–60) → B', fb, 0); }

// Preisgrenzen beidseitig
ist('Preis genau 3,00 gilt', stufeFuer(P('Spange drei', CA, [V(3, 1.2)])).stufe, 'a');
ist('Preis 3,50 gilt (PREIS_MIN ist nicht 4)', stufeFuer(P('Spange dreifuenf', CA, [V(3.5, 1.4)])).stufe, 'a');
ist('Preis 59,99 gilt', stufeFuer(P('Spange fast sechzig', CA, [V(59.99, 20)])).stufe, 'a');
ist('Preis 60,01 gilt nicht', stufeFuer(P('Spange ueber sechzig', CA, [V(60.01, 20)])).grund, 'preis');
ist('Preis 60,50 gilt nicht (PREIS_MAX ist nicht 61)', stufeFuer(P('Spange sechzigfuenf', CA, [V(60.5, 20)])).grund, 'preis');

// Sicherheitsnetz: jede Prüfung einzeln, der TIEFSTE Rabatt zählt
wirft('tiefster Rabatt zählt (9 % bei 35 % Marge → 28,6 %), nicht der erste (5 % → 31,6 %)', () => sicherheitspruefung({ x: { margeMin: 0.35, schritte: [{ ab: 2, prozent: 5 }, { ab: 3, prozent: 9 }] } }), 'Marge');
wirft('tiefster Rabatt zählt auch für die Versandschwelle (20 % → 40 < 45)', () => sicherheitspruefung({ x: { margeMin: 0.9, schritte: [{ ab: 2, prozent: 5 }, { ab: 3, prozent: 20 }] } }), 'Versandschwelle');
wirft('Menge steigt, Prozent fällt → Fehler', () => sicherheitspruefung({ x: { margeMin: 0.6, schritte: [{ ab: 2, prozent: 10 }, { ab: 3, prozent: 5 }] } }), 'steigen');
wirft('Menge gleich → Fehler', () => sicherheitspruefung({ x: { margeMin: 0.6, schritte: [{ ab: 2, prozent: 5 }, { ab: 2, prozent: 8 }] } }), 'steigen');
ist('gültige Stufe mit zwei Schritten besteht', sicherheitspruefung({ x: { margeMin: 0.6, schritte: [{ ab: 2, prozent: 5 }, { ab: 3, prozent: 8 }] } }), true);

// Sperr-Tags: die Liste steht HIER ausgeschrieben (eine Schleife über AUSSCHLUSS_TAGS selbst würde einen gestrichenen Eintrag nicht merken)
for (const t of ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'google-gesperrt-adult', 'lizenz-nicht-bewerben', 'fortura', 'kostuem'])
  ist('Sperr-Tag ' + t, stufeFuer(P('Ring Sperrprobe', SCHMUCK, [V(20, 8)], [t])).grund, 'gesperrt');
ist('Harmloses Chargen-Tag rueckhol-0907 sperrt nicht (Gegenprobe)', stufeFuer(P('Ring Charge', SCHMUCK, [V(20, 8)], ['rueckhol-0907'])).stufe, 'a');

// Familien: jede der 16 einzeln (Google-Kategorie-Präfix), und nur als PRÄFIX
const FAM16 = ['Apparel & Accessories > Jewelry', 'Apparel & Accessories > Clothing Accessories', 'Health & Beauty > Personal Care', 'Health & Beauty > Jewelry Cleaning & Care', 'Animals & Pet Supplies > Pet Supplies',
  'Electronics > Electronics Accessories', 'Arts & Entertainment > Hobbies & Creative Arts', 'Arts & Entertainment > Party & Celebration', 'Home & Garden > Kitchen & Dining', 'Home & Garden > Household Supplies',
  'Home & Garden > Decor', 'Home & Garden > Linens & Bedding', 'Home & Garden > Bathroom Accessories', 'Toys & Games', 'Hardware > Tool Accessories', 'Hardware > Building Consumables'];
ist('FAMILIEN hat genau die 16 erwarteten Einträge', FAMILIEN, FAM16);
for (const f of FAM16) ist('Familie ' + f, stufeFuer(P('Testartikel Set', f + ' > Unterart', [V(20, 8)])).stufe, 'a');
ist('Familie gilt nur als Präfix («Furniture > Home & Garden > Decor» nicht)', stufeFuer(P('Testartikel Set', 'Furniture > Home & Garden > Decor', [V(20, 8)])).grund, 'familie');

// Titel-Ausschlüsse: jedes Wort einzeln, auch GROSS geschrieben
const TITEL_WOERTER = ['Kratzbaum', 'Aquarium', 'Transportbox', 'Hundehütte', 'Hundehuette', 'Staubsauger', 'Haartrockner', 'Luftreiniger', 'Massagepistole', 'Massagegerät', 'Smartwatch', 'Armbanduhr', 'Ladegerät', 'Ladegeraet',
  'Kamera', 'Lautsprecher', 'Drohne', 'Kühlschrank', 'Fritteuse', 'Ventilator', 'Matratze', 'Schreibtisch', 'Gartenhaus', 'Käfig', 'Zelt', 'Sofa', 'Schrank', 'Regal', 'Tisch', 'Stuhl', 'Teppich', 'Vorhang', 'Vorhänge', 'Föhn',
  'Rasierer', 'Trimmer', 'Epilierer', 'Mixer', 'Laptop', 'Tablet', 'Akku', 'Uhr', 'Elektrische'];
for (const w of TITEL_WOERTER) { ist('Titelwort «' + w + '» schliesst aus', stufeFuer(P('Mini ' + w + ' Set', 'Home & Garden > Decor', [V(20, 8)])).grund, 'titel'); }
ist('Titelwort GROSS geschrieben schliesst aus', stufeFuer(P('MINI ZELT SET', 'Home & Garden > Decor', [V(20, 8)])).grund, 'titel');
ist('Wortgrenze vorn: «Sanduhr» ist keine «Uhr»', stufeFuer(P('Sanduhr aus Glas', 'Home & Garden > Decor', [V(20, 8)])).stufe, 'a');
ist('Wortgrenze hinten: «Zeltplane» ist kein «Zelt»', stufeFuer(P('Zeltplane klein', 'Home & Garden > Decor', [V(20, 8)])).stufe, 'a');
// Zusammensetzungen AM WORTENDE (gemessen im Plan: Katzenregal, Gewürzregal, Nasenhaartrimmer, Stabmixer, Katzenzelt)
for (const w of ['Gewürzregal Metall', 'Wandmontiertes Katzenregal', 'USB Nasenhaartrimmer', 'Stabmixer-Set', 'Katzenzelt Cottage'])
  ist('Zusammensetzung am Wortende schliesst aus: ' + w, stufeFuer(P(w, 'Home & Garden > Decor', [V(20, 8)])).grund, 'titel');
ist('«Mixerzubehör» bleibt erlaubt (Wort geht weiter)', stufeFuer(P('Mixerzubehör Set', 'Home & Garden > Kitchen & Dining', [V(15, 5)])).stufe, 'a');

// Bulk-Parser
const BK = [
  JSON.stringify({ id: 'P1', handle: 'ring-a', title: 'Ring A', tags: ['t'], g: { value: SCHMUCK } }),
  JSON.stringify({ id: 'V1', price: '20.00', inventoryItem: { unitCost: { amount: '8.00' } }, __parentId: 'P1' }),
  JSON.stringify({ id: 'V2', price: '20.00', inventoryItem: { unitCost: null }, __parentId: 'P1' }),
];
{ const r = parseBulk(BK.join('\n') + '\n');
  ist('Bulk: 1 Produkt, 2 Varianten, 0 Waisen', [r.produkte.length, r.varianten, r.waisen], [1, 2, 0]);
  ist('Bulk: Kosten null bleibt null', r.produkte[0].variants.map(v => v.cost), ['8.00', null]);
  ist('Bulk: Google-Kategorie übernommen', r.produkte[0].g, SCHMUCK); }
{ const r = parseBulk([BK[1], BK[0], BK[2]].join('\n'));
  ist('Bulk: Kind VOR Elternzeile geht nicht verloren', [r.varianten, r.waisen, r.produkte[0].variants.length], [2, 0, 2]); }
{ const r = parseBulk([BK[0], BK[1], JSON.stringify({ id: 'V9', price: '5', __parentId: 'GIBTS-NICHT' })].join('\n'));
  ist('Bulk: Kind ohne Elternzeile zählt als Waise', [r.varianten, r.waisen], [1, 1]); }
ist('Bulk: leere Datei', (() => { const r = parseBulk(''); return [r.produkte.length, r.varianten, r.waisen]; })(), [0, 0, 0]);

// STARTS
{ const jetzt = Date.parse('2026-10-26T12:00:00Z');
  ist('STARTS fehlt → Pflicht', pruefeStarts(undefined, jetzt) !== null, true);
  ist('STARTS ohne Z → Pflicht', pruefeStarts('2026-10-27T08:00:00', jetzt) !== null, true);
  ist('STARTS unmögliches Datum → Fehler', /gültiges Datum/.test(pruefeStarts('2026-13-45T99:99:99Z', jetzt)), true);
  ist('STARTS 31. Februar → Fehler', /gültiges Datum/.test(pruefeStarts('2026-02-31T08:00:00Z', jetzt)), true);
  ist('STARTS in der Vergangenheit → Fehler', /Zukunft/.test(pruefeStarts('2020-01-01T00:00:00Z', jetzt)), true);
  ist('STARTS in 5 Minuten → zu früh', /Zukunft/.test(pruefeStarts('2026-10-26T12:05:00Z', jetzt)), true);
  ist('STARTS morgen 08:00 → in Ordnung', pruefeStarts('2026-10-27T08:00:00Z', jetzt), null); }

// Versandregel (Form wie deliveryProfiles, gemessen 26.10.2026 23:13 UTC: «ab 45» AUS, «ab 50» AN)
const rate = (name, active, ab, preis = '0.0') => ({ name, active, rateProvider: { __typename: 'DeliveryRateDefinition', price: { amount: preis, currencyCode: 'CHF' } },
  methodConditions: ab == null ? [] : [{ field: 'TOTAL_PRICE', operator: 'GREATER_THAN_OR_EQUAL_TO', conditionCriteria: { __typename: 'MoneyV2', amount: String(ab), currencyCode: 'CHF' } }] });
const profil = (raten, land = 'Switzerland', std = true) => [{ name: 'General profile', default: std, profileLocationGroups: [{ locationGroupZones: { nodes: [{ zone: { name: 'Domestic', countries: [{ name: land }] }, methodDefinitions: { nodes: raten } }] } }] }];
ist('Versand live 26.10.: ab 45 aus, ab 50 an → 50', freiesVersandAb(profil([rate('Standard', true, null, '7.0'), rate('Kostenloser Versand', false, 45), rate('Kostenloser Versand', true, 50)])), 50);
ist('Versand: ab 45 an, ab 50 an → 45', freiesVersandAb(profil([rate('Standard', true, null, '7.0'), rate('Kostenloser Versand', true, 45), rate('Kostenloser Versand', true, 50)])), 45);
ist('Versand: nur Standard CHF 7 → keine Gratis-Regel', freiesVersandAb(profil([rate('Standard', true, null, '7.0')])), null);
ist('Versand: Zone ohne Schweiz zählt nicht', freiesVersandAb(profil([rate('Gratis', true, 10)], 'Germany')), null);
ist('Versand: Nicht-Standardprofil zählt nicht', freiesVersandAb(profil([rate('Gratis', true, 10)], 'Switzerland', false)), null);
ist('Versand: Gratis ohne Bedingung → ab 0', freiesVersandAb(profil([rate('Gratis', true, null)])), 0);
ist('Versand: andere Bedingung (Gewicht) wird nicht als Preisgrenze gelesen', freiesVersandAb(profil([{ ...rate('Gratis', true, null), methodConditions: [{ field: 'TOTAL_WEIGHT', operator: 'LESS_THAN_OR_EQUAL_TO', conditionCriteria: { amount: '1' } }] }])), null);
ist('Versandproblem bei ab 50: Meldung nennt 55.56', /55\.56/.test(versandProblem(50)), true);
ist('Versandproblem bei ab 45: keins', versandProblem(45), null);
ist('Versandproblem bei ab 40: keins', versandProblem(40), null);
ist('Versandproblem bei unbekannt', /unbekannt/.test(versandProblem(null)), true);

// Eigene und fremde automatische Rabatte (Form wie discountNodes, gemessen 26.10.2026: zwei fremde Mengenrabatte AKTIV)
const mengeMin = n => ({ __typename: 'DiscountMinimumQuantity', greaterThanOrEqualToQuantity: String(n) });
const DN = [
  { id: 'gid://shopify/DiscountAutomaticNode/1', discount: { __typename: 'DiscountAutomaticBasic', title: 'Bundle: 2+ Artikel -10%', status: 'ACTIVE', minimumRequirement: mengeMin(2) } },
  { id: 'gid://shopify/DiscountAutomaticNode/2', discount: { __typename: 'DiscountAutomaticBasic', title: 'Mengenrabatt — 10% ab 3 Artikeln', status: 'ACTIVE', minimumRequirement: mengeMin(3) } },
  { id: 'gid://shopify/DiscountAutomaticNode/3', discount: { __typename: 'DiscountAutomaticBasic', title: 'Mengenrabatt: ab 2 Stück 5 % Rabatt', status: 'EXPIRED', minimumRequirement: mengeMin(2) } },
  { id: 'gid://shopify/DiscountAutomaticNode/4', discount: { __typename: 'DiscountAutomaticFreeShipping', title: 'Gratis-Versand ab CHF 50', status: 'ACTIVE' } },
  { id: 'gid://shopify/DiscountAutomaticNode/5', discount: { __typename: 'DiscountAutomaticBasic', title: 'Alter Sale', status: 'EXPIRED', minimumRequirement: mengeMin(2) } },
  { id: 'gid://shopify/DiscountAutomaticNode/6', discount: { __typename: 'DiscountAutomaticBasic', title: 'Mengenrabatt: ab 3 Stück 10 % Rabatt', status: 'ACTIVE', minimumRequirement: mengeMin(3) } },
];
ist('Titelanfang ist «Mengenrabatt:»', RABATT_TITEL_PREFIX, 'Mengenrabatt:');
ist('eigene Rabatte: nur «Mengenrabatt:» (nicht «Mengenrabatt —»), auch abgelaufene', eigeneRabatte(DN).map(d => d.title), ['Mengenrabatt: ab 2 Stück 5 % Rabatt', 'Mengenrabatt: ab 3 Stück 10 % Rabatt']);
ist('fremde aktive Mengenrabatte: Bundle und «Mengenrabatt —», nicht Versand, nicht abgelaufene', fremdeMengenrabatte(DN).map(d => d.title), ['Bundle: 2+ Artikel -10%', 'Mengenrabatt — 10% ab 3 Artikeln']);
ist('alle neuen Rabatt-Titel tragen den Präfix', E.every(x => x.eingabe.title.startsWith(RABATT_TITEL_PREFIX)), true);
ist('Sammlungstext A aus STUFEN', stufenText('a'), 'ab 2 Stück 5 %, ab 3 Stück 10 %');
ist('Sammlungstext B aus STUFEN', stufenText('b'), 'ab 3 Stück 5 %');
ist('Sammlungstext A mit Zusatz «Rabatt»', stufenText('a', ' Rabatt'), 'ab 2 Stück 5 % Rabatt, ab 3 Stück 10 % Rabatt');

console.log(`\nmengenrabatt_test: ${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
