/**
 * Reine Vertragstests fuer den verbindlichen Review-Stand des Editors v6.3.0.
 * Kein Browser, kein Netz, keine Dateien werden geschrieben.
 *
 * Aufruf: node pod/v6/test/review_gate_unit_test.mjs
 */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
process.env.V6_DATEI = join(hier, '..', 'lspod-designer-v6-6.3.0.js');
process.env.V6_VERSION = '6.3.0';

let n = 0;
const fehler = [];
function pruefe(name, ok, detail = '') {
  n++;
  if (!ok) {
    fehler.push(`${name} ${detail}`.trim());
    console.log(`  x ${name}${detail ? ` ${detail}` : ''}`);
  }
}

function editorLaden(datei) {
  const g = {
    Shopify: { locale: 'de-CH' },
    location: { search: '' },
    console,
    setTimeout: () => 0,
    addEventListener() {},
  };
  g.window = g;
  g.document = {
    readyState: 'complete',
    documentElement: { lang: 'de-CH' },
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
  };
  const ctx = vm.createContext(g);
  vm.runInContext(readFileSync(datei, 'utf8'), ctx, { filename: 'lspod-designer-v6-6.3.0.js' });
  return g.LSPOD6;
}

const editor = editorLaden(process.env.V6_DATEI);
pruefe('Editorversion ist v6.3.0', editor?.version === process.env.V6_VERSION, String(editor?.version));
const gueltig = editor?.hilfen?.reviewStandGueltig;
pruefe('pure Hilfe reviewStandGueltig ist exportiert', typeof gueltig === 'function');

if (typeof gueltig === 'function') {
  const design = '{"front":[{"id":"L1","text":"Hallo"}],"back":[]}';
  const basis = Object.freeze({ design, sv: '1001', pv: 4012, m: 71, pl: Object.freeze(['front', 'back']) });
  const kopie = (aenderung = {}) => ({ design, sv: '1001', pv: 4012, m: 71, pl: ['front', 'back'], ...aenderung });

  pruefe('identischer Review-Stand ist gueltig', gueltig(basis, kopie()) === true);
  pruefe('geaendertes Design macht den Review ungueltig', gueltig(basis, kopie({ design: '{"front":[{"id":"L1","text":"Neu"}],"back":[]}' })) === false);
  pruefe('geaenderte Shopify-Variante macht den Review ungueltig', gueltig(basis, kopie({ sv: '1002' })) === false);
  pruefe('geaenderte Printful-Variante macht den Review ungueltig', gueltig(basis, kopie({ pv: 4013 })) === false);
  pruefe('geaendertes Printful-Modell macht den Review ungueltig', gueltig(basis, kopie({ m: 586 })) === false);
  pruefe('geaenderte Placement-Reihenfolge macht den Review ungueltig', gueltig(basis, kopie({ pl: ['back', 'front'] })) === false);
  pruefe('geaendertes Placement-Set macht den Review ungueltig', gueltig(basis, kopie({ pl: ['front', 'sleeve_left'] })) === false);
  pruefe('zusaetzliches Placement macht den Review ungueltig', gueltig(basis, kopie({ pl: ['front', 'back', 'sleeve_left'] })) === false);
  pruefe('fehlender gespeicherter Stand ist ungueltig', gueltig(null, kopie()) === false);
  pruefe('fehlender aktueller Stand ist ungueltig', gueltig(basis, null) === false);
}

console.log(fehler.length ? `\n${fehler.length} von ${n} Pruefungen FEHLGESCHLAGEN` : `\n${n} Pruefungen bestanden`);
process.exit(fehler.length ? 1 : 0);
