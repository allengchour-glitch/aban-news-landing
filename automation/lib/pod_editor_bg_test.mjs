// Tests für die Editor-Hintergründe der «Selbst gestalten»-Produkte (kein Netz). Lauf: /opt/node22/bin/node automation/lib/pod_editor_bg_test.mjs
// Die Beschreibungen stammen aus der Sicherung vom 28.10.2026 (dropship/pod-editor-sicherung-2810/*.json), die Übersteuerungstabelle aus pod/editor-hintergruende.json.
import { readFileSync } from 'node:fs';
import { leseEditorAttribute, setzeEditorAttribute, istPrintfulMockup, pruefeUebersteuerung, waehleEditorBilder, skriptAdresse, PRINTFUL_MOCKUP_NAME } from './pod_editor_bg.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wirft = (n, f, teil) => { let m = ''; try { f(); } catch (e) { m = String(e.message); } ist(n, m.includes(teil), true); };
const lies = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SICH = '../../dropship/pod-editor-sicherung-2810/';
const iphone = lies(SICH + 'hardcase-iphone_-hulle-mit-magsafe_-selbst-gestalten.json');
const sticker = lies(SICH + 'kiss-cut-aufkleber-selbst-gestalten.json');
const tshirt = lies(SICH + 'klassisches-unisex-t-shirt-selbst-gestalten.json');
const trikot = lies(SICH + 'wm-trikot-selbst-gestalten.json');
const tabelle = lies('../../pod/editor-hintergruende.json');
const HIPH = 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten';
const BAUSTEIN = /<div class="lspod-designer"[^>]*><\/div>/;
const ohne = (html) => html.replace(BAUSTEIN, '§');

// ── Lesen (echte Beschreibungen)
{
  const a = leseEditorAttribute(iphone.descriptionHtml);
  ist('lesen iPhone: vorne = das Mockup der 16 Pro (der Fehler, der gemeldet wurde)', /iphone-16-pro-front-6a27161fd25c4\.jpg/.test(a.front), true);
  ist('lesen iPhone: Variante 55778337358209, kein Hinten, keine Karte', [a.variant, a.back, a.map], ['55778337358209', null, null]);
  ist('lesen Aufkleber: vorne = sticker-template.png', /sticker-template\.png/.test(leseEditorAttribute(sticker.descriptionHtml).front), true);
  ist('lesen T-Shirt: hat einen Baustein', leseEditorAttribute(tshirt.descriptionHtml) !== null, true);
  ist('lesen ohne Baustein → null', leseEditorAttribute('<p>nur Text</p>'), null);
  ist('lesen: Adresse mit &quot; wird zurückübersetzt', leseEditorAttribute('<div class="lspod-designer" data-img-front="https://x/a&quot;b.jpg"></div>').front, 'https://x/a"b.jpg');
  ist('lesen: kaputte Karte (kein JSON) → map null, kein Absturz', leseEditorAttribute(`<div class="lspod-designer" data-img-front="u" data-img-map='{kaputt'></div>`).map, null);
}

// ── Umschreiben
{
  const d = iphone.descriptionHtml;
  ist('setzen ohne Änderung: Beschreibung bleibt Byte für Byte gleich', setzeEditorAttribute(d, {}), d);
  const a = leseEditorAttribute(d);
  ist('setzen mit denselben Werten: unverändert (idempotent)', setzeEditorAttribute(d, { front: a.front, variant: a.variant }), d);
  const n1 = setzeEditorAttribute(d, { front: 'https://cdn.example/neu.jpg' });
  ist('nur front geändert: der Rest der Beschreibung ist Byte für Byte gleich', ohne(n1) === ohne(d), true);
  ist('nur front geändert: Variante bleibt, front ist neu', [leseEditorAttribute(n1).front, leseEditorAttribute(n1).variant], ['https://cdn.example/neu.jpg', '55778337358209']);
  const karte = { 111: 'https://cdn.example/a.jpg', 222: "https://cdn.example/it's.jpg" };
  const n2 = setzeEditorAttribute(d, { front: 'https://cdn.example/a.jpg', map: karte });
  ist('Karte setzen: wird gelesen wie geschrieben (Apostroph in der Adresse überlebt)', leseEditorAttribute(n2).map, karte);
  ist('Karte setzen: der Apostroph steht als &#39; im Attribut (sonst bräche das Attribut ab)', n2.includes('it&#39;s.jpg'), true);
  ist('Karte setzen: steht nach data-variant, die Reihenfolge der alten Attribute bleibt', n2.indexOf('data-variant') < n2.indexOf('data-img-map') && n2.indexOf('data-img-front') < n2.indexOf('data-variant'), true);
  ist('zweimal angewendet = einmal angewendet', setzeEditorAttribute(n2, { front: 'https://cdn.example/a.jpg', map: karte }), n2);
  const n3 = setzeEditorAttribute(n2, { map: null });
  ist('map: null entfernt das Attribut', [leseEditorAttribute(n3).map, n3.includes('data-img-map')], [null, false]);
  ist('back setzen und wieder entfernen', [leseEditorAttribute(setzeEditorAttribute(d, { back: 'https://x/b.jpg' })).back, leseEditorAttribute(setzeEditorAttribute(setzeEditorAttribute(d, { back: 'https://x/b.jpg' }), { back: null })).back], ['https://x/b.jpg', null]);
  const poster = '<p>a</p><div class="lspod-designer" data-img-front="u" data-variant="7" data-ratio="1.414" data-ref="2400"></div><script src="s.js" defer></script><hr><p>b</p>';
  const np = setzeEditorAttribute(poster, { front: 'v' });
  ist('fremde Attribute (Verhältnis, Auflösung) bleiben, Umgebung bleibt', [leseEditorAttribute(np).andere, ohne(np) === ohne(poster)], [{ 'data-ratio': '1.414', 'data-ref': '2400' }, true]);
  const zwei = '<div class="lspod-designer" data-img-front="a"></div> x <div class="lspod-designer" data-img-front="b"></div>';
  ist('mit zwei Bausteinen wird nur der erste geändert', setzeEditorAttribute(zwei, { front: 'N' }), '<div class="lspod-designer" data-img-front="N"></div> x <div class="lspod-designer" data-img-front="b"></div>');
  ist('Adresse mit Anführungszeichen wird als &quot; geschrieben und gelesen', leseEditorAttribute(setzeEditorAttribute(d, { front: 'https://x/a"b.jpg' })).front, 'https://x/a"b.jpg');
  wirft('ohne Baustein wirft (nie raten, wo ein neuer hingehört)', () => setzeEditorAttribute('<p>nur Text</p>', { front: 'x' }), 'Kein Editor-Baustein');
  wirft('map als Liste wirft', () => setzeEditorAttribute(d, { map: ['a'] }), 'map muss ein Objekt');
}

// ── Erkennung der Printful-Mockups mit eingebranntem «Dein Design»
{
  const schlecht = ['magsafe-tough-case-for-iphone-matte-iphone-16-pro-front-6a27161fd25c4.jpg?v=1780946480', 'magsafe-tough-case-for-iphone-matte-iphone-17-pro-max-front-6a27161fda1ac.jpg',
    'unisex-classic-tee-white-front-6a270582aa8b3.jpg', 'unisex-classic-tee-white-left-6a270582a995b.jpg', 'unisex-classic-tee-white-right-6a270582a8b43.jpg', 'unisex-staple-t-shirt-white-front-6a26fe32875df.jpg'];
  const gut = ['20688_1728028145.jpg', 'luxe-editor-iphone-14.jpg?v=1793171784', 'iphone-16-pro.jpg?v=1793171947', 'blank-tee-white.png?v=1', 'unisex-hoodie-neu.jpg', 'luxe-editor-aufkleber-vorlage.png', 'wm-trikot-rot-front-v2.png', 'front.jpg', 'sticker-template.png', 'cover-front-abc.jpg', 'cover-front-.jpg', 'shirt-front-6a270582aa8b3c4d5e6f.jpg'];
  for (const u of schlecht) ist(`Mockup erkannt: ${u.slice(-40)}`, istPrintfulMockup('https://cdn.shopify.com/s/files/1/0943/6856/3585/files/' + u), true);
  for (const u of gut) ist(`kein Mockup: ${u}`, istPrintfulMockup('https://cdn.shopify.com/s/files/1/0943/6856/3585/files/' + u), false);
  ist('Erkennung: leer und undefined sind kein Mockup', [istPrintfulMockup(''), istPrintfulMockup(undefined)], [false, false]);
  ist('das Muster ist unabhängig vom Gross-/Kleinschreiben der Endung', PRINTFUL_MOCKUP_NAME.test('x-front-6a27161fd25c4.JPG'), true);
}

// ── Prüfung der Übersteuerungstabelle
{
  ist('die echte Tabelle besteht die Prüfung', pruefeUebersteuerung(tabelle), []);
  const gut = { h: { front: 'https://cdn.example/a.jpg', map: { 123: 'https://cdn.example/b.jpg' } } };
  ist('Gegenprobe: eine kleine gute Tabelle besteht', pruefeUebersteuerung(gut), []);
  ist('Mockup als front → Fehler', pruefeUebersteuerung({ h: { front: 'https://cdn.example/x-front-6a27161fd25c4.jpg' } }).length, 1);
  ist('Mockup in der Karte → Fehler mit Schlüssel', pruefeUebersteuerung({ h: { map: { 5: 'https://cdn.example/x-front-6a27161fd25c4.jpg' } } })[0].includes('map[5]'), true);
  ist('http statt https → Fehler', pruefeUebersteuerung({ h: { front: 'http://cdn.example/a.jpg' } }).length, 1);
  ist('Schlüssel ohne Zahl → Fehler', pruefeUebersteuerung({ h: { map: { iphone14: 'https://cdn.example/a.jpg' } } }).length, 1);
  ist('unbekanntes Feld → Fehler', pruefeUebersteuerung({ h: { front: 'https://cdn.example/a.jpg', hinten: 'x' } }).length, 1);
  ist('Eintrag ohne front und map → Fehler', pruefeUebersteuerung({ h: {} }).length, 1);
  ist('Tabelle ist kein Objekt → Fehler', pruefeUebersteuerung([]).length, 1);
}

// ── Die echte Tabelle passt zu den echten Produkten (Sicherung vom 28.10.2026)
{
  const e = tabelle[HIPH];
  const ids = iphone.variants.map((v) => v.id.split('/').pop());
  ist('iPhone: die Karte deckt ALLE 16 Varianten ab, keine fremde', [Object.keys(e.map).length, ids.every((i) => i in e.map), Object.keys(e.map).every((k) => ids.includes(k))], [16, true, true]);
  ist('iPhone: front = Hintergrund der ersten Variante (iPhone 14)', e.front, e.map[ids[0]]);
  ist('iPhone: jedes Modell hat einen eigenen Hintergrund, 16 verschiedene Dateien', new Set(Object.values(e.map).map((u) => u.split('?')[0])).size, 16);
  ist('iPhone: der Editor-Baustein der Sicherung bekommt front und Karte, sonst bleibt alles', (() => {
    const n = setzeEditorAttribute(iphone.descriptionHtml, { front: e.front, map: e.map });
    const l = leseEditorAttribute(n);
    return [l.front === e.front, JSON.stringify(l.map) === JSON.stringify(e.map), l.variant, ohne(n) === ohne(iphone.descriptionHtml)];
  })(), [true, true, '55778337358209', true]);
  ist('Aufkleber: Tabelle nennt nur front, die neue Vorlage (nicht mehr sticker-template.png)', [Object.keys(tabelle['kiss-cut-aufkleber-selbst-gestalten']), /luxe-editor-aufkleber-vorlage\.png/.test(tabelle['kiss-cut-aufkleber-selbst-gestalten'].front)], [['front'], true]);
  ist('Trikot: die Tabelle nennt vorne und hinten, beides die neuen leeren Vorlagen (ohne Hinweistext), sonst nichts', [Object.keys(tabelle['wm-trikot-selbst-gestalten']), /luxe-editor-trikot-vorne\.png/.test(tabelle['wm-trikot-selbst-gestalten'].front), /luxe-editor-trikot-hinten\.png/.test(tabelle['wm-trikot-selbst-gestalten'].back)], [['front', 'back'], true, true]);
  ist('Trikot: die Sicherung hielt die alten Vorlagen mit Hinweistext fest (v2, vorne und hinten)', [/wm-trikot-rot-front-v2\.png/.test(leseEditorAttribute(trikot.descriptionHtml).front), /wm-trikot-rot-back-v2\.png/.test(leseEditorAttribute(trikot.descriptionHtml).back)], [true, true]);
  ist('Sicherung: die vier Beschreibungen haben je genau einen Baustein', [iphone, sticker, tshirt, trikot].map((p) => (p.descriptionHtml.match(/class="lspod-designer"/g) || []).length), [1, 1, 1, 1]);
  ist('Sicherung: die iPhone-Galerie hatte 7 Medien, davon 6 Printful-Mockups mit «Dein Design»', [iphone.media.length, iphone.media.filter((m) => istPrintfulMockup(m.image.url)).length], [7, 6]);
  ist('Sicherung: das T-Shirt hatte 4 Medien, alle Printful-Mockups (hinten, rechts, links, vorne), Text eingebrannt nur auf links, rechts, vorne', [tshirt.media.length, tshirt.media.every((m) => istPrintfulMockup(m.image.url))], [4, true]);
}

// ── Auswahl der Bilder für das Einspritzen (ohne Übersteuerung = bisheriges Verhalten, mit Übersteuerung gewinnt die Tabelle)
{
  const w = waehleEditorBilder;
  ist('ohne Übersteuerung: Produktbild vorne, Hinten-Bild, keine Karte', w({ front: 'F', back: 'B' }), { bg: 'F', back: 'B', map: null });
  ist('ohne Übersteuerung: Vorlage schlägt Produktbild, dann kein Hinten', w({ front: 'F', back: 'B', tpl: 'T' }), { bg: 'T', back: '', map: null });
  ist('ohne Übersteuerung: Poster hat nie ein Hinten', w({ front: 'F', back: 'B', isPoster: true }), { bg: 'F', back: '', map: null });
  ist('ohne Übersteuerung: die Farbkarte bleibt', w({ front: 'F', tpl: 'T', cmap: { 1: 'x' } }), { bg: 'T', back: '', map: { 1: 'x' } });
  ist('ohne alles: leerer Hintergrund (Aufrufer überspringt das Produkt)', w({}), { bg: '', back: '', map: null });
  ist('Übersteuerung front schlägt Vorlage und Produktbild', w({ front: 'F', tpl: 'T', ueber: { front: 'U' } }).bg, 'U');
  ist('Übersteuerung: das Printful-Mockup «hinten» kommt NICHT von selbst mit (nur wenn die Tabelle es nennt)', [w({ front: 'F', back: 'B', ueber: { front: 'U' } }).back, w({ front: 'F', back: 'B', ueber: { front: 'U', back: 'UB' } }).back], ['', 'UB']);
  ist('Übersteuerung map schlägt die Farbkarte, fehlt sie, bleibt die Farbkarte', [w({ cmap: { 1: 'c' }, ueber: { front: 'U', map: { 2: 'm' } } }).map, w({ cmap: { 1: 'c' }, ueber: { front: 'U' } }).map], [{ 2: 'm' }, { 1: 'c' }]);
  ist('Übersteuerung nur mit map (ohne front): front bleibt Produktbild, Karte aus der Tabelle', w({ front: 'F', ueber: { map: { 2: 'm' } } }), { bg: 'F', back: '', map: { 2: 'm' } });
}

// ── Skriptadresse bleibt beim erneuten Ausrollen erhalten
{
  const STD = 'https://abannews.com/pod/designer.js';
  ist('Skriptadresse: die echte iPhone-Beschreibung nennt die CDN-Fassung (nicht die Repo-Fassung)', skriptAdresse(iphone.descriptionHtml, STD).includes('cdn.shopify.com') && skriptAdresse(iphone.descriptionHtml, STD).includes('lspod-designer-v5.js'), true);
  ist('Skriptadresse: Aufkleber und T-Shirt ebenso', [sticker, tshirt].map((p) => skriptAdresse(p.descriptionHtml, STD).includes('lspod-designer-v5.js')), [true, true]);
  ist('Skriptadresse: ohne Baustein oder ohne Skript → Standard', [skriptAdresse('<p>x</p>', STD), skriptAdresse('<div class="lspod-designer" data-img-front="u"></div><p>kein Skript</p>', STD), skriptAdresse(undefined, STD)], [STD, STD, STD]);
  ist('Skriptadresse: Zeilenumbruch zwischen Baustein und Skript, &amp; wird zurückübersetzt', skriptAdresse('<div class="lspod-designer" data-img-front="u"></div>\n<script src="https://x/a.js?v=1&amp;w=2" defer></script>', STD), 'https://x/a.js?v=1&w=2');
  ist('Skriptadresse: ein Skript NACH fremdem Text gehört nicht zum Baustein → Standard', skriptAdresse('<div class="lspod-designer" data-img-front="u"></div><p>text</p><script src="https://x/b.js"></script>', STD), STD);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
