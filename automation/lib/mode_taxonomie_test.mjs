// Tests der Mode-Taxonomie-Anbindung (lib/mode_taxonomie.mjs). Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
// Titel stammen aus dem echten Katalog vom 26.10.2026 (Stichproben der Prüfung).
import { MODE, ALLES, KOLLISIONEN, bereinigeBeschreibung, menueEintraege, normiere } from './mode_taxonomie.mjs';
import { gehoertIn, KATEGORIEN } from './kategorien.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const P = (title, g = '', tags = [], productType = '', handle = title.toLowerCase().replace(/\W+/g, '-')) => ({ title, g, tags, productType, handle });
const K = h => MODE.find(k => k.handle === h);
const in_ = (h, p) => gehoertIn(K(h), p);
const KL = 'Apparel & Accessories > Clothing > ';

// ── Aufbau ──
ist('Kategorien + Filter', [MODE.filter(k => !k.filter).length, MODE.filter(k => k.filter).length], [41, 146]);
ist('ids eindeutig', new Set(MODE.map(k => k.id)).size, MODE.length);
ist('handles eindeutig', new Set(MODE.map(k => k.handle)).size, MODE.length);
ist('tags eindeutig und mit sort-', MODE.every(k => k.tag === 'sort-' + k.handle) && new Set(MODE.map(k => k.tag)).size === MODE.length, true);
ist('kein Tag stösst mit den anderen Kategorien zusammen', KATEGORIEN.filter(k => !k.mode).some(k => MODE.some(m => m.tag === k.tag)), false);
ist('jede Kategorie hat min 15', MODE.every(k => k.min === 15), true);
ist('kein ß in Titel/Beschreibung', MODE.some(k => /ß/.test(k.titel + k.beschreibung + k.seoBeschreibung)), false);
ist('SEO-Beschreibung höchstens 160 Zeichen', MODE.every(k => k.seoBeschreibung.length <= 160), true);
ist('keine Beschreibung nennt Filter oder siezt', MODE.some(k => /filter|\b(Sie|Ihnen|Ihr|Ihre)\b/i.test(k.beschreibung)), false);
ist('Kollisionen: genau die sechs, und nur sie sind «bestehend»', [[...KOLLISIONEN].sort(), MODE.filter(k => k.bestehend).map(k => k.handle).sort()], [[...KOLLISIONEN].sort(), [...KOLLISIONEN].sort()]);
ist('Kollisionen: sechs', KOLLISIONEN.size, 6);
ist('jeder Filter kennt seine Kategorie', MODE.filter(k => k.filter).every(k => MODE.some(m => m.id === k.eltern_id && !m.filter)), true);

// ── Geschlecht: Kleider nie Herren, Herren-Hemd nie Damen ──
ist('Kleid ist Damen', in_('damen-kleider', P('Elegantes Maxikleid mit Spitze', KL + 'Dresses')), true);
ist('Gegenprobe: Kleid ist nicht in Herren-Hemden', in_('herren-hemden', P('Elegantes Maxikleid mit Spitze', KL + 'Dresses')), false);
ist('Herren-Hemd ist Herren', in_('herren-hemden', P('Gestreiftes Slim-fit Oxford Businesshemd für Herren', KL + 'Shirts & Tops')), true);
ist('Gegenprobe: Herren-Hemd ist nicht in Damen-Blusen', in_('damen-blusen-hemden', P('Gestreiftes Slim-fit Oxford Businesshemd für Herren', KL + 'Shirts & Tops')), false);
ist('Unisex-Shirt steht bei Damen UND Herren', [in_('damen-t-shirts', P('Unisex T-Shirt – Selbst gestalten', KL + 'Shirts & Tops')), in_('herren-t-shirts', P('Unisex T-Shirt – Selbst gestalten', KL + 'Shirts & Tops'))], [true, true]);
ist('Kinder-Shirt steht nicht bei Damen', in_('damen-t-shirts', P('Dino-Kinder-T-Shirt', KL + 'Shirts & Tops')), false);
ist('Mädchen-Kleid steht bei Kindern, nicht bei Damen', [in_('kinder-oberteile-kleider-hosen', P('Cartoon-Kleid für Mädchen', KL + 'Dresses')), in_('damen-kleider', P('Cartoon-Kleid für Mädchen', KL + 'Dresses'))], [true, false]);
ist('Partnerlook steht in der eigenen Kategorie, nicht bei Damen-T-Shirts', [in_('partnerlook-paare', P('King & Queen Partner-Shirts · Couple T-Shirts', KL + 'Shirts & Tops')), in_('damen-t-shirts', P('King & Queen Partner-Shirts · Couple T-Shirts', KL + 'Shirts & Tops'))], [true, false]);

// ── Ausschlüsse: Kostüme, Sperr-Tags, Fortura ──
ist('Kostüm ist kein Damenkleid', in_('damen-kleider', P('Kostüm Schneewittchen Kleid', KL + 'Dresses')), false);
ist('Fortura-Ware ist in keiner Themenkategorie', MODE.some(k => !k.filter && gehoertIn(k, P('Langes Hippiekleid', KL + 'Dresses', ['fortura']))), false);
ist('Sperr-Tag: kein Treffer', MODE.some(k => gehoertIn(k, P('Satin-Korsett', KL + 'Lingerie', ['adult-nicht-bewerben']))), false);
ist('Umstandsmode nur mit Umstands-Wörtern', [in_('damen-umstandsmode', P('Stillkleid mit Knopfleiste', KL + 'Dresses')), in_('damen-umstandsmode', P('Sommerkleid mit Blumen', KL + 'Dresses'))], [true, false]);
ist('Pulloverkleid ist kein Verkleidungs-Treffer (Wortmitte «verkleid»)', in_('damen-kleider', P('Gestricktes Pulloverkleid', KL + 'Dresses')), true);

// ── Filter: nur Produkte der Kategorie ──
ist('Abendkleid steht im Filter Abendkleider', in_('damen-kleider-abend', P('Elegantes trägerloses Satin-Abendkleid', KL + 'Dresses')), true);
ist('Gegenprobe: Sommerkleid steht nicht im Filter Abendkleider', in_('damen-kleider-abend', P('Leichtes Sommerkleid mit Blumen', KL + 'Dresses')), false);
ist('Gegenprobe: ein Abend-Etui (kein Kleid) steht nicht im Filter', in_('damen-kleider-abend', P('Abendtasche mit Strass', 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags')), false);

// ── Falsche Google-Kategorie (Gürtel statt Blazer/Kleid): die Korrektur wirkt nur für die bekannten Handles ──
const BLAZER = 'Blazer «Roma» · Tailliert mit Bindegürtel & Revers', GURT = 'Apparel & Accessories > Clothing Accessories > Belts';
ist('Korrektur: Blazer mit falscher Google-Kategorie «Belts» steht trotzdem bei den Jacken', in_('damen-jacken-maentel', P(BLAZER, GURT, ['damen', 'damen-mode', 'kat-damen-jacke'], 'Blazer', 'blazer-roma-tailliert-mit-bindegurtel-revers')), true);
ist('Gegenprobe: derselbe Titel unter unbekanntem Handle bleibt draussen', in_('damen-jacken-maentel', P(BLAZER, GURT, ['damen', 'damen-mode', 'kat-damen-jacke'], 'Blazer', 'ein-ganz-anderes-produkt')), false);
ist('Korrektur: Sommerkleid mit «Belts» steht bei den Kleidern', in_('damen-kleider', P('Sommerkleid «Fleur Noir» · Blumen-Print, Midi mit Bindegürtel', GURT, [], '', 'sommerkleid-fleur-noir-blumen-print-midi-mit-bindegurtel')), true);

// ── Herren-Titel auf Schnitten, die als «weiblich» gelten: Herren bleibt Herren (26.10.2026; Fotos der 9 Produkte zeigen Männer) ──
const JEANS = 'Apparel & Accessories > Clothing > Pants', TOPS = 'Apparel & Accessories > Clothing > Shirts & Tops', JACKE = 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets';
const FL = P('Herren High-Waist Loose-Fit Flared Jeans', JEANS, ['herren', 'kat-jeans', 'such-herren-jeans'], 'Herrenmode', 'herren-high-waist-loose-fit-flared-jeans-626600');
ist('Herren-Flared-Jeans mit High-Waist steht bei Herren-Jeans, nicht bei Damen-Jeans', [in_('herren-jeans', FL), in_('damen-jeans', FL)], [true, false]);
const OS = P('Eleganter Off-Shoulder Hemd für Herren', TOPS, ['herren'], 'Herrenmode', 'eleganter-off-shoulder-hemd-fur-herren-607400');
ist('Herren-Off-Shoulder-Hemd steht bei Herren-Hemden, nicht bei Damen-Blusen', [in_('herren-hemden', OS), in_('damen-blusen-hemden', OS)], [true, false]);
const WE = P('Distressed Leder Off-Shoulder Jacke', JACKE, ['herren', 'kat-jacke-outdoor'], 'Herrenmode', 'distressed-leder-off-shoulder-jacke-616700');
ist('Nur Tag herren (ohne Herren-Wort im Titel): Off-Shoulder-Jacke bleibt Herren', [in_('herren-jacken-maentel', WE), in_('damen-jacken-maentel', WE)], [true, false]);
ist('Gegenprobe: eine Off-Shoulder-Bluse für Damen bleibt bei Damen', [in_('damen-blusen-hemden', P('Off-Shoulder Bluse für Damen', TOPS, ['damen'], 'Damenmode')), in_('herren-hemden', P('Off-Shoulder Bluse für Damen', TOPS, ['damen'], 'Damenmode'))], [true, false]);
ist('Gegenprobe: ein «Herren-Rock» (Kleidungsstück, das ein Herr nicht trägt) bleibt kein Herren-Produkt', MODE.some(k => k.handle.startsWith('herren') && gehoertIn(k, P('Herren Rock mit Gürtel', 'Apparel & Accessories > Clothing > Skirts', ['herren'], 'Herrenmode'))), false);

// ── Hilfsfunktionen ──
ist('normiere: productType wird zu type', normiere({ handle: 'x', productType: 'Damenmode', tags: [] }).type, 'Damenmode');
ist('normiere: Google-Korrektur greift nur für bekannte Handles', normiere({ handle: 'kein-bekanntes-produkt', g: 'A > B', tags: [] }).g, 'A > B');
ist('Beschreibung: Filtersatz fällt weg', bereinigeBeschreibung('Kleider für Damen in allen Längen. Mit den Filtern finden Sie Abendkleider.'), 'Kleider für Damen in allen Längen.');
ist('Beschreibung: Sie-Satz fällt weg', bereinigeBeschreibung('Röcke für Damen. Wählen Sie Ihre Länge.'), 'Röcke für Damen.');
ist('Beschreibung: Gegenprobe «sie» als Fürwort kleingeschrieben bleibt', bereinigeBeschreibung('Röcke, die sie gern trägt.'), 'Röcke, die sie gern trägt.');
ist('Menü: Damen beginnt mit Kleidern, Gruppen sind aufgelöst', menueEintraege('Damen').slice(0, 3).map(e => e.handle), ['damen-kleider', 'damen-t-shirts', 'damen-tops']);
ist('Menü: Partnerlook steht bei Herren als Verweis', menueEintraege('Herren').filter(e => e.verweis).map(e => e.handle), ['partnerlook-paare']);
ist('Menü: jeder Eintrag der Bekleidung hat eine Kategorie', ['Damen', 'Herren', 'Kinder'].flatMap(t => menueEintraege(t)).filter(e => !e.handle.startsWith('kinder-l') && !e.handle.startsWith('kinder-sn') && !e.verweis || e.verweis).every(e => ALLES.kategorien.some(k => k.handle === e.handle)), true);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
