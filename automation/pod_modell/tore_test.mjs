// Tests für tore.mjs (kein Netz): jedes Blocker-Tor wird einzeln zum Kippen gebracht, damit klar ist, dass es wirklich schützt.
// Lauf: /opt/node22/bin/node automation/pod_modell/tore_test.mjs
import { pruefeTore, NICHT_METRISCH } from './tore.mjs';
import { planeModell, lade, versand, testUebersetzung, bilderFuer, neuerTest, tief } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('tore');
const k = lade(19);
const basis = planeModell({ katalog: k, versand: versand(), uebersetzung: testUebersetzung(k), bilder: bilderFuer(k) }, { jetzt: 'x' });
const ctx = (extra = {}) => ({ regel: basis.erzeugt.regel, stufen: [1], schonHandles: new Set(), schonSkus: new Set(), verwendeteModelle: new Set(), bilder: bilderFuer(k), kartenMaxBytes: 10240, originalText: 'Whether you drink coffee. Ceramic.', ...extra });
const lauf = (p, c = ctx()) => pruefeTore(p, c);
const ergebnis = (p, code, c) => lauf(p, c).find((t) => t.code === code)?.ergebnis;
const aend = (f) => { const p = tief(basis); f(p); return p; };

ist('Grundplan: alle Blocker bestanden', lauf(basis).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').map((t) => `${t.code}:${t.grund}`), []);
ist('Grundplan: die 17 Blocker-Tore', lauf(basis).filter((t) => t.art === 'blocker').map((t) => t.code), ['klasse', 'modell_neu', 'ch_rate', 'rate_variante', 'lieferangabe', 'varianten', 'sku_eindeutig', 'option_namen', 'marge', 'bilder', 'titel_uebersetzt', 'titel_belegt', 'handle_frei', 'masse_einheiten', 'gedankenstrich', 'beschreibung_belegt', 'karte']);

// klasse / modell_neu
ist('klasse: Stufe nicht freigegeben', ergebnis(aend((p) => { p.stufe = 2; }), 'klasse'), 'durchgefallen');
ist('klasse: stufe null (UNGEEIGNET)', ergebnis(aend((p) => { p.stufe = null; p.klasse = 'UNGEEIGNET'; }), 'klasse'), 'durchgefallen');
ist('klasse: Stufe 2 freigegeben', ergebnis(aend((p) => { p.stufe = 2; }), 'klasse', ctx({ stufen: [1, 2] })), 'bestanden');
ist('modell_neu', ergebnis(basis, 'modell_neu', ctx({ verwendeteModelle: new Set([19]) })), 'durchgefallen');
// Geschwister in der anderen Masseinheit (Poster (in) neben dem aktiven Poster (cm), Gegenleser 1)
ist('modell_neu: die andere Masseinheit desselben Modells steckt schon im Shop → gesperrt', ergebnis(aend((p) => { p.familie = 'enhanced matte paper poster'; }), 'modell_neu', ctx({ verwendeteFamilien: new Set(['enhanced matte paper poster']) })), 'durchgefallen');
ist('… der Grund nennt die Masseinheit, nicht «steckt schon in einem Produkt»', /Masseinheit/.test(lauf(aend((p) => { p.familie = 'x'; }), ctx({ verwendeteFamilien: new Set(['x']) })).find((t) => t.code === 'modell_neu').grund), true);
ist('modell_neu: eine andere Familie bleibt frei', ergebnis(aend((p) => { p.familie = 'thin canvas'; }), 'modell_neu', ctx({ verwendeteFamilien: new Set(['canvas']) })), 'bestanden');
ist('modell_neu: ein Modell ohne Einheit im Namen (familie null) wird nie als Geschwister gesperrt', ergebnis(aend((p) => { p.familie = null; }), 'modell_neu', ctx({ verwendeteFamilien: new Set(['null', '']) })), 'bestanden');
// ch_rate / lieferangabe
ist('ch_rate fehlt', ergebnis(aend((p) => { p.lieferung = null; }), 'ch_rate'), 'durchgefallen');
ist('lieferangabe: keine Lieferzeit bestimmbar', ergebnis(aend((p) => { p.lieferzeit = null; }), 'lieferangabe'), 'durchgefallen');
ist('lieferangabe: Max < Min', ergebnis(aend((p) => { p.lieferzeit.min = 9; p.lieferzeit.max = 3; }), 'lieferangabe'), 'durchgefallen');
ist('lieferangabe: die Shop-Angabe 7 bis 14 genügt', ergebnis(basis, 'lieferangabe'), 'bestanden');
// rate_variante: die Rate gilt für eine Variante, die im Produkt steckt (Gegenleser 2, W1: bei 57 von 448 Modellen war sie fremd)
ist('rate_variante: Rate für eine fremde Variante → durchgefallen', ergebnis(aend((p) => { p.lieferung.ratenVariante = 99999999; }), 'rate_variante'), 'durchgefallen');
ist('rate_variante: Rate für eine Variante der Auswahl → bestanden', ergebnis(basis, 'rate_variante'), 'bestanden');
ist('rate_variante: ohne Rate entscheidet ch_rate, nicht ein zweiter Fehler', [ergebnis(aend((p) => { p.lieferung = null; }), 'rate_variante'), ergebnis(aend((p) => { p.lieferung = null; }), 'ch_rate')], ['bestanden', 'durchgefallen']);
// varianten
ist('varianten: 0', ergebnis(aend((p) => { p.varianten = []; }), 'varianten'), 'durchgefallen');
ist('varianten: 101', ergebnis(aend((p) => { p.varianten = Array.from({ length: 101 }, (_, i) => ({ ...p.varianten[0], sku: 'S' + i, optionen: { n: String(i) } })); }), 'varianten'), 'durchgefallen');
ist('varianten: 100 genau erlaubt', ergebnis(aend((p) => { p.varianten = Array.from({ length: 100 }, (_, i) => ({ ...p.varianten[0], sku: 'S' + i, optionen: { n: String(i) } })); }), 'varianten'), 'bestanden');
ist('varianten: gleiche Optionskombination', ergebnis(aend((p) => { p.varianten[1].optionen = p.varianten[0].optionen; }), 'varianten'), 'durchgefallen');
ist('varianten: Preisfehler', ergebnis(aend((p) => { p.preis.fehler = ['x']; }), 'varianten'), 'durchgefallen');
// sku
ist('sku: doppelt im Plan', ergebnis(aend((p) => { p.varianten[1].sku = p.varianten[0].sku; }), 'sku_eindeutig'), 'durchgefallen');
ist('sku: schon im Shop', ergebnis(basis, 'sku_eindeutig', ctx({ schonSkus: new Set([basis.varianten[0].sku]) })), 'durchgefallen');
// optionen
ist('option_namen: 4 Optionen', ergebnis(aend((p) => { p.optionen = [1, 2, 3, 4].map((i) => ({ name: 'O' + i, werte: ['a'] })); }), 'option_namen'), 'durchgefallen');
ist('option_namen: 0 Optionen', ergebnis(aend((p) => { p.optionen = []; }), 'option_namen'), 'durchgefallen');
ist('option_namen: doppelter Wert', ergebnis(aend((p) => { p.optionen[0].werte = ['a', 'a']; }), 'option_namen'), 'durchgefallen');
ist('option_namen: leerer Wert', ergebnis(aend((p) => { p.optionen[0].werte = ['a', ' ']; }), 'option_namen'), 'durchgefallen');
ist('option_namen: Wert über 255 Zeichen', ergebnis(aend((p) => { p.optionen[0].werte = ['a'.repeat(256)]; }), 'option_namen'), 'durchgefallen');
// marge
ist('marge: Netto 3.99', ergebnis(aend((p) => { p.varianten[0].nettoChf = 3.99; }), 'marge'), 'durchgefallen');
ist('marge: Netto 4.00 genau erlaubt', ergebnis(aend((p) => { p.varianten[0].nettoChf = 4; p.varianten[0].nettoBeiMesskursChf = 4; }), 'marge'), 'bestanden');
ist('marge: beim Messkurs unter 4', ergebnis(aend((p) => { p.varianten[0].nettoBeiMesskursChf = 3; }), 'marge'), 'durchgefallen');
ist('marge: Preis nicht auf X.90', ergebnis(aend((p) => { p.varianten[0].preisChf = 27.5; }), 'marge'), 'durchgefallen');
ist('marge: Preis fehlt', ergebnis(aend((p) => { p.varianten[0].preisChf = null; }), 'marge'), 'durchgefallen');
ist('marge: nur EINE schlechte Variante genügt', ergebnis(aend((p) => { p.varianten[2].nettoChf = 0; }), 'marge'), 'durchgefallen');
ist('marge: ohne Varianten nicht bestanden', ergebnis(aend((p) => { p.varianten = []; }), 'marge'), 'durchgefallen');
// bilder
ist('bilder: nicht gemessen → ungeprüft', ergebnis(basis, 'bilder', ctx({ bilder: null })), 'ungeprueft');
ist('bilder: Messung unvollständig → ungeprüft', ergebnis(aend((p) => { p.bilder.ungemessen = ['u']; }), 'bilder'), 'ungeprueft');
ist('bilder: nur 2 → durchgefallen', ergebnis(aend((p) => { p.medien = p.medien.slice(0, 2); }), 'bilder'), 'durchgefallen');
ist('bilder: 3 → bestanden', ergebnis(aend((p) => { p.medien = p.medien.slice(0, 3); }), 'bilder'), 'bestanden');
// titel
ist('titel_uebersetzt: unbekannte Wörter', ergebnis(aend((p) => { p.titelUnbekannt = ['Scented']; }), 'titel_uebersetzt'), 'durchgefallen');
ist('titel_uebersetzt: Fremdmarke im Titel', ergebnis(aend((p) => { p.titel = 'Gildan Tasse selbst gestalten'; }), 'titel_uebersetzt'), 'durchgefallen');
ist('titel_uebersetzt: kein Titel', ergebnis(aend((p) => { p.titel = null; }), 'titel_uebersetzt'), 'durchgefallen');
ist('titel_belegt: «Bio» ohne organic', ergebnis(aend((p) => { p.titel = 'Bio Tasse selbst gestalten'; }), 'titel_belegt'), 'durchgefallen');
ist('titel_belegt: «Bio» mit organic im Katalogtext', ergebnis(aend((p) => { p.titel = 'Bio Tasse selbst gestalten'; }), 'titel_belegt', ctx({ originalText: '100% organic cotton' })), 'bestanden');
ist('titel_belegt: «Eco» ohne Beleg im Text → durchgefallen (die README-Aussage gilt jetzt wirklich)', ergebnis(aend((p) => { p.titel = 'Eco Tasse selbst gestalten'; p.titelEn = 'Eco Mug'; }), 'titel_belegt'), 'durchgefallen');
ist('titel_belegt: «Eco» mit «eco-friendly» im Katalogtext → bestanden', ergebnis(aend((p) => { p.titel = 'Eco Tasse selbst gestalten'; }), 'titel_belegt', ctx({ originalText: 'An eco-friendly choice.' })), 'bestanden');
ist('titel_belegt: das Wort im ENGLISCHEN TITEL allein belegt nichts mehr (nur die Beschreibung zählt)', ergebnis(aend((p) => { p.titel = 'Bio Tasse selbst gestalten'; p.titelEn = 'Organic Mug'; }), 'titel_belegt'), 'durchgefallen');
ist('titel_belegt: «recycelt» ohne recycled', ergebnis(aend((p) => { p.titel = 'Recycelte Tasse selbst gestalten'; }), 'titel_belegt'), 'durchgefallen');
// handle
ist('handle: Grossbuchstabe', ergebnis(aend((p) => { p.handle = 'Tasse-selbst-gestalten'; }), 'handle_frei'), 'durchgefallen');
ist('handle: 51 Zeichen', ergebnis(aend((p) => { p.handle = 'a'.repeat(51 - 17) + '-selbst-gestalten'; }), 'handle_frei'), 'durchgefallen');
ist('handle: genau 50 Zeichen erlaubt', ergebnis(aend((p) => { p.handle = 'a'.repeat(50 - 17) + '-selbst-gestalten'; }), 'handle_frei'), 'bestanden');
ist('handle: falscher Zusatz', ergebnis(aend((p) => { p.handle = 'tasse'; }), 'handle_frei'), 'durchgefallen');
ist('handle: Unterstrich', ergebnis(aend((p) => { p.handle = 'tasse_x-selbst-gestalten'; }), 'handle_frei'), 'durchgefallen');
ist('handle: schon vergeben', ergebnis(basis, 'handle_frei', ctx({ schonHandles: new Set([basis.handle]) })), 'durchgefallen');
ist('handle: kein Handle', ergebnis(aend((p) => { p.handle = null; }), 'handle_frei'), 'durchgefallen');
// Einheiten und Striche
for (const w of ['Zoll', 'inch', 'inches', '12″', 'oz', 'ounces', 'lbs', 'pounds', 'Pfund', 'Unzen', 'feet', 'ft', 'Fuss', 'Fuß', 'yards']) wahr(`masse_einheiten erkennt «${w}»`, NICHT_METRISCH.test(`Höhe 12 ${w}`));
for (const w of ['Fussball', 'Fußball', 'Fussmatte', 'Fußmatte', 'Kofferraum', '300 dpi', 'Soft', 'Zollikon', 'ftp']) wahr(`masse_einheiten lässt «${w}» durch`, !NICHT_METRISCH.test(w));
// Löcher aus dem Befund (Gegenleser 1, F7): ASCII-Zoll, Fahrenheit, «in» nach einer Zahl
for (const t of ['Masse: 20" × 14" × 5"', 'Masse: 20” × 14”', '86 °F', '86 ° F', '86 Fahrenheit', 'Länge 12 in', 'Länge 12 in.', '12 in x 14 in', 'Breite 3in']) wahr(`masse_einheiten erkennt «${t}»`, NICHT_METRISCH.test(t));
for (const t of ['3 in 1', '2 in 1 Set', '10 in einer Packung', '5 in Weiss', 'Gestalte in 5 Minuten', 'in Schwarz', 'Cap in 2 Grössen']) wahr(`masse_einheiten lässt «${t}» durch (deutsches «in»)`, !NICHT_METRISCH.test(t));
ist('masse_einheiten: Zoll in der Beschreibung', ergebnis(aend((p) => { p.beschreibungHtml += '<p>Höhe 12 Zoll</p>'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: oz im Optionswert', ergebnis(aend((p) => { p.optionen[0].werte = ['11 oz']; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im Titel', ergebnis(aend((p) => { p.titel = 'Tasse 11 oz selbst gestalten'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im SEO-Text', ergebnis(aend((p) => { p.seo.description = 'Poster 12 inch'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im Alt-Text', ergebnis(aend((p) => { p.medien[0].alt = 'Tasse 4 inches'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: «Zoll» im JSON-Skript zählt nicht (kein Kundentext)', ergebnis(aend((p) => { p.beschreibungHtml += '<script type="application/json">{"a":"Zoll"}</script>'; }), 'masse_einheiten'), 'bestanden');
ist('gedankenstrich: Titel', ergebnis(aend((p) => { p.titel = 'Tasse – selbst gestalten'; }), 'gedankenstrich'), 'durchgefallen');
ist('gedankenstrich: langer Strich in der Beschreibung', ergebnis(aend((p) => { p.beschreibungHtml += '<p>a — b</p>'; }), 'gedankenstrich'), 'durchgefallen');
for (const [n, t] of [['Minuszeichen', 'Tasse − selbst gestalten'], ['Bindestrich mit Leerzeichen', 'Tasse - selbst gestalten'], ['Ziffernstrich', 'Tasse ‒ selbst gestalten'], ['Querstrich', 'Tasse ― selbst gestalten']]) ist(`gedankenstrich: ${n} (Löcher aus dem Befund)`, ergebnis(aend((p) => { p.titel = t; }), 'gedankenstrich'), 'durchgefallen');
ist('gedankenstrich: Bindestrich ohne Leerzeichen bleibt erlaubt (Kiss-Cut, T-Shirt)', ergebnis(aend((p) => { p.titel = 'Kiss-Cut T-Shirt selbst gestalten'; }), 'gedankenstrich'), 'bestanden');
ist('gedankenstrich: Bindestrich ist erlaubt', ergebnis(aend((p) => { p.titel = 'Keramik-Tasse selbst gestalten'; }), 'gedankenstrich'), 'bestanden');
// Beschreibung, Karte
ist('beschreibung_belegt: Übersetzung ungültig', ergebnis(aend((p) => { p.uebersetzung = { ok: false, fehler: ['x'] }; }), 'beschreibung_belegt'), 'durchgefallen');
ist('beschreibung_belegt: fehlt ganz', ergebnis(aend((p) => { delete p.uebersetzung; }), 'beschreibung_belegt'), 'durchgefallen');
ist('karte: Metafeld-Karte zu gross', ergebnis(aend((p) => { p.kompaktBytes = 10241; }), 'karte'), 'durchgefallen');
ist('karte: Metafeld-Karte genau 10240 Byte erlaubt', ergebnis(aend((p) => { p.kompaktBytes = 10240; }), 'karte'), 'bestanden');
ist('karte: Editor-Karte zu gross', ergebnis(aend((p) => { p.karteBytes = 24577; }), 'karte'), 'durchgefallen');
ist('karte: Editor-Karte genau 24576 Byte erlaubt (auch wenn sie über 10240 liegt)', ergebnis(aend((p) => { p.karteBytes = 24576; }), 'karte'), 'bestanden');
ist('karte: keine bestellbare Fläche', ergebnis(aend((p) => { for (const x of p.kompakt.platzierungen) x.inklusive = false; }), 'karte'), 'durchgefallen');
ist('karte: Fläche ohne Grösse', ergebnis(aend((p) => { for (const x of p.kompakt.platzierungen) x.flaeche.breite = 0; }), 'karte'), 'durchgefallen');
ist('karte: keine Basisfläche', ergebnis(aend((p) => { p.basisPlatzierung = null; }), 'karte'), 'durchgefallen');
// Hinweise blockieren nie
const hinw = aend((p) => { p.bestellweg.gesichert = false; p.varianten[0].herkunft = 'ausserhalb'; p.auswahl.farbenAusgelassen = [{ name: 'X', grund: 'Farbname nicht übersetzt' }]; p.beschreibungWeggelassen = ['x']; });
hinw.lieferzeit = { min: 17, max: 21, quelle: 'berechnet', versandTage: [12, 16], fertigung: [2, 5] }; hinw.kategorie = null;
ist('Hinweis-Tore fallen durch, ohne zu blockieren', [lauf(hinw).filter((t) => t.art === 'hinweis' && t.ergebnis === 'durchgefallen').map((t) => t.code).sort(), lauf(hinw).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').length], [['bestellweg', 'farben', 'groessentabelle', 'kategorie', 'kostenschaetzung', 'lieferherkunft', 'lieferzeit_laenger', 'titel_automatisch', 'uebersetzung_luecken', 'versand_je_groesse'].sort(), 0]);
ist('Hinweis «Obergrenze» ist keine fehlende Farbe', lauf(aend((p) => { p.auswahl.farbenAusgelassen = [{ name: 'X', grund: 'Obergrenze 100 Varianten' }]; })).find((t) => t.code === 'farben').ergebnis, 'bestanden');
// einzelne neue Hinweise (Gegenleser 05.11.)
const hin1 = (p, code, c) => lauf(p, c).find((t) => t.code === code)?.ergebnis;
ist('lieferzeit_laenger: Shop-Standard → bestanden, berechnete längere Spanne → Hinweis', [hin1(basis, 'lieferzeit_laenger'), hin1(aend((p) => { p.lieferzeit = { min: 17, max: 21, quelle: 'berechnet', versandTage: [12, 16], fertigung: [2, 5] }; }), 'lieferzeit_laenger')], ['bestanden', 'durchgefallen']);
ist('versand_je_groesse: mehrere Druckdateien und keine Rate je Variante → Hinweis; mit Raten je Variante oder einer Datei → bestanden', [hin1(basis, 'versand_je_groesse'), hin1(basis, 'versand_je_groesse', ctx({ versandJeVariante: true })), hin1(aend((p) => { p.kompakt.gruppen = undefined; }), 'versand_je_groesse')], ['durchgefallen', 'bestanden', 'bestanden']);
ist('kategorie: bekannter Typ → bestanden, ohne Eintrag → Hinweis (blockiert nicht)', [hin1(basis, 'kategorie'), hin1(aend((p) => { p.kategorie = null; }), 'kategorie'), lauf(aend((p) => { p.kategorie = null; })).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').length], ['bestanden', 'durchgefallen', 0]);
ist('variantenbild: alle mit Bild → bestanden; eine ohne → Hinweis (blockiert nicht)', [hin1(basis, 'variantenbild'), hin1(aend((p) => { p.varianten[0].bildAlt = null; }), 'variantenbild'), lauf(aend((p) => { p.varianten[0].bildAlt = null; })).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').length], ['bestanden', 'durchgefallen', 0]);
ist('titel_automatisch: fester Titel → bestanden, Glossar-Titel → Hinweis', [hin1(aend((p) => { p.titelQuelle = 'fest'; }), 'titel_automatisch'), hin1(aend((p) => { p.titelQuelle = 'glossar'; }), 'titel_automatisch')], ['bestanden', 'durchgefallen']);
// Grund bei «keine Variante»: nicht mehr pauschal «keine bestellbare Variante» (Gegenleser 2, K3)
{
  const leer = (a) => lauf(aend((p) => { p.varianten = []; p.auswahl = { ...p.auswahl, ...a }; })).find((t) => t.code === 'varianten').grund;
  wahr('varianten leer, nichts auf Lager: Grund «in keiner Region auf Lager»', /in keiner Region auf Lager/.test(leer({ vorAuswahl: 5, bestellbar: 0, farbenAusgelassen: [] })));
  wahr('varianten leer, Farben nicht übersetzt: Grund nennt Farbe und Glossar', /alle Farben ausgelassen \(Bay: Farbname nicht übersetzt\).*Glossar/.test(leer({ vorAuswahl: 5, bestellbar: 5, farbenAusgelassen: [{ name: 'Bay', grund: 'Farbname nicht übersetzt' }] })));
}
ist('bildinhalt ist immer ungeprüft (nur per Sicht)', ergebnis(basis, 'bildinhalt'), 'ungeprueft');
ist('Ein ungeprüftes Blocker-Tor macht den Plan nicht anlegbar', (() => { const p = planeModell({ katalog: k, versand: versand(), uebersetzung: testUebersetzung(k), bilder: null }, { jetzt: 'x' }); return [p.anlegbar, p.tore.find((t) => t.code === 'bilder').ergebnis]; })(), [false, 'ungeprueft']);

ende();
