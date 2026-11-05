// Tests für plan.mjs (kein Netz). Lauf: /opt/node22/bin/node automation/pod_modell/plan_test.mjs
// Echte Katalogdateien (Printful-API, geholt 05.11.2026) aus dropship/selbst-gestalten-fertig-0511/werkzeuge/testdaten/katalog/:
//   19 Tasse · 206 Dad-Cap (Stickerei, Pflicht-Aufpreis) · 268 Poster · 798 iPhone-Hülle · 71 T-Shirt (628 Varianten, mehr als 100) · 861 Kerze (ohne bestellbare Variante) · 574 Schuh · 388 Allover-Hoodie (PANEL)
import { planeModell, waehleVarianten, optionenBauen, basisPlatzierung, kompaktKarte, medienBauen, hashVon, kanon, seoText, gruppeVon, SKU_BASIS, FABRIK_REGEL } from './plan.mjs';
import { modellkarteBauen } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { endpreis } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';
import { lade, versand, testUebersetzung, bilderFuer, neuerTest, tief } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('plan');
const plan = (id, extra = {}, opt = {}) => { const k = extra.katalog ?? lade(id); return planeModell({ katalog: k, versand: 'versand' in extra ? extra.versand : versand(), uebersetzung: testUebersetzung(k), bilder: 'bilder' in extra ? extra.bilder : bilderFuer(k), schaetzung: extra.schaetzung ?? null }, { jetzt: 'x', stufen: [1, 2], ...opt }); };
const blocker = (p) => p.tore.filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').map((t) => t.code);
const tor = (p, c) => p.tore.find((t) => t.code === c);

// ── Dad-Cap 206: Stickerei, einzige zeichenbare Fläche kostet extra
const cap = plan(206);
ist('206: Titel und Handle', [cap.titel, cap.handle], ['Klassische Dad-Cap selbst gestalten', 'klassische-dad-cap-selbst-gestalten']);
ist('206: anlegbar, DRAFT, Verkäufer', [cap.anlegbar, cap.status, cap.vendor], [true, 'DRAFT', 'LuxeStyle']);
ist('206: Klasse FLACH_MIT_HINWEIS, Stufe 1', [cap.klasse, cap.stufe], ['FLACH_MIT_HINWEIS', 1]);
wahr('206: Basisfläche mit Pflicht-Aufpreis (Stickerei vorne gross)', cap.basisPlatzierung.pflichtAufpreisUsd > 0 && cap.kompakt.basisMitAufpreis === true, JSON.stringify(cap.basisPlatzierung));
ist('206: Aufpreis im Preis = Pflicht-Aufpreis + Digitalisierung 6.50', cap.varianten[0].aufpreisUsd, Math.round((cap.basisPlatzierung.pflichtAufpreisUsd + FABRIK_REGEL.digitalisierungUsd) * 100) / 100);
wahr('206: die Basisfläche ist in der Editor-Karte «inklusive» und kostenlos für den Kunden', cap.kompakt.platzierungen.find((p) => p.id === cap.kompakt.basis).inklusive === true);
wahr('206: Bestellweg nicht gesichert (printful_sync schickt «front», die Fläche heisst anders) und Tag', tor(cap, 'bestellweg').ergebnis === 'durchgefallen' && cap.tags.includes('pod-bestellweg-manuell'));
ist('206: Tipps zur Stickerei und Kappe stehen in der Beschreibung', [/Stickerei/.test(cap.beschreibungHtml), /Fläche ist klein und gewölbt/.test(cap.beschreibungHtml)], [true, true]);

// ── SKU, Preis, Marge
const alle = [plan(19), cap, plan(268), plan(798), plan(71), plan(388)];
for (const p of alle) {
  const n = p.printfulProductId;
  ist(`${n}: SKU «<9100000+Nr>_<Variantennummer>»`, p.varianten.every((v) => v.sku === `${SKU_BASIS + n}_${v.printfulVariantId}` && /_(\d+)$/.test(v.sku)), true);
  ist(`${n}: Preise auf X.90`, p.varianten.every((v) => Math.round(v.preisChf * 100) % 100 === 90), true);
  ist(`${n}: Gewinn nach MWST, Gebühr, Ware, Versand mindestens CHF 4.00 (Kurs 0.90 UND Messkurs)`, p.varianten.every((v) => v.nettoChf >= 4 && v.nettoBeiMesskursChf >= 4), true);
  ist(`${n}: SKUs eindeutig`, new Set(p.varianten.map((v) => v.sku)).size, p.varianten.length);
  ist(`${n}: höchstens 100 Varianten`, p.varianten.length <= 100, true);
  ist(`${n}: Handle ≤ 50 Zeichen, nur a-z 0-9 -`, p.handle.length <= 50 && /^[a-z0-9-]+$/.test(p.handle), true);
  ist(`${n}: keine Zoll/oz/lb und keine Gedankenstriche in den Kundentexten`, ['masse_einheiten', 'gedankenstrich'].map((c) => tor(p, c).ergebnis), ['bestanden', 'bestanden']);
  ist(`${n}: Metafeld-Karte < 10 KB und gleich der Karte der Beschreibung`, [p.kompaktBytes < 10240, JSON.parse(p.metafelder.find((m) => m.key === 'karte').value).modell], [true, n]);
  ist(`${n}: Plan trägt den Marker-Tag und die Pflicht-Tags`, ['sg-fabrik', 'wunschdesign', 'selbst-gestalten', `sg-modell-${n}`].every((x) => p.tags.includes(x)), true);
  ist(`${n}: keine Variante unter dem Kostenboden (Preis ≥ Kostenpreis der Formel)`, p.varianten.every((v) => v.preisChf >= endpreis({ ekUsd: v.ekRechnungUsd, versandUsd: v.versandUsd, aufpreisUsd: v.aufpreisUsd, ekRichtwertUsd: v.kostenUsd }).mindestpreisChf), true);
}
// Preis gegen die Formel von Hand: Tasse 1320, Katalogpreis aus der Datei
const tasse = plan(19);
const v1 = tasse.varianten[0];
const soll = endpreis({ ekUsd: v1.kostenUsd * 1.26, versandUsd: 10.39, aufpreisUsd: 0, ekRichtwertUsd: v1.kostenUsd });   // 1.26 = grösste gemessene Abweichung der Printful-Rechnung nach oben (preisformel.mjs)
ist('19: Preis = Formel (Kostenboden mit +26 %, Richtwert auf Katalogpreis)', [v1.preisChf, v1.ekQuelle, v1.ekRechnungUsd], [soll.preisChf, 'katalog+26%', Math.round(v1.kostenUsd * 1.26 * 100) / 100]);
const mitSch = plan(19, { schaetzung: { [v1.printfulVariantId]: v1.kostenUsd * 1.1 } });
ist('19: mit Kostenschätzung rechnet der Kostenboden mit der Schätzung statt +26 %', [mitSch.varianten[0].ekQuelle, mitSch.varianten[0].ekRechnungUsd], ['schaetzung', Math.round(v1.kostenUsd * 1.1 * 100) / 100]);
wahr('19: Schätzung unter dem Katalogpreis wird NICHT genommen (das Grössere gilt)', plan(19, { schaetzung: { [v1.printfulVariantId]: v1.kostenUsd * 0.8 } }).varianten[0].ekRechnungUsd === v1.kostenUsd);

// ── Versand
const ohneRate = plan(19, { versand: { variante: 1, http: 400, raten: [], fehler: 'x' } });
ist('ohne CH-Rate: gesperrt', [ohneRate.anlegbar, blocker(ohneRate).includes('ch_rate')], [false, true]);
ist('ohne CH-Rate: Preis nicht berechenbar, Tore melden es', blocker(ohneRate).includes('varianten') && ohneRate.varianten.every((v) => v.preisChf === null), true);
ist('ohne Versandeintrag: gesperrt', blocker(plan(19, { versand: null })).includes('ch_rate'), true);
ist('Rate 0 oder negativ: gesperrt', [plan(19, { versand: versand('0') }), plan(19, { versand: versand('-3') })].map((p) => blocker(p).includes('ch_rate')), [true, true]);
ist('Rate ohne Tage: Lieferangabe fehlt, Anlegen gesperrt', blocker(plan(19, { versand: { variante: 1, http: 200, raten: [{ id: 'STANDARD', rateUsd: '10.39' }] } })).includes('lieferangabe'), true);
ist('Lieferzeit auf der Seite: Spanne aus der Rate, «laut Printful», keine Tageszusage', [/3 bis 6 Werktage/.test(plan(19).beschreibungHtml), /laut Printful/.test(plan(19).beschreibungHtml)], [true, true]);
ist('Lieferzeit-Metafeld trägt die Rate', JSON.parse(plan(19).metafelder.find((m) => m.key === 'lieferzeit').value).tier, 'pod');
ist('Rate wechselt: der Preis steigt', plan(19, { versand: versand('20.00') }).varianten[0].preisChf > plan(19).varianten[0].preisChf, true);
ist('Versand je Variante überschreibt die Modellrate', planeModell({ katalog: lade(19), versand: versand(), uebersetzung: testUebersetzung(lade(19)), bilder: bilderFuer(lade(19)) }, { jetzt: 'x', versandVarianten: { [v1.printfulVariantId]: 30 } }).varianten[0].versandUsd === 10.39 ? 'ignoriert' : 'genommen', 'genommen');

// ── Mehr als 100 Varianten: T-Shirt 71 (628 Varianten, davon 329 EU-bestellbar)
const shirt = plan(71);
ist('71: Auswahl auf höchstens 100 Varianten', shirt.varianten.length <= 100 && shirt.varianten.length > 50, true);
ist('71: gängigste Farben zuerst (Weiss, Schwarz, Marineblau)', shirt.auswahl.farbenGewaehlt.slice(0, 3).map((f) => f.de), ['Weiss', 'Schwarz', 'Marineblau']);
ist('71: keine Farbe nur teilweise (jede gewählte Farbe mit all ihren bestellbaren Varianten)', shirt.auswahl.farbenGewaehlt.every((f) => shirt.varianten.filter((v) => v.farbe === f.de).length === f.anzahl), true);
ist('71: lückenlose Rangfolge (die gewählten sind ein Anfang der Rangliste, nichts Selteneres vor Gängigerem)', (() => { const r = shirt.auswahl.farbenGewaehlt.map((f) => f.rang); return r.every((x, i) => i === 0 || r[i - 1] <= x); })(), true);
ist('71: abgeschnittene Farben sind benannt (Obergrenze)', shirt.auswahl.farbenAusgelassen.some((f) => /^Obergrenze 100/.test(f.grund)), true);
ist('71: alle Grössen bleiben', optionenBauen(modellkarteBauen(lade(71)), waehleVarianten(modellkarteBauen(lade(71)), lade(71)).varianten).achsen.find((a) => a.art === 'groesse').werte.length >= 5, true);
ist('71: gleiche Eingabe gibt gleichen Plan (deterministisch, Hash gleich)', plan(71).hash, shirt.hash);
ist('71: Optionen Farbe und Grösse in dieser Reihenfolge', shirt.optionen.map((o) => o.name), ['Farbe', 'Grösse']);
wahr('71: Nur EU-bestellbare Varianten, andere mit Grund ausgelassen', shirt.varianten.every((v) => v.herkunft === 'EU' || v.herkunft === 'EU-auf-Anfrage') && shirt.auswahl.ausgelassen.length > 0);
ist('71: eigene Maximalgrenze greift (max 20)', waehleVarianten(modellkarteBauen(lade(71)), lade(71), { max: 20 }).varianten.length <= 20, true);
ist('71: Maximalgrenze kleiner als die erste Farbe: keine Variante, Plan gesperrt', blocker(planeModell({ katalog: lade(71), versand: versand(), uebersetzung: testUebersetzung(lade(71)), bilder: bilderFuer(lade(71)) }, { jetzt: 'x', regel: { maxVarianten: 1 } })).includes('varianten'), true);

// ── Farben mit gleichem deutschem Namen
{
  const k = tief(lade(19)); const vs = k.varianten;
  vs[0].color = 'Dark Grey'; vs[1].color = 'Dark Gray'; vs[2].color = 'Black';
  const p = plan(19, { katalog: k });
  ist('«Dark Grey» und «Dark Gray» sind beide «Dunkelgrau»: nur eine Farbe, die andere mit Grund ausgelassen', [p.optionen.find((o) => o.name === 'Farbe').werte.filter((w) => w === 'Dunkelgrau').length, p.auswahl.farbenAusgelassen.some((f) => /gleicher deutscher Name «Dunkelgrau»/.test(f.grund))], [1, true]);
  const k2 = tief(lade(19)); k2.varianten[0].color = 'Mystic Foo';
  const p2 = plan(19, { katalog: k2 });
  ist('Farbe mit unbekanntem Wort: Variante fehlt, Grund benannt, Hinweis-Tor fällt durch, Plan bleibt anlegbar', [p2.varianten.length, p2.auswahl.farbenAusgelassen[0].name, tor(p2, 'farben').ergebnis, p2.anlegbar], [2, 'Mystic Foo', 'durchgefallen', true]);
}

// ── Herkunft / Übersee
const k19 = tief(lade(19)); for (const v of k19.varianten) v.status = { US: 'in_stock' };
const us = plan(19, { katalog: k19 });
ist('19 nur USA: bestellbar mit Tag pod-uebersee und Hinweis', [us.varianten.length, us.tags.includes('pod-uebersee'), tor(us, 'lieferherkunft').ergebnis], [3, true, 'durchgefallen']);
ist('19 nur USA, UEBERSEE aus: keine Variante, gesperrt', blocker(plan(19, { katalog: k19 }, { uebersee: false })).includes('varianten'), true);
const k19b = tief(lade(19)); k19b.varianten[0].status = { US: 'in_stock' }; k19b.varianten[1].status = { EU: 'in_stock' }; k19b.varianten[2].status = { EU: 'stocked_on_demand' };
const mix = plan(19, { katalog: k19b });
ist('19 gemischt: nur die EU-Varianten (die US-Variante entfällt mit Grund)', [mix.varianten.length, mix.auswahl.ausgelassen.some((a) => /nur ausserhalb der EU/.test(a.grund))], [2, true]);
const k19c = tief(lade(19)); for (const v of k19c.varianten) v.status = { US: 'out_of_stock' };
ist('19 nirgends auf Lager: keine Variante', blocker(plan(19, { katalog: k19c })).includes('varianten'), true);

// ── Klassen und Stufen
ist('861 Kerze: keine bestellbare Variante → gesperrt', [plan(861).anlegbar, blocker(plan(861)).includes('varianten')], [false, true]);
ist('574 Schuh: Klasse UNGEEIGNET → gesperrt', [plan(574).stufe, blocker(plan(574)).includes('klasse')], [null, true]);
ist('388 Allover-Hoodie: PANEL = Stufe 2', [plan(388).klasse, plan(388).stufe], ['PANEL', 2]);
ist('PANEL bei Stufe 1: gesperrt mit Grund', [plan(388, {}, { stufen: [1] }).anlegbar, tor(plan(388, {}, { stufen: [1] }), 'klasse').grund.includes('Stufe 2')], [false, true]);
ist('PANEL bei Stufen 1 und 2: erlaubt', plan(388, {}, { stufen: [1, 2] }).anlegbar || blocker(plan(388, {}, { stufen: [1, 2] })).includes('klasse') === false, true);
ist('Modell schon im Shop: gesperrt', blocker(plan(19, {}, { verwendeteModelle: new Set([19]) })).includes('modell_neu'), true);
ist('Klassen-Tag im Plan', plan(388).tags.includes('sg-klasse-panel'), true);

// ── Titel, Handle, Kollisionen
ist('Titel schon vergeben (mit Strich-Schreibweise der heutigen Produkte): Unterscheidung durch Stoffgewicht', (() => { const p = plan(71, {}, { schonTitel: new Set(['Unisex T-Shirt – Selbst gestalten']) }); return [p.titelUnterscheidung, p.titel, p.handle]; })().map(String), ['stoffgewicht', 'Unisex T-Shirt 142 g/m² selbst gestalten', 'unisex-t-shirt-142-gramm-selbst-gestalten']);
ist('Titel und Titel mit Stoffgewicht vergeben: Unterscheidung durch Modellnummer', (() => { const p = plan(71, {}, { schonTitel: new Set(['Unisex T-Shirt – Selbst gestalten', 'Unisex T-Shirt 142 g/m² selbst gestalten']) }); return [p.titelUnterscheidung, p.titel]; })().map(String), ['modellnummer', 'Unisex T-Shirt Modell 71 selbst gestalten']);
ist('Handle schon vergeben: Modellnummer im Handle', plan(71, {}, { schonHandles: new Set(['unisex-t-shirt-selbst-gestalten']) }).handle, 'unisex-t-shirt-71-selbst-gestalten');
ist('Handle und Modellnummer vergeben: gesperrt', blocker(plan(71, {}, { schonHandles: new Set(['unisex-t-shirt-selbst-gestalten', 'unisex-t-shirt-71-selbst-gestalten']) })).includes('handle_frei'), true);
ist('SKU im Shop vorhanden: gesperrt', blocker(plan(19, {}, { schonSkus: new Set([`${SKU_BASIS + 19}_${tasse.varianten[0].printfulVariantId}`]) })).includes('sku_eindeutig'), true);
ist('Unbekanntes Titelwort: gesperrt mit Wort im Grund', [blocker(plan(861)).includes('titel_uebersetzt'), tor(plan(861), 'titel_uebersetzt').grund.includes('Scented')], [true, true]);

// ── Optionen
const k206 = modellkarteBauen(lade(206));
ist('Optionen: nur eine Achse mit Wert → Grösse/Farbe nach Regel', optionenBauen(k206, waehleVarianten(k206, lade(206)).varianten).achsen.map((a) => a.name), ['Farbe']);
const phone = plan(798);
ist('Handyhülle: Optionen «Oberfläche» und «Modell»', phone.optionen.map((o) => o.name), ['Oberfläche', 'Modell']);
wahr('Handyhülle: Modellnamen bleiben (iPhone ist nötig)', phone.optionen[1].werte.some((w) => /iPhone/.test(w)));
ist('Poster: keine Farbe, nur Grösse in cm', (() => { const p = plan(268); return [p.optionen.map((o) => o.name), p.optionen[0].werte.every((w) => /cm/.test(w) && !/″|in\b/.test(w))]; })(), [['Grösse'], true]);
ist('Tasse: Grösse in ml, nicht oz', plan(19).optionen.find((o) => o.name === 'Grösse').werte.every((w) => /ml$/.test(w)), true);

// ── Medien
const md = medienBauen({ karte: modellkarteBauen(lade(19)), katalog: lade(19), varianten: waehleVarianten(modellkarteBauen(lade(19)), lade(19)).varianten, titel: 'T', bilder: bilderFuer(lade(19)) });
wahr('Medien: Alt-Texte eindeutig und ohne Gedankenstrich', new Set(md.medien.map((m) => m.alt)).size === md.medien.length && md.medien.every((m) => !/[–—]/.test(m.alt)));
const kleine = bilderFuer(lade(19), 300, 300);
ist('Bilder zu klein: Galerie leer, Tor «bilder» fällt durch', [plan(19, { bilder: kleine }).medien.length, tor(plan(19, { bilder: kleine }), 'bilder').ergebnis], [0, 'durchgefallen']);
ist('Bilder nicht gemessen: Tor «bilder» ungeprüft, Plan nicht anlegbar', [tor(plan(19, { bilder: null }), 'bilder').ergebnis, plan(19, { bilder: null }).anlegbar], ['ungeprueft', false]);
ist('Bilder teilweise gemessen: ungeprüft (keine Adresse wird geraten)', (() => { const b = bilderFuer(lade(19)); delete b[lade(19).varianten[0].image]; return tor(plan(19, { bilder: b }), 'bilder').ergebnis; })(), 'ungeprueft');
ist('Bild genau 600 px kurze Seite ist lesbar, 599 nicht', [tor(plan(19, { bilder: bilderFuer(lade(19), 600, 800) }), 'bilder').ergebnis, plan(19, { bilder: bilderFuer(lade(19), 599, 800) }).medien.length], ['bestanden', 0]);
ist('jede Variante mit Bild hat einen Alt-Text, der in der Galerie vorkommt', plan(19).varianten.every((v) => v.bildAlt === null || plan(19).medien.some((m) => m.alt === v.bildAlt)), true);
ist('weniger als drei Bilder: durchgefallen', (() => { const k = tief(lade(19)); const url = k.varianten[0].image; for (const v of k.varianten) v.image = url; k.produkt.image = url; return tor(plan(19, { katalog: k }), 'bilder').ergebnis; })(), 'durchgefallen');

// ── Editor-Karte
const kp = plan(19).kompakt;
ist('Karte: Schema, Modell, Klasse', [kp.schema, kp.modell, kp.klasse], ['lspod-karte/1', 19, 'FLACH']);
wahr('Karte: Druckdatei je Variante (3 Grössen = 3 Gruppen) steht in «gruppen»', Array.isArray(kp.gruppen) && kp.gruppen.length === 3 && kp.gruppen.every((g) => g.varianten.length === 1));
wahr('Karte: jede Platzierung mit Pixeln, dpi und Fläche', kp.platzierungen.every((p) => p.druck.px[0] > 0 && p.druck.dpi > 0 && p.flaeche.breite > 0));
wahr('Karte ohne Variantenliste (keine SKU, keine Preise, keine Farben)', !/"(sku|preisChf|farbe|farbeDe|varianten:)"/.test(JSON.stringify(kp)) && kp.varianten === undefined);
const tshirt = plan(71).kompakt;
ist('T-Shirt: Rückseite und Ärmel sind NICHT bestellbar (Aufpreis), Vorderseite schon', [tshirt.platzierungen.find((p) => p.id === 'front').inklusive, tshirt.platzierungen.find((p) => p.id === 'back').inklusive, tshirt.platzierungen.find((p) => p.id === 'back').aufpreisChf > 0], [true, false, true]);
ist('Poster: Geometrien je Format (mehr als eine Druckdatei)', (plan(268).kompakt.platzierungen[0].geometrien ?? []).length > 1, true);
ist('Hash der Karte stabil', hashVon(plan(19).kompakt), hashVon(plan(19).kompakt));
ist('kanon: Schlüsselreihenfolge egal', kanon({ b: 1, a: [2, { d: 1, c: 2 }] }), kanon({ a: [2, { c: 2, d: 1 }], b: 1 }));
ist('basisPlatzierung: Karte ohne Fläche → null', basisPlatzierung({ platzierungen: [] }), null);

// ── Hash
ist('Hash ändert sich, wenn ein Preis sich ändert', plan(19, { versand: versand('11.00') }).hash !== plan(19).hash, true);
ist('Hash ändert sich nicht durch die Uhr', planeModell({ katalog: lade(19), versand: versand(), uebersetzung: testUebersetzung(lade(19)), bilder: bilderFuer(lade(19)) }, { jetzt: 'A', stufen: [1, 2] }).hash, planeModell({ katalog: lade(19), versand: versand(), uebersetzung: testUebersetzung(lade(19)), bilder: bilderFuer(lade(19)) }, { jetzt: 'B', stufen: [1, 2] }).hash);

// ── Sonstiges
ist('seoText ≤ 160 Zeichen, nie mitten im Wort', [seoText('Strukturierte Cap mit geschlossener Rückseite und noch viel längerem Namen selbst gestalten').length <= 160, seoText('Kurz selbst gestalten').length <= 160], [true, true]);
ist('Gruppen: Tasse gehört zu «Trinken», T-Shirt zu «Bekleidung»', [gruppeVon(modellkarteBauen(lade(19))).tag, gruppeVon(modellkarteBauen(lade(71))).tag], ['sg-trinken', 'sg-bekleidung']);
ist('kaputte Katalogdatei: Plan mit Tor statt Absturz', (() => { const p = planeModell({ katalog: {}, versand: versand() }, { jetzt: 'x' }); return [p.anlegbar, p.tore[0].code]; })(), [false, 'katalog']);
ist('Beschreibung enthält Platzhalter für Variante und Editor (LIVE ersetzt sie)', [/__ERSTE_VARIANTE__/.test(plan(19).beschreibungHtml), /__LSPOD_EDITOR_URL__/.test(plan(19).beschreibungHtml)], [true, true]);
ist('Beschreibung: Rückgabe-Hinweis personalisierter Ware', /Rückgabe aus Meinungsänderung ausgeschlossen/.test(plan(19).beschreibungHtml), true);
ist('Beschreibung: Editor-Container und Karte im Skript-Tag', [/class="lspod-designer"/.test(plan(19).beschreibungHtml), /<script type="application\/json" id="lspod-karte">/.test(plan(19).beschreibungHtml)], [true, true]);

ende();
