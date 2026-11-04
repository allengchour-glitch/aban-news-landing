/** Test für die Startseiten-Pools — reine Funktionen, keine Netzaufrufe.
 *  Lauf: /opt/node22/bin/node automation/lib/startseite_pool_test.mjs
 *  Zwei Richtungen: Ware, die NICHT auf die Startseite darf, bleibt draussen; gesunde Ware fliegt nicht zu Unrecht.
 *  Dazu die Fensterrechnung (muss mit sections/luxe-edit-home.liquid übereinstimmen) und die Pool-Regeln (nie doppelt, nie ohne Sichtung). */
import { gate, gruppe, flach, belegt, punkte, verschraenke, baueAusFreigabe, baueAllePools, fensterStart, slotAus, REIHEN, ROTATION, THEME_STOPS } from './startseite_pool.mjs';
let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };

const roh = (o = {}) => ({ id: `gid://shopify/Product/${o.n || 1}`, handle: o.handle || 'hundepullover-mit-streifen', title: 'Hundepullover mit V-Ausschnitt, Streifen', productType: 'Haustierbedarf',
  tags: ['hype-jetzt', 'dropship'], tracksInventory: false, totalInventory: 0, priceRangeV2: { minVariantPrice: { amount: '24.90' } },
  featuredMedia: { preview: { image: { url: 'https://cdn.example/x.jpg', width: 1000, height: 1000 } } }, j: { value: '{"number_of_reviews":8,"average_rating":"4.9"}' }, ...o });
const g = (o, opt = { monat: 11 }) => gate(flach(roh(o)), opt);

// ── Richtung 1: das darf NICHT auf die Startseite ──────────────────────────
pruef('gesundes Produkt besteht', g({}).ok, JSON.stringify(g({})));
for (const s of THEME_STOPS) pruef(`Theme-Sperre «${s}» → draussen`, !g({ tags: ['hype-jetzt', s] }).ok);
pruef('«nicht-…-bewerben» → draussen', !g({ tags: ['x', 'nicht-bewerben'] }).ok);
pruef('Lizenz-Tag → draussen', !g({ tags: ['x', 'lizenz-nicht-bewerben'] }).ok);
pruef('ausverkauft (getrackt, 0 Bestand) → draussen', g({ tracksInventory: true, totalInventory: 0 }).grund === 'ausverkauft');
pruef('Bestand nicht getrackt (CJ) bleibt drin', g({ tracksInventory: false, totalInventory: 0 }).ok);
pruef('Bild 690 px → draussen', g({ featuredMedia: { preview: { image: { url: 'u', width: 690, height: 900 } } } }).grund === 'Bild unter 700 px');
pruef('kein Bild → draussen', !g({ featuredMedia: null }).ok);
pruef('Preis 9.90 → draussen (ausser Schmuck-Untergrenze)', !g({ priceRangeV2: { minVariantPrice: { amount: '9.90' } } }).ok);
pruef('Preis 9.90 mit Schmuck-Untergrenze → drin', gate(flach(roh({ priceRangeV2: { minVariantPrice: { amount: '9.90' } } })), { monat: 11, minPreis: 9.9 }).ok);
pruef('Preis 120 → draussen', !g({ priceRangeV2: { minVariantPrice: { amount: '120.00' } } }).ok);
pruef('Titel mit chinesischen Zeichen → draussen', !g({ title: 'Hundepullover 冬季保暖 mit V-Ausschnitt' }).ok);
pruef('Titel in Grossbuchstaben → draussen', !g({ title: 'HUNDEPULLOVER MIT V AUSSCHNITT' }).ok);
pruef('Warenart Raucherzubehör → draussen', !g({ productType: 'Raucherzubehör' }).ok);
pruef('Sommerware im November → draussen', !g({ title: 'Sommer Strandkleid für Damen luftig' }).ok);
pruef('Sommerware im Juli → drin', g({ title: 'Sommer Strandkleid für Damen luftig' }, { monat: 7 }).ok);
pruef('Markenrisiko im Titel → draussen', !g({ title: 'Nike Style Sportschuhe für Herren' }).ok, JSON.stringify(g({ title: 'Nike Style Sportschuhe für Herren' })));

// ── Gruppen, Belege, Punkte ─────────────────────────────────────────────────
pruef('sort-schmuck → Schmuck', gruppe({ tags: ['sort-schmuck'] }) === 'schmuck');
pruef('wohnen ohne Aufbewahrung → Wohnen', gruppe({ tags: ['wohnen'] }) === 'wohnen');
pruef('wohnen + aufbewahrung → Rest', gruppe({ tags: ['wohnen', 'Aufbewahrung'] }) === 'rest');
pruef('belegt: 8 Stimmen 4.9', belegt(flach(roh({ tags: ['x'] }))));
pruef('belegt: 2 Stimmen reichen nicht', !belegt(flach(roh({ tags: ['x'], j: { value: '{"number_of_reviews":2,"average_rating":"5"}' } }))));
pruef('belegt: Trend-Tag genügt', belegt(flach(roh({ tags: ['kunden-liebling'], j: null }))));
pruef('belegt: Marge A genügt', belegt(flach(roh({ tags: ['mengenrabatt-a'], j: null }))));
pruef('nicht belegt: gar nichts', !belegt(flach(roh({ tags: ['x'], j: null }))));
pruef('Bewertung zählt mehr als Marge', punkte(flach(roh({ tags: ['x'] }))) > punkte(flach(roh({ tags: ['mengenrabatt-a'], j: null }))));

// ── Reihenfolge: Warengruppen abwechselnd ───────────────────────────────────────
{ const l = ['a', 'a', 'a', 'b', 'b', 'c'].map((t, i) => ({ handle: `${t}${i}`, productType: t }));
  const v = verschraenke(l).map((p) => p.productType).join('');
  pruef('verschränkt abwechselnd', v === 'abcabа'.replace('а', 'a') || v.startsWith('abc'), v);
  pruef('verschränkt verliert nichts', verschraenke(l).length === 6); }

// ── Pools aus der Freigabe ─────────────────────────────────────────────────────
{ const zeilen = [roh({ n: 1, handle: 'p1' }), roh({ n: 2, handle: 'p2', productType: 'Gadget' }), roh({ n: 3, handle: 'p3', productType: 'Elektronik' }), roh({ n: 4, handle: 'p4', tags: ['x', 'compliance-pruefen'] }), roh({ n: 5, handle: 'p5', productType: 'Küche & Bar' })];
  const fr = { gepinnt: { trends: ['p1', 'p4'] }, freigabe: { trends: ['p2', 'p3', 'fehlt'], mehr: ['p3', 'p5', 'p6'] }, ausschluss: { p6: 'schlechtes Bild' } };
  const r = baueAusFreigabe(zeilen, fr, { monat: 11 });
  pruef('Pool trends: nur Freigegebene und Gepinnte, die das Gate bestehen', r.pools.trends.map((p) => p.handle).sort().join() === 'p1,p2,p3');
  pruef('Gesperrtes Gepinntes fliegt mit Grund', r.verworfen.some((v) => v.handle === 'p4' && /Sperre/.test(v.grund)));
  pruef('nicht gefundenes Produkt wird gemeldet', r.verworfen.some((v) => v.handle === 'fehlt'));
  pruef('kein Produkt in zwei Pools (p3 nur in trends)', !r.pools.mehr.some((p) => p.handle === 'p3') && r.pools.mehr.map((p) => p.handle).join() === 'p5');
  pruef('Sichtprüfung-Ausschluss gilt', r.verworfen.some((v) => v.handle === 'p6' && /Sichtprüfung/.test(v.grund)));
  pruef('Pool nie grösser als das Ziel', Object.entries(r.pools).every(([n, l]) => l.length <= REIHEN[n].ziel));
  const v = baueAllePools(zeilen, { monat: 11, ausschluss: new Set(['p1']) });
  pruef('Vorschlag nimmt Ausgeschlossenes nicht auf', !Object.values(v.pools).flat().some((p) => p.handle === 'p1')); }

// ── Fensterrechnung (Spiegel des Liquid) ───────────────────────────────────────
pruef('Rotation 4 h, Schritte 7, 5, 3', ROTATION.stunden === 4 && ROTATION.schritte.join() === '7,5,3');
pruef('Titel mit «Unisex» besteht das Gate (Teilwort sex)', g({ title: 'Geflochtenes Lederarmband mit Verschluss, Unisex' }).ok);
pruef('Titel mit «Sexy» wird abgelehnt', !g({ title: 'Sexy Spitzen Unterwäsche Set für Damen' }).ok);
pruef('Zeitfenster: 0 bis 14399 s sind Nummer 0, 14400 ist Nummer 1', slotAus(0) === 0 && slotAus(14399) === 0 && slotAus(14400) === 1);
pruef('Zeitfenster wechselt nach 4 Stunden', slotAus(14400 * 10) !== slotAus(14400 * 10 - 1));
// Fensterrechnung über den ganzen Pool (Start 0 bis n-1, das Fenster läuft am Poolende zum Anfang weiter).
const TAGE = 14;
for (const n of [12, 17, 23, 32, 48, 10, 14, 18, 24, 30, 36, 42, 50]) {
  const starts = new Set(); const proStunde = Array.from({ length: 6 }, () => new Set());
  for (let s = 0; s < 6 * n * 4; s++) { const x = fensterStart(s, n); if (x < 0 || x >= n) { fehler++; console.log(`FAIL n=${n}: Start ${x} ausserhalb`); } starts.add(x); }
  pruef(`n=${n}: alle Startwerte kommen vor (jedes Produkt kann vorn stehen)`, starts.size === n, `${starts.size} von ${n}`);
  for (let tag = 0; tag < TAGE; tag++) for (let h = 0; h < 6; h++) proStunde[h].add(fensterStart(6 * tag + h + 6 * 1000, n));
  pruef(`n=${n}: wer täglich zur selben Uhrzeit kommt, sieht in ${TAGE} Tagen ${Math.min(TAGE, n)} verschiedene Fenster`, proStunde.every((m) => m.size === Math.min(TAGE, n)), proStunde.map((m) => m.size).join('/'));
  pruef(`n=${n}: zwei aufeinanderfolgende Zeitfenster haben verschiedenen Start`, Array.from({ length: 200 }, (_, s) => fensterStart(s, n)).every((x, i, a) => i === 0 || x !== a[i - 1]));
}
// Alle Poolgrössen, die das Theme zulässt (6 bis 50), über 60 Tage
for (let n = 6; n <= 50; n++) {
  const alle = new Set(Array.from({ length: 6 * 60 * 3 }, (_, s) => fensterStart(s, n)));
  if (alle.size !== n) { fehler++; console.log(`FAIL n=${n}: nur ${alle.size} Startwerte`); }
  { const folge = Array.from({ length: 300 }, (_, k) => fensterStart(k, n)); if (!folge.every((x, i) => i === 0 || x !== folge[i - 1])) { fehler++; console.log(`FAIL n=${n}: zwei aufeinanderfolgende Zeitfenster mit gleichem Start`); } }
  const stunde = new Set(Array.from({ length: 60 }, (_, d) => fensterStart(6 * d + 6000 + 2, n)));
  if (stunde.size !== n) { fehler++; console.log(`FAIL n=${n}: zur selben Uhrzeit nur ${stunde.size} von ${n} verschiedenen Fenstern in 60 Tagen`); }
}
pruef('Beispiel: Pool 32, Zeitfenster 3 → Schritt 7, Start 21', fensterStart(3, 32) === 21);
pruef('Beispiel: Pool 12, Zeitfenster 7 → Schritt 5, Start (35 + 1 * Zusatz) mod 12', fensterStart(7, 12) === (35 + 1 * 11) % 12 || fensterStart(7, 12) === (35 + 1 * 13) % 12);

// ── Vertrag Theme ↔ JS: die Zahlen im Liquid müssen zu REIHEN und ROTATION passen ─────────────────────────────
import { readFileSync } from 'node:fs';
{
  const D = new URL('../../dropship/startseite-wechsel-0411/theme/', import.meta.url);
  const sec = readFileSync(new URL('luxe-edit-home.liquid', D), 'utf8'), snip = readFileSync(new URL('lx-rot-start.liquid', D), 'utf8'), ok = readFileSync(new URL('lx-rot-ok.liquid', D), 'utf8');
  const hat = (t, re) => re.test(t);
  pruef('Vertrag: Zeitfenster im Liquid = Rotation.stunden × 3600', hat(sec, new RegExp(`divided_by: ${ROTATION.stunden * 3600} %`)));
  pruef('Vertrag: Tagesversatz-Teiler im Snippet = Zeitfenster pro Tag', hat(snip, new RegExp(`slot \\| divided_by: ${24 / ROTATION.stunden} `)));
  pruef('Vertrag: Schrittfolge im Snippet', hat(snip, /assign step = 7/) && hat(snip, /assign step = 5/) && hat(snip, /assign step = 3/) && hat(snip, /assign step = 1/) && ROTATION.schritte.join() === '7,5,3');
  pruef('Vertrag: Zusatzliste im Snippet = ROTATION.zusaetze', hat(snip, new RegExp(`extras = '${ROTATION.zusaetze.join(',')}'`)));
  pruef('Vertrag: Primzahlliste im Snippet = ROTATION.primzahlen', hat(snip, new RegExp(`primes = '${ROTATION.primzahlen.join(',')}'`)));
  pruef('Vertrag: Sperrliste im Liquid = THEME_STOPS', hat(sec, new RegExp(`lx_trend_stops = '${THEME_STOPS.map((x) => x.replace(/[-]/g, '\\-')).join(',')}'`)));
  pruef('Vertrag: Trends — Rückfallschwelle und Fenster = REIHEN.trends.fenster', hat(sec, new RegExp(`lx_pool_trends.products_count >= ${REIHEN.trends.fenster} `)) && hat(sec, new RegExp(`offset: lx_rot_start limit: ${REIHEN.trends.fenster} `)) && hat(sec, new RegExp(`lx_rot_rest = ${REIHEN.trends.fenster} \\| minus`)));
  pruef('Vertrag: Trends — gezeigte Karten = REIHEN.trends.zeigt', (sec.match(new RegExp(`lx_rot_taken < ${REIHEN.trends.zeigt} `, 'g')) || []).length === 2 && (sec.match(new RegExp(`lx_rot_taken >= ${REIHEN.trends.zeigt} `, 'g')) || []).length === 1);
  pruef('Vertrag: Schmuck — Fenster und Karten', hat(sec, new RegExp(`lx_edit_key == 'jewellery' %}\\{% assign lx_edit_pool_handle = '${REIHEN.schmuck.handle}' %\\}\\{% assign lx_edit_win = ${REIHEN.schmuck.fenster} %\\}\\{% assign lx_edit_show = ${REIHEN.schmuck.zeigt} `)));
  pruef('Vertrag: Wohnen — Fenster und Karten', hat(sec, new RegExp(`lx_edit_pool_handle = '${REIHEN.wohnen.handle}' %\\}\\s*\\{% assign lx_edit_win = ${REIHEN.wohnen.fenster} %\\}\\s*\\{% assign lx_edit_show = ${REIHEN.wohnen.zeigt} `)));
  pruef('Vertrag: Mehr — Rückfallschwelle, Fenster und Karten', hat(sec, new RegExp(`lx_more_pool.products_count >= ${REIHEN.mehr.fenster} `)) && hat(sec, new RegExp(`offset: lx_rot_start limit: ${REIHEN.mehr.fenster} `)) && (sec.match(new RegExp(`lx_more_valid < ${REIHEN.mehr.zeigt} `, 'g')) || []).length === 2 && (sec.match(new RegExp(`lx_more_valid >= ${REIHEN.mehr.zeigt} `, 'g')) || []).length === 1);
  for (const n of ['trends', 'mehr', 'schmuck', 'wohnen']) pruef(`Vertrag: Pool-Handle ${n} steht im Liquid`, sec.includes(`'${REIHEN[n].handle}'`));
  pruef('Vertrag: kein concat auf Sammlungsprodukten (liefert in Shopify eine leere Liste)', !/products \| concat/.test(sec));
  pruef('Vertrag: Poolgrösse wird auf 50 begrenzt (collection.products liefert höchstens 50)', (sec.match(/products_count \| at_most: 50/g) || []).length === 3);
  pruef('Vertrag: Gültigkeits-Snippet prüft kaufbar, Bild, Preis, Tags und «nicht-…-bewerben»', hat(ok, /p\.available and p\.featured_image and p\.price_min > 0 and p\.tags\.size > 0/) && hat(ok, /'nicht-' and tl contains 'bewerben'/));
  pruef('Vertrag: jede Reihe prüft Karten über lx-rot-ok (Trends, Schmuck/Wohnen, Mehr je zwei Schleifen)', (sec.match(/render 'lx-rot-ok'/g) || []).length === 6);
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen bestanden');
process.exit(fehler ? 1 : 0);
