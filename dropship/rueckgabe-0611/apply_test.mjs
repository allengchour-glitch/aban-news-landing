// Prüfungen für apply.mjs (rein, ohne Netz). Aufruf: node dropship/rueckgabe-0611/apply_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planeProdukt, planeTheme, jsonRoh } from './apply.mjs';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const gl = (a, b, m) => { assert.equal(a, b, m); n++; };
const alle = JSON.parse(readFileSync(new URL('./daten/welle1.json', import.meta.url), 'utf8'));
const von = (art) => alle.filter((e) => e.art === art);

// Datenform
gl(alle.length, 71, 'Anzahl Einträge');
gl(von('produkt_seo_description').length, 27); gl(von('produkt_beschreibung_retourenkasten').length, 37);
gl(von('produkt_beschreibung_kasten_ergaenzen').length, 3); gl(von('produkt_beschreibung_30tage_pauschal').length, 2);
ok(alle.every((e) => e.nachher && e.nachher !== e.vorher), 'jeder Eintrag ändert etwas');
ok(von('produkt_seo_description').every((e) => e.nachher.length <= 160 && !/30 Tage Rückgabe/.test(e.nachher)), 'SEO-Texte höchstens 160 Zeichen, ohne 30 Tage Rückgabe');
ok(von('produkt_beschreibung_retourenkasten').every((e) => e.nachher.includes('class="ls-pod-retoure"') && !/Jedes Stück wird eigens/.test(e.nachher)), 'Kasten behält Klasse, alter Satz weg');
ok(alle.every((e) => !/(Rückgabe|Umtausch)[^.<]{0,40}(garantiert|immer möglich)/i.test(e.nachher)), 'kein Rückgabe-Versprechen in neuen Texten');

// Kasten (G3) ersetzen, Marker bleibt
const g3 = von('produkt_beschreibung_retourenkasten')[0];
const html = '<!--lspod-designer--><p>Text</p>\n' + g3.vorher + '\n<p>Ende</p>';
let p = planeProdukt({ status: 'ACTIVE', descriptionHtml: html, seo: { title: 'T', description: null } }, [g3]);
ok(p.geaendert && p.descriptionHtml.includes(g3.nachher) && !p.descriptionHtml.includes(g3.vorher) && p.descriptionHtml.includes('lspod-designer') && p.fehler.length === 0, 'G3 ersetzt');
gl(p.descriptionHtml.startsWith('<!--lspod-designer--><p>Text</p>'), true, 'Rest bleibt'); gl(p.descriptionHtml.endsWith('<p>Ende</p>'), true);
// Wiederholung: schon fertig, keine Änderung
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: p.descriptionHtml, seo: {} }, [g3]);
ok(!p.geaendert && p.fehler.length === 0, 'zweiter Lauf ändert nichts');
// vorher fehlt / kommt doppelt vor → Fehler, nichts geändert
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: '<p>anderer Text</p>', seo: {} }, [g3]);
ok(!p.geaendert && p.fehler.length === 1 && /0×/.test(p.fehler[0]), 'fehlendes vorher meldet');
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: g3.vorher + g3.vorher, seo: {} }, [g3]);
ok(!p.geaendert || p.fehler.length === 1, 'doppeltes vorher meldet'); ok(/2×/.test(p.fehler[0]));

// SEO (G1): Stand muss passen
const g1 = von('produkt_seo_description')[0];
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: 'x', seo: { title: 'Titel', description: g1.vorher } }, [g1]);
ok(p.seoDescription === g1.nachher && p.geaendert, 'G1 setzt SEO');
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: 'x', seo: { title: 'Titel', description: 'ganz was anderes' } }, [g1]);
ok(p.seoDescription == null && p.fehler.length === 1, 'G1 fasst fremd geänderte SEO nicht an');
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: 'x', seo: { title: 'Titel', description: g1.nachher } }, [g1]);
ok(!p.geaendert && p.fehler.length === 0, 'G1 schon fertig');

// G4 / G5 (Entwurf ohne Kasten)
const g4 = von('produkt_beschreibung_30tage_pauschal')[0], g5 = von('produkt_beschreibung_kasten_ergaenzen')[0];
p = planeProdukt({ status: 'DRAFT', descriptionHtml: '<p>Hallo</p><p>' + g4.vorher + '</p>', seo: {} }, [g4, g5]);
ok(p.geaendert && p.descriptionHtml.includes(g4.nachher) && p.descriptionHtml.endsWith(g5.nachher) && !p.descriptionHtml.includes('30 Tage Rückgabe'), 'G4+G5');
p = planeProdukt({ status: 'DRAFT', descriptionHtml: '<p>Hallo</p>' + g5.nachher, seo: {} }, [g5]);
ok(p.fehler.length === 1 && !p.geaendert, 'G5 hängt keinen zweiten Kasten an');

// Marker darf nicht verloren gehen
const markerWeg = { ...g3, nachher: '<div class="ls-pod-retoure">ohne Marker</div>', vorher: '<div class="ls-pod-retoure">lspod-designer</div>' };
p = planeProdukt({ status: 'ACTIVE', descriptionHtml: 'a ' + markerWeg.vorher, seo: {} }, [markerWeg]);
ok(p.fehler.some((f) => /Marker/.test(f)), 'Marker-Schutz');

// Theme: roh ersetzen, JSON bleibt gültig (mit Kommentarkopf)
const g7 = alle.find((e) => e.nr === 'G7'), g8 = alle.find((e) => e.nr === 'G8');
const datei = '/* kopf */\n' + JSON.stringify({ a: { custom_liquid: 'X' + g7.vorher + 'Y', b: 'Z' + g8.vorher + '{% else %}↩️ <strong>30 Tage</strong> Rückgabe' } }, null, 2);
let t = planeTheme(datei, [g7, g8]);
ok(t.geaendert && t.fehler.length === 0 && t.text.includes(jsonRoh(g7.nachher)) && t.text.includes(jsonRoh(g8.nachher)), 'Theme ersetzt G7+G8');
ok(t.text.includes('↩️ <strong>30 Tage</strong> Rückgabe'), 'else-Zweig bleibt');
ok(t.text.startsWith('/* kopf */\n'), 'Kommentarkopf und Format bleiben');
t = planeTheme(t.text, [g7, g8]);
ok(!t.geaendert && t.erledigt.length === 2 && t.fehler.length === 0, 'Theme zweiter Lauf ändert nichts');
t = planeTheme('/* k */\n{"a":"nichts"}', [g7]);
ok(t.text === null && t.fehler.length === 1, 'Theme: fehlendes vorher meldet');
t = planeTheme(datei + datei, [g7]);
ok(t.text === null && /2×/.test(t.fehler.join()), 'Theme: doppeltes vorher meldet');
// Anführungszeichen im neuen Text werden roh maskiert: das Ergebnis bleibt gültiges JSON
t = planeTheme('/* k */\n{"a":"X"}', [{ ...g7, nr: 'T1', vorher: 'X', nachher: 'sagt "hallo" \\ und <a href="/x">' }]);
ok(t.text !== null && JSON.parse(t.text.replace(/^\s*\/\*[\s\S]*?\*\//, '')).a === 'sagt "hallo" \\ und <a href="/x">', 'Theme: Anführungszeichen maskiert');
// ungültige Ausgangsdatei wird nie geschrieben
t = planeTheme('/* k */\n{"a":"X"', [{ ...g7, nr: 'T2', vorher: 'X', nachher: 'Y' }]);
ok(t.text === null && /kein gültiges JSON/.test(t.fehler.join()), 'Theme: ungültiges JSON wird verworfen');

console.log('apply_test.mjs: ' + n + ' Prüfungen bestanden');
