// Tests für skuNachziehen (kein Netz): wann bekommt die Standardvariante die echte CJ-Variantennummer als SKU?
import { skuNachziehen } from './sku_nachziehen.mjs';
import { strategien } from './fakten_block.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

// Die vier echten Varianten der Heizdecke (27.10.2026): Stecker US / EU / UK / AU
const roh = [
  { vid: '2607290840401606700', sku: 'CJYD301744801AZ' }, { vid: '2607290840401607200', sku: 'CJYD301744802BY' },
  { vid: '2607290840401607700', sku: 'CJYD301744803CX' }, { vid: '2607290840401608200', sku: 'CJYD301744804DW' },
];
const eu = [roh[1]];
const pid = strategien('CJ-2607290840401606000');

ist('Heizdecke: pid-SKU, 4 CJ-Varianten, nur EU bleibt → SKU der EU-Variante',
  skuNachziehen({ wege: pid, vsRoh: roh, vs: eu }), { neueSku: 'CJYD301744802BY', vid: '2607290840401607200', anzahlCj: 4 });
ist('Auch die blanke 15-stellige pid (ohne «CJ-»)', skuNachziehen({ wege: strategien('260505090828160'), vsRoh: roh, vs: eu })?.neueSku, 'CJYD301744802BY');
ist('Auch die UUID-pid', skuNachziehen({ wege: strategien('A1B2C3D4-0000-4000-8000-123456789ABC'), vsRoh: roh, vs: eu })?.neueSku, 'CJYD301744802BY');

// Gegenproben: nichts schreiben
ist('Gegenprobe: CJ führt wirklich nur EINE Variante → pid ist eindeutig, nichts zu tun', skuNachziehen({ wege: pid, vsRoh: eu, vs: eu }), null);
ist('Gegenprobe: nach dem Filter bleiben ZWEI Varianten (dann baut das Werkzeug die Auswahl)', skuNachziehen({ wege: pid, vsRoh: roh, vs: roh.slice(1, 3) }), null);
ist('Gegenprobe: nach dem Filter bleibt KEINE Variante', skuNachziehen({ wege: pid, vsRoh: roh, vs: [] }), null);
ist('Gegenprobe: die SKU nennt schon eine Variante (CJ-CJYD…)', skuNachziehen({ wege: strategien('CJ-CJYD301744802BY'), vsRoh: roh, vs: eu }), null);
ist('Gegenprobe: blanke Variantennummer (CJLY…) als SKU', skuNachziehen({ wege: strategien('CJLY291603001AZ'), vsRoh: roh, vs: eu }), null);
ist('Gegenprobe: unbekannte SKU-Form', skuNachziehen({ wege: strategien('ABC-123'), vsRoh: roh, vs: eu }), null);
ist('Gegenprobe: leere SKU', skuNachziehen({ wege: strategien(''), vsRoh: roh, vs: eu }), null);
ist('Gegenprobe: übrige Variante ohne brauchbare Nummer (leer)', skuNachziehen({ wege: pid, vsRoh: [roh[0], { vid: 'v', sku: '' }], vs: [{ vid: 'v', sku: '' }] }), null);
ist('Gegenprobe: übrige Variante mit unbrauchbarer Nummer («x»)', skuNachziehen({ wege: pid, vsRoh: [roh[0], { vid: 'v', sku: 'x' }], vs: [{ vid: 'v', sku: 'x' }] }), null);
ist('Gegenprobe: übrige Variante ohne vid', skuNachziehen({ wege: pid, vsRoh: roh, vs: [{ sku: 'CJYD301744802BY' }] }), null);
ist('Gegenprobe: dieselbe Variantennummer zweimal bei CJ → nicht eindeutig', skuNachziehen({ wege: pid, vsRoh: [roh[1], { vid: 'andere', sku: 'CJYD301744802BY' }], vs: [roh[1]] }), null);
ist('Gegenprobe: wege fehlt / ungültig', [skuNachziehen({ wege: null, vsRoh: roh, vs: eu }), skuNachziehen({ wege: [], vsRoh: roh, vs: eu }), skuNachziehen({ wege: pid, vsRoh: null, vs: eu }), skuNachziehen({ wege: pid, vsRoh: roh, vs: null })], [null, null, null, null]);
ist('Gegenprobe: strategien liefert mehrere Wege (variantSku + productSku) → keine pid', skuNachziehen({ wege: [['variantSku', 'X'], ['productSku', 'X']], vsRoh: roh, vs: eu }), null);
ist('Kleinschreibung der CJ-Nummer wird akzeptiert und unverändert übernommen', skuNachziehen({ wege: pid, vsRoh: [{ vid: 'a', sku: 'cjyd1234567az' }, { vid: 'b', sku: 'CJYD7654321BY' }], vs: [{ vid: 'a', sku: 'cjyd1234567az' }] })?.neueSku, 'cjyd1234567az');

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
