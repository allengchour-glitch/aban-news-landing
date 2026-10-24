#!/usr/bin/env node
// Gegenproben in beide Richtungen: echte Kandidaten müssen durch, und die vier Sperren
// (Klinge, Marke, Preis, zu wenig erprobt) dürfen nicht an der Sprache scheitern.
import { topUrteil, topAuswahl, LISTED_MIN, ekPreis } from './top_kandidaten.mjs';

let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };
const t = (o = {}) => ({ productNameEn: 'Ultrasonic Humidifier Household', productImage: 'https://x/y.jpg',
  sellPrice: '8.73', listedNum: 18, shippingCountryCodes: ['CH', 'DE'], isTestProduct: false, ...o });

// Richtung 1: ein erprobtes, bezahlbares Produkt mit CH-Versand kommt durch.
pruef('erprobt + CH + bezahlbar → Kandidat', topUrteil(t()).nehmen === true, JSON.stringify(topUrteil(t())));
pruef('Fracht wird trotzdem gemessen', topUrteil(t()).frachtPruefen === true);

// Richtung 2: die Sperren.
pruef('englische Klinge erkannt', topUrteil(t({ productNameEn: 'Folding Pocket Knife Outdoor' })).grund === 'klinge-waffenrecht');
pruef('englische Klinge im Plural', topUrteil(t({ productNameEn: 'Kitchen Knives Set 6pcs' })).grund === 'klinge-waffenrecht');
pruef('deutsche Klinge weiterhin erkannt', topUrteil(t({ productNameEn: 'Taschenmesser Damast' })).grund === 'klinge-waffenrecht');
pruef('englische Marke erkannt', topUrteil(t({ productNameEn: 'For Xiaomi Mi Band Strap' })).grund === 'markenware');
// Diese beiden stehen NUR in der englischen Liste — ohne sie wäre MARKE_EN wirkungslos und
// die Mutationsprobe hätte das verdeckt (die deutsche Liste kennt Xiaomi und Pokemon auch).
pruef('iPhone nur über die englische Liste', topUrteil(t({ productNameEn: 'Case for iPhone 15 Pro' })).grund === 'markenware');
pruef('Barbie nur über die englische Liste', topUrteil(t({ productNameEn: 'Barbie Doll Dress Set' })).grund === 'markenware');
pruef('Lizenzfigur erkannt', topUrteil(t({ productNameEn: 'Pokemon Plush Toy 20cm' })).grund === 'markenware');
pruef('zu teuer', topUrteil(t({ sellPrice: '89.00' })).grund === 'zu-teuer');
pruef('zu wenig erprobt', topUrteil(t({ listedNum: 3 })).grund === 'zu-wenig-erprobt');
pruef('genau an der Schwelle kommt durch', topUrteil(t({ listedNum: LISTED_MIN })).nehmen === true);
pruef('kein Bild', topUrteil(t({ productImage: null })).grund === 'kein-bild');
pruef('Testprodukt', topUrteil(t({ isTestProduct: true })).grund === 'testprodukt');
// Die Lagerliste darf NICHTS verwerfen — sie nennt das Lager, nicht das Zielland.
pruef('Lagerliste verwirft nichts', topUrteil(t({ shippingCountryCodes: ['CN', 'CN_US'] })).nehmen === true);
pruef('Lager wird mitgegeben', JSON.stringify(topUrteil(t({ shippingCountryCodes: ['GB'] })).lager) === '["GB"]');

// GEGENPROBE zur Gegenprobe: ein zu breites Muster darf harmlose Ware nicht wegwerfen.
pruef('Knife ist nicht in Knitting', topUrteil(t({ productNameEn: 'Knitting Needles Set Bamboo' })).nehmen === true);
pruef('Razor ist nicht in Brazilian', topUrteil(t({ productNameEn: 'Brazilian Hair Clip' })).nehmen === true);
// Diese Zeile stand erst andersherum da und hätte einen Fehler festgeschrieben: das blanke
// Wort `switch` traf den Lichtschalter. Jetzt verlangt die Marke „nintendo switch".
pruef('Lichtschalter ist keine Konsole', topUrteil(t({ productNameEn: 'Light Switch Cover Plate' })).nehmen === true);
pruef('Nintendo Switch ist Markenware', topUrteil(t({ productNameEn: 'Nintendo Switch Grip Case' })).grund === 'markenware');
pruef('Sony ist nicht in Personal', topUrteil(t({ productNameEn: 'Personal Care Organizer' })).nehmen === true);
pruef('unbekannter Preis wird nicht geraten', topUrteil(t({ sellPrice: null })).grund === 'preis-unbekannt');
pruef('ohne Lagerangabe trotzdem Kandidat', topUrteil(t({ shippingCountryCodes: [] })).nehmen === true);
// Preisspannen: 32 von 240 Treffern schrieben "1.83 -- 3.69". Der untere Wert zählt.
pruef('Spanne → unterer Wert', ekPreis('1.83 -- 3.69') === 1.83);
pruef('Spanne wird nicht mehr verworfen', topUrteil(t({ sellPrice: '1.83 -- 3.69' })).nehmen === true);
pruef('teure Spanne faellt am unteren Wert NICHT', topUrteil(t({ sellPrice: '39.00 -- 120.00' })).nehmen === true);
pruef('Komma statt Punkt', ekPreis('12,50') === 12.5);
pruef('leerer Preis bleibt unbekannt', Number.isNaN(ekPreis('')) && Number.isNaN(ekPreis(null)));

// Reihenfolge: mehr Läden zuerst, bei Gleichstand der tiefere Einkauf.
const liste = [t({ productNameEn: 'A', listedNum: 6, sellPrice: '5' }),
  t({ productNameEn: 'B', listedNum: 18, sellPrice: '9' }),
  t({ productNameEn: 'C', listedNum: 18, sellPrice: '4' }),
  t({ productNameEn: 'Pocket Knife', listedNum: 18 })];
const a = topAuswahl(liste, 10).map(x => x.t.productNameEn);
pruef('erprobteste zuerst, Klinge nie dabei', JSON.stringify(a) === JSON.stringify(['C', 'B', 'A']), JSON.stringify(a));
pruef('Deckel greift', topAuswahl(liste, 1).length === 1);
pruef('Schwelle stammt aus der Messung (Hoechstwert war 18)', LISTED_MIN === 5);
// Gegenprobe: die Schalter müssen auch wirklich durchgereicht werden — eine erste Fassung
// nahm in topAuswahl still die Vorgaben, und der Lauf meldete 0 Kandidaten.
pruef('Schalter werden durchgereicht',
  topAuswahl([t({ productNameEn: 'Z', listedNum: 6 })], 10, { listedMin: 50 }).length === 0);

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
