// nagel_titel_gleichlauf_test.mjs — Importer (nagel_titel.mjs) und Wächter (nagel_titel.py) entscheiden gleich (09.10.2026).
// 1) Kanarien aus data/nagel_titel_regel.json  2) alle aktiven Nagel-Titel aus dem Export (falls vorhanden) gegen Python.
import { nagelTitel, KANARIEN } from './nagel_titel.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
let f = 0;
for (const k of KANARIEN) {
  const ist = nagelTitel(k[0], '', k.length > 2 && k[2])[0];
  if (ist !== k[1]) { f++; console.log(`  ✗ ${k[0]} → ${ist} (soll ${k[1]})`); }
}
console.log(`JS-Kanarien ${KANARIEN.length - f}/${KANARIEN.length}`);
const EXPORT = process.env.EXPORT || '/tmp/versprechen_export.jsonl';
let titel = KANARIEN.map(k => k[0]);
if (fs.existsSync(EXPORT)) {
  for (const z of fs.readFileSync(EXPORT, 'utf8').split('\n')) {
    if (!z || z.includes('__parentId')) continue;
    const o = JSON.parse(z); if (o.title) titel.push(o.title);
  }
}
const tmp = '/tmp/nagel_gleichlauf_titel.json';
fs.writeFileSync(tmp, JSON.stringify(titel));
const py = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
sys.path.insert(0,'automation')
from nagel_titel import nagel_titel
t=json.load(open('${tmp}'))
print(json.dumps([[nagel_titel(x)[0], nagel_titel(x,'',True)[0]] for x in t]))`], { maxBuffer: 1 << 28 }).toString());
let abw = 0, treffer = 0;
titel.forEach((x, i) => {
  const js = [nagelTitel(x)[0], nagelTitel(x, '', true)[0]];
  if (js[0] !== x || js[1] !== x) treffer++;
  if (js[0] !== py[i][0] || js[1] !== py[i][1]) { abw++; if (abw <= 10) console.log(`  ≠ ${x}\n     js ${js}\n     py ${py[i]}`); }
});
console.log(`py=js über ${titel.length} Titel: ${abw} Abweichungen (${treffer} mit Treffer)`);
process.exit(f || abw ? 1 : 0);
