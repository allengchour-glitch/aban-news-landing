// haendlerwort_gleichlauf_test.mjs — Importer (haendlerwort.mjs) und Wächter (haendlerwort.py) entscheiden gleich (09.10.2026).
// 1) Kanarien aus data/haendlerwort_regel.json  2) alle Titel + Beschreibungen mit Treffer im Export gegen Python.
import { titelFix, textFix, KANARIEN, HAENDLER_WORT } from './haendlerwort.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
let f = 0;
for (const [alt, soll, art] of KANARIEN) {
  const ist = art === 'titel' ? titelFix(alt, false)[0] : textFix(`<p>${alt}</p>`, art.slice(5)).replace('<p>', '').replace('</p>', '');
  if (ist !== soll) { f++; console.log(`  ✗ [${art}] ${alt}\n     ist  ${ist}\n     soll ${soll}`); }
}
console.log(`JS-Kanarien ${KANARIEN.length - f}/${KANARIEN.length}`);
const EXPORT = process.env.EXPORT || '/tmp/versprechen_export.jsonl';
const proben = [];
if (fs.existsSync(EXPORT)) {
  for (const z of fs.readFileSync(EXPORT, 'utf8').split('\n')) {
    if (!z || z.includes('__parentId')) continue;
    const o = JSON.parse(z); if (!o.title) continue;
    proben.push([o.title, '']);
    const d = o.descriptionHtml || '';
    if (/xplos|Datejust|Submariner|Daytona|Nautilus/i.test(d) || HAENDLER_WORT.test(d)) proben.push([o.title, d]);
  }
}
const tmp = '/tmp/haendlerwort_gleichlauf.json';
fs.writeFileSync(tmp, JSON.stringify(proben));
const py = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
sys.path.insert(0,'automation')
from haendlerwort import titel_fix, text_fix
p=json.load(open('${tmp}'))
print(json.dumps([titel_fix(t)[0] if not d else text_fix(d,t) for t,d in p]))`], { maxBuffer: 1 << 29 }).toString());
let abw = 0, treffer = 0;
proben.forEach(([t, d], i) => {
  const js = d ? textFix(d, t) : titelFix(t)[0];
  if (js !== (d || t)) treffer++;
  if (js !== py[i]) { abw++; if (abw <= 8) console.log(`  ≠ ${t.slice(0, 60)}${d ? ' (Text)' : ''}\n     js ${String(js).slice(0, 300)}\n     py ${String(py[i]).slice(0, 300)}`); }
});
console.log(`py=js über ${proben.length} Proben: ${abw} Abweichungen (${treffer} mit Treffer)`);
process.exit(f || abw ? 1 : 0);
