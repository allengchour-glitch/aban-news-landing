// Test für dropship/edel-test-1711/optionen.mjs (reine Funktion, kein Netz). Lauf: node dropship/edel-test-1711/anlegen_test.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optionenErsetzen } from './optionen.mjs';
import { UNBELEGT, unbelegteAngaben, laengenFehler, bilderAnsEnde, kundenTexte } from './texte.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) ok++; else { fehl++; console.log('FEHLER', n, '\n  ist ', x, '\n  soll', y); } };
const wirft = (n, f, teil) => { try { f(); fehl++; console.log('FEHLER', n, '(kein Fehler)'); } catch (e) { if (String(e.message).includes(teil)) ok++; else { fehl++; console.log('FEHLER', n, '\n  Meldung', e.message); } } };
const basis = () => ({
  productOptions: [{ name: 'Ausführung', values: [{ name: '16.5 cm' }, { name: '18 cm' }] }, { name: 'Farbe', values: [{ name: 'Weiss' }, { name: 'Grün' }] }],
  variants: [
    { optionValues: [{ optionName: 'Ausführung', name: '16.5 cm' }, { optionName: 'Farbe', name: 'Weiss' }], price: '1.00' },
    { optionValues: [{ optionName: 'Ausführung', name: '18 cm' }, { optionName: 'Farbe', name: 'Grün' }], price: '2.00' },
  ],
});
const e0 = basis(), kopieVorher = JSON.stringify(e0);
const e1 = optionenErsetzen(e0, { Ausführung: { name: 'Länge', werte: { '16.5 cm': '16,5 cm' } }, Farbe: { werte: { Grün: 'Olivgrün' } } });
ist('Optionsname ersetzt', e1.productOptions.map(o => o.name), ['Länge', 'Farbe']);
ist('Werte ersetzt', e1.productOptions.map(o => o.values.map(v => v.name)), [['16,5 cm', '18 cm'], ['Weiss', 'Olivgrün']]);
ist('Varianten folgen (Name und Wert)', e1.variants.map(v => v.optionValues), [[{ optionName: 'Länge', name: '16,5 cm' }, { optionName: 'Farbe', name: 'Weiss' }], [{ optionName: 'Länge', name: '18 cm' }, { optionName: 'Farbe', name: 'Olivgrün' }]]);
ist('Preise bleiben', e1.variants.map(v => v.price), ['1.00', '2.00']);
ist('Eingabe wird nicht verändert', JSON.stringify(e0), kopieVorher);
ist('ohne Regeln: gleiche Kopie', optionenErsetzen(basis(), undefined), basis());
ist('leere Regel für einen Namen ändert nichts', optionenErsetzen(basis(), { Farbe: {} }), basis());
wirft('Option gibt es nicht', () => optionenErsetzen(basis(), { Länge: { name: 'x' } }), 'gibt es im Plan nicht');
wirft('Wert gibt es nicht', () => optionenErsetzen(basis(), { Farbe: { werte: { Rot: 'Blau' } } }), 'gibt es in');
wirft('Werte nicht mehr eindeutig', () => optionenErsetzen(basis(), { Farbe: { werte: { Grün: 'Weiss' } } }), 'nicht mehr eindeutig');
wirft('neuer Name schon vergeben', () => optionenErsetzen(basis(), { Ausführung: { name: 'Farbe' } }), 'gibt es schon');

// ── texte.mjs: Textwächter gegen unbelegte Angaben
const HIER = dirname(fileURLToPath(import.meta.url));
const produkte = JSON.parse(readFileSync(join(HIER, 'produkte.json'), 'utf8'));
ist('produkte.json: sechs Einträge', produkte.map(p => p.id), ['tennis', 'collier', 'handtasche', 'bambus', 'cardigan', 'pullover']);
for (const p of produkte) {
  ist(`${p.id}: keine unbelegte Angabe`, unbelegteAngaben(p), []);
  ist(`${p.id}: Längen in Ordnung`, laengenFehler(p), []);
  ist(`${p.id}: Tag edel-test-1711 und muster-offen`, ['edel-test-1711', 'muster-offen'].every(t => p.tags.includes(t)), true);
  ist(`${p.id}: Preis-/Versandversprechen fehlen (keine Lieferzeit, kein Gratisversand im Text)`, /werktag|gratis|kostenlos|\d+ ?tage/i.test(kundenTexte(p).map(x => x[1]).join(' ')), false);
}
ist('Handles: eindeutig, a-z0-9 und Bindestrich, mit den letzten sechs Ziffern der CJ-pid', produkte.every(p => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.handle) && p.handle.endsWith(p.pid.slice(-6))) && new Set(produkte.map(p => p.handle)).size === produkte.length, true);
const mh = JSON.parse(JSON.stringify(produkte[0])); mh.handle = 'halskette-rubin-278657';
ist('Wächter: Handle wird geprüft', unbelegteAngaben(mh).map(x => x.feld), ['handle']);
ist('beide Silberstücke tragen bazg-offen', produkte.filter(p => p.tags.includes('bazg-offen')).map(p => p.id), ['tennis', 'collier']);
// Jeder Wächter-Eintrag trifft sein Beispiel UND schlägt in einem sonst sauberen Eintrag an (Mutationsprobe des Wächters)
const BEISPIELE = ['Strickjacke aus Kaschmir', 'Handtasche aus Rindsleder', 'Moissanit', 'Diamant', 'Rubin', 'im Labor gezüchtet', 'Henkel in Bambus-Optik', 'in Geschenkbox', 'Zertifikat (GRA)',
  'platiniert', 'Reinheit VVS1', 'rund 0,3 ct', '100 % Wolle', 'asiatische Grössen', 'aufwendige Stickerei', 'Obermaterial', 'Klassisches Armband', 'Feinstrick', 'Drehverschluss', 'Edel-Schmuck'];
ist('Beispiele decken jeden Wächter-Eintrag', BEISPIELE.length, UNBELEGT.length);
UNBELEGT.forEach(([re, grund], i) => {
  ist(`Wächter ${i}: Muster trifft sein Beispiel (${grund.slice(0, 30)})`, re.test(BEISPIELE[i]), true);
  const mut = JSON.parse(JSON.stringify(produkte[0]));
  mut.html += `<p>${BEISPIELE[i]}</p>`;
  ist(`Wächter ${i}: schlägt im html an`, unbelegteAngaben(mut).some(x => x.feld === 'html' && x.grund === grund), true);
  const mt = JSON.parse(JSON.stringify(produkte[0])); mt.tags.push(BEISPIELE[i]);
  ist(`Wächter ${i}: schlägt im Tag an`, unbelegteAngaben(mt).some(x => x.feld === 'tag' && x.grund === grund), true);
  const mo = JSON.parse(JSON.stringify(produkte[0])); mo.uebersetzung = { ...mo.uebersetzung, X: BEISPIELE[i] };
  ist(`Wächter ${i}: schlägt in der Übersetzung an`, unbelegteAngaben(mo).some(x => x.feld.startsWith('uebersetzung') && x.grund === grund), true);
});
const ms = JSON.parse(JSON.stringify(produkte[0])); ms.seo.description = 'Aus Kaschmir.';
ist('Wächter: SEO-Beschreibung wird geprüft', unbelegteAngaben(ms).map(x => x.feld), ['seo.description']);
const mn = JSON.parse(JSON.stringify(produkte[0])); mn.optionen = { Ausführung: { name: 'Stein', werte: { a: 'Rubin' } } };
ist('Wächter: neue Optionswerte werden geprüft', unbelegteAngaben(mn).map(x => x.feld), ['optionen Ausführung Wert']);
const mt1 = JSON.parse(JSON.stringify(produkte[0])); mt1.titel = 'Armband aus Kaschmir';
ist('Wächter: Titel wird geprüft', unbelegteAngaben(mt1).map(x => x.feld), ['titel']);
const mt2 = JSON.parse(JSON.stringify(produkte[0])); mt2.seo.title = 'Armband aus Kaschmir';
ist('Wächter: SEO-Titel wird geprüft', unbelegteAngaben(mt2).map(x => x.feld), ['seo.title']);
const mn2 = JSON.parse(JSON.stringify(produkte[0])); mn2.optionen = { Ausführung: { name: 'Rubin' } };
ist('Wächter: neuer Optionsname wird geprüft', unbelegteAngaben(mn2).map(x => x.feld), ['optionen Ausführung Name']);
const mg = JSON.parse(JSON.stringify(produkte[0])); mg.html += '<p>Mit GRA Prüfung</p>';
ist('Wächter: «GRA» allein genügt (ohne das Wort Zertifikat)', unbelegteAngaben(mg).map(x => x.treffer), ['GRA']);
ist('Wächter: «Grad» und «Grösse» sind kein «GRA»', unbelegteAngaben({ id: 'x', titel: 'Grad und Grösse und Gramm', tags: [] }), []);
const ml = JSON.parse(JSON.stringify(produkte[0])); ml.titel = 'x'.repeat(71); ml.seo.title = 'x'.repeat(61); ml.seo.description = 'x'.repeat(161);
ist('Längen: drei Verstösse', laengenFehler(ml).length, 3);
const mk = JSON.parse(JSON.stringify(produkte[0])); mk.html = '<p>Zu kurz für ein Produkt.</p>';
ist('Länge: zu kurze Beschreibung wird gemeldet', laengenFehler(mk).length, 1);
const mk2 = JSON.parse(JSON.stringify(produkte[0])); mk2.html = '<p>' + 'a'.repeat(149) + '</p>';
ist('Länge: 149 reine Textzeichen sind zu kurz', laengenFehler(mk2).length, 1);
const mk3 = JSON.parse(JSON.stringify(produkte[0])); mk3.html = '<p>' + 'a'.repeat(150) + '</p>';
ist('Länge: 150 reine Textzeichen genügen', laengenFehler(mk3), []);
const mk4 = JSON.parse(JSON.stringify(produkte[0])); mk4.html = '<ul><li>' + 'a'.repeat(100) + '</li></ul><p>' + '<b></b>'.repeat(80) + '</p>';
ist('Länge: Markup zählt nicht mit', laengenFehler(mk4).length, 1);
ist('Das Arbeits-Tag edel-test-1711 allein löst nichts aus', unbelegteAngaben({ id: 'x', titel: 'Armband', tags: ['edel-test-1711'] }), []);

// ── bilderAnsEnde
const gal = ['u0', 'u1', 'u2', 'u3'];
const fe = () => ({ files: gal.map(u => ({ originalSource: u, contentType: 'IMAGE', alt: 'a' })), variants: [{ file: { originalSource: 'u0' } }, { file: { originalSource: 'u2' } }] });
const f0 = fe(), f0s = JSON.stringify(f0);
const f1 = bilderAnsEnde(f0, gal, [0]);
ist('Bild 0 ans Ende', f1.files.map(f => f.originalSource), ['u1', 'u2', 'u3', 'u0']);
ist('Variantenbilder bleiben gleich', f1.variants, f0.variants);
ist('Eingabe unverändert', JSON.stringify(f0), f0s);
ist('zwei Bilder ans Ende, Reihenfolge der übrigen bleibt', bilderAnsEnde(fe(), gal, [0, 2]).files.map(f => f.originalSource), ['u1', 'u3', 'u0', 'u2']);
ist('ohne Indizes: gleiche Kopie', bilderAnsEnde(fe(), gal, undefined), fe());
ist('leere Liste: gleiche Kopie', bilderAnsEnde(fe(), gal, []), fe());
wirft('Index ausserhalb', () => bilderAnsEnde(fe(), gal, [9]), 'gibt es in der Galerie nicht');
wirft('Index negativ', () => bilderAnsEnde(fe(), gal, [-1]), 'gibt es in der Galerie nicht');
wirft('Bild nicht in files', () => bilderAnsEnde({ files: [{ originalSource: 'u1' }, { originalSource: 'u2' }] }, gal, [0]), 'steht nicht in files');
wirft('alle Bilder ans Ende', () => bilderAnsEnde(fe(), gal, [0, 1, 2, 3]), 'kein Hauptbild');

console.log(`\nanlegen_test: ${ok + fehl} Prüfungen, ${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
