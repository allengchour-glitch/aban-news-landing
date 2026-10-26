// Tests der Mengenrabatt-Regeln. Gegenproben in BEIDE Richtungen; Fälle aus dem Katalog vom 26.10.2026; Zusammenfassung am ENDE.
import { STUFEN, MARGE_ZIEL_MIN, RABATT_TAGS, margeNachRabatt, produktMarge, tiefsterRabatt, sicherheitspruefung, stufeFuer, tagDiff, rabattEingaben, planen, AUSSCHLUSS_TAGS } from './mengenrabatt.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
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

console.log(`\nmengenrabatt_test: ${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
