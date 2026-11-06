// Tests für beschreibung.mjs (kein Netz). Lauf: /opt/node22/bin/node automation/pod_modell/beschreibung_test.mjs
// Die Belege stammen aus den echten Katalogtexten (testdaten/katalog/19.json = Tasse, 206.json = Dad-Cap). Zusätzlich werden die zwölf Übersetzungsdateien der Beispiele gegen die
// Katalogdateien geprüft, WENN KATALOG_DIR gesetzt ist (die Dateien liegen nicht im Repo; ohne KATALOG_DIR wird dieser Teil übersprungen und gemeldet).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beschreibungBauen, pruefeUebersetzung, zahlenAus, jsonFuerScript, htmlText, esc, spanneText, lieferbox, tabelleWiederholtNurGroesse, RUECKGABE_TEXT, RUECKGABE_TEXT_LIVE, ladeUebersetzung, PLATZHALTER_VARIANTE, PLATZHALTER_EDITOR, technikDeVon, HINWEIS_DE, messungDe, VERBOTEN } from './beschreibung.mjs';
import { modellkarteBauen } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { kontextAusKatalog } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';
import { lade, neuerTest, tief } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('beschreibung');
const orig = modellkarteBauen(lade(19)).beschreibung.original;       // Tasse
const ko = { ozArt: 'volumen' };
const gut = { intro: [{ de: 'Ob Morgenkaffee, Abendtee oder etwas dazwischen: Diese Tasse ist genau richtig für dich.', beleg: "Whether you're drinking your morning coffee, evening tea, or something in between—this mug's for you!" }],
  punkte: [{ de: 'Aus Keramik', beleg: 'Ceramic' }, { de: '325 ml: Höhe 9,6 cm, Durchmesser 8,2 cm', beleg: orig.match(/11 oz mug dimensions[^\n]*/)[0] }] };
const fehler = (u) => pruefeUebersetzung(u, orig, ko).fehler;
const hat = (u, teil) => fehler(u).some((f) => f.includes(teil));

// ── Annahme
ist('gute Übersetzung: keine Fehler', fehler(gut), []);
ist('gute Übersetzung: ok und gezählte Sätze', (({ ok, saetze }) => ({ ok, saetze }))(pruefeUebersetzung(gut, orig, ko)), { ok: true, saetze: 3 });
const oz = { intro: [{ de: 'Fassungsvermögen: 325 ml', beleg: 'Capacity 11 oz.' }] };
ist('oz→ml ohne Kontext (ozArt) ist unbelegt', pruefeUebersetzung(oz, 'Capacity 11 oz.', {}).fehler.some((f) => f.includes('Zahl 325')), true);
ist('oz→ml mit Kontext «volumen» ist erlaubt', pruefeUebersetzung(oz, 'Capacity 11 oz.', ko).fehler, []);

// ── Ablehnung: jede Regel einzeln
const m = (f) => { const u = tief(gut); f(u); return u; };
ist('ohne Übersetzung', pruefeUebersetzung(null, orig).fehler, ['keine Übersetzung vorhanden']);
wahr('ohne intro', hat(m((u) => { u.intro = []; }), 'intro fehlt'));
wahr('Beleg steht nicht im Katalogtext', hat(m((u) => { u.intro[0].beleg = 'This mug is the best on earth.'; }), 'Beleg steht nicht wörtlich'));
wahr('Beleg fehlt', hat(m((u) => { delete u.punkte[0].beleg; }), '«beleg» fehlt'));
wahr('deutscher Satz fehlt', hat(m((u) => { u.punkte[0].de = ''; }), '«de» fehlt'));
wahr('erfundene Zahl', hat(m((u) => { u.punkte[1].de = '325 ml: Höhe 12 cm, Durchmesser 8,2 cm'; }), 'Zahl 12'));
wahr('falsche Zahl neben richtigen (8,5 statt 8,2)', hat(m((u) => { u.punkte[1].de = '325 ml: Höhe 9,6 cm, Durchmesser 8,5 cm'; }), 'Zahl 8.5'));
wahr('Lieferzeit', hat(m((u) => { u.intro[0].de = 'Lieferzeit 3 Werktage.'; }), 'Lieferzeit'));
wahr('Rückgabe', hat(m((u) => { u.intro[0].de = 'Mit Rückgabe möglich.'; }), 'Rückgabe'));
wahr('Garantie', hat(m((u) => { u.intro[0].de = 'Mit Garantie.'; }), 'Garantie'));
wahr('Preis', hat(m((u) => { u.intro[0].de = 'Nur CHF 10.'; }), 'Preis'));
wahr('Superlativ', hat(m((u) => { u.intro[0].de = 'Der Bestseller.'; }), 'Superlativ'));
wahr('Zoll', hat(m((u) => { u.punkte[0].de = 'Höhe 3,79 Zoll'; }), 'Zoll'));
wahr('oz im deutschen Satz', hat(m((u) => { u.punkte[0].de = 'Fasst 11 oz'; }), 'Zoll/oz/lb'));
wahr('Gedankenstrich', hat(m((u) => { u.punkte[0].de = 'Keramik – glänzend'; }), 'Gedankenstrich'));
wahr('Behauptung «wasserdicht» ohne Gegenstück im Beleg', hat(m((u) => { u.punkte[0].de = 'Wasserdicht'; }), 'wasserdicht'));
wahr('Behauptung «spülmaschinenfest» ohne Gegenstück (Tasse 19 sagt es nicht)', hat(m((u) => { u.punkte[0].de = 'Spülmaschinenfest'; }), 'spülmaschinen'));
wahr('Behauptung «zertifiziert» ohne Gegenstück', hat(m((u) => { u.punkte[0].de = 'Zertifiziert'; }), 'zertifiziert'));
wahr('Behauptung «Bio» ohne Gegenstück', hat(m((u) => { u.punkte[0].de = 'Aus Bio-Keramik'; }), 'bio'));
wahr('Liste statt Array', hat(m((u) => { u.punkte = 'x'; }), 'keine Liste'));
// Behauptung MIT Gegenstück ist erlaubt
const orig2 = 'Dishwasher and microwave safe. 100% certified organic cotton.';
ist('Behauptung mit Gegenstück im Beleg ist erlaubt', pruefeUebersetzung({ intro: [{ de: 'Spülmaschinen- und mikrowellengeeignet, 100 % zertifizierte Bio-Baumwolle.', beleg: 'Dishwasher and microwave safe. 100% certified organic cotton.' }] }, orig2, {}).fehler, []);
ist('Beleg-Vergleich ignoriert Gross-/Kleinschreibung, Leerraum und Anführungszeichen', pruefeUebersetzung({ intro: [{ de: 'Kopfumfang 55,9 bis 60,6 cm', beleg: 'head   circumference: 22”–23⅞” (55.9 cm–60.6 cm)' }] }, 'Head circumference: 22"-23⅞" (55.9 cm-60.6 cm)\nx', {}).fehler, []);
ist('nicht übernommene Punkte werden gemeldet (nur Hinweis)', pruefeUebersetzung(gut, orig, ko).nichtUebernommen.length > 0, true);

// ── Zahlen
ist('zahlenAus: Komma, Punkt, Hunderter-Trenner', zahlenAus("1'000 und 55,9 und 271.25 und 3/1 und 100 %"), [1000, 55.9, 271.25, 3, 1, 100]);
ist('zahlenAus: leer', zahlenAus(null), []);

// ── Bausteine
ist('jsonFuerScript schützt «</script>»', jsonFuerScript({ a: '</script><!--' }).includes('</script'), false);
ist('jsonFuerScript bleibt gültiges JSON', JSON.parse(jsonFuerScript({ a: '</script> ' })).a, '</script> ');
ist('esc', esc('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
ist('htmlText ohne script/style/Kommentar', htmlText('<p>Hallo <b>Welt</b></p><script>var a="Zoll";</script><style>.a{}</style><!-- x -->&amp; Co'), 'Hallo Welt & Co');
ist('Lieferspanne: bis, nie Bindestrich', [spanneText(3, 6), spanneText(5, 5), spanneText(0, 3), spanneText(6, 3), spanneText(null, 3)], ['3 bis 6 Werktage', '5 Werktage', null, null, null]);
const lb = lieferbox({ min: 7, max: 14 });
wahr('Lieferbox im Wortlaut der Live-Seiten: «Lieferzeit Schweiz: 7 bis 14 Werktage · Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein»', htmlText(lb) === '📦 Lieferzeit Schweiz: 7 bis 14 Werktage · Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein', htmlText(lb));
wahr('Lieferbox: kein «Printful» und kein «Kasse» (Versandtage ohne Fertigung sind keine Lieferzeit; Kassendatum für Druckartikel nicht belegt, Gegenleser 05.11.)', !/printful|kasse/i.test(lb));
wahr('Lieferbox ohne Strich (– —)', !/[–—]/.test(htmlText(lb)));
wahr('Lieferbox mit berechneter längerer Spanne', /17 bis 21 Werktage/.test(lieferbox({ min: 17, max: 21 })));
ist('Lieferbox ohne gültige Tage: keine Box', [lieferbox({ min: null, max: null }), lieferbox({ min: 9, max: 3 })], [null, null]);
ist('Rückgabetext: gleich der Live-Seite bis auf den Gedankenstrich', RUECKGABE_TEXT_LIVE.replace(' — eine Rückgabe aus Meinungsänderung ist darum', ', darum ist eine Rückgabe aus Meinungsänderung'), RUECKGABE_TEXT);
wahr('Rückgabetext ohne Gedankenstrich', !/[–—]/.test(RUECKGABE_TEXT));
wahr('Rückgabetext schliesst Rückgabe aus Meinungsänderung aus, nennt Druckfehler', /Rückgabe aus Meinungsänderung ausgeschlossen/.test(RUECKGABE_TEXT) && /Druckfehlern/.test(RUECKGABE_TEXT));
ist('Platzhalter sind eindeutig', [PLATZHALTER_VARIANTE, PLATZHALTER_EDITOR], ['__ERSTE_VARIANTE__', '__LSPOD_EDITOR_URL__']);
ist('Technik DE: bekannt und unbekannt', [technikDeVon('DTG'), technikDeVon('EMBROIDERY'), technikDeVon('GIBTSNICHT')], ['Direktdruck auf Textil (DTG)', 'Stickerei', null]);
wahr('Tipps ohne Zoll und ohne Strich', Object.values(HINWEIS_DE).every((x) => !/zoll|[–—]/i.test(x)));
ist('Messungsnamen: Buchstaben haben keinen deutschen Namen', [messungDe('Length'), messungDe('Sleeve length'), messungDe('A')], ['Länge', 'Ärmellänge', null]);
ist('ladeUebersetzung: fehlende Datei', ladeUebersetzung('/gibt/es/nicht', 1).u, null);
ist('ladeUebersetzung: kein Ordner', ladeUebersetzung(null, 1).fehler, 'kein Übersetzungsordner angegeben');

// ── Grössentabellen im Seitentext
const tab = (typ, label, wert) => ({ typ, einheitOriginal: 'inches', messungen: [{ label, art: 'laenge', einheit: 'cm', markiert: false, werte: [{ groesse: 'S', groesseAnzeige: 'S', wert, anzeige: wert }, { groesse: 'M', groesseAnzeige: 'M', min: 78.7, max: 86.4, anzeige: '78,7–86,4 cm' }] }] });
const bauen = (tabellen) => beschreibungBauen({ karte: { groessentabelle: { tabellen }, produktMasse: [] }, lieferzeit: null, modell: 1, klasse: 'FLACH', editorKarte: { schema: 1 }, kompakt: { platzierungen: [], hinweise: [] }, technikDe: null, basis: null, uebersetzung: { intro: [], punkte: [] } });
const t1 = bauen([tab('product_measure', 'Length', '68,6 cm'), tab('measure_yourself', 'Length', '68,6 cm')]);
ist('zwei gleiche Tabellen: nur eine wird gezeigt, die andere als weggelassen vermerkt', [(t1.html.match(/<table/g) || []).length, t1.weggelassen.some((x) => /gleich einer schon gezeigten/.test(x))], [1, true]);
const t2 = bauen([tab('product_measure', 'Length', '68,6 cm'), tab('measure_yourself', 'Length', '70 cm')]);
ist('zwei verschiedene Tabellen: beide', (t2.html.match(/<table/g) || []).length, 2);
wahr('Bereiche in Tabellen: «bis» statt Strich', /78,7 bis 86,4 cm/.test(t1.html) && !/[–—]/.test(htmlText(t1.html)));
ist('Tabelle mit Buchstaben (A, B …) entfällt mit Vermerk', (() => { const r = bauen([tab('product_measure', 'A', '1 cm')]); return [/<table/.test(r.html), r.weggelassen.length]; })(), [false, 1]);
ist('Tabelle mit nicht umgerechneten (markierten) Werten entfällt', (() => { const t = tab('product_measure', 'Length', '1 cm'); t.messungen[0].markiert = true; return /<table/.test(bauen([t]).html); })(), false);
ist('Überschriften der beiden Tabellenarten', (() => { const r = bauen([tab('product_measure', 'Length', '1 cm'), tab('measure_yourself', 'Length', '2 cm')]).html; return [/Masse des Produkts \(cm\)/.test(r), /Grössentabelle zum Selbstmessen \(cm\)/.test(r)]; })(), [true, true]);

// ── Tabellen, die nur die Grösse wiederholen (Leinwand, Gegenleser 2, K4)
{
  const zelle = (g, anzeige) => ({ groesse: g, groesseAnzeige: g, anzeige });
  const leinwand = { typ: 'measure_yourself', messungen: [{ label: 'Height', werte: [zelle('20,3 × 25,4 cm', '20,3 cm'), zelle('61 × 91,4 cm', '61 cm')] }, { label: 'Width', werte: [zelle('20,3 × 25,4 cm', '25,4 cm'), zelle('61 × 91,4 cm', '91,4 cm')] }] };
  const shirt = { typ: 'product_measure', messungen: [{ label: 'Length', werte: [zelle('S', '68,6 cm'), zelle('M', '71,1 cm')] }] };
  const gemischt = { typ: 'product_measure', messungen: [{ label: 'Length', werte: [zelle('20 × 30 cm', '20 cm'), zelle('40 × 50 cm', '45 cm')] }] };
  ist('Tabelle wiederholt nur die Grössenbezeichnung → true; Kleidertabelle und gemischte → false; leer → false', [tabelleWiederholtNurGroesse(leinwand), tabelleWiederholtNurGroesse(shirt), tabelleWiederholtNurGroesse(gemischt), tabelleWiederholtNurGroesse({ messungen: [] })], [true, false, false, false]);
  const r = beschreibungBauen({ karte: { groessentabelle: { tabellen: [{ ...leinwand, messungen: leinwand.messungen.map((m) => ({ ...m, label: m.label === 'Height' ? 'Height' : 'Width', einheit: 'cm', markiert: false })) }] }, produktMasse: [] }, lieferzeit: null, modell: 1, klasse: 'FLACH', editorKarte: { schema: 1 }, kompakt: { platzierungen: [], hinweise: [] }, technikDe: null, basis: null, uebersetzung: { intro: [], punkte: [] } });
  ist('beschreibungBauen: die wiederholende Tabelle fehlt ohne Vermerk und ohne die Überschrift «zum Selbstmessen»', [/<table/.test(r.html), /Selbstmessen/.test(r.html), r.weggelassen.length], [false, false, 0]);
}
// ── Eckdaten «Druckdatei»: nur, wenn alle Grössen dieselbe Druckdatei nutzen (Gegenleser 05.11.: Poster «42 × 29,7 cm» für Formate bis 61 × 91,4 cm)
{
  const basisPf = { titel: 'Druckfläche', printfile: { breitePx: 4962, hoehePx: 3507, dpi: 300, groesseCm: { breite: 42, hoehe: 29.7 } } };
  const mit = (geos) => beschreibungBauen({ karte: { groessentabelle: { tabellen: [] }, produktMasse: [] }, lieferzeit: null, modell: 1, klasse: 'FLACH', editorKarte: { schema: 1 }, kompakt: { basis: 'default', platzierungen: [{ id: 'default', art: 'flaeche', ...(geos ? { geometrien: geos } : {}) }], hinweise: [] }, technikDe: 'Sublimationsdruck', basis: basisPf, uebersetzung: { intro: [], punkte: [] } }).html;
  wahr('eine Druckdatei für alle Grössen: die Zeile steht da, mit Pixeln und cm', /Druckdatei \(Druckfläche\):<\/strong> 4962 × 3507 Pixel bei 300 dpi, das sind 42 × 29,7 cm/.test(mit(undefined)));
  wahr('mehrere Druckdateien (je Grösse eine): die Zeile entfällt, das Druckverfahren bleibt', !/Druckdatei/.test(mit([{ printfileId: 1 }, { printfileId: 2 }])) && /Druckverfahren/.test(mit([{ printfileId: 1 }, { printfileId: 2 }])));
  wahr('eine einzige Geometrie gilt als eine Druckdatei', /Druckdatei/.test(mit([{ printfileId: 1 }])));
}
// ── keine Marketing-Superlative und keine Zusagen in den Übersetzungen (Gegenleser 1, F6): ohne Katalog prüfbar
{
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../../dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen');
  for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => /^\d+\.json$/.test(x)) : []) {
    const u = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const treffer = [];
    for (const g of ['intro', 'punkte', 'hinweis']) for (const x of u[g] ?? []) for (const [re, was] of VERBOTEN) if (re.test(x.de)) treffer.push(`${was}: ${x.de.slice(0, 50)}`);
    ist(`Übersetzung ${f}: kein VERBOTEN-Muster (Superlativ, Garantie, Zoll, Strich …)`, treffer, []);
  }
  for (const [t, was] of [['der ultimative Begleiter', 'Superlativ'], ['unvergleichliche Behaglichkeit', 'Superlativ'], ['die perfekte Wahl', 'Superlativ'], ['ein einzigartiger Look', 'Superlativ'], ['Masse: 20" × 14"', 'Zoll/oz/lb'], ['bis 86 °F', 'Zoll/oz/lb'], ['a − b', 'Gedankenstrich'], ['a - b', 'Gedankenstrich']]) wahr(`VERBOTEN erkennt «${t}» als ${was}`, VERBOTEN.some(([re, w]) => w === was && re.test(t)));
  for (const t of ['Kopfumfang 55,9 bis 60,6 cm', 'Stoffgewicht: 142 g/m²', 'Kiss-Cut Aufkleber', 'mit gerippt-em Saum']) wahr(`VERBOTEN lässt «${t}» durch`, !VERBOTEN.some(([re]) => re.test(t)));
}
// ── die zwölf Beispiel-Übersetzungen gegen die echten Katalogdateien (nur mit KATALOG_DIR)
const HIER = dirname(fileURLToPath(import.meta.url));
const UE = join(HIER, '../../dropship/selbst-gestalten-fertig-0511/fabrik/uebersetzungen');
const KD = process.env.KATALOG_DIR;
const dateien = existsSync(UE) ? readdirSync(UE).filter((f) => /^\d+\.json$/.test(f)) : [];
wahr('es gibt Übersetzungsdateien der Beispiele', dateien.length >= 12, `(${dateien.length})`);
if (KD && existsSync(KD)) {
  for (const f of dateien) {
    const id = parseInt(f, 10);
    if (!existsSync(join(KD, `${id}.json`))) { console.log(`   (übersprungen: Katalogdatei ${id}.json fehlt)`); continue; }
    const kat = JSON.parse(readFileSync(join(KD, `${id}.json`), 'utf8'));
    const r = pruefeUebersetzung(JSON.parse(readFileSync(join(UE, f), 'utf8')), modellkarteBauen(kat).beschreibung.original, { ozArt: kontextAusKatalog(kat).ozArt });
    ist(`Übersetzung ${id}: alle Belege wörtlich, keine erfundene Zahl, keine Zusage`, r.fehler, []);
  }
} else console.log('   (Übersetzungsdateien nicht gegen die Kataloge geprüft: KATALOG_DIR nicht gesetzt)');
for (const f of dateien) {
  const u = JSON.parse(readFileSync(join(UE, f), 'utf8'));
  const alle = [...(u.intro ?? []), ...(u.punkte ?? []), ...(u.hinweis ?? [])];
  ist(`Übersetzung ${f}: jeder Eintrag hat de und beleg, kein Gedankenstrich, kein Zoll`, alle.filter((x) => !x.de || !x.beleg || /[–—]|zoll|\boz\b/i.test(x.de)).length, 0);
}

ende();
