// Selbsttest fuer banner.mjs:  /opt/node22/bin/node banner_test.mjs     (Teil 1 rein, Teil 2 mit Chromium; SCHNELL=1 ueberspringt Teil 2)
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bannerHtml, anzahlText, titelGroesse, eindeutig, quelle, plaetze, rezept, sichtbarkeit, fotoHinweis, W, H, SICHER, ZUSCHNITTE, MIN_FOTOS, MAX_FOTOS } from './banner.mjs';
import { AUSWAHL, MANIFEST, beispielBilder } from './beispiele.mjs';
import { FAELLE } from './render_faelle.mjs';

const require = createRequire(import.meta.url);
const HIER = dirname(fileURLToPath(import.meta.url));
let ok = 0;
const t = async (name, fn) => { await fn(); ok++; console.log('ok', name); };
const fotos = n => Array.from({ length: n }, (_, i) => `file:///x/${i}.jpg`);
const ohneSkripte = h => h.replace(/<head>[\s\S]*?<\/head>|<script>[\s\S]*?<\/script>/g, "");
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

// ------------------------------------------------------------------ Teil 1: reine Funktionen
await t('anzahlText: zwei gueltige Stellen, nie aufrunden, Schweizer Apostroph', () => {
  const soll = { 252: '250+ Artikel', 458: '450+ Artikel', 1266: '1’200+ Artikel', 2653: '2’600+ Artikel', 3966: '3’900+ Artikel', 12881: '12’000+ Artikel', 20: '20+ Artikel', 99: '99+ Artikel', 100: '100+ Artikel', 999: '990+ Artikel' };
  for (const [n, s] of Object.entries(soll)) assert.equal(anzahlText(n), s, `n=${n}`);
  assert.equal(anzahlText(19), ''); assert.equal(anzahlText('x'), ''); assert.equal(anzahlText(NaN), ''); assert.equal(anzahlText(-5), '');
  for (let n = 20; n < 200000; n += 37) { const v = Number(anzahlText(n).replace(/[’+]|\sArtikel/g, '')); assert.ok(v <= n && v > n * 0.9, `${n} -> ${v}`); assert.match(String(v), /^\d{2}0*$|^\d{2}$|^\d$/ , `zwei Stellen ${v}`); }
});
await t('quelle(): Anhaenge #fokus=X,Y und #frei, sonst unveraendert', () => {
  assert.deepEqual(quelle('file:///a.jpg'), { src: 'file:///a.jpg', fokus: null, frei: false });
  assert.deepEqual(quelle('file:///a.jpg#fokus=65,30'), { src: 'file:///a.jpg', fokus: [65, 30], frei: false });
  assert.deepEqual(quelle('https://x.test/a.jpg?w=1000#frei'), { src: 'https://x.test/a.jpg?w=1000', fokus: null, frei: true });
  assert.deepEqual(quelle('a.jpg#fokus=500,20'), { src: 'a.jpg', fokus: [100, 20], frei: false });
  assert.equal(quelle(undefined).src, '');
});
await t('eindeutig(): Dubletten (auch mit Anhang), Leeres, Obergrenze 14', () => {
  assert.equal(eindeutig(fotos(20)).length, MAX_FOTOS);
  assert.deepEqual(eindeutig(['a.jpg', 'a.jpg#fokus=10,20', 'b.jpg', '', null, undefined]).map(x => x.src), ['a.jpg', 'b.jpg']);
});
await t('Fotozahl: unter 6 Fehler, 6-7 mit Hinweis, ab 8 ohne, streng verlangt 8, mehr als 14 werden gekappt', () => {
  assert.throws(() => bannerHtml('Test', fotos(5), ''), /6 bis 14/);
  assert.throws(() => bannerHtml('Test', ['a.jpg', 'a.jpg', 'a.jpg', 'a.jpg', 'a.jpg', 'a.jpg'], ''), /6 bis 14/);
  assert.throws(() => bannerHtml('Test', [], ''), /6 bis 14/);
  assert.throws(() => bannerHtml('Test', fotos(7), '', { streng: true }), /mindestens 8/);
  assert.ok(bannerHtml('Test', fotos(8), '', { streng: true }));
  assert.match(bannerHtml('Test', fotos(6), ''), /name="banner-hinweis" content="nur 6 Fotos, empfohlen ab 8/);
  assert.ok(!bannerHtml('Test', fotos(8), '').includes('banner-hinweis'));
  assert.equal(fotoHinweis(12), ''); assert.match(fotoHinweis(7), /nur 7 Fotos/);
  assert.match(bannerHtml('Test', fotos(30), ''), /data-fotos="14"/);
});
await t('Layout n=6..14: alles im Rahmen, Winkel hoechstens 1.6 Grad, keine NaN, Wichtigkeit 0.25..1', () => {
  for (let n = 6; n <= 14; n++) for (const titel of ['Hunde', 'Damen-Mode', 'Tassen & Becher']) {
    const sl = plaetze(n, titel);
    assert.equal(sl.length, n, `n=${n} Kartenzahl`);
    for (const p of sl) {
      for (const v of [p.x, p.y, p.w, p.h, p.grad, p.wert]) assert.ok(Number.isFinite(v), `n=${n} NaN`);
      assert.ok(p.x >= 13.9 && p.y >= 19.9 && p.x + p.w <= W - 13.9 && p.y + p.h <= H - 9.9, `n=${n} ${titel}: Karte ausserhalb ${JSON.stringify(p)}`);
      assert.ok(p.w > 200 && p.h > 200, `n=${n} Karte zu klein`);
      assert.ok(Math.abs(p.grad) >= 0.5 && Math.abs(p.grad) <= 1.6, `n=${n} Winkel ${p.grad}`);
      assert.ok(p.wert >= 0.25 && p.wert <= 1.0001);
    }
  }
});
await t('Rezept: Mittelspalte beginnt hoechstens bei 340 (keine Kartenstreifen im 4:3-Zuschnitt), Karten fast quadratisch', () => {
  for (let n = 6; n <= 14; n++) {
    const r = rezept(n);
    assert.equal(r.l + r.r + r.t + r.b, n);
    assert.ok(r.s <= 340, `n=${n} s=${r.s}`);
    // Mittelkarten: Seitenverhaeltnis zwischen 1:1 und 2.3:1 (bei 6-7 Fotos breiter, deshalb die Empfehlung ab 8)
    const mitte = (W - 2 * r.s) / Math.max(r.t, r.b);
    assert.ok(mitte / 315 <= (n >= MIN_FOTOS ? 1.62 : 2.3), `n=${n} Mittelkarte ${Math.round(mitte)} x 315`);
  }
});
await t('Zuschnitte: im 4:3- und im Quadrat-Ausschnitt kein Kartenstreifen (4-30 % sichtbar) ausser einer je Zuschnitt, und genug Produkte', () => {
  const bericht = [];
  for (let n = 6; n <= 14; n++) {
    const sl = plaetze(n, 'Test'), zeile = { n };
    for (const [name, z] of Object.entries(ZUSCHNITTE)) {
      const v = sl.map(p => sichtbarkeit(p.x, p.w, z));
      const streifen = v.filter(x => x > 0.04 && x < 0.30).length, gut = v.filter(x => x >= 0.5).length;
      zeile[name] = `${gut} gut / ${streifen} Streifen`;
      assert.ok(streifen <= 1, `n=${n} ${name}: ${streifen} Streifen`);
      assert.ok(gut >= Math.min(4, n - 2), `n=${n} ${name}: nur ${gut} Karten gut sichtbar`);
      if (n >= MIN_FOTOS && name === '4x3') assert.ok(gut >= 6, `n=${n} 4:3: nur ${gut} Karten gut sichtbar`);
    }
    bericht.push(zeile);
  }
  console.log('   ' + bericht.map(z => `n=${z.n}: 4:3 ${z['4x3']}, 1:1 ${z['1x1']}`).join('\n   '));
});
await t('Pinterest-Rhythmus: obere Reihe gestaffelt (Oberkante 20-80), untere Reihe Unterkante 955-992, Mitte-Karten nie gleich hoch', () => {
  for (let n = 8; n <= 14; n++) for (const titel of ['Schmuck', 'Kissen', 'Tassen & Becher']) {
    const mitte = plaetze(n, titel).filter(p => p.art === 'mitte');
    const oben = mitte.filter(p => p.y + p.h < 420), unten = mitte.filter(p => p.y > 560);
    assert.equal(oben.length + unten.length, mitte.length);
    for (const p of oben) assert.ok(p.y >= 19.9 && p.y <= 84, `n=${n} ${titel} Oberkante ${p.y}`);
    for (const p of unten) assert.ok(p.y + p.h >= 955 && p.y + p.h <= 992, `n=${n} ${titel} Unterkante ${p.y + p.h}`);
    for (const reihe of [oben, unten]) if (reihe.length >= 2) {
      const hs = reihe.map(p => Math.round(p.h)); assert.ok(Math.max(...hs) - Math.min(...hs) >= 18, `n=${n} ${titel}: Karten einer Reihe gleich hoch ${hs}`);
    }
  }
});
await t('HTML: Masse der Verbesserungen (860/840 px, Fusszeile 44/30, Nadel 20, Washi 84x24 .62, Naht 1.5, Rahmenlinie .24)', () => {
  const h = bannerHtml('Damen-Mode', fotos(12), anzahlText(12881));
  for (const s of ['width:860px', 'width:840px', 'font-size:calc(44px*var(--u))', 'font-size:calc(30px*var(--u))', 'letter-spacing:.12em', '.pin{position:absolute;top:-8px;width:20px;height:20px', 'width:84px;height:24px', 'rgba(214,168,86,.62)', '1.5px dashed rgba(230,178,90,.45)', 'rgba(60,40,20,.24)', 'width:10px;height:10px;transform:rotate(45deg)', '#2c2118 0%,#1e160f 100%'])
    assert.ok(h.includes(s), 'fehlt: ' + s);
  for (const s of ['width:900px', '#27323f', '104px;height:30px', 'rgba(60,40,20,.16)', 'letter-spacing:.17em']) assert.ok(!h.includes(s), 'sollte weg sein: ' + s);
  assert.ok(bannerHtml('X', fotos(8), '', { band: 'marine' }).includes('#27323f 0%,#1c2530 100%'));
  // Nadeln nur an jeder zweiten Karte, Washi nur an jeder sechsten (innerhalb der Karten)
  for (const n of [8, 11, 12, 14]) {
    const karten = bannerHtml('Test', fotos(n), '').split('<div class="k ').slice(1).map(s => s.split('<div class="papier"')[0].split('<div class="band"')[0]);
    assert.equal(karten.length, n);
    assert.equal(karten.filter(k => k.includes('class="pin"')).length, Math.ceil(n / 2), `n=${n} Nadeln`);
    assert.equal(karten.filter(k => k.includes('class="tape"')).length, Math.floor(n / 6), `n=${n} Washi`);
  }
});
await t('Kontrast: Creme und Gold auf dem Band mindestens 7:1 (Marine zum Vergleich ebenfalls)', () => {
  for (const g of ['#2c2118', '#1e160f']) { assert.ok(kontrast('#f8f0df', g) >= 13, `Creme ${g}`); assert.ok(kontrast('#e6b25a', g) >= 7, `Gold ${g}`); }
  assert.ok(kontrast('#f8f0df', '#27323f') >= 10);
});
await t('Text im Bild: nur Titel, Marke, Zahl; kein Preis, kein Rabatt; Titel wird maskiert; </script> im Titel sprengt nichts', () => {
  const h = bannerHtml('A<b>&"Z</script><i>', fotos(8), '250+ Artikel');
  assert.ok(h.includes('A&lt;b&gt;&amp;&quot;Z&lt;/script&gt;&lt;i&gt;') && !h.includes('A<b>'));
  assert.equal(h.split('</script>').length, 2, 'genau ein Skript-Ende');
  const text = ohneSkripte(bannerHtml('Hunde', fotos(8), '1’200+ Artikel')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.match(text, /^Hunde LuxeStyle\.ch Schweizer Shop 1’200\+ Artikel$/);
  assert.ok(!/CHF|Rabatt|%|sparen|gratis|Gutschein|\d+\s*Fr\./i.test(text));
  assert.ok(!bannerHtml('Test', fotos(8), '').includes('Artikel'));
});
await t('titelGroesse ist monoton fallend und unveraendert (176/160/128/104/92)', () => {
  assert.deepEqual(['x'.repeat(5), 'x'.repeat(9), 'x'.repeat(13), 'x'.repeat(20), 'x'.repeat(30)].map(titelGroesse), [176, 160, 128, 104, 92]);
  let v = 1e9; for (const n of [5, 8, 12, 20, 32]) { const g = titelGroesse('x'.repeat(n)); assert.ok(g <= v); v = g; }
});
await t('Deterministisch: gleiche Eingabe gibt gleiches HTML, anderer Titel andere Streuung', () => {
  assert.equal(bannerHtml('Hunde', fotos(9), ''), bannerHtml('Hunde', fotos(9), ''));
  assert.notEqual(bannerHtml('Hunde', fotos(9), ''), bannerHtml('Katzen', fotos(9), ''));
});

if (process.env.SCHNELL === '1') { console.log(`${ok} Tests ok (Teil 2 uebersprungen)`); process.exit(0); }

// ------------------------------------------------------------------ Teil 2: im Browser
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const seite = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
const TMP = `${HIER}/work/testlauf`; mkdirSync(TMP, { recursive: true });
let nr = 0;
async function lade(html, { seiteObj = seite, warte = 15000 } = {}) {
  const f = `${TMP}/t${nr++}.html`; writeFileSync(f, html);
  await seiteObj.goto('file://' + f, { waitUntil: 'load' });
  await seiteObj.waitForFunction(() => window.__fertig === true, null, { timeout: warte });
  return seiteObj.evaluate(() => ({ b: window.__bericht, imgs: [...document.images].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, pos: i.style.objectPosition, tr: i.style.transform })), w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const faelle = [
  ...Object.entries(manifest).map(([h, k]) => [h, k.titel, beispielBilder(h, k), anzahlText(k.anzahl)]),
  ...Object.entries(FAELLE).map(([n, f]) => [n, f.titel, f.bilder, anzahlText(f.anzahl)]),
];
const erg = {};
await t('Browser: alle 11 Faelle laden fehlerfrei (alle Fotos da, kein Skriptfehler, 2000 x 1000 ohne Scrollbereich)', async () => {
  for (const [name, titel, bilder, az] of faelle) {
    const r = await lade(bannerHtml(titel, bilder, az)); erg[name] = r;
    assert.equal(r.imgs.length, eindeutig(bilder).length, `${name}: Bildzahl`);
    assert.ok(r.imgs.every(i => i.ok), `${name}: Foto fehlt`);
    assert.ok(!r.b.fehler, `${name}: ${r.b.fehler}`);
    assert.equal(r.b.fehlend, 0, `${name}: fehlend`);
    assert.equal(new Set(r.imgs.map(i => i.src)).size, r.imgs.length, `${name}: Foto doppelt`);
    assert.deepEqual([...r.b.zuordnung].sort((a, b) => a - b), r.imgs.map((_, i) => i), `${name}: Zuordnung ist keine Permutation`);
    assert.ok(r.w <= 2000 && r.h <= 1000, `${name}: ${r.w}x${r.h}`);
  }
});
await t('Browser: Titel liegt in der Sicherheitszone x 570..1430, Fusszeile in 580..1420, keine Schrift unter 84 px', async () => {
  for (const [name] of faelle) {
    const b = erg[name].b;
    assert.ok(b.titelLinks >= SICHER.x0 - 1 && b.titelRechts <= SICHER.x1 + 1, `${name}: Titel ${b.titelLinks}..${b.titelRechts}`);
    assert.ok(b.titelRechts - b.titelLinks <= 860, `${name}: Titelbreite ${b.titelRechts - b.titelLinks}`);
    assert.ok(b.fussLinks >= 579 && b.fussRechts <= 1421, `${name}: Fusszeile ${b.fussLinks}..${b.fussRechts}`);
    assert.ok(b.titelPx >= (b.titelZeilen > 1 ? 80 : 100), `${name}: Titel nur ${b.titelPx}px`);
    assert.ok(!b.fuss.includes('*'), `${name}: Fusszeile musste unter 30/44 px verkleinert werden (${b.fuss})`);
  }
  // Randabstand im Quadrat (500..1500): mindestens 70 px
  for (const [name] of faelle) assert.ok(erg[name].b.titelLinks - 500 >= 69 && 1500 - erg[name].b.titelRechts >= 69, `${name}: Randabstand im Quadrat`);
});
await t('Browser: langer Titel «Küchenmaschinen & Elektrogeräte» bricht in zwei Zeilen, «&» nie allein', async () => {
  const b = erg['langer-titel'].b;
  assert.equal(b.titelZeilen, 2);
  const zeilen = await seite.evaluate(() => [...document.querySelectorAll('#t span')].map(s => s.textContent));
  const r = await lade(bannerHtml(FAELLE['langer-titel'].titel, FAELLE['langer-titel'].bilder, ''));
  const z2 = await seite.evaluate(() => [...document.querySelectorAll('#t span')].map(s => s.textContent));
  assert.deepEqual(z2, ['Küchenmaschinen', '& Elektrogeräte']);
  assert.ok(zeilen.every(z => z.trim() !== '&'));
  for (const titel of ['A & B', 'Haus & Garten & Hof', 'Küche & Kochen', 'Kinder-Spielzeug & Spiele']) {
    await lade(bannerHtml(titel, fotos(8).map((_, i) => `file:///tmp/banner_samples/schmuck/${String(i + 1).padStart(2, '0')}.jpg`), ''));
    const zs = await seite.evaluate(() => [...document.querySelectorAll('#t span')].map(s => s.textContent));
    assert.ok(zs.every(z => z.trim() !== '&' && z.trim() !== ''), `${titel}: ${JSON.stringify(zs)}`);
  }
});
await t('Browser: Hochformat-Fotos halten den Kopf (50% 8%), #fokus gilt, Freisteller 0.4..1.22 und nie ueber die Karte hinaus', async () => {
  const r = erg['damen-mode'];
  for (const n of ['01', '02', '03']) assert.equal(r.imgs.find(i => i.src.endsWith(`/damen-mode/${n}.jpg`)).pos, '50% 8%', `Hochformat ${n}`);
  assert.equal(r.imgs.find(i => i.src.endsWith('/damen-mode/05.jpg')).pos, '50% 40%');
  const s = erg['schmuck'].imgs.find(i => i.src.endsWith('/schmuck/02.jpg'));   // #fokus=50,100 aus beispiele.mjs
  assert.equal(s.pos, '50% 100%');
  for (const [name] of faelle) for (const f of erg[name].b.freisteller) assert.ok(f.s >= 0.4 && f.s <= 1.22 + 1e-9, `${name}: Faktor ${f.s}`);
  assert.ok(erg['damen-mode'].b.freisteller.length >= 3, 'Damen-Mode: weisse Schuhe muessen erkannt werden');
  assert.ok(erg['damen-mode'].b.freisteller.some(f => f.s > 1.06), 'mindestens ein Freisteller wird vergroessert');
  // Das Produkt bleibt ganz: nach der Behandlung liegt es mit mindestens 3 % Rand in der Karte (gemessen aus dem Produktkasten, nicht aus dem Faktor)
  for (const [name] of faelle) for (const f of erg[name].b.freisteller) if (f.rand !== undefined) assert.ok(f.rand >= 0.03, `${name}: ${f.src} Produkt angeschnitten (Rand ${f.rand})`);
  assert.ok(erg['nur-6-fotos'].b.freisteller.some(f => f.s < 0.8), 'nur-6-fotos: das runde Armband muss in der breiten Karte verkleinert werden');
});
await t('Browser: behandelte Freisteller liegen wirklich ganz in der Karte (Pixelprobe am Kartenrand, ohne Schraeglage gemessen)', async () => {
  const py = `
import sys, json
from PIL import Image
schlecht = []
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); w, h = im.size
    pts = [(x, y) for x in range(4, w - 4) for y in range(4, h - 4) if x < 9 or y < 9 or x >= w - 9 or y >= h - 9]
    dunkel = sum(1 for p in pts if min(im.getpixel(p)) < 215)
    if dunkel / len(pts) > 0.03: schlecht.append((f, round(dunkel / len(pts), 3)))
print(json.dumps(schlecht))
`;
  let geprueft = 0;
  for (const name of ['nur-6-fotos', 'damen-mode', 'schmuck', 'sub-kueche']) {
    const fall = faelle.find(f => f[0] === name);
    await lade(bannerHtml(fall[1], fall[2], fall[3]));
    await seite.addStyleTag({ content: '.k{transform:none !important}.k:not(.pruef){visibility:hidden !important}.pin,.tape,.papier,.band{display:none !important}' });
    const dateien = [];
    const quellen = erg[name].b.freisteller.filter(f => f.rand !== undefined).map(f => f.src);
    for (const [i, src] of quellen.entries()) {
      const h = await seite.evaluateHandle(s => { document.querySelectorAll('.k').forEach(k => k.classList.remove('pruef')); const f = [...document.images].find(im => im.getAttribute('src') === s).parentNode; f.parentNode.classList.add('pruef'); return f; }, src);
      const f = `${TMP}/fr_${name}_${i}.png`; await h.asElement().screenshot({ path: f }); dateien.push(f); geprueft++;
    }
    const schlecht = JSON.parse(execFileSync('/usr/bin/python3', ['-c', py, ...dateien]).toString());
    assert.deepEqual(schlecht, [], `${name}: Produkt am Kartenrand angeschnitten ${JSON.stringify(schlecht)}`);
  }
  assert.ok(geprueft >= 8, `nur ${geprueft} Freisteller geprueft`);
});
await t('Browser: die Zuordnung ordnet nach Produktform (Kupfer-Armband hoch und schmal: keine breite Karte; Waermeplatte breit: keine hohe)', async () => {
  const karte = async (kat, nummer, titel, bilder) => {
    await lade(bannerHtml(titel, bilder, ''));
    return seite.evaluate(n => { const im = [...document.images].find(i => i.getAttribute('src').includes(n)); const k = im.closest('.k'); return (+k.dataset.w) / (+k.dataset.h); }, '/' + kat + '/' + nummer + '.jpg');
  };
  const arm = await karte('schmuck', '13', 'Schmuck', beispielBilder('schmuck', manifest.schmuck));
  assert.ok(arm <= 1.15, `Kupfer-Armband in Karte mit Seitenverhaeltnis ${arm.toFixed(2)}`);
  const platte = await karte('sub-kueche', '13', 'Küche & Kochen', beispielBilder('sub-kueche', manifest['sub-kueche']));
  assert.ok(platte >= 1.2, `Waermeplatte in Karte mit Seitenverhaeltnis ${platte.toFixed(2)}`);
});
await t('Browser: Freisteller-Erkennung faellt ohne CORS stillschweigend zurueck, mit CORS funktioniert sie', async () => {
  const bilder = [3, 1, 2, 4, 10, 14, 9, 5].map(i => String(i).padStart(2, '0'));
  const server = (cors) => new Promise(ok => { const s = createServer((q, a) => { try { const d = readFileSync(`/tmp/banner_samples/damen-mode${q.url.split('?')[0]}`); a.writeHead(200, { 'content-type': 'image/jpeg', ...(cors ? { 'access-control-allow-origin': '*' } : {}) }); a.end(d); } catch { a.writeHead(404); a.end(); } }).listen(0, '127.0.0.1', () => ok(s)); });
  const ohne = await server(false), mit = await server(true);
  try {
    const mk = s => bannerHtml('Damen-Mode', ['08', '12', '13', '11', '03', '01', '10', '05'].map(n => `http://127.0.0.1:${s.address().port}/${n}.jpg`), '');
    const seite2 = await browser.newPage({ viewport: { width: 2000, height: 1000 } });   // ohne --allow-file-access: ein normaler Browser
    const a = await lade(mk(ohne), { seiteObj: seite2 }), b = await lade(mk(mit), { seiteObj: seite2 });
    assert.ok(a.imgs.every(i => i.ok), 'ohne CORS: Fotos muessen trotzdem erscheinen');
    assert.equal(a.b.freisteller.length, 0, 'ohne CORS: nichts skaliert'); assert.equal(a.b.messbar, 0);
    assert.ok(b.imgs.every(i => i.ok)); assert.ok(b.b.freisteller.length >= 3, `mit CORS: ${b.b.freisteller.length} Freisteller`);
    await seite2.close();
  } finally { ohne.close(); mit.close(); }
});
await t('Browser: ein kaputtes Foto bricht nichts ab (Seite wird fertig, Zahl der fehlenden gemeldet)', async () => {
  const bilder = [...beispielBilder('schmuck', manifest.schmuck).slice(0, 7), 'file:///tmp/gibt-es-nicht.jpg'];
  const r = await lade(bannerHtml('Schmuck', bilder, ''));
  assert.equal(r.b.fehlend, 1); assert.ok(!r.b.fehler);
});
await t('Browser: Kontrast gemessen (Pixel im Band neben dem Titel gegen Creme) mindestens 7:1; Zuschnitte haben 2000x1000 / 1333x1000 / 1000x1000', async () => {
  const py = `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
def lum(c):
    f = [(v/255/12.92 if v/255 <= .03928 else ((v/255+.055)/1.055)**2.4) for v in c]
    return .2126*f[0]+.7152*f[1]+.0722*f[2]
px = [lum(im.getpixel((x, y))) for x in range(390, 540, 5) for y in range(400, 600, 5)]   # Band links vom Titel (Titel beginnt ab x 570), kein Foto, kein Text
px.sort(); med = px[len(px)//2]; hell = px[int(len(px)*.97)]
cream = lum((0xf8, 0xf0, 0xdf))
print((cream+.05)/(med+.05), (cream+.05)/(hell+.05), im.size)
`;
  for (const name of ['damen-mode', 'tassen-becher', 'kissen']) {
    const m = manifest[name]; await lade(bannerHtml(m.titel, beispielBilder(name, m), ''));
    const f = `${TMP}/k_${name}.png`; await seite.screenshot({ path: f });
    const [med, hell, size] = execFileSync('/usr/bin/python3', ['-c', py, f]).toString().trim().split(' ').slice(0, 3);
    assert.ok(Number(med) >= 12, `${name}: Median ${med}`); assert.ok(Number(hell) >= 7, `${name}: hellster ${hell}`);
    assert.match(size, /2000,/);
    await seite.screenshot({ path: f, clip: { x: 333, y: 0, width: 1333, height: 1000 } });
    await seite.screenshot({ path: f + '.q.png', clip: { x: 500, y: 0, width: 1000, height: 1000 } });
    assert.match(execFileSync('/usr/bin/python3', ['-c', 'import sys;from PIL import Image;print(Image.open(sys.argv[1]).size, Image.open(sys.argv[2]).size)', f, f + '.q.png']).toString(), /\(1333, 1000\) \(1000, 1000\)/);
  }
});
await t('Auswahl der Beispiele: mindestens 8 Fotos ausser wo ausdruecklich anders vermerkt, keine Doppelten', () => {
  for (const [h, idx] of Object.entries(AUSWAHL)) { assert.equal(new Set(idx).size, idx.length, `${h}: doppelt`); assert.ok(idx.length >= MIN_FOTOS, `${h}: ${idx.length}`); }
});
await browser.close();
rmSync(TMP, { recursive: true, force: true });
console.log(`${ok} Tests ok`);
