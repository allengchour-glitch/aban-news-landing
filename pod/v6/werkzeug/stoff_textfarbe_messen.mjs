/**
 * Messung ohne Browser (Editor 6.4.1, Auftrag «Standard-Textfarbe»): für jede Karte in pod/v6/maps (Karte × Platzierung × Ausführung) die Stofffarbe, den Kontrast der Standardfarbe #111111 gegen
 * diesen Stoff (so startete ein neuer Text bis 6.4.0) und die Standardfarbe, die der Editor jetzt wählt, samt ihrem Kontrast. Der Editor wird in einer vm geladen (wie unit_test.mjs), es wird nichts gemountet.
 * Stofffarbe wie im Editor (stoffFarbe): die Farbe der Ausführung, wo die Vorlage eine Farbfläche oder Textur trägt, sonst die Beispielfarbe der Vorlage; null = unbekannt (dann bleibt der Text dunkel).
 * Aufruf: node stoff_textfarbe_messen.mjs [Editor-Datei] [--json]     (Vorgabe: lspod-designer-v6-6.4.1.js; mit 6.4.0 steht in «wahl» immer #111111)
 */
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const v6 = join(hier, '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const datei = args[0] || join(v6, 'lspod-designer-v6-6.4.1.js');
const alsJson = process.argv.includes('--json');

function neuerGlobal() {
  const g = { Shopify: { locale: 'de' }, location: { search: '' }, console, setTimeout: () => 0, addEventListener() {} };
  g.window = g;
  g.document = { readyState: 'complete', documentElement: { lang: 'de' }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  return vm.createContext(g);
}
const g = neuerGlobal();
vm.runInContext(readFileSync(datei, 'utf8'), g);
const H = g.LSPOD6.hilfen;
const lum = (hex) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); return m ? H.leuchtdichte(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)) : null; };
const kon = (a, b) => H.kontrastVerhaeltnis(lum(a), lum(b));

const zeilen = [];
for (const f of readdirSync(join(v6, 'maps')).filter((x) => x.endsWith('.karte.json')).sort()) {
  const roh = JSON.parse(readFileSync(join(v6, 'maps', f), 'utf8'));
  const modelle = roh.modelle ? Object.entries(roh.modelle) : [[String(roh.printfulProductId), roh]];
  const shop = roh.shop && roh.shop.varianten ? roh.shop.varianten : {};
  for (const [mid, mk] of modelle) {
    const r = H.karteNormalisieren(mk);
    if (!r.karte) { zeilen.push({ karte: f.replace('lspod-', '').replace('.karte.json', ''), modell: mid, fehler: r.fehler }); continue; }
    const k = r.karte;
    const pvs = [...new Set(Object.values(shop).filter((x) => !roh.modelle || String(x.m) === mid).map((x) => (typeof x === 'object' ? x.pv : x)))];
    for (const p of k.platzierungen) {
      for (const pv of (pvs.length ? pvs : [null])) {
        const vl = H.geometrieFuer(k, p, pv).vorlage;
        if (!vl) continue;
        const eigene = pv != null && k.farbeVon && k.farbeVon[pv] && (vl.hintergrundUrl || vl.hintergrundFarbe) ? k.farbeVon[pv] : null;
        const stoff = eigene || vl.hintergrundFarbe || null;
        const wahl = H.standardTextFarbe ? H.standardTextFarbe(stoff) : '#111111';
        zeilen.push({ karte: f.replace('lspod-', '').replace('.karte.json', ''), modell: mid, platz: p.id, pv, stoff, kontrastDunkel: stoff ? kon('#111111', stoff) : null, wahl, kontrastWahl: stoff ? kon(wahl, stoff) : null });
      }
    }
  }
}
if (alsJson) { console.log(JSON.stringify(zeilen)); process.exit(0); }
const bek = zeilen.filter((z) => z.stoff);
const schlecht = bek.filter((z) => z.kontrastDunkel < 1.8);
console.log(`${zeilen.length} Zeilen (Karte × Platzierung × Ausführung), Stoff bekannt: ${bek.length}, unbekannt: ${zeilen.filter((z) => !z.stoff && !z.fehler).length}, Karten, die der Editor nicht liest: ${zeilen.filter((z) => z.fehler).length}`);
console.log(`Kontrast von #111111 gegen den Stoff unter 1,8 (Schwelle des Hinweises): ${schlecht.length} Zeilen`);
console.log(`Standardfarbe weiss: ${bek.filter((z) => z.wahl === '#ffffff').length}, dunkel: ${bek.filter((z) => z.wahl !== '#ffffff').length}; kleinster Kontrast der gewählten Farbe: ${Math.min(...bek.map((z) => z.kontrastWahl)).toFixed(2)}`);
console.log('Karte | Modell | Platzierung | Printful-Variante | Stoff | Kontrast #111111 | Standardfarbe | Kontrast Standardfarbe');
for (const z of bek.filter((x) => x.kontrastDunkel < 4 || x.wahl === '#ffffff')) console.log([z.karte, z.modell, z.platz, z.pv, z.stoff, z.kontrastDunkel.toFixed(2), z.wahl, z.kontrastWahl.toFixed(2)].join(' | '));
