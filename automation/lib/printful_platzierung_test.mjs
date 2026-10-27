// Tests für die Platzierung der Druckdatei im Printful-Auftrag (kein Netz). Lauf: /opt/node22/bin/node automation/lib/printful_platzierung_test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { platzierungFuer, alteZuordnung, produktInfoAusAntwort, neuerPlatzierungsCache, druckbare, EINZEL_TYPEN } from './printful_platzierung.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

// ── Antworten in der Form von GET /products/variant/<id> → result (Dateilisten aus dem Printful-Katalog vom 27.10.2026)
const f1 = [{ id: 'default', type: 'default', title: 'Print file', additional_price: null }, { id: 'preview', type: 'mockup', title: 'Mockup', additional_price: null }];
const textil = ['embroidery_chest_left', 'embroidery_chest_center', 'default', 'front_dtf', 'back', 'back_dtf', 'sleeve_left', 'sleeve_right', 'label_inside', 'label_outside', 'preview']
  .map(id => ({ id, type: id === 'preview' ? 'mockup' : id, title: id }));
const antwort = (id, type, files) => ({ variant: { id: 1 }, product: { id, type, title: 'x', files } });
const POSTER = antwort(268, 'POSTER', f1), LEINWAND = antwort(3, 'CANVAS', f1), TASSE = antwort(19, 'MUG', f1), HUELLE = antwort(686, 'PHONE-CASE', f1);
const STICKER = antwort(358, 'STICKER', f1), MAGNET = antwort(900, 'MAGNET', f1), RAHMEN = antwort(304, 'FRAMED-POSTER', f1);
const FLASCHE = antwort(992, 'WATER-BOTTLE', f1);                        // Typname hier nur beispielhaft: die Dateiliste (eine Platzierung) entscheidet
const SHIRT = antwort(71, 'T-SHIRT', textil), HOODIE = antwort(380, 'T-SHIRT', textil);
const CUTSEW = antwort(388, 'CUT-SEW', ['default', 'back', 'sleeve_right', 'sleeve_left', 'pocket', 'hood', 'preview'].map(id => ({ id, type: id === 'preview' ? 'mockup' : id })));
const info = (a) => produktInfoAusAntwort(a);

// ── Einzel-Produkte: immer 'default', für beide Seiten
for (const [n, a] of [['Poster', POSTER], ['Leinwand', LEINWAND], ['Tasse', TASSE], ['Handyhülle', HUELLE], ['Sticker', STICKER], ['Magnet', MAGNET], ['Flasche (Typ unbekannt, eine Platzierung)', FLASCHE], ['gerahmtes Poster', RAHMEN]]) {
  ist(`${n} → default (vorne)`, platzierungFuer({ produkt: info(a), seite: 'front' }), 'default');
  ist(`${n} → default (hinten wird nicht zu «back»)`, platzierungFuer({ produkt: info(a), seite: 'back' }), 'default');
}
// ── Bekleidung: vorne/hinten
ist('T-Shirt vorne → front', platzierungFuer({ produkt: info(SHIRT), seite: 'front' }), 'front');
ist('T-Shirt hinten → back', platzierungFuer({ produkt: info(SHIRT), seite: 'back' }), 'back');
ist('Hoodie vorne → front', platzierungFuer({ produkt: info(HOODIE), seite: 'front' }), 'front');
ist('Hoodie hinten → back', platzierungFuer({ produkt: info(HOODIE), seite: 'back' }), 'back');
ist('All-Over (CUT-SEW) vorne → front', platzierungFuer({ produkt: info(CUTSEW), seite: 'front' }), 'front');
ist('Seite fehlt → front', platzierungFuer({ produkt: info(SHIRT) }), 'front');
ist('Seite unsinnig → front', platzierungFuer({ produkt: info(SHIRT), seite: 'links' }), 'front');
// ── Ohne Dateiliste entscheidet der Typ
ist('Typ MUG ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'MUG', dateien: null } }), 'default');
ist('Typ PHONE-CASE ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'PHONE-CASE', dateien: null } }), 'default');
ist('Typ FRAMED-POSTER ohne Dateiliste → default', platzierungFuer({ produkt: { typ: 'FRAMED-POSTER', dateien: [] } }), 'default');
ist('Typ T-SHIRT ohne Dateiliste → front', platzierungFuer({ produkt: { typ: 'T-SHIRT', dateien: null } }), 'front');
ist('Typ T-SHIRT ohne Dateiliste, hinten → back', platzierungFuer({ produkt: { typ: 'T-SHIRT', dateien: null }, seite: 'back' }), 'back');

// ── DER Fehler: Shop-Produktart «Handy-Zubehör» / «Tassen & Becher» / «Accessoires» (alte Zuordnung → 'front'); mit Printful-Typ jetzt 'default'
for (const [shop, a] of [['Handy-Zubehör', HUELLE], ['Tassen & Becher', TASSE], ['Accessoires', FLASCHE], ['Poster', POSTER], ['Wohnen', LEINWAND]]) {
  ist(`Alt (Shop-Art «${shop}»): front, also falsch`, alteZuordnung(shop, 'front'), shop === 'Poster' ? 'default' : 'front');
  ist(`Neu (Shop-Art «${shop}» + Printful-Typ): default`, platzierungFuer({ produkt: info(a), seite: 'front', shopTyp: shop }), 'default');
}
ist('Shop-Art «T-SHIRT» + Printful-Typ T-SHIRT → front', platzierungFuer({ produkt: info(SHIRT), shopTyp: 'T-SHIRT' }), 'front');
ist('Der Printful-Typ gewinnt gegen eine falsche Shop-Art («MUG» am T-Shirt)', platzierungFuer({ produkt: info(SHIRT), shopTyp: 'MUG' }), 'front');

// ── Rückfall: Variante nicht ermittelbar → alte Zuordnung über die Shop-Produktart
ist('Rückfall: kein Produkt, Shop-Art MUG → default', platzierungFuer({ produkt: null, shopTyp: 'MUG' }), 'default');
ist('Rückfall: kein Produkt, Shop-Art phone-case (klein) → default', platzierungFuer({ produkt: null, shopTyp: 'phone-case' }), 'default');
ist('Rückfall: kein Produkt, Shop-Art «Tassen & Becher» → front (wie bisher)', platzierungFuer({ produkt: null, shopTyp: 'Tassen & Becher' }), 'front');
ist('Rückfall: kein Produkt, Shop-Art leer, hinten → back', platzierungFuer({ produkt: null, shopTyp: '', seite: 'back' }), 'back');
ist('Rückfall: nichts übergeben → front', platzierungFuer(), 'front');
ist('Rückfall: unbekannter Typ ohne Dateiliste, Shop-Art POSTER → default', platzierungFuer({ produkt: { typ: 'UNBEKANNT', dateien: null }, shopTyp: 'POSTER' }), 'default');
ist('Rückfall: unbekannter Typ ohne Dateiliste, Shop-Art unbekannt → front', platzierungFuer({ produkt: { typ: 'UNBEKANNT', dateien: null }, shopTyp: 'Zeug' }), 'front');
ist('Rückfall: leeres Produkt-Objekt', platzierungFuer({ produkt: { typ: '', dateien: [] }, shopTyp: 'STICKER' }), 'default');

// ── produktInfoAusAntwort / druckbare
ist('Antwort ohne product → null', [produktInfoAusAntwort(null), produktInfoAusAntwort({}), produktInfoAusAntwort({ product: 5 }), produktInfoAusAntwort({ product: {} })], [null, null, null, null]);
ist('Typ wird in Grossbuchstaben gelesen', produktInfoAusAntwort({ product: { id: 1, type: ' mug ', files: f1 } }), { id: 1, typ: 'MUG', dateien: ['default'] });
ist('Mockup-Dateien zählen nicht als Platzierung', info(POSTER).dateien, ['default']);
ist('Textil: alle Platzierungs-IDs ausser Mockup', info(SHIRT).dateien.includes('back') && !info(SHIRT).dateien.includes('preview'), true);
ist('druckbare() lässt Vorschau/Mockup weg', druckbare(['default', 'preview', 'mockup', 'back']), ['default', 'back']);
ist('EINZEL_TYPEN enthält die Typen aus dem Katalog', ['MUG', 'PHONE-CASE', 'STICKER', 'POSTER', 'FRAMED-POSTER', 'CANVAS', 'MAGNET'].every(t => EINZEL_TYPEN.includes(t)), true);

// ── Zwischenspeicher: ein Aufruf je Variante, Fehler werfen nicht
{
  let n = 0;
  const c = neuerPlatzierungsCache(async (vid) => { n++; if (vid === 999) throw new Error('Netz weg'); if (vid === 404) return null; return TASSE; });
  const a = await c(1), b = await c(1), c2 = await c('1');
  ist('Cache: drei Fragen nach derselben Variante → ein Aufruf', [n, a?.typ, b?.typ, c2?.typ], [1, 'MUG', 'MUG', 'MUG']);
  ist('Cache: Netzfehler → null, nicht geworfen', await c(999), null);
  ist('Cache: 404 (null) → null', await c(404), null);
  const vorher = n; await c(999); await c(404);
  ist('Cache: Fehlschläge werden gemerkt (kein zweiter Versuch im selben Lauf)', n, vorher);
}

// ── Gegen den echten Katalog (Datenpaket dropship/pod-auswahl/katalog.json): jedes Katalogprodukt ergibt die erwartete Platzierung
{
  const pfad = fileURLToPath(new URL('../../dropship/pod-auswahl/katalog.json', import.meta.url));
  if (!existsSync(pfad)) { console.log('(Katalog-Datenpaket fehlt → übersprungen)'); }
  else {
    const k = JSON.parse(readFileSync(pfad, 'utf8')).produkte;
    let n = 0;
    for (const p of Object.values(k)) {
      const dateien = p.files.map(x => x.split(':')[0]).filter(id => id !== 'preview');
      const erwartet = p.type === 'T-SHIRT' || p.type === 'CUT-SEW' ? ['front', 'back'] : ['default', 'default'];
      const prod = { typ: p.type, dateien };
      const ergebnis = [platzierungFuer({ produkt: prod, seite: 'front' }), platzierungFuer({ produkt: prod, seite: 'back' })];
      ist(`Katalog ${p.id} (${p.type}) → ${erwartet.join('/')}`, ergebnis, erwartet); n++;
      // ohne Dateiliste (nur Typ) dasselbe Ergebnis
      ist(`Katalog ${p.id} (${p.type}) nur nach Typ → ${erwartet.join('/')}`, [platzierungFuer({ produkt: { typ: p.type, dateien: null }, seite: 'front' }), platzierungFuer({ produkt: { typ: p.type, dateien: null }, seite: 'back' })], erwartet);
    }
    ist('Katalog enthielt Produkte', n > 10, true);
  }
}

// ── printful_sync.mjs nutzt die Bibliothek und enthält die alte Zeichenketten-Prüfung nicht mehr
{
  const q = readFileSync(fileURLToPath(new URL('../printful_sync.mjs', import.meta.url)), 'utf8');
  ist('printful_sync importiert platzierungFuer + neuerPlatzierungsCache', /import \{[^}]*platzierungFuer[^}]*\} from '\.\/lib\/printful_platzierung\.mjs'/.test(q) && /neuerPlatzierungsCache/.test(q), true);
  ist('printful_sync ruft platzierungFuer mit dem Printful-Produkt auf', /platzierungFuer\(\{produkt:pfProdukt/.test(q), true);
  ist('printful_sync fragt GET /products/variant/<id>', /\/products\/variant\//.test(q), true);
  ist('die alte Funktion placementFor ist weg', /function placementFor/.test(q), false);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
