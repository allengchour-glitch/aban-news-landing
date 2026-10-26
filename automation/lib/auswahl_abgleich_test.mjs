/** Test des Abgleichs Shop ↔ CJ (reine Funktionen, kein Netz). Lauf: /opt/node22/bin/node automation/lib/auswahl_abgleich_test.mjs */
import { pruefeAbgleich, fasseZusammen, USD_CHF } from './auswahl_abgleich.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); } else console.log(`ok   ${name}`);
};
const codes = (r) => r.map((f) => f.code).sort();
const hat = (r, code) => r.some((f) => f.code === code);
const schwere = (r, code) => r.filter((f) => f.code === code).map((f) => f.schwere);

// Ein sauberes Produkt: Farbe × Grösse. Kosten = CJ-Preis × Kurs + 14 CHF Fracht, Preis nach der Schreibregel (21.90 bei ek 2, 23.90 bei ek 3).
const kosten = (e) => Math.round((14 + e * USD_CHF) * 100) / 100;
const cjSauber = { pid: '1', variants: [['Black-S', 2], ['Black-M', 2], ['Black-XL', 3], ['Red-S', 2]].map(([k, e], i) => ({ vid: 'v' + i, sku: 'SKU' + i, key: k, ek: e, bild: 'https://cj/' + i + '.jpg' })) };
const shopSauber = () => ({ variantsCount: 4, options: [{ name: 'Farbe', values: ['Schwarz', 'Rot'] }, { name: 'Grösse', values: ['S', 'M', 'XL'] }],
  variants: [['SKU0', 'Schwarz', 'S', 2, 21.9], ['SKU1', 'Schwarz', 'M', 2, 21.9], ['SKU2', 'Schwarz', 'XL', 3, 23.9], ['SKU3', 'Rot', 'S', 2, 21.9]]
    .map(([sku, f, g, e, p]) => ({ sku, price: String(p), kosten: kosten(e), werte: { Farbe: f, Grösse: g }, bildId: 'img-' + sku })) });
const kopie = (o) => JSON.parse(JSON.stringify(o));

pruef('sauberes Produkt: kein Befund', pruefeAbgleich({ shop: shopSauber(), cj: cjSauber }), []);

// ---- Zuordnung ----
{ const s = shopSauber(); s.variants[1].sku = 'XYZ';
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('SKU, die CJ nicht führt → hoch', schwere(r, 'SKU_NICHT_BEI_CJ'), ['hoch']);
  pruef('…und die CJ-Variante, die im Shop fehlt, ist ein Mangel (mittel)', schwere(r, 'CJ_VARIANTE_FEHLT'), ['mittel']); }
{ const s = shopSauber(); s.variants[1].sku = 'SKU0'; s.variants[1].werte = { Farbe: 'Schwarz', Grösse: 'S' };
  pruef('doppelte SKU und doppelte Optionskombination → je hoch', codes(pruefeAbgleich({ shop: s, cj: cjSauber })).filter((c) => c === 'SKU_DOPPELT' || c === 'WERTE_DOPPELT'), ['SKU_DOPPELT', 'WERTE_DOPPELT']); }
{ const c = kopie(cjSauber); c.variants.push({ vid: 'v8', sku: 'SKU8', key: 'Black-US', ek: 2, bild: '' }, { vid: 'v9', sku: 'SKU9', key: 'Black-British Standard', ek: 2, bild: '' });
  pruef('Fremdstecker (US, British Standard) fehlen absichtlich im Shop → kein Befund', hat(pruefeAbgleich({ shop: shopSauber(), cj: c }), 'CJ_VARIANTE_FEHLT'), false); }
{ const c = kopie(cjSauber); c.variants.push({ vid: 'v8', sku: 'SKU8', key: 'Blue-S', ek: 2, bild: '' });
  pruef('fehlende Farbe (kein Stecker) → CJ_VARIANTE_FEHLT mittel, auch bei kleiner Minderheit', schwere(pruefeAbgleich({ shop: shopSauber(), cj: c }), 'CJ_VARIANTE_FEHLT'), ['mittel']); }
{ const s = shopSauber(); s.variantsCount = 120;
  pruef('mehr Varianten als gelesen → ABGESCHNITTEN (info)', pruefeAbgleich({ shop: s, cj: cjSauber }).map((f) => [f.code, f.schwere]), [['ABGESCHNITTEN', 'info']]); }

{ const c = kopie(cjSauber); c.variants[3].key = 'Red-US';
  pruef('Fremdstecker im Shop angelegt → FREMDSTECKER_IM_SHOP (hoch)', schwere(pruefeAbgleich({ shop: shopSauber(), cj: c }), 'FREMDSTECKER_IM_SHOP'), ['hoch']); }
{ const s = shopSauber(); s.variantsCount = 120; const c = kopie(cjSauber); c.variants.push({ vid: 'v9', sku: 'SKU9', key: 'Blue-S', ek: 2, bild: '' });
  pruef('abgeschnittene Shopliste → «fehlt im Shop» wird nicht geraten', hat(pruefeAbgleich({ shop: s, cj: c }), 'CJ_VARIANTE_FEHLT'), false); }

// ---- Preise und Kosten ----
{ const s = shopSauber(); s.variants[0].price = String(s.variants[0].kosten);
  pruef('Preis = Kosten → PREIS_UNTER_KOSTEN (hoch)', schwere(pruefeAbgleich({ shop: s, cj: cjSauber }), 'PREIS_UNTER_KOSTEN'), ['hoch']); }
{ const s = shopSauber(); s.variants[2].kosten = kosten(3.0) + 1.5;
  pruef('Kosten schwanken gegenüber CJ-Preis × Kurs → KOSTEN_ABWEICHUNG', hat(pruefeAbgleich({ shop: s, cj: cjSauber }), 'KOSTEN_ABWEICHUNG'), true); }
{ const s = shopSauber(); s.variants.forEach((v, i) => { v.kosten = Math.round((cjSauber.variants[i].ek * USD_CHF - 1.2) * 100) / 100; });
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('Kosten gleichmässig UNTER CJ-Preis × Kurs → KOSTEN_UNTER_CJ (die alte Prüfung sah nur die Schwankung)', [hat(r, 'KOSTEN_UNTER_CJ'), hat(r, 'KOSTEN_ABWEICHUNG')], [true, false]); }
{ const s = shopSauber(); s.variants.forEach((v) => { v.kosten = null; });
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('keine Kosten im Shop → KOSTEN_FEHLT (mittel), kein Verlust-Befund', [schwere(r, 'KOSTEN_FEHLT'), hat(r, 'PREIS_UNTER_KOSTEN')], [['mittel'], false]); }
{ const s = shopSauber(); s.variants.forEach((v) => { v.kosten = null; v.price = '17.90'; });
  const c = kopie(cjSauber); c.variants[2].ek = 40; // Variante kostet bei CJ allein 32.97 CHF, der Shop verlangt 17.90
  pruef('Einheitspreis unter dem CJ-Preis (ohne Kosten im Shop) → PREIS_UNTER_EK (hoch)', schwere(pruefeAbgleich({ shop: s, cj: c }), 'PREIS_UNTER_EK'), ['hoch']); }
{ const s = shopSauber(); s.variants[2].price = '23.90';
  pruef('Preis folgt der Schreibregel → kein Befund', hat(pruefeAbgleich({ shop: s, cj: cjSauber }), 'PREIS_FOLGT_KOSTEN_NICHT'), false); }
{ const s = shopSauber(); s.variants[2].price = '22.90';
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('teurere CJ-Variante, Preis zwischen Untergrenze und Regel → PREIS_FOLGT_KOSTEN_NICHT', schwere(r, 'PREIS_FOLGT_KOSTEN_NICHT'), ['mittel']); }
{ const s = shopSauber(); s.variants[2].price = '21.90';
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('Flachpreis trotz teurerer CJ-Variante: kann gewollt sein (die Basisvariante war die teure) → nur info PREIS_FLACH, kein Regel-Befund', [schwere(r, 'PREIS_FLACH'), hat(r, 'PREIS_FOLGT_KOSTEN_NICHT')], [['info'], false]); }
{ const s = shopSauber(); s.variants[2].price = '29.90';
  pruef('Preis deutlich über der Regel → ebenfalls PREIS_FOLGT_KOSTEN_NICHT', hat(pruefeAbgleich({ shop: s, cj: cjSauber }), 'PREIS_FOLGT_KOSTEN_NICHT'), true); }
{ const s = shopSauber(); s.variants[2].price = '20.90';
  pruef('teurere CJ-Variante im Shop billiger → PREIS_NICHT_MONOTON', hat(pruefeAbgleich({ shop: s, cj: cjSauber }), 'PREIS_NICHT_MONOTON'), true); }
{ const c = kopie(cjSauber); c.variants[2].ek = 3.05; // +10 Cent: Aufschlag ≤ 0.05 CHF → bleibt Untergrenze
  pruef('winziger CJ-Aufschlag (≤ 0.05 CHF) darf beim Untergrenzen-Preis bleiben', hat(pruefeAbgleich({ shop: (() => { const s = shopSauber(); s.variants[2].price = '21.9'; s.variants[2].kosten = kosten(2.05); return s; })(), cj: (() => { const x = kopie(cjSauber); x.variants[2].ek = 2.05; return x; })() }), 'PREIS_FOLGT_KOSTEN_NICHT'), false); }

// ---- Grössen und Zahlen: nur variierende Schlüsselteile, ganze Wörter ----
{ const s = shopSauber(); s.variants[2].werte.Grösse = 'L';
  pruef('CJ «Black-XL», Shop sagt «L» → GROESSE_FEHLT (Wort, nicht Teilstring)', schwere(pruefeAbgleich({ shop: s, cj: cjSauber }), 'GROESSE_FEHLT'), ['mittel']); }
const cjRing = { pid: '2', variants: [['Gold-7', 2], ['Gold-8', 2], ['Silver-7', 2]].map(([k, e], i) => ({ vid: 'r' + i, sku: 'R' + i, key: k, ek: e, bild: '' })) };
const shopRing = () => ({ variantsCount: 3, options: [], variants: [['R0', 'Gold', '7'], ['R1', 'Gold', '8'], ['R2', 'Silber', '7']]
  .map(([sku, f, g]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Farbe: f, Grösse: g }, bildId: null })) });
pruef('Ringgrössen 7/8 stimmen → kein Befund', pruefeAbgleich({ shop: shopRing(), cj: cjRing }), []);
{ const s = shopRing(); s.variants[0].werte.Grösse = '8'; s.variants[1].werte.Grösse = '7';
  pruef('Ringgrössen 7 ↔ 8 vertauscht → GROESSE_FEHLT (Zahlen werden verglichen, nicht nur XL/42)', hat(pruefeAbgleich({ shop: s, cj: cjRing }), 'GROESSE_FEHLT'), true); }
{ const c = { pid: '3', variants: [['Black-140x183cm', 2], ['Black-200x220cm', 2]].map(([k, e], i) => ({ vid: 'a' + i, sku: 'A' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 2, options: [], variants: [['A0', '140 × 183 cm'], ['A1', '200 × 220 cm']].map(([sku, a]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Abmessung: a }, bildId: null })) };
  pruef('Abmessung «140x183cm» ↔ «140 × 183 cm» passt', pruefeAbgleich({ shop: s, cj: c }), []);
  s.variants[0].werte.Abmessung = '200 × 220 cm';
  pruef('Abmessungen vertauscht → GROESSE_FEHLT', hat(pruefeAbgleich({ shop: s, cj: c }), 'GROESSE_FEHLT'), true); }
{ const c = { pid: '4', variants: [['Green-26x14x46cm', 2], ['Green-26x14x46cm', 2]].map(([k, e], i) => ({ vid: 'k' + i, sku: 'K' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 2, options: [], variants: [['K0', 'Grün'], ['K1', 'Grün']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Farbe: f }, bildId: null })) };
  s.variants[1].werte.Farbe = 'Hellgrün';
  pruef('Konstante aus dem Schlüssel (im Shop zum Hinweis geworden) löst keinen Grössen-Alarm aus', hat(pruefeAbgleich({ shop: s, cj: c }), 'GROESSE_FEHLT'), false); }
{ const c = { pid: '5', variants: [['Black-35-36', 2], ['Black-37-38', 2], ['Red-35-36', 2]].map(([k, e], i) => ({ vid: 'b' + i, sku: 'B' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 3, options: [], variants: [['B0', 'Schwarz', '35-36'], ['B1', 'Schwarz', '37-38'], ['B2', 'Rot', '35-36']].map(([sku, f, g]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Farbe: f, Grösse: g }, bildId: null })) };
  pruef('Bereichsgrösse «35-36» (Bindestrich im Wert) stimmt → kein Befund', pruefeAbgleich({ shop: s, cj: c }), []); }

{ const c = { pid: '7', variants: [['NMSRB5131-Free Size', 2], ['NMSRB5132-Free Size', 2]].map(([k, e], i) => ({ vid: 'c' + i, sku: 'C' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 2, options: [], variants: [['C0', 'Schwarz'], ['C1', 'Weiss']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Farbe: f }, bildId: null })) };
  const r = pruefeAbgleich({ shop: s, cj: c });
  pruef('Modellcode bei CJ, Farbname im Shop → CODE_FARBE_UNBELEGT (mittel), aber kein Grössen-Alarm', [schwere(r, 'CODE_FARBE_UNBELEGT'), hat(r, 'GROESSE_FEHLT')], [['mittel'], false]);
  const c2 = { pid: '8', variants: [['Style 1', 2], ['Style 2', 2]].map(([k, e], i) => ({ vid: 'd' + i, sku: 'D' + i, key: k, ek: e, bild: '' })) };
  const s2 = { variantsCount: 2, options: [], variants: [['D0', 'Gold'], ['D1', 'Silber']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Modell: f }, bildId: null })) };
  pruef('«Style 1/2» bei CJ, Gold/Silber im Shop → CODE_FARBE_UNBELEGT', hat(pruefeAbgleich({ shop: s2, cj: c2 }), 'CODE_FARBE_UNBELEGT'), true);
  const s3 = { variantsCount: 2, options: [], variants: [['D0', 'Modell 1'], ['D1', 'Modell 2']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Modell: f }, bildId: null })) };
  pruef('«Style 1/2» → «Modell 1/2» ist belegt → kein Befund', pruefeAbgleich({ shop: s3, cj: c2 }), []); }
{ const c = { pid: '9', variants: [['Gray EU-Touch', 2], ['Gray EU-Touch Two', 2], ['Gray US-Touch', 2], ['Gray US-Touch Two', 2]].map(([k, e], i) => ({ vid: 'g' + i, sku: 'G' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 2, options: [], variants: [['G0', 'Grau EU'], ['G1', 'Grau EU Zwei']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Modell: f }, bildId: null })) };
  pruef('US-Stecker mitten im Schlüssel («Gray US-Touch») fehlen absichtlich → kein CJ_VARIANTE_FEHLT', hat(pruefeAbgleich({ shop: s, cj: c }), 'CJ_VARIANTE_FEHLT'), false); }

{ const c = { pid: '10', variants: [['Black-3XL', 2], ['Black-4XL', 2]].map(([k, e], i) => ({ vid: 'x' + i, sku: 'X' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 2, options: [], variants: [['X0', 'XXXL'], ['X1', 'XXXXL']].map(([sku, g]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Grösse: g }, bildId: null })) };
  pruef('CJ «3XL»/«4XL» ↔ Shop «XXXL»/«XXXXL» ist dieselbe Grösse', hat(pruefeAbgleich({ shop: s, cj: c }), 'GROESSE_FEHLT'), false); }

// ---- Farben ----
{ const s = shopSauber(); s.variants[0].werte.Farbe = 'Rot'; s.variants[3].werte.Farbe = 'Schwarz';
  pruef('Schwarz- und Rot-SKU vertauscht → FARBE_ABWEICHUNG (hoch)', schwere(pruefeAbgleich({ shop: s, cj: cjSauber }), 'FARBE_ABWEICHUNG'), ['hoch']); }
{ const c = { pid: '6', variants: [['Pink-S', 2], ['Purple-S', 2], ['Blue-S', 2], ['Gray-S', 2]].map(([k, e], i) => ({ vid: 'f' + i, sku: 'F' + i, key: k, ek: e, bild: '' })) };
  const s = { variantsCount: 4, options: [], variants: [['F0', 'Rosa'], ['F1', 'Lila'], ['F2', 'Hellblau'], ['F3', 'Grau']].map(([sku, f]) => ({ sku, price: '21.9', kosten: kosten(2), werte: { Farbe: f }, bildId: null })) };
  pruef('Übersetzungen mit Synonymen (Pink→Rosa, Purple→Lila, Blue→Hellblau) sind kein Befund', hat(pruefeAbgleich({ shop: s, cj: c }), 'FARBE_ABWEICHUNG'), false); }
{ const s = shopSauber(); s.variants[0].werte.Farbe = 'Anthrazit';
  const r = pruefeAbgleich({ shop: s, cj: cjSauber });
  pruef('gleicher CJ-Teil «Black» → zwei Shop-Werte → FARBE_UNEINDEUTIG', hat(r, 'FARBE_UNEINDEUTIG'), true);
  pruef('…«Anthrazit» für «Black» ist zugleich eine Abweichung von der Grundfarbe', hat(r, 'FARBE_ABWEICHUNG'), true); }

// ---- Bilder ----
{ const s = shopSauber(); s.variants.forEach((v) => { v.bildId = null; });
  pruef('keine Variante mit Bild, CJ führt Bilder → BILD_FEHLT', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), ['BILD_FEHLT']); }
{ const c = kopie(cjSauber); c.variants.forEach((v) => { v.bild = ''; }); const s = shopSauber(); s.variants.forEach((v) => { v.bildId = null; });
  pruef('ohne Bild bei CJ ist fehlendes Bild im Shop kein Befund', codes(pruefeAbgleich({ shop: s, cj: c })), []); }
{ const s = shopSauber(); s.variants[1].bildId = s.variants[0].bildId;
  pruef('ein Shop-Bild für zwei verschiedene CJ-Bilder → BILD_DOPPELT (info)', schwere(pruefeAbgleich({ shop: s, cj: cjSauber }), 'BILD_DOPPELT'), ['info']); }

// ---- Lager ----
pruef('Lager: eine Variante ohne Bestand → LAGER_NULL (mittel)', schwere(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 100, v1: 0, v2: 5, v3: 4 } }), 'LAGER_NULL'), ['mittel']);
pruef('Lager: alle ohne Bestand und alle gemessen → LAGER_NULL_ALLE (hoch)', schwere(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 0, v1: 0, v2: 0, v3: 0 } }), 'LAGER_NULL_ALLE'), ['hoch']);
{ const r = pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 0 } });
  pruef('Lager: nur 1 von 4 Varianten gemessen (und 0) → NICHT «alle», nur LAGER_NULL', [hat(r, 'LAGER_NULL_ALLE'), hat(r, 'LAGER_NULL')], [false, true]); }
pruef('Lager: ohne Lagerdaten kein Lagerbefund', codes(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: null })), []);
pruef('Lager: Variante ohne Messwert zählt nicht als «ohne Bestand»', codes(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 3 } })), []);

// ---- Nicht abrufbar ----
pruef('«CJ ohne Daten» (ausgelistet?) → mittel, mit CJ-Code', pruefeAbgleich({ shop: shopSauber(), cj: { fehler: 'CJ ohne Daten', code: 1602002 } }).map((f) => [f.code, f.schwere, f.text]), [['CJ_NICHT_ABRUFBAR', 'mittel', 'CJ ohne Daten (CJ-Code 1602002)']]);
pruef('andere Abruffehler → info', pruefeAbgleich({ shop: shopSauber(), cj: { fehler: 'keine CJ-Kennung in der SKU' } }).map((f) => [f.code, f.schwere]), [['CJ_NICHT_ABRUFBAR', 'info']]);
pruef('keine Shopdaten → hoch', pruefeAbgleich({ shop: null, cj: cjSauber })[0].schwere, 'hoch');

// ---- Zusammenfassung ----
{ const z = fasseZusammen([{ flags: [] }, { flags: [{ code: 'A', schwere: 'hoch' }, { code: 'B', schwere: 'info' }] }, { flags: [{ code: 'B', schwere: 'info' }] }]);
  pruef('Zusammenfassung zählt Produkte, Befunde und «mit Befund ≥ mittel»', [z.produkte, z.mitBefund, z.je.A.n, z.je.B.n], [3, 1, 1, 2]); }
{ const z = fasseZusammen([{ flags: [{ code: 'C', schwere: 'info' }] }, { flags: [{ code: 'C', schwere: 'mittel' }] }]);
  pruef('Schwere je Code = die HÖCHSTE, nicht die des ersten Treffers', z.je.C.schwere, 'mittel'); }

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
