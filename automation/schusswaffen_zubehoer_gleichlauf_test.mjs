// schusswaffen_zubehoer_gleichlauf_test.mjs — Importer (schusswaffen_zubehoer.mjs) und Wächter
// (google_sperrliste.ist_schusswaffen_zubehoer) entscheiden gleich (14.10.2026). NUR LESEN, schreibt nichts im Shop.
//   node automation/schusswaffen_zubehoer_gleichlauf_test.mjs                 Kanarien JS + Kanarien gegen Python
//   EXPORT=<datei.jsonl> node automation/schusswaffen_zubehoer_gleichlauf_test.mjs
//        zusätzlich jede Zeile der Datei (Felder title, productType|type, tags, descriptionHtml|text, en) gegen Python.
// Exit 0 nur bei 0 falschen Kanarien UND 0 Abweichungen js≠py (auch im Grund-Text).
import { istSchusswaffenZubehoer, KANARIEN, kanarienFehler } from './schusswaffen_zubehoer.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fehler = kanarienFehler();
for (const k of fehler) console.log(`  ✗ Kanarie «${k[0]}» soll ${k[5]}, JS sagt «${istSchusswaffenZubehoer(...k.slice(0, 5))}»`);
console.log(`JS-Kanarien ${KANARIEN.length - fehler.length}/${KANARIEN.length}`);

const proben = KANARIEN.map(k => k.slice(0, 5));
const EXPORT = process.env.EXPORT || '';
if (EXPORT && fs.existsSync(EXPORT)) {
  for (const z of fs.readFileSync(EXPORT, 'utf8').split('\n')) {
    if (!z.trim() || z.includes('__parentId')) continue;
    const o = JSON.parse(z);
    if (!o.title) continue;
    proben.push([o.title, o.productType ?? o.type ?? '', o.tags || [], o.descriptionHtml ?? o.text ?? '', o.en || '']);
  }
}
const tmp = path.join(os.tmpdir(), `swz_gleichlauf_${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify(proben));
const hier = path.dirname(new URL(import.meta.url).pathname);
const py = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
sys.path.insert(0, ${JSON.stringify(hier)})
from google_sperrliste import ist_schusswaffen_zubehoer
p = json.load(open(${JSON.stringify(tmp)}, encoding='utf-8'))
print(json.dumps([ist_schusswaffen_zubehoer(*x) for x in p]))`], { maxBuffer: 1 << 28 }).toString());
fs.unlinkSync(tmp);
let abw = 0, treffer = 0;
proben.forEach((pr, i) => {
  const js = istSchusswaffenZubehoer(...pr);
  if (js) treffer++;
  if (js !== py[i]) { abw++; if (abw <= 10) console.log(`  ≠ ${String(pr[0]).slice(0, 70)}\n     js «${js}»\n     py «${py[i]}»`); }
});
console.log(`py=js über ${proben.length} Proben: ${abw} Abweichungen (${treffer} Treffer)`);
process.exit(fehler.length || abw ? 1 : 0);
