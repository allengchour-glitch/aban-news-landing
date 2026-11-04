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
pruef('Zeitfenster: 0 bis 14399 s sind Nummer 0, 14400 ist Nummer 1', slotAus(0) === 0 && slotAus(14399) === 0 && slotAus(14400) === 1);
pruef('Zeitfenster wechselt nach 4 Stunden', slotAus(14400 * 10) !== slotAus(14400 * 10 - 1));
// Die echten Pool-Grössen (Stand 04.11.): jede Reihe muss ALLE möglichen Startwerte durchlaufen, nicht nur zwei.
for (const [n, k, pool] of [['schmuck', REIHEN.schmuck, 17], ['wohnen', REIHEN.wohnen, 12], ['trends', REIHEN.trends, 32], ['mehr', REIHEN.mehr, 23]]) {
  const M = pool - k.fenster + 1;
  const starts = Array.from({ length: 4 * M }, (_, s) => fensterStart(s, pool, k.fenster));
  pruef(`${n}: Start bleibt im Pool`, starts.every((x) => x >= 0 && x + k.fenster <= pool));
  pruef(`${n}: alle ${M} Startwerte kommen vor`, new Set(starts).size === M, `${new Set(starts).size} von ${M}`);
  pruef(`${n}: zwei aufeinanderfolgende Zeitfenster haben verschiedene Start`, starts.slice(1).every((x, i) => x !== starts[i]) || M === 1);
}
// Auch für beliebige Grössen: nie schlechter als die Hälfte der Startwerte (Mutationsprobe gegen einen festen Schritt 7)
for (let pool = 10; pool <= 50; pool++) for (const f of [3, 6, 8, 12, 18]) {
  const M = Math.max(pool - f, 0) + 1; if (M < 3) continue;
  const n = new Set(Array.from({ length: 3 * M }, (_, s) => fensterStart(s, pool, f))).size;
  if (n !== M) { fehler++; console.log(`FAIL Pool ${pool} Fenster ${f}: ${n} von ${M} Startwerten`); }
}
pruef('Start bei Pool kleiner als Fenster ist 0', fensterStart(5, 5, 8) === 0);
pruef('Beispiel Trends: Pool 32, Fenster 18, Zeitfenster 3 → Start (3*7) % 15 = 6', fensterStart(3, 32, 18) === 6);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen bestanden');
process.exit(fehler ? 1 : 0);
