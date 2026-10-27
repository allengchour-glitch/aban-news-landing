// node automation/lib/material_test.mjs — Material aus belegten Quellen (lib/material.mjs). Fälle stammen aus dem echten Katalog (27.10.2026).
import assert from 'node:assert/strict';
import { bereinige, teil, materialAusText, materialAusCj, enZuDe, hatMaterial, entscheide, pruefeWert, htmlZuText, lederWert, titelKonflikt } from './material.mjs';
let n = 0;
const ist = (name, ist_, soll) => { n++; try { assert.deepEqual(ist_, soll); } catch (e) { console.error('✗', name, '\n  ist :', JSON.stringify(ist_), '\n  soll:', JSON.stringify(soll)); process.exitCode = 1; } };

// ── bereinige: nur Stoffnamen
ist('Polyester', bereinige('Polyester'), 'Polyester');
ist('Mehrere Stoffe', bereinige('Polyester, Strick'), 'Polyester, Strick');
ist('«und» trennt', bereinige('Edelstahl und Silikon'), 'Edelstahl, Silikon');
ist('Schrägstrich trennt', bereinige('Metall/Glas'), 'Metall, Glas');
ist('Prozentangabe fällt weg', bereinige('100 % Baumwolle'), 'Baumwolle');
ist('Füllwort «hochwertige»', bereinige('Hochwertige Aluminiumlegierung'), 'Aluminiumlegierung');
ist('echtes Leder → Echtleder', bereinige('echtes Leder'), 'Echtleder');
ist('PU-Leder bleibt', bereinige('PU Leder'), 'PU-Leder');
ist('Klammer mit Stoffwort → mehrdeutig, verworfen', bereinige('Edelstahl (Titanstahl)'), null);
ist('andere Klammer fällt weg', bereinige('Polyester (Dacron)'), 'Polyester');
ist('Kürzel ABS wird erklärt', bereinige('ABS'), 'ABS-Kunststoff');
ist('Marketingsatz → null', bereinige('Selbstklebender Sticker'), null);
ist('Satz mit «für» → null', bereinige('Elektrochemisches Aluminium für hochwertige Prägungen'), null);
ist('ein Teil kein Stoff → ganz null', bereinige('Polyester, Rüschenärmel'), null);
ist('mehr als 4 Teile → null', bereinige('Holz, Metall, Glas, Stein, Kunststoff'), null);
ist('leer → null', bereinige(''), null);
ist('Zahlenkolonne → null', bereinige('12345 Polyester'), null);
ist('teil: Ziffern ausser Feingehalt → null', teil('Silber 12345'), null);
ist('teil: 925er Silber', teil('925er Silber'), '925er Silber');
ist('Wort mit Stamm «pe» in anderem Wort zählt nicht', bereinige('Pelikan'), null);

// ── Text: «Material:»-Zeilen aus den Produkttexten
const li = w => `<ul><li>Farbe: Schwarz</li>\n<li>Material: ${w}</li>\n<li>Stil: Elegant</li></ul>`;
ist('Zeile in Liste', materialAusText(li('Polyesterfaser')), { wert: 'Polyesterfaser', quelle: 'beschreibung' });
ist('Strong-Format der Detailblöcke', materialAusText('<ul><li>\n<strong>Material:</strong> Bambus</li></ul>'), { wert: 'Bambus', quelle: 'beschreibung' });
ist('Mischung mit Oberflächenangabe', materialAusText(li('Polyester mit weicher Oberfläche')), { ungeklaert: 'kein Stoffname: Teilangabe: Polyester mit weicher Oberfläche' });
ist('Zwei verschiedene Angaben → mehrdeutig', materialAusText(li('Polyester') + li('Leder')).ungeklaert?.startsWith('mehrdeutig'), true);
ist('Zweimal dasselbe ist eindeutig', materialAusText(li('Polyester') + li('polyester')).wert, 'Polyester');
ist('Kein Material in der Seite → null', materialAusText('<p>Schöne Tasse</p>'), null);
ist('Mitten im Satz zählt nicht', materialAusText('<p>Das Material ist Polyester, sehr weich.</p>'), null);
ist('htmlZuText behält Zeilen', htmlZuText('<li>A</li><li>B&nbsp;C</li>'), 'A\nB C');
ist('Deutsche Umlaute aus Entities', htmlZuText('<li>Gr&ouml;sse: M</li>'), 'Grösse: M');

// ── CJ: englisch → deutsch, unbekanntes Wort = verwerfen
ist('enZuDe Alloy', enZuDe('Alloy'), 'Legierung');
ist('enZuDe Mischung', enZuDe('Stainless Steel, Silicone'), 'Edelstahl, Silikon');
ist('enZuDe Prozent', enZuDe('95% Cotton 5% Spandex'), null);   // zwei Anteile in einem Teil → nicht sicher
ist('enZuDe Prozent je Teil', enZuDe('95% cotton, 5% spandex'), 'Baumwolle, Elastan');
ist('enZuDe unbekannt', enZuDe('Cloth'), null);
// bestehende Metafeld-Werte im Shop (Stichprobe 27.10.): englische werden übersetzt, deutsche bleiben (enZuDe liefert für sie null oder dasselbe Wort)
for (const [en, de] of [['Silver', 'Silber'], ['Alloy', 'Legierung'], ['Plastic', 'Kunststoff'], ['Cotton', 'Baumwolle'], ['Stainless', 'Edelstahl'], ['Metal', 'Metall'], ['Wood', 'Holz'], ['Silicone', 'Silikon'], ['Velvet', 'Samt'], ['Lace', 'Spitze']])
  ist('übersetze «' + en + '»', enZuDe(en), de);
for (const deu of ['Edelstahl', 'Glas', 'Kupfer', 'Zinklegierung', 'ABS-Kunststoff', 'Titanstahl', 'Oxford-Gewebe']) ist('deutsches «' + deu + '» wird nicht angefasst', enZuDe(deu), null);
ist('gleichlautend (Nylon) bleibt gleich', enZuDe('Nylon'), 'Nylon');
ist('enZuDe Others', enZuDe('Others'), null);
ist('enZuDe PU leather', enZuDe('PU leather'), 'PU-Leder');
ist('CJ Beschreibung Zeile', materialAusCj({ description: '<p>Product information:</p><p>Material: Zinc alloy</p><p>Size: 5cm</p>' }), { wert: 'Zinklegierung', quelle: 'cj-datenblatt' });
ist('CJ ohne Material', materialAusCj({ description: '<p>Size: 5cm</p>' }), null);
ist('CJ Marketing', materialAusCj({ description: '<p>Material: COMMON</p>' }), { ungeklaert: 'kein Stoffname: COMMON' });
ist('CJ productPro mit Tabelle', materialAusCj({ productProEn: 'Material | Stainless steel' }).wert, 'Edelstahl');
ist('CJ grobes Feld materialNameEn wird ignoriert', materialAusCj({ materialNameEn: '["Leather"]' }), null);

// ── hatMaterial
ist('Detailblock', hatMaterial({ descriptionHtml: '<ul><li>\n<strong>Material:</strong> Holz</li></ul>' }), 'detailblock');
ist('Detailblock Mehrzahl', hatMaterial({ descriptionHtml: '<li><strong>Materialien:</strong> Holz</li>' }), 'detailblock');
ist('Option', hatMaterial({ descriptionHtml: '', optionen: [{ name: 'Farbe' }, { name: 'Material' }] }), 'option');
ist('Metafeld', hatMaterial({ descriptionHtml: '', metafeld: 'Holz' }), 'metafeld');
ist('nichts', hatMaterial({ descriptionHtml: '<p>x</p>', optionen: [{ name: 'Farbe' }] }), null);
ist('freie Zeile im Text ist noch KEIN Detailblock', hatMaterial({ descriptionHtml: '<li>Material: Holz</li>' }), null);

// ── Sperren
ist('PU allein ist mehrdeutig', pruefeWert('PU', {}) !== null, true);
ist('Echtleder bei Kunstleder-Hinweis gesperrt', pruefeWert('Echtleder', { descriptionHtml: '<p>Tasche aus PU-Leder</p>' }) !== null, true);
ist('Echtleder im Titel + Beschreibung sauber: frei', pruefeWert('Echtleder', { descriptionHtml: '<p>Geldbörse aus Rindsleder</p>', titel: 'Herren Geldbörse' }), null);
ist('Kunstleder-Hinweis nur im CJ-Titel genügt zur Sperre', pruefeWert('Leder', { descriptionHtml: '', cj: { productNameEn: 'Faux leather bag' } }) !== null, true);

// ── entscheide: Reihenfolge
const roh = { descriptionHtml: li('Nylon'), optionen: [{ name: 'Farbe' }], metafeld: '', titel: 'Rucksack' };
ist('Text vor CJ', entscheide({ ...roh, cj: { description: 'Material: Polyester' } }), { tun: true, wert: 'Nylon', quelle: 'beschreibung' });
ist('CJ, wenn der Text nichts hergibt', entscheide({ ...roh, descriptionHtml: '<p>x</p>', cj: { description: 'Material: Polyester' } }), { tun: true, wert: 'Polyester', quelle: 'cj-datenblatt' });
ist('schon da → nichts tun', entscheide({ ...roh, metafeld: 'Holz' }), { tun: false, grund: 'schon-da:metafeld' });
ist('keine Quelle', entscheide({ descriptionHtml: '<p>x</p>', optionen: [], titel: 'x' }), { tun: false, grund: 'keine-quelle' });
ist('Sperre meldet Grund', entscheide({ descriptionHtml: li('Leder') + '<p>PU-Leder</p>', optionen: [], titel: 'Tasche' }).grund?.startsWith('sperre:'), true);
ist('ungeklärter Text meldet Grund', entscheide({ descriptionHtml: li('Selbstklebender Sticker'), optionen: [], titel: 'x' }).grund?.startsWith('text:'), true);

// ── Befunde der unabhängigen Leser (27.10.2026, Stichprobe 149): jeder dieser Fälle stand als Vorschlag in der Stichprobe
ist('Umlaut am Anfang bleibt («Ökologische Baumwolle»)', bereinige('Ökologische Baumwolle'), 'Ökologische Baumwolle');
ist('Ö am Anfang bleibt', teil('Öko Baumwolle'), 'Öko Baumwolle');
ist('Englische Reste («Tpu printing compound glue») fliegen raus', bereinige('Tpu printing compound glue'), null);
ist('«Nylon silk» fliegt raus', bereinige('Nylon silk'), null);
ist('«ABS Silicone» ist kein deutscher Wert', bereinige('ABS Silicone'), null);
ist('CJ: «Tpu printing compound glue»', materialAusCj({ description: 'Material: Tpu printing compound glue' }), { ungeklaert: 'kein Stoffname: Tpu printing compound glue' });
ist('CJ: «Nylon silk»', materialAusCj({ description: 'Material: Nylon silk' }), { ungeklaert: 'kein Stoffname: Nylon silk' });
ist('PC wird ausgeschrieben', bereinige('PC'), 'Polycarbonat');
ist('PP wird ausgeschrieben', bereinige('Robustes PP'), 'Polypropylen');
ist('Kürzel gross und erklärt: «tpe»', bereinige('tpe'), 'TPE-Kunststoff');
ist('Kürzel gross im Kompositum: «PU-Leder»', bereinige('pu-leder'), 'PU-Leder');
ist('Elastan und Lycra sind derselbe Stoff', bereinige('Elastan, Lycra'), 'Elastan');
ist('CJ: Spandex/Lycra', materialAusCj({ description: 'Fabric: Spandex/Lycra' }).wert, 'Elastan');
ist('Oberbegriff «Stoff» sagt nichts', bereinige('Stoff'), null);
ist('Oberbegriff «Textil»', bereinige('Textil'), null);
ist('«Natürliche Perlen» klingt nach Naturperlen', bereinige('Natürliche Perlen'), null);
ist('«Natürlicher Originalstein» ist keine Stoffangabe', bereinige('Natürlicher Originalstein'), null);
ist('«PU-Leichtmetall» ist Unsinn', bereinige('PU-Leichtmetall'), null);
ist('«PU-Leder» bleibt', bereinige('PU-Leder'), 'PU-Leder');
ist('Teilangabe «Hauptsächlich Polyester»', materialAusText(li('Hauptsächlich Polyester')), { ungeklaert: 'kein Stoffname: Teilangabe: Hauptsächlich Polyester' });
ist('Teilangabe «Polyester (Hauptstoff)»', materialAusText(li('Polyester (Hauptstoff)')).ungeklaert?.startsWith('kein Stoffname: Teilangabe'), true);
ist('Teilangabe «Nylon, Futter: Elasthan»', materialAusText(li('Nylon, Futter: Elasthan')).ungeklaert?.startsWith('kein Stoffname: Teilangabe'), true);
ist('Zusammensetzung in Klammern «Denim (Polyester-Zusammensetzung)»', materialAusText(li('Denim (Polyester-Zusammensetzung)')).wert, undefined);
ist('Mehrere Stoffe mit Mix-Wort', bereinige('Baumwoll-Leinen-Mix'), 'Baumwoll-Leinen-Mix');
ist('Oxford-Stoff bleibt', bereinige('Oxford-Stoff'), 'Oxford-Stoff');
// Titel gegen Wert
ist('Titel Lederarmband, Wert Stein → Konflikt', titelKonflikt('Geflochtenes Lederarmband mit Magnetverschluss', 'Stein'), true);
ist('Titel Steinzeug, Wert Porzellan → Konflikt', titelKonflikt('Teeservice aus Steinzeug', 'Porzellan'), true);
ist('Titel Silikon-Napf, Wert Kunststoff → Konflikt', titelKonflikt('Faltbarer Silikon-Napf', 'Kunststoff'), true);
ist('Titel Edelstahlarmband, Wert Titanstahl → Konflikt', titelKonflikt('Edelstahlarmband', 'Titanstahl'), true);
ist('Titel Baumwoll-Leinen-Mix, Wert Rayon → Konflikt', titelKonflikt('Shorts aus Baumwoll-Leinen-Mix', 'Rayon'), true);
ist('Titel und Wert teilen einen Stoff → kein Konflikt', titelKonflikt('Ring aus Edelstahl mit Glasstein', 'Edelstahl'), false);
ist('Titel ohne Stoffwort → kein Konflikt', titelKonflikt('Schöne Tasche', 'Polyester'), false);
ist('Echtleder-Gürtel: Wert Rindsleder → kein Konflikt', titelKonflikt('Ledergürtel für Herren', 'Rindsleder'), false);
// Sperren im Ganzen
ist('Uhr: Echtleder gesperrt', pruefeWert('Echtleder', { titel: 'Herrenuhr-Set «Magnate»', descriptionHtml: '' }) !== null, true);
ist('Sportuhr: Zinklegierung gesperrt', pruefeWert('Zinklegierung', { titel: 'Doppel-Display-Sportuhr', descriptionHtml: '' }) !== null, true);
ist('Massagebürste: Metall gesperrt', pruefeWert('Metall', { titel: 'Ionen-Massagebürste', descriptionHtml: '' }) !== null, true);
ist('Lockenstab: Keramik gesperrt', pruefeWert('Keramik', { titel: 'Keramik-Lockenstab', descriptionHtml: '' }) !== null, true);
ist('Titel/Wert-Konflikt sperrt über pruefeWert', pruefeWert('Stein', { titel: 'Geflochtenes Lederarmband', descriptionHtml: '' }) !== null, true);
ist('Titel/Wert passend: frei', pruefeWert('Leder', { titel: 'Lederarmband', descriptionHtml: '' }), null);
ist('Titelkonflikt gilt bei reiner Übersetzung nicht', pruefeWert('Silber', { titel: 'Holzring', descriptionHtml: '' }, { uebersetzung: true }), null);
ist('Ladestation: Kunststoff bleibt erlaubt', pruefeWert('Kunststoff', { titel: 'Multifunktionale Ladestation', descriptionHtml: '' }), null);
ist('Übersetzung ändert nur die Sprache: Gerät/Titel-Regeln gelten nicht', pruefeWert('Metall', { titel: 'Ionen-Massagebürste', descriptionHtml: '' }, { uebersetzung: true }), null);

// ── zweite Stichprobe (B1/B2, 136 Einträge)
ist('ABS allein wird erklärt', bereinige('Robustes ABS'), 'ABS-Kunststoff');
ist('ABS im Kompositum bleibt', bereinige('ABS-Kunststoff'), 'ABS-Kunststoff');
ist('ABS mit Metall', bereinige('ABS, Metall'), 'ABS-Kunststoff, Metall');
ist('EVA allein wird erklärt', bereinige('EVA'), 'EVA-Kunststoff');
ist('Titanstahl ist ein Handelsname', bereinige('Titanstahl'), null);
ist('Titanstahl in Liste', bereinige('Titanstahl, Silikon'), null);
ist('95 % Polyesterfaser lässt 5 % offen', bereinige('95% Polyesterfaser'), null);
ist('95 % + 5 % mit zwei Teilen bleibt', bereinige('95% Polyester, 5% Elastan'), 'Polyester, Elastan');
ist('100 % Baumwolle bleibt', bereinige('100% Baumwolle'), 'Baumwolle');
ist('Baumwolle ist nicht Wolle im Titel: Schafwolle ↔ Baumwolle', titelKonflikt('Baby-Schafwolle Mütze', 'Baumwolle'), true);
ist('Wolle ↔ Wolle', titelKonflikt('Strickmütze aus Wolle', 'Wolle'), false);
ist('Baumwoll-Leinen im Titel, Wert nur Leinen', titelKonflikt('Shorts aus Baumwoll-Leinen', 'Leinen'), true);
ist('Leinen und Baumwolle im Titel, Wert nur Leinen', titelKonflikt('Bluse aus Leinen und Baumwolle', 'Leinen'), true);
ist('Baumwoll-Leinen im Titel, Wert nennt beide', titelKonflikt('Shorts aus Baumwoll-Leinen', 'Baumwolle, Leinen'), false);
ist('Seegras im Titel, Wert Rattan, Stroh', titelKonflikt('Seegras-gewebter Korb', 'Rattan, Stroh'), true);
ist('Seegras im Titel, Wert Seegras', titelKonflikt('Seegras-gewebter Korb', 'Seegras'), false);
ist('Titel mit zwei Stoffen (kein Mix-Wort): ein gemeinsamer genügt', titelKonflikt('Ring aus Edelstahl mit Glasstein', 'Edelstahl'), false);

// ── «Leather» von CJ: nur mit Beleg
ist('Leather: PU im Text → PU-Leder', lederWert({ titel: 'Tasche', descriptionHtml: '<p>Aussen aus PU-Leder gefertigt</p>' }), 'PU-Leder');
ist('Leather: Kunstleder im Titel', lederWert({ titel: 'Kunstleder Geldbörse', descriptionHtml: '' }), 'Kunstleder');
ist('Leather: Titel nennt Leder', lederWert({ titel: 'Herren Ledergürtel', descriptionHtml: '' }), null);   // «Ledergürtel» ist kein eigenes Wort «Leder» → kein Beleg
ist('Leather: Text nennt Rindsleder', lederWert({ titel: 'Gürtel', descriptionHtml: '<p>Gürtel aus Rindsleder</p>' }), 'Leder');
ist('Leather: Hinweis «imitation»', lederWert({ titel: 'Tasche', descriptionHtml: '', cj: { description: 'imitation leather bag' } }), 'Kunstleder');
ist('Leather: keine Angabe', lederWert({ titel: 'Tasche', descriptionHtml: '<p>Schöne Tasche</p>' }), null);
ist('Leather: «Leder» aber auch «PU» → unklar, bleibt', lederWert({ titel: 'Tasche', descriptionHtml: '<p>Leder und PU-Futter</p>' }), null);

console.log(`material_test: ${n} Prüfungen${process.exitCode ? ' — FEHLER' : ' ok'}`);
