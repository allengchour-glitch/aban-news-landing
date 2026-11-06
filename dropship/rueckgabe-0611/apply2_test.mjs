// Prüfungen für apply2.mjs (rein, ohne Netz). Aufruf: node dropship/rueckgabe-0611/apply2_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ersetzeAlle, jsonRoh, jsonGueltig, zielVon, gruppiere } from './apply2.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const gl = (a, b, m) => { assert.equal(a, b, m); n++; };
const alle = JSON.parse(readFileSync(new URL('./daten/welle2.json', import.meta.url), 'utf8'));
gl(alle.length, 30, 'Anzahl Einträge');
ok(alle.every((e) => e.vorher && e.nachher && e.vorher !== e.nachher && e.id), 'jeder Eintrag vollständig');
const ziele = gruppiere(alle);
gl(ziele.length, 15, 'Ziele'); gl(ziele.filter((z) => z.art === 'theme').length, 5); gl(ziele.filter((z) => z.art === 'richtlinie').length, 2); gl(ziele.filter((z) => z.art === 'seite').length, 6);
ok(ziele.filter((z) => z.art === 'richtlinie').every((z) => z.typ === 'REFUND_POLICY' || z.typ === 'TERMS_OF_SERVICE'), 'Richtlinientypen');
ok(alle.filter((e) => e.art === 'theme_liquid').every((e) => !/\n/.test(e.nachher) && !(e.nachher.split("'").length - 1 !== e.vorher.split("'").length - 1)), 'Chat-Texte: gleiche Zahl Hochkommas, keine Umbrüche');
ok(alle.every((e) => !/30 Tage Rückgabe\b(?!\s*\()/.test(e.nachher) || e.art === 'theme_json'), 'neue Texte versprechen nirgends pauschal 30 Tage Rückgabe ausser Theme-Zeilen mit Klammer/Zweig');
// Ersetzen
let r = ersetzeAlle('a X b', [{ nr: 'T', vorher: 'X', nachher: 'Y' }]);
ok(r.geaendert && r.text === 'a Y b' && !r.fehler.length, 'einfach'); 
r = ersetzeAlle(r.text, [{ nr: 'T', vorher: 'X', nachher: 'Y' }]); ok(!r.geaendert && r.erledigt[0] === 'T', 'zweiter Lauf: erledigt');
r = ersetzeAlle('a X X b', [{ nr: 'T', vorher: 'X', nachher: 'Y' }]); ok(r.fehler.length === 1 && /2×/.test(r.fehler[0]) && !r.geaendert, 'doppelt = Fehler');
r = ersetzeAlle('nichts', [{ nr: 'T', vorher: 'X', nachher: 'Y' }]); ok(r.fehler.length === 1 && /0×/.test(r.fehler[0]), 'fehlt = Fehler');
// nachher enthält vorher als Anfang (typisch: Ergänzung): zweiter Lauf darf nicht doppelt anhängen
r = ersetzeAlle('Text A.', [{ nr: 'E', vorher: 'A.', nachher: 'A. Und B.' }]); ok(r.text === 'Text A. Und B.', 'Ergänzung');
r = ersetzeAlle(r.text, [{ nr: 'E', vorher: 'A.', nachher: 'A. Und B.' }]); ok(!r.geaendert && r.erledigt.length === 1 && !r.fehler.length, 'Ergänzung nur einmal');
// JSON-Maskierung
const roh = '/* k */\n' + JSON.stringify({ s: 'sagt "x" <a href="/y">1</a>' }, null, 2);
r = ersetzeAlle(roh, [{ nr: 'J', vorher: 'sagt "x" <a href="/y">1</a>', nachher: 'sagt "x" <a href="/y">2</a>' }], jsonRoh);
ok(r.geaendert && jsonGueltig(r.text) && JSON.parse(r.text.replace(/^\s*\/\*[\s\S]*?\*\//, '')).s.endsWith('2</a>'), 'JSON maskiert, gültig');
ok(!jsonGueltig('/* k */\n{"a":'), 'ungültiges JSON erkannt');
// Zuordnung
gl(zielVon({ art: 'theme_liquid', feld: 'sections/lux-assistent.liquid Zeile 201' }).datei, 'sections/lux-assistent.liquid');
gl(zielVon({ art: 'theme_json', feld: 'templates/cart.json :: /sections/x/settings/y' }).datei, 'templates/cart.json');
console.log('apply2_test.mjs: ' + n + ' Prüfungen bestanden');
