// Tests für skuNachziehen (kein Netz): wann bekommt die Standardvariante die echte CJ-Variantennummer als SKU, wann «unklar», wann nichts?
import { skuNachziehen, istCjVariantennummer, steckerBasis } from './sku_nachziehen.mjs';
import { strategien } from './fakten_block.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const unklar = (n, r, teil) => ist(n, [typeof r?.unklar === 'string', new RegExp(teil, 'i').test(r?.unklar || '')], [true, true]);

// Die vier echten Varianten der Heizdecke (27.10.2026): Stecker US / EU / UK / AU, alle 33.78 USD
const roh = [
  { vid: '2607290840401606700', sku: 'CJYD301744801AZ', key: 'Black And Gray Belt With Hood-US', ek: 33.78 },
  { vid: '2607290840401607200', sku: 'CJYD301744802BY', key: 'Black And Gray Belt With Hood-EU', ek: 33.78 },
  { vid: '2607290840401607700', sku: 'CJYD301744803CX', key: 'Black And Gray Belt With Hood-UK', ek: 33.78 },
  { vid: '2607290840401608200', sku: 'CJYD301744804DW', key: 'Black And Gray Belt With Hood-AU', ek: 33.78 },
];
const eu = [roh[1]];
const pid = strategien('CJ-2607290840401606000');
const mit = (v, aenderung) => ({ ...v, ...aenderung });

// ── Die SKU-Form der Bestell-Engine (cj_sku.py, Form A und B)
for (const s of ['CJYD301744802BY', 'CJSJ244325301AZ', 'CJZN148912002BY', 'CJXFLPCD00334-Photo Color-EU', 'CJJJCFCJ02750-Black-EU', 'CJJJJTJT22925', 'CJBJMRJF00040-EU plug', 'cjyd301744802by'])
  ist('SKU-Form gültig: ' + s, istCjVariantennummer(s), true);
for (const s of ['CJABCDEFGH', 'CJ123456', 'CJ-ANTIGRAV-HUMID', 'CJTEST1', 'X', '', 'CJYD301744802BY EXTRA', null, undefined, '2607290840401607200'])
  ist('SKU-Form ungültig: ' + JSON.stringify(s), istCjVariantennummer(s), false);

// ── Normalfall
ist('Heizdecke: pid-SKU, 4 CJ-Varianten, nur EU bleibt → SKU der EU-Variante',
  skuNachziehen({ wege: pid, vsRoh: roh, vs: eu }), { neueSku: 'CJYD301744802BY', vid: '2607290840401607200', anzahlCj: 4 });
ist('Auch die blanke 15-stellige pid (ohne «CJ-»)', skuNachziehen({ wege: strategien('260505090828160'), vsRoh: roh, vs: eu })?.neueSku, 'CJYD301744802BY');
ist('Auch die UUID-pid', skuNachziehen({ wege: strategien('A1B2C3D4-0000-4000-8000-123456789ABC'), vsRoh: roh, vs: eu })?.neueSku, 'CJYD301744802BY');
// Prüfer-Fund: Nummern mit Anhang (11 von 30 echten Fällen, alle UUID-pid)
const anhang = [{ vid: 'a', sku: 'CJXFLPCD00334-Photo Color-US', key: 'Photo Color-US', ek: 8 }, { vid: 'b', sku: 'CJXFLPCD00334-Photo Color-EU', key: 'Photo Color-EU', ek: 8 }, { vid: 'c', sku: 'CJXFLPCD00334-Photo Color-UK', key: 'Photo Color-UK', ek: 8 }];
ist('Nummer mit Anhang («CJXFLPCD00334-Photo Color-EU») wird übernommen', skuNachziehen({ wege: strategien('A1B2C3D4-0000-4000-8000-123456789ABC'), vsRoh: anhang, vs: [anhang[1]] })?.neueSku, 'CJXFLPCD00334-Photo Color-EU');
ist('Gleicher Preis aller Varianten und höchstens +5 % wird akzeptiert', skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: 10 }), mit(roh[1], { ek: 10.5 })], vs: [mit(roh[1], { ek: 10.5 })] })?.neueSku, 'CJYD301744802BY');
ist('Die übrige Variante ist die billigste: akzeptiert (z. B. rattan-vintage-wandlampe 6.30 gegen 6.80)', skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: 6.8 }), mit(roh[1], { ek: 6.3 })], vs: [mit(roh[1], { ek: 6.3 })] })?.neueSku, 'CJYD301744802BY');

// ── nichts zu tun (null): kein Problem
ist('CJ führt wirklich nur EINE Variante → pid ist eindeutig', skuNachziehen({ wege: pid, vsRoh: eu, vs: eu }), null);
ist('nach dem Filter bleiben ZWEI Varianten (dann baut das Werkzeug die Auswahl)', skuNachziehen({ wege: pid, vsRoh: roh, vs: roh.slice(1, 3) }), null);
ist('nach dem Filter bleibt KEINE Variante', skuNachziehen({ wege: pid, vsRoh: roh, vs: [] }), null);
ist('die SKU nennt schon eine Variante (CJ-CJYD…)', skuNachziehen({ wege: strategien('CJ-CJYD301744802BY'), vsRoh: roh, vs: eu }), null);
ist('blanke Variantennummer (CJLY…) als SKU', skuNachziehen({ wege: strategien('CJLY291603001AZ'), vsRoh: roh, vs: eu }), null);
ist('unbekannte SKU-Form', skuNachziehen({ wege: strategien('ABC-123'), vsRoh: roh, vs: eu }), null);
ist('leere SKU', skuNachziehen({ wege: strategien(''), vsRoh: roh, vs: eu }), null);
ist('strategien liefert mehrere Wege (variantSku + productSku) → keine pid', skuNachziehen({ wege: [['variantSku', 'X'], ['productSku', 'X']], vsRoh: roh, vs: eu }), null);
ist('ein einzelner Weg, der keine pid ist (strategien liefert das heute nie, die Prüfung bleibt als Absicherung)', skuNachziehen({ wege: [['variantSku', 'X']], vsRoh: roh, vs: eu }), null);
ist('wege/vsRoh/vs fehlen oder sind ungültig', [skuNachziehen({ wege: null, vsRoh: roh, vs: eu }), skuNachziehen({ wege: [], vsRoh: roh, vs: eu }), skuNachziehen({ wege: pid, vsRoh: null, vs: eu }), skuNachziehen({ wege: pid, vsRoh: roh, vs: null })], [null, null, null, null]);

// ── unklar: mehrdeutig, aber nicht sicher zu beheben → zurückstellen, nie schreiben
unklar('übrige Variante ohne Nummer (leer)', skuNachziehen({ wege: pid, vsRoh: [roh[0], { vid: 'v', sku: '', key: 'Black-EU', ek: 5 }], vs: [{ vid: 'v', sku: '', key: 'Black-EU', ek: 5 }] }), 'CJ-Nummer');
unklar('übrige Variante mit unbrauchbarer Nummer («x»)', skuNachziehen({ wege: pid, vsRoh: [roh[0], { vid: 'v', sku: 'x', key: 'Black-EU', ek: 5 }], vs: [{ vid: 'v', sku: 'x', key: 'Black-EU', ek: 5 }] }), 'CJ-Nummer');
unklar('erfundene Nummer «CJABCDEFGH» (die Engine hielte sie für einen anderen Lieferanten)', skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { sku: 'CJABCDEFGH' })], vs: [mit(roh[1], { sku: 'CJABCDEFGH' })] }), 'CJ-Nummer');
unklar('Nummer ohne Ziffernstamm («CJ123456»)', skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { sku: 'CJ123456' })], vs: [mit(roh[1], { sku: 'CJ123456' })] }), 'CJ-Nummer');
unklar('übrige Variante ohne vid', skuNachziehen({ wege: pid, vsRoh: roh, vs: [{ sku: 'CJYD301744802BY', key: 'X-EU', ek: 33.78 }] }), 'Variantenkennung');
unklar('dieselbe Nummer zweimal bei CJ → nicht eindeutig', skuNachziehen({ wege: pid, vsRoh: [roh[1], mit(roh[0], { sku: 'CJYD301744802BY' })], vs: [roh[1]] }), 'nicht eindeutig');
// Prüfer-Fund «daten»: der Filter erkennt nur Fremdstecker, die er kennt; der Rest muss AUSDRÜCKLICH Euro-Stecker sein
for (const k of ['Black-CN', 'Black-CH', 'Black-KR', 'Black-BR', 'Black-ZA', 'Black-Type G', 'Black', ''])
  unklar(`Rest «${k}» nennt den Euro-Stecker nicht ausdrücklich`, skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { key: k })], vs: [mit(roh[1], { key: k })] }), 'Euro-Stecker');
const mitKeys = (stamm, zusatz = '') => roh.map((v, i) => mit(v, { key: `${stamm}-${['US', 'EU', 'UK', 'AU'][i]}${zusatz}` }));
ist('Rest «White-EU» und «White-EU Plug» (gleiche Basis) zählen als Euro-Stecker', [skuNachziehen({ wege: pid, vsRoh: mitKeys('White'), vs: [mitKeys('White')[1]] })?.neueSku, skuNachziehen({ wege: pid, vsRoh: mitKeys('White', ' Plug'), vs: [mitKeys('White', ' Plug')[1]] })?.neueSku], ['CJYD301744802BY', 'CJYD301744802BY']);
// Prüfer-Fund «logik»/«daten»: Preis. faszien-massagegerat-219264: EU 66.17 USD, US 54.90 USD → +21 %
unklar('Einkaufspreis der übrigen Variante 21 % über dem billigsten (Massagegerät)', skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: 54.9 }), mit(roh[1], { ek: 66.17 })], vs: [mit(roh[1], { ek: 66.17 })] }), '\\+21 %');
unklar('Einkaufspreis der übrigen Variante unbekannt (NaN)', skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { ek: NaN })], vs: [mit(roh[1], { ek: NaN })] }), 'Einkaufspreis');
unklar('Einkaufspreis 0', skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { ek: 0 })], vs: [mit(roh[1], { ek: 0 })] }), 'Einkaufspreis');
ist('Preisgrenze: genau +5 % noch akzeptiert, +6 % nicht', [skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: 100 }), mit(roh[1], { ek: 105 })], vs: [mit(roh[1], { ek: 105 })] })?.neueSku, typeof skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: 100 }), mit(roh[1], { ek: 106 })], vs: [mit(roh[1], { ek: 106 })] })?.unklar], ['CJYD301744802BY', 'string']);
ist('Die anderen Varianten ohne Preis stören den Vergleich nicht', skuNachziehen({ wege: pid, vsRoh: [mit(roh[0], { ek: undefined }), roh[1]], vs: eu })?.neueSku, 'CJYD301744802BY');
ist('Gross-/Kleinschreibung der Nummer wird akzeptiert und unverändert übernommen', skuNachziehen({ wege: pid, vsRoh: [roh[0], mit(roh[1], { sku: 'cjyd301744802by' })], vs: [mit(roh[1], { sku: 'cjyd301744802by' })] })?.neueSku, 'cjyd301744802by');

// ── Basisvergleich (Prüfung 27.10.2026, echte Fälle faszien-massagegerat-219264 und soyamilch-maschine-611200)
const farbe = (vid, key, ek = 10, sku = 'CJYD1111111' + vid + 'AZ') => ({ vid: String(vid), sku, key, ek });
const V = (...s) => s.map((k, i) => farbe(i + 1, k));
let alle = V('Black-US', 'Gray-US', 'Black-EU');
unklar('Black-US, Gray-US, Black-EU zum gleichen Preis: die graue US-Variante ist nicht nur ein anderer Stecker', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[2]] }), 'unterscheidet sich nicht nur im Stecker');
alle = V('1200W-US', '800W-US', '800W-EU');
unklar('1200W-US verworfen, 800W-EU bleibt → andere Leistung', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[2]] }), 'unterscheidet sich nicht nur im Stecker');
alle = V('Green-American Standard 110V', 'Pearl White 12 Liters EU');
unklar('Green-American Standard 110V verworfen, Pearl White 12 Liters EU bleibt (soyamilch-maschine)', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }), 'unterscheidet sich nicht nur im Stecker');
alle = V('Black-US', 'Black-UK', 'Black-EU');
ist('Gegenprobe: Black-US, Black-UK, Black-EU → schreiben', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[2]] })?.neueSku, 'CJYD11111113AZ');
alle = V('Silver Gray-800W US', 'Silver Gray-800W EU', 'Silver Gray-800W  UK', 'Silver Gray-800W  AU');
ist('Gegenprobe: Ladegerät, Leerzeichen und Reihenfolge der Wörter egal → schreiben', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] })?.neueSku, 'CJYD11111112AZ');
alle = V('VB610-US', 'VB610-EU', 'VB610-UK', 'VB610-AU');
ist('Gegenprobe: Baby-Kamera VB610 → schreiben', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] })?.neueSku, 'CJYD11111112AZ');
alle = V('Drill 12V-US', 'Drill 18V-EU');
unklar('12 V gegen 18 V (Akku) ist KEINE Netzspannung und gehört zur Basis', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }), 'unterscheidet sich nicht nur im Stecker');
alle = V('White-110-240V US', 'White-220V EU');
ist('Netzspannung 110–240 V und 220 V fallen weg', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] })?.neueSku, 'CJYD11111112AZ');
for (const [k, soll] of [['Silver Gray-800W EU', '800w gray silver'], ['Black-Type G', 'black g type'], ['Plug Type B-White', 'b type white'], ['Gray -US', 'gray'], ['', ''], [null, ''], ['EU', '']])
  ist('steckerBasis(' + JSON.stringify(k) + ')', steckerBasis(k), soll);

// ── Zeichensatz der Bestell-Engine (cj_order_engine.py SKU_FORM_B): «+» ist dort nicht erlaubt
ist('Nummer mit «+» («CJJJJTYS00557-Pink+Blue-2pc») hat die Form, aber nicht den Zeichensatz der Engine', [istCjVariantennummer('CJJJJTYS00557-Pink+Blue-2pc'), istCjVariantennummer('CJJJJTYS00557-Pink Blue-2pc')], [false, true]);
alle = [farbe(1, 'Pink-US'), farbe(2, 'Pink-EU', 10, 'CJJJJTYS00557-Pink+Blue-2pc')];
unklar('Euro-Rest mit «+» in der Nummer → nicht schreiben', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }), 'CJ-Nummer');
ist('Länge: höchstens 80 Zeichen', [istCjVariantennummer('CJABCD12345-' + 'x'.repeat(68)), istCjVariantennummer('CJABCD12345-' + 'x'.repeat(69))], [true, false]);

// ── steckerBasis: Wortlisten festnageln (Prüfer 27.10.2026: 4 der 30 echten Kandidaten brauchen genau diese Wörter)
const gleich = (a, b) => ist(`gleiche Basis: «${a}» ≈ «${b}»`, steckerBasis(a) === steckerBasis(b), true);
const anders = (a, b) => ist(`verschiedene Basis: «${a}» ≠ «${b}»`, steckerBasis(a) === steckerBasis(b), false);
gleich('Light Source Not Included-American Standard', 'Light Source Not Included-European Standard');   // rattan-vintage-wandlampe
gleich('G42 British Standard', 'G42 European Standard');                                                   // 3d-hologramm-projektor
gleich('White-European Standard 220V', 'White-American Standard 110V');                                    // 9mm-mini-haarglatter
gleich('Silver Gray-US/Japanese Standard', 'Silver Gray-EU');                                              // multifunktionaler-mixer-entsafter
gleich('Black-US 120V', 'Black-EU 230V'); gleich('Black-US 240V', 'Black-EU 250V'); gleich('Black-US 100V', 'Black-EU 220V');
gleich('Black-JP', 'Black-EU'); gleich('Black-CN Plug', 'Black-EU'); gleich('Black AC Socket', 'Black-EU'); gleich('Black-UK Plug', 'Black-AU Plug');
anders('Pro-US', 'Lite-EU'); anders('Plus-US', 'Mini-EU'); anders('Type Blue-EU', 'Type Red-US'); anders('Type 2-US', 'Type 3-EU'); anders('Standard-US', 'Premium-EU');
anders('Black-EU 12V', 'Black-EU 24V'); anders('Black-EU 5V', 'Black-US 9V');
anders('Type C-EU', 'Type A-US');          // USB-C gegen USB-A wäre ein anderer Anschluss, kein anderer Stecker
anders('Black-EU', 'Black Standard-US');   // «Standard» allein ist eine Ausführung

// ── SKU-Form und Zeichensatz der Engine (Vektoren aus der Prüfung; 0 Abweichungen über 17 269 echte CJ-Variantennummern)
for (const gut of ['CJJZGJSD00802-7.5X7.5CM-Q4PCS', 'CJJZGJSD02145-10x10x5.5cm', 'CJABCDEFGH12345', 'CJAB123456789', ' CJYD301744802BY '])
  ist('Form gültig: ' + JSON.stringify(gut), istCjVariantennummer(gut), true);
for (const schlecht of ['CJYD12', 'XCJYD225829901AZ', 'CJ 123', 'CJYD301744802BYX', 'CJYD12345AB', 'CJYD123456AB', 'CJYD12345 x', 'CJ12345', 'CJABCDEFGHI12345', 'CJAB1234567890-X',
  'CJYD301744802BY-a/b', 'CJYD301744802BY-a#b', 'CJYD301744802BY-(1)', 'CJYD301744802BY-a,b', 'CJYD301744802BY-a&b', 'CJYD301744802BY-a+b'])
  ist('Form ungültig: ' + JSON.stringify(schlecht), istCjVariantennummer(schlecht), false);
{
  const alle = [farbe(1, 'Black-US'), farbe(2, 'Black-EU', 10, ' CJYD111111102AZ ')];
  ist('Die Nummer wird getrimmt übernommen', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] })?.neueSku, 'CJYD111111102AZ');
}

// ── Preisvergleich (Prüfer 27.10.2026): eine andere Variante ohne lesbaren Preis darf die Grenze nicht abschalten
{
  const alle = [farbe(1, 'Black-US', NaN), farbe(2, 'Black-UK', 54.9), farbe(3, 'Black-EU', 66.17)];
  unklar('Eine andere Variante mit Preis NaN schaltet die 5-%-Grenze nicht ab (EU +21 %)', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[2]] }), '\\+21 %');
  const mitNull = [farbe(1, 'Black-US', 0), farbe(2, 'Black-EU', 10)];
  ist('Preis 0 einer anderen Variante wird ignoriert → schreiben', skuNachziehen({ wege: pid, vsRoh: mitNull, vs: [mitNull[1]] })?.neueSku, 'CJYD11111112AZ');
}

// ── Eindeutigkeit der CJ-Nummer ohne Beachtung der Schreibweise (die Bestell-Engine vergleicht mit .upper())
{
  const alle = [farbe(1, 'Black-EU', 10, 'CJYD111111102AZ'), farbe(2, 'Black-US', 10, 'cjyd111111102az')];
  unklar('Dieselbe CJ-Nummer in anderer Schreibweise bei einer verworfenen Variante → nicht eindeutig', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[0]] }), 'nicht eindeutig');
}

// ── Zweitmeinung Codex/GPT-6 Astra (27.10.2026): fünf Funde gegen die echte Logik nachgestellt, zwei überlebende Mutanten geschlossen
// 1. Schlüssel mit Unicode-Buchstaben: «红色-US» (rot) und «蓝色-EU» (blau) hatten dieselbe leere Basis → EU-SKU wäre trotz anderer Farbe geschrieben worden
{
  const alle = [farbe(1, '红色-US'), farbe(2, '蓝色-EU')];
  unklar('Zwei verschiedene chinesische Farben sind nicht «nur Stecker»', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }), 'unterscheidet sich nicht nur im Stecker');
  const gleich = [farbe(1, '红色-US'), farbe(2, '红色-EU')];
  ist('Dieselbe chinesische Farbe, nur der Stecker verschieden → schreiben', skuNachziehen({ wege: pid, vsRoh: gleich, vs: [gleich[1]] })?.neueSku, 'CJYD11111112AZ');
  ist('Basis behält Unicode-Buchstaben (Akzente, CJK), Umlaute wie bisher', [steckerBasis('红色-US'), steckerBasis('Café-EU'), steckerBasis('Grün-EU')], ['红色', 'café', 'grün']);
  const akz = [farbe(1, 'Café-US'), farbe(2, 'Cafe-EU')];
  unklar('«Café» und «Cafe» sind verschiedene Schlüssel', skuNachziehen({ wege: pid, vsRoh: akz, vs: [akz[1]] }), 'unterscheidet sich');
}
// 2. vs[0] muss zur Rohvariante gleicher vid gehören (SKU einer anderen Variante darf nicht hinübergerettet werden)
{
  const alle = [farbe(1, 'Black-US'), farbe(2, 'Black-EU')];
  unklar('vs[0] trägt die SKU einer anderen Rohvariante', skuNachziehen({ wege: pid, vsRoh: alle, vs: [{ ...alle[1], sku: alle[0].sku }] }), 'Rohdaten');
  unklar('vs[0] hat eine vid, die es in den Rohdaten nicht gibt', skuNachziehen({ wege: pid, vsRoh: alle, vs: [{ ...alle[1], vid: 'x' }] }), 'Rohdaten');
}
// 3. Preisgrenze: Gleitkomma (3.8 × 1.05 = 3.9899999999999998) wies «genau +5 %» ab; die Obergrenze selbst war nicht durch Tests gesichert (Mutant 1.059 blieb grün)
{
  const p = (a, b) => { const alle = [farbe(1, 'Black-US', a), farbe(2, 'Black-EU', b)]; return skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }); };
  ist('3.80 → 3.99 ist genau +5 % und wird akzeptiert', p(3.8, 3.99)?.neueSku, 'CJYD11111112AZ');
  ist('3.80 → 4.00 (+5.3 %) wird abgewiesen', typeof p(3.8, 4.0)?.unklar, 'string');
  ist('100 → 105.50 (+5.5 %) wird abgewiesen (Obergrenze 1.05 geschützt)', typeof p(100, 105.5)?.unklar, 'string');
  ist('100 → 105.01 wird abgewiesen, 105.00 akzeptiert', [typeof p(100, 105.01)?.unklar, p(100, 105)?.neueSku], ['string', 'CJYD11111112AZ']);
  ist('Preis 54.90 → 57.645 (genau +5 %) wird akzeptiert', p(54.9, 57.645)?.neueSku, 'CJYD11111112AZ');
}
// 4. Preis Infinity ist kein Einkaufspreis
{
  const alle = [farbe(1, 'Black-US', Infinity), farbe(2, 'Black-EU', Infinity)];
  unklar('Einkaufspreis Infinity der übrigen Variante', skuNachziehen({ wege: pid, vsRoh: alle, vs: [alle[1]] }), 'Einkaufspreis');
  const nurRest = [farbe(1, 'Black-US', Infinity), farbe(2, 'Black-EU', 10)];
  ist('Preis Infinity einer anderen Variante wird ignoriert → schreiben', skuNachziehen({ wege: pid, vsRoh: nurRest, vs: [nurRest[1]] })?.neueSku, 'CJYD11111112AZ');
}
// 5. null-Einträge → kontrollierte Rückgabe statt TypeError
{
  const alle = [farbe(1, 'Black-US'), farbe(2, 'Black-EU')];
  ist('wege: [null] → null', skuNachziehen({ wege: [null], vsRoh: alle, vs: [alle[1]] }), null);
  unklar('null in den CJ-Rohvarianten → unvollständig, kein Absturz', skuNachziehen({ wege: pid, vsRoh: [null, alle[1]], vs: [alle[1]] }), 'unvollständig');
}
// 6. Zeichensatz der Engine: ein Schrägstrich in einer sonst gültigen Form-B-Nummer ist nicht erlaubt (der bisherige Slash-Test scheiterte schon an der Form, nicht am Zeichensatz)
for (const s of ['CJAB12345-a/b', 'CJJJCFCJ02750-Black/EU', 'CJXFLPCD00334-Photo\\Color-EU'])
  ist('Form B mit unerlaubtem Zeichen ungültig: ' + s, istCjVariantennummer(s), false);
ist('Form B mit erlaubten Zeichen bleibt gültig', [istCjVariantennummer('CJAB12345-a.b_c 1'), istCjVariantennummer('CJAB12345-a-b')], [true, true]);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
