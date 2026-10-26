/** Test des Abgleichs Shop ↔ CJ (reine Funktionen, kein Netz). Lauf: /opt/node22/bin/node automation/lib/auswahl_abgleich_test.mjs */
import { pruefeAbgleich, fasseZusammen, USD_CHF } from './auswahl_abgleich.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); } else console.log(`ok   ${name}`);
};
const codes = (r) => r.map((f) => f.code).sort();

// Ein sauberes Produkt: Farbe × Grösse, drei Varianten, Kosten = CJ-Preis × Kurs + 14 CHF Fracht, teuerste Variante teurer.
const ek = { 'A-S': 2.0, 'A-M': 2.0, 'A-XL': 3.0 };
const cjSauber = { pid: '1', variants: Object.entries(ek).map(([k, e], i) => ({ vid: 'v' + i, sku: 'SKU' + i, key: k.replace('A', 'Black'), ek: e, bild: 'https://cj/' + i + '.jpg' })) };
const kosten = (e) => Math.round((14 + e * USD_CHF) * 100) / 100;
const shopSauber = () => ({ variantsCount: 3, options: [{ name: 'Farbe', values: ['Schwarz'] }, { name: 'Grösse', values: ['S', 'M', 'XL'] }],
  variants: [['SKU0', 'S', 2.0, 21.9], ['SKU1', 'M', 2.0, 21.9], ['SKU2', 'XL', 3.0, 23.9]].map(([sku, g, e, p]) => ({ sku, price: String(p), kosten: kosten(e), werte: { Farbe: 'Schwarz', Grösse: g }, bildId: 'img-' + sku })) });
const kopie = (o) => JSON.parse(JSON.stringify(o));

pruef('sauberes Produkt: kein Befund', pruefeAbgleich({ shop: shopSauber(), cj: cjSauber }), []);

{ const s = shopSauber(); s.variants[1].sku = 'XYZ';
  pruef('SKU, die CJ nicht führt → hoch', pruefeAbgleich({ shop: s, cj: cjSauber }).filter((f) => f.code === 'SKU_NICHT_BEI_CJ').map((f) => f.schwere), ['hoch']);
  pruef('…und die CJ-Variante, die im Shop fehlt, wird genannt', codes(pruefeAbgleich({ shop: s, cj: cjSauber })).includes('CJ_VARIANTE_FEHLT'), true); }
{ const s = shopSauber(); s.variants[1].sku = 'SKU0'; s.variants[1].werte = { Farbe: 'Schwarz', Grösse: 'S' };
  pruef('doppelte SKU und doppelte Optionskombination → je hoch', codes(pruefeAbgleich({ shop: s, cj: cjSauber })).filter((c) => c === 'SKU_DOPPELT' || c === 'WERTE_DOPPELT'), ['SKU_DOPPELT', 'WERTE_DOPPELT']); }
{ const s = shopSauber(); s.variants[0].price = String(s.variants[0].kosten);
  pruef('Preis = Kosten → PREIS_UNTER_KOSTEN (hoch)', pruefeAbgleich({ shop: s, cj: cjSauber }).filter((f) => f.code === 'PREIS_UNTER_KOSTEN').map((f) => f.schwere), ['hoch']); }
{ const s = shopSauber(); s.variants[2].kosten = kosten(3.0) + 1.5;
  pruef('Kosten weichen von CJ-Preis × Kurs ab (Abstand schwankt) → KOSTEN_ABWEICHUNG', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), ['KOSTEN_ABWEICHUNG']); }
{ const s = shopSauber(); s.variants[2].price = '20.90';
  pruef('teurere CJ-Variante im Shop billiger → PREIS_NICHT_MONOTON', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), ['PREIS_NICHT_MONOTON']); }
{ const s = shopSauber(); s.variants[2].price = '21.90';
  pruef('gleicher Preis trotz teurerer CJ-Variante ist erlaubt (Preis ist Untergrenze)', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), []); }
{ const s = shopSauber(); s.variants[2].werte.Grösse = 'L';
  pruef('CJ-Schlüssel «Black-XL», Shop sagt «L» → GROESSE_FEHLT', pruefeAbgleich({ shop: s, cj: cjSauber }).filter((f) => f.code === 'GROESSE_FEHLT').length, 1); }
{ const c = kopie(cjSauber); c.variants[2].key = 'Black-140x183cm'; const s = shopSauber(); s.variants[2].werte.Grösse = '140 × 183 cm';
  pruef('Abmessung 140x183cm ↔ «140 × 183 cm» passt (Normalisierung)', codes(pruefeAbgleich({ shop: s, cj: c })), []); }
{ const s = shopSauber(); s.variants[0].werte.Farbe = 'Blau';
  pruef('gleicher CJ-Schlüsselteil «Black» → zwei Shop-Werte → FARBE_UNEINDEUTIG', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), ['FARBE_UNEINDEUTIG']); }
{ const s = shopSauber(); s.variants.forEach((v) => { v.bildId = null; });
  pruef('keine Variante mit Bild, CJ führt Bilder → BILD_FEHLT', codes(pruefeAbgleich({ shop: s, cj: cjSauber })), ['BILD_FEHLT']); }
{ const c = kopie(cjSauber); c.variants.forEach((v) => { v.bild = ''; }); const s = shopSauber(); s.variants.forEach((v) => { v.bildId = null; });
  pruef('ohne Bild bei CJ ist fehlendes Bild im Shop kein Befund', codes(pruefeAbgleich({ shop: s, cj: c })), []); }
pruef('Lager: eine Variante ohne Bestand → LAGER_NULL (mittel)', pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 100, v1: 0, v2: 5 } }).filter((f) => f.code === 'LAGER_NULL').map((f) => f.schwere), ['mittel']);
pruef('Lager: alle ohne Bestand → LAGER_NULL_ALLE (hoch)', pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 0, v1: 0, v2: 0 } }).filter((f) => f.code === 'LAGER_NULL_ALLE').map((f) => f.schwere), ['hoch']);
pruef('Lager: ohne Lagerdaten kein Lagerbefund', codes(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: null })), []);
pruef('Lager: Variante ohne Messwert zählt nicht als «ohne Bestand»', codes(pruefeAbgleich({ shop: shopSauber(), cj: cjSauber, stock: { v0: 3 } })), []);
pruef('CJ nicht abrufbar → nur info, kein Preis-/Mappingurteil', pruefeAbgleich({ shop: shopSauber(), cj: { fehler: 'CJ ohne Daten' } }).map((f) => [f.code, f.schwere]), [['CJ_NICHT_ABRUFBAR', 'info']]);
pruef('keine Shopdaten → hoch', pruefeAbgleich({ shop: null, cj: cjSauber })[0].schwere, 'hoch');
{ const s = shopSauber(); s.variantsCount = 120;
  pruef('mehr Varianten als gelesen → ABGESCHNITTEN (info)', pruefeAbgleich({ shop: s, cj: cjSauber }).map((f) => [f.code, f.schwere]), [['ABGESCHNITTEN', 'info']]); }
{ const c = kopie(cjSauber); c.variants.push({ vid: 'v9', sku: 'SKU9', key: 'Black-US', ek: 2, bild: '' });
  const r = pruefeAbgleich({ shop: shopSauber(), cj: c });
  pruef('CJ-Variante nicht im Shop (z. B. Fremdstecker) → nur info, solange die Minderheit fehlt', r.filter((f) => f.code === 'CJ_VARIANTE_FEHLT').map((f) => f.schwere), ['info']); }
{ const z = fasseZusammen([{ flags: [] }, { flags: [{ code: 'A', schwere: 'hoch' }, { code: 'B', schwere: 'info' }] }, { flags: [{ code: 'B', schwere: 'info' }] }]);
  pruef('Zusammenfassung zählt Produkte, Befunde und «mit Befund ≥ mittel»', [z.produkte, z.mitBefund, z.je.A.n, z.je.B.n], [3, 1, 1, 2]); }

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
