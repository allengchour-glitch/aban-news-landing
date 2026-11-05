// Tests für tore.mjs (kein Netz): jedes Blocker-Tor wird einzeln zum Kippen gebracht, damit klar ist, dass es wirklich schützt.
// Lauf: /opt/node22/bin/node automation/pod_modell/tore_test.mjs
import { pruefeTore, NICHT_METRISCH } from './tore.mjs';
import { planeModell } from './plan.mjs';
import { lade, versand, testUebersetzung, bilderFuer, neuerTest, tief } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('tore');
const k = lade(19);
const basis = planeModell({ katalog: k, versand: versand(), uebersetzung: testUebersetzung(k), bilder: bilderFuer(k) }, { jetzt: 'x' });
const ctx = (extra = {}) => ({ regel: basis.erzeugt.regel, stufen: [1], schonHandles: new Set(), schonSkus: new Set(), verwendeteModelle: new Set(), bilder: bilderFuer(k), kartenMaxBytes: 10240, originalText: 'Whether you drink coffee. Ceramic.', ...extra });
const lauf = (p, c = ctx()) => pruefeTore(p, c);
const ergebnis = (p, code, c) => lauf(p, c).find((t) => t.code === code)?.ergebnis;
const aend = (f) => { const p = tief(basis); f(p); return p; };

ist('Grundplan: alle Blocker bestanden', lauf(basis).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').map((t) => `${t.code}:${t.grund}`), []);
ist('Grundplan: die 16 Blocker-Tore', lauf(basis).filter((t) => t.art === 'blocker').map((t) => t.code), ['klasse', 'modell_neu', 'ch_rate', 'lieferangabe', 'varianten', 'sku_eindeutig', 'option_namen', 'marge', 'bilder', 'titel_uebersetzt', 'titel_belegt', 'handle_frei', 'masse_einheiten', 'gedankenstrich', 'beschreibung_belegt', 'karte']);

// klasse / modell_neu
ist('klasse: Stufe nicht freigegeben', ergebnis(aend((p) => { p.stufe = 2; }), 'klasse'), 'durchgefallen');
ist('klasse: stufe null (UNGEEIGNET)', ergebnis(aend((p) => { p.stufe = null; p.klasse = 'UNGEEIGNET'; }), 'klasse'), 'durchgefallen');
ist('klasse: Stufe 2 freigegeben', ergebnis(aend((p) => { p.stufe = 2; }), 'klasse', ctx({ stufen: [1, 2] })), 'bestanden');
ist('modell_neu', ergebnis(basis, 'modell_neu', ctx({ verwendeteModelle: new Set([19]) })), 'durchgefallen');
// ch_rate / lieferangabe
ist('ch_rate fehlt', ergebnis(aend((p) => { p.lieferung = null; }), 'ch_rate'), 'durchgefallen');
ist('lieferangabe: Tage fehlen', ergebnis(aend((p) => { p.lieferung.tageMin = null; }), 'lieferangabe'), 'durchgefallen');
ist('lieferangabe: Max < Min', ergebnis(aend((p) => { p.lieferung.tageMin = 9; p.lieferung.tageMax = 3; }), 'lieferangabe'), 'durchgefallen');
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
ist('titel_belegt: «Eco» ohne recycled', ergebnis(aend((p) => { p.titel = 'Eco Tasse selbst gestalten'; }), 'titel_belegt'), 'bestanden');   // Eco ist keine Behauptung der Liste, nur «Bio», «recycelt» …
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
for (const w of ['Zoll', 'inch', 'inches', '12″', 'oz', 'ounces', 'lbs', 'pounds', 'Pfund', 'Unzen', 'feet', 'ft', 'Fuss', 'yards']) wahr(`masse_einheiten erkennt «${w}»`, NICHT_METRISCH.test(`Höhe 12 ${w}`));
for (const w of ['Fussball', 'Kofferraum', '300 dpi', 'Soft', 'Zollikon', 'ftp']) wahr(`masse_einheiten lässt «${w}» durch`, !NICHT_METRISCH.test(w));
ist('masse_einheiten: Zoll in der Beschreibung', ergebnis(aend((p) => { p.beschreibungHtml += '<p>Höhe 12 Zoll</p>'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: oz im Optionswert', ergebnis(aend((p) => { p.optionen[0].werte = ['11 oz']; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im Titel', ergebnis(aend((p) => { p.titel = 'Tasse 11 oz selbst gestalten'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im SEO-Text', ergebnis(aend((p) => { p.seo.description = 'Poster 12 inch'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: im Alt-Text', ergebnis(aend((p) => { p.medien[0].alt = 'Tasse 4 inches'; }), 'masse_einheiten'), 'durchgefallen');
ist('masse_einheiten: «Zoll» im JSON-Skript zählt nicht (kein Kundentext)', ergebnis(aend((p) => { p.beschreibungHtml += '<script type="application/json">{"a":"Zoll"}</script>'; }), 'masse_einheiten'), 'bestanden');
ist('gedankenstrich: Titel', ergebnis(aend((p) => { p.titel = 'Tasse – selbst gestalten'; }), 'gedankenstrich'), 'durchgefallen');
ist('gedankenstrich: langer Strich in der Beschreibung', ergebnis(aend((p) => { p.beschreibungHtml += '<p>a — b</p>'; }), 'gedankenstrich'), 'durchgefallen');
ist('gedankenstrich: Bindestrich ist erlaubt', ergebnis(aend((p) => { p.titel = 'Keramik-Tasse selbst gestalten'; }), 'gedankenstrich'), 'bestanden');
// Beschreibung, Karte
ist('beschreibung_belegt: Übersetzung ungültig', ergebnis(aend((p) => { p.uebersetzung = { ok: false, fehler: ['x'] }; }), 'beschreibung_belegt'), 'durchgefallen');
ist('beschreibung_belegt: fehlt ganz', ergebnis(aend((p) => { delete p.uebersetzung; }), 'beschreibung_belegt'), 'durchgefallen');
ist('karte: zu gross', ergebnis(aend((p) => { p.kompaktBytes = 10241; }), 'karte'), 'durchgefallen');
ist('karte: genau 10240 Byte erlaubt', ergebnis(aend((p) => { p.kompaktBytes = 10240; }), 'karte'), 'bestanden');
ist('karte: keine bestellbare Fläche', ergebnis(aend((p) => { for (const x of p.kompakt.platzierungen) x.inklusive = false; }), 'karte'), 'durchgefallen');
ist('karte: Fläche ohne Grösse', ergebnis(aend((p) => { for (const x of p.kompakt.platzierungen) x.flaeche.breite = 0; }), 'karte'), 'durchgefallen');
ist('karte: keine Basisfläche', ergebnis(aend((p) => { p.basisPlatzierung = null; }), 'karte'), 'durchgefallen');
// Hinweise blockieren nie
const hinw = aend((p) => { p.bestellweg.gesichert = false; p.varianten[0].herkunft = 'ausserhalb'; p.auswahl.farbenAusgelassen = [{ name: 'X', grund: 'Farbname nicht übersetzt' }]; p.beschreibungWeggelassen = ['x']; });
ist('Hinweis-Tore fallen durch, ohne zu blockieren', [lauf(hinw).filter((t) => t.art === 'hinweis' && t.ergebnis === 'durchgefallen').map((t) => t.code).sort(), lauf(hinw).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').length], [['bestellweg', 'farben', 'groessentabelle', 'kostenschaetzung', 'lieferherkunft', 'uebersetzung_luecken'].sort(), 0]);
ist('Hinweis «Obergrenze» ist keine fehlende Farbe', lauf(aend((p) => { p.auswahl.farbenAusgelassen = [{ name: 'X', grund: 'Obergrenze 100 Varianten' }]; })).find((t) => t.code === 'farben').ergebnis, 'bestanden');
ist('bildinhalt ist immer ungeprüft (nur per Sicht)', ergebnis(basis, 'bildinhalt'), 'ungeprueft');
ist('Ein ungeprüftes Blocker-Tor macht den Plan nicht anlegbar', (() => { const p = planeModell({ katalog: k, versand: versand(), uebersetzung: testUebersetzung(k), bilder: null }, { jetzt: 'x' }); return [p.anlegbar, p.tore.find((t) => t.code === 'bilder').ergebnis]; })(), [false, 'ungeprueft']);

ende();
